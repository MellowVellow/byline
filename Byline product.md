# Byline — Brand, Pitch, Demo, Storytelling, Documentation, Socials & Testing Strategy

> **Note:** Reconciled with Byline v2 codebase (FastAPI + React 19/TipTap 3 + Meta w/ OpenRouter).
> Authoritative active document: [docs/plans/STRATEGY_AND_PRESENTATION.md](./docs/plans/STRATEGY_AND_PRESENTATION.md)

## 1. Strategic Objective

Byline needs more than a working application. It needs a clear identity, a convincing reason to exist, visible evidence that it works, and a story that people can understand quickly.

These elements should reinforce each other:

- **Brand:** What Byline stands for.
- **Pitch:** Why the problem matters and why this solution is different.
- **Demo:** Proof that the proposed solution actually works.
- **Stories:** The human situations that make the problem understandable.
- **Inspiration:** The principles that guide product decisions and creative direction.
- **Documentation:** Evidence of what was built and how it works.
- **Socials and posting:** How people discover the project and follow its progress.
- **Testing:** Whether the product is useful to people besides its builder.

The objective is not to create a large marketing operation during a short hackathon. It is to make every public-facing asset support the same product story.

### Strategic Priority

1. Make the product work.
2. Identify the clearest use case.
3. Validate that use case with real writers.
4. Build one memorable demo.
5. Communicate the result consistently.
6. Publish supporting documentation.
7. Submit early enough to recover from problems.

Marketing must not become a substitute for product development, and product development must not consume all the time needed to demonstrate the result.

---

## 2. Audience and Positioning

### 2.1 Start with One Audience

The broader vision for Byline can eventually serve many types of writers, but the hackathon story should begin with a specific audience.

**Initial audience: students and other people who do substantial writing themselves.**

Examples include students writing essays and reports, people preparing articles, and knowledge workers developing explanations or arguments.

This audience is a practical starting point because:

- Writing is a recurring activity.
- The difference between expressing an idea and generating a finished answer is easy to demonstrate.
- Users can test the product using realistic writing tasks.
- The builder can recruit an initial usability sample from a university community.

Do not claim that all students experience the same problem. Use the initial audience as a hypothesis to validate.

### 2.2 Define the Problem

The problem is not simply that writing is difficult or that existing AI writing tools produce bad prose.

The more specific problem is this:

**Sometimes writers know what they want to say, but need help finding the words, connecting ideas, or understanding whether their writing communicates what they intend. A complete AI-generated draft is not always the help they need.**

A writer might need:

- A better phrase for one selected passage.
- A way to express contrast between two ideas.
- A prompt that helps develop an unfinished thought.
- Feedback about how a paragraph might be understood.
- An explanation of what is missing from an argument.

These are smaller, situated interventions within the act of writing.

### 2.3 Positioning Statement

Working positioning:

> Byline is a writer-controlled AI writing workspace that helps people express their ideas, connect their thoughts, and improve their writing without handing the entire draft to AI.

This differentiates Byline from two broad alternatives:

**Generic AI chat**

- Often starts with a prompt and produces a separate response.
- Requires the writer to manage context and move text back into the document.
- Can encourage the writer to request complete passages instead of developing their own.

**Conventional proofreading**

- Focuses heavily on errors and corrections.
- Does not necessarily help the writer develop or connect an idea.

Byline aims to sit within the writing process: the user works in the document, requests local assistance, examines the result, and decides what to keep.

These are positioning distinctions, not claims that every competing product lacks these capabilities.

### 2.4 Core Product Promise

**Get help with the part you're struggling to write, without giving up authorship of the whole piece.**

The product should demonstrate this promise through actual interaction:

- AI works with the current selection or relevant context.
- Multiple alternatives remain available.
- The original text is not replaced without acceptance.
- Different actions perform different jobs.
- The writer remains in control of the document.

Do not rely exclusively on abstract claims such as “preserves your voice.” Show how the product preserves agency.

---

## 3. Brand Strategy

### 3.1 Brand Idea

The central brand idea is **writing with assistance, not writing on autopilot.**

