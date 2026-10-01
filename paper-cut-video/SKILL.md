---
name: "paper-cut-video"
description: "Turn a script into a short cut-paper collage animated video (JS canvas → MP4 with a synthesized cute soundtrack). Use when the user passes a script, story or topic and wants a video in this style."
---

# Paper-cut video from a script

Makes a 15–60 s animated video in a **cut-paper storybook collage** style: every shape looks torn from paper (cream fibrous rim, soft drop shadow, visible brush/marker texture), flat warm colour cards, a cute recurring hero character with a simple face, handwritten words that write themselves on, taped notebook-paper fact notes, and a cheerful synthesized soundtrack (ukulele strum, glockenspiel, pops, paper rustles, pencil scribbles, rain, thunder, chimes) timed to what happens on screen.

Everything is code: shapes are drawn on a `<canvas>`, frames are rendered headlessly to MP4, and audio is synthesized from a cue list the animation emits. No stock assets, no licensing issues.

**Output** (in `videos/<slug>/`): `<slug>.mp4` (H.264 + AAC, loudness −15 LUFS), `<slug>.html` (self-contained interactive player, tap for sound), `cards.js` (the editable source), `soundtrack.mp3`.

## Invocation

`/paper-cut-video <script file or pasted text> [options]`

Options the user may state in words or flags (defaults in bold):
- format: **1:1** (1080×1080) · 9:16 (1080×1920, Shorts/Reels) · 16:9 (1920×1080)
- length: **~30 s** (≈ 3 s per card; intro 3.2 s, finale 3.5–4 s)
- language: **the script's language** (Latin alphabet incl. accents é ç ã õ ü ñ; other scripts fall back to a system font)
- facts: **one tiny true fact per card on a taped note** · off
- mood: **cute** · dreamy (pads, no shaker) · none (SFX only); bpm **120**; key **C**
- review: **go straight through** · "storyboard first" (show the plan and wait)

## Step 0 — locate the kit and make sure it is set up

The kit (engine, renderer, soundtrack synth, example) ships with this skill in the `scripts/` folder next to this file. Call the scripts from there; never copy or rewrite them. In every command below, `$KIT` means that folder's absolute path:

```bash
KIT="${CLAUDE_SKILL_DIR}/scripts"   # Claude Code; elsewhere: the scripts/ folder beside this SKILL.md
```

Shell variables do not survive between tool calls, so set `KIT` at the start of each command (or substitute the path).

If `$KIT/node_modules/playwright` or `$KIT/fonts/patrick-hand-latin-400-normal.woff2` is missing, run the one-time setup (safe to re-run):

```bash
bash "$KIT/setup.sh"
```

Setup needs Node 18+, Python 3 and ffmpeg on PATH, plus internet access the first time; it installs Playwright + Chromium, numpy/scipy and the Patrick Hand font into `$KIT` (git-ignored). On Windows run every command in Git Bash or WSL, not PowerShell. If a prerequisite is missing, setup prints the install command: pass it to the user and stop.

Run the `.sh` scripts with `bash`, `render.mjs` with `node`. The shell scripts pick whichever of `python3` / `python` / `py` works, so prefer them over calling the `.py` files directly.

| script | does |
|---|---|
| `setup.sh` | one-time dependency install |
| `stills.sh CARDS_JS OUT_DIR "t1,t2,…"` | PNG stills at those seconds + `sheet.png` contact sheet (Step 3) |
| `build_page.py CARDS_JS OUT_HTML [--audio mp3] [--title T]` | self-contained HTML player (font + engine + cards) |
| `render.mjs PAGE OUT_DIR [--fps 24] [--frames "2.5,5.1"]` | silent MP4 + `events.json`, or PNG stills + `sheet.png` with `--frames` |
| `soundtrack.py EVENTS_JSON OUT_WAV [--bpm] [--key] [--mood] [--seed]` | synthesized soundtrack from the cue list |
| `make_video.sh CARDS_JS OUT_DIR [--title] [--mood] [--bpm] [--key] [--fps]` | all of the above in one command → final MP4 + HTML |
| `engine.js` | canvas engine (the `k` helpers); read it only if a helper's behaviour is unclear |
| `examples/example.js` | reference `cards.js` |

## Step 1 — storyboard the script

Read the script (a path → read the file; otherwise the text given). Break it into **beats**, one card per beat, ~3 s each:

