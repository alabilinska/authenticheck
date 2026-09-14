# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-09-14

## 1. Strategy

Testy w tym projekcie trzymają się trzech nienegocjowalnych zasad:

1. **Koszt × sygnał.** Wygrywa najtańszy test, który daje prawdziwy sygnał dla danego ryzyka. Nie przenosimy testu na e2e dlatego, że e2e „wydaje się bezpieczniejsze”. Nie dokładamy modelu wizyjnego tam, gdzie deterministyczne porównanie już łapie regresję.
2. **Obawy użytkowniczki są pełnoprawnym dowodem.** Ryzyka zakotwiczone w „boję się X, a awaria wyszłaby gdzieś w <obszarze>” ważą tyle samo co zapisy PRD czy dane o częstotliwości zmian.
3. **Ryzyka to scenariusze, a nie miejsca w kodzie.** Ten plan opisuje _co może się zepsuć_ i _dlaczego uważamy to za prawdopodobne_ — na podstawie dokumentów, wywiadu i _sygnałów_ z repozytorium (częstotliwość zmian, struktura, obecne testy). NIE twierdzi, że wie, która linia odpowiada za awarię. Tę wiedzę wytwarza `/10x-research` w każdej fazie wdrażania. Jeśli plan i research różnią się co do miejsca awarii, rozstrzyga research.

Zakres przeglądu historii zmian użyty do oceny prawdopodobieństwa: `src/`, `e2e/`, `supabase/migrations/` (14 commitów w kodzie aplikacji w ciągu 30 dni do 2026-09-14).

Profil obecnych testów: **sparse** — Vitest i Playwright skonfigurowane, 7 plików testowych (117 testów jednostkowych, 1 test e2e) skupionych w silniku reguł i serwisach, logice kreatora i raportu oraz głównej ścieżce e2e; bez testów tras API, logowania, middleware, zasad RLS i komponentów.

## 2. Risk Map

Najważniejsze scenariusze awarii, uporządkowane według ryzyka = wpływ × prawdopodobieństwo. Kolumna „Źródło” wskazuje _dowód, który podniósł ryzyko_ — nigdy konkretny plik jako „miejsce awarii” (to zadanie researchu, §1 zasada 3).

| #   | Risk (failure scenario)                                                                                                          | Impact | Likelihood | Source (evidence — not anchor)                                                                                                                                                                                                                                                                                                                      |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Podróbka dostaje „niskie ryzyko”: sygnał twardy nie podnosi poziomu albo sprzeczna kombinacja przechodzi, także po zmianie reguł | High   | High       | wywiad P1 (największa obawa), wywiad P3 (plik reguł zmieniany bez pewności); PRD — kryterium „nigdy niskie ryzyko przy nieudanym sygnale twardym”; hot-spot `src/lib/services/` — 24 zmiany plików / 30 dni; hot-spot `src/data/balenciaga-classic-city/` — 4 commity / 30 dni i dokument reguł — 3 commity / 30 dni (tam lądują zmiany reguł z P3) |
| 2   | Oryginał dostaje „wysokie ryzyko” przez literówkę albo błąd odczytu, zamiast błędu wpisu lub wstrzymania oceny                   | High   | High       | wywiad P2 (już się sparzyłyśmy); archiwum `tag-validation-first-result` — przegląd kodu: literówka w literze sezonu, spacje w numerze, pusta litera przy potwierdzeniu dawały fałszywe wysokie ryzyko; hot-spot `src/components/verification/` — 35 zmian plików / 30 dni (walidacja wpisu po stronie kreatora)                                     |
| 3   | Użytkowniczka widzi, zmienia albo usuwa cudzą weryfikację (nadużycie: brak kontroli własności)                                   | High   | Medium     | wywiad P4 (izolacja sprawdzana tylko ręcznie); PRD — Access Control „każdy widzi i zmienia tylko swoje weryfikacje”; roadmapa S-05 — izolacja musi działać od pierwszego zapisu                                                                                                                                                                     |
| 4   | Zmiana psuje główną ścieżkę weryfikacji, CI jest zielone, a `main` wdraża się automatycznie na produkcję                         | High   | Medium     | roadmapa — test e2e przechodzi tylko lokalnie; tech-stack — automatyczne wdrożenie z `main`; hot-spot `src/components/verification/` — 35 zmian plików / 30 dni                                                                                                                                                                                     |
| 5   | Etykieta ryzyka na liście „Moje weryfikacje” różni się od werdyktu w zapisanym raporcie, np. po zmianie reguł                    | Medium | Medium     | archiwum `save-and-list-verifications` — wynik liczony przy odczycie, etykieta zapisywana przy zapisie; wywiad P3 (częste zmiany reguł); hot-spot `src/components/verification/` — 35 zmian plików / 30 dni (etykieta ryzyka)                                                                                                                       |
| 6   | Chroniona strona albo API odpowiada bez logowania albo zwraca błąd w formacie innym niż uzgodniony                               | Medium | Low        | CLAUDE.md — lista chronionych tras i format błędów API; archiwum `password-reset` — blokada strony przeniesiona do middleware po awarii lintu w CI                                                                                                                                                                                                  |

