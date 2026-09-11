---
project: "Authenticheck"
context_type: greenfield
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 1
  hard_deadline: 2026-09-14
  after_hours_only: true
created: 2026-09-07
updated: 2026-09-10
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: "pain category"
      decision: "data trapped somewhere + missing capability"
    - topic: "insight"
      decision: "brand/era knowledge is rule-encodable; no image AI needed"
    - topic: "primary persona scope"
      decision: "single named user — the author, a vintage-bag buyer"
    - topic: "access model"
      decision: "login (email + password), chosen over local-profile recommendation; flat user model"
    - topic: "MVP scope"
      decision: "scoped down: checklist = 3 hard signals (with reference photos), report = save + view only; authenticity-card step and accounts kept; 3 weeks"
    - topic: "declared year vs tag"
      decision: "year decoded from the tag letter code is the reference; seller's declared year is compared, mismatch is soft + seller question"
    - topic: "rule confidence"
      decision: "each rule carries confirmed / probable; message shows it"
    - topic: "missing evidence"
      decision: "no tag/card photo raises risk one level + question; 'can't see' on visual checks is neutral"
    - topic: "authenticity card weight"
      decision: "asymmetric: mismatch = hard signal, match = low weight, none = neutral + question"
    - topic: "report scoring"
      decision: "no point score; risk level + the signals that set it"
    - topic: "deleted verifications"
      decision: "hard delete stays; rule test corpus is curated from sources, independent of user data"
    - topic: "risk level thresholds"
      decision: "high = ≥1 hard signal; medium = ≥1 soft signal or missing tag/card photo; low = everything checked and consistent"
    - topic: "scale probe"
      decision: "rule is per bag; 100× users does not change it"
    - topic: "deadline vs scope"
      decision: "hard deadline 2026-09-14 (4 days); full v1 scope kept deliberately, accounts incl. password reset; user accepted the compression"
    - topic: "update restored"
      decision: "editing answers on a saved verification restored as FR-011 after shaping (domain-natural update + external data-management requirement); statuses stay v2"
  frs_drafted: 11
  quality_check_status: accepted
---

# Shape notes — Authenticheck

Seed: `ideas-notes.md` (read in full at session start).

## Vision & Problem Statement

A buyer of vintage luxury bags on the second-hand market (Depop, Vinted, Vestiaire, shops in Japan) has no simple way to self-verify a bag's authenticity before purchase. The knowledge needed — serial-number formats, tag layouts, brand- and era-specific traits — is scattered across forums and videos. The cost: overpaying for counterfeits, or walking away from genuine good deals.

Insight: brand/era authentication knowledge is deterministic enough to encode as checkable rules (serial format, era consistency, authenticity-card match, visual-trait checklist). Self-serve, pre-purchase verification is possible without image recognition or a paid per-item service.

Pain category: data trapped somewhere (knowledge exists but is unstructured) + missing capability (no self-serve tool for non-experts).

## User & Persona

Primary persona: the author — a vintage luxury-bag buyer who regularly evaluates second-hand listings. The moment: looking at a specific listing (photos, seller description, serial number) and needing to decide buy / ask the seller / skip. Single named user for the MVP; other buyers may follow later.

## Access Control

Login required — email + password sign-up, sign-in and password reset. Flat user model: one role; each user can create, view, update and delete only their own verifications. Unauthenticated visitors hitting a gated route are sent to sign-in.

