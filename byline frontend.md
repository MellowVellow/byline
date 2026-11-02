# BYLINE — FRONTEND SKELETON

## 1. Objective

Build the shared application shell first. Each mode must use the same navigation, library, visual language, and layout system.  
keep the aesthetic of the current commit, but I am rehauling the concepts
- **Explore** — Find what you can write about.
- **Draft** — Find words to write with.
- **Edit** — Find gaps in your words.

This is a frontend implementation task. Use mock data and local state where backend functionality is not available.

Do not build the backend or implement real AI inference.

Use the existing project stack, design, code.

Use modular components. Avoid putting the entire application in one component.

use these html files in the main dir  
for ghost text timed rules, ghost feel test  
for ghost text sentence state rules, completion state tesst  
for explore mode and library, explore mode feel test  
for grammar autocomplete, harper feel test  
for initial website open / loading screen, b loading

for a loading loop animation , the colors is a gradient of the 4 colors

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ LOGO       Explore   Draft   Edit           Export  Metrics │
├────┬───────────────────────────────────────────────┬────────┤
│    │                                               │        │
│ L  │                                               │ RIGHT  │
│ I  │              MAIN WORKSPACE                  │  DOCK  │
│ B  │                                               │        │
│ R  │                                               │        │
│ A  │                                               │        │
│ R  │                                               │        │
│ Y  │                                               │        │
│    │                                               │        │
│    │                                               │        │
├────┤                                               │        │
│ ⚙  │                                               │        │
│ 👤 │                                               │        │
└────┴───────────────────────────────────────────────┴────────┘
```

Use flexible widths. The central workspace must receive most of the available screen space.

The left and right docks must be collapsible into icons

main workspace is the activem ode from the explore/draft/edit mode

## 5. Left Dock — Library

The left dock is persistent across all modes.

It contains the user's explore history, similar to CHATGPT, Claude chat history.

### Bottom Section

Include:
- Settings
- Profile

### Interaction Requirements

- Expand and collapse the dock.
- Show tooltips when collapsed.
- Highlight the active selection.
- Support empty states.
- Use mock library entries.

## 6. Explore Mode

**Purpose: Find what you can write about.**  
Explore should resemble a research workspace.

### Initial State

Display a central input area.

Example:

```
What would you like to explore?

[ Does AI reduce creativity?                         ]

                         [ Explore ]
```

Include a small source-preferences control.

### Research State

After submission, show a research progress interface.

Example:

```
Exploring: Does AI reduce creativity?

✓ Searching for sources
✓ Reading relevant material
● Extracting findings
○ Organising results
```

Use simulated progress. Do not require a real search API.

### Results State

Display research results in a structured table.

However, it shows the parsed results beside the chat response:
- doucments
- sources
- ideas
- concepts & terminology

Example:

|Type|Finding|Source|
|---|---|---|
|Fact|AI tools can reduce the time required to generate initial ideas.|Study A|
|Argument|AI can increase creative productivity.|Article B|
|Counterargument|Dependence on generated suggestions may reduce independent exploration.|Study C|
|Terminology|Cognitive offloading|Source D|
|Idea|AI may change how creative effort is distributed.|Derived idea|

Use realistic mock content.

Each result should be selectable.

Selecting a result opens its details in the right dock.

### Source Details

Display:

- Title
- Author
- Publication date
- Source type
- URL placeholder
- **Relevant passage**
- **Why it matters**
- **Save to Library action**

Clearly distinguish source material from AI-generated interpretations.

## 7. Draft Mode

**Purpose: Find words to write with.**

This is the primary writing workspace.

### Layout

```
┌──────────────────────────────────────────────────────┐
│ Document title                                       │
├──────────────────────────────────────────────────────┤
│ Context                                              │
│ [ What am I writing about?                           │
│   Who is the audience?                               │
│   What should I achieve? ]                            │
├──────────────────────────────────────────────────────┤
│                                                      │
│                                                      │
│                    TIPTAP EDITOR                     │
│                                                      │
│                                                      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Context Input

Place a context input above the editor. It is a plain paragraph input box  
it contains the question tooltip “What … Who… What…”

### Editor

Use TipTap v3.

Include:

