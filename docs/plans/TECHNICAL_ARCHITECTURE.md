# Byline: Technical Concepts and Architecture Plan

> **Authoritative Document B**  
> **Status:** Active & Reconciled with Byline v2 Production Codebase (Meta w/ OpenRouter)  
> **Cross-References:** [Product & Development](./PRODUCT_AND_DEVELOPMENT.md) · [Strategy & Presentation](./STRATEGY_AND_PRESENTATION.md) · [Implementation Roadmap](./IMPLEMENTATION_ROADMAP.md)

---

## 1. System Architecture: The Production Modular Monolith

Byline is implemented as a cohesive, lightweight **modular monolith**:
- **Frontend:** React 19 + TipTap 3 (ProseMirror) + Vite, deployed on **Vercel** (`trybyline.dev`).
- **Backend:** FastAPI (Python 3.11+) asynchronous REST API, deployed on **Render** (`api.trybyline.dev`).
- **Sidecars & Upstreams:** 
  - LanguageTool Docker sidecar (`:8010`) for local deterministic grammar checking.
  - OpenRouter primary (`meta-llama/llama-3.3-70b-instruct`) for drafting, selection alternatives, and rule linting.
  - Meta AI Muse API (`muse-spark-1.3`) for fallback drafting and Meta Responses API web-grounded research claims.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                                │
│                     React 19 + TipTap 3 (Vite SPA)                          │
│                                                                             │
│   Landing (/)                  App Editor (/app)                 Demo (/demo)│
└──────────────┬───────────────────┬──────────────────────────┬───────────────┘
               │                   │                          │
               │ ProseMirror       │ Editor State             │ Storage
               ▼                   ▼                          ▼
