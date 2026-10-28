---
name: Byline — Proof Desk
description: Warm proof-paper editor where AI marks like a proofreader and writer chooses every word.
colors:
  proof-paper: "#FAF6EC"
  proof-paper-dark: "#211D17"
  paper: "#FFFDF4"
  paper-dark: "#292219"
  dock: "#F3ECDB"
  dock-dark: "#2A241B"
  warm-ink: "#262019"
  ink-on-dark: "#EDE4D0"
  warm-muted: "#655842"
  muted-on-dark: "#A99B80"
  border-warm: "#DFD3B8"
  border-dark: "#4A3F2E"
  proof-red: "#A93226"
  proof-red-dark: "#E88A7D"
  pencil-blue: "#2B50AA"
  pencil-blue-dark: "#93AEE8"
  focus-blue: "#1765CC"
  selection-wash: "#F5E3B0"
  selection-wash-dark: "#4A4120"
  success: "#1E8E3E"
  layer-language: "#C0281F"
  layer-reader: "#6D3BE0"
  layer-sources: "#1765CC"
  layer-suggest: "#626A75"
  layer-lint: "#8A5F00"
  layer-language-dark: "#FF6B6B"
  layer-reader-dark: "#B79CFF"
  layer-suggest-dark: "#9BA1A8"
  layer-lint-dark: "#E6B93D"
typography:
  display:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "clamp(2.6rem, 4.6vw, 4.2rem)"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "0em"
  headline:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.011em"
  prose:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "0em"
  quote:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.45
  dock-query:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.35
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "10.5px"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "0.07em"
rounded:
  sm: "3px"
  lg: "4px"
  stamp: "2px"
  pill: "99px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "20px"
  paper: "30px 38px"
  dock: "14px"
components:
  button-primary:
    backgroundColor: "{colors.warm-ink}"
    textColor: "{colors.proof-paper}"
    rounded: "{rounded.sm}"
    padding: "6px 11px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.warm-ink}"
    textColor: "{colors.proof-paper}"
    rounded: "{rounded.sm}"
    padding: "6px 11px"
  button-default:
    backgroundColor: "{colors.proof-paper}"
    textColor: "{colors.warm-ink}"
    rounded: "{rounded.sm}"
    padding: "6px 11px"
    height: "36px"
  input:
    backgroundColor: "{colors.proof-paper}"
    textColor: "{colors.warm-ink}"
    rounded: "{rounded.sm}"
    padding: "7px 9px"
    height: "36px"
  dock-card:
    backgroundColor: "{colors.dock}"
    textColor: "{colors.warm-ink}"
    rounded: "{rounded.lg}"
    padding: "14px"
  paper:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.warm-ink}"
    rounded: "{rounded.lg}"
    padding: "30px 38px"
  proof-sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.warm-ink}"
    rounded: "{rounded.sm}"
    padding: "30px 34px 24px 58px"
  verdict-stamp:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.pencil-blue}"
    typography: "{typography.label}"
    rounded: "{rounded.stamp}"
    padding: "2px 7px"
  mode-switch-thumb:
    backgroundColor: "{colors.warm-ink}"
    textColor: "{colors.proof-paper}"
    rounded: "{rounded.pill}"
    height: "38px"
  rail-code:
    backgroundColor: "{colors.proof-paper}"
    textColor: "{colors.warm-ink}"
    rounded: "{rounded.pill}"
    size: "34px"
---

# Design System: Byline — Proof Desk

## Overview

**Creative North Star: "The Proof Desk"**

Warm proof paper, warm ink, two working chrome inks — proof red and pencil blue — and five layer colors used only as annotation marks on text. Source Serif 4 carries thesis, prose, quoted draft text, and dock queries; Inter carries UI chrome, labels, counts, and controls. With copy removed, surface reads as marked manuscript on desk, not AI-editor chrome.

System is border-led and flat at rest. Elevation reserved for popups, modals, and paged-paper preview. Corners stay square-ish (3px, 4px large). Writer chooses every word: advisory layers mark, question, and stamp; only explicit suggestion acceptance inserts text.

**Key Characteristics:**

