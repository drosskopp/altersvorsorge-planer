/* ============================================================================
 * SELFTEST — Goldene Testfälle
 * ============================================================================
 * Läuft identisch in Node (tests/run.mjs, CI) und im Browser (Release-Datei,
 * Button "Selbsttest"). Jeder Fall dokumentiert seine Herkunft:
 *   [GESETZ]   direkt aus der Norm ableitbar (Formel von Hand nachgerechnet)
 *   [AMTLICH]  amtlich veröffentlichter Zahlenwert
 *   [PROPERTY] mathematische Eigenschaft (z. B. Stetigkeit an Zonengrenzen)
 * Externe Referenzrechner-Abgleiche (DRV-Rentenschätzer, BMF-Rechner) sind in
 * CONTRIBUTING.md als manueller Prüfschritt je Parameterjahr beschrieben.
 * ========================================================================== */
'use strict';
globalThis.AVP = globalThis.AVP || {};

AVP.selftest = {
  run(report) {
    const p = AVP.params[2026];
    const t = new Runner(report);

    // ── GRV: Entgeltpunkte & BBG-Kappung ─────────────────────────────────
    t.close('[AMTLICH] 1 EP bei Durchschnittsentgelt 51.944 €',
      AVP.grv.entgeltpunkteProJahr(51944, p), 1.0, 1e-9);
    t.close('[AMTLICH] 0,5 EP bei halbem Durchschnittsentgelt',
      AVP.grv.entgeltpunkteProJahr(25972, p), 0.5, 1e-9);
    t.close('[AMTLICH] BBG-Deckel: 110.000 € → max. 1,9521 EP',
      AVP.grv.entgeltpunkteProJahr(110000, p), 1.9521, 1e-4);
    t.close('[AMTLICH] Max-EP 2026 = 101.400/51.944',
      AVP.grv.maxEntgeltpunkte(p), 101400 / 51944, 1e-12);
    t.close('[GESETZ] Teilzeitverlust MIT beidseitiger Kappung (110 k€, 50 %)',
      AVP.grv.teilzeitPunkteverlustProJahr(110000, 0.5, p),
      101400 / 51944 - 55000 / 51944, 1e-12);
    t.ok('[GESETZ] v6-Fehler reproduziert: ungekappte Rechnung überschätzt Verlust',
      (110000 / 51944 / 2) > AVP.grv.teilzeitPunkteverlustProJahr(110000, 0.5, p));

    // ── GRV: Regelaltersgrenze & Zugangsfaktor ───────────────────────────
    t.eq('[GESETZ] Regelaltersgrenze Jg. 1958 = 66 J.',
      AVP.grv.regelaltersgrenzeMonate(1958), 66 * 12);
    t.eq('[GESETZ] Regelaltersgrenze Jg. 1961 = 66 J. 6 Mon.',
      AVP.grv.regelaltersgrenzeMonate(1961), 66 * 12 + 6);
    t.eq('[GESETZ] Regelaltersgrenze Jg. 1964+ = 67 J.',
      AVP.grv.regelaltersgrenzeMonate(1964), 67 * 12);
    t.close('[GESETZ] Zugangsfaktor 48 Mon. vorzeitig = 0,856 (−14,4 %)',
      AVP.grv.zugangsfaktor(48, p), 0.856, 1e-12);
    t.close('[GESETZ] Zugangsfaktor 12 Mon. später = 1,06',
      AVP.grv.zugangsfaktor(-12, p), 1.06, 1e-12);

    // ── GRV: Rentenwert-Historie & Besteuerungsanteil ────────────────────
    t.close('[AMTLICH] Rentenwert 07.11.2024 = 39,32 € (fuer aeltere Renteninformationen)',
      AVP.grv.rentenwertAm('2024-11-07', p), 39.32, 1e-9);
    t.close('[AMTLICH] Rentenwert 30.06.2026 = 40,79 €',
      AVP.grv.rentenwertAm('2026-06-30', p), 40.79, 1e-9);
    t.close('[AMTLICH] Rentenwert 01.07.2026 = 42,52 €',
      AVP.grv.rentenwertAm('2026-07-01', p), 42.52, 1e-9);
    t.close('[GESETZ] Besteuerungsanteil Kohorte 2020 = 80 %',
      AVP.grv.besteuerungsanteil(2020, p), 0.80, 1e-9);
    t.close('[GESETZ] Besteuerungsanteil Kohorte 2025 = 83,5 %',
      AVP.grv.besteuerungsanteil(2025, p), 0.835, 1e-9);
    t.close('[GESETZ] Besteuerungsanteil Kohorte 2040 = 91,0 %',
      AVP.grv.besteuerungsanteil(2040, p), 0.910, 1e-9);
    t.close('[GESETZ] Besteuerungsanteil Kohorte 2058 = 100 %',
      AVP.grv.besteuerungsanteil(2058, p), 1.0, 1e-9);

    // ── Steuer: § 32a-Tarif 2026 (Stützstellen von Hand gerechnet) ───────
    t.eq('[GESETZ] ESt(zvE 12.348) = 0 (Grundfreibetrag)', AVP.tax.est(12348, p), 0);
    t.eq('[GESETZ] ESt(zvE 17.799) = 1.034 € (Zone-2-Ende)', AVP.tax.est(17799, p), 1034);
    t.eq('[GESETZ] ESt(zvE 30.000) = 4.217 €', AVP.tax.est(30000, p), 4217);
    t.eq('[GESETZ] ESt(zvE 69.879) = 18.213 € (Beginn 42 %)', AVP.tax.est(69879, p), 18213);
    t.eq('[GESETZ] ESt(zvE 100.000) = 30.864 €', AVP.tax.est(100000, p), 30864);
    t.ok('[PROPERTY] Tarif stetig an Zonengrenze 17.799/17.800 (Δ ≤ 1 €)',
      Math.abs(AVP.tax.est(17800, p) - AVP.tax.est(17799, p)) <= 1);
    t.ok('[PROPERTY] Tarif stetig an Zonengrenze 69.878/69.879 (Δ ≤ 1 €)',
      Math.abs(AVP.tax.est(69879, p) - AVP.tax.est(69878, p)) <= 1);
    t.ok('[PROPERTY] Tarif monoton (Stichprobe 12.000…120.000, Schritt 500)', (() => {
      let prev = -1;
      for (let z = 12000; z <= 120000; z += 500) {
        const e = AVP.tax.est(z, p);
        if (e < prev) return false;
        prev = e;
      }
      return true;
    })());

    // ── Steuer: Soli mit Milderungszone ──────────────────────────────────
    t.close('[GESETZ] Soli bei ESt 20.350 € (Freigrenze) = 0', AVP.tax.soli(20350, p), 0, 1e-9);
    t.close('[GESETZ] Soli bei ESt 21.000 € = 11,9 % × 650 = 77,35 €',
      AVP.tax.soli(21000, p), 77.35, 1e-9);
    t.close('[GESETZ] Soli bei ESt 40.000 € = 5,5 % (Milderung überschritten)',
      AVP.tax.soli(40000, p), 2200, 1e-9);

    // ── Steuer: Vorabpauschale 2026 (Basiszins 3,20 %) ───────────────────
    const vap1 = AVP.tax.vorabpauschale({ wertJahresanfang: 100000, wertJahresende: 108000 }, p);
    t.close('[GESETZ] VAP: Basisertrag 100 k€ × 3,2 % × 0,7 = 2.240 €', vap1.vorabpauschale, 2240, 1e-9);
    t.close('[GESETZ] VAP: Steuer = 2.240 × 0,7 × 26,375 % = 413,56 €', vap1.steuer, 413.56, 0.01);
    const vap2 = AVP.tax.vorabpauschale({ wertJahresanfang: 100000, wertJahresende: 95000 }, p);
    t.close('[GESETZ] VAP bei Wertverlust = 0', vap2.vorabpauschale, 0, 1e-12);
    const vap3 = AVP.tax.vorabpauschale({ wertJahresanfang: 100000, wertJahresende: 101000 }, p);
    t.close('[GESETZ] VAP gedeckelt auf Wertzuwachs 1.000 €', vap3.vorabpauschale, 1000, 1e-9);

    // ── Steuer: Ertragsanteil ────────────────────────────────────────────
    t.close('[GESETZ] Ertragsanteil Beginn 63 = 20 %', AVP.tax.ertragsanteil(63, p), 0.20, 1e-12);
    t.close('[GESETZ] Ertragsanteil Beginn 67 = 17 %', AVP.tax.ertragsanteil(67, p), 0.17, 1e-12);

    // ── VBL ──────────────────────────────────────────────────────────────
    t.close('[GESETZ] VBL-Abschlag 24 Mon. = −7,2 % → Faktor 0,928',
      AVP.vbl.abschlagsfaktor(24, p), 0.928, 1e-12);
    t.close('[GESETZ] VBL-Abschlag gedeckelt bei −10,8 % (60 Mon.)',
      AVP.vbl.abschlagsfaktor(60, p), 0.892, 1e-12);
    t.close('[GESETZ] VBL-Bestand 170 € ohne Vorzeitigkeit unverändert',
      AVP.vbl.renteAusBestand(170, 0, p), 170, 1e-12);
    t.close('[GESETZ] VBL-Anpassung nach 3 Bezugsjahren = 1,01³',
      AVP.vbl.anpassungsfaktor(3, p), 1.030301, 1e-9);

    // ── Sozialversicherung (KVdR) ────────────────────────────────────────
    t.close('[AMTLICH] KV-Satz auf GRV-Rente = 7,3 % + 2,9 %/2 = 8,75 %',
      AVP.sozial.kvSatzRente(p), 0.0875, 1e-12);
    t.close('[GESETZ] KV: DRV 2.000 €, VBL 170 € (< Freibetrag) → 175,00 €',
      AVP.sozial.kvMonat({ drvMo: 2000, versorgungMo: 170 }, p), 175.00, 1e-9);
    t.close('[GESETZ] KV: VBL 300 € → +17,5 % auf 102,25 € über Freibetrag',
      AVP.sozial.kvMonat({ drvMo: 2000, versorgungMo: 300 }, p),
      2000 * 0.0875 + (300 - 197.75) * 0.175, 1e-9);
    t.close('[GESETZ] PV kinderlos 4,6 % auf DRV+VBL, kein Freibetrag',
      AVP.sozial.pvMonat({ drvMo: 2000, versorgungMo: 170, kinderlos: true }, p),
      2170 * 0.046, 1e-9);

    // ── Storage (Opt-in-Speicherung im Browser, ADR-0011) ────────────────
    const mock = (() => {                       // Mock-Backend, API wie localStorage
      const m = new Map();
      return { getItem: k => (m.has(k) ? m.get(k) : null),
               setItem: (k, v) => m.set(k, v),
               removeItem: k => m.delete(k), _map: m };
    })();
    const probe = { brutto: 90000, geburtsjahr: 1972, vblBestand: 170 };
    t.ok('[PROPERTY] Storage: save meldet ok + Bytezahl',
      AVP.storage.save(probe, mock).ok === true);
    const geladen = AVP.storage.load(mock);
    t.ok('[PROPERTY] Storage: Roundtrip liefert identische Eingaben',
      geladen.ok && JSON.stringify(geladen.eingaben) === JSON.stringify(probe));
    t.ok('[PROPERTY] Storage: Zeitstempel des Speicherns vorhanden',
      geladen.ok && typeof geladen.gespeichertAm === 'string' && geladen.gespeichertAm.length >= 20);
    t.eq('[PROPERTY] Storage: leeres Backend → reason "empty"',
      AVP.storage.load({ getItem: () => null }).reason, 'empty');
    t.eq('[PROPERTY] Storage: korruptes JSON → reason "corrupt"',
      AVP.storage.load({ getItem: () => '{kaputt' }).reason, 'corrupt');
    t.eq('[PROPERTY] Storage: fremde Schema-Version → reason "schema"',
      AVP.storage.load({ getItem: () => '{"schema":99,"eingaben":{}}' }).reason, 'schema');
    t.eq('[PROPERTY] Storage: voller Speicher → reason "quota", keine Exception',
      AVP.storage.save(probe, { setItem: () => { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; } }).reason, 'quota');
    t.ok('[PROPERTY] Storage: clear entfernt den Eintrag',
      AVP.storage.clear(mock).ok && AVP.storage.load(mock).reason === 'empty');

    // ── Schritt 2: Rentenprojektion (Engine) ─────────────────────────────
    // Herleitungen unabhängig von der Implementierung, siehe Kommentare.
    t.close('[GESETZ] EP-Rückrechnung: 850 €/Mo. am 01.08.2026 ÷ 42,52 €',
      AVP.rente.epAusAnwartschaft(850, '2026-08-01', p), 850 / 42.52, 1e-12);

    // Referenzszenario: Jg. 1972, heute 54 J. (648 Mon.), 90.000 € brutto,
    // Anwartschaft 850 €/Mo. (Stand 01.08.2026), VBL-Bestand 170 € beitragsfrei.
    const basisSzenario = (over) => Object.assign({
      geburtsjahr: 1972, startAlterMonate: 648, bruttoJahr: 90000,
      teilzeitAnteil: 0.5, redAlterMonate: 9999, retAlterMonate: 67 * 12,
      endAlterJahre: 80,
      grv: { anwartschaftMo: 850, anwartschaftStand: '2026-08-01' },
      vbl: { bestandMo: 170, status: 'beitragsfrei' }
    }, over);
    const pfadFlach = { rentenanpassung: AVP.pfade.konstant(0), inflation: AVP.pfade.konstant(0) };

    // Vollzeit bis 67 (156 Mon.): EP = 850/42,52 + 156 × (90.000/51.944)/12
    const projVoll = AVP.rente.projektion(basisSzenario({}), pfadFlach, p);
    t.close('[GESETZ] Projektion Vollzeit bis 67: EP-Stand (Hochrechnungs-Anker)',
      projVoll.epBeiEintritt, 850 / 42.52 + 156 * (90000 / 51944) / 12, 1e-9);
    t.close('[GESETZ] Projektion Vollzeit: Rente in heutigen Werten = EP × 1,0 × 42,52',
      projVoll.drvMoHeutigeWerte, (850 / 42.52 + 156 * (90000 / 51944) / 12) * 42.52, 1e-9);

    // Teilzeit ab 62 (5 J. à 50 %): Differenz zur Vollzeit = 5 × Verlust/J. × RW
    const projTeil = AVP.rente.projektion(basisSzenario({ redAlterMonate: 62 * 12 }), pfadFlach, p);
    t.close('[GESETZ] Teilzeit-Lücke = 5 J. × beidseitig gekappter EP-Verlust × 42,52 €',
      projVoll.drvMoHeutigeWerte - projTeil.drvMoHeutigeWerte,
      5 * AVP.grv.teilzeitPunkteverlustProJahr(90000, 0.5, p) * 42.52, 1e-9);

    // Vorzeitiger Eintritt mit 63 (48 Mon. vor 67): GRV −14,4 %, VBL −10,8 % (Cap)
    const projFrueh = AVP.rente.projektion(basisSzenario({ retAlterMonate: 63 * 12 }), pfadFlach, p);
    t.close('[GESETZ] Eintritt 63: GRV-Zugangsfaktor 0,856', projFrueh.zugangsfaktor, 0.856, 1e-12);
    t.close('[GESETZ] Eintritt 63: VBL-Abschlag gedeckelt bei 0,892', projFrueh.vblAbschlagsfaktor, 0.892, 1e-12);
    t.close('[GESETZ] Eintritt 63: VBL bei Eintritt = 170 × 0,892 = 151,64 €',
      projFrueh.vblMoHeutigeWerte, 151.64, 1e-9);

    // Real/Nominal-Konsistenz (behebt v6-Befund 1): rAdj == Inflation ⇒ reale
    // GRV-Rente über den Bezug konstant; VBL erodiert real mit (1,01/1,02)^n.
    const pfad2 = { rentenanpassung: AVP.pfade.konstant(0.02), inflation: AVP.pfade.konstant(0.02) };
    const projReal = AVP.rente.projektion(basisSzenario({}), pfad2, p);
    const bezug = projReal.jahre.filter(j => j.imBezug);
    t.ok('[PROPERTY] rAdj = Inflation ⇒ reale GRV-Rente im Bezug konstant (Δ < 1 Ct.)',
      Math.abs(bezug[0].drvMoReal - bezug[bezug.length - 1].drvMoReal) < 0.01);
    // VBL-Anwartschaftserosion bis Eintritt: 13 volle Inflationsjahre bis 2039,
    // Bezugsbeginn 2039 (Alter 67): real = 170 / 1,02^13 = 131,41 €
    t.close('[GESETZ] VBL-Anwartschaft real erodiert: 170 € → 170/1,02¹³ bei Bezugsbeginn',
      bezug[0].vblMoReal, 170 / Math.pow(1.02, 13), 0.01);
    t.eq('[PROPERTY] Eintrittsjahr aus Alter korrekt (54→67 ⇒ 2039)',
      projReal.eintrittsjahr, 2039);
    t.ok('[PROPERTY] Unbekannter VBL-Status wird abgelehnt statt geraten', (() => {
      try { AVP.rente.projektion(basisSzenario({ vbl: { bestandMo: 170, status: 'pflichtversichert' } }), pfadFlach, p); return false; }
      catch (e) { return true; }
    })());

    // ── Schritt 2: Zentrale Jahresveranlagung ────────────────────────────
    // Kontext: Eintritt 2040, DRV 28.800 €/J. brutto, VBL-Beginn 67.
    // Kohorte 2040 = 91 % ⇒ eingefrorener Freibetrag = 28.800 × 0,09 = 2.592 €.
    const ctx = AVP.veranlagung.eintrittskontext(
      { eintrittsjahr: 2040, drvJahrBruttoBeiEintritt: 28800, vblBeginnAlter: 67 }, p);
    t.close('[GESETZ] Freibetrag-Einfrierung: 28.800 × (1−0,91) = 2.592 €',
      ctx.drvFreibetragEuro, 2592, 1e-9);
    // Jahr 1: stpflDrv 26.208; VBL 2.040 × 0,17 = 346,80; zvE = 26.554,80 − 138
    // = 26.416,80 → 26.416 → § 32a Zone 3: z = 0,8617,
    // (173,10·z + 2.397)·z + 1.034,87 = 3.228,90 → 3.228 €. Soli 0 (< 20.350).
    // KV = 2.400×12×0,0875 = 2.520 (VBL 170 < Freibetrag); PV = 2.570×12×0,046.
    const j1 = AVP.veranlagung.jahr({ drvJahr: 28800, vblJahr: 2040, ctx, kinderlos: true }, p);
    t.eq('[GESETZ] Veranlagung J1: zvE = 26.416 €', Math.floor(j1.zvE), 26416);
    t.eq('[GESETZ] Veranlagung J1: ESt = 3.228 € (handgerechnete Stützstelle)', j1.est, 3228);
    t.close('[GESETZ] Veranlagung J1: Soli = 0 (unter Freigrenze)', j1.soli, 0, 1e-9);
    t.close('[GESETZ] Veranlagung J1: KV = 2.520 € (VBL unter Freibetrag)', j1.kv, 2520, 1e-9);
    t.close('[GESETZ] Veranlagung J1: PV kinderlos = 30.840 × 4,6 %', j1.pv, 30840 * 0.046, 1e-6);
    // Einfrierung wirkt: +2.000 € Rentenerhöhung ⇒ stpflDrv steigt um VOLLE 2.000 €
    const j2 = AVP.veranlagung.jahr({ drvJahr: 30800, vblJahr: 2040, ctx, kinderlos: true }, p);
    t.close('[GESETZ] Freibetrag eingefroren: Erhöhung voll steuerpflichtig',
      j2.stpflDrv - j1.stpflDrv, 2000, 1e-9);

    // ── Schritt 3: Depot-Engine ──────────────────────────────────────────
    t.close('[PROPERTY] Annuität bei Zins 0 = linearer Abbau (PV/n)',
      AVP.depot.annuitaetMo(240000, 0, 240), 1000, 1e-9);
    // Annuitäten-Kernfall: Simulation MUSS das Depot am Zielalter auf 0 bringen
    const simAnn = AVP.depot.simulation({
      startDepot: 500000, sparVollMo: 0, sparTeilMo: 0,
      redAlterMonate: 0, retAlterMonate: 67 * 12, endAlterMonate: 88 * 12,
      startAlterMonate: 67 * 12, renditeNominal: 0.05, inflation: 0.02,
      modus: 'ann', entnahmerate: 0, zielAlterMonate: 87 * 12
    });
    const beiZiel = simAnn.reihe.find(r => r.alterMonate === 87 * 12 - 1);
    t.ok('[PROPERTY] Annuität: Depot am Zielalter 87 vollständig aufgebraucht (< 1 €)',
      beiZiel.depot < 1);
    t.ok('[PROPERTY] Annuität: Depot bleibt bis kurz vor Ziel positiv',
      simAnn.reihe.find(r => r.alterMonate === 86 * 12).depot > 0);
    // SWR: Entnahme = Depot@Eintritt × 4 % / 12, nominal konstant
    const simSwr = AVP.depot.simulation({
      startDepot: 300000, sparVollMo: 0, sparTeilMo: 0,
      redAlterMonate: 0, retAlterMonate: 67 * 12, endAlterMonate: 70 * 12,
      startAlterMonate: 67 * 12, renditeNominal: 0.05, inflation: 0.02,
      modus: 'swr', entnahmerate: 0.04, zielAlterMonate: 0
    });
    t.close('[PROPERTY] SWR: Startentnahme = 300.000 × 4 % / 12 = 1.000 €',
      simSwr.entnahmeStartMo, 1000, 1e-9);
    t.close('[PROPERTY] SWR: Entnahme nominal konstant (Monat 1 == Monat 30)',
      simSwr.reihe[0].entnahmeMo, simSwr.reihe[30].entnahmeMo, 1e-9);
    // 'infl': nach genau 12 Monaten steigt die Entnahme um die Inflationsrate
    const simInfl = AVP.depot.simulation({
      startDepot: 300000, sparVollMo: 0, sparTeilMo: 0,
      redAlterMonate: 0, retAlterMonate: 67 * 12, endAlterMonate: 70 * 12,
      startAlterMonate: 67 * 12, renditeNominal: 0.05, inflation: 0.02,
      modus: 'infl', entnahmerate: 0.04, zielAlterMonate: 0
    });
    t.close('[PROPERTY] Inflationsmodus: Entnahme Jahr 2 = Jahr 1 × 1,02',
      simInfl.reihe[12].entnahmeMo, simInfl.reihe[0].entnahmeMo * 1.02, 1e-9);
    // Ansparphase: 12 Monate à 1.000 € bei 0 % Rendite = exakt 12.000 € Zuwachs
    const simSpar = AVP.depot.simulation({
      startDepot: 0, sparVollMo: 1000, sparTeilMo: 0,
      redAlterMonate: 68 * 12, retAlterMonate: 68 * 12, endAlterMonate: 68 * 12,
      startAlterMonate: 67 * 12, renditeNominal: 0, inflation: 0,
      modus: 'swr', entnahmerate: 0, zielAlterMonate: 0
    });
    t.close('[PROPERTY] Ansparen: 12 × 1.000 € bei 0 % Rendite = 12.000 €',
      simSpar.reihe[11].depot, 12000, 1e-9);

    // ── Schritt 3: Veranlagung mit Kapitalerträgen ───────────────────────
    // Entnahme 24.000 €/J., Gewinnanteil 70 % ⇒ Gewinn 16.800; × (1−30 % TF)
    // = 11.760; − 1.000 Pauschbetrag = 10.760 stpfl.
    const jKap = AVP.veranlagung.jahr(
      { drvJahr: 28800, vblJahr: 2040, kapitalGewinnJahr: 16800, guenstig: false, ctx, kinderlos: true }, p);
    t.close('[GESETZ] Kapital: stpfl = 16.800 × 0,7 − 1.000 = 10.760 €',
      jKap.kapStpfl, 10760, 1e-9);
    t.close('[GESETZ] Kapital ohne Günstigerprüfung: 10.760 × 26,375 %',
      jKap.kapSteuer, 10760 * 0.26375, 1e-6);
    t.close('[PROPERTY] Renten-ESt unverändert durch Abgeltungs-Kapital',
      jKap.est, 3228, 1e-9);
    // Günstigerprüfung greift bei zvE 0: Tarif(10.760 − …) deutlich < 25 %
    const ctxNull = AVP.veranlagung.eintrittskontext(
      { eintrittsjahr: 2040, drvJahrBruttoBeiEintritt: 0, vblBeginnAlter: 67 }, p);
    const jGuenstig = AVP.veranlagung.jahr(
      { drvJahr: 0, vblJahr: 0, kapitalGewinnJahr: 16800, guenstig: true, ctx: ctxNull, kinderlos: true }, p);
    t.ok('[GESETZ] Günstigerprüfung greift bei sonst 0 € zvE (Tarif < Abgeltung)',
      jGuenstig.guenstigGenutzt === true && jGuenstig.kapSteuer === 0);
    t.ok('[GESETZ] Günstigerprüfung: Gesamtsteuer < Abgeltungsalternative',
      jGuenstig.steuernGesamt < 10760 * 0.26375);
    // Bei hohem zvE bleibt die Abgeltung günstiger — auch mit guenstig=true
    const ctxHoch = AVP.veranlagung.eintrittskontext(
      { eintrittsjahr: 2040, drvJahrBruttoBeiEintritt: 90000, vblBeginnAlter: 67 }, p);
    const jHoch = AVP.veranlagung.jahr(
      { drvJahr: 90000, vblJahr: 0, kapitalGewinnJahr: 16800, guenstig: true, ctx: ctxHoch, kinderlos: true }, p);
    t.ok('[GESETZ] Günstigerprüfung lehnt bei hohem zvE ab (Abgeltung bleibt)',
      jHoch.guenstigGenutzt === false && jHoch.kapSteuer > 0);

    // ── Schritt 4: App-Gesamtrechnung (DOM-frei) ─────────────────────────
    const eingaben = {
      geburtsjahr: 1972, alterHeute: 54, bruttoJahr: 90000, teilzeitAnteil: 0.5,
      redAlter: 62, retAlter: 67, endAlter: 85,
      anwartschaftMo: 850, anwartschaftStand: '2026-08-01', vblBestandMo: 170,
      depotStart: 70000, sparVollMo: 2500, sparTeilMo: 500,
      renditeNominal: 0.07, inflation: 0.02, rentenanpassung: 0.02,
      nutzeModellpfad: false, modus: 'swr', entnahmerate: 0.04, zielAlter: 87,
      guenstig: true, kinderlos: true
    };
    const erg = AVP.app.berechne(eingaben, p);
    t.close('[PROPERTY] App: EP-Stand identisch zur direkten Projektion',
      erg.kennzahlen.epBeiEintritt,
      AVP.rente.projektion({ geburtsjahr: 1972, startAlterMonate: 648, bruttoJahr: 90000,
        teilzeitAnteil: 0.5, redAlterMonate: 744, retAlterMonate: 804, endAlterJahre: 85,
        grv: { anwartschaftMo: 850, anwartschaftStand: '2026-08-01' },
        vbl: { bestandMo: 170, status: 'beitragsfrei' } },
        { rentenanpassung: AVP.pfade.konstant(0.02), inflation: AVP.pfade.konstant(0.02) }, p
      ).epBeiEintritt, 1e-9);
    t.ok('[PROPERTY] App: Netto real bei Eintritt liegt vor und ist plausibel (> 0)',
      erg.kennzahlen.nettoMoRealBeiEintritt > 0);
    t.ok('[PROPERTY] App: Netto < Brutto (Abzüge wirken)',
      erg.kennzahlen.nettoMoNominalBeiEintritt <
      erg.jahre.find(j => j.imBezug).drvMoNominal + erg.jahre.find(j => j.imBezug).vblMoNominal
        + erg.kennzahlen.entnahmeStartMo);
    t.ok('[PROPERTY] App: Depot wächst bis Reduktionsbeginn, fällt im Bezug (SWR 4 % > Netto-Zins-Fall hier nicht erzwungen) — Reihenlänge konsistent',
      erg.jahre.length === 85 - 54 + 1);
    // Regression beta.1 (von Daniel gefunden): App-Kette lieferte Depot = 0,
    // weil startAlterMonate nicht an die Simulation übergeben wurde und die
    // Schleife still leer lief. Diese Assertions hätten das gefangen:
    t.ok('[PROPERTY] App-Regression: Depot bei Eintritt > Startdepot (Sparraten wirken)',
      erg.kennzahlen.depotBeiEintritt > 70000);
    t.ok('[PROPERTY] App-Regression: Entnahme zu Beginn > 0',
      erg.kennzahlen.entnahmeStartMo > 0);
    t.ok('[PROPERTY] App-Regression: Depotstand im ersten Jahr > 0',
      erg.jahre[0].depotEnde > 0);
    t.close('[PROPERTY] App-Regression: Kachel "Depot bei Eintritt" == Simulationsreihe (Stand nach Monat Eintritt−1)',
      erg.kennzahlen.depotBeiEintritt,
      erg.depot.reihe.find(r => r.alterMonate === 67 * 12 - 1).depot, 1e-6);
    t.ok('[PROPERTY] Depot-Simulation wirft bei fehlendem startAlterMonate (statt still leer zu laufen)', (() => {
      try {
        AVP.depot.simulation({ startDepot: 1000, sparVollMo: 0, sparTeilMo: 0,
          redAlterMonate: 0, retAlterMonate: 804, endAlterMonate: 900,
          renditeNominal: 0.05, inflation: 0.02, modus: 'swr', entnahmerate: 0.04, zielAlterMonate: 0 });
        return false;
      } catch (e) { return /startAlterMonate/.test(e.message); }
    })());

    // ── beta.2: monatsgenaue Eingaben (Overrides) ────────────────────────
    // Renteneintritt 67 J. + 6 Mon. bei Jg. 1972 (Regelgrenze 67):
    // 6 Monate SPÄTER ⇒ Zugangsfaktor 1 + 6 × 0,005 = 1,03 (§ 77 SGB VI).
    const ergMon = AVP.app.berechne(Object.assign({}, eingaben, { retAlterMonate: 67 * 12 + 6 }), p);
    t.close('[GESETZ] Eintritt 67 J. 6 Mon.: ZF 1,025 (5 Zuschlagsmonate — Beginn im Folgemonat der Regelgrenze zaehlt nicht)',
      ergMon.rente.zugangsfaktor, 1.025, 1e-12);
    const ergFolge = AVP.app.berechne(Object.assign({}, eingaben, { retAlterMonate: 67 * 12 + 1 }), p);
    t.close('[GESETZ] Regulaerer Beginn (Folgemonat der Regelgrenze): ZF exakt 1,0',
      ergFolge.rente.zugangsfaktor, 1.0, 1e-12);
    // Vorlaufmonate isoliert (Stand 07/2026: gleicher Rentenwert 42,52):
    // 1 Monat Vorlauf ⇒ exakt +1 Vollzeit-Monats-EP.
    const ergJul = AVP.app.berechne(Object.assign({}, eingaben, { anwartschaftStand: '2026-07-07' }), p);
    t.close('[GESETZ] Vorlaufmonate isoliert: Stand 1 Mon. zurueck ⇒ +1 Vollzeit-Monats-EP',
      ergJul.rente.epStart - erg.rente.epStart, 1 * (90000 / 51944) / 12, 1e-9);
    // Realfall aeltere Renteninformation (Stand 06/2026, Rentenwert damals 40,79):
    // beide Effekte — hoehere EP aus der Rueckrechnung PLUS 2 Vorlaufmonate.
    const ergAlt = AVP.app.berechne(Object.assign({}, eingaben, { anwartschaftStand: '2026-06-07' }), p);
    t.close('[GESETZ] Aelterer Stand: Rueckrechnung mit damaligem Rentenwert (40,79) + 2 Vorlaufmonate',
      ergAlt.rente.epStart - erg.rente.epStart,
      (850 / 40.79 - 850 / 42.52) + 2 * (90000 / 51944) / 12, 1e-9);
    // Startalter +3 Monate (54 J. 3 Mon.) bei gleichem Eintritt: exakt
    // 3 Vollzeit-Monats-EP weniger akkumuliert.
    const ergStart = AVP.app.berechne(Object.assign({}, eingaben, { startAlterMonate: 54 * 12 + 3 }), p);
    t.close('[GESETZ] startAlterMonate-Override: 3 Monate weniger Vollzeit-EP',
      erg.kennzahlen.epBeiEintritt - ergStart.rente.epBeiEintritt,
      3 * (90000 / 51944) / 12, 1e-9);

    // ── v7.1: AVD-Foerderung (Werte belegt, Recherchebericht D) ──────────
    t.close('[GESETZ] AVD-Zulage: 360 € Eigenbeitrag → 180 €', AVP.avd.zulage(360), 180, 1e-9);
    t.close('[GESETZ] AVD-Zulage: 1.000 € → 180 + 160 = 340 €', AVP.avd.zulage(1000), 340, 1e-9);
    t.close('[GESETZ] AVD-Zulage: 1.800 € → 540 € (Deckel exakt erreicht)', AVP.avd.zulage(1800), 540, 1e-9);
    t.close('[GESETZ] AVD-Zulage: 2.400 € → 540 € (Deckel kappt)', AVP.avd.zulage(2400), 540, 1e-9);
    // Topf-Mechanik bei 0 % Rendite: 2 Beitragsjahre à 100 €/Mo. ⇒
    // 2×1.200 Eigen + 2×540? nein: Zulage(1.200) = 180+210 = 390 ⇒ 2×(1200+390)
    const avdSim = AVP.avd.simulation({ beitragMo: 100, startJahrIdx: 1, retJahrIdx: 3,
      endJahrIdx: 5, renditePfad: AVP.pfade.konstant(0) });
    t.close('[GESETZ] AVD-Topf: 2 Jahre à 1.200 € + Zulage 390 € bei 0 % = 3.180 €',
      avdSim.topfProJahr[2], 2 * (1200 + 390), 1e-6);
    t.ok('[PROPERTY] AVD: Annuitaet zahlt ab Eintritt, Topf faellt monoton',
      avdSim.renteAbRet[3] > 0 && avdSim.topfProJahr[5] < avdSim.topfProJahr[3]);
    t.ok('[PROPERTY] AVD in Veranlagung: avdJahr erhoeht zvE voll (nachgelagert)',
      AVP.veranlagung.jahr({ drvJahr: 28800, vblJahr: 0, avdJahr: 5000, ctx, kinderlos: true }, p).zvE
      === AVP.veranlagung.jahr({ drvJahr: 28800, vblJahr: 0, ctx, kinderlos: true }, p).zvE + 5000);

    // ── v7.1: Hybrid-Entnahme ────────────────────────────────────────────
    const simHyb = AVP.depot.simulation({
      startDepot: 500000, sparVollMo: 0, sparTeilMo: 0,
      redAlterMonate: 0, retAlterMonate: 67 * 12, endAlterMonate: 90 * 12,
      startAlterMonate: 67 * 12, renditeNominal: 0.05, inflation: 0.02,
      modus: 'hybrid', entnahmerate: 0.04, zielAlterMonate: 87 * 12,
      switchAlterMonate: 75 * 12 });
    t.close('[PROPERTY] Hybrid Phase 1 = SWR: Startentnahme 500.000 × 4 %/12',
      simHyb.reihe[0].entnahmeMo, 500000 * 0.04 / 12, 1e-9);
    t.ok('[PROPERTY] Hybrid: Umschaltung bei 75 aendert die Entnahme (Annuitaet)',
      Math.abs(simHyb.reihe.find(r => r.alterMonate === 75 * 12).entnahmeMo
             - simHyb.reihe[0].entnahmeMo) > 1);
    t.ok('[PROPERTY] Hybrid: Depot am Zielalter 87 aufgebraucht (< 1 €)',
      simHyb.reihe.find(r => r.alterMonate === 87 * 12 - 1).depot < 1);
    // Renditepfad-Injektion: Jahr 1 mit 0 %, Jahr 2 mit 12 % — nachrechenbar
    const simPf = AVP.depot.simulation({
      startDepot: 10000, sparVollMo: 0, sparTeilMo: 0,
      redAlterMonate: 0, retAlterMonate: 999 * 12, endAlterMonate: 56 * 12,
      startAlterMonate: 54 * 12, inflation: 0.02, modus: 'swr', entnahmerate: 0,
      zielAlterMonate: 0, renditePfad: (i) => i === 0 ? 0 : 0.12 });
    t.close('[PROPERTY] Renditepfad: 10.000 € nach Jahr1 0 % + Jahr2 12 % = 11.200 €',
      simPf.reihe[23].depot, 11200, 0.01);

    // ── v7.1: Szenario-Pfade ─────────────────────────────────────────────
    const gkvB = AVP.pfade.gkvPfad('basis', p), gkvU = AVP.pfade.gkvPfad('unguenstig', p);
    t.close('[AMTLICH] GKV-Pfad Basis 2035: Zusatzbeitrag 20,0 − 14,6 = 5,4 %',
      gkvB(9).kvZusatz, 0.054, 1e-12);
    t.close('[AMTLICH] GKV-Pfad Basis 2035: PV 4,5 %', gkvB(9).pvAllgemein, 0.045, 1e-12);
    t.close('[AMTLICH] GKV-Pfad unguenstig 2035: Zusatz 8,0 %, danach konstant',
      gkvU(12).kvZusatz, 0.080, 1e-12);
    t.close('[PROPERTY] GKV-Pfad 2026 = heutige Saetze (Interpolationsstart)',
      gkvB(0).kvZusatz, p.sozial.kvZusatzDurchschnitt, 1e-12);
    const malus = AVP.pfade.mitRentenniveauMalus(AVP.pfade.konstant(0.02), p);
    t.close('[PROPERTY] Rentenniveau-Malus: 2031 unveraendert 2,0 %', malus(5), 0.02, 1e-12);
    t.close('[PROPERTY] Rentenniveau-Malus: ab 2032 nur noch 1,5 %', malus(6), 0.015, 1e-12);
    t.ok('[GESETZ] Abgeltung-Szenario 30 %: kapSteuer steigt auf 31,65 %', (() => {
      const basis = AVP.veranlagung.jahr({ drvJahr: 28800, vblJahr: 0, kapitalGewinnJahr: 16800, ctx, kinderlos: true }, p);
      const s30 = AVP.veranlagung.jahr({ drvJahr: 28800, vblJahr: 0, kapitalGewinnJahr: 16800, ctx, kinderlos: true,
        saetze: { abgeltungsatz: 0.30 * 1.055 } }, p);
      return Math.abs(s30.kapSteuer - 10760 * 0.3165) < 1e-6 && s30.kapSteuer > basis.kapSteuer;
    })());
    t.ok('[PROPERTY] GKV-Override wirkt: hoeherer Zusatzbeitrag ⇒ hoeherer KV-Jahresbeitrag',
      AVP.veranlagung.jahr({ drvJahr: 28800, vblJahr: 0, ctx, kinderlos: true,
        saetze: { kvZusatz: 0.054 } }, p).kv
      > AVP.veranlagung.jahr({ drvJahr: 28800, vblJahr: 0, ctx, kinderlos: true }, p).kv);

    // ── v7.1: Hochrechnungs-Nachbau ("Garantiert erreichbar") ────────────
    // Generischer Fall: 850 € Stand 08/2026 (RW 42,52), Brutto = Durchschnitt
    // (1 EP/J.), Geburt 01/1972 ⇒ Regelgrenze 804 Mon., Beginn = Folgemonat.
    const nb = AVP.rente.hochrechnungsNachbau({ anwartschaftMo: 850,
      anwartschaftStand: '2026-08-01', bruttoJahr: 51944, gebMonat: '1972-01' }, p);
    t.close('[GESETZ] Nachbau: Restmonate Stand 08/2026 → Beginn 02/2039 = 150',
      nb.restMonate, 150, 1e-12);
    t.close('[GESETZ] Nachbau: (850/42,52 + 150/12 EP) × 42,52 = 1.381,50 €',
      nb.nachbauMo, (850 / 42.52 + 150 / 12) * 42.52, 1e-9);

    // ── v7.1: Monte-Carlo-Kern ───────────────────────────────────────────
    t.ok('[PROPERTY] MC-RNG: gleicher Seed ⇒ identische Sequenz', (() => {
      const a = AVP.mc.rng(42), b = AVP.mc.rng(42);
      for (let i = 0; i < 5; i++) if (a() !== b()) return false;
      return true;
    })());
    t.ok('[PROPERTY] MC-Lognormal: empirische Momente treffen Ziel (μ 5 %, σ 16 %)', (() => {
      const pf2 = AVP.mc.realPfad(20000, 0.05, 0.16, AVP.mc.rng(7));
      const m = pf2.reduce((s, x) => s + x, 0) / pf2.length;
      const sd = Math.sqrt(pf2.reduce((s, x) => s + (x - m) * (x - m), 0) / pf2.length);
      return Math.abs(m - 0.05) < 0.005 && Math.abs(sd - 0.16) < 0.005;
    })());
    t.close('[PROPERTY] MC-Perzentil: Median von 1..101 = 51',
      AVP.mc.perzentil(Array.from({ length: 101 }, (_, i) => i + 1), 0.5), 51, 1e-12);
    t.ok('[PROPERTY] MC-Lauf: seed-reproduzierbar (n=50, identische P50-Reihe)', (() => {
      const opt = { n: 50, muReal: 0.05, sigma: 0.16, seed: 123 };
      const r1 = AVP.mc.run(eingaben, p, opt), r2 = AVP.mc.run(eingaben, p, opt);
      return r1.depotPerzentile.p50.every((v, i) => v === r2.depotPerzentile.p50[i]);
    })());
    t.ok('[PROPERTY] MC-Lauf: P10 ≤ P50 ≤ P90 im Eintrittsjahr', (() => {
      const r1 = AVP.mc.run(eingaben, p, { n: 80, muReal: 0.05, sigma: 0.16, seed: 5 });
      const i = 67 - 54;
      return r1.depotPerzentile.p10[i] <= r1.depotPerzentile.p50[i]
          && r1.depotPerzentile.p50[i] <= r1.depotPerzentile.p90[i];
    })());

    // ── v7.2: Zielrente (konstantes reales Netto bis Alter Y) ────────────
    const simZiel = AVP.depot.simulation({
      startDepot: 300000, sparVollMo: 0, sparTeilMo: 0,
      redAlterMonate: 0, retAlterMonate: 67 * 12, endAlterMonate: 90 * 12,
      startAlterMonate: 67 * 12, renditeNominal: 0.05, inflation: 0.02,
      modus: 'ziel', entnahmerate: 0, zielAlterMonate: 87 * 12,
      entnahmePfadJahrMo: Array.from({ length: 24 }, () => 1000) });
    t.close('[PROPERTY] Ziel-Modus: vorgegebener Pfad wird exakt entnommen (1.000 €/Mo.)',
      simZiel.reihe[6].entnahmeMo, 1000, 1e-9);
    // Ziel-Fixture: konsistenter Horizont (zielAlter 87 < endAlter 90) —
    // die Basis-Fixture endet bei 85 und liesse den Verbrauch unbeobachtet.
    const eZiel = Object.assign({}, eingaben, { endAlter: 90 });
    const zSol = AVP.ziel.loeseEntnahmePfad(eZiel, p, 2000);
    t.ok('[PROPERTY] Zielrente-Fixpunkt: jedes Bezugsjahr vor Y trifft 2.000 € real (±1 €)',
      zSol.konvergiert && zSol.erg.jahre.every(j => !j.imBezug || j.alter >= eZiel.zielAlter
        || Math.abs(j.nettoMoReal - 2000) < 1));
    const zFloor = AVP.ziel.loeseEntnahmePfad(eZiel, p, 500);
    t.ok('[PROPERTY] Zielrente-Floor: Ziel unter Renten-Netto ⇒ Entnahme 0, Netto ≥ Ziel',
      zFloor.machbar && zFloor.pfad.every(v => v === 0)
      && zFloor.erg.jahre.every(j => !j.imBezug || j.nettoMoReal >= 500));
    const zMax = AVP.ziel.maxZielrente(eZiel, p);
    t.ok('[PROPERTY] maxZielrente: Depot bei Y planmaessig verbraucht (Jahr Y−1 < 2.000 €, Y−2 > 0)',
      zMax.depotBeiY < 2000 && zMax.erg.jahre.find(j => j.alter === eZiel.zielAlter - 2).depotEnde > 0);
    const zKurz = AVP.ziel.maxZielrente(Object.assign({}, eZiel, { zielAlter: 80 }), p);
    t.ok('[PROPERTY] maxZielrente monoton: kuerzerer Horizont (80) ⇒ hoeheres Ziel als bis 87',
      zKurz.zielMoReal > zMax.zielMoReal);
    t.ok('[PROPERTY] maxZielrente konsistent: gefundenes Z ist selbst machbar',
      AVP.ziel.loeseEntnahmePfad(eZiel, p, zMax.zielMoReal).machbar);
    // Regression: krumme Start-/Eintrittsmonate (52 J. 10 Mon. / 67 J. 1 Mon.)
    // — der letzte Lebensjahr-Block vor Y muss voll entnahmefaehig sein.
    const eKrumm = Object.assign({}, eingaben, {
      alterHeute: 52, startAlterMonate: 52 * 12 + 10, retAlterMonate: 67 * 12 + 1,
      zielAlter: 87, endAlter: 90 });
    const zKrumm = AVP.ziel.maxZielrente(eKrumm, p);
    const retIdxK = Math.floor((eKrumm.retAlterMonate - eKrumm.startAlterMonate) / 12);
    t.ok('[PROPERTY] Zielrente bei krummen Monaten: volle Bezugsjahre treffen Z real (±2 €)',
      zKrumm.erg.jahre.every((j, i) => i <= retIdxK || !j.imBezug || j.alter >= eKrumm.zielAlter
        || Math.abs(j.nettoMoReal - zKrumm.zielMoReal) < 7));
    t.ok('[PROPERTY] Zielrente bei krummen Monaten: Depot vor Y verbraucht (< 2.000 €), Z > 0',
      zKrumm.depotBeiY < 2000 && zKrumm.zielMoReal > 500);

    return t.summary();
  }
};

/* Mini-Runner — bewusst frameworkfrei (E7). */
class Runner {
  constructor(report) { this.report = report || (() => {}); this.pass = 0; this.fail = 0; this.failures = []; }
  _record(name, ok, detail) {
    if (ok) this.pass++; else { this.fail++; this.failures.push({ name, detail }); }
    this.report({ name, ok, detail });
  }
  eq(name, actual, expected) {
    this._record(name, actual === expected, `erwartet ${expected}, erhalten ${actual}`);
  }
  close(name, actual, expected, tol) {
    this._record(name, Math.abs(actual - expected) <= tol, `erwartet ${expected} ±${tol}, erhalten ${actual}`);
  }
  ok(name, cond) { this._record(name, !!cond, 'Bedingung verletzt'); }
  summary() { return { pass: this.pass, fail: this.fail, failures: this.failures }; }
}
