---
date: 2026-09-14T12:32:48+0200
researcher: Claude (Opus 5) with the developer
git_commit: 07d9c46dc9046b02b795a33f0a46d52d5eba04d0
branch: main
repository: alabilinska/authenticheck
topic: "How to add the three visual checks (roadmap S-03) to the tag engine, wizard and result card without breaking S-01"
tags: [research, codebase, tag-validation, visual-checklist, wizard, knowledge-file]
status: complete
last_updated: 2026-09-14
last_updated_by: Claude (Opus 5)
---

# Research: visual checks (S-03) on top of the S-01 engine, wizard and result card

**Date**: 2026-09-14T12:32:48+0200
**Researcher**: Claude (Opus 5) with the developer
**Git Commit**: 07d9c46 (source files identical to pushed 799d2ec — permalinks point there)
**Branch**: main
**Repository**: alabilinska/authenticheck

## Research Question

Roadmap S-03 (FR-006, FR-004): the buyer answers the three visual checks from `balenciaga-city-tag-rules.md` §7 — black thread on the tag, Lampo zipper, twist of the bales — each with a hint and a reference photo; era-dependent checks use the year decoded from the tag; "can't see" is neutral and becomes a seller question; each trait is soft on its own and hard only when it contradicts the tag year. How does this fit the existing engine, knowledge file, wizard and result card, and what must be decided before planning?

## Summary

