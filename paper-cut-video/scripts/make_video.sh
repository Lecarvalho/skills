#!/usr/bin/env bash
# One command: cards.js -> final MP4 with soundtrack + self-contained HTML player.
# usage: make_video.sh CARDS_JS OUT_DIR [--bpm 120] [--key C] [--mood cute|dreamy|none] [--title "Name"] [--fps 24]
set -euo pipefail
KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY=""; for c in python3 python py; do if "$c" -c "import sys; sys.exit(sys.version_info < (3, 8))" >/dev/null 2>&1; then PY="$c"; break; fi; done
[ -n "$PY" ] || { echo "Python 3.8+ is required (python.org / brew install python / winget install Python.Python.3.12)"; exit 1; }
abs() { "$PY" -c 'import os,sys; print(os.path.abspath(sys.argv[1]))' "$1"; }
CARDS="$(abs "$1")"; OUT="$(abs "$2")"; shift 2
BPM=120; KEY=C; MOOD=cute; TITLE="Paper Cut Video"; FPS=24
while [[ $# -gt 0 ]]; do case "$1" in
  --bpm) BPM="$2"; shift 2;; --key) KEY="$2"; shift 2;; --mood) MOOD="$2"; shift 2;;
  --title) TITLE="$2"; shift 2;; --fps) FPS="$2"; shift 2;; *) echo "unknown option $1"; exit 1;; esac; done
mkdir -p "$OUT"
NAME="$(basename "$OUT")"

"$PY" "$KIT/build_page.py" "$CARDS" "$OUT/_render.html" --title "$TITLE"
node "$KIT/render.mjs" "$OUT/_render.html" "$OUT" --fps "$FPS"
"$PY" "$KIT/soundtrack.py" "$OUT/events.json" "$OUT/_raw.wav" --bpm "$BPM" --key "$KEY" --mood "$MOOD"
ffmpeg -v error -y -i "$OUT/_raw.wav" -af loudnorm=I=-15:TP=-1.5:LRA=9 -ar 44100 "$OUT/soundtrack.wav"
ffmpeg -v error -y -i "$OUT/soundtrack.wav" -c:a libmp3lame -b:a 128k "$OUT/soundtrack.mp3"
ffmpeg -v error -y -i "$OUT/silent.mp4" -i "$OUT/soundtrack.wav" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT/$NAME.mp4"
"$PY" "$KIT/build_page.py" "$CARDS" "$OUT/$NAME.html" --audio "$OUT/soundtrack.mp3" --title "$TITLE"
rm -f "$OUT/_render.html" "$OUT/_raw.wav"
echo "done → $OUT/$NAME.mp4  and  $OUT/$NAME.html"
