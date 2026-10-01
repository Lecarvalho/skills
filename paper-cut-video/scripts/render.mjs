// Render a PaperCut page to a silent MP4 + events.json (sound cue list) with headless Chromium.
// usage: node render.mjs page.html OUT_DIR [--fps 24] [--frames "2.5,5.1"]   (--frames: only save PNG stills at those seconds + a sheet.png contact sheet)
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const page = pathToFileURL(path.resolve(args[0])).href, out = path.resolve(args[1] || "out");
const fps = +(args[args.indexOf("--fps") + 1] || 0) || 24;
const stills = args.includes("--frames") ? args[args.indexOf("--frames") + 1].split(",").map(Number) : null;
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const probe = await browser.newPage();
await probe.addInitScript(() => { window.__EXPORT = true; });
await probe.goto(page);
const size = await probe.evaluate(async () => { await window.__anim.ready; return window.__anim.size; });
await probe.close();
const p = await browser.newPage({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 1 });
const errors = []; p.on("pageerror", e => errors.push(e.message));
await p.addInitScript(() => { window.__EXPORT = true; });
await p.goto(page);
const info = await p.evaluate(async () => { await window.__anim.ready; return { duration: window.__anim.duration, events: window.__anim.events }; });
if (errors.length) { console.error("page errors:\n" + errors.join("\n")); process.exit(1); }
fs.writeFileSync(path.join(out, "events.json"), JSON.stringify({ duration: info.duration, events: info.events }, null, 1));

const grab = t => p.evaluate(t => { window.__anim.renderAt(t); return document.getElementById("stage").toDataURL("image/png").split(",")[1]; }, t);
if (stills) {
  for (const [i, t] of stills.entries()) fs.writeFileSync(path.join(out, `still_${String(i + 1).padStart(2, "0")}.png`), Buffer.from(await grab(t), "base64"));
  const cols = Math.min(4, stills.length), rows = Math.ceil(stills.length / cols);
  const sheet = spawn("ffmpeg", ["-y", "-v", "error", "-start_number", "1", "-i", path.join(out, "still_%02d.png"), "-vf", `scale=360:-1,tile=${cols}x${rows}`, "-frames:v", "1", "-update", "1",
    path.join(out, "sheet.png")], { stdio: "inherit" });
  await new Promise(r => sheet.on("close", r));
  console.log(`stills → ${out}  (sheet.png, left→right, top→bottom: ${stills.map(t => t + " s").join(", ")})`);
} else {
  const N = Math.round(info.duration * fps);
  const ff = spawn("ffmpeg", ["-y", "-v", "error", "-f", "image2pipe", "-framerate", String(fps), "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p",
    "-crf", "18", "-preset", "medium", "-movflags", "+faststart", path.join(out, "silent.mp4")], { stdio: ["pipe", "inherit", "inherit"] });
  for (let i = 0; i < N; i += 24) {
    const batch = await p.evaluate(([i, n, fps]) => { const c = document.getElementById("stage"), o = [];
      for (let k = i; k < Math.min(i + 24, n); k++) { window.__anim.renderAt(k / fps); o.push(c.toDataURL("image/png").split(",")[1]); } return o; }, [i, N, fps]);
    for (const d of batch) if (!ff.stdin.write(Buffer.from(d, "base64"))) await new Promise(r => ff.stdin.once("drain", r));
    process.stdout.write(`\rframes ${Math.min(i + 24, N)}/${N}`);
  }
  ff.stdin.end(); await new Promise(r => ff.on("close", r));
  console.log(`\nsilent.mp4 + events.json → ${out}  (${info.duration.toFixed(2)} s, ${info.events.length} sound cues)`);
}
await browser.close();
