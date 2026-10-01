/* Paper Cut Engine — cut-paper collage animation on <canvas>.
 * A video is a list of cards (~3 s each). The engine draws the textured background,
 * then card.draw(t, k), then the card's handwritten word and taped fact note, and
 * records a timeline of sound events (window.__anim.events) for the soundtrack.
 * Public: PaperCut.mount(canvas, VIDEO, opts) -> { ready, renderAt(sec), duration, events, play(), pause() }
 */
(function (global) {
"use strict";
const TAU = Math.PI * 2, D2R = Math.PI / 180;
const HAND = '"Patrick Hand", "Comic Sans MS", "Chalkboard SE", cursive';
const C = {
  ink: "#2b2440", blueInk: "#2f5fb3", cream: "#fbf5e6", coral: "#e2735a", teal: "#4fb3a4", sky: "#5aaee3",
  navy: "#27306e", yellow: "#f6c945", pink: "#ee9fbf", mustard: "#f2c14e", tan: "#d9a66b", paleY: "#f5dc8c",
  purple: "#6b3f8f", tealBg: "#3fa39a", green: "#6aa84f", greenL: "#b5e09a", blue1: "#3d78c2", blue2: "#8cc7ea",
  amber: "#f39c38", cheek: "#f28fa0", paper: "#f3ead6", mint: "#9fd3b8", lilac: "#b9a3d9", red: "#d9534f"
};
/* background colours: dark ones get cream text automatically */
const BGS = { navy: C.navy, mustard: C.mustard, pink: C.pink, tan: C.tan, paleY: C.paleY, purple: C.purple,
  teal: C.tealBg, paper: C.paper, mint: C.mint, lilac: C.lilac, coral: C.coral, sky: C.blue2 };
const DARK = new Set(["navy", "purple", "teal"]);

/* ---------- math ---------- */
let seed = 1;
function R() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const eio = k => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const eout = k => 1 - Math.pow(1 - k, 3);
function back(k) { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); }
/* overshooting pop-in scale: 0 before t0, springs to 1 over d seconds */
function pop(t, t0, d = .38) { const k = (t - t0) / d; return k <= 0 ? 0 : k >= 1 ? 1 : back(k); }

/* ---------- shapes (arrays of [x,y], closed implicitly) ---------- */
function cubic(p0, p1, p2, p3, n = 30) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t;
  o.push([u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0], u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1]]); } return o; }
function quad(p0, p1, p2, n = 14) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u*u*p0[0] + 2*u*t*p1[0] + t*t*p2[0], u*u*p0[1] + 2*u*t*p1[1] + t*t*p2[1]]); } return o; }
function circ(r, cx = 0, cy = 0, n = 90) { const o = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; o.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return o; }
function ellipse(rx, ry, cx = 0, cy = 0, n = 90) { const o = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; o.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); } return o; }
function rect(w, h, cx = 0, cy = 0) { return [[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2 + 2], [cx + w / 2 - 2, cy + h / 2], [cx - w / 2 + 2, cy + h / 2 - 2]]; }
function tear(r, k = 2.05) { const o = [], phi = Math.asin(1 / k);
  for (let i = 0; i <= 44; i++) { const a = lerp(-phi, Math.PI + phi, i / 44); o.push([r * Math.cos(a), r * Math.sin(a)]); }
  const L = o[o.length - 1], Rr = o[0], T = [0, -k * r];
  quad(L, [L[0] * .5 - r * .09, (L[1] + T[1]) / 2], T).slice(1).forEach(p => o.push(p));
  quad(T, [Rr[0] * .5 + r * .09, (Rr[1] + T[1]) / 2], Rr).slice(1, -1).forEach(p => o.push(p)); return o; }
