# ADR-0005 — Modulare Entwicklung, Single-File-Release

Status: akzeptiert · 2026-08-07

## Kontext
Ziel ist eine einzelne, offline lauffähige HTML-Datei; Entwicklung und Tests brauchen aber Modulgrenzen und Diffs.

## Entscheidung
Entwicklung in src/-Modulen; make release konkateniert sie in dist/altersvorsorge-planer.html. Tests laufen in Node gegen dieselben Dateien.

## Konsequenzen
Ein Makefile, kein Bundler-Zwang; Fremdbeiträge und CI werden praktikabel, das Auslieferungsartefakt bleibt eine Datei.
