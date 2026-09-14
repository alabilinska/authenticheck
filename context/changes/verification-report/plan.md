# Verification Report Implementation Plan

## Overview

Roadmap S-04 (US-01, FR-007, FR-008): one report with the result and the signals that set it, a copy-ready list of seller questions, and the PRD's end-to-end test of the main path. MVP scope; built on `main` while S-05 Phase 1 runs in the `../authenticheck-save` worktree.

## Current State Analysis

- `ResultCard` (`src/components/verification/ResultCard.tsx`) already shows the headline (low risk says "w sprawdzonych cechach nie ma sygnałów ostrzegawczych"), the year line, hard and soft signals, seller questions, passed and "Nie sprawdzono" rules.
- Gaps against the PRD: (1) no copy action for seller questions (FR-008); (2) checks that abstained because the year is unresolved are mixed with other abstentions (FR-007); (3) a medium report can have no seller question at all — V1 with batch `123` gives S-11 soft and zero questions; the same for V-01/V-03 answered "nie" — which breaks "every medium or high report contains at least one concrete action" (PRD success criteria).
- No end-to-end test and no Playwright; Vitest runs `src/**/*.test.ts` only. `.dev.vars` holds `SUPABASE_URL` and `SUPABASE_KEY`.

## Desired End State

- Every soft signal adds its matching §8 seller question (deduplicated), so medium reports always carry at least one question; hard signals stay decisive.
- The report has "Kopiuj pytania do sprzedawcy": copies a ready message (greeting, listing link, numbered questions) and confirms "Skopiowano"; if the clipboard is unavailable the text is shown for manual copying.
- With an unresolved year, the year-dependent checks (S-07, S-08, V-02) are listed in their own section "Wstrzymane — rok nierozstrzygnięty".
- `npm run test:e2e` signs in with a test account and walks sign-in → new verification → tag → visual checks → report with a risk level and at least one seller question.

### Key Discoveries:

- `signal()` in `evaluate.ts` is the single place where soft signals are recorded — adding the question there covers every soft rule.
- Year-dependent rules are identifiable by kind: `hardwareEra` (S-07), `declaredYear` (S-08), `zipperEra` (V-02).

## What We're NOT Doing

- No saving from the report (S-05 Phase 2); no report redesign beyond the three gaps.
- No e2e test in CI (needs GitHub secrets and writes to the shared database) — local only for now.
- No new seller-question copy beyond rules §8.

## Implementation Approach

Phase 1 closes the three report gaps (engine + knowledge for soft-signal questions, ResultCard for copy and the year section). Phase 2 adds Playwright and the one end-to-end test.

## Critical Implementation Details

- **Soft-signal questions:** rules that can fire soft get an optional `sellerQuestion` key in the knowledge file — S-07 → `hardware`, S-11 → `tagPhoto`, S-13 → `tabBack`, V-01 → `tagStitching`, V-02 → `zipper`, V-03 → `bales` (S-08 already asks `yearMismatch`, S-03 `letterIllegible`); `signal()` asks it when severity is soft.
- **E2E credentials:** `E2E_EMAIL` and `E2E_PASSWORD` live in `.dev.vars` (gitignored); the Playwright config loads the file with `process.loadEnvFile` and the test is skipped with a clear message when they are missing.

## Phase 1: Report — seller questions for soft signals, copy, unresolved-year section

### Overview

The report meets FR-007 and FR-008 and the "at least one concrete action" criterion.

### Changes Required:

#### 1. Soft-signal seller questions

**File**: `src/data/balenciaga-classic-city/knowledge.json`, `src/lib/services/tag-validation/schema.ts`, `src/lib/services/tag-validation/evaluate.ts`, `src/lib/services/tag-validation/evaluate.test.ts`

**Intent**: Add `sellerQuestion` to the soft-capable rules listed above and ask it from `signal()` for soft signals; tests: batch `123` → medium with the tag-photo question; V-01/V-03 "nie" → medium with their question; a property check over the existing medium cases that `sellerQuestions` is never empty.

**Contract**: Optional `sellerQuestion` (a `sellerQuestions` key) on rule kinds `periodFeature`, `hardwareEra`, `batchFormat`; required already on `visualTrait` / `zipperEra`.

#### 2. Report: copy and unresolved-year section

