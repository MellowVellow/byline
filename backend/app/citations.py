"""Citation formatting: APA / MLA / Chicago + inline templates. Pure fns, no network."""
from __future__ import annotations
import re
from datetime import date

STYLES = ("apa", "mla", "chicago")


def _author_last(title: str) -> str:
    t = (title or "").strip()
    return t[:60] if t else "n.d."


# Sentinel author values meaning "no author given" (APA: use the title
# instead). An explicit "Anonymous" is a real byline — keep it as the author.
_UNKNOWN_AUTHOR_TOKENS = {"unknown", "anon", "n.a.", "na", ""}


def is_unknown_author(authors) -> bool:
    """True when no usable author exists (APA: substitute the title)."""
    if not authors:
        return True
    if not isinstance(authors, list) or len(authors) != 1:
        return False
    a = authors[0]
    if isinstance(a, dict):
        if (a.get("family") or "").strip():
            return False
        key = (a.get("literal") or "").strip()
    elif isinstance(a, str):
        key = a.strip()
    else:
        return False
    if not key:
        return True
    if key.lower() == "anonymous":
        return False
    return key.lower().rstrip(".") in _UNKNOWN_AUTHOR_TOKENS


def title_short(title: str, n: int = 4) -> str:
    """First few words of the title for in-text citations (APA)."""
    words = (title or "").strip().split()
    short = " ".join(words[:max(1, n)]).rstrip(",;:")
    return short or "Untitled"


def format_inline(source_title: str = "", url: str = "", locator: str = "",
                  style: str = "apa", year: str = "") -> str:
    """Short inline citation, e.g. APA: (Title, p. 3)."""
    style = (style or "apa").lower()
    t = (source_title or url or "source").strip()
    loc = f", {locator.strip()}" if locator and locator.strip() else ""
    y = year.strip() if year else ""
    if style == "mla":
        return f'("{t}"{loc})'
    if style == "chicago":
        return f'({t}{loc}, {url})'.replace(", )", ")") if url else f"({t}{loc})"
    return f"({t}{f', {y}' if y else ''}{loc})"


def format_bibliography(source_title: str = "", url: str = "", locator: str = "",
                        style: str = "apa", author: str = "", year: str = "",
                        accessed: str = "") -> str:
    """Full bibliography entry."""
    style = (style or "apa").lower()
    t = (source_title or "Untitled source").strip()
    u = (url or "").strip()
    acc = accessed or date.today().isoformat()
    y = year.strip() if year else "n.d."
    a = author.strip() or _author_last(t)
    if style == "mla":
        return f'{a}. "{t}." {u}, Accessed {acc}.'.strip()
    if style == "chicago":
        return f'{a}, "{t}," {u} (accessed {acc}).'.strip()
    return f"{a}. ({y}). {t}. {u}".strip()


CITATION_TEMPLATES = {
    "support": "According to {inline}, {claim} — {excerpt}",
    "contrast": "However, {inline} qualifies this: {excerpt}",
    "stat": "{claim} ({stat} per {inline})",
    "define": "{term} is defined as {excerpt} {inline}",
}

CITATION_TYPES = ("intext", "narr", "paren", "direct", "para")


def _apa_authors(authors) -> str:
    """CSL author list -> APA author string. Empty when author unknown
    (callers move the title to the author position instead)."""
    if not authors or is_unknown_author(authors):
        return ""
    parts = []
    for a in authors:
        if isinstance(a, dict) and a.get("literal"):
            parts.append(a["literal"])
        elif isinstance(a, dict) and a.get("family"):
            fam = a.get("family", "")
            giv = (a.get("given") or "").strip()
            parts.append(f"{fam}, {giv[0]}." if giv else fam)
        elif isinstance(a, str) and a.strip():
            parts.append(a.strip())
    if len(parts) > 1:
        return ", ".join(parts[:-1]) + ", & " + parts[-1]
    return parts[0] if parts else ""


def _apa_year(source: dict) -> str:
    try:
        dp = ((source or {}).get("issued") or {}).get("date-parts") or [[]]
        y = dp[0][0] if dp and dp[0] else ""
        return str(y) if y else "n.d."
    except Exception:
        return "n.d."


def _second_author_surname(a) -> str:
    if isinstance(a, dict):
        if a.get("literal"):
            parts = a["literal"].split()
            return parts[0].rstrip(",.;") if parts else ""
        return a.get("family") or ""
    if isinstance(a, str):
        parts = a.strip().split()
        return parts[0].rstrip(",.;") if parts else ""
    return ""


def _apa_first_cite(source: dict) -> str:
    authors = (source or {}).get("author") or []
    title = ((source or {}).get("title") or "").strip()
    if is_unknown_author(authors):
        # APA: first few words of the title in double quotes (it appears in
        # plain text in our reference list, never italicized).
        return f'"{title_short(title)}"'
    if authors and isinstance(authors[0], dict):
        a0 = authors[0]
        if a0.get("literal"):
            lit = (a0.get("literal") or "").strip()
            if re.search(r"\bet al\b", lit, re.I):
                first = lit
            else:
                first = lit.split()[0] if lit.split() else "Anon"
        else:
            first = a0.get("family") or "Anon"
    elif authors and isinstance(authors[0], str):
        first = authors[0].split()[0]
    else:
        t = (title or "Anon").strip()
        return t.split()[0] if t.split() else "Anon"
    if len(authors) >= 3 and "et al" not in first.lower():
        first += " et al."
    elif len(authors) == 2:
        second = _second_author_surname(authors[1])
        if second:
            first = f"{first} & {second}"
    return first


