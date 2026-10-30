# Byline: Product and Development Plan

## 1. Product Vision

Byline is an AI-assisted writing workspace that helps people express, connect, and improve their ideas without taking control of their writing.

Most writing assistants focus on generating complete text, correcting errors, or rewriting existing passages. Byline takes a more collaborative approach: it works alongside the writer, offering suggestions, observations, connections, and evidence while leaving the final decisions to the writer.

Byline should help users:

- Find words and phrases that express what they mean.
    
- Continue an unfinished thought without losing their original direction.
    
- Connect ideas through logical relationships and reusable writing patterns.
    
- Understand how readers might interpret their writing.
    
- Improve structure, flow, reasoning, and completeness.
    
- Find evidence and verify claims when research is needed.
    
- Correct basic language errors.
    
- Maintain their own voice and creative control.
    

### Core principle

**Byline should help writers think and express themselves, not simply produce text for them.**

The writer's context, outline, and existing text represent their intentions. They are editable inputs, not unquestionable ground truth. Byline should help the writer achieve those intentions while allowing them to change their mind.

### Product tagline candidates

- Where thoughts find words.
    
- Write what you mean. Improve what you write.
    

---

## 2. Product Design Principles

### 2.1 Preserve writer agency

AI output should remain a suggestion until the writer accepts it.

- Never replace text automatically without the writer's authorization.
    
- Allow suggestions to be accepted, edited, rejected, or regenerated.
    
- Preserve the original text until an edit is accepted.
    
- Avoid rewriting an entire document when a local suggestion would suffice.
    
- Do not force the writer to adopt an outline, interpretation, or recommendation.
    

### 2.2 Keep the interface simple

Do not expose every possible writing characteristic as a separate setting.

Byline can infer sentence rhythm, syntax, diction, clause structure, transitions, repetition, and local coherence from the text and task. These should not become a collection of independent controls unless a demonstrated user need justifies them.

### 2.3 Use AI deliberately

Not every feature needs AI.

- Static pattern libraries are appropriate for reusable writing structures.
    
- Deterministic checks are appropriate for straightforward language errors.
    
- AI is appropriate for contextual suggestions, semantic analysis, and research reasoning.
    
- Expensive or document-wide analysis should run when requested, not continuously while the user types.
    

### 2.4 Keep features independent

A feature should have a clear responsibility, input, output, and interaction pattern. Avoid building an elaborate multi-agent system simply because the product has several AI-powered capabilities.

### 2.5 Prefer evidence over feature count

A smaller feature that works reliably is more valuable than a large collection of superficial AI demonstrations.

---

## 3. Workspace Structure

Byline retains its three-part writing workspace, with Draft and Editing modes.

### 3.1 Top-level modes

**Draft mode**

Helps the writer develop and express ideas.

Primary questions:

- What am I trying to say?
    
- How can I express this thought?
    
- How can I connect these ideas?
    
- What could I write next?
    

**Editing mode**

Helps the writer inspect and improve existing text.

Primary questions:

- Is my meaning clear?
    
- How might readers interpret this?
    
- Does the writing fulfill its purpose?
    
- Are my claims supported?
    
- What should I improve?
    

These modes share the same document, context, outline, and writing preferences. Switching modes changes the emphasis and available actions, not the underlying document.

### 3.2 Left dock — Intent

Contains:

- Document context.
    
- Outline and section hierarchy.
    
- Links between outline items and editor blocks.
    
- Sentence or connective-pattern browsing where appropriate.
    

The writer can edit the context and outline at any time.

### 3.3 Center — Expression

Contains the primary TipTap editor.

Responsibilities:

- Write and edit text.
    
- Display formatting and cursor controls.
    
- Show anchored findings and suggestions.
    
- Provide contextual actions for selected text.
    
- Insert accepted AI suggestions.
    
- Support undo and redo.
    

### 3.4 Right dock — Reflection

Contains a unified collection of findings from all four personas.

Responsibilities:

- Search findings.
    
- Filter by persona.
    
- Navigate to affected text.
    
- Inspect explanations and suggestions.
    
- Accept or dismiss findings.
    
- Regenerate alternatives where supported.
    
- Show stale or resolved findings appropriately.
    

The findings list is one shared collection, not four disconnected interfaces.

