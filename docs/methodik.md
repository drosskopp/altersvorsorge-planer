# Methodik (Kurzfassung, Stand Schritt 1)

Vollständige Herleitungen: `docs/berichte/architektur-v7.md` (Domänenmodell,
Stochastik-Plan) und `docs/berichte/rentenmodul-analyse.md` (Rentenmechanik,
Befunde 1–11 gegen v6).

## Bewusste Vereinfachungen (Stand alpha.1)

- **Ertragsanteil-Split VBL:** Default 100 % Ertragsanteil; der auf steuerfreien
  Umlagen (§ 3 Nr. 56/63 EStG) beruhende, nachgelagert besteuerte Teil ist als
  Parameter vorgesehen, Default 0.
- **Gewinnanteil bei Depot-Entnahmen:** pauschal 70 % (`AVP.annahmen`), bis
  echtes Tranchen-Tracking (FIFO/Subdepots) implementiert ist.
- **KV-Zusatzbeitrag:** Durchschnittssatz statt kassenindividuell.
- **VBL-Bonuspunkte:** konservativ 0.
- **Rentenanpassungen:** Szenario-Pfade, keine Prognose.

## Was das Tool nicht kann

Keine Beratung, keine Produktempfehlungen, keine Ehegatten-/Splitting-Rechnung
(Datenmodell vorbereitet, nicht implementiert), keine Erwerbsminderungs-/
Hinterbliebenenrenten, keine PKV.

## Rentenmodul (Schritt 2)

Empfohlener Input ist die **erreichte Anwartschaft** aus der Renteninformation
(plus Ausstellungsstand zur Rentenwert-Rückrechnung) — nicht die DRV-Hoch-
rechnung; letztere dient als manueller Validierungsanker (±2 %, CONTRIBUTING).
Der Rentenfreibetrag wird beim Eintritt als €-Betrag eingefroren; spätere
Rentenerhöhungen sind voll steuerpflichtig. Die VBL-Anwartschaft (beitragsfrei)
bleibt bis Bezugsbeginn nominal konstant und erodiert real; im Bezug +1 %/Jahr.
