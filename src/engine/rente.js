/* ============================================================================
 * RENTE — Projektion GRV + VBL vom Heute bis in den Bezug
 * ============================================================================
 * Setzt Rentenmodul-Analyse Abschnitt 3–5 um:
 *  - Input aus der jährlichen Renteninformation: erreichte Anwartschaft [€/Mo.]
 *    + Ausstellungsstand → Rückrechnung in Entgeltpunkte über den damals
 *    gültigen Rentenwert (NICHT die DRV-Hochrechnung; die dient als manueller
 *    Validierungsanker, siehe CONTRIBUTING).
 *  - Monatsgenaue EP-Akkumulation (ADR-0009) mit BBG-Kappung je Phase.
 *  - Zugangsfaktor aus Eintrittsalter vs. Regelaltersgrenze (§§ 77, 235 SGB VI).
 *  - Rentenwert als Pfad (ADR-0003): heutige Werte / nominal / real konsequent
 *    getrennt — behebt v6-Befund 1 (Real/Nominal-Bruch).
 *  - VBL: beitragsfrei gestellter Bestand, Anwartschaft nominal eingefroren,
 *    Abschlag an GRV-Vorzeitigkeit gekoppelt, +1 %/J. erst im Bezug.
 * ========================================================================== */
'use strict';
globalThis.AVP = globalThis.AVP || {};

