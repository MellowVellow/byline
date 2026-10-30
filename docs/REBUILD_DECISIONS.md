# Rebuild Architecture Decisions (ADRs)

## ADR-001: Strict Meta-Authored AI Model Restriction & Elimination of Non-Meta Providers
- **Context:** The codebase previously contained experimental branches attempting integrations with Nebius Token Factory (`nvidia/Llama-3.1-Nemotron-70B-Instruct`) and references to Gemini/OpenAI fallbacks.
- **Decision:** Reconcile all source documents to mandate **Meta-authored AI models exclusively**. Only three inference providers are permitted:
  1. Meta Model API (`muse-spark-1.3`, `muse-glimmer-30b`, `muse-voice-transcribe-1.0`)
  2. OpenRouter (Meta-authored models only: `meta-llama/llama-3.3-70b-instruct`, `meta-llama/llama-3.1-70b-instruct`, `meta-llama/llama-3.1-8b-instruct`, `meta-llama/llama-3.2-3b-instruct`, `meta-llama/llama-3.2-1b-instruct`)
  3. Baseten (Meta-hosted models: `meta-llama/Llama-3.3-70B-Instruct`, `meta-llama/Meta-Llama-3.1-70B-Instruct`)
- **Consequences:**
  - Removed all Nebius and NVIDIA integrations, configurations, prompts, and demo paths.
  - Server-side allowlist strictly validates model IDs and rejects any non-Meta requests with HTTP 400.
  - Offline/development mode utilizes an internal high-fidelity Mock Meta Engine rather than falling back to third-party models.

## ADR-002: Modular Monolith vs. Multi-Agent Services
- **Context:** Previous proposals suggested separate agent services or microservices for each persona and feature.
- **Decision:** Maintain a clean, modular monolith with explicit internal boundaries (`domain`, `services`, `features`, `adapters`).
- **Consequences:** Zero inter-process latency, unified document state in memory and persistence, shared request pipeline, straightforward local deployment and testing.

## ADR-003: Canonical TipTap/ProseMirror Document Authority
- **Context:** AI generation must never silently mutate or corrupt the user's canonical prose.
- **Decision:** The TipTap/ProseMirror editor integration layer is the single authority for document transactions. AI output is purely advisory until explicit user acceptance.
- **Consequences:** All replacements occur through atomic ProseMirror transactions verified against revision number, prefix, suffix, and exact quote match. If the anchor cannot be validated, the edit is safely rejected and marked stale.

## ADR-004: Unified Findings Collection Across Four Personas
- **Context:** Source documents outlined four distinct feedback roles (Grammar, Reader, Supervisor, Researcher), but disjoint UIs create clutter.
- **Decision:** Aggregate all findings into a single, unified collection in the right Reflection dock.
  - Red (Grammar): Language correctness, deterministic checks, single correction.
  - Purple (Reader): Perceived interpretation observations (no automated rewrites).
  - Yellow (Supervisor): Outline-aware structural, flow, and argumentation feedback (up to 3 alternatives).
  - Blue (Researcher): Evidence status (`supported`, `contradicted`, `unverified`) with inline citations.
- **Consequences:** Writers have one centralized search, filter, and review rail. Multiple findings can target the same range without destructive merging.

## ADR-005: Connect Architecture (Static Pattern Library + Meta AI Inference)
- **Context:** Connect was previously split between static phrases and experimental external APIs.
- **Decision:** Implement Connect as a dual-path tool:
  1. Fast static pattern library with 12 rhetorical categories (Addition, Contrast, Cause & Effect, Evidence, Concession, Comparison, Elaboration, Qualification, Synthesis, Sequence, Example, Problem & Solution).
  2. Contextual AI inference powered by Meta models (`meta-llama/llama-3.3-70b-instruct` or `muse-spark-1.3`), synthesizing 3 dialectical bridge options with rhetorical rationales.

## ADR-006: Separation of Writing Profile from Technical Inference Settings
- **Context:** User settings previously commingled writer themes with low-level model parameters.
- **Decision:** Keep writer preferences (Language, Theme: Neutral, Academic, Gen Z, Buzzword-heavy) accessible in top-level intent controls, while isolating technical model parameters (model ID, temperature, top_p, top_k, max_tokens, reasoning_effort) in an Advanced Settings modal.
- **Consequences:** Clear, non-technical experience for writers, with full configurability for developers and evaluators.

## ADR-007: Setup Wizard with Instant Demo Preset
- **Context:** A lengthy setup wizard causes onboarding drop-off during testing and hackathon judging.
- **Decision:** Build a 2-layer wizard (4 quick survey questions, template selection, or blank start) with a prominent "Quick Demo Preset" button that instantly loads a rich, pre-configured sample document and outline.
