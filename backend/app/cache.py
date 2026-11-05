"""TTL cache for AI endpoints.

Uses Redis when REDIS_URL is set and reachable; falls back to an in-memory
store otherwise (dev / single-process).
"""
from __future__ import annotations
import hashlib
import json
import pickle
import threading
import time

from .config import settings

TTL_S = 5 * 60
_store: dict[str, tuple[float, object]] = {}
_lock = threading.Lock()

_REDIS_STATE = {"url": None, "client": None, "tried": False}


def _redis_client():
    url = (settings.redis_url or "").strip()
    if url != _REDIS_STATE["url"]:
        _REDIS_STATE["url"] = url
        _REDIS_STATE["client"] = None
        _REDIS_STATE["tried"] = False
    if _REDIS_STATE["tried"]:
        return _REDIS_STATE["client"]
    _REDIS_STATE["tried"] = True
    if not url:
        return None
    try:
        import redis  # type: ignore
        c = redis.Redis.from_url(url, decode_responses=False,
                                 socket_connect_timeout=1, socket_timeout=1)
        c.ping()
        _REDIS_STATE["client"] = c
    except Exception:  # noqa: BLE001
        _REDIS_STATE["client"] = None
    return _REDIS_STATE["client"]


def reset_for_tests() -> None:
    """Clear in-memory cache and Redis state. Tests only."""
    with _lock:
        _store.clear()
    _REDIS_STATE["url"] = None
    _REDIS_STATE["client"] = None
    _REDIS_STATE["tried"] = False


def key(*parts: object) -> str:
    s = json.dumps(parts, sort_keys=True, default=str)
    return hashlib.sha256(s.encode()).hexdigest()[:32]


def _rk(k: str) -> str:
    return f"byline:cache:{k}"


def get(k: str):
    c = _redis_client()
    if c is not None:
        try:
            raw = c.get(_rk(k))
            if raw is None:
                return None
            return pickle.loads(raw)
        except Exception:  # noqa: BLE001
            pass
    with _lock:
        it = _store.get(k)
        if not it:
            return None
        exp, val = it
        if exp < time.time():
            _store.pop(k, None)
            return None
        return val


def set(k: str, val: object, ttl: float = TTL_S) -> None:
    c = _redis_client()
    if c is not None:
        try:
            c.setex(_rk(k), max(1, int(ttl or TTL_S)), pickle.dumps(val))
            return
        except Exception:  # noqa: BLE001
            pass
    with _lock:
        if len(_store) > 500:
            now = time.time()
            for kk in [kk for kk, (e, _) in _store.items() if e < now]:
                _store.pop(kk, None)
            if len(_store) > 500:
                for kk in sorted(_store, key=lambda x: _store[x][0])[: len(_store) - 500]:
                    _store.pop(kk, None)
        _store[k] = (time.time() + ttl, val)