┌──────────────────────────┐ ┌──────────────────────┐ ┌───────────────────────┐
│ Editor & Decorations     │ │ Client Services      │ │ Local Persistence     │
│ • TipTap instance        │ │ • useGhost           │ │ • localStorage        │
│ • anchorStore/locate.ts  │ │ • useSynonyms        │ │ • AppSettings         │
│ • ProseMirror plugins    │ │ • usePanels/useLint  │ │ • Byline draft buffer │
└──────────────┬───────────┘ └──────────┬───────────┘ └───────────────────────┘
               │                        │
               └───────────┬────────────┘
                           │ HTTP POST /api/* (Vercel rewrite -> Render)
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND SERVICE LAYER                             │
│                           FastAPI Modular API                               │
│                                                                             │
│   Middleware: Rate limiting (120/min), Payload check (22MB), CORS           │
│   Routers: /api/complete, /api/annotate, /api/grammar, /api/research,       │
│            /api/lint, /api/setup-agent                                      │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌────────────────────┐                ┌───────────────────────────────┐
│ LanguageTool (8010)│                │ Primary: OpenRouter           │
│ Docker sidecar     │                │   (meta-llama/llama-3.3-70b)  │
│ Deterministic      │                │ Fallback: Meta Muse           │
│ syntax checks      │                │   (muse-spark-1.3)            │
└────────────────────┘                └───────────────────────────────┘
```

---

## 2. Editor Architecture & Text Anchoring Contract

### 2.1 The Verbatim Quote Anchoring Principle
Unlike legacy systems that attempt to maintain synthetic block IDs or fragile character offset coordinates across edits, Byline v2 uses a **verbatim quote-anchoring contract**:
1. When requesting analysis, the frontend transmits plain text or relevant sections.
2. The AI model is strictly instructed:
   > `Every item needs "quote": exact text copied character-for-character from TEXT, and "context": a short snippet from TEXT that contains that quote exactly. Never paraphrase.`
3. On the backend, `app/quote.py:filter_anchored` filters out any hallucinated quote that does not appear verbatim inside the user's text.
4. On the client, `lib/locate.ts:locateQuote()` searches the active TipTap text map using exact matching with context disambiguation to calculate current ProseMirror document positions.
5. Decorations (`editor/decorations.ts`) render wavy underlines or badges without modifying document nodes.

### 2.2 Suggestion & Replacement Integrity
- All user edits pass through authoritative TipTap transaction chains:
  ```ts
  editor.chain().focus().setTextSelection({ from, to }).deleteSelection().insertContent(replacement).run();
  ```
- Before applying any replacement (e.g., from selection alternatives), the client verifies that the text between `from` and `to` matches the expected string. If the writer has modified the passage, the operation aborts cleanly without corrupting neighboring text.
- Full native undo/redo history (`Ctrl+Z` / `Ctrl+Y`) is preserved.

---

## 3. Application Services & Backend Design

### 3.1 Backend Router Responsibilities

| Router | File | Purpose | Upstream Provider |
|---|---|---|---|
| `/api/complete` | `routers/complete.py` | Cursor ghost completions (Hint, Phrase, Sentence, Block, Question) | OpenRouter Llama 3.3 (Primary) / Meta Muse (Fallback) |
| `/api/synonyms` | `routers/annotate.py` | 3 selection-based phrasing alternatives | OpenRouter Llama 3.3 / Meta Muse |
| `/api/annotate` | `routers/annotate.py` | Vocabulary level & cohesion annotations | OpenRouter Llama 3.3 / Meta Muse |
| `/api/reactions` | `routers/annotate.py` | Skeptical/Ordinary reader persona reactions | OpenRouter Llama 3.3 / Meta Muse |
| `/api/main-idea` | `routers/annotate.py` | Perceived takeaway & intent gap | OpenRouter Llama 3.3 / Meta Muse |
| `/api/grammar` | `routers/annotate.py` | Deterministic spelling & grammar rules | LanguageTool Docker sidecar (`:8010`) |
| `/api/lint` | `routers/lint.py` | Active style & consistency rules | OpenRouter Llama 3.3 |
| `/api/readings` | `routers/research.py` | Claim extraction & live web grounding | Meta Responses API (Web Search) |
| `/api/cite` | `routers/research.py` | APA/MLA citation formatting & bibliography | Pure Python algorithmic formatter |
| `/api/setup-agent` | `routers/setup.py` | Ingests goals, generates outline & profile | OpenRouter / Meta Muse |

### 3.2 AI Gateway & Provider Abstraction (`backend/app/llm.py`)
All LLM calls are mediated by server-side asynchronous functions in `app/llm.py`:
- `chat(system, user, max_tokens, temperature)`: General chat wrapper with multi-provider fallback.
- `json_call(system, user, max_tokens, temperature)`: JSON extraction and markdown-fence parsing.
- `timed_text(system, user, **kw)`: Returns content, usage metrics, model name, and high-precision execution latency in seconds.
- `schema_call(system, user, schema, name, **kw)`: Chat completions with `json_schema` constrained decoding via OpenRouter.
- `responses_call(input_data, **kw)`: Meta Responses API for web search and grounded factual analysis.

---

## 4. Security & Isolation Boundaries

1. **Strict Server-Side Secret Management:**
   - API keys (`META_API_KEY`, `OPENROUTER_API_KEY`) reside exclusively in server environment variables.
   - Keys are never bundled into client Vite code or returned via API responses.
2. **SSRF Protection:**
   - `app/security.py:is_safe_public_url` verifies all research URLs against private IP ranges (`10.0.0.0/8`, `192.168.0.0/16`, `127.0.0.0/8`, link-local addresses).
3. **Guard Middleware:**
   - Global rate limiter: 120 requests/minute per client IP.
   - Request body limit: 22 MB (protects document & audio uploads).
   - Security headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`.

---

## 5. Persistence & Client State Architecture

1. **Document Storage:**
   - Document text, outline, and settings persist automatically to browser `localStorage` under namespaced keys (`byline.doc`, `byline.applied_settings`, `byline.metrics`).
   - No user account creation or remote database is required for core authoring.
2. **Soft-Fail Client Strategy:**
   - Endpoints return `{ ok: false, error: "reason" }` on upstream hiccups without throwing uncaught 500s.
   - Client `lib/api.ts` maps failures to `null` or falls back to offline fixtures in `lib/fallback.ts`.
3. **Execution Policy:**
   - Suggestions and annotations are triggered deliberately (typing debounce or explicit hotkey), never continuous streaming on every raw keypress.

---

## 6. Testing Architecture

- **Backend Unit & Integration Tests (pytest):**
  - `test_complete_post.py`: Validates complete post-processing, question formatting, and retry hints.
  - `test_prompts.py`: Verifies prompt construction and quote rule compliance.
  - `test_lint_rules_parity.py`: Confirms rule parity across frontend and backend catalogs.
  - `test_citations.py`: Tests APA/MLA inline and bibliographic formatters.
- **Frontend Unit & Component Tests (vitest):**
  - `locate.test.ts`: Tests verbatim string location and context disambiguation in ProseMirror text maps.
  - `constants.test.ts`: Verifies transition catalogs and assist definitions.
  - `sfx.test.ts`: Verifies audio feedback configuration.
- **End-to-End Tests (Playwright):**
  - Validates full user flow: setup wizard → ghost generation → selection alternative replacement.
