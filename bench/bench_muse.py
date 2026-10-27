"""Benchmark Muse (Meta API) vs Gemini 2.5 Flash Lite (OpenRouter).

Quote-based anchoring only — NO [S#]/[W#] ID tagging.
Annotate task requires: {"quote": exact substring, "context": surrounding snippet, ...}
Validation checks quote/context actually occur verbatim in source text.

Usage:
  python3 bench/bench_muse.py --samples 2
  python3 bench/bench_muse.py --dry
Env: META_API_KEY, OPENROUTER_API_KEY (read from .env in repo root)
"""
from __future__ import annotations
import argparse, asyncio, json, os, re, sys, time
from pathlib import Path
import urllib.request, urllib.error

ROOT = Path(__file__).resolve().parents[1]
for line in (ROOT / ".env").read_text().splitlines() if (ROOT / ".env").exists() else []:
    if "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())

META_KEY = os.environ.get("META_API_KEY", "")
OR_KEY = os.environ.get("OPENROUTER_API_KEY", "")
META_BASE = os.environ.get("META_BASE_URL", "https://api.meta.ai/v1")

MODELS = [
    ("meta", "muse-wonder-1.0"),
    ("meta", "muse-spark-1.3"),
    ("meta", "muse-spark-1.2"),
    ("meta", "muse-spark-1.1"),
    ("openrouter", "google/gemini-2.5-flash-lite"),
]

TEXT = ("Cats are independent, as I said. Dogs needs daily walks. "
        "A plethora of reasons exist. Cats are quiet. Dogs bark. "
        "Cats live longer than dogs. Finally, cats are just cute.")

CASES = [
    {
        "name": "complete_phrase_anxiety",
        "system": "Help writer continue own writing. Return 3 distinct options, one per line. No numbering.",
        "user": "CONTEXT: essay about anxiety and health\nLEVEL: General\nASSIST: Phrase (finish clause, <=8 words)\nTEXT BEFORE CURSOR:\nOver the past decade, researchers have argued that access to care is shaped less by medicine than by\nTASK: Continue from cursor, 3 options, one per line.",
        "max_tokens": 600, "check": lambda t: len([l for l in t.splitlines() if l.strip()]) >= 1,
    },
    {
        "name": "complete_phrase_cooking",
        "system": "Help writer continue own writing. Return 3 distinct options, one per line. No numbering.",
        "user": "CONTEXT: cooking blog about weeknight dinners\nLEVEL: General\nASSIST: Phrase (finish clause, <=8 words)\nTEXT BEFORE CURSOR:\nOver the past decade, researchers have argued that access to care is shaped less by medicine than by\nTASK: Continue from cursor, 3 options, one per line. Must fit cooking context.",
        "max_tokens": 600, "check": lambda t: len([l for l in t.splitlines() if l.strip()]) >= 1,
    },
    {
        "name": "annotate_quote",
        "system": "Careful editor. JSON only. Never use IDs, offsets, or word counts. Anchor every issue with an EXACT verbatim quote copied from TEXT plus a short surrounding context snippet, also verbatim.",
        "user": f"CONTEXT: argue cats are better than dogs\nLEVEL: General (avoid overly fancy words)\nTEXT:\n{TEXT}\nTASK: Flag vocabulary-level mismatches and relevance/coherence problems only (not grammar). JSON shape: {{\"issues\": [{{\"quote\": \"<exact verbatim substring>\", \"context\": \"<verbatim snippet containing quote>\", \"type\": \"vocabulary|relevance\", \"reason\": \"...\", \"replacement\": \"...\"}}]}}",
        "max_tokens": 900, "check": lambda t: quote_check(t, TEXT),
    },
    {
        "name": "main_idea",
        "system": "Ordinary reader. State single main idea taken from text in ONE plain sentence. No JSON.",
        "user": f"TEXT:\n{TEXT}\nTASK: One sentence only.",
        "max_tokens": 400, "check": lambda t: bool(t.strip()),
    },
    {
        "name": "reactions",
        "system": "Skeptical reader. JSON only. Anchor with EXACT verbatim quote + verbatim context snippet. No IDs/offsets.",
        "user": f"TEXT:\n{TEXT}\nTASK: Give up to 3 reader reactions (question|comment|critique|compliment). Note repetition, contradictions, unclear jumps. JSON shape: {{\"reactions\": [{{\"quote\": \"<exact verbatim substring>\", \"context\": \"<verbatim snippet containing quote>\", \"kind\": \"question\", \"text\": \"...\"}}]}}",
        "max_tokens": 900, "check": lambda t: quote_check(t, TEXT, key="reactions"),
    },
]

