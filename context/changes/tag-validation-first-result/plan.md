# First verification — tag details to a result Implementation Plan

## Overview

Roadmap S-01, the north star: a signed-in buyer starts a verification, enters what the Balenciaga Classic City tag shows, and immediately sees which rules pass or fail — each with its message and confidence — and the result: a risk level, or a no-verdict state (unsupported variant, hardware unknown, input error), with an unresolved year shown as such. The rules come from `balenciaga-city-tag-rules.md` and live as data read by a generic engine, so the product's core bet — rules encoded as data can judge a real tag — is tested on the smallest end-to-end flow.

## Current State Analysis

- No domain code exists. The app is the 10x Astro starter: SSR pages, React islands mounted with `client:load`, a dark "cosmic" glass-card theme, English copy, `<html lang="en">` hard-coded in `src/layouts/Layout.astro:14`.
- Auth works locally and in production (F-01 done). Route protection is a prefix list in `src/middleware.ts:4` — only `/dashboard`, which is a placeholder greeting (`src/pages/dashboard.astro`).
- Form pattern: controlled React inputs with local validation (`src/components/auth/SignInForm.tsx`, `src/components/auth/FormField.tsx`); `FormField` is auth-specific (icon required, white-on-dark classes).
- No test runner, no test files, no `test` script. Vitest 5.0 is compatible with the pinned Vite 7.3.3 (peer `^6.4 || ^7 || ^8`); `astro/zod` resolves outside Astro, so schemas need no new dependency.
- Rule knowledge is complete for the tag: `balenciaga-city-tag-rules.md` — scope §1, model rules `M-01`–`M-05` §2, season-letter table with double readings and period layouts §3, signal semantics §4, test set §5 (3 observed strings, V1–V6, X1–X16), seller questions §8. Card data (§6) is an explicit gap; FR-005 is deferred to v2.

## Desired End State

`/verifications/new` is a protected page with a card-per-step wizard (start → hardware → plate → tab back → markings → result). After the tag steps are submitted, a pure TypeScript engine evaluates the observations against a JSON knowledge file and the result card shows the outcome, the year reading, failed hard signals separately, soft signals, passed and abstained rules (message + confidence each) and the seller questions. `npm test` runs every case from the rules document and passes. The dashboard links to the wizard. Nothing is persisted.

Verify: `npm test`, `npm run lint`, `npm run build` pass; signed in, the V1 inputs give "low risk, S/S 2009"; X12 gives high risk with the `S-12` message; unauthenticated `/verifications/new` redirects to `/auth/signin`.

### Key Discoveries:

- Plate rows print in the reverse of the PRD's row numbering (rules §2.3): the style number is the **bottom** plate line and the first number on the tab back; the UI label must say so, and a 4-digit batch number typed as the style number is `M-05` (input error), not risk.
- Double-letter resolution (rules §3.5) is one mechanism: keep the letter readings compatible with every known observation (brand line → 925 stamp → MADE IN ITALY size). One left = resolved; two = ambiguous (`S-07`/`S-08` abstain); none = contradiction → the excluding rule fires. This is how `S-05`/`S-06`/`S-13` act "as a resolver while ambiguous, as a check once settled — never both".
- Boundary tolerance is rule data, not engine logic: `S-07` and `S-13` are soft within one year of their window and hard beyond (X10 soft, X11 hard, X15 soft, X16 hard); `S-05`/`S-06` are always hard (X9: `R`/2009 + 925 is hard although only one year past 2008).
- `lessons.md` rule "pin the contract before the agent writes it" applies to the engine's input/output — it is pinned below, and `src/types.ts` gets exactly these types.
- `getViteConfig` from `astro/config` would load the Cloudflare adapter's Vite plugin into the test run; the engine is framework-free, so a plain Vitest config with the `@` alias is the safer choice.

## What We're NOT Doing

- No persistence, list, edit or delete (S-05–S-07); the result lives only in the page until reload.
- No authenticity-card step (FR-005 deferred to v2).
- No visual checklist or reference photos (S-03); the tag card uses text hints only.
- No full report, copy-to-clipboard of seller questions, or end-to-end browser test (S-04).
- No API endpoint — evaluation runs in the browser, so the API error-format rule is not triggered in this change.
- No translation of the existing English auth screens; only the new wizard page is Polish.
- No other change to the rules document: its only edit is one line under X1 in §5 recording the decided `M-01` confirmation step (review F6).

## Implementation Approach

