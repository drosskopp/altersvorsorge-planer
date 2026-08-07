# ADR-0003 — Pfade statt Skalare

Status: akzeptiert · 2026-08-07

## Kontext
Rendite, Inflation, Rentenanpassung und Beitragssätze ändern sich über die Zeit; Konstanten erzwängen später einen zweiten Rechenkern für Stochastik und Szenarien.

## Entscheidung
Die Engine konsumiert Zeitreihen f(t); Konstanten sind flache Pfade. Monte-Carlo ist ein Pfad-Generator plus Schleife über die unveränderte deterministische Engine.

## Konsequenzen
Szenario-Schalter (Rentenniveau, GKV-Pfade, Abgeltungsatz) sind vorkonfigurierte Pfade; kein Sondercode, keine Drift zwischen deterministisch und stochastisch.
