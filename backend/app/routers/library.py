"""Library: fetch (jina/tavily) -> parse-once -> rank -> cite-variants. No scraper."""
from __future__ import annotations
import json
import re
import tempfile
import time
from datetime import date
from pathlib import Path
from fastapi import APIRouter, UploadFile, File
import httpx
from .. import llm, prompts, citations, cache, budget
from ..config import settings
from ..models import LibraryFetchIn, LibraryParseIn, LibraryRankIn, LibraryVisionIn
from ..security import is_safe_public_url
from .common import ok, fail, err, meta

router = APIRouter()

SOURCE_TYPES = {"fact", "quote", "stat"}
AI_TYPES = {"idea", "question", "premise", "term", "visual"}
ALL_TYPES = SOURCE_TYPES | AI_TYPES | {"claim", "opinion"}


def _today_parts():
    t = date.today()
    return {"date-parts": [[t.year, t.month, t.day]]}


_BOILERPLATE_RES = [
    re.compile(r"\bissn\b[:\s]", re.I),
    re.compile(r"\bdoi\b[:\s]", re.I),
    re.compile(r"©|\(c\)|copyright|all rights reserved", re.I),
    re.compile(r"by the authors|licensee|open access|creative commons", re.I),
    re.compile(r"correspondence:|corresponding author", re.I),
    re.compile(r"^[\w.+-]+@[\w-]+\.[\w.]+$"),  # bare email line
]

_DOI_RE = re.compile(r"10\.\d{4,}/[^\s)\"']+")
_YEAR_RE = re.compile(r"\b(19|20)\d{2}\b")


def extract_pdf_meta(raw: str) -> dict:
    """Deterministic DOI + year from raw PDF text (no LLM)."""
    meta: dict = {"doi": "", "year": ""}
    m = _DOI_RE.search(raw or "")
    if m:
        meta["doi"] = m.group(0).rstrip(".,;")
    head = (raw or "")[:3000]
    years = _YEAR_RE.findall(head)
    if years:
        from collections import Counter
        # findall with group returns prefix; re-scan for full years.
        full = re.findall(r"\b(?:19|20)\d{2}\b", head)
        recur = [y for y in full if 1900 <= int(y) <= date.today().year + 1]
        if recur:
            meta["year"] = Counter(recur).most_common(1)[0][0]
    return meta


def clean_pdf_text(pages: list[str]) -> str:
    """Strip running heads/footers + boilerplate so the LLM never cards them.

    Removes lines repeated across pages (journal headers, footers, page
    numbers) and lines matching ISSN/DOI/copyright/correspondence patterns,
    plus the References section tail.
    """
    norm_counts: dict[str, int] = {}
    split_pages = [[ln.strip() for ln in (pg or "").splitlines()] for pg in pages]
    for lines in split_pages:
        seen = set()
        for ln in lines:
            key = re.sub(r"\s+", " ", ln).strip().lower()
            if len(key) > 8 and key not in seen:
                seen.add(key)
                norm_counts[key] = norm_counts.get(key, 0) + 1
    repeat_at = max(2, int(len(split_pages) * 0.4))
    repeated = {k for k, n in norm_counts.items() if n >= repeat_at}

    out_lines: list[str] = []
    for lines in split_pages:
        for ln in lines:
            if not ln:
                out_lines.append("")
                continue
            key = re.sub(r"\s+", " ", ln).strip().lower()
            if key in repeated:
                continue
            if re.fullmatch(r"\d{1,5}", ln.strip()):  # page number
                continue
            if any(rx.search(ln) for rx in _BOILERPLATE_RES):
                continue
            out_lines.append(ln)
    text = "\n".join(out_lines)
    # Cut the reference list: cards must never come from it.
    m = re.search(r"(?im)^\s*references\s*$", text)
    if m and m.start() > len(text) * 0.3:
        text = text[:m.start()]
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text


async def _fetch_jina(url: str) -> str:
    base = settings.jina_base_url
    target = f"{base}/{url}" if not url.startswith(base) else url
    async with httpx.AsyncClient(timeout=25, follow_redirects=True) as cl:
        r = await cl.get(target, headers={"Accept": "text/markdown", "X-No-Cache": "true"})
        r.raise_for_status()
        txt = r.text or ""
        # Jina error banners are short; treat as failure so tavily runs.
        if len(txt.strip()) < 400:
            raise ValueError("jina_empty")
        return txt[:25000]