### Risk Response Guidance

| Risk | What would prove protection                                                                                                                                                                                                                                                                                                                            | Must challenge                                                                                                                                                                                   | Context `/10x-research` must ground                                                                                                                                                                                      | Likely cheapest layer                                                      | Anti-pattern to avoid                                                                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| #1   | Każda kombinacja z nieudanym sygnałem twardym daje „wysokie ryzyko”; wartości pliku wiedzy (litery, okresy, tolerancje) zgadzają się z dokumentem reguł; wynik bez poziomu ryzyka nigdy nie wyświetla się jako „niskie”                                                                                                                                | „Zestaw testowy przechodzi, więc nie ma fałszywego niskiego” — przypadki są skonstruowane, nie z prawdziwych torebek, a odpowiedzi „nie widać” na wielu polach dają „niskie” bez żadnych dowodów | Jak sygnały łączą się w poziom ryzyka; zgodność pliku wiedzy z dokumentem reguł co do wartości (tolerancje, okresy), nie tylko identyfikatorów; werdykty przypadków z §5 dokumentu są już chronione istniejącymi testami | unit                                                                       | oczekiwane wartości przepisane z pliku wiedzy (tautologia) — źródłem oczekiwań jest dokument reguł (`balenciaga-city-tag-rules.md` §5) |
| #2   | Błędne lub dwuznaczne dane (literówki, spacje, znaki spoza alfabetu, puste pola) zatrzymuje walidacja kreatora i API albo silnik wstrzymuje ocenę; tam, gdzie sam dokument reguł czyni regułę twardą (zniekształcona litera, niezgodny numer z odwrotu metki, potwierdzony numer modelu), test jawnie dokumentuje lukę, dopóki dokument się nie zmieni | „Kreator to wyłapie” — walidacja kreatora sama nie ma testów, a API przyjmuje dowolną literę; część fałszywych „wysokich” wynika z dokumentu reguł, a nie z kodu                                 | Które pola mogą dotrzeć do reguł twardych; normalizacja danych; różnica między walidacją kreatora, schematem API a silnikiem                                                                                             | unit (silnik, walidacja kreatora, schemat API; warianty z kategorii błędu) | testowanie wyłącznie literówek, które już naprawiłyśmy; test wymuszający „nigdy twardy” wbrew dokumentowi reguł                        |
| #3   | Druga osoba nie może pobrać, zmienić ani usunąć cudzej weryfikacji — sprawdzone na poziomie bazy (RLS), a nie tylko przez filtr w trasie                                                                                                                                                                                                               | „API zwraca 404, więc RLS działa” — trasy same filtrują po właścicielu, więc test przez API nie dowodzi RLS                                                                                      | Zasady RLS i uprawnienia tabeli; jak uzyskać dwie sesje testowe we wspólnym projekcie Supabase; sprzątanie danych testowych                                                                                              | integration (Supabase, dwa konta testowe)                                  | mockowanie klienta Supabase; sprawdzanie izolacji wyłącznie przez filtr w trasie                                                       |
| #4   | CI robi się czerwone, gdy główna ścieżka (logowanie → kreator → raport) przestaje działać                                                                                                                                                                                                                                                              | „Testy jednostkowe są zielone, więc ścieżka działa”                                                                                                                                              | Sekrety konta testowego w CI; zapisy do wspólnej bazy produkcyjnej; czekanie na hydrację komponentów                                                                                                                     | e2e w CI (istniejący test ścieżki głównej)                                 | niestabilny test e2e; zapisy do bazy bez sprzątania                                                                                    |
| #5   | Etykieta na liście równa się werdyktowi raportu dla tej samej zapisanej weryfikacji, także po edycji i po zmianie reguł                                                                                                                                                                                                                                | „Przeliczanie przy odczycie trzyma wszystko w zgodzie” — etykieta na liście nie jest przeliczana                                                                                                 | Skąd lista bierze etykietę; co ją aktualizuje przy edycji; co się dzieje po zmianie reguł                                                                                                                                | unit (mapowania są czyste, baza tylko przechowuje)                         | porównanie zapisanej wartości samej ze sobą                                                                                            |
| #6   | Każda strona `/verifications` i trasa `/api/verifications` odrzuca brak logowania (przekierowanie albo 401), a błędy mają uzgodniony format                                                                                                                                                                                                            | „Middleware obejmuje wszystko” — trasy API nie są na liście chronionych tras                                                                                                                     | Lista chronionych tras; sprawdzanie sesji w trasach API; ochrona nagłówka `Origin` w Astro                                                                                                                               | integration (na poziomie żądań)                                            | poleganie wyłącznie na ręcznych sprawdzeniach                                                                                          |

