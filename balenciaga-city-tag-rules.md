# Balenciaga Classic City — tag validation knowledge (v1)

Input for the tag-validation slice (FR-003, FR-004, FR-006, FR-008).
Section numbers match Claude Code's request.

Doc language is English to match the repo; **user-facing copy is in Polish**, because the
PRD's sample message is Polish. The `message` fields are the only thing to translate if the
UI is English.

Source status per rule:

- **confirmed** — at least one named source in §9
- **probable** — no direct source; inference, or a single weak source (collector forum, listing)

No point weights. Risk follows from hard vs soft.

---

## 1. Scope

**In scope for v1:** Classic City, medium, **classic hardware only** — regular aged brass
(2004 onward) plus its two early variants, flat brass (2000–2002) and pewter (2003–2004).
One style number, `115748`. One tag construction: a metal plate on a leather tab.

**Out of scope:** every other City variant, including any City with Giant hardware.

An out-of-scope bag must resolve to **`unsupported`**, never to high risk — the engine cannot
tell a variant it does not cover from a counterfeit, and the PRD's success criterion prohibits
guessing.

One consequence to plan for: inside the classic line, hardware dates a bag only up to 2004,
so it cannot resolve the ambiguous season letters. That job falls to the brand line, the `925`
stamp and the MADE IN ITALY size — see §3.5.

---

## 2. Model number — tag row 1 (FR-003)

### 2.1 Format

| Property      | Value                                                                                                   | Status    |
| ------------- | ------------------------------------------------------------------------------------------------------- | --------- |
| Length        | exactly 6 characters                                                                                    | confirmed |
| Character set | digits only, no letters                                                                                 | confirmed |
| Separators    | none inside the number                                                                                  | confirmed |
| Prefix        | on a metal plate it may be preceded by `N°`; the `N°` belongs to the batch number, not the style number | probable  |

### 2.2 Dictionary

| Number   | Model and size       | Tag type                     | Status    |
| -------- | -------------------- | ---------------------------- | --------- |
| `115748` | Classic City, medium | metal plate on a leather tab | confirmed |

This is the whole dictionary for v1. Any other six-digit number is `unsupported`.

### 2.3 The layout trap — read this before implementing

On a **metal plate** the physical order is the reverse of the PRD's row numbering:

```
BALENCIAGA.PARIS          <- brand line
N° 0754  C                <- batch number + season letter   (top)
115748                    <- style number                   (bottom)
```

On the **back of the leather tab** the style number comes first:

```
115748  3444              <- style number, then internal codes
MADE IN ITALY
```

A user reading the plate top-down will type the **batch number into row 1**, and every genuine
bag will fail. The question copy has to say which number to read, and `M-05` catches the
mistake as an input error rather than a risk signal.

Status: plate order **probable** (reconstructed from a documented counterfeit plate string and
two guides describing top versus bottom); leather-tab order **confirmed**.

### 2.4 Rules

| ID     | Rule                                                      | Signal                       | Status    | Message (PL)                                                                                                                                    |
| ------ | --------------------------------------------------------- | ---------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `M-01` | Row 1 has exactly 6 digits                                | hard                         | confirmed | Numer modelu ma zawsze sześć cyfr. Sprawdź, czy to na pewno ten numer, a nie numer partii.                                                      |
| `M-02` | Row 1 is `115748`                                         | soft → `unsupported`         | confirmed | Ten numer nie odpowiada Classic City w rozmiarze medium. Na razie obsługujemy tylko ten wariant — to nie znaczy, że z torebką jest coś nie tak. |
| `M-03` | Number on the plate = first number on the back of the tab | hard                         | confirmed | Numer z płytki i numer ze skórzanej metki różnią się. W oryginale są identyczne.                                                                |
| `M-04` | A bag with classic hardware has a metal plate on the tab  | hard                         | confirmed | City z klasycznymi okuciami ma metalową płytkę na metce. Sama skórzana metka to niezgodność.                                                    |
| `M-05` | Row 1 has 4 digits, or was entered with an `N°` prefix    | input error, no risk verdict | probable  | To wygląda na numer partii. Numer modelu jest niżej na płytce albo jako pierwszy na odwrocie skórzanej metki.                                   |

