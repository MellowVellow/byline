import json
from fastapi import APIRouter, UploadFile, File
import httpx
from .. import llm, prompts
from ..config import settings
from ..models import OutlineGenIn, SetupAgentIn, SetupQuestionsIn
from ..lint_rules import LINT_RULE_LIBRARY
from ..services.setup_service import fallback_questions, deterministic_payload, MAPS_TO
from .common import ok, fail, err, meta

router = APIRouter()

@router.post("/api/outline-generate")
async def outline_generate(body: OutlineGenIn):
    try:
        s, u = prompts.outline_generate_prompt(json.dumps(body.answers)[:3000])
        data, usage, model = await llm.json_call(s, u, max_tokens=1400, temperature=0.5)
        if not data.get("outline"): return fail()
        clamp = lambda v, lo, hi, d: v if isinstance(v, int) and lo <= v <= hi else d
        return ok(context_summary=data.get("context_summary", ""), audience_text=data.get("audience_text", ""), audience_level=clamp(data.get("audience_level"), 1, 5, 3),
                  diction=data.get("diction") if data.get("diction") in prompts.DICTIONS else "General",
                  tones=[t for t in data.get("tones", []) if t in prompts.TONES][:3] if isinstance(data.get("tones"), list) else [],
                  voice=str(data.get("voice", ""))[:200], rhythm=clamp(data.get("rhythm"), 1, 3, 2),
                  gram_voice=data.get("gram_voice") if data.get("gram_voice") in ("active", "passive") else "passive",
                  clause=data.get("clause") if data.get("clause") in prompts.CLAUSES else "Subordinated",
                  density=clamp(data.get("density"), 1, 3, 2),
                  outline=data.get("outline", []), model=model, usage=usage)
    except Exception as e: return err(e)

@router.post("/api/transcribe")
async def transcribe(file: UploadFile = File(...)):
    try:
        content = await file.read()
        if len(content) > 30 * 1024 * 1024: return fail(error="audio >30MB")
        req = json.dumps({"mode": "PUSH_TO_TALK", "model": "muse-voice-transcribe-1.0", "audioEncoding": "WAV"})
        async with httpx.AsyncClient(timeout=90) as cl:
            r = await cl.post(f"{settings.meta_base_url}/asr/transcribe", headers={"Authorization": f"Bearer {settings.meta_api_key}"},
                              data={"request": req}, files={"audio": (file.filename or "audio.wav", content, "audio/wav")})
            r.raise_for_status(); d = r.json()
        return ok(transcript=d.get("transcript", ""), turns=d.get("turns", []))
    except Exception as e: return err(e)

@router.post("/api/setup-questions")
async def setup_questions(body: SetupQuestionsIn):
    if not body.goal.strip() and not body.context.strip(): return fail(error="empty")
    try:
        s, u = prompts.setup_questions_prompt(body.goal, body.context)
        data, usage, model = await llm.json_call(s, u, max_tokens=1100, temperature=0.4)
        qs = []
        for q in (data.get("questions") or [])[:7]:
            if not isinstance(q, dict) or not q.get("question"): continue
            qs.append({"id": str(q.get("id") or f"q{len(qs)+1}")[:40], "question": str(q["question"])[:240],
                       "maps_to": q.get("maps_to") if q.get("maps_to") in MAPS_TO else "outline_focus",
                       "options": [str(o)[:80] for o in (q.get("options") or []) if isinstance(o, (str, int))][:5]})
        if len(qs) >= 3: return ok(questions=qs, model=model, usage=usage, meta=meta("setup-questions", s, u, usage, model, 0, 0.4, 1100))
        raise ValueError("too few questions")
    except Exception:
        return ok(questions=fallback_questions(body.goal, body.context), model="fallback", usage={})

@router.post("/api/setup-agent")
async def setup_agent(body: SetupAgentIn):
    raw = (body.raw_goal or body.transcript or json.dumps(body.answers)[:2000] or "").strip()
    if not raw: return fail(error="empty goal")
    payload, base, diction = deterministic_payload(raw)
    # LLM synthesis: refine dims + customs (presets intersected with base)
    try:
        lib = [{"id": i, "name": n, "rule": r} for i, n, r in LINT_RULE_LIBRARY]
        s, u = prompts.setup_agent_prompt(raw, json.dumps(lib))
        data, usage, model = await llm.json_call(s, u, max_tokens=1200, temperature=0.3)
        valid = {x["id"] for x in lib}
        llm_rules = [r for r in (data.get("active_preset_rules") or []) if r in valid]
        if llm_rules: payload["active_preset_rules"] = list(dict.fromkeys(base + llm_rules))[:6]
        dims = data.get("dimensions") or {}
        for k in ("diction", "tone", "voice", "style"):
            if isinstance(dims.get(k), str) and dims[k].strip(): payload["dimensions"][k] = dims[k].strip()[:300]
        if payload["dimensions"]["diction"] not in prompts.DICTIONS: payload["dimensions"]["diction"] = diction
        customs = []
        for i, c in enumerate((data.get("custom_rules") or [])[:3]):
            if isinstance(c, dict) and c.get("rule"):
                customs.append({"id": c.get("id") or f"CUSTOM_ENT_{i+1:02d}",
                    "category": c.get("category") if c.get("category") in ("amber","green","cyan","rose","violet") else "violet",
                    "rule": str(c["rule"])[:400]})
        if customs: payload["custom_rules"] = customs
        gf = data.get("ghost_text_filters") or {}
        if isinstance(gf.get("allowed_transitions"), list) and gf["allowed_transitions"]:
            payload["ghost_text_filters"]["allowed_transitions"] = [str(t)[:24] for t in gf["allowed_transitions"] if isinstance(t, str)][:6]
        if isinstance(gf.get("starter_categories"), list) and gf["starter_categories"]:
            payload["ghost_text_filters"]["starter_categories"] = [str(t)[:40] for t in gf["starter_categories"] if isinstance(t, str)][:5]
        if isinstance(data.get("followup_question"), str): payload["followup_question"] = data["followup_question"][:240]
        return ok(model=model, usage=usage, **payload)
    except Exception:
        return ok(model="deterministic", usage={}, **payload)
