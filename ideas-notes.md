## Authenticheck – MVP

### Główny problem
Osoby kupujące vintage torebki luksusowe na rynku wtórnym (Depop, Vinted, Vestiaire, sklepy w Japonii) nie mają prostego sposobu, żeby przed zakupem samodzielnie zweryfikować autentyczność. Wiedza o formatach numerów seryjnych, metkach i cechach charakterystycznych dla marki i epoki jest rozproszona po forach i filmach, co prowadzi do przepłacania za podróbki albo rezygnacji z dobrych okazji.

### Najmniejszy zestaw funkcjonalności
- Ścieżka weryfikacji krok po kroku dla torebek Balenciaga (na start: linia City / Motorcycle)
- Walidacja numeru seryjnego z metki skórzanej: układ cyfr, zgodność z epoką, zgodność z kartą autentyczności
- Checklista cech wizualnych z podpowiedziami, na co patrzeć (skóra, okucia, frędzle, lusterko, podszewka, zamki)
- Raport z oceną ryzyka i listą rzeczy do dopytania sprzedawcy
- Zapisywanie, przeglądanie, edycja i usuwanie weryfikacji
- Prosty system kont użytkowników do przechowywania weryfikacji

### Co NIE wchodzi w zakres MVP
- Inne marki (Louis Vuitton, Gucci, Chloé – kolejne iteracje)
- Analiza zdjęć (rozpoznawanie obrazu, AI)
- Wycena i ceny referencyjne
- Automatyczne pobieranie danych z ofert (scraping, parsowanie linków)
- Współdzielenie weryfikacji między użytkownikami
- Aplikacja mobilna (na początek tylko web)

### Kryteria sukcesu
- Użytkownik przechodzi pełną weryfikację Balenciagi od wpisania numeru seryjnego do raportu w mniej niż 5 minut
- Walidator numeru seryjnego poprawnie rozpoznaje wszystkie przykłady z przygotowanego zbioru testowego – zarówno autentyczne, jak i błędne
- Każdy raport zawiera co najmniej jedno konkretne działanie do wykonania przed zakupem

### Podejście do wiedzy domenowej
- Wiedza o Balenciadze jest trzymana jako dane, nie jako kod: reguły walidacji numeru seryjnego i modelu oraz pytania checklisty żyją w plikach konfiguracyjnych, a silnik walidacji jest generyczny
- Numer seryjny / model: zbiór pojedynczych reguł (format wierszy, zgodność numeru z linią i rozmiarem, zgodność z epoką, zgodność z kartą autentyczności, układy wykluczające), każda z opisem, zakresem lat i komunikatem błędu; każdy przykład ze źródeł staje się przypadkiem testowym
- Cechy wizualne i „miękkie” (skóra, zapach, suwaki Lampo/BB, spiralny skręt okuć przy pasku, nacięcia przy mocowaniu rączek, metka przyszyta czarną nitką po górnej krawędzi): pytania z podpowiedzią, wagą i statycznymi zdjęciami referencyjnymi
- Przed kodowaniem: zrzut całej wiedzy do jednego pliku markdown jako kontekst dla agenta; strukturę reguł wypracowujemy w sesji planistycznej
