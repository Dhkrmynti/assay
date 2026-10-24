import { chromium } from "/Users/sergiodyegogmail.com/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
const [out, ...names] = process.argv.slice(2), here = new URL(".", import.meta.url).pathname;
const b = await chromium.launch(); const errs = [];
const url = (s) => `file://${here}scenes-now.html?s=${s}`;
for (const s of names) {
  const p = await b.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.5 }); p.on("pageerror", (e) => errs.push(s + ": " + e.message));
  await p.goto(url(s)); await p.waitForLoadState("networkidle"); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.evaluate(() => window.SCENE.seek(window.SCENE.dur || 99)); await p.screenshot({ path: `${out}/png/${s}.png` }); await p.close();
  const dur = await (async () => { const q = await b.newPage({ viewport: { width: 1600, height: 900 } }); await q.goto(url(s)); const d = await q.evaluate(() => window.SCENE.dur); await q.close(); return d; })();
  if (!dur) { console.log("png", s); continue; }
  const v = await b.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.2 }); v.on("pageerror", (e) => errs.push(s + ": " + e.message));
  await v.goto(url(s)); await v.waitForLoadState("networkidle"); await v.evaluate(() => document.fonts.ready);
  const fps = 30, dir = `${out}/.frames-${s}`; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  const total = Math.round((dur + 1.5) * fps);
  for (let i = 0; i < total; i++) { await v.evaluate((t) => window.SCENE.seek(t), Math.min(dur, i / fps)); await v.screenshot({ path: `${dir}/${String(i).padStart(4, "0")}.jpg`, type: "jpeg", quality: 92 }); }
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", `${dir}/%04d.jpg`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "slow", "-movflags", "+faststart", `${out}/video/${s}.mp4`]);
  fs.rmSync(dir, { recursive: true, force: true }); await v.close(); console.log("png+mp4", s, dur + "s");
}
console.log("errors", errs); await b.close();
