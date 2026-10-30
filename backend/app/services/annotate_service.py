"""Annotate enrichment: dedupe replacement alternatives."""
from .. import llm, prompts


async def enrich_alternatives(issues: list, text: str, context: str, level: str) -> list:
    """Mutate+return issues: set alternatives (max 3) and replacement=alternatives[0].
    
    No secondary LLM calls — all alternatives come from the primary annotate prompt
    to keep reflection fast. Synonym fallback is only used when the quote has no
    alternatives at all and the quote is a single word (deterministic, offline).
    """
    for it in issues:
        rep = (it.get("replacement") or "").strip()
        raw_alts = []
        for a in it.get("alternatives", []) or []:
            if isinstance(a, dict) and a.get("text"):
                raw_alts.append({"text": str(a["text"]), "note": str(a.get("note", ""))})
            elif isinstance(a, str):
                raw_alts.append({"text": a, "note": ""})
        if rep and not any(a["text"].lower() == rep.lower() for a in raw_alts):
            raw_alts.insert(0, {"text": rep, "note": ""})
        valid = [a for a in raw_alts if a["text"].lower() != it["quote"].lower()][:3]
        it["alternatives"] = valid
        it["replacement"] = valid[0]["text"] if valid else ""
    return issues