---

## 4. Setup Wizard

The setup wizard establishes enough context for Byline to provide relevant assistance without creating unnecessary friction.

The latest direction is a two-layer setup: a quick survey followed by editable templates.

### 4.1 Layer One — Quick survey

Use multiple-choice questions with an option to provide a custom answer. Include short text inputs only where they add meaningful information.

Potential questions:

**What are you writing?**

- Essay
    
- Report
    
- Article or blog post
    
- Story or fiction
    
- Email or message
    
- Other
    

**What are you trying to accomplish?**

- Explain
    
- Argue or persuade
    
- Inform
    
- Analyze
    
- Narrate
    
- Other
    

**Who will read it?**

- General audience
    
- Students
    
- Academic audience
    
- Professionals or colleagues
    
- Other
    

**What is it about?**

A short free-text description of the topic, question, or idea.

These are proposed questions, not a requirement to ask all four every time. Test whether each question changes the quality of assistance before making it mandatory.

### 4.2 Layer Two — Templates and document preparation

Use the survey answers to suggest a document template.

A template can provide:

- A suggested outline.
    
- A context structure.
    
- Guidance about what information may be useful.
    
- Optional example prompts for filling missing information.
    

For example, an argumentative essay template might contain:

- Thesis.
    
- Supporting arguments.
    
- Evidence.
    
- Counterarguments.
    
- Rebuttal.
    
- Conclusion.
    

A story template would use a different structure.

The user can:

- Accept the template.
    
- Edit the outline and context.
    
- Select another template.
    
- Write their own outline.
    
- Skip the template and start from a blank document.
    

The template should be a starting point, not a mandatory structure.

### 4.3 Avoid repeated setup

The wizard should primarily run when creating a new document. Returning users should resume their workspace.

Document-specific context, audience, outline, and writing preferences should persist with the document. Users should be able to update them later without restarting the wizard.

### 4.4 Progressive disclosure

Do not ask users to configure every writing preference before starting.

Start with the minimum necessary information. Introduce additional controls only when a real task requires them.

---

## 5. Writing Preferences and Prompt Architecture

The previous design risk was adding too many independently configurable writing characteristics. The replacement should use a small number of persistent inputs and task-specific instructions.

### 5.1 Persistent inputs

**Document-level inputs**

- Context and topic.
    
- Purpose.
    
- Audience.
    
- Outline.
    
- Relevant facts and constraints.
    

**Writing-profile inputs**

- Preferred language and regional variant.
    
- Default writing theme or style.
    

Possible themes include Neutral, Academic, Gen Z, and Buzzword-heavy. Themes should have noticeable, demonstrable effects without becoming a collection of dozens of settings.

### 5.2 Task-specific instructions

The task determines what the model should do.

Examples:

- Hint.
    
- Complete a phrase.
    
- Continue a sentence.
    
- Continue a paragraph.
    
- Paraphrase.
    
- Shorten.
    
- Change tone.
    
- Connect ideas.
    
- Analyze as a reader.
    
- Review structure and reasoning.
    
- Research claims.
    
- Correct language.
    

A task should receive only the context relevant to that task.

### 5.3 Inferred writing characteristics

Do not expose separate controls for the following by default:

- Sentence rhythm.
    
- Syntax.
    
- Diction.
    
- Clause structure.
    
- Transitions.
    
- Repetition.
    
- Local coherence.
    
- Sentence construction.
    

Infer these characteristics from the document and current request. Add explicit controls only when testing shows that users need them.

### 5.4 Instruction precedence

Use a predictable order:

1. System and safety constraints.
    
2. Explicit instructions for the current action.
    
3. Document-specific settings and constraints.
    
4. Writing-profile defaults.
    
5. General defaults.
    

If instructions conflict, the system should resolve them deliberately rather than concatenating everything into an inconsistent prompt.

### 5.5 Task-specific prompt construction

Do not build one enormous prompt containing every persona, writing rule, and feature.

Instead, create a request pipeline:

1. Identify the user's action.
    
2. Collect the relevant context.
    
3. Select the task-specific instructions.
    
4. Build the model request.
    
5. Generate the response, streaming when supported.
    
6. Validate and parse the output.
    
7. Present the result in the appropriate interface.
    
