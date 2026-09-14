# Faza 1 testów — silnik reguł bez fałszywych werdyktów: plan wdrożenia

## Overview

Faza 1 z `context/foundation/test-plan.md` (§3) dostarcza testy jednostkowe dla ryzyk #1 (podróbka dostaje „niskie ryzyko”), #2 (oryginał dostaje „wysokie ryzyko” przez literówkę) i #5 (etykieta na liście różni się od werdyktu raportu). Kod produkcyjny się nie zmienia. Jedyną zmianą poza testami jest tekst dokumentu reguł: tolerancje S-08 i S-13. Luki, które dokument reguł sam definiuje jako twarde, są przypięte testami charakteryzującymi. Dwa prawdziwe błędy (rozjazd listy z raportem, etykieta fail-open) wchodzą jako `it.fails` i czekają na lekcję 5.

## Current State Analysis

Źródło: `context/changes/testing-rule-engine-verdicts/research.md` (sonda na prawdziwym `knowledge.json`, 117 zielonych testów).

- **#1:** poziom ryzyka ustala jedna funkcja `finish` (`src/lib/services/tag-validation/evaluate.ts:88-99`). Wczesne powroty bez werdyktu leżą przed pierwszym twardym sygnałem (`:375-405`), więc „twardy ⇒ wysokie” trzyma się dziś z konstrukcji. Brakuje testu, który by to przypiął. Werdykty §5 (V1–V6, X1–X16) chronią już testy z literałami z dokumentu (`evaluate.test.ts:46-241`). Strażnik zgodności wiedzy z dokumentem porównuje tylko identyfikatory (`knowledge.test.ts:13-19`). Są dwie rozbieżności tolerancji: S-08 (dokument: „one season”, JSON: ±1 rok, `knowledge.json:215`) i S-13 (±1 w JSON `:263`, w dokumencie nieopisane). Etykieta jest fail-open: `outcomeLabel("risk", null)` zwraca „Niskie ryzyko” (`src/components/verification/report.ts:34-41`), tak samo nagłówek `ResultCard.tsx:38-40`. „Nie widać” na wielu polach daje „niskie” bez sygnałów.
- **#2:** silnik daje twarde S-01 dla każdej litery spoza `^[A-Z]$` (`evaluate.ts:197-204`). Schemat API przyjmuje dowolną literę do 10 znaków (`src/lib/services/verifications.ts:35`). Jedyną zasłoną jest `validateStep` (`src/components/verification/draft.ts:83-129`), który nie ma testów. Literówka w numerze z odwrotu daje twarde M-03 bez potwierdzenia (`evaluate.ts:420-427`). Numer modelu z formatowaniem po potwierdzeniu daje twarde M-01 i M-03. Istniejące testy normalizacji (`evaluate.test.ts:358-385`) dotyczą wyłącznie literówek już naprawionych.
- **#5:** lista czyta zapisane kolumny (`verifications.ts:89-98`, `src/pages/verifications/index.astro:62-64`), a raport przelicza werdykt (`verifications.ts:101-108`). Po zmianie reguł nic nie aktualizuje kolumn, a ten sam DTO jest wewnętrznie sprzeczny. Test mapowania listy (`verifications.test.ts:70-79`) porównuje zapisaną wartość samą ze sobą.

## Desired End State

- `npm test` jest zielone. Nowe testy obejmują:
  - strażnika wartości `knowledge.json` względem dokumentu (litery, typ „hard”, okresy, tolerancje, komunikaty),
  - niezmiennik „twardy ⇒ wysokie” na przyciętej siatce kombinacji dla wiedzy domyślnej i zmodyfikowanej,
  - testy `validateStep`,
  - bezpieczne ścieżki silnika dla błędnych danych,
  - blok „znane luki” z odnośnikami do dokumentu,
  - tabelę „lista = raport”.
- Dokładnie trzy `it.fails`: etykieta fail-open i dwa kierunki rozjazdu listy z raportem po zmianie reguł. Każdy ma zielony test warunku wstępnego.
- Dokument reguł opisuje tolerancję S-08 jako jeden rok i jawnie opisuje tolerancję S-13. `knowledge.json` się nie zmienia.
- `test-plan.md` §6.1 opisuje wzorzec testu reguły, a §6.5 zawiera notatkę fazy 1 i kandydata do `--refresh` (stary wiersz wysypuje listę).

Weryfikacja: `npm test`, `npm run lint`, `npm run typecheck` są zielone. Ręczne mutacje (patrz Manual Verification każdej fazy) zapalają odpowiednie testy na czerwono.

### Key Discoveries:

- `evaluateTag(obs, knowledge)` przyjmuje wiedzę jako parametr (`evaluate.ts:372`), więc test „po zmianie reguł” używa zmodyfikowanej kopii `defaultKnowledge` bez `vi.mock`. `toDto` zawsze używa pliku, więc „obecna” wiedza to plik, a „stara” to kopia.
- `tagObservationSchema` służy też do parsowania wierszy (`verifications.ts:60`), a kreator zapisuje literę bez `trim()` (`draft.ts:142`). Dlatego nie zaostrzamy schematu litery w tej fazie (decyzja: tylko test charakteryzujący).
- Strażnik ID parsuje tabele reguł regexem `^\| \`([MSV]-\d{2})\` \|` (`knowledge.test.ts:15`). Tabelę liter §3.2 da się parsować tak samo.
- Reguły twarde według kolumny Signal dokumentu (12): M-01, M-03, M-04, S-01, S-02, S-05, S-06, S-07, S-09, S-12 („hard flag”), S-13, V-02.
- Źródło przesuwające litery jest opisane w dokumencie jako przesunięcie „o dwa sezony”, czyli rok (`balenciaga-city-tag-rules.md:153-155`). Deklaracja sprzedawcy ma sam rok, bez sezonu. Tolerancja ±1 rok w JSON jest więc zgodna z intencją dokumentu, a nie z jego dosłownym brzmieniem.

## What We're NOT Doing

