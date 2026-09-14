---
date: 2026-09-14T16:45:00+02:00
researcher: Claude (Opus 5) z Alice
git_commit: 57f341a5a1601b32b80f79aab0d9316383bec137
branch: main
repository: alabilinska/authenticheck
topic: "Faza 1 planu testów — ugruntowanie ryzyk #1, #2, #5 (silnik reguł bez fałszywych werdyktów)"
tags: [research, test-plan, tag-validation, verifications, knowledge-json, rules-document]
status: complete
last_updated: 2026-09-14
last_updated_by: Claude (Opus 5)
---

# Research: Faza 1 planu testów — ryzyka #1, #2, #5

**Data**: 2026-09-14T16:45:00+02:00
**Researcher**: Claude (Opus 5) z Alice
**Git Commit**: 57f341a (lokalny `main`, 2 commity przed `origin/main`, więc bez permalinków)
**Branch**: main
**Repository**: alabilinska/authenticheck

## Pytanie badawcze

Ugruntować w kodzie fazę 1 z `context/foundation/test-plan.md` (§3, zmiana `testing-rule-engine-verdicts`) dla ryzyk #1, #2 i #5 z §2. Dla każdego ryzyka trzeba: pokazać prawdziwą ścieżkę awarii w kodzie z cytatami, sprawdzić wskazówki reakcji na ryzyko (Risk Response Guidance) zamiast przyjmować je na wiarę, znaleźć istniejące testy, wskazać najtańszą warstwę testu, a także oznaczyć ryzyka spekulatywne i mylące dowody hot-spot.

Metoda: przeczytałam kod, testy, dokument reguł i archiwum. Hipotezy sprawdziłam **empirycznie** — sonda Vitest w scratchpadzie wywoływała `evaluateTag`, `toListItem`, `toDto` i `outcomeLabel` na prawdziwym `knowledge.json`. Wyniki sondy są cytowane poniżej jako „(sonda)”. Obecny zestaw: 6 plików, **117 testów, wszystkie zielone** (`npm test`, 2026-09-14 16:41).

## Podsumowanie

1. **#1 — gwarancja „twardy sygnał ⇒ wysokie” trzyma się konstrukcyjnie.** Poziom ryzyka ustala jedna funkcja (`finish`), a każdy wczesny powrót bez werdyktu następuje *przed* pierwszym twardym sygnałem. Prawdziwe drogi do fałszywego „niskiego” są inne. Po pierwsze, **wstrzymanie się reguł**: „nie widać” nigdy nie dodaje miękkiego sygnału, więc „niskie ryzyko” wychodzi przy prawie zerowych danych (sonda). Po drugie, nierozstrzygnięty rok wycisza reguły zależne od roku. Po trzecie, etykieta jest „fail-open”: wszystko, co nie jest `high` ani `medium`, wyświetla się jako „Niskie ryzyko”. `knowledge.json` zgadza się z dokumentem reguł co do liter, okresów, er okuć i wszystkich 21 komunikatów (sonda). Są dwie rozbieżności w **tolerancjach**: S-08 (dokument: jeden *sezon*, JSON: 1 *rok*) i S-13 (tolerancja wyprowadzona z X15, w dokumencie nieopisana). Istniejące testy V1–V6 i X1–X16 biorą oczekiwania z dokumentu jako literały, więc nie są tautologią. Strażnik zgodności pliku wiedzy z dokumentem sprawdza jednak **tylko identyfikatory**.
2. **#2 — „kreator to wyłapie” to dziś jedyna ochrona, a ona sama nie ma testów.** Silnik daje **twarde S-01** dla pustej litery, spacji, `Ć`, `0`, `CC`, `Unknown` (sonda). API przyjmuje taką literę (`z.string().max(10)`). Walidacja kreatora `validateStep` ma **0 testów**. Ważniejsze: **literówka w numerze z odwrotu metki daje twarde M-03 bez kroku potwierdzenia** (`115749`, `115478`, `3444 115748` → wysokie ryzyko). Numer modelu ten krok ma (M-01). **Korekta wskazówki:** dokument reguł *sam* definiuje S-01 jako twardą regułę dla „nie jednej wielkiej litery z tabeli”. Tabela obejmuje całe A–Z poza X, więc S-01 może zadziałać **wyłącznie** na zniekształconym wpisie. Cel „nigdy sygnał twardy” jest sprzeczny z dokumentem i wymaga decyzji (według CLAUDE.md zmieniamy najpierw dokument).
3. **#5 — potwierdzone, test będzie czerwony na obecnym kodzie.** Lista czyta zapisane kolumny `outcome`/`risk_level`, raport przelicza werdykt przy odczycie. Po zmianie reguł nic nie aktualizuje kolumn. Sonda: wiersz zapisany jako `low`, którego obserwacja dziś daje `high`, ma na liście „Niskie ryzyko”, a w raporcie „Wysokie ryzyko”. **Ten sam DTO** z `GET /api/verifications/[id]` niesie jednocześnie stary `riskLevel` i świeży `evaluation.riskLevel`. Po edycji jest spójnie, bo PUT przelicza i zapisuje. Istniejący test mapowania listy porównuje zapisaną wartość samą ze sobą, czyli dokładnie anty-wzorzec z planu.
4. **Warstwa:** wszystkie trzy ryzyka da się pokryć **unit** (silnik jest czysty, mapowania wierszy są czyste). Integracja z Supabase nie daje tu dodatkowego sygnału.