- Warm proof paper ground (`#FAF6EC` light, `#211D17` dark), sheet paper (`#FFFDF4` light, `#292219` dark)
- Proof red (`#A93226`) and pencil blue (`#2B50AA`) as working chrome inks; five layer colors as marks only
- Source Serif 4 for thesis/prose/quotes/dock queries; Inter for UI
- Red margin rule on paper and proof sheet; margin-query column beside marked prose
- Letterspaced uppercase editor's marks: kind labels, verdict stamps, badges
- Border-only depth; shadow tokens only for popups and paged paper
- Meaning never by color alone: text labels, swatches plus names, distinct underline styles

## Colors

Warm paper and ink foundation, two chrome inks, five text-safe annotation inks. Frontmatter is normative; dark variants pair with light tokens by role.

### Primary

- **Proof Red** (`--proof`): Margin rules, setup call, wizard accent, margin queries (`mq`), proof-sheet rule. Working editor's ink, not error-only.
- **Pencil Blue** (`--pencil`, also `--blue` / focus blue role): Verdict stamps, source links on hover, focus-visible ring, input focus border. Second working ink.

### Secondary

- **Success Green** (`--success`): Backend-connected dot, supports verdict badge background, lint switch on-state. Status only, never decoration.

### Tertiary

- **Selection Wash** (`--link`): Text selection, ghost/suggestion highlight wash. Pale warm wash behind chosen text, ink stays readable.

### Neutral

- **Proof Paper** (`--bg`): App ground, masthead ground, button/input ground.
- **Sheet Paper** (`--paper`): Editor paper, proof sheet, wizard card (`#FFFDF7` in wizard), setup button ground.
- **Dock Paper** (`--dock`): Left/right docks, editor bar, landing cards before ledger restyle, toggle tracks.
- **Warm Ink** (`--ink`): Primary text, primary button ground, active toggle ground.
- **Warm Muted** (`--muted`): Secondary text, meta, hints, inactive toggle labels. Meets muted-text role on proof paper; do not lighten.
- **Warm Border** (`--border`): All hairline borders, rules, dividers, scrollbar thumb.

### Annotation Marks (five layers, marks only)

Default preset canonical (`COLOR_PRESETS.default` in `frontend/src/lib/settings.ts:15`, `ANNOTATION_COLORS` in `frontend/src/lib/layers.ts:5`). User presets (Ocean, Forest, Sunset, Mono) and per-layer pickers may recolor marks via `applySettings` CSS vars (`--lt/--ai/--blue/--yellow/--grey`); defaults below are text-safe defaults and semantic reference.

- **Language Red** (`--lt`, Language `La`): Grammar SVG squiggle, word-choice inset underline, cohesion solid border-bottom. Sub-types share red; labels (Grammar / Word choice / Cohesion) distinguish.
- **Reader Purple** (`--ai`, Reader `Rd`): Dotted border-bottom on reaction spans, reader chips/badges. Questions, critique, comment, compliment share dotted style; label carries kind.
- **Sources Blue** (`--blue`, Sources `So`): Claim wash background plus wavy blue underline, source cards, claim badges.
- **Suggest Grey** (`--grey`, Suggest `Su`): Ghost text color, suggestion swatch/tab. Grey = not writer's text until accepted.
- **Lint Yellow** (`--yellow`, Lint `Li`): Solid 2px underline for all lint categories. Category names in labels; color does not subdivide.

Dark theme raises mark lightness for contrast (`#FF6B6B`, `#B79CFF`, `#9BA1A8`, `#E6B93D`; sources blue unchanged in CSS vars) — see sidecar `colorMeta`.

### Named Rules

**The Marks-Only Rule.** Five layer colors appear as annotation marks, tab borders/badges, swatches, and chips with text labels — never as page chrome, hero fills, or decorative surfaces. Chrome inks are proof red and pencil blue only.

**The Text-Safe Default Rule.** Default layer hexes are chosen for 4.5:1 text use where color carries text (labels, badges). Preset recolors change marks together (tabs, underlines, buttons) via single CSS var per layer; never recolor one surface in isolation.

