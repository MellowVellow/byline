---
target: the landing page (/)
total_score: 20
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 3
target_identity: "file:/home/albertsu/Projects/Hackathon/byline/frontend/src/pages/Landing.tsx"
target_fingerprint: "sha256:ff95d08b2b20958507c60eff52c1a39ae171c0afa713ccbe29ed64c6f592e1ee"
target_path: /home/albertsu/Projects/Hackathon/byline/frontend/src/pages/Landing.tsx
timestamp: 2026-10-28T14-47-21Z
slug: frontend-src-pages-landing-tsx
---
Method: dual-agent (A: ses_e7d08fe61ffevq8iYex0IKzq7Z · B: ses_e7d08fe3bffeM0Be5T6IKpd99c)

## Design Health Score — Landing (Persuade)
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | Waitlist live region; no demo/backend expectation |
| 2 | Match System / Real World | 3 | Thesis concrete; reasoning_effort/BENCHMARK.md dev leak |
| 3 | User Control and Freedom | 3 | No-signup demo; submitted email cleared, no edit/undo |
| 4 | Consistency and Standards | 3 | Logo dots ↔ card colors ↔ editor layers |
| 5 | Error Prevention | 2 | Native email validation; offline waitlist sync overpromise |
| 6 | Recognition Rather Than Recall | 3 | Quoted examples precede abstract claims |
| 7 | Flexibility and Efficiency | n/a | Persuade surface |
| 8 | Aesthetic and Minimalist Design | 2 | Hero focused; 5 equal cards + 3 dense prose sections fatigue |
| 9 | Error Recovery | 2 | Offline fallback explained but unverifiable, no retry/view |
| 10 | Help and Documentation | n/a | Persuade surface |
| **Total** | | **20/32** | **Good (62.5%→ Acceptable band edge) — strong promise, weak proof hierarchy** |

## Priority Issues
- [P1] No product proof above fold: cards = taxonomy, not product at work. Fix in redesign: live mini-draft squiggle→popup→accept/reject.
- [P1] 5 competing CTAs (waitlist/demo topbar/demo form/app/theme). Fix in redesign: one primary.
- [P1] Dev-jargon trust leak: model versions, reasoning_effort, BENCHMARK.md. Fix in redesign: one verifiable claim + method footnote.
- [P2] Waitlist offline overpromise ("will sync at launch"), email cleared. Copy fix in redesign.
- [P2] Color-alone taxonomy in cards. Add underline-style + label chips in redesign.

## Strengths
- "You write. Byline suggests. You choose." instantly legible; demo no-signup; dark mode strong.
- Detector: 0 findings on this file (all 5 overused-font sit in shared styles).
