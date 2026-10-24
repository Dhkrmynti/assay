"""Four full-page concept previews for Signal Agent (Lens, Monolith, Atlas, Instrument).
Each page: hero, live band, how it works (pinned, the 3D changes per step), tools, token, footer; GSAP scroll motion.
Run: python3 build.py  -> writes ocula/concept-<name>.html (served at /concept/<name>)."""
import os, json
H = os.path.dirname(os.path.abspath(__file__)); D = os.path.dirname(os.path.dirname(H)) + "/"
MARK = '<svg viewBox="20 30 216 196" aria-hidden="true"><path d="M226 50H128a39 39 0 0 0 0 78a39 39 0 0 1 0 78H30" fill="none" stroke="currentColor" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/></svg>'
SWITCH = [("lens", "1 · Lens"), ("monolith", "2 · Monolith"), ("atlas", "3 · Atlas"), ("instrument", "4 · Instrument")]
TOOLS = [("scan", "Scanner", "A full report on any token: rug risk, bundles, X check."), ("radar", "Launch Radar", "Every new launch, filtered live."),
         ("snipe", "Sniper", "Manual, or let the agent buy what clears."), ("fees", "Fee Claimer", "Creator fees from one wallet or 200 accounts."),
         ("launch", "Pons Launchpad", "Launch from your own wallet. Always free."), ("kit", "Launch Kit", "Lore, bio, thread and launch post, written for you."),
         ("agent", "Agent Studio", "Design the AI agent of your own token.")]

