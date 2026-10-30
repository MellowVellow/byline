from fastapi import APIRouter
from .. import llm, prompts
from ..models import TextIn, SynonymIn
from ..quote import filter_anchored
from ..services.annotate_service import enrich_alternatives
from .common import ok, fail, err, meta

router = APIRouter()

ZIPF_THRESHOLDS = {"Simple": 4.6, "Casual": 4.4, "Slang": 4.4, "General": 4.0, "Formal": 3.6, "Technical": 3.2, "Academic": 3.2, "Expert": 2.8, "Buzzwords": 4.2, "Bullshitting": 4.2}

def frequency_candidates(text: str, level: str) -> str:
    try:
        from wordfreq import zipf_frequency
        import re as _re
        words = sorted(set(w.lower() for w in _re.findall(r"[A-Za-z][a-z]{3,}", text)))
        th = ZIPF_THRESHOLDS.get(level, 4.0)
        scored = [(zipf_frequency(w, "en"), w) for w in words]
        rare = sorted((z, w) for z, w in scored if 0 < z < th)[:20]
        return ", ".join(f"{w} ({z:.1f})" for z, w in rare)
    except Exception:
        return ""

@router.post("/api/annotate")
async def annotate(body: TextIn):
    try:
        s, u = prompts.annotate_prompt(body.context, body.level, body.text, body.before, body.after, frequency_candidates(body.text, body.level))
        data, usage, model = await llm.json_call(s, u, max_tokens=1000, temperature=0.4)
        issues = await enrich_alternatives(filter_anchored(data.get("issues", []), body.text), body.text, body.context, body.level)
        return ok(issues=issues, model=model, usage=usage, meta=meta("annotate", s, u, usage, model, 0, 0.4, 1000))
    except Exception as e: return err(e)

@router.post("/api/reactions")
async def reactions(body: TextIn):
    try:
        s, u = prompts.reactions_prompt(body.context, body.level, body.text, body.persona)
        data, usage, model = await llm.json_call(s, u, max_tokens=1100, temperature=0.6)
        return ok(reactions=filter_anchored(data.get("reactions", []), body.text), model=model, usage=usage, meta=meta("reactions", s, u, usage, model, 0, 0.6, 1100))
    except Exception as e: return err(e)

@router.post("/api/main-idea")
async def main_idea(body: TextIn):
    try:
        s, u = prompts.main_idea_prompt(body.context, body.level, body.text)
        raw, usage, model, dt = await llm.timed_text(s, u, max_tokens=350, temperature=0.4)
        idea = raw.strip().splitlines()[0] if raw.strip() else ""
        return ok(main_idea=idea, model=model, ms=round(dt * 1000), usage=usage, meta=meta("main-idea", s, u, usage, model, dt*1000, 0.4, 350)) if idea else fail()
    except Exception as e: return err(e)

@router.post("/api/outline")
async def outline(body: TextIn):
    try:
        s, u = prompts.outline_prompt(body.text)
        data, usage, model = await llm.json_call(s, u, max_tokens=800, temperature=0.3)
        return ok(outline=filter_anchored(data.get("outline", []), body.text), model=model, usage=usage, meta=meta("outline", s, u, usage, model, 0, 0.3, 800))
    except Exception as e: return err(e)

@router.post("/api/synonyms")
async def synonyms(body: SynonymIn):
    try:
        s, u = prompts.synonyms_prompt(body.context, body.level, body.word, body.sentence)
        data, usage, model = await llm.json_call(s, u, max_tokens=600, temperature=0.5)
        words = [w for w in data.get("synonyms", []) if isinstance(w, str) and w.strip()][:8]
        if body.sentence and body.word:
            words = [w for w in words if w.lower() != body.word.lower()]
        return ok(synonyms=words, model=model, usage=usage, meta=meta("synonyms", s, u, usage, model, 0, 0.5, 600))
    except Exception as e: return err(e)
