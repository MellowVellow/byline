# Muse benchmark — quote-based (no ID tagging)

Method: `bench/bench_muse.py`, Meta API `https://api.meta.ai/v1`, `reasoning_effort=minimal` (required: without it reasoning tokens consume `max_tokens`, content empty). Tasks: complete Phrase (anxiety vs cooking context swap), annotate, main-idea, reactions. Annotate/reactions require exact verbatim `quote` + verbatim `context`; validator checks `quote in text`, `context in text`, `quote in context`. Raw: `results/bench_muse.json` (regenerated per run; rerun = `python3 bench/bench_muse.py --samples 3`).

## Results (1 sample unified run + 2-sample spot run, ms avg)

| Model | Complete anxiety | Complete cooking | Annotate | Main idea | Reactions | Quote verbatim |
|---|---:|---:|---:|---:|---:|---|
| muse-spark-1.3 | ~1466 | ~2372 | ~2414 | ~1397 | ~2780 | 100% |
| muse-wonder-1.0 | ~2245 | ~3220 | ~4601 | ~2318 | ~3546 | 100% |
| muse-spark-1.2 | ~2312 | ~2473–2931 | ~2738 | ~2347 | ~4134 | 100% |
| muse-spark-1.1 | ~2641 | ~3055–3126 | ~2523–3639 | ~1706–2722 | ~3714–4168 | 100% |
| gemini-2.5-flash-lite | ~1393 | ~931 | ~1101 | ~933 | ~1520 | 100% |

## Findings

- Winner Muse: **muse-spark-1.3** — fastest Muse on 4/5 tasks. Default `META_MODEL=muse-spark-1.3` ✔︎
- Muse cost driver: reasoning tokens (Spark 1.3 complete: ~132–385 reasoning of 165–421 completion tokens; Gemini: 11–25 total out). Muse output-token volume 5–20× Gemini ⚠︎
- Latency: Muse 1.2–2.9s vs Gemini 0.8–1.7s. TTFS `<1s` target missed by Muse at `minimal` ⚠︎ — mitigate: cache, debounce, show gray dock instantly from cache, keep Gemini fallback configured.
- Context relevance: Muse cooking continuations strongly cooking-specific ("weeknight meals we can actually cook", "pantry staples"); Gemini cooking outputs generic ("the food we eat") — Muse wins relevance swap test ✔︎
- Quote anchoring replaces ID tagging with zero validator failures across all 5 models, saves tagged-text input tokens ✔︎
- Decision: Meta Muse primary (hackathon + relevance), OpenRouter Gemini fallback only on Meta failure.