Build and prove the logic before any UI. Phase 1 turns the rules document into a JSON knowledge file validated by a schema, writes the engine as a pure function, and encodes the whole test set as unit tests. Phase 2 puts the wizard on a protected page and renders the engine's result. Decisions taken with the developer (2026-09-14): evaluation in the browser as a pure TS module; JSON + schema for the knowledge; one page with step cards and a progress bar in the starter theme; `M-01` length errors ask for confirmation first and become a hard signal only once confirmed; hardware "can't see" stops evaluation with the hardware seller question; evaluation runs when the tag steps are submitted, not while typing.

## Critical Implementation Details

- **Evaluation order is part of the contract.** Missing tag photo → medium risk + tag-photo question, no rules. Hardware unknown → `scope-unknown` + hardware question, stop. Hardware not classic → `unsupported`, stop (must never reach `M-04`, X6). Row-1 input errors (`M-05`; `M-01` unconfirmed) → `input-error`, stop. Style number ≠ `115748` → `unsupported`, stop. Only then `M-04`, `M-03`, the letter rules and `S-11`/`S-12`, all evaluated (no early exit) so every failing rule is listed.
- **"Unknown" is a first-class value** for every observation (FR-004 "can't see"): a rule whose input is unknown abstains and contributes its §8 seller question; it never fails.
- **Message placeholders** (`{rok}`, `{rok_deklarowany}`, `{okucia}`, `{zakres}`) are filled by the engine from the resolved values; a rule that needs a year never renders while the year is ambiguous (it abstains instead).
- **Year resolution rules** (review F2). (a) A reading that is strictly compatible with every known observation beats one that is only within a rule's one-year tolerance; tolerance counts only when no reading is strictly compatible — letter `O` (F/W 2010 / F/W 2023) + large MADE IN ITALY resolves to 2023. (b) When no reading remains, every rule that excluded at least one reading fires, each with its own message. (c) No season letter implies the 2001 – F/W 2003 period (rules §3.3): `S-07` compares the hardware against that period, and with no declared year `S-09`/`S-10` abstain.
- **Seller-question mapping** (review F3). Each unknown observation adds one rules-§8 question; identical questions appear once:

  | Unknown observation | §8 question |
  | --- | --- |
  | hardware | Hardware unknown (scope gate) |
  | tag photo missing; brand line; 925 stamp; tag construction; batch number | Tag photo |
  | tab-back first number; MADE IN ITALY size | Back of the tab |
  | season letter | Season letter illegible |
  | `S-08` fired | Year mismatch |

- **Input normalization** (review F4). Trim whitespace in every text field; uppercase the season letter; in the batch field strip an optional leading `N°` before checking the digits; never strip anything from the style-number field — an `N°` prefix or a 4-digit entry there is `M-05`; from the tab-back entry take the first group of digits, so `115748-9770 001013`, `115748-1960-535269` and `115748 3444` all read `115748`.

## Phase 1: Rule engine and test set

### Overview

A tested, UI-free engine: knowledge JSON + schema + pure evaluation function + the full test set from the rules document.

### Changes Required:

#### 1. Test runner

**File**: `package.json`, `vitest.config.ts`, `.github/workflows/ci.yml`

**Intent**: Add Vitest as a dev dependency with `test` (`vitest run`) and `test:watch` scripts, a `typecheck` script (`astro check` — `@astrojs/check` is already a dependency and runs clean on the baseline), and a config that resolves the `@/*` alias and runs `src/**/*.test.ts` in the Node environment. CI gains `npm run typecheck` and `npm test` steps after lint (review F1; the build strips types without checking them, and CI ran no tests).

**Contract**: `npm test` exits 0 when all tests pass; `npm run typecheck` exits 0 with no errors; CI order: install → astro sync → lint → typecheck → test → build. Config does not use `getViteConfig` (see Key Discoveries).

#### 2. Engine contract

**File**: `src/types.ts` (new)

**Intent**: The shared input/output types of the engine, used by the engine, its tests and the Phase 2 wizard. Nothing else goes in this file in this change.

**Contract**:

```ts
type Unknown = "unknown"; // FR-004 "nie widać" / illegible
export type HardwareObservation =
  | "classic-flat-brass" | "classic-pewter" | "classic-aged-brass" | "classic-variant-unknown"
  | "giant-or-other" | Unknown;
export interface TagObservation {
  tagPhoto: "present" | "missing";
  hardware: HardwareObservation;
  tagConstruction: "metal-plate" | "leather-only" | Unknown;
  styleNumber: string;                    // bottom plate line, as typed
  styleNumberConfirmed: boolean;          // buyer confirmed an odd-length entry (M-01)
  batchNumber: string | Unknown;          // digits after "N°"
  seasonLetter: string | "none" | Unknown; // "none" = plate has no letter
  tabBackFirstNumber: string | Unknown;
  brandLine: "underscore" | "dot" | Unknown;
  stamp925: "present" | "absent" | Unknown;
  madeInItalySize: "small" | "large" | Unknown;
  declaredYear: number | null;            // from the start card, optional
}
export type RuleId = string;              // "M-01" … "S-13", as in the rules document
export interface RuleSignal { ruleId: RuleId; severity: "hard" | "soft"; confidence: "confirmed" | "probable"; message: string }
export interface InputError { ruleId: RuleId; field: keyof TagObservation; message: string; needsConfirmation: boolean }
export type YearReading = { season: "S/S" | "F/W" | null; year: number };
export type YearStatus =
  | { status: "resolved"; reading: YearReading; resolvedBy: RuleId | null }
  | { status: "ambiguous"; readings: YearReading[] }
  | { status: "no-letter" } | { status: "unknown" };
export interface TagEvaluation {
  outcome: "risk" | "unsupported" | "scope-unknown" | "input-error";
  riskLevel: "low" | "medium" | "high" | null; // non-null only when outcome === "risk"
  year: YearStatus;
  hardSignals: RuleSignal[];
  softSignals: RuleSignal[];
  passed: RuleId[];
  abstained: RuleId[];
  inputErrors: InputError[];
  sellerQuestions: string[];              // Polish copy from rules §8, filled
}
```

#### 3. Knowledge file and schema

**File**: `src/data/balenciaga-classic-city/knowledge.json` (new), `src/lib/services/tag-validation/schema.ts` (new)

**Intent**: Encode rules document §1–§3 and §8 as data: supported style number, hardware eras, season-letter table (both readings, per-reading confidence, `—` = single reading), period layouts, and every `M-`/`S-` rule with its signal type, confidence, Polish message and — for `S-07`/`S-13` — a one-year boundary tolerance. The schema (`z` from `astro/zod`) validates the file and exports the inferred types the engine uses.

**Contract**: Rule IDs and Polish messages match the rules document verbatim. Adding a rule of an existing kind = editing the JSON plus a test case, no engine change (PRD secondary criterion).

#### 4. Engine

**File**: `src/lib/services/tag-validation/evaluate.ts` (new)

**Intent**: `evaluateTag(observation: TagObservation, knowledge = defaultKnowledge): TagEvaluation` — a pure, synchronous function implementing the evaluation order in Critical Implementation Details, reading-set resolution for double letters, tolerance-based soft/hard for `S-07`/`S-13`, one-year tolerance for `S-08`, and risk aggregation (any hard → high; else any soft or missing tag photo → medium; else low).

**Contract**: No I/O, no framework imports, no randomness — the same observation always yields the same evaluation.

#### 5. Tests

**File**: `src/lib/services/tag-validation/knowledge.test.ts`, `src/lib/services/tag-validation/evaluate.test.ts` (new)

**Intent**: The knowledge file parses against the schema; every rule ID listed in rules document §2.4/§3.4 exists in the JSON (drift guard read from the markdown); one test per case V1–V6 and X1–X16 plus the three observed strings (row-1 format), asserting outcome, risk level, year status and the firing rule IDs; extra cases for the decided behaviour: X1 unconfirmed → `input-error` with `needsConfirmation`, X1 confirmed → `M-01` hard; hardware unknown → `scope-unknown` with the hardware question; missing tag photo → medium + tag-photo question; tab back unknown → `M-03` abstains + tab-back question; double letter with all resolvers unknown → ambiguous, `S-07`/`S-08` abstain; year-resolution boundaries — `O` + large MADE IN ITALY → 2023, both readings excluded by different rules → both fire, no letter + aged brass → `S-07` against 2001 – F/W 2003; normalization — lowercase `r`, `N° 0754` in the style-number field → `M-05`, the three observed strings in the tab-back field → `115748`. The rules document's X1 expectation (`M-01` hard) is tested as "X1 (confirmed)".

**Contract**: Test names carry the case ID (`V1`, `X12`, …) so a failure points back to the rules document.

### Success Criteria:

#### Automated Verification:

- Knowledge JSON validates against the schema (`npm test`)
- Every rule ID from the rules document exists in the knowledge file (`npm test`)
- All test-set cases V1–V6 and X1–X16 plus the decided extra cases pass (`npm test`)
- Lint passes (`npm run lint`)
- Build passes (`npm run build`)
- Type check passes (`npm run typecheck`)
- CI run for the pushed phase commit is green, including the type check and test steps (`gh run list`)

#### Manual Verification:

- Developer spot-checks the knowledge file against the rules document (Polish messages, letter table, period layouts)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Wizard page and result

### Overview

The protected wizard page, its step cards and the result card, wired to the Phase 1 engine; entry point from the dashboard; docs updated.

### Changes Required:

#### 1. Route and entry point

**File**: `src/middleware.ts`, `src/pages/verifications/new.astro` (new), `src/pages/dashboard.astro`, `src/layouts/Layout.astro`

**Intent**: Protect everything under `/verifications`; add the page that mounts the wizard island with `client:load`; add a "Nowa weryfikacja" link on the dashboard; give `Layout` an optional `lang` prop (default `"en"`) so the new page renders `lang="pl"` without changing the auth pages.

**Contract**: `PROTECTED_ROUTES` gains `"/verifications"`; `Layout` props `{ title?: string; lang?: string }`.

#### 2. Wizard and result components

**File**: `src/components/verification/` (new — `TagWizard.tsx` plus one component per step, a progress indicator and `ResultCard.tsx`)

**Intent**: A card-per-step wizard in the starter's glass-card theme, mobile-first: start (fixed line "Balenciaga Classic City (medium)", listing link — required, a valid URL; declared year and price optional) → hardware (the five hardware choices + "nie widać", hint on where to look) → plate (tag photo in the listing yes/no; style number labelled as the **bottom** plate line; batch number and season letter with "brak litery" / "nieczytelna"; plate construction) → tab back (first number, MADE IN ITALY size) → markings (brand line, 925 stamp) → "Sprawdź". Every observation offers "nie widać". Submitting builds a `TagObservation` and calls `evaluateTag`. Input errors send the buyer back to the offending card with the message; an `M-01` error offers "Potwierdzam odczyt", which resubmits with `styleNumberConfirmed: true`. The result card shows the outcome headline (Polish: "Wysokie ryzyko" / "Średnie ryzyko" / "Niskie ryzyko — w sprawdzonych cechach nie ma sygnałów ostrzegawczych" / "Nieobsługiwany wariant" / "Brak danych o okuciach"), the year line (resolved season and year, or "Rok nierozstrzygnięty: …" with both readings), hard signals in their own block, then soft signals, passed and abstained rules — each with its message and a confidence badge ("potwierdzona" / "prawdopodobna") — and the seller questions as a plain list.

**Contract**: The wizard's only dependency on the engine is `evaluateTag` and the `src/types.ts` types. Controls are native, labelled inputs/radio groups so `jsx-a11y` lint passes.

#### 3. Docs

**File**: `CLAUDE.md` (project section above the 10x-cli block), `README.md`

**Intent**: Replace "No test runner is configured yet" with the `npm test` / `npm run test:watch` commands; add one Conventions line: tag knowledge lives in `src/data/balenciaga-classic-city/knowledge.json` (source: `balenciaga-city-tag-rules.md`), evaluated by `src/lib/services/tag-validation/`; add `npm test` to the README scripts.

**Contract**: No edits inside the `<!-- BEGIN @przeprogramowani/10x-cli -->` block.

### Success Criteria:

#### Automated Verification:

- Unit tests still pass (`npm test`)
- Lint passes (`npm run lint`)
- Build passes (`npm run build`)
- Unauthenticated request to `/verifications/new` redirects to `/auth/signin` (`curl -sI localhost:4321/verifications/new`)
- Type check passes (`npm run typecheck`)

#### Manual Verification:

- Signed-in walk-through with the V1 inputs shows low risk and S/S 2009
- X12 inputs show high risk with the S-12 message; X1 (`11574`) asks for confirmation before showing M-01 as a hard signal
- Hardware "nie widać" stops with the hardware seller question; a missing tag photo gives medium risk and the tag-photo question
- The wizard is legible and usable at phone width, and the result appears in under 1 second
- The same walk-through works on production after the Workers Builds deploy

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding.

---

## Testing Strategy

### Unit Tests:

- Knowledge schema and rule-ID drift guard against the rules document.
- The full test set V1–V6, X1–X16 (X1 as "X1 (confirmed)"), the three observed strings, the decided cases (M-01 confirmation, hardware unknown, missing tag photo, tab back unknown, ambiguous year), the year-resolution boundaries and the input-normalization cases.

### Integration Tests:

- None in this change: the end-to-end test of the PRD's main path belongs to S-04, where the path first reaches the report.

### Manual Testing Steps:

1. Sign in locally, open the dashboard, follow "Nowa weryfikacja".
2. Enter V1 (`115748`, `N° 4892 R`, dot brand line, no 925, small MADE IN ITALY, aged brass) → low risk, S/S 2009.
3. Enter X12 (`N° 0754 C`, `115748`) → high risk, S-12 message.
4. Type `11574` as the style number → confirmation prompt; confirm → M-01 hard.
5. Choose "nie widać" for hardware → stop with the hardware question; answer "no tag photo" → medium risk with the tag-photo question.
6. Repeat step 2 at 375 px width and on production after the deploy.

## Performance Considerations

Evaluation is a synchronous in-memory function over a few dozen rules; the PRD's < 1 s budget is met without optimisation.

## References

- Rules and test set: `balenciaga-city-tag-rules.md`
- PRD: `context/foundation/prd.md` — US-01, FR-002, FR-003, FR-004, Business Logic
- Roadmap item: `context/foundation/roadmap.md` — S-01 `tag-validation-first-result`
- Lesson applied: `context/foundation/lessons.md` — pin the contract before the agent writes it
- Form pattern: `src/components/auth/SignInForm.tsx`; route protection: `src/middleware.ts:4`

## Implementation Notes

Deviations accepted during implementation and the implementation review (2026-09-14, `reviews/impl-review.md`):

- `ResultCard` reads `defaultKnowledge` besides `evaluateTag` and the types: Polish rule `title`s (new required field in the knowledge schema), `scope.unsupportedMessage` (new field) and `noLetterPeriod`. Passed and abstained rules show the title and confidence, not the failure message.
- `S-06` and `S-13` carry a second message for the opposite observation (`messageByValue`), also recorded in the rules document under §3.4.
- The style number has no "nie widać" option — the pinned contract has no unknown value for it; the plate step asks for it only when the listing has a tag photo.
- Price is collected on the start card but not evaluated.
- Seller questions are shown before the passed/abstained lists.
- `M-05` prefixes are `N°`, `Nº`, `No`; a prefix followed by a letter does not count, and `.`/`:`/`#` after it are stripped.
- Review fixes: within-tolerance rules fire soft when no year reading survives; the tab back reads the first six digits (spaces allowed) and abstains below six; the season letter must be one letter A–Z; confirming the style number validates the plate step; focus moves to the step heading, the result heading or the style-number field; every rule on the risk path is fired, passed or abstained ("Nie sprawdzono — brak danych albo nie dotyczy").

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Rule engine and test set

#### Automated

- [x] 1.1 Knowledge JSON validates against the schema — eea6b90
- [x] 1.2 Every rule ID from the rules document exists in the knowledge file — eea6b90
- [x] 1.3 All test-set cases V1–V6 and X1–X16 plus the decided extra cases pass — eea6b90
- [x] 1.4 Lint passes — eea6b90
- [x] 1.5 Build passes — eea6b90
- [x] 1.7 Type check passes — eea6b90
- [x] 1.8 CI run green including type check and tests — eea6b90

#### Manual

- [x] 1.6 Developer spot-checks the knowledge file against the rules document — eea6b90

### Phase 2: Wizard page and result

#### Automated

- [x] 2.1 Unit tests still pass — 6400be2
- [x] 2.2 Lint passes — 6400be2
- [x] 2.3 Build passes — 6400be2
- [x] 2.4 Unauthenticated request to /verifications/new redirects to /auth/signin — 6400be2
- [x] 2.10 Type check passes — 6400be2

#### Manual

- [x] 2.5 Signed-in walk-through with the V1 inputs shows low risk and S/S 2009 — 6400be2
- [x] 2.6 X12 shows high risk with the S-12 message; X1 asks for confirmation first — 6400be2
- [x] 2.7 Hardware "nie widać" stops with the hardware question; missing tag photo gives medium risk — 6400be2
- [x] 2.8 Wizard is legible and usable at phone width; result in under 1 second — 6400be2
- [x] 2.9 Same walk-through works on production after the Workers Builds deploy — 6400be2
