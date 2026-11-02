"""Content Extractor: fetch HTML + trafilatura parse. No LLM. SSRF-guarded."""
from __future__ import annotations
import asyncio
import json
import logging
import re
from urllib.parse import urljoin, urlparse

import httpx

from ..security import is_safe_public_url

log = logging.getLogger("byline.extractor")

UA = {"User-Agent": "Byline-Research/1.0 (+https://byline.app)"}
MAX_HTML = 2 * 1024 * 1024
MIN_TEXT = 500
# Redirects are followed manually so every hop is re-validated; httpx's
# follow_redirects would fetch whatever Location header an attacker returns.
MAX_REDIRECTS = 5
_REDIRECT_STATUSES = {301, 302, 303, 307, 308}
# Non-standard ports are a classic SSRF hole (internal admin panels, etc.).
_ALLOWED_PORTS = {80, 443}


def _validate_fetch_url(url: str) -> bool:
    """True only if this exact URL is safe to fetch right now."""
    try:
        p = urlparse(url)
    except Exception:  # noqa: BLE001
        return False
    if p.scheme not in ("http", "https") or not p.hostname:
        return False
    if p.username or p.password:
        return False
    try:
        port = p.port or (443 if p.scheme == "https" else 80)
    except ValueError:
        return False
    if port not in _ALLOWED_PORTS:
        return False
    # Validated again immediately before every connect (including each
    # redirect hop) to narrow the DNS-rebinding (TOCTOU) window. Residual
    # risk is inherent without connect-time IP pinning.
    return bool(is_safe_public_url(url))


def _fallback_text(html: str) -> str:
    txt = re.sub(r"<script.*?</script>|<style.*?</style>", " ", html, flags=re.DOTALL | re.IGNORECASE)
    txt = re.sub(r"<[^>]+>", " ", txt)
    txt = re.sub(r"\s+", " ", txt).strip()
    return txt


async def _read_capped(r: httpx.Response, cap: int = MAX_HTML) -> str:
    """Stream the body and stop downloading once cap bytes are buffered."""
    parts: list[str] = []
    size = 0
    async for chunk in r.aiter_text():
        size += len(chunk)
        if size >= cap:
            keep = len(chunk) - (size - cap)
            if keep > 0:
                parts.append(chunk[:keep])
            break
        parts.append(chunk)
    return "".join(parts)


async def extract_page(url: str, timeout: float = 15.0) -> dict | None:
    """Fetch url + parse via trafilatura. Returns page dict or None on failure."""
    url = (url or "").strip()
    if not _validate_fetch_url(url):
        return None
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=False, headers=UA) as cl:
            current, html, moved = url, None, False
            for _ in range(MAX_REDIRECTS + 1):
                if not _validate_fetch_url(current):
                    log.info("extract blocked hop %s", current[:120])
                    return None
                async with cl.stream("GET", current) as r:
                    loc = r.headers.get("location", "")
                    if r.status_code in _REDIRECT_STATUSES and loc:
                        current = urljoin(current, loc.strip())
                        moved = True
                    else:
                        r.raise_for_status()
                        html = await _read_capped(r)
                        moved = False
                if not moved:
                    break
            else:
                log.info("extract too many redirects %s", url[:120])
                return None
            assert html is not None
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