CSS = """
:root{--sans:"Inter Tight",-apple-system,system-ui,sans-serif;--mono:"JetBrains Mono",ui-monospace,Menlo,monospace;--ease:cubic-bezier(.22,1,.36,1)}
*{box-sizing:border-box}html{background:var(--bg);scroll-behavior:auto}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 var(--sans);-webkit-font-smoothing:antialiased;overflow-x:hidden}
::selection{background:var(--fg);color:var(--bg)}
a{color:inherit}
canvas#c{position:fixed;inset:0;width:100%;height:100%;display:block;z-index:0}
.nav{position:fixed;inset:0 0 auto;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:20px 34px;transition:background .4s,backdrop-filter .4s}
body.scrolled .nav{background:color-mix(in srgb,var(--bg) 80%,transparent);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
.brand{display:flex;align-items:center;gap:10px;font:600 17px var(--sans);letter-spacing:-.03em;color:var(--fg);text-decoration:none}
.brand svg{width:22px;height:auto}.brand span{font-weight:400}
.nav nav{display:flex;gap:28px}.nav nav a{text-decoration:none;font-size:13.5px;opacity:.65;transition:opacity .2s}.nav nav a:hover{opacity:1}
.btn{display:inline-flex;align-items:center;height:36px;padding:0 16px;border-radius:999px;border:1px solid var(--line2);font:500 13px var(--sans);text-decoration:none;color:var(--fg);background:transparent;cursor:pointer;transition:all .3s var(--ease)}
.btn.solid{background:var(--fg);color:var(--bg);border-color:var(--fg)}.btn:hover{transform:translateY(-1px)}
.btn.lg{height:46px;padding:0 24px;font-size:14px}
main{position:relative;z-index:1}
section{position:relative}
.wrap{max-width:1200px;margin:0 auto;padding:0 34px}
.kick{font:400 11.5px var(--mono);letter-spacing:.16em;text-transform:uppercase;opacity:.6;margin:0 0 20px}
h1{margin:0;font:400 clamp(42px,5.6vw,84px)/1 var(--sans);letter-spacing:-.05em}
h2{margin:0;font:400 clamp(32px,4vw,58px)/1.05 var(--sans);letter-spacing:-.045em}
h1 em,h2 em{font-style:normal;opacity:.4}
.lead{margin:22px 0 0;max-width:40ch;font-size:17px;opacity:.72}
.ask{display:flex;align-items:center;gap:12px;margin-top:32px;width:min(440px,86vw);border-bottom:1px solid var(--line2);padding:10px 0}
.ask input{flex:1;border:0;background:transparent;color:inherit;font:300 18px var(--sans);outline:0}.ask input::placeholder{color:inherit;opacity:.45}
.ask a{font:500 13px var(--sans);text-decoration:none}
/* hero */
.hero{height:100svh;min-height:640px}
.copy{position:absolute;z-index:2}
.legend{position:absolute;z-index:2;right:34px;bottom:30px;display:flex;gap:22px;font:400 11px var(--mono);letter-spacing:.08em;opacity:.65}
.legend b{font-weight:600}
.cue{position:absolute;left:50%;bottom:30px;transform:translateX(-50%);font:400 10.5px var(--mono);letter-spacing:.2em;text-transform:uppercase;opacity:.5;display:flex;flex-direction:column;align-items:center;gap:10px}
.cue i{width:1px;height:38px;background:currentColor;transform-origin:top;animation:cue 2.2s var(--ease) infinite}
@keyframes cue{0%{transform:scaleY(0)}50%{transform:scaleY(1);transform-origin:top}51%{transform-origin:bottom}100%{transform:scaleY(0);transform-origin:bottom}}
/* solid sections sit over the 3D; the how section lets it show */
.solid{background:var(--bg)}
.band{padding:150px 0 130px}
.bh{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap;margin-bottom:46px}
.tally{font:400 13px var(--mono);opacity:.75}.tally b{font-weight:600}
.rows{border-top:1px solid var(--line);min-height:460px}
.row{display:grid;grid-template-columns:170px 70px minmax(0,1fr) 150px;align-items:center;gap:24px;padding:18px 4px;border-bottom:1px solid var(--line);text-decoration:none}
.row .sym{font:500 16px var(--sans);letter-spacing:-.01em}.row .age{font:12px var(--mono);opacity:.5}
.row .why{font-size:13.5px;opacity:.65;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row .st{justify-self:end;font:500 11px var(--mono);letter-spacing:.12em;text-transform:uppercase;opacity:.55}
.row.sig .st,.row.sig .sym{opacity:1;font-weight:600}
.row.int .st{color:var(--int);opacity:1}
.row .bar{grid-column:1/-1;height:2px;background:var(--line);margin-top:-6px;overflow:hidden}.row .bar i{display:block;height:100%;background:var(--fg);transform-origin:left;transform:scaleX(0)}
/* how: pinned, three steps, the 3D does the explaining */
.how{height:100svh;min-height:640px}
.how .wrap{height:100%;display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);align-items:center}
.how .wrap>div:first-child{padding:34px 36px;border-radius:22px;background:color-mix(in srgb,var(--bg) 82%,transparent);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);max-width:520px}
.steps{display:grid;gap:8px;margin-top:40px;max-width:430px}
.step{padding:18px 20px;border-radius:14px;border:1px solid transparent;opacity:.35;transition:all .6s var(--ease)}
.step b{display:block;font:500 18px var(--sans);letter-spacing:-.02em}.step span{font-size:14.5px;opacity:.75}
.step .n{font:400 11px var(--mono);letter-spacing:.14em;opacity:.6;display:block;margin-bottom:6px}
.step.on{opacity:1;border-color:var(--line2);background:color-mix(in srgb,var(--bg) 70%,transparent);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.meter{height:2px;background:var(--line);margin-top:26px;max-width:430px}.meter i{display:block;height:100%;background:var(--fg);transform-origin:left;transform:scaleX(0)}
/* tools */
.tools{padding:150px 0}
.tgrid{display:grid;grid-template-columns:repeat(4,1fr);margin-top:56px;border-top:1px solid var(--line);border-left:1px solid var(--line)}
.tgrid a{display:grid;align-content:space-between;gap:46px;min-height:190px;padding:24px;border-right:1px solid var(--line);border-bottom:1px solid var(--line);text-decoration:none;transition:background .4s var(--ease)}
.tgrid a:hover{background:var(--hover)}
.tgrid b{font:500 18px var(--sans);letter-spacing:-.02em}.tgrid small{font-size:13.5px;opacity:.65;line-height:1.5}
.tgrid .tn{font:400 11px var(--mono);opacity:.45;letter-spacing:.1em}
/* token */
.token{padding:150px 0 160px}
.tk{display:grid;grid-template-columns:1.1fr .9fr;gap:80px;align-items:end}
.facts{margin:0;border-top:1px solid var(--line)}.facts div{display:flex;justify-content:space-between;padding:17px 0;border-bottom:1px solid var(--line);font-size:14.5px}.facts dt{opacity:.55}.facts dd{margin:0;font-family:var(--mono);font-size:13px}
.cta{display:flex;gap:10px;margin-top:34px;flex-wrap:wrap}
.big{font:400 clamp(70px,12vw,190px)/.9 var(--sans);letter-spacing:-.06em;margin:0;opacity:.95}
footer{position:relative;z-index:1;background:var(--bg);border-top:1px solid var(--line)}
.fr{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;padding:26px 34px;font-size:13px;opacity:.7;max-width:1200px;margin:0 auto}
.switch{position:fixed;z-index:30;left:50%;bottom:20px;transform:translateX(-50%);display:flex;gap:4px;padding:4px;border-radius:999px;background:color-mix(in srgb,var(--fg) 10%,transparent);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.switch a{padding:7px 14px;border-radius:999px;font:500 12.5px var(--sans);text-decoration:none;opacity:.6}.switch a.on{background:var(--fg);color:var(--bg);opacity:1}
/* motion: words rise out of a mask */
.sp{display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.08em}.sp>span{display:inline-block;will-change:transform}
@media (max-width:860px){.nav nav{display:none}.nav{padding:16px 18px}.wrap{padding:0 20px}.legend{display:none}
  .row{grid-template-columns:minmax(0,1fr) 60px auto}.row .why,.row .age{display:none}
  .how .wrap{grid-template-columns:1fr;align-content:end;padding-bottom:90px}.steps{margin-top:24px}
  .tgrid{grid-template-columns:1fr 1fr}.tk{grid-template-columns:1fr;gap:50px}.band,.tools,.token{padding:110px 0}}
@media (max-width:520px){.tgrid{grid-template-columns:1fr}.tgrid a{min-height:0;gap:16px}}
"""

