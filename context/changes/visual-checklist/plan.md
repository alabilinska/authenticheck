# Visual Checklist (MVP) Implementation Plan

## Overview

Roadmap S-03 (FR-006, FR-004): after the tag cards, the buyer answers three visual checks from rules §7 — black thread on the tag, Lampo zipper, twist of the bales — each with a question, a hint and a reference photo. The engine turns the answers into rules V-01–V-03 that land in the same result lists as the tag rules. MVP scope, decided with the developer on 2026-09-14: the simplest version that works end to end; `research.md` holds the deeper options for later.

## Current State Analysis

- `evaluateTag` (`src/lib/services/tag-validation/evaluate.ts:318-399`) evaluates only the tag; order and early returns are part of the contract. `checkHardware` (S-07, `evaluate.ts:242-266`) is the pattern for an era check: compare a period with the resolved year or the no-letter period, soft within the tolerance, hard beyond, abstain when the year is ambiguous or unknown.
- Rules §7 has the three traits but no rule IDs; §8 has the seller questions (Zipper, Tag stitching, Bales). The drift guard reads `[MS]-\d{2}` rows and expects 18 (`knowledge.test.ts:13-19`); the schema ID regex is `^[MS]-\d{2}$` (`schema.ts:23`).
- The wizard has five steps; `validateStep` validates Markings under `case LAST_STEP` (`draft.ts:111`), so appending a step would move that validation.
- Five web-sourced photos sit untracked in `public/`; three have no file extension (WebP).

## Desired End State

- The wizard has a sixth card "Cechy wizualne" with three questions, each with its §7 question, hint and a reference photo.
- V-01 thread and V-03 bales: "tak" passes, "nie" is a soft signal, "nie widać" abstains and adds its §8 seller question.
- V-02 zipper: "Lampo" or "B" is compared with the tag year like S-07 — Lampo up to 2014, `B` from 2015, soft within one year, hard beyond; abstains when the year is ambiguous or unknown; "nie widać" abstains and adds the §8 zipper question.
- The result card lists V-01–V-03 with the tag rules; the risk level includes them.
- `npm test`, `npm run lint` (exit code 0), `npm run typecheck`, `npm run build` pass.

### Key Discoveries:

- Every rule on the risk path must be fired, passed or abstained exactly once (coverage test, `evaluate.test.ts:297-320`); the three V rules must follow it.
- Existing tests spread one `base` observation (V1, S/S 2009); the new fields need defaults there ("tak", "lampo", "tak"), and tests whose year is 2016 or later (V4, the O + large boundary case) must set the zipper to "b".

## What We're NOT Doing

- The zipper does not resolve ambiguous years (option kept in `research.md`); no "something else" zipper answer.
- No visual checks when the listing has no tag photo, or on unsupported / hardware-unknown / input-error paths.
- No era rule for the thread (the §7 "not verified post-2014" note stays informational); no hard signal for thread or bales.
- No fake-example photos; no image modal; no image processing.
- No report redesign (S-04).

## Implementation Approach

Rules document first, then knowledge + schema, then engine and tests, then the wizard card and photos — one phase, because the pieces only make sense together.

## Critical Implementation Details

- **Engine contract (re-pinned per lessons.md):** `TagObservation` gains `thread: "yes" | "no" | "unknown"`, `zipper: "lampo" | "b" | "unknown"`, `bales: "yes" | "no" | "unknown"`. Nothing else in `src/types.ts` changes.
- **Order:** the V rules run after S-12 and before S-07/S-08, only on the risk path (after all early returns), so no-verdict outcomes are unchanged.

## Phase 1: Visual checks in rules, engine, wizard and result

### Overview

V-01–V-03 exist in the rules document and the knowledge file, the engine evaluates them, the wizard asks them with photos, the result shows them.

### Changes Required:

#### 1. Rules document

**File**: `balenciaga-city-tag-rules.md`

**Intent**: Add a rules table under §7 (same columns as §2.4/§3.4) with `V-01` (top seam black or very dark — soft), `V-02` (zipper variant vs letter year: Lampo to 2014, `B` from 2015 — hard, soft within one year), `V-03` (bales with a thick, rounded twist — soft), each with a Polish message; note the reference image names.

**Contract**: Rows in the form `| \`V-0n\` | … |` so the drift guard can read them.

#### 2. Knowledge file and schema

**File**: `src/data/balenciaga-classic-city/knowledge.json`, `src/lib/services/tag-validation/schema.ts`, `src/lib/services/tag-validation/knowledge.test.ts`

