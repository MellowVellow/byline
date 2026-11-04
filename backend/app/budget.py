"""Per-IP usage accounting.

Token quota (default ~= $1 at placeholder prices) with a rolling window.
Enforcement is token-based because real per-model pricing is not available yet;
the dollar figure is an estimate for display only.

All writes are serialized by a process lock. This is intentionally simple and
correct for the single-instance, disk-backed deployment; a multi-instance
deployment would need Redis/Postgres instead.
"""
from __future__ import annotations

import contextvars
import sqlite3
import threading
import time
from pathlib import Path

from .config import settings

ip_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("byline_ip", default="")
provider_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("byline_provider", default="auto")
endpoint_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("byline_endpoint", default="")
last_provider_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("byline_last_provider", default="")

RETENTION_SECONDS = 30 * 24 * 3600
_LOCK = threading.RLock()
_CON: sqlite3.Connection | None = None


class BudgetExceeded(RuntimeError):
    def __init__(self, limit: int, used: int, reset_at: float):
        super().__init__("budget_exhausted")
        self.limit = limit
        self.used = used
        self.reset_at = reset_at


def _con() -> sqlite3.Connection:
    global _CON
    if _CON is not None:
        return _CON
    path: Path = settings.usage_db_path
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(path), timeout=5, check_same_thread=False)
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA synchronous=NORMAL")
    con.execute("PRAGMA busy_timeout=5000")
    con.execute(
        """
        CREATE TABLE IF NOT EXISTS usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts REAL NOT NULL,
            ip TEXT NOT NULL,
            endpoint TEXT NOT NULL DEFAULT '',
            provider TEXT NOT NULL DEFAULT '',
            model TEXT NOT NULL DEFAULT '',
            tok_in INTEGER NOT NULL DEFAULT 0,
            tok_out INTEGER NOT NULL DEFAULT 0,
            tok_reasoning INTEGER NOT NULL DEFAULT 0,
            reserved INTEGER NOT NULL DEFAULT 0,
            settled INTEGER NOT NULL DEFAULT 0,
            mock INTEGER NOT NULL DEFAULT 0
        )
        """
    )
    con.execute("CREATE INDEX IF NOT EXISTS idx_usage_ip_ts ON usage(ip, ts)")
    con.execute("CREATE INDEX IF NOT EXISTS idx_usage_ts_settled ON usage(ts, settled)")
    con.execute("CREATE INDEX IF NOT EXISTS idx_usage_endpoint_ts ON usage(endpoint, ts)")
    con.commit()
    _CON = con
    return con


def _window() -> float:
    return settings.ip_budget_window_hours * 3600.0


def current_ip() -> str:
    return ip_ctx.get()


def current_provider() -> str:
    return provider_ctx.get() or "auto"


def current_endpoint() -> str:
    return endpoint_ctx.get()


def last_provider() -> str:
    return last_provider_ctx.get()