function blob(r, wob = .12, lobes = 5, ph = 0) { const o = []; for (let i = 0; i < 120; i++) { const a = i / 120 * TAU, rr = r * (1 + wob * Math.sin(lobes * a + ph) + wob * .5 * Math.sin((lobes + 3) * a + ph * 2)); o.push([rr * Math.cos(a), rr * Math.sin(a)]); } return o; }
function leaf(L, h) { const a = L / 2; return cubic([-a, 0], [-a * .45, -h * 1.33], [a * .45, -h * 1.33], [a, 0], 40).concat(cubic([a, 0], [a * .45, h * 1.33], [-a * .45, h * 1.33], [-a, 0], 40).slice(1, -1)); }
function cloud(rx, ry, bumps = 7, flat = .5) { const o = []; for (let i = 0; i < 160; i++) { const a = i / 160 * TAU; let x = rx * Math.cos(a), y = ry * Math.sin(a);
  if (y < ry * .2) { const f = 1 + .17 * Math.abs(Math.sin(a * bumps / 2)); x *= f; y *= f; } y = Math.min(y, ry * flat); o.push([x, y]); } return o; }
function star(ro, ri, n = 5, rot = -Math.PI / 2) { const o = []; for (let i = 0; i < n * 2; i++) { const r = i % 2 ? ri : ro, a = rot + i * Math.PI / n; o.push([r * Math.cos(a), r * Math.sin(a)]); } return o; }
function heart(s = 2.2) { const o = []; for (let i = 0; i < 80; i++) { const t = i / 80 * TAU; o.push([s * 16 * Math.pow(Math.sin(t), 3), -s * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]); } return o; }
/* a strip with a wavy torn top (top=true) or bottom, width w, height h */
function wavy(w, h, amp = 14, freq = 60, top = true) { const o = [], ph = R() * TAU;
  for (let x = -40; x <= w + 40; x += 8) o.push([x, (top ? 0 : h) + amp * Math.sin(x / freq + ph) + amp * .4 * Math.sin(x / (freq * .37) + ph * 2)]);
  if (top) { o.push([w + 40, h]); o.push([-40, h]); } else { o.push([w + 40, -10]); o.push([-40, -10]); o.reverse(); } return o; }
/* poly-line with arc-length lookup (for paths things travel along) */
class Path { constructor(p) { this.p = p; this.L = [0]; for (let i = 1; i < p.length; i++) this.L.push(this.L[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1])); this.len = this.L[this.L.length - 1]; }
  at(u) { const tl = this.len * clamp(u, 0, 1); let i = 1; while (i < this.L.length - 1 && this.L[i] < tl) i++;
    const a = this.p[i - 1], b = this.p[i], k = (tl - this.L[i - 1]) / ((this.L[i] - this.L[i - 1]) || 1); return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), Math.atan2(b[1] - a[1], b[0] - a[0])]; }
  trace(g, prog = 1) { const tl = this.len * clamp(prog, 0, 1), p = this.p; g.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) { if (this.L[i] <= tl) g.lineTo(p[i][0], p[i][1]); else { const k = (tl - this.L[i - 1]) / ((this.L[i] - this.L[i - 1]) || 1); g.lineTo(lerp(p[i - 1][0], p[i][0], k), lerp(p[i - 1][1], p[i][1], k)); break; } } } }

/* ---------- paper renderer ---------- */
function resample(pts, step) { const o = [], n = pts.length; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.ceil(L / step));
  for (let j = 0; j < k; j++) o.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]); } return o; }
function bbox(P) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; P.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }); return [x0, y0, x1, y1]; }
function trace(g, Q) { g.beginPath(); g.moveTo(Q[0][0], Q[0][1]); for (let i = 1; i < Q.length; i++) g.lineTo(Q[i][0], Q[i][1]); g.closePath(); }
function brush(g, [x0, y0, x1, y1], a, ang) { const n = Math.min(1400, (x1 - x0) * (y1 - y0) / 160), base = ang ?? (R() - .5) * .6; g.lineCap = "round";
  for (let i = 0; i < n; i++) { const x = lerp(x0, x1, R()), y = lerp(y0, y1, R()), L = 14 + R() * 60, an = base + (R() - .5) * .3;
    g.strokeStyle = R() < .55 ? `rgba(255,255,255,${a * (.35 + R() * .8)})` : `rgba(45,20,25,${a * (.3 + R() * .7)})`;
    g.lineWidth = 2 + R() * 7; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(an) * L, y + Math.sin(an) * L); g.stroke(); } }
