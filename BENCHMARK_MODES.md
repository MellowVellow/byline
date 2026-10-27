# Mode consumption (Muse Spark 1.3, 2 samples avg, `bench/bench_modes.py`)

Cycle = one idle burst as wired in app. Editing now includes Lint (merged).

| Text | Mode | Calls | In tok | Out tok | Reasoning | Total tok | Wall |
|---|---|---:|---:|---:|---:|---:|---:|
| short ~35w | Drafting (complete only) | 1 | 176 | 260 | 230 | 436 | 5.1s |
| short ~35w | Editing (grammar+annotate+reactions+complete) | 4 | 672 | 1569 | 1200 | 2241 | 8.2s |
| short ~35w | Lint only (22 rules) | 1 | 845 | 904 | 732 | 1749 | 3.7s |
| short ~35w | **Editing+Lint (merged, current)** | 5 | 1517 | 2582 | 1958 | **4099** | 11.5s |
| medium ~190w | Drafting | 1 | 360 | 352 | 319 | 712 | 2.5s |
| medium ~190w | Editing | 4 | 746 | 1040 | 722 | 1786 | 8.7s |
| medium ~190w | Lint only | 1 | 1029 | 1550 | 689 | 2579 | 4.4s |
| medium ~190w | **Editing+Lint (merged, current)** | 5 | 2014 | 3098 | 1687 | **5112** | 13.3s |

Findings:
- Merged Editing costs ~1.8–2.9× old Editing tokens and ~2.3–2× Lint alone; reasoning tokens are 45–65% of output.
- Lint input is expensive even on tiny text (845 tok: 22 rule instructions dominate). Fewer enabled rules / rule-toggle discipline directly cuts cost.
- Drafting is 5–12× cheaper than merged Editing — mode separation is the main token lever.
- Grammar/LT contributes latency (~0.3–1s) but 0 LLM tokens.
- Raw runs: `results/bench_modes.json`; rerun `python3 bench/bench_modes.py --samples 3`.
