"""Four concept previews for Signal Agent (Lens, Monolith, Atlas, Instrument). Each is one hero page with its own 3D.
Run: python3 build.py   -> writes ocula/concept-<name>.html (served at /concept/<name>)."""
import os
H = os.path.dirname(os.path.abspath(__file__)); D = os.path.dirname(os.path.dirname(H)) + "/"
MARK = '<svg viewBox="20 30 216 196" aria-hidden="true"><path d="M226 50H128a39 39 0 0 0 0 78a39 39 0 0 1 0 78H30" fill="none" stroke="currentColor" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/></svg>'
BASE_CSS = """
:root{--paper:#F5F3EC;--ink:#161514;--dim:#6B675F;--faint:#9A958B;--line:rgba(22,21,20,.12);--sans:"Inter Tight",-apple-system,system-ui,sans-serif;--mono:"JetBrains Mono",ui-monospace,Menlo,monospace}
*{box-sizing:border-box}html,body{margin:0;height:100%}
body{background:var(--bg);color:var(--fg);font:16px/1.55 var(--sans);-webkit-font-smoothing:antialiased;overflow:hidden}
canvas#c{position:fixed;inset:0;width:100%;height:100%;display:block}
.nav{position:fixed;inset:0 0 auto;z-index:5;display:flex;align-items:center;justify-content:space-between;padding:22px 34px}
.brand{display:flex;align-items:center;gap:10px;font:600 17px var(--sans);letter-spacing:-.03em;color:var(--fg);text-decoration:none}
.brand svg{width:22px;height:auto}.brand span{font-weight:400}
.nav .tag{font:400 11px var(--mono);letter-spacing:.14em;text-transform:uppercase;opacity:.6}
.copy{position:fixed;z-index:4;pointer-events:none}
.copy *{pointer-events:auto}
.kick{font:400 11.5px var(--mono);letter-spacing:.14em;text-transform:uppercase;opacity:.65;margin:0 0 18px}
h1{margin:0;font:400 clamp(40px,5.4vw,80px)/1 var(--sans);letter-spacing:-.05em}
h1 em{font-style:normal;opacity:.4}
.lead{margin:20px 0 0;max-width:40ch;font-size:16.5px;opacity:.72}
.ask{display:flex;align-items:center;gap:12px;margin-top:30px;width:min(420px,86vw);border-bottom:1px solid currentColor;padding:8px 0;opacity:.9}
.ask input{flex:1;border:0;background:transparent;color:inherit;font:300 17px var(--sans);outline:0}
.ask input::placeholder{color:inherit;opacity:.45}
.ask a{font:500 13px var(--sans);color:inherit;text-decoration:none}
.legend{position:fixed;z-index:4;right:34px;bottom:28px;display:flex;gap:22px;font:400 11px var(--mono);letter-spacing:.08em;opacity:.7}
.legend b{font-weight:600}
.switch{position:fixed;z-index:6;left:50%;bottom:22px;transform:translateX(-50%);display:flex;gap:4px;padding:4px;border-radius:999px;background:rgba(127,127,127,.14);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.switch a{padding:7px 14px;border-radius:999px;font:500 12.5px var(--sans);color:var(--fg);text-decoration:none;opacity:.6}
.switch a.on{background:var(--fg);color:var(--bg);opacity:1}
@media (max-width:800px){.nav{padding:16px 18px}.nav .tag{display:none}.legend{display:none}}
"""
SWITCH = [("lens", "1 · Lens"), ("monolith", "2 · Monolith"), ("atlas", "3 · Atlas"), ("instrument", "4 · Instrument")]
LIVE_JS = """
// live launches from the site (the public radar shows the six newest)
async function launches(){ try { const j = await (await fetch("/api/radar")).json(); return j.rows || []; } catch { return []; } }
const DEMO = ["MBULL","KABU","PUPKINU","FREE","LOBSTERC","GLWA","AVON","WORM","ZETA","NOAN","CAPY","HUSH","TRACER","ORBIX","GILET","PRDX","NIMBUFF","SCOTIA"];
"""

def page(name, title, bg, fg, body, css, js):
    sw = "".join(f'<a href="/concept/{k}" class="{"on" if k == name else ""}">{t}</a>' for k, t in SWITCH)
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Signal Agent · {title} (concept)</title><meta name="robots" content="noindex"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>:root{{--bg:{bg};--fg:{fg}}}{BASE_CSS}{css}</style></head><body>
<canvas id="c"></canvas>
<header class="nav"><a class="brand" href="/">{MARK}<b>signal</b><span>agent</span></a><span class="tag">Concept {title}</span></header>
{body}
<nav class="switch">{sw}</nav>
<script type="importmap">{{"imports":{{"three":"/vendor/three/build/three.module.min.js","three/addons/":"/vendor/three/examples/jsm/"}}}}</script>
<script type="module">{LIVE_JS}{js}</script></body></html>"""

for name in ["lens", "monolith", "atlas", "instrument"]:
    src = open(os.path.join(H, name + ".js")).read()
    meta, js = src.split("# ---- js ----", 1)
    m = {}
    exec(meta, {}, m)
    open(D + f"concept-{name}.html", "w").write(page(name, m["TITLE"], m["BG"], m["FG"], m["BODY"], m["CSS"], js))
    print("wrote concept-" + name)
