# Byline: Product and Development Plan

> **Authoritative Document A**  
> **Status:** Active & Reconciled with Byline v2 Production Codebase (Meta w/ OpenRouter)  
> **Cross-References:** [Technical Architecture](./TECHNICAL_ARCHITECTURE.md) · [Strategy & Presentation](./STRATEGY_AND_PRESENTATION.md) · [Implementation Roadmap](./IMPLEMENTATION_ROADMAP.md)

---

## 1. Product Vision & Operating Baseline

Byline is a writer-controlled AI writing workspace built to help thinkers, students, and practitioners express, connect, and refine their ideas without handing over the authorial draft to an automated generator.

### 1.1 Core Thesis
Most generative writing tools attempt to solve writer's block by generating finished paragraphs or rewriting entire essays. Byline takes the opposite approach: **writing with assistance, not on autopilot**. The writer creates the text, directs the assistance, inspects proposed alternatives, and explicitly accepts or dismisses every change.

### 1.2 The Three-Part Product Architecture
Every Byline interaction maps into three distinct cognitive moments:
1. **Intent (Left Dock):** Document context, thesis, target audience, topic boundaries, and structured outline.
2. **Expression (Center Paper / TipTap Editor):** Local drafting assistance, connective synthesis (**Connect**), and selection-based phrasing alternatives.
3. **Reflection (Right Rail / Unified Findings):** Grounded, multi-persona advisory feedback across **Grammar/Language** (Red), **Reader Perception** (Purple), **Supervisor / Structural Review** (Yellow), and **Researcher / Claim Grounding** (Blue).

---

## 2. Core Product Principles

1. **The Writer Retains Absolute Authorship:** AI proposes options; AI never overwrites text without explicit user confirmation (click, Tab, or hotkey `1–3`).
2. **Quote-Anchored Observations:** Every reflection or advisory finding attaches to a verbatim quote and context snippet directly from the user's text. No hypothetical or ungrounded annotations.
3. **Local & Situated Interventions:** The AI acts as a collaborative sounding board at the cursor or around a selected passage, not an autonomous agent replacing multiple pages.
4. **Deliberate Model Allocation:** 
   - Standard deterministic checks handle deterministic errors (LanguageTool for spelling/syntax).
   - High-performance open models via OpenRouter (`meta-llama/llama-3.3-70b-instruct`) serve as primary for nuanced drafting, selection alternatives, and rule linting.
   - Meta Muse (`muse-spark-1.3`) serves as resilient fallback and powers Meta Responses API web-grounded research claims.
5. **Progressive Disclosure:** Advanced stylistic dimensions (rhythm, clause structure, diction) are inferred from text and context by default rather than exposed as overwhelming configuration sliders.

---

## 3. Feature Definitions & Layer Responsibilities

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             BYLINE WORKSPACE                                │
├─────────────────────┬───────────────────────────┬───────────────────────────┤
│    INTENT (Left)    │   EXPRESSION (Center)     │    REFLECTION (Right)     │
│                     │                           │                           │
│ • Setup Wizard      │ • TipTap 3 Editor         │ • Language (Red)          │
│ • Context & Thesis  │ • Ghost Assistance (Tab)  │   - Spelling, punctuation │
│ • Section Outline   │ • Connect (Transitions)   │ • Reader (Purple)         │
│ • Writing Profile   │ • Selection Alternatives  │   - Intent gap, reactions │
│                     │ • Verbatim Underlines     │ • Supervisor (Yellow)     │
│                     │                           │   - Structure & outline   │
│                     │                           │ • Sources (Blue)          │
│                     │                           │   - Fact-checking claims  │
└─────────────────────┴───────────────────────────┴───────────────────────────┘
```

### 3.1 Setup Wizard & Intent Ingestion
- **Purpose:** Ingests document goals, audience, topic, and initial direction without friction.
- **Two-Layer Interaction:**
  1. *Quick Survey:* Objective (Explain, Argue, Inform, Analyze), Audience (General, Student, Academic, Professional), Topic description.
  2. *Outline & Profile Suggestion:* Produces a clean starting outline and sets the initial writing profile (`Diction`: Academic/General/Casual/etc.; `Tone`: Logical/Objective/etc.).
- **Persisted State:** Bound to document state in `localStorage`; users can edit outline nodes or context text at any time without restarting the wizard.

### 3.2 Draft Assistance (Ghost Text)
- **Purpose:** Helps the writer finish an incomplete thought at the active cursor position.
- **Assistance Modes:**
  - `Hint`: 1–3 word conceptual cues.
  - `Phrase`: Current clause completion (≤8 words).
  - `Sentence`: A fully developed sentence continuing the logical thread.
  - `Question`: Inquisitive prompt encouraging the writer to expand their argument.
  - `Block`: Paragraph-level thematic continuation (3–5 sentences).
- **Behavior:** Renders as inline ghost text (`syncGhost`). Pressing `Tab` accepts; typing or arrow navigation dismisses immediately. Reroll shortcut (`` ` `` or `Alt+R`) requests fresh variations.

