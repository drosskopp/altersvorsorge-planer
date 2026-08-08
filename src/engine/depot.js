/* ============================================================================
 * DEPOT — Monatliche Depot-Simulation (Ansparen, Teilzeitbrücke, Entnahme)
 * ============================================================================
 * Monatsschritt (ADR-0009), nominale Rechnung; reale Sicht via Deflationierung
 * durch den Aufrufer. Entnahmemodi:
 *  - 'swr':  fixer Betrag = Depot@Eintritt × Rate / 12 (nominal konstant)
 *  - 'infl': startet wie swr, wächst jährlich mit der Inflationsrate
 *  - 'ann':  Annuität mit Nominalzins, Depot = 0 am Zielalter
 * Hybrid-Modus aus v6 folgt in einem späteren Schritt (CHANGELOG).
 * Strategien sehen nur Vergangenheit/Gegenwart (ADR-0004).
 * ========================================================================== */
'use strict';
globalThis.AVP = globalThis.AVP || {};

AVP.depot = {
  /** Annuitäten-Monatsrate: PMT = PV·r / (1 − (1+r)^−n), r = Monatszins. */
  annuitaetMo(pv, jahresrendite, monate) {
    const r = jahresrendite / 12;
    if (monate <= 0) return pv;
    if (Math.abs(r) < 1e-12) return pv / monate;
    return pv * r / (1 - Math.pow(1 + r, -monate));
  },

  /** Simulation von startAlterMonate bis endAlterMonate (exklusiv).
   *  cfg: { startDepot, sparVollMo, sparTeilMo, redAlterMonate, retAlterMonate,
   *         renditeNominal, inflation, modus, entnahmerate, zielAlterMonate }
   *  Rückgabe: { monate: [...], depotBeiRet, entnahmeStartMo,
   *              entnahmeMoImJahr(jahrIndexAbRet) } */
  simulation(cfg) {
    // Defensiv (Lektion beta.1): ein vergessener Parameter darf nie wieder
    // still eine leere Reihe erzeugen — Pflichtfelder werden hart geprüft.
    for (const f of ['startDepot', 'sparVollMo', 'sparTeilMo', 'redAlterMonate',
                     'retAlterMonate', 'endAlterMonate', 'startAlterMonate', 'inflation']) {
      if (!Number.isFinite(cfg[f])) throw new Error('depot.simulation: Parameter "' + f + '" fehlt oder ist keine Zahl');
    }
    if (!Number.isFinite(cfg.renditeNominal) && typeof cfg.renditePfad !== 'function')
      throw new Error('depot.simulation: renditeNominal ODER renditePfad erforderlich');
    // Rendite je Jahr (ADR-0003): Pfad f(jahrIndex) oder flacher Pfad aus der
    // Konstanten; Monatszins geometrisch (1+r)^(1/12)−1 (ADR-0009).
    const jahresRendite = (m) => {
      const i = Math.floor((m - cfg.startAlterMonate) / 12);
      return typeof cfg.renditePfad === 'function' ? cfg.renditePfad(i) : cfg.renditeNominal;
    };
    const monatsZins = (m) => Math.pow(1 + jahresRendite(m), 1 / 12) - 1;
    let depot = cfg.startDepot;
    let depotBeiRet = null, entnahmeStartMo = 0, entnahmeAktMo = 0;
    const reihe = [];
    for (let m = cfg.startAlterMonate; m < cfg.endAlterMonate; m++) {
      if (m === cfg.retAlterMonate) {
        depotBeiRet = depot;
        if (cfg.modus === 'ann') {
          entnahmeStartMo = this.annuitaetMo(depot, jahresRendite(m),
                                             cfg.zielAlterMonate - cfg.retAlterMonate);
        } else if (cfg.modus === 'ziel') {
          entnahmeStartMo = (cfg.entnahmePfadJahrMo || [])[Math.floor((m - cfg.startAlterMonate) / 12)] || 0;
        } else {
          entnahmeStartMo = depot * cfg.entnahmerate / 12;   // swr, infl, hybrid Phase 1
        }
        entnahmeAktMo = entnahmeStartMo;
      }
      // Hybrid Phase 2: am Umschaltalter Annuitaet auf den DANN aktuellen
      // Depotwert bis zum Zielalter (v6-Modus, ADR-0004: kein Look-ahead).
      if (cfg.modus === 'hybrid' && m === cfg.switchAlterMonate && m > cfg.retAlterMonate) {
        entnahmeAktMo = this.annuitaetMo(depot, jahresRendite(m),
                                         cfg.zielAlterMonate - cfg.switchAlterMonate);
      }
      // Jahreswechsel im Bezug: 'infl' passt die Entnahme jährlich an
      if (cfg.modus === 'infl' && m > cfg.retAlterMonate
          && (m - cfg.retAlterMonate) % 12 === 0) {
        entnahmeAktMo *= 1 + cfg.inflation;
      }
      const spar = m < cfg.redAlterMonate ? cfg.sparVollMo
                 : m < cfg.retAlterMonate ? cfg.sparTeilMo : 0;
      if (cfg.modus === 'ziel' && m >= cfg.retAlterMonate)
        entnahmeAktMo = (cfg.entnahmePfadJahrMo || [])[Math.floor((m - cfg.startAlterMonate) / 12)] || 0;
      // Ziel-Modus: Entnahmegrenze auf die LEBENSJAHR-Blockgrenze anheben, in
      // der zielAlterMonate liegt — sonst ist der letzte Jahres-Block bei
      // krummem Startmonat nur teilweise entnahmefaehig und der Zielrente-
      // Solver kann die Jahresluecke dort nie schliessen (Regression:
      // Start 52 J. 10 Mon.). ann/hybrid unveraendert (Annuitaeten-Formel
      // nutzt zielAlterMonate exakt).
      const zielGrenzeMonate = cfg.modus === 'ziel'
        ? cfg.startAlterMonate + Math.ceil((cfg.zielAlterMonate - cfg.startAlterMonate) / 12) * 12
        : cfg.zielAlterMonate;
      const nachZiel = (cfg.modus === 'ann' || cfg.modus === 'hybrid' || cfg.modus === 'ziel') && m >= zielGrenzeMonate;
      const entn = m >= cfg.retAlterMonate && !nachZiel ? entnahmeAktMo : 0;
      const rmM = monatsZins(m);
      const entnEff = Math.min(entn, depot * (1 + rmM) + spar);   // nie unter 0
      depot = Math.max(0, depot * (1 + rmM) + spar - entnEff);
      reihe.push({ alterMonate: m, depot, entnahmeMo: entnEff });
    }
    if (depotBeiRet === null) depotBeiRet = depot;
    return { reihe, depotBeiRet, entnahmeStartMo };
  }
};
