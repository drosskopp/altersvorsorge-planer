#!/usr/bin/env bash
# Baut dist/altersvorsorge-planer.html: ersetzt den Marker in src/ui/shell.html
# durch die inline-konkatenierten src-Module (Reihenfolge ist bindend).
# Ergebnis: EINE offline lauffähige HTML-Datei ohne externe Requests (ADR-0008).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p dist
OUT=dist/altersvorsorge-planer.html
MODULES=(src/vendor/chart.umd.js src/params/2026.js src/domain/grv.js src/domain/tax.js src/domain/vbl.js src/domain/sozial.js src/domain/storage.js src/engine/pfade.js src/engine/rente.js src/engine/veranlagung.js src/engine/depot.js src/engine/avd.js src/engine/mc.js src/engine/ziel.js src/ui/app.js src/selftest/cases.js)

{
  # Alles vor dem Marker
  sed '/%%SCRIPTS%%/,$d' src/ui/shell.html
  echo '<script>'
  for m in "${MODULES[@]}"; do
    echo "/* ═══ ${m} ═══ */"
    cat "$m"
    echo
  done
  echo '</script>'
  # Alles nach dem Marker
  sed '1,/%%SCRIPTS%%/d' src/ui/shell.html
} > "$OUT"
echo "gebaut: $OUT ($(wc -c < "$OUT") Bytes)"

# Integritäts-Guard: schlägt an, wenn kaputtes sed-&-Escaping o. ä. Textreste
# hinterlassen hat (Lektion aus alpha.3: '&' im sed-Replacement = ganzer Match).
if grep -qE '(:nbsp;|SchrittDer|%%SCRIPTS%%)' "$OUT"; then
  echo "INTEGRITÄTS-FEHLER: Textschaden/Marker-Rest in $OUT gefunden"; exit 1
fi
node -e '
const fs = require("fs");
const html = fs.readFileSync(process.argv[1], "utf8");
const muster = [/getElementById\(\x27([^\x27]+)\x27\)/g, /\bg\(\x27([^\x27]+)\x27\)/g, /\bset\(\x27([^\x27]+)\x27\s*,/g];
const ref = new Set(muster.flatMap(rx => [...html.matchAll(rx)].map(m => m[1])));
const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
const fehlt = [...ref].filter(id => !ids.has(id));
if (fehlt.length) { console.error("check-integrity: FEHLENDE DOM-IDs: " + fehlt.join(", ")); process.exit(1); }
' "$OUT"
echo "check-integrity: OK — kein Textschaden, kein Marker-Rest, DOM-Verdrahtung vollständig"
