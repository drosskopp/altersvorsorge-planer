/* ============================================================================
 * STORAGE — Optionales Speichern der Eingaben im Browser (Opt-in)
 * ============================================================================
 * Mechanismus: localStorage, NICHT Cookies. Begründung (ADR-0011): Cookies
 * werden bei jedem HTTP-Request an den Server übertragen — auf GitHub Pages
 * landeten die Finanz-Eingaben damit in fremden Server-Logs und das Privacy-
 * Versprechen "keine Daten verlassen dein Gerät" wäre gebrochen. localStorage
 * verlässt den Browser nie und erzeugt keinerlei Requests (check-privacy
 * bleibt gültig).
 *
 * Design: explizites Opt-in per Button, sichtbarer Löschen-Button, Meldung
 * beim Wiederherstellen. Payload trägt eine Schema-Version — ändert sich das
 * Eingabemodell (Schritte 2–4), wird ein alter Stand sauber als 'schema'
 * abgelehnt statt still falsch geladen.
 *
 * Das Backend (localStorage) wird injiziert: Node-Tests übergeben einen Mock,
 * der Browser window.localStorage. Alle Fehler (voller Speicher, Private-
 * Mode-Verbote, korrupte Daten) kommen als {ok:false, reason} zurück — nie
 * als Exception in die UI.
 * ========================================================================== */
'use strict';
globalThis.AVP = globalThis.AVP || {};

AVP.storage = {
  KEY: 'avp:eingaben',
  SCHEMA: 4,   // 4: AVD, Szenarien, Monte-Carlo, Hybrid, Kaufkraftziel (v7.1)

  /** Eingaben speichern. → {ok:true, bytes} | {ok:false, reason:'quota'|'unavailable'} */
  save(eingaben, backend) {
    const payload = JSON.stringify({
      schema: this.SCHEMA,
      gespeichertAm: new Date().toISOString(),
      eingaben
    });
    try {
      backend.setItem(this.KEY, payload);
      return { ok: true, bytes: payload.length };
    } catch (e) {
      const quota = e && (e.name === 'QuotaExceededError' || e.code === 22);
      return { ok: false, reason: quota ? 'quota' : 'unavailable' };
    }
  },

  /** Gespeicherte Eingaben laden.
   *  → {ok:true, eingaben, gespeichertAm}
   *  | {ok:false, reason:'empty'|'corrupt'|'schema'|'unavailable', [gefundenesSchema]} */
  load(backend) {
    let raw;
    try { raw = backend.getItem(this.KEY); }
    catch (e) { return { ok: false, reason: 'unavailable' }; }
    if (raw === null || raw === undefined) return { ok: false, reason: 'empty' };
    let payload;
    try { payload = JSON.parse(raw); }
    catch (e) { return { ok: false, reason: 'corrupt' }; }
    if (!payload || payload.schema !== this.SCHEMA) {
      return { ok: false, reason: 'schema', gefundenesSchema: payload && payload.schema };
    }
    return { ok: true, eingaben: payload.eingaben, gespeichertAm: payload.gespeichertAm };
  },

  /** Gespeicherte Eingaben löschen. → {ok:true} | {ok:false, reason:'unavailable'} */
  clear(backend) {
    try { backend.removeItem(this.KEY); return { ok: true }; }
    catch (e) { return { ok: false, reason: 'unavailable' }; }
  }
};
