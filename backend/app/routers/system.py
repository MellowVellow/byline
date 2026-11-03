from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import httpx, json, logging, hmac
from ..config import settings, ROOT, APPROVED_META_MODELS
from ..models import DatasetIn, WaitlistIn
from ..security import rate_ok
from .common import ok, fail, err
from .. import budget

log = logging.getLogger("byline.waitlist")
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
        meta_configured=bool(settings.baseten_api_key or settings.meta_api_key or settings.openrouter_api_key),
        provider="baseten" if settings.baseten_api_key else ("meta" if settings.meta_api_key else ("openrouter" if settings.openrouter_api_key else "mock")),
        model="meta-models/muse-spark-open-1026" if settings.baseten_api_key else (settings.meta_model if settings.meta_api_key else (settings.openrouter_model if settings.openrouter_api_key else "mock:meta-llama-3.3-70b-instruct")),
        languagetool=lt
    )

@router.get("/api/models")
async def get_approved_models():
    """Return explicit allowlist of Meta-authored models and current runtime active configuration."""
    if settings.baseten_api_key:
        active_model, active_provider = "meta-models/muse-spark-open-1026", "baseten_hackathon"
    elif settings.meta_api_key:
        active_model, active_provider = settings.meta_model, "meta_api"
    elif settings.openrouter_api_key:
        active_model, active_provider = settings.openrouter_model, "openrouter"
    else:
        active_model, active_provider = "mock:meta-llama-3.3-70b-instruct", "mock_engine"
    return ok(
        approved_models=sorted(list(APPROVED_META_MODELS)),
        active_model=active_model,
        active_provider=active_provider,
        baseten_available=bool(settings.baseten_api_key),
        meta_api_available=bool(settings.meta_api_key),
        openrouter_available=bool(settings.openrouter_api_key),
    )

@router.post("/api/dataset")
async def dataset(body: DatasetIn):
    """Append accepted completions for future tuning. Key-gated via middleware; disk-capped."""
    try:
        p = ROOT / "data" / "dataset.jsonl"; p.parent.mkdir(exist_ok=True)
        if p.exists() and p.stat().st_size > 5 * 1024 * 1024:
            return fail(error="dataset_full")
        n = 0
        with p.open("a") as f:
            for pair in body.pairs[:200]:
                before = str(pair.get("before") or "")[:8000]
                accepted = str(pair.get("accepted") or "")[:8000]
                if before and accepted:
                    f.write(json.dumps({"context": str(pair.get("context", ""))[:4000], "before": before, "accepted": accepted, "assist": str(pair.get("assist", ""))[:40], "ts": pair.get("ts", 0)}) + "\n"); n += 1
        total = sum(1 for _ in p.open()) if p.exists() else 0
        return ok(added=n, total=total)
    except Exception as e: return err(e)

async def _supabase_add(email: str, note: str) -> str:
    """Insert one waitlist row via PostgREST. Returns "added" or "duplicate"."""
    url = f"{settings.supabase_url}/rest/v1/waitlist"
    base_headers = {
        "apikey": settings.supabase_key,
        "Authorization": f"Bearer {settings.supabase_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=10) as cl:
        async def post(prefer: str):
            return await cl.post(
                url,
                json={"email": email, "note": note},
                headers={**base_headers, "Prefer": prefer},
                params={"on_conflict": "email"},
            )

        r = await post("return=minimal,resolution=ignore-duplicates")
        if r.status_code == 400:
            r = await post("return=minimal")

    if r.status_code in (200, 201, 204):
        return "added"
    if r.status_code == 409:
        return "duplicate"
    log.warning("supabase waitlist insert failed: %s %s", r.status_code, r.text[:200])
    raise RuntimeError(f"supabase_{r.status_code}")


@router.post("/api/waitlist")
async def waitlist(body: WaitlistIn):
    email = str(body.email).strip().lower()
    note = (body.note or "").strip()[:500]
    if not rate_ok(f"waitlist:{budget.current_ip() or 'unknown'}", limit=10, window=60.0):
        return JSONResponse({"ok": False, "error": "waitlist_rate_limited"}, status_code=429)
    if body.company:
        return ok(store="ignored")

    if settings.supabase_url and settings.supabase_key:
        try:
            status = await _supabase_add(email, note)
            return ok(store="supabase", already=status == "duplicate")
        except Exception as e:  # noqa: BLE001
            log.warning("waitlist supabase unavailable: %s: %s", type(e).__name__, str(e)[:200])
            if not settings.waitlist_local_fallback:
                return fail(error="waitlist_unavailable")
    elif not settings.waitlist_local_fallback:
        return fail(error="waitlist_unconfigured")

    try:
        p = ROOT / "data" / "waitlist.jsonl"; p.parent.mkdir(exist_ok=True)
        with p.open("a") as f: f.write(json.dumps({"email": email, "note": note}) + "\n")
        return ok(store="local-file")
    except Exception as e: return err(e)


@router.get("/api/usage")
async def usage():
    """Current IP's token quota, spend estimate, and per-provider breakdown."""
    return ok(**budget.snapshot(budget.current_ip() or "unknown"))


@router.get("/api/metrics/usage")
async def usage_metrics(request: Request):
    """Aggregate server-side usage. Requires ADMIN_TOKEN via X-Admin-Token."""
    if not settings.admin_token:
        return JSONResponse({"ok": False, "error": "not_found"}, status_code=404)
    if not hmac.compare_digest(request.headers.get("x-admin-token", ""), settings.admin_token):
        return JSONResponse({"ok": False, "error": "unauthorized"}, status_code=401)
    return ok(**budget.aggregate())


@router.get("/")
async def root(): return ok(service="byline-v2", model=settings.meta_model)
