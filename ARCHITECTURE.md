# Byline — current architecture

Supersedes `byline-architecture-audit.md` (pre-rewrite codebase; archived).

## Stack
FastAPI (`backend/app/`) + React 19/TipTap 3 (`frontend/src/`) + Meta Muse API + LanguageTool sidecar.

## Frontend map
| Area | File | Owns |
|---|---|---|
| Editor shell | `pages/EditorPage.tsx` | Composition, editor instances, keyboard routing, docks/popups JSX |
| Editor hooks | `hooks/*.ts` | Feature logic extracted from shell (lint, ghost, panels, synonyms) |
| Decorations | `editor/decorations.ts` | ProseMirror plugins; `anchorStore`/`modeStore`/`lintStore` |
| Editor ext | `editor/extensions.ts` | PageBreak, Footnote |
| API client | `lib/api.ts` | Soft-fail `post` (null on error), `postRaw` (error object) |
| Storage | `lib/storage.ts` | All `byline.*` localStorage keys, typed JSON helpers |
| Constants | `lib/constants.ts` | DICTIONS/TONES/ASSISTS/PERSONAS/RHYTHMS/TRANSITIONS |
| Style cfg | `lib/buildStyle.ts` | `AppliedSettings`, `buildStyle()`, dirty checks |
| Pure libs | `lib/{locate,case,citations,layers,rules,metrics,sfx,settings,link}.ts` | Quote locating, ranking, rule catalog |

## Backend map
| Area | File | Owns |
|---|---|---|
| Composition | `app/main.py` | App, CORS, guard middleware, router includes |
| Routers | `app/routers/*.py` | HTTP endpoints grouped by domain |
| Services | `app/services/*.py` | Annotate alternatives, setup-agent synthesis |
| LLM | `app/llm.py` | Meta chat/responses, OpenRouter fallback, local LoRA |
| Prompts | `app/prompts.py` | Prompt builders; quote-anchoring contract |
| Constants | `app/constants.py` | DICTIONS/TONES/CLAUSES (mirrors frontend) |
| Core pure | `app/{quote,grammar_filter,swapcheck,citations,security}.py` | Anchoring, filters, citation formatting |

## Flows
1. **Ghost**: keystroke → `onUpdate` timers (500ms) → `useGhost.requestComplete` (abort + version guard) → `POST /api/complete` → suggestions + ghost widget (`syncGhost`).
2. **Anchors**: editing mode → timers 900/1400ms → `usePanels` grammar/annotate/reactions (per-panel abort, stale-version drop) → `rebuildAnchors` → `locateQuote` → `anchorStore` → `syncAnchors`; click anchor → popup stack (advisory only, no apply).
3. **Lint**: auto-run debounced 1800ms + manual re-run → `POST /api/lint` (active rules) → `lintStore` → `syncLint`; click highlight → group popup (advisory only).
4. **Research**: readings timer 2500ms (20s throttle) / manual → `POST /api/readings` (claims extracted, per-claim web search in parallel); library facts via `/api/research[/upload]` → citations.
5. **Setup/outline**: wizard survey → `/api/setup-questions` + `/api/outline-generate` (or `/api/setup-agent`) → applied settings + outline editor (separate TipTap instance) → insert into main doc.

## Contracts
- Quote anchoring everywhere: LLM returns verbatim `quote`+`context`; client locates via `lib/locate.ts`; backend filters via `app/quote.py:filter_anchored`.
- Soft-fail: endpoints return `{ok:false,error}` (HTTP 200); frontend `post` maps failure→null, demo uses `lib/fallback.ts`.
- Modes: `drafting` = ghost only; `editing` = anchors+lint+reader+sources. `modeStore` gates decoration builders.
