"""Grid search over Muse model x temperature x reasoning_effort for Byline tasks.

Auto metrics: latency, tokens (in/out/reasoning), output validity
(complete: 1-3 lines within word cap; annotate: JSON parses + all quotes verbatim).
Human judging: outputs are written BLINDED (config code only) into
results/grid_reading_pack.md + results/grid_scores.csv for reading-based scoring.

Run: python3 bench/grid_search.py --samples 2
Fill grid_scores.csv (relevance, felt_mine, quality 1-5), then:
     python3 bench/grid_search.py --summarize
"""
from __future__ import annotations
import argparse, csv, itertools, json, random, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
for line in (ROOT / ".env").read_text().splitlines() if (ROOT / ".env").exists() else []:
    if "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1)
        import os; os.environ.setdefault(k.strip(), v.strip())
import os
KEY = os.environ.get("META_API_KEY", "")
BASE = os.environ.get("META_BASE_URL", "https://api.meta.ai/v1")

MODELS = ["muse-spark-1.3", "muse-spark-1.2", "muse-spark-1.1", "muse-wonder-1.0"]
TEMPS = [0.2, 0.7, 1.0]
EFFORTS = ["minimal", "low"]

TEXT = ("Cats are independent, as I said. Dogs needs daily walks. "
        "A plethora of reasons exist. Cats are quiet. Dogs bark. "
        "Cats live longer than dogs. Finally, cats are just cute.")
TASKS = {
    "complete": {
        "system": "Help writer continue their own writing. Return exactly 3 distinct options, one per line, no numbering.",
        "user": "CONTEXT: argue cats are better than dogs\nLEVEL: General\nASSIST: Phrase (<=8 words)\nTEXT BEFORE CURSOR:\nCats are independent animals that\nTASK: 3 continuations, one per line.",
        "max_tokens": 600,
        "check": lambda t: 1 <= len([l for l in t.splitlines() if l.strip()]) <= 3 and all(len(l.split()) <= 11 for l in t.splitlines() if l.strip()),
    },
    "annotate": {
        "system": 'Careful editor. JSON only. Anchor every issue with "quote": EXACT verbatim substring from TEXT and "context": verbatim snippet containing quote. No IDs/offsets.',
        "user": f"CONTEXT: argue cats better than dogs\nLEVEL: General\nTEXT:\n{TEXT}\nTASK: Flag vocabulary and relevance issues, max 6. JSON: {{\"issues\": [{{\"quote\": \"...\", \"context\": \"...\", \"type\": \"vocabulary|relevance\", \"reason\": \"...\", \"replacement\": \"...\"}}]}}",
        "max_tokens": 900,
        "check": lambda t: _quote_ok(t),
    },
}

def _quote_ok(raw):
    try:
        d = json.loads(raw[raw.find("{"): raw.rfind("}") + 1])
        items = d.get("issues", [])
        return bool(items) and all(i.get("quote", "") in TEXT and i.get("quote", "") in i.get("context", "") for i in items)
    except Exception:
        return False

