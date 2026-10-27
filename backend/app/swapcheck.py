"""Deterministic replacement validation: a swap must fit the slot grammatically.

Two layers:
1. Slot heuristics (no network): noun slot after a/an/the cannot take a bare
   determiner ("A plethora" -> "A many" is wrong: plethora=noun, many=determiner),
   article a/an must agree with following sound, bare determiner cannot head a
   content-word slot.
2. LanguageTool differential: swapped sentence must add no new rule hits vs original.
Fail-open if LT is down (heuristics still apply).
"""
from __future__ import annotations
import re
from collections import Counter
import httpx
from .config import settings

DETERMINERS = {"many", "much", "few", "fewer", "several", "various", "numerous", "multiple", "countless", "some", "any", "no", "all", "both", "each", "every", "another", "other"}
ARTICLES = {"a", "an", "the"}
_WORD_END = re.compile(r"([A-Za-z']+)\W*$")
_WORD_START = re.compile(r"\W*([A-Za-z']+)")

def _before_word(text: str, idx: int) -> str:
    m = _WORD_END.search(text[:idx])
    return m.group(1).lower() if m else ""

def _first_word(s: str) -> str:
    m = _WORD_START.match(s or "")
    return m.group(1).lower() if m else ""

def slot_ok(text: str, idx: int, quote: str, replacement: str) -> bool:
    rep = (replacement or "").strip()
    if not rep:
        return True
    first = _first_word(rep)
    before = _before_word(text, idx)
    quote_first = _first_word(quote)
    # bare determiner cannot replace a content word (noun/adj slot) on its own
    if rep.split().__len__() == 1 and first in DETERMINERS and quote_first not in DETERMINERS:
        return False
    # "A many of..." : article + determiner clash
    if before in ARTICLES and first in DETERMINERS:
        return False
    # a/an agreement
    if before == "a" and first[:1] in "aeiou":
        return False
    if before == "an" and first[:1] and first[:1] not in "aeiou":
        return False
    return True

def sentence_around(text: str, idx: int) -> tuple[str, int]:
    """Return (sentence containing idx, idx relative to sentence start)."""
    start = max(text.rfind(c, 0, idx) for c in ".!?\n") + 1
    ends = [e for e in (text.find(c, idx) for c in ".!?\n") if e != -1]
    end = (min(ends) + 1) if ends else len(text)
    return text[start:end].strip(), idx - start

async def lt_rule_counts(sentence: str) -> Counter | None:
    try:
        async with httpx.AsyncClient(timeout=6) as cl:
            r = await cl.post(settings.languagetool_url, data={"text": sentence, "language": "en-US", "level": "picky"})
            r.raise_for_status()
            return Counter((m.get("rule") or {}).get("id", "?") for m in r.json().get("matches", []))
    except Exception:
        return None

def adds_error(base: Counter, cand: Counter) -> bool:
    return any(cand[k] > base.get(k, 0) for k in cand)

async def swap_ok(text: str, quote: str, replacement: str, _cache: dict | None = None, context: str = "") -> bool:
    """Full check for replacing the context-located occurrence of quote in text."""
    if not replacement:
        return True
    idx = -1
    if context:
        ci = text.find(context)
        if ci >= 0:
            qi = context.find(quote)
            if qi >= 0: idx = ci + qi
    if idx < 0: idx = text.find(quote)
    if idx < 0:
        return False
    if not slot_ok(text, idx, quote, replacement):
        return False
    sentence, rel = sentence_around(text, idx)
    q_at = sentence.find(quote, max(0, rel - 2))
    if q_at < 0:
        q_at = sentence.find(quote)
    if q_at < 0:
        return True  # cannot reconstruct: heuristics passed
    candidate = sentence[:q_at] + replacement + sentence[q_at + len(quote):]
    if _cache is not None and sentence in _cache:
        base = _cache[sentence]
    else:
        base = await lt_rule_counts(sentence)
        if _cache is not None:
            _cache[sentence] = base
    if base is None:
        return True  # LT down: fail open after heuristics
    cand = await lt_rule_counts(candidate)
    if cand is None:
        return True
    return not adds_error(base, cand)


def match_case(quote: str, replacement: str) -> str:
    """Preserve capitalization pattern of quote on replacement."""
    if not replacement: return replacement
    if quote[:1].isupper() and replacement[:1].islower():
        return replacement[:1].upper() + replacement[1:]
    if quote.isupper() and len(quote) > 1:
        return replacement.upper()
    return replacement
