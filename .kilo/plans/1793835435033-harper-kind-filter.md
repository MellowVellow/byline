# Plan: Clarify and relax Harper lint kind filtering

## Context
`frontend/src/services/harper-service.ts` gates Harper findings through `HARPER_KIND_ALLOWLIST` (`capitalization`, `grammar`, `agreement`, `punctuation`), dropping everything else including spelling. Need to determine full set of `lint_kind()` values Harper emits and decide which to allow.

## Steps
1. Enumerate possible `lint_kind()` strings by running the linter against a sample text and logging kinds; inspect harper.js default lint config / descriptions.
2. Decide allowlist policy: keep current four, or expand (e.g. include `spelling` only outside citations already handled by `insideCitation`).
3. Remove bugs:
   - `lint.lint_kind?.()` optional chaining may return undefined; fallback to `'Spelling'` conflates category.
   - Single-char guard logic: `isStandaloneI` condition inverted? verify.
   - `counter` increments per lint before kind gate, harmless but affects IDs; move increment after gate.
   - Zero-length/out-of-range guard okay.
4. Add kind logging in dev to validate.
5. Tests: add unit test for `lint` kind filtering with fixture text.

## Validation
- `npm run typecheck`, `npm run lint` in frontend.
- Manual lint run outputs expected kinds.

## Open questions
- Should spelling be enabled given citation immunity already protects author names? Recommend enable spelling globally except citation spans (already immune).