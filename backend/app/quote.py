"""Server-side quote validation: drop any anchored item not verbatim in source."""
from __future__ import annotations

def valid_anchor(item: dict, text: str) -> bool:
    q, c = (item.get("quote") or ""), (item.get("context") or "")
    return bool(q) and q in text and bool(c) and c in text and q in c

def filter_anchored(items: list, text: str) -> list:
    return [i for i in items if isinstance(i, dict) and valid_anchor(i, text)]