### 3.3 Connect: Rhetorical Transition Pattern Library (`Cmd+/`)
Connect helps writers relate ideas, build transitions, and structure arguments:
- **Curated Catalog:** Searchable library of reusable rhetorical patterns organized by cognitive intent:
  - *Introduction / Framing*
  - *Addition / Similarity*
  - *Example / Clarification*
  - *Emphasis*
  - *Cause / Effect*
  - *Conclusion / Summary*
  - *Sequencing / Progression*
  - *Contrast / Concession*
  - *Condition / Qualification*
  - *Purpose / Means*
- **Interaction:** Triggered via `Cmd+/` or top menu; typing filters categories and templates instantly; selection inserts template with caret positioned at placeholder brackets (`[]`).

### 3.4 Selection-Based Alternatives (Paraphrase)
- **Purpose:** Offers targeted phrasing alternatives for an active selection without altering surrounding prose.
- **Interaction:**
  - Selecting a 2–80 character fragment displays a non-intrusive floating `Alternative` button directly below the selection.
  - Clicking `Alternative` triggers `/api/synonyms`, returning 3 contextual options.
  - Options appear in a sleek popup: pressing `Tab` or `1–3` replaces the selection in place; pressing `Esc` dismisses.
  - Meaning is preserved while adapting register or conciseness.

### 3.5 Reflection Personas & Unified Findings
All analytical findings are displayed in the right rail as a unified, filterable stream anchored to exact text quotes:
1. **Grammar & Language (Red / LanguageTool):** Detects deterministic spelling, typography, and punctuation errors. Provides immediate click-to-fix replacements.
2. **Reader Persona (Purple / Muse & Llama):**
   - *Perceived Main Idea:* Independent reader takeaway of the text.
   - *Intent Gap:* Compares reader takeaway against author's stated context.
   - *Reader Reactions:* Flags ambiguity, tone clash, or skepticism (*question, comment, compliment, critique*).
3. **Supervisor Persona (Yellow / Outline & Cohesion Lint):**
   - Structural linting against active style guidelines and outline alignment.
   - Identifies orphaned outline points, repetitive transitions, or missing supporting evidence.
4. **Researcher Persona (Blue / Grounded Web Sources):**
   - Automatically extracts checkable factual claims from the text.
   - Evaluates claims against live search retrieval and returns verified status: *Supports*, *Contradicts*, or *Qualifies*, complete with source excerpts and APA citation generators.

---

## 4. MVP Scope & Production Readiness

### 4.1 Production Feature Set (Verified in v2 Base)
- [x] TipTap 3 document editor with local storage persistence.
- [x] Verbatim quote-anchoring engine (`lib/locate.ts` & `quote.py`).
- [x] Ghost drafting completions (`/api/complete` with assist levels and reroll).
- [x] Selection alternatives floating button & replace (`useSynonyms.ts`).
- [x] Static transition pattern library (`Cmd+/`).
- [x] LanguageTool grammar integration sidecar (`/api/grammar`).
- [x] Reader intent gap & reactions panel (`/api/reactions`, `/api/main-idea`).
- [x] Research claims grounding & citations (`/api/readings`, `/api/cite`).
- [x] Rule linter (`/api/lint`).
- [x] Live apply-on-change write settings.
- [x] HTML & Docx export.
- [x] Soft-fail error recovery.

---

## 5. Product Acceptance Criteria

| Feature | Acceptance Criteria |
|---|---|
| **Ghost Suggestions** | Response renders within 1500ms; Tab inserts completion; any keypress aborts/clears ghost cleanly. |
| **Selection Alternatives** | Selection of 2–80 chars spawns Alternative button within 150px; click returns 3 grammatical replacements; hotkeys 1–3 replace text and preserve undo stack. |
| **Static Connect** | `Cmd+/` opens categorised transition browser; typing filters list instantly; selecting inserts template with bracket caret positioning. |
| **Quote Anchoring** | 100% of annotations map to verbatim text quotes; editing text marks anchor stale or removes decoration gracefully without crashing editor. |
| **Demo Route** | `/demo` loads pre-seeded draft with instant interactive workflows without login. |