Byline should feel like a thoughtful writing environment, not an AI content factory or a chatbot with a document editor attached.

The writer is the author. AI is a collaborator that helps the writer make progress.

### 3.2 Working Tagline

Primary candidate:

**Write what you mean. Find your way forward.**

Alternative:

**Where thoughts find words.**

The first is more explicit about the product's function. The second is more evocative and memorable but less explanatory.

Use one tagline consistently across the landing page, project description, pitch, and social profile. Do not cycle through taglines every day.

### 3.3 Brand Attributes

Byline should be:

- **Thoughtful:** Understand the task before offering a suggestion.
- **Precise:** Give a specific, useful alternative rather than generic advice.
- **Restrained:** Do not constantly interrupt the writer.
- **Respectful:** The writer retains ownership and makes the final decision.
- **Clear:** Explain findings without unnecessary technical language.
- **Curious:** Help explore ways of expressing an idea, rather than insisting on one correct phrasing.

### 3.4 Voice and Language

Use plain, direct language. Avoid inflated claims, generic AI marketing phrases, and excessive personification.

Prefer:

- “Try another way to express this.”
- “Connect these two ideas.”
- “This passage may be ambiguous.”
- “Your outline has a section without supporting content.”
- “Here are three alternatives.”

Avoid:

- “Revolutionize the future of writing.”
- “Unlock limitless creativity.”
- “Your revolutionary AI co-pilot.”
- “Perfect writing, instantly.”
- “The world's most intelligent writing assistant.”

The product should feel more thoughtful than its marketing.

### 3.5 Visual Identity

The interface already uses four distinct colors to identify finding personas:

- Red: Grammar.
- Purple: Reader.
- Yellow: Supervisor.
- Blue: Researcher.
- Gray: Suggested alternatives and actions, not a fifth persona.

Treat these as functional annotations, not necessarily as the entire brand palette.

The overall brand can use a restrained neutral palette, with accent colors employed only when they communicate meaningful information.

A promising logo direction is a **solid-to-dotted line**: solid on one side and progressively dotted on the other. It represents the writer's existing words and the suggestions that extend them.

A simple byline-style horizontal rule is another viable direction.

The brand does not need a complex logo, elaborate illustration system, or a fully designed marketing website for the hackathon. It needs recognizable, consistent presentation across the app, README, and demo.

### 3.6 Naming Risk

The name _Byline_ already appears in multiple adjacent writing products. Examples include:

- [Byline.works](https://www.byline.works/), a collaborative writing workspace.
- [Byline Docs](https://bylinedocs.com/), an AI-assisted writing platform for education.
- [Byline.fyi](https://byline.fyi/), a writing-voice and brand-memory product.

This creates a potential discoverability and confusion problem. It does not by itself establish trademark infringement, and this research is not a full legal clearance.

Immediate action:

1. Search exact-name and related-name usage.
2. Check domain and social-handle availability.
3. Check relevant trademark databases before making a long-term commitment.
4. Decide whether to retain the name with a distinct descriptor or choose a more distinctive name.

Do not let the naming question block the current prototype. For the hackathon, a descriptive identity such as “Byline — a writer-controlled AI workspace” is more useful than a week spent cycling through names. Revisit the final choice before a public launch.

---

## 4. The Central Story

Every presentation should communicate the same transformation.

### 4.1 The Narrative

**The problem:** A writer is trying to express an idea. They know what they mean, but cannot find the right wording or connection.

**The limitation:** A complete AI-generated paragraph may solve the immediate blank-page problem while taking over more of the writing than necessary.

**The insight:** Many writing problems are local. A writer may need one phrase, one connection, one explanation, or one useful observation—not a ghostwriter.

**The solution:** Byline places assistance within the writing process. The writer requests help for the current task, sees alternatives, and decides which ideas enter the document.

**The proof:** Demonstrate a real writing task, show the model's response, accept an alternative, and show that the writer retains control.

**The future:** The same workspace can extend from expression to document reflection: understanding readers, reviewing structure, and supporting claims with evidence.

### 4.2 The Product's Three-part Model

Use the same three concepts throughout the product story.

**Intent → Expression → Reflection**

- **Intent:** What am I trying to accomplish? Context, purpose, audience, and outline.
- **Expression:** How can I say this? Draft assistance, Connect, and paraphrase.
- **Reflection:** How well does the writing accomplish its purpose? Grammar, Reader, Supervisor, and Researcher findings.

This is both a product architecture and a storytelling device. It helps explain why the features belong together.

Do not present all future capabilities as finished. The story must distinguish implemented functionality from the roadmap.

### 4.3 Three Story Types to Prepare

**The problem story**

Describe a recognizable writing situation: the writer understands an idea but struggles with a particular sentence or connection.

**The product story**

Show how the writer moves from an existing thought to a useful alternative while retaining control.

**The technical story**

Explain what happens behind the interface: contextual inputs, a task-specific model request, streaming or structured output, validation, and safe application of an accepted suggestion.

The product story demonstrates value. The technical story demonstrates engineering. Both are necessary.

---

## 5. Pitch Strategy

### 5.1 One-sentence Pitch

> Byline is a writer-controlled AI workspace that helps people find words, connect ideas, and improve their writing one deliberate suggestion at a time.

This should remain the default explanation unless user testing reveals that a different framing is clearer.

### 5.2 Thirty-second Pitch

> Most AI writing tools are built around asking AI to write something for you. But sometimes you already know what you want to say—you just can't find the right phrase, connect two thoughts, or tell whether your point is coming across. Byline brings that assistance directly into your document. You can request alternatives, explore connective patterns, and inspect writing issues while keeping control of every edit.

Only mention features that are implemented sufficiently to demonstrate.

### 5.3 Two-minute Pitch Structure

**Opening — 15 seconds**

Introduce the writing problem with a concrete example.

**Problem — 20 seconds**

Explain why requesting an entire rewrite is not always the ideal solution.

**Solution — 25 seconds**

Introduce Byline as a workspace for targeted, writer-controlled assistance.

**Demonstration — 40 seconds**

Show one complete task from existing text to suggestion to accepted edit.

**Technical explanation — 15 seconds**

Explain how the relevant context reaches the model and how the application handles its response.

**Impact and next step — 5 seconds**

Explain who benefits and what will be tested or developed next.

The times are a planning guide, not a requirement to speak rapidly. Cut secondary features rather than sacrificing clarity.

### 5.4 A Stronger Technical Explanation

Avoid saying only “Byline uses AI to help people write.”

Explain the actual system:

1. The writer invokes a specific task.
2. Byline collects the text and context relevant to that task.
3. A task-specific request is sent to the selected Meta model.
4. The response streams or is validated into structured alternatives.
5. Byline displays the alternatives in the editor.
6. The writer chooses whether to apply an edit.

This describes an implemented system rather than a generic use of an LLM.

The final pitch should name the actual Meta model, API, or tooling used. Do not claim that Meta tooling powers a capability unless it genuinely does.

---

## 6. Demo Strategy

### 6.1 The Demo Has One Job

The demo should prove that Byline helps the writer make progress without taking over the writing.

Do not attempt to demonstrate the entire roadmap. A short, reliable workflow is more convincing than several half-working features.

### 6.2 Recommended Three-minute Storyboard

**0:00–0:15 — The hook**

Narration:

> You can ask AI to write a paragraph for you. But what happens when you already know what you want to say and only need help with one part?

Show an actual draft containing a passage that needs improvement.

**0:15–0:35 — Establish the problem**

Briefly show the text and identify one specific phrase or connection the writer wants to improve.

Do not spend the opening minute on account creation, setup questions, or configuration screens.

**0:35–1:10 — Demonstrate selection-based assistance**

Select a word or phrase.

Invoke paraphrase and show three alternatives.

Explain that the writer can choose the most appropriate alternative rather than accepting a complete rewrite.

Accept one alternative and show the exact change to the document.

**1:10–1:45 — Demonstrate Connect**

Show two ideas that need a clearer relationship.

Open Connect, browse a relevant pattern or request contextual suggestions, and select a suitable result.

Make the relationship between the ideas visible to the viewer.

**1:45–2:15 — Demonstrate reflection**

If the findings implementation is ready, open the unified findings list. Show one useful finding, navigate to the relevant text, and inspect its explanation or alternative.

If the findings workflow is not reliable, do not force it into the demo. Use this time to deepen the demonstration of the strongest working feature.

**2:15–2:40 — Explain the technical design**

Briefly show how the application handles contextual requests, streaming, and accepted edits.

Explain exactly which Meta AI tool or model is used and what role it plays.

**2:40–3:00 — Close with the promise**

Return to the edited document.

Conclude with:

> Byline helps writers find the words and connections they need, while keeping the writing theirs.

Use this as draft narration and adjust it to match the final product.

### 6.3 Demo Rules

- Use a prepared, realistic document.
- Keep the context and outline prefilled when setup is not the point of the demo.
- Use a stable browser window and readable text.
- Avoid typing long passages live.
- Rehearse actual interaction timing.
- Test model responses before recording.
- Avoid features whose reliability is uncertain.
- Do not fabricate output or claim that a prerecorded result was generated live.
- Keep a backup recording in case the live application or API fails.
- If using a recording, make clear what is prerecorded where necessary.

### 6.4 Evidence of Robustness

Before final recording, test the golden path repeatedly.

The demonstration should survive:

- A slow model response.
- A failed request.
- Accidental double-clicks.
- Empty or malformed output.
- A selection that becomes outdated.
- A user dismissing a suggestion.
- A document edit after an analysis request.

A useful demo is not merely visually impressive; it proves that the interaction is coherent and dependable.

---

## 7. Stories and Inspiration

### 7.1 A Library of Truthful Stories

Prepare a small set of stories to support different communication needs.

|Story|Purpose|Material|
|---|---|---|
|Why the product exists|Establish relevance|The writing problem that motivated the concept|
|A writer's struggle|Make the problem relatable|A real or clearly labeled illustrative scenario|
|A feature in action|Demonstrate the difference|A before-and-after interaction|
|A technical challenge|Demonstrate engineering|Context selection, safe editing, streaming, or stale-result handling|
|A design decision|Show product judgment|Why Byline offers alternatives instead of replacing the passage|
|A testing discovery|Show learning|A real observation from a user test and the change it prompted|

Use real user experiences only with permission. An illustrative scenario should be presented as an example, not as a testimonial.

### 7.2 Inspiration for the Product

Use the writing process itself as the source of creative direction.

Useful questions:

- What does a writer need at the moment they become stuck?
- What can be presented without interrupting their train of thought?
- How can a suggestion be useful without appearing authoritative?
- How can the interface communicate that several alternatives are valid?
- How can the product help a writer see the gap between intended and received meaning?

The best inspiration comes from observing these moments in actual writing sessions, not from collecting a large mood board or copying another AI product.

### 7.3 Inspiration for Communication

Use concrete scenes instead of abstract claims.

Rather than writing a post about “the future of AI-assisted creativity,” show a sentence before and after a local edit.

Rather than claiming that Byline preserves authorial agency, show the user comparing three alternatives and choosing one.

Rather than claiming that Connect improves writing, show a contrast pattern helping connect two opposing positions.

Each piece of communication should make one idea visible.

### 7.4 Build-in-public Principle

Document decisions, not just progress.

Useful examples:

- Why the first setup wizard was simplified.
- Why connective structures deserve more than a list of transition words.
- Why the findings panel uses one searchable collection.
- Why the editor must remain authoritative when applying an AI suggestion.
- What user testing changed about the design.

Avoid posting repetitive statements such as “Big progress today!” without showing what changed or what was learned.

---

## 8. Documentation Strategy

Documentation serves several audiences: judges, developers, testers, and users.

The hackathon does not require a large documentation website. It needs a small set of trustworthy, navigable documents.

### 8.1 Project Submission Description

Prepare a concise submission narrative with the following components:

**Project name and tagline**

Explain Byline in one sentence.

**Problem**

Describe the specific writing difficulty being addressed.

**Solution**

Explain what the product does and how it differs from requesting a full rewrite.

**Target user**

Identify the initial audience and why the workflow matters to them.

**Core features**

List only implemented capabilities.

**Technical implementation**

Explain the actual model and tooling, request pipeline, editor integration, and any technically significant decisions.

**Impact**

Explain the intended benefit and summarize real testing evidence, if available.

**Demo**

Link to the application and demonstration video.

**Limitations**

State important known limitations honestly.

### 8.2 README

Recommended structure:

1. Project name and one-line description.
2. Short demo video or GIF.
3. Problem and intended users.
4. Key features.
5. How to run the application.
6. Required environment variables.
7. Architecture overview.
8. How Meta AI tooling is integrated.
9. Testing and evaluation.
10. Known limitations.
11. Future direction.

The README should allow a technically capable person to understand the product and reproduce its basic behavior.

Never commit API keys or other secrets to the repository.

### 8.3 Architecture Documentation

Maintain a concise technical overview covering:

- Frontend and backend responsibilities.
- Editor and document state.
- AI request lifecycle.
- Streaming.
- Provider adapter.
- Context selection.
- Suggestion validation.
- Safe document edits.
- Findings data model.
- Persistence.
- Error handling.

A single architecture diagram and a short explanation are more useful than a large collection of disconnected files.

### 8.4 Product Documentation

Document:

- Setup and document creation.
- Draft assistance.
- Connect.
- Paraphrase.
- Findings and personas.
- Keyboard shortcuts, if implemented.
- Export.
- Known limitations.

Do not write help pages for functionality that does not yet exist.

### 8.5 Testing Documentation

Keep a short record of:

- Test scenarios.
- Number and type of participants.
- Tasks attempted.
- Observed issues.
- Major feedback themes.
- Changes made in response.
- Remaining defects.

This is useful both for development and for substantiating claims in the pitch.

### 8.6 One Source of Truth

Avoid maintaining multiple slightly different versions of the product description, supported features, Meta model details, and setup instructions.

Keep one source of truth for the current feature list and technical facts. Derive the README, demo script, and social descriptions from it.

---

## 9. Social Media Strategy

### 9.1 Objective

The immediate objective is not to build a large following in six days.

It is to:

- Make the project's purpose understandable.
- Show that the project is real.
- Recruit a few writers for testing.
- Communicate meaningful progress.
- Give interested people a place to learn more.
- Make the eventual submission easier to discover.

### 9.2 Choose a Small Number of Channels

Use one primary channel and, at most, one secondary channel.

Choose based on where the builder already has an audience and can participate naturally.

Possible roles:

- **LinkedIn:** Product rationale, technical decisions, testing, and professional visibility.
- **X or Threads:** Short build updates, concrete product interactions, and links to the demo.
- **Instagram:** Short visual demonstrations, before-and-after examples, and interface clips.

Do not spend the remaining hackathon days maintaining three different content strategies. Adapt one core post to a second platform when appropriate.

### 9.3 Profile Setup

Use a consistent:

- Project name or descriptor.
- Short bio.
- Logo or wordmark.
- Tagline.
- Demo or project link once available.

Example profile description:

> Byline — a writer-controlled AI workspace. Find words, connect ideas, and improve your writing without handing over the whole draft. Building and testing in public.

Adjust this copy to match the actual shipped feature set.

### 9.4 Content Pillars

**Problem**  
Explain a recognizable writing frustration.

**Product**  
Show one interaction in action.

**Engineering**  
Explain an implementation decision or difficult problem solved.

**Learning**  
Share what a real tester found and what changed.

**Release**  
Show the final demo, explain the project, and link to the submission.

A post should usually have one main point rather than combining all five.

### 9.5 Six-day Posting Plan

|Date|Content|Objective|
|---|---|---|
|Oct 30|Introduce the writing problem and the Byline thesis|Explain why the product exists|
|Oct 31|Show a short feature interaction|Make the product tangible|
|Nov 1|Share a design or engineering decision|Demonstrate thoughtfulness|
|Nov 2|Share a genuine testing observation, if available|Demonstrate learning and user relevance|
|Nov 3|Publish the strongest demo preview|Make the product easy to understand|
|Nov 4|Share the release or submission link when ready|Direct people to the finished work|

This is a suggested cadence, not a requirement to publish every day. Skip a post if there is nothing meaningful to show.

### 9.6 Example Announcement

> I've been building Byline, an AI writing workspace based on a simple idea: writers don't always need AI to write a whole paragraph for them.
>
> Sometimes they know what they mean but need a better phrase, a way to connect two ideas, or feedback on how a passage might be understood.
>
> Byline brings those interactions into the document and leaves the final decision to the writer.
>
> I'm building and testing it during the Meta Global AI Developer Hackathon. I'm especially interested in whether targeted suggestions are more useful than asking AI for a full rewrite.
>
> [Demo or project link]

Post this only when the product and the stated capabilities are real. If certain features are not ready, describe the direction as work in progress.

### 9.7 Posting Rules

- Lead with the problem or concrete result.
- Show the interface whenever a visual makes the point clearer.
- Use short clips or GIFs rather than explaining every screen.
- Include one clear next step: try the demo, give feedback, or read the project.
- Keep technical details specific.
- Do not invent engagement numbers, user feedback, or testimonials.
- Do not turn every development activity into a public announcement.
- Do not prioritize posting over fixing a broken core workflow.

### 9.8 After the Hackathon

If the product proves useful, shift from posting about features to posting about learning:

- What writers repeatedly struggle with.
- Which assistance types they use most.
- Which suggestions they reject and why.
- Whether Connect patterns are valuable independently of AI.
- What needs to change before a broader release.

Longer-term communication should follow product evidence.

---

## 10. User Testing Strategy

### 10.1 Objective

The goal is to learn whether Byline solves a recognizable problem and whether users understand its workflow.

An initial sample of five to ten campus writers is enough for formative usability testing. It is not enough to claim broad statistical validation.

### 10.2 Recruit Participants

Invite people who write essays, reports, articles, or other substantive text.

Use a short invitation that explains:

- The approximate duration.
- What tasks they will try.
- That the product is a prototype.
- That honest criticism is useful.
- Whether their feedback will be recorded.

Do not pressure participants to praise the product or to endorse it publicly.

### 10.3 Test the Actual Workflow

A session can take approximately 10–15 minutes.

**Task 1 — Start writing**

Give the participant a topic and let them enter the workspace. Observe whether the setup questions and templates help or slow them down.

**Task 2 — Find a better expression**

Ask them to select a phrase and use paraphrase. Observe whether the three alternatives are understandable and useful.

**Task 3 — Connect ideas**

Provide two related thoughts and ask them to find a way to connect them. Observe whether they understand the pattern library or AI-based alternative.

**Task 4 — Inspect a finding**

If findings are functional, ask them to locate a particular observation and understand the available actions.

**Task 5 — Reflect**

Ask which action they would use again and which part felt unnecessary.

Do not explain every feature before the participant has a chance to discover it. Otherwise, the session measures the guided tour rather than the interface.

### 10.4 Observe Behavior

Record:

- Whether the task was completed.
- Where the participant hesitated.
- Which labels they misunderstood.
- Whether they accepted, modified, or rejected suggestions.
- Whether the result preserved their meaning.
- Whether they understood that edits were optional.
- Whether the feature felt worth the interruption.
- Which problems they encountered.

Use observations and direct quotations only with appropriate permission.

### 10.5 Ask Useful Questions

Prefer:

- “What were you trying to do here?”
- “What did you expect this button to do?”
- “Why did you choose that alternative?”
- “What would you change in this result?”
- “What made you reject that suggestion?”
- “Was there a point where you would have preferred to continue without AI?”

Avoid relying on:

- “Do you like it?”
- “Would you use this?”
- “Isn't this useful?”

Hypothetical enthusiasm is weaker evidence than observed behavior.

### 10.6 Measure Quality

Useful measures include:

**Task completion**  
Could the participant complete the requested action without assistance?

**Meaning preservation**  
Did the accepted suggestion retain the original intent?

**Selection safety**  
Did the application modify only the intended text?

**Suggestion usefulness**  
Did participants accept, edit, or reject each alternative, and why?

**Time to useful result**  
How long did it take from invoking the action to seeing a usable suggestion?

**Setup friction**  
How much work did the participant need before reaching the editor?

**Comprehension**  
Could the participant explain the difference between Connect, paraphrase, and findings?

Do not treat acceptance rate as proof of quality. A suggestion may be accepted out of convenience or rejected because it does not fit the writer's voice.

### 10.7 Decide what to Change

After each session:

1. Record the observations.
2. Identify repeated problems.
3. Separate product defects from individual preferences.
4. Prioritize issues that block core tasks or undermine trust.
5. Implement the highest-value fix.
6. Re-test the affected workflow.

With a small sample, repeated usability problems are valuable clues, not universal conclusions.

---

## 11. Connecting Testing to the Pitch

Do not separate user testing from storytelling.

Testing should improve the product and strengthen the pitch.

For example:

- If participants understand paraphrase quickly but struggle to understand Connect, improve its name, examples, or invocation.
- If users repeatedly ask for a full rewrite, clarify when targeted assistance is useful and consider whether there is an actual product gap.
- If participants like the suggestion but distrust its accuracy, improve the explanation and control mechanisms.
- If users avoid the setup wizard, remove questions that do not materially improve subsequent assistance.

If testing produces meaningful evidence, communicate it carefully.

A responsible statement might be:

> We tested the prototype with eight student writers. Several participants struggled to distinguish connective patterns from sentence starters, so we redesigned the feature around relationships between ideas.

Use that statement only if the number and observation are true. Do not invent results before running the sessions.

If feedback is mixed, report the uncertainty rather than selecting only flattering comments.

---

## 12. Hackathon Evaluation Strategy

The official [Meta Global AI Developer Hackathon page](https://dev.meta.ai/events/global-hackathon) describes the indie developer track in terms of creativity, technical ambition, and whether the project works. It also emphasizes building for a problem the developer knows firsthand.

A currently surfaced event guide reports the following weighted project criteria: Impact 30%, Use of Meta AI Tooling 25%, Demo 25%, and Technical Depth and Execution 20%. Treat the official rules and live submission portal as the authority for the final requirements.

### 12.1 Impact

Demonstrate:

- A specific writing problem.
- A defined initial audience.
- A clear workflow that addresses the problem.
- Evidence that real people can use the workflow.
- A credible explanation of what the product could enable.

Avoid claiming that Byline improves everyone's writing or transforms education based solely on a small prototype test.

### 12.2 Meta AI Tooling

Explain:

- Which Meta model or tooling is actually used.
- Where it appears in the workflow.
- Why the model is appropriate for the task.
- How contextual inputs shape the request.
- How the application processes and validates the response.
- What the product adds beyond a simple chat interface.

Be specific about what is built around the model and what the model itself does.

### 12.3 Demo

Demonstrate:

- A working core task.
- A visible input-to-output transformation.
- User control over an edit.
- Reliable behavior.
- A concise explanation of the result.

A live demo and a recorded fallback should tell the same truthful story.

### 12.4 Technical Depth

Show the engineering that matters to the product:

- TipTap/ProseMirror integration.
- Context selection.
- Streaming.
- Safe application of suggestions.
- Structured output validation.
- Revision-aware findings.
- Provider abstraction.
- Research and source handling, if implemented.

Explain technical decisions in terms of the problems they solve. Complexity alone is not evidence of good engineering.

---

## 13. Timeline to Submission

The official deadline is November 4, 2026 at 9 PM Eastern, corresponding to November 5 at 9 AM in Jakarta. Use November 4 in the early evening Jakarta time as the internal deadline so that submission issues can be resolved before the official cutoff.

### October 29 — Strategy and Scope

- Settle the working product description.
- Pick the central product story.
- Identify which features will genuinely be demonstrated.
- Freeze the proposed demo scenario.
- Prepare a short list of usability-test tasks.
- Check the official submission requirements.

**Deliverable:** One-page messaging brief and an agreed demo target.

### October 30 — Early Validation and Branding

- Recruit participants.
- Run initial usability sessions.
- Test the main user journey yourself.
- Confirm the brand descriptor and basic visual treatment.
- Create or refine the README structure.
- Identify core defects that must be fixed.

**Deliverable:** First feedback log and a consistent working identity.

### October 31 — Product and Demo Structure

- Fix major blockers.
- Rehearse the golden-path workflow.
- Draft the pitch.
- Finalize the demo storyboard.
- Prepare the architecture diagram.
- Ensure the project uses the intended Meta AI tooling.

**Deliverable:** A coherent end-to-end demonstration.

### November 1 — First Complete Presentation

- Record a rough demo.
- Check whether the story is understandable without explanation.
- Continue user testing.
- Review setup friction and selection safety.
- Draft the project submission description.

**Deliverable:** Demo version one and a complete draft of the submission narrative.

### November 2 — Review and Targeted Fixes

- Show the demo to someone unfamiliar with the product.
- Ask them to explain what Byline does after watching it.
- Fix the highest-impact usability problems.
- Capture truthful testing observations.
- Verify technical documentation against the implementation.

**Deliverable:** Demo version two and validated documentation.

### November 3 — Freeze and Record

- Freeze nonessential feature development.
- Record the final demo.
- Review narration and on-screen text.
- Finish the README and project description.
- Verify links, credentials handling, and setup instructions.
- Test the deployed application or documented local setup.

**Deliverable:** Final candidate demo and submission package.

### November 4 — Final Verification and Submission

- Perform one end-to-end test.
- Verify the demo link and fallback recording.
- Confirm the actual model and tooling details.
- Review the submission against the official requirements.
- Submit by the chosen internal deadline.
- Reopen the submission page and confirm receipt.

**Deliverable:** A complete, verifiably submitted project.

Do not use the final evening for speculative features, logo redesigns, or an ambitious social campaign.

---

## 14. Deliverables Checklist

### Brand

- Clear product positioning.
- One-sentence product description.
- Consistent tagline.
- Basic visual identity.
- Preliminary name and handle checks.

### Pitch and Story

- One-sentence pitch.
- Thirty-second pitch.
- Two-minute pitch.
- Clear problem and solution.
- Accurate technical explanation.
- No unsupported claims.

### Demo

- Prepared document.
- Defined golden path.
- Rehearsed timing.
- Readable interface.
- Working model requests.
- Safe suggestion acceptance.
- Backup recording.
- Final review by someone unfamiliar with the product.

### Documentation

- Project description.
- README.
- Architecture diagram.
- Run instructions.
- Model and tooling information.
- Testing notes.
- Known limitations.
- Working demo and repository links.

### Socials

- One primary channel.
- Consistent profile description.
- Project link where available.
- A few purposeful posts.
- No fabricated feedback or metrics.

### Testing

- Recruit initial participants.
- Prepare a short task script.
- Observe users without over-guiding them.
- Record actual findings.
- Prioritize repeated blockers.
- Make at least one evidence-based improvement where feasible.

### Submission

- Official requirements checked.
- All links verified.
- Demo plays successfully.
- Correct track and project information.
- Meta AI integration described accurately.
- Submission confirmed before the internal deadline.

---

## 15. What Not to Do

During this period, avoid:

- Building a full marketing website when a project page and README suffice.
- Creating social accounts on every platform.
- Posting daily progress with no useful information.
- Inventing a personal origin story or customer testimonials.
- Claiming user validation without conducting the tests.
- Demonstrating every feature regardless of reliability.
- Adding advanced features primarily to make the product appear larger.
- Hiding technical limitations.
- Spending excessive time refining visual branding while basic interactions remain broken.
- Treating a successful local recording as proof that the live app is reliable.
- Waiting until the final hours to verify the submission.

---

## Final Strategy

Byline's public identity should match its actual behavior.

The brand says that the writer stays in control. The pitch explains why targeted writing assistance matters. The demo proves that the writer can get meaningful help without handing over the draft. User testing checks whether that experience actually makes sense. Documentation shows what was built, and social posts make the work discoverable.

Everything should tell the same story:

**Byline helps writers move from what they mean to what they write, while keeping the decisions theirs.**