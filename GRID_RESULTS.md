# Grid search results — Muse parameters for Byline

Grid: 4 models × temp {0.2, 0.7, 1.0} × reasoning_effort {minimal, low} × 2 tasks (complete Phrase, annotate) × 2 samples = 96 calls, 5-way concurrent. Script: `bench/grid_search.py`. Raw: `results/grid_search.json`.

## Auto-metric winners

| Rank | Config | Validity | Avg latency | Avg tokens |
|---|---|---|---|---|
| 1 | **C02 muse-spark-1.3, t=0.7, minimal** | 100% | 2,354ms | 522 |
| 2 | C00 muse-spark-1.3, t=0.2, minimal | 100% | 2,412ms | 544 |
| 3 | C04 muse-spark-1.3, t=1.0, minimal | 100% | 2,508ms | 499 |
| 4 | C10 muse-spark-1.2, t=1.0, minimal | 100% | 2,618ms | 528 |

## Decisive findings

1. **`reasoning_effort=low` breaks annotate**: reasoning eats the 900-token cap (reasoning ≈ 890/900), JSON truncates → validity 0/2 for almost every `low` config on annotate. Keep `minimal` for all JSON tasks, or raise cap >1800 if ever using low.
2. **Muse Wonder is unusable interactively**: valid but 16–28s latency spikes (vs Spark 1.4–5s). Reserve Wonder for offline/deep tasks only.
3. **Temperature barely moves auto metrics** (validity/latency flat 0.2→1.0) — this axis must be decided by human reading (creativity vs drift), hence the blind pack.
4. Spark 1.3 `minimal` dominates Spark 1.2/1.1 on annotate validity (1.1 minimal annotate also truncates: 900-cap at 684–883 reasoning).

## Human judging (your turn)

- Blind outputs: `results/grid_reading_pack.md` (48 items, B01–B48, model hidden)
- Score sheet: `results/grid_scores.csv` — fill relevance / felt_mine / quality (1–5)
- Then: `python3 bench/grid_search.py --summarize` → merges human scores with auto metrics and ranks configs (blind key: `results/grid_blind_key.json`, open only after scoring)

## All-Meta plan probes (tested)

- Responses API `web_search` tool: works, returns `web_search_call` + results (3.3s) → Tavily removal viable.
- `response_format: json_schema`: constrained output conforms exactly → can replace JSON-repair cascade.
- Prompt caching: identical stable prefix, call 2 served 241/261 input tokens from cache (`cached_tokens`) with `prompt_cache_key="byline-grid-probe"`.
