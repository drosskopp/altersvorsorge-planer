# Vom deterministischen Rechner zum erstklassigen Altersvorsorge-Planer: Recherche- und Architekturbericht

Stand der Recherche: 2026-08-07 (Advanced-Research-Durchlauf). Dieses Dokument ist die
Grundlage der v7-Roadmap; die daraus abgeleiteten Entscheidungen stehen in
`architektur-v7.md` (E1–E8, O1/O2) und `docs/adr/`. Rentenmechanik-Detailbefunde:
`rentenmodul-analyse.md`.

## TL;DR
- Die größte methodische Lücke des v6-Tools ist die **rein deterministische Punktprognose mit konstanter 7–10 %-Rendite**: State of the Art 2026 ist eine stochastische Simulation (empfohlen: **Block-Bootstrap historischer realer Renditen** als Primärmodell, parametrisches i.i.d.-Lognormal als Vergleich), kombiniert mit **adaptiven Entnahmestrategien (Guardrails/ABW) statt fixer 4-%-Regel** und einer Ergebnis-Kommunikation über **Perzentil-Fächer plus Ausmaß und Zeitpunkt notwendiger Anpassungen** statt einer binären Erfolgswahrscheinlichkeit.
- Die deutschen Spezifika sind fast alle klar bezifferbar und sollten als **versioniertes Jahres-Datenobjekt (2026/2027)** gekapselt werden: Rentenwert 42,52 €/Punkt (ab 1.7.2026, +4,24 %), Durchschnittsentgelt 51.944 €, Basiszins Vorabpauschale 3,20 % (BMF-Schreiben v. 13.1.2026), KVdR-Beitragsfreiheit der Depotentnahmen bestätigt, Altersvorsorgedepot ab 1.1.2027 gesetzlich beschlossen (Bundestag 27.3.2026, Bundesrat 8.5.2026, verkündet BGBl. 2026 I Nr. 156).
- Die zentralen **Zukunftsrisiken (Rentenniveau nach 2031, GKV-Beitragsanstieg auf bis zu 22,6 % / Pflege 4,5–5,2 % bis 2035, mögliche Abgeltungsteuer-Erhöhung auf 30 %)** gehören nicht als Punktprognose, sondern als **Szenario-Schalter** ins Modell. Rechtlich bleibt das Tool bei korrekter Gestaltung ein erlaubnisfreies Informations-/Berechnungswerkzeug außerhalb von § 34f GewO/KWG — vorausgesetzt, keine personalisierte Produktempfehlung.

## Key Findings

**1. Der deterministische Kern ist das Kernproblem.** Ein konstanter Renditepfad blendet das Sequence-of-Returns-Risiko vollständig aus — genau das Risiko, das die Teilzeit- und Entnahmephase dominiert. Alle ernstzunehmenden Tools (cFIREsim, FICalc, TPAW, ProjectionLab, Boldin, sowie die Berater-Software RightCapital/eMoney/MoneyGuidePro/Income Lab) modellieren Pfadabhängigkeit. Die Marktführer setzen auf Monte-Carlo; die methodisch fortgeschrittensten (TPAW, Income Lab) verlassen die reine „Probability of Success" zugunsten adaptiver, amortisationsbasierter bzw. guardrail-gesteuerter Ansätze.

**2. Modellwahl Kapitalmarkt:** Für Retirement-Planning empfiehlt die Fachliteratur (Pfau, Blanchett, Kitces) einen bewussten Umgang mit den Schwächen jedes Verfahrens. i.i.d.-Lognormal unterschätzt Autokorrelation/Mean-Reversion und erzeugt paradoxerweise *zu pessimistische* Extremszenarien (Kitces: bei 2 % Realrendite sind 50 % der MC-Pfade schlechter als alles historisch Beobachtete). Block-Bootstrapping erhält empirische Fat Tails und einen Teil der Sequenzstruktur und ist implementierungsseitig moderat aufwändig. Empfehlung: Block-Bootstrap als Primärmodell, i.i.d.-Lognormal als didaktischer Vergleich, plus ein deterministischer „historische-Sequenzen"-Modus (cFIREsim-Stil).