8. Apply edits only after user authorization.
    

Use structured output where the application needs predictable fields. Do not ask the model to identify text ranges when the editor already knows the selection or cursor position.

---

## 6. Feature Specifications

### 6.1 Draft assistance

Draft assistance provides contextual suggestions for unfinished writing.

Possible assistance types:

- Hint: a short fragment or a few useful words.
    
- Phrase completion: complete the current clause or phrase.
    
- Sentence continuation: continue the current thought.
    
- Paragraph continuation: propose a short continuation when requested.
    
- Question: ask a question that helps the writer develop the idea.
    

The requested output length and type must be respected.

Use the text around the cursor, relevant document context, writing preferences, and task instructions. Avoid repeating existing text unnecessarily or inventing ideas that are not supported by the context.

### 6.2 Connect

Connect helps writers express relationships between ideas. It is not limited to sentence starters or transition words.

**Two ways to use it**

**A. Browse patterns**

A curated, searchable library of reusable writing structures.

Possible categories:

- Addition.
    
- Contrast.
    
- Cause and effect.
    
- Evidence.
    
- Concession.
    
- Comparison.
    
- Elaboration.
    
- Qualification.
    
- Synthesis.
    
- Sequence.
    
- Example or illustration.
    
- Problem and solution.
    

Example pattern:

> Although [opposing point] is valid, [main argument] remains important because [reason].

Each pattern should have:

- A name.
    
- A relationship category.
    
- A reusable template.
    
- Placeholders.
    
- A short explanation of when to use it.
    
- An example.
    

**B. Infer a connection**

The user invokes Connect manually at the cursor or with selected text. AI considers the surrounding passage, the relevant document context, and any supplied second idea.

It suggests suitable connective structures or contextual continuations.

If the relationship between ideas is ambiguous, it should present plausible alternatives or ask for clarification rather than inventing a logical relationship.

**Design distinction**

- Draft assistance: What could I write next?
    
- Connect: How can I relate these ideas?
    
- Paraphrase: How else can I express this idea?
    

Connect is a composition tool, not a fifth reviewer persona.

### 6.3 Selection-based paraphrase

When the writer selects a word, phrase, or passage, Byline can offer three alternatives.

The feature should support more than one-word synonyms. It should understand the grammatical and semantic scope of the selection.

Example:

Selected text: "very sad"

Possible alternatives:

- deeply unhappy
    
- miserable
    
- experiencing profound sadness
    

Possible operations:

- Paraphrase: preserve the meaning while changing the wording.
    
- Shorten: express the same idea more concisely.
    
- Change tone: adapt the wording to the selected writing style.
    

The model should infer whether the selection is a word, phrase, or clause. Do not force the writer to specify this manually.

The alternatives should:

- Preserve intended meaning.
    
- Fit the surrounding sentence grammatically.
    
- Respect the current writing style.
    
- Avoid unnecessarily elaborate wording.
    
- Replace only the selected range when accepted.
    

Keep the original text unchanged until acceptance.

### 6.4 Sentence starters and connective patterns

A static list of sentence starters is inexpensive and easy to implement, but it is not the core concept.

The broader direction is a searchable pattern library, particularly for connective structures. Simple sentence starters can remain a category within that library if they prove useful.

The library should be tested independently before adding AI inference. This allows the basic interaction and category design to be evaluated without model latency or cost.

### 6.5 Grammar persona — Red

**Purpose:** Identify language errors and provide direct corrections.

Responsibilities:

- Spelling.
    
- Grammar.
    
- Punctuation.
    
- Basic language conventions.
    

Use deterministic checks when sufficient. Invoke AI only when a correction requires contextual reasoning or when the available language-checking engine cannot resolve the issue.

Typical output:

- One clear correction.
    
- A concise explanation when useful.
    

Do not make grammar review an expensive full-document model call on every keystroke.

### 6.6 Reader persona — Purple

**Purpose:** Show how the writing might be interpreted by a reader.

Questions:

- What do I understand from this passage?
    
- Which references are ambiguous?
    
- What is unclear?
    
- What could a reader misunderstand?
    
- Which ideas seem disconnected?
    

The Reader evaluates the text as encountered by a reader. It should not assume that the writer's intended meaning was successfully communicated.

Behavior:

- Passive or conservative by default.
    