## Szczegółowe ustalenia

### Ryzyko #1 — podróbka dostaje „niskie ryzyko”

#### Jak sygnały łączą się w poziom ryzyka

Jedyne miejsce, które ustala poziom, to `src/lib/services/tag-validation/evaluate.ts:88-99`:

```ts
let riskLevel: TagEvaluation["riskLevel"] = null;
if (outcome === "risk") {
  if (ctx.hard.length > 0) riskLevel = "high";
  else if (forcedRisk !== undefined || ctx.soft.length > 0) riskLevel = "medium";
  else riskLevel = "low";
}
```

Wyniki bez werdyktu (`riskLevel: null`) powstają tylko przez wczesne powroty:

- `evaluate.ts:375-383`: brak zdjęcia metki (wymuszone `medium`), okucia `unknown` (`scope-unknown`), `giant-or-other` (`unsupported`);
- `evaluate.ts:390-391` i `:398`: `inputError` (M-05, M-01 niepotwierdzone);
- `evaluate.ts:403-405`: M-02, czyli `unsupported`.

Wszystkie te powroty są **przed** pierwszym `signal(ctx, …, "hard")` (pierwszy to `:399`, M-01 potwierdzone, a po nim ścieżka dochodzi do `finish(ctx, "risk", year)` w `:457`). Stąd niezmiennik `hardSignals.length > 0 ⇒ outcome === "risk" && riskLevel === "high"` wynika dziś z konstrukcji. Test niezmiennika chroni przed przyszłym refaktorem (nowe wczesne wyjście albo nowy `outcome`), a nie przed obecnym błędem.

#### Gdzie naprawdę powstaje fałszywe „niskie”

| Ścieżka | Dowód | Czy to błąd? |
| --- | --- | --- |
| **Wstrzymanie zamiast sygnału.** Reguła z nieznanym wejściem trafia do `abstained` i zadaje pytanie, ale nie dodaje miękkiego sygnału (`evaluate.ts:208-214`, `:302-304`, `:313-316`, `:423-425`, `:436-439`). | Sonda: „brak litery + flat brass, reszta nie widać” → `risk low`, zero sygnałów. „Litera C, reszta nie widać” → `risk low`, rok `ambiguous`. | Decyzja produktowa, nie błąd kodu. PRD jest tu wewnętrznie niespójne. `prd.md:110`: „**low** = everything checked and consistent”. `prd.md:35`: „a low-risk report states that no warning signs were found in the checked traits”. `prd.md:110` dalej: „"Can't see" … does not lower the level but becomes a question”. Archiwum `tag-validation-first-result/plan.md:46`: „a rule whose input is unknown abstains … it never fails”. |
| **Nierozstrzygnięty rok wycisza reguły zależne od roku.** `eraGap` zwraca `null` dla `ambiguous` (`evaluate.ts:260-273`), więc S-07 i V-02 się wstrzymują (`:283-285`, `:320-322`), a S-08 też (`:355-357`). | Sonda: „S + kropka + brak 925” → oba odczyty ściśle zgodne → `ambiguous`, `low`. | Zgodne z dokumentem, §3.5 (`balenciaga-city-tag-rules.md:210-212`). |
| **Etykieta fail-open.** `outcomeLabel` (`src/components/verification/report.ts:38-40`) i nagłówek `ResultCard` (`ResultCard.tsx:38-40`) zwracają „Niskie ryzyko” dla wszystkiego, co nie jest `high`/`medium`, także dla `outcome "risk"` + `riskLevel null`. | Sonda: `outcomeLabel("risk", null)` → „Niskie ryzyko”. Kolumna `risk_level` to `text` bez `CHECK` (migracja `20260914130000_create_verifications.sql:14`). | Dziś nieosiągalne z silnika, ale jest to domyślna wartość po złej stronie. Tani test i jednolinijkowa poprawka. |
| **Literówka kupującej gasi S-12.** Porównanie kombinacji jest dokładne (`evaluate.ts:447`). | Sonda: partia `O754` albo `0754C` z literą C → `medium` (S-11 miękkie) zamiast `high` (S-12). | Nie daje „niskiego”, tylko „średnie”. Należy do #2 i jest lustrem problemu z normalizacją. |
| **`unsupported` przerywa ocenę przed regułami twardymi** (M-03, M-04, S-12). | `evaluate.ts:403-405`, test X6. | Zgodne z dokumentem, §1 (`:26-28`). Nie daje „niskiego”. |