**3. Parametrisierung (EUR-Perspektive, global diversifiziertes Aktien-ETF):** Langfristige reale Weltaktienrendite 5,2 % p.a. (DMS/UBS 1900–2024), im 21. Jahrhundert nur 3,5 % (Prof. Paul Marsh, LBS). Volatilität: die oft zitierten 23 % sind der Ländermittelwert, nicht der diversifizierte Weltindex — für MSCI World realistisch **~15 % (jüngere realisierte) bis ~17–20 % (Vollhistorie real)**. Vorwärtsgerichtete 10-Jahres-CMAs 2026 liegen deutlich unter dem historischen Schnitt: Vanguard DM-ex-US 4,5–6,5 % nominal (USD), Research Affiliates DM-ex-US 7,7 %, Invesco ACWI ~6,0 %, AQR globales 60/40 real 3,4 %. Konsequenz: Das Tool sollte mehrere Renditeregime als wählbare Presets anbieten und Nutzer-Annahmen von 7–10 % nominal als oberes Ende einordnen.

**4. Entnahmestrategien:** Die 4-%-/Trinity-Regel ist als statischer Startpunkt didaktisch wertvoll, aber überholt. State of the Art sind adaptive Regeln — Guyton-Klinger-Guardrails (Kritik: zu tiefe Einschnitte möglich), Vanguard Dynamic Spending (Ceiling/Floor, z. B. +5 %/−2,5 %), Variable Percentage Withdrawal, amortisationsbasierte Entnahme (ABW/TPAW, Merton-fundiert) und CAPE-basierte Regeln (ERN). Für den deutschen Kontext ist ein **Floor-and-Upside-Ansatz** ideal: die quasi-inflationsindexierte gesetzliche Rente (plus VBL) bildet den Grundbedarfs-Floor, das KVdR-beitragsfreie Depot liefert flexible Upside über eine Guardrail- oder ABW-Regel.

**5. Deutsche Spezifika sind sauber bezifferbar** (Details unten), inklusive der bestätigten KVdR-Beitragsfreiheit von Kapitalerträgen/Depotentnahmen für Pflichtversicherte und des final beschlossenen Altersvorsorgedepots ab 2027.

## Details

### A. Gap-Analyse: v6 vs. State of the Art

| Dimension | v6 | State of the Art 2026 | Gap |
|---|---|---|---|
| Kapitalmarkt | Deterministisch, konstant 7–10 % | Stochastisch (MC/Bootstrap), 5.000–10.000 Pfade | **Kritisch** |
| Sequenzrisiko | Nicht modelliert | Kern der Analyse | **Kritisch** |
| Entnahme | Fix 4 %, Inflation, Annuität, Hybrid | Adaptive Guardrails, ABW, CAPE, Floor-and-Upside | **Hoch** |
| Ergebnis-Darstellung | Punktwerte | Perzentil-Fächer, Anpassungs-Magnitude, Tornado | **Hoch** |
| Inflation | Konstante ~2 % | Eigener stochastischer Prozess, Korrelation zu Aktien | **Mittel** |
| Rechtsänderungsrisiko | Nicht abgebildet | Szenario-Schalter | **Mittel** |
| Steuer/SV-Präzision | Bereits hoch | Referenzrechner-Validierung, Unit-Tests | **Niedrig (Validierung fehlt)** |
| Architektur | Standalone HTML/JS | + Web Worker, seeded RNG, versionierte Parameter | **Mittel** |

Der Steuer-/SV-Teil ist das Alleinstellungsmerkmal gegenüber US-Tools und den meisten deutschen FIRE-Rechnern, die MC können, aber deutsche Renten- und KVdR-Mechanik nur rudimentär abbilden. Die Investition fließt daher in Stochastik, adaptive Entnahme und Unsicherheits-Kommunikation, nicht in noch mehr Steuerdetail.

### B. Kapitalmarkt-Modellierung — begründete Modellentscheidung

**Verfahrensvergleich:**
- **i.i.d. Lognormal (parametrisch):** Einfach, schnell, nur μ und σ nötig. Nachteile: keine Autokorrelation, keine Mean-Reversion, erzeugt bei niedrigen μ mehr Extremszenarien als je historisch vorkamen (Kitces/Tharp: worst-case 15-Jahres-Realverlust ~60 % im MC vs. ~0 % historisch 1966). Blanchett/Pfau kontern zu Recht: Es gibt keine inhärenten Grenzen von Monte-Carlo, nur Grenzen des gewählten Modells — Fat Tails und Autokorrelation *können* eingebaut werden.
- **Historisches Bootstrapping (i.i.d. Ziehung einzelner Jahre):** Erhält die empirische Verteilung inkl. Fat Tails, zerstört aber Sequenzstruktur.
- **Block-Bootstrapping (Blöcke z. B. 5–10 Jahre):** Erhält Fat Tails *und* einen Großteil der Autokorrelation/Mean-Reversion. Bester Kompromiss.
- **Historische rollierende Sequenzen (cFIREsim):** Maximale Realitätstreue der Sequenz, aber nur ~63 überlappende (nicht unabhängige) 30-Jahres-Fenster seit 1926; überschätzt die Aussagekraft weniger Pfade.
- **Regime-Switching:** Realistisch für Volatilitätscluster, aber Parametrisierungs- und Kommunikationsaufwand für ein Open-Source-Tool unverhältnismäßig.