## 3. Phased Rollout

Każdy wiersz to osobna faza wdrażania, która otworzy własny folder zmiany przez `/10x-new`. Status przesuwa się od lewej do prawej; orkiestrator aktualizuje go, gdy na dysku pojawiają się kolejne artefakty.

| #   | Phase name                            | Goal (one line)                                                                                                                      | Risks covered | Test types  | Status      | Change folder                                            |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ----------- | ----------- | -------------------------------------------------------- |
| 1   | Silnik reguł bez fałszywych werdyktów | Udowodnić, że podróbka nie dostaje niskiego, a literówka nie daje wysokiego ryzyka; pilnować zgodności etykiety i reguł z dokumentem | #1, #2, #5    | unit        | complete    | context/archive/2026-09-14-testing-rule-engine-verdicts/ |
| 2   | Izolacja kont i ochrona tras          | Udowodnić, że cudze weryfikacje są niedostępne na poziomie bazy i tras, a brak logowania jest odrzucany                              | #3, #6        | integration | not started | —                                                        |
| 3   | Bramka e2e w CI                       | Zablokować wdrożenie zmiany, która psuje główną ścieżkę weryfikacji                                                                  | #4            | e2e + gates | not started | —                                                        |

Warstwy AI (hooki po edycji, przegląd wizyjny) pominięte: przy tej skali i tych ryzykach nie dają sygnału, którego nie dałyby tańsze testy deterministyczne.

## 4. Stack

| Layer              | Tool                   | Version | Notes                                                                                |
| ------------------ | ---------------------- | ------- | ------------------------------------------------------------------------------------ |
| unit + integration | Vitest                 | 5.0.0   | środowisko Node, `src/**/*.test.ts`, bez `getViteConfig`                             |
| API mocking        | none yet — see Phase 2 | —       | Faza 2 testuje na prawdziwym Supabase zamiast mockować klienta                       |
| e2e                | Playwright             | 1.63.0  | Chromium, `e2e/*.spec.ts`, konto testowe z `.dev.vars`; tylko lokalnie — see Phase 3 |
| accessibility      | none                   | —       | pełny audyt WCAG-AA poza zakresem (PRD, non-goals)                                   |

**Stack grounding tools (current session):**

- Docs: none — Context7 not available in current session; checked: 2026-09-14
- Search: web search (generic, not MCP) — Exa.ai not available in current session; checked: 2026-09-14
- Runtime/browser: Chrome browser automation available — not used; Playwright already covers the e2e layer; checked: 2026-09-14
- Provider/platform: GitHub via `gh` CLI (no MCP) — CI run status for quality gates; no Supabase or Cloudflare MCP; checked: 2026-09-14

## 5. Quality Gates

