"""Research Orchestrator: Query Planner → Search → Extract → Evaluate → Findings → Synthesize.

All LLM stages use Muse Spark 1.3 path via app.llm (Baseten → Meta → OpenRouter → mock).
Content fetching uses services.extractor (httpx + trafilatura), no LLM.
"""
from __future__ import annotations
import asyncio
import time
from collections.abc import Awaitable, Callable
from urllib.parse import urlparse

from .. import llm, prompts
from .extractor import extract_pages

EventCb = Callable[[str, dict], Awaitable[None] | None]

MODEL_TAG = "muse-spark-1.3"
MAX_SOURCES = 8
SEARCH_CANDIDATES = 12

_FINDING_TYPES = {"Fact", "Argument", "Counterargument", "Data", "Claim", "Opinion", "Terminology", "Question", "Idea"}


async def _emit(cb: EventCb | None, event: str, data: dict) -> None:
    if cb is None:
        return
    r = cb(event, data)
    if isinstance(r, Awaitable):
        await r


def _norm(s: str) -> str:
    return " ".join((s or "").split()).lower()


def validate_finding(f: dict, page_texts: dict[str, str]) -> tuple[bool, str]:
    """Citation check: url known + excerpt substring of page text. Returns (ok, verdict)."""
    url = str(f.get("url", ""))
    excerpt = str(f.get("excerpt", ""))
    if not url or url not in page_texts:
        return False, "unverified"
    if not excerpt or len(excerpt.strip()) < 20:
        return False, "unverified"
    if _norm(excerpt)[:120] in _norm(page_texts[url]):
        return True, "supported"
    return False, "unverified"


async def plan_queries(query: str, context: str = "", n: int = 4) -> list[str]:
    try:
        s, u = prompts.query_plan_prompt(query, context, n)
        data, _, _ = await llm.json_call(s, u, max_tokens=400, temperature=0.3)
        qs = [str(q).strip()[:300] for q in (data.get("queries", []) or []) if str(q).strip()]
        qs = list(dict.fromkeys(qs))[:5]
        if qs:
            return qs
    except Exception:
        pass
    return [query]


async def search_candidates(queries: list[str], limit: int = SEARCH_CANDIDATES) -> list[dict]:
    """Meta Responses web_search per subquery. Returns deduped [{title,url,snippet}]."""
    sem = asyncio.Semaphore(3)

    async def _one(q: str):
        async with sem:
            try:
                return await llm.responses_call(
                    f"Research question: {q}\nUse web search. List the most relevant sources with titles and URLs.",
                    instructions="Research assistant. Ground every statement in web search results and cite them.",
                    tools=[{"type": "web_search", "search_context_size": "medium"}],
                    include=["web_search_call.results"],
                    max_output_tokens=900,
                )
            except Exception:
                return None

    # Concurrent subqueries; dedup below preserves query order for determinism.
    results = await asyncio.gather(*[_one(q) for q in queries[:5]])
    out: list[dict] = []
    seen: set[str] = set()
    for r in results:
        if not r or r.get("mock"):
            continue
        items = list(r.get("search_results") or [])
        for a in r.get("annotations") or []:
            if isinstance(a, dict) and a.get("url"):
                items.append({"title": a.get("title", ""), "url": a.get("url", "")})
        for it in items:
            url = str(it.get("url", ""))
            if not url.startswith(("http://", "https://")) or url in seen:
                continue
            if "mock.local" in url:
                continue
            seen.add(url)
            try:
                domain = urlparse(url).netloc
            except Exception:
                domain = url
            out.append({"title": str(it.get("title", "") or url)[:300], "url": url, "domain": domain,
                        "snippet": str(it.get("snippet", "") or it.get("text", ""))[:500]})
            if len(out) >= limit:
                return out
    return out


async def evaluate_pages(query: str, pages: list[dict]) -> list[dict]:
    """Muse Spark judge per page. Keeps relevance>=1. Falls back to keep-all on LLM failure."""

    async def _one(p: dict) -> dict | None:
        try:
            s, u = prompts.evaluate_source_prompt(query, p)
            data, _, _ = await llm.json_call(s, u, max_tokens=300, temperature=0.2)
            keep = bool(data.get("keep", False)) and int(data.get("relevance", 0)) >= 1
            cred = str(data.get("credibility", "medium"))
            reason = str(data.get("reason", ""))[:300]
            if keep:
                return {**p, "credibility": cred, "eval_reason": reason}
            return None
        except Exception:
            return {**p, "credibility": "medium", "eval_reason": "eval fallback: kept"}

    kept = await asyncio.gather(*[_one(p) for p in pages])
    out = [p for p in kept if p]
    return out or pages


