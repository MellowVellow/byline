# Byline — Technical Concepts and Architecture Plan

## 1. Purpose

This document defines how Byline should be implemented technically, from a clean codebase to an integrated MVP and future feature expansion.

The previous plan defined what Byline should do. This plan defines:

- How the application is structured.
- How data moves through the system.
- How the editor, findings, and suggestions interact.
- How AI requests are constructed, streamed, and validated.
- Which responsibilities belong in the frontend, backend, and domain layer.
- How document state, text selections, and annotations remain consistent while editing.
- How to test each capability independently before integrating it.
- How to avoid excessive abstraction, duplicated configuration, and unnecessary AI orchestration.

The architecture should support the planned features without requiring all of them to be implemented immediately.

## 2. Architectural Principles

### 2.1 Modular Monolith

Build one application with clearly separated internal modules, not a collection of microservices.

Byline does not initially need distributed services, inter-agent communication, or a sophisticated workflow engine. Its features share documents, context, editor state, and model infrastructure.

A modular monolith provides these shared capabilities while keeping responsibilities independent.

### 2.2 Separate the Domain from Implementation Details

The application should understand concepts such as a document, finding, suggestion, outline, and writing task without knowing which AI provider implements them.

For example, the paraphrase feature should request three alternatives through an application service. It should not know how a particular provider formats its API request.

### 2.3 Explicit State, Inferred Mechanics

Store the information that represents the writer's intentions and choices:

- Document context.
- Audience and purpose.
- Outline.
- Language and writing theme.
- Accepted document changes.
- Finding status and user decisions.

Infer writing mechanics when needed rather than storing every possible characteristic as an independent setting.

### 2.4 AI is a Service, Not the Application Architecture

AI generates suggestions and performs semantic analysis. It does not own the document, determine the canonical text selection, manage editor transactions, or decide whether a suggestion has been accepted.

The application remains responsible for those operations.

### 2.5 Make Expensive Operations Explicit

Not every keystroke should trigger an AI request.

Use local computation for suitable tasks, on-demand requests for contextual assistance, and explicit document analysis for Reader, Supervisor, and Researcher.

### 2.6 Build Only the Abstractions Needed now

Design stable boundaries early, but implement complexity only when a feature requires it.

For example, define a common AI request pipeline now. Do not build an extensible multi-agent framework before there are independent workflows that genuinely need one.

---

## 3. High-Level System Architecture

Byline consists of four major technical layers.

```
flowchart TD
    UI["Presentation Layer<br/>React workspace and panels"]
    EDITOR["Editor Integration<br/>TipTap / ProseMirror"]
    DOMAIN["Domain Layer<br/>Documents, findings, suggestions"]
    SERVICES["Application Services<br/>Feature orchestration and context"]
    API["Server API<br/>Validation, authorization, request handling"]
    AI["AI Gateway<br/>Prompt construction and streaming"]
    ADAPTERS["Provider Adapters<br/>Normalized model interface"]
    EXT["External Capabilities<br/>AI providers, sources, spellcheck"]
    STORE["Persistence<br/>Documents and preferences"]

    UI --> EDITOR
    UI --> DOMAIN
    UI --> SERVICES
    SERVICES --> DOMAIN
    SERVICES --> API
    API --> AI
    AI --> ADAPTERS
    ADAPTERS --> EXT
    SERVICES --> STORE
    API --> STORE
```

This is a logical architecture. It does not require every box to be a separately deployed service.

### 3.1 Presentation Layer

Responsible for:

- Workspace layout.
- Draft and Editing modes.
- Setup wizard.
- Left, center, and right docks.
- Floating editor toolbars.
- Finding lists and detail panels.
- Streaming display.
- Loading, error, empty, and stale states.

It translates user actions into application commands and renders the results.

It does not construct provider-specific prompts or directly manage AI credentials.

### 3.2 Editor Integration Layer

Responsible for:

- TipTap and ProseMirror integration.
- Document transactions.
- Cursor and selection handling.
- Stable block identifiers.
- Anchored findings and highlights.
- Applying accepted suggestions.
- Undo and redo.
- Mapping editor positions after edits.

This is the authoritative layer for changes to the actual document text.

### 3.3 Domain Layer