**Kwestionowanie założenia „zestaw testowy przechodzi, więc nie ma fałszywego niskiego”:** założenie jest fałszywe z dwóch powodów. Dokument sam to mówi (`balenciaga-city-tag-rules.md:270-273`: „these rules falsify, they never verify… not testable as *no counterfeit passes*”). Poza tym zestaw §5 nie zawiera ani jednego przypadku z „nie widać” na wielu polach, a właśnie tam powstaje „niskie” bez dowodów.

#### Zgodność `knowledge.json` z dokumentem reguł co do wartości

Porównałam ręcznie, a komunikaty skryptem (sonda: 21 wierszy tabel reguł, 0 różnic):

| Obszar | Dokument | `knowledge.json` | Wynik |
| --- | --- | --- | --- |
| Litery i odczyty (25 liter, bez X; poziomy pewności) | §3.2 `:123-149` | `:13-75` | zgodne |
| Ery okuć: flat brass 2000–2002, pewter 2003–2004, aged brass 2004– | §1 `:20-21`, S-07 `:186` | `:7-11` | zgodne |
| Okres bez litery 2001–F/W 2003 | §3.3 `:161` | `noLetterPeriod :12` | zgodne |
| Podkreślnik ≤2004 / kropka ≥2005 | §3.3 `:169-170` | `:77-80` | zgodne |
| 925: obecny ≤2008; brak w latach 2005–2007 = sprzeczność | §3.3 `:163-164`, `:171`, `:197` | `:81-84` (`absent: ≤2004, ≥2008`) | zgodne (rok 2008 dopuszcza oba warianty, bo to rok przejściowy) |
| MADE IN ITALY mały ≤2010 / duży ≥2011 | §3.3 `:165`, `:172` | `:85-88` | zgodne |
| Zamek Lampo 2001–2014 / B 2015–, tolerancja 1 | §7.1 `:304`, `:307-309` | `:293-304`, `:291` | zgodne |
| Tolerancja S-07 = 1 | `:186` „soft at the boundary seasons, hard when off by more than a year” | `:206` | zgodne |
| Tolerancja S-05/S-06 = 0 | §3.3: sprzeczności twarde | `:183`, `:193` | zgodne |
| **Tolerancja S-08 = 1 rok** | `:153-155`: „allow a **one-season** tolerance when comparing a letter year against a seller's claim” | `:215` `toleranceYears: 1` (symetrycznie ±1 rok) | **rozbieżność**: sonda Q (F/W 2009) z deklaracją 2008 → `low`. Od F/W 2008 do F/W 2009 są dwa sezony, a nie jeden. Wpływ: `low` zamiast `medium`, tylko dla sygnału miękkiego. |
| **Tolerancja S-13 = 1** | S-13 `:192` „hard”, tolerancja nieopisana. Jedynym oparciem jest X15 (`:267`, mały napis + 2011 → soft) | `:263` symetryczne ±1 | interpretacja, nie wartość z dokumentu. Kierunek „duży napis + 2010” → soft. Dziś to martwy przypadek (litery z 2010 — P, O — ściśle rozstrzygają się na 2023), ale zmiana tabeli liter by go ożywiła. |
| S-09 `afterYear 2003`, S-10 `beforeYear 2003`, S-11 `^\d{4}$`, S-12 `0754/C/115748` | `:188-191` | `:224`, `:233`, `:243`, `:253` | zgodne |

Obecny strażnik (`knowledge.test.ts:13-19`) porównuje tylko identyfikatory. Archiwum przyznaje to wprost (`tag-validation-first-result/reviews/plan-review.md:93`: „The drift guard compares rule IDs only”) i zostawia wartości „ręcznemu sprawdzeniu” (`plan.md:163`). Dodatkowo `defaultKnowledge` nie jest parsowany w runtime (`evaluate.ts:14-15`), więc schemat pilnuje pliku tylko w teście (`knowledge.test.ts:8-11`).

#### Istniejące testy dla #1

- `evaluate.test.ts:46-241`: V1–V6 i X1–X16. Oczekiwania są literałami z dokumentu §5 (poziom, dokładne listy twardych i miękkich sygnałów, status roku przez `expectRisk` `:38-44`), więc **nie są tautologią**. Działają na prawdziwym `knowledge.json`, więc zmiana reguły, która przestawi werdykt przypadku z §5, już dziś zapali test na czerwono. Tę część wskazówki („zmiana reguły nie zmienia werdyktów §5”) pokrywa obecny kod. Faza 1 nie musi jej budować od nowa, najwyżej opisać w §6.
- Drobna tautologia: pytania do sprzedawcy są brane z `defaultKnowledge.sellerQuestions` (`:28`). Dotyczy to tylko treści pytań, nie werdyktu.
- `evaluate.test.ts:300-323`: każda reguła jest na dokładnie jednej liście (kontrola strukturalna).
- Brak: testu niezmiennika na siatce kombinacji, testu „nie widać na wielu polach”, testu zgodności wartości z dokumentem, testu etykiety fail-open.

#### Najtańsza warstwa i kształt testów dla #1 (unit)

