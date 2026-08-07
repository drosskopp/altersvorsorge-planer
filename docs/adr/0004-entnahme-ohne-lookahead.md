# ADR-0004 — Entnahmestrategien ohne Look-ahead

Status: akzeptiert · 2026-08-07

## Kontext
Adaptive Regeln (Guardrails, ABW) müssen im Monte-Carlo ehrlich bleiben; Blick in die Zukunft erzeugt Scheinergebnisse im Backtest.

## Entscheidung
Entnahmestrategien implementieren strategy(state_t, history_0..t, params) und sehen ausschließlich Vergangenheit und Gegenwart.

## Konsequenzen
SWR/Annuität/Hybrid aus v6 werden als erste Implementierungen portiert; Guardrails/ABW kommen ohne Engine-Änderung dazu.