**The No Color-Alone Rule.** Every mark pairs color with label, underline style, or stamp text. Grammar = squiggle, vocabulary = inset bar, cohesion = solid bottom border, reader = dotted, sources = wash + wavy, lint = solid thick, suggest = grey ghost text.

## Typography

**Display Font:** Source Serif 4 (with Georgia, serif fallback)
**Body Font:** Inter (with -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif fallback)
**Editor Font:** Settings-driven (`--editor-font`): Source Serif 4 default; Inter sans or ui-monospace options in settings only, not world default.

**Character:** Serif is writer's voice — thesis, draft prose, verbatim quotes, dock queries (italic serif dock headings, `frontend/src/styles/app.css:359`). Sans is desk apparatus — buttons, tabs, meta, counts, stamps. Never set UI labels in serif except dock queries/headings and wizard; never set prose/quotes in Inter.

### Hierarchy

- **Display** (Source Serif 4, 600, clamp(2.6rem, 4.6vw, 4.2rem), 1.02): Landing thesis "You write. Byline suggests. You choose." only.
- **Headline** (Source Serif 4, 600, 1.75rem, 1.15): Landing section heads, wizard title at clamp(28px, 5vw, 40px).
- **Title** (Source Serif 4, 600, 24px, 1.2): Proof-sheet draft title, editor headings scale down from prose.
- **Prose** (Source Serif 4, 400, 19px default `--editor-size`, 1.65, max 70ch `--paper-w`): Editor body. Settings may vary size  / line-height / width (58ch narrow, 88ch wide); default is canonical.
- **Quote** (Source Serif 4, 400, 16px, 1.45): Verbatim quotes in dock items, popup query (`pp-q`), suggestion rows (16.5px).
- **Dock Query** (Source Serif 4 italic, 600, 15px): Dock `h3` headings; margin queries (`mq`) italic serif 14.5px in proof red.
- **Body** (Inter, 400, 14px, 1.5, -0.011em): App base text; dock item body 13.5px/1.5, reason text 12.5px muted.
- **Label** (Inter, 700, 10.5px, 0.07em, uppercase): Kind labels, floating titles, page-break labels, editor pane labels. Verdict stamps widen to 0.14em.

### Named Rules

**The Serif-Is-The-Writer Rule.** If text is writer's words, quoted words, thesis, or editor's handwritten-style query, set serif. If text operates machine (tabs, buttons, metrics, badges), set Inter.

**The Letterspaced Mark Rule.** Editor's marks (stamps, kind labels, badges) are uppercase Inter, letterspaced (0.07em labels, 0.14em stamps), never serif, never sentence case.

## Layout

Editor is three-column desk: left dock (Write/Style/Outline) ↔ paper ↔ right rail (Language/Reader/Sources/Suggest/Lint). Layout grid max-width 1560px, gap 14px, padding 14px, centered (`frontend/src/styles/app.css:5`). Columns computed in `EditorPage.tsx:545`: left 264px (430px outline) or 52px collapsed strip; center minmax(0,1fr); right 348px or 52px strip.

Landing: masthead, then hero grid 5fr copy / 6fr proof sheet (max 1180px, gap 44px), ink-key row, ruled ledger of five layer cards below fold, prose sections max 820px. Hero left-aligned; do not re-center.

Spacing rhythm: 4px micro, 8px row, 14px grid/dock, 20px section card, 30–38px paper padding. Dock cards stack with 12px bottom margin, 14px padding, one scroll region per rail (`rail-scroll` max-height calc(100vh - 190px)).

Responsive: ≤1100px editor stacks to single column, rail below paper, dual editors stack; ≤900px hero grid and proof columns stack, margin column loses left rule, topbar wraps, notebook grid stacks; ≤700px paper padding 22px 18px, prose 17px, waitlist full-width, metrics/status text hidden. Compact density setting tightens dock padding to 9px and layout gap/padding to 9px.

### Named Rules

**The Topology Rule.** Left dock ↔ paper ↔ right rail, Drafting ↔ Editing. Do not move rails, merge docks into paper, or add fourth column.

**The Margin Column Rule.** Queries live in margin: landing proof sheet reserves 168px margin column with red left rule; editor reserves right rail. Never inline queries into prose flow as cards.