- Document title
- Editable writing area
- Basic formatting toolbar
- Text selection
- Cursor interaction
- Word count

Use realistic sample writing.

### Writing Suggestions (!!!!!)

Create a mock suggestion interface.

The suggestion should appear near the writing area or cursor.

Example:

```
However, the impact of AI depends on | <the way people use it during the creative process.>
[ Accept tab ] [ Reroll alt ]
```

Support these suggestion types:

- Hint
- Question
- Phrase
- Sentence completion
- Transition  
insert ghost text

### Selection Actions

When text is selected, show a contextual toolbar.

```

Unfortunately we <wasted too much time>

<procrastinated>

[ Accept tab ] [reroll alt]
```
compact UI, no space, full focus on the suggestions and buttons

the prompt itself searches for variants: synonym, paraphrase, shroten, tone: It will return a paragraph and we will parse it ourselfs (comma delimiter)

Example google search:  
**Squander**, **fritter away**, **dally**, **dawdle**, **procrastinate**, **idle away**, **lollygag**, **loaf**, **while away**, **burn daylight**, **kill time**, **spin one's wheels**, **drag one's feet**, **twiddle one's thumbs**, **goof off**, **laze around**, **dilly-dally**, **linger**, **loiter**, **shilly-shally**, **fool around**, **mess around**, **loaf around**, **veg out**, **hang around**, **loll**, **piddle**, **fiddle about**, **put off**, **stall**, **temporize**, **tarry**, **lose time**, **waste time**, **be dilatory**, **play for time**

For the _noun_ sense (the time itself was wasted): **waste of time**, **wild goose chase**, **fool's errand**, **time sink**, **lost time**, **missed opportunity**, **sunk cost**, **fruitless activity**, **vain attempt**, **bootless errand**, **snipe hunt**, **red herring**, **lost cause**, **boondoggle**

A few concise paraphrases of _"For a single strong word closest to"_:

- **"For one apt word for"**
- **"In a single word, what best captures"**
- **"For a single precise word nearest"**
- **"For one strong word approximating"**

| Synonyms       | Paraphrase          | Tone          |     |
| -------------- | ------------------- | ------------- | --- |
| procrastinated | wasted for too long | dilly-dallyed |     |

The user must choose whether to apply an alternative.

### Harper.js Backend Mix

Harper.js basic grammar auto complete

## 8. Edit Mode

**Purpose: Find gaps in your words.**

Edit uses the same document editor as Draft.

The main difference is it opens the right dock: the Reader interface.

### Reader Annotations

Use purple underlines to mark passages with Reader comments.

Clicking an underline shows a popup below the cursor of the corresponding comment, and jump the right dock interface to the corresponding reader comment card

### Right Dock — Reader

Display a list of natural-language comments. Include on the top
- Filter comments button.
- search comments field

Example:

```
READER

"AI improves creativity because it
makes the process faster."

────────────────────────

How does making the process faster relate to improving creativity?

────────────────────────

Dismiss, resolve

```

Reader comments must:

- Refer to specific passages.
- Explain why something deserves attention.
- Use natural language.

Use mock comments.

## 9. Annotation System

Implement a shared visual annotation system.

Use these colours consistently:

|Colour|Meaning|
|---|---|
|Red|Grammar and spelling|
|Purple|Reader comments|
|Blue|Relevant research|
|Yellow|Selected text|

### Behaviour

- Red underlines represent grammar findings.
- Purple underlines represent Reader comments.
- Blue underlines represent relevant research.
- Yellow represents the user's current selection.

Annotations must not permanently alter the document text.

Use TipTap decorations or ProseMirror decorations.

Create a reusable annotation component and a consistent interaction system.

For the skeleton, use mock annotation data.

## 10. Mode Settings

Each mode has its own settings dropdown.

### Explore

- Source preferences
- Search scope
- Result organisation

### Draft

- Suggestion behaviour
- Suggestion frequency
- Writing preferences

### Edit

- Reader sensitivity
- Review scope
- Comment visibility

Use simple popovers.

Do not build complex settings pages.

## 11. Export and Metrics

### Export

Create a modal with placeholder options:

- Export as PDF
- Export as DOCX
- Export as Markdown

Actual export functionality is not required for this skeleton.

### Metrics