- **Niezmiennik na siatce:** litery (25 + `X` + `none` + `unknown` + 2 zniekształcone) × wyróżniki (3³) × okucia klasyczne (4) × zamek (3) × deklarowany rok (np. `null`, 2002, 2010, 2019) daje około 39 tys. wywołań, czyli poniżej sekundy przy czystym silniku. Asercje: `hard>0 ⇒ high`, `low ⇒ hard=soft=0`, `riskLevel !== null ⇔ outcome === "risk"`. Pełny iloczyn wszystkich pól (~10 mln) jest za duży, więc siatkę trzeba ciąć.
- **Zgodność wartości z dokumentem bez tautologii:** tabelę liter §3.2 da się sparsować z Markdowna (tak jak strażnik ID robi to z tabelą reguł) i porównać z `seasonLetters`. Okresy z §3.3 są prozą, więc zamiast parsowania: tabela przypadków granicznych z literałami lat przepisanymi z punktów §3.3 (np. „podkreślnik + każdy odczyt ≥2005 → S-05 twarde”).
- **Etykieta:** `outcomeLabel("risk", null)` nie może zwracać „Niskie ryzyko”. Test dziś będzie czerwony.

### Ryzyko #2 — oryginał dostaje „wysokie ryzyko” przez literówkę albo błąd odczytu

#### Które pola docierają do reguł twardych

| Pole | Reguły twarde | Normalizacja w silniku | Walidacja w kreatorze (`draft.ts`) | Schemat API (`verifications.ts:21-44`) |
| --- | --- | --- | --- | --- |
| `seasonLetter` | S-01, S-02, a pośrednio przez rok także S-05, S-06, S-13, S-07, V-02; wartość `"none"` prowadzi do S-09 | `trim()` + `toUpperCase()` (`evaluate.ts:189`); wartowniki `"unknown"`/`"none"` porównywane z rozróżnieniem wielkości liter (`:177`, `:183`) | `/^[A-Za-z]$/` (`:107`), `maxLength={1}` (`PlateStep.tsx:119`) | `z.string().max(10)` (`:35`) — przyjmuje wszystko |
| `styleNumber` | M-01 (po potwierdzeniu), pośrednio M-03 | tylko `trim()` (`:387`) — celowo, `plan.md:59` „never strip anything from the style-number field” | tylko niepusty (`:101`) | `max(40)` |
| `tabBackFirstNumber` | **M-03, bez potwierdzenia** | pierwsze 6 cyfr, pojedyncze spacje dozwolone (`:422`) | tylko niepusty (`:113-115`) | `max(80)` |
| `batchNumber` | S-12 (tylko przy dokładnym trafieniu — literówka *obniża*) | `trim()` + zdjęcie prefiksu `N°`/`No` (`:131-144`, `:436`) | niepusty albo „Nie widać” (`:102-104`) | `max(40)` |
| `declaredYear` | S-09 (z `"none"`) | — | `^\d{4}$` (`:78-81`) | `int 1900–2100` |
| wybory (`tagConstruction`, `brandLine`, `stamp925`, `madeInItalySize`, `hardware`, `zipper`) | M-04, S-05, S-06, S-13, S-07, V-02 | enum | wymagany wybór | `z.enum` |

Pomyłki w wyborach („kliknęłam kropkę zamiast podkreślnika”, „brak litery” zamiast „nieczytelna” → S-09) są dla silnika **nieodróżnialne** od prawdziwej sprzeczności. Test jednostkowy tego nie naprawi. Należy to do copy i UX kreatora, a nie do fazy 1 (patrz Otwarte pytania).

#### Ścieżki awarii potwierdzone sondą

1. **Zniekształcona litera sezonu daje twarde S-01.** `evaluate.ts:197-204`:
   ```ts
   const readings: Reading[] | undefined =
     /^[A-Z]$/.test(letter) && Object.hasOwn(knowledge.seasonLetters, letter)
       ? knowledge.seasonLetters[letter]
       : undefined;
   if (readings === undefined) {
     signal(ctx, known, "hard");
   ```
   Sonda: `""`, `" "`, `"Ć"`, `"ć"`, `"0"`, `"1"`, `"CC"`, `"C."`, `"C1"`, `"Unknown"`, `"NONE"`, `"ą"`, `"Ä"` → wszystkie `risk high hard=S-01`. Tabela liter obejmuje A–Z poza X (`knowledge.test.ts:21-25`), więc **S-01 nie ma dziś żadnego przypadku, w którym prawdziwa litera by go uruchomiła**. Każde jego zadziałanie to problem z formatem wpisu. Istniejący test *utrwala* to zachowanie (`evaluate.test.ts:311`, „unknown letter Ä”, choć sprawdza tylko rozliczenie reguł).
   Archiwum: impl-review F2 (`0`, `1`, `ą`) i F4 (pusta litera) naprawiono **tylko w kreatorze** (`validateStep`, `confirmStyleNumber`: `TagWizard.tsx:96-100`), a silnik został bez zmian.