Defines application concepts and their rules.

Examples:

- Document.
- Outline node.
- Writing profile.
- Writing pattern.
- Suggestion.
- Finding.
- Document revision.
- AI task.

The domain layer should not depend on React components or a specific model provider.

### 3.4 Application Services

Coordinate complete user actions.

Examples:

- Create a document.
- Prepare a document from a template.
- Generate a paraphrase.
- Find connective patterns.
- Run Reader analysis.
- Run Supervisor analysis.
- Research a claim.
- Apply a selected suggestion.
- Export a document.

Each service determines which domain data and external capabilities are needed.

### 3.5 Server API and AI Infrastructure

The server boundary handles provider credentials, request validation, model calls, research retrieval, and any protected operations.

Provider credentials must remain server-side. Even when the editor is implemented entirely in React, a secure server endpoint should mediate requests to protected AI APIs.

### 3.6 Persistence

Stores documents and application state according to the intended product requirements.

The first experiment can use local document state. The integrated application needs a deliberate persistence strategy before documents become a dependable user-facing feature.

Do not build synchronization, collaboration, version history, and account management before the MVP demonstrates a need for them.

---

## 4. Repository Structure

Use a feature-oriented structure for the application, with shared domain concepts separated from infrastructure.

```
src/
  app/
    routes/
    workspace/
    providers/

  features/
    setup/
    editor/
    draft-assistance/
    connect/
    paraphrase/
    findings/
    grammar/
    reader/
    supervisor/
    researcher/
    settings/
    export/

  domain/
    document/
    outline/
    writing-profile/
    suggestion/
    finding/
    pattern/
    ai-task/

  services/
    document-service/
    context-service/
    suggestion-service/
    analysis-service/
    research-service/
    prompt-builder/
    export-service/

  adapters/
    ai/
      provider-interface.ts
      provider-adapters/
    persistence/
    spellcheck/
    source-retrieval/

  shared/
    types/
    validation/
    utilities/

server/
  routes/
  ai/
  research/
  persistence/
  security/
```

The precise layout can change as implementation reveals the natural boundaries. The important point is ownership: every responsibility should have an obvious home.

### Dependency Rules

- UI components call application services.
- Application services use domain types and interfaces.
- Domain logic does not import UI components.
- Provider adapters implement shared interfaces.
- Editor operations pass through the editor integration layer.
- Only designated server modules access protected provider credentials.
- Shared configuration has one canonical definition.

Avoid a large miscellaneous utilities folder, duplicate theme definitions, and components that construct prompts themselves.

---

## 5. The Document as the Source of Truth

The document is the central application object. Every feature should work from the same document state.

### 5.1 Conceptual Document Model

```
interface Document {
  id: string;
  title: string;
  content: unknown;
  context: DocumentContext;
  outline: OutlineNode[];
  profile: WritingProfile;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

interface DocumentContext {
  topic?: string;
  purpose?: string;
  audience?: string;
  background?: string;
  keyIdeas?: string[];
  constraints?: string[];
}

interface WritingProfile {
  language: string;
  theme: string;
}
```

This is illustrative. `content` should use the TipTap/ProseMirror document representation rather than treating plain text as the canonical format.

The application may derive plain text for search, prompts, indexing, and export, but the structured editor document remains authoritative.

### 5.2 Document State versus Transient UI State

**Persistent document state**

- Text and formatting.
- Context.
- Outline.
- Document-specific writing settings.
- Relevant block identifiers.

**Persistent findings state**

- Finding metadata.
- Anchors.
- Status.
- User decisions.
- Links to generated suggestions where appropriate.

**Transient UI state**

- Current cursor and selection.
- Open panel.
- Search query.
- Active filter.
- Loading indicator.
- In-progress stream.
- Currently focused finding.

Do not save every temporary UI interaction as document data.

### 5.3 Document Revisions

Track document changes sufficiently to determine whether a result still applies.

A monotonically increasing revision counter is a useful starting point. More sophisticated versioning can be added later.

Each analysis request should record which revision it examined. If the document has changed while the request was running, the result must be checked before display or application.

A revision mismatch does not automatically invalidate every result. Some results may still be applicable, but the application must verify that they reference the correct text.

