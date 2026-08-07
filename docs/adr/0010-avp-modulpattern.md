# ADR-0010 — globalThis.AVP-Modulpattern statt Bundler

Status: akzeptiert · 2026-08-07

## Kontext
ESM-Imports überleben keine reine Konkatenation; ein Bundler widerspräche dem Toolchain-Minimalismus (ADR-0005/0007).

## Entscheidung
Jedes src-Modul registriert sich per Side-Effect an globalThis.AVP und exportiert nichts. Node lädt die Dateien als Side-Effect-Imports, der Browser per script-Tag, das Release per Konkatenation — identischer Code in allen drei Umgebungen.

## Konsequenzen
Ladereihenfolge ist bindend (params vor domain vor selftest) und im Build-Script fixiert; dafür null Build-Abhängigkeiten und ein Testpfad für CI und Browser-Selbsttest.