2. **Literówka w numerze z odwrotu metki daje twarde M-03 bez potwierdzenia.** `evaluate.ts:420-427`:
   ```ts
   const tab = tabRaw === "unknown" ? null : (/\d(?:\s?\d){5}/.exec(tabRaw)?.[0].replace(/\s/g, "") ?? null);
   if (tab === null) { … ask(ctx, "tabBack"); }
   else if (tab !== style) signal(ctx, match, "hard");
   ```
   Sonda: `115749`, `115478` (zamienione cyfry), `3444 115748` (odwrócona kolejność grup) → `risk high hard=M-03`. Numer modelu ma krok „Potwierdzam odczyt” (`evaluate.ts:398`, `PlateStep.tsx:73-82`), numer z odwrotu go nie ma. To przeczy celowi z archiwum (`tag-validation-first-result/plan-brief.md:63`: „A typo or unreadable detail never produces "high risk" on its own”). Prawdziwa niezgodność (X4) i literówka są dla silnika nie do odróżnienia bez potwierdzenia.
3. **Formatowanie numeru modelu po potwierdzeniu daje dwa twarde sygnały.** Sonda: `"115 748"`, `"115748."`, `"115748​"` (spacja zerowej szerokości z kopiuj-wklej), `"１１５７４８"` (cyfry pełnej szerokości), `"l15748"` → po potwierdzeniu `hard=M-01,M-03`. M-03 porównuje numer z odwrotu *bez spacji* z numerem modelu *ze spacjami* (`:422` vs `:387`), więc jedna decyzja o formacie daje dwa twarde sygnały. Dokument mówi „Separators: none inside the number” (`:44`), a X1 (potwierdzone → twarde) to zapis w dokumencie. Dziś kupująca potwierdza więc wpis, który sama uważa za poprawnie przepisany.
4. **Wartowniki zależne od wielkości liter:** `"Unknown"`/`"NONE"` → S-01 twarde. Kreator zawsze wysyła małe litery, więc to ryzyko wyłącznie klienta API.
5. **Literówki bezpieczne (dla porównania):** numer z odwrotu `O15748`, `115-748`, `115 7 48` → M-03 się wstrzymuje, wynik `low` + pytanie. Numer modelu `115784` → `unsupported` (M-02 miękkie). Bez potwierdzenia każdy nie-sześciocyfrowy numer modelu to `input-error`.

#### Różnica między kreatorem a silnikiem

- Kreator: litera musi pasować do `/^[A-Za-z]$/` (`draft.ts:107`), co blokuje ścieżkę 1. Numer z odwrotu musi być tylko niepusty (`:113-115`), więc ścieżka 2 przechodzi przez kreator bez przeszkód. Numer modelu też tylko niepusty (`:101`).
- `toObservation` przekazuje literę bez zmian (`draft.ts:142`: `seasonLetter = d.seasonLetter`), więc gdyby `validateStep` przestał działać, `""` dotrze do silnika (dokładnie archiwalny F4).
- **`validateStep` ma 0 testów** (`draft.test.ts` testuje tylko `toSaveCommand`/`fromSaveCommand`). Jedyna ochrona przed ścieżką 1 nie jest więc pod testem.
- API (`POST`/`PUT /api/verifications`) waliduje tylko `max(10)` dla litery, a werdykt liczy serwer (`verifications.ts:157`, `:175`). Klient inny niż kreator, albo kreator po regresji, może zapisać fałszywe „wysokie”.

#### Istniejące testy dla #2

- `evaluate.test.ts:358-385` (normalizacja z review F4: mała litera, prefiksy `N°`/`No.` w obu polach, „Nope”), `:275-286` (spacje w numerze z odwrotu, mniej niż 6 cyfr → wstrzymanie), `:108-122` (X1 z potwierdzeniem i bez).
- Wszystkie te testy dotyczą **literówek już naprawionych**, czyli dokładnie anty-wzorca wskazanego w planie. Nie ma testu na: zniekształconą literę na poziomie silnika, literówkę w numerze z odwrotu, znaki niewidoczne i pełnej szerokości, wielkość liter wartowników, schemat API przyjmujący zniekształconą literę, `validateStep`.

#### Korekta wskazówki reakcji dla #2

„Błędne dane dają błąd wpisu albo wstrzymanie oceny, nigdy sygnał twardy” **nie da się dziś udowodnić bez zmiany zachowania**, a część tego zachowania jest zapisana w dokumencie reguł:

- S-01 dla zniekształconej litery jest twarde *z definicji dokumentu* (`balenciaga-city-tag-rules.md:180`).
- M-03 dla każdej niezgodności jest twarde *z definicji dokumentu* (`:85`, X4 `:256`).
- M-01 po potwierdzeniu jest twarde *z definicji dokumentu* (X1 `:253`).

Test zapisany zgodnie ze wskazówką będzie więc czerwony i będzie wymagał decyzji (najpierw dokument, potem JSON i silnik — CLAUDE.md). Bez zmiany dokumentu realny zakres fazy 1 dla #2 to: (a) testy `validateStep` (czyli sprawdzenie zasłony, na której dziś wszystko wisi), (b) testy silnika utrwalające *bezpieczne* ścieżki (wstrzymanie, `input-error`) na szerokim zestawie wariantów, (c) testy charakteryzujące, które jawnie dokumentują obecne zachowanie (S-01 dla zniekształconej litery, M-03 dla literówki) jako znane luki. Rekomendacja: zdecydować przed `/10x-plan` (patrz Otwarte pytania).

