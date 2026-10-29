from fastapi import APIRouter, UploadFile, File
import asyncio, httpx, json
from .. import llm, prompts, citations
from ..config import settings
from ..models import TextIn, ResearchIn, CiteIn, BiblioIn
from ..quote import filter_anchored
from ..security import is_safe_public_url
from .common import ok, fail, err, meta

router = APIRouter()

def parse_verdict(answer: str):
    low = answer.lower()
    verdict = "qualifies"
    if low.startswith("evidence supports") or "supports the claim" in low[:120] or "evidence **supports**" in low[:160]: verdict = "supports"
    elif "contradict" in low[:160]: verdict = "contradicts"
    first = answer.strip().strip("*# ").split(". ")[0]
    summary = (first[:280] + ("." if first and not first.endswith(".") else "")).strip()
    return verdict, summary

async def _readings_for_claim(c: dict) -> list:
    try:
        r = await llm.responses_call(
            f"Claim from my draft: {c['quote']}\nUse web search. Answer in 2-3 sentences: does evidence support, contradict, or qualify this claim? Cite sources inline.",
            instructions="Research assistant. Ground every statement in web search results and cite them.",
            tools=[{"type": "web_search", "search_context_size": "medium"}], include=["web_search_call.results"], max_output_tokens=900)
    except Exception:
        return []
    answer = (r.get("text") or "").strip()
    verdict, summary = parse_verdict(answer)
    seen = set(); out = []
    srcs = [{"title": x.get("title", ""), "url": x.get("url", "")} for x in (r.get("search_results") or [])[:3]]
    if not srcs:
        srcs = [{"title": a.get("title", ""), "url": a.get("url", "")} for a in (r.get("annotations") or [])[:2]]
    for res in srcs:
        url = res.get("url", "")
        if not url or url in seen or not url.startswith(("http://", "https://")): continue
        seen.add(url)
        from urllib.parse import urlparse as _up
        out.append({"title": res.get("title", "") or url, "url": url, "label": verdict, "verdict": verdict,
                    "why": summary, "summary": summary, "excerpt": summary,
                    "domain": _up(url).netloc, "claim_quote": c["quote"], "claim_context": c["context"]})
    return out


@router.post("/api/readings")
async def readings(body: TextIn):
    try:
        s, u = prompts.claims_prompt(body.text)
        data, _, model = await llm.json_call(s, u, max_tokens=800, temperature=0.3)
        claims = filter_anchored(data.get("claims", []), body.text)[:4]
        per_claim = await asyncio.gather(*[_readings_for_claim(c) for c in claims])
        out = [row for rows in per_claim for row in rows]
        return ok(readings=out, claims=claims, model=model, meta=meta("readings", s, u, {}, model, 0, 0.3, 800))
    except Exception as e: return err(e)

@router.post("/api/research")
async def research(body: ResearchIn):
    url = body.url.strip()
    if not is_safe_public_url(url): return fail(error="url_blocked")
    try:
        if url.lower().split("?")[0].endswith(".pdf"):
            r = await llm.responses_call([{"role": "user", "content": [
                {"type": "input_text", "text": f"{body.question} Extract structured facts as JSON per schema. locator = page number if known."},
                {"type": "input_file", "file_url": url}]}],
                instructions=prompts.FACTS_SYSTEM, text_format=llm.FACTS_FORMAT, max_output_tokens=1800)
            facts = llm.extract_json(r["text"]).get("facts", []) if r.get("text") else []
        else:
            r = await llm.responses_call(f"Research this source for my writing: {url}\nQuestion: {body.question}\nOpen/search the source, then extract structured facts as JSON per schema.",
                instructions=prompts.FACTS_SYSTEM, tools=[{"type": "web_search", "search_context_size": "high"}], include=["web_search_call.results"], text_format=llm.FACTS_FORMAT, max_output_tokens=1800)
            facts = llm.extract_json(r["text"]).get("facts", []) if r.get("text") else []
            if not facts and r.get("text"):
                facts = [{"fact": r["text"][:400], "source_title": url, "url": url, "locator": "web", "excerpt": r["text"][:240]}]
        for f in facts: f.setdefault("url", url)
        return ok(facts=facts[:12], model=r.get("model", ""), usage=r.get("usage"))

    except Exception as e: return err(e)

@router.post("/api/research/upload")
async def research_upload(file: UploadFile = File(...), question: str = "Extract the key facts relevant to my writing, with sources."):
    try:
        content = await file.read()
        if len(content) > 20 * 1024 * 1024: return fail(error="file >20MB")
        # Local parse first: docx/csv/xlsx/txt/md → text fallback when Meta Files rejects binary
        local_text = citations.extract_doc_text(file.filename or "", content)
        if local_text:
            try:
                s, u = prompts.complete_prompt("", "General", local_text[:8000], "", "Phrase", "", "")
                data, usage, model = await llm.json_call(
                    prompts.FACTS_SYSTEM,
                    f"SOURCE: {file.filename}\nEXCERPT:\n{local_text[:8000]}\nQ: {question}\nReturn {{\"facts\":[...]}}.",
                    max_tokens=1800, temperature=0.3)
                facts = data.get("facts", []) if isinstance(data, dict) else []
                for f in facts:
                    f.setdefault("source_title", file.filename or "upload")
                    f.setdefault("url", file.filename or "upload")
                if facts: return ok(facts=facts[:12], model=model, usage=usage, parsed="local-text")
            except Exception: pass  # fall through to Meta Files path
        async with httpx.AsyncClient(timeout=60) as cl:
            up = await cl.post(f"{settings.meta_base_url}/files", headers={"Authorization": f"Bearer {settings.meta_api_key}"},
                               data={"purpose": "user_data"}, files={"file": (file.filename or "upload", content, file.content_type or "application/octet-stream")})
            up.raise_for_status(); fid = up.json().get("id", "")
            if not fid: return fail(error="Meta Files upload returned no id")
            r = await llm.responses_call([{"role": "user", "content": [
                {"type": "input_text", "text": f"{question} Extract structured facts as JSON per schema. locator = page/section if known."},
                {"type": "input_file", "file_id": fid}]}],
                instructions=prompts.FACTS_SYSTEM, text_format=llm.FACTS_FORMAT, max_output_tokens=1800)
        facts = llm.extract_json(r["text"]).get("facts", []) if r.get("text") else []
        for f in facts: f.setdefault("source_title", file.filename or "upload")
        return ok(facts=facts[:12], file_id=fid, model=r.get("model", ""))
    except Exception as e: return err(e)

@router.post("/api/cite")
async def cite(body: CiteIn):
    try:
        inline = citations.format_inline(body.source_title, body.url, body.locator, body.style, body.year)
        entry = citations.format_bibliography(body.source_title, body.url, body.locator, body.style, body.author, body.year)
        out = {"ok": True, "inline": inline, "entry": entry, "style": body.style.lower()}
        if body.template:
            out["sentence"] = citations.apply_template(body.template, inline, body.claim, body.excerpt, body.stat, body.term or body.claim)
        return out
    except Exception as e: return err(e)

@router.post("/api/cite/bibliography")
async def bibliography(body: BiblioIn):
    try:
        entries = [citations.format_bibliography(i.source_title, i.url, i.locator, body.style, i.author, i.year) for i in body.items[:50]]
        return ok(entries=entries, style=body.style.lower(), count=len(entries))
    except Exception as e: return err(e)
