"""Byline v2 API — composition root. Endpoints live in app/routers/, logic in app/services/."""
from __future__ import annotations
import hmac
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .config import cors_list, settings
from .security import rate_ok
from . import budget
from .routers import system, complete, annotate, research, lint, connect, library

logging.basicConfig(level=logging.INFO)
if settings.env in ("prod", "production") and not settings.api_key:
    raise RuntimeError("API_KEY must be set when ENV=prod")
if not settings.api_key:
    logging.getLogger("byline.api").warning("API_KEY unset: API is open (local dev only)")


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    from .llm import aclose_clients
    await aclose_clients()


app = FastAPI(title="Byline v2", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_list() or ["http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Byline-Provider", "X-API-Key", "Authorization", "X-Admin-Token"],
)

_BUDGET_EXEMPT = {"/api/health", "/api/models", "/api/usage", "/api/metrics/usage"}
_AUTH_EXEMPT = {"/", "/api/health", "/api/models", "/api/usage", "/api/waitlist",
                "/api/metrics/usage"}
_PROVIDERS = {"auto", "baseten", "meta"}


def _provided_key(request: Request) -> str:
    key = request.headers.get("x-api-key", "")
    if not key:
        auth = request.headers.get("authorization", "")
        if auth.lower().startswith("bearer "):
            key = auth[7:].strip()
    return key


def client_ip(request: Request) -> str:
    """Real client IP. Only trust X-Forwarded-For behind a trusted proxy."""
    if settings.trust_proxy:
        xff = request.headers.get("x-forwarded-for", "")
        if xff:
            return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _budget_error(exc: budget.BudgetExceeded) -> JSONResponse:
    return JSONResponse(
        {"ok": False, "error": "budget_exhausted", "unit": exc.unit,
         "limit": exc.limit, "used": exc.used, "reset_at": exc.reset_at},
        status_code=429,
    )


def _rate_error(scope: str, limit: int, window: float) -> JSONResponse:
    return JSONResponse(
        {"ok": False, "error": "rate_limited", "scope": scope,
         "limit": limit, "window_seconds": int(window)},
        status_code=429,
        headers={"Retry-After": str(int(window))},
    )


@app.middleware("http")
async def guard(request: Request, call_next):
    if request.url.path.startswith("/api/") and request.method != "OPTIONS":
        ip = client_ip(request)
        provider = (request.headers.get("x-byline-provider") or "auto").strip().lower()
        if provider not in _PROVIDERS:
            return JSONResponse({"ok": False, "error": "invalid_provider"}, status_code=400)
        budget.ip_ctx.set(ip)
        budget.provider_ctx.set(provider)
        budget.endpoint_ctx.set(request.url.path)

        if settings.api_key and request.url.path not in _AUTH_EXEMPT:
            if not hmac.compare_digest(_provided_key(request), settings.api_key):
                return JSONResponse({"ok": False, "error": "unauthorized"}, status_code=401)

        if request.url.path not in _BUDGET_EXEMPT:
            if request.url.path == "/api/complete":
                if not rate_ok(f"suggest:min:{ip}", limit=settings.suggest_rate_per_minute, window=60.0):
                    return _rate_error("suggestion_minute", settings.suggest_rate_per_minute, 60.0)
                if not rate_ok(f"suggest:day:{ip}", limit=settings.suggest_rate_per_day, window=86400.0):
                    return _rate_error("suggestion_day", settings.suggest_rate_per_day, 86400.0)
            elif not rate_ok(f"{ip}:{request.url.path}", limit=120, window=60.0):
                return _rate_error("endpoint", 120, 60.0)
            snap = budget.snapshot(ip)
            if settings.ip_budget_enabled and settings.ip_budget_usd > 0 and snap["used_usd"] >= settings.ip_budget_usd:
                return _budget_error(
                    budget.BudgetExceeded(
                        snap["limit_usd"], snap["used_usd"], snap["reset_at"], unit="usd"
                    )
                )
            if settings.ip_budget_enabled and snap["limit_tokens"] > 0 and snap["used_tokens"] >= snap["limit_tokens"]:
                return _budget_error(
                    budget.BudgetExceeded(snap["limit_tokens"], snap["used_tokens"], snap["reset_at"])
                )

        clen = request.headers.get("content-length")
        if clen and clen.isdigit() and int(clen) > settings.body_limit_mb * 1024 * 1024:
            return JSONResponse({"ok": False, "error": "payload_too_large"}, status_code=413)

    resp = await call_next(request)
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("Referrer-Policy", "no-referrer")
    resp.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    resp.headers.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'")
    resp.headers.setdefault("X-Frame-Options", "DENY")
    if settings.env in ("prod", "production"):
        resp.headers.setdefault("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
    return resp


@app.exception_handler(budget.BudgetExceeded)
async def _budget_handler(_request: Request, exc: budget.BudgetExceeded):
    return _budget_error(exc)


for _router in (system.router, complete.router, annotate.router, research.router, lint.router, connect.router, library.router):
    app.include_router(_router)