- Can be invoked manually for whole-document analysis.
    
- Produces observations, not automatic corrections.
    
- May offer no suggestions when an observation is sufficient.
    

### 6.7 Supervisor persona — Yellow

**Purpose:** Help the writer improve the document in light of its intended purpose.

Questions:

- Does the text fulfill the outline?
    
- Is the reasoning complete?
    
- Are supporting arguments missing?
    
- Are there repetitions, weak transitions, or unexplained claims?
    
- Could the structure or flow be improved?
    

Supervisor uses the document context and outline as reference points.

Behavior:

- Explicit activation.
    
- Whole-document analysis.
    
- Produces actionable findings.
    
- Provides three alternatives for a finding where alternatives are useful.
    
- Does not rewrite the entire document by default.
    

Structural checks, such as empty outline sections or unmapped paragraphs, can be handled cheaply. Semantic questions, such as whether a paragraph adequately supports an argument, require deeper analysis.

### 6.8 Researcher persona — Blue

**Purpose:** Help writers find and evaluate evidence for their claims.

Researcher is an on-demand, multi-step research workflow.

Expected pipeline:

1. Extract claims that require verification.
    
2. Search for relevant sources.
    
3. Evaluate source relevance and quality.
    
4. Retrieve and parse source content.
    
5. Identify supporting or contradictory evidence.
    
6. Determine whether the evidence actually supports the claim.
    
7. Produce a finding with source citations and evidence-backed alternatives.
    

Possible statuses:

- Supported.
    
- Contradicted.
    
- Unverified.
    

These statuses should reflect what the retrieved evidence establishes, not just whether a search result contains similar words.

Rules:

- Never invent sources or citations.
    
- Distinguish a lack of evidence from evidence of falsity.
    
- Keep citations connected to the specific claim they support.
    
- Do not run the full pipeline continuously while typing.
    
- Only provide evidence-backed revisions when adequate evidence exists.
    

### 6.9 Unified findings collection

All four personas contribute to one findings collection.

Each finding has:

- An ID.
    
- A persona.
    
- A finding type.
    
- An anchored text range.
    
- An explanation.
    
- Zero or more suggestions.
    
- A status.
    

Suggested statuses:

- Open.
    
- Resolved.
    
- Dismissed.
    
- Stale.
    

The same text may have multiple findings from different personas. Do not merge them solely because their ranges overlap.

For example, a claim might simultaneously have:

- A Reader finding that it is ambiguous.
    
- A Supervisor finding that its reasoning is incomplete.
    
- A Researcher finding that it lacks supporting evidence.
    

Resolving one does not automatically resolve the others.

The interface should support:

- Search.
    
- Persona filters.
    
- Navigation to the affected text.
    
- Viewing explanations and alternatives.
    
- Accepting or dismissing findings.
    
- Regenerating alternatives for an individual finding.
    
- Marking affected findings stale after document changes.
    

### 6.10 Outline-to-editor relationships

Outline items should link to relevant editor blocks so users can navigate between intended structure and actual content.

Do not implement this as a rigid one-to-one mapping.

Use a many-to-many relationship:

- One outline item can correspond to multiple blocks.
    
- A block can contribute to multiple outline items.
    
- Blocks may remain unmapped.
    
- Outline items may have no content yet.
    

Each editor block should have a stable identifier. Cursor positions and character offsets change as the document is edited, so they should not be the sole identity of a block.

Responsibilities:

- Outline selection highlights associated blocks.
    
- Block selection highlights associated outline items.
    
- Structural changes update relationships.
    
- Semantic mapping can be proposed by AI when necessary.
    
- The writer retains control over the outline.
    

Keep three concerns separate:

1. Outline hierarchy.
    
2. Outline-to-block relationships.
    
3. Semantic evaluation of whether the content fulfills its intended purpose.
    

---

## 7. Findings, Suggestions, and Document Editing

### 7.1 Shared finding model

A finding should describe an observation or issue. Suggestions are optional actions attached to it.

Conceptually:

```
type Persona =
  | "grammar"
  | "reader"
  | "supervisor"
  | "researcher";

type FindingKind =
  | "language_error"
  | "reader_observation"
  | "writing_opportunity"
  | "evidence_issue";

type FindingStatus =
  | "open"
  | "resolved"
  | "dismissed"
  | "stale";

interface Suggestion {
  id: string;
  text: string;
  rationale?: string;
}

interface Finding {
  id: string;
  persona: Persona;
  kind: FindingKind;
  range: {
    from: number;
    to: number;
  };
  explanation: string;
  suggestions: Suggestion[];
  status: FindingStatus;
}
```

This is a starting conceptual model, not a requirement to use this exact schema.

### 7.2 Suggestions should belong to their task

Do not create a separate AI agent whose only responsibility is to generate suggestions for other agents.

Each feature should generate its own appropriate output:

- Grammar: direct correction.
    
- Reader: observation, optionally with clarification alternatives.
    
- Supervisor: several possible improvements.
    
- Researcher: evidence-backed revisions.
    
- Paraphrase: three alternatives.
    
- Connect: several suitable patterns or contextual continuations.
    

### 7.3 Efficient generation

Generate simple outputs eagerly when inexpensive. Generate more expensive alternatives on demand.

For example:

- Show a detected grammar correction directly.
    
- Load alternatives when the user opens a finding.
    
- Regenerate only the selected finding when the user requests new alternatives.
    
- Never rerun the entire document analysis merely to regenerate one suggestion.
    

### 7.4 Editor integrity

Editor metadata should determine the insertion or replacement range.

The model should provide proposed content, not be trusted to decide where that content belongs in the document.

Before applying an edit:

- Verify the target range is still valid.
    
- Detect whether the underlying text has changed.
    
- Handle stale suggestions safely.
    
- Preserve undo and redo.
    
- Apply changes only after the writer accepts them.
    

---

## 8. Streaming and Prompt Caching

### 8.1 Streaming

Stream model output as it is generated to make Byline feel responsive.

The intended interaction:

1. The user requests a suggestion.
    
2. Byline displays a loading state.
    
3. Text appears progressively.
    
4. The suggestion becomes selectable when sufficiently complete.
    
5. The writer accepts, edits, or rejects it.
    

Keep streamed output separate from the committed document until acceptance. Partial output should not accidentally change the document.

Streaming is particularly useful for:

- Sentence continuation.
    
- Phrase and paragraph suggestions.
    
- Paraphrase alternatives.
    
- Contextual Connect suggestions.
    
- Longer analysis results where the output format permits progressive display.
    

### 8.2 Prompt caching

Structure requests so stable prompt content appears before changing content.

Typical stable prefix:

- Core Byline instructions.
    
- Task-specific output requirements.
    
- Stable document settings.
    
- Relevant reusable instructions.
    

Changing suffix:

- Current selection or cursor context.
    
- Current passage.
    
- Latest user instruction.
    
- Task-specific changing data.
    

Caching may reduce repeated input processing costs and latency when supported by the selected provider and model.

It does not eliminate the need to send the relevant settings and context with each stateless request. Cache behavior, minimum input length, and lifetime depend on the provider.

### 8.3 Conversation history versus document state

Do not rely on a conversational thread as the only source of truth for the document.

Byline should explicitly maintain:

- Current document.
    
- Context and outline.
    
- Writing preferences.
    
- Active task.
    
- Relevant cursor or selection.
    
- Findings and their status.
    

This allows each request to receive the necessary information without sending irrelevant conversation history.

---

## 9. Architecture: Rebuild from Scratch

The existing codebase should be reorganized around clear responsibilities rather than incrementally accumulating prompt construction, provider-specific behavior, and UI logic.

Use a modular monolith. Do not introduce microservices or elaborate agent orchestration for this application.

### 9.1 Suggested structure

```
src/
  app/
    routes/
    workspace/

  features/
    setup/
    editor/
    draft-assistance/
    connect/
    paraphrase/
    findings/
    settings/
    export/

  domain/
    document/
    outline/
    writing-profile/
    suggestions/
    findings/
    patterns/
    rules/

  services/
    prompt-builder/
    suggestion-service/
    analysis-service/
    research-service/
    export-service/

  adapters/
    ai/
      provider-interface
      provider-adapters/
    spellcheck/
    sources/

  shared/
    types/
    validation/
    utilities/
```

The names are illustrative. Keep the structure proportional to the actual application rather than creating empty abstractions for every possible future feature.

