"""Byline v2 API — composition root. Endpoints live in app/routers/, logic in app/services/."""
from __future__ import annotations
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .config import cors_list
from .security import rate_ok
from .routers import system, complete, annotate, research, setup, lint

logging.basicConfig(level=logging.INFO)
app = FastAPI(title="Byline v2")
app.add_middleware(CORSMiddleware, allow_origins=cors_list() or ["http://localhost:5173"], allow_methods=["GET", "POST"], allow_headers=["Content-Type"])


@app.middleware("http")
async def guard(request: Request, call_next):
    if request.url.path.startswith("/api/") and request.url.path != "/api/health":
        ip = request.client.host if request.client else "unknown"
        if not rate_ok(f"{ip}:{request.url.path}", limit=120, window=60.0):
            return JSONResponse({"ok": False, "error": "rate_limited"}, status_code=429)
        clen = request.headers.get("content-length")
        if clen and clen.isdigit() and int(clen) > 22 * 1024 * 1024:
            return JSONResponse({"ok": False, "error": "payload_too_large"}, status_code=413)
    resp = await call_next(request)
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("Referrer-Policy", "no-referrer")
    return resp


for _router in (system.router, complete.router, annotate.router, research.router, setup.router, lint.router):
    app.include_router(_router)
