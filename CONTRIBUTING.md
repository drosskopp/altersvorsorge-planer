# Mitwirken

Beiträge sind willkommen — besonders das jährliche Parameterupdate und
zusätzliche goldene Testfälle. Grundregeln: jede Zahl mit Quelle, jede
Designentscheidung als ADR, keine externen Requests im Release (CI erzwingt das).

## Checkliste: jährliches Parameterupdate (z. B. `src/params/2027.js`)

1. Neue Datei aus dem Vorjahr kopieren, `meta` aktualisieren (`jahr`, `stand`,
   `gueltig_bis`), ALLE Werte prüfen und Quellen aktualisieren:
   - [ ] Aktueller Rentenwert (Rentenwertbestimmungsverordnung, 1.7.)
   - [ ] Vorläufiges Durchschnittsentgelt + BBG (SV-Rechengrößenverordnung)
   - [ ] § 32a-Tarif: GFB, Zonengrenzen, Koeffizienten (Gesetzestext, nicht
         Sekundärquellen — die widersprechen sich regelmäßig)
   - [ ] Soli-Freigrenze (§ 3 SolZG)
   - [ ] Basiszins Vorabpauschale (BMF-Schreiben Januar)
   - [ ] KV-Zusatzbeitrag Ø (BAnz/BMG), PV-Sätze (§ 55 SGB XI)
   - [ ] Freibetrag Versorgungsbezüge (1/20 der Bezugsgröße)
   - [ ] VBL-Werte (Satzung; ändern sich selten)
2. Goldene Fälle in `src/selftest/cases.js` um Jahresfälle ergänzen;
   Stützstellen des Tarifs von Hand nachrechnen und Rechenweg im Kommentar
   dokumentieren.
3. Manuelle Referenzabgleiche durchführen und im PR dokumentieren:
   - DRV-Rentenschätzer: Punkte→Rente-Stichprobe
   - BMF-Lohn- und Einkommensteuerrechner: 3 zvE-Stichproben (±1 €)
4. `CHANGELOG.md`-Eintrag mit Parameterstand; `make test` grün.

## Entwicklung

- `make test` vor jedem Commit; neue Rechenlogik nur mit Testfällen.
- Module: `globalThis.AVP`-Pattern, zustandslos, `p` als Argument (ADR-0010).
- Keine neuen Laufzeit-Abhängigkeiten ohne ADR.