**Intent**: Encode V-01–V-03 with Polish titles, the §7 question and hint, and a reference image (`src`, `alt`); add the zipper periods and labels; add seller questions `tagStitching`, `zipper`, `bales` from §8. Allow the `V` prefix in the ID regex and the drift guard (21 rules).

**Contract**: New rule kinds `visualTrait` (`signal: "soft"`, `field: "thread" | "bales"`, `question`, `hint`, `reference`, `sellerQuestion`) and `zipperEra` (`signal: "hard"`, `toleranceYears`, `periods: { lampo, b }`, `labels`, `question`, `hint`, `reference`, `sellerQuestion`).

#### 3. Engine and tests

**File**: `src/types.ts`, `src/lib/services/tag-validation/evaluate.ts`, `src/lib/services/tag-validation/evaluate.test.ts`

**Intent**: Add the three fields (contract above) and a visual step in `evaluateTag` implementing the Desired End State; message placeholders `{zamek}`, `{zakres}`, `{rok}` like S-07. Update `base` and the tests with years ≥ 2016; add tests: thread/bales "nie" soft and "nie widać" abstain + question; zipper B on 2005 hard, B on 2014 soft, Lampo on 2016 hard, Lampo on 2015 soft, ambiguous year abstain, no letter + B hard, "nie widać" abstain + question; coverage cases still account for every rule (now 21).

**Contract**: `evaluateTag(obs)` signature unchanged; early-return outcomes unchanged.

#### 4. Wizard, photos and result

**File**: `src/components/verification/draft.ts`, `TagWizard.tsx`, `VisualStep.tsx` (new), `fields.tsx`, `public/reference/*`

**Intent**: Add step "Cechy wizualne" after "Oznaczenia" (validate Markings explicitly, not via `LAST_STEP`); three required radio questions rendered from the knowledge rules with a reference photo (fixed aspect ratio, descriptive alt, "Powiększ" link); map answers in `toObservation`. Move and rename the photos: `10x_stitching_real` → `public/reference/visual-thread-tag.webp`, `10x_zipper_real` → `visual-lampo-zipper.webp`, `10x_handles_realvsfake.png` → `visual-bales-ring.png`; the two "fake" photos are not used.

**Contract**: `STEPS` gains "Cechy wizualne"; `WizardDraft` gains `thread`, `zipper`, `bales` (null until answered).

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Lint passes with exit code 0: `npm run lint`
- Type check passes: `npm run typecheck`
- Build passes: `npm run build`

#### Manual Verification:

- V1 inputs + "tak" / "Lampo" / "tak" give low risk and S/S 2009
- A tag dated 2016 (letter D, dot brand line) + zipper "Lampo" gives high risk with the V-02 message
- "nie widać" on all three visual questions adds the three seller questions and keeps the risk unchanged
- The three reference photos are visible and legible at phone width
- The same walk-through works on production after the Workers Builds deploy

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding.

---

## Testing Strategy

### Unit Tests:

- V-01/V-03: yes pass, no soft, unknown abstain + question. V-02: the era cases listed above. Coverage over the risk-path cases with 21 rules. Drift guard with the V rows.

### Manual Testing Steps:

1. V1 walk-through with "tak" / "Lampo" / "tak" → low risk, S/S 2009.
2. Letter D, dot brand line, no 925, MII unknown (S/S 2016) + "Lampo" → high risk, V-02.
3. "nie widać" on the three visual questions → three seller questions, same risk.
4. Repeat 1 at 375 px and on production.

## References

- Research (deeper options for later): `context/changes/visual-checklist/research.md`
- Rules: `balenciaga-city-tag-rules.md` §7, §8
- Era-check pattern: `src/lib/services/tag-validation/evaluate.ts:242-266` (S-07)
- Roadmap item: `context/foundation/roadmap.md` — S-03 `visual-checklist`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Visual checks in rules, engine, wizard and result

#### Automated

- [x] 1.1 Unit tests pass — 52be98f
- [x] 1.2 Lint passes with exit code 0 — 52be98f
- [x] 1.3 Type check passes — 52be98f
- [x] 1.4 Build passes — 52be98f

#### Manual

- [x] 1.5 V1 + tak/Lampo/tak gives low risk and S/S 2009 — 52be98f
- [x] 1.6 Tag dated 2016 + Lampo gives high risk with the V-02 message — 52be98f
- [x] 1.7 "nie widać" on all three adds three seller questions, risk unchanged — 52be98f
- [x] 1.8 Reference photos visible and legible at phone width — 52be98f
- [x] 1.9 Same walk-through works on production after the deploy — 52be98f
