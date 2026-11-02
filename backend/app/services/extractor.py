"""Content Extractor: fetch HTML + trafilatura parse. No LLM. SSRF-guarded."""
from __future__ import annotations
import asyncio
import json
import logging
import re

import httpx

from ..security import is_safe_public_url

log = logging.getLogger("byline.extractor")

UA = {"User-Agent": "Byline-Research/1.0 (+https://byline.app)"}
MAX_HTML = 2 * 1024 * 1024
MIN_TEXT = 500


def _fallback_text(html: str) -> str:
    txt = re.sub(r"<script.*?</script>|<style.*?</style>", " ", html, flags=re.DOTALL | re.IGNORECASE)
    txt = re.sub(r"<[^>]+>", " ", txt)
    txt = re.sub(r"\s+", " ", txt).strip()
    return txt


async def extract_page(url: str, timeout: float = 15.0) -> dict | None:
    """Fetch url + parse via trafilatura. Returns page dict or None on failure."""
    url = (url or "").strip()
    if not url.startswith(("http://", "https://")):
        return None
    if not is_safe_public_url(url):
        return None
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True, headers=UA) as cl:
            r = await cl.get(url)
            r.raise_for_status()
            html = r.text[:MAX_HTML]
    except Exception as e:  # noqa: BLE001
        log.info("extract fetch fail %s: %s", url[:120], e)
        return None
    title, text, author, date = "", "", "", ""
    try:
        import trafilatura

        raw = trafilatura.extract(html, output_format="json", with_metadata=True)
        if raw:
            try:
                d = json.loads(raw)
            except json.JSONDecodeError:
                d = {}
            text = (d.get("text") or "").strip()
            title = (d.get("title") or "").strip()
            author = (d.get("author") or "").strip()
            date = (d.get("date") or "").strip()
    except ImportError:
        log.warning("trafilatura missing, fallback parse")
    except Exception as e:  # noqa: BLE001
        log.info("trafilatura fail %s: %s", url[:120], e)
    if not text or len(text) < MIN_TEXT:
        fb = _fallback_text(html)
        if len(fb) > len(text):
            text = fb
        if not title:
            m = re.search(r"<title[^>]*>(.*?)</title>", html, re.DOTALL | re.IGNORECASE)
            if m:
                title = re.sub(r"\s+", " ", m.group(1)).strip()[:300]
    if not text or len(text) < MIN_TEXT:
        return None
    text = text[:20000]
    return {
        "url": url,
        "title": title or url,
        "author": author,
        "date": date,
        "text": text,
        "excerpt": text[:500],
    }


async def extract_pages(urls: list[str], concurrency: int = 4) -> list[dict]:
    """Batch fetch. Preserves input order for successes, skips failures."""
    sem = asyncio.Semaphore(max(1, concurrency))

    async def _one(u: str) -> dict | None:
        async with sem:
            return await extract_page(u)

    out = await asyncio.gather(*[_one(u) for u in urls])
    seen: set[str] = set()
    pages: list[dict] = []
    for p in out:
        if not p or p["url"] in seen:
            continue
        seen.add(p["url"])
        pages.append(p)
    return pages