/* torn-paper cut-out. fill: colour string or fn(g, bbox). o: {edge, amp, shadow, tex, texA, ang, edgeColor} */
function cut(g, pts, fill, o = {}) {
  const edge = o.edge ?? 6, amp = o.amp ?? 4, P = resample(pts, 2.5), n = P.length;
  let cx = 0, cy = 0; P.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= n; cy /= n;
  const N = P.map((p, i) => { const a = P[(i - 1 + n) % n], b = P[(i + 1) % n]; const nx = b[1] - a[1], ny = -(b[0] - a[0]), l = Math.hypot(nx, ny) || 1; return [nx / l, ny / l]; });
  let s = 0; P.forEach((p, i) => { s += N[i][0] * (p[0] - cx) + N[i][1] * (p[1] - cy); }); const sg = s >= 0 ? 1 : -1;
  const ph = [R() * TAU, R() * TAU, R() * TAU];
  const inner = P.map((p, i) => { const j = (R() - .5) * 1.1; return [p[0] + sg * N[i][0] * j, p[1] + sg * N[i][1] * j]; });
  if (edge > 0) {
    const outer = P.map((p, i) => { const u = i / n * TAU, low = .5 + .25 * Math.sin(3 * u + ph[0]) + .15 * Math.sin(7 * u + ph[1]) + .1 * Math.sin(19 * u + ph[2]);
      const d = edge * (.45 + low * .8) + R() * amp * .7 + (R() < .06 ? R() * amp * 1.3 : 0); return [p[0] + sg * N[i][0] * d, p[1] + sg * N[i][1] * d]; });
    g.save(); if (o.shadow !== false) { g.shadowColor = "rgba(35,20,40,.3)"; g.shadowBlur = 12; g.shadowOffsetY = 5; }
    g.fillStyle = o.edgeColor || C.cream; trace(g, outer); g.fill(); g.restore();
  }
  g.save(); trace(g, inner);
  if (typeof fill === "function") { g.clip(); fill(g, bbox(inner)); }
  else { g.fillStyle = fill; g.fill(); g.clip(); if (o.tex !== false) brush(g, bbox(inner), o.texA ?? .1, o.ang); }
  g.restore();
}
const newsFill = (g, [x0, y0, x1, y1]) => { g.fillStyle = "#ece6d8"; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  for (let y = y0 + 10; y < y1; y += 11) { let x = x0 + R() * 10; while (x < x1) { const w = 6 + R() * 36; if (R() < .86) { g.fillStyle = `rgba(80,78,72,${.45 + R() * .25})`; g.fillRect(x, y, w, 4); } x += w + 5; } }
  for (let i = 0; i < 4; i++) { g.fillStyle = "rgba(60,58,55,.75)"; g.fillRect(lerp(x0, x1, R()), lerp(y0, y1, R()), 60 + R() * 70, 14); } brush(g, [x0, y0, x1, y1], .05); };
const notebookFill = (g, [x0, y0, x1, y1]) => { g.fillStyle = "#fbf7ec"; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  g.strokeStyle = "#a9c6e8"; g.lineWidth = 2; for (let y = y0 + 44; y < y1; y += 38) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); }
  g.strokeStyle = "#e8a3a3"; g.beginPath(); g.moveTo(x0 + 56, y0); g.lineTo(x0 + 56, y1); g.stroke(); brush(g, [x0, y0, x1, y1], .035, 0); };

