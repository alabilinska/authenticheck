# Review fixes — follow-ups

Źródło: `reviews/impl-review.md` (przegląd pełnego planu, 2026-09-14). Do zrobienia w osobnej zmianie — plan tej zmiany wykluczył modyfikację istniejących testów.

## F8 — jedno źródło wspólnych danych testowych

- [ ] `src/lib/services/tag-validation/evaluate.test.ts` i `src/lib/services/verifications.test.ts`: zastąpić lokalne kopie V1 (`base`, `v1`) importem `v1Observation` z `src/lib/services/tag-validation/fixtures.ts`.
- [ ] `src/components/verification/draft.test.ts`: dodać `expect(toObservation(v1Draft)).toEqual(v1Observation)`, żeby `v1Draft` nie rozjechał się z V1.
- [ ] Przenieść `changedKnowledge(edit)` (`invariants.test.ts`) i wyszukiwanie reguły po `kind` (`rule()` w `knowledge.test.ts`, `knowledgeWithBZipperFrom` w `verifications.test.ts`) do `fixtures.ts`; zaktualizować §6.1 `context/foundation/test-plan.md`.
