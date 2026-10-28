"""Grammar post-filter: defined-acronym suppression + overlap dedupe.

LanguageTool spelling rule flags every defined acronym (VAD, VRET...) at every
occurrence. If text defines it as `Long Form (ACRONYM)` or `(ACRONYM)`, drop
spelling matches on that acronym and any match inside the definition span.
Also drop duplicate/overlapping matches (double red flags on same span).
"""
from __future__ import annotations
import re

_DEF_SPAN = re.compile(r"[A-Za-z][\w'’-]*(?:[\s\-–—]+[A-Za-z][\w'’-]*){0,8}\s*\(([A-Z][A-Z0-9]{1,9})\)")
_PAREN_ACRO = re.compile(r"\(([A-Z][A-Z0-9]{1,9})\)")
SPELL_RULES = ("MORFOLOGIK", "SPELLER", "HUNSPELL")

def _us_normalized(w: str) -> str:
    """Collapse regional spelling variants (GB/AU -> US) for comparison."""
    w = w.lower()
    w = re.sub(r"isation$", "ization", w)
    w = re.sub(r"ising$", "izing", w)
    w = re.sub(r"ised$", "ized", w)
    w = re.sub(r"ise$", "ize", w)
    w = re.sub(r"our$", "or", w)
    w = re.sub(r"tre$", "ter", w)
    w = re.sub(r"ogue$", "og", w)
    w = re.sub(r"lled$", "led", w)
    w = re.sub(r"lling$", "ling", w)
    return w


def is_regional_variant(word: str, replacements: list) -> bool:
    """True when a replacement is the same word in another English locale
    (utilisation<->utilization, colour<->color): never a spelling error."""
    if not replacements:
        return False
    return any(_us_normalized(str(r)) == _us_normalized(word) for r in replacements)


def defined_acronyms(text: str) -> set[str]:
    return {m.group(1) for m in _PAREN_ACRO.finditer(text)}

def definition_spans(text: str) -> list[tuple[int, int]]:
    return [(m.start(), m.end()) for m in _DEF_SPAN.finditer(text)]

def _in_spans(frm: int, to: int, spans: list[tuple[int, int]]) -> bool:
    return any(frm >= s and to <= e for s, e in spans)

def filter_matches(text: str, matches: list[dict]) -> list[dict]:
    acros = defined_acronyms(text)
    spans = definition_spans(text)
    kept: list[dict] = []
    for m in matches:
        frm, to = int(m.get("from", 0)), int(m.get("to", 0))
        word = text[frm:to]
        rule = str(m.get("rule", "")).upper()
        is_spelling = any(r in rule for r in SPELL_RULES) or "spelling" in str(m.get("message", "")).lower()
        if word in acros:
            continue  # defined acronym, any occurrence
        if is_spelling and is_regional_variant(word, m.get("replacements") or []):
            continue  # regional spelling variant (GB/AU/US), not an error
        if is_spelling and len(word) >= 2 and word.isupper():
            continue  # all-caps token: treat as acronym/abbreviation, not typo
        if _in_spans(frm, to, spans):
            continue  # inside "Long Form (ACRONYM)" definition itself
        kept.append(m)
    return dedupe_overlaps(kept)

def dedupe_overlaps(matches: list[dict]) -> list[dict]:
    """One flag per span: drop matches overlapping an already-kept match."""
    ordered = sorted(matches, key=lambda m: (int(m.get("from", 0)), -(int(m.get("to", 0)) - int(m.get("from", 0)))))
    kept: list[dict] = []
    for m in ordered:
        frm, to = int(m.get("from", 0)), int(m.get("to", 0))
        if any(frm < int(k.get("to", 0)) and int(k.get("from", 0)) < to for k in kept):
            continue
        kept.append(m)
    return kept
