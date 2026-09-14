---
project: Authenticheck
version: 1
status: draft
created: 2026-09-13
updated: 2026-09-14
prd_version: 1
main_goal: speed
top_blocker: time
milestone_id: v1-verification-flow
milestone_seq: 1
milestone_status: open
---

# Roadmap: Authenticheck

> Derived from `context/foundation/prd.md` (v1, including the decisions recorded on 2026-09-13 and 2026-09-14) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Milestone

**M-01: Balenciaga verification v1 — from tag details to a saved report** — Status: open

- **Intent:** Prove that brand and era knowledge encoded as checkable rules lets a buyer judge a Balenciaga Classic City listing before buying — the tag and visual checks produce a result with seller questions — and that the buyer can keep, revisit and correct those verifications.
- **Source materials:** `context/foundation/prd.md` (v1); rule content in `balenciaga-city-tag-rules.md`
- **Done when:** every F-NN and S-NN below is `done`, and the PRD's end-to-end test of the main path (sign in → new verification → tag details → checklist answers → report) passes.
- **Scope anchors:** FR-001 – FR-004 and FR-006 – FR-011 (must-have in the PRD), US-01. FR-005 (authenticity card) was deferred to v2 on 2026-09-14 — see Parked.

## Vision recap

A buyer of vintage Balenciaga bags on second-hand marketplaces has no simple way to check authenticity before paying; the knowledge needed — serial formats, tag layouts, era-specific traits — is scattered across forums and videos. The product bets that this knowledge is deterministic enough to encode as checkable rules, so a buyer transcribes what the listing shows and gets a purchase-risk level plus questions for the seller, with no image recognition and no paid per-item service.

## North star

**S-01: First verification: tag details to a result** — the first slice where the app does something a notes file cannot: rules stored as data judge a real tag and produce a result. With the goal set to speed, it goes first; the checklist and report only add evidence on top of it.

> "North star" here means the smallest end-to-end slice whose delivery proves the core product hypothesis — the one claim the whole product stands on (here: rules encoded as data can judge a real tag) — so it is sequenced as early as its prerequisites allow.

## At a glance

| ID | Change ID | Outcome (user can …) | Prerequisites | PRD refs | Status |
| --- | --- | --- | --- | --- | --- |
| F-01 | connect-auth-database-project | (foundation) the auth-and-database project declared in `tech-stack.md` exists and is connected locally and in production; the existing sign-up, sign-in and sign-out flow works end to end | — | Access Control, FR-001 | done |
| S-01 | tag-validation-first-result | user can start a verification (declared year, listing link, price; line fixed to Classic City medium) and, after entering what the tag shows — plate numbers and season letter, the first number on the back of the tab, hardware type, brand-line style, 925 stamp and MADE IN ITALY size — immediately see which rules pass or fail, each with its message and confidence level, and the result: a risk level, or unsupported for a variant outside v1; an unresolved year and input errors are shown without a verdict, and a missing tag photo becomes a seller question and raises the risk one step | F-01, the rule knowledge file (committed 2026-09-14) | US-01, FR-002, FR-003, FR-004 | in-progress |
| S-03 | visual-checklist | user can answer the three visual checks — black thread on the tag, Lampo zipper, spiral hardware twist — as yes / no / can't see, each with a hint and a reference photo legible on a phone; era-dependent checks use the year decoded from the tag, "can't see" stays neutral and becomes a seller question, and each trait is a soft signal on its own and a hard one only when it contradicts the tag year | S-01, reference photos for the three checks committed to the repository | FR-006, FR-004 | proposed |
| S-04 | verification-report | user can see one report with the result — a risk level, or unsupported — and the signals that set it: passed checks, failed hard signals shown separately, unchecked items and checks that abstained because the year is unresolved; they can copy a ready-made list of seller questions, and a low-risk report states that no warning signs were found in the checked traits | S-03 | US-01, FR-007, FR-008 | proposed |
| S-05 | save-and-list-verifications | user can save a verification and later open it from their own list, where each listing shows its risk label; no other user can see it | F-01, S-04 | US-01, FR-009 | proposed |
| S-06 | edit-saved-verification | user can re-open a saved verification, change any answer (e.g. "can't see" → "yes" after the seller sends photos) and see the report recalculated | S-05 | FR-011 | proposed |
| S-07 | delete-verification | user can delete a saved verification from their list | S-05 | FR-010 | proposed |
| S-08 | password-reset | user can reset a forgotten password by email and sign in with the new one; after sign-up, the page tells the user whether the account is ready to use or waits for email confirmation | F-01 | FR-001 | ready |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme | Chain | Note |
| --- | --- | --- | --- |
| A | Verification path | `F-01` → `S-01` → `S-03` → `S-04` → `S-05` → `S-06` | The shortest route to the first proof and a saved report — the speed-first spine. |
| B | List upkeep | `S-07` | Branches from `S-05` in Stream A; runs alongside `S-06`. |
| C | Account recovery | `S-08` | Branches from `F-01`; runs alongside the whole of Stream A. |