async def _fetch_tavily(url: str, query: str = "") -> str:
    key = settings.tavily_api_key
    if not key:
        raise ValueError("tavily_missing")
    async with httpx.AsyncClient(timeout=30) as cl:
        r = await cl.post("https://api.tavily.com/extract", json={
            "api_key": key, "urls": [url], "query": query or "key facts",
            "extract_depth": "advanced",
        })
        r.raise_for_status()
        d = r.json()
        items = d.get("results") or d.get("data") or []
        if items and isinstance(items, list):
            txt = (items[0].get("raw_content") or items[0].get("content") or "").strip()
            if len(txt) > 200:
                return txt[:25000]
        raise ValueError("tavily_empty")


@router.post("/api/library/fetch")
async def library_fetch(body: LibraryFetchIn):
    url = (body.url or "").strip()
    if not url or not is_safe_public_url(url):
        return fail(error="url_blocked")
    t0 = time.perf_counter()
    via = ""
    try:
        try:
            text = await _fetch_jina(url)
            via = "jina"
        except Exception:
            text = await _fetch_tavily(url, body.question)
            via = "tavily"
        return ok(text=text, via=via, url=url,
                  meta=meta("library/fetch", "", url, {}, "fetch", (time.perf_counter() - t0) * 1000, 0, 0))
    except Exception as e:
        return err(e)


def _coerce_cards(data: dict, url: str, filename: str) -> tuple[list, dict]:
    raw = data.get("cards", []) if isinstance(data, dict) else []
    cards = []
    for i, c in enumerate(raw[:10]):
        if not isinstance(c, dict):
            continue
        t = str(c.get("type", "fact")).lower().strip()
        if t == "claim":
            t = "fact"
        if t == "opinion":
            t = "idea"
        if t not in ALL_TYPES:
            t = "fact"
        kind = "source" if t in SOURCE_TYPES else "ai"
        finding = str(c.get("finding", "")).strip()[:500]
        passage = str(c.get("passage", "")).strip()[:1000]
        if kind == "source" and not passage:
            passage = finding  # LLM must give exact sentence; fallback keeps quotecheck honest
        if not finding:
            continue
        try:
            page = int(c.get("page", 0) or 0)
        except Exception:
            page = 0
        cards.append({
            "type": t, "kind": kind, "finding": finding, "passage": passage,
            "why_useful": str(c.get("why_useful", ""))[:200],
            "page": page, "vision": False,
        })
    src = data.get("source", {}) if isinstance(data, dict) else {}
    if not isinstance(src, dict):
        src = {}
    authors = src.get("author") or src.get("authors") or []
    if isinstance(authors, str):
        authors = [authors]
    norm_auth = []
    for a in (authors if isinstance(authors, list) else [])[:5]:
        if isinstance(a, dict):
            if a.get("family") or a.get("literal"):
                norm_auth.append(a)
            elif a.get("name"):
                norm_auth.append({"literal": str(a["name"]).strip()})
        elif isinstance(a, str) and a.strip():
            s = a.strip()
            if "et al" in s.lower():
                norm_auth.append({"literal": re.sub(r"\bet al\.?", "et al.", s, flags=re.I)})
            else:
                parts = s.split()
                norm_auth.append({"family": parts[-1], "given": " ".join(parts[:-1])})
    if not norm_auth:
        norm_auth = [{"literal": "Unknown"}]
    prov = src.get("provenance") or {}
    issued = src.get("issued") or {"date-parts": [[date.today().year]]}
    doi = (src.get("DOI") or src.get("doi") or "").strip()
    if doi and not doi.startswith("http"):
        doi = doi.rstrip(".,;")
    source = {
        "type": src.get("type") or ("webpage" if not filename.lower().endswith(".pdf") else "report"),
        "title": (src.get("title") or filename or url or "Untitled source")[:300],
        "author": norm_auth,
        "container-title": src.get("container-title", ""),
        "issued": issued, "DOI": doi,
        "URL": src.get("URL") or src.get("url") or url, "accessed": _today_parts(),
        "provenance": {
            "author": prov.get("author", "inferred") if isinstance(prov, dict) else "inferred",
            "issued": prov.get("issued", "inferred") if isinstance(prov, dict) else "inferred",
        },
    }
    return cards, source


