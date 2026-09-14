# Edit a Saved Verification — Plan Brief

> Full plan: `context/changes/edit-saved-verification/plan.md`

## What & Why

Roadmap S-06 (FR-011): when the seller sends more photos, the buyer updates the saved verification instead of starting over, and sees the report recalculated.

## Starting Point

S-05 saves the listing data and the observation and recomputes the evaluation on read; the wizard only starts from an empty draft.

## Desired End State

"Edytuj odpowiedzi" on a saved report opens the wizard with the saved answers; "Zapisz zmiany" updates the verification, and the saved report and the list show the recalculated result.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Where to edit | The same wizard, prefilled, on `/verifications/[id]/edit` | No second form to keep in sync with the rules. |
| Recalculation | `evaluateTag` on the server for the update, as for the first save | An edited and a fresh report cannot disagree. |
| Update shape | `PUT` with the whole `SaveVerificationCommand` | Same validation as saving; no partial-update edge cases. |
| History | None | MVP; PRD has no requirement for it. |

## Scope

**In scope:** draft ↔ command mapping, update in service and API, wizard edit mode, edit page, "Edytuj odpowiedzi" link.

**Out of scope:** history, statuses, delete (S-07).

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Edit and recalculate | Prefilled wizard, PUT, recalculated report and list label | Draft mapping losing an answer — covered by a round-trip test |

**Prerequisites:** S-05 in the database and on `main`.
**Estimated effort:** ~1 session, 1 phase.

## Success Criteria (Summary)

- A saved verification can be changed and shows the recalculated result; another account cannot edit it.
