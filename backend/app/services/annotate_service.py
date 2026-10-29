"""Annotate enrichment: dedupe replacement alternatives, synonym fallback."""
import asyncio
from .. import llm, prompts


async def enrich_alternatives(issues: list, text: str, context: str, level: str) -> list:
    """Mutate+return issues: set alternatives (max 3) and replacement=alternatives[0]."""
    await asyncio.gather(*[_enrich_one(it, context, level) for it in issues])
    return issues


async def _enrich_one(it: dict, context: str, level: str) -> None:
    rep = (it.get("replacement") or "").strip()
    raw_alts = []
    for a in it.get("alternatives", []) or []:
        if isinstance(a, dict) and a.get("text"): raw_alts.append({"text": str(a["text"]), "note": str(a.get("note", ""))})
        elif isinstance(a, str): raw_alts.append({"text": a, "note": ""})
    if rep and not any(a["text"].lower() == rep.lower() for a in raw_alts): raw_alts.insert(0, {"text": rep, "note": ""})
    valid = [a for a in raw_alts if a["text"].lower() != it["quote"].lower()][:3]
    if not valid and " " not in it["quote"].strip():
        try:
            ss, uu = prompts.synonyms_prompt(context, level, it["quote"], "")
            d2, _, _ = await llm.json_call(ss, uu, max_tokens=500, temperature=0.4)
            valid = [{"text": w, "note": "synonym"} for w in d2.get("synonyms", []) if isinstance(w, str) and " " not in w and w.lower() != it["quote"].lower()][:3]
        except Exception:
            pass
    it["alternatives"] = valid
    it["replacement"] = valid[0]["text"] if valid else ""
