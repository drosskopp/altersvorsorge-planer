/* ============================================================================
 * PFADE — Zeitreihen-Helfer (ADR-0003: alles Veränderliche ist ein Pfad)
 * ============================================================================
 * Ein Pfad ist f(jahrIndex) → Rate, Index 0 = Basisjahr des Parameterobjekts.
 * ========================================================================== */
'use strict';
globalThis.AVP = globalThis.AVP || {};

AVP.pfade = {
  /** Konstante Rate für alle Jahre. */
  konstant(rate) { return () => rate; },

  /** Rentenanpassung: nutzt die amtliche Modellrechnung aus p (2027–2030),
   *  danach die übergebene Langfrist-Annahme. */
  rentenanpassungModell(p, langfrist) {
    return (i) => {
      const jahr = p.meta.jahr + i;
      const modell = p.grv.anpassungsPfadModell;
      return (modell && jahr in modell) ? modell[jahr] : langfrist;
    };
  },

  /** Rentenniveau-Risiko: ab 2032 Malus (Default 0,5 %-Pkt.) auf die Anpassung
   *  (Nachhaltigkeitsfaktor nach Ende der Haltelinie; Recherchebericht D). */
  mitRentenniveauMalus(basisPfad, p, malus = 0.005, abJahr = 2032) {
    return (i) => basisPfad(i) - (p.meta.jahr + i >= abJahr ? malus : 0);
  },

  /** GKV/PV-Beitragspfad (IGES/DAK-Projektion, Recherchebericht D):
   *  'konstant' | 'basis' (GKV 17,5→20,0 %, PV 4,0→4,5 % bis 2035)
   *  | 'unguenstig' (22,6 % / 5,2 %). Linear interpoliert, danach konstant.
   *  Liefert f(i) → { kvZusatz, pvAllgemein } (KV-Allgemeinsatz 14,6 % fix). */
  gkvPfad(szenario, p) {
    const ziel = szenario === 'basis' ? { gkv: 0.200, pv: 0.045 }
               : szenario === 'unguenstig' ? { gkv: 0.226, pv: 0.052 } : null;
    if (!ziel) return () => null;
    const startZusatz = p.sozial.kvZusatzDurchschnitt;            // 2026: 2,9 %
    const zielZusatz = ziel.gkv - p.sozial.kvAllgemein;
    const startPv = p.sozial.pvAllgemein, zielPv = ziel.pv;
    const jahre = 2035 - p.meta.jahr;                             // 9 Schritte
    return (i) => {
      const t = Math.min(1, Math.max(0, i / jahre));
      return { kvZusatz: startZusatz + (zielZusatz - startZusatz) * t,
               pvAllgemein: startPv + (zielPv - startPv) * t };
    };
  }
};