---

## 6. Editor Architecture and Text Anchoring

This is one of the most important technical areas because Connect, paraphrase, grammar, and the findings interface all interact with editor selections.

### 6.1 Do Not Use Raw Character Positions as Permanent IDs

ProseMirror positions shift when text is inserted, deleted, split, or merged. A position such as `from: 120, to: 135` is useful for a current editor transaction but is not a reliable permanent identity.

Use two concepts:

1. A stable identity for a block or node.
2. A current range identifying the text within that block.

For example:

```
interface TextAnchor {
  blockId: string;
  startOffset: number;
  endOffset: number;
  quotedText: string;
  prefix?: string;
  suffix?: string;
  documentRevision: number;
}
```

This is a conceptual anchor. The editor adapter should translate it into current ProseMirror positions when possible.

Stable block IDs should be created and maintained by editor transactions. They must behave sensibly through splitting, merging, deletion, undo, and redo.

### 6.2 Finding and Selection Ranges Are Different

A finding usually represents an observation about an existing passage. A selection for paraphrasing represents an explicit user action at a particular moment.

Do not treat them as interchangeable.

- A selection is short-lived and must be validated before applying a replacement.
- A finding anchor should survive ordinary editing when possible.
- A stale finding may retain its explanation but should not silently apply an obsolete edit.

### 6.3 Applying a Suggestion Safely

Use this sequence:

1. The user chooses a suggestion.
2. The editor integration resolves the target range.
3. The application checks whether the original text still matches.
4. If valid, it applies a single editor transaction.
5. Undo and redo remain available.
6. Related findings are re-evaluated or marked stale when necessary.

If the original text cannot be identified reliably, do not replace a nearby passage merely because it is at a similar position.

### 6.4 Overlapping Findings

Multiple findings can refer to the same passage.

Keep their IDs and statuses independent. Highlighting may visually indicate several findings, but the underlying model should not merge them merely because their ranges overlap.

Selecting the text should reveal the applicable findings and their respective actions.

---

## 7. Outline and Editor Relationships

The outline represents intended structure. The editor contains actual content. A separate relationship maps between them.

### 7.1 Many-to-many Mapping

One outline item may correspond to multiple editor blocks, and one block may contribute to multiple outline items.

```
interface OutlineNode {
  id: string;
  title: string;
  description?: string;
  parentId?: string;
  order: number;
}

interface OutlineBlockLink {
  outlineNodeId: string;
  blockId: string;
  source: "manual" | "template" | "suggested";
}
```

An empty outline item is valid. An unmapped block is valid. The application should not force every paragraph into an outline item.

### 7.2 Separation of Responsibilities

**Outline model**

- Hierarchy.
- Intended order.
- Section titles and descriptions.

**Block-link model**

- Which editor blocks correspond to which outline items.

**Supervisor analysis**

- Whether the content actually fulfills the outline item.
- Whether reasoning is missing.
- Whether content is misplaced or repetitive.

The existence of a block link does not prove that the block satisfies the intended purpose.

### 7.3 Initial Implementation

Start with manual or template-based associations. Add semantic AI-based mapping only if it improves the workflow.

When a block is created, moved, split, or deleted, update its identity and relationships through editor integration logic. AI may suggest associations, but it should not own editor identity management.

---

## 8. AI Request Architecture

Every AI feature should pass through one controlled request pipeline.

```
flowchart TD
    ACTION["User action"]
    TASK["Identify task and constraints"]
    CONTEXT["Collect relevant document context"]
    PROMPT["Build task-specific request"]
    VALIDATE["Validate request"]
    MODEL["AI gateway and provider adapter"]
    PARSE["Parse and validate result"]
    DISPLAY["Display result or finding"]
    APPLY["User accepts suggestion"]
    EDITOR["Safe editor transaction"]

    ACTION --> TASK
    TASK --> CONTEXT
    CONTEXT --> PROMPT
    PROMPT --> VALIDATE
    VALIDATE --> MODEL
    MODEL --> PARSE
    PARSE --> DISPLAY
    DISPLAY --> APPLY
    APPLY --> EDITOR
```

### 8.1 Task Request

Use explicit types for requests instead of allowing every feature to pass arbitrary strings and settings.