`M-02` is deliberately soft. A wrong number here means either another variant or a counterfeit,
and v1 has no way to tell them apart, so it reports what it knows and stops.

`M-04` needs the hardware type first. A tab with no plate means an unsupported variant far more
often than a problem, so resolve the hardware before this rule runs: not classic → `M-02` path,
`unsupported`. Only a bag with confirmed classic hardware can fail `M-04`.

`M-03` is always evaluable once `M-02` and `M-04` pass, because every in-scope bag has both a
plate and a tab.

---

## 3. Serial number and year code — tag row 2 (FR-003, FR-006)

### 3.1 Format

`N°` + batch number + season letter, with the style number on the separate line described in §2.3.

| Property                           | Value                                                                  | Status                    |
| ---------------------------------- | ---------------------------------------------------------------------- | ------------------------- |
| Batch number                       | 4 digits in the documented examples                                    | probable — single example |
| Season letter                      | one uppercase letter, immediately after the batch number               | confirmed                 |
| `X`                                | never used, skipped in the sequence                                    | confirmed                 |
| Letters before F/W 2003            | none — the letter system starts F/W 2003                               | confirmed                 |
| Additional numbers on the tab back | one or two further groups (colour and internal codes), highly variable | confirmed                 |

Observed real strings, usable as format fixtures: `115748-9770 001013`,
`115748-1960-535269`, `115748 3444`.

### 3.2 Letter → year

Balenciaga runs **backwards** through the alphabet from F/W 2003, and the sequence has cycled,
so most letters have two readings.

| Letter | Reading 1 | Reading 2 | Status                                  |
| ------ | --------- | --------- | --------------------------------------- |
| D      | F/W 2003  | S/S 2016  | confirmed                               |
| C      | S/S 2004  | F/W 2016  | confirmed                               |
| B      | F/W 2004  | S/S 2017  | reading 1 confirmed, reading 2 probable |
| A      | S/S 2005  | F/W 2017  | reading 1 confirmed, reading 2 probable |
| Z      | F/W 2005  | F/W 2018  | reading 1 confirmed, reading 2 probable |
| Y      | S/S 2006  | —         | confirmed                               |
| W      | F/W 2006  | S/S 2018  | reading 1 confirmed, reading 2 probable |
| V      | S/S 2007  | 2019      | reading 1 confirmed, reading 2 probable |
| U      | F/W 2007  | 2020      | reading 1 confirmed, reading 2 probable |
| T      | S/S 2008  | —         | confirmed                               |
| S      | F/W 2008  | 2021      | reading 1 confirmed, reading 2 probable |
| R      | S/S 2009  | 2022      | reading 1 confirmed, reading 2 probable |
| Q      | F/W 2009  | —         | confirmed                               |
| P      | S/S 2010  | S/S 2023  | reading 1 confirmed, reading 2 probable |
| O      | F/W 2010  | F/W 2023  | reading 1 confirmed, reading 2 probable |
| N      | S/S 2011  | —         | confirmed                               |
| M      | F/W 2011  | —         | confirmed                               |
| L      | S/S 2012  | —         | confirmed                               |
| K      | F/W 2012  | —         | confirmed                               |
| J      | S/S 2013  | —         | confirmed                               |
| I      | F/W 2013  | —         | confirmed                               |
| H      | S/S 2014  | —         | confirmed                               |
| G      | F/W 2014  | —         | confirmed                               |
| F      | S/S 2015  | —         | confirmed                               |
| E      | F/W 2015  | —         | confirmed                               |

Letters for 2024 and later are unknown → `unresolved`, never a failure.

One source dates the start of the sequence to S/S 2005 and shifts every letter by two seasons.
Two other sources agree with the table above, so it stands, but allow a one-year tolerance
when comparing a letter year against a seller's claim (`S-08`): one year is two seasons, the
size of the disputed shift, and the seller's claim gives a year, not a season.

