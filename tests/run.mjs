#!/usr/bin/env node
/* Node-Wrapper um den Selbsttest — identischer Testcode wie im Browser-Release.
 * Lädt die src-Module als Side-Effect-Imports (globalThis.AVP-Pattern, ADR-0010). */
import '../src/params/2026.js';
import '../src/domain/grv.js';
import '../src/domain/tax.js';
import '../src/domain/vbl.js';
import '../src/domain/sozial.js';
import '../src/domain/storage.js';
import '../src/engine/pfade.js';
import '../src/engine/rente.js';
import '../src/engine/veranlagung.js';
import '../src/engine/depot.js';
import '../src/engine/avd.js';
import '../src/engine/mc.js';
import '../src/engine/ziel.js';
import '../src/ui/app.js';
import '../src/selftest/cases.js';

const green = s => `\x1b[32m${s}\x1b[0m`;
const red   = s => `\x1b[31m${s}\x1b[0m`;

const result = globalThis.AVP.selftest.run(({ name, ok, detail }) => {
  console.log(`${ok ? green('✓') : red('✗')} ${name}${ok ? '' : '\n    → ' + detail}`);
});

console.log(`\n${result.fail === 0 ? green('ALLE TESTS BESTANDEN') : red('FEHLSCHLÄGE: ' + result.fail)} — ${result.pass}/${result.pass + result.fail}`);
// ── DOM-Verdrahtungs-Guard: jede per getElementById/g()/set() referenzierte
// ID muss im Markup existieren (Regression zu v7.1.0: totes Feld "retAlter").
const { readFileSync } = await import('node:fs');
const shell = readFileSync(new URL('../src/ui/shell.html', import.meta.url), 'utf8');
const muster = [/getElementById\('([^']+)'\)/g, /\bg\('([^']+)'\)/g, /\bset\('([^']+)'\s*,/g];
const referenziert = new Set(muster.flatMap(rx => [...shell.matchAll(rx)].map(m => m[1])));
const vorhanden = new Set([...shell.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
const fehlend = [...referenziert].filter(id => !vorhanden.has(id));
if (fehlend.length) {
  console.error(red('DOM-Verdrahtung: FEHLENDE IDs: ') + fehlend.join(', '));
  process.exit(1);
}
console.log(green('DOM-Verdrahtung: OK') + ` — ${referenziert.size} referenzierte IDs vorhanden`);

// ── UI-Smoke-Guard: das UI-Script wirklich AUSFÜHREN (DOM-Stub) und rechnen()
// für alle Entnahmemodi aufrufen. Fängt Laufzeitfehler, die der ID-Guard
// nicht sehen kann (Regressionen: totes Feld "retAlter" v7.1.1, undefinierte
// Variable "zielSol" v7.2.1 — beide crashten nur im Browser).
const vm = await import('node:vm');
const uiScript = shell.slice(shell.indexOf('<script>') + 8, shell.lastIndexOf('</' + 'script>'));

// Element-Stubs mit Defaults aus dem Markup (value="…", checked, erste/selected option)
const elemReg = {};
function htmlDefault(id) {
  const tag = shell.match(new RegExp(`<(input|select|textarea)[^>]*id="${id}"[^>]*>`));
  if (!tag) return { value: '', checked: false };
  const t = tag[0];
  if (tag[1] === 'select') {
    const rest = shell.slice(shell.indexOf(t) + t.length);
    const opts = [...rest.slice(0, rest.indexOf('</select>')).matchAll(/<option value="([^"]*)"( selected)?/g)];
    const sel = opts.find(o => o[2]) || opts[0];
    return { value: sel ? sel[1] : '', checked: false };
  }
  const v = t.match(/value="([^"]*)"/);
  return { value: v ? v[1] : '', checked: /\bchecked\b/.test(t) };
}
function mkStub(id) {
  const d = htmlDefault(id);
  return { id, value: d.value, checked: d.checked, textContent: '', innerHTML: '',
    style: {}, disabled: false, dataset: {}, files: [], href: '', download: '',
    options: [], selectedIndex: 0,
    addEventListener() {}, removeEventListener() {}, focus() {}, click() {},
    appendChild() {}, getContext() { return {}; },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } } };
}
const stubs = {
  document: { getElementById: id => elemReg[id] || (elemReg[id] = mkStub(id)),
    addEventListener() {}, createElement: () => mkStub('_tmp'),
    querySelectorAll: () => [], body: mkStub('_body') },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  Worker: class { postMessage() {} terminate() {} },
  Blob: class {}, FileReader: class { readAsText() {} },
  URL: { createObjectURL: () => 'blob:0', revokeObjectURL() {} },
  Chart: function () { this.data = { datasets: [] }; this.options = {};
    this.destroy = () => {}; this.update = () => {}; },
  requestAnimationFrame: fn => fn(), alert() {}, confirm: () => true };
stubs.window = globalThis;
const vorher = {};
for (const k of Object.keys(stubs)) { vorher[k] = globalThis[k]; globalThis[k] = stubs[k]; }
let smokeFehler = [];
try {
  vm.runInThisContext(uiScript, { filename: 'shell-ui.js' });
  for (const modus of ['swr', 'infl', 'ann', 'hybrid', 'ziel']) {
    elemReg['modus'] = elemReg['modus'] || stubs.document.getElementById('modus');
    elemReg['modus'].value = modus;
    try {
      globalThis.rechnen();
      const box = elemReg['fehler'];
      if (box && /Eingabefehler|Rechenfehler/.test(box.textContent))
        smokeFehler.push(`${modus}: ${box.textContent}`);
    } catch (ex) { smokeFehler.push(`${modus}: ${ex.message}`); }
  }
} catch (ex) { smokeFehler.push('Script-Load: ' + ex.message); }
for (const k of Object.keys(stubs)) {
  if (vorher[k] === undefined) delete globalThis[k]; else globalThis[k] = vorher[k];
}
if (smokeFehler.length) {
  console.error(red('UI-Smoke: FEHLGESCHLAGEN\n  ') + smokeFehler.join('\n  '));
  process.exit(1);
}
console.log(green('UI-Smoke: OK') + ' — rechnen() in 5 Modi crashfrei (DOM-Stub)');

process.exit(result.fail === 0 ? 0 : 1);