```
type WritingTask =
  | "hint"
  | "complete"
  | "continue"
  | "paraphrase"
  | "shorten"
  | "change-tone"
  | "connect"
  | "reader"
  | "supervisor"
  | "researcher"
  | "grammar";
```

This task list is illustrative. The application should distinguish user-facing operations from internal execution steps when their requirements differ.

A task request should contain only the fields relevant to that operation, such as:

- Task type.
- Document ID or authorized document context.
- Relevant passage or selection.
- Context and outline when needed.
- Writing preferences.
- Output requirements.
- Document revision or request version.

Avoid sending the entire document to every task. A paraphrase operation generally needs a selection and surrounding text; Supervisor may need the full document and outline.

### 8.2 Context Service

The context service determines what information an AI operation needs.

It should be responsible for selecting:

- Current selection.
- Nearby paragraphs.
- Full document when necessary.
- Document context.
- Relevant outline items.
- Writing profile.
- Relevant prior findings, when explicitly useful.

This is also where token limits should be considered. Do not blindly concatenate every setting, past response, and document into every request.

### 8.3 Prompt Builder

The prompt builder constructs task-specific instructions using validated application data.

For example, a paraphrase request might require:

- Preserve the meaning.
- Respect the grammatical role of the selection.
- Match the surrounding text and writing style.
- Return three distinct alternatives.
- Return the required structured format.

A Reader request has different requirements: report plausible interpretation issues, without requiring three rewrites.

Do not impose a universal output schema that contradicts individual tasks.

### 8.4 Output Validation

Treat model output as untrusted data, even when it is expected to follow a schema.

Validate:

- Required fields.
- Allowed task output types.
- Alternative count where specified.
- Empty or excessively long responses.
- Valid identifiers and range references.
- Citation fields for research results.

The model must not be allowed to choose arbitrary document IDs or editor ranges and have the application trust them automatically.

---

## 9. AI Provider Abstraction

### 9.1 One Shared Interface

Application code should not depend on provider-specific response objects.

Conceptually:

```
interface WritingModel {
  generateSuggestions(
    request: SuggestionRequest
  ): Promise<Suggestion[]>;

  streamText(
    request: StreamingRequest
  ): AsyncIterable<StreamEvent>;
}
```

The interface may change based on actual provider capabilities. Structured analysis and streamed free text may need separate methods.

### 9.2 Provider Adapters

Each adapter handles:

- API request formatting.
- Authentication.
- Model-specific parameters.
- Streaming event translation.
- Response parsing.
- Error normalization.
- Timeouts and supported cancellation.
- Provider capability differences.

The rest of Byline should use application-level request types.

### 9.3 Streaming Contract

Normalize provider streaming into a small set of application events, such as:

```
type StreamEvent =
  | { type: "started" }
  | { type: "text_delta"; text: string }
  | { type: "completed" }
  | { type: "error"; message: string };
```

Additional event types can be added for structured alternatives or analysis progress when justified.

For structured responses, prefer supported structured output or parse and validate after completion. Do not display incomplete JSON as though it were valid application data.

### 9.4 Provider Capabilities

Represent relevant capabilities explicitly where they affect behavior:

- Streaming.
- Structured output.
- Prompt caching.
- Maximum input and output sizes.
- Cancellation support.
- Available model features.

Do not assume every provider supports the same capabilities simply because they expose a similar API.

The actual provider and model choice should follow a separate verification step covering availability, latency, pricing, caching, data handling, and hackathon requirements.

---

## 10. Streaming, Cancellation, and Stale Results

### 10.1 Streaming Lifecycle

A streamed suggestion moves through these conceptual states:

```
idle → requesting → streaming → completed
                    ↘ error
                    ↘ cancelled
```

Keep streamed output separate from committed document text until acceptance.

For a paraphrase request, progressively display alternatives when the provider and output format allow it. Otherwise, stream a brief introductory status and render the validated alternatives together after completion.

### 10.2 Request Identity

Each request needs an identifier that ties its results to the initiating action and relevant document revision.

This helps prevent an old response from replacing a newer result.

### 10.3 Cancellation

Cancel requests when appropriate:

