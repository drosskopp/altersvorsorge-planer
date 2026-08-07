/* ============================================================================
 * PARAMETER 2026 — Amtliche Rechengrößen für den Altersvorsorge-Planer
 * ============================================================================
 * Jede Zahl trägt Quelle und Gültigkeit. Dieses Objekt ist die einzige
 * Wahrheit; der Quellen-Tab im UI wird hieraus generiert (keine Doppelpflege).
 * Änderungen NUR mit Quellenangabe und Eintrag in CHANGELOG.md.
 * Jährliches Update: siehe CONTRIBUTING.md → "Parameterupdate-Checkliste".
 * ========================================================================== */
'use strict';
globalThis.AVP = globalThis.AVP || {};
AVP.params = AVP.params || {};

AVP.params[2026] = {
  meta: {
    jahr: 2026,
    stand: '2026-08-07',          // Datum der letzten fachlichen Prüfung
    gueltig_bis: '2026-12-31',    // danach zeigt das UI einen Update-Hinweis
    schema: 1
  },

  // ── Gesetzliche Rentenversicherung (GRV) ────────────────────────────────
  grv: {
    // Aktueller Rentenwert je Entgeltpunkt, §§ 68, 68a SGB VI.
    // Quelle: Rentenwertbestimmungsverordnung 2026 (Anpassung +4,24 % zum
    // 1.7.2026); Vorwert 40,79 € ab 1.7.2025. deutsche-rentenversicherung.de
    rentenwerte: [
      { ab: '2024-07-01', wert: 39.32 },   // RWBestV 2024, Anpassung +4,57 %
      { ab: '2025-07-01', wert: 40.79 },
      { ab: '2026-07-01', wert: 42.52 }
    ],
    // Vorläufiges Durchschnittsentgelt, Anlage 1 SGB VI / SV-Rechengrößen-
    // verordnung 2026. Quelle: bundesregierung.de (SVBezGrV 2026); 2025: 50.493 €.
    durchschnittsentgelt: 51944,
    // Beitragsbemessungsgrenze allgemeine RV, bundeseinheitlich.
    // Quelle: SV-Rechengrößenverordnung 2026 → max. ≈1,9521 EP/Jahr.
    bbgJahr: 101400,
    // Zugangsfaktor § 77 SGB VI: je Monat vorzeitig −0,003, je Monat
    // späterer Inanspruchnahme +0,005. Quelle: § 77 Abs. 2 SGB VI.
    zugangsfaktorProMonatFrueher: 0.003,
    zugangsfaktorProMonatSpaeter: 0.005,
    // Regelaltersgrenzen-Staffel §§ 35, 235 SGB VI (Jahrgangsstaffel bis 1963,
    // ab Jahrgang 1964: 67). Implementiert in domain/grv.js.
    // Besteuerungsanteil § 22 Nr. 1 S. 3 a) aa) EStG i. d. F. Wachstums-
    // chancengesetz: Kohorte 2023 = 82,5 %, +0,5 %-Pkt./Jahr, 100 % ab 2058.
    besteuerungsanteil: { basisJahr: 2023, basisAnteil: 0.825, schrittProJahr: 0.005, voll: 1.0 },
    // Rentenanpassung, offizielle Modellrechnung Rentenversicherungsbericht
    // (Szenario-Pfad; reale Anpassung wird jährlich festgesetzt):
    anpassungsPfadModell: { 2027: 0.0418, 2028: 0.0235, 2029: 0.0285, 2030: 0.0282 }
  },

  // ── Einkommensteuer ─────────────────────────────────────────────────────
  steuer: {
    // Tarif § 32a Abs. 1 EStG, Fassung ab VZ 2026 (Steuerfortentwicklungs-
    // gesetz, BGBl. 2024 I). Quelle: gesetze-im-internet.de/estg/__32a.html
    // zvE wird auf volle € abgerundet, Ergebnis auf volle € abgerundet.
    tarif: {
      gfb: 12348,
      zone2: { bis: 17799, a: 914.51, b: 1400 },              // (a·y + b)·y, y=(zvE−gfb)/10⁴
      zone3: { bis: 69878, a: 173.10, b: 2397, c: 1034.87 },  // (a·z + b)·z + c, z=(zvE−17799)/10⁴
      zone4: { bis: 277825, satz: 0.42, abzug: 11135.63 },
      zone5: { satz: 0.45, abzug: 19470.38 }
    },
    // Solidaritätszuschlag § 3, § 4 SolZG: 5,5 % der ESt, Freigrenze 2026
    // 20.350 € (Einzelveranlagung), Milderungszone 11,9 % des übersteigenden
    // Betrags. Quelle: SolZG i. d. F. StFeG; Rechner-Übereinstimmung 3 Quellen.
    soli: { satz: 0.055, freigrenze: 20350, milderung: 0.119 },
    // Pauschalen: Werbungskosten Rentner § 9a S. 1 Nr. 3 EStG; Sonderausgaben-
    // pauschbetrag § 10c EStG (unverändert seit Jahren).
    wkRentner: 102,
    saPauschbetrag: 36,
    // Kapitalerträge: Abgeltungsteuer § 32d EStG 25 % + 5,5 % Soli = 26,375 %;
    // Teilfreistellung Aktienfonds § 20 Abs. 1 Nr. 1 InvStG: 30 %;
    // Sparer-Pauschbetrag § 20 Abs. 9 EStG: 1.000 € (Einzelveranlagung).
    abgeltungsatz: 0.26375,
    teilfreistellungAktienfonds: 0.30,
    sparerpauschbetrag: 1000,
    // Vorabpauschale § 18 InvStG: Basiszins 2026 = 3,20 %.
    // Quelle: BMF-Schreiben v. 13.1.2026 (IV C 1 - S 1980/00230/012/001);
    // Basisertrag = Wert(1.1.) × Basiszins × 0,7; VAP ≤ Wertzuwachs, nie < 0.
    basiszinsVorabpauschale: 0.032,
    // Ertragsanteil § 22 Nr. 1 S. 3 a) bb) EStG (für VBL-Leistungen aus
    // individuell versteuerten Umlagen). Tabelle Rentenbeginn-Alter → Anteil:
    ertragsanteil: { 60: 0.22, 61: 0.22, 62: 0.21, 63: 0.20, 64: 0.19, 65: 0.18, 66: 0.18, 67: 0.17, 68: 0.16 }
  },

  // ── Sozialversicherung der Rentner ──────────────────────────────────────
  sozial: {
    // KV allgemeiner Beitragssatz § 241 SGB V: 14,6 %; durchschnittlicher
    // Zusatzbeitrag 2026: 2,9 % (BAnz-Bekanntmachung BMG). Rentner tragen auf
    // die GRV-Rente die Hälfte (§ 249a SGB V): 7,3 % + Zusatz/2.
    kvAllgemein: 0.146,
    kvZusatzDurchschnitt: 0.029,
    // Versorgungsbezüge (VBL/Betriebsrenten) § 229 SGB V: VOLLER Satz
    // (14,6 % + voller Zusatzbeitrag) auf den Teil über dem Freibetrag.
    // Freibetrag § 226 Abs. 2 S. 2 SGB V: 1/20 der Bezugsgröße = 197,75 €/Mo.
    // (2026); gilt NUR für KV, nicht PV; nur KVdR-Pflichtmitglieder
    // (BSG 5.11.2024, B 12 KR 9/23 R).
    freibetragVersorgungsbezuege: 197.75,
    // Pflegeversicherung § 55 SGB XI: 4,0 % allgemein, Zuschlag Kinderlose
    // +0,6 % = 4,6 %. Rentner tragen den vollen Satz allein.
    pvAllgemein: 0.040,
    pvZuschlagKinderlos: 0.006,
    // KVdR: Kapitalerträge/Depotentnahmen, Mieten und Privatrenten sind für
    // Pflichtmitglieder BEITRAGSFREI (§§ 226, 229 SGB V) — kein Parameter,
    // aber die zentrale Modellaussage; Rechtsänderung als Szenario vorgesehen.
  },

  // ── VBLklassik (Zusatzversorgung öffentlicher Dienst) ───────────────────
  vbl: {
    // Punktemodell § 8 ATV / § 35 f. VBL-Satzung:
    messbetrag: 4.00,          // €/Versorgungspunkt, statisch seit 2002
    referenzentgelt: 1000,     // € — VP = zv-Entgelt/1000 × Altersfaktor
    // Altersfaktor-Tabelle § 8 Abs. 3 ATV: degressiv 3,1 (17 J.) … 0,4 (ab 56).
    // Vollständige Tabelle wird erst für Status "pflichtversichert" benötigt
    // (Zuwachsrechnung) und dann aus der VBL-Satzung nachgetragen — KEINE
    // geratenen Zwischenwerte in diesem File.
    altersfaktorTabelle: null, // TODO(pflichtversichert): § 8 Abs. 3 ATV
    // Abschlag bei vorzeitigem GRV-Bezug § 35 Abs. 3 VBL-Satzung:
    abschlagProMonat: 0.003,
    abschlagMax: 0.108,
    // Anpassung laufender Betriebsrenten § 39 VBL-Satzung: +1 %/Jahr zum 1.7.
    // Anwartschaften (auch beitragsfrei gestellte) werden NICHT dynamisiert.
    anpassungImBezug: 0.01
  }
};

// ── Modellannahmen (KEINE Gesetzeswerte — bewusst getrennt) ───────────────
AVP.annahmen = AVP.annahmen || {};
AVP.annahmen.standard = {
  // Anteil des Gewinns am Entnahmebetrag bei langfristiger Anlage; wird in
  // späteren Schritten durch echtes Einstands-Tracking je Tranche ersetzt.
  gewinnanteilEntnahme: 0.70
};