async def extract_findings(query: str, pages: list[dict]) -> tuple[list[dict], dict[str, str]]:
    """Per-page finding extraction. Returns (findings, page_texts)."""
    findings: list[dict] = []
    page_texts: dict[str, str] = {p["url"]: p.get("text", "") for p in pages}
    fid = 0

    async def _one(p: dict) -> list[dict]:
        try:
            s, u = prompts.extract_findings_prompt(query, p)
            data, _, _ = await llm.json_call(s, u, max_tokens=900, temperature=0.3)
            rows = (data.get("findings") or []) if isinstance(data, dict) else []
            out = []
            for r in rows:
                if not isinstance(r, dict) or not str(r.get("claim", "")).strip():
                    continue
                t = str(r.get("type", "Fact")).strip().capitalize()
                if t not in _FINDING_TYPES:
                    t = "Fact"
                out.append({"type": t, "text": str(r["claim"])[:500],
                            "source_title": p.get("title", "")[:300], "url": p["url"],
                            "locator": str(r.get("locator", ""))[:100],
                            "excerpt": str(r.get("excerpt", ""))[:500]})
            return out[:4]
        except Exception:
            return []

    per = await asyncio.gather(*[_one(p) for p in pages])
    for rows in per:
        for f in rows:
            ok, verdict = validate_finding(f, page_texts)
            fid += 1
            findings.append({"id": fid, **f, "verdict": verdict,
                             "why": "Grounded in fetched page excerpt." if ok else "Excerpt not verified in page — treat as unverified."})
    return findings, page_texts


async def plan_angles(query: str, context: str = "", count: int = MAX_SOURCES,
                    start_id: int = 0) -> tuple[list[dict], dict, str, bool]:
    """Open-thread angles (no URLs — safe offline). Returns (angles, usage, model, mock)."""
    angles: list[dict] = []
    usage: dict = {}
    model = MODEL_TAG
    mock = False
    try:
        s, u = prompts.explore_angles_prompt(query, context, count)
        data, u2, m2 = await llm.json_call(s, u, max_tokens=1100, temperature=0.5)
        usage = u2 or {}
        if isinstance(m2, str) and m2.startswith("mock:"):
            mock = True
        elif m2:
            model = m2
        aid = start_id
        for a in (data.get("angles") or []) if isinstance(data, dict) else []:
            if not isinstance(a, dict) or not str(a.get("text", "")).strip():
                continue
            aid += 1
            at = str(a.get("type", "Idea")).strip().capitalize()
            if at not in _FINDING_TYPES:
                at = "Idea"
            angles.append({"id": aid, "type": at, "text": str(a["text"])[:500],
                           "why": str(a.get("why", ""))[:300]})
            if len(angles) >= count * 2:
                break
    except Exception:
        pass
    return angles, usage, model, mock


async def synthesize(query: str, findings: list[dict]) -> tuple[str, list[dict]]:
    """Concise summary + derived angles for findings without verified sources."""
    bits = "; ".join(f["text"] for f in findings[:3])[:800]
    try:
        s, u = prompts.synthesize_prompt(query, "\n".join(f["text"] for f in findings[:8]))
        text, _, _ = await llm.text_call(s, u, max_tokens=300, temperature=0.5)
        summary = (text or "").strip()[:800] or bits
    except Exception:
        summary = bits
    return summary, []


