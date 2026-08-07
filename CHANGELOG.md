# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/de/), Versionierung: SemVer.
Jede Version nennt ihren **Parameterstand**.

## [7.0.0-alpha.1] — 2026-08-07 · Parameterstand 2026 (geprüft 2026-08-07)
### Hinzugefügt
- Solidierter Rechenkern (Schritt 1): GRV-Entgeltpunkte mit BBG-Kappung,
  Regelaltersgrenzen-Staffel, Zugangsfaktor, Besteuerungsanteil-Kohorten;
  § 32a-Tarif 2026, Soli mit Milderungszone, Vorabpauschale, Ertragsanteil;
  VBL (Bestand, Abschlag, Bezugsdynamik +1 %); KVdR-KV/PV-Beiträge.
- Quellannotiertes Parameterobjekt `src/params/2026.js`.
- Selbsttest (42 goldene Fälle), identisch in CI und im Browser-Release.
- Build-Pipeline: `make test` / `make release` (Single-File) / `check-privacy`.
- CI mit GitHub-Pages-Deploy; ADR-0001…0010; Berichte unter `docs/berichte/`.

### Bekannt offen (Roadmap Schritte 2–5)
- Engine (Phasen-Simulation), Quellenmodell-Verdrahtung, UI, Monte-Carlo.
- VBL-Zuwachsrechnung für Status „pflichtversichert" (Altersfaktor-Tabelle).

## [7.0.0-alpha.2] — 2026-08-07 · Parameterstand 2026 (geprüft 2026-08-07)
### Hinzugefügt
- Eingaben-Persistenz als Baustein (ADR-0011): `src/domain/storage.js` —
  localStorage-basiert (keine Cookies, keine Übertragung), Opt-in-Design,
  Schema-Versionierung, injizierbares Backend, 8 neue Testfälle (gesamt 50).
  UI-Verdrahtung (Speichern-/Löschen-Button, Restore-Meldung) folgt mit den
  Eingabefeldern in Schritt 4.

## [7.0.0-alpha.3] — 2026-08-07 · Parameterstand 2026 (geprüft 2026-08-07)
### Hinzugefügt (Schritt 2: Rentenmodul auf der Engine)
- `engine/rente.js`: EP-Rückrechnung aus der Renteninformation (Anwartschaft
  + Stand), monatsgenaue Phasen-Projektion (Vollzeit/Teilzeit) mit BBG-Kappung,
  Zugangsfaktor GRV + gekoppelter VBL-Abschlag, Rentenwert als Pfad mit
  konsistenter Sicht heutige Werte / nominal / real (behebt v6-Befund 1);
  VBL-Anwartschaft nominal eingefroren, +1 %/J. erst im Bezug (Befunde 7–9).
- `engine/veranlagung.js`: zentrale Jahresveranlagung (ADR-0002) — GRV-Kohorte
  mit beim Eintritt EINGEFRORENEM €-Freibetrag (Befund 6), VBL-Ertragsanteil,
  gemeinsames zvE → § 32a → Soli, KVdR-KV/PV.
- `engine/pfade.js`: Pfad-Helfer inkl. amtlichem Rentenanpassungs-Modellpfad.
- 18 neue goldene Fälle (gesamt 68), u. a. handgerechnete Veranlagungs-
  Stützstelle und Ablehnung des noch nicht implementierten VBL-Status
  „pflichtversichert".

## [7.0.0-alpha.4] — 2026-08-07 · Parameterstand 2026 (geprüft 2026-08-07)
### Behoben
- Status-Text der Shell war in alpha.3 durch un-escaptes `&` in einem
  sed-Replacement zerschossen ("SchrittDer…:nbsp;"); Absatz neu gesetzt und
  um die Schritt-2-Beschreibung ergänzt, die ein zweiter sed (No-Op wegen
  `\n` im Pattern) nie eingefügt hatte.
### Hinzugefügt
- `scripts/build.sh` prüft das Release jetzt zusätzlich auf Textschäden und
  Marker-Reste (check-integrity) — derselbe Fehlerklasse-Guard, der alpha.3
  hätte abfangen müssen.

## [7.0.0-beta.1] — 2026-08-07 · Parameterstand 2026 (geprüft 2026-08-07)
### Hinzugefügt (Schritte 3+4: Depot-Engine und Planer-Oberfläche)
- `engine/depot.js`: monatliche Depot-Simulation (Ansparen Vollzeit/Teilzeit,
  Entnahme ab Eintritt) mit Modi SWR (nominal fix), inflationsangepasst und
  Annuität bis Zielalter; Property-Tests (Depot = 0 am Zielalter u. a.).
- Veranlagung um Kapitalerträge erweitert (ADR-0002): Sparerpauschbetrag,
  Teilfreistellung, ECHTE Günstigerprüfung per Tarifeinbezug
  (ESt(zvE+Kap) − ESt(zvE) vs. 25 %) statt Grenzsatz-Näherung aus v6.
- `ui/app.js`: DOM-freie Gesamtrechnung (in Node getestet) verbindet
  Rentenprojektion, Depot und Veranlagung zur Jahresreihe.
- Vollständige Planer-Oberfläche: Eingaben (Person/Phasen, Renteninformation,
  VBL-Bestand, Depot, Annahmen, Entnahme), Kennzahl-Kacheln, Depot- und
  Realeinkommens-Chart, Jahresübersicht, Abzugszeile; Chart.js 4.5.1 gevendort
  (MIT, offline, keine externen Requests); Storage-Buttons verdrahtet
  (Speichern/Löschen/Restore mit Zeitstempel, ADR-0011); Validierungen mit
  Zugangsfaktor-Hinweis bei vorgezogenem Eintritt.
