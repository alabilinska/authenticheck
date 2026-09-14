<!-- PLAN-REVIEW-REPORT -->
# Plan Review: First verification — tag details to a result

- **Plan**: context/changes/tag-validation-first-result/plan.md
- **Mode**: Deep
- **Date**: 2026-09-14
- **Verdict**: REVISE → SOUND after triage (6 fixed, 1 accepted)
- **Findings**: 0 critical, 4 warnings, 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | WARNING |
| Blind Spots | WARNING |
| Plan Completeness | WARNING |

## Grounding
8/8 paths ✓, 4/4 symbols ✓ (one line reference off by one), brief↔plan ✓. Progress↔Phase parity ✓ (Phase 1: 5+1, Phase 2: 4+5), no checkboxes outside Progress. Deep verification: no type check anywhere (confirmed); JSON import enabled (`resolveJsonModule`, Bundler resolution); `getViteConfig` claim confirmed; blast radius low (Layout used by 5 pages, none pass `lang`; `/verifications` unused).

## Findings

### F1 — Engine contract is not checked by any command

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Completeness
- **Location**: Success Criteria of both phases
- **Detail**: The plan pins the engine's input/output types in `src/types.ts` because the Phase 2 wizard depends on them, but no success criterion runs a type check: `astro build` strips types via esbuild, lint does not report compile errors, and CI has no check step. A wizard that drifts from the contract passes every listed criterion.
- **Fix**: Add a `"typecheck": "astro check"` script, list it in both phases' Automated Verification, and add it as a CI step.
  - Strength: `npx astro check` already runs clean on the baseline (0 errors, 6.6 s).
  - Tradeoff: ~7 s per CI run.
  - Confidence: HIGH — verified by running it.
  - Blind spot: None significant.
- **Decision**: FIXED (plan: typecheck script, criteria in both phases, CI runs typecheck and tests)

### F2 — Year resolution at the boundaries is left to the implementation

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Key Discoveries / Critical Implementation Details
- **Detail**: "Keep the readings compatible with every observation" does not decide: (a) one reading strictly compatible and one only within the S-13/S-07 one-year tolerance — letter O (2010 / 2023) + large MADE IN ITALY: 2023 fits exactly, 2010 fits within tolerance; (b) no reading remains and different rules excluded each — which signals fire; (c) no letter and no declared year — S-09 and S-10 are both silent while aged brass means 2004 onward. None is in the test set, so the code would decide.
- **Fix**: Add year-resolution rules: (a) strictly compatible readings win, tolerance counts only when none is strict; (b) when none remains, every rule that excluded a reading fires; (c) no letter implies the 2001 – F/W 2003 period (rules §3.3), which S-07 compares against the hardware. Add three tests.
  - Strength: every documented case keeps its result and the boundary cases become explicit decisions with tests.
  - Tradeoff: three tests and one plan section.
  - Confidence: MED — (c) is derived from §3.3; the developer owns the domain call.
  - Blind spot: whether an aged-brass bag without a letter can exist is not stated in the rules document.
- **Decision**: FIXED (year-resolution rules + 3 tests)

### F3 — No mapping from "unknown" observations to seller questions

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Critical Implementation Details — "Unknown is a first-class value"
- **Detail**: The plan says each unknown observation contributes its §8 question, but §8 has questions only for hardware, tag photo, back of the tab, illegible season letter and year mismatch; brand line, 925 stamp, tag construction and batch number have none.
- **Fix**: Add a mapping table — brand line, 925, tag construction, batch number → "Tag photo"; tab-back number and MADE IN ITALY size → "Back of the tab"; illegible letter → "Season letter illegible"; hardware → "Hardware unknown"; S-08 → "Year mismatch"; deduplicate identical questions.
- **Decision**: FIXED (seller-question mapping table)

### F4 — Input normalization is unspecified

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Engine contract / Phase 1 tests
- **Detail**: The contract takes fields "as typed" but does not say whether "r" equals "R", what happens to "N°" typed into the batch field, or how observed listing strings ("115748-9770 001013") map to the tab-back field. It decides whether M-05 can fire at all: if the engine silently strips "N°" from the style number, M-05 never triggers.
- **Fix**: Normalization rules — trim whitespace; uppercase the season letter; strip an optional "N°" prefix in the batch field only (in the style-number field "N°" triggers M-05); take the first digit group of the tab-back entry (so "115748-9770 001013" → 115748). Tests: lowercase "r", "N° 0754" in the style field, the three observed strings.
  - Strength: M-05 and the observed-string tests become unambiguous.
  - Tradeoff: a few contract lines and three tests.
  - Confidence: HIGH — follows directly from rules §2.3 and §3.1.
  - Blind spot: other prefix spellings ("No.", "Nº") — add when seen.
- **Decision**: FIXED (normalization rules + tests)

### F5 — zod can end up in the browser bundle

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Architectural Fitness
- **Location**: Phase 1 — changes 3 and 4
- **Detail**: If the browser-side engine parses the knowledge at runtime, zod 4.4.3 adds ~66 KB minified / ~18 KB gzipped to the island.
- **Fix**: The engine imports the JSON with schema-inferred types only; `schema.parse` runs only in `knowledge.test.ts`.
- **Decision**: ACCEPTED (developer accepts zod in the client bundle)

### F6 — Rules document and app diverge on X1

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: What We're NOT Doing
- **Detail**: The rules document says `11574` → M-01 hard; the app asks for confirmation first. The drift guard compares rule IDs only, so it will not catch this.
- **Fix**: Name the test case "X1 (confirmed)" and add one line under X1 in rules §5 (developer's document — with her consent).
- **Decision**: FIXED (plan + test named "X1 (confirmed)" + one line under X1 in rules §5, with the developer's consent)

### F7 — Line reference off by one

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Current State Analysis
- **Detail**: `src/layouts/Layout.astro:15` — the `<html lang="en">` line is 14.
- **Fix**: Change the reference to `:14`.
- **Decision**: FIXED (reference changed to :14)