Rationale (user's choice over the local-profile recommendation): verifications should be reachable across devices, and the door stays open for other buyers without a later auth retrofit.

## Success Criteria

### Primary
- A buyer completes a full Balenciaga City verification — from entering the tag numbers to a report — in under 5 minutes.
- The serial/model validator correctly classifies every example in the prepared test set, both authentic and faulty.
- Every report contains at least one concrete action to take before buying (a seller question or a decisive hard signal).
- An end-to-end test passes the exact MVP path: sign in → new verification → tag numbers → checklist answers → report with risk level and ≥ 1 seller question.

### Secondary
- Balenciaga knowledge lives as data, not code: adding a rule means editing a data file plus a test case, with no engine change.

### Guardrails
- The report never shows "low risk" when a hard signal has failed — a hard signal decides regardless of how many other checks passed.
- The validator never returns a false "format correct" on the faulty examples in the test set (zero false positives on the corpus).

## MVP flow (v1, scoped) — feeds User Stories

1. Sign in (email + password) → list of verifications.
2. "New verification" → line (brand locked to Balenciaga), declared year (optional), listing link, price (optional) → "Start".
3. Leather tag: line 1 (model number) + line 2 (serial number) → immediate validation (format · model ↔ line · tag layout ↔ declared year) with a specific message naming what failed; or "no photo" → flagged to ask the seller.
4. Authenticity card: numbers → match / mismatch / no card in listing.
5–7. Visual checklist, one card per check, each with a hint, a reference photo and yes / no / can't see: tag stitched with black thread along the top edge · zipper marked Lampo underneath · spiral twist of the strap hardware.
8. Report: risk level (low / medium / high) · what passed · failed hard signals shown separately · what could not be checked + copy-ready seller questions → "Save".
9. List shows the listing with its risk label; a saved verification can be re-opened to update answers and the report recalculates (no statuses).

Value moment: the seller-question list, or a hard signal that settles it (can occur as early as step 3).

## Timeline acknowledgment

Acknowledged on 2026-09-10: hard deadline 2026-09-14 leaves ~4 after-hours evenings for the full v1 flow (accounts with password reset, tag validation with era decoding, authenticity card, 3-signal checklist, report, list + delete). The flow was first sized for 3 weeks; a further scope cut was offered (drop era rules, 1 visual check, no list) and declined. User keeps the full scope deliberately and accepts the compression. FR-011 (editing a saved verification) was added after shaping, growing the scope further.

## Deferred to v2 (feeds Non-Goals)

- Remaining visual checks: handle-attachment notches, leather softness, leather smell (lower weight, mostly unverifiable online).
- "Bought" / "rejected" statuses. (Re-opening to update answers was deferred here originally, then restored as FR-011 after shaping.)

## User Stories

### US-01: Buyer verifies a Balenciaga City listing end-to-end

- **Given** a signed-in buyer with a Vinted listing open showing the leather tag, the authenticity card and the hardware
- **When** they start a new verification for line City / year 2010, enter the tag and card numbers, and answer the three visual checks
- **Then** they see a report with a risk level and at least one seller question or one decisive hard signal, and the saved verification appears on their list with its risk label

## Functional Requirements

### Accounts
- FR-001: Buyer can sign up, sign in and reset their password with email + password. Priority: must-have
  > Socrates: Counter-argument considered: "for a single user, accounts are a week of plumbing with no domain value." Resolution: kept; accounts are an external requirement on the project, not a domain need. Recorded as such.

### Starting a verification
- FR-002: Buyer can start a new verification by giving the line (brand locked to Balenciaga), the seller's declared year (optional), the listing link and an optional price. Priority: must-have
  > Socrates: Counter-argument considered: "the seller's declared year is often wrong; validating tag layout against it would false-fail authentic bags." Resolution: revised — the year decoded from the tag's letter code is the reference; the declared year is only compared against it, and a mismatch is a soft signal plus a seller question, never a hard fail.

### Leather tag & serial number
- FR-003: Buyer can enter the tag's two lines (model number, serial number) and immediately see validation of format, model ↔ line, and decoded year ↔ tag layout, with a specific message naming the failed rule and its confidence level (confirmed / probable). Priority: must-have
  > Socrates: Counter-argument considered: "era/layout rules are uncertain for older years; a message naming a rule asserts more certainty than the sources have." Resolution: revised — every rule carries a confidence level as part of its data, and the message shows it ("Confirmed: model 115748 = City" vs "Probable: two-line layout appears from ~2007").
- FR-004: Buyer can mark any check as unavailable ("no photo" / "can't see") so it becomes a seller question; a missing tag or card photo raises the risk level by one step, while "can't see" on a visual check is neutral. Priority: must-have
  > Socrates: Counter-argument considered: "a luxury-bag listing with no tag photo is itself a risk signal, not a neutral 'ask later'." Resolution: revised — absence of key evidence (tag, card) raises risk one level and generates a question; a detail not visible in the photos stays neutral.

### Authenticity card
- FR-005: Buyer can enter the authenticity-card numbers and see match / mismatch / no card against the tag, weighted asymmetrically: mismatch is a hard signal, match carries low weight, no card is neutral plus a seller question. Priority: must-have
  > Socrates: Counter-argument considered: "cards are easily faked and often lost — 'match' proves little and 'none' means nothing." Resolution: revised — the card can fail a bag but barely passes it; its evidential value is asymmetric.

### Visual checklist
- FR-006: Buyer can answer three hard-signal visual checks (black thread on tag, Lampo zipper, spiral hardware twist) as yes / no / can't see, each with a hint and a reference photo; checks whose expected answer depends on era (e.g. zipper variant, changed after 2014) use the year decoded from the tag. Priority: must-have
  > Socrates: Counter-argument considered: "hard traits changed between eras; three fixed questions false-fail authentic bags from other years." Resolution: revised — the tag's letter code decodes to a year via a simple dictionary, and era-dependent checks (zipper variant) key off it.

### Report
- FR-007: Buyer sees a report with a risk level (low / medium / high) and the signals that set it: passed checks, failed hard signals shown separately, and unchecked items. Priority: must-have
  > Socrates: Counter-argument considered: "a point score next to the risk level is two messages; the user trusts an arbitrary number." Resolution: revised — point score dropped; the level follows from the rules (hard signal → high, missing tag → +1 level, …) and the report explains why.
- FR-008: Buyer can copy a ready-made list of seller questions generated from the unchecked items. Priority: must-have
  > Socrates: Counter-argument considered: "templated questions tip off a dishonest seller about which traits are checked." Resolution: rejected — asking for a photo of the tag or of the handle attachments does not reveal what is being looked for.

### Persistence
- FR-009: Buyer can save a verification and later open it from a list showing each listing's risk label. Priority: must-have
  > Socrates: Counter-argument considered: "without editing, a saved verification is dead once the seller sends photos; the list fills with duplicates." Resolution: rejected — when new information arrives the user deletes the entry and re-verifies; the link, line and price captured at start give the list its context. Superseded in part by FR-011, which restores editing.
- FR-010: Buyer can delete a saved verification. Priority: must-have
  > Socrates: Counter-argument considered: "deleted verifications are lost test cases — every real listing is data." Resolution: kept; the rule test corpus is curated from sources independently of user data. Valuable listing examples are added to the corpus by hand.
- FR-011: Buyer can re-open a saved verification, change any answer (e.g. "can't see" → "yes" / "no" after the seller sends photos), and see the report recalculated. Priority: must-have
  > Socrates: Counter-argument considered: "editing adds a record lifecycle (completed → in progress → completed) and a recalculation path — the cost that got it cut during shaping." Resolution: restored after shaping — updating answers when new evidence arrives is the domain-natural change to a verification, and the project has an external requirement that stored data can be updated. Statuses ("bought" / "rejected") stay in v2.

## Non-Functional Requirements

- Number validation feels immediate: the result appears in under 1 second after the buyer submits the tag or card numbers.
- The product is usable in a browser on both phone and desktop; hints and reference photos remain legible on a phone screen, since verification typically happens next to an open listing.

## Business Logic

The application determines a purchase-risk level and a list of missing evidence, where hard signals are decisive, missing evidence raises the risk, and the authenticity card only ever counts against the bag.

Inputs are what the buyer transcribes and observes from the listing: the model number and serial number from the leather tag, the numbers from the authenticity card, yes / no / can't-see answers to three visual checks, and "no photo" marks where evidence is absent; the line and the seller's declared year provide context. The year decoded from the tag's letter code is the reference; the declared year is only compared against it.

The output is a risk level with the signals that set it, plus the missing evidence phrased as copy-ready seller questions. Levels: **high** = at least one hard signal (rule failure on the tag, card mismatch, a hard visual trait answered "no"); **medium** = at least one soft signal (e.g. declared year disagrees with the decoded year) or a missing tag/card photo; **low** = everything checked and consistent. "Can't see" on a visual check does not lower the level but becomes a question.

The buyer meets the rule twice: immediately after the tag step, where a hard signal can already settle the matter, and in the final report after the last check.

## Non-Goals

Functional:
- Other brands (Louis Vuitton, Gucci, Chloé) — later iterations; v1 carries only Balenciaga City / Motorcycle knowledge, on a brand-agnostic engine.
- Photo analysis — no image recognition or AI; the buyer looks and answers, the app never inspects photos. Load-bearing: shapes the whole flow.
- Valuation / reference prices and automatic listing import (scraping, link parsing) — link and price are the buyer's own notes; nothing is fetched from marketplaces.
- Sharing verifications between users, and a native mobile app — each buyer sees only their own; web in a phone browser instead of an app.
- Remaining visual checks (handle-attachment notches, leather softness, smell) — deferred to v2 (phase 3 scope cut).
- "Bought" / "rejected" statuses on a verification — deferred to v2; re-opening a verification to update answers is in scope (FR-011).

Non-functional:
- No offline use — verification happens next to an online listing.
- No full WCAG-AA accessibility — basic legibility yes, formal audit no.
- No multilingual interface — one UI language in v1.

## Quality cross-check

Run 2026-09-10 — all six greenfield elements present: Access Control, Business Logic (one-sentence rule), project artifacts, timeline-cost acknowledged, Non-Goals, (preserved behavior n/a). No gaps.

Note for `/10x-prd` Open Questions: the 4-day deadline against the full v1 scope is the single largest delivery risk; see `## Timeline acknowledgment`.
