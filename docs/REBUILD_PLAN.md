# Byline Rebuild Plan

## 1. Executive Summary & Architecture Overview

Byline is a writer-controlled AI writing workspace structured around three core moments:
- **Intent (Left Dock):** Context (topic, purpose, audience, background, key ideas, facts) and hierarchical Outline.
- **Expression (Center Editor):** TipTap/ProseMirror paper editor with local Draft Assistance, Connect (pattern library + AI inference), and selection-based Paraphrase.
- **Reflection (Right Dock):** Unified findings collection aggregating four distinct personas:
  - **Red (Grammar):** Deterministic and lightweight language corrections.
  - **Purple (Reader):** Perspective, clarity, and interpretation observations.
  - **Yellow (Supervisor):** Intention-grounded structural, reasoning, and flow reviews.
  - **Blue (Researcher):** Multi-step claim verification, evidence evaluation, and citation validation.

## 2. Current Architecture vs. Target Architecture

### Current Architecture
- Mixed concerns between UI components and prompt logic.
- Leaked provider code (e.g. Nebius/NVIDIA attempt in `connect.py`, `llm.py`).
- Flaky string-matching fallback in decorations.
- Missing unified findings data model spanning all 4 personas.
- Inconsistent keyboard shortcuts.
- Fragmented settings exposing raw provider parameters directly in author workflows.

### Target Architecture (Modular Monolith)
```text
src/
  app/
    workspace/           # Workspace coordinator, split docks, view modes
    routes/              # Main view routing (/editor, /setup, /demo)
  features/
    setup/               # 2-layer setup wizard (survey + templates)
    editor/              # TipTap engine, block identity, safe transactions
    draft-assistance/    # Ghost completions (Hint, Phrase, Sentence, Paragraph)
    connect/             # Static pattern library (12 categories) + Meta AI inference
    paraphrase/          # Selection-based 3 distinct alternatives
    findings/            # Unified findings collection, cards, filters, reroll
    grammar/             # Deterministic language checks & direct corrections
    reader/              # Reader clarity observations
    supervisor/          # Intention-grounded whole-document analysis
    researcher/          # Claim extraction, evidence retrieval, citation format
    settings/            # Writing profiles vs. advanced Meta inference settings
    export/              # Markdown, PlainText, and Word (.docx) export
  domain/
    document/            # Document schema, context, outline
    finding/             # Unified finding schema, status lifecycle, anchors
    suggestion/          # Suggestion model and alternatives
    pattern/             # Connect pattern taxonomy (12 categories)
    writing-profile/     # Language & themes (Neutral, Academic, Gen Z, Buzzword)
  services/
    context-service/     # Context window selector per task
    prompt-builder/      # Strict prompt construction without UI leakage
    suggestion-service/  # Suggestion lifecycle, validation & application
    analysis-service/    # Whole-document reflection orchestrator
    research-service/    # Claim parsing, verification, and citations
    export-service/      # Multi-format document exporter
  adapters/
    ai/                  # Provider interfaces & Meta model gateway
    spellcheck/          # Lightweight deterministic spellchecker
  shared/
    types/               # Strongly-typed request/response contracts
    validation/          # Schema guards & untrusted output sanitization

server/
  routes/                # Endpoints (/api/complete, /api/connect, /api/findings, etc.)
  ai/                    # Server-side Meta provider gateway, allowlist, streaming
  research/              # Evidence grounding & citation formatting
  security/              # Rate limiting, SSRF guard, model validation
```

## 3. Phased Execution Roadmap

### Phase 0: Reconcile Docs, Establish Allowlist & Architecture Baseline
- Audit existing files, purge forbidden NVIDIA/Nebius/OpenAI/Gemini runtime integrations.
- Enforce strict Meta-only model allowlist on the backend.
- Author `docs/REBUILD_PLAN.md`, `docs/REBUILD_DECISIONS.md`, and `docs/IMPLEMENTATION_STATUS.md`.

### Phase 1: Server-Side Meta AI Gateway & Provider Abstraction
- Unified Meta gateway supporting Meta Model API, OpenRouter (Meta models), and Baseten.
- Server-side model validator rejecting any model outside the Meta allowlist.
- Deterministic mock engine for offline development and testing.
- Streaming SSE & structured JSON endpoints.

### Phase 2: Domain Models & Editor Text Anchoring
- Define canonical `Document`, `TextAnchor`, `Finding`, and `Suggestion` models.
- Implement stable block identifiers and revision-aware offsets.
- Build prefix/suffix verification for safe suggestion application.

### Phase 3: Workspace Layout & Setup Wizard
- Implement top navigation (Draft/Editing modes, Export, Settings).
- Left Dock: Editable Intent (Context & Outline).
- Center: TipTap editor with floating contextual actions.
- Right Dock: Unified Reflection rail.
- Two-layer Setup Wizard: quick survey + editable templates + instant demo preset.

### Phase 4: Drafting Features (Draft Assistance, Connect, Paraphrase)
- Draft assistance with 4 granularities: Hint (1-4 words), Phrase, Sentence, Paragraph.
- Connect: 12 static categories + Meta AI relationship inference.
- Selection Paraphrase: 3 distinct options (Paraphrase, Shorten, Change Tone).
- Keyboard shortcuts: `1`, `2`, `3` to accept alternative, `Tab` for primary, `Alt` (or visible button) for reroll.

### Phase 5: Four Personas in Unified Findings Collection
- Red (Grammar): Deterministic spellcheck and direct corrections.
- Purple (Reader): Observations on ambiguity and reader perception.
- Yellow (Supervisor): Outline-aware structural and argumentation feedback.
- Blue (Researcher): Evidence status (Supported, Contradicted, Unverified) and citations.
- Shared actions: search, filter by persona, jump to anchor, accept, dismiss, reroll.

### Phase 6: Writing Settings & Advanced Meta Inference Configuration
- Separate writer themes (Neutral, Academic, Gen Z, Buzzword-heavy) from technical inference settings.
- Model selector filtered to verified Meta models only.
- Temperature, top_p, top_k, max_tokens, reasoning_effort controls.

### Phase 7: Verification, Testing & Production Build
- Vitest suite for frontend domain, editor anchoring, and UI components.
- Pytest suite for backend endpoints, Meta allowlist security, and prompt builders.
- Typecheck (`tsc --noEmit`) and Vite build verification.

## 4. Acceptance Criteria
1. Meta-only models enforced at server and client levels.
2. Complete end-to-end user journey without non-Meta dependencies.
3. Stable text anchoring preventing corrupt document replacements.
4. Unified findings dock supporting all 4 personas with independent lifecycles.
5. Clean build and 100% test pass rate.
