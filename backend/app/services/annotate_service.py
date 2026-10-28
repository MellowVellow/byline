"""Annotate enrichment: validate replacement alternatives via swap-check, synonym fallback."""
import asyncio
from .. import llm, prompts
from ..swapcheck import swap_ok, match_case


async def enrich_alternatives(issues: list, text: str, context: str, level: str, style: str) -> list:
    """Mutate+return issues: set alternatives (max 3 swap-valid) and replacement=alternatives[0]."""
    cache: dict = {}
    await asyncio.gather(*[_enrich_one(it, text, context, level, style, cache) for it in issues])
    return issues


async def _enrich_one(it: dict, text: str, context: str, level: str, style: str, cache: dict) -> None:
    rep = (it.get("replacement") or "").strip()
    raw_alts = []
    for a in it.get("alternatives", []) or []:
        if isinstance(a, dict) and a.get("text"): raw_alts.append({"text": str(a["text"]), "note": str(a.get("note", ""))})
        elif isinstance(a, str): raw_alts.append({"text": a, "note": ""})
    if rep and not any(a["text"].lower() == rep.lower() for a in raw_alts): raw_alts.insert(0, {"text": rep, "note": ""})
    valid = []
    for a in raw_alts[:5]:
        cand = match_case(it["quote"], a["text"])
        if cand.lower() != it["quote"].lower() and await swap_ok(text, it["quote"], cand, cache, it.get("context", "")):
            valid.append({"text": cand, "note": a["note"]})
        if len(valid) >= 3: break
    if not valid and " " not in it["quote"].strip():
        try:
            ss, uu = prompts.synonyms_prompt(context, level, it["quote"], text[:400], style)
            d2, _, _ = await llm.json_call(ss, uu, max_tokens=500, temperature=0.4)
            for cand0 in [w for w in d2.get("synonyms", []) if isinstance(w, str) and " " not in w][:8]:
                cand = match_case(it["quote"], cand0)
                if cand.lower() != it["quote"].lower() and await swap_ok(text, it["quote"], cand, cache, it.get("context", "")):
                    valid.append({"text": cand, "note": "synonym"})
                if len(valid) >= 3: break
        except Exception:
            pass
    it["alternatives"] = valid
    it["replacement"] = valid[0]["text"] if valid else "" 