**Empfehlung:** Primär **Block-Bootstrap auf realen Renditereihen** (Blocklänge konfigurierbar, Default ~5 Jahre, DMS-Weltaktienreihe als Datenbasis); sekundär **parametrisches i.i.d.-Lognormal** als transparent nachrechenbarer Vergleich; ergänzend ein **historischer Sequenz-Modus**. Real statt nominal rechnen; Inflation als eigener, schwach positiv mit Aktien korrelierter Prozess oder deterministischer Regler mit Szenarien.

**Parametrisierung (konkrete Werte, EUR-Perspektive):**

| Parameter | Wert | Quelle |
|---|---|---|
| Reale Weltaktienrendite 1900–2024 | 5,2 % p.a. | UBS/DMS Global Investment Returns Yearbook 2025 |
| dito, 2000–2024 | 3,5 % p.a. | UBS/DMS GIRY 2025 (Marsh, LBS) |
| SD reale Aktienrendite (Ländermittel, **nicht** Weltindex) | 23 % | DMS Database 2025 |
| Weltindex-SD (diversifiziert, real, Vollhistorie) | ~17–20 % | DMS-Ableitung |
| MSCI World realisierte Jahres-SD (10 J. bis 12/2025) | ~15 % | MSCI Factsheet |
| Vanguard VCMM: DM ex-US, 10 J. nominal USD | 4,5–6,5 % | Vanguard VCMM 30.6.2026 |
| Vanguard VCMM: US-Aktien, 10 J. nominal | 3,9–5,9 % | Vanguard VEMO 12/2025 |
| Research Affiliates: DM ex-US, 10 J. nominal | 7,7 % | RA YE 2025 |
| Invesco: Global ACWI, 10 J. | ~6,0 % | Invesco 2026 CMA |
| AQR: globales 60/40, real | 3,4 % | AQR 2026 CMA |

**Sequence-of-Returns-Risiko & Metrik-Kritik:** Kitces und Income Lab argumentieren gegen „Probability of Success" als alleinige Kennzahl: Sie sagt nichts über *Zeitpunkt*, *Ausmaß* oder *Anpassbarkeit* aus und verleitet zu Fehlinterpretationen. Kitces schlägt risikobasierte Guardrails vor (Start bei ~80 % Erfolgswahrscheinlichkeit, obere Guardrail 100 %, untere 25 %) und eine Umdeutung von „Erfolg/Misserfolg" in „Über-/Unterausgabe". Das Tool übernimmt diese Sprache.

### C. Entnahmestrategien — Empfehlung für den deutschen Kontext

Floor-and-Upside-Rahmen: (1) **Floor** durch gesetzliche Rente (+ VBL) — quasi-inflationsindexiert, für KVdR-Pflichtversicherte planbar; Depotentnahmen KVdR-beitragsfrei. (2) **Upside** aus dem Depot, wählbar: Guyton-Klinger-Guardrails; Vanguard Dynamic Spending (Ceiling/Floor +5 %/−2,5 %); ABW/TPAW (Merton-fundiert, kein Ruin per Konstruktion — Risiko ist zu niedriges Einkommen); CAPE-Regel (ERN: Rate = a + b·(1/CAPE)). Für die konkrete Konstellation (deterministische Teilzeit-Brücke + KVdR-Vorteil) ist **ABW/TPAW plus Renten-Floor** theoretisch am überzeugendsten; Guardrails sind die intuitivere Alternative; die 4-%-Regel bleibt Referenzlinie. Georg Wieninger (finanzen-erklaert.de) ist die beste deutschsprachige Quelle zur Backtesting-Mechanik.

### D. Deutsche Spezifika (Stand Mitte 2026)

**Vorabpauschale:** Basiszins 2026 = **3,20 %** (BMF-Schreiben v. 13.1.2026; 2025: 2,53 %), höchster Stand seit Einführung. Basisertrag = Fondswert × Basiszins × 0,70; Vorabpauschale = min(Basisertrag, Wertsteigerung), nie negativ; 30 % Teilfreistellung, dann 26,375 %. Steuerstundungseffekt korrekt modellieren (Anrechnung auf spätere Veräußerungsgewinne). FIFO vs. Subdepot quantitativ relevant.