def format_apa_inline(source: dict, ctype: str = "paren", page: int = 0) -> str:
    """Deterministic APA inline for a CSL-like source dict."""
    ctype = (ctype or "paren").lower()
    year = _apa_year(source)
    first = _apa_first_cite(source)
    is_pdfish = ((source or {}).get("type") in ("article-journal", "report")) or page
    loc = f", p. {page}" if page and ctype in ("paren", "direct", "intext") else ""
    if ctype == "narr":
        return f"{first} ({year})"
    return f"({first}, {year}{loc})"


def format_apa_reference(source: dict) -> str:
    """Deterministic APA7 reference line from CSL-like source dict."""
    s = source or {}
    unknown = is_unknown_author(s.get("author"))
    au = "" if unknown else _apa_authors(s.get("author"))
    if not au and not unknown:
        au = _apa_first_cite(s)
    year = _apa_year(s)
    title = (s.get("title") or "Untitled").strip()
    stype = (s.get("type") or "webpage")
    url = (s.get("URL") or s.get("url") or "").strip()
    doi = (s.get("DOI") or s.get("doi") or "").strip()
    container = (s.get("container-title") or s.get("container") or "").strip()
    acc = ""
    try:
        dp = (s.get("accessed") or {}).get("date-parts") or [[]]
        if dp and len(dp[0]) >= 3:
            y, m, d = dp[0][:3]
            from datetime import date as _d
            acc = _d(int(y), int(m), int(d)).strftime("Retrieved %B %d, %Y, from ")
    except Exception:
        acc = ""
    link = f"https://doi.org/{doi}" if doi else url
    if unknown:
        # APA: move the full title to the author position, then the date.
        t = title.rstrip(".")
        if stype == "article-journal":
            base = f"{t}. ({year}). {container}." if container else f"{t}. ({year})."
            return f"{base} {link}".strip() if link and link not in base else base
        if stype == "webpage":
            base = f"{t}. ({year})."
            if container:
                base += f" {container}."
            return f"{base} {acc}{link}".strip() if link else base
        base = f"{t}. ({year}). [Report]."
        return f"{base} {link}".strip() if link else base
    link = f"https://doi.org/{doi}" if doi else url
    if stype == "article-journal":
        vol = s.get("volume") or s.get("vol") or ""
        iss = s.get("issue") or s.get("iss") or ""
        pages = s.get("pages") or s.get("page") or ""
        tail = f"{container}, {vol}({iss}), {pages}".strip(" ,") if container else title
        base = f"{au} ({year}). {title}. {tail}." if container else f"{au} ({year}). {title}."
        return f"{base} {link}".strip() if link and link not in base else base
    if stype == "webpage":
        site = container or ""
        base = f"{au} ({year}). {title}."
        if site:
            base += f" {site}."
        return f"{base} {acc}{link}".strip() if link else base
    base = f"{au} ({year}). {title} [Report]."
    return f"{base} {link}".strip() if link else base


def normalize_text(t: str) -> str:
    t = (t or "").lower().replace("-\n", "").replace("-\r", "")
    t = re.sub(r"[^a-z0-9% ]+", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def passage_found(passage: str, text: str) -> bool:
    if not passage or not passage.strip():
        return False
    return normalize_text(passage) in normalize_text(text)


def apply_template(name: str, inline: str = "", claim: str = "",
                   excerpt: str = "", stat: str = "", term: str = "") -> str:
    tpl = CITATION_TEMPLATES.get(name, CITATION_TEMPLATES["support"])
    return tpl.format(inline=inline, claim=claim, excerpt=excerpt, stat=stat, term=term)


def extract_doc_text(filename: str, content: bytes) -> str:
    """Best-effort local text extraction for docx/csv/txt/md. xlsx needs openpyxl (optional)."""
    name = (filename or "").lower()
    try:
        if name.endswith(".docx"):
            import zipfile
            import xml.etree.ElementTree as ET
            with zipfile.ZipFile(__import__("io").BytesIO(content)) as z:
                infos = z.infolist()
                if len(infos) > 200 or sum(i.file_size for i in infos) > 5_000_000: return ""
                xml = z.read("word/document.xml")
            ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
            paras = []
            for p in ET.fromstring(xml).findall(".//w:p", ns):
                paras.append("".join(t.text or "" for t in p.findall(".//w:t", ns)))
            return "\n".join(paras)[:20000]
        if name.endswith((".csv", ".tsv", ".txt", ".md", ".markdown")):
            return content.decode("utf-8", errors="replace")[:20000]
        if name.endswith(".xlsx"):
            try:
                from openpyxl import load_workbook  # optional dep
                import io
                wb = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
                out = []
                for ws in wb.worksheets[:4]:
                    out.append(f"## Sheet: {ws.title}")
                    for row in list(ws.iter_rows(values_only=True))[:60]:
                        out.append(", ".join("" if v is None else str(v) for v in row))
                return "\n".join(out)[:20000]
            except ImportError:
                return ""
    except Exception:
        return ""
    return ""
