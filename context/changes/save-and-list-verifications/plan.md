# Save and List Verifications Implementation Plan

## Overview

Roadmap S-05 (FR-009, Access Control): a signed-in buyer saves a verification and later opens it from their own list, where each entry shows its risk label; no other user can see it. MVP scope. Phase 1 builds the backend in a separate git worktree while S-04 (report) is built on `main`; Phase 2 wires the UI after S-04 is merged.

## Current State Analysis

- No database tables or migrations exist (`supabase/migrations/` missing); the Supabase project is shared by local dev and production (`.dev.vars`), created with Data API on, auto-expose of new tables off and automatic RLS on (`context/deployment/deploy-plan.md`).
- Conventions (CLAUDE.md): API routes export uppercase `GET`/`POST`, validate with `z` from `astro/zod`, return errors as `{ error: { code, message, context? } }` with the HTTP status; every new table gets RLS with per-operation, per-role policies; migrations named `YYYYMMDDHHmmss_short_description.sql`.
- `createClient(request.headers, cookies)` (`src/lib/supabase.ts`) returns `null` without env vars; `context.locals.user` is set by `src/middleware.ts`; `PROTECTED_ROUTES` redirects pages, so API routes must answer 401 themselves.
- The engine is pure and deterministic: `evaluateTag(observation)` (`src/lib/services/tag-validation/evaluate.ts`) turns a `TagObservation` (`src/types.ts`) into a `TagEvaluation`.

## Desired End State

- Table `public.verifications` with RLS: each authenticated user can select, insert, update and delete only rows where `user_id = auth.uid()`.
- `POST /api/verifications` saves the listing data and the observation; the server evaluates it and stores the outcome and risk level for the list.
- `GET /api/verifications` returns the user's list (newest first); `GET /api/verifications/[id]` returns one saved verification with its evaluation recomputed.
- The report has a "Zapisz weryfikację" button; `/verifications` lists saved verifications with their risk labels; an entry opens its report; the dashboard links to the list.

### Key Discoveries:

- Storing the observation and recomputing the evaluation on read keeps saved verifications consistent with rule updates and lets S-06 (edit) reuse the same path; `outcome` and `risk_level` are stored only so the list needs no recomputation.
- With auto-expose off, the migration must `GRANT` the table to `authenticated`, or the Data API returns 401/404 even with correct policies.

## What We're NOT Doing

- No edit (S-06) or delete (S-07) endpoints or UI.
- No pagination or search on the list.
- No storing of the full evaluation JSON; no report redesign (S-04 owns the report).
- No Supabase CLI linking: the migration is applied by the developer in the Supabase SQL editor.

## Implementation Approach

Phase 1 is backend-only and independent of S-04: migration, types, a small service with a zod schema for the saved payload, and three API handlers, all unit-tested where logic exists. Phase 2 (after S-04 merges into `main`) adds the save action on the report, the list page and the single-verification page.

## Critical Implementation Details

- **API contract (pinned before the first endpoint — lessons.md):**
  - `POST /api/verifications` body `SaveVerificationCommand = { listingUrl: string (http/https URL), declaredYear: number | null, price: number | null, observation: TagObservation }` → `201 { verification: VerificationDto }`.
  - `GET /api/verifications` → `200 { verifications: VerificationListItem[] }`.
  - `GET /api/verifications/[id]` → `200 { verification: VerificationDto }`, `404 NOT_FOUND` when absent or not the user's.
  - `VerificationListItem = { id, listingUrl, declaredYear, outcome, riskLevel, createdAt }`; `VerificationDto = VerificationListItem & { price, observation: TagObservation, evaluation: TagEvaluation, updatedAt }`.
  - Errors: `401 UNAUTHENTICATED`, `400 INVALID_INPUT` (zod issues in `context`), `404 NOT_FOUND`, `503 SERVICE_UNAVAILABLE` (no Supabase client), `500 DATABASE_ERROR`.
- **Shared database:** the migration touches the production database; it must only create the new table, policies, grant and index.

## Phase 1: Verifications table and API (worktree)

### Overview

Runs in `../authenticheck-save` on branch `save-and-list-verifications`. Delivers the table with RLS and the three endpoints; no UI.

### Changes Required:

#### 1. Migration

**File**: `supabase/migrations/20260914130000_create_verifications.sql` (new)

**Intent**: Create `public.verifications` (`id uuid pk default gen_random_uuid()`, `user_id uuid not null default auth.uid() references auth.users on delete cascade`, `listing_url text not null`, `declared_year int`, `price numeric(10,2)`, `observation jsonb not null`, `outcome text not null`, `risk_level text`, `created_at`/`updated_at timestamptz not null default now()`), enable RLS, grant select/insert/update/delete to `authenticated`, one policy per operation for `authenticated` using `user_id = (select auth.uid())`, index on `(user_id, created_at desc)`.

**Contract**: Table and column names above; no other schema objects.

#### 2. Types and service

**File**: `src/types.ts`, `src/lib/services/verifications.ts` (new), `src/lib/services/verifications.test.ts` (new)

