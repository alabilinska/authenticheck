<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Faza 1 testów — silnik reguł bez fałszywych werdyktów

- **Plan**: context/changes/testing-rule-engine-verdicts/plan.md
- **Scope**: Full plan (phases 1–5 of 5)
- **Date**: 2026-09-14
- **Verdict**: APPROVED
- **Findings**: 0 critical, 2 warnings, 8 observations

## Verdicts

| Dimension           | Verdict |
| ------------------- | ------- |
| Plan Adherence      | WARNING |
| Scope Discipline    | PASS    |
| Safety & Quality    | WARNING |
| Architecture        | PASS    |
| Pattern Consistency | WARNING |
| Success Criteria    | PASS    |

## Evidence summary

- Git scope `57f341a..HEAD` = exactly the plan's files (rules document, 7 test files, `fixtures.ts`, `test-plan.md`, change folder). No production source and no `knowledge.json` change.
- Automated: `npm test` 190 passed + 3 expected fail; the five phase files in isolation 89 + 2 expected fail; `invariants.test.ts` 720 ms (budget ~3 s); `grep "TBD — see §3 Phase 1"` empty; `npm run lint` exit 0; `npm run typecheck` 0 errors, 0 warnings.
- Manual: all Progress items `[x]`; each mutation from the plan was run in-session and observed red, then reverted.
- Drift: every planned item MATCH. Five deviations agreed during implementation are faithful to intent (two of them fix contradictions in the plan itself); extras (grid B profiles, M-01/M-05/messageByValue checks) are doc-sourced and benign. All document line references in test comments point at the cited text.

## Findings

### F1 — `it.fails` preconditions do not exercise the call under test

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/verifications.test.ts:231-248 (also src/components/verification/report.test.ts:55-68)
- **Detail**: The rule-change preconditions call `savedRow` and `evaluateTag`, but `toDto(saved)` and `toListItem(saved)` run only inside the `it.fails`. If either threw on that row, the `it.fails` would stay "expected fail" for the wrong reason — against the plan's rule that the final assertion is the only line expected to fail. Same shape, weaker, in `report.test.ts`: the precondition checks `("risk", "low")`, not that `outcomeLabel("risk", null)` returns at all.
- **Fix**: In each precondition, call the function under test on the exact input and assert a basic fact (`toDto(saved).evaluation.riskLevel === change.now`, `toListItem(saved).riskLevel === change.saved`; `typeof outcomeLabel("risk", null) === "string"`).
- **Decision**: FIXED — preconditions call toListItem/toDto on the same row (verifications.test.ts) and outcomeLabel("risk", null) (report.test.ts)

### F2 — Agreed deviations are not recorded in plan.md

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: context/changes/testing-rule-engine-verdicts/plan.md (phases 1–3)
- **Detail**: Five deviations were agreed in-session: hard detection by "contains hard"; `soft ⇒ medium` only on `outcome === "risk"`; `"115 7 48"` tested as allowed spaces with `"115  748"` as the abstention case; `documentedHardRules` in `fixtures.ts`; extra M-01/M-05/messageByValue checks. The plan is fully checked but still states the wrong invariant and the wrong tab-back case — once archived it would teach a pattern the code contradicts.
- **Fix**: Append a short `## Deviations (implementation)` addendum to plan.md listing the five items with one-line reasons (phase blocks stay untouched).
- **Decision**: FIXED — `## Deviations (implementation)` added to plan.md before `## Progress` (6 items, incl. F3)

### F3 — Document line numbers in LUKA test names go stale when the document moves

- **Severity**: 💬 OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Pattern Consistency
- **Location**: src/lib/services/tag-validation/input-errors.test.ts:93, :101, :114, :122
- **Detail**: Names such as `LUKA: M-03 (§2.4 :86, X4 :262, hard) …` embed line numbers. This very change shifted the document (Prettier +1, §3.2 +1, §3.4 +4), and nothing checks the anchors, so they drift silently and every doc edit renames tests. The plan asked for "rule and document line" in the name.
- **Fix A ⭐ Recommended**: Keep rule ID and § in the name, move line numbers into a comment above each test.
  - Strength: Names stay stable across document edits; matches how `knowledge.test.ts` cites lines.
  - Tradeoff: Deviates from the plan's literal wording ("line in the name").
  - Confidence: HIGH — the drift already happened once in this change.
  - Blind spot: Comments can go stale too, just less visibly.
- **Fix B**: Keep as is (plan-conformant) and refresh the numbers whenever the document changes.
  - Strength: Most explicit trace in the test report, exactly as planned.
  - Tradeoff: Manual upkeep; stale numbers mislead.
  - Confidence: MED — depends on discipline at each document edit.
  - Blind spot: None significant.
- **Decision**: FIXED via Fix A — rule and § in LUKA names, document lines in comments; §6.1 of test-plan.md updated

### F4 — Changed-knowledge grid runs have no non-vacuity check

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/tag-validation/invariants.test.ts:163-165
- **Detail**: The plan limits non-emptiness to the default knowledge. A future edit that pushes most of the grid to a no-verdict outcome would make the changed-knowledge cases pass without testing the hard ⇒ high path.
- **Fix**: In the `it.each`, also assert `hardFired.size > 0` and `riskLevels.has("high")`.
- **Decision**: FIXED — changed-knowledge runs assert hardFired.size > 0 and riskLevels has "high"