| field | rule |
|---|---|
| card | 1 intro card (title on a notebook-paper card, hero pops in) → one card per idea → 1 finale card (everything the story touched circles the hero; closing line writes on) |
| bg | rotate the palette so neighbours contrast: `navy mustard pink tan paleY purple teal mint lilac coral sky paper`. Use `navy` for night/space/storm, `paper` (cream with scribble texture) for the finale. Dark bgs (`navy purple teal`) get cream text automatically |
| hero | ONE recurring cute character derived from the subject (a raindrop, a coin, a seed, a planet, a pencil…) built from simple cut shapes + `face()`. It appears on almost every card and *acts out* the beat (rides, falls, grows, splits, hides, cheers) |
| action | one clear visual gag per card, readable in 1 s; props are simple silhouettes (leaf, cloud, bolt, sun, wave strip, building, book…). Newspaper fill for clouds/boats/paper props, notebook fill for signs |
| word | 1–3 words, lowercase, in the script's language — the beat's keyword. Written on at the bottom |
| note | one short TRUE fact (≤ 40 characters) in blue ink on taped notebook paper. Check any fact you are not certain of (web search if available); prefer rounded, defensible numbers ("~9 days", "over 70 %"). Never invent statistics |
| sfx | sound cues for the moments that matter (see "Sound cues") |

Keep the whole thing to 6–10 cards for 30 s. The finale reuses the card sprites as small icons around a ring + the hero in the centre + a closing line.
If the user asked for "storyboard first", show the table (card, bg, action, word, note) and wait; otherwise state the plan in two lines and continue.

## Step 2 — write `videos/<slug>/cards.js`

Copy the structure of the **example** in the kit (`$KIT/examples/example.js`). Contract:

```js
window.VIDEO = {
  size: [1080, 1080],           // [1080,1920] for 9:16, [1920,1080] for 16:9
  seed: 7,                      // changes all the paper tears/texture; keep fixed once you like it
  build(k) { /* pre-render sprites once: k.SP.name = k.sprite(w, h, anchorX, anchorY, g => k.cut(g, pts, fill, opts)) */ },
  cards: [
    { dur: 3.0, bg: "mustard",
      word: "molecules",                       // optional, auto-written at wordAt (.28 s) over .67 s
      note: { text: "H–O–H bends at 104.5°", x: 540, y: 790, rot: -0.03, at: 1.2 },   // optional taped fact
      sfx: [[0, "pop"], [0.9, "chime"]],        // optional sound cues, seconds from card start
      draw(t, k) { /* t = seconds into this card; draw with k.spr / k.face / k.hand / k.dashed / k.dot */ } },
  ]
};
```