- 17 neue Testfälle (gesamt 85).
### Offen (Roadmap)
- AVD-Modul (aus v6 noch nicht portiert), Hybrid-Entnahme, VBL-Status
  „pflichtversichert", Monte-Carlo (Schritt 5), Guardrails/ABW.

## [7.0.0-beta.2] — 2026-08-07 · Parameterstand 2026 (geprüft 2026-08-07)
### Behoben
- **Depot-Kette lieferte 0 €** (von Daniel per Screenshot gefunden): `app.js`
  übergab `startAlterMonate` nicht an die Simulation — die Monatsschleife lief
  still leer; Kachel zeigte den unveränderten Startwert, Entnahme/Tabelle/
  Charts blieben 0. Die Simulation validiert Pflichtparameter jetzt hart
  (wirft statt leer zu laufen); 6 neue Regressionstests decken exakt die
  Testlücke ab, die das in beta.1 durchgelassen hat (App-Integrationstest
  prüfte keine Depot-Größen).
### Geändert
- Eingabe **Geburtsmonat** (statt Geburtsjahr + redundantem „Alter heute" —
  das Alter wird jetzt berechnet und mit Stand-Datum angezeigt).
- **Renteneintritt monatsgenau** (Jahre + Monate), weil Zugangsfaktor
  (−0,3 %/Mon. bzw. +0,5 %/Mon.) und VBL-Abschlag pro Monat wirken.
- Storage-**Schema 2** (neue Feldstruktur): Speicherstände aus beta.1 werden
  beim Laden als veraltet gemeldet — einmal neu speichern.
### Hinzugefügt
- Erklärungs-Hints: „Erreichte Anwartschaft" präzisiert (der mittlere der
  drei Renteninformation-Beträge; erdiente Ansprüche ohne künftige Beiträge,
  in heutigen Werten — nicht die Hochrechnung); dynamische Modus-Erklärungen
  (Fix/Inflationsangepasst/Annuität); Hints zu Entnahmerate, Zielalter und
  Günstigerprüfung (Anlage KAP).
- Kosmetik: Dezimalkomma in EP/ZF-Kachel; Chart-Achse zeigt k€ erst ab
  10.000 €, darunter €.

## [7.1.0] — 2026-08-08 · Parameterstand 2026 (geprüft 2026-08-07)
### Hinzugefügt (Komplettpaket)
- **AVD-Modul** (Altersvorsorgedepot ab 2027): Förderlogik 50 %/25 %, Deckel
  540 €/Jahr (Stützstellen getestet), Topf-Simulation, Verrentung ab
  Rentenbeginn, nachgelagert voll tariflich in der zentralen Veranlagung;
  KVdR-beitragsfrei als dokumentierte Annahme.
- **Hybrid-Entnahme** (Fix → Annuität ab Umschaltalter) inkl. Depot=0-Test.
- **Strategie-Vergleich** (v6-Kaufkraft-Feature): drei Entnahmemodi parallel
  als reale Netto-Kurven mit Kaufkraftziel-Linie und Unterschreitungs-Alter.
- **Zukunfts-Szenarien** als Schalter: GKV/PV-Beitragspfad (IGES Basis 20,0 %/
  4,5 % bzw. ungünstig 22,6 %/5,2 % bis 2035, linear), Rentenniveau-Risiko ab
  2032 (−0,5 %-Pkt.), Abgeltungsteuer 26,375 %/31,65 %.
- **Monte-Carlo** im Web Worker (aus dem eigenen Script-Block, kein externes
  File): seeded (mulberry32), Lognormal per Momente-Matching, Presets aus dem
  Recherchebericht, Perzentil-Fächer 10–90 %/25–75 %/Median, Erschöpfungs-
  Kennzahlen statt nackter Erfolgsquote; Main-Thread-Fallback.
- **„Garantiert erreichbar"-Validierung**: Tool-Nachbau der DRV-Hochrechnung
  (Rentenwert zum Anwartschaftsstand, Vollzeit bis regulärer Beginn) mit
  optionalem Portal-Abgleich und ±2-%-Ampel.
- **Szenario-Export/-Import** als lokale JSON-Datei (gleiches Schema wie der
  Browser-Speicher).
- Rentenwert-Historie ab 07/2024 (39,32 €) für ältere Renteninformationen;
  Vorlaufmonate-Logik (Stand → heute wird mit aktuellem Brutto aufgefüllt).
### Geändert
- Rentenbeginn als Monat/Jahr wie im Rentenportal; Zugangsfaktor-Konvention:
  regulärer Beginn (Folgemonat der Regelgrenze) = 1,0, Zuschläge erst darüber.
- Portal-Terminologie („Garantiert erreicht/erreichbar …") in Labels und Hints.
- Günstigerprüfung neu erklärt (Finanzamt wendet automatisch die günstigere
  Variante an); Storage-Schema 4.
- 32 neue Testfälle (gesamt 122).
### Offen (Roadmap)
- Block-Bootstrap (zitierfähige historische Renditereihe), stochastische
  Inflation, Guardrails/ABW, VBL-Status „pflichtversichert", Tornado-Chart.

## [7.1.1] — 2026-08-08
### Behoben
- Crash beim Laden („Cannot read properties of null"): `lesen()` referenzierte
  noch das in 7.1.0 entfernte Feld `retAlter`; drei weitere tote Referenzen
  bereinigt (Jahresübersicht-Verdichtung nutzt jetzt `retAlterMonate`).
### Hinzugefügt
- DOM-Verdrahtungs-Guard doppelt: in der Testsuite (`make test`, eigene
  Statuszeile) und als harte `check-integrity`-Stufe im Build — jede per
  `getElementById`/`g()`/`set()` referenzierte ID muss im Markup existieren.