- **Zipper = year resolver, not a copy of S-07.** All 12 two-reading letters have one reading in 2003–2010 and one in 2016–2023 ([knowledge.json:14-64](https://github.com/alabilinska/authenticheck/blob/799d2ecf0b73286daa9a34262f6d010776cad2e2/src/data/balenciaga-classic-city/knowledge.json#L14-L64)). Lampo (≈2001–2014) vs `B` (≈2014/2015 on) therefore always picks one reading. As a `periodFeature` rule inside `evaluateLetter` (like S-05/S-06/S-13) it resolves ambiguous years and checks contradictions with the existing tolerance logic; a post-hoc check like S-07 would abstain exactly where it helps most ([evaluate.ts:257](https://github.com/alabilinska/authenticheck/blob/799d2ecf0b73286daa9a34262f6d010776cad2e2/src/lib/services/tag-validation/evaluate.ts#L257)).
- **Thread and bales are simple soft traits.** No era data for bales; thread is "not verified for post-2014 production" (rules §7). "No" → soft signal, "can't see" → abstain + §8 question. They can never be hard.
- **Integrate inside `evaluateTag` (hybrid option).** A separate `evaluateVisual` + combiner cannot resolve the year, loses the forced-medium of the missing-tag-photo path when recomputing risk, and needs the module-private helpers exported ([evaluate.ts:31-107](https://github.com/alabilinska/authenticheck/blob/799d2ecf0b73286daa9a34262f6d010776cad2e2/src/lib/services/tag-validation/evaluate.ts#L31-L107)).
- **Merge visual rules into the same result lists.** `ResultCard` needs no structural change (titles via `rulesById`, [ResultCard.tsx:7](https://github.com/alabilinska/authenticheck/blob/799d2ecf0b73286daa9a34262f6d010776cad2e2/src/components/verification/ResultCard.tsx#L7)); FR-007 groups by status, not by source.
- **Rules document first.** §7 has no rule IDs; the drift guard reads `[MS]-\d{2}` rows and expects 18 ([knowledge.test.ts:15-18](https://github.com/alabilinska/authenticheck/blob/799d2ecf0b73286daa9a34262f6d010776cad2e2/src/lib/services/tag-validation/knowledge.test.ts#L15-L18)); schema ID regex is `^[MS]-\d{2}$` ([schema.ts:23](https://github.com/alabilinska/authenticheck/blob/799d2ecf0b73286daa9a34262f6d010776cad2e2/src/lib/services/tag-validation/schema.ts#L23)).
- **Wizard: new step 5 "Cechy wizualne"** — but `validateStep` uses `case LAST_STEP` for Markings ([draft.ts:111](https://github.com/alabilinska/authenticheck/blob/799d2ecf0b73286daa9a34262f6d010776cad2e2/src/components/verification/draft.ts#L111)); appending a step silently moves that validation.
- **Photos:** five untracked web-sourced files in `public/`; three have no extension and would be served without a Content-Type; no photo shows the bales twist or a clear thread close-up; one "fake zipper" shows another brand.

## Detailed Findings

### Engine contract and evaluation order

- Types: `TagObservation` flat fields with `"unknown"` values, `RuleSignal`, `YearStatus` (`resolved` / `ambiguous` / `no-letter` / `unknown`), `TagEvaluation` ([types.ts:14-75](https://github.com/alabilinska/authenticheck/blob/799d2ecf0b73286daa9a34262f6d010776cad2e2/src/types.ts#L14-L75)). The header marks it as the pinned contract — lessons.md: re-pin before changing it.
- Order ([evaluate.ts:318-399](https://github.com/alabilinska/authenticheck/blob/799d2ecf0b73286daa9a34262f6d010776cad2e2/src/lib/services/tag-validation/evaluate.ts#L318-L399)): no tag photo → forced medium + question (321-324); hardware unknown → `scope-unknown`; Giant → `unsupported`; M-05 / unconfirmed M-01 → `input-error`; M-02 → `unsupported`; then M-04, M-03, `evaluateLetter` (376), S-11, S-12, `checkHardware` (397), `checkDeclaredYear` (398), `finish`.
- `finish()` ([84-107](https://github.com/alabilinska/authenticheck/blob/799d2ecf0b73286daa9a34262f6d010776cad2e2/src/lib/services/tag-validation/evaluate.ts#L84-L107)): any hard → high; forced or any soft → medium; else low. `signal()` takes confidence from the rule; `ask()` dedupes by key in a Map (insertion order kept).
- Coverage invariant: on 9 risk-path cases every rule ID is fired, passed or abstained exactly once ([evaluate.test.ts:297-320](https://github.com/alabilinska/authenticheck/blob/799d2ecf0b73286daa9a34262f6d010776cad2e2/src/lib/services/tag-validation/evaluate.test.ts#L297-L320)). Every early `evaluateLetter` branch abstains `...featureRules`, so a zipper `periodFeature` rule is covered automatically.

### Zipper era logic (worked cases, Lampo `{to: 2014}`, B `{from: 2015}`, tolerance 1 like S-07/S-13)

| Year status | Answer | Result |
| --- | --- | --- |
| resolved 2005 | B | gap 10 → hard |
| resolved 2014 (H, G) | B | gap 1 → soft |
| resolved 2015 (F, E) | Lampo | gap 1 → soft |
| resolved 2016 | Lampo | gap 2 → hard |
| ambiguous R, P, O, D, C, … | Lampo | keeps the first reading (resolved by the zipper rule) |
| ambiguous, same letters | B | keeps the second reading |
| no-letter (2001–2003) | Lampo / B | `evaluateLetter` abstains features on no-letter ([evaluate.ts:180](https://github.com/alabilinska/authenticheck/blob/799d2ecf0b73286daa9a34262f6d010776cad2e2/src/lib/services/tag-validation/evaluate.ts#L180)); needs an explicit check like S-07's no-letter branch: Lampo pass, B hard |
| unknown | any | abstain |

Gotcha: an "other" answer has no period table → `distance` = Infinity → fires hard against every reading; it must be excluded from dating and handled as its own soft signal.

### Knowledge file and schema

- Rule schema is a discriminated union on `kind` with a literal `signal` and required Polish `title` ([schema.ts:22-89](https://github.com/alabilinska/authenticheck/blob/799d2ecf0b73286daa9a34262f6d010776cad2e2/src/lib/services/tag-validation/schema.ts#L22-L89)); `features` covers `brandLine`, `stamp925`, `madeInItalySize` only (103-107); `sellerQuestions` has fixed keys (108-114), `QuestionKey` derives from them ([evaluate.ts:17](https://github.com/alabilinska/authenticheck/blob/799d2ecf0b73286daa9a34262f6d010776cad2e2/src/lib/services/tag-validation/evaluate.ts#L17)).
- Needed: ID regex allowing `V`; `zipper` feature periods; a soft trait kind for thread/bales; seller-question keys `zipper`, `tagStitching`, `bales` (Polish copy already in rules §8:310-312); drift guard `[MSV]` and the new count; a rules table with IDs under §7; §3.5 and the S-04 message, which name only three resolvers ([knowledge.json:172](https://github.com/alabilinska/authenticheck/blob/799d2ecf0b73286daa9a34262f6d010776cad2e2/src/data/balenciaga-classic-city/knowledge.json#L172)).
- Reference photo path, alt text and dimensions fit as optional data next to the rule (CLAUDE.md: "brand knowledge is data").

### Wizard

- `STEPS` 5 names, `PLATE_STEP = 2`, `LAST_STEP = STEPS.length - 1` ([draft.ts:56-58](https://github.com/alabilinska/authenticheck/blob/799d2ecf0b73286daa9a34262f6d010776cad2e2/src/components/verification/draft.ts#L56-L58)); steps rendered by literal index ([TagWizard.tsx:127-131](https://github.com/alabilinska/authenticheck/blob/799d2ecf0b73286daa9a34262f6d010776cad2e2/src/components/verification/TagWizard.tsx#L127-L131)); progress bar adapts to `STEPS.length`.
- Early stops in `isFinalStep` ([draft.ts:120-124](https://github.com/alabilinska/authenticheck/blob/799d2ecf0b73286daa9a34262f6d010776cad2e2/src/components/verification/draft.ts#L120-L124)) mirror the engine. An input error can only follow a full submit, so visual answers are already in the draft when the wizard returns to the plate step.
- Primitives: `ChoiceGroup` (no image prop; its `hint` renders inside a `<p>`), `StepHeading`, `TagSketch` ([fields.tsx](https://github.com/alabilinska/authenticheck/blob/799d2ecf0b73286daa9a34262f6d010776cad2e2/src/components/verification/fields.tsx)). Content width ≈ 303 px on a 375 px phone. A small `ReferencePhoto` figure above each question, fixed `aspect-[4/3] object-contain`, fits the existing style; "Powiększ" as a link to the file.
- Lint: `jsx-a11y/alt-text` and `img-redundant-alt` apply to `.tsx`.

### Result card

- Sections: hard, soft, seller questions, passed, abstained ([ResultCard.tsx:139-169](https://github.com/alabilinska/authenticheck/blob/799d2ecf0b73286daa9a34262f6d010776cad2e2/src/components/verification/ResultCard.tsx#L139-L169)); titles and confidence badges from `rulesById`. Visual rules in `knowledge.rules` show up without structural change. `abstained` has no reason field — distinguishing "abstained because the year is unresolved" is an S-04 concern.

### Images

| File (untracked) | Type | Size | Dimensions | Content |
| --- | --- | --- | --- | --- |
| `10x_handles_realvsfake.png` | PNG | 552 KB | 655×323 | real vs fake handle attachment incl. the ring; twist not visible |
| `10x_stitching_fake.webp` | WebP | 166 KB | 640×841 | fake plate `N°0754 C 115748` (the S-12 combination); seam barely visible |
| `10x_stitching_real` | WebP, no ext. | 30 KB | 480×282 | two genuine tags (leather-only; plate 103208); no seam close-up |
| `10x_zipper_fake` | WebP, no ext. | 65 KB | 640×853 | pull on another brand's bag ("Dolce" lining) |
| `10x_zipper_real` | WebP, no ext. | 33 KB | 370×370 | genuine Lampo pulls, Yoogi's Closet watermark |

- `public/` is copied to `dist/client` and served as static assets; Content-Type comes from the extension — extensionless files go out without one. Astro `<Image>` cannot be used in the React island and `imageService: "compile"` gives nothing at runtime; a plain `<img src="/reference/…">` is the fit. Rules §7 asks for names after rule IDs.

## Code References

- `src/lib/services/tag-validation/evaluate.ts:151-240` — `evaluateLetter`: strict/tolerated reading pools, resolver order, abstain branches
- `src/lib/services/tag-validation/evaluate.ts:242-266` — `checkHardware` (S-07): era check with tolerance and a no-letter branch
- `src/lib/services/tag-validation/evaluate.ts:318-399` — `evaluateTag` order and early returns
- `src/lib/services/tag-validation/schema.ts:22-114` — rule union, features, seller questions
- `src/lib/services/tag-validation/knowledge.test.ts:13-19` — drift guard against the rules document
- `src/lib/services/tag-validation/evaluate.test.ts:297-320` — "every rule exactly once" coverage
- `src/components/verification/draft.ts:56-146` — steps, validation, early stops, `toObservation`
- `src/components/verification/TagWizard.tsx:30-131` — focus, evaluate, input-error flow, step rendering
- `src/components/verification/ResultCard.tsx:7-169` — rule titles, headline, sections
- `balenciaga-city-tag-rules.md:287-297` — §7 visual traits; `:309-312` — §8 seller questions

## Architecture Insights

- The engine is the single place for rules; the wizard only collects observations and the card only renders `TagEvaluation`. Keeping visual traits as data-driven rules in the same engine preserves this and lets S-06 (edit and recalculate) reuse it.
- Era-dependent evidence already has two patterns: resolver features inside `evaluateLetter` (S-05/S-06/S-13) and post-hoc era checks (S-07). The zipper fits the first because every ambiguous letter straddles the Lampo/B change.
- Soft-vs-hard is not a rule property but a function of distance to the period and the tolerance — the zipper can reuse it unchanged.

## Historical Context (from prior changes)

- `context/archive/2026-09-14-tag-validation-first-result/plan.md` — evaluation order is part of the contract; "unknown" abstains and never fails; seller questions dedupe; S-03 was explicitly out of scope; the wizard card-per-step pattern "becomes the pattern for S-03 and S-04".
- `context/archive/2026-09-14-tag-validation-first-result/reviews/impl-review.md` — F7: every rule on the risk path must be fired, passed or abstained ("Nie sprawdzono — brak danych albo nie dotyczy").
- `context/foundation/prd.md:72, 82, 86, 110, 148-149` — FR-004 neutrality of "can't see", FR-006 soft/hard semantics (resolved 2026-09-14), FR-007 report lists, risk-level definitions.
- `context/foundation/roadmap.md` — S-03 risk: "a single contradiction (e.g. a `B` zipper pull on a bag dated 2005) must become a hard signal"; S-04 carries the e2e test "sign in → new verification → tag numbers → checklist answers → report".
- `context/changes/visual-checklist/change.md` — decision to use the five photos in `public/` now and replace them later.

## Related Research

- None: this is the first `research.md` in the project.

## Open Questions

For `/10x-plan visual-checklist`:

1. **Zipper answer options.** FR-006 says yes / no / can't see, but the trait is a variant: "Lampo" / "B" / "something else" / "can't see"? What does "something else" mean (soft, or hard as a counterfeit sign)?
2. **Zipper as year resolver.** Should the zipper resolve ambiguous letters (e.g. `R` + Lampo → 2009), or only check contradictions?
3. **Zipper boundary.** Lampo to 2014 and B from 2015 with one-year tolerance (2014 + B soft, 2016 + Lampo hard) — or B from 2014?
4. **Thread after 2014.** For a decoded year ≥ 2015: abstain, stay soft, or ask anyway with lower confidence?
5. **Missing tag photo.** Today the wizard and engine stop before any other check; should the visual step still be asked (year unknown → zipper can only be soft/abstain)?
6. **Rule IDs.** `V-01`–`V-03` in a new §7 table of the rules document (the §5 test cases are named `V1`–`V6` — possible confusion), or another prefix?
7. **Photos.** Which file goes to which trait: no photo shows the bales twist or a thread close-up; `10x_zipper_fake` shows another brand; show "fake" examples at all?
8. **Engine contract.** Adding `thread`, `zipper`, `bales` fields to `TagObservation` changes the pinned contract — re-pin in the plan (lessons.md).
