# LoRA fast suggestions — step by step (Muse Glimmer QLoRA)

Base model per Meta docs: **Muse Glimmer 30B** (Apache 2.0) with Axolotl/TRL **QLoRA** — verified on 1×H100, LoRA r=16. Muse Spark Open (816B MoE) is not practical to fine-tune/serve for this project.

## YOUR steps (checkpoints)

0. **No dataset yet? Bootstrap seed:** `python3 generate_seed_dataset.py --n 500` creates Muse-teacher pairs across doc types/levels (same format). Smoke-tested at n=6 (level contrast visible). Replace synthetic rows with real pairs as they accumulate.
1. **Collect data (in app):** write in Drafting/Editing and accept ghost suggestions with `Tab`. Each accept is captured as `{context, before, accepted}`. Click **Export dataset** (left dock) — downloads `byline_dataset.jsonl` and saves pairs to the backend (`data/dataset.jsonl`). Target **≥500 pairs** (docs: meaningful adaptation starts ~500; 5k+ for strong fit).
2. **Get a GPU (Fireworks / Baseten / Modal):** recommended **Modal** - Fireworks fine-tuning only covers catalog bases (Glimmer not listed), Baseten adds lock-in; Modal runs this repo Axolotl config + vLLM serve on H100. Scaffold: `modal_app.py` (smoke -> train -> deploy), then backend env `LOCAL_BASE_URL=<serve url>/v1`.
3. **Prepare data:** put `byline_dataset.jsonl` here, run `python3 prepare_dataset.py` → `train.jsonl` (chat messages format).
4. **Train:** install per Meta Axolotl recipe (pinned versions in their cookbook), run `axolotl train muse-glimmer-30b-qlora.yaml` — start with their 2-step smoke run, then 1 epoch.
5. **Evaluate (required gate):** compare base vs tuned on held-out pairs (acceptance-style exact/quality check). Do not deploy if general quality drops.
6. **Serve:** `bash serve.sh` (vLLM OpenAI-compatible on :9000), then set backend env `LOCAL_BASE_URL=http://localhost:9000/v1` + `LOCAL_MODEL` and restart — `/api/complete` will be wired to try local first once this env exists.

## Notes
- QLoRA reload gotcha (docs): load adapter with `dtype=torch.bfloat16` + `bnb_4bit_quant_storage=torch.bfloat16`, or vision path loads in byte dtype.
- Sub-millisecond suggestions come from the browser prefix cache, not the model — LoRA target is TTFT <300ms locally. Measure with `bench/bench_modes.py` before claiming speed.
