# Byline: Master Implementation Roadmap

> **Authoritative Master Index & Execution Plan**  
> **Status:** Production Release Track (Meta w/ OpenRouter)  
> **Authoritative Plans:** [Product & Development](./PRODUCT_AND_DEVELOPMENT.md) · [Technical Architecture](./TECHNICAL_ARCHITECTURE.md) · [Strategy & Presentation](./STRATEGY_AND_PRESENTATION.md)

---

## 1. Execution Dependency Graph

```
[Phase 1: Foundation & Dual Provider]
  ├── CONFIG-01: OpenRouter primary, Meta Muse fallback
  └── TEST-01: Baseline verification (32 backend, 27 frontend tests pass)
       │
       ▼
[Phase 2: Editor Refinement & Selection Alternatives]
  ├── UI-01: Drag-select fragment -> Alternative button -> 3 options
  ├── UI-02: Suggestion reroll button (`)
  └── UI-03: Live apply-on-change write settings
       │
       ▼
[Phase 3: Cleanup & Parity Testing]
  ├── CLEAN-01: Prune legacy dead code (swapcheck, diagram, unused tests)
  └── TEST-02: test_complete_post.py post-processing test coverage
       │
       ▼
[Phase 4: Deployment & Verification]
  ├── DEP-01: Render backend deployment (FastAPI)
  ├── DEP-02: Vercel frontend deployment (Vite SPA)
  └── VER-01: Live end-to-end testing on trybyline.dev
```

---

## 2. Production Task Matrix

| Task ID | Task Description | Workstream | Dependencies | Priority | Status | Plan Reference |
|---|---|---|---|---|---|---|
| **CONFIG-01** | OpenRouter primary (Llama 3.3 70B) + Meta Muse fallback | Architecture | None | Critical | **Complete** | Tech Arch §3.2 |
| **TEST-01** | Verify all unit & parity tests pass | Testing | CONFIG-01 | Critical | **Complete** | Tech Arch §6 |
| **UI-01** | Drag-select fragment -> Alternative button -> 3 options | Frontend / Product | None | High | **Complete** | Product Plan §3.4 |
| **UI-02** | Suggestion reroll button (`↻` and `` ` ``) | Frontend | None | Medium | **Complete** | Product Plan §3.2 |
| **UI-03** | Live apply-on-change write settings (no staged drafts) | Frontend | None | High | **Complete** | Product Plan §3.1 |
| **CLEAN-01**| Prune legacy unused modules (swapcheck, diagram, case) | Architecture | None | Medium | **Complete** | Tech Arch §1 |
| **TEST-02** | Add `test_complete_post.py` post-processing test suite | Testing | CLEAN-01 | High | **Complete** | Tech Arch §6 |
| **DEP-01** | Render backend deployment configuration | Deployment | None | Critical | **Ready** | Tech Arch §1 |
| **DEP-02** | Vercel frontend deployment configuration | Deployment | None | Critical | **Ready** | Tech Arch §1 |
| **VER-01** | Live testing on `trybyline.dev` & `/demo` | Testing | DEP-01, DEP-02 | Critical | **Ready** | Strategy Plan §3 |
