/* How bees make honey: 5 cards, 1:1, English. Hero = a honey bee. */
function bee(k, x, y, s, expr, t, rot = 0) {
  if (s <= 0) return;
  const flap = Math.sin(t * 34) * .35;
  k.spr(k.SP.wing, x + 14 * s, y - 52 * s, s, rot - .5 + flap);
  k.spr(k.SP.wing, x + 50 * s, y - 48 * s, s * .85, rot + .1 + flap);
  k.spr(k.SP.bee, x, y, s, rot);
  if (s > .3) k.face(x - 34 * s, y + 4 * s, 46 * s, expr, rot);
}
window.VIDEO = {
  size: [1080, 1080],
  seed: 5,
  build(k) {
    const { sprite, cut, circ, ellipse, rect, tear, wavy, C, SP } = k;
    SP.bee = sprite(300, 240, 150, 120, g => {
      cut(g, [[92, -10], [128, 0], [92, 10]], C.ink, { edge: 3, tex: false });
      cut(g, ellipse(95, 75), C.yellow);
      cut(g, rect(22, 118, 30, 0), C.ink, { edge: 0, shadow: false });
      cut(g, rect(20, 82, 68, 0), C.ink, { edge: 0, shadow: false });
    });
    SP.wing = sprite(170, 130, 30, 100, g => cut(g, ellipse(52, 30, 50, -40), "#dff1fb", { edge: 4, texA: .05 }));
    const flower = col => sprite(280, 480, 140, 140, g => {
      cut(g, rect(14, 260, 0, 170), C.green, { edge: 4 });
      for (let i = 0; i < 6; i++) { const a = i / 6 * k.TAU; cut(g, circ(42, Math.cos(a) * 58, Math.sin(a) * 58), col, { edge: 4 }); }
      cut(g, circ(40), C.amber, { edge: 4 });
    });
    SP.flowerA = flower(C.coral); SP.flowerB = flower(C.cream);
    SP.hive = sprite(440, 480, 220, 240, g => {
      [[90, 45, -140], [130, 52, -78], [155, 56, -12], [155, 56, 54], [128, 52, 118]].forEach(([rx, ry, cy], i) => cut(g, ellipse(rx, ry, 0, cy), i % 2 ? C.tan : C.amber, { edge: 5 }));
      cut(g, circ(34, 0, 62), C.ink, { edge: 0, shadow: false });
    });
    SP.jar = sprite(340, 440, 170, 220, g => {
      cut(g, rect(170, 54, 0, -152), C.red);
      cut(g, rect(224, 280, 0, 14), C.amber);
      cut(g, rect(140, 86, 0, 24), k.notebookFill, { edge: 4 });
    });
    SP.drop = sprite(160, 220, 80, 150, g => cut(g, tear(50), C.amber, { edge: 5 }));
    SP.card = sprite(900, 420, 450, 210, g => cut(g, rect(800, 300), k.notebookFill, { edge: 7 }));
    SP.hill = sprite(1240, 420, 80, 40, g => cut(g, wavy(1080, 380, 18, 80), C.greenL, { ang: 0 }));
  },
  cards: [
    { dur: 3.2, bg: "sky",
      sfx: [[0.05, "pop"], [0.32, "write", { dur: .8 }], [1.15, "boing", { f: 330, dur: .35 }], [1.4, "chime", { notes: [84, 88] }]],
      draw(t, k) { const { spr, SP, pop, hand, eout, seg, C } = k;
        spr(SP.hill, 0, 800, 1);
        const s = pop(t, .05); spr(SP.card, 540, 450, s, -.03);
        k.ctx.save(); k.ctx.translate(540, 450); k.ctx.rotate(-.03); k.ctx.scale(s, s); hand("how is honey made?", 0, 36, 92, C.blueInk, eout(seg(t, .32, 1.1))); k.ctx.restore();
        bee(k, 850, 250 + Math.sin(t * 5) * 6, .7 * pop(t, 1.15, .45), t > 2.2 ? "joy" : "happy", t, -.1);
      } },
    { dur: 3.0, bg: "mustard", word: "nectar", note: { text: "one trip = 50 to 100 flowers", x: 540, y: 800, at: 1.3 },
      sfx: [[0, "pop"], [.12, "pop", { lo: 600, hi: 1300 }], [.3, "whistle", { f0: 1400, f1: 500, dur: 1.0, gain: .6 }], [1.5, "plips", { n: 5, gap: .16, f0: 900, step: 90 }]],
      draw(t, k) { const { spr, SP, pop, seg, eio, dot, C } = k;
        spr(SP.flowerA, 300, 430, pop(t, 0), Math.sin(t * 2) * .03); spr(SP.flowerB, 560, 470, pop(t, .12) * .85, Math.sin(t * 2 + 1) * .03);
        const u = eio(seg(t, .3, 1.4)), p = new k.Path(k.cubic([960, 180], [820, 60], [560, 120], [470, 300])).at(u);
        const x = p[0], y = p[1] + Math.sin(t * 6) * 5;
        if (t > 1.5) for (let i = 0; i < 4; i++) { const ph = (t * 1.4 + i / 4) % 1; dot(360 + ph * 70, 400 - ph * 70, 7, C.amber, 1 - ph); }
        bee(k, x, y, .75 * pop(t, .25), t > 1.5 ? "joy" : "wow", t, (1 - u) * -.25);
      } },
    { dur: 3.0, bg: "teal", word: "fanning", note: { text: "honey is only about 18 % water", x: 540, y: 810, at: 1.2 },
      sfx: [[0, "pop", { lo: 380, hi: 900, dur: .12 }], [.4, "whoosh", { dur: 1.1 }], [1.6, "whoosh", { dur: 1.0, gain: .8 }]],
      draw(t, k) { const { spr, SP, pop, dashed, C } = k;
        spr(SP.hive, 330, 420, pop(t, 0));
        if (t > .5) [-60, 0, 60].forEach((dy, i) => dashed([[640, 440 + dy], [570, 430 + dy * .8], [500, 440 + dy * .6]], { color: C.cream, w: 5, dash: [16, 14], off: t * 90 + i * 9, a: .8 }));
        bee(k, 800, 430 + Math.sin(t * 5) * 5, .85 * pop(t, .2), "happy", t * 1.6, Math.sin(t * 9) * .04);
      } },
    { dur: 3.0, bg: "pink", word: "honey", note: { text: "1 bee = 1/12 teaspoon in her life", x: 540, y: 810, at: 1.3 },
      sfx: [[0, "boing"], [.5, "plips", { n: 4, gap: .22, f0: 700, step: 60 }], [1.5, "chime"]],
      draw(t, k) { const { spr, SP, pop, seg } = k;
        const d = seg((t - .4) % .9, 0, .5); if (t > .4 && t < 2.2) spr(SP.drop, 360, 60 + d * 150, .6, 0, 1, 1 + d * .2, 1 - d * .3);
        spr(SP.jar, 360, 440, pop(t, 0, .5), -.04);
        bee(k, 780, 400 + Math.sin(t * 4) * 7, .9 * pop(t, .3), t > 1.4 ? "joy" : "happy", t);
      } },
    { dur: 3.8, bg: "paper", word: "thank you, bees!",
      sfx: [[0.1, "pop"], [.3, "rise", { n: 6 }], [1.9, "chime", { notes: [72, 76, 79, 84], gap: .05 }]],
      draw(t, k) { const { spr, SP, pop } = k;
        [[SP.flowerA, .42], [SP.hive, .4], [SP.jar, .42], [SP.drop, .7], [SP.flowerB, .42], [SP.drop, .7]].forEach(([sp, sc], i) => {
          const a = -Math.PI / 2 + i / 6 * k.TAU + t * .25; spr(sp, 540 + Math.cos(a) * 300, 420 + Math.sin(a) * 270, sc * pop(t, .3 + i * .1), Math.sin(t * 2 + i) * .08); });
        bee(k, 560, 420 + Math.sin(t * 3.5) * 8, 1.0 * pop(t, .1), t > 1 ? "joy" : "happy", t);
      } }
  ]
};