### 9.2 Responsibilities

**UI components**

- Render the interface.
    
- Capture user actions.
    
- Display loading, error, and result states.
    
- Do not construct prompts or call model providers directly.
    

**Domain**

- Define documents, findings, suggestions, patterns, writing profiles, and their rules.
    
- Remain independent of any specific AI provider.
    

**Services**

- Coordinate tasks.
    
- Collect relevant context.
    
- Build requests.
    
- Validate responses.
    
- Manage task execution and stale results.
    

**Provider adapters**

- Handle provider-specific request formatting.
    
- Manage streaming.
    
- Parse responses.
    
- Handle provider errors and supported parameters.
    
- Keep provider-specific implementation details out of the editor.
    

**Editor integration**

- Own document transactions, cursor positions, selection ranges, stable block identifiers, and safe application of edits.
    

### 9.3 Provider interface

Use one interface for model operations, with structured request and response types.

```
interface WritingModel {
  generateSuggestions(
    request: SuggestionRequest
  ): Promise<Suggestion[]>;
}
```

For streaming, add a corresponding streaming method or a task interface that can deliver typed events.

Do not force every task into the same response structure if its output is fundamentally different. A Reader observation, a paraphrase alternative, and a research finding are not interchangeable.

### 9.4 Provider independence

Potential inference providers discussed include Baseten, OpenRouter, and direct Meta model access.

Before selecting one, verify:

- Current model availability.
    
- Streaming support.
    
- Prompt-caching support.
    
- Structured-output support.
    
- Pricing and latency.
    
- Data-handling requirements.
    
- Hackathon eligibility and rules.
    

Hosting or accessing a Meta model through a third party does not automatically establish that the implementation satisfies a requirement to use Meta AI tooling.

Keep credentials server-side and avoid exposing provider-specific inference controls to ordinary writers.

### 9.5 Shared configuration

Do not duplicate theme definitions, language rules, or writing preferences across the wizard, settings page, and prompt builder.

Maintain one canonical representation. Each UI and service should consume that representation rather than maintaining independent copies.

---

## 10. Development Strategy

The development sequence has three broad stages:

1. Isolated experiments.
    
2. Coherent MVP.
    
3. Incremental feature expansion.
    

The experiments should be small enough to discard or redesign without damaging the main application.

### Phase 0 — Architecture and baseline

**Goal:** Establish a clean foundation before adding features.

Tasks:

- Audit the existing code and identify reusable pieces.
    
- Define the domain model and feature boundaries.
    
- Establish the editor and document state.
    
- Separate UI, domain, services, and provider adapters.
    
- Create a minimal provider integration with streaming.
    
- Establish error handling, request cancellation, and stale-response handling.
    
- Define a basic test strategy.
    

Deliverable: A small, functioning writing workspace with a clean request pipeline.

Exit criterion: A basic suggestion can be requested, streamed, displayed, accepted, and undone without corrupting the document.

### Phase 1 — Isolated concept experiments

**Goal:** Test the fundamental interaction of each feature before integrating the entire product.

Each experiment should use the simplest implementation that can validate its concept. It does not need production-level architecture or a polished interface.

#### Experiment 1: Draft assistance

Test:

- Cursor-aware context.
    
- Short hints and phrase completion.
    
- Sentence continuation.
    
- Progressive streaming.
    
- Accept/reject behavior.
    

Evaluate whether the suggestions continue the writer's thought rather than taking over the paragraph.

#### Experiment 2: Connect pattern library

Build a small static collection of connective patterns.

Test:

- Category browsing.
    
- Search.
    
- Pattern placeholders.
    
- Insertion at the cursor.
    
- Contextual relevance of patterns.
    

Determine whether writers understand and use reusable structures rather than merely selecting transition words.

#### Experiment 3: AI Connect

Add an AI-powered mode that infers the relationship between ideas.

Test:

- Cursor-based inference.
    
- Selection-based connections.
    
- Multiple alternatives.
    
- Ambiguous relationships.
    
- Preservation of meaning.
    

Compare the usefulness of AI inference with the static library. Keep both only if they provide distinct value.

#### Experiment 4: Selection-based paraphrase

Test three alternatives for selected words, phrases, and clauses.

Evaluate:

- Meaning preservation.
    
- Grammatical fit.
    
- Variety of alternatives.
    
- Response latency.
    
- Correct replacement range.
    

#### Experiment 5: Findings interaction

Start with mocked findings rather than implementing all four personas.

Test:

- Anchored highlights.
    
- Multiple findings on the same range.
    
- Unified list.
    
- Search and filtering.
    
- Navigation to the editor.
    
- Accept, dismiss, resolve, and stale states.
    

This isolates the difficult UI and state-management problems from model quality.

#### Experiment 6: Grammar checks

Integrate a basic spellchecker or language-checking engine.

Test:

- Detection.
    
- Underlines.
    
- Correction display.
    
- Safe text replacement.
    
- Behavior while editing.
    

Do not build a comprehensive language engine from scratch for the initial release.

#### Experiment 7: Reader analysis

Use a small set of sample passages with known ambiguity or clarity problems.

Test whether the Reader identifies plausible interpretation problems without generating unsolicited rewrites.

#### Experiment 8: Supervisor analysis

Use documents with known structural and reasoning weaknesses.

Test whether Supervisor can identify missing explanations, repetition, weak transitions, and mismatches with the outline.

#### Experiment 9: Researcher pipeline

Test the research workflow on a small set of verifiable claims.

Verify that:

- Sources are retrieved.
    
- Evidence is relevant.
    
- Claims are not marked supported merely because search results repeat them.
    
- Citations point to actual sources.
    
- Unverified claims remain distinguishable from contradicted claims.
    

#### Experiment 10: Setup wizard

Test:

- Short multiple-choice questions.
    
- Custom answers.
    
- Template selection.
    
- Context and outline editing.
    
- Starting from scratch.
    
- Skipping optional steps.
    

Measure whether the setup improves subsequent suggestions enough to justify the time it takes.

**Phase 1 exit criterion:** Each feature has demonstrated its core interaction, known limitations, and a reason to be included in the MVP or deferred.

Do not require every experiment to succeed. A failed experiment is useful if it prevents an unnecessary feature from entering the product.

### Phase 2 — Core MVP

**Goal:** Combine the most valuable, proven features into one coherent workspace.

Recommended MVP scope:

1. Persistent document editor.
    
2. Lightweight setup wizard.
    
3. Editable context and outline.
    
4. Draft assistance with streaming.
    
5. Static Connect pattern library.
    
6. AI paraphrase with three alternatives.
    
7. Unified findings interface using initially limited analysis.
    
8. Basic grammar checking.
    
9. Accept/reject behavior and undo.
    
10. Basic export.
    

Use mocked or limited findings where necessary rather than implementing all four full analysis pipelines before the core experience works.

The four personas can be introduced progressively. Their conceptual model and data structure should be planned early, but the full implementation does not need to ship at once.

**MVP exit criterion:** A user can set up a document, write naturally, request help, revise selected text, inspect findings, and retain full control of edits without leaving the workspace.

### Phase 3 — Add features incrementally

**Goal:** Expand the product without destabilizing the MVP.

A reasonable order is:

1. Improve Connect with contextual AI inference.
    
2. Improve findings navigation, search, and filtering.
    
3. Introduce Reader analysis.
    
4. Introduce Supervisor analysis.
    
5. Add outline-to-editor relationships and structural checks.
    
6. Add Researcher with source retrieval and citations.
    
7. Improve grammar correction where deterministic checks are insufficient.
    
8. Expand themes and writing preferences based on observed demand.
    
9. Improve export and document-management features.
    
10. Optimize caching, latency, cost, and streaming behavior.
    

This order is provisional. If testing shows that one capability creates substantially more value than another, reprioritize based on evidence.

### Phase 4 — Reliability and refinement

**Goal:** Make the integrated product dependable.

Tasks:

- Test long documents.
    
- Test rapid typing during model requests.
    
- Handle cancellation and out-of-order responses.
    
- Ensure stale suggestions cannot silently overwrite newer text.
    
- Verify undo and redo.
    
- Test overlapping findings.
    
- Validate streamed and structured responses.
    
- Check provider failures and retry behavior.
    
- Measure response latency and relevance.
    
- Review security and API-key handling.
    
- Test with writers who did not build the product.
    