## Baseline

What's already in place in the codebase as of `2026-09-14` (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present — SSR framework with interactive islands, utility CSS and one UI component (`astro.config.mjs`, `src/components/ui/button.tsx`); only the starter's pages (`src/pages/index.astro`, placeholder `src/pages/dashboard.astro`, `src/pages/auth/*`) — no product UI.
- **Backend / API:** partial — three form-POST auth endpoints (`src/pages/api/auth/{signin,signup,signout}.ts`); no product endpoints.
- **Data:** partial — the database service is used only for auth; no migrations, tables or seed data. The tag-rule knowledge is in the repository (`balenciaga-city-tag-rules.md`, committed 2026-09-14); reference photos for the three visual checks are still outside it.
- **Auth:** partial — sign-up, sign-in, sign-out and route protection (`src/middleware.ts`, `PROTECTED_ROUTES`), connected to the project locally and in production (F-01); password reset absent.
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
- **Risk:** The sign-in code already existed but had never run against a real project; wiring it first lets S-01 sit behind sign-in from the start instead of retrofitting access control. Watch the free plan's per-request CPU limit once every request checks the session (see `infrastructure.md`).
- **Status:** done

## Slices

### S-01: First verification: tag details to a result

- **Outcome:** user can start a verification (declared year, listing link, price; line fixed to Classic City medium) and, after entering what the tag shows — plate numbers and season letter, the first number on the back of the tab, hardware type, brand-line style, 925 stamp and MADE IN ITALY size — immediately see which rules pass or fail, each with its message and confidence level, and the result: a risk level, or unsupported for a variant outside v1; an unresolved year and input errors are shown without a verdict, and a missing tag photo becomes a seller question and raises the risk one step.
- **Change ID:** tag-validation-first-result
- **PRD refs:** US-01, FR-002, FR-003, FR-004
- **Prerequisites:** F-01, the rule knowledge file (committed 2026-09-14)
- **Parallel with:** S-08
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The milestone's deepest investment: the rules and their test cases decide whether the product works at all. The rules falsify but never verify — a well-made counterfeit passes a correct tag — so the zero-false-positive guardrail is tested as "no invalid entry is accepted". The plate prints the numbers in the reverse of the row order, so a misread must surface as an input error, not as risk.
- **Status:** in-progress

### S-03: Visual checklist with reference photos

- **Outcome:** user can answer the three visual checks — black thread on the tag, Lampo zipper, spiral hardware twist — as yes / no / can't see, each with a hint and a reference photo legible on a phone; era-dependent checks use the year decoded from the tag, "can't see" stays neutral and becomes a seller question, and each trait is a soft signal on its own and a hard one only when it contradicts the tag year.
- **Change ID:** visual-checklist
- **PRD refs:** FR-006, FR-004
- **Prerequisites:** S-01, reference photos for the three checks committed to the repository
- **Parallel with:** S-08
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Depends on the year decoded in S-01; the photos already exist outside the repository, so the work is mostly content plus the era switch, where a single contradiction (e.g. a `B` zipper pull on a bag dated 2005) must become a hard signal.
- **Status:** proposed

### S-04: Verification report with seller questions