- The user explicitly cancels.
- The user starts a replacement request.
- The target document is closed.
- A selection-based request becomes irrelevant.

Use cancellation support from the frontend and propagate it to the server and provider when available.

Cancellation does not guarantee that a provider has stopped processing or that no charge was incurred. Handle that according to the provider's behavior.

### 10.4 Stale-result Handling

Before applying or presenting a result, verify that it still corresponds to the relevant text and state.

A completed request is not automatically a current request. The user may have edited the selection while the model was generating the result.

---

## 11. Trigger and Execution Policy

Each feature needs a deliberate trigger policy.

|Feature|Trigger|Initial computation|
|---|---|---|
|Basic spelling|Typing with debounce|Local/deterministic|
|Contextual grammar correction|Detection or user action|On demand|
|Draft assistance|Explicit user request|AI streaming|
|Static Connect patterns|Open, search, or filter|Local|
|AI Connect|Explicit request|AI|
|Paraphrase|Text selection and user action|AI|
|Reader|Manual activation or carefully chosen conservative trigger|Whole-text AI analysis|
|Supervisor|Explicit activation|Whole-document analysis|
|Researcher|Explicit research action|Search and evidence workflow|
|Outline structure checks|Structural editor changes|Local/deterministic|
|Semantic outline mapping|Request or relevant structural change|AI when needed|
|Export|User action|Local where practical|

Do not confuse an active editing session with a reason to continuously run language models.

Debouncing may reduce redundant local checks, but it is not a substitute for defining the correct trigger.

---

## 12. Unified Findings Architecture

The findings list combines results from Grammar, Reader, Supervisor, and Researcher.

### 12.1 Shared Finding Model

```
type Persona =
  | "grammar"
  | "reader"
  | "supervisor"
  | "researcher";

type FindingStatus =
  | "open"
  | "resolved"
  | "dismissed"
  | "stale";

interface Finding {
  id: string;
  documentId: string;
  persona: Persona;
  kind: string;
  anchor: TextAnchor;
  explanation: string;
  suggestions: Suggestion[];
  status: FindingStatus;
  sourceRevision: number;
}

interface Suggestion {
  id: string;
  text: string;
  rationale?: string;
}
```

This is a starting domain model rather than a frozen schema. Research findings may also need structured evidence and source references.

### 12.2 Shared Interface, Independent Analysis

The shared findings system manages:

- Identity.
- Anchors.
- Status.
- Filtering and search.
- Navigation.
- Suggestion display.
- User decisions.

Each persona manages its own analysis logic and output.

This keeps the UI consistent without forcing all four personas to use the same prompting or execution strategy.

### 12.3 Finding Lifecycle

A finding may be:

- Open.
- Resolved.
- Dismissed.
- Stale because the underlying text or context changed.

When one finding is resolved, other findings remain independent unless their own state is updated explicitly.

Regenerating alternatives should regenerate only the relevant finding's alternatives, not rerun the entire document analysis.

---

## 13. Individual Feature Architecture

Each major feature has its own application service, using shared infrastructure where appropriate.

### 13.1 Draft Assistance

Responsibilities:

- Obtain cursor context.
- Select the requested continuation type.
- Construct the appropriate request.
- Stream the result.
- Present alternatives or continuation.
- Apply accepted output through an editor transaction.

It should not run document-wide analysis.

### 13.2 Connect

Separate its two implementation paths.

**Pattern library**

- Static or bundled pattern data.
- Search and filtering.
- Category metadata.
- Template insertion at the cursor.

**AI inference**

- Context collection.
- Relationship inference.
- Candidate pattern or continuation generation.
- Validation and display.

This separation means Connect remains useful if the AI provider is unavailable.

### 13.3 Paraphrase

Responsibilities:

- Capture the selected text.
- Record a safe selection anchor and relevant revision.
- Obtain surrounding context.
- Generate three alternatives.
- Display alternatives progressively or after validation.
- Verify the selection before applying a replacement.

The AI should return alternative wording, not decide the document position.

### 13.4 Grammar

Responsibilities:

- Integrate a deterministic language-checking engine.
- Convert detected issues into findings or corrections.
- Display language-related underlines.
- Offer safe replacements.
- Invoke AI only for corrections that require more contextual reasoning.