def quote_check(raw: str, text: str, key: str = "issues") -> bool:
    try:
        data = json.loads(raw[raw.find("{"): raw.rfind("}") + 1])
        items = data.get(key, [])
        return bool(items) and all(i.get("quote", "") in text and i.get("quote", "") in i.get("context", "") and i.get("context", "") in text for i in items)
    except Exception:
        return False

def quote_detail(raw: str, text: str, key: str = "issues") -> str:
    try:
        data = json.loads(raw[raw.find("{"): raw.rfind("}") + 1])
        items = data.get(key, [])
        ok = sum(1 for i in items if i.get("quote", "") in text)
        return f"quotes {ok}/{len(items)} verbatim"
    except Exception as e:
        return f"parse-fail {e}"

def call(provider: str, model: str, system: str, user: str, max_tokens: int) -> tuple[str, dict, float]:
    if provider == "meta":
        url, key = f"{META_BASE}/chat/completions", META_KEY
        body = {"model": model, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
                "max_tokens": max_tokens, "temperature": 0.7, "reasoning_effort": "minimal"}
        headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    else:
        url, key = "https://openrouter.ai/api/v1/chat/completions", OR_KEY
        body = {"model": model, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
                "max_tokens": min(max_tokens, 400), "temperature": 0.7}
        headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json", "X-Title": "Byline Bench"}
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=headers)
    t = time.perf_counter()
    with urllib.request.urlopen(req, timeout=90) as r:
        d = json.load(r)
    lat = time.perf_counter() - t
    content = (d["choices"][0]["message"].get("content") or "") if d.get("choices") else ""
    return content, d.get("usage", {}) or {}, lat

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--samples", type=int, default=2)
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--models", default="", help="comma list model substrings filter")
    args = ap.parse_args()
    if args.dry:
        for p, m in MODELS:
            for c in CASES:
                print(f"{m:<35} {c['name']:<26} ~in {(len(c['system'])+len(c['user']))//4} tok")
        return
    filt = [s for s in args.models.split(",") if s]
    rows, raw_out = [], []
    for provider, model in MODELS:
        if filt and not any(f in model for f in filt):
            continue
        for case in CASES:
            for i in range(args.samples):
                try:
                    content, usage, lat = call(provider, model, case["system"], case["user"], case["max_tokens"])
                    ok = case["check"](content)
                    detail = quote_detail(content, TEXT, "reactions" if case["name"] == "reactions" else "issues") if "quote" in case["name"] or case["name"] == "reactions" else ""
                    rows.append({"provider": provider, "model": model, "case": case["name"], "sample": i,
                                 "ms": round(lat * 1000), "in": usage.get("prompt_tokens", 0), "out": usage.get("completion_tokens", 0),
                                 "reasoning": (usage.get("completion_tokens_details") or {}).get("reasoning_tokens", 0),
                                 "ok": ok, "detail": detail})
                    raw_out.append({"model": model, "case": case["name"], "sample": i, "content": content})
                    print(f"{model:<32} {case['name']:<24} #{i} {lat*1000:6.0f}ms in={usage.get('prompt_tokens',0)} out={usage.get('completion_tokens',0)} ok={ok} {detail}")
                except Exception as e:
                    print(f"{model:<32} {case['name']:<24} #{i} FAIL {type(e).__name__}: {str(e)[:160]}")
                    rows.append({"provider": provider, "model": model, "case": case["name"], "sample": i, "ms": 0, "in": 0, "out": 0, "reasoning": 0, "ok": False, "detail": str(e)[:120]})
    out = ROOT / "results" / "bench_muse.json"
    out.write_text(json.dumps({"rows": rows, "raw": raw_out}, indent=2))
    print(f"\nsummary -> {out}")
    from collections import defaultdict
    agg = defaultdict(list)
    for r in rows: agg[(r["model"], r["case"])].append(r)
    print(f"{'model':<32} {'case':<24} {'avg ms':>8} {'in':>6} {'out':>6} {'reason':>7} {'ok':>5}")
    for (m, c), rs in sorted(agg.items()):
        good = [r for r in rs if r["ms"]]
        if not good: continue
        print(f"{m:<32} {c:<24} {sum(r['ms'] for r in good)/len(good):8.0f} {sum(r['in'] for r in good)/len(good):6.0f} {sum(r['out'] for r in good)/len(good):6.0f} {sum(r['reasoning'] for r in good)/len(good):7.0f} {sum(1 for r in good if r['ok'])}/{len(good)}")

if __name__ == "__main__":
    main()
