# Verification Report — Plan Brief

> Full plan: `context/changes/verification-report/plan.md`

## What & Why

Roadmap S-04 (US-01, FR-007, FR-008): the report must show the result with the signals behind it, give the buyer a copy-ready list of seller questions, and always offer a concrete next step; the PRD's end-to-end test of the main path lands here.

## Starting Point

The S-01/S-03 result card already shows the headline, year, signals, questions and rule lists; it has no copy action, mixes year-related abstentions with others, and a medium report can have no question. No e2e tooling exists.

## Desired End State

Soft signals add their §8 question; "Kopiuj pytania do sprzedawcy" copies a ready message; unresolved-year checks have their own section; `npm run test:e2e` walks the whole path.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Medium report without questions | Each soft signal adds its matching §8 question | Concrete and satisfies the PRD "at least one action" criterion. |
| Copy format | Greeting, listing link, numbered questions | Ready to paste into a marketplace chat. |
| Year-unresolved checks | Own section for S-07, S-08, V-02 when the year is ambiguous | FR-007 names them separately. |
| E2E | Playwright, local, test account in `.dev.vars` | Meets the PRD without GitHub secrets; CI later. |

## Scope

**In scope:** engine/knowledge soft-signal questions, report copy button and section, Playwright test, docs.

**Out of scope:** saving (S-05), e2e in CI, report redesign.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Report gaps | Questions for soft signals, copy, unresolved-year section | Existing tests asserting exact question lists change |
| 2. E2E test | Playwright + main-path spec | Needs a test account; shares the production database |

**Prerequisites:** S-03 done; a test account for Phase 2.
**Estimated effort:** ~1 session, 2 phases.

## Open Risks & Assumptions

- The e2e test signs in against the shared Supabase project; it does not save data (S-05 not merged yet).

## Success Criteria (Summary)

- A medium report always has a seller question and a working copy action; the main-path e2e test passes locally.
