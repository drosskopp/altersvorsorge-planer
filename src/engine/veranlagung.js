/* ============================================================================
 * VERANLAGUNG — Zentrale Jahresveranlagung Steuern + SV (ADR-0002)
 * ============================================================================
 * Ein Assessment pro Jahr über ALLE tariflichen Einkünfte:
 *  - GRV: Kohortenanteil des Eintrittsjahres, Freibetrag als beim Eintritt
 *    EINGEFRORENER €-Betrag (behebt v6-Befund 6: Rentenerhöhungen sind voll
 *    steuerpflichtig).
 *  - VBL (beitragsfrei erworben, umlagefinanziert): Ertragsanteil nach Alter
 *    bei Bezugsbeginn (behebt v6-Befund 9).
 *  - Gemeinsames zvE → § 32a-Tarif → Soli.
 *  - KV/PV nach KVdR-Regeln (Freibetrag Versorgungsbezüge nur KV).
 * Kapitalerträge (Depot, Günstigerprüfung) docken in Schritt 3 an DIESES
 * Assessment an — nicht als separate Rechnung.
 * ========================================================================== */
'use strict';
globalThis.AVP = globalThis.AVP || {};

AVP.veranlagung = {
  /** Beim Renteneintritt einmalig fixierter Kontext. */
  eintrittskontext({ eintrittsjahr, drvJahrBruttoBeiEintritt, vblBeginnAlter }, p) {
    const anteil = AVP.grv.besteuerungsanteil(eintrittsjahr, p);
    return {
      eintrittsjahr,
      kohortenanteil: anteil,
      drvFreibetragEuro: drvJahrBruttoBeiEintritt * (1 - anteil),   // fixer €-Betrag
      ertragsanteilVbl: AVP.tax.ertragsanteil(vblBeginnAlter, p)
    };
  },

  /** Veranlagung eines Bezugsjahres. Beträge = Jahres-Brutto.
   *  Kapitalerträge docken hier an (ADR-0002): kapitalGewinnJahr ist der im
   *  Jahr realisierte Gewinn (Entnahme × Gewinnanteil). Ablauf:
   *  stpfl. Kapital = max(0, Gewinn × (1−Teilfreistellung) − Sparerpauschbetrag).
   *  Günstigerprüfung (§ 32d Abs. 6 EStG) ECHT über Tarifeinbezug:
   *  Kapital-ESt im Tarif = ESt(zvE + kapStpfl) − ESt(zvE); günstiger, wenn
   *  kleiner als kapStpfl × 25 %; Soli dann auf die Gesamt-ESt (Freigrenze). */
  jahr({ drvJahr, vblJahr, avdJahr = 0, kapitalGewinnJahr = 0, guenstig = false, ctx, kinderlos = true, saetze = null }, p) {
    const stpflDrv = Math.max(0, drvJahr - ctx.drvFreibetragEuro);
    const stpflVbl = vblJahr * ctx.ertragsanteilVbl;
    const stpflAvd = avdJahr;                                   // nachgelagert voll
    const zvE = Math.max(0, stpflDrv + stpflVbl + stpflAvd - p.steuer.wkRentner - p.steuer.saPauschbetrag);
    const estRenten = AVP.tax.est(zvE, p);

    const kapStpfl = Math.max(0,
      kapitalGewinnJahr * (1 - p.steuer.teilfreistellungAktienfonds) - p.steuer.sparerpauschbetrag);
    const abgeltungsatz = saetze && Number.isFinite(saetze.abgeltungsatz)
                        ? saetze.abgeltungsatz : p.steuer.abgeltungsatz;
    let est = estRenten, kapSteuer = 0, guenstigGenutzt = false;
    if (kapStpfl > 0) {
      const estMitKap = AVP.tax.est(zvE + kapStpfl, p);
      const kapImTarif = estMitKap - estRenten;
      const kapAbgeltung = kapStpfl * (abgeltungsatz / 1.055);   // Basissatz ohne Soli
      if (guenstig && kapImTarif < kapAbgeltung) {
        est = estMitKap; guenstigGenutzt = true;                 // Kapital im Tarif
      } else {
        kapSteuer = kapStpfl * abgeltungsatz;                    // inkl. Soli
      }
    }
    const soli = AVP.tax.soli(est, p);
    // AVD-Leistung: KVdR-beitragsfrei (Annahme wie Privatrenten, s. avd.js)
    const kv = AVP.sozial.kvMonat({ drvMo: drvJahr / 12, versorgungMo: vblJahr / 12 }, p, saetze) * 12;
    const pv = AVP.sozial.pvMonat({ drvMo: drvJahr / 12, versorgungMo: vblJahr / 12, kinderlos }, p, saetze) * 12;
    return { zvE, stpflDrv, stpflVbl, stpflAvd, kapStpfl, est, soli, kapSteuer, guenstigGenutzt, kv, pv,
             steuernGesamt: est + soli + kapSteuer,
             netto: drvJahr + vblJahr + avdJahr - est - soli - kapSteuer - kv - pv };
  }
};