def call(model, task, temp, effort):
    body = {"model": model, "messages": [{"role": "system", "content": task["system"]}, {"role": "user", "content": task["user"]}],
            "max_tokens": task["max_tokens"], "temperature": temp, "reasoning_effort": effort}
    req = urllib.request.Request(f"{BASE}/chat/completions", data=json.dumps(body).encode(),
                                 headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    t = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            d = json.load(r)
        ms = round((time.perf_counter() - t) * 1000)
        content = (d["choices"][0]["message"].get("content") or "") if d.get("choices") else ""
        u = d.get("usage") or {}
        return {"ms": ms, "in": u.get("prompt_tokens", 0), "out": u.get("completion_tokens", 0),
                "reasoning": (u.get("completion_tokens_details") or {}).get("reasoning_tokens", 0),
                "ok": bool(content.strip()) and task["check"](content), "content": content}
    except Exception as e:
        return {"ms": round((time.perf_counter() - t) * 1000), "in": 0, "out": 0, "reasoning": 0, "ok": False, "content": f"ERROR {type(e).__name__}: {str(e)[:120]}"}

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--samples", type=int, default=2); ap.add_argument("--summarize", action="store_true")
    args = ap.parse_args()
    if args.summarize:
        summarize(); return
    configs = list(itertools.product(MODELS, TEMPS, EFFORTS))
    codes = {cfg: f"C{i:02d}" for i, cfg in enumerate(configs)}
    jobs = [(cfg, tname, i) for cfg in configs for tname in TASKS for i in range(args.samples)]
    random.seed(7); random.shuffle(jobs)  # spread rate-limit risk
    rows, blind = [], {}
    def run(job):
        (model, temp, effort), tname, i = job
        r = call(model, TASKS[tname], temp, effort)
        return (model, temp, effort), tname, i, r
    with ThreadPoolExecutor(max_workers=5) as ex:
        for (model, temp, effort), tname, i, r in ex.map(run, jobs):
            code = codes[(model, temp, effort)]
            rows.append({"code": code, "model": model, "temp": temp, "effort": effort, "task": tname, "sample": i,
                         "ms": r["ms"], "in": r["in"], "out": r["out"], "reasoning": r["reasoning"], "ok": r["ok"]})
            blind.setdefault((code, tname), []).append(r["content"])
            print(f"{code} {model:<17} t={temp} {effort:<8} {tname:<9} #{i} {r['ms']:5d}ms out={r['out']:4d} ok={r['ok']}")
    (ROOT / "results/grid_search.json").write_text(json.dumps({"rows": rows, "codes": {code: list(cfg) for cfg, code in codes.items()}}, indent=2))
    # blind reading pack (configs shuffled, model hidden)
    order = list(blind.keys()); random.seed(11); random.shuffle(order)
    lines = ["# Grid reading pack — BLIND judging", "", "Score each output in `grid_scores.csv`: relevance (fits cats-vs-dogs context), felt_mine (sounds like writer could own it), quality — all 1–5. Do not guess the model.", ""]
    score_rows = []
    for n, (code, tname) in enumerate(order, 1):
        bid = f"B{n:02d}"
        lines += [f"## {bid} · task={tname}", "", "```", blind[(code, tname)][0][:900], "```", ""]
        score_rows.append({"blind_id": bid, "code": code, "task": tname, "relevance_1_5": "", "felt_mine_1_5": "", "quality_1_5": "", "notes": ""})
    (ROOT / "results/grid_reading_pack.md").write_text("\n".join(lines))
    with open(ROOT / "results/grid_scores.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(score_rows[0].keys())); w.writeheader(); w.writerows(score_rows)
    # mapping kept separate so judging stays blind until scoring
    (ROOT / "results/grid_blind_key.json").write_text(json.dumps({r["blind_id"]: r["code"] for r in score_rows}, indent=2))
    print("\n=== AUTO SUMMARY (avg) ===")
    from collections import defaultdict
    agg = defaultdict(list)
    for r in rows: agg[(r["code"], r["model"], r["temp"], r["effort"], r["task"])].append(r)
    print(f"{'code':<5} {'model':<17} {'t':>4} {'eff':<8} {'task':<9} {'ms':>6} {'in':>5} {'out':>5} {'reas':>5} {'ok':>4}")
    for k in sorted(agg):
        rs = agg[k]; n = len(rs)
        print(f"{k[0]:<5} {k[1]:<17} {k[2]:4} {k[3]:<8} {k[4]:<9} {sum(r['ms'] for r in rs)/n:6.0f} {sum(r['in'] for r in rs)/n:5.0f} {sum(r['out'] for r in rs)/n:5.0f} {sum(r['reasoning'] for r in rs)/n:5.0f} {sum(1 for r in rs if r['ok'])}/{n}")
    print("\nReading pack: results/grid_reading_pack.md · scores: results/grid_scores.csv · then run --summarize")

def summarize():
    codes = json.loads((ROOT / "results/grid_search.json").read_text())["codes"]
    human = {}
    p = ROOT / "results/grid_scores.csv"
    if p.exists():
        for row in csv.DictReader(p.open()):
            vals = [row.get(k) for k in ("relevance_1_5", "felt_mine_1_5", "quality_1_5")]
            if all(vals):
                human.setdefault(row["code"], []).append(sum(float(v) for v in vals) / 3)
    rows = json.loads((ROOT / "results/grid_search.json").read_text())["rows"]
    from collections import defaultdict
    agg = defaultdict(list)
    for r in rows: agg[r["code"]].append(r)
    print(f"{'code':<5} {'model':<17} {'t':>4} {'eff':<8} {'auto_ok%':>8} {'ms':>6} {'tok':>6} {'human/5':>8}")
    ranked = []
    for code, rs in agg.items():
        model, temp, effort = codes[code]
        okp = 100 * sum(1 for r in rs if r["ok"]) / len(rs); ms = sum(r["ms"] for r in rs) / len(rs); tok = sum(r["in"] + r["out"] for r in rs) / len(rs)
        h = sum(human.get(code, [])) / len(human[code]) if human.get(code) else None
        ranked.append((-(h or 0), -okp, ms, code, model, temp, effort, okp, tok, h))
    for _, _, ms, code, model, temp, effort, okp, tok, h in sorted(ranked):
        print(f"{code:<5} {model:<17} {temp:4} {effort:<8} {okp:8.0f} {ms:6.0f} {tok:6.0f} {h if h is not None else '—':>8}")

if __name__ == "__main__":
    main()