- **Outcome:** user can see one report with the result — a risk level, or unsupported — and the signals that set it: passed checks, failed hard signals shown separately, unchecked items and checks that abstained because the year is unresolved; they can copy a ready-made list of seller questions, and a low-risk report states that no warning signs were found in the checked traits.
- **Change ID:** verification-report
- **PRD refs:** US-01, FR-007, FR-008
- **Prerequisites:** S-03
- **Parallel with:** S-08
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The first slice where the whole US-01 path runs, so it carries the PRD's end-to-end test of the main path; the guardrail "never low risk when a hard signal failed" is verified here across the tag and visual evidence.
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
- **Parallel with:** S-01, S-03, S-04, S-05, S-06, S-07
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Independent of the verification flow, so it can go to a separate agent run in parallel; sign-up and sign-in already exist, only reset is missing. Also fixes the post-sign-up page: it currently picks its message by build mode, so production always says "check your inbox" even when email confirmation is off and no email is sent.
- **Status:** ready

## Backlog Handoff

| Roadmap ID | Change ID | Suggested issue title | Ready for `/10x-plan` | Notes |
| --- | --- | --- | --- | --- |
| F-01 | connect-auth-database-project | Connect the auth-and-database project locally and in production | done | Done 2026-09-13 outside the change workflow — see `## Done` |
| S-01 | tag-validation-first-result | First verification: validate the tag and show the result | yes | Run `/10x-plan tag-validation-first-result` — the north star |
| S-03 | visual-checklist | Visual checklist: three checks with hints and reference photos | no | Waits for S-01 and the photos in the repo |
| S-04 | verification-report | Report: result, signals and copyable seller questions | no | Waits for S-03 |
| S-05 | save-and-list-verifications | Save a verification and list it with its risk label | no | Waits for S-04 |
| S-06 | edit-saved-verification | Re-open a saved verification, edit answers, recalculate | no | Waits for S-05 |
| S-07 | delete-verification | Delete a saved verification | no | Waits for S-05 |
| S-08 | password-reset | Password reset and accurate sign-up confirmation | yes | Run `/10x-plan password-reset` — independent of the verification flow |

This table is the clean handoff to Jira/Linear or any MCP-backed backlog.

## Open Roadmap Questions

1. **Deadline vs scope.** The hard deadline (2026-09-14) leaves ~4 after-hours evenings for the full v1 scope (accounts with password reset, tag validation with era decoding, authenticity card, 3-signal checklist, report, list + delete, and — restored after shaping — editing a saved verification, FR-011), first sized for 3 weeks. A further scope cut was offered during shaping and declined; the compression was accepted deliberately. This is the single largest delivery risk. — Owner: user. Block: no (acknowledged).
2. **Does the rule test set exist yet?** Resolved 2026-09-13: the source is the developer's collected knowledge file (rules + authentic and faulty examples); every example becomes a test case. Committed 2026-09-14 as `balenciaga-city-tag-rules.md`. — Owner: user. Block: no.
3. **Which rules are "confirmed" vs "probable"?** Resolved 2026-09-13 (policy): a rule is "confirmed" only when the knowledge file cites a source for it; otherwise it ships as "probable". — Owner: user. Block: no.
4. **Which lines are selectable in v1?** Resolved 2026-09-14: Classic City medium with classic hardware only; Motorcycle and Giant hardware are out of scope and reported as unsupported. — Owner: user. Block: no.
5. **Unresolved dependency audit.** The lockfile is unchanged since bootstrap and the audit still reports 2 critical and 14 high findings. Part of the high findings in the page framework are fixed by a patch release within the current major version; the critical one (remote code execution through AVIF image optimization) is fixed only in the next major version, which also requires the next major version of the deploy adapter. Decide: upgrade, or accept with a recorded mitigation. — Owner: user. Block: roadmap-wide, before the first external user (does not block planning).
6. **Are the visual checks hard or soft signals?** Resolved 2026-09-14: as in the rule knowledge file (§7) — each trait is soft on its own and hard only when it contradicts the tag year; PRD FR-006 and Business Logic updated. — Owner: user. Block: no.

## Parked

- **Authenticity card check (FR-005)** — Why parked: deferred to v2 on 2026-09-14 (PRD §Non-Goals); the rule knowledge file has no sourced data on the card's contents. Formerly slice S-02 `authenticity-card-check`.
- **Other Balenciaga variants (Motorcycle, City with Giant hardware, other City sizes)** — Why parked: PRD §Non-Goals; no sourced rules, such bags are reported as unsupported.
- **Other brands (Louis Vuitton, Gucci, Chloé)** — Why parked: PRD §Non-Goals; v1 carries only Balenciaga Classic City medium knowledge on a brand-agnostic engine.
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
