/* ============================================================================
 * MC — Monte-Carlo-Kern (seeded, Lognormal; ADR-0003/0009)
 * ============================================================================
 * Reproduzierbar per Seed (mulberry32). Jahres-Realrenditen ~ Lognormal mit
 * Momente-Matching (E[r]=mu, SD[r]=sigma); nominale Rendite je Jahr =
 * (1+r_real)(1+inflation)−1 (Inflation deterministisch — Vereinfachung,
 * stochastische Inflation ist Roadmap). Block-Bootstrap folgt, sobald eine
 * zitierfaehige historische Reihe eingepflegt ist (siehe Recherchebericht).
 * Praesentation: Perzentil-Faecher + Erschoepfungs-Alter statt nackter
 * "Erfolgsquote" (Kitces/Income-Lab-Kritik, Recherchebericht Abschnitt B).
 * ========================================================================== */
'use strict';
globalThis.AVP = globalThis.AVP || {};

AVP.mc = {
  /** Deterministischer 32-Bit-RNG (mulberry32). */
  rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  },

  /** Standardnormal via Box-Muller aus einem rng(). */
  gauss(rand) {
    let u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  },

  /** Lognormal-Parameter per Momente-Matching auf E[r]=mu, SD[r]=sigma. */
  lognormalParams(mu, sigma) {
    const s2 = Math.log(1 + (sigma * sigma) / ((1 + mu) * (1 + mu)));
    return { muLog: Math.log(1 + mu) - s2 / 2, sigmaLog: Math.sqrt(s2) };
  },

  /** Ein Renditepfad (reale Jahresrenditen), Laenge n. */
  realPfad(n, mu, sigma, rand) {
    const { muLog, sigmaLog } = this.lognormalParams(mu, sigma);
    const out = new Array(n);
    for (let i = 0; i < n; i++) out[i] = Math.exp(muLog + sigmaLog * this.gauss(rand)) - 1;
    return out;
  },

  /** Perzentil (linear interpoliert) aus unsortiertem Array. */
  perzentil(arr, p) {
    const a = arr.slice().sort((x, y) => x - y);
    const idx = (a.length - 1) * p;
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    return lo === hi ? a[lo] : a[lo] + (a[hi] - a[lo]) * (idx - lo);
  },

  /** Kompletter MC-Lauf ueber die App-Kette. Rueckgabe: Perzentil-Zeitreihen
   *  (Depot nominal, Netto real/Mo.) + Erschoepfungs-Kennzahlen. */
  run(eingaben, p, { n = 2000, muReal = 0.05, sigma = 0.16, seed = 42, onProgress = null } = {}) {
    const rand = this.rng(seed);
    const jahreN = eingaben.endAlter - Math.floor(
      (Number.isFinite(eingaben.startAlterMonate) ? eingaben.startAlterMonate : eingaben.alterHeute * 12) / 12) + 1;
    const depotProJahr = Array.from({ length: jahreN }, () => new Array(n));
    const nettoProJahr = Array.from({ length: jahreN }, () => new Array(n));
    const erschoepfungsAlter = [];
    for (let k = 0; k < n; k++) {
      const real = this.realPfad(jahreN, muReal, sigma, rand);
      const nominal = real.map(r => (1 + r) * (1 + eingaben.inflation) - 1);
      const erg = AVP.app.berechne(Object.assign({}, eingaben, {
        renditePfad: (i) => nominal[Math.min(i, jahreN - 1)]
      }), p);
      let leerAb = null;
      for (let i = 0; i < jahreN; i++) {
        const j = erg.jahre[i];
        depotProJahr[i][k] = j.depotEnde;
        nettoProJahr[i][k] = j.imBezug ? j.nettoMoReal : null;
        if (leerAb === null && j.imBezug && j.depotEnde <= 1) leerAb = j.alter;
      }
      erschoepfungsAlter.push(leerAb);   // null = haelt bis Betrachtungsende
      if (onProgress && k % 200 === 0) onProgress(k / n);
    }
    const P = [0.10, 0.25, 0.50, 0.75, 0.90];
    const depotP = P.map(q => depotProJahr.map(row => this.perzentil(row, q)));
    const nettoP = P.map(q => nettoProJahr.map(row => {
      const werte = row.filter(v => v !== null);
      return werte.length ? this.perzentil(werte, q) : null;
    }));
    // Erschoepfungs-Quantile: "haelt durch" zaehlt als endAlter+1, damit
    // die Aussage "in 10 % der Pfade ist das Depot vor Alter X erschoepft"
    // ueber ALLE Pfade definiert ist.
    const endAlter = eingaben.endAlter;
    const alleAlter = erschoepfungsAlter.map(a => a === null ? endAlter + 1 : a);
    const q10 = this.perzentil(alleAlter, 0.10), q50 = this.perzentil(alleAlter, 0.50);
    return {
      n, seed, jahreN,
      depotPerzentile: { p10: depotP[0], p25: depotP[1], p50: depotP[2], p75: depotP[3], p90: depotP[4] },
      nettoPerzentile: { p10: nettoP[0], p50: nettoP[2], p90: nettoP[4] },
      anteilErschoepft: erschoepfungsAlter.filter(a => a !== null).length / n,
      erschoepfungsAlterP10: q10 <= endAlter ? Math.round(q10) : null,
      erschoepfungMedian: q50 <= endAlter ? Math.round(q50) : null
    };
  }
};