### 3.3 Tag layouts by period, and combinations that exclude each other

| Period          | Layout                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------- |
| 2001 – F/W 2003 | no season letter at all                                                                           |
| F/W 2003 – 2004 | letter present; brand line reads `Balenciaga_Paris` with an underscore; serif type until F/W 2004 |
| 2005 – 2008     | brand line reads `Balenciaga.Paris` with a dot; plate is sterling silver with a small `925` stamp |
| 2008 onward     | plate is nickel, no `925` stamp                                                                   |
| 2011 onward     | `MADE IN ITALY` on the tab in large letters                                                       |

Mutually exclusive, i.e. hard contradictions:

- underscore brand line + letter dating the bag to 2005 or later
- dot brand line + letter dating the bag to 2004 or earlier
- `925` stamp + letter dating the bag after 2008
- large `MADE IN ITALY` + letter dating the bag before 2011
- classic hardware + no metal plate on the tab
- season letter present + a seller's claim of production before 2003

### 3.4 Rules

| ID     | Rule                                                                                                | Signal                                                          | Status    | Message (PL)                                                                                                                    |
| ------ | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `S-01` | Letter is a single uppercase letter from the table                                                  | hard                                                            | confirmed | Ta litera nie występuje w oznaczeniach Balenciagi.                                                                              |
| `S-02` | Letter is `X`                                                                                       | hard                                                            | confirmed | Balenciaga pomija literę X. Taka metka nie pochodzi z oryginału.                                                                |
| `S-03` | Letter illegible or worn off                                                                        | soft → question to seller                                       | probable  | Nie udało się odczytać litery sezonu. Poproś sprzedawcę o ostre zdjęcie odwrotu metki.                                          |
| `S-04` | Letter has two readings → both kept, resolved by `S-05`, `S-06`, `S-13`                             | not a signal, a branch                                          | confirmed | Ta litera odpowiada dwóm sezonom. Rozstrzygnie to napis na metce, stempel 925 i wielkość napisu MADE IN ITALY.                  |
| `S-05` | Letter year vs brand line (underscore / dot)                                                        | hard                                                            | confirmed | Litera wskazuje na rok {rok}, a napis na metce pochodzi z innego okresu.                                                        |
| `S-06` | Letter year vs `925` stamp                                                                          | hard                                                            | confirmed | Stempel 925 występuje tylko na płytkach do 2008 roku, a litera wskazuje na {rok}.                                               |
| `S-07` | Letter year vs hardware variant (flat brass: 2000–2002, pewter: 2003–2004, aged brass: 2004 onward) | soft at the boundary seasons, hard when off by more than a year | confirmed | Rodzaj okuć nie pasuje do roku z metki: {okucia} występowały w latach {zakres}, a litera wskazuje na {rok}.                     |
| `S-08` | Letter year vs year claimed by the seller                                                           | soft → question to seller                                       | confirmed | Litera na metce wskazuje na {rok}, a sprzedawca podaje {rok_deklarowany}. Zapytaj, skąd ta różnica.                             |
| `S-09` | No letter + seller claims production after 2003                                                     | hard                                                            | confirmed | Od 2003 roku każda metka ma literę sezonu.                                                                                      |
| `S-10` | No letter + bag presented as pre-2003                                                               | not a failure                                                   | confirmed | —                                                                                                                               |
| `S-11` | Batch number is not 4 digits                                                                        | soft                                                            | probable  | Numer partii ma zwykle cztery cyfry. Sprawdź odczyt.                                                                            |
| `S-12` | Batch `0754` + letter `C` + number `115748`                                                         | hard flag                                                       | confirmed | Ta dokładna kombinacja numerów pojawia się na tysiącach podróbek City. Autentyczne egzemplarze z tym numerem są bardzo rzadkie. |
| `S-13` | `MADE IN ITALY` in large letters ↔ letter year 2011 or later                                        | hard                                                            | confirmed | Duży napis MADE IN ITALY pojawia się na metkach dopiero od 2011 roku, a litera wskazuje na {rok}.                               |