**DRV-Rentenanpassung:** Rentenwert **42,52 €/Punkt ab 1.7.2026** (+4,24 %; Standardrentner +77,85 €/Mo.); vorläufiges Durchschnittsentgelt 2026 = **51.944 €**; ein Punkt kostet freiwillig ~9.662 €. Haltelinie 48 % bis zur Anpassung 2031 gesetzlich fixiert (Rentenpaket 2025); Beitragssatz 18,6 % (2026), 18,8 % (2027). Offizielle Modellrechnung: 2027 +4,18 %, 2028 +2,35 %, 2029 +2,85 %, 2030 +2,82 %; Rentenniveau bis 2039 auf 46,1–46,5 %. **Empfehlung: Rentenniveau-Risiko-Szenario** (Anpassung = Lohnwachstum minus Malus ab 2032).

**Altersvorsorgedepot ab 2027:** **Final beschlossen** — Altersvorsorgereformgesetz, Bundestag 27.3.2026, Bundesrat 8.5.2026, BGBl. 2026 I Nr. 156, Umsetzung 1.1.2027; ersetzt Riester im Neugeschäft. Förderung: **50 % Zulage auf die ersten 360 € Eigenbeitrag, 25 % auf 360,01–1.800 €** (max. 540 € Grundzulage); Kinderzulage 100 %, max. 300 €/Kind. Keine Beitragsgarantie → 100 % Aktienquote möglich; Standarddepot-Kostendeckel 1,0 % p.a. Auszahlung frühestens ab 65 bzw. mit GRV-Bezug; förderschädliche Entnahme = Rückzahlung der Förderung. Zertifizierung durch BZSt. Teils offen: exakte Auszahlungs-/Besteuerungsdetails.

**KVdR:** Für Pflichtversicherte (9/10-Regel) sind Kapitalerträge, Depotentnahmen, Mieten und Privatrenten **beitragsfrei**; beitragspflichtig sind GRV-Rente, Versorgungsbezüge (voller Satz, Freibetrag 197,75 €/Mo. 2026, nur KV) und Erwerbseinkommen (§§ 226/229 SGB V; BSG 5.11.2024, B 12 KR 9/23 R). **Beitragssatz-Risiko** (IGES/DAK, Update 26.1.2026): GKV-Gesamtsatz von 17,5 % (2026) auf **20,0 % Basis / 22,6 % ungünstig bis 2035**; Pflege bis 2035 auf **4,5 %** (ungünstig 5,2 %). Verbeitragung von Kapitalerträgen ist politisch diskutiert, nicht beschlossen → Szenario-Schalter.

**Steuerliche Zukunftsrisiken:** Abgeltungsteuer unverändert 26,375 %; SPD-Forderung 30 % nicht im Koalitionsvertrag → offen. Seriöse Planer: **Szenario-Schalter 25 %/30 %**, keine Punktprognose.

### E. Validierungs- und Testkonzept

1. Goldene Testfälle gegen offizielle Referenzrechner (DRV-Rentenschätzer, BMF-Steuerrechner, Vorabpauschale-Formel), Toleranzen definiert.
2. Unit-Tests je Steuer-/SV-Funktion mit dokumentierten Ein-/Ausgaben.
3. Statistische Tests des Simulationskerns: Perzentil-Konvergenz, Seed-Reproduzierbarkeit, empirische μ/σ ≈ Ziel, Block-Bootstrap vs. i.i.d. auf denselben Daten.
4. Sensitivitäts-/Tornado-Analyse der Ergebnistreiber.
5. Plausibilitätsgrenzen und Eingabevalidierung.

### F. Architektur-Empfehlungen (Standalone Open-Source-HTML)

Trennung Rechenkern/UI (UI-freier Modulkern, in Node testbar); Web Worker für Monte-Carlo (5.000–10.000 Pfade); seeded RNG für Reproduzierbarkeit und teilbare Ergebnis-Links; versioniertes Jahres-Datenobjekt mit Quellenannotation; historische Datenreihen als eingebettetes, quellzitiertes Array; Perzentil-Fächer (P10/P25/P50/P75/P90), Anpassungs-Ausmaß statt reiner Erfolgsquote, bewusste Rundung auf Bandbreiten.

### G. Regulatorik und Disclaimer

