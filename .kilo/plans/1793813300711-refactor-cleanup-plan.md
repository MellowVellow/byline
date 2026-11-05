# Byline Refactor & Cleanup Plan

Goal: reduce maintenance risk and remove dead/obsolete paths while preserving behavior. Scope includes EditorPage decomposition, negPhrases contradiction support, frontend citation-style selection, Redis-backed cache/rate, removal of mock fallback, and documentation of intentional limits.

## Decisions
- Contradiction detection: implement `negPhrases` population instead of deleting it.
- Citation styles: implement frontend style selection and MLA/Chicago formatting paths.
- Cache/rate: externalize to Redis with in-memory fallback when `REDIS_URL` is unset.
- Budget: keep SQLite per-instance and document the single-instance budget assumption.
- Vision: keep manual extraction; document limitation.
- Auth: keep shared API key; document limitation.
- Mock engine: remove; require configured server provider keys and return `ProviderUnavailable` when none are available.
- Dual SQLite/Supabase stays; SQLite is hot path, Supabase is rollup mirror.
- BYOK user-entered provider keys are out of scope.

## Workstreams

### 1. EditorPage decomposition (highest priority)
- Extract `useEditorSession` hook from `frontend/src/pages/EditorPage.tsx`: editor instance, update handlers, save/load, counts, doc revision.
- Extract `useGhostController` hook: ghost triggers, abort refs, suggestion state, reroll logic.
- Extract dock containers:
  - `ReviewDockContainer`: findings, persona filter, highlighted finding, analysis actions.
  - `LibraryDockContainer`: cards, sources, fetch/parse flows, cite popup state.
  - `ConnectPanelContainer`: connect session, apply, seam selection.
- Keep `EditorPage` as composition root wiring hooks/containers and global keyboard handlers.
- Move pure helpers already tested (`merge_partial`, `post_process`) into existing lib/domain modules; do not duplicate.
- Preserve all refs and callback dependencies to avoid stale closures.
- Validation: `npm run build`, `npm run test`; manual ghost/review/connect/library smoke.

### 2. Contradiction detection
- Backend: add `negPhrases` to the library card schema in `backend/app/prompts.py::LIBRARY_PARSE_SYSTEM` and coerce it in `backend/app/routers/library.py::_coerce_cards`.
- Frontend: retain verdict logic in `handleCheckClaims`; render `contradicted` in review dock.
- Add tests for a card whose `negPhrases` matches the sentence.
- Fallback: empty/missing `negPhrases` yields `supported` only.

### 3. Citation styles
- Extend `frontend/src/lib/cite.ts` with `mlaInline`, `mlaReference`, `chicagoInline`, `chicagoReference`, preserving APA behavior.
- Add `citationStyle` to settings/UI (`SettingsMenu`, `CitePopup`, `LibraryPanel`) and EditorPage state.
- Use selected style in `handleAcceptCard`/`appendReference` and cite popup insertion.
- Keep backend `/api/cite` styles; document that frontend uses metadata-aware local formatters.
- Validation: docx export and references box tests.

### 4. Redis cache and rate limiting
- Add config: `REDIS_URL`, `CACHE_BACKEND`, `RATE_BACKEND`.
- Implement Redis-backed `app/cache.py` and `app/security.py::rate_ok` behind existing signatures.
- Fall back to in-memory implementations when `REDIS_URL` is unset.
- Keep SQLite budget store as the per-instance source of truth; do not move budget accounting to Redis.
- Validation: backend tests plus a two-process smoke test for cache/rate sharing.

### 5. Remove mock fallback
- Remove `_mock_meta_response` and all mock branches in `backend/app/llm.py`.
- When no provider is available, raise `ProviderUnavailable` in all environments.
- Release budget reservations on failure.
- Frontend: surface provider errors instead of silent mock output.
- Update tests that expect mock output to expect errors or skip when no keys.

### 6. Documentation and cleanup
- Document single-instance budget assumption and shared API key limitation.
- Clarify SQLite hot path vs Supabase rollup in README and `.env.example`.
- Keep manual vision extraction; document gap.
- Keep deterministic library fallback behavior; document that it is not model output.

## Risks
- EditorPage split can introduce stale closures; preserve refs and callback dependencies.
- Citation style changes affect docx export golden tests.
- Redis introduces a new failure mode; fail open to in-memory in dev.
- Removing mock output changes tests and local offline behavior.

## Validation
- Backend: `python -m pytest -q`
- Frontend: `npm run build && npm run test`
- Manual smoke: ghost, review, connect, library cite, claim check, provider error path.
- Four pre-existing frontend test mismatches are unrelated to this refactor and should not be changed by it.
- Review changed files before commit.

## Open questions
- None.
EOF
echo done