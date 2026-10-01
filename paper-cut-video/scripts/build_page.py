#!/usr/bin/env python3
"""Assemble a single self-contained HTML player: embedded font + engine + cards (+ optional audio).
usage: build_page.py CARDS_JS OUT_HTML [--audio soundtrack.mp3] [--title "Name"]"""
import argparse, base64, pathlib, sys

here = pathlib.Path(__file__).resolve().parent
ap = argparse.ArgumentParser()
ap.add_argument("cards"); ap.add_argument("out")
ap.add_argument("--audio"); ap.add_argument("--title", default="Paper Cut Video")
a = ap.parse_args()

font = here / "fonts" / "patrick-hand-latin-400-normal.woff2"
if not font.exists():
    sys.exit(f"missing font: {font}  (run setup.sh)")
engine = (here / "engine.js").read_text(encoding="utf-8")
cards = pathlib.Path(a.cards).read_text(encoding="utf-8")
for name, src in (("engine.js", engine), (a.cards, cards)):
    if "</script" in src.lower():
        sys.exit(f"{name} contains '</script' which would break the page; reword it")
f64 = base64.b64encode(font.read_bytes()).decode()
opts = "{}"
if a.audio:
    opts = '{ audio: "data:audio/mpeg;base64,' + base64.b64encode(pathlib.Path(a.audio).read_bytes()).decode() + '" }'

html = f"""<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{a.title}</title>
<style>
@font-face{{font-family:"Patrick Hand";src:url(data:font/woff2;base64,{f64}) format("woff2");font-display:block}}
html,body{{height:100%;margin:0;background:#17152a;overflow:hidden}}
#stage{{display:block;width:100%;height:100%;cursor:pointer}}
</style></head><body>
<canvas id="stage" aria-label="{a.title}: animated video. Tap for sound, Space pauses, arrow keys skip cards, M mutes."></canvas>
<script>
{engine}
</script>
<script>
{cards}
</script>
<script>window.__anim = PaperCut.mount(document.getElementById("stage"), window.VIDEO, Object.assign({opts}, window.__EXPORT ? {{ export: true, dpr: 1 }} : {{}}));</script>
</body></html>
"""
pathlib.Path(a.out).write_text(html, encoding="utf-8")
print(f"wrote {a.out} ({len(html) // 1024} KB)")
