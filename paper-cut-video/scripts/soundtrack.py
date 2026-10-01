#!/usr/bin/env python3
"""Synthesise a cute soundtrack from events.json (written by render.mjs). No samples: everything is generated.
usage: soundtrack.py events.json out.wav [--bpm 120] [--key C] [--mood cute|dreamy|none] [--seed 7]

Event types (card.sfx entries: [t, "type", {params}]):
  start, cut      paper rustle (automatic at each card)       write  pencil scribble {dur}
  tag             paper slap + pop (automatic for notes)      pop    bubble pop {lo, hi, dur, gain}
  plip            water droplet {f}                           plips  rising run of droplets {n, gap, f0, step}
  chime           glockenspiel sparkle {notes:[midi..], gap}  rise   ascending xylophone run {n, gap}
  rain            rain bed {dur}                              stream water flowing {dur}
  thunder         crack + rumble {dur, gain}                  whistle slide whistle {f0, f1, dur}
  whoosh          rising air swoosh {dur}                     sizzle hot fizz {dur}
  boing           cartoon spring {f, dur}                     click  small tick
  heartbeat       two soft thumps                             swell  soft pad swell {dur}
Every type also takes {gain, pan}."""
import argparse, json, math
import numpy as np
from scipy.signal import lfilter, butter, sosfilt
from scipy.io import wavfile

ap = argparse.ArgumentParser()
ap.add_argument("events"); ap.add_argument("out")
ap.add_argument("--bpm", type=float, default=120); ap.add_argument("--key", default="C")
ap.add_argument("--mood", default="cute"); ap.add_argument("--seed", type=int, default=7)
A = ap.parse_args()
data = json.load(open(A.events, encoding="utf-8"))
SR = 44100; DUR = float(data["duration"]); N = int(SR * DUR)
rng = np.random.default_rng(A.seed)
mix = np.zeros((2, N))
KEYS = {"C": 0, "C#": 1, "Db": 1, "D": 2, "Eb": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "Ab": 8, "A": 9, "Bb": 10, "B": 11}
TR = KEYS.get(A.key, 0) if KEYS.get(A.key, 0) < 6 else KEYS.get(A.key, 0) - 12

def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N or i < 0: return
    sig = sig[: N - i] * gain
    l, r = math.cos((pan + 1) * math.pi / 4), math.sin((pan + 1) * math.pi / 4)
    mix[0, i:i + len(sig)] += sig * l * 1.414; mix[1, i:i + len(sig)] += sig * r * 1.414
def env(n, a=0.003, d=None, curve=6.0):
    t = np.arange(n) / SR; return np.exp(-curve * t / (d or n / SR)) * np.clip(t / a, 0, 1)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], btype="band", fs=SR, output="sos"), x)
def lp(x, f): return sosfilt(butter(2, f, btype="low", fs=SR, output="sos"), x)
def hp(x, f): return sosfilt(butter(2, f, btype="high", fs=SR, output="sos"), x)
def midi(m): return 440.0 * 2 ** ((m - 69) / 12)
def fade(y, a, b):
    n = len(y); t = np.arange(n) / SR; return y * np.clip(np.minimum(t / a, (n / SR - t) / b), 0, 1)

# ---------------- instruments
def pluck(freq, dur=1.6, bright=0.5):
    n = int(dur * SR); p = max(2, int(SR / freq)); x = np.zeros(n); x[:p] = lp(rng.uniform(-1, 1, p), 1500 + 5000 * bright)
    a = np.zeros(p + 2); a[0] = 1; a[p] = -0.498; a[p + 1] = -0.498
    return lfilter([1], a, x) * env(n, 0.002, dur, 3.0) * 0.6
def glock(freq, dur=1.2):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.sin(2*np.pi*freq*t) + .35*np.sin(2*np.pi*freq*2.76*t)*np.exp(-t*9) + .18*np.sin(2*np.pi*freq*5.4*t)*np.exp(-t*18)
    return s * env(n, 0.001, dur, 5.0) * 0.35
def pad(freqs, dur):
    n = int(dur * SR); t = np.arange(n) / SR; y = sum(np.sin(2*np.pi*f*t + rng.uniform(0, 6)) + .3*np.sin(4*np.pi*f*t) for f in freqs)
    return lp(y, 1800) * np.sin(np.pi * t / dur) ** 2 * 0.05
def shaker(dur=0.07):
    n = int(dur * SR); return lp(hp(rng.uniform(-1, 1, n), 5000), 10000) * env(n, 0.004, dur, 5) * 0.07

# ---------------- effects
def s_pop(lo=500, hi=1100, dur=0.09):
    n = int(dur * SR); t = np.arange(n) / SR; f = lo + (hi - lo) * (t / dur) ** 0.6
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, dur, 4.5) * 0.55
def s_plip(f=1400, dur=0.05):
    n = int(dur * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(f * (1 + 0.8 * np.exp(-t * 60))) / SR) * env(n, 0.0005, dur, 7) * 0.35
