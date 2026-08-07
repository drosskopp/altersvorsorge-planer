/* ============================================================================
 * AVD — Altersvorsorgedepot (ab 1.1.2027)
 * ============================================================================
 * Foerderung (Altersvorsorgereformgesetz, BGBl. 2026 I Nr. 156; Werte im
 * Recherchebericht belegt): 50 % Zulage auf die ersten 360 € Eigenbeitrag/Jahr,
 * 25 % auf 360,01–1.800 €, Grundzulage max. 540 €/Jahr. Kinderzulage hier noch
 * nicht modelliert (Parameter-TODO).
 * Modell-Annahmen (dokumentiert, Auszahlungsdetails gesetzlich teils offen):
 *  - Zulage wird am Jahresende ohne unterjaehrige Verzinsung gutgeschrieben.
 *  - Auszahlung ab Rentenbeginn als Annuitaet bis zum Betrachtungsende,
 *    nachgelagert VOLL tariflich steuerpflichtig (§ 22 Nr. 5 EStG analog).
 *  - KVdR: beitragsfrei wie private Renten (Annahme; Szenario-faehig).
 * ========================================================================== */
'use strict';
globalThis.AVP = globalThis.AVP || {};

AVP.avd = {
  /** Jahreszulage nach Eigenbeitrag (Jahressumme, €). */
  zulage(eigenJahr) {
    const gefoerdert = Math.min(1800, Math.max(0, eigenJahr));
    return Math.min(540, 0.5 * Math.min(360, gefoerdert) + 0.25 * Math.max(0, gefoerdert - 360));
  },

  /** Topf-Simulation jahresweise. Beitraege ab startJahrAvd (2027) bis zum
   *  Rentenbeginn; danach Annuitaet bis endAlterMonate. Rendite als Pfad f(i). */
  simulation({ beitragMo, startJahrIdx, retJahrIdx, endJahrIdx, renditePfad }) {
    let topf = 0;
    const topfProJahr = [], renteAbRet = [];
    let avdRenteJahr = 0;
    for (let i = 0; i <= endJahrIdx; i++) {
      const r = renditePfad(i);
      if (i >= startJahrIdx && i < retJahrIdx) {
        // 12 Monatsbeitraege mit Monatsverzinsung, Zulage am Jahresende
        const rm = Math.pow(1 + r, 1 / 12) - 1;
        for (let m = 0; m < 12; m++) topf = topf * (1 + rm) + beitragMo;
        topf += this.zulage(beitragMo * 12);
      } else if (i === retJahrIdx) {
        const n = Math.max(1, (endJahrIdx - retJahrIdx + 1) * 12);
        avdRenteJahr = AVP.depot.annuitaetMo(topf, r, n) * 12;
        topf = Math.max(0, topf * (1 + r) - avdRenteJahr);
      } else if (i > retJahrIdx) {
        topf = Math.max(0, topf * (1 + renditePfad(i)) - avdRenteJahr);
      } else {
        topf = topf * (1 + r);
      }
      topfProJahr.push(topf);
      renteAbRet.push(i >= retJahrIdx ? avdRenteJahr : 0);
    }
    return { topfProJahr, renteAbRet, avdRenteJahrBeiEintritt: avdRenteJahr };
  }
};