async def run_explore(query: str, context: str = "", count: int = MAX_SOURCES,
                      on_event: EventCb | None = None) -> dict:
    """Full pipeline. Returns {findings, angles, summary, model, usage, mock, offline, ms}."""
    t0 = time.perf_counter()
    count = max(1, min(MAX_SOURCES, count or MAX_SOURCES))
    model, usage, mock, offline = MODEL_TAG, {}, False, False

    await _emit(on_event, "stage", {"step": 0, "msg": "Planning search queries"})
    queries = await plan_queries(query, context)
    await _emit(on_event, "stage", {"step": 1, "msg": f"Searching {len(queries)} queries for sources"})

    cands = await search_candidates(queries)
    if not cands:
        # Fallback: legacy single-shot grounded facts (keeps offline/mock behavior)
        try:
            from ..prompts import FACTS_SYSTEM

            r = await llm.responses_call(
                f"Research question: {query}\nContext: {context or '(none)'}\nUse web search. Extract structured facts as JSON per schema.",
                instructions=FACTS_SYSTEM, tools=[{"type": "web_search", "search_context_size": "high"}],
                include=["web_search_call.results"], text_format=llm.FACTS_FORMAT, max_output_tokens=1800)
            model = r.get("model", MODEL_TAG)
            usage = r.get("usage") or {}
            if r.get("mock"):
                mock, offline = True, True
            elif r.get("text"):
                try:
                    facts = llm.extract_json(r["text"]).get("facts", []) or []
                except Exception:
                    facts = []
                fid = 0
                findings = []
                for f in facts[:count]:
                    url = str(f.get("url", ""))
                    if not url.startswith(("http://", "https://")) or "mock.local" in url:
                        continue
                    fid += 1
                    findings.append({"id": fid, "type": "Fact", "text": str(f.get("fact", ""))[:500],
                                     "source_title": str(f.get("source_title", ""))[:300], "url": url,
                                     "locator": str(f.get("locator", ""))[:100],
                                     "excerpt": str(f.get("excerpt", ""))[:500],
                                     "verdict": "unverified", "why": "Single-shot web-search result; excerpt not fetched/verified."})
                    await _emit(on_event, "finding", findings[-1])
                summary = "; ".join(f["text"] for f in findings[:3])[:800]
                if findings:
                    await _emit(on_event, "stage", {"step": 3, "msg": "Organising results"})
                    return {"findings": findings, "angles": [], "summary": summary, "model": model,
                            "usage": usage, "mock": mock, "offline": offline,
                            "ms": int((time.perf_counter() - t0) * 1000)}
        except Exception:
            pass
        # No candidates (offline/mock): still run angle planner so UI has threads.
        angles, usage, amodel, amock = await plan_angles(query, context, count)
        if amock:
            mock = True
        if amodel and model == MODEL_TAG:
            model = amodel
        if usage:
            pass
        summary = "; ".join(f["text"] for f in angles[:3])[:800]
        for a in angles:
            await _emit(on_event, "finding", a)
        await _emit(on_event, "done", {"findings": [], "angles": angles, "summary": summary})
        return {"findings": [], "angles": angles, "summary": summary, "model": model, "usage": usage,
                "mock": True, "offline": True, "ms": int((time.perf_counter() - t0) * 1000)}

    for c in cands[:count]:
        await _emit(on_event, "source", c)
    await _emit(on_event, "stage", {"step": 2, "msg": f"Reading {min(len(cands), SEARCH_CANDIDATES)} pages"})

    pages = await extract_pages([c["url"] for c in cands], concurrency=4)
    # Merge titles from search when trafilatura title empty
    tmap = {c["url"]: c["title"] for c in cands}
    for p in pages:
        if not p.get("title") or p["title"] == p["url"]:
            p["title"] = tmap.get(p["url"], p["url"])
    if not pages:
        angles, u2, m2, amock = await plan_angles(query, context, count)
        summary = "; ".join(f["text"] for f in angles[:3])[:800]
        await _emit(on_event, "done", {"findings": [], "angles": angles, "summary": summary})
        return {"findings": [], "angles": angles, "summary": summary, "model": m2 or model,
                "usage": u2 or usage, "mock": True, "offline": True,
                "ms": int((time.perf_counter() - t0) * 1000)}

    kept = (await evaluate_pages(query, pages))[:count]
    await _emit(on_event, "stage", {"step": 3, "msg": f"Extracting findings from {len(kept)} sources"})

    findings, _ = await extract_findings(query, kept)
    findings = findings[: count * 2]
    for f in findings:
        await _emit(on_event, "finding", f)

    # Angle planner for open threads (no URLs — safe offline)
    angles, u2, m2, amock = await plan_angles(query, context, count, start_id=len(findings))
    if u2:
        usage = u2
    if amock:
        mock = True
    elif m2:
        model = m2

    await _emit(on_event, "stage", {"step": 4, "msg": "Organising results"})
    summary, _ = await synthesize(query, findings + angles)
    result = {"findings": findings, "angles": angles, "summary": summary, "model": model,
              "usage": usage, "mock": mock, "offline": offline,
              "ms": int((time.perf_counter() - t0) * 1000)}
    await _emit(on_event, "done", result)
    return result
