# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Student writers drafting essays and reports. They write in the browser, often against a deadline, and want to finish in their own words while learning: suggestions must respect their context and vocabulary level, never write for them.

## Product Purpose

Byline is an AI writing editor where the writer accepts or rejects every suggestion. It offers short ghost suggestions while drafting, then reads the draft like a stranger: language checks, perceived-main-idea vs intended meaning (intent gap), source claim verdicts, and rule lint. Success = a finished draft, in the user's own words, with grounding and reader-perception problems fixed.

## Positioning

Quote-anchored, advisory-only AI: every annotation carries a verbatim quote from the user's own text (100% verbatim-quote validation, BENCHMARK.md), and the AI never inserts a word the writer did not accept. Neighboring editors generate finished text; Byline generates options.

## Operating Context

- Routes: `/` landing + waitlist, `/demo` guided public demo, `/app` full editor.
- Editor: left dock (Write/Style/Outline) ↔ paper ↔ right rail (Language/Reader/Sources/Suggest/Lint); Drafting ↔ Editing modes.
- Documents and settings persist in browser localStorage; no login. Optional backend adds live AI + research; offline = cached/demo behavior.
- Setup wizard (survey → configuration + editable outline → sources activation) configures diction, tone, persona, ghost-text behaviour.

## Capabilities and Constraints

- Five annotation layers with fixed semantics: red Language, purple Reader, blue Sources, grey Suggest, yellow Lint.
- All suggestions quote-anchored; no offset guessing. Advisory layers never mutate text; insertion happens only on explicit accept (Tab/1–3, click).
- Backend: user-supplied Meta API key (BYOK, session-only), FastAPI on api.trybyline.dev; frontend static on Vercel.
- Terminology: ghost text, layers, configuration, intent gap, claim verdicts (supports/qualifies/contradicts).
- Undecided: hosted accounts/sync, pricing, non-student segments.

## Brand Commitments

- Name: Byline. Logo: serif wordmark with four layer dots (`frontend/public/byline-logo.png`, `src/components/Brand.tsx`); lockup must survive redesigns.
- Layer color semantics above are binding in any visual world.
- Voice: plain, writer-first; "You write. Byline suggests. You choose."

## Evidence on Hand

- `BENCHMARK.md`: verbatim-quote validation across Muse 1.1–1.3, Wonder 1.0, Gemini 2.5 Flash Lite.
- Working demo with seeded document exercising all five layers (`frontend/src/pages/EditorPage.tsx` demo flow).
- No testimonials, customers, or pricing; future work must not fabricate them.

## Product Principles

1. The writer chooses every word; AI proposes, never disposes.
2. Anchor every claim to a verbatim quote; no quote, no annotation.
3. Show how a stranger reads it, not how the writer meant it.
4. Teach one layer at the moment of need; do not front-load the system.
5. Documents stay with the writer (browser-local, no login) unless they opt in.

## Accessibility & Inclusion

WCAG AA target: 4.5:1 text contrast, keyboard-operable advisory items, visible focus, reduced-motion support, meaning never carried by color alone.
