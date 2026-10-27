"""Bootstrap seed dataset from Muse (teacher) until real accepted pairs exist.

No dataset yet -> synthesize {context, before, accepted} completion pairs across
doc types/levels, in byline_dataset.jsonl format (same as in-app Export dataset).
Real user pairs should progressively replace synthetic ones.

Run: python3 generate_seed_dataset.py --n 60 --out byline_dataset.jsonl
"""
from __future__ import annotations
import argparse, itertools, json, os, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
for line in (ROOT / ".env").read_text().splitlines():
    if "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1); os.environ.setdefault(k.strip(), v.strip())
KEY = os.environ.get("META_API_KEY", ""); BASE = os.environ.get("META_BASE_URL", "https://api.meta.ai/v1")

SCENARIOS = [
    ("essay arguing cats are better than dogs for first-time owners", "Cats are independent animals that", "Phrase"),
    ("academic paper on anxiety and access to healthcare", "Over the past decade, researchers have argued that access to care is shaped less by medicine than by", "Phrase"),
    ("cooking blog about weeknight dinners", "The secret to a weeknight dinner that actually works on a Tuesday is", "Sentence"),
    ("business proposal for a campus bike-share", "Our proposal addresses the transport gap by", "Phrase"),
    ("technical report on server cooling failure", "The cooling system failed unexpectedly, and as a result the team", "Sentence"),
    ("email to a professor asking for an extension", "I am writing to request a short extension because", "Phrase"),
    ("travel blog about Kyoto in autumn", "By the time the maples turn along the Philosopher's Path, the city", "Sentence"),
    ("research abstract on sleep and memory", "These findings suggest that sleep deprivation", "Phrase"),
]
LEVELS = ["General", "Academic", "Casual", "Technical"]

def gen(context, before, assist, level):
    body = {"model": "muse-spark-1.3", "messages": [
        {"role": "system", "content": "Generate ONE natural continuation exactly as a skilled writer would write it. Output only the continuation."},
        {"role": "user", "content": f"CONTEXT: {context}\nLEVEL: {level}\nASSIST: {assist}\nTEXT BEFORE CURSOR:\n{before}\nContinuation:"}],
        "max_tokens": 300, "temperature": 0.85, "reasoning_effort": "minimal"}
    req = urllib.request.Request(f"{BASE}/chat/completions", data=json.dumps(body).encode(),
                                 headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=90) as r:
        d = json.load(r)
    return (d["choices"][0]["message"].get("content") or "").strip().splitlines()[0] if d.get("choices") else ""

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--n", type=int, default=60); ap.add_argument("--out", default="byline_dataset.jsonl")
    args = ap.parse_args()
    combos = list(itertools.product(SCENARIOS, LEVELS))
    rows = []
    for i in range(args.n):
        (context, before, assist), level = combos[i % len(combos)]
        try:
            acc = gen(context, before, assist, level)
            if acc: rows.append({"context": context, "before": before, "accepted": acc, "assist": assist, "level": level, "source": "synthetic-teacher"})
            print(f"{len(rows)} ok")
        except Exception as e:
            print("skip", type(e).__name__, str(e)[:100])
    Path(args.out).write_text("\n".join(json.dumps(r) for r in rows))
    print(f"wrote {len(rows)} pairs -> {args.out}; next: python3 prepare_dataset.py")

if __name__ == "__main__":
    main()