Helpers on `k` (all coordinates in video pixels, origin top-left):
- shapes → point arrays: `circ(r,cx,cy)`, `ellipse(rx,ry,cx,cy)`, `rect(w,h,cx,cy)`, `tear(r)` (drop, tip up, circle centre at 0,0), `blob(r,wob,lobes)`, `leaf(len,h)`, `cloud(rx,ry)`, `star(ro,ri,n)`, `heart(s)`, `wavy(w,h,amp,freq,top)` (torn strip for water/snow/ground/sky edges), `cubic(...)`, `quad(...)`; `new Path(points)` with `.at(u) → [x,y,angle]` for things that travel.
- `cut(g, pts, fill, {edge:6, amp:4, shadow:true, tex:true, texA:.1, ang})` — torn-paper cut-out. `fill` = colour or `k.newsFill` / `k.notebookFill`. Stack several cuts in one sprite (back to front). `edge:0` = no rim (highlights, inner lanes).
- `sprite(w,h,ax,ay, g=>{...})` pre-renders at 2× once (do all `cut` calls in `build`, never per frame). `spr(sp, x, y, scale, rot, sx, sy, alpha)` draws it; anchor = (ax, ay).
- `face(x, y, u, expr, rot, blinkOffset)` — expr `happy | joy (^^) | wow (O mouth) | sad | sleepy`; blinks by itself. u ≈ 0.62 × the body radius on screen. Draw it after the body sprite.
- motion: `pop(t, t0, d=.38)` overshooting pop-in scale (use for EVERY element's entrance, staggered 0.05–0.1 s); `seg(t,a,b)` 0→1 ramp; `eio`, `eout` easing; `lerp`; `Math.sin(t*…)` bobbing.
- `hand(text, x, y, size, colour, k, rot)` write-on handwriting (k 0→1); `dashed(points, {color, w, dash, off, k, a})` hand-drawn paths/trajectories/rays (animate `off` for flow, `k` to draw on); `dot(x,y,r,col,a)`; `stars(t, alpha)` twinkling stars for dark cards; `k.C` palette (`ink blueInk cream coral teal sky navy yellow pink mustard tan paleY purple green greenL blue1 blue2 amber cheek red mint lilac`); `k.ctx` raw 2D context; `k.T` global time.
Layout rules (1:1; scale proportionally for other formats): keep the main action in y 120–720; note at y ≈ 780–830 (or tuck it in a free top corner if the action needs the bottom); word baseline is automatic at H−80. Nothing important within 40 px of the edges. One focal element per card, big (hero 0.5–1.0 scale of a 90 px-radius body).

Motion rules: hard cuts between cards (no fades); every element pops in with overshoot, staggered; hero bobs (±5 px sine) and squashes/stretches when moving; a subtle 2.5 % push-in per card is automatic; keep flickers (lightning) short and sparse.

## Step 3 — check stills before the full render

```bash
bash "$KIT/stills.sh" videos/<slug>/cards.js videos/<slug>/_stills "<mid of card 1>,<end of card 1>,<mid of card 2>,…"
```
This writes one PNG per timestamp (`still_01.png`, `still_02.png`, … in the order given) plus `sheet.png`, a contact sheet of all of them. Look at `sheet.png` (Read the image). Fix: text overlapping art, elements off-frame, notes covering the hero, unreadable contrast, empty-looking cards, sprites too small. At most two fix passes. The script exits with the page error if the JS throws. Delete `_stills` after.

## Step 4 — render with sound

```bash
bash "$KIT/make_video.sh" videos/<slug>/cards.js videos/<slug> --title "<Title>" [--mood cute|dreamy|none] [--bpm 120] [--key C]
```
This builds the page, renders every frame at 24 fps, writes `events.json` (the sound cue timeline), synthesizes and loudness-normalizes the soundtrack, muxes the MP4 and builds the interactive HTML with the audio embedded. ~1 s of render per second of video.

Audio check (you can't listen, so look): `ffmpeg -i videos/<slug>/<slug>.mp4 -af volumedetect -f null - 2>&1 | grep -E "mean|max"` → max ≤ −1 dB, mean around −20…−16 dB. Optionally render a spectrogram (`showspectrumpic`) and confirm the effects line up with card starts.

## Step 5 — hand over

Tell the user where the MP4 and HTML are, the card list in one line each (word — note), and how to tweak: edit `cards.js` (timing, words, facts, colours) and re-run the Step 4 command; change music with `--mood/--bpm/--key`; swap in their own music in any editor. Offer one next step (a 9:16 cut, another language version with translated words/notes, a different hero).

## Sound cues

Automatic: paper rustle at every card cut, pencil scribble while the word writes, paper slap + pop when a note lands, a music bed (ukulele strum + bass + shaker + glockenspiel melody on I–vi–IV–V, resolving at the end).
Add in `sfx` as `[t, "type", {params}]`; every type accepts `gain` (1 = default) and `pan` (−1…1):
`pop {lo,hi,dur}` entrances · `plip {f}` one droplet · `plips {n,gap,f0,step}` rising droplets (growth, climbing) · `chime {notes:[midi…],gap}` sparkle/success · `rise {n,gap}` ascending xylophone run (icons appearing) · `rain {dur}` · `stream {dur}` · `thunder {dur}` (put on each flash) · `whistle {f0,f1,dur}` slide whistle (falling 1500→380, rising the other way) · `whoosh {dur}` · `sizzle {dur}` heat · `boing {f,dur}` bounce/spring · `click` · `heartbeat` · `swell {dur}` soft pad.
Rule of thumb: one cue per entrance of the hero or a key prop, one ambience per card at most, never more than ~4 cues in the same half-second.

## Troubleshooting

- Blank or unchanged handwriting → font missing: re-run `setup.sh` (it fetches `@fontsource/patrick-hand`).
- `browserType.launch: Executable doesn't exist` → `cd "$KIT" && npx playwright install chromium`.
- `$'\r': command not found` → the scripts were checked out with Windows line endings: `git config core.autocrlf false`, then re-clone or `git checkout -- .` in the skill folder.
- "contains '</script'" → a string in cards.js has that sequence; reword it.
- Render too slow → lower `--fps` to 20 or shorten cards; sprite work belongs in `build`, not `draw`.
- Characters outside Latin script → the handwriting falls back to a system font; tell the user and suggest a matching Google font (download its woff2 into `$KIT/fonts/` and change `HAND` + the @font-face in `build_page.py`).
