/* ============================================================================
 * TAX — Einkommensteuer-Tarif, Soli, Vorabpauschale, Abgeltungsteuer
 * ============================================================================
 * Tarif exakt nach § 32a Abs. 1 EStG (Fassung ab VZ 2026): zvE auf volle €
 * abrunden, Zonenformeln anwenden, Ergebnis auf volle € abrunden.
 * Datengetrieben über p.steuer.tarif — 2027 ist nur ein neues Parameterfile.
 * ========================================================================== */
'use strict';
globalThis.AVP = globalThis.AVP || {};

AVP.tax = {
  /** Tarifliche Einkommensteuer § 32a Abs. 1 EStG. Gibt ganze Euro zurück. */
  est(zvE, p) {
    const t = p.steuer.tarif;
    const x = Math.floor(Math.max(0, zvE));      // S. 1: auf volle € abrunden
    let st;
    if (x <= t.gfb) {
      st = 0;
    } else if (x <= t.zone2.bis) {
      const y = (x - t.gfb) / 10000;
      st = (t.zone2.a * y + t.zone2.b) * y;
    } else if (x <= t.zone3.bis) {
      const z = (x - t.zone2.bis) / 10000;
      st = (t.zone3.a * z + t.zone3.b) * z + t.zone3.c;
    } else if (x <= t.zone4.bis) {
      st = t.zone4.satz * x - t.zone4.abzug;
    } else {
      st = t.zone5.satz * x - t.zone5.abzug;
    }
    return Math.floor(st);                        // S. 6: auf vollen € abrunden
  },

  /** Grenzsteuersatz (numerisch, für Günstigerprüfung/Anzeige). */
  grenzsteuersatz(zvE, p) {
    return (this.est(zvE + 100, p) - this.est(zvE, p)) / 100;
  },

  /** Solidaritätszuschlag § 4 SolZG auf die festgesetzte ESt:
   *  0 bis zur Freigrenze, dann min(5,5 % · ESt, 11,9 % · (ESt − Freigrenze)). */
  soli(est, p) {
    const s = p.steuer.soli;
    if (est <= s.freigrenze) return 0;
    return Math.min(s.satz * est, s.milderung * (est - s.freigrenze));
  },

  /** Vorabpauschale § 18 InvStG für ein Kalenderjahr eines thesaurierenden
   *  Aktien-ETF. Rückgabe: { vorabpauschale, steuerpflichtig, steuer }.
   *  Basisertrag = Wert(1.1.) × Basiszins × 0,7; VAP = min(Basisertrag,
   *  Wertzuwachs + Ausschüttung, nie < 0); dann Teilfreistellung, dann
   *  Abgeltungsatz. Sparer-Pauschbetrag wird HIER nicht abgezogen — das
   *  macht die Jahresveranlagung zentral (E2). */
  vorabpauschale({ wertJahresanfang, wertJahresende, ausschuettung = 0 }, p) {
    const basisertrag = wertJahresanfang * p.steuer.basiszinsVorabpauschale * 0.7;
    const zuwachs = Math.max(0, wertJahresende - wertJahresanfang + ausschuettung);
    const vap = Math.max(0, Math.min(basisertrag, zuwachs));
    const steuerpflichtig = vap * (1 - p.steuer.teilfreistellungAktienfonds);
    return { vorabpauschale: vap, steuerpflichtig, steuer: steuerpflichtig * p.steuer.abgeltungsatz };
  },

  /** Abgeltungsteuer auf einen realisierten Gewinnbetrag (bereits nach
   *  Sparer-Pauschbetrag) unter Teilfreistellung. */
  abgeltungAufGewinn(gewinn, p) {
    const stpfl = Math.max(0, gewinn) * (1 - p.steuer.teilfreistellungAktienfonds);
    return stpfl * p.steuer.abgeltungsatz;
  },

  /** Ertragsanteil § 22 Nr. 1 S. 3 a) bb) EStG nach Alter bei Rentenbeginn. */
  ertragsanteil(beginnAlter, p) {
    const tab = p.steuer.ertragsanteil;
    const alter = Math.max(60, Math.min(68, Math.floor(beginnAlter)));
    if (!(alter in tab)) throw new Error(`Ertragsanteil für Alter ${beginnAlter} nicht hinterlegt`);
    return tab[alter];
  }
};
