---
target: the editor (/app and /demo)
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 6
target_identity: "file:/home/albertsu/Projects/Hackathon/byline/frontend/src/pages/EditorPage.tsx"
target_fingerprint: "sha256:842a57e31ecb6228aa5439eeea13f59ca31e8b2aaa5efbde785c6daeb44a272a"
target_path: /home/albertsu/Projects/Hackathon/byline/frontend/src/pages/EditorPage.tsx
timestamp: 2026-10-28T14-47-16Z
slug: frontend-src-pages-editorpage-tsx
---
Method: dual-agent (A: ses_e7d08fe61ffevq8iYex0IKzq7Z · B: ses_e7d08fe3bffeM0Be5T6IKpd99c)

## Design Health Score — Editor (Operate)
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Spinners/badges/counts good; backend = 9px color dot only |
| 2 | Match System / Real World | 3 | Diction/Cohesion/Lint/Ghost/configuration_id jargon |
| 3 | User Control and Freedom | 2 | Mode switch clears popups/anchors; destructive actions lack confirm/undo |
| 4 | Consistency and Standards | 2 | Wizard gold Playfair world vs app; staged vs instant apply |
| 5 | Error Prevention | 2 | Advisory never mutates (good); alert() for export errors |
| 6 | Recognition Rather Than Recall | 2 | Single-letter rails, hidden double-click tab-disable, hidden shortcuts |
| 7 | Flexibility and Efficiency | 3 | Strong expert shortcuts: Tab/1-3, Ctrl+Space, Ctrl+/ |
| 8 | Aesthetic and Minimalist Design | 2 | 3 panes + 5 tabs + demo strip + metrics compete |
| 9 | Error Recovery | 2 | Panels show bare —; offline invisible; indefinite AI-working |
| 10 | Help and Documentation | 2 | Demo strip + Shortcuts tab; no searchable help |
| **Total** | | **23/40** | **Acceptable — significant improvements needed** |

## Design Specificity Verdict
LLM: thesis authored (accept/reject, Drafting/Editing, 5-layer marks) but daily writing surface generic; Setup wizard holds the only memorable identity.
Detector: 5 findings, all overused-font (Inter at 5 declaration sites = 1 typeface; false-positive-inflated, prose uses Source Serif 4).
Browser: no overflow/console errors at 1440/390; 19/20 targets <44px on /app; focus-visible 14/15 (editor contenteditable has no focus ring); inline settings presets override --grey/#9AA0A6 (2.35:1) and --yellow/#D99A06 (2.18:1) on dock, defeating theme.css tokens.

## What's Working
- Advisory-only model: AI never mutates text; Tab/1-3 accept, Esc dismiss.
- Editor craft: 19px serif 70ch paper, calm neutrals, sliding mode thumb, per-tab spinners/counts.
- Landing thesis legible in one viewport; cards show quoted examples before abstractions.

## Priority Issues
- [P0] Advisory items keyboard/SR inaccessible: dock items, ghost rows, popup cards are clickable divs (EditorPage.tsx:651-713,762-803). Fix: focusable, Enter/Space activation, focus return.
- [P0] Tab semantics overloaded (accept ghost / advance popup / pick transition, EditorPage.tsx:325-373). Intentional Copilot-style mechanism locked by keep-function constraint; mitigated by Esc. Deferred by decision.
- [P1] Error/status invisibility: backend = color-only dot; export failures via alert(); empty panels bare —. Fix: text status, inline errors, labelled empty states.
- [P1] Blank /app dead start: empty paper, no next action. Fix: start hint + Setup CTA when doc empty.
- [P1] Single-letter rails (W/S/O, L/R/S/S/L duplicate S), 34px targets, color-dependent. Redesign phase.
- [P1] Mode switch destroys context; staged-Apply hidden model; layer decoration collision. Redesign/clarify phase.
- [P1] Mobile advisory unreachable: rails stack below paper at 390px. Redesign phase.

## Persona Red Flags
- Alex: Tab collision, staged Apply slows iteration, accidental double-click tab mute.
- Jordan: blank /app, "MAIN EDITOR", "Ghost taken 0%", single letters unexplained.
- Sam: non-button advisory items, color-only status/layer meaning, blue/grey contrast fails.
- Casey: Ctrl hints meaningless, hover-linked docks useless, 34-36px targets, popups cover caret.

## Minor Observations
- EditorMenus receives counts/showWordCount, renders neither (dead props).
- Status strip repeats mode shown in toggle.
- Slider inputs (rhythm/density) lack associated labels.
- Landing dev-jargon leak (reasoning_effort, BENCHMARK.md) + waitlist offline overpromise — Persuade fixes belong to redesign.

## Questions to Consider
- Why do advisory popups offer Next/Close but no Reject/Ignore-rule per item?
- Why does Setup (used once) own the only memorable identity while daily writing stays generic?
- Must users learn 5 colors before sentence one, or teach one layer at moment of need?
