# Architektur v7 — Entscheidungsdokument

Antwort auf die Frage „sind wir modular genug, was ist mit weiteren Einkünften?" — die Frage trifft eine echte Lücke: Der Hauptbericht (Abschnitt F) hat die *Infrastruktur* festgelegt (Rechenkern/UI-Trennung, Web Worker, seeded RNG, Parameterobjekt), aber nicht das *Domänenmodell*. Genau dort schießt man sich ins Knie: v6 verdrahtet DRV, VBL, Depot und AVD als vier Spezialfälle quer durch `calc()`, `steuerRente()` und `steuerDepot()`. Jede fünfte Einkunftsart hieße: alles aufreißen. Dieses Dokument legt die tragenden Entscheidungen fest, bevor Code entsteht.

## E1 — Einkünfte sind Daten, nicht Code (Kernentscheidung)

Jede Einkunftsquelle ist eine deklarative Instanz eines einheitlichen Schemas. Die Engine kennt keine „DRV" und keine „VBL", sondern nur Quellen mit Profilen:

```js
// domain/sources.js — Beispiele
const drv = {
  id: 'drv', label: 'Gesetzliche Rente', kind: 'claim',   // Anspruch, kein Kapital
  person: 'p1',
  schedule:  { from: { age: 67 }, to: 'lifelong' },
  amount:    { type: 'entgeltpunkte', ep: 55.0, epPerYearFull: 'auto' }, // oder { type: 'fixed', eur: 2350 }
  accrual:   { type: 'grv', bbgCap: true },                // Zuwachs in Erwerbsphasen
  discount:  { type: 'zugangsfaktor-grv' },                // −0,3 %/Mon., +0,5 %/Mon.
  dynamics:  { preRetirement: 'wageIndex', inPayment: 'rentenanpassung' },
  tax:       { type: 'kohorte', freezeFreibetrag: true },
  social:    { type: 'kvdr-rente' }                        // 7,3 % + Zusatz/2, PV voll
};

const vbl = {
  id: 'vbl', label: 'VBLklassik', kind: 'claim', person: 'p1',
  schedule:  { from: { age: 67 }, to: 'lifelong' },
  amount:    { type: 'fixed', eur: 170 },                  // Bestand aus Versicherungsnachweis
  accrual:   { type: 'none' },                             // beitragsfrei gestellt ← Status-Schalter
  discount:  { type: 'vbl' },                              // 0,3 %/Mon., max. 10,8 %
  dynamics:  { preRetirement: 'none', inPayment: 'fixed:0.01' },
  tax:       { type: 'ertragsanteil', split: 1.0 },
  social:    { type: 'versorgungsbezug' }                  // voller KV-Satz über Freibetrag, PV voll
};

const depot = {
  id: 'depot', label: 'ETF-Depot', kind: 'capital', person: 'p1',
  balance:   70000,
  contrib:   { phases: 'auto' },                           // aus Phasenplan (Vollzeit/Teilzeit)
  withdraw:  { strategy: 'swr', rate: 0.04 },              // austauschbar: ann | guardrails | abw | cape
  tax:       { type: 'abgeltung', teilfreistellung: 0.30, gewinnanteil: 'tracked' },
  social:    { type: 'none' }                              // KVdR: beitragsfrei
};

// Die Erweiterung, die heute noch niemand braucht — und die trotzdem schon passt:
const miete = {
  id: 'miete', kind: 'claim', person: 'p1',
  schedule:  { from: { year: 2032 }, to: 'lifelong' },
  amount:    { type: 'fixed', eur: 600 },
  dynamics:  { preRetirement: 'fixed:0.015', inPayment: 'fixed:0.015' },
  tax:       { type: 'tariflich' },                        // § 21 EStG → Progression!
  social:    { type: 'none' }                              // KVdR: beitragsfrei; freiwillig GKV: pflichtig!
};
```

Neue Einkunftsart = neue Instanz. Neues Steuer-/SV-Verhalten = eine neue, lokale Strategie-Funktion im jeweiligen Registry-Objekt — kein Engine-Umbau. Einmalzahlungen (Erbschaft, Abfindung, § 187a-Ausgleichszahlung) sind Quellen mit `schedule: { at: ... }` und Ziel Depot-Zufluss oder Konsum.

