/* ============================================================================
 * APP — Gesamtberechnung (DOM-frei) für die Planer-Oberfläche
 * ============================================================================
 * berechne(eingaben, p) verbindet Rentenprojektion, Depot-Simulation und die
 * zentrale Jahresveranlagung zu einer Jahresreihe. Bewusst OHNE DOM-Zugriff,
 * damit die komplette UI-Rechenkette in Node testbar bleibt; nur das Auslesen
 * der Formularfelder und das Rendern (ui-Teil in der Shell) berühren das DOM.
 * ========================================================================== */
'use strict';
globalThis.AVP = globalThis.AVP || {};

AVP.app = {
  /** eingaben: { geburtsjahr, alterHeute, bruttoJahr, teilzeitAnteil,
   *   redAlter, retAlter, endAlter, anwartschaftMo, anwartschaftStand,
   *   vblBestandMo, depotStart, sparVollMo, sparTeilMo,
   *   renditeNominal, inflation, rentenanpassung, nutzeModellpfad,
   *   modus ('swr'|'infl'|'ann'), entnahmerate, zielAlter,
   *   guenstig, kinderlos } */
  berechne(e, p) {
    // Monatsgenaue Overrides (beta.2): UI liefert startAlterMonate aus dem
    // Geburtsmonat und retAlterMonate aus "Jahre + Monate"; die alten
    // Jahres-Felder bleiben als Fallback fuer Tests/ALT-Aufrufer gueltig.
    const startAlterMonate = Number.isFinite(e.startAlterMonate) ? e.startAlterMonate : e.alterHeute * 12;
    const retAlterMonate = Number.isFinite(e.retAlterMonate) ? e.retAlterMonate : e.retAlter * 12;
    const szenario = {
      geburtsjahr: e.geburtsjahr, startAlterMonate,
      bruttoJahr: e.bruttoJahr, teilzeitAnteil: e.teilzeitAnteil,
      redAlterMonate: e.redAlter * 12, retAlterMonate: retAlterMonate,
      endAlterJahre: e.endAlter,
      grv: { anwartschaftMo: e.anwartschaftMo, anwartschaftStand: e.anwartschaftStand },
      vbl: { bestandMo: e.vblBestandMo, status: 'beitragsfrei' }
    };
    let anpassung = e.nutzeModellpfad
        ? AVP.pfade.rentenanpassungModell(p, e.rentenanpassung)
        : AVP.pfade.konstant(e.rentenanpassung);
    if (e.rentenniveauRisiko) anpassung = AVP.pfade.mitRentenniveauMalus(anpassung, p);
    const pfade = { rentenanpassung: anpassung, inflation: AVP.pfade.konstant(e.inflation) };
    const gkv = AVP.pfade.gkvPfad(e.gkvSzenario || 'konstant', p);
    const abgeltungsatz = e.abgeltungSzenario === '30'
      ? 0.30 * 1.055 : p.steuer.abgeltungsatz;
    const rp = AVP.rente.projektion(szenario, pfade, p);

    const dep = AVP.depot.simulation({
      startDepot: e.depotStart, sparVollMo: e.sparVollMo, sparTeilMo: e.sparTeilMo,
      redAlterMonate: szenario.redAlterMonate, retAlterMonate: szenario.retAlterMonate,
      startAlterMonate: startAlterMonate,
      endAlterMonate: e.endAlter * 12 + 12,
      renditeNominal: e.renditeNominal, renditePfad: e.renditePfad,
      inflation: e.inflation,
      modus: e.modus, entnahmerate: e.entnahmerate,
      zielAlterMonate: e.zielAlter * 12,
      switchAlterMonate: (e.switchAlter || 0) * 12
    });

    // AVD-Topf (ab 2027), gleiche Rendite wie das Depot
    const renditePfadJahr = typeof e.renditePfad === 'function'
      ? e.renditePfad : AVP.pfade.konstant(e.renditeNominal);
    const retJahrIdx = Math.floor((retAlterMonate - startAlterMonate) / 12);
    const avd = e.avdAktiv ? AVP.avd.simulation({
      beitragMo: Math.min(150, e.avdBeitragMo || 0),
      startJahrIdx: Math.max(0, 2027 - p.meta.jahr),
      retJahrIdx, endJahrIdx: e.endAlter - Math.floor(startAlterMonate / 12),
      renditePfad: renditePfadJahr
    }) : null;

    // Eintrittskontext aus der NOMINALEN Rente des Eintrittsjahres (Freibetrag-
    // Einfrierung auf tatsächliche €-Beträge, s. Rentenmodul-Analyse Befund 6)
    const eintritt = rp.jahre.find(j => j.jahr === rp.eintrittsjahr);
    const ctx = AVP.veranlagung.eintrittskontext({
      eintrittsjahr: rp.eintrittsjahr,
      drvJahrBruttoBeiEintritt: eintritt.drvMoNominal * 12,
      vblBeginnAlter: Math.floor(retAlterMonate / 12)
    }, p);

    // Jahresreihe zusammenführen
    const jahre = rp.jahre.map((j, i) => {
      const alter = e.alterHeute + i;
      // Entnahme-Summe des Jahres aus der Monatsreihe
      let entnahmeJahr = 0, depotEnde = 0;
      for (const mrow of dep.reihe) {
        const jIdx = Math.floor((mrow.alterMonate - startAlterMonate) / 12);
        if (jIdx === i) { entnahmeJahr += mrow.entnahmeMo; depotEnde = mrow.depot; }
      }
      let abz = null, nettoJahrNom = null;
      const avdJahr = avd ? avd.renteAbRet[i] || 0 : 0;
      if (j.imBezug) {
        abz = AVP.veranlagung.jahr({
          drvJahr: j.drvMoNominal * 12, vblJahr: j.vblMoNominal * 12,
          avdJahr,
          kapitalGewinnJahr: entnahmeJahr * AVP.annahmen.standard.gewinnanteilEntnahme,
          guenstig: e.guenstig, ctx, kinderlos: e.kinderlos,
          saetze: { abgeltungsatz, ...(gkv(i) || {}) }
        }, p);
        // Netto = Renten + AVD + Entnahme brutto − alle Steuern − KV − PV
        nettoJahrNom = (j.drvMoNominal + j.vblMoNominal) * 12 + avdJahr + entnahmeJahr
                     - abz.steuernGesamt - abz.kv - abz.pv;
      }
      return {
        jahr: j.jahr, alter, phase: j.phase, imBezug: j.imBezug,
        depotEnde, entnahmeJahr, avdMoNominal: avdJahr / 12,
        avdTopf: avd ? avd.topfProJahr[i] || 0 : 0,
        drvMoNominal: j.drvMoNominal, drvMoReal: j.drvMoReal,
        vblMoNominal: j.vblMoNominal, vblMoReal: j.vblMoReal,
        nettoMoNominal: j.imBezug ? nettoJahrNom / 12 : null,
        nettoMoReal: j.imBezug ? nettoJahrNom / 12 / j.inflFaktor : null,
        inflFaktor: j.inflFaktor, abz
      };
    });

    const ersterBezug = jahre.find(j => j.imBezug);
    const nachbau = AVP.rente.hochrechnungsNachbau({
      anwartschaftMo: e.anwartschaftMo, anwartschaftStand: e.anwartschaftStand,
      bruttoJahr: e.bruttoJahr, gebMonat: e.gebMonat || (e.geburtsjahr + '-06')
    }, p);
    return {
      rente: rp, depot: dep, avd, ctx, jahre, nachbau,
      kennzahlen: {
        epBeiEintritt: rp.epBeiEintritt,
        zugangsfaktor: rp.zugangsfaktor,
        eintrittsjahr: rp.eintrittsjahr,
        drvMoHeutigeWerte: rp.drvMoHeutigeWerte,
        vblMoHeutigeWerte: rp.vblMoHeutigeWerte,
        depotBeiEintritt: dep.depotBeiRet,
        entnahmeStartMo: dep.entnahmeStartMo,
        nettoMoRealBeiEintritt: ersterBezug ? ersterBezug.nettoMoReal : null,
        nettoMoNominalBeiEintritt: ersterBezug ? ersterBezug.nettoMoNominal : null,
        avdRenteMo: avd ? avd.avdRenteJahrBeiEintritt / 12 : 0,
        hochrechnungsNachbauMo: nachbau.nachbauMo
      }
    };
  },

  /** Kaufkraft-Vergleich (v6-Feature): drei Entnahmestrategien parallel auf
   *  identischen Annahmen — Rueckgabe je Strategie die Netto-real-Zeitreihe. */
  kaufkraftVergleich(e, p) {
    const laeufe = {};
    for (const modus of ['swr', 'infl', 'ann']) {
      const erg = this.berechne(Object.assign({}, e, { modus }), p);
      laeufe[modus] = erg.jahre.map(j => ({ alter: j.alter, imBezug: j.imBezug,
                                            nettoMoReal: j.nettoMoReal }));
    }
    return laeufe;
  }
};