## Elevation & Depth

Border-only elevation. Surfaces separate by 1px warm border (`--border`) and tonal step (proof paper → dock → sheet paper), not shadow. Topbar separates with 3px double rule in 60% ink (`frontend/src/styles/app.css:287`) — masthead double rule signature.

### Shadow Vocabulary

- **Popup** (`--shadow-pop`: `0 4px 12px rgba(31,35,40,.08), 0 16px 40px rgba(31,35,40,.14)` light; deeper black in dark): Suggestion popup, annotation popup, floating menus, modals, library, setup menu, wizard-adjacent menus. Only floating, dismissible surfaces.
- **Paged Paper** (`--shadow-paper`: `0 1px 2px rgba(31,35,40,.05), 0 12px 32px rgba(31,35,40,.07)`): `.paper.paged` Word-style paged preview only.
- **Wizard Card** (`0 24px 70px rgba(0,0,0,.35)` in `setup-wizard.css:2`): Modal wizard card over scrim; heaviest shadow in system, modal-only.
- **Mode Thumb** (`0 2px 8px rgba(0,0,0,.22)`): Sliding Drafting/Editing thumb; small functional lift inside toggle track.

### Named Rules

**The Border-Only Rule.** At rest, no shadow. Shadow appears only on popup, modal, paged paper, or sliding thumb. No hard offset shadows anywhere.

**The Flat Sheet Rule.** Paper and proof sheet sit flat with 1px border; proof sheet border darkens to 55% ink. Do not lift sheets on hover.

## Shapes

Square, ruled, stamped. Radius scale: 3px (`--radius`) default for buttons, inputs, chips in proof world; 4px (`--radius-lg`) for paper, docks, cards, popups; 2px for stamps, paged paper, chips/badges in Proof Desk pass; 99px pill reserved for toggles, mode switch, badges, rail codes, switches — functional pills only, not card shapes. Wizard uses 3–4px to match.

Borders: 1px `--border` default; 1.5px for dock tab borders, stamp border, setup button; 2px for lint underline, wizard input bottom rule, ledger card top rule (2px ink). Paper carries red margin rule: linear-gradient 1px line at 26px on `.paper`, absolute 1px rule at 42px on `.proof-sheet` (58px left padding). Proof margin column repeats rule as 1px left border.

Recurring silhouettes: ruled sheet (paper + margin rule), ledger row (card stripped to top rule below landing fold), stamp (rotated -3deg bordered rectangle), sliding pill thumb, circular 34px rail-code buttons (two-letter codes inside).

### Named Rules

**The 3px Corner Rule.** Corners are 3px (4px large surfaces). Do not round cards, sheets, or buttons beyond 4px except pills/circles named above.

**The Ruled Sheet Rule.** Every prose surface shows its rule: margin rule on paper/proof sheet, double rule under masthead, top rule on ledger cards, hairlines between dock items. Unruled prose containers are off-world.

## Components

### Buttons

- **Shape:** Square-ish (3px), 1px border, min-height 36px, padding 6px 11px, Inter 13px/500.
- **Primary:** Warm ink ground, proof-paper text, ink border. Hover lightens via 88% ink color-mix. Wizard CTA inverts to ink ground, hover proof red.
- **Default/Ghost:** Proof-paper ground, warm border; hover border muted + 6% ink hover wash. Nav buttons same; active nav = primary treatment.
- **States:** Active translates 1px (removed under reduced motion); disabled 45% opacity, no transform. Focus-visible: 2px pencil-blue outline, 2px offset, 4px radius (`theme.css:39`).

### Inputs / Fields

- **Style:** 3px radius, 1px warm border, proof-paper ground, 7px 9px padding, min-height 36px, Inter 13px.
- **Focus:** Border pencil blue + 3px 22% blue ring shadow; placeholder muted at full opacity.
- **Wizard Input:** Serif italic 18px, borderless except 2px bottom rule, focus rule turns proof red. Only in wizard.
- **Range/Color:** Range accent ink; color swatch input 38×30px in settings rows.

### Cards / Containers

