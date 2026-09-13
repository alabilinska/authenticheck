---
project: Authenticheck
version: 1
status: draft
created: 2026-09-13
updated: 2026-09-13
prd_version: 1
main_goal: speed
top_blocker: time
milestone_id: v1-verification-flow
milestone_seq: 1
milestone_status: open
---

# Roadmap: Authenticheck

> Derived from `context/foundation/prd.md` (v1, including the decisions recorded on 2026-09-13) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Milestone

**M-01: Balenciaga verification v1 — from tag numbers to a saved report** — Status: open

- **Intent:** Prove that brand and era knowledge encoded as checkable rules lets a buyer judge a Balenciaga City listing before buying — tag, card and visual checks produce a risk level with seller questions — and that the buyer can keep, revisit and correct those verifications.
- **Source materials:** `context/foundation/prd.md` (v1)
- **Done when:** every F-NN and S-NN below is `done`, and the PRD's end-to-end test of the main path (sign in → new verification → tag numbers → checklist answers → report) passes.
- **Scope anchors:** FR-001 – FR-011 (all marked must-have in the PRD), US-01.

## Vision recap

A buyer of vintage Balenciaga bags on second-hand marketplaces has no simple way to check authenticity before paying; the knowledge needed — serial formats, tag layouts, era-specific traits — is scattered across forums and videos. The product bets that this knowledge is deterministic enough to encode as checkable rules, so a buyer transcribes what the listing shows and gets a purchase-risk level plus questions for the seller, with no image recognition and no paid per-item service.

## North star

**S-01: First verification: tag numbers to a risk level** — the first slice where the app does something a notes file cannot: rules stored as data judge a real tag and produce a risk level. With the goal set to speed, it goes first; the card, checklist and report only add evidence on top of it.

> "North star" here means the smallest end-to-end slice whose delivery proves the core product hypothesis — the one claim the whole product stands on (here: rules encoded as data can judge a real tag) — so it is sequenced as early as its prerequisites allow.

## At a glance

| ID | Change ID | Outcome (user can …) | Prerequisites | PRD refs | Status |
| --- | --- | --- | --- | --- | --- |
| F-01 | connect-auth-database-project | (foundation) the auth-and-database project declared in `tech-stack.md` exists and is connected locally and in production; the existing sign-up, sign-in and sign-out flow works end to end | — | Access Control, FR-001 | done |
| S-01 | tag-validation-first-result | user can start a verification (line, declared year, listing link, price) and, after entering the tag's two lines, immediately see which rules pass or fail — each with its message and confidence level — and the resulting risk level; a missing tag photo becomes a seller question and raises the risk one step | F-01, the developer's rule knowledge file (rules with sources, authentic and faulty examples) committed to the repository | US-01, FR-002, FR-003, FR-004 | proposed |
| S-02 | authenticity-card-check | user can enter the authenticity-card numbers and see match, mismatch or no card against the tag; a mismatch is a hard signal (it alone sets high risk), a match adds little weight, and a missing card or card photo stays neutral and becomes a seller question | S-01 | FR-005, FR-004 | proposed |
| S-03 | visual-checklist | user can answer the three hard-signal visual checks — black thread on the tag, Lampo zipper, spiral hardware twist — as yes / no / can't see, each with a hint and a reference photo legible on a phone; era-dependent checks use the year decoded from the tag, and "can't see" stays neutral and becomes a seller question | S-01, reference photos for the three checks committed to the repository | FR-006, FR-004 | proposed |
| S-04 | verification-report | user can see one report with the risk level and the signals that set it — passed checks, failed hard signals shown separately, unchecked items — and copy a ready-made list of seller questions; a low-risk report states that no warning signs were found in the checked traits | S-02, S-03 | US-01, FR-007, FR-008 | proposed |
| S-05 | save-and-list-verifications | user can save a verification and later open it from their own list, where each listing shows its risk label; no other user can see it | F-01, S-04 | US-01, FR-009 | proposed |
| S-06 | edit-saved-verification | user can re-open a saved verification, change any answer (e.g. "can't see" → "yes" after the seller sends photos) and see the report recalculated | S-05 | FR-011 | proposed |
| S-07 | delete-verification | user can delete a saved verification from their list | S-05 | FR-010 | proposed |
| S-08 | password-reset | user can reset a forgotten password by email and sign in with the new one; after sign-up, the page tells the user whether the account is ready to use or waits for email confirmation | F-01 | FR-001 | ready |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme | Chain | Note |
| --- | --- | --- | --- |
| A | Verification path | `F-01` → `S-01` → `S-02` → `S-04` → `S-05` → `S-06` | The shortest route to the first proof and a saved report — the speed-first spine. |
| B | Visual checklist | `S-03` | Branches from `S-01`; joins Stream A at `S-04`. |
| C | List upkeep | `S-07` | Branches from `S-05` in Stream A; runs alongside `S-06`. |
| D | Account recovery | `S-08` | Branches from `F-01`; runs alongside the whole of Stream A. |

