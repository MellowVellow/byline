# Byline — Writer-Controlled AI Writing Workspace

> **Meta Global AI Developer Hackathon Submission**  
> *Write what you mean. Find your way forward.*

Byline is a writer-controlled AI writing workspace that helps people express their ideas, connect their thoughts, and improve their writing without handing the entire draft over to an automated generator.

---

## 1. Core Architecture (The Three-Part Model)

- **Intent (Left Dock):** Context (topic, purpose, audience, background, key ideas, constraints) and interactive hierarchical Outline nodes linking to editor blocks.
- **Expression (Center Paper):** TipTap/ProseMirror paper editor with local Draft Assistance (Hint 1–4 words, Phrase, Sentence, Paragraph), Connect (select 2+ sentences to apply inline connectors, with seam options in a popup beside the editor), and Selection-based Paraphrase (3 distinct alternatives: Paraphrase, Shorten, Change Tone).
- **Reflection (Right Dock):** Unified findings rail aggregating observations across all four personas:
  - **Red (Grammar):** Deterministic language correctness & direct corrections.
  - **Purple (Reader):** Observations on perceived ambiguity and reader interpretation (without unsolicited rewrites).
  - **Yellow (Supervisor):** Intention and outline-grounded structural, flow, and argumentation review with up to 3 alternatives.
  - **Blue (Researcher):** Claim extraction, evidence status (`supported`, `contradicted`, `unverified`), and citation grounding.

---

## 2. Meta-Authored AI Models Exclusively

Byline strictly enforces Meta-authored models across all inference paths. Server-side allowlist guards reject non-Meta models:

| Provider | Supported Meta Models | Role in Byline |
|---|---|---|
| **OpenRouter** | `meta-llama/llama-3.3-70b-instruct`, `meta-llama/llama-3.1-70b-instruct`, `meta-llama/llama-3.1-8b-instruct` | Primary reasoning for Supervisor, Reader, Paraphrase |
| **Meta Model API** | `muse-spark-1.3`, `muse-glimmer-30b`, `muse-voice-transcribe-1.0` | Ghost draft completions, structured responses, audio transcriptions |
| **Baseten** | `meta-llama/Llama-3.3-70B-Instruct`, `meta-llama/Meta-Llama-3.1-70B-Instruct` | Dedicated Meta inference endpoints |
| **Internal Mock Engine** | Deterministic Meta simulation | Offline development, local testing, and offline evaluation with zero external dependencies |

---

## 3. Quickstart & Local Execution

### Backend Setup
```bash
# 1. Environment configuration
cp .env.example .env
# Edit .env with your OPENROUTER_API_KEY or META_API_KEY (optional: offline mock works automatically)

# 2. Run backend
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
uvicorn app.main:app --port 8000 --app-dir backend
```

### Frontend Setup
```bash
npm --prefix frontend install
npm --prefix frontend run dev
# Open http://localhost:5173
```

---

## 4. Testing & Verification

```bash
# Run backend pytest suite (38 passing tests)
pytest backend/tests -v

# Run frontend vitest suite (35 passing tests)
npm test --prefix frontend

# Run frontend typecheck and production build
npm run build --prefix frontend
```

---

## 6. Inference Benchmarks (Latency & Token Speed)

Measured 2026-11-04 with a fixed ghost-completion prompt
(`Sentence` assist level, temperature 0.7, 3 sequential non-streaming
`POST /chat/completions` trials per provider).
Latency = wall-clock per request; token speed = `completion_tokens / wall-clock`
(completion tokens include reasoning tokens on reasoning models).

| Provider | Model | Mean latency | Mean token speed | Mean completion tokens | Notes |
|---|---|---|---|---|---|
| **Baseten** (dedicated) | `meta-models/muse-spark-open-1026` | 2.86 s | ~202 tok/s | ~582 | Reasoning-heavy (~400–700 reasoning tok/req); needs `max_tokens ≈ 1200` — at 600 budget 2/3 trials truncated (`finish=length`, no visible text) |
| **Meta Model API** | `muse-spark-1.3` (`reasoning_effort=minimal`) | 2.05 s | ~55 tok/s | ~113 | Stable `finish=stop` at 600 budget; lowest latency, best for interactive ghost-text |
| **OpenRouter** (free) | `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | 1.77 s | ~71 tok/s | ~129 | Reasoning-light (~50–170 reasoning tok/req); clean `finish=stop` + visible text on all 3 trials at 600 budget; fastest mean latency measured |
| **OpenRouter** (paid, no `:free` variant exists) | `google/gemini-3.1-flash-lite` ($0.25/M in) | 3.55 s | ~9 tok/s | ~17 | High routing variance per trial: 1.13 / 2.38 / 7.15 s; terse outputs (~15–19 tok) so tok/s understates it — quality visible text (~80–100 chars) every trial |
| **Internal Mock Engine** | Deterministic Meta simulation | ~0 s (no network) | n/a | fixed | Offline dev / tests only; zero external dependencies |

Takeaway: Meta API → interactive path (lowest stable latency);
Baseten → highest raw throughput once given reasoning headroom;
Nemotron 3 Nano (`:free`) → fastest mean latency at $0;
Gemini 3.1 Flash Lite → terse but high-variance routing, paid-only.
Non-Meta rows are reference benchmarks only — the backend allowlist (§2)
still rejects them at inference time. Free-tier caps: 20 req/min, 50 req/day
(< $10 credits purchased).

---

## 7. Keyboard Shortcuts
- `1`, `2`, `3`: Accept corresponding alternative when suggestion overlay or paraphrase popup is active.
- `Tab`: Accept focused or primary suggestion.
- `Alt` / visible button: Reroll alternative options for the current suggestion or finding.
- `Ctrl/Cmd + Space`: Trigger draft assistance at cursor; with text selected opens synonym / paraphrase / tone popup (after `slowMs` pause).
- `Ctrl/Cmd + Shift + /`: Expand Connect for a 2+ sentence selection from its synonym popup.
- `Ctrl/Cmd + ,`: Open Settings & Writing Profile modal.