def s_paper(dur=0.24, bright=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; x = rng.uniform(-1, 1, n) * (1 + .8 * (rng.uniform(0, 1, n) > .97))
    return bp(x, 1200 * bright, 7000) * np.sin(np.pi * t / dur) ** .6 * 0.22
def s_write(dur=0.67):
    n = int(dur * SR); t = np.arange(n) / SR; x = bp(rng.uniform(-1, 1, n), 2500, 7500)
    am = .5 + .5 * np.sin(2*np.pi*(9 + 3*np.sin(2*np.pi*1.3*t))*t) ** 2
    return fade(x * am * 0.07, .04, .06)
def s_rain(dur=3.0):
    n = int(dur * SR); y = bp(rng.uniform(-1, 1, n), 1500, 9000) * 0.02
    for _ in range(int(dur * 70)):
        i = rng.integers(0, max(1, n - 3000)); s = s_plip(rng.uniform(2200, 4800), .02) * rng.uniform(.15, .45); y[i:i + len(s)] += s
    return fade(y, .25, .3)
def s_stream(dur=3.0):
    n = int(dur * SR); t = np.arange(n) / SR; y = bp(rng.uniform(-1, 1, n), 300, 2200) * (.6 + .4*np.sin(2*np.pi*.7*t)) * .05
    for _ in range(int(dur * 14)):
        i = rng.integers(0, max(1, n - 5000)); s = s_pop(rng.uniform(300, 700), rng.uniform(800, 1400), .05) * rng.uniform(.08, .2); y[i:i + len(s)] += s
    return fade(y, .3, .3)
def s_thunder(dur=1.4):
    n = int(dur * SR); t = np.arange(n) / SR
    r = lp(np.cumsum(rng.uniform(-1, 1, n)) * .02, 180) * np.exp(-t * 2.2) * (1 - np.exp(-t * 20)); r = r / (np.abs(r).max() + 1e-9) * .5
    return r + hp(rng.uniform(-1, 1, n), 1500) * np.exp(-t * 28) * .45
def s_whistle(f0=1500, f1=380, dur=2.0):
    n = int(dur * SR); t = np.arange(n) / SR; f = f0 * (f1 / f0) ** (t / dur) * (1 + .012 * np.sin(2*np.pi*6*t)); ph = 2*np.pi*np.cumsum(f)/SR
    return fade((np.sin(ph) + .1*np.sin(2*ph)) * .16 + bp(rng.uniform(-1, 1, n), 1500, 5000) * .05, .08, .15)
def s_whoosh(dur=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; x = rng.uniform(-1, 1, n); y = np.zeros(n)
    for i in range(0, n, 1024):
        f = 400 + 3000 * i / n; segm = x[max(0, i - 256): i + 1024]; y[i:i + 1024] = bp(segm, max(200, f * .7), f * 1.4)[-len(y[i:i + 1024]):]
    return y * np.sin(np.pi * t / dur) ** 1.5 * .18
def s_sizzle(dur=.7):
    n = int(dur * SR); t = np.arange(n) / SR; return hp(rng.uniform(-1, 1, n), 4000) * (.5 + .5*(rng.uniform(0, 1, n) > .9)) * .05 * np.sin(np.pi*t/dur)
def s_boing(f=220, dur=.5):
    n = int(dur * SR); t = np.arange(n) / SR; fr = f * (1 + .6 * np.exp(-t * 8) * np.sin(2*np.pi*14*t))
    return np.sin(2*np.pi*np.cumsum(fr)/SR) * env(n, .002, dur, 4) * .4
def s_click(): return s_plip(3000, .015) * .8
def s_heartbeat():
    y = np.zeros(int(.6 * SR))
    for k, g in ((0, 1), (.18, .7)):
        n = int(.15 * SR); t = np.arange(n) / SR; s = np.sin(2*np.pi*60*t) * np.exp(-t * 25) * g * .6; i = int(k * SR); y[i:i + n] += s
    return y
def notes_seq(ns, gap):
    y = np.zeros(int((len(ns) * gap + 1.4) * SR))
    for k, m in enumerate(ns):
        s = glock(midi(m + TR), 1.3); i = int(k * gap * SR); y[i:i + len(s)] += s
    return y

def render_event(t, typ, p):
    g, pan = p.get("gain", 1.0), p.get("pan", 0.0)
    if typ in ("start", "cut"): add(s_paper(.24), t, .9 * g, rng.uniform(-.3, .3))
    elif typ == "write": add(s_write(p.get("dur", .67)), t, g, .1)
    elif typ == "tag": add(s_paper(.12, 1.4), t, .6 * g); add(s_pop(700, 1300, .07), t + .03, .35 * g)
    elif typ == "pop": add(s_pop(p.get("lo", 500), p.get("hi", 1100), p.get("dur", .09)), t, .7 * g, pan)
    elif typ == "plip": add(s_plip(p.get("f", 1400)), t, .5 * g, pan)
    elif typ == "plips":
        for k in range(p.get("n", 6)): add(s_plip(p.get("f0", 900) + p.get("step", 90) * k), t + k * p.get("gap", .2), .45 * g, pan)
    elif typ == "chime": add(notes_seq(p.get("notes", [84, 88, 91, 96]), p.get("gap", .06)), t, g, pan)
    elif typ == "rise": add(notes_seq([72, 74, 76, 79, 81, 84, 86, 88][: p.get("n", 7)], p.get("gap", .1)), t, .9 * g, pan)
    elif typ == "rain": add(s_rain(p.get("dur", 3.0)), t, g, pan)
    elif typ == "stream": add(s_stream(p.get("dur", 3.0)), t, g, pan)
    elif typ == "thunder": add(s_thunder(p.get("dur", 1.4)), t, .7 * g, pan)
    elif typ == "whistle": add(s_whistle(p.get("f0", 1500), p.get("f1", 380), p.get("dur", 2.0)), t, .9 * g, pan)
    elif typ == "whoosh": add(s_whoosh(p.get("dur", 1.0)), t, .7 * g, pan)
    elif typ == "sizzle": add(s_sizzle(p.get("dur", .7)), t, g, pan)
    elif typ == "boing": add(s_boing(p.get("f", 220), p.get("dur", .5)), t, .7 * g, pan)
    elif typ == "click": add(s_click(), t, g, pan)
    elif typ == "heartbeat": add(s_heartbeat(), t, g, pan)
    elif typ == "swell": add(pad([midi(60 + TR), midi(64 + TR), midi(67 + TR)], p.get("dur", 2.0)), t, 3 * g, pan)
    else: print("unknown sound event:", typ)

# ---------------- music bed: ukulele strum + bass + shaker + glockenspiel melody over I–vi–IV–V
if A.mood != "none":
    beat = 60.0 / A.bpm; bar = 4 * beat
    chords = {"I": [60, 64, 67, 72], "vi": [57, 60, 64, 69], "IV": [53, 57, 60, 65], "V": [55, 59, 62, 67]}
    cyc = ["I", "vi", "IV", "V"]; nbars = max(2, int(math.floor(DUR / bar)))
    prog = [cyc[i % 4] for i in range(nbars - 2)] + ["IV", "I"]
    dreamy = A.mood == "dreamy"
    penta = [0, 2, 4, 7, 9]
    for b, name in enumerate(prog):
        t0 = b * bar; ns = [m + TR for m in chords[name]]; last = b == len(prog) - 1
        if dreamy:
            add(pad([midi(m) for m in ns[:3]], bar * 1.1), t0, 2.2)
        for bt in range(1 if last else 4):
            down = bt % 2 == 0; order = ns if down else ns[::-1]
            for k, m in enumerate(order):
                add(pluck(midi(m), 1.4, .35 if down else .2), t0 + bt * beat + k * .012, (.16 if down else .09) * (.6 if dreamy else 1), -.25 + .15 * k)
        add(pluck(midi(ns[0] - 12), 1.8, .2), t0, .22); add(pluck(midi(ns[0] - 5), 1.2, .2), t0 + 2 * beat, .14)
        if not last and not dreamy:
            for e in range(8): add(shaker(), t0 + e * beat / 2, 1.0 if e % 2 else .55, .4)
        # melody: chord tones + pentatonic passing notes, one phrase per bar
        rhythm = [0, 1, 2, 3] if b % 2 == 0 else [0, 1.5, 2, 3]
        if last: rhythm = [0]
        for r in rhythm:
            if last: m = 84 + TR
            else:
                pool = [x + 12 for x in ns[:3]] + [72 + TR + p for p in penta]
                m = int(rng.choice(pool))
            add(glock(midi(m)), t0 + r * beat, .3 if not dreamy else .22, .3)
    add(notes_seq([72, 76, 79, 84], .05), (len(prog) - 1) * bar, .8)

for t, typ, p in data["events"]:
    render_event(float(t), typ, p or {})

mix = hp(mix, 40)
f = np.ones(N); a = int(.02 * SR); b = int(.15 * SR); f[:a] = np.linspace(0, 1, a); f[-b:] = np.linspace(1, 0, b); mix *= f
mix = np.tanh(mix / (np.abs(mix).max() + 1e-9) * 1.25) * .89
wavfile.write(A.out, SR, (mix.T * 32767).astype(np.int16))
print(f"wrote {A.out} ({DUR:.2f} s, {len(data['events'])} cues)")
