# Faza 1 testów — silnik reguł bez fałszywych werdyktów: skrót planu

> Pełny plan: `context/changes/testing-rule-engine-verdicts/plan.md`
> Research: `context/changes/testing-rule-engine-verdicts/research.md`

## What & Why

Faza 1 planu testów dodaje testy jednostkowe dla trzech ryzyk. Pierwsze: podróbka dostaje „niskie ryzyko” (#1). Drugie: literówka daje oryginałowi „wysokie ryzyko” (#2). Trzecie: etykieta na liście różni się od werdyktu raportu (#5). Oczekiwania pochodzą z dokumentu reguł, nie z pliku wiedzy. Tam, gdzie dokument sam czyni regułę twardą albo kod ma prawdziwy błąd, testy jawnie to dokumentują zamiast wymuszać naprawę.

## Starting Point

117 zielonych testów. Werdykty §5 (V1–V6, X1–X16) są już chronione. Strażnik zgodności porównuje tylko identyfikatory reguł, `validateStep` nie ma testów, a test mapowania listy porównuje zapisaną wartość samą ze sobą. Research potwierdził sondą: twarde S-01 dla zniekształconej litery, twarde M-03 dla literówki w numerze z odwrotu, rozjazd listy z raportem po zmianie reguł i etykietę fail-open.

## Desired End State

`npm test` zielone z nowymi blokami: strażnik wartości `knowledge.json`, niezmiennik „twardy ⇒ wysokie” na siatce kombinacji, zasłona kreatora, bezpieczne ścieżki silnika, testy „LUKA:” i tabela „lista = raport”. Dokładnie 3 `it.fails` czekają na lekcję 5. Dokument reguł jawnie opisuje tolerancje S-08 i S-13, a `test-plan.md` §6.1 opisuje, jak dodać test reguły.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| S-01 dla zniekształconej litery | Test charakteryzujący „LUKA:” + testy `validateStep`, bez zmian w kodzie | Dokument definiuje S-01 jako twarde, a zaostrzenie wspólnego schematu wysypałoby stare wiersze | Plan |
| M-03 bez potwierdzenia | Przypięte jako luka, bezpieczne warianty jako ochrona | Krok potwierdzenia to zmiana dokumentu, UI i typu, czyli osobna zmiana funkcjonalna | Plan |
| Testy czerwone na obecnym kodzie (#5, etykieta fail-open) | `it.fails` z zielonym warunkiem wstępnym | Naprawa błędów to lekcja 5, a `it.fails` sam wymusi zdjęcie znacznika po naprawie | Plan |
| „Niskie” przy braku danych | Tylko dokumentujemy (decyzja produktowa) | Niespójność PRD `:35` vs `:110` to decyzja produktowa, nie testowa | Plan |
| Tolerancja S-08 | Poprawić dokument na ±1 rok, dopisać ±1 dla S-13; JSON bez zmian | Źródło sporu przesuwa litery o dwa sezony (= rok), a deklaracja sprzedawcy nie ma sezonu | Plan |
| Warstwa testów | Wyłącznie unit | Silnik i mapowania są czyste, a integracja nie dodaje sygnału | Research |
| Wiedza „po zmianie reguł” | `evaluateTag(obs, zmodyfikowanaKopia)`, bez `vi.mock` | Silnik przyjmuje wiedzę jako parametr | Research |
| Stary wiersz wysypuje listę | Poza zakresem, kandydat do `--refresh` | To ryzyko zmiany schematu, a nie etykiety | Research |

## Scope

**In scope:** poprawka tekstu S-08/S-13 w dokumencie; strażnik wartości (litery, typ „hard”, okresy, tolerancje, komunikaty); niezmiennik na siatce dla wiedzy domyślnej i zmodyfikowanej; semantyka wstrzymania; `validateStep` i łańcuch kreator → silnik; bezpieczne ścieżki silnika i testy „LUKA:”; schemat API; lista = raport; `it.fails` ×3; cookbook §6.1 i §6.5.

**Out of scope:** naprawy błędów (lekcja 5); zmiany dokumentu dla S-01, M-03 i „niskiego”; krok potwierdzenia numeru z odwrotu; zaostrzenie schematów; testy komponentów React; Supabase, CI i e2e; refaktor istniejących testów; stary wiersz wysypujący listę.

## Architecture / Approach

Testy stoją na trzech źródłach prawdy. Pierwsze to dokument reguł, parsowany tam, gdzie jest tabelą, a cytowany literałem z odnośnikiem do linii tam, gdzie jest prozą. Drugie to niezmienniki strukturalne niezależne od wartości wiedzy (siatka z asercją niepustości: wszystkie 12 reguł twardych musi zadziałać). Trzecie to porównanie dwóch dróg odczytu tego samego wiersza (lista kontra raport). Warianty błędnych danych są generowane z kategorii błędu. Nowe pliki testów korzystają ze wspólnej obserwacji V1 w `fixtures.ts`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Dokument i strażnik wartości | Tekst S-08/S-13 + porównanie wartości JSON z dokumentem | Parser tabeli liter źle czyta „2019” lub „—” |
| 2. Niezmiennik, wstrzymanie, fail-open | Siatka „twardy ⇒ wysokie” + „nie widać” + `it.fails` etykiety | Siatka za wolna albo pusta (bez asercji niepustości) |
| 3. Błędne dane | `validateStep`, łańcuch kreator → silnik, bezpieczne ścieżki, „LUKA:”, schemat API | Warianty tylko z naprawionych przypadków |
| 4. Lista = raport | Tabela werdyktów, po edycji, 2× `it.fails` po zmianie reguł | `it.fails` przechodzący z niewłaściwego powodu |
| 5. Cookbook | `test-plan.md` §6.1 i §6.5 | §6.1 zbyt ogólny dla `/10x-tdd` |

**Prerequisites:** zielony `npm test` na obecnym `main`; `npx astro sync` wykonany (dla lintu).
**Estimated effort:** ~2 sesje, 5 małych faz, bez zmian w kodzie produkcyjnym.

## Open Risks & Assumptions

- Cięcie siatki może pominąć kombinację, w której przyszły refaktor złamie niezmiennik. Łagodzi to asercja pokrycia wszystkich wartości pól i 12 reguł twardych.
- Testy „LUKA:” utrwalają zachowanie, które krzywdzi oryginały (fałszywe „wysokie”). To świadomy dług do czasu zmiany dokumentu.
- Luki fail-open w `ResultCard.tsx` nie przykrywa żaden test, bo środowisko to Node. Odnotowane w opisie `it.fails`.

## Success Criteria (Summary)

- Cicha zmiana wartości w `knowledge.json` albo obniżenie reguły twardej do miękkiej zapala test.
- Każda kombinacja z sygnałem twardym daje „wysokie”, także na zmodyfikowanej wiedzy; każda luka i każdy znany błąd ma nazwany test.
- §6.1 planu testów odpowiada na pytanie „jak dodać test reguły”.
