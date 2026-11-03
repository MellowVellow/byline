"""In-mem TTL cache for AI endpoints. No infra. 5min default."""
from __future__ import annotations
import hashlib
import json
import threading
import time

TTL_S = 5 * 60
_store: dict[str, tuple[float, object]] = {}
_lock = threading.Lock()


def key(*parts: object) -> str:
    s = json.dumps(parts, sort_keys=True, default=str)
    return hashlib.sha256(s.encode()).hexdigest()[:32]


def get(k: str):
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
    with _lock:
        if len(_store) > 500:
            now = time.time()
            for kk in [kk for kk, (e, _) in _store.items() if e < now]:
                _store.pop(kk, None)
            if len(_store) > 500:
                for kk in sorted(_store, key=lambda x: _store[x][0])[: len(_store) - 500]:
                    _store.pop(kk, None)
        _store[k] = (time.time() + ttl, val)
