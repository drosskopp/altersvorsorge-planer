# ADR-0001 — Einkünfte sind Daten, nicht Code

Status: akzeptiert · 2026-08-07

## Kontext
v6 verdrahtete DRV, VBL, Depot und AVD als Spezialfälle quer durch die Rechenlogik; jede weitere Einkunftsart hätte den Kern aufgerissen.

## Entscheidung
Jede Einkunftsquelle ist eine deklarative Instanz eines einheitlichen Schemas (kind, schedule, amount, accrual, discount, dynamics, tax, social). Die Engine kennt nur Quellen und Profile, keine konkreten Produkte.

## Konsequenzen
Neue Einkunftsarten (Miete, Privatrente, Einmalzahlungen) sind neue Instanzen; neues Steuer-/SV-Verhalten ist eine lokale Strategie-Funktion. Kein Engine-Umbau bei Erweiterungen.
