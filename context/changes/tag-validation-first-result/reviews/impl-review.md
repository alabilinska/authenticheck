<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: First verification — tag details to a result

- **Plan**: context/changes/tag-validation-first-result/plan.md
- **Scope**: Phases 1–2 of 2 (full plan)
- **Date**: 2026-09-14
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 6 warnings, 4 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

Automated criteria re-run: `npm test` 40/40, lint exit 0, `astro check` 0 errors, build exit 0, CI green on eea6b90 / 6400be2 / d734be1, production `/verifications/new` → 302 `/auth/signin`. Manual items 1.6, 2.5–2.9 confirmed by the developer in session. Not-doing list respected: no persistence, API route, card step, visual checklist, e2e test or auth-screen translation.

## Findings

### F1 — Tolerated mismatch listed as passed when no year reading survives

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: src/lib/services/tag-validation/evaluate.ts:230-233
- **Detail**: In the no-reading branch (year rule b) a rule that excludes no reading goes to `passed` even when it is only within tolerance (gap > 0). Letter `M` (2011) + small MADE IN ITALY + underscore: `S-05` fires hard, `S-13` is listed as passed — while X15 (same `S-13` mismatch alone) makes it soft. The card contradicts itself.
- **Fix**: In the no-reading branch, a non-excluding rule whose gap is > 0 for every reading fires soft (with `{rok}` filled like the hard ones); only gap 0 for some reading counts as passed. Add a test for `M` + small + underscore.
  - Strength: Same severity for the same mismatch regardless of what else fired; matches X15.
  - Tradeoff: Two-reading case needs the "every reading" wording decided (soft only if no reading fits).
  - Confidence: HIGH — traced by hand and by the review agent.
  - Blind spot: None significant.
- **Decision**: FIXED — no-reading branch fires within-tolerance rules soft; test added

### F2 — Non-letter season character gives a false high risk

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/verification/draft.ts:99
- **Detail**: The letter field accepts any single character. `0` (zero for O), `1` (for I), `ą` fire `S-01` hard → "Wysokie ryzyko" on what is a typo — the product's worst failure mode (accusing a genuine bag).
- **Fix**: Validate `/^[A-Za-z]$/` in `validateStep` with "Wpisz jedną literę (A–Z)."
- **Decision**: FIXED — validateStep accepts only one letter A–Z

### F3 — Spaced digits on the tab back give a false M-03 hard

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/tag-validation/evaluate.ts:349
- **Detail**: The tab-back entry takes the first digit group, so `115 748 3444` reads `115` → `M-03` hard. The hint "Możesz przepisać całą linię" invites copying with spaces.
- **Fix**: Read the first six digits allowing single spaces between them (`/\d(?:\s?\d){5}/`); if no six-digit number is found, `M-03` abstains and the tab-back question is asked instead of firing. Tests: `115 748 3444` → 115748; `11574` → abstain.
  - Strength: The three observed strings still read 115748; an unparseable entry never accuses the bag.
  - Tradeoff: A pathological entry such as `11574 83444` would read 115748.
  - Confidence: HIGH — small, fully unit-testable change.
  - Blind spot: Other real listing formats not surveyed.
- **Decision**: FIXED — tab back reads the first six digits (spaces allowed); fewer than six → M-03 abstains with the tab-back question; tests added

### F4 — "Potwierdzam odczyt" skips plate-step validation

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/verification/TagWizard.tsx:69-73
- **Detail**: `confirmStyleNumber` evaluates without `validateStep(PLATE_STEP)`. After an M-01 prompt, switching the letter to "Jest litera" with an empty field and confirming sends `seasonLetter: ""` → `S-01` hard.
- **Fix**: Run `validateStep(PLATE_STEP, confirmed)` first; show errors and stop if any.
- **Decision**: FIXED — confirmStyleNumber validates the plate step first and stops on errors

### F5 — Focus is not moved on step change, result or input error

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/verification/TagWizard.tsx:30-33, 52, 56
- **Detail**: `goTo` only scrolls; the new step is not announced, focus drops to `<body>` when the result replaces the form, and the style-number field is not focused after an input error.
- **Fix**: Focus the step heading (`tabIndex={-1}`) after each step change, the result `<h2>` when the result appears, and the style-number input after an input error.
- **Decision**: FIXED — focus moves to the step heading on step change, to the result heading when the result appears or is left, and to the style-number field after an input error

### F6 — Raw buttons instead of the shadcn Button

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: TagWizard.tsx:115,126; ResultCard.tsx:175,182; PlateStep.tsx:73
- **Detail**: Five raw `<button>`s with copied classes; the auth forms use `Button` from `@/components/ui/button` (focus-visible ring, disabled styles).
- **Fix**: Switch to `Button` with className overrides (`variant="outline"` for secondary actions).
- **Decision**: FIXED — all five buttons use the shadcn Button (outline variant for secondary actions)

### F7 — Some rules vanish from the result lists

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/lib/services/tag-validation/evaluate.ts:170-180, 280
- **Detail**: No letter + declared year ≥ 2003 leaves `S-10` in neither list; letter "none"/"unknown" leaves `S-01`/`S-02` unlisted. The card should account for every rule.
- **Fix**: Add `S-10` to `abstained` when it does not apply, and `S-01`/`S-02` to `abstained` when there is no letter to check; test that passed + abstained + fired covers all 18 IDs on the `risk` path.
- **Decision**: FIXED — rules with nothing to check abstain (S-01–S-04 by letter state, S-09/S-10 outside the no-letter path); result section renamed 'Nie sprawdzono — brak danych albo nie dotyczy'; coverage test over 9 risk-path cases

### F8 — "N°" prefix list matches too much

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/data/balenciaga-classic-city/knowledge.json (M-05 prefixes); evaluate.ts:363
- **Detail**: Prefix `No` makes batch `No. 1234` read `. 1234` (false `S-11` soft); prefix matching is case-insensitive substring-at-start, so a style entry `Nope` is `M-05`.
- **Fix**: After stripping a prefix, also strip `[\s.:#]*`; require a non-letter after the prefix.
- **Decision**: FIXED — prefix counts only when not followed by a letter; separators . : # and spaces stripped after it; three tests added

### F9 — Disclosed deviations not yet recorded in the plan

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: plan.md (Phase 2 contract); ResultCard.tsx:2; CLAUDE.md Commands
- **Detail**: Benign extras: `ResultCard` imports `defaultKnowledge` (titles, `unsupportedMessage`, `noLetterPeriod`) against the "only evaluateTag + types" contract; Polish `title` per rule; `messageByValue` + rules-doc paragraph; style number without "nie widać"; price unused; seller questions shown before passed/abstained; `Nº`/`No` prefixes. CLAUDE.md lost the reminder that the PRD's e2e test is still owed (S-04).
- **Fix**: Add a short "Implementation notes" addendum to plan.md listing these, and restore one CLAUDE.md line: "E2E test of the main verification path is owed in S-04".
- **Decision**: FIXED — 'Implementation Notes' addendum in plan.md; CLAUDE.md line on the owed e2e test (S-04)

### F10 — Test assertions weaker than the plan asked

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: src/lib/services/tag-validation/evaluate.test.ts:116-207
- **Detail**: Most X cases check only risk level and fired rules; year status is not asserted for X4–X14/X16; X13/X14 use `toContain`.
- **Fix**: Assert `outcome`, exact fired lists and `year.status` in every V/X case.
- **Decision**: FIXED — every X case asserts outcome, exact hard/soft lists and year status via expectRisk
