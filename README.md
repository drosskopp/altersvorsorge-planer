# Altersvorsorge-Planer (v7, in Entwicklung)

Open-Source-Planungswerkzeug für die deutsche Altersvorsorge: gesetzliche Rente
(Entgeltpunkte, Zugangsfaktor, Kohortenbesteuerung), VBLklassik, ETF-Depot mit
deutscher Kapitalertragsbesteuerung (Teilfreistellung, Vorabpauschale) und
KVdR-Beiträgen — als **eine einzige HTML-Datei**, die vollständig lokal im
Browser läuft. Keine Server, keine Cookies, keine externen Requests:
**keine Daten verlassen das Gerät.**

> **Hinweis:** Modellrechnung — keine Anlage-, Steuer- oder Rechtsberatung.
> Alle Ergebnisse sind Näherungswerte; Details im Tool unter „Hinweise".

## Status

`v7.1.1` — Schritt 1 der Roadmap ist umgesetzt: der **solidierte,
quellbelegte Rechenkern** mit 42 goldenen Testfällen (Herkunft je Fall:
`[GESETZ]`, `[AMTLICH]` oder `[PROPERTY]`). Engine, Quellenmodell-Verdrahtung,
UI und Monte-Carlo folgen (Schritte 2–5, siehe `docs/berichte/architektur-v7.md`).

## Entwickeln & Bauen

```
make test       # goldene Testfälle (Node ≥ 18)
make release    # baut dist/altersvorsorge-planer.html (Single-File, offline)
                # inkl. check-privacy: keine externen Ressourcen-Requests
```

Kein npm, kein Bundler: Module folgen dem `globalThis.AVP`-Pattern (ADR-0010)
und laufen identisch in Node und Browser; das Release ist reine Konkatenation.

## Deployment

GitHub Actions testet jeden Push, baut das Release und deployt `dist/` nach
GitHub Pages (einmalig aktivieren: *Settings → Pages → Source: GitHub Actions*).

## Dokumentation

- `docs/adr/` — Designentscheidungen als Architecture Decision Records
- `docs/methodik.md` — Modellannahmen und bewusste Vereinfachungen
- `docs/quellen.md` — amtliche Quellen; maschinenlesbar annotiert in `src/params/`
- `docs/berichte/` — Rentenmodul-Analyse und Architektur-Entscheidungsdokument
- `CONTRIBUTING.md` — inkl. Checkliste „jährliches Parameterupdate"

Lizenz: MIT.