Two rules fire in both directions, so each carries a second message for the opposite
observation (the table shows the default one):

- `S-06`, stamp absent while the letter points to 2005–2008: Płytki z lat 2005–2008 mają stempel 925, a tu go nie ma, choć litera wskazuje na {rok}.
- `S-13`, small `MADE IN ITALY` while the letter points to 2011 or later: Mały napis MADE IN ITALY występuje na metkach do 2010 roku, a litera wskazuje na {rok}.

`S-13` allows one year of tolerance around the change between 2010 and 2011: small `MADE IN ITALY`
on a bag the letter dates to 2011, or large on a bag dated 2010, is soft; anything further apart is
hard (X15, X16).

### 3.5 Resolving the double letters

1. **Brand line** (`S-05`) — underscore means 2004 or earlier. Settles `D`, `C`, `B`: the first
   reading is underscore-era, the second is dot-era.
2. **`925` stamp** (`S-06`) — settles the pairs that sit inside the dot era on both readings but
   straddle 2008: `A` (2005 vs 2017), `Z` (2005 vs 2018), `W` (2006 vs 2018), `V`, `U`. Sterling
   on the first reading, nickel on the second.
3. **MADE IN ITALY size** (`S-13`) — the only resolver left for `S`, `R`, `P`, `O`, whose two
   readings are both nickel-era: small lettering means 2008–2010, large means 2021 onward.

`S-13` acts as a resolver while the year is ambiguous and as a contradiction check once the year
is settled — never both at once. If no resolver applies, keep both readings and mark the year
`ambiguous`; `S-07` and `S-08` then abstain rather than picking a reading.

---

## 4. What each failure means

- **hard** — internal contradiction on the bag itself. High risk immediately. Present the reason,
  not a verdict.
- **soft** — medium risk plus a question to the seller (§8).
- **unsupported / unresolved** — missing data, or a variant outside v1. Neither risk nor pass.
  This state has to exist, otherwise every gap in the data turns into a false accusation.

---

## 5. Test set

**Observed strings** (real listings; the season letter was not recorded, so use them for format
tests only):

| String               | Expected              |
| -------------------- | --------------------- |
| `115748-9770 001013` | row 1 valid, in scope |
| `115748-1960-535269` | row 1 valid, in scope |
| `115748 3444`        | row 1 valid, in scope |

**Constructed valid cases** (assembled from documented components — structurally correct, not
photographs of specific bags):

| #   | Row 1    | Row 2       | Context                                                       | Expected                                                                        |
| --- | -------- | ----------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| V1  | `115748` | `N° 4892 R` | dot brand line, no 925, small MADE IN ITALY, aged brass       | passes; S/S 2009, reading 1 chosen by `S-13`                                    |
| V2  | `115748` | `N° 3317 M` | dot brand line, no 925, aged brass                            | passes; F/W 2011, letter unambiguous                                            |
| V3  | `115748` | `N° 1120 B` | underscore brand line, 925 stamp, pewter hardware             | passes; F/W 2004, reading 1 chosen by the brand line                            |
| V4  | `115748` | `N° 2048 D` | dot brand line, no 925, aged brass                            | passes; S/S 2016, reading 2 chosen by the brand line                            |
| V5  | `115748` | no letter   | underscore brand line, flat brass hardware, presented as 2002 | passes; `S-10`, pre-2003                                                        |
| V6  | `115748` | `N° 5501 A` | dot brand line, 925 stamp, aged brass                         | passes; S/S 2005, reading 1 chosen by `S-06` — both readings sit in the dot era |

**Invalid cases:**

