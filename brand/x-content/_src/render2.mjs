import { chromium } from "/Users/sergiodyegogmail.com/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
const mode = process.argv[2], names = process.argv.slice(3);
const b = await chromium.launch(); const errs = [];
const url = (s) => `file://${process.cwd()}/scenes2.html?s=${s}`;
for (const s of names) {
  if (mode === "png") {
    const p = await b.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.5 }); p.on("pageerror", (e) => errs.push(s + ": " + e.message));
    await p.goto(url(s)); await p.waitForLoadState("networkidle"); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
    await p.evaluate(() => window.SCENE.seek(window.SCENE.dur || 99)); await p.screenshot({ path: `../batch2/png/${s}.png` }); await p.close(); console.log("png", s);
  } else {
    const p = await b.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.2 }); p.on("pageerror", (e) => errs.push(s + ": " + e.message));
    await p.goto(url(s)); await p.waitForLoadState("networkidle"); await p.evaluate(() => document.fonts.ready);
    const dur = await p.evaluate(() => window.SCENE.dur), fps = 30, dir = `frames-${s}`;
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
    const total = Math.round((dur + 1.5) * fps);   // hold the last frame 1.5 s
    for (let i = 0; i < total; i++) { await p.evaluate((t) => window.SCENE.seek(t), Math.min(dur, i / fps)); await p.screenshot({ path: `${dir}/${String(i).padStart(4, "0")}.jpg`, type: "jpeg", quality: 92 }); }
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", `${dir}/%04d.jpg`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "slow", "-movflags", "+faststart", `../batch2/video/${s}.mp4`]);
    fs.rmSync(dir, { recursive: true, force: true }); await p.close(); console.log("mp4", s, dur + "s");
  }
}
console.log("errors", errs); await b.close();
