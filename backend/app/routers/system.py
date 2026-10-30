from fastapi import APIRouter
import httpx, json
from ..config import settings, ROOT, APPROVED_META_MODELS
from ..models import DatasetIn, WaitlistIn
from .common import ok, fail, err

router = APIRouter()

@router.get("/api/health")
async def health():
    lt = False
    try:
        async with httpx.AsyncClient(timeout=3) as cl:
            r = await cl.get(settings.languagetool_url.replace("/v2/check", "/v2/languages"))
            lt = r.status_code == 200
    except Exception: pass
    return ok(
        meta_configured=bool(settings.meta_api_key or settings.openrouter_api_key or settings.baseten_api_key),
        provider="meta" if settings.meta_api_key else ("openrouter" if settings.openrouter_api_key else ("baseten" if settings.baseten_api_key else "mock")),
        model=settings.meta_model if settings.meta_api_key else (settings.openrouter_model if settings.openrouter_api_key else "mock:meta-llama-3.3-70b-instruct"),
        languagetool=lt
    )

@router.get("/api/models")
async def get_approved_models():
    """Return explicit allowlist of Meta-authored models and current runtime active configuration."""
    return ok(
        approved_models=sorted(list(APPROVED_META_MODELS)),
        active_model=settings.meta_model if settings.meta_api_key else (settings.openrouter_model if settings.openrouter_api_key else "meta-llama/llama-3.3-70b-instruct"),
        active_provider="meta_api" if settings.meta_api_key else ("openrouter" if settings.openrouter_api_key else ("baseten" if settings.baseten_api_key else "mock_engine")),
        meta_api_available=bool(settings.meta_api_key),
        openrouter_available=bool(settings.openrouter_api_key),
        baseten_available=bool(settings.baseten_api_key),
    )

@router.post("/api/dataset")
async def dataset(body: DatasetIn):
    try:
        p = ROOT / "data" / "dataset.jsonl"; p.parent.mkdir(exist_ok=True)
        n = 0
        with p.open("a") as f:
            for pair in body.pairs[:200]:
                if pair.get("before") and pair.get("accepted"):
                    f.write(json.dumps({"context": pair.get("context", ""), "before": pair["before"], "accepted": pair["accepted"], "assist": pair.get("assist", ""), "ts": pair.get("ts", 0)}) + "\n"); n += 1
        total = sum(1 for _ in p.open()) if p.exists() else 0
        return ok(added=n, total=total)
    except Exception as e: return err(e)

@router.post("/api/waitlist")
async def waitlist(body: WaitlistIn):
    email = body.email.strip().lower()
    if body.company: return ok(store="supabase")
    if "@" not in email: return fail(error="invalid email")
    if settings.supabase_url and settings.supabase_key:
        try:
            async with httpx.AsyncClient(timeout=10) as cl:
                r = await cl.post(f"{settings.supabase_url}/rest/v1/waitlist",
                                  json={"email": email, "note": body.note},
                                  headers={"apikey": settings.supabase_key, "Authorization": f"Bearer {settings.supabase_key}", "Content-Type": "application/json", "Prefer": "return=minimal"})
                if r.status_code in (200, 201, 204, 409): return ok(store="supabase")
        except Exception: pass
    try:
        p = ROOT / "data" / "waitlist.jsonl"; p.parent.mkdir(exist_ok=True)
        with p.open("a") as f: f.write(json.dumps({"email": email, "note": body.note}) + "\n")
        return ok(store="local-file")
    except Exception as e: return err(e)


@router.get("/")
async def root(): return ok(service="byline-v2", model=settings.meta_model)
