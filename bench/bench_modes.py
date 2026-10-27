"""Consumption test: Editing mode cycle vs Linting mode cycle.

Editing cycle (per ~1.4s idle burst in app): POST /api/grammar (LT, 0 LLM tok)
  + /api/annotate + /api/reactions. Ghost /api/complete measured separately.
Linting cycle (per run): POST /api/lint with all 22 preset rules active.
Drafting cycle: one /api/complete.

Usage/latency read from each response (usage + server/client timing).
Run: python3 bench/bench_modes.py --samples 3
"""
from __future__ import annotations
import argparse, json, time, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API = "http://localhost:8000"

SHORT = ("Cats are independent, as I said. Dogs needs daily walks. A plethora of reasons exist for choosing a cat. "
         "Cats are quiet. Dogs bark. Cats live longer than dogs. Finally, cats are just cute.")
MEDIUM = ("The cooling system failed unexpectedly. In order to make sure that the servers don't overheat again, we must fix it immediately. "
          "Studies show that our algorithm is dramatically faster than industry standards. I just feel that we could arguably consider adjusting the deployment schedule. "
          "The engineering team conducted an analysis of the performance degradation. Mistakes were made during the deployment, and the database was wiped. "
          "We must either rewrite the entire codebase in Rust or accept constant memory crashes in production. In recent years, research has shown that adaptive interfaces leverage synergy to move the needle. "
          "The pipeline processes data. The pipeline transforms schemas. The pipeline loads vectors. Switching to serverless guarantees lower costs and zero downtime. "
          "Valence-Arousal-Dominance (VAD) was measured during Virtual Reality Exposure Therapy (VRET) sessions. The results shows that users loves the calmer interface. "
          "After reviewing three quarters of thermal data and running diagnostic sweeps across all secondary cooling racks, the primary server cluster overheated. "
          "Our game-changing solution leverages cutting-edge synergy. The memory leak was extremely bad and made the system run very slowly. We are super excited to announce the update!") 

RULES = [
    ("R_AMB_01","amber","BLUF: Flag background before main conclusion"),("R_AMB_02","amber","Premise contradiction"),("R_AMB_03","amber","Unsupported causal jump"),("R_AMB_04","amber","Absolute generalizations beyond data scope"),("R_AMB_05","amber","False dilemma binary framing"),
    ("R_GRN_01","green","Nominalizations / zombie nouns"),("R_GRN_02","green","Redundant word pairs"),("R_GRN_03","green","3+ prepositional stacks"),("R_GRN_04","green","Passive voice hiding actor"),("R_GRN_05","green","Vague pronouns this/it/they"),
    ("R_CYN_01","cyan","Sentence opener monotony 3+"),("R_CYN_02","cyan","Abrupt topic shift no bridge"),("R_CYN_03","cyan","Sentence ends on weak filler"),("R_CYN_04","cyan","Parallelism violations in lists"),
    ("R_RSE_01","rose","Undefined jargon/acronym first use"),("R_RSE_02","rose","Empirical claims without source/numbers"),("R_RSE_03","rose","Abstract principle without example"),("R_RSE_04","rose","No-tradeoff absolute assertions"),
    ("R_VIO_01","violet","Hedging/apologetic tone"),("R_VIO_02","violet","Buzzword saturation"),("R_VIO_03","violet","Stacked adverbs very/really"),("R_VIO_04","violet","Forced enthusiasm/exclamation"),
]
ACTIVE = [{"id": i, "category": c, "rule": r} for i, c, r in RULES]

def post(path, body):
    req = urllib.request.Request(f"{API}{path}", data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    t = time.perf_counter()
    with urllib.request.urlopen(req, timeout=180) as r:
        d = json.load(r)
    ms = round((time.perf_counter() - t) * 1000)
    u = d.get("usage") or {}
    return {"path": path, "ms": ms, "ok": d.get("ok"), "in": u.get("prompt_tokens", 0), "out": u.get("completion_tokens", 0),
            "reasoning": (u.get("completion_tokens_details") or {}).get("reasoning_tokens", 0), "model": d.get("model", "")}

def cycle(mode, text):
    calls = []
    if mode == "drafting":
        calls.append(post("/api/complete", {"context": "cats vs dogs essay", "level": "General", "assist_level": "Phrase", "before": text, "after": ""}))
    elif mode == "editing":
        calls.append(post("/api/grammar", {"text": text}))
        calls.append(post("/api/annotate", {"context": "cats vs dogs essay", "level": "General", "text": text}))
        calls.append(post("/api/reactions", {"context": "cats vs dogs essay", "level": "General", "text": text, "persona": "Skeptical reader"}))
        calls.append(post("/api/complete", {"context": "cats vs dogs essay", "level": "General", "assist_level": "Phrase", "before": text, "after": ""}))
    elif mode == "linting":
        calls.append(post("/api/lint", {"context": "cats vs dogs essay", "text": text, "active_rules": ACTIVE}))
    elif mode == "editing+lint":
        calls.extend(cycle("editing", text))
        calls.append(post("/api/lint", {"context": "cats vs dogs essay", "text": text, "active_rules": ACTIVE}))
    return calls

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--samples", type=int, default=3); args = ap.parse_args()
    rows = []
    for label, text in [("short(~35w)", SHORT), ("medium(~190w)", MEDIUM)]:
        for mode in ["drafting", "editing", "linting", "editing+lint"]:
            for i in range(args.samples):
                calls = cycle(mode, text)
                tot = {"in": sum(c["in"] for c in calls), "out": sum(c["out"] for c in calls), "reasoning": sum(c["reasoning"] for c in calls), "ms": sum(c["ms"] for c in calls)}
                rows.append({"text": label, "mode": mode, "sample": i, "calls": len(calls), **tot, "detail": calls})
                print(f"{label:<15} {mode:<9} #{i} calls={len(calls)} in={tot['in']} out={tot['out']} (reasoning {tot['reasoning']}) total_tok={tot['in']+tot['out']} wall={tot['ms']}ms")
    out = ROOT / "results" / "bench_modes.json"; out.write_text(json.dumps(rows, indent=2))
    print(f"\n=== AVERAGES per cycle -> {out} ===")
    print(f"{'text':<15} {'mode':<9} {'calls':>5} {'in':>7} {'out':>7} {'reason':>7} {'total':>7} {'wall ms':>8} {'tok/word':>8}")
    for label, text in [("short(~35w)", SHORT), ("medium(~190w)", MEDIUM)]:
        words = len(text.split())
        for mode in ["drafting", "editing", "linting", "editing+lint"]:
            rs = [r for r in rows if r["text"] == label and r["mode"] == mode]
            if not rs: continue
            avg = {k: sum(r[k] for r in rs) / len(rs) for k in ["calls", "in", "out", "reasoning", "ms"]}
            total = avg["in"] + avg["out"]
            print(f"{label:<15} {mode:<9} {avg['calls']:5.0f} {avg['in']:7.0f} {avg['out']:7.0f} {avg['reasoning']:7.0f} {total:7.0f} {avg['ms']:8.0f} {total/words:8.1f}")

if __name__ == "__main__":
    main()