- **Naprawy błędów.** Rozjazd listy z raportem (#5) i etykieta fail-open (#1) wchodzą jako `it.fails`, a naprawa to lekcja 5. Proponowane naprawy są zapisane w opisach testów: lista przelicza werdykt z `observation`, a brak poziomu nie wyświetla się jako „Niskie ryzyko”.
- **Zmiany dokumentu dla S-01, M-03, M-01 i dla „niskiego” przy braku danych.** Te zachowania są przypięte testami charakteryzującymi. Zmiana dokumentu i silnika to osobna decyzja produktowa.
- **Kroku „Potwierdzam odczyt” dla numeru z odwrotu** ani zaostrzenia `saveVerificationSchema`/`tagObservationSchema`.
- **Testów komponentów React** (`ResultCard` ma tę samą logikę fail-open). Środowisko testów to Node, a warstwa komponentów jest poza fazą 1. Jest to odnotowane w opisie `it.fails` etykiety.
- **Integracji z Supabase, CI/YAML, hooków i e2e.** Należą do faz 2–3 i późniejszych lekcji.
- **Refaktoru istniejących testów**, także tautologicznego „maps a row to a list item”. Zostaje, bo sprawdza mapowanie pól, a werdykt pokrywa nowa tabela.
- **Pytania 6 z researchu (stary wiersz bez nowego pola obserwacji wysypuje całą listę).** Jest poza zakresem i trafia do §6.5 jako kandydat do `/10x-test-plan --refresh`.
- **Uczynienia `knowledge.json` parsowanym w runtime.**

## Implementation Approach

Kolejność według koszt × sygnał i priorytetu ryzyka. Najtańszy i najmocniejszy sygnał dla #1 (High × High) to strażnik wartości. Wymaga on najpierw poprawki dokumentu, zgodnie z zasadą CLAUDE.md „najpierw dokument, potem JSON”. Potem niezmiennik na siatce (#1), błędne dane (#2, High × High) i lista = raport (#5, Medium × Medium). Na końcu cookbook.

Źródłem oczekiwań jest zawsze `balenciaga-city-tag-rules.md`: parsowany tam, gdzie jest tabelą, a przepisany jako literał z odnośnikiem do linii tam, gdzie jest prozą. Nigdy `knowledge.json`. Warianty błędnych danych są generowane z **kategorii błędu**, a nie z listy naprawionych przypadków:

- znak spoza alfabetu (cyfra, polski znak diakrytyczny, umlaut),
- znak niewidoczny (spacja zerowej szerokości),
- znak pełnej szerokości,
- zamiana sąsiednich cyfr, podmiana jednej cyfry, odwrócona kolejność grup,
- pusty lub biały znak,
- dwa znaki lub interpunkcja,
- wielkość liter wartownika.

Nowe pliki testów korzystają ze wspólnej obserwacji V1 (`fixtures.ts`). Istniejące pliki zostają bez zmian, poza dopisaniem nowych bloków `describe`.

## Critical Implementation Details

**`it.fails` przechodzi przy dowolnym wyjątku.** Błąd w przygotowaniu testu (literówka w mutacji wiedzy, rzucający `parseRow`) też „przejdzie”. Każdy `it.fails` musi więc mieć osobny, zielony test warunku wstępnego, który dowodzi, że układ jest poprawny (np. „stara wiedza daje `low`, plik daje `high`”). W samym `it.fails` jedyną spodziewanie nieudaną linią ma być asercja końcowa.

**Kolejność w fazie 1:** poprawka dokumentu S-08/S-13 musi wylądować przed asercją tolerancji. W przeciwnym razie strażnik musiałby mieć wyjątek od pierwszego dnia albo brać wartość z JSON, a to byłaby tautologia.

**Budżet czasu siatki:** pełny iloczyn pól to ok. 10 mln wywołań, więc siatkę trzeba ciąć. Cel to cały nowy plik niezmiennika poniżej ok. 3 s lokalnie. Cięcie ma zachować każdą wartość każdego pola wyliczeniowego i każdą z 12 reguł twardych przynajmniej raz.

**Testy charakteryzujące to zwykłe testy, nie `it.fails`.** Utrwalają zachowanie, które dokument dziś definiuje jako poprawne. Nazwa zaczyna się od „LUKA:” i cytuje regułę i linię dokumentu, żeby zmiana dokumentu świadomie je przestawiła.

---

## Phase 1: Dokument reguł i strażnik wartości `knowledge.json` (#1)

### Overview

Poprawić tekst dokumentu dla tolerancji S-08 i S-13, a następnie rozszerzyć strażnika zgodności z identyfikatorów na wartości. Wartości to litery i odczyty, typ sygnału reguł twardych, okresy, tolerancje, progi i komunikaty.

### Changes Required:

#### 1. Dokument reguł — tolerancje S-08 i S-13

**File**: `balenciaga-city-tag-rules.md`

**Intent**: Uzgodnić dokument z intencją, którą już realizuje JSON (decyzja użytkowniczki: poprawić dokument). S-08: tolerancja „jednego roku (dwa sezony — wielkość spornego przesunięcia; deklaracja sprzedawcy podaje rok, nie sezon)”. S-13: dopisać jawnie ±1 rok wokół zmiany 2010/2011. Mały napis na torebce z 2011 albo duży na torebce z 2010 to sygnał miękki, większa różnica to twardy (oparcie: X15).

**Contract**: §3.2, akapit w liniach 153-155 (przeformułowanie „one-season tolerance”). §3.4, nowe zdanie pod notą o regułach dwukierunkowych (linie 194-198). Wiersze tabel reguł bez zmian, żeby strażnik ID dalej widział 21 wierszy. `knowledge.json` bez zmian.

#### 2. Wspólna obserwacja testowa

**File**: `src/lib/services/tag-validation/fixtures.ts` (nowy)

**Intent**: Jedno źródło obserwacji V1 dla nowych plików testów (fazy 2–4), zamiast trzeciej kopii.

**Contract**: eksport `v1Observation: TagObservation` (identyczna z `base` w `evaluate.test.ts:6-22`) z komentarzem, że to przypadek V1 dokumentu. Istniejące testy się nie zmieniają.

#### 3. Strażnik wartości

**File**: `src/lib/services/tag-validation/knowledge.test.ts`

**Intent**: Każda wartość, od której zależy werdykt, ma pochodzić z dokumentu. Cicha zmiana w JSON ma zapalić test.

**Contract**: nowe bloki `describe` obok istniejących:

- **Tabela liter §3.2 parsowana z Markdowna.** Każdy wiersz `| <litera> | <odczyt 1> | <odczyt 2> | <status> |` jest mapowany na odczyty `{season, year}`: „2019” oznacza `season: null`, „—” oznacza brak drugiego odczytu. Kolumna statusu daje pewność: „confirmed” albo „reading 1 confirmed, reading 2 probable”. Wynik porównujemy z `seasonLetters`. Asercja liczności: 25 wierszy.
- **Typ „hard”.** Każda reguła, której kolumna Signal w §2.4/§3.4/§7.1 zaczyna się od `hard`, ma w JSON `signal: "hard"`. Asercja liczności: dokładnie 12 (lista w Key Discoveries).
- **Komunikaty.** Ostatnia kolumna tabel reguł ma być równa `rule.message` (21 wierszy, research: 0 różnic).
- **Literały z prozy**, każdy z komentarzem wskazującym linię dokumentu:
  - ery okuć (flat brass 2000–2002, pewter 2003–2004, aged brass od 2004; `:20-21`, `:186`),
  - okres bez litery 2001–2003 (`:161`),
  - podkreślnik ≤2004 i kropka ≥2005 (`:169-170`),
  - 925 obecny ≤2008, brak ≤2004 lub ≥2008 (`:163-164`, `:171`, `:197`),
  - MADE IN ITALY mały ≤2010, duży ≥2011 (`:165`, `:172`),
  - zamek Lampo ≤2014 i B ≥2015 (`:304`, `:307`),
  - tolerancje: S-05 i S-06 = 0, S-07 = 1, S-08 = 1, S-13 = 1, V-02 = 1,
  - S-09 po 2003, S-10 przed 2003, S-11 cztery cyfry, S-12 = `0754`/`C`/`115748`, S-02 = `X`, zakres = `115748`.

- **Zachowanie asertowane:** plik wiedzy koduje dokładnie te wartości, które podaje dokument, a każda reguła twarda z dokumentu jest w JSON twarda.
- **Łapana regresja:**
  - zmiana roku odczytu litery,
  - obniżenie reguły twardej do miękkiej,
  - poszerzenie tolerancji (np. S-05 = 1),
  - przesunięcie granicy ery w JSON bez zmiany dokumentu (P3 z wywiadu).
- **Źródło:** research, sekcja „Zgodność `knowledge.json` z dokumentem reguł co do wartości”, oraz `knowledge.test.ts:13-19` (dziś tylko ID).
- **Przypadek brzegowy:** odczyty bez sezonu (V, U, S, R: „2019”), litery z jednym odczytem („—”), rok przejściowy 2008 dla 925 (oba warianty dopuszczone), mieszana pewność („reading 1 confirmed, reading 2 probable”).
- **Unikany anty-wzorzec:** oczekiwania przepisane z `knowledge.json`. Parser czyta dokument, a literały cytują linie dokumentu.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Strażnik wartości przechodzi osobno: `npx vitest run src/lib/services/tag-validation/knowledge.test.ts`
- Linting passes: `npm run lint`
- Type checking passes: `npm run typecheck`

#### Manual Verification:

- Mutacja: tymczasowa zmiana w `knowledge.json` (np. S-05 `toleranceYears: 1`, S-07 `signal: "soft"`, rok litery `Q` na 2010) zapala strażnika na czerwono z czytelnym komunikatem; potem cofnięcie
- Nowy tekst S-08 i S-13 w dokumencie jest zrozumiały i zgodny z intencją (przegląd przez użytkowniczkę)

**Implementation Note**: Po zakończeniu fazy i zielonej weryfikacji automatycznej zatrzymaj się na ręczne potwierdzenie przez użytkowniczkę, zanim przejdziesz do następnej fazy.

---

## Phase 2: Niezmiennik „twardy ⇒ wysokie”, wstrzymanie przy braku danych, etykieta fail-open (#1)

### Overview

Przypiąć strukturalną gwarancję agregacji poziomu ryzyka na przyciętej siatce kombinacji, niezależnie od wartości wiedzy. Udokumentować „niskie” przy braku danych jako decyzję produktową. Wprowadzić etykietę fail-open jako `it.fails`.

### Changes Required:

#### 1. Niezmiennik na siatce

**File**: `src/lib/services/tag-validation/invariants.test.ts` (nowy)

**Intent**: Żaden przyszły refaktor (nowe wczesne wyjście, nowy `outcome`, zmiana `finish`) ani zmiana reguły w wiedzy nie może dać wyniku z twardym sygnałem innego niż „wysokie”.

**Contract**:

- **Siatka A (datowanie).** Iloczyn pól:
  - litera: 25 z tabeli, `X`, `none`, `unknown` i dwie zniekształcone (`""`, `"Ć"`),
  - `brandLine` × `stamp925` × `madeInItalySize` (3³),
  - okucia klasyczne (4),
  - zamek (3),
  - deklarowany rok (`null`, 2002, 2010, 2019).

  Płytka jest ustawiona na V1.
- **Siatka B (bramki i wiersz 1).** Profile płytki:
  - V1,
  - `leather-only`,
  - numer z odwrotu `115749`,
  - partia `0754` z literą `C`,
  - numer modelu `11574` potwierdzony i niepotwierdzony,
  - numer `0754` w polu modelu,
  - inny sześciocyfrowy numer.

  Profile są krzyżowane z `tagPhoto` (2), okuciami (wszystkie 6) i podzbiorem liter.
- **Asercje na każdym wyniku:**
  - `hardSignals.length > 0 ⇒ outcome === "risk" && riskLevel === "high"`,
  - `riskLevel === "low" ⇒ hardSignals` i `softSignals` puste,
  - `soft > 0 && hard === 0 ⇒ medium`,
  - `riskLevel !== null ⇔ outcome === "risk"`,
  - `outcome !== "risk" ⇒ brak sygnałów twardych`.
- **Asercja niepustości:** suma obu siatek uruchamia każdą z 12 reguł twardych (lista literalnie z dokumentu) co najmniej raz, a każdą wartość `outcome` i `riskLevel` co najmniej raz.
- **Ta sama siatka na zmodyfikowanej kopii wiedzy** (np. wszystkie `toleranceYears` = 0 i przesunięta era zamka). Siatka może być zredukowana. Asercje są te same, a warunek niepustości dotyczy tylko siatki na wiedzy domyślnej.

- **Zachowanie asertowane:** poziom ryzyka wynika z sygnałów w jeden sposób dla każdej kombinacji i każdej poprawnej wiedzy.
- **Łapana regresja:**
  - nowe wczesne wyjście po pierwszym twardym sygnale,
  - `finish` zmieniony tak, że twardy daje `medium`,
  - nowy `outcome` bez poziomu, w którym zostają sygnały twarde,
  - zmiana reguły w JSON, która przez przypadek zmienia agregację.
- **Źródło:** research #1, sekcja „Jak sygnały łączą się w poziom ryzyka” (`evaluate.ts:88-99`, `:375-405`), oraz sekcja „Najtańsza warstwa i kształt testów dla #1”.
- **Przypadek brzegowy:** litery zniekształcone i `X` w siatce, rok `ambiguous` (wszystkie rozstrzygające pola `unknown`), `tagPhoto: missing` (wymuszone `medium` bez sygnałów), potwierdzony M-01 razem z M-03.
- **Unikany anty-wzorzec:** oczekiwania z `knowledge.json`, bo niezmiennik jest strukturalny i nie zależy od wartości. Unikam też pustego niezmiennika: bez asercji niepustości siatka mogłaby nie dotknąć żadnego twardego sygnału.

#### 2. „Niskie” przy braku danych — decyzja produktowa

**File**: `src/lib/services/tag-validation/invariants.test.ts`

**Intent**: Udokumentować obecną semantykę „wstrzymanie, a nie porażka”. Przy „nie widać” na wielu polach wynik jest `low`, bez sygnałów, reguły są wstrzymane, a pytania do sprzedawcy padają. Decyzja użytkowniczki: tylko dokumentujemy.

**Contract**: `describe` opisany jako decyzja produktowa z odnośnikami (`prd.md:35` vs `:110`, archiwum `tag-validation-first-result/plan.md:46`). Przypadki z sondy researchu:

- „brak litery + flat brass, reszta nie widać”,
- „litera C, reszta nie widać” (rok `ambiguous`),
- „S + kropka + brak 925” (`ambiguous`, S-07/S-08/V-02 wstrzymane).

Asercje: `riskLevel === "low"`, zero sygnałów, konkretne reguły w `abstained` i konkretne pytania w `sellerQuestions`, jako literały z dokumentu §8.

- **Zachowanie asertowane:** brak danych nigdy nie tworzy sygnału, ale zawsze tworzy pytanie do sprzedawcy.
- **Łapana regresja:** „nie widać” zaczyna dawać sygnał (fałszywe wysokie) albo pytanie znika (użytkowniczka dostaje „niskie” bez wskazówki, czego brakuje).
- **Źródło:** research #1, tabela „Gdzie naprawdę powstaje fałszywe »niskie«”.
- **Przypadek brzegowy:** rok `ambiguous` wyciszający reguły zależne od roku.
- **Unikany anty-wzorzec:** kwestionuję szczęśliwą ścieżkę, bo zestaw §5 nie ma przypadku z wieloma „nie widać”. Pytania są brane z dokumentu §8, a nie z `defaultKnowledge.sellerQuestions`.

#### 3. Etykieta fail-open

**File**: `src/components/verification/report.test.ts`

**Intent**: Wynik bez poziomu ryzyka nigdy nie może wyświetlić się jako „Niskie ryzyko”. Dziś tak się dzieje, więc test to `it.fails` na lekcję 5.

**Contract**:

- Zielony test: `unsupported`, `scope-unknown` i `input-error` z `null` nie dają „Niskie ryzyko”.
- `it.fails`: `outcomeLabel("risk", null)` nie daje „Niskie ryzyko”. W opisie: proponowana naprawa na lekcję 5 i uwaga, że `ResultCard.tsx:38-40` ma tę samą logikę.
- Warunek wstępny (osobny, zielony): etykieta dla `("risk", "low")` to „Niskie ryzyko”, więc test nie przechodzi przez literówkę w nazwie. Niezmiennik z pkt 1 dowodzi, że silnik dziś nie produkuje pary `("risk", null)`.

- **Zachowanie asertowane:** domyślna wartość etykiety jest po bezpiecznej stronie.
- **Łapana regresja:** wiersz z `risk_level` `null` (kolumna `text` bez `CHECK`) albo przyszły `outcome` pokazany jako „Niskie ryzyko”.
- **Źródło:** research #1, „Etykieta fail-open” (`report.ts:34-41`).
- **Przypadek brzegowy:** `("risk", null)`.
- **Unikany anty-wzorzec:** test przechodzący z niewłaściwego powodu, stąd warunek wstępny.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test` (w wyniku widać 1 test oznaczony jako expected fail w `report.test.ts`)
- Plik niezmiennika w budżecie czasu (~3 s): `npx vitest run src/lib/services/tag-validation/invariants.test.ts`
- Linting passes: `npm run lint`
- Type checking passes: `npm run typecheck`

#### Manual Verification:

- Mutacja: tymczasowa zmiana w `finish` (`evaluate.ts:88-99`), która przy sygnale twardym daje `medium`, zapala niezmiennik; potem cofnięcie
- Mutacja: tymczasowe usunięcie profilu płytki z siatki B zapala asercję niepustości (np. brak S-12 albo M-04); potem cofnięcie
- Przypadki „nie widać” czytają się jak opis decyzji produktowej, a nie jak oczekiwany ideał (przegląd przez użytkowniczkę)

**Implementation Note**: Po zakończeniu fazy i zielonej weryfikacji automatycznej zatrzymaj się na ręczne potwierdzenie przez użytkowniczkę, zanim przejdziesz do następnej fazy.

---

## Phase 3: Błędne dane — zasłona kreatora, bezpieczne ścieżki silnika, znane luki (#2)

### Overview

Przetestować `validateStep`, czyli jedyną dziś ochronę przed zniekształconą literą. Przypiąć łańcuch kreator → silnik. Utrwalić bezpieczne ścieżki silnika na wariantach generowanych z kategorii błędu. Jawnie udokumentować luki, które wynikają z dokumentu reguł.

### Changes Required:

#### 1. Walidacja kreatora i łańcuch kreator → silnik

**File**: `src/components/verification/draft.test.ts`

**Intent**: Zasłona, na której wisi ochrona przed S-01, ma być pod testem. To, co przejdzie przez kreator, nie może dać S-01.

**Contract**:

- **`describe("validateStep")`:**
  - Karta płytki (`PLATE_STEP`), litera: tabela wariantów z kategorii błędu: `""`, `" "`, `"0"`, `"Ć"`, `"ą"`, `"Ä"`, `"CC"`, `"C."`, `"C1"`, `"Ｃ"` (pełna szerokość), `"C​"` (spacja zerowej szerokości), `"Unknown"`, `"none"` wpisane jako litera. Każdy daje błąd `seasonLetter`.
  - Warianty poprawne: `"c"`, `" R "`, `"X"` (S-02 to prawdziwa reguła twarda, więc kreator jej nie blokuje). Nie dają błędu.
  - Brak `letterMode` daje błąd.
  - Pusty numer modelu daje błąd.
  - Partia: pusta bez „Nie widać” daje błąd, z „Nie widać” jest OK.
  - Karta odwrotu (krok 3): pusty numer bez „Nie widać” daje błąd.
- **Łańcuch:** każdy wariant litery z tabeli (poprawny i błędny), który przechodzi `validateStep(PLATE_STEP, …)`, po `toObservation` i `evaluateTag` nie ma `S-01` w `hardSignals`.

- **Zachowanie asertowane:** kreator zatrzymuje każdą literę, która w silniku dałaby S-01, a przepuszcza litery poprawne.
- **Łapana regresja:** poluzowanie regexu litery (`draft.ts:107`), `toObservation` przekazujący pusty wpis (archiwalne F4), usunięcie reguły z `validateStep`.
- **Źródło:** research #2, „Różnica między kreatorem a silnikiem” (`draft.ts:83-129`, `:142`; 0 testów).
- **Przypadek brzegowy:** spacje wokół litery (trim w walidacji, brak trim w `toObservation`), znaki niewidoczne i pełnej szerokości, wartownik wpisany jako litera.
- **Unikany anty-wzorzec:** warianty wyłącznie z naprawionych literówek. Tabela jest pogrupowana według kategorii błędu.

#### 2. Bezpieczne ścieżki silnika i znane luki

**File**: `src/lib/services/tag-validation/input-errors.test.ts` (nowy)

**Intent**: Silnik nie ufa wejściu tam, gdzie dokument na to pozwala, i daje błąd wpisu albo wstrzymanie. Tam, gdzie dokument sam czyni regułę twardą, test jawnie dokumentuje lukę (decyzje użytkowniczki: test charakteryzujący, bez zmian w kodzie i dokumencie).

**Contract**:

- **`describe` „bezpieczne ścieżki”:**
  - Numer modelu niepotwierdzony, z kategorii: pusty, `" "`, `"115 748"`, `"115748."`, `"115748​"`, `"１１５７４８"`, `"l15748"`, `"11574"`, `"1157488"`. Wynik: `outcome: "input-error"` (M-01) albo M-05, `riskLevel: null`, zero sygnałów twardych.
  - Numer z odwrotu z mniej niż sześcioma czytelnymi cyframi (`"O15748"`, `"115-748"`, `"115 7 48"`, `""`, `"Unknown"`): M-03 w `abstained`, pytanie `tabBack` z dokumentu §8, żadnego M-03 w sygnałach.
  - Partia z literówką przy literze `C` (`"O754"`, `"0754C"`, `"754"`): S-12 nie działa, wynik to najwyżej `medium` (S-11 miękkie).
- **`describe` „LUKA: dokument reguł czyni regułę twardą”.** Każdy test cytuje regułę i linię dokumentu:
  - zniekształcona litera (`""`, `" "`, `"Ć"`, `"0"`, `"CC"`) daje twarde S-01 (`:180`),
  - wartownik innej wielkości (`"Unknown"`, `"NONE"`) daje twarde S-01 (tylko klient API, kreator wysyła małe litery),
  - numer z odwrotu z zamienionymi sąsiednimi cyframi (`"115784"`), podmienioną cyfrą (`"115749"`) albo odwróconymi grupami (`"3444 115748"`) daje twarde M-03 bez potwierdzenia (`:85`, X4 `:256`),
  - numer modelu z formatowaniem po potwierdzeniu (`"115 748"`, `"115748​"`, `"１１５７４８"`) daje twarde M-01 i M-03 (X1 `:253`, `:44`).

- **Zachowanie asertowane:** dwuznaczne dane dają błąd wpisu albo wstrzymanie wszędzie tam, gdzie dokument na to pozwala. Tam, gdzie nie pozwala, zachowanie jest jawnie oznaczone jako luka.
- **Łapana regresja:**
  - zmiana normalizacji zamieniająca wstrzymanie w sygnał (np. regex numeru z odwrotu czytający `"115-748"`),
  - literówka w partii uruchamiająca S-12,
  - cicha zmiana luki: jeśli ktoś zmieni dokument lub silnik, test „LUKA” zmieni kolor i wymusi świadomą aktualizację.
- **Źródło:** research #2, „Ścieżki awarii potwierdzone sondą” (pkt 1–5) i „Korekta wskazówki reakcji dla #2”.
- **Przypadek brzegowy:** spacja zerowej szerokości i cyfry pełnej szerokości z kopiuj-wklej, pojedyncze spacje w numerze z odwrotu (dozwolone, `evaluate.ts:422`) kontra myślnik (wstrzymanie).
- **Unikany anty-wzorzec:** test wymuszający „nigdy twardy” wbrew dokumentowi (luki są charakteryzujące, a nie `it.fails`). Warianty tylko z naprawionych literówek (kategorie).

#### 3. Schemat API przepuszcza zniekształconą literę

**File**: `src/lib/services/verifications.test.ts`

**Intent**: Udokumentować, że warstwa API nie chroni przed ścieżką 1. Klient inny niż kreator może zapisać fałszywe „wysokie”.

**Contract**: test „LUKA:” w bloku `saveVerificationSchema`. Komenda z `seasonLetter` `"Ć"` i `""` przechodzi `safeParse`, a `evaluateTag` sparsowanej obserwacji daje twarde S-01. W opisie: dlaczego nie zaostrzamy `tagObservationSchema` (parsuje też zapisane wiersze, a litera bywa zapisana bez `trim()`).

- **Zachowanie asertowane:** obecny kontrakt API dla litery, czyli długość do 10 znaków bez walidacji formatu.
- **Łapana regresja:** zaostrzenie schematu wierszy, które wysypałoby listę. Po zmianie test świadomie zmieni kolor i zmusi do decyzji.
- **Źródło:** research #2, tabela pól (`verifications.ts:35`).
- **Przypadek brzegowy:** pusta litera w API.
- **Unikany anty-wzorzec:** założenie „kreator to wyłapie”.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Nowe testy przechodzą osobno: `npx vitest run src/components/verification/draft.test.ts src/lib/services/tag-validation/input-errors.test.ts`
- Linting passes: `npm run lint`
- Type checking passes: `npm run typecheck`

#### Manual Verification:

- Mutacja: tymczasowe poluzowanie regexu litery w `validateStep` do `/^.{1}$/` zapala zarówno testy `validateStep`, jak i test łańcucha kreator → silnik; potem cofnięcie
- Każdy test „LUKA:” wskazuje regułę i linię dokumentu, a jego nazwa jasno mówi, że to znana luka, a nie zachowanie docelowe (przegląd przez użytkowniczkę)

**Implementation Note**: Po zakończeniu fazy i zielonej weryfikacji automatycznej zatrzymaj się na ręczne potwierdzenie przez użytkowniczkę, zanim przejdziesz do następnej fazy.

---

## Phase 4: Lista = raport (#5)

### Overview

Zestawić etykietę listy z werdyktem raportu dla tego samego wiersza. Dla werdyktów bieżących i po edycji test jest zielony. Dla zmiany reguł wchodzą dwa `it.fails` (lekcja 5) z warunkiem wstępnym.

### Changes Required:

#### 1. Tabela „lista = raport” i przypadek po edycji

**File**: `src/lib/services/verifications.test.ts`

**Intent**: Zastąpić porównanie „zapisane samo ze sobą” porównaniem dwóch dróg odczytu: lista to `toListItem`, a raport to `toDto(...).evaluation`.

**Contract**: `describe("lista = raport (#5)")`.

- Dla obserwacji dających każdy wynik:
  - V1 `low`,
  - `thread: "no"` `medium`,
  - X7 `high`,
  - X3 `unsupported`,
  - X1 niepotwierdzone `input-error`,
  - okucia `unknown` `scope-unknown`,
  - `tagPhoto: "missing"` `medium`.

  Wiersz zbudowany jest z `toInsertRow(cmd, evaluateTag(obs))` plus pola bazy, przepuszczony przez `parseRow`. Asercje: `(outcome, riskLevel)` z `toListItem` równa się parze z `toDto(...).evaluation`, a `outcomeLabel` obu jest równy.
- Po edycji: wiersz z `toUpdateRow(changed, evaluateTag(changed.observation), now)` spełnia tę samą równość, a werdykt faktycznie zmienił się względem wiersza przed edycją.

- **Zachowanie asertowane:** dla wierszy zapisanych przy obecnych regułach lista i raport pokazują ten sam werdykt, także po edycji.
- **Łapana regresja:** `toListItem`/`toInsertRow` mapujący kolumny błędnie (np. zamiana `outcome`/`risk_level`), PUT, który przestaje przeliczać werdykt.
- **Źródło:** research #5, „Skąd lista bierze etykietę”, „Co aktualizuje etykietę”.
- **Przypadek brzegowy:** wyniki bez werdyktu (`riskLevel: null`) oraz `medium` wymuszone brakiem zdjęcia.
- **Unikany anty-wzorzec:** porównanie zapisanej wartości samej ze sobą (`verifications.test.ts:70-79`).

#### 2. Po zmianie reguł — `it.fails`

**File**: `src/lib/services/verifications.test.ts`

**Intent**: Udokumentować prawdziwy błąd projektu: kolumny nie znają wersji wiedzy, więc po zmianie reguł lista i raport się rozjeżdżają (decyzja użytkowniczki: `it.fails` na lekcję 5).

**Contract**:

- **„Stara” wiedza.** Kopia `defaultKnowledge` (np. `structuredClone`), w której zamek B jest dopuszczony od 2008 (zmiana okresu V-02). Obserwacja: V1 z `zipper: "b"`.
- **Warunek wstępny (zielony):**
  - `evaluateTag(obs, stara).riskLevel === "low"`,
  - `evaluateTag(obs).riskLevel === "high"`,
  - wiersz zbudowany ze starej oceny przechodzi `parseRow`.
- **`it.fails` (zaostrzenie).** Wiersz zapisany starą wiedzą: `toListItem(row).riskLevel` równa się `toDto(row).evaluation.riskLevel`, a `toDto(row).riskLevel` równa się `toDto(row).evaluation.riskLevel`. W opisie: proponowana naprawa (lista przelicza z `observation`, co usuwa też sprzeczność w DTO z `GET /api/verifications/[id]`).
- **`it.fails` (poluzowanie).** Kierunek odwrotny: stara wiedza bez okresu B, więc zapisane `high`, a dziś `low`. Obserwacja jest dobrana tak, żeby warunek wstępny też to potwierdzał.

- **Zachowanie asertowane:** docelowo etykieta listy zawsze równa się werdyktowi raportu, także po zmianie reguł. Dziś jest to znany błąd.
- **Łapana regresja:** gdy lekcja 5 naprawi błąd, `it.fails` zmieni kolor i wymusi zdjęcie znacznika. Każda przyszła zmiana, która znów rozdzieli listę i raport, zostanie wyłapana.
- **Źródło:** research #5 (sonda: lista „Niskie ryzyko”, raport „Wysokie ryzyko”); `verifications.ts:89-108`; migracja `20260914130000_create_verifications.sql:10-13`.
- **Przypadek brzegowy:** oba kierunki zmiany reguł; ten sam DTO niesie stary `riskLevel` i świeży `evaluation.riskLevel`.
- **Unikany anty-wzorzec:** `vi.mock` pliku wiedzy (zamiast tego parametr `knowledge`), `it.fails` przechodzący z niewłaściwego powodu (zamiast tego warunek wstępny).

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test` (łącznie 3 expected fail: 1 w `report.test.ts`, 2 w `verifications.test.ts`)
- Plik przechodzi osobno: `npx vitest run src/lib/services/verifications.test.ts`
- Linting passes: `npm run lint`
- Type checking passes: `npm run typecheck`

#### Manual Verification:

- Sprawdzenie kierunku `it.fails`: tymczasowa jednolinijkowa naprawa w `toListItem` (przeliczenie z `observation`) sprawia, że oba `it.fails` zgłaszają „expected to fail”; potem cofnięcie
- Mutacja: tymczasowa zamiana `outcome`/`risk_level` w `toInsertRow` zapala tabelę „lista = raport”; potem cofnięcie

**Implementation Note**: Po zakończeniu fazy i zielonej weryfikacji automatycznej zatrzymaj się na ręczne potwierdzenie przez użytkowniczkę, zanim przejdziesz do następnej fazy.

---

## Phase 5: Cookbook — `test-plan.md` §6.1 i §6.5

### Overview

Zapisać w planie testów wzorce dostarczone w fazie 1, żeby §6.1 odpowiadał na pytanie „jak dodać test reguły w tym projekcie”, a `/10x-tdd` (lekcja 2) miał z czego czytać.

### Changes Required:

#### 1. §6.1 Adding a unit test for a rule

**File**: `context/foundation/test-plan.md`

**Intent**: Zastąpić „TBD — see §3 Phase 1” wzorcami, które faktycznie wylądowały.

**Contract**: w §6.1 zwięzłe punkty:

- **Lokalizacja i nazewnictwo:**
  - `src/lib/services/tag-validation/*.test.ts` dla silnika,
  - `knowledge.test.ts` dla zgodności z dokumentem,
  - `invariants.test.ts` dla niezmienników,
  - `input-errors.test.ts` dla błędnych danych,
  - `draft.test.ts` dla walidacji kreatora,
  - `verifications.test.ts` dla mapowań i spójności listy z raportem.
- **Zasady:**
  - źródło oczekiwań to dokument reguł (parsowany albo literał z odnośnikiem do linii), nigdy `knowledge.json`,
  - zmiana reguły: najpierw dokument, potem JSON, a strażnik wartości ma zapalić test,
  - „po zmianie reguł” = `evaluateTag(obs, zmodyfikowanaKopia)`, bez `vi.mock`,
  - warianty błędnych danych z kategorii błędu,
  - „LUKA:” = test charakteryzujący zachowanie zdefiniowane przez dokument,
  - `it.fails` tylko dla prawdziwych błędów, zawsze z zielonym warunkiem wstępnym,
  - nowa reguła twarda musi pojawić się na liście 12 reguł twardych, w strażniku typu i w siatce niezmiennika.
- **Wspólna obserwacja:** `fixtures.ts`.
- **Test referencyjny:** po jednym na wzorzec.
- **Komendy uruchomienia:** `npm test` i `npx vitest run <plik>`.

#### 2. §6.5 Per-rollout-phase notes

**File**: `context/foundation/test-plan.md`

**Intent**: 2–3 linie o tym, czego faza 1 nauczyła, oraz odnotowanie kandydata do odświeżenia planu.

**Contract**: wpis „Faza 1”:

- część celów #2 była sprzeczna z dokumentem reguł, więc zamiast „nigdy twardy” mamy testy „LUKA”,
- rozjazd listy z raportem i etykieta fail-open czekają na lekcję 5 jako 3 `it.fails`,
- tolerancja S-08/S-13 poprawiona w dokumencie,
- niespójność PRD co do „niskiego” przy braku danych pozostaje decyzją produktową.

Osobna linia: kandydat do `/10x-test-plan --refresh`, czyli stary wiersz bez nowego pola obserwacji wysypuje całą listę (`parseRow` w `listVerifications`; research, pytanie 6). §1–§5 i §3 bez zmian, bo status fazy aktualizuje orkiestrator.

### Success Criteria:

#### Automated Verification:

- `grep -n "TBD — see §3 Phase 1" context/foundation/test-plan.md` nie zwraca nic
- Pełny zestaw nadal zielony: `npm test`

#### Manual Verification:

- §6.1 wystarcza, żeby dodać test nowej reguły bez czytania tego planu (przegląd przez użytkowniczkę)
- §6.5 zawiera kandydata do `--refresh` (stary wiersz wysypuje listę)

**Implementation Note**: Po zakończeniu fazy i zielonej weryfikacji automatycznej zatrzymaj się na ręczne potwierdzenie przez użytkowniczkę.

---

## Testing Strategy

### Unit Tests:

- Strażnik wartości `knowledge.json` względem dokumentu (faza 1).
- Niezmiennik agregacji na siatce dla wiedzy domyślnej i zmodyfikowanej, z asercją niepustości (faza 2).
- Semantyka wstrzymania przy braku danych oraz etykieta fail-open jako `it.fails` (faza 2).
- `validateStep`, łańcuch kreator → silnik, bezpieczne ścieżki silnika, luki „LUKA:” i schemat API (faza 3).
- Lista = raport: bieżące, po edycji, `it.fails` po zmianie reguł (faza 4).

### Integration Tests:

- Brak w tej fazie. Mapowania są czyste, a baza tylko przechowuje dane (research, „Warstwa”). Integracja z Supabase to faza 2 planu testów.

### Manual Testing Steps:

1. Mutacje opisane w Manual Verification każdej fazy: zmiana wartości w `knowledge.json`, zmiana `finish`, poluzowanie regexu litery, zamiana kolumn w `toInsertRow`, tymczasowa naprawa `toListItem`. Każda ma zapalić właściwy test, po czym zostaje cofnięta.
2. Przegląd nowego tekstu S-08 i S-13 w dokumencie reguł.
3. Przegląd nazw testów „LUKA:” i opisów `it.fails` pod kątem czytelności dla lekcji 5.

## Performance Considerations

Siatka niezmiennika to jedyny kosztowny test. Budżet to ok. 3 s lokalnie dla całego pliku. Przycięcie opisuje faza 2: pełny iloczyn na polach datujących, a profile płytki na podzbiorze liter.

## Migration Notes

Nie dotyczy. Brak zmian w schemacie bazy, w `knowledge.json` i w kodzie produkcyjnym.

## References

- Research: `context/changes/testing-rule-engine-verdicts/research.md`
- Plan testów: `context/foundation/test-plan.md` (§2 ryzyka #1, #2, #5; §3 faza 1; §6.1, §6.5)
- Dokument reguł: `balenciaga-city-tag-rules.md` (§3.2 `:153-155`, §3.4 `:180-198`, §5 `:226-273`, §8)
- Silnik: `src/lib/services/tag-validation/evaluate.ts:88-99`, `:197-204`, `:375-427`
- Istniejące wzorce testów: `evaluate.test.ts:38-44` (`expectRisk`), `knowledge.test.ts:13-19` (parser tabeli reguł)
- Archiwum: `context/archive/2026-09-14-tag-validation-first-result/plan.md:46`, `plan-brief.md:63`, `reviews/plan-review.md:93`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Dokument reguł i strażnik wartości `knowledge.json` (#1)

#### Automated

- [x] 1.1 Unit tests pass: `npm test` — cbc7ea3
- [x] 1.2 Strażnik wartości przechodzi osobno: `npx vitest run src/lib/services/tag-validation/knowledge.test.ts` — cbc7ea3
- [x] 1.3 Linting passes: `npm run lint` — cbc7ea3
- [x] 1.4 Type checking passes: `npm run typecheck` — cbc7ea3

#### Manual

- [x] 1.5 Mutacja wartości w `knowledge.json` zapala strażnika; cofnięta — cbc7ea3
- [x] 1.6 Nowy tekst S-08 i S-13 w dokumencie zaakceptowany — cbc7ea3

### Phase 2: Niezmiennik „twardy ⇒ wysokie”, wstrzymanie przy braku danych, etykieta fail-open (#1)

#### Automated

- [x] 2.1 Unit tests pass: `npm test` (1 expected fail w `report.test.ts`) — e3193d3
- [x] 2.2 Plik niezmiennika w budżecie czasu (~3 s): `npx vitest run src/lib/services/tag-validation/invariants.test.ts` — e3193d3
- [x] 2.3 Linting passes: `npm run lint` — e3193d3
- [x] 2.4 Type checking passes: `npm run typecheck` — e3193d3

#### Manual

- [x] 2.5 Mutacja `finish` zapala niezmiennik; cofnięta — e3193d3
- [x] 2.6 Usunięcie profilu płytki zapala asercję niepustości; cofnięte — e3193d3
- [x] 2.7 Przypadki „nie widać” czytają się jak opis decyzji produktowej — e3193d3

### Phase 3: Błędne dane — zasłona kreatora, bezpieczne ścieżki silnika, znane luki (#2)

#### Automated

- [x] 3.1 Unit tests pass: `npm test` — 6ac03b8
- [x] 3.2 Nowe testy przechodzą osobno: `npx vitest run src/components/verification/draft.test.ts src/lib/services/tag-validation/input-errors.test.ts` — 6ac03b8
- [x] 3.3 Linting passes: `npm run lint` — 6ac03b8
- [x] 3.4 Type checking passes: `npm run typecheck` — 6ac03b8

#### Manual

- [x] 3.5 Poluzowanie regexu litery zapala testy `validateStep` i łańcucha; cofnięte — 6ac03b8
- [x] 3.6 Testy „LUKA:” wskazują regułę i linię dokumentu — 6ac03b8

### Phase 4: Lista = raport (#5)

#### Automated

- [x] 4.1 Unit tests pass: `npm test` (łącznie 3 expected fail)
- [x] 4.2 Plik przechodzi osobno: `npx vitest run src/lib/services/verifications.test.ts`
- [x] 4.3 Linting passes: `npm run lint`
- [x] 4.4 Type checking passes: `npm run typecheck`

#### Manual

- [x] 4.5 Tymczasowa naprawa `toListItem` odwraca oba `it.fails`; cofnięta
- [x] 4.6 Zamiana kolumn w `toInsertRow` zapala tabelę „lista = raport”; cofnięta

### Phase 5: Cookbook — `test-plan.md` §6.1 i §6.5

#### Automated

- [ ] 5.1 `grep -n "TBD — see §3 Phase 1" context/foundation/test-plan.md` nie zwraca nic
- [ ] 5.2 Pełny zestaw nadal zielony: `npm test`

#### Manual

- [ ] 5.3 §6.1 wystarcza do dodania testu nowej reguły bez czytania planu
- [ ] 5.4 §6.5 zawiera kandydata do `--refresh`