## Baseline

What's already in place in the codebase as of `2026-09-13` (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present — SSR framework with interactive islands, utility CSS and one UI component (`astro.config.mjs`, `src/components/ui/button.tsx`); only the starter's pages (`src/pages/index.astro`, placeholder `src/pages/dashboard.astro`, `src/pages/auth/*`) — no product UI.
- **Backend / API:** partial — three form-POST auth endpoints (`src/pages/api/auth/{signin,signup,signout}.ts`); no product endpoints.
- **Data:** partial — the database service is used only for auth; `supabase/config.toml` exists, but there are no migrations, tables or seed data. Rule knowledge and reference photos for the three visual checks exist **outside the repository** (developer's collected file and photos), not yet committed.
- **Auth:** partial — sign-up, sign-in, sign-out and route protection (`src/middleware.ts`, `PROTECTED_ROUTES`); password reset absent; no auth-and-database project connected, so in production the app runs in its "not configured" mode.
- **Deploy / infra:** present — Worker live on workers.dev, production auto-deploys from `main`, CI runs lint + build only (`wrangler.jsonc`, `.github/workflows/ci.yml`, `context/deployment/deploy-plan.md`). Pre-commit hooks are configured but not installed locally. Dependency audit unresolved since bootstrap: 2 critical, 14 high (see Open Roadmap Questions).
- **Observability:** partial — platform request logs enabled (`wrangler.jsonc` `observability`); no logging library or error tracking.
- **Tests:** absent — no test runner or test files; the PRD's success criteria require a rule test set and an end-to-end test.

## Foundations

### F-01: Auth-and-database project connected

- **Outcome:** (foundation) the auth-and-database project declared in `tech-stack.md` exists and is connected locally and in production; the existing sign-up, sign-in and sign-out flow works end to end.
- **Change ID:** connect-auth-database-project
- **PRD refs:** Access Control, FR-001
- **Unlocks:** S-01 (its page sits behind sign-in), S-05 (first stored verifications), S-08 (password reset)
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The sign-in code already exists but has never run against a real project; wiring it first lets S-01 sit behind sign-in from the start instead of retrofitting access control. Watch the free plan's per-request CPU limit once every request checks the session (see `infrastructure.md`).
- **Status:** done

## Slices

### S-01: First verification: tag numbers to a risk level

- **Outcome:** user can start a verification (line, declared year, listing link, price) and, after entering the tag's two lines, immediately see which rules pass or fail — each with its message and confidence level — and the resulting risk level; a missing tag photo becomes a seller question and raises the risk one step.
- **Change ID:** tag-validation-first-result
- **PRD refs:** US-01, FR-002, FR-003, FR-004
- **Prerequisites:** F-01, the developer's rule knowledge file (rules with sources, authentic and faulty examples) committed to the repository
- **Parallel with:** S-08
- **Blockers:** —
- **Unknowns:** 
  - Which lines are selectable in v1 — City only, or City + Motorcycle? — Owner: user. Block: no. (PRD Open Question 4; answered by the rule knowledge file.)
- **Risk:** The milestone's deepest investment: the rules and their test examples decide whether the product works at all, and the PRD guardrail of zero false "format correct" results applies here first. Sequenced first so a wrong rule shape surfaces before the card, checklist and report build on it.
- **Status:** proposed

### S-02: Authenticity card check

- **Outcome:** user can enter the authenticity-card numbers and see match, mismatch or no card against the tag; a mismatch is a hard signal (it alone sets high risk), a match adds little weight, and a missing card or card photo stays neutral and becomes a seller question.
- **Change ID:** authenticity-card-check
- **PRD refs:** FR-005, FR-004
- **Prerequisites:** S-01
- **Parallel with:** S-03, S-08
- **Blockers:** —
- **Unknowns:** 
  - Which card field is compared with which tag field — Owner: user. Block: no. (Rule knowledge file, card section.)
- **Risk:** A small rule set, but the asymmetric weighting is easy to invert; kept apart from S-01 so the tag rules are proven first.
- **Status:** proposed

### S-03: Visual checklist with reference photos

- **Outcome:** user can answer the three hard-signal visual checks — black thread on the tag, Lampo zipper, spiral hardware twist — as yes / no / can't see, each with a hint and a reference photo legible on a phone; era-dependent checks use the year decoded from the tag, and "can't see" stays neutral and becomes a seller question.
- **Change ID:** visual-checklist
- **PRD refs:** FR-006, FR-004
- **Prerequisites:** S-01, reference photos for the three checks committed to the repository
- **Parallel with:** S-02, S-08
- **Blockers:** —
- **Unknowns:** 
  - Expected answer per era for each check (e.g. zipper variant after 2014) — Owner: user. Block: no. (Rule knowledge file, visual-checks section.)
- **Risk:** Depends on the year decoded in S-01; the photos already exist outside the repository, so the work is mostly content plus the era switch.
- **Status:** proposed

### S-04: Verification report with seller questions

- **Outcome:** user can see one report with the risk level and the signals that set it — passed checks, failed hard signals shown separately, unchecked items — and copy a ready-made list of seller questions; a low-risk report states that no warning signs were found in the checked traits.
- **Change ID:** verification-report
- **PRD refs:** US-01, FR-007, FR-008
- **Prerequisites:** S-02, S-03
- **Parallel with:** S-08
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The first slice where the whole US-01 path runs, so it carries the PRD's end-to-end test of the main path; the guardrail "never low risk when a hard signal failed" is verified here across all three evidence sources.
- **Status:** proposed

### S-05: Save and list verifications

- **Outcome:** user can save a verification and later open it from their own list, where each listing shows its risk label; no other user can see it.
- **Change ID:** save-and-list-verifications
- **PRD refs:** US-01, FR-009
- **Prerequisites:** F-01, S-04
- **Parallel with:** S-08
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The product's first stored data; the PRD's per-user isolation must hold from the first save rather than being added later.
- **Status:** proposed

### S-06: Edit a saved verification

- **Outcome:** user can re-open a saved verification, change any answer (e.g. "can't see" → "yes" after the seller sends photos) and see the report recalculated.
- **Change ID:** edit-saved-verification
- **PRD refs:** FR-011
- **Prerequisites:** S-05
- **Parallel with:** S-07, S-08
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Recalculation must run the same rules as the first pass, otherwise an edited report and a fresh one can disagree.
- **Status:** proposed

### S-07: Delete a verification

- **Outcome:** user can delete a saved verification from their list.
- **Change ID:** delete-verification
- **PRD refs:** FR-010
- **Prerequisites:** S-05
- **Parallel with:** S-06, S-08
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The smallest slice; deleted verifications are not test cases (PRD FR-010), so nothing needs preserving.
- **Status:** proposed

### S-08: Password reset

- **Outcome:** user can reset a forgotten password by email and sign in with the new one; after sign-up, the page tells the user whether the account is ready to use or waits for email confirmation.
- **Change ID:** password-reset
- **PRD refs:** FR-001
- **Prerequisites:** F-01
- **Parallel with:** S-01, S-02, S-03, S-04, S-05, S-06, S-07
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Independent of the verification flow, so it can go to a separate agent run in parallel; sign-up and sign-in already exist, only reset is missing. Also fixes the post-sign-up page: it currently picks its message by build mode, so production always says "check your inbox" even when email confirmation is off and no email is sent.
- **Status:** ready

## Backlog Handoff

| Roadmap ID | Change ID | Suggested issue title | Ready for `/10x-plan` | Notes |
| --- | --- | --- | --- | --- |
| F-01 | connect-auth-database-project | Connect the auth-and-database project locally and in production | done | Done 2026-09-13 outside the change workflow — see `## Done` |
| S-01 | tag-validation-first-result | First verification: validate the tag and show a risk level | no | Waits for F-01 and the rule knowledge file in the repo |
| S-02 | authenticity-card-check | Check the authenticity card against the tag | no | Waits for S-01 |
| S-03 | visual-checklist | Visual checklist: three checks with hints and reference photos | no | Waits for S-01 and the photos in the repo |
| S-04 | verification-report | Report: risk level, signals and copyable seller questions | no | Waits for S-02 and S-03 |
| S-05 | save-and-list-verifications | Save a verification and list it with its risk label | no | Waits for S-04 |
| S-06 | edit-saved-verification | Re-open a saved verification, edit answers, recalculate | no | Waits for S-05 |
| S-07 | delete-verification | Delete a saved verification | no | Waits for S-05 |
| S-08 | password-reset | Password reset and accurate sign-up confirmation | yes | Run `/10x-plan password-reset` — independent of the verification flow |

This table is the clean handoff to Jira/Linear or any MCP-backed backlog.

## Open Roadmap Questions

1. **Deadline vs scope.** The hard deadline (2026-09-14) leaves ~4 after-hours evenings for the full v1 scope (accounts with password reset, tag validation with era decoding, authenticity card, 3-signal checklist, report, list + delete, and — restored after shaping — editing a saved verification, FR-011), first sized for 3 weeks. A further scope cut was offered during shaping and declined; the compression was accepted deliberately. This is the single largest delivery risk. — Owner: user. Block: no (acknowledged).
2. **Does the rule test set exist yet?** Resolved 2026-09-13: the source is the developer's collected knowledge file (rules + authentic and faulty examples); every example becomes a test case. Pending: the file is committed to the repository. — Owner: user. Block: S-01 (and through it S-02 – S-07).
3. **Which rules are "confirmed" vs "probable"?** Resolved 2026-09-13 (policy): a rule is "confirmed" only when the knowledge file cites a source for it; otherwise it ships as "probable". — Owner: user. Block: no.
4. **Which lines are selectable in v1?** Non-Goals scope v1 to "Balenciaga City / Motorcycle"; FR-002 and US-01 mention only City. — Owner: user. Block: no (answered by the rule knowledge file; tracked as an S-01 Unknown).
5. **Unresolved dependency audit.** The lockfile is unchanged since bootstrap and the audit still reports 2 critical and 14 high findings. Part of the high findings in the page framework are fixed by a patch release within the current major version; the critical one (remote code execution through AVIF image optimization) is fixed only in the next major version, which also requires the next major version of the deploy adapter. Decide: upgrade, or accept with a recorded mitigation. — Owner: user. Block: roadmap-wide, before the first external user (does not block planning).

## Parked

- **Other brands (Louis Vuitton, Gucci, Chloé)** — Why parked: PRD §Non-Goals; v1 carries only Balenciaga City / Motorcycle knowledge on a brand-agnostic engine.
- **Photo analysis (image recognition, AI)** — Why parked: PRD §Non-Goals; the buyer looks and answers, the app never inspects photos.
- **Valuation, reference prices and automatic listing import** — Why parked: PRD §Non-Goals; link and price are the buyer's own notes.
- **Sharing verifications and a native mobile app** — Why parked: PRD §Non-Goals; each buyer sees only their own, web in a phone browser.
- **Remaining visual checks (handle-attachment notches, leather softness, smell)** — Why parked: PRD §Non-Goals, deferred to v2.
- **"Bought" / "rejected" statuses** — Why parked: PRD §Non-Goals, deferred to v2.
- **Offline use, full WCAG-AA audit, multilingual interface** — Why parked: PRD §Non-Goals (non-functional).

## Milestone History

(Append-only. Empty on the first milestone.)

## Done

- **F-01: (foundation) the auth-and-database project exists and is connected locally and in production; sign-up, sign-in and sign-out work end to end** — Done 2026-09-13, marked by hand at the developer's request: executed outside the change workflow (no change folder, nothing to archive). Evidence: `context/deployment/deploy-plan.md` (project in eu-central-1, secrets via `wrangler secret bulk`, version `7f2e9e37`, sign-in verified in production by the developer). Lesson: —
