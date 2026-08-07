/* ============================================================================
 * VBL — VBLklassik: Bestand, Abschlag, Bezugsdynamik
 * ============================================================================
 * Für Status "beitragsfrei gestellt" (Wechsel in die Privatwirtschaft) ist der
 * Bestand [€/Mo.] aus dem Versicherungsnachweis der einzige Input; die
 * Anwartschaft wird bis Rentenbeginn NICHT dynamisiert (statischer Messbetrag).
 * Zuwachsrechnung für Status "pflichtversichert" folgt mit Altersfaktor-Tabelle
 * (§ 8 Abs. 3 ATV) — siehe TODO in params. §§ 35, 39 VBL-Satzung.
 * ========================================================================== */
'use strict';
globalThis.AVP = globalThis.AVP || {};

AVP.vbl = {
  /** Abschlagsfaktor bei vorzeitigem GRV-Bezug: 0,3 %/Monat, max. 10,8 %. */
  abschlagsfaktor(monateVorzeitig, p) {
    const abschlag = Math.min(p.vbl.abschlagMax, Math.max(0, monateVorzeitig) * p.vbl.abschlagProMonat);
    return 1 - abschlag;
  },

  /** Monatliche Betriebsrente zum Bezugsbeginn aus dem Bestand. */
  renteAusBestand(bestandEuroMo, monateVorzeitig, p) {
    return bestandEuroMo * this.abschlagsfaktor(monateVorzeitig, p);
  },

  /** Anpassungsfaktor nach n vollen Bezugsjahren: (1 + 1 %)^n, § 39 VBLS.
   *  In der Anwartschaftsphase (vor Bezug) gibt es KEINE Anpassung. */
  anpassungsfaktor(bezugsjahre, p) {
    return Math.pow(1 + p.vbl.anpassungImBezug, Math.max(0, Math.floor(bezugsjahre)));
  }
};