| #   | Input                                                  | Expected                                                                                                            |
| --- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| X1  | row 1 = `11574`                                        | `M-01` hard — in the app only once the buyer confirms the entry; unconfirmed it is an input error asking to re-read |
| X2  | row 1 = `0754`                                         | `M-05` input error, no risk verdict                                                                                 |
| X3  | row 1 = six digits other than `115748`                 | `M-02` → `unsupported`, not risk                                                                                    |
| X4  | plate `115748`, first number on the tab back different | `M-03` hard                                                                                                         |
| X5  | classic hardware, no metal plate on the tab            | `M-04` hard                                                                                                         |
| X6  | hardware not classic                                   | `M-02` path → `unsupported`; must not reach `M-04`                                                                  |
| X7  | letter `X`                                             | `S-02` hard                                                                                                         |
| X8  | letter `G` (F/W 2014) + underscore brand line          | `S-05` hard                                                                                                         |
| X9  | letter `R` (S/S 2009) + `925` stamp                    | `S-06` hard                                                                                                         |
| X10 | letter `A` (S/S 2005) + pewter hardware                | `S-07` soft — one season past the pewter cutoff                                                                     |
| X11 | letter `R` (S/S 2009) + flat brass hardware            | `S-07` hard — seven years past the cutoff                                                                           |
| X12 | `N° 0754 C` + `115748`                                 | `S-12` hard flag                                                                                                    |
| X13 | letter `Q` (F/W 2009), seller claims 2019              | `S-08` soft                                                                                                         |
| X14 | no letter, seller claims 2012                          | `S-09` hard                                                                                                         |
| X15 | letter `M` (F/W 2011) + small MADE IN ITALY            | `S-13` soft — 2011 is the transition year                                                                           |
| X16 | letter `T` (S/S 2008) + large MADE IN ITALY            | `S-13` hard — three years early                                                                                     |

One caveat for the "zero fałszywych »format poprawny«" criterion: these rules falsify, they
never verify. A well-made counterfeit carries a correctly formatted tag and passes everything in
§2 and §3. The criterion is testable as _no invalid string is ever accepted as valid_; it is not
testable as _no counterfeit passes_.

---

## 6. Authenticity card (FR-005) — gap

Not written. I have no sourced data on what the card contains for this line or which of its
fields should match the tag. Guessing would produce rules that fail genuine bags, so this stays
empty until sources or your own photographs settle it.

---

## 7. Three visual traits (FR-006)

| Trait              | Question (PL)                                                  | What to look at (PL)                                                                             | Correct answer                                                                                                                                       | Era dependency                                                                                                            | Status    |
| ------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------- |
| Black thread       | Jaki kolor ma nitka, którą przyszyta jest górna krawędź metki? | Górna krawędź metki, tam gdzie styka się z podszewką. Interesuje nas sam górny szew, nie boczne. | czarna lub bardzo ciemna, niezależnie od koloru torebki i metki                                                                                      | classic era; not verified for post-2014 production                                                                        | confirmed |
| Lampo zipper       | Co jest wybite na spodzie suwaka?                              | Odwróć zamek i popatrz na spód — napis jest po niewidocznej stronie.                             | do ok. 2014: kursywą `Lampo`, litera L podkreśla resztę słowa. Od ok. 2014/2015: litera `B`, wykończenie matowe lub satynowe, nigdy lustrzany chrom. | Lampo ≈ 2001–2014; `B` from ≈ 2014/2015. A `B` pull on a bag dated 2005 is a hard contradiction, and the reverse likewise | confirmed |
| Twist of the bales | Jaki kształt ma metalowe kółko łączące pasek z torebką?        | Kółko przy boku torebki, w miejscu mocowania paska.                                              | grube, zaokrąglone, o organicznym skręcie, końcówki drutu wygładzone                                                                                 | none found — described as constant across the classic line                                                                | confirmed |

Each is **soft** on its own; they are judgement calls. They become hard only in combination with
the year from the tag, as in the Lampo/`B` case.

Reference image filenames are not in this file — name them after the rule IDs
(`visual-lampo-underside.jpg`) so the config can point at them.

### 7.1 Rules

