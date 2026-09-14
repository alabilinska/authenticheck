# Delete a Verification Implementation Plan

## Overview

Roadmap S-07 (FR-010): the buyer deletes a saved verification. MVP scope, one phase.

## Current State Analysis

- `public.verifications` has an owner-only delete policy for `authenticated` (S-05 migration); no delete endpoint or UI exists.
- The saved report page `/verifications/[id]` shows the report and "Edytuj odpowiedzi"; the list `/verifications` links to it.

## Desired End State

- The saved report has "Usuń weryfikację"; the first click asks "Na pewno usunąć tę weryfikację?" with "Tak, usuń" and "Anuluj" in the page (no browser dialog); confirming deletes it and returns to the list.
- `DELETE /api/verifications/[id]` → `204` when the user's verification was deleted, `404 NOT_FOUND` when absent or not theirs, `401 UNAUTHENTICATED`, `503 SERVICE_UNAVAILABLE`, `500 DATABASE_ERROR` (CLAUDE.md error format).

### Key Discoveries:

- Deleting with `.delete().eq("id").eq("user_id").select("id")` returns the deleted rows, so a missing or foreign id is detected as 404 without a separate read.

## What We're NOT Doing

- No soft delete or undo; no bulk delete; no delete button on the list rows.

## Implementation Approach

A service function and a `DELETE` handler on the item route, then a small island on the saved report page.

## Phase 1: Delete from the saved report

### Overview

Service, API and the confirm-then-delete control.

### Changes Required:

#### 1. Service and API

**File**: `src/lib/services/verifications.ts`, `src/pages/api/verifications/[id].ts`

**Intent**: `deleteVerification(supabase, userId, id)` deletes the owner's row and reports whether one was deleted; `DELETE` follows the contract above.

**Contract**: `deleteVerification(...)` → `StoreResult<boolean>`; `DELETE /api/verifications/[id]` → `204` / `404` / `401` / `503` / `500`.

#### 2. Delete control

**File**: `src/components/verification/DeleteVerification.tsx` (new), `src/pages/verifications/[id].astro`

**Intent**: A button that switches to an inline confirmation, calls `DELETE`, shows the API error message on failure and goes to `/verifications` on success; mounted with `client:load` on the saved report page.

**Contract**: `DeleteVerification({ verificationId: string })`.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Lint passes with exit code 0: `npm run lint`
- Type check passes: `npm run typecheck`
- Build passes: `npm run build`
- Unauthenticated `DELETE /api/verifications/<id>` returns 401 UNAUTHENTICATED

#### Manual Verification:

- "Usuń weryfikację" asks for confirmation; "Anuluj" keeps it; "Tak, usuń" removes it from the list
- The test account gets 404 for a DELETE of another account's verification and it stays on that account's list
- Same walk-through works on production after the deploy

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding.

---

## Testing Strategy

### Manual Testing Steps:

1. Saved report → "Usuń weryfikację" → "Anuluj" → still there; again → "Tak, usuń" → list without it.
2. Test account → `fetch("/api/verifications/<id>", { method: "DELETE" })` for the first account's id → 404; the entry is still on the first account's list.

## References

- Roadmap item: `context/foundation/roadmap.md` — S-07 `delete-verification`
- PRD: FR-010
- S-05 migration (delete policy): `supabase/migrations/20260914130000_create_verifications.sql`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Delete from the saved report

#### Automated

- [x] 1.1 Unit tests pass
- [x] 1.2 Lint passes with exit code 0
- [x] 1.3 Type check passes
- [x] 1.4 Build passes
- [x] 1.5 Unauthenticated DELETE /api/verifications/<id> returns 401 UNAUTHENTICATED

#### Manual

- [x] 1.6 Delete asks for confirmation; cancel keeps it; confirm removes it from the list
- [x] 1.7 Test account gets 404 for another account's verification and it stays listed
- [ ] 1.8 Same walk-through works on production after the deploy