- **Dock Card:** Dock paper ground, 1px border, 4px radius, 14px padding. Heading = italic serif 15px with 10px layer swatch (3px radius).
- **Landing Ledger Card:** Below fold, cards strip to transparent ground, no border, no radius, 2px ink top rule, 20px top padding (`app.css:364`). List rows separated by 1px border hairlines.
- **Source Card:** Proof-paper ground, 1px border tinted 45% sources blue, 4px radius, 10px 12px padding. Claim badge + serif-quoted claim + verdict links.
- **Paper:** Sheet paper, 1px border, 4px radius, red margin rule at 26px, 30px 38px padding, min-height 70vh. Paged variant: max 820px, 56px 64px padding, 2px radius, shadow-paper, transparent border.

### Chips / Badges / Stamps

- **Chip:** Inter 11px/700, pill origin restyled to 2px in Proof Desk pass, white text on layer color (grammar etc.) or dock ground with swatch in ink-key. Letterspacing 0.02em.
- **Verdict Stamp (signature):** Inline on proof sheet: 1.5px pencil-blue border, pencil-blue Inter uppercase, 10.5px/700, 0.14em letterspacing, 2px 7px padding, 2px radius, rotated -3deg. Text reads Supports / Qualifies / Contradicts.
- **Verdict Badge:** In source cards/dock: uppercase badge, background success (supports), language red (contradicts), lint yellow with dark ink `#1F2328` (qualifies). Text label always present.
- **Tab Badge:** Count pill, 10.5px/700 tabular-nums, translucent grey; inverted translucent white on active tab.

### Navigation / Masthead

- **Topbar:** Sticky, proof-paper ground, 9px 16px padding, 3px double bottom rule (60% ink). Serif wordmark lockup with four layer dots must survive (`Brand.tsx`); ThemeToggle + demo/app actions right.
- **Editor Topbar:** Logo left, centered Drafting/Editing switch, right metrics pill + connected dot (success/offline red, with text label) + App/Demo nav + settings gear.
- **Dock Tabs:** Pill buttons (99px), 1.5px borders in layer color (right rail) or warm border (left), active = ink ground/paper text (left) or paper ground with inset 3px layer-color bottom bar (right, `EditorPage.tsx:649`). Double-click toggles layer disabled (greyed, strikethrough, underlines off).
- **Collapsed Rail Strip:** Vertical 34px circular buttons. Right rail carries two-letter codes **La / Rd / So / Su / Li** in layer color with layer-color border (`EditorPage.tsx:640`); left rail carries W/S/O initials. Expand chevron at top.

### Drafting / Editing Mode Switch (signature)

- **Shape:** Pill track, min-width 228px, height 44px, dock ground, 1px border.
- **Thumb:** Absolute ink pill, calc(50% - 3px), slides via `transform: translateX(100%)` in Editing, 0.32s cubic-bezier(.16,1,.3,1). Labels above thumb (z-index 1); active label proof-paper, inactive muted.
- **Behavior:** Drafting → Suggest tab + ghost only; Editing → restores anchors and runs checks. Reduced motion: no slide transition.

### Proof Sheet (signature)

- **Structure:** Sheet paper, 1px 55%-ink border, 30px 34px 24px 58px padding, red 1px margin rule at 42px. Serif draft (16.5px/1.65) left, 168px margin-query column right with red left rule.
- **Marks:** Wavy language underlines, blue claim wash, rotated verdict stamp inline after claim.
- **Margin Queries:** Italic serif proof-red `mq — …` lines, layer name in muted after query.
- **Proof Popup:** Inside sheet bottom: 1px border, proof-paper ground, grammar chip, serif quoted line, Inter explanation, demo link. No shadow (in-flow example).

### Annotation Popups

- **Popup:** Fixed, min(330px, 100vw-24px), proof-paper ground, 1px border, 4px radius, shadow-pop, 14px padding. Stacked overlapping anchors as stack cards (8px radius legacy, 72% opacity inactive).
- **Suggestion Popup:** min(360px, …), shadow-pop, serif rows 16.5px; selected row bold ink on 10% reader-purple wash; Inter number labels.
- **Keyboard:** Tab/Enter advances layers only (advisory never inserts); Tab/1–3 accepts ghost suggestion; Esc closes. Dock items keyboard-operable (Enter/Space), focus-visible outline.