def estimate_prompt_tokens(system: str, user: str, max_tokens: int) -> int:
    return max(1, (len(system or "") + len(user or "")) // 4 + max(0, int(max_tokens)))


def estimate_usd(tok_in: int, tok_out: int, tok_reasoning: int = 0) -> float:
    """Placeholder pricing. Reasoning tokens bill at the output rate."""
    return round(
        (max(0, tok_in) / 1_000_000.0) * settings.price_in_per_m
        + (max(0, tok_out + tok_reasoning) / 1_000_000.0) * settings.price_out_per_m,
        6,
    )


def _usage_tokens(usage: dict | None) -> tuple[int, int, int]:
    u = usage or {}
    tok_in = int(u.get("prompt_tokens") or u.get("input_tokens") or 0)
    tok_out = int(u.get("completion_tokens") or u.get("output_tokens") or 0)
    details = u.get("completion_tokens_details") or u.get("output_tokens_details") or {}
    reasoning = int((details or {}).get("reasoning_tokens") or 0)
    return tok_in, tok_out, reasoning


def _used_tokens(ip: str, now: float) -> int:
    cutoff = now - _window()
    row = _con().execute(
        """SELECT COALESCE(SUM(CASE WHEN settled = 1 THEN tok_in + tok_out + tok_reasoning ELSE reserved END), 0)
           FROM usage WHERE ip = ? AND ts >= ?""",
        (ip, cutoff),
    ).fetchone()
    return int(row[0] or 0)


def reserve(ip: str, estimated_tokens: int, endpoint: str = "") -> int | None:
    """Reserve budget before an upstream call. Raises BudgetExceeded if full."""
    if not settings.ip_budget_enabled or not ip:
        return None
    est = max(0, int(estimated_tokens))
    with _LOCK:
        con = _con()
        now = time.time()
        con.execute("DELETE FROM usage WHERE ts < ?", (now - RETENTION_SECONDS,))
        used = _used_tokens(ip, now)
        limit = settings.ip_token_budget
        if limit > 0 and used + est > limit:
            oldest = con.execute(
                "SELECT MIN(ts) FROM usage WHERE ip = ? AND ts >= ?", (ip, now - _window())
            ).fetchone()[0]
            reset_at = (float(oldest) + _window()) if oldest else (now + _window())
            raise BudgetExceeded(limit=limit, used=used, reset_at=reset_at)
        cur = con.execute(
            "INSERT INTO usage(ts, ip, endpoint, reserved) VALUES(?, ?, ?, ?)",
            (now, ip, endpoint, est),
        )
        con.commit()
        return int(cur.lastrowid)


def settle(rid: int | None, usage: dict | None, model: str, provider: str, mock: bool = False) -> None:
    """Replace a reservation with the real token counts."""
    if rid is None:
        return
    tok_in, tok_out, reasoning = _usage_tokens(usage)
    if mock:
        tok_in = tok_out = reasoning = 0
    elif tok_in + tok_out == 0:
        row = _con().execute("SELECT reserved FROM usage WHERE id = ?", (rid,)).fetchone()
        tok_in = int(row[0] or 0) if row else 0
    with _LOCK:
        con = _con()
        con.execute(
            """UPDATE usage SET tok_in = ?, tok_out = ?, tok_reasoning = ?, reserved = 0,
               settled = 1, mock = ?, model = ?, provider = ? WHERE id = ?""",
            (tok_in, tok_out, reasoning, 1 if mock else 0, model or "", provider or "", rid),
        )
        con.commit()
    last_provider_ctx.set(provider or "")


def release(rid: int | None) -> None:
    """Drop an unused reservation after a failed call."""
    if rid is None:
        return
    with _LOCK:
        con = _con()
        con.execute("DELETE FROM usage WHERE id = ? AND settled = 0", (rid,))
        con.commit()


def charge(ip: str, tokens: int, endpoint: str, provider: str = "", model: str = "") -> None:
    """Record a settled cost when no provider usage object exists (e.g. audio)."""
    if not settings.ip_budget_enabled or not ip:
        return
    with _LOCK:
        con = _con()
        con.execute(
            """INSERT INTO usage(ts, ip, endpoint, provider, model, tok_in, tok_out, settled)
               VALUES(?, ?, ?, ?, ?, ?, 0, 1)""",
            (time.time(), ip, endpoint, provider, model, max(0, int(tokens))),
        )
        con.commit()


def snapshot(ip: str) -> dict:
    now = time.time()
    with _LOCK:
        con = _con()
        used = _used_tokens(ip, now)
        cutoff = now - _window()
        requests = con.execute(
            "SELECT COUNT(*) FROM usage WHERE ip = ? AND ts >= ?", (ip, cutoff)
        ).fetchone()[0]
        oldest = con.execute(
            "SELECT MIN(ts) FROM usage WHERE ip = ? AND ts >= ?", (ip, cutoff)
        ).fetchone()[0]
        rows = con.execute(
            """SELECT COALESCE(NULLIF(provider, ''), 'unknown') AS p,
                      COALESCE(SUM(tok_in + tok_out + tok_reasoning), 0) AS tokens,
                      COALESCE(SUM(tok_in), 0) AS tin,
                      COALESCE(SUM(tok_out), 0) AS tout,
                      COALESCE(SUM(tok_reasoning), 0) AS treason,
                      COUNT(*) AS n
               FROM usage WHERE ip = ? AND ts >= ? AND settled = 1
               GROUP BY p ORDER BY tokens DESC""",
            (ip, cutoff),
        ).fetchall()
    limit = settings.ip_token_budget
    by_provider = {
        str(p): {
            "tokens": int(t),
            "tokens_in": int(i),
            "tokens_out": int(o),
            "tokens_reasoning": int(r),
            "requests": int(n),
        }
        for p, t, i, o, r, n in rows
    }
    tokens_in = sum(int(r[2]) for r in rows)
    tokens_out = sum(int(r[3]) for r in rows)
    tokens_reasoning = sum(int(r[4]) for r in rows)
    return {
        "enabled": settings.ip_budget_enabled,
        "limit_tokens": limit,
        "used_tokens": used,
        "remaining_tokens": max(0, limit - used) if limit > 0 else 0,
        "window_hours": settings.ip_budget_window_hours,
        "reset_at": (float(oldest) + _window()) if oldest else (now + _window()),
        "requests": int(requests),
        "tokens_in": int(tokens_in),
        "tokens_out": int(tokens_out),
        "tokens_reasoning": int(tokens_reasoning),
        "by_provider": by_provider,
        "est_usd": estimate_usd(tokens_in, tokens_out, tokens_reasoning),
        "prices": {"in_per_m": settings.price_in_per_m, "out_per_m": settings.price_out_per_m},
    }


def aggregate(
    limit_ips: int = 50,
    window_hours: float = 0,
    limit_endpoints: int = 20,
) -> dict:
    """Global traffic totals for the creator dashboard.

    window_hours > 0 overrides IP_BUDGET_WINDOW_HOURS for this call only.
    Reasoning tokens are billable and included in all totals.
    """
    now = time.time()
    eff_window = float(window_hours) if window_hours and float(window_hours) > 0 else _window() / 3600.0
    eff_window = max(0.1, min(eff_window, 24 * 90))
    cutoff = now - eff_window * 3600.0
    limit_ips = max(1, min(int(limit_ips), 500))
    limit_endpoints = max(1, min(int(limit_endpoints), 100))
    with _LOCK:
        con = _con()
        total = con.execute(
            """SELECT COUNT(*), COALESCE(SUM(tok_in),0), COALESCE(SUM(tok_out),0),
                      COALESCE(SUM(tok_reasoning),0)
               FROM usage WHERE ts >= ? AND settled = 1""",
            (cutoff,),
        ).fetchone()
        distinct = con.execute(
            "SELECT COUNT(DISTINCT ip) FROM usage WHERE ts >= ? AND settled = 1",
            (cutoff,),
        ).fetchone()[0]
        providers = con.execute(
            """SELECT COALESCE(NULLIF(provider, ''), 'unknown'), COUNT(*),
                      COALESCE(SUM(tok_in),0), COALESCE(SUM(tok_out),0),
                      COALESCE(SUM(tok_reasoning),0)
               FROM usage WHERE ts >= ? AND settled = 1 GROUP BY 1 ORDER BY 2 DESC""",
            (cutoff,),
        ).fetchall()
        endpoints = con.execute(
            """SELECT COALESCE(NULLIF(endpoint, ''), 'unknown'), COUNT(*),
                      COALESCE(SUM(tok_in + tok_out + tok_reasoning),0),
                      COALESCE(SUM(tok_in),0), COALESCE(SUM(tok_out),0),
                      COALESCE(SUM(tok_reasoning),0)
               FROM usage WHERE ts >= ? AND settled = 1 GROUP BY 1 ORDER BY 2 DESC LIMIT ?""",
            (cutoff, limit_endpoints),
        ).fetchall()
        ips = con.execute(
            """SELECT ip, COUNT(*), COALESCE(SUM(tok_in + tok_out + tok_reasoning),0),
                      COALESCE(SUM(tok_in),0), COALESCE(SUM(tok_out),0),
                      COALESCE(SUM(tok_reasoning),0), MAX(ts)
               FROM usage WHERE ts >= ? AND settled = 1 GROUP BY ip ORDER BY 3 DESC LIMIT ?""",
            (cutoff, limit_ips),
        ).fetchall()
    tin, tout, treason = int(total[1] or 0), int(total[2] or 0), int(total[3] or 0)
    return {
        "requests": int(total[0] or 0),
        "distinct_ips": int(distinct or 0),
        "tokens_in": tin,
        "tokens_out": tout,
        "tokens_reasoning": treason,
        "tokens_total": tin + tout + treason,
        "window_hours": eff_window,
        "est_usd": estimate_usd(tin, tout, treason),
        "by_provider": [
            {
                "provider": p,
                "requests": int(n),
                "tokens_in": int(i),
                "tokens_out": int(o),
                "tokens_reasoning": int(r),
                "tokens": int(i) + int(o) + int(r),
            }
            for p, n, i, o, r in providers
        ],
        "by_endpoint": [
            {
                "endpoint": e,
                "requests": int(n),
                "tokens": int(t),
                "tokens_in": int(i),
                "tokens_out": int(o),
                "tokens_reasoning": int(r),
            }
            for e, n, t, i, o, r in endpoints
        ],
        "top_ips": [
            {
                "ip": ip,
                "requests": int(n),
                "tokens": int(t),
                "tokens_in": int(i),
                "tokens_out": int(o),
                "tokens_reasoning": int(r),
                "last_seen": float(ls) if ls else 0,
            }
            for ip, n, t, i, o, r, ls in ips
        ],
    }


def reset_for_tests() -> None:
    """Drop the cached connection so a fresh USAGE_DB_PATH takes effect."""
    global _CON
    with _LOCK:
        if _CON is not None:
            try:
                _CON.close()
            except Exception:  # noqa: BLE001
                pass
        _CON = None