## E2 — Steuern und SV werden pro Jahr zentral veranlagt, nie pro Quelle

Fachlich zwingend, nicht nur Stilfrage: Der § 32a-Tarif ist progressiv über die **Summe** aller tariflichen Einkünfte (GRV-Kohortenanteil + VBL-Ertragsanteil + künftig z. B. Mieten). v6 versteuert Rente und Depot getrennt und koppelt sie nur über den Grenzsteuersatz der Günstigerprüfung — mit Mieteinnahmen wäre das schlicht falsch. Deshalb:

```
für jedes Jahr t:
  1. Quellen liefern Bruttozahlungen(t) + Bemessungsbausteine:
     { tariflich: x, kapital: y, kvBasisTyp: ..., pvBasis: ... }
  2. TaxAssessment(t): zvE = Σ tariflich − Pauschalen − (eingefrorene) Freibeträge
     → Tarif(params[t]); Kapital: Abgeltung vs. Günstigerprüfung gegen dasselbe zvE
  3. SocialAssessment(t): KV-/PV-Basen je Profil einsammeln, Freibetrag zentral,
     Sätze aus params[t] (als Pfad, siehe E3), Versichertenstatus der Person beachten
  4. netto(t), real(t) je Quelle zurückverteilen (für die Aufschlüsselung im UI)
```

Der Versichertenstatus (KVdR-pflichtig vs. freiwillig GKV) ist ein **Personen-Attribut**, das die SV-Profile auswerten — dieselbe Mietquelle ist bei KVdR beitragsfrei und bei freiwillig Versicherten beitragspflichtig, ohne dass sich an der Quelle etwas ändert.

## E3 — Alles, was sich ändern kann, ist ein Pfad, kein Skalar

Rendite, Inflation, Rentenanpassung, KV-/PV-Sätze, Basiszins: Die Engine konsumiert Zeitreihen `f(t)`. „Konstant" ist nur der Spezialfall eines flachen Pfads. Konsequenzen:

- Monte-Carlo wird ein reiner **Generator** (Block-Bootstrap/Lognormal erzeugt `return[t], inflation[t]`) plus Schleife über die unveränderte deterministische Engine plus Perzentil-Aggregation. Kein zweiter Rechenkern, keine Drift zwischen deterministisch und stochastisch.
- Szenario-Schalter (Rentenniveau ab 2032, GKV 20,0/22,6 %, Abgeltung 25/30 %) sind vorkonfigurierte Parameterpfade, kein Sondercode.
- Historische Sequenzen (cFIREsim-Modus) sind ebenfalls nur Pfade.

## E4 — Entnahmestrategien sind Interfaces ohne Look-ahead

```js
strategy(state_t, history_0..t, params) → Entnahmebetrag_t
```

Strategien sehen ausschließlich Vergangenheit und Gegenwart. Das ist die Bedingung dafür, dass Guardrails/ABW im Monte-Carlo ehrlich funktionieren — eine Regel, die in die Zukunft schaut, produziert im Backtest Scheinergebnisse. Die v6-Modi (SWR, Annuität, Hybrid) werden als erste drei Implementierungen portiert, Guardrails/ABW kommen als vierte/fünfte dazu, ohne Engine-Änderung.

## E5 — Entwicklung modular, Release single-file

Konflikt: Modularität vs. „eine HTML-Datei, lokal, ohne Toolchain" (Open-Source-Ziel). Auflösung wie bei jedem Deployment-Artefakt:

```
src/
  params/2026.js  2027.js     # versionierte Jahreswerte, quellannotiert
  domain/sources.js  taxes.js  social.js  strategies.js
  engine/simulate.js           # deterministisch, pfad-parametrisiert, UI-frei
  engine/mc.js                 # Generatoren + Aggregation (läuft im Worker)
  ui/*.js  index.html
tests/
  golden/*.json                # DRV-Rentenschätzer-, BMF-, v6-Vergleichsfälle
  run.mjs                      # node tests/run.mjs — kein Framework
Makefile                       # `make release` → dist/altersvorsorge-planer.html
```