SHARED_JS = r"""
gsap.registerPlugin(ScrollTrigger);
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ageOf = (s) => (s < 60 ? Math.max(1, Math.round(s)) + "s" : s < 3600 ? Math.round(s / 60) + "m" : Math.round(s / 3600) + "h");
addEventListener("scroll", () => document.body.classList.toggle("scrolled", scrollY > 40), { passive: true });
// split headings into words that rise out of a mask
$$("[data-split]").forEach((h) => { h.innerHTML = h.innerHTML.split(/(<br>|<em>|<\/em>|\s+)/).map((w) => (!w || /^\s+$/.test(w) || /^<\/?(br|em)>$/.test(w) ? w : `<span class="sp"><span>${w}</span></span>`)).join(""); });
// live data: the band and the token facts
const V = window.VOCAB;
async function band() {
  let rows = []; try { rows = (await (await fetch("/api/radar")).json()).rows || []; } catch {}
  if (!rows.length) rows = DEMO.slice(0, 6).map((s, i) => ({ symbol: s, token: "0x" + i, ageSec: 60 * (i + 1), pass: i === 1, devRugged: i === 3, checks: [{ ok: false, text: "slow: 1 buyer in 5 min" }] }));
  const sig = rows.filter((r) => r.pass).length;
  $("#tally").innerHTML = `<b>${rows.length}</b> read · <b>${sig}</b> ${esc(V.sig.toLowerCase())} · <b>${rows.length - sig}</b> ${esc(V.noise.toLowerCase())}`;
  $("#rows").innerHTML = rows.slice(0, 8).map((r) => { const bad = r.checks.find((c) => !c.ok); const why = r.pass ? (r.checks.find((c) => /grow/.test(c.text))?.text || "every check passed") : bad ? bad.text : "";
    return `<a class="row ${r.pass ? "sig" : r.devRugged ? "int" : ""}" href="/?ca=${esc(r.token)}#scan"><span class="sym">$${esc(r.symbol)}</span><span class="age">${ageOf(r.ageSec)}</span><span class="why">${esc(why.replace(/(\d+\.\d{2})\d+/g, "$1"))}</span><span class="st">${esc(r.pass ? V.sig : r.devRugged ? V.int : V.noise)}</span><span class="bar"><i style="--w:${r.pass ? 1 : r.devRugged ? 0.25 : 0.12}"></i></span></a>`; }).join("");
  if (!RM) gsap.fromTo("#rows .row", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: "expo.out", stagger: 0.06, scrollTrigger: { trigger: "#rows", start: "top 82%", once: true } });
  $$("#rows .bar i").forEach((b) => gsap.to(b, { scaleX: +b.style.getPropertyValue("--w"), duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: b, start: "top 90%", once: true } }));
  window.S3D?.data?.(rows);
  ScrollTrigger.refresh();
}
band();
fetch("/api/status").then((r) => r.json()).then((j) => { if (!j.novaToken) return; $("#ca").textContent = j.novaToken.slice(0, 6) + "…" + j.novaToken.slice(-4); $$("[data-buy]").forEach((b) => (b.href = "https://ponsfamily.com/launchpad/" + j.novaToken)); }).catch(() => {});
// motion
if (!RM) {
  gsap.from(".hero .copy .sp>span", { yPercent: 110, duration: 1.3, ease: "expo.out", stagger: 0.05, delay: 0.15 });
  gsap.from([".hero .kick", ".hero .lead", ".hero .ask", ".legend", ".cue"], { y: 18, opacity: 0, duration: 1.2, ease: "expo.out", stagger: 0.08, delay: 0.5 });
  $$("section:not(.hero) h2[data-split]").forEach((h) => gsap.from($$(".sp>span", h), { yPercent: 110, duration: 1.2, ease: "expo.out", stagger: 0.04, scrollTrigger: { trigger: h, start: "top 85%", once: true } }));
  $$(".rv").forEach((el) => gsap.from(el, { y: 30, opacity: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } }));
  gsap.from(".tgrid a", { y: 40, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.06, scrollTrigger: { trigger: ".tgrid", start: "top 80%", once: true } });
  gsap.from(".big", { yPercent: 40, opacity: 0, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".big", start: "top 90%", once: true } });
  // the hero copy drifts up and fades as you leave
  gsap.to(".hero .copy", { y: -120, opacity: 0, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
}
// whole-page progress and the pinned how section drive the 3D
addEventListener("load", () => ScrollTrigger.refresh()); document.fonts?.ready.then(() => ScrollTrigger.refresh());
ScrollTrigger.create({ start: 0, end: "max", onUpdate: (s) => window.S3D?.scroll?.(s.progress) });
$$("section[data-sec]").forEach((s) => ScrollTrigger.create({ trigger: s, start: "top 55%", end: "bottom 45%", onToggle: (st) => st.isActive && window.S3D?.section?.(s.dataset.sec) }));
const steps = $$(".step");
ScrollTrigger.create({ trigger: ".how", start: "top top", end: "+=240%", pin: true, scrub: true, onUpdate: (s) => {
  const p = s.progress, i = Math.min(2, Math.floor(p * 3)); steps.forEach((el, k) => el.classList.toggle("on", k === i));
  $(".meter i").style.transform = `scaleX(${p})`; window.S3D?.step?.(i, p);
} });
"""