def _fallback_card_dicts(text: str) -> list:
    """First sentences become fact cards so the UI stays usable offline."""
    sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", (text or "")[:4000]) if len(s.strip()) > 40][:4]
    return [
        {"type": "fact", "finding": s[:300], "passage": s[:500],
         "why_useful": "from page text", "page": 1} for s in sents
    ]


@router.post("/api/library/parse")
async def library_parse(body: LibraryParseIn):
    text = (body.text or "").strip()
    if len(text) < 50:
        return fail(error="text_too_short")
    try:
        ck = cache.key("library:parse", (body.url or "")[:300], (body.filename or "")[:100], text[:2000])
        hit = cache.get(ck)
        if hit is not None and hit.get("cards"):
            return ok(**hit, cached=True)
        s, u = prompts.library_parse_prompt(text, body.url, body.filename, body.card_cap or 8)
        t0 = time.perf_counter()
        try:
            data, usage, model = await llm.json_call(s, u, max_tokens=2200, temperature=0.3)
        except Exception:
            # Deterministic fallback: first sentences become fact cards so UI stays usable.
            data = {"cards": _fallback_card_dicts(text), "source": {}}
            usage, model = {}, "fallback:deterministic"
        cards, source = _coerce_cards(data if isinstance(data, dict) else {}, body.url, body.filename)
        if not cards:
            # LLM returned valid JSON but zero usable cards: deterministic fallback, never "0 cards".
            src_block = data.get("source", {}) if isinstance(data, dict) else {}
            data = {"cards": _fallback_card_dicts(text), "source": src_block}
            cards, source = _coerce_cards(data, body.url, body.filename)
            model = "fallback:empty-cards"
        if source["author"] == [{"literal": "Unknown"}] and len(text) > 500:
            # Second chance: metadata-only pass often succeeds where the big
            # parse returns an empty source block.
            try:
                s2, u2 = prompts.library_source_prompt(text)
                data2, _, _ = await llm.json_call(s2, u2, max_tokens=800, temperature=0.2)
                _, retry_src = _coerce_cards(
                    {"cards": [], "source": (data2.get("source", {}) if isinstance(data2, dict) else {})},
                    body.url, body.filename)
                if retry_src["author"] != [{"literal": "Unknown"}]:
                    retry_src["provenance"] = {"author": "verified", "issued": "verified"}
                    source = retry_src
            except Exception:
                pass
        # Quotacheck: exact normalized match; flag failures, drop empties.
        verified, flagged = [], 0
        for c in cards:
            if c["kind"] == "ai":
                c["status"] = "derived"
                verified.append(c)
                continue
            if citations.passage_found(c["passage"], text):
                c["status"] = "found"
                verified.append(c)
            else:
                c["status"] = "flagged"
                flagged += 1
                verified.append(c)
        out = {"cards": verified, "source": source, "flagged": flagged,
               "meta": meta("library/parse", s, u, usage, model, (time.perf_counter() - t0) * 1000, 0.3, 2200)}
        if verified:
            # Never cache empty results: a transient empty LLM reply must not
            # poison retries for the same document.
            cache.set(ck, {"cards": out["cards"], "source": source, "flagged": flagged, "model": model})
        return ok(cards=verified, source=source, flagged=flagged, model=model, usage=usage, meta=out["meta"]) if verified else fail(error="no_cards_extracted")
    except Exception as e:
        return err(e)


