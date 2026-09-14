# First verification — tag details to a result — Plan Brief

> Full plan: `context/changes/tag-validation-first-result/plan.md`

## What & Why

Roadmap S-01, the north star: a signed-in buyer enters what a Balenciaga Classic City tag shows and immediately sees which rules pass or fail, with the result — a risk level or a no-verdict state. It is the smallest flow that tests the product's core bet: authentication knowledge encoded as data can judge a real tag.

## Starting Point

The 10x Astro starter with working auth (F-01) and a placeholder dashboard; no domain code, no tests. The tag knowledge is complete in `balenciaga-city-tag-rules.md`: 18 rules, the season-letter table with double readings, period layouts, seller questions and a 22-case test set.

## Desired End State

A protected `/verifications/new` page with a card-per-step wizard. After the tag steps, a pure TypeScript engine reads the rules from a JSON file and the result card shows the verdict, the year, hard and soft signals (message + confidence each) and the seller questions. Every case from the rules document runs as a unit test. Nothing is saved yet.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Where evaluation runs | In the browser, pure TS module | Instant result, no API contract now, and the same function will recalculate on the server for S-05/S-06. |
| Knowledge format | JSON + schema checked in tests | Meets the PRD secondary criterion: a new rule is a data edit plus a test case, not engine code. |
| Wizard layout | One page, step cards with a progress bar, starter theme | Matches "one step, one card", works on a phone, and becomes the pattern for S-03 and S-04. |
| Style-number typo (`11574`) | Ask to confirm first, hard signal only if confirmed | Catches both typos and genuinely wrong tags without accusing a genuine bag. |
| Hardware "can't see" | Stop, ask the seller about the hardware | Hardware is the scope gate; judging an out-of-scope bag is what the rules file forbids. |
| When to evaluate | On submitting the tag steps | Matches the flow description and lets multi-field rules see complete data. |
| Tests in this change | Vitest unit tests over the full test set; e2e in S-04 | The PRD's end-to-end path only exists once the report (S-04) does. |
| Engine contract | Pinned in the plan, types in `src/types.ts` | Applies the lesson: pin the contract before an agent invents one. |
| Verification in CI | `npm run typecheck` (astro check) and `npm test` added to CI | The build strips types without checking them and CI ran no tests (review F1). |
| Year boundaries, seller questions, input normalization | Rules pinned in the plan with tests | So the implementer does not decide them (review F2–F4). |

## Scope

**In scope:** test runner, type-check script, tests and type check in CI; knowledge JSON + schema; pure engine with the full evaluation order; unit tests for V1–V6, X1–X16 and the decided cases; protected wizard page; result card; dashboard entry link; `npm test` in CLAUDE.md and README.

**Rules document:** one line added under X1 in §5 (confirmation before `M-01`).

**Out of scope:** saving, list, edit, delete (S-05–S-07); authenticity card (v2); visual checklist and photos (S-03); full report, copying questions and e2e test (S-04); API endpoint; translating the English auth screens.

## Architecture / Approach

`knowledge.json` (rules, letters, periods, hardware eras, seller questions) → validated by `schema.ts` → consumed by `evaluateTag(observation) → TagEvaluation` (pure, synchronous). The wizard island collects a `TagObservation` across cards and renders the `TagEvaluation`. Evaluation order: tag photo → hardware gate → row-1 input errors → supported style number → plate/tab/letter rules, all listed, no early exit. Double letters resolve by keeping the readings compatible with the brand line, 925 stamp and MADE IN ITALY size.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Rule engine and test set | Tested engine + knowledge file, no UI | Encoding the double-letter and boundary-tolerance rules so that all 22 cases agree with the document |
| 2. Wizard page and result | Protected wizard, result card, dashboard link, docs | A long tag form staying usable on a phone within the 5-minute success criterion |

**Prerequisites:** F-01 done (auth works); rules document committed.
**Estimated effort:** ~2 sessions, one per phase.

## Open Risks & Assumptions

- The test set's valid cases are constructed from documented components, not photographs of real bags — the rules falsify, never verify (rules §5).
- The plate row order is "probable" in the rules document; if real plates differ, only labels and `M-05` change, not the engine.
- The declared-year comparison uses a one-year tolerance because the start card asks for a year, not a season.

## Success Criteria (Summary)

- A signed-in buyer gets a correct result for any case in the rules document's test set, within a second of submitting the tag.
- A typo or unreadable detail never produces "high risk" on its own.
- `npm test` proves every documented case, so rule changes are safe to make as data.
