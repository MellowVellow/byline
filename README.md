# Byline — Writer-Controlled AI Writing Workspace

> **Meta Global AI Developer Hackathon Submission**  
> *Write what you mean. Find your way forward.*

Byline is a writer-controlled AI writing workspace that helps people express their ideas, connect their thoughts, and improve their writing without handing the entire draft over to an automated generator.

---

## 1. Core Architecture (The Three-Part Model)

- **Intent (Left Dock):** Context (topic, purpose, audience, background, key ideas, constraints) and interactive hierarchical Outline nodes linking to editor blocks.
- **Expression (Center Paper):** TipTap/ProseMirror paper editor with local Draft Assistance (Hint 1–4 words, Phrase, Sentence, Paragraph), Connect (12 rhetorical pattern categories + Meta AI inference), and Selection-based Paraphrase (3 distinct alternatives: Paraphrase, Shorten, Change Tone).
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
| **OpenRouter** | `meta-llama/llama-3.3-70b-instruct`, `meta-llama/llama-3.1-70b-instruct`, `meta-llama/llama-3.1-8b-instruct` | Primary reasoning for Supervisor, Reader, Connect synthesis, Paraphrase |
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

## 5. Keyboard Shortcuts
- `1`, `2`, `3`: Accept corresponding alternative when suggestion overlay or paraphrase popup is active.
- `Tab`: Accept focused or primary suggestion.
- `Alt` / visible button: Reroll alternative options for the current suggestion or finding.
- `Ctrl/Cmd + Space`: Trigger draft assistance at cursor.
- `Ctrl/Cmd + /`: Open Connect Engine (pattern library & AI inference).
- `Ctrl/Cmd + ,`: Open Settings & Writing Profile modal.
