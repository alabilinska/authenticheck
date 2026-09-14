# Visual Checklist (MVP) — Plan Brief

> Full plan: `context/changes/visual-checklist/plan.md`
> Research: `context/changes/visual-checklist/research.md` (deeper options, deferred)

## What & Why

Roadmap S-03 (FR-006): the buyer answers three visual checks — black thread on the tag, Lampo zipper, twist of the bales — so the verdict uses more than the tag. MVP: the simplest version that works end to end, so the whole v1 flow can be finished first.

## Starting Point

The S-01 engine evaluates the tag and decodes the year; the wizard has five cards; rules §7 describes the traits without rule IDs; five web-sourced photos sit in `public/`.

## Desired End State

A sixth wizard card asks the three checks with a hint and a reference photo; the result lists V-01–V-03 with the tag rules and the risk level includes them.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Zipper answers | Lampo / B / nie widać | The trait is a variant, not yes/no. | Plan (MVP) |
| Zipper era | Lampo ≤ 2014, B ≥ 2015, soft within 1 year, else hard; abstain on ambiguous year | Same logic as the S-07 hardware check. | Plan (MVP) |
| Year resolution by zipper | Not in MVP | Kept for later in research. | Research → deferred |
| Thread, bales | tak / nie / nie widać; "nie" soft | Rules §7: soft on their own. | PRD / rules |
| Missing tag photo | No visual step | Unchanged early stop. | Plan (MVP) |
| Photos | The developer's web photos, renamed into `public/reference/`; fakes unused | Developer's decision; replaceable later. | Developer |
| Rule IDs | V-01–V-03 in a new §7 table | Rules document first, then JSON. | CLAUDE.md |

## Scope

**In scope:** rules §7 table, knowledge + schema, engine + tests, wizard card with photos, result via existing lists.

**Out of scope:** zipper as year resolver, "other" zipper answer, thread era rule, fake examples, image modal, report redesign (S-04).

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Visual checks in rules, engine, wizard and result | V-01–V-03 end to end | Existing tests with years ≥ 2016 need the zipper set to "b" |

**Prerequisites:** S-01 done; photos in the repo (moved in this change).
**Estimated effort:** ~1 session, 1 phase.

## Open Risks & Assumptions

- Web-sourced photos (one watermarked) are public on production until replaced.
- No photo shows the bales twist clearly; the handle-attachment photo stands in.

## Success Criteria (Summary)

- A 2016 bag with a Lampo zipper is flagged high risk; "nie widać" adds seller questions without changing the risk.