| ID     | Rule                                                                   | Signal                                                                              | Status    | Message (PL)                                                                                                                 |
| ------ | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `V-01` | Top seam of the tag is black or very dark                              | soft; "can't see" → question to seller (Tag stitching)                              | confirmed | Górny szew metki nie jest czarny. W oryginale ta nitka jest czarna lub bardzo ciemna, niezależnie od koloru torebki i metki. |
| `V-02` | Zipper pull vs letter year: `Lampo` up to 2014, `B` from 2015          | hard; soft within one year of the change; "can't see" → question to seller (Zipper) | confirmed | Rodzaj zamka nie pasuje do roku z metki: {zamek} występuje w latach {zakres}, a litera wskazuje na {rok}.                    |
| `V-03` | The bales have a thick, rounded, organic twist with smoothed wire ends | soft; "can't see" → question to seller (Bales)                                      | confirmed | Kółko przy pasku nie ma grubego, zaokrąglonego skrętu jak w oryginale.                                                       |

`V-02` reads "≈ 2014/2015" as Lampo up to 2014 and `B` from 2015, with one year of tolerance: a `B` pull
on a 2014 bag or Lampo on a 2015 bag is soft, anything further apart is hard. With an unresolved year the
rule abstains. Reference images in the app: `public/reference/visual-thread-tag.webp`,
`public/reference/visual-lampo-zipper.webp`, `public/reference/visual-bales-ring.png` (temporary, to be
replaced with own photographs).

---

## 8. Questions to the seller (FR-004, FR-008)

| Missing                                   | Question (PL)                                                                                         |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Hardware unknown (scope gate — ask first) | Jakie okucia ma ta torebka — klasyczne czy Giant? Poproszę o zdjęcie ćwieku i nitu na spodzie rączki. |
| Tag photo                                 | Poproszę o zdjęcie metki w środku torebki — z przodu i z odwrotu, tak żeby numery były ostre.         |
| Back of the tab                           | Poproszę o zdjęcie odwrotu skórzanej metki, z numerami i napisem MADE IN ITALY.                       |
| Season letter illegible                   | Litera sezonu jest nieczytelna na zdjęciu — czy da się zrobić ujęcie pod światło, pod kątem?          |
| Authenticity card                         | Czy do torebki jest karta autentyczności? Jeśli tak, poproszę o zdjęcie obu stron.                    |
| Zipper                                    | Poproszę o zdjęcie spodu suwaka, od strony, która normalnie przylega do torebki.                      |
| Tag stitching                             | Poproszę o zbliżenie górnej krawędzi metki, tam gdzie jest przyszyta do podszewki.                    |
| Bales                                     | Poproszę o zdjęcie kółka przy mocowaniu paska, z boku.                                                |
| Year mismatch                             | Metka wskazuje na rok {rok}. Czy wiadomo, z którego sezonu jest ta torebka i skąd pochodzi?           |

---

## 9. Sources

| Key            | Source                                                                                                                                                                            |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| legitique      | <https://legitique.com/blogs/balenciaga/balenciaga-motorcycle-bag-legit-check-guide> — front/back number match, counterfeit plate `N° 0754 C 115748`, Lampo, bales, tag stitching |
| glampot        | <https://e-glampot.com/pages/how-to-authenticate-balenciaga-handbags> — letter table, underscore/dot, 925, hardware                                                               |
| yoogis         | <https://www.yoogiscloset.com/balenciaga/guide> — hardware and leather timeline                                                                                                   |
| lovethatbag    | <https://lovethatbagetc.com/blogs/the-preloved-pages/authenticating-balenciaga-handbags> — tag types, letter cycling, front/back match                                            |
| collectorscage | <https://collectorscage.com/blogs/authentication/balenciaga-bag-authentication> — typography eras, MADE IN ITALY from 2011                                                        |
| etoile         | <https://etoile-luxuryvintage.com/blogs/guides-how-tos/verify-your-balenciaga-bag> — silver tags, 925                                                                             |
| bagbible       | <http://bagbible.com/blog/how-to-spot-a-fake/balenciaga/> — plate top/bottom number placement                                                                                     |
| 1stdibs        | <https://www.1stdibs.com/answers/how-to-read-a-balenciaga-tag> — letter placement, skipped `X`; listing strings used as fixtures                                                  |

All sources are resale-market or collector-compiled. None is official. Where two disagree, both
readings are kept and the section says so.