def page(name, m, js):
    sw = "".join(f'<a href="/concept/{k}" class="{"on" if k == name else ""}">{t}</a>' for k, t in SWITCH)
    V = m["VOCAB"]
    steps = "".join(f'<div class="step{" on" if i == 0 else ""}"><span class="n">0{i + 1}</span><b>{a}</b><span>{b}</span></div>' for i, (a, b) in enumerate(V["steps"]))
    tools = "".join(f'<a href="/#{k}" ><span class="tn">0{i + 1}</span><span><b>{n}</b><br><small>{d}</small></span></a>' for i, (k, n, d) in enumerate(TOOLS))
    tools += f'<a href="/" style="background:var(--hover)"><span class="tn">→</span><span><b>Ask Signal</b><br><small>{V["ask"]}</small></span></a>'
    theme = f':root{{--bg:{m["BG"]};--fg:{m["FG"]};--line:{m["LINE"]};--line2:{m["LINE2"]};--hover:{m["HOVER"]};--int:{m["INT"]}}}'
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Signal Agent · {m["TITLE"]} (concept)</title><meta name="robots" content="noindex"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>{theme}{CSS}{m["CSS"]}</style></head><body>
<canvas id="c"></canvas>
<header class="nav"><a class="brand" href="/">{MARK}<b>signal</b><span>agent</span></a><nav><a href="#band">{V["navband"]}</a><a href="#how">How it works</a><a href="#tools">Tools</a><a href="#token">Token</a></nav><a class="btn solid" data-buy href="#token">Buy token</a></header>
<main>
<section class="hero" data-sec="hero">{m["HERO"]}<div class="cue">Scroll<i></i></div></section>
<section class="band solid" id="band" data-sec="band"><div class="wrap"><div class="bh"><div><p class="kick rv">{V["bandkick"]}</p><h2 data-split>{V["band"]}</h2></div><p class="tally rv" id="tally"></p></div><div class="rows" id="rows"></div></div></section>
<section class="how" id="how" data-sec="how"><div class="wrap"><div><p class="kick">How it works</p><h2 data-split>{V["how"]}</h2><div class="steps">{steps}</div><div class="meter"><i></i></div></div><div></div></div></section>
<section class="tools solid" id="tools" data-sec="tools"><div class="wrap"><p class="kick rv">Tools</p><h2 data-split>{V["tools"]}</h2><div class="tgrid">{tools}</div></div></section>
<section class="token solid" id="token" data-sec="token"><div class="wrap"><p class="big">{V["bigword"]}</p><div class="tk" style="margin-top:60px"><div><p class="kick rv">Token</p><h2 data-split>{V["token"]}</h2><p class="lead rv">Hold 0.1% of the token supply and sign once with your wallet: every tool opens. Signing is free and sends nothing. The Pons Launchpad stays free for everyone.</p><div class="cta rv"><a class="btn solid lg" data-buy href="#">Buy token</a><a class="btn lg" href="/">Holder access</a></div></div>
<dl class="facts rv"><div><dt>Chain</dt><dd>Robinhood Chain</dd></div><div><dt>Launched on</dt><dd>Pons</dd></div><div><dt>Unlock</dt><dd>0.1% of supply</dd></div><div><dt>Contract</dt><dd id="ca">—</dd></div></dl></div></div></section>
</main>
<footer><div class="fr"><span>© 2026 Signal Agent · {m["TITLE"]} concept</span><span>Not financial advice. On-chain data only.</span></div></footer>
<nav class="switch">{sw}</nav>
<script src="/vendor/gsap.min.js"></script><script src="/vendor/ScrollTrigger.min.js"></script>
<script type="importmap">{{"imports":{{"three":"/vendor/three/build/three.module.min.js","three/addons/":"/vendor/three/examples/jsm/"}}}}</script>
<script type="module">
window.VOCAB = {json.dumps({k: v for k, v in V.items() if k in ("sig", "noise", "int")})};
const DEMO = ["MBULL","KABU","PUPKINU","FREE","LOBSTERC","GLWA","AVON","WORM","ZETA","NOAN","CAPY","HUSH","TRACER","ORBIX","GILET","PRDX","NIMBUFF","SCOTIA"];
async function launches(){{ try {{ const j = await (await fetch("/api/radar")).json(); return j.rows || []; }} catch {{ return []; }} }}
{js}
{SHARED_JS}
</script></body></html>"""

for name in ["lens", "monolith", "atlas", "instrument"]:
    src = open(os.path.join(H, name + ".js")).read()
    meta, js = src.split("# ---- js ----", 1)
    m = {}; exec(meta, {}, m)
    open(D + f"concept-{name}.html", "w").write(page(name, m, js))
    print("wrote concept-" + name)