Keep the basic correction path independent of model availability.

### 13.5 Reader

Responsibilities:

- Collect the appropriate document text.
- Analyze clarity, ambiguity, and likely reader interpretation.
- Generate observations.
- Attach observations to anchored text where possible.
- Store findings without automatically correcting text.

### 13.6 Supervisor

Responsibilities:

- Collect document text, context, and outline.
- Evaluate structural and reasoning issues.
- Detect relevant opportunities for improvement.
- Create findings with useful alternatives.
- Identify potential outline gaps and repetition.

Separate deterministic structural checks from model-based semantic analysis.

### 13.7 Researcher

Researcher is more complex than a single text-generation request.

Its workflow can be modeled as:

```
Research request
    ↓
Extract claims needing verification
    ↓
Search for sources
    ↓
Retrieve and parse relevant content
    ↓
Evaluate evidence and source quality
    ↓
Compare evidence with each claim
    ↓
Validate citations and conclusions
    ↓
Return findings
```

Use existing search and retrieval capabilities where possible rather than immediately building a custom crawler.

The workflow must distinguish supported, contradicted, and unverified claims. Search-result similarity is not sufficient evidence of correctness.

The system must also preserve source URLs and relevant evidence so the UI can expose the basis for each finding.

---

## 14. Setup Wizard Architecture

The wizard produces document configuration. It should not become a separate source of truth.

### 14.1 Setup Flow

```
Quick survey
    ↓
Interpret document type, purpose, audience, and topic
    ↓
Choose a suitable template
    ↓
Prepare editable context and outline
    ↓
Validate and save document configuration
    ↓
Open editor
```

### 14.2 Template Representation

A template should contain structured data, not a large hardcoded prompt.

```
interface DocumentTemplate {
  id: string;
  name: string;
  supportedTypes: string[];
  defaultOutline: OutlineNode[];
  contextPrompts?: string[];
}
```

The template provides a starting structure. The user's answers customize it, and the resulting document configuration persists independently of the template.

### 14.3 First Implementation

Use static templates initially.

This allows the team to evaluate the setup flow without coupling the first editor experience to another AI call.

AI-assisted outline generation and context refinement can be added later if testing demonstrates that static templates are insufficient.

### 14.4 Optional Answers

A missing audience or incomplete outline should not prevent the user from starting to write.

The context service should tolerate optional fields and include only relevant information in each request.

---

## 15. Prompt Caching and Response Caching

These are separate mechanisms and should be treated separately.

### 15.1 Prompt Caching

Prompt caching reuses computation for repeated prompt prefixes when the provider supports it.

Organize requests so their stable portions precede changing document text.

Typical stable prefix:

- Core instructions.
- Task-specific instructions.
- Stable output schema.
- Stable document settings where applicable.

Changing portion:

- Selection.
- Nearby text.
- Current instruction.
- Current document content.

The request must still provide the relevant context. A cache hit does not mean the model automatically knows about edits or changed settings.

### 15.2 Response Caching

Response caching reuses completed outputs for equivalent requests.

Treat this cautiously. Text, context, and user instructions frequently change, so caching paraphrases and document analysis may offer limited benefits.

Do not cache personalized outputs solely because the task type and selected word are identical. Meaning depends on surrounding context and task settings.

### 15.3 Initial Priority

Optimize request structure and stream useful output first. Measure actual latency and cost before adding complex caching strategies.

---

## 16. Persistence and Data Ownership

The architecture should not prematurely commit to a large persistence system, but the ownership of data must be clear.

### 16.1 Initial Experiments

Individual feature experiments may use:

- Local component state.
- A simple document fixture.
- Mock findings.
- Static pattern data.
- A minimal test server.

Do not build full authentication and cloud synchronization solely to test whether a suggestion interaction works.

### 16.2 Integrated MVP

Choose a persistence approach based on the actual product requirements.

The integrated MVP needs a dependable way to save:

- Document text and formatting.
- Context.
- Outline.
- Writing preferences.
- Findings where appropriate.

For a local single-user prototype, browser persistence may be sufficient. For authenticated, cross-device use, a database and server-side document access are needed.

A persistence adapter can isolate storage choices without building a universal storage framework.

