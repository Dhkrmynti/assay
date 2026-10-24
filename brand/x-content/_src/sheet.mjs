import { chromium } from "/Users/sergiodyegogmail.com/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs";
import fs from "node:fs";
const n = process.argv.slice(2);
fs.writeFileSync("sheet.html", `<html><body style="margin:0;background:#888;display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:6px;font:600 16px sans-serif;color:#fff">${n.map((x) => `<div>${x}<img src="../png/${x}.png" style="width:100%;display:block"></div>`).join("")}</body></html>`);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 900 } });
await p.goto(`file://${process.cwd()}/sheet.html`); await p.waitForTimeout(800); await p.screenshot({ path: "sheet.png", fullPage: true }); await b.close();
