/* ============================================================================
 * ZIEL — Zielrente: konstantes reales Netto-Gesamteinkommen bis Alter Y
 * ============================================================================
 * Frage: "Wie hoch kann mein reales Netto/Mo. sein, wenn das Depot bis zum
 * Zielalter planmaessig verbraucht wird?" Zwei Schichten, beide OHNE eigene
 * Steuerlogik (nutzen die komplette App-Kette als Blackbox, ADR-0002):
 *  1. loeseEntnahmePfad(Z): Fixpunkt-Iteration — Entnahme je Jahr fuellt die
 *     Luecke zwischen Renten-Netto und Ziel; Daempfung 1/(1−0,15) gegen die
 *     Grenzlast der Kapitalertragsteuer. Konvergiert in 3–6 Laeufen < 0,5 €.
 *  2. maxZielrente(): Bisektion ueber Z; machbar = jedes Bezugsjahr vor Y
 *     erreicht das Ziel (Depot wurde nie gekappt). Ergebnis: hoechstes Z,
 *     Depot bei Y ~ 0.
 * Entnahmepfad als ARRAY (€/Mo. nominal je Jahresindex) — strukturiert
 * klonbar, damit Monte-Carlo denselben PLAN unter Zufallsmaerkten stresst.
 * ========================================================================== */
'use strict';
globalThis.AVP = globalThis.AVP || {};

AVP.ziel = {
  ITER_MAX: 12, TOL_EURO_MO: 0.5,

  /** Entnahmepfad fuer festes Ziel Z (€/Mo. real). */
  loeseEntnahmePfad(e, p, zielMoReal) {
    // Y defensiv auf das Betrachtungsende kappen: "Depot bis Y verbrauchen"
    // ist jenseits von endAlter unbeobachtbar und wuerde die Bisektion sonst
    // das Depot bis zum Horizont leeren lassen.
    const basis = Object.assign({}, e, { modus: 'ziel',
      zielAlter: Math.min(e.zielAlter, e.endAlter) });
    let erg = AVP.app.berechne(Object.assign({}, basis, { entnahmePfadJahrMo: [] }), p);
    const n = erg.jahre.length;
    let pfad = new Array(n).fill(0);
    let maxFehler = Infinity, konvergiert = false;
    for (let it = 0; it < this.ITER_MAX; it++) {
      maxFehler = 0;
      const neu = pfad.slice();
      for (let i = 0; i < n; i++) {
        const j = erg.jahre[i];
        if (!j.imBezug || j.alter >= basis.zielAlter) { neu[i] = 0; continue; }
        const zielNomMo = zielMoReal * Math.pow(1 + basis.inflation, i);
        const fehlerMo = zielNomMo - j.nettoMoNominal;
        if (Math.abs(fehlerMo) > maxFehler) maxFehler = Math.abs(fehlerMo);
        // Ungedaempfte Korrektur: Steuer-Grenzlast wird unterschaetzt ⇒ die
        // Folge-Iteration fuellt monoton nach — stabil auch an Knickstellen
        // (Guenstiger-Kipppunkt, GKV-Pfad, Sparerpauschbetrag).
        neu[i] = Math.max(0, pfad[i] + fehlerMo);
      }
      pfad = neu;
      erg = AVP.app.berechne(Object.assign({}, basis, { entnahmePfadJahrMo: pfad }), p);
      if (maxFehler < this.TOL_EURO_MO) { konvergiert = true; break; }
    }
    // Machbarkeit: Das Ziel muss in JEDEM Bezugsjahr vor Y erreicht werden
    // (±6 € Netz gegen Konvergenzversagen — machbare Z konvergieren < 0,5 €,
    // unmachbare reissen um Groessenordnungen mehr) — ohne Depot-Ausnahme. Ein
    // leeres Depot, das ein Jahr unterversorgt, IST die Unmachbarkeit; im
    // letzten Jahr geht das Depot bei maximalem Z von selbst gegen 0, waehrend
    // das Ziel noch erfuellt ist. So kann die Bisektion nicht in einen
    // "Kollaps des letzten Jahres" hineinoptimieren.
    const machbar = erg.jahre.every((j, i) => {
      if (!j.imBezug || j.alter >= basis.zielAlter) return true;
      const zielNomMo = zielMoReal * Math.pow(1 + basis.inflation, i);
      return j.nettoMoNominal >= zielNomMo - 6;
    });
    return { pfad, erg, konvergiert, machbar };
  },

  /** Hoechstes konstantes reales Netto bis zielAlter (Depot dann verbraucht). */
  maxZielrente(e, p) {
    e = Object.assign({}, e, { zielAlter: Math.min(e.zielAlter, e.endAlter) });
    let lo = 0, hi = 2000, probe = this.loeseEntnahmePfad(e, p, hi);
    for (let k = 0; k < 12 && probe.machbar; k++) { lo = hi; hi *= 2; probe = this.loeseEntnahmePfad(e, p, hi); }
    for (let k = 0; k < 30; k++) {
      const mitte = (lo + hi) / 2;
      probe = this.loeseEntnahmePfad(e, p, mitte);
      if (probe.machbar) lo = mitte; else hi = mitte;
      if (hi - lo < 0.25) break;
    }
    const loesung = this.loeseEntnahmePfad(e, p, lo);
    const letztes = loesung.erg.jahre.filter(j => j.imBezug && j.alter < e.zielAlter);
    return {
      zielMoReal: lo, pfad: loesung.pfad, erg: loesung.erg,
      entnahmeMoErstesJahr: letztes.length ? loesung.pfad[loesung.erg.jahre.indexOf(letztes[0])] : 0,
      entnahmeMoLetztesJahr: letztes.length ? loesung.pfad[loesung.erg.jahre.indexOf(letztes[letztes.length - 1])] : 0,
      depotBeiY: (loesung.erg.jahre.find(j => j.alter === e.zielAlter - 1) || { depotEnde: 0 }).depotEnde
    };
  }
};
