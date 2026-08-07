# ADR-0006 — Goldene Tests und v6-Regressionsanker

Status: akzeptiert · 2026-08-07

## Kontext
Steuer-/Rentenlogik ist fehleranfällig und ändert sich jährlich; Sekundärquellen widersprechen sich (nachweislich beim § 32a-Tarif 2026).

## Entscheidung
Jeder Rechenbaustein hat goldene Fälle mit deklarierter Herkunft [GESETZ]/[AMTLICH]/[PROPERTY]; Tarif-Stützstellen werden von Hand nachgerechnet; v6 dient als Regressionsanker, dessen Abweichungen den dokumentierten Befunden 1–11 zuordenbar sein müssen; manuelle Referenzabgleiche (DRV-Rentenschätzer, BMF-Rechner) je Parameterjahr laut CONTRIBUTING.

## Konsequenzen
Fehlerhafte Parameterupdates fallen in der CI auf; die Herkunftskennzeichnung macht Prüfungen durch Dritte möglich.