### F5 — Changed knowledge is parsed at collection time

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/tag-validation/invariants.test.ts:127-147
- **Detail**: `knowledgeSchema.parse` runs while the file loads; a schema change that invalidates an edit would fail the whole file (all 7 tests) instead of one named case.
- **Fix**: Store the edit functions in `CHANGED_KNOWLEDGE` and call `changedKnowledge(edit)` inside the `it.each` body.
- **Decision**: FIXED — CHANGED_KNOWLEDGE holds edit functions; changedKnowledge(edit) runs inside it.each

### F6 — Misleading violation message for `risk` without a level

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/tag-validation/invariants.test.ts:84
- **Detail**: The check is two-way (`riskLevel !== null` ⇔ `outcome === "risk"`), but the message only says "risk level present without a risk outcome" — wrong for the `("risk", null)` case the fail-open label test depends on.
- **Fix**: Change the message to "risk level and risk outcome disagree".
- **Decision**: FIXED — message is now "risk level and risk outcome disagree"

### F7 — Rules-document parsing depends on cwd and LF line endings

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/tag-validation/knowledge.test.ts:15, :33, :36-37, :46, :62
- **Detail**: `resolve(process.cwd(), …)` throws ENOENT from another cwd (IDE runner), and the document is read twice (pre-existing line 15 + new line 33). Splitting on `"\n"` and requiring a trailing `|` would drop every row on a CRLF checkout, failing only with "expected length 25, got 0".
- **Fix**: Resolve via `fileURLToPath(new URL("../../../../balenciaga-city-tag-rules.md", import.meta.url))`, reuse `rulesDoc` in the ID test, split on `/\r?\n/`.
- **Decision**: FIXED — document path via import.meta.url, read once, split on /\r?\n/

### F8 — Shared test data duplicated across files

- **Severity**: 💬 OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Pattern Consistency
- **Location**: src/lib/services/tag-validation/evaluate.test.ts:6-22, src/lib/services/verifications.test.ts:17-33, src/components/verification/draft.test.ts:90-107, knowledge.test.ts:106-112, verifications.test.ts:188-196, invariants.test.ts:121-125
- **Detail**: Three hand-written V1 copies besides `fixtures.ts:v1Observation` (the plan kept existing tests unchanged on purpose), a wizard-shaped `v1Draft` nothing ties to V1, and the §6.1 "changed copy" recipe plus rule-by-kind lookup written twice in different shapes. They can drift apart.
- **Fix**: Follow-up change (not this plan): import `v1Observation` in `evaluate.test.ts` and `verifications.test.ts`, add `expect(toObservation(v1Draft)).toEqual(v1Observation)`, move `changedKnowledge(edit)` and a `ruleOfKind` helper into `fixtures.ts`.
  - Strength: One source per fixture, as §6.1 already promises.
  - Tradeoff: Touches existing tests, which the plan explicitly excluded — so it belongs in a separate change.
  - Confidence: HIGH — mechanical refactor, the suite pins behaviour.
  - Blind spot: None significant.
- **Decision**: FIXED — queued as a follow-up change in follow-ups/review-fixes.md (existing tests stay untouched in this plan)

### F9 — §8 seller questions are not in the value guard

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/lib/services/tag-validation/knowledge.test.ts (missing), invariants.test.ts:169-175, input-errors.test.ts:20
- **Detail**: Rule messages are parsed from the document, but `sellerQuestions` are not; tests copy five §8 questions as literals (the tab-back one twice). Three questions (hardware, letterIllegible, yearMismatch) have no document guard at all, and `evaluate.test.ts:27` reads them from `defaultKnowledge` (circular).
- **Fix**: Parse the §8 table in `knowledge.test.ts` and compare with `sellerQuestions` (mapping row label → key as a literal), as done for the rule tables.
- **Decision**: FIXED — knowledge.test.ts parses the §8 table and compares it with sellerQuestions (passes)

### F10 — `fixtures.ts` is a test-only module under src/lib/services/

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/lib/services/tag-validation/fixtures.ts:1-45
- **Detail**: Only test files import it and it imports only a type, so nothing reaches the bundle today. But CLAUDE.md reserves `src/lib/services/` for business logic, and nothing stops production code from importing it.
- **Fix**: Add an ESLint `no-restricted-imports` rule forbidding `**/fixtures` in non-test files (or accept and leave it — the header already says it is shared by the test files).
- **Decision**: FIXED — eslint.config.js: no-restricted-imports forbids fixtures in non-test src files (verified with two probe imports, removed)

## Triage summary (2026-09-14)

| Decision           | Findings                          |
| ------------------ | --------------------------------- |
| Fixed              | F1, F2, F4, F5, F6, F7, F9, F10   |
| Fixed via Fix A    | F3                                |
| Fixed as follow-up | F8 (`follow-ups/review-fixes.md`) |

After the fixes: `npm test` 191 passed + 3 expected fail, `npm run lint` exit 0, `npm run typecheck` 0 errors / 0 warnings.