Najtańsza warstwa: unit (silnik + `validateStep` + `saveVerificationSchema`), tabele wariantów (`it.each`) generowane z kategorii błędu (znak spoza alfabetu, znak niewidoczny, cyfra pełnej szerokości, zamiana sąsiednich cyfr, odwrócona kolejność grup, pusty lub biały znak, wielkość liter wartownika), a nie z listy już naprawionych przypadków.

### Ryzyko #5 — etykieta na liście różni się od werdyktu raportu

#### Skąd lista bierze etykietę

- Strona `src/pages/verifications/index.astro:10` → `listVerifications` → `toListItem(row)` (`verifications.ts:89-98`):
  ```ts
  outcome: row.outcome,
  riskLevel: row.risk_level,
  ```
  a potem `outcomeLabel(item.outcome, item.riskLevel)` (`index.astro:64`).
- Kolumny zapisuje `toInsertRow` (`verifications.ts:73-82`), wywoływane w `saveVerification` z `evaluateTag(command.observation)` (`:157`), oraz `toUpdateRow` w `updateVerification` (`:175`).
- Uzasadnienie w migracji (`20260914130000_create_verifications.sql:10-13`): „Denormalised from the evaluation at save time, so the list needs no recomputation.”

#### Skąd raport bierze werdykt

- `src/pages/verifications/[id].astro:44` → `<ResultCard evaluation={verification.evaluation} …>`, gdzie `toDto` przelicza (`verifications.ts:101-108`):
  ```ts
  return {
    ...toListItem(row),            // outcome / riskLevel — zapisane
    …
    evaluation: evaluateTag(row.observation),   // przeliczone
  ```
- **Ten sam DTO jest wewnętrznie sprzeczny po zmianie reguł**: `dto.riskLevel` (zapisane) ≠ `dto.evaluation.riskLevel` (świeże). Zwraca go `GET /api/verifications/[id]` (`[id].ts:21`). Sonda: `dto.riskLevel: low | dto.evaluation.riskLevel: high`.

#### Co aktualizuje etykietę

- **Edycja:** PUT zastępuje całą komendę i zapisuje świeży werdykt (`verifications.ts:85-87`, `:175`, archiwum `edit-saved-verification/plan.md:17`, `:28`). Po edycji lista i raport są zgodne. Tę część wskazówki kod spełnia.
- **Zmiana reguł:** **nic**. Nie ma wersji wiedzy w wierszu ani przeliczenia w tle, a archiwum nie odnotowuje kompromisu (agent: `save-and-list-verifications/plan.md:23` twierdzi „keeps saved verifications consistent with rule updates”, co jest prawdą tylko dla raportu). Sonda: wiersz z zapisanym `low`, którego obserwacja (zamek B na torebce z 2009) dziś daje `high` → lista „Niskie ryzyko”, raport „Wysokie ryzyko”. Przy zaostrzeniu reguł to jest błąd klasy #1 na ekranie listy.
- **Założenie „przeliczanie przy odczycie trzyma wszystko w zgodzie”** jest więc fałszywe dla listy i dla pól `outcome`/`riskLevel` w DTO.

#### Zagrożenie pokrewne (poza zakresem #5, warto odnotować)

Jeśli zmiana reguł doda pole obserwacji (jak lista kontrolna z `visual-checklist`), stare wiersze przestaną przechodzić `parseRow` (`tagObservationSchema` wymaga wszystkich kluczy). `listVerifications` używa `.map(parseRow)`, które rzuca wyjątek (`verifications.ts:129`), więc **cała lista kończy się błędem**, a nie tylko jeden wiersz. Sonda: wiersz bez `thread` → `parseRow` rzuca. To ryzyko zmiany schematu, a nie etykiety. Kandydat do §2 przy odświeżeniu planu albo do Otwartych pytań.

#### Istniejące testy dla #5

- `verifications.test.ts:70-79` („maps a row to a list item”) porównuje element listy z wartościami zapisanego wiersza, czyli **zapisaną wartość samą ze sobą** (anty-wzorzec z planu).
- `:81-89` sprawdza tylko `evaluation`, a `:61-64` i `:93-98` tylko to, co trafia do zapisu.
- Żaden test nie zestawia etykiety listy z werdyktem raportu dla tego samego wiersza.

#### Najtańsza warstwa dla #5 (unit)

Mapowania są czyste, a Supabase tylko przechowuje dane, więc integracja nie doda sygnału. Kształt testu:

