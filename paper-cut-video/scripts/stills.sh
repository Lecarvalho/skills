#!/usr/bin/env bash
# Quick visual check: cards.js -> PNG stills at the given seconds + a sheet.png contact sheet (no video, no audio).
# usage: stills.sh CARDS_JS OUT_DIR "1.5,2.9,4.5"
set -euo pipefail
KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY=""; for c in python3 python py; do if "$c" -c "import sys; sys.exit(sys.version_info < (3, 8))" >/dev/null 2>&1; then PY="$c"; break; fi; done
[ -n "$PY" ] || { echo "Python 3.8+ is required (python.org / brew install python / winget install Python.Python.3.12)"; exit 1; }
[ $# -eq 3 ] || { echo 'usage: stills.sh CARDS_JS OUT_DIR "1.5,2.9,4.5"'; exit 1; }
mkdir -p "$2"
"$PY" "$KIT/build_page.py" "$1" "$2/_check.html" >/dev/null
node "$KIT/render.mjs" "$2/_check.html" "$2" --frames "$3"
rm -f "$2/_check.html" "$2/events.json"