AVP.rente = {
  /** Nachbau der DRV-Hochrechnung ("Garantiert erreichbar" im Rentenportal):
   *  Vollzeit mit aktuellem Brutto vom Anwartschaftsstand bis zum regulaeren
   *  Beginn (Folgemonat der Regelaltersgrenze), OHNE Anpassungen, bewertet mit
   *  dem Rentenwert ZUM ANWARTSCHAFTSSTAND — exakt die DRV-Konvention. Die DRV
   *  nutzt den 5-Jahres-EP-Schnitt statt des aktuellen Bruttos; Abweichungen
   *  von wenigen Prozent sind daher normal (±2 %-Anker, CONTRIBUTING). */
  hochrechnungsNachbau({ anwartschaftMo, anwartschaftStand, bruttoJahr, gebMonat }, p) {
    const geburtsjahr = +gebMonat.slice(0, 4);
    const ragMonate = AVP.grv.regelaltersgrenzeMonate(geburtsjahr);
    const g = gebMonat.split('-');
    const beginnTotal = (+g[0]) * 12 + (+g[1] - 1) + ragMonate + 1;   // Folgemonat
    const s = anwartschaftStand.split('-');
    const standTotal = (+s[0]) * 12 + (+s[1] - 1);
    const restMonate = Math.max(0, beginnTotal - standTotal);
    const rwStand = AVP.grv.rentenwertAm(anwartschaftStand, p);
    const ep = anwartschaftMo / rwStand
             + restMonate * AVP.grv.entgeltpunkteProJahr(bruttoJahr, p) / 12;
    return { nachbauMo: ep * rwStand, ep, restMonate, rwStand };
  },

  /** Monate zwischen zwei ISO-Daten (YYYY-MM[-DD]), Taggenauigkeit bewusst ignoriert. */
  monateZwischen(vonIso, bisIso) {
    const v = vonIso.split('-'), b = bisIso.split('-');
    return (+b[0] - +v[0]) * 12 + (+b[1] - +v[1]);
  },

  /** Erreichte Entgeltpunkte aus der Renteninformation:
   *  Anwartschaft [€/Mo.] ÷ Rentenwert zum Ausstellungsstand. */
  epAusAnwartschaft(anwartschaftMo, standIso, p) {
    return anwartschaftMo / AVP.grv.rentenwertAm(standIso, p);
  },

  /** Projektion. szenario:
   *  { geburtsjahr, startAlterMonate, bruttoJahr, teilzeitAnteil,
   *    redAlterMonate, retAlterMonate, endAlterJahre,
   *    grv: { anwartschaftMo, anwartschaftStand },
   *    vbl: { bestandMo, status: 'beitragsfrei' } }
   *  pfade: { rentenanpassung: f(jahrIndex)→rate, inflation: f(jahrIndex)→rate }
   *  Rückgabe: Kennzahlen bei Eintritt + Jahresreihe (nominal/real/heutigeWerte). */
  projektion(szenario, pfade, p) {
    const s = szenario;
    if (s.vbl && s.vbl.status && s.vbl.status !== 'beitragsfrei') {
      throw new Error('VBL-Status "' + s.vbl.status + '" noch nicht implementiert (Altersfaktor-Tabelle fehlt, s. params)');
    }
    const ragMonate = AVP.grv.regelaltersgrenzeMonate(s.geburtsjahr);
    // Konvention (monatsgranular, Tag unbekannt): Die Regelaltersrente beginnt
    // fruehestens im Folgemonat des Erreichens der Regelaltersgrenze — dieser
    // Beginn traegt ZF 1,0. Abschlag je Monat FRUEHER (−0,3 %), Zuschlag erst
    // je Monat NACH dem regulaeren Beginn (+0,5 %), § 77 SGB VI.
    const abschlagMonate = Math.max(0, ragMonate - s.retAlterMonate);
    const zuschlagMonate = Math.max(0, s.retAlterMonate - ragMonate - 1);
    const monateVor = abschlagMonate;                            // >0 = vorzeitig
    const zf = 1 - abschlagMonate * p.grv.zugangsfaktorProMonatFrueher
                 + zuschlagMonate * p.grv.zugangsfaktorProMonatSpaeter;
    const vblFaktor = AVP.vbl.abschlagsfaktor(abschlagMonate, p);

    // Vorlaufmonate: Liegt der Stand der Renteninformation zurueck, werden die
    // Monate bis zum Parameterstand mit dem aktuellen Brutto als VOLLZEIT
    // aufgefuellt (Annahme; im UI dokumentiert).
    const vorlaufMonate = Math.max(0, this.monateZwischen(s.grv.anwartschaftStand, p.meta.stand));
    const epStart = this.epAusAnwartschaft(s.grv.anwartschaftMo, s.grv.anwartschaftStand, p)
                  + vorlaufMonate * (AVP.grv.entgeltpunkteProJahr(s.bruttoJahr, p) / 12);
    const epVollMo = AVP.grv.entgeltpunkteProJahr(s.bruttoJahr, p) / 12;
    const epTeilMo = AVP.grv.entgeltpunkteProJahr(s.bruttoJahr * s.teilzeitAnteil, p) / 12;

    const rwHeute = AVP.grv.rentenwertAm(p.meta.stand, p);
    const eintrittsjahr = p.meta.jahr + Math.floor((s.retAlterMonate - s.startAlterMonate) / 12);

    // Monatsgenaue EP-Akkumulation bis zum Eintritt
    let ep = epStart;
    for (let m = s.startAlterMonate; m < s.retAlterMonate; m++) {
      if (m < s.redAlterMonate) ep += epVollMo;
      else ep += epTeilMo;
    }
    const epBeiEintritt = ep;

    // Jahresreihe: Index 0 = Basisjahr (p.meta.jahr)
    const jahre = [];
    let rwNominalFaktor = 1, inflFaktor = 1, vblBezugsFaktor = 1;
    const endIdx = s.endAlterJahre - Math.floor(s.startAlterMonate / 12);
    let epLauf = epStart;
    for (let i = 0; i <= endIdx; i++) {
      const jahr = p.meta.jahr + i;
      const alterMonateEnde = s.startAlterMonate + (i + 1) * 12;
      if (i > 0) {
        rwNominalFaktor *= 1 + pfade.rentenanpassung(i);
        inflFaktor *= 1 + pfade.inflation(i);
        if (jahr > eintrittsjahr) vblBezugsFaktor *= 1 + p.vbl.anpassungImBezug;
      }
      // EP-Zuwachs dieses Jahres (monatsgenau, nur bis Eintritt)
      for (let m = alterMonateEnde - 12; m < alterMonateEnde; m++) {
        if (m >= s.retAlterMonate) break;
        epLauf += m < s.redAlterMonate ? epVollMo : epTeilMo;
      }
      const imBezug = jahr >= eintrittsjahr;
      const drvMoNominal = imBezug ? epBeiEintritt * zf * rwHeute * rwNominalFaktor : 0;
      const vblMoNominal = imBezug ? s.vbl.bestandMo * vblFaktor * vblBezugsFaktor : 0;
      jahre.push({
        jahr, imBezug,
        phase: !imBezug ? (alterMonateEnde <= s.redAlterMonate ? 'vollzeit'
              : (s.startAlterMonate + i * 12) >= s.retAlterMonate ? 'rente' : 'teilzeit') : 'rente',
        epStand: Math.min(epLauf, epBeiEintritt),
        drvMoNominal, drvMoReal: drvMoNominal / inflFaktor,
        vblMoNominal, vblMoReal: vblMoNominal / inflFaktor,
        inflFaktor, rwNominal: rwHeute * rwNominalFaktor
      });
    }

    return {
      regelaltersgrenzeMonate: ragMonate,
      monateVorRegelgrenze: monateVor,
      zugangsfaktor: zf,
      vblAbschlagsfaktor: vblFaktor,
      epStart, epBeiEintritt, eintrittsjahr, vorlaufMonate,
      // Sichten bei Eintritt: heutige Werte (RW heute), nominal, real
      drvMoHeutigeWerte: epBeiEintritt * zf * rwHeute,
      vblMoHeutigeWerte: s.vbl.bestandMo * vblFaktor,
      jahre
    };
  }
};
