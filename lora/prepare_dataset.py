"""Convert Byline accepted-suggestion pairs -> Axolotl/TRL chat JSONL.

Input : byline_dataset.jsonl  {"context","before","accepted","assist"}
Output: train.jsonl           {"messages":[system,user,assistant]}
Holdout: eval.jsonl (every 10th row)
"""
import json, pathlib, random

src = pathlib.Path("byline_dataset.jsonl")
rows = [json.loads(l) for l in src.read_text().splitlines() if l.strip()] if src.exists() else []
random.seed(7); random.shuffle(rows)
out, ev = [], []
for i, r in enumerate(rows):
    msgs = [
        {"role": "system", "content": "Help the writer continue their own writing. Return one short continuation only."},
        {"role": "user", "content": f"CONTEXT: {r.get('context','')}\nASSIST: {r.get('assist','Phrase')}\nTEXT BEFORE CURSOR:\n{r.get('before','')}\nContinue:"},
        {"role": "assistant", "content": r.get("accepted", "")},
    ]
    (ev if i % 10 == 0 else out).append({"messages": msgs})
pathlib.Path("train.jsonl").write_text("\n".join(json.dumps(x) for x in out))
pathlib.Path("eval.jsonl").write_text("\n".join(json.dumps(x) for x in ev))
print(f"train={len(out)} eval={len(ev)} (need >=500 total for meaningful LoRA)")
