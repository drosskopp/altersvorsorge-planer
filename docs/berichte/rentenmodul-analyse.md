# Rentenmodul (GRV + VBL): Ist-Analyse v6.0 und Solidierungsplan

Ergänzung zum Recherche- und Architekturbericht. Basis: Code-Durchsicht `altersvorsorge-planer.html` v6.0 (Zeilen 477–540, 697–895, 1062–1112) und Abgleich mit amtlichen Werten Stand August 2026.

## 1. Was v6.0 heute abbildet

**GRV:** Ein Slider `drv` („DRV-Rente Vollzeit", €/Mo.) — gedacht als Hochrechnungswert aus der Renteninformation. Davon wird ein selbst gerechneter Teilzeit-Abzug subtrahiert:

```
pktVoll    = brutto / AVG            // AVG = 45.538
pktVerlust = pktVoll / 2
drvAbzug   = Teilzeitjahre × pktVerlust × PW   // PW = 37,60
drvRed     = drvFull − drvAbzug
```

**VBL:** Ein Slider `vbl` (0–500 €, Default 170 €), deklariert als „garantiert, unabhängig von Teilzeitjahren", Hint verweist auf die VBL-Renteninformation. Keine eigene Rechenlogik.

**Abzüge (`steuerRente`):** ESt auf `(DRV+VBL) × Besteuerungsanteil` abzgl. WK 102 €, SA 36 €, GFB; KV 9 % auf `DRV + max(0, VBL − 197,75)`; PV 4,6 % auf alles. Besteuerungsanteil = `0,80 + (Rentenjahr − 2025) × 0,01`, über die gesamte Rentenzeit konstant als Prozentsatz.

**Dynamik (`renderKK`):** Ab Renteneintritt wächst `gesamtRente` (DRV **und** VBL gemeinsam) mit `rAdj` (~2 %/J.); Kaufkraft = netto / Inflationsfaktor seit Eintritt.

## 2. Befunde

| # | Befund | Schwere | Wirkung auf Ergebnis |
|---|---|---|---|
| 1 | **Real/Nominal-Bruch:** DRV/VBL werden in heutigen € eingegeben und bis zum Eintritt (~14 J.) nicht dynamisiert; die Depot-Entnahme ist nominal. Beide werden addiert und gemeinsam durch den Inflationsfaktor geteilt → der Rentenanteil wird faktisch doppelt entwertet. | **Kritisch** | Rente ~30–40 % zu niedrig relativ zum Depot; verzerrt das Verhältnis Floor/Upside und damit die Kernaussage des Tools |
| 2 | **Keine BBG-Kappung:** `pktVoll = brutto/AVG` ohne Deckel. Amtlich 2026: BBG 101.400 €/J., max. ≈ 1,9521 EP/J. Bei Brutto über BBG wird der Vollzeit-Punktestand über-, und damit der Teilzeitverlust überschätzt (Verlust korrekt = EP_gekappt(voll) − EP(halb), nicht EP(voll)/2). Beispiel 110.000 €: Tool 1,208 EP/J. Verlust, korrekt 0,893 → +35 % Abzug. | **Hoch** | Teilzeit wirkt teurer als real (konservativ, aber falsch) |
| 3 | **Parameter veraltet:** PW 37,60 € ist der Rentenwert 7/2023–6/2024 (Kommentar behauptet fälschlich „2026, ab 1.7.2025"); korrekt: 40,79 € ab 1.7.2025, **42,52 € ab 1.7.2026**. AVG 45.538 ≈ Wert 2024; korrekt 2026: **51.944 €** (2025: 50.493 €). Kurios: Im Quotienten `PW/AVG` heben sich beide Fehler fast auf (0,000826 vs. 0,000819, −0,9 %) — der Abzug stimmt zufällig fast, jede Einzelanzeige (EP/J., €/Punkt) ist falsch, und die Drift wächst jährlich. | **Hoch** | Abzug zufällig ~korrekt; Anzeigen falsch; Wartungsrisiko |
| 4 | **Kein Zugangsfaktor:** Vorgezogener Bezug (−0,3 %/Monat, max. −14,4 % bei Rente ab 63; § 77 SGB VI) und Zuschläge bei späterem Bezug (+0,5 %/Monat) fehlen komplett. Der `ret`-Slider erlaubt Eintritt vor der Regelaltersgrenze ohne jeden Abschlag. Regelaltersgrenze selbst (67 für Jahrgänge ≥ 1964) ist nirgends verankert. | **Hoch** | Bei geplantem Eintritt < 67: DRV bis 14,4 % und VBL bis 10,8 % zu hoch |
| 5 | **Besteuerungsanteil-Formel falsch:** `0,80 + 1 %/J. ab 2025`. Korrekt (WachstumschancenG): 2025 = 83,5 %, danach +0,5 %-Pkt./J. → Eintritt 2040 = 91,0 % (Tool: 95 %), 100 % erst Kohorte 2058. | Mittel | Steuer auf DRV etwas überschätzt |
| 6 | **Rentenfreibetrag nicht eingefroren:** Das Kohortenprinzip fixiert den steuerfreien Teil als **festen €-Betrag** bei Eintritt; jede spätere Rentenerhöhung ist zu 100 % steuerpflichtig. Das Tool hält stattdessen den Prozentsatz konstant → unterschätzt die Steuerlast im Rentenverlauf (wirkt Befund 5 entgegen, aber unsauber). | Mittel | Steuerdynamik im Alter zu günstig |
| 7 | **VBL ohne Punktemodell:** Neue Punkte in Teilzeit halbieren sich (VP = zvE/1.000 € × Altersfaktor; Messbetrag 4 €/Punkt). Die Aussage „unabhängig von Teilzeitjahren" gilt nur für den Bestand. Mildernd: Der Altersfaktor ist ab 56 nur noch 0,4 — späte Teilzeit kostet VBL-seitig wenig, aber nicht null. | Mittel | VBL-Lücke durch Teilzeit = 0 angenommen |
| 8 | **VBL-Dynamik falsch:** Satzungsgemäß +1 %/J. fix (§ 39 VBLS, jeweils 1.7.). Im Kaufkraft-Tab wächst die VBL mit der DRV-Anpassung (`rAdj`, ~2 %) mit → reale Erosion der VBL wird verschleiert. | Mittel | VBL im Alter zu günstig dargestellt |
| 9 | **VBL-Besteuerung falsch:** VBLklassik (umlagefinanziert, Beiträge individuell/pauschal versteuert) wird überwiegend mit dem **Ertragsanteil** besteuert (§ 22 Nr. 5 S. 2 EStG; bei Beginn 67: 17 %), nur der auf § 3 Nr. 56/63-steuerfreien Umlagen beruhende Teil nachgelagert. Das Tool wendet den DRV-Kohortenanteil (~91–95 %) auf die VBL an. | Mittel | Steuer auf VBL massiv überschätzt |
| 10 | **KV-Satz auf VBL zu niedrig:** Versorgungsbezüge über dem Freibetrag tragen den **vollen** KV-Satz (14,6 % + voller Zusatzbeitrag ≈ 17,5 % 2026), nicht den Rentner-AN-Anteil ~9 %. Aktuell folgenlos (170 € < Freibetrag 197,75 €), wird aber falsch, sobald die VBL per +1 %-Dynamik den Freibetrag übersteigt oder höhere Zusatzrenten eingetragen werden. Freibetrag gilt zudem nur für KV, nicht PV — das macht das Tool richtig. | Niedrig (latent) | — |
| 11 | **Kleinwerte veraltet:** GFB 11.784 € (2024; 2025: 12.096 €, 2026: 12.348 €), `estg()`-Zonengrenzen 17.005/66.760 = Tarif 2024, KV-Kommentar „Zusatzbeitrag 1,7 %" (2026: Ø 2,9 % → AN-Anteil 8,75 %, die 9 % passen als Näherung). PV kinderlos 4,6 % stimmt für 2026 (4,0 + 0,6), ist aber hart kodiert statt Parameter (Kinder ja/nein). | Mittel | Diffus; gehört ins Parameterobjekt |

**Gesamteinordnung:** Die Grundarchitektur des Teilzeit-Abzugs ist **nicht** durch die Hutschnur geworfen — der Ansatz „Verlust = entgangene Entgeltpunkte × Rentenwert, keine Phantom-Abschläge" ist genau richtig. Die Fehler liegen in der Ausführung (BBG, Parameter, Zugangsfaktor) und in der Konsistenz des Zeitgerüsts (Befund 1). Netto ist v6.0 in fast allen Punkten **konservativ verzerrt** (Rente zu klein gerechnet); die eine Ausnahme mit umgekehrtem Vorzeichen sind die fehlenden Abschläge bei vorgezogenem Eintritt.

## 3. Referenzmechanik (Soll)

**GRV-Monatsrente** = Σ Entgeltpunkte × Zugangsfaktor × Rentenartfaktor (1,0) × aktueller Rentenwert.

- EP pro Jahr = min(Brutto, BBG_Jahr) / Durchschnittsentgelt_Jahr. 2026: min(Brutto, 101.400)/51.944, Deckel 1,9521 EP.
- Zugangsfaktor = 1 − 0,003 × Monate vor Regelaltersgrenze (bzw. + 0,005 × Monate danach). Regelaltersgrenze aus Geburtsjahr.
- Rentenwert-Pfad: 42,52 € ab 1.7.2026, danach jährliche Anpassung als Szenarioparameter (offizielle Modellrechnung: 2027 +4,18 %, 2028 +2,35 %, 2029 +2,85 %, 2030 +2,82 %; ab 2032 Rentenniveau-Risiko-Szenario mit Malus).

**VBL-Monatsrente** = (Bestand + Σ neue Versorgungspunkte) × 4 € × VBL-Zugangsfaktor.

- Neue VP pro Jahr = zusatzversorgungspflichtiges Entgelt / 1.000 € × Altersfaktor (§ 36 VBLS; degressiv, ab 56: 0,4). Teilzeit halbiert das Entgelt.
- VBL-Abschlag: 0,3 %/Monat vorzeitigen GRV-Bezugs, max. 10,8 % — an den GRV-Zugangsfaktor gekoppelt.
- Dynamik zweiphasig: Anwartschaft bis Rentenbeginn nominal konstant (statischer Messbetrag, keine Anwartschaftsdynamisierung); ab Rentenbeginn +1 %/J. fix (§ 39 VBLS), unabhängig von rAdj.
- Neue Punkte entstehen nur bei bestehender Pflichtversicherung im öffentlichen Dienst; nach Wechsel in die Privatwirtschaft ist die Anwartschaft beitragsfrei gestellt (Bestand bleibt, Zuwachs = 0).

**Abzugsprofil über die Zeit** (jahresweise ab Eintritt):

1. ESt: DRV × Kohortenanteil (83,5 % + 0,5 %-Pkt./J. ab 2025, aus dem Eintrittsjahr) mit **eingefrorenem €-Freibetrag**; VBL überwiegend × Ertragsanteil (Tabelle § 22 EStG, z. B. 17 % bei 67), Split-Parameter für den nachgelagerten Teil; Tarif § 32a aus dem BMF-Programmablaufplan des jeweiligen Parameterjahres.
2. KV: (DRV × (7,3 % + Zusatzbeitrag/2)) + (max(0, VBL − Freibetrag) × voller Satz). Freibetrag dynamisch (1/20 der Bezugsgröße, 2026: 197,75 €).
3. PV: voller Satz auf DRV + VBL, Kinder-Parameter (2026: 3,6 %/4,2 %? → nein: allgemein 4,0 %, kinderlos 4,6 % — als Parameterpaar im Jahresobjekt führen).
4. Beitragssatz-Pfad KV/PV als Szenario (IGES-Basis vs. ungünstig) statt Konstante.

## 4. Soll-Design: Eingaben aus der Renteninformation

**Block „Gesetzliche Rente" (aus der jährlichen Renteninformation):**
- Bisher erreichte Anwartschaft [€/Mo.] → intern: erreichte EP = Betrag / Rentenwert zum Ausstellungsdatum (Datum + Rentenwert-Auswahl im UI, damit die Rückrechnung stimmt).
- Alternativ direkt: erreichte Entgeltpunkte (steht im Versicherungsverlauf).
- Aktuelles Jahresbrutto (bereits vorhanden) → künftige EP/J. mit BBG-Kappung.
- Geburtsjahr → Regelaltersgrenze → Zugangsfaktor aus gewähltem Eintrittsalter.
- Die DRV-Hochrechnung aus der Renteninformation wird damit **nicht mehr als Input benötigt**, sondern wird zum **Validierungsanker**: Tool-Projektion bei „Vollzeit bis Regelaltersgrenze, heutige Werte" muss die Hochrechnung ±2 % treffen (goldener Testfall).

**Block „VBL" (aus dem VBL-Versicherungsnachweis):**
- **Status-Schalter „pflichtversichert" vs. „beitragsfrei gestellt"** — VBL wird nur im öffentlichen Dienst erworben; wer in die Privatwirtschaft gewechselt ist, hat eine ruhende Anwartschaft. Der Anspruch auf den Bestand bleibt auch nach Ausscheiden erhalten (Voraussetzung: Wartezeit 60 Umlagemonate erfüllt), es kommen aber keine neuen Versorgungspunkte hinzu.
- Bei „beitragsfrei": einziger Input ist die bisher erworbene Betriebsrente [€/Mo.] aus dem jährlichen Versicherungsnachweis (= Bestandspunkte × 4 €). Bonuspunkte aus Überschüssen sind theoretisch möglich, zuletzt praktisch null → konservativ mit 0 ansetzen. Teilzeit im neuen (Privat-)Job hat keinerlei VBL-Wirkung — Befund 7 ist in dieser Konstellation gegenstandslos.
- Bei „pflichtversichert": zusätzlich zusatzversorgungspflichtiges Entgelt + Alter → neue Punkte via Altersfaktor-Tabelle (im Parameterobjekt hinterlegen); Teilzeit halbiert das Entgelt.
- **Anwartschaftsphase ohne Dynamik:** Der Messbetrag (4 €) ist statisch, die +1 %-Anpassung nach § 39 VBLS gilt erst für die *laufende* Betriebsrente. Eine beitragsfrei gestellte Anwartschaft ist bis Rentenbeginn nominal eingefroren und verliert bis dahin jährlich die volle Inflationsrate an Kaufkraft — das muss die Realrechnung explizit zeigen.
- Ertragsanteil-/nachgelagert-Split als Parameter mit Default „100 % Ertragsanteil" und Hinweis.

**Ausgabe „Abzüge zum Renteneintritt":** Brutto → ESt / KV / PV / netto, getrennt für DRV, VBL, Depot-Entnahme, jeweils nominal **und** in heutiger Kaufkraft; darunter Verlaufstabelle (z. B. Eintritt, +5, +10, +15 J.) mit den drei Dynamiken (DRV rAdj, VBL +1 %, Freibetrag-Einfrierung, Beitragssatz-Pfad).

## 5. Behebung des Real/Nominal-Bruchs (Befund 1)

Entscheidung nötig, Empfehlung: **durchgehend reale Rechnung** (konsistent mit dem Hauptbericht):
- Depotrendite als Realrendite-Regler (Presets aus dem Hauptbericht) oder nominal minus Inflationsregler.
- DRV in heutigen € belassen und real mit (rAdj − infl) fortschreiben — vor **und** nach Eintritt; die Lohn-/Rentendynamik zwischen heute und Eintritt gehört dazu.
- VBL real zweiphasig: bis Rentenbeginn mit (0 % − infl) fortschreiben (eingefrorene Anwartschaft, volle Erosion), ab Bezug mit (1 % − infl) — beides typisch negativ, die Erosion muss sichtbar sein statt wie in v6 mit rAdj verdeckt zu werden.
- Nominalansicht als abgeleitete Zweitdarstellung, nie als Rechenbasis.

## 6. Einordnung in die Roadmap

Diese Punkte werden **„MUSS 0"** — vor dem Monte-Carlo-Umbau, denn ein stochastischer Motor auf einem verzerrten Renten-Fundament präzisiert nur den Fehler:

1. Parameterobjekt 2026/2027 (Rentenwert 42,52 €, AVG 51.944 €, BBG 101.400 €, GFB 12.348 €, Tarif-PAP 2026, KV 14,6 % + 2,9 %, PV 4,0/4,6 %, Freibetrag 197,75 €, VBL-Altersfaktoren, Ertragsanteilstabelle) — Befunde 3, 11.
2. EP-Rechnung mit BBG-Kappung + Zugangsfaktor + Regelaltersgrenze — Befunde 2, 4.
3. Zeitgerüst real konsistent — Befund 1.
4. Renteninformation-Inputs (GRV-Anwartschaft, VBL-Bestand) + Hochrechnung als goldener Testfall — Abschnitt 4.
5. Getrennte Steuer-/SV-Pfade DRV vs. VBL (Kohorte+Freibetrag-Einfrierung vs. Ertragsanteil; KV-Sätze) und VBL-Dynamik +1 % — Befunde 5–10.

Aufwandsschätzung: Punkte 1–2 sind mechanisch (½ Tag), Punkt 3 zieht sich durch alle Charts (1 Tag), Punkte 4–5 sind das eigentliche neue Rentenmodul (1–2 Tage inkl. Testfälle).

## 7. Amtliche Referenzwerte (Stand 08/2026)

| Größe | Wert | Gültig |
|---|---|---|
| Aktueller Rentenwert | 42,52 €/EP | ab 1.7.2026 (+4,24 %; davor 40,79 €) |
| Durchschnittsentgelt (vorl.) | 51.944 €/J. | 2026 (2025: 50.493 €) |
| BBG allg. RV | 101.400 €/J. = 8.450 €/Mo. | 2026 → max. 1,9521 EP/J. |
| Zugangsfaktor | −0,3 %/Mon. vorzeitig, max. −14,4 %; +0,5 %/Mon. später | § 77 SGB VI |
| Besteuerungsanteil | 83,5 % (2025) + 0,5 %-Pkt./J.; 100 % ab Kohorte 2058 | § 22 EStG |
| VBL: Messbetrag / Referenzentgelt | 4,00 € / 1.000 € | § 35/§ 8 ATV |
| VBL: Altersfaktor | degressiv 3,1 (17 J.) → 0,4 (ab 56) | § 36 VBLS / § 8 Abs. 3 ATV |
| VBL: Anpassung | +1,0 %/J. zum 1.7. | § 39 VBLS |
| VBL: Abschlag | 0,3 %/Mon., max. 10,8 % | § 35 Abs. 3 VBLS |
| Freibetrag Versorgungsbezüge (nur KV) | 197,75 €/Mo. | 2026, 1/20 Bezugsgröße |
| KV Rentner | 7,3 % + Zusatzbeitrag/2 (Ø 2,9 %) auf DRV; voller Satz auf VBL über Freibetrag | 2026 |
| PV | 4,0 % allgemein / 4,6 % kinderlos | 2026 |