Create a small popover or panel showing:

- model token speed
- model end-end response speed
- model error rate

## 12. Visual Direction

Byline keeps its current visuals

### Design Principles

- Minimal.
- Clean.
- Quiet.
- Spacious.
- Editorial.
- Functional.

## 13. Component Architecture

Suggested structure:

```
src/
├── app/
│   ├── App.tsx
│   ├── AppShell.tsx
│   └── routes.ts
│
├── components/
│   ├── navbar/
│   │   ├── Navbar.tsx
│   │   ├── ModeSelector.tsx
│   │   └── ModeSettings.tsx
│   │
│   ├── sidebar/
│   │   ├── LeftDock.tsx
│   │   ├── Library.tsx
│   │   └── RightDock.tsx
│   │
│   ├── editor/
│   │   ├── Editor.tsx
│   │   ├── EditorToolbar.tsx
│   │   ├── ContextInput.tsx
│   │   ├── SuggestionPopup.tsx
│   │   └── SelectionToolbar.tsx
│   │
│   ├── annotations/
│   │   ├── AnnotationLayer.tsx
│   │   └── AnnotationCard.tsx
│   │
│   └── ui/
│       ├── Button.tsx
│       ├── Modal.tsx
│       ├── Popover.tsx
│       └── Tooltip.tsx
│
├── modes/
│   ├── explore/
│   │   ├── ExploreView.tsx
│   │   ├── ExploreInput.tsx
│   │   ├── ResearchProgress.tsx
│   │   ├── ResearchResults.tsx
│   │   └── SourceDetails.tsx
│   │
│   ├── draft/
│   │   └── DraftView.tsx
│   │
│   └── edit/
│       ├── EditView.tsx
│       └── ReaderPanel.tsx
│
├── data/
│   ├── mockDocuments.ts
│   ├── mockLibrary.ts
│   ├── mockResearch.ts
│   └── mockComments.ts
│
├── hooks/
├── types/
├── styles/
└── main.tsx
```

This is a suggested structure. Adjust it to match the existing codebase.

Do not create unnecessary abstractions.

## 14. Application State

Use shared application state for:

- Active mode
- Active document
- Left dock visibility
- Right dock visibility
- Selected library item
- Selected annotation
- Active modal
- Theme

Keep mode-specific state separate.

Use local state or a lightweight existing state solution.

Do not introduce a large state-management library for this task.

## 15. Responsive Behaviour

Desktop is the primary target.

At smaller widths:

- Left dock can collapse.
- Right dock can collapse.
- Navbar remains usable.
- Editor receives priority.
- Panels must not overlap the writing area.

Create a seperate layout for mobile

## 16. Skeleton Must Be Functional Frontend

The following interactions must work:

1. Switch between Explore, Draft, and Edit.
2. Open and close both docks.
3. Select library items.
4. Open mode settings.
5. Submit an Explore query and display simulated research progress.
6. Select research results and inspect source details.
7. Edit text in the TipTap editor.
8. Open suggestion controls.
9. Accept or reroll a mock suggestion.
10. Select text and open alternative actions.
11. Click purple, red, and blue annotations.
12. Open, resolve, and dismiss Reader comments.
13. Open Export and Metrics.
14. Maintain the active document when switching modes.

All interactions must provide visible feedback.

## 17. What Not to Build

Do not implement:
- Real web search.
- Real research agents.
- User authentication.

Use mock data and local state.

Keep the code ready for future API integration.

## 18. Definition of Done

The task is complete when:

- The application has one unified shell.
- All three modes are accessible.
- The left and right docks work.
- The Explore workspace has input, progress, results, and source details.
- The Draft workspace has a functional TipTap editor.
- The Edit workspace has Reader comments and annotations.
- Shared navigation and document state work.
- The visual design is consistent.
- No major layout breaks occur at desktop resolution.
- No major buttons are decorative or non-functional.
- The project builds without TypeScript errors.
- The browser console has no major runtime errors.

## Final Instruction

Prioritise MVP features  
Do not spend time perfecting one isolated component while other modes remain empty.  
Use realistic mock content. Make the application feel usable from the first launch.  
Do not invent additional product features. Follow this specification. Ask follow ups if additional technical details that are not discussed must be implemented