1. obserwacja `obs`, wiersz z kolumnami wyliczonymi przez `evaluateTag(obs, staraWiedza)`, gdzie `staraWiedza` to kopia `defaultKnowledge` ze zmienioną jedną wartością (silnik przyjmuje `knowledge` jako parametr, `evaluate.ts:372`; `toDto` nie przyjmuje, więc „obecna” wiedza to zawsze plik);
2. asercja: `outcomeLabel(toListItem(row))` === etykieta z `toDto(row).evaluation` (oraz `dto.riskLevel === dto.evaluation.riskLevel`);
3. przypadek „po edycji”: wiersz z `toUpdateRow(cmd, evaluateTag(cmd.observation))` → zgodne (dziś zielone).

Przypadek 2 będzie dziś czerwony, bo to prawdziwy błąd projektu. Plan musi wybrać naprawę (patrz Otwarte pytania). Nie jest potrzebne `vi.mock` pliku JSON.

## Referencje w kodzie

- `src/lib/services/tag-validation/evaluate.ts:88-99` — agregacja poziomu ryzyka (jedyne miejsce)
- `src/lib/services/tag-validation/evaluate.ts:375-405` — wczesne powroty bez werdyktu (przed twardymi sygnałami)
- `src/lib/services/tag-validation/evaluate.ts:177-205` — obsługa litery, twarde S-01 dla każdego wpisu spoza `^[A-Z]$`
- `src/lib/services/tag-validation/evaluate.ts:420-427` — M-03 bez potwierdzenia
- `src/lib/services/tag-validation/evaluate.ts:395-399` — M-01: `input-error` albo twarde po potwierdzeniu
- `src/lib/services/tag-validation/evaluate.ts:260-285`, `:320-322`, `:355-357` — wstrzymanie reguł zależnych od roku
- `src/lib/services/tag-validation/evaluate.ts:14-15` — plik wiedzy nieparsowany w runtime
- `src/data/balenciaga-classic-city/knowledge.json:215` — tolerancja S-08 (1 rok vs „one season” w dokumencie)
- `src/data/balenciaga-classic-city/knowledge.json:263` — tolerancja S-13 (interpretacja z X15)
- `src/components/verification/draft.ts:83-129` — `validateStep` (bez testów); `:107` regex litery; `:113-115` numer z odwrotu tylko niepusty; `:142` litera przekazywana bez zmian
- `src/components/verification/TagWizard.tsx:61-69`, `:96-100` — reset i potwierdzenie numeru modelu
- `src/lib/services/verifications.ts:35` — schemat API litery `max(10)`
- `src/lib/services/verifications.ts:73-98` — zapis kolumn i element listy z zapisanych kolumn
- `src/lib/services/verifications.ts:101-108` — DTO: zapisane `riskLevel` + przeliczone `evaluation`
- `src/lib/services/verifications.ts:129` — `.map(parseRow)` rzuca wyjątek dla starego wiersza
- `src/pages/verifications/index.astro:62-64` — etykieta i kolor listy z zapisanych kolumn
- `src/pages/verifications/[id].astro:44` — raport z przeliczonej oceny
- `src/components/verification/report.ts:34-41`, `ResultCard.tsx:38-40` — domyślnie „Niskie ryzyko”
- `supabase/migrations/20260914130000_create_verifications.sql:10-14` — uzasadnienie denormalizacji; `risk_level text` bez `CHECK`
- `balenciaga-city-tag-rules.md:153-155` (tolerancja sezonowa), `:180` (S-01), `:216-222` (§4), `:226-273` (§5), `:270-273` (reguły falsyfikują, nie weryfikują)
- `context/foundation/prd.md:35`, `:42`, `:110`, `:112` — definicje poziomów (niespójność „everything checked” vs „checked traits”)
- Testy: `evaluate.test.ts:38-44`, `:46-241`, `:300-323`, `:311`, `:358-385`; `knowledge.test.ts:13-19`; `verifications.test.ts:70-89`; `report.test.ts:42-48`; `draft.test.ts` (brak `validateStep`)

## Wnioski architektoniczne

- **Wiedza jako dane, silnik czysty:** `evaluateTag(obs, knowledge)` przyjmuje wiedzę jako parametr, więc testy „po zmianie reguły” mogą użyć zmodyfikowanej kopii bez mockowania. Wyjątek: `toDto` i `report.ts` (`YEAR_DEPENDENT_KINDS`) są przywiązane do `defaultKnowledge`.
- **Kolejność ewaluacji jest częścią kontraktu** (`evaluate.ts:370`). Niezmiennik „twardy ⇒ wysoki” zależy od tego, że wczesne wyjścia leżą przed pierwszym twardym sygnałem. Warto go przypiąć testem, zanim ktoś doda nową regułę z wczesnym wyjściem.
- **Obrona w głąb tylko w jedną stronę:** walidacja jest w kreatorze, silnik ufa wejściu, API sprawdza tylko długość. Przy trzech warstwach żadna poza kreatorem nie chroni przed fałszywym „wysokim”.
- **Denormalizacja bez wersjonowania:** zapisane kolumny nie znają wersji wiedzy, więc przy częstych zmianach reguł (wywiad P3) rozjazd listy z raportem jest pewny, a nie tylko prawdopodobny.

## Kontekst historyczny (archiwum)

