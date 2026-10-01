#!/usr/bin/env bash
# One-time setup for the paper-cut video kit. Safe to re-run.
set -euo pipefail
KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$KIT"
command -v node >/dev/null || { echo "Node.js 18+ is required (nodejs.org / brew install node / winget install OpenJS.NodeJS.LTS)"; exit 1; }
PY=""; for c in python3 python py; do if "$c" -c "import sys; sys.exit(sys.version_info < (3, 8))" >/dev/null 2>&1; then PY="$c"; break; fi; done
[ -n "$PY" ] || { echo "Python 3.8+ is required (python.org / brew install python / winget install Python.Python.3.12)"; exit 1; }
command -v ffmpeg >/dev/null || { echo "ffmpeg is required (brew install ffmpeg / apt install ffmpeg / winget install ffmpeg)"; exit 1; }
"$PY" -c "import numpy, scipy" 2>/dev/null || "$PY" -m pip install --user numpy scipy || "$PY" -m pip install --break-system-packages numpy scipy
[ -f package.json ] || echo '{"type":"module","private":true}' > package.json
[ -d node_modules/playwright ] || npm install --silent playwright
npx playwright install chromium >/dev/null 2>&1 || echo "warning: Chromium download failed; run: cd \"$KIT\" && npx playwright install chromium"
if [ ! -f fonts/patrick-hand-latin-400-normal.woff2 ]; then
  mkdir -p fonts && tmp="$(mktemp -d)" && (cd "$tmp" && npm pack @fontsource/patrick-hand --silent >/dev/null && tar xzf ./*.tgz)
  cp "$tmp"/package/files/patrick-hand-latin-400-normal.woff2 fonts/ && rm -rf "$tmp"
fi
echo "paper-cut kit ready in $KIT"