| Gate                                      | Where                   | Required?                 | Catches                                                |
| ----------------------------------------- | ----------------------- | ------------------------- | ------------------------------------------------------ |
| lint + typecheck                          | local + CI              | required                  | dryf składni i typów                                   |
| unit                                      | local + CI              | required                  | regresje logiki silnika reguł i serwisów               |
| integration (izolacja kont, ochrona tras) | local + CI              | required after §3 Phase 2 | dostęp do cudzych danych, niechronione trasy           |
| e2e on critical flows                     | CI on push/PR to `main` | required after §3 Phase 3 | zepsuta ścieżka logowanie → kreator → raport           |
| pre-commit (eslint --fix, prettier)       | local                   | recommended               | formatowanie przed commitem (wymaga `npm run prepare`) |

## 6. Cookbook Patterns

Jak dodawać nowe testy w tym projekcie. Każda podsekcja zostanie uzupełniona, gdy odpowiednia faza wdrażania się zakończy; wcześniej ma treść „TBD — see §3 Phase <N>”.

### 6.1 Adding a unit test for a rule (werdykt silnika)

**Gdzie (Vitest, środowisko Node, `*.test.ts` obok kodu):**

- `src/lib/services/tag-validation/evaluate.test.ts` — przypadki §5 dokumentu reguł (V1–V6, X1–X16) i zachowania zdecydowane.
- `src/lib/services/tag-validation/knowledge.test.ts` — strażnik zgodności `knowledge.json` z dokumentem reguł: tabele parsowane z Markdowna, wartości z prozy jako literały.
- `src/lib/services/tag-validation/invariants.test.ts` — niezmienniki agregacji na siatce kombinacji i na zmienionych kopiach wiedzy; decyzja produktowa „nie widać”.
- `src/lib/services/tag-validation/input-errors.test.ts` — błędne dane: bezpieczne ścieżki silnika i blok `LUKA:`.
- `src/components/verification/draft.test.ts` — `validateStep` i łańcuch kreator → silnik.
- `src/lib/services/verifications.test.ts` — mapowania wierszy, schemat API, spójność listy z raportem.
- `src/components/verification/report.test.ts` — etykiety wyniku.

**Zasady:**

- Źródłem oczekiwań jest `balenciaga-city-tag-rules.md` — tabela parsowana z Markdowna albo literał z komentarzem `// :<linia dokumentu>` — nigdy `knowledge.json` (to byłaby tautologia).
- Zmiana reguły: najpierw dokument, potem JSON. Strażnik w `knowledge.test.ts` ma się zapalić, gdy zmieni się jedno bez drugiego; nowa tolerancja albo okres to nowy literał w jego testach prozy.
- „Po zmianie reguł” = `evaluateTag(obs, zmienionaKopia)`, gdzie kopia to `structuredClone(defaultKnowledge)` po edycji, przepuszczona przez `knowledgeSchema.parse`. Bez `vi.mock` pliku wiedzy.
- Warianty błędnych danych generuj z kategorii błędu (znak spoza alfabetu, znak niewidoczny, pełna szerokość, zamiana lub podmiana cyfry, odwrócone grupy, pusty lub biały znak, wielkość liter wartownika), nie z listy naprawionych literówek. Znaki niewidoczne zapisuj jako `"\u200B"`.
- `LUKA:` = zwykły test charakteryzujący zachowanie, które definiuje sam dokument reguł; nazwa cytuje regułę i § dokumentu, a numer linii stoi w komentarzu nad testem, żeby edycja dokumentu nie zmieniała nazw testów. Zmiana dokumentu albo silnika świadomie zmienia jego kolor.
- `it.fails` tylko dla prawdziwych błędów, nazwa `BŁĄD (lekcja N): …`, zawsze z osobnym zielonym testem `precondition`. W `it.fails` jedyną spodziewanie nieudaną linią jest asercja końcowa; po naprawie zdejmij `.fails`.
- Nowa reguła twarda: kolumna Signal dokumentu → `documentedHardRules` w `fixtures.ts` → profil w siatce `invariants.test.ts`, jeśli siatka jej jeszcze nie odpala (powie to asercja niepustości).
- Zanim zaufasz nowemu testowi, zrób tymczasową mutację (wartość w JSON, agregacja w silniku, regex kreatora), zobacz czerwony test i cofnij.

**Wspólne dane:** `src/lib/services/tag-validation/fixtures.ts` — `v1Observation` (przypadek V1; nadpisuj pojedyncze pola) i `documentedHardRules`.

**Test referencyjny na wzorzec:**