### Setup Wizard (folded in)

- **Card:** min(620px, 96vw), sheet `#FFFDF7`, 1px 55% proof-red border, 4px radius, modal shadow, serif. Progress = 3px track with proof-red bar (glowline names retained in class, value flat).
- **Controls:** Chips/dots 3px radius, 1px faint border; selected = ink ground (dark: proof-red variant `#C4503F`). CTA ink ground → proof-red hover. `.gold` class renders proof red — no gold ceremony world remains.
- **Setup Trigger:** Centered serif italic proof-red button on paper ground, 1.5px proof-red border, 2px radius.

### States & Accessibility

- **Focus:** `:focus` removed, `:focus-visible` 2px pencil blue outline + 2px offset globally; dock/ghost/stack/outline items same; wizard controls 2px proof-red outline.
- **Reduced Motion:** `prefers-reduced-motion: reduce` collapses animations/transitions to .01ms, kills thumb slide, spinner/pulse, gear rotation, active translate. Settings `reduceMotion` mirrors via `data-motion="reduce"`. `.fade` entry (3px rise, .18s) disabled under reduction.
- **Contrast:** Default layer hexes text-safe 4.5:1 for label/badge text; lint qualifies badge uses dark ink on yellow. Muted text fixed `--muted`; do not opacity-dim text below token (disabled dock items use `--old` + 55% only for explicitly disabled layer items, with label retained).
- **Meaning:** Labels + underline style + stamp text carry meaning; swatches `aria-hidden`, dots/badges paired with text or `aria-label`; mode switch is tablist with `aria-selected`; switches use `role="switch"`.
- **AI Off / Disabled Layer:** Right rail dims 45% + grayscale, scroll/foot inert, Suggest dock exempt. Disabled tab: 38% opacity, grayscale, strikethrough — plus underlines actually removed.

## Do's and Don'ts

### Do:

- **Do** ground surfaces in proof paper `#FAF6EC` / sheet `#FFFDF4` (dark `#211D17` / `#292219`) with warm ink `#262019`.
- **Do** use proof red `#A93226` and pencil blue `#2B50AA` as only chrome inks; double rule under masthead, red margin rule on every prose sheet.
- **Do** set thesis/prose/quotes/dock queries in Source Serif 4, UI in Inter; uppercase letterspaced Inter for stamps/labels.
- **Do** use five layer colors only as marks (canonical defaults: language `#C0281F`, reader `#6D3BE0`, sources `#1765CC`, suggest `#626A75`, lint `#8A5F00`), recolored together via preset vars.
- **Do** pair every color mark with label + distinct underline style; keep defaults text-safe 4.5:1.
- **Do** keep corners 3px (4px large), depth border-only, shadows only from `--shadow-pop` / `--shadow-paper` / wizard modal tokens.
- **Do** preserve signatures: margin-query column, verdict stamps, ruled ledger below landing fold, sliding Drafting/Editing thumb, La/Rd/So/Su/Li rail codes.
- **Do** honor focus-visible ring, reduced-motion collapse, keyboard operation for advisory items.

### Don't:

- **Don't** use gradient text.
- **Don't** use colored side borders thicker than 1px (margin rules are 1px rules/gradients, not accent side borders; tab inset underline is 3px bottom inset on active state only).
- **Don't** use hard offset shadows; no shadow at rest, no lifted sheets/cards on hover.
- **Don't** resurrect gold ceremony world: no gold palette, glow, shine sweeps, or ceremony wizard styling. Wizard is folded into Proof Desk (proof red, sheet paper, flat bars). `--gold` var aliases proof red only for legacy outline tint.
- **Don't** use layer colors as page chrome, fills, or hero decoration; no clean sans AI-editor chrome, no generated-text magic styling.
- **Don't** round beyond 4px except named pills/circles (toggles, badges, rail codes, switches); no pill cards.
- **Don't** carry meaning by color alone, dim text below muted token, or remove focus outline without visible replacement.
- **Don't** let advisory layers insert text visually as if applied; only accepted suggestions become writer's words.
