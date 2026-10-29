import re
from fastapi import APIRouter
from .. import llm, prompts
from ..models import CompleteIn
from .common import ok, fail, err, meta

router = APIRouter()

CAPS = {"Hint": 5, "Phrase": 8, "Sentence": 25, "Question": 12, "Block": 130}
ASSIST_TOKENS = {"Hint": 120, "Phrase": 220, "Sentence": 600, "Question": 220, "Block": 1200}


_COMMON_SHORT = {"a", "i", "an", "in", "on", "at", "to", "of", "or", "by", "be", "we", "he", "it", "is", "the", "and", "for", "are", "but", "not", "you", "all", "can", "had", "her", "was", "one", "our", "out"}
try:
    from wordfreq import zipf_frequency as _zipf
except Exception:  # noqa: BLE001
    _zipf = None

def merge_partial(before: str, suggestion: str) -> str:
    """Cursor mid-word (e.g. before='Cats n'): model returns remainder 'eed less…'.
    Rebuild full word 'need less…' for display; client inserts only remainder."""
    b = before or ""
    if not b or b[-1].isspace() or not suggestion or not suggestion[0].islower(): return suggestion
    m = re.search(r"([A-Za-z]+)$", b)
    if not m: return suggestion
    partial = m.group(1)
    if len(partial) > 3: return suggestion
    if partial.lower() in _COMMON_SHORT or suggestion.lower().startswith(partial.lower()): return suggestion
    if _zipf is not None:
        first = re.match(r"[A-Za-z]+", suggestion).group(0).lower()  # type: ignore[union-attr]
        merged = (partial + first).lower()
        # merge only when merged word is a real, more frequent word than fragment alone ('need'>'eed', but 'nare'<'are')
        if not (_zipf(merged, "en") >= 3.0 and _zipf(merged, "en") > _zipf(first, "en")): return suggestion
    return partial + suggestion

def parse_options(raw: str, assist: str) -> list[str]:
    out = []
    for line in raw.splitlines():
        s = re.sub(r"^\s*(?:[-*•]|\d+[.)])\s*", "", line).strip().strip('"')
        if s and s not in out: out.append(s)
    cap = CAPS.get(assist, 8)
    return [s for s in out if len(s.split()) <= cap + 3][:3]

def post_process(before: str, opts: list[str], assist: str) -> list[str]:
    sugg = [merge_partial(before, x) for x in opts]
    if assist == "Question": sugg = [s if s.rstrip().endswith("?") else s.rstrip() + "?" for s in sugg]
    return sugg

def valid_options(sugg: list[str], assist: str) -> bool:
    """Sentence/Block/Question often degrade — reject so caller retries once."""
    if not sugg: return False
    if assist == "Block": return all(len(s.split()) >= 40 and len(re.findall(r"[.!?](?:\s|$)", s + " ")) >= 3 for s in sugg)
    if assist == "Sentence": return all(len(s.split()) >= 10 and re.search(r"[.!?][\"'”’)\]]*$", s.strip()) for s in sugg)
    if assist == "Question": return len(sugg) == 3 and all(s.rstrip().endswith("?") for s in sugg)
    return True

def retry_hint(assist: str) -> str:
    if assist == "Question": return "\nRETRY: previous format invalid — return exactly 3 questions, one per line, each ending with a question mark."
    return "\nRETRY: previous format invalid — follow ASSIST exactly, full sentences only, no fragments."

@router.post("/api/complete")
async def complete(body: CompleteIn):
    try:
        s, u = prompts.complete_prompt(body.context, body.level, body.before, body.after, body.assist_level, body.facts, body.last_two, body.avoid)
        try:
            t0 = __import__('time').perf_counter(); local_raw = await llm.local_text(s, u); dt = __import__('time').perf_counter() - t0
            sugg = post_process(body.before, parse_options(local_raw, body.assist_level), body.assist_level)
            if sugg: return ok(suggestions=sugg, version=body.version, model=f"local:{llm.settings.local_model or 'glimmer-lora'}", ms=round(dt * 1000), usage={})
            raise ValueError("local empty")
        except Exception:
            pass
        raw, usage, model, dt = await llm.timed_text(s, u, max_tokens=ASSIST_TOKENS.get(body.assist_level, 220), temperature=0.8)
        sugg = post_process(body.before, parse_options(raw, body.assist_level), body.assist_level)
        if sugg and not valid_options(sugg, body.assist_level):
            raw2, usage, model, dt2 = await llm.timed_text(s, u + retry_hint(body.assist_level), max_tokens=ASSIST_TOKENS.get(body.assist_level, 220), temperature=0.7)
            sugg2 = post_process(body.before, parse_options(raw2, body.assist_level), body.assist_level)
            if sugg2: sugg, dt = sugg2, dt + dt2
        return ok(suggestions=sugg, version=body.version, model=model, ms=round(dt * 1000), usage=usage, meta=meta("complete", s, u, usage, model, dt*1000, 0.8, ASSIST_TOKENS.get(body.assist_level, 220))) if sugg else fail(version=body.version)
    except Exception as e: return err(e)