**File**: `src/components/verification/ResultCard.tsx`, `src/components/verification/report.ts` (new), `src/components/verification/report.test.ts` (new)

**Intent**: A pure helper builds the copy message and splits abstained rules into "year unresolved" and "other"; the card renders the copy button with feedback and the new section.

**Contract**: `sellerMessage(questions: string[], listingUrl: string): string`; `splitAbstained(abstained: RuleId[], year: YearStatus): { yearUnresolved: RuleId[]; other: RuleId[] }`.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Lint passes with exit code 0: `npm run lint`
- Type check passes: `npm run typecheck`
- Build passes: `npm run build`

#### Manual Verification:

- V1 with batch `123` shows medium risk and the tag-photo question
- "Kopiuj pytania do sprzedawcy" puts the message with the link and numbered questions on the clipboard
- An ambiguous year (letter R, brand line / 925 / MADE IN ITALY "nie widać") lists S-07, S-08 and V-02 under "Wstrzymane — rok nierozstrzygnięty"

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: End-to-end test of the main path

### Overview

Playwright and one test that walks the US-01 path locally.

### Changes Required:

#### 1. Playwright setup and test

**File**: `package.json`, `playwright.config.ts` (new), `e2e/main-path.spec.ts` (new), `.gitignore`

**Intent**: Add `@playwright/test`, script `test:e2e`, a config that starts `npm run dev` (reusing a running server) and loads `.dev.vars`; the test signs in, opens "Nowa weryfikacja", enters V1 with one visual answer "nie widać", and asserts a risk headline and at least one seller question. Ignore Playwright output folders.

**Contract**: `npm run test:e2e`; spec files `e2e/*.spec.ts` (outside Vitest's `src/**/*.test.ts`).

#### 2. Docs

**File**: `CLAUDE.md` (project section), `README.md`

**Intent**: Document `npm run test:e2e`, the test account variables and that the PRD's e2e test now exists (replace the "still owed (S-04)" line).

**Contract**: No edits inside the 10x-cli block.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Lint passes with exit code 0: `npm run lint`
- Type check passes: `npm run typecheck`
- Build passes: `npm run build`
- End-to-end test passes locally: `npm run test:e2e`

#### Manual Verification:

- Test account created and its credentials added to `.dev.vars`
- The e2e run is watched once headed (`npx playwright test --headed`) and follows the real wizard

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding.

---

## Testing Strategy

### Unit Tests:

- Engine: soft signals add their questions; medium cases never have an empty question list.
- `report.ts`: message format (greeting, link, numbering), empty list, abstained split by year status.

### Integration Tests:

- `e2e/main-path.spec.ts`: the PRD path end to end against the local dev server and the shared Supabase project.

### Manual Testing Steps:

1. V1 + batch `123` → medium, tag-photo question, copy works.
2. Letter R with the three resolvers "nie widać" → "Wstrzymane — rok nierozstrzygnięty" with S-07, S-08, V-02.
3. `npm run test:e2e` green, once headed.

## References

- PRD: US-01, FR-007, FR-008, Success Criteria
- Roadmap item: `context/foundation/roadmap.md` — S-04 `verification-report`
- Report: `src/components/verification/ResultCard.tsx`; engine `signal()`: `src/lib/services/tag-validation/evaluate.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Report — seller questions for soft signals, copy, unresolved-year section

#### Automated

- [x] 1.1 Unit tests pass — 6d5d492
- [x] 1.2 Lint passes with exit code 0 — 6d5d492
- [x] 1.3 Type check passes — 6d5d492
- [x] 1.4 Build passes — 6d5d492

#### Manual

- [x] 1.5 V1 with batch 123 shows medium risk and the tag-photo question — 6d5d492
- [x] 1.6 Copy button puts the message with the link and numbered questions on the clipboard — 6d5d492
- [x] 1.7 Ambiguous year lists S-07, S-08 and V-02 under the unresolved-year section — 6d5d492

### Phase 2: End-to-end test of the main path

#### Automated

- [x] 2.1 Unit tests pass
- [x] 2.2 Lint passes with exit code 0
- [x] 2.3 Type check passes
- [x] 2.4 Build passes
- [x] 2.5 End-to-end test passes locally

#### Manual

- [x] 2.6 Test account created and credentials added to .dev.vars
- [x] 2.7 E2E run watched once headed and follows the real wizard