/* ---------- mount ---------- */
function mount(canvas, VIDEO, opts = {}) {
  const W = (VIDEO.size || [1080, 1080])[0], H = (VIDEO.size || [1080, 1080])[1];
  const ctx = canvas.getContext("2d"), RES = opts.res || 2;
  const RM = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let dpr = 1, scale = 1, ox = 0, oy = 0, built = false, T = 0, paused = !!RM && !opts.export, last = 0, soundOn = false;
  const audio = opts.audio && !opts.export ? new Audio(opts.audio) : null; if (audio) { audio.loop = true; audio.preload = "auto"; }
  const SP = {}, BG = {};

  function off(w, h, res) { const c = document.createElement("canvas"); c.width = Math.ceil(w * res); c.height = Math.ceil(h * res); const g = c.getContext("2d"); g.scale(res, res); return [c, g]; }
  /* sprite(w, h, anchorX, anchorY, g => { cut(g, ...) ... }) — pre-rendered once, drawn with spr() */
  function sprite(w, h, ax, ay, fn) { const [c, g] = off(w, h, RES); g.translate(ax, ay); fn(g); return { c, w, h, ax, ay }; }
  function bgTex(col, scribble) { const [c, g] = off(W, H, 1); g.fillStyle = col; g.fillRect(0, 0, W, H); g.lineCap = "round"; const base = (R() - .5) * .5;
    for (let i = 0; i < 2600 * W * H / 1166400; i++) { const x = R() * W, y = R() * H, L = 30 + R() * 110, an = base + (R() - .5) * .35;
      g.strokeStyle = R() < .5 ? `rgba(255,255,255,${.012 + R() * .026})` : `rgba(40,20,30,${.01 + R() * .024})`; g.lineWidth = 8 + R() * 22;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(an) * L, y + Math.sin(an) * L); g.stroke(); }
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${R() < .5 ? "255,255,255" : "30,20,20"},${R() * .06})`; g.fillRect(R() * W, R() * H, 1.5, 1.5); }
    if (scribble) { g.strokeStyle = "rgba(130,95,70,.2)"; g.lineWidth = 1.5; for (let y = 22; y < H; y += 27) { let x = 10 + R() * 20;
      while (x < W) { const w = 20 + R() * 60; g.beginPath(); for (let k = 0; k <= w; k += 3) g.lineTo(x + k, y + Math.sin(k * .7 + R()) * 3); g.stroke(); x += w + 10 + R() * 12; } } }
    return c; }
  function tag(text, size = 40) { const m = document.createElement("canvas").getContext("2d"); m.font = `${size}px ${HAND}`;
    const w = m.measureText(text).width + 70, h = size * 1.55 + 34;
    return sprite(w + 40, h + 50, (w + 40) / 2, (h + 50) / 2 + 6, g => { cut(g, rect(w, h), notebookFill, { edge: 5 });
      g.save(); g.rotate(-.08); g.fillStyle = "rgba(238,224,178,.82)"; g.fillRect(-48, -h / 2 - 16, 96, 30); g.restore();
      g.fillStyle = C.blueInk; g.font = `${size}px ${HAND}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 0, 8); }); }

  /* ---------- live drawing helpers ---------- */
  function spr(sp, x, y, s = 1, rot = 0, sx = 1, sy = 1, a = 1) { if (!sp || s <= 0 || a <= 0) return;
    ctx.save(); ctx.globalAlpha *= clamp(a, 0, 1); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s * sx, s * sy); ctx.drawImage(sp.c, -sp.ax, -sp.ay, sp.w, sp.h); ctx.restore(); }
  /* handwriting that writes itself left→right as k goes 0→1 */
  function hand(text, x, y, size, color, k = 1, rot = 0, align = "center") { if (k <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.font = `${size}px ${HAND}`; ctx.fillStyle = color; ctx.textAlign = align;
    const w = ctx.measureText(text).width, x0 = align === "center" ? -w / 2 : 0; ctx.beginPath(); ctx.rect(x0 - 20, -size * 1.2, (w + 40) * k, size * 1.8); ctx.clip(); ctx.fillText(text, 0, 0); ctx.restore(); }
  const blinkAt = (o = 0) => ((T + o) % 3.3) < .12;
  /* cute face. expr: happy | joy (^^ eyes) | wow (O mouth) | sad | sleepy. u = face size unit (~radius) */
  function face(x, y, u, expr = "happy", rot = 0, blinkOffset = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.lineCap = "round"; ctx.lineWidth = Math.max(2, u * .075); ctx.strokeStyle = C.ink;
    ctx.globalAlpha *= .85; ctx.fillStyle = C.cheek; [-1, 1].forEach(s => { ctx.beginPath(); ctx.ellipse(s * u * .56, u * .2, u * .15, u * .1, 0, 0, TAU); ctx.fill(); }); ctx.globalAlpha /= .85;
    ctx.fillStyle = C.ink; const ex = u * .33, ey = -u * .06, bl = blinkAt(blinkOffset);
    [-1, 1].forEach(s => { ctx.beginPath();
      if (expr === "joy") { ctx.arc(s * ex, ey + u * .07, u * .12, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke(); }
      else if (expr === "sleepy" || bl) { ctx.moveTo(s * ex - u * .08, ey); ctx.lineTo(s * ex + u * .08, ey); ctx.stroke(); }
      else { ctx.arc(s * ex, ey, u * (expr === "wow" ? .1 : .075), 0, TAU); ctx.fill(); } });
    ctx.beginPath();
    if (expr === "wow") { ctx.ellipse(0, u * .3, u * .09, u * .12, 0, 0, TAU); ctx.stroke(); }
    else if (expr === "sad") { ctx.arc(0, u * .42, u * .18, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke(); }
    else { ctx.arc(0, u * .1, u * .22, Math.PI * .18, Math.PI * .82); ctx.stroke(); }
    ctx.restore(); }
  function stars(t, a = 1, n = 36) { if (!SP._stars) SP._stars = Array.from({ length: 60 }, () => [R() * W, R() * H * .6, 5 + R() * 7, R() * TAU, R() < .7]);
    SP._stars.slice(0, n).forEach(([x, y, r, ph, isStar]) => { const k = .75 + .25 * Math.sin(t * 3 + ph); ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(k, k);
      if (isStar) { ctx.fillStyle = "#f6d46b"; trace(ctx, star(r, r * .45)); ctx.fill(); } else { ctx.strokeStyle = "rgba(251,245,230,.7)"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke(); }
      ctx.restore(); }); }
  /* dashed / solid hand line along points, drawn to fraction k */
  function dashed(pts, o = {}) { ctx.save(); ctx.globalAlpha *= o.a ?? 1; ctx.strokeStyle = o.color || C.ink; ctx.lineWidth = o.w || 4; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.setLineDash(o.dash || [12, 12]); ctx.lineDashOffset = o.off || 0; ctx.beginPath(); new Path(pts).trace(ctx, o.k ?? 1); ctx.stroke(); ctx.restore(); }
  function dot(x, y, r, color, a = 1) { ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore(); }

  const k = { W, H, C, BGS, TAU, D2R, R, clamp, lerp, seg, eio, eout, pop, cubic, quad, circ, ellipse, rect, tear, blob, leaf, cloud, star, heart, wavy, Path,
    cut, newsFill, notebookFill, sprite, tag, spr, hand, face, stars, dashed, dot, SP, get ctx() { return ctx; }, get T() { return T; } };

  /* ---------- timeline + sound events ---------- */
  const CARDS = VIDEO.cards; let acc = 0; const events = [];
  CARDS.forEach((cd, i) => { cd._s = acc;
    events.push([+acc.toFixed(3), i === 0 ? "start" : "cut", {}]);
    if (cd.word) events.push([+(acc + (cd.wordAt ?? .28)).toFixed(3), "write", { dur: .67 }]);
    if (cd.note) events.push([+(acc + (cd.note.at ?? 1.2)).toFixed(3), "tag", {}]);
    (cd.sfx || []).forEach(([t, type, p]) => events.push([+(acc + t).toFixed(3), type, p || {}]));
    acc += cd.dur; });
  const TOTAL = acc; events.sort((a, b) => a[0] - b[0]);

  function build() { seed = VIDEO.seed || 7;
    Object.entries(BGS).forEach(([n, col]) => { BG[n] = bgTex(col, n === "paper"); });
    if (VIDEO.build) VIDEO.build(k);
    CARDS.forEach((cd, i) => { if (cd.note) cd._tag = tag(cd.note.text, cd.note.size || 38); });
    built = true; }
  function renderAt(time) { if (!built) return;
    T = ((time % TOTAL) + TOTAL) % TOTAL; let i = 0; while (i < CARDS.length - 1 && T >= CARDS[i]._s + CARDS[i].dur) i++;
    const cd = CARDS[i], t = T - cd._s;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = "#17152a"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    ctx.drawImage(BG[cd.bg] || BG.paper, 0, 0, W, H);
    const z = 1 + .025 * (t / cd.dur); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    cd.draw && cd.draw(t, k);
    if (cd.note) { const n = cd.note; spr(cd._tag, n.x ?? W / 2, n.y ?? H * .75, pop(t, n.at ?? 1.2), n.rot ?? -.03); }
    if (cd.word) hand(cd.word, W / 2, cd.wordY ?? H - 80, cd.wordSize ?? 104, cd.wordColor || (DARK.has(cd.bg) ? C.cream : C.ink), eout(seg(t, cd.wordAt ?? .28, (cd.wordAt ?? .28) + .67)), -.015);
    ctx.restore();
    if (!opts.export && (paused || (audio && !soundOn))) { const label = paused ? "paused" : "tap for sound";
      ctx.save(); ctx.font = `34px ${HAND}`; const w = ctx.measureText(label).width + 40; ctx.fillStyle = "rgba(23,21,42,.6)"; ctx.fillRect(18, 18, w, 58);
      ctx.fillStyle = C.cream; ctx.textBaseline = "middle"; ctx.fillText(label, 38, 49); ctx.restore(); } }
  function resize() { dpr = opts.dpr || Math.min(global.devicePixelRatio || 1, 2); const r = canvas.getBoundingClientRect(), cw = Math.max(1, r.width), ch = Math.max(1, r.height);
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr); scale = Math.min(cw / W, ch / H); ox = (cw - W * scale) / 2; oy = (ch - H * scale) / 2; renderAt(T); }
  const cardIdx = () => { let i = 0; while (i < CARDS.length - 1 && T >= CARDS[i]._s + CARDS[i].dur) i++; return i; };
  function syncAudio() { if (!audio || !soundOn) return; try { audio.currentTime = T; } catch (e) {} if (paused) audio.pause(); else { const p = audio.play(); if (p && p.catch) p.catch(() => {}); } }
  function toggle() { if (audio && !soundOn) { soundOn = true; paused = false; syncAudio(); return; } paused = !paused; syncAudio(); }
  function loop(now) { const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!paused) T = (audio && soundOn && !audio.paused && audio.readyState >= 2) ? audio.currentTime % TOTAL : (T + dt) % TOTAL;
    renderAt(T); requestAnimationFrame(loop); }
  const fontReady = (document.fonts && document.fonts.load) ? Promise.race([document.fonts.load(`40px ${HAND}`), new Promise(r => setTimeout(r, 2500))]).catch(() => {}) : Promise.resolve();
  const ready = fontReady.then(() => { build(); resize(); });
  if (!opts.export) {
    canvas.tabIndex = 0; canvas.style.outline = "none"; canvas.addEventListener("click", () => { toggle(); canvas.focus(); });
    global.addEventListener("keydown", e => { if (e.key === " ") { toggle(); e.preventDefault(); }
      else if (e.key === "ArrowRight") { T = CARDS[(cardIdx() + 1) % CARDS.length]._s; syncAudio(); }
      else if (e.key === "ArrowLeft") { T = CARDS[(cardIdx() - 1 + CARDS.length) % CARDS.length]._s; syncAudio(); }
      else if ((e.key === "m" || e.key === "M") && audio) audio.muted = !audio.muted; });
    if ("ResizeObserver" in global) new ResizeObserver(resize).observe(canvas); else global.addEventListener("resize", resize);
    ready.then(() => requestAnimationFrame(n => { last = n; requestAnimationFrame(loop); }));
  } else ready.then(resize);
  return { ready, renderAt, duration: TOTAL, events, size: [W, H], play() { paused = false; syncAudio(); }, pause() { paused = true; syncAudio(); } };
}
global.PaperCut = { mount };
})(window);