Do not confuse adding more AI features with improving the product. Reliability, clarity, and useful suggestions are part of the core experience.

---

## 11. Testing and Evaluation

Each experiment should have its own acceptance criteria. The integrated product should then be evaluated separately.

### 11.1 Feature-level testing

**Draft assistance**

- Does it continue the existing thought?
    
- Does it respect requested length?
    
- Does it avoid unnecessary repetition?
    

**Connect**

- Does the pattern express the intended logical relationship?
    
- Is it appropriate to the surrounding passage?
    
- Can users distinguish a reusable pattern from a contextual suggestion?
    

**Paraphrase**

- Does the alternative preserve meaning?
    
- Does it fit grammatically?
    
- Are the alternatives genuinely distinct?
    

**Findings**

- Does each finding point to the correct text?
    
- Can overlapping findings coexist?
    
- Does applying an edit preserve unrelated content?
    

**Reader and Supervisor**

- Are the observations relevant?
    
- Do they distinguish reader interpretation from writing improvement?
    
- Do they avoid inventing problems merely to produce output?
    

**Researcher**

- Are the sources real and relevant?
    
- Does the evidence support the stated conclusion?
    
- Are uncertainty and contradiction represented accurately?
    

### 11.2 User evaluation

Test with approximately 5–10 campus writers as an initial usability sample.

Observe:

- Whether users understand the interface.
    
- Whether setup feels unnecessarily long.
    
- Which features they discover without assistance.
    
- Which suggestions they accept, edit, or reject.
    
- Whether they feel Byline preserves their voice.
    
- Where the workflow interrupts their writing.
    

This sample is useful for formative testing, not for claiming broad statistical validation.

### 11.3 Useful metrics

- Time to first useful suggestion.
    
- Time to first streamed token.
    
- Suggestion acceptance rate.
    
- Acceptance with edits versus verbatim acceptance.
    
- Rejection rate.
    
- Meaning-preservation ratings.
    
- Finding relevance ratings.
    
- Research citation correctness.
    
- Task completion rate.
    
- User-reported usefulness.
    

Acceptance rate alone is insufficient: users may accept a suggestion because it is convenient, not because it is good.

---

## 12. Scope Control

The main risk is building too many writing features and too much configuration before the core workflow is validated.

Use these rules:

1. Every feature begins with a small experiment.
    
2. Every experiment has a clear question it must answer.
    
3. Every successful experiment must justify its place in the MVP.
    
4. Every additional setting must demonstrate a real user need.
    
5. Every AI call must have a deliberate trigger.
    
6. Every expensive analysis must provide value beyond a simpler alternative.
    
7. Every accepted edit must be safe and reversible.
    
8. Every feature must have a clear responsibility.
    
9. Do not introduce a new agent solely to make the architecture appear more sophisticated.
    
10. Do not rewrite working components merely to make the folder structure look cleaner.
    

The purpose of the architecture is to make changes easier, not to create abstractions for their own sake.

---

## 13. Immediate Priorities

Before expanding the application, settle the following:

### Priority 1 — Rebuild the foundation

Define document state, editor integration, feature boundaries, provider abstraction, and the request lifecycle.

### Priority 2 — Prove the core writing interactions

Experiment with streaming draft assistance, the Connect pattern library, and selection-based paraphrase.

### Priority 3 — Prove the findings interface

Use mock data to validate highlighting, navigation, filtering, overlapping findings, and safe edits.

### Priority 4 — Validate setup

Test whether the short survey and editable templates improve assistance enough to justify their setup cost.

### Priority 5 — Assemble the MVP

Combine only the features that provide a coherent writing workflow. Use a limited set of findings and avoid building every analysis pipeline at once.

### Priority 6 — Expand from evidence

Add Reader, Supervisor, Researcher, advanced Connect inference, and other capabilities in stages.

---

## Final Product Direction

Byline consists of three connected responsibilities:

- **Intent:** Understand what the writer wants to accomplish.
    
- **Expression:** Help the writer find, form, and connect words.
    
- **Reflection:** Help the writer inspect and improve the result.
    

Its capabilities should emerge from a disciplined development process: experiment, evaluate, integrate, and refine.

The guiding rule is simple:

**Build the smallest useful version of each idea, prove that it works, and only then make it part of the larger product.**