/* ============================================================================
 * GRV — Gesetzliche Rentenversicherung: reine Rechenfunktionen
 * ============================================================================
 * Alle Funktionen sind zustandslos und nehmen das Parameterobjekt `p`
 * (AVP.params[jahr]) als Argument — testbar in Node und Browser identisch.
 * Rechtsgrundlagen: §§ 35, 63, 64, 68, 70, 77, 235 SGB VI; § 22 EStG.
 * ========================================================================== */
'use strict';
globalThis.AVP = globalThis.AVP || {};

AVP.grv = {
  /** Entgeltpunkte für ein Kalenderjahr: min(brutto, BBG) / Durchschnittsentgelt.
   *  § 63 Abs. 2, § 70 Abs. 1 SGB VI — Einkommen über der BBG erzeugt keine Punkte. */
  entgeltpunkteProJahr(bruttoJahr, p) {
    if (bruttoJahr <= 0) return 0;
    return Math.min(bruttoJahr, p.grv.bbgJahr) / p.grv.durchschnittsentgelt;
  },

  /** Maximal erreichbare Entgeltpunkte im Parameterjahr (BBG/AVG). */
  maxEntgeltpunkte(p) {
    return p.grv.bbgJahr / p.grv.durchschnittsentgelt;
  },

  /** Jährlicher Punkteverlust bei Teilzeit mit Gehaltsanteil `anteil` (z. B. 0,5).
   *  Korrekt gegen v6: BEIDE Seiten werden an der BBG gekappt — der Verlust ist
   *  EP(gekappt, voll) − EP(gekappt, teilzeit), NICHT EP(ungekappt)/2. */
  teilzeitPunkteverlustProJahr(bruttoVollJahr, anteil, p) {
    return this.entgeltpunkteProJahr(bruttoVollJahr, p)
         - this.entgeltpunkteProJahr(bruttoVollJahr * anteil, p);
  },

  /** Regelaltersgrenze nach Geburtsjahr, §§ 35, 235 SGB VI.
   *  Rückgabe in Monaten ab Geburt (z. B. 67 Jahre → 804). */
  regelaltersgrenzeMonate(geburtsjahr) {
    if (geburtsjahr < 1947) return 65 * 12;
    if (geburtsjahr <= 1958) return 65 * 12 + (geburtsjahr - 1946);       // +1 Mon./Jahrgang
    if (geburtsjahr <= 1963) return 66 * 12 + (geburtsjahr - 1958) * 2;   // +2 Mon./Jahrgang
    return 67 * 12;
  },

  /** Zugangsfaktor § 77 SGB VI aus der Abweichung des Rentenbeginns von der
   *  Regelaltersgrenze in Monaten (positiv = vorzeitig, negativ = später).
   *  Frühestmöglicher Beginn (i. d. R. 63) wird HIER nicht begrenzt — das
   *  prüft die aufrufende Szenario-Validierung. */
  zugangsfaktor(monateVorRegelgrenze, p) {
    if (monateVorRegelgrenze > 0) return 1 - monateVorRegelgrenze * p.grv.zugangsfaktorProMonatFrueher;
    return 1 + (-monateVorRegelgrenze) * p.grv.zugangsfaktorProMonatSpaeter;
  },

  /** Monatliche Bruttorente aus Entgeltpunkten (Rentenartfaktor Altersrente = 1). */
  monatsrente(entgeltpunkte, zugangsfaktor, rentenwert) {
    return entgeltpunkte * zugangsfaktor * rentenwert;
  },

  /** Aktueller Rentenwert zu einem ISO-Datum aus der Wertehistorie in `p`. */
  rentenwertAm(isoDatum, p) {
    let wert = null;
    for (const eintrag of p.grv.rentenwerte) {
      if (isoDatum >= eintrag.ab) wert = eintrag.wert;
    }
    if (wert === null) throw new Error(`Kein Rentenwert für ${isoDatum} hinterlegt`);
    return wert;
  },

  /** Besteuerungsanteil der GRV-Rente nach Renteneintrittsjahr (Kohortenprinzip,
   *  § 22 Nr. 1 S. 3 a) aa) EStG i. d. F. WachstumschancenG).
   *  2005: 50 %, +2 %-Pkt./J. bis 2020 (80 %), 2021: 81 %, 2022: 82 %,
   *  ab 2023: 82,5 % + 0,5 %-Pkt./J., 100 % ab Kohorte 2058. */
  besteuerungsanteil(eintrittsjahr, p) {
    const k = p.grv.besteuerungsanteil;
    if (eintrittsjahr <= 2005) return 0.50;
    if (eintrittsjahr <= 2020) return 0.50 + (eintrittsjahr - 2005) * 0.02;
    if (eintrittsjahr === 2021) return 0.81;
    if (eintrittsjahr === 2022) return 0.82;
    return Math.min(k.voll, k.basisAnteil + (eintrittsjahr - k.basisJahr) * k.schrittProJahr);
  }
};
