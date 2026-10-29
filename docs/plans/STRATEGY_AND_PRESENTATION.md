# Byline: Brand, Pitch, Demo, Documentation, Socials & Testing Strategy

> **Authoritative Document C**  
> **Status:** Active & Reconciled with Byline v2 Production Codebase (Meta w/ OpenRouter)  
> **Target Track:** Meta Global AI Developer Hackathon  
> **Cross-References:** [Product & Development](./PRODUCT_AND_DEVELOPMENT.md) · [Technical Architecture](./TECHNICAL_ARCHITECTURE.md) · [Implementation Roadmap](./IMPLEMENTATION_ROADMAP.md)

---

## 1. Product Positioning & Value Proposition

### 1.1 The Problem
Writers do not suffer from a lack of text generators; they suffer from the loss of authorial voice. Typical AI chatbots generate generic, homogenized paragraphs that strip away the writer's original reasoning. When writers only need help finding the right phrase, relating two distinct thoughts, or verifying how a reader perceives their argument, full-page AI rewrites create more friction than assistance.

### 1.2 The Positioning
> **Byline is a writer-controlled AI workspace where the author chooses every word. AI proposes options; AI never disposes.**

- **Conventional Generative AI:** Replaces the blank page with wholesale text generation.
- **Conventional Grammar Checkers:** Focus strictly on rule-based typos and mechanics.
- **Byline:** Sits right inside the flow of composition—offering local suggestions, connective templates (**Connect**), and reader-perception reflections anchored verbatim to the writer's own prose.

### 1.3 Key Brand Attributes
- **Restrained:** Never auto-inserts text or bombards the writer with unprompted popups.
- **Precise:** Uses task-specific models (OpenRouter Llama 3.3 70B primary for high reasoning quality; Meta Muse for stylistic drafting and web grounding).
- **Verifiable:** Annotations are 100% quote-anchored to the document.
- **Honest:** Transparently shows model provenance, latency, and prompt telemetry in the UI.

---

## 2. Pitch Strategy & Formats

### 2.1 One-Sentence Pitch
> Byline is a writer-controlled AI workspace that helps you draft, connect ideas, and evaluate reader perception—one deliberate suggestion at a time.

### 2.2 Thirty-Second Pitch
> Most AI writing tools act like ghostwriters: you give them a prompt, and they generate a wall of text that sounds like everyone else. Byline is built for writers who want to keep their own voice. While you write, Byline suggests ghost continuations at the cursor. If you're stuck between two ideas, our Connect catalog provides structured transitions. And when you review, Byline reads like a stranger to test whether your intended meaning actually comes across. You inspect every suggestion and choose every word.

### 2.3 Two-Minute Pitch Breakdown
1. **0:00–0:20 (The Hook & Problem):**
   Show a real essay draft. Point to two disconnected paragraphs. Explain the cognitive breakdown: the writer knows what they want to argue, but the connective tissue is missing.
2. **0:20–0:45 (The Solution & Core Philosophy):**
   Introduce Byline. Demonstrate the 3-part interface: Intent (left), Expression (center), Reflection (right). Emphasize: no ghostwriting, no auto-replacements.
3. **0:45–1:25 (The Live Demonstration):**
   - *Drafting:* Trigger Tab ghost suggestion.
   - *Selection Alternative:* Select a clunky phrase; click floating `Alternative` button; select option `2` via hotkey `2`.
   - *Connect:* Press `Cmd+/` to open rhetorical transitions; filter and insert transition template.
4. **1:25–1:45 (Technical Architecture):**
   Explain quote anchoring (100% verified string locate), dual-provider architecture (OpenRouter Llama 3.3 primary + Meta Muse fallback), and privacy-first local storage.
5. **1:45–2:00 (Impact & Closing):**
   Tested with campus writers. Show metrics pill (live latency & tokens). Conclude: *"Write what you mean. Byline helps you get there."*

---

## 3. Demonstration Storyboard (3-Minute Video)

```
0:00 ─── Hook & Dilemma ───► 0:30 ─── Ghost & Phrasing ───► 1:15 ─── Transitions ───► 2:05 ─── Reflection Rails ───► 2:45 ─── Architecture & Close
```

| Timestamp | Visual Screen | Narration / Action | Demonstrated System |
|---|---|---|---|
| **0:00–0:25** | Browser opens `https://trybyline.dev/demo`. Preloaded essay draft on urban transit. | *"You don't need AI to write your paper for you. You need AI to help you find the right words when you get stuck."* Show clear editor canvas. | Landing & client-side route `/demo`. |
| **0:25–0:55** | Writer types a sentence, pauses. Inline ghost text appears in grey. | Press `Tab` to accept ghost completion. Highlight a 4-word phrase; click `Alternative`; press `1` to swap. | Ghost completions (`/api/complete`) & selection alternatives (`useSynonyms.ts`). |
| **0:55–1:45** | Press `Cmd+/` to open Connect Transitions catalog. | *"Here are two ideas that need a transition. Let's browse Byline's Connect transitions."* Filter for `Contrast / concession`. Select `Although [], `. Caret lands right inside brackets. | Transition pattern catalog (`constants.ts`). |
| **1:45–2:20** | Switch editor mode to **Editing**. Right rail lights up with Red, Purple, Yellow, Blue indicators. | Click a purple underline: show *Intent Gap* (what author meant vs what AI reader perceived). Click a blue source: show verified web grounding with APA citation. | LanguageTool (`/api/grammar`), Reader persona (`/api/reactions`), Research claims (`/api/readings`). |
| **2:20–2:45** | Open Top Bar Metrics popup. Show prompt transparency, token usage, latency graph, and benchmark verification table. | Explain: *"Byline is a modular monolith. Everything is quote-anchored to the user's text. No secret prompts, no lost control."* | `MetricsPopup.tsx`, FastAPI backend telemetry. |
| **2:45–3:00** | Final pan of the finished essay. Click Export to Docx. | *"Byline: You write. Byline suggests. You choose."* | `docx-export.ts`. |

---

## 4. Documentation & Repository Strategy

### 4.1 Public README Structure
The repository root `README.md` provides immediate transparency and clear setup instructions:
1. **Hero Badge:** Build status, Vite, FastAPI, Meta Muse, OpenRouter.
2. **Product Thesis & GIF:** 10-second clip of ghost completion + selection alternative.
3. **Architecture Overview:** Dual-provider architecture (OpenRouter primary + Meta Muse fallback + LanguageTool sidecar).
4. **Local Setup & Docker Sidecars:**
   ```bash
   cp .env.example .env
   docker compose up -d languagetool
   uv venv backend/.venv && uv pip install -r backend/requirements.txt
   backend/.venv/bin/uvicorn app.main:app --port 8000 --app-dir backend
   npm --prefix frontend install && npm --prefix frontend run dev
   ```
5. **Evaluation & Verification:** Commands to run pytest suite (`32+ passed`) and frontend test suite (`27+ passed`).
6. **Open Source License:** MIT License file in repository root.

---

## 5. Formative Usability Testing Protocol

### 5.1 Sample & Target
- 5–8 active student or academic writers recruited from university networks.
- 15-minute unassisted sessions with realistic argumentative writing prompts.

### 5.2 Key Observation Tasks
1. **Task 1:** Start drafting from a blank canvas or template; accept at least one ghost suggestion.
2. **Task 2:** Highlight an awkward phrase and inspect the 3 alternatives.
3. **Task 3:** Use Connect (`Cmd+/`) to bridge two contradictory arguments.
4. **Task 4:** Switch to Editing mode; inspect an *Intent Gap* or source verdict finding.
