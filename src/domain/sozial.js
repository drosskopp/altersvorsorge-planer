/* ============================================================================
 * SOZIAL — KV/PV der Rentner (KVdR)
 * ============================================================================
 * KV auf GRV-Rente: halber allgemeiner Satz + halber Zusatzbeitrag (§ 249a
 * SGB V). KV auf Versorgungsbezüge (VBL): VOLLER Satz auf den Teil über dem
 * Freibetrag (§§ 226, 229, 248 SGB V) — Freibetrag gilt nur für KV, nicht PV.
 * PV: voller Satz (+ Kinderlosen-Zuschlag), Rentner tragen allein (§ 59 SGB XI).
 * Depot-Entnahmen/Kapitalerträge: für KVdR-Pflichtmitglieder beitragsfrei.
 * ========================================================================== */
'use strict';
globalThis.AVP = globalThis.AVP || {};

AVP.sozial = {
  /** ov = optionale Satz-Overrides { kvZusatz, pvAllgemein } aus Szenario-Pfaden. */
  kvSatzRente(p, ov)      { const z = ov && Number.isFinite(ov.kvZusatz) ? ov.kvZusatz : p.sozial.kvZusatzDurchschnitt; return p.sozial.kvAllgemein / 2 + z / 2; },
  kvSatzVersorgung(p, ov) { const z = ov && Number.isFinite(ov.kvZusatz) ? ov.kvZusatz : p.sozial.kvZusatzDurchschnitt; return p.sozial.kvAllgemein + z; },
  pvSatz(kinderlos, p, ov){ const a = ov && Number.isFinite(ov.pvAllgemein) ? ov.pvAllgemein : p.sozial.pvAllgemein; return a + (kinderlos ? p.sozial.pvZuschlagKinderlos : 0); },

  /** Monatlicher KV-Beitrag in der KVdR. */
  kvMonat({ drvMo = 0, versorgungMo = 0 }, p, ov) {
    const vblPflichtig = Math.max(0, versorgungMo - p.sozial.freibetragVersorgungsbezuege);
    return drvMo * this.kvSatzRente(p, ov) + vblPflichtig * this.kvSatzVersorgung(p, ov);
  },

  /** Monatlicher PV-Beitrag: GRV + Versorgungsbezüge voll, KEIN Freibetrag. */
  pvMonat({ drvMo = 0, versorgungMo = 0, kinderlos = true }, p, ov) {
    return (drvMo + versorgungMo) * this.pvSatz(kinderlos, p, ov);
  }
};