- `context/archive/2026-09-14-tag-validation-first-result/plan.md:46`: „a rule whose input is unknown abstains … it never fails”, czyli źródło „niskiego” przy braku danych.
- `…/plan.md:59`: reguły normalizacji; numer modelu celowo bez normalizacji.
- `…/plan.md:137`: agregacja „any hard → high; else any soft or missing tag photo → medium; else low”.
- `…/plan-brief.md:24`, `:63`: literówka numeru modelu → najpierw potwierdzenie; „A typo or unreadable detail never produces "high risk" on its own”. M-03 nie spełnia tego celu.
- `…/reviews/impl-review.md:39-47` (F2), `:63-71` (F4): zniekształcona i pusta litera naprawione w warstwie kreatora; `:49-61` (F3): spacje w numerze z odwrotu naprawione w silniku (kompromis: `11574 83444` czyta się jako 115748).
- `…/reviews/plan-review.md:93`: „The drift guard compares rule IDs only”; `plan.md:163`: wartości sprawdzane ręcznie.
- `context/archive/2026-09-14-save-and-list-verifications/plan.md:23`: kolumny „stored only so the list needs no recomputation”, bez kompromisu dotyczącego zmiany reguł.
- `context/archive/2026-09-14-edit-saved-verification/plan.md:17`, `:27-28`: PUT przelicza i zapisuje; bez historii i wersjonowania.

## Ocena dowodów hot-spot (dla post-research backport check)

- Plan cytuje `src/lib/services/` (24 zmiany plików / 30 dni). Dla #1 kierunek jest **słuszny** (silnik: 5 commitów, `verifications.ts`: 4 commity od 2026-08-15), ale **niepełny**. Zmiany reguł (wywiad P3) lądują w `src/data/balenciaga-classic-city/knowledge.json` (4 commity) i `balenciaga-city-tag-rules.md` (3 commity), a nie w serwisach. Te pliki są bardziej bezpośrednim dowodem dla #1 i #5.
- Dla #2 i #5 część powierzchni awarii leży **poza** `src/lib/services/`: jedyna ochrona przed zniekształconą literą to `src/components/verification/draft.ts` (5 commitów), a etykieta listy to `src/components/verification/report.ts` + `src/pages/verifications/index.astro`. To katalog `src/components/verification/`, który plan cytuje tylko przy #4. **Korekta kotwicy: częściowa.**
- Ryzyka spekulatywne: brak. Wszystkie trzy mają potwierdzoną ścieżkę awarii (#1 w zawężonej formie, #2 i #5 w pełni).

## Powiązane badania

- `context/archive/2026-09-14-tag-validation-first-result/` (plan, plan-brief, przeglądy)
- `context/archive/2026-09-14-save-and-list-verifications/plan.md`
- `context/archive/2026-09-14-edit-saved-verification/plan.md`
- `context/archive/2026-09-14-visual-checklist/research.md`, `plan.md`

## Otwarte pytania (decyzje przed `/10x-plan`)

1. **#2 — S-01 i zniekształcona litera.** Dokument definiuje S-01 jako twarde, a cel planu mówi „nigdy sygnał twardy”. Opcje: (a) zmienić dokument: wpis spoza jednej litery A–Z to błąd wpisu (`input-error`, jak M-05), a potem JSON i silnik; (b) zostawić silnik, zaostrzyć schemat API (`seasonLetter` = jedna litera albo wartownik) i przetestować `validateStep`. Faza 1 wtedy dokumentuje lukę w silniku testem charakteryzującym.
2. **#2 — M-03 bez potwierdzenia.** Czy numer z odwrotu metki ma dostać ten sam krok „Potwierdzam odczyt” co numer modelu? To zmiana dokumentu (X4) i kreatora. Bez niej faza 1 może tylko przypiąć obecne zachowanie.
3. **#5 — naprawa rozjazdu.** Test będzie czerwony. Opcje: (a) lista przelicza etykietę z `observation` (silnik czysty, lista jednej osoby jest mała), a kolumny zostają np. do sortowania i filtrowania; (b) wersja lub skrót wiedzy w wierszu i przeliczenie przy niezgodności; (c) jednorazowe przeliczenie przy wdrożeniu. Rekomendacja: (a), bo usuwa też sprzeczność w DTO. Granica lekcji: naprawa błędów to lekcja 5. Plan może użyć `it.fails` jako testu charakteryzującego albo włączyć jednolinijkową naprawę — decyzja użytkowniczki.
4. **#1 — „niskie” przy braku danych.** PRD mówi raz „everything checked” (`:110`), raz „in the checked traits” (`:35`). Czy „niskie” przy większości pól „nie widać” jest akceptowalne? To decyzja produktowa (dokument §4, PRD), nie testowa. Faza 1 może ją tylko udokumentować.
5. **#1 — tolerancja S-08.** Czy „one season” z dokumentu ma zostać przełożona na regułę sezonową, czy dokument należy poprawić na „jeden rok”?
6. **Poza zakresem #5:** stary wiersz bez nowego pola obserwacji wysypuje całą listę. Kandydat do `/10x-test-plan --refresh` albo osobnej zmiany.
