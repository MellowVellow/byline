"""Mirror SQLite usage ledger -> Supabase rollup tables (cron-safe, idempotent).

Reads settled rows from USAGE_DB_PATH for the recent window, buckets them into
usage_hourly (hour, endpoint, provider) and usage_daily (day, ip_hash, endpoint,
provider), then upserts via PostgREST with merge-duplicates (overwrite the
bucket totals recomputed from SQLite, so reruns are safe).

Raw IPs never leave the server: daily rows key on sha256(ip).

Usage:
    python -m app.usage_sync --window-hours 48
    USAGE_SYNC_CURSOR=data/.usage_sync python -m app.usage_sync
"""
from __future__ import annotations

import argparse
import datetime
import hashlib
import os
import sqlite3
import sys
import time

try:
    import httpx
except ImportError:  # pragma: no cover
    httpx = None  # type: ignore


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def ip_hash(ip: str) -> str:
    return hashlib.sha256((ip or "unknown").encode()).hexdigest()[:32]


def collect(db_path: str, window_hours: float) -> tuple[list[dict], list[dict]]:
    cutoff = time.time() - max(1.0, window_hours) * 3600.0
    con = sqlite3.connect(db_path)
    try:
        rows = con.execute(
            """SELECT ts, ip, endpoint, provider, tok_in, tok_out, tok_reasoning
               FROM usage WHERE ts >= ? AND settled = 1""",
            (cutoff,),
        ).fetchall()
    finally:
        con.close()
    hourly: dict[tuple, dict] = {}
    daily: dict[tuple, dict] = {}
    for ts, ip, endpoint, provider, ti, to, tr in rows:
        dt = datetime.datetime.fromtimestamp(float(ts), tz=datetime.timezone.utc)
        hour = dt.replace(minute=0, second=0, microsecond=0).isoformat()
        day = dt.date().isoformat()
        ep, pv = endpoint or "", provider or ""
        hk = (hour, ep, pv)
        h = hourly.setdefault(hk, {"hour": hour, "endpoint": ep, "provider": pv,
                                   "requests": 0, "tok_in": 0, "tok_out": 0, "tok_reasoning": 0})
        h["requests"] += 1
        h["tok_in"] += int(ti or 0)
        h["tok_out"] += int(to or 0)
        h["tok_reasoning"] += int(tr or 0)
        dk = (day, ip_hash(ip), ep, pv)
        d = daily.setdefault(dk, {"day": day, "ip_hash": ip_hash(ip), "endpoint": ep,
                                  "provider": pv, "requests": 0, "tok_in": 0,
                                  "tok_out": 0, "tok_reasoning": 0})
        d["requests"] += 1
        d["tok_in"] += int(ti or 0)
        d["tok_out"] += int(to or 0)
        d["tok_reasoning"] += int(tr or 0)
    return list(hourly.values()), list(daily.values())


def upsert(url: str, key: str, table: str, rows: list[dict], on_conflict: str) -> int:
    if not rows or httpx is None:
        return 0
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    # PostgREST bulk upsert in chunks to stay under payload limits.
    total = 0
    with httpx.Client(timeout=15) as cl:
        for i in range(0, len(rows), 200):
            chunk = rows[i:i + 200]
            r = cl.post(f"{url}/rest/v1/{table}", json=chunk,
                        headers=headers, params={"on_conflict": on_conflict})
            r.raise_for_status()
            total += len(chunk)
    return total


def main(argv: list[str] | None = None) -> int:
    from .config import settings as _settings

    ap = argparse.ArgumentParser()
    ap.add_argument("--window-hours", type=float, default=48)
    ap.add_argument("--db", default=_env("USAGE_DB_PATH", str(_settings.usage_db_path)))
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args(argv)
    hourly, daily = collect(args.db, args.window_hours)
    print(f"buckets: hourly={len(hourly)} daily={len(daily)} window_h={args.window_hours}")
    if args.dry_run:
        return 0
    url, key = _env("SUPABASE_URL").rstrip("/"), _env("SUPABASE_SERVICE_KEY")
    if not url or not key:
        print("SUPABASE_URL / SUPABASE_SERVICE_KEY unset; nothing pushed.", file=sys.stderr)
        return 2
    n_h = upsert(url, key, "usage_hourly", hourly, "hour,endpoint,provider")
    n_d = upsert(url, key, "usage_daily", daily, "day,ip_hash,endpoint,provider")
    print(f"upserted: hourly_rows={n_h} daily_rows={n_d}")
    from .config import settings as _settings2

    cursor = _env("USAGE_SYNC_CURSOR", str(_settings2.usage_sync_cursor_path))
    try:
        with open(cursor, "w") as f:
            f.write(str(time.time()))
    except OSError:
        pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
