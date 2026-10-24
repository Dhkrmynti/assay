import { chromium } from "/Users/sergiodyegogmail.com/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs";
const b = await chromium.launch();
for (const [f, w, h, s] of [["banner-dark", 1500, 500, 2], ["banner-light", 1500, 500, 2], ["avatar-dark", 400, 400, 2], ["avatar-light", 400, 400, 2]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: s });
  await p.goto(`file://${process.cwd()}/${f}.html`); await p.waitForLoadState("networkidle"); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.screenshot({ path: `../profile/ocula-x-${f}.png` }); await p.close();
}
await b.close();
