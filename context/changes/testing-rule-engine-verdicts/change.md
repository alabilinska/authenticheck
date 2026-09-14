---
change_id: testing-rule-engine-verdicts
title: Faza 1 testów — silnik reguł bez fałszywych werdyktów
status: implementing
created: 2026-09-14
updated: 2026-09-14
archived_at: null
---

## Notes

Open a change folder for rollout Phase 1 of context/foundation/test-plan.md: "Silnik reguł bez fałszywych werdyktów".
Risks covered: #1 (podróbka dostaje „niskie ryzyko”), #2 (oryginał dostaje „wysokie ryzyko” przez literówkę lub błąd odczytu), #5 (etykieta na liście różni się od werdyktu zapisanego raportu). Test types planned: unit.
Risk response intent:

- #1: każda kombinacja z nieudanym sygnałem twardym daje „wysokie ryzyko”, a zmiana reguły nie zmienia werdyktów przypadków z dokumentu reguł §5 — oczekiwania z dokumentu reguł, nie z pliku wiedzy.
- #2: błędne lub dwuznaczne dane dają błąd wpisu albo wstrzymanie oceny, nigdy sygnał twardy — silnik bezpieczny niezależnie od kreatora.
- #5: etykieta na liście równa się werdyktowi raportu dla tej samej weryfikacji, także po edycji i po zmianie reguł.

After creating the folder, follow the downstream continuation rule.