Ein reines Berechnungs-/Informationstool ohne personalisierte Produktempfehlung ist **keine erlaubnispflichtige Anlageberatung** (§ 1 Abs. 1a Nr. 1a KWG setzt persönliche Empfehlung zu bestimmten Finanzinstrumenten voraus; § 34f GewO die Vermittlung konkreter Erwerbs-Willenserklärungen). Zu wahren: keine Empfehlung konkreter Wertpapiere/Anbieter, keine „für Sie geeignet"-Darstellung, keine Vermittlungsfunktion. Disclaimer-Pflichtpunkte: (1) keine Anlage-/Steuer-/Rechtsberatung, (2) Modellrechnungen ohne Gewähr, (3) vergangene/simulierte Renditen keine Prognose, (4) Rechtsänderungen möglich, Aktualität selbst prüfen, (5) qualifizierte Beratung empfohlen. MIT-Lizenz deckt Urheberrecht; inhaltlicher Disclaimer zusätzlich nötig; anwaltliche Kurzprüfung vor Reichweite empfohlen.

## Roadmap (MUSS/SOLL/KANN)

**MUSS:** (1) Stochastischer Kern: Block-Bootstrap real + i.i.d.-Lognormal, Web Worker, seeded, 5.000–10.000 Pfade. (2) Ergebnis-Kommunikation: Perzentil-Fächer + Anpassungs-Ausmaß/-Zeitpunkt; drei Rendite-Presets (konservativ real ~2–3 %, historisch real ~5 %, optimistisch). (3) Versioniertes Parameterobjekt 2026/2027. (4) Validierung gegen DRV/BMF + Test-Suite.
**SOLL:** (5) Adaptive Entnahme: Floor-and-Upside + Guardrails/Dynamic Spending/ABW; 4 % als Referenz. (6) Szenario-Schalter Rentenniveau/GKV-Pfad/Abgeltung. (7) Inflation als eigener Prozess, durchgängig reale Darstellung. (8) Tornado-Sensitivität.
**KANN:** (9) CAPE-Startraten. (10) Historischer Sequenz-Modus. (11) Seed-reproduzierbare Teil-Links, Export.

## Caveats

CMAs sind hypothetische 10-Jahres-Prognosen und selbst unsicher; die DMS-Weltindex-Volatilität ist aus öffentlichen Auszügen abgeleitet (exakter Wert im kostenpflichtigen Yearbook); die 23 % sind Ländermittel, nicht Weltindex — häufiger Modellierungsfehler. Rentenniveau-/GKV-Projektionen sind Modellrechnungen mit politischer Unsicherheit; die Haltelinie ist belastbar bis 2031 fixiert. Die regulatorische Einordnung ist keine Rechtsberatung. Die AVD-Entnahmephase ist noch nicht vollständig spezifiziert.

## Quellen (Auswahl, Abruf 08/2026)

- Kitces: Monte-Carlo Fat Tails vs. rollierende historische Renditen — kitces.com/blog/monte-carlo-analysis-risk-fat-tails-vs-safe-withdrawal-rates-rolling-historical-returns/
- Kitces: Guyton-Klinger-Guardrails-Kritik — kitces.com/blog/guyton-klinger-guardrails-retirement-income-rules-risk-based/
- UBS/DMS Global Investment Returns Yearbook 2025 — ubs.com/global/en/investment-bank/insights-and-data/2025/global-investment-returns-yearbook-2025.html; Zusammenfassung: jbs.cam.ac.uk/2025/report-stocks-have-far-outperformed-over-the-past-125-years/
- Vanguard VEMO/VCMM-Prognosen — corporate.vanguard.com/…/vemo-return-forecasts.html; 2026-Outlook — corporate.vanguard.com/…/2026-outlook-economic-upside-stock-market-downside.html
- Cordant: What Monte Carlo Projections Leave Out — cordantwealth.com/what-monte-carlo-projections-leave-out/
- Vorabpauschale 2026 (Basiszins 3,20 %) — capinside.com/c/vorabpauschale-2026-was-fondsanleger-wissen-muessen; deutschland-rechner.de/vorabpauschale-rechner; renditerezept.de/blog/vorabpauschale-berechnen-2026/
- Rentenanpassung/Rentenniveau — verdi.de/politik-gesellschaft/rente-deutschland; vermoegenszentrum.de/wissen/rentenniveau; bundestag.de/dokumente/textarchiv/2025/kw42-de-rente-1115416; gegen-hartz.de (Modellrechnung 2026–2030)
- KVdR-Beitragsfreiheit — marcusknispel.com/kapitalvermoegen-krankenversicherungspflichtig/; versicherung.org (Rentner-KV 2026)
- IGES/DAK Beitragsprojektion bis 2035 — iges.com/ergebnisse/projekte/2025/update-entwicklung-der-sozialabgaben/
- Finanzrocker-Interview Georg Wieninger (Entnahmestrategien) — finanzrocker.net/entnahmeplaene-rente-interview-georg/
- Erlaubnispflicht Finanzanlagenvermittlung — ihk-bonn.de (Merkblatt § 34f GewO)