Der Release-Build ist Konkatenation in IIFE-Blöcke (cat reicht; esbuild optional) — das Ergebnis bleibt eine einzelne, offline lauffähige HTML-Datei. Entwickelt und getestet wird gegen `src/`; die Engine läuft identisch in Node (CI-fähig) und im Browser-Worker.

## E6 — Testbarkeit ist Teil der Architektur

- Goldene Fälle: Tool-Projektion „Vollzeit bis Regelaltersgrenze, heutige Werte" == DRV-Hochrechnung ±2 %; Steuerfälle gegen BMF-PAP; Vorabpauschale gegen BMF-Formel.
- v6-Regressionsanker: identische Eingaben in v6 und v7, jede Abweichung muss einem dokumentierten Befund (Rentenmodul-Analyse #1–11) zuordenbar sein.
- MC-Statistik: Seed-Reproduzierbarkeit, Perzentil-Konvergenz, empirische μ/σ ≈ Ziel.
- Jede Steuer-/SV-Strategie hat Unit-Tests mit dokumentierten Ein-/Ausgaben.

## E7 — YAGNI-Grenzen (das andere Knie)

Bewusst **nicht** gebaut: kein Plugin-System, keine Klassenhierarchien, kein Framework, kein npm-Zwang, keine dynamische Formular-Generierung aus Schemas. Plain Objects + Strategie-Funktionen + Registries. Zweite Person: Das Datenmodell trägt `person`-Referenzen und das Assessment ist personenfähig angelegt (Splitting wäre ein weiterer Tarif-Zweig), implementiert wird V7 aber strikt für eine Person — Tür offen, Raum nicht möbliert. Gleiches gilt für Hinterbliebenenrenten und Familienversicherung.

## E8 — Deployment, Dokumentation, Disclaimer, Pflege

**Sprache & Toolchain:** Vanilla JavaScript (ES2020, Module), HTML, CSS — sonst nichts. Kein TypeScript, kein Framework, kein npm-Abhängigkeitsbaum. Das Makefile orchestriert nur zwei Dinge: `make test` → `node tests/run.mjs`, `make release` → Konkatenation der `src/`-Module in `dist/altersvorsorge-planer.html`. Einzige Laufzeit-Bibliothek bleibt Chart.js, künftig **gevendort** (lokale Kopie eingebettet statt CDN) — die Release-Datei läuft damit vollständig offline und macht null externe Requests (auch keine Webfonts).

**Hosting:** Es gibt nichts zu betreiben. Das Tool ist eine statische HTML-Datei; alle Berechnungen laufen im Browser der Nutzer, es fließen keine Daten zu einem Server. Deployment via **GitHub Pages** aus dem Repo, gebaut durch einen GitHub-Actions-Workflow: bei jedem Push auf `main` läuft `make test`, dann `make release`, dann Deploy von `dist/` nach Pages. Push = Test = Deploy; kostenlos für öffentliche Repos, HTTPS inklusive, kein Server, kein Patching, kein Monitoring. Alternativen (Cloudflare Pages, Netlify, Codeberg Pages) böten dasselbe, GitHub hält alles an einem Ort.

**Privacy by Design als sichtbares Feature:** Hinweis im UI „Alle Berechnungen laufen lokal im Browser — keine Daten verlassen dein Gerät" (stimmt nur mit gevendortem Chart.js — deshalb E8-Regel: keine externen Requests, wird im CI per grep auf `https://` in dist/ geprüft). Teilbare Szenario-Links, falls gebaut, nutzen das URL-**Fragment** (`#…`), das nie an den Server übertragen wird — mit UI-Hinweis, dass geteilte Links die eingegebenen Finanzdaten enthalten.

**Dokumentationsstruktur** (Quellen, Warum, Designentscheidungen):

```
README.md            # Was/für wen, Screenshot, Quickstart, Kurz-Disclaimer, Badges
LICENSE              # MIT (steht fest)
CHANGELOG.md         # Keep-a-Changelog; jede Version nennt ihren Parameterstand
CONTRIBUTING.md      # inkl. Checkliste "jährliches Parameterupdate"
.github/
  workflows/ci.yml   # test → release → pages-deploy
  ISSUE_TEMPLATE/    # bug.md, parameterupdate.md, feature.md
docs/
  adr/0001-*.md      # Architecture Decision Records (Nygard-Format:
                     #  Kontext → Entscheidung → Konsequenzen); E1–E8, O1/O2
                     #  werden ADR-0001 ff., künftige Entscheidungen kommen dazu
  methodik.md        # Modellannahmen, Formeln, bewusste Vereinfachungen,
                     #  was das Tool NICHT kann (aus Haupt- + Rentenmodul-Bericht)
  quellen.md         # menschenlesbare Quellenliste (DRV, BMF, SGB, VBL-Satzung,
                     #  DMS/CMAs) mit Abrufdatum
src/params/2026.js   # jede Zahl mit Quelle + gueltig_ab/gueltig_bis annotiert —
                     #  die maschinenlesbare Wahrheit, aus der der Quellen-Tab
                     #  im UI generiert wird (keine Doppel-Pflege)
```

**Disclaimer, dreistufig — deutlich aber dezent:**
1. Einzeiler direkt unter dem Titel: „Modellrechnung — keine Anlage-, Steuer- oder Rechtsberatung. [Details]" → Link auf Info-Seite. Kein Klick-Zwang-Modal (nervt, bringt wenig).
2. An den Ergebnisblöcken selbst eine dezente Zeile „Modellwerte · Parameterstand 2026" — der Hinweis wirkt dort, wo die Zahlen stehen.
3. Info-Seite (im Single-File als eingebauter Tab/Overlay): die fünf Disclaimer-Punkte aus dem Regulatorik-Abschnitt des Hauptberichts, Methodik-Kurzfassung mit Link ins Repo, Lizenz. Dort auch Platz für Impressum/Datenschutzhinweis — ob ein nicht-kommerzielles Projekt in DE impressumspflichtig ist, ist Auslegungssache (§ 5 DDG); die konservative, kostenlose Praxis ist ein Kurzimpressum, die anwaltliche Kurzprüfung vor Reichweite bleibt empfohlen (siehe Hauptbericht, keine Rechtsberatung).

**Der ehrliche Restaufwand** ist nicht Betrieb, sondern Datenpflege: einmal jährlich `params/2027.js` (Rechengrößen, Tarif, Sätze — geschätzt 1–2 h, per CONTRIBUTING-Checkliste auch von Dritten machbar). Das UI warnt sanft, wenn `heute > gueltig_bis` des geladenen Parameterjahres („Parameterstand 2026 — auf Updates prüfen"), und der Footer zeigt immer `Version · Parameterstand · Prüfdatum`. Veraltete Parameter sind damit sichtbar statt still falsch.

## Offene Entscheidungen (bitte abnicken)

**O1 — Zeitschritt:** ✔ ENTSCHIEDEN: monatlicher Schritt, Marktpfade jahresweise mit (1+r)^(1/12)-Umrechnung — v6-vergleichbar, Teilzeit-Phasenwechsel mitten im Jahr möglich, MC-Kosten im Worker unkritisch.

**O2 — Repo-Layout & Deployment:** `src/`-Module + Makefile (`test`, `release`) + GitHub Pages via Actions wie in E5/E8. Lokal genügen `git`, `make` und optional `node` für die Tests; das Release baut die CI, manuelles Bauen ist nie nötig. Alternative wäre, weiter direkt in einer Datei zu entwickeln — verwirft Testbarkeit und Fremdbeiträge, daher nicht empfohlen.

Nach dem Abnicken ist die Reihenfolge: (1) Skelett + `params/2026.js` + Testrunner, (2) Rentenmodul nach Rentenmodul-Analyse Abschnitt 3–5 inkl. goldener Fälle, (3) Portierung Depot/AVD/Entnahmemodi auf das Quellenmodell + v6-Regressionsabgleich, (4) reales Zeitgerüst + UI-Anpassung, (5) Monte-Carlo-Layer. Schritte 1–4 ersetzen „MUSS 0", Schritt 5 beginnt „MUSS 1".