### 16.3 Document Changes versus Generated Data

Accepted edits change the canonical document.

Generated suggestions and findings are derived data associated with a document revision. They should not silently mutate canonical document state.

The system should be able to invalidate or refresh derived data when its assumptions become outdated.

---

## 17. Error Handling and Security

### 17.1 Error Categories

Distinguish errors such as:

- Invalid request.
- Authentication or permission failure.
- Provider timeout.
- Provider rate limit.
- Malformed model output.
- Research source unavailable.
- Document revision conflict.
- Invalid or stale editor anchor.
- Cancellation.

The UI should provide meaningful recovery actions without exposing internal provider diagnostics.

### 17.2 Security Requirements

- Keep API credentials server-side.
- Validate requests before provider calls.
- Enforce document access checks server-side when user accounts are introduced.
- Apply limits to expensive analysis and research requests.
- Treat document text and retrieved web content as untrusted input.
- Do not allow instructions embedded in a document or webpage to override the task's system-level rules.
- Avoid logging complete private documents by default.
- Do not expose internal prompts, credentials, or raw provider error payloads to end users.

### 17.3 Research-specific Safeguards

Retrieved content should be treated as evidence to evaluate, not executable instructions.

The research pipeline must not follow instructions found in retrieved pages or allow an external page to authorize unrelated tool actions.

---

## 18. Testing Architecture

Test responsibilities at several levels.

### 18.1 Unit Tests

Test pure logic:

- Document configuration.
- Template selection.
- Finding filtering.
- Output validation.
- Request construction.
- Theme configuration.
- Status transitions.

These should not need a live model provider.

### 18.2 Editor Integration Tests

Test:

- Creating blocks and assigning IDs.
- Selection tracking.
- Applying replacements.
- Undo and redo.
- Block split and merge behavior.
- Finding anchor updates.
- Overlapping findings.
- Stale selection handling.

These tests are especially important because many product features depend on safe editing.

### 18.3 Service Tests

Use mocked provider adapters to test:

- Context collection.
- Prompt construction.
- Streaming event handling.
- Cancellation.
- Malformed output.
- Provider failure.
- Document changes during requests.

### 18.4 Provider Integration Tests

Use a small number of real requests to verify:

- Authentication.
- Model availability.
- Streaming behavior.
- Structured responses.
- Error translation.
- Relevant latency and cost.

Do not make the entire test suite depend on live AI calls.

### 18.5 End-to-end Tests

Test complete user journeys:

- Create a document.
- Prepare its context and outline.
- Request a suggestion.
- Accept it.
- Select text and paraphrase it.
- Inspect a finding.
- Resolve a finding.
- Export the document.

---

## 19. Technical Development Phases

The original development strategy remains unchanged: experiment with each concept independently, integrate the strongest features into the MVP, and add capabilities incrementally.

### Phase 0 — Foundation

Build:

- Repository structure.
- Core TypeScript types.
- Document state.
- TipTap editor integration.
- Basic persistence boundary.
- Server request boundary.
- AI provider interface.
- One working streaming request.
- Minimal validation and error handling.

**Exit condition:** A user can request a suggestion, see it stream, accept it, and undo the edit without corrupting the document.

### Phase 1 — Isolated Technical Experiments

Each feature receives a small implementation with a clear success criterion.

|Experiment|Technical focus|Main question|
|---|---|---|
|Draft assistance|Cursor context and streaming|Can Byline suggest useful continuations quickly?|
|Static Connect|Pattern data and search|Are reusable connective patterns useful?|
|AI Connect|Contextual inference|Can AI infer appropriate relationships?|
|Paraphrase|Selection anchors and replacements|Can alternatives preserve meaning and apply safely?|
|Findings UI|Annotation state and navigation|Can one list handle multiple independent findings?|
|Grammar|Language engine integration|Can basic errors be detected reliably?|
|Reader|Whole-text analysis|Can the model identify plausible reader problems?|
|Supervisor|Outline-aware analysis|Can the model identify useful structural improvements?|
|Researcher|Retrieval and evidence evaluation|Can source-backed findings be produced reliably?|
|Setup|Template and configuration flow|Does setup improve results without excessive friction?|