**Intent**: Add the DTOs from the pinned contract; the service holds the zod schema for `SaveVerificationCommand` (including a full `TagObservation` schema), the mapping from a database row to `VerificationListItem` / `VerificationDto` (evaluation recomputed with `evaluateTag`), and the row built for insert (outcome and risk level from the evaluation).

**Contract**: `saveVerificationSchema`, `toInsertRow(command, evaluation)`, `toListItem(row)`, `toDto(row)`.

#### 3. API routes

**File**: `src/pages/api/verifications/index.ts` (new), `src/pages/api/verifications/[id].ts` (new)

**Intent**: `POST` and `GET` on the collection, `GET` on one item, following the pinned contract; auth from `context.locals.user`, Supabase client from `createClient`; RLS enforces ownership, the handlers also filter by `user_id` for clarity.

**Contract**: Routes and responses as pinned above.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Lint passes with exit code 0: `npm run lint`
- Type check passes: `npm run typecheck`
- Build passes: `npm run build`
- Unauthenticated `GET /api/verifications` returns 401 with `{ error: { code: "UNAUTHENTICATED" } }`: `curl -s localhost:4322/api/verifications`

#### Manual Verification:

- Migration applied in the Supabase SQL editor without errors; the table shows RLS enabled
- Signed in, a POST from the browser console saves a verification and returns 201 with the evaluation
- GET lists it; a second account sees an empty list and gets 404 for the first account's id

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding.

---

## Phase 2: Save button, list and saved report (after S-04 merge)

### Overview

On `main` after both branches are merged: the report gets "Zapisz weryfikację", the user gets a list page and can open a saved report.

### Changes Required:

#### 1. Save from the report

**File**: the S-04 report component, `src/components/verification/TagWizard.tsx`

**Intent**: A "Zapisz weryfikację" button posts `SaveVerificationCommand` built from the wizard draft and shows a link to the saved entry; API errors are shown in the card.

**Contract**: Uses `POST /api/verifications` only.

#### 2. List and saved report pages

**File**: `src/pages/verifications/index.astro` (new), `src/pages/verifications/[id].astro` (new), `src/pages/dashboard.astro`

**Intent**: The list shows listing link, declared year, date and risk label (newest first) with an empty state; an entry opens the saved report rendered by the S-04 report component; the dashboard links to the list. Both pages are protected by the existing `/verifications` prefix.

**Contract**: Pages read through the same service as the API (server-side Supabase client).

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Lint passes with exit code 0: `npm run lint`
- Type check passes: `npm run typecheck`
- Build passes: `npm run build`

#### Manual Verification:

- Saving from the report shows the entry on the list with its risk label
- Opening an entry shows the same report as before saving
- A second account does not see the first account's entries
- The same walk-through works on production after the deploy

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding.

---

## Testing Strategy

### Unit Tests:

- `saveVerificationSchema`: valid payload, bad URL, unknown enum value in the observation, missing fields; `toInsertRow` stores outcome and risk level from the evaluation; `toDto` recomputes the evaluation.

### Manual Testing Steps:

1. Apply the migration in the Supabase SQL editor.
2. Signed in, save a verification (Phase 1: browser console; Phase 2: the button) and see it listed.
3. Sign in with a second account: empty list, 404 for the first account's id.

## References

- Roadmap item: `context/foundation/roadmap.md` — S-05 `save-and-list-verifications`
- PRD: FR-009, Access Control
- Conventions: CLAUDE.md (API errors, migrations, RLS)
- Lesson: `context/foundation/lessons.md` — pin the API contract before the first endpoint

## Implementation Notes

- 2026-09-14: the second session in the worktree was not started, so Phase 1 is implemented on `main` in the main session after S-04 (developer's decision); the worktree `../authenticheck-save` and its empty branch were removed. The dev server for checks runs on port 4321, not 4322.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Verifications table and API (worktree)

#### Automated

- [x] 1.1 Unit tests pass
- [x] 1.2 Lint passes with exit code 0
- [x] 1.3 Type check passes
- [x] 1.4 Build passes
- [x] 1.5 Unauthenticated GET /api/verifications returns 401 UNAUTHENTICATED

#### Manual

- [x] 1.6 Migration applied in the Supabase SQL editor, RLS enabled
- [x] 1.7 Signed-in POST saves a verification and returns 201 with the evaluation
- [x] 1.8 GET lists it; a second account sees an empty list and 404 for the first account's id

### Phase 2: Save button, list and saved report (after S-04 merge)

#### Automated

- [ ] 2.1 Unit tests pass
- [ ] 2.2 Lint passes with exit code 0
- [ ] 2.3 Type check passes
- [ ] 2.4 Build passes

#### Manual

- [ ] 2.5 Saving from the report shows the entry on the list with its risk label
- [ ] 2.6 Opening an entry shows the same report as before saving
- [ ] 2.7 A second account does not see the first account's entries
- [ ] 2.8 Same walk-through works on production after the deploy