@router.post("/api/library/pdf")
async def library_pdf(file: UploadFile = File(...)):
    try:
        content = await file.read()
        if len(content) > settings.body_limit_mb * 1024 * 1024:
            return fail(error="file_too_large")
        name = (file.filename or "upload.pdf").lower()
        if not name.endswith(".pdf"):
            return fail(error="not_a_pdf")
        from pdf_oxide import PdfDocument

        pages: list[dict] = []
        raw_full: list[str] = []
        needs_vision: list[int] = []
        page_count = 0
        char_total = 0
        CHAR_CAP = 1_000_000
        PAGE_LIMIT = 50

        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        try:
            with PdfDocument(tmp_path) as doc:
                page_count = len(doc)
                for i in range(min(page_count, PAGE_LIMIT)):
                    page = doc[i]
                    t = (page.text or "").strip()
                    if char_total + len(t) > CHAR_CAP:
                        t = t[: max(0, CHAR_CAP - char_total)]
                    pages.append({"page": i + 1, "chars": len(t), "text": t})
                    raw_full.append(t)
                    char_total += len(t)
                    if len(t) < 200:
                        needs_vision.append(i + 1)
                    if char_total >= CHAR_CAP:
                        break
        finally:
            try:
                Path(tmp_path).unlink()
            except OSError:
                pass

        raw_text = "\n\n".join(raw_full)
        cleaned = clean_pdf_text(raw_full)
        ver = extract_pdf_meta(raw_text)
        if ver["doi"] or ver["year"]:
            cleaned = (f"[VERIFIED: DOI={ver['doi'] or '?'}; YEAR={ver['year'] or '?'}]\n\n" + cleaned)

        return ok(pages=pages, text=cleaned[:CHAR_CAP], raw_text=raw_text[:CHAR_CAP],
                  verified=ver,
                  needs_vision=needs_vision, page_count=page_count,
                  filename=file.filename or "upload.pdf")
    except Exception as e:
        return err(e)


@router.post("/api/library/vision")
async def library_vision(body: LibraryVisionIn):
    try:
        if not body.image_data_url.startswith("data:image"):
            return fail(error="bad_image")
        r = await llm.responses_call(
            [{"role": "user", "content": [
                {"type": "input_text", "text": (
                    f"Describe figure on page {body.page} of '{body.source_title}'. "
                    f"Hint: {body.hint}. Return JSON {{\"cards\":[...]}} per library schema; "
                    "visual cards allowed, passage may be empty.")},
                {"type": "input_image", "image_url": body.image_data_url[:500000]}]}],
            instructions=prompts.LIBRARY_PARSE_SYSTEM,
            max_output_tokens=1200)
        if r.get("mock"):
            return ok(cards=[{"type": "visual", "kind": "ai", "finding": "Figure shows trend (offline mock).",
                              "passage": "", "why_useful": "mock", "page": body.page,
                              "vision": True, "status": "vision"}],
                      model=r.get("model", ""), mock=True)
        data = llm.extract_json(r.get("text") or "{}")
        cards, _ = _coerce_cards(data, "", body.source_title)
        for c in cards:
            c["vision"] = True
            c["page"] = body.page
            c["status"] = "vision"
        return ok(cards=cards[:4], model=r.get("model", ""))
    except Exception as e:
        return err(e)


@router.post("/api/library/rank")
async def library_rank(body: LibraryRankIn):
    try:
        cards = [c for c in body.cards if isinstance(c, dict)][:30]
        if not cards or not body.paragraph.strip():
            ids = [str(c.get("id", "")) for c in cards[:5]]
            return ok(ids=ids, mock=False)
        slim = json.dumps([{"id": c.get("id"), "type": c.get("type"),
                            "finding": (c.get("finding") or "")[:200]} for c in cards])[:8000]
        s, u = prompts.library_rank_prompt(body.paragraph, slim)
        data, usage, model = await llm.json_call(s, u, max_tokens=300, temperature=0.2)
        ids = [str(x) for x in (data.get("ids") or []) if isinstance(x, str)][:5]
        valid = {str(c.get("id")) for c in cards}
        ids = [i for i in ids if i in valid]
        for c in cards:
            if str(c.get("id")) not in ids and len(ids) < 5:
                ids.append(str(c.get("id")))
        return ok(ids=ids[:5], model=model, usage=usage, meta=meta("library/rank", s, u, usage, model, 0, 0.2, 300))
    except Exception as e:
        return err(e)


CITE_TYPES = ("intext", "narr", "paren", "direct", "para")