- wartość z prozy dokumentu — `knowledge.test.ts` › „uses the tolerances the document states, and no others”
- tabela parsowana z dokumentu — `knowledge.test.ts` › „encodes the §3.2 letter table…”
- niezmiennik z asercją niepustości — `invariants.test.ts` › „holds for every combination…” i „is not vacuous…”
- błędne dane z kategorii — `input-errors.test.ts` › „unconfirmed style number with …”
- znana luka — `input-errors.test.ts` › „LUKA: M-03 …”
- znany błąd — `it.fails` + zielony warunek wstępny; po naprawie `.fails` znika, np. `verifications.test.ts` › „list = report after a rules change” (setup + test)

**Uruchomienie:** `npm test`; jeden plik: `npx vitest run src/lib/services/tag-validation/knowledge.test.ts`. Po naprawach z lekcji 5 cały zestaw jest zielony, bez „expected fail”.

### 6.2 Adding an integration test for data isolation

- TBD — see §3 Phase 2 (wzorzec: dwie sesje testowe, cudza weryfikacja niedostępna na poziomie bazy).

### 6.3 Adding a test for a new API endpoint or protected page

- TBD — see §3 Phase 2 (wzorzec: brak logowania odrzucony, błąd w uzgodnionym formacie).

### 6.4 Adding an e2e test

- TBD — see §3 Phase 3 (wzorzec: krytyczna ścieżka w CI, czekanie na hydrację, sprzątanie danych).

### 6.5 Per-rollout-phase notes

(Uzupełniane po każdej fazie: 2–3 linie o tym, czego faza nauczyła.)

**Faza 1 — Silnik reguł bez fałszywych werdyktów** (`testing-rule-engine-verdicts`, 2026-09-14)

- Część celów #2 była sprzeczna z dokumentem reguł (S-01, M-03 i potwierdzony M-01 są w nim twarde), więc zamiast „nigdy twardy” są testy `LUKA:`. Zmiana to decyzja produktowa, która zaczyna się w dokumencie.
- Rozjazd listy z raportem po zmianie reguł i etykieta fail-open (`outcomeLabel("risk", null)` → „Niskie ryzyko”) weszły jako 3 × `it.fails` i zostały naprawione w lekcji 5: lista liczy werdykt z zapisanej obserwacji, a wynik bez poziomu to „Brak oceny ryzyka” (także w nagłówku raportu). Dawne `it.fails` są dziś zwykłymi testami.
- Tolerancje S-08 (jeden rok) i S-13 (±1 rok wokół 2010/2011) poprawione w dokumencie reguł; `knowledge.json` bez zmian. „Niskie” przy wielu „nie widać” zostaje decyzją produktową (niespójność PRD `:35` vs `:110`), udokumentowaną w `invariants.test.ts`.
- **Kandydat do `/10x-test-plan --refresh`:** stary wiersz bez nowego pola obserwacji nie przechodzi `parseRow`, a lista mapuje wszystkie wiersze naraz, więc jeden taki wiersz wysypuje całą listę „Moje weryfikacje” (research fazy 1, pytanie 6). To ryzyko zmiany schematu obserwacji, nie etykiety — poza §2 w obecnym kształcie.

## 7. What We Deliberately Don't Test

Pytanie 5 wywiadu zostało pominięte; wykluczenia wynikają z PRD i zostały zaakceptowane w szkicu planu.

- **Analiza zdjęć i warianty spoza zakresu** — produkt nie analizuje zdjęć, a warianty inne niż Classic City medium dostają tylko wynik „nieobsługiwany”. Ponowna ocena, jeśli zakres się rozszerzy. (Źródło: PRD, non-goals.)
- **Praca offline i pełny audyt WCAG-AA** — poza zakresem v1. (Źródło: PRD, non-goals.)
- **Wysyłka e-maili przez Supabase** — sprawdzana ręcznie; zależy od konfiguracji panelu i limitów dostawcy. Ponowna ocena po podpięciu własnego SMTP.
- **Wygląd stron i porównywanie zrzutów ekranu** — styl się zmienia, a takie testy łapią głównie drobiazgi.

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-09-14
- Stack versions last verified: 2026-09-14
- AI-native tool references last verified: 2026-09-14

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (new framework, new test runner),
- §7 negative-space no longer matches what the team believes.
