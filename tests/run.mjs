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

process.exit(result.fail === 0 ? 0 : 1);
