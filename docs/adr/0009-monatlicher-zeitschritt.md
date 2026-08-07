# ADR-0009 — Monatlicher Zeitschritt

Status: akzeptiert · 2026-08-07

## Kontext
Jahresschritt wäre schlanker, verlöre aber v6-Vergleichbarkeit, exakte Sparraten und Phasenwechsel mitten im Jahr.

## Entscheidung
Die Engine rechnet monatlich; Marktpfade liegen jahresweise vor und werden mit (1+r)^(1/12) umgerechnet. Monte-Carlo-Kosten (~5 Mio. Schritte bei 10.000 Pfaden × 40 J.) laufen im Web Worker.

## Konsequenzen
Regressionsvergleich mit v6 bleibt möglich; Bootstrap-Jahresdaten bleiben die natürliche Datenbasis.