Use mocked outputs where possible to isolate interaction and state-management problems from model quality.

**Exit condition:** Each experiment has a working proof of concept, a defined limitation, and an explicit decision to integrate, redesign, defer, or discard it.

### Phase 2 — Integrated MVP

Integrate:

1. Document editor and essential persistence.
2. Quick setup wizard.
3. Editable context and outline.
4. Streaming draft assistance.
5. Static Connect library.
6. Selection-based paraphrase.
7. Unified findings interface.
8. Basic grammar checks.
9. Safe suggestion acceptance and undo.
10. Basic export.

Use mocked or limited findings when necessary. Do not delay the MVP until every advanced persona is complete.

**Exit condition:** A writer can move from setup to drafting, local revision, and basic document review in one coherent workspace.

### Phase 3 — Feature Expansion

Add one substantial capability at a time:

1. Contextual AI Connect.
2. Improved finding search and filtering.
3. Reader.
4. Supervisor.
5. Outline-to-editor linking.
6. Researcher.
7. Advanced grammar support.
8. Additional themes and customization.
9. Better document management and export.

Reprioritize based on testing results and demonstrated user value.

### Phase 4 — Reliability and Optimization

Improve:

- Streaming responsiveness.
- Cancellation.
- Token and cost efficiency.
- Provider error recovery.
- Stale findings.
- Long-document handling.
- Research citation accuracy.
- Performance during rapid editing.
- Security and data handling.

Optimization should follow measurement rather than assumptions about which subsystem is slow.

---

## 20. Architecture Decisions to Record

Use short Architecture Decision Records (ADRs) for choices that affect several modules.

Initial decisions to record:

**ADR 001 — Application structure**

- Decision: modular monolith.
- Reason: shared document and AI infrastructure do not justify distributed services.

**ADR 002 — Canonical editor state**

- Decision: TipTap/ProseMirror document structure.
- Reason: formatting, selections, transactions, and undo history require structured editor state.

**ADR 003 — Document editing authority**

- Decision: editor integration owns the application of text changes.
- Reason: AI output must not mutate document text directly.

**ADR 004 — Finding identity**

- Decision: findings have independent IDs and revision-aware text anchors.
- Reason: findings may overlap and remain independently actionable.

**ADR 005 — AI integration**

- Decision: application-level interfaces with provider adapters.
- Reason: provider details should not spread through feature modules.

**ADR 006 — Execution policy**

- Decision: explicit triggers for expensive AI operations.
- Reason: continuous typing must not cause continuous document analysis.

**ADR 007 — Template-first setup**

- Decision: begin with static templates and editable document configuration.
- Reason: validate the setup interaction without requiring another AI operation.

**ADR 008 — Incremental feature development**

- Decision: isolate the core concept, evaluate it, then integrate.
- Reason: prevent speculative features from complicating the MVP.

Record future changes when evidence justifies them rather than treating these decisions as permanent.

---

## 21. Immediate Implementation Order

Begin with the following concrete sequence:

1. **Define the document and editor state.** Establish how text, blocks, selections, revisions, context, and outline are represented.
2. **Build one safe suggestion path.** Request, stream, display, accept, and undo a continuation.
3. **Separate application services from model providers.** Ensure the UI never needs provider-specific code.
4. **Build the static Connect experiment.** Test category browsing, search, and insertion without AI.
5. **Build selection-based paraphrase.** Validate text anchors and safe replacements.
6. **Build the findings interface with mock data.** Solve highlighting, navigation, search, filters, and overlapping findings independently.
7. **Build the quick setup flow.** Persist the resulting context and outline on the document.
8. **Integrate the MVP.** Use the same document and state model across all features.
9. **Add analysis personas progressively.** Introduce Reader, Supervisor, and Researcher only after the shared findings infrastructure is dependable.
10. **Measure and refine.** Test with real writers, then optimize the workflows that demonstrably need improvement.

## Final Architecture Rule

Byline should have a small number of authoritative state models, a shared request pipeline, and independent feature services.

The editor owns document changes. The domain owns application concepts. Services coordinate tasks. Adapters handle external systems. The UI presents the results.

**Do not make the codebase mirror the complexity of AI. Make it mirror the concepts of writing.**