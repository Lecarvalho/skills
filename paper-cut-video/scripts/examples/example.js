/* Example: 4 cards, 1:1, French. Hero = a drop of maple syrup. */
window.VIDEO = {
  size: [1080, 1080],
  seed: 11,
  build(k) {
    const { sprite, cut, tear, circ, rect, wavy, C, SP } = k;
    const hi = g => { g.save(); g.rotate(.5); g.fillStyle = "rgba(255,255,255,.45)"; g.beginPath(); g.ellipse(-44, -30, 14, 26, 0, 0, k.TAU); g.fill(); g.restore(); };
    SP.hero = sprite(260, 340, 130, 225, g => { cut(g, tear(90), "#c9761e"); hi(g); });
    const mp = [[0,-1],[.12,-.62],[.35,-.72],[.3,-.42],[.62,-.52],[.55,-.3],[.9,-.28],[.72,-.06],[.8,.05],[.42,.12],[.46,.32],[.1,.22],[.05,.55],[-.05,.55],[-.1,.22],[-.46,.32],[-.42,.12],[-.8,.05],[-.72,-.06],[-.9,-.28],[-.55,-.3],[-.62,-.52],[-.3,-.42],[-.35,-.72],[-.12,-.62]];
    SP.maple = sprite(460, 460, 230, 230, g => { cut(g, [[-8, 100], [8, 100], [6, 200], [-6, 200]], "#7a3b1d", { edge: 4 }); cut(g, mp.map(([x, y]) => [x * 200, y * 200]), C.red); });
    SP.bucket = sprite(300, 300, 150, 150, g => cut(g, [[-95, -110], [95, -110], [75, 120], [-75, 120]], "#9aa7b3"));
    SP.bottle = sprite(260, 420, 130, 210, g => { cut(g, rect(60, 90, 0, -150), "#e9dfc9"); cut(g, [[-90, -100], [90, -100], [95, 180], [-95, 180]], "#c9761e"); cut(g, rect(120, 80, 0, 50), k.notebookFill, { edge: 4 }); });
    SP.card = sprite(800, 500, 400, 250, g => cut(g, rect(700, 400), k.notebookFill, { edge: 7 }));
    SP.snow = sprite(1240, 420, 80, 40, g => cut(g, wavy(1080, 380, 16, 70), "#f4f7fb", { ang: 0 }));
    SP.tree = sprite(200, 700, 100, 680, g => cut(g, [[-40, 0], [40, 0], [30, -660], [-30, -660]], "#8a6a4f", { ang: 1.5 }));
  },
  cards: [
    { dur: 3.0, bg: "navy",
      sfx: [[0.05, "pop"], [0.32, "write", { dur: .8 }], [1.15, "pop", { lo: 420, hi: 1250, dur: .13 }], [1.3, "chime", { notes: [84, 88] }]],
      draw(t, k) { const { spr, SP, pop, hand, stars, face, eout, seg, C } = k;
        stars(t); spr(SP.snow, 0, 820, 1);
        const s = pop(t, .05); spr(SP.card, 540, 470, s, -.035);
        k.ctx.save(); k.ctx.translate(540, 470); k.ctx.rotate(-.035); k.ctx.scale(s, s); hand("savais-tu ?", 0, 40, 130, C.blueInk, eout(seg(t, .32, 1.1))); k.ctx.restore();
        const hs = pop(t, 1.15, .45), y = 262 + Math.sin(t * 5) * 5; spr(SP.hero, 835, y, .62 * hs, .1); if (hs > .5) face(835, y + 4, 56 * hs, t > 2 ? "joy" : "happy");
      } },
    { dur: 3.0, bg: "mint", word: "l'eau d'érable", note: { text: "40 L de sève = 1 L de sirop", x: 540, y: 790, at: 1.2 },
      sfx: [[0, "pop", { lo: 380, hi: 900, dur: .12 }], [.5, "plips", { n: 8, gap: .18, f0: 800, step: 80 }]],
      draw(t, k) { const { spr, SP, pop, face, dot, C } = k;
        spr(SP.tree, 300, 700, pop(t, 0)); spr(SP.bucket, 420, 560, pop(t, .15));
        for (let i = 0; i < 8; i++) { const ph = (t * 1.1 + i / 8) % 1; if (t > .4) dot(372, 420 + ph * 110, 7, C.sky, 1 - ph); }
        const hs = pop(t, .3), y = 470 + Math.sin(t * 4) * 6; spr(SP.hero, 760, y, .8 * hs); if (hs > .5) face(760, y + 5, 72 * hs, t > 1.6 ? "joy" : "wow");
      } },
    { dur: 3.0, bg: "coral", word: "le Québec", note: { text: "plus de 70 % du sirop du monde", x: 540, y: 800, at: 1.1 },
      sfx: [[0, "boing"], [.9, "chime"]],
      draw(t, k) { const { spr, SP, pop, face } = k;
        spr(SP.maple, 540, 400 + Math.sin(t * 2) * 8, pop(t, 0, .5), Math.sin(t * 1.5) * .06);
        const hs = pop(t, .5), y = 470; spr(SP.hero, 540, y, .5 * hs); if (hs > .5) face(540, y + 4, 45 * hs, "joy");
      } },
    { dur: 3.0, bg: "paper", word: "à la cabane !",
      sfx: [[0.1, "pop"], [.3, "rise", { n: 5 }], [1.6, "chime", { notes: [72, 76, 79, 84], gap: .05 }]],
      draw(t, k) { const { spr, SP, pop, face } = k;
        spr(SP.bottle, 380, 520, pop(t, .1), -.08);
        const hs = pop(t, .3), y = 520 + Math.sin(t * 3.5) * 8; spr(SP.hero, 700, y, 1.0 * hs); if (hs > .5) face(700, y + 6, 90 * hs, t > 1 ? "joy" : "happy");
      } }
  ]
};
