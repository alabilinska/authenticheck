# Edit a Saved Verification Implementation Plan

## Overview

Roadmap S-06 (FR-011): the buyer re-opens a saved verification, changes any answer (e.g. "nie widać" → "tak" / "nie" after the seller sends photos) and sees the report recalculated. MVP scope, one phase.

## Current State Analysis

- S-05 stores the listing data and the `TagObservation` in `public.verifications` and recomputes the evaluation on read (`toDto` → `evaluateTag`); `outcome` / `risk_level` are stored for the list. RLS already has an update policy for the owner.
- The wizard (`TagWizard.tsx`) starts from `emptyDraft`; `toSaveCommand(draft)` turns a draft into `SaveVerificationCommand`. There is no inverse.
- The saved report page `/verifications/[id]` renders `ResultCard` without wizard buttons; the `/verifications` prefix is protected by the middleware.

## Desired End State

- The saved report has "Edytuj odpowiedzi" leading to `/verifications/[id]/edit`.
- The edit page opens the wizard with every saved answer filled in; after "Sprawdź" the report shows "Zapisz zmiany", which updates the saved verification and links back to it.
- `PUT /api/verifications/[id]` validates the same `SaveVerificationCommand`, recomputes the evaluation with `evaluateTag`, updates `listing_url`, `declared_year`, `price`, `observation`, `outcome`, `risk_level`, `updated_at`, and returns `200 { verification }`; `404 NOT_FOUND` when the id is not the user's.
- The list shows the new risk label; the saved report shows the recalculated result.

### Key Discoveries:

- One evaluation function for first pass and edit (`evaluateTag`) is what keeps an edited report and a fresh one from disagreeing (roadmap S-06 risk).
- `updated_at` has no trigger; the update sets it explicitly.

## What We're NOT Doing

- No edit history or versioning; no "bought / rejected" statuses (PRD non-goal).
- No partial (PATCH) updates — the whole command is replaced.
- No delete (S-07).

## Implementation Approach

Add the inverse draft mapping and an update path through the existing service and API, then let the wizard run in "edit" mode from a new page.

## Critical Implementation Details

- **API contract (pinned — lessons.md):** `PUT /api/verifications/[id]` body `SaveVerificationCommand` → `200 { verification: VerificationDto }`; errors `401 UNAUTHENTICATED`, `400 INVALID_INPUT` (issues in `context`), `404 NOT_FOUND`, `503 SERVICE_UNAVAILABLE`, `500 DATABASE_ERROR`.

## Phase 1: Edit and recalculate

### Overview

Draft ↔ command mapping, update in the service and API, wizard edit mode, edit page and entry link.

### Changes Required:

#### 1. Draft from a saved verification

**File**: `src/components/verification/draft.ts`, `src/components/verification/draft.test.ts`

**Intent**: `fromSaveCommand(command)` builds a `WizardDraft` from saved data (letter mode from the season letter, "nie widać" toggles from `"unknown"`, year and price as text); a round-trip test checks `toSaveCommand(fromSaveCommand(c))` equals `c`.

**Contract**: `fromSaveCommand(command: SaveVerificationCommand): WizardDraft`.

#### 2. Update in the service and API

**File**: `src/lib/services/verifications.ts`, `src/lib/services/verifications.test.ts`, `src/pages/api/verifications/[id].ts`

**Intent**: `updateVerification(supabase, userId, id, command)` recomputes the evaluation and updates the owner's row; `PUT` follows the pinned contract. A test covers the update row (outcome, risk level, `updated_at` set).

**Contract**: `toUpdateRow(command, evaluation, now)`; `updateVerification(...)` → `StoreResult<VerificationDto | null>`.

#### 3. Wizard edit mode, page and link

**File**: `src/components/verification/TagWizard.tsx`, `src/components/verification/ResultCard.tsx`, `src/pages/verifications/[id]/edit.astro` (new), `src/pages/verifications/[id].astro`

**Intent**: `TagWizard` accepts optional `initialDraft` and `verificationId`; in edit mode the report's save action is "Zapisz zmiany" (PUT) with a link back to the saved report. The edit page loads the verification server-side and mounts the wizard; the saved report gets "Edytuj odpowiedzi".

**Contract**: `TagWizard` props `{ initialDraft?: WizardDraft; verificationId?: string }`; `ResultCard` save target chosen by `verificationId`.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Lint passes with exit code 0: `npm run lint`
- Type check passes: `npm run typecheck`
- Build passes: `npm run build`
- Unauthenticated `PUT /api/verifications/<id>` returns 401 UNAUTHENTICATED

#### Manual Verification:

- "Edytuj odpowiedzi" opens the wizard with the saved answers filled in
- Changing an answer (e.g. zipper Lampo → B on a 2009 bag) and "Zapisz zmiany" shows the recalculated result on the saved report and the new label on the list
- The test account cannot open another account's edit page (shows "not found")
- Same walk-through works on production after the deploy

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding.

---

## Testing Strategy

### Unit Tests:

- Draft round trip (letter / no letter / illegible, unknown batch and tab back, optional year and price).
- Update row: recomputed outcome and risk level, `updated_at` present.

### Manual Testing Steps:

1. Open a saved verification → "Edytuj odpowiedzi" → answers are prefilled.
2. Change the zipper to "B" on a 2009 bag → "Sprawdź" → high risk (V-02) → "Zapisz zmiany" → saved report shows high risk; list label "Wysokie ryzyko".
3. Test account → `/verifications/<id>/edit` of the first account → not found.

## References

- Roadmap item: `context/foundation/roadmap.md` — S-06 `edit-saved-verification`
- PRD: FR-011
- S-05 service and API: `src/lib/services/verifications.ts`, `src/pages/api/verifications/`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Edit and recalculate

#### Automated

- [x] 1.1 Unit tests pass
- [x] 1.2 Lint passes with exit code 0
- [x] 1.3 Type check passes
- [x] 1.4 Build passes
- [x] 1.5 Unauthenticated PUT /api/verifications/<id> returns 401 UNAUTHENTICATED

#### Manual

- [x] 1.6 "Edytuj odpowiedzi" opens the wizard with the saved answers filled in
- [x] 1.7 Changing an answer and saving shows the recalculated result and the new list label
- [x] 1.8 Test account cannot open another account's edit page
- [ ] 1.9 Same walk-through works on production after the deploy
