# Byline

**Think it. Write it.**

Byline is a writer-controlled editor. It does not write your draft for you. It offers the next words, a phrase, or a question, as options you can accept or ignore.

## Manifesto

AI writing is usually sold as completion: give a prompt, receive a paragraph. That model replaces the writer's judgment with a model's average.

Byline challenges that assumption. Writing is not a single completion event. It is a sequence of small decisions: the next word, the next clause, the next transition, the next question. Byline keeps those decisions small and visible:

- It suggests **bits**, not blocks: cues, fragments, sentences, and questions.
- It offers **options**, not answers: several alternatives at each level.
- It waits for **approval**: nothing enters the draft until you accept it.
- It stays **grounded**: source cards must carry a verbatim passage; citations are deterministic APA from metadata, not free text.

The writer remains the author. The model is a fast, opinionated margin note.

## Main features

- **Suggest with assist levels**: cues, phrases, sentences, and questions at the cursor.
- **Review feedback**: Reader notes anchored to exact passages.
- **Paraphrasing**: synonym and rewrite options for selected text.
- **Phrase connecting**: connectors and drafted bridges between sentences.
- **Library from provided sources**: grounded cards and APA citations from URLs, PDFs, and documents.

## What Byline is

- A Tiptap-based rich-text editor that runs in the browser.
- Ghost text at the cursor with four levels: cue, phrase, sentence, and question.
- A Reader rail that anchors critiques to exact passages.
- Local grammar checks via Harper.js (WebAssembly, offline-capable).
- Connect seams that join sentences with contrast, cause, elaboration, or example.
- A Library of source cards with verbatim passages and APA citations.
- Provenance tracing that matches draft sentences to saved source text.
- A per-IP budget and model allowlist that keep usage bounded and Meta-only.

## What Byline is not

- It is not a chatbot that writes your draft.
- It does not auto-apply rewrites except small grammar fixes.
- It does not store your document on a server by default.
- It is not a general-purpose LLM gateway: the backend allowlists Meta-authored models only.

## Core features

### Ghost text levels

When you pause, Byline offers a small set of options at the cursor:

- **Cue**: 2-4 word nudge.
- **Phrase**: finish the current clause.
- **Sentence**: finish the sentence with one new idea.
- **Question**: three questions that prompt the writer.

You can switch levels, cycle alternatives, reroll, and accept with Tab or a number key.

### Reader review

The Reader persona reads the draft and leaves notes anchored to exact spans. Each note can include replacement options. Notes are grouped by explanation, can be reprompted for fresh alternatives, and can be dismissed. Grammar findings are a separate persona, so mechanical fixes do not masquerade as style advice.

### Grammar

Harper.js runs in the browser and flags capitalization, grammar, agreement, and punctuation. It is citation-immune: text inside `(Author, Year)` spans is not flagged. Custom words and ignored rules persist locally.

### Connect

Select two or more sentences and expand Connect. Byline inserts connector words at each seam and lets you toggle or cycle alternatives for contrast, cause, elaboration, and example. The transform is client-side and deterministic.

### Library and citations

Paste a URL or upload a PDF, DOCX, TXT, CSV, or Markdown file. Byline extracts source cards (facts, stats, quotes) and AI cards (ideas, questions, premises, terms, visuals). Each source card must carry a verbatim passage; cards that cannot be verified are flagged. Source metadata is formatted as deterministic APA. Full source text is stored locally for provenance tracing.

### Local-first storage

Drafts, settings, library cards, sources, and full source text stay in the browser (localStorage and IndexedDB). The backend receives only the text you send for a check.

### Meta-only models

The backend allowlists Meta-authored models (Muse Spark Open via Baseten, Muse Spark 1.3 via the Meta Model API, Llama 3.3 via OpenRouter, optional local vLLM). Any other model name is rejected.

## Architecture

```text
frontend/  React 19 + Vite + Tiptap editor
backend/   FastAPI routers, LLM gateway, budget accounting
supabase/  Optional waitlist and usage rollup SQL
data/      Local SQLite usage database (gitignored)
```

Frontend talks to the backend through `/api/*`. In production, Vercel rewrites `/api/*` to the backend. The backend enforces a shared API key, per-IP rate limits, per-IP token and USD budgets, and a request body cap.

## Quick start

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The app runs at `/demo` or `/app`.

### Tests

```bash
cd backend && pytest
cd frontend && npm test
```

## Configuration

Copy `.env.example` to `.env` in the project root and fill in the providers you want to use.

Key variables:

- `BASETEN_API_KEY`, `META_API_KEY`, `OPENROUTER_API_KEY`: provider credentials.
- `LOCAL_BASE_URL`, `LOCAL_MODEL`, `LOCAL_PREFER`: optional local vLLM.
- `API_KEY`: shared API key. Required when `ENV=prod`.
- `ENV`: `dev` or `prod`. Prod refuses to boot without `API_KEY` and disables mock fallback.
- `IP_BUDGET_ENABLED`, `IP_TOKEN_BUDGET`, `IP_BUDGET_USD`, `IP_BUDGET_WINDOW_HOURS`: per-IP limits.
- `SUGGEST_RATE_PER_MINUTE`, `SUGGEST_RATE_PER_DAY`: completion request limits.
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`: optional waitlist storage.
- `TAVILY_API_KEY`: optional fallback for library fetching.
- `ADMIN_TOKEN`: enables `/api/metrics/usage`.

## Privacy

- Drafts, settings, library data, and source text are stored in the browser.
- The backend receives only text you explicitly send for a check.
- Waitlist email storage is optional and can fall back to a local file in dev.
- Per-IP usage is recorded in a local SQLite database for budgeting and admin metrics.

## Project status

This is a hackathon build. The core editing, suggestion, review, grammar, connect, library, and citation flows are implemented. Some features, such as Explore, use built-in sample data in this build.

## Development notes

- Backend constants in `backend/app/constants.py` mirror `frontend/src/lib/constants.ts`; keep them in sync.
- The frontend uses Vite. Production builds are served from `frontend/dist`.
- Vercel configuration is in `vercel.json`.
