"""Builds ocula/design-a.html, design-b.html, design-c.html from the shared tools and each design's own files."""
import re, os, sys
H = os.path.dirname(os.path.abspath(__file__)) + "/"
S = os.path.dirname(H.rstrip("/")) + "/"  # site-src/ (p_panels.html, p_tools.js, p_toolcss.css)
D = "/Users/sergiodyegogmail.com/Documents/projek-token/ocula/"
rd = lambda p: open(p).read()

toolcss = rd(S + "p_toolcss.css").replace('"Inter Tight"', "var(--sans)").replace('"JetBrains Mono"', "var(--mono)")
toolcss = re.sub(r'(font:[^;"}]*?\d+(?:\.\d+)?px(?:/[\d.]+)?\s+)Inter\b', r"\1var(--sans)", toolcss).replace(" Inter;", " var(--sans);").replace(" Inter}", " var(--sans)}")
# every tool rule only applies inside the workspace window
scoped = []
for rule in re.findall(r"[^{}]+\{[^{}]*\}|@[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}", toolcss):
    if rule.strip().startswith("@"):
        if rule.strip().startswith("@keyframes"): scoped.append(rule); continue
        head, body = rule.split("{", 1)
        inner = re.findall(r"([^{}]+)\{([^{}]*)\}", body)
        scoped.append(head + "{" + "".join(",".join(".ws " + s.strip() for s in sel.split(",")) + "{" + b + "}" for sel, b in inner) + "}")
    else:
        sel, b = rule.split("{", 1)
        if not sel.strip() or sel.strip().startswith("/*"):
            sel = re.sub(r"/\*.*?\*/", "", sel, flags=re.S)
        if not sel.strip(): continue
        scoped.append(",".join(".ws " + s.strip() for s in sel.split(",")) + "{" + b)
toolcss = "\n".join(scoped)

sym = rd(D + "brand/logo2/kit/ocula-symbol.svg"); paths = re.findall(r'<path d="([^"]+)"', sym)
MARK = f'<svg viewBox="40 68 176 118" aria-hidden="true"><path d="{paths[0]}" fill="currentColor"/><path d="{paths[1]}" fill="currentColor"/></svg>'
wm = rd(D + "brand/logo2/kit/ocula-wordmark.svg"); vb = re.search(r'viewBox="([^"]+)"', wm).group(1)
WMI = re.sub(r"<title>.*?</title>", "", wm[wm.index(">", wm.index("<svg")) + 1:wm.rindex("</svg>")])
WS = rd(H + "ws.html").replace("{{PANELS}}", rd(S + "p_panels.html"))
TOOLS = rd(S + "p_tools.js")
sys.path.insert(0, H)
from viz import VIZ


# ---------- palette for the live design (B): warm plum-charcoal #2A2529 and cream #F3F0E7 ----------
def palette(css):
    css = re.sub(r"rgba\(255,\s*255,\s*255,", "rgba(243,240,231,", css)
    for a, b in [("rgba(8,8,8,", "rgba(35,31,34,"), ("rgba(14,14,14,", "rgba(35,31,34,"), ("rgba(10,10,10,", "rgba(42,37,41,"), ("rgba(12,12,12,", "rgba(42,37,41,"), ("rgba(0,0,0,.6)", "rgba(20,17,19,.55)")]:
        css = css.replace(a, b)
    css = re.sub(r"color:#000\b", "color:#2A2529", css)
    hexmap = {"#ffffff": "#F3F0E7", "#fff": "#F3F0E7", "#f2f2f0": "#F3F0E7", "#f4f3ef": "#F3F0E7",
              "#050505": "#2A2529", "#131313": "#353035", "#070707": "#231F22", "#060606": "#231F22", "#080808": "#231F22",
              "#0a0a0a": "#201C1F", "#111": "#201C1F", "#141414": "#2f292e", "#262626": "#3b3439",
              "#7f7e7a": "#a8a19b", "#9b9a96": "#b5afa8", "#5e5d59": "#80787d", "#3d3d3b": "#51494f", "#555": "#6d656a"}
    return re.sub(r"#[0-9a-fA-F]{3,6}\b", lambda m: hexmap.get(m.group(0).lower(), m.group(0)), css)

# ---------- palette for the agent design (E): near-black tools on a broken-white page ----------
def palette_black(css):
    css = re.sub(r"rgba\(255,\s*255,\s*255,", "rgba(245,243,236,", css)
    for a, b in [("rgba(8,8,8,", "rgba(22,21,20,"), ("rgba(14,14,14,", "rgba(28,27,25,"), ("rgba(10,10,10,", "rgba(22,21,20,"), ("rgba(12,12,12,", "rgba(22,21,20,")]:
        css = css.replace(a, b)
    css = re.sub(r"color:#000\b", "color:#161514", css)
    hexmap = {"#ffffff": "#F5F3EC", "#fff": "#F5F3EC", "#f2f2f0": "#F5F3EC", "#f4f3ef": "#F5F3EC", "#050505": "#161514", "#070707": "#161514", "#060606": "#161514",
              "#080808": "#1d1c1a", "#0a0a0a": "#1d1c1a", "#111": "#1d1c1a", "#141414": "#22201e", "#262626": "#2f2d2a", "#9b9a96": "#aaa59c", "#5e5d59": "#7a766f", "#555": "#6a665f"}
    return re.sub(r"#[0-9a-fA-F]{3,6}\b", lambda m: hexmap.get(m.group(0).lower(), m.group(0)), css)

def build(v, title, wm_fill):
    body = re.sub(r"\{\{VIZ:(\w+)\}\}", lambda m: VIZ[m.group(1)], rd(H + v + ".html")).replace("{{MARK}}", MARK).replace("{{WS}}", WS).replace("{{WORDMARK}}", f'<svg viewBox="{vb}" aria-label="NOVA">{WMI.replace("fill=\"#000\"", f"fill=\"{wm_fill}\"")}</svg>')
    CSS = "\n".join([rd(H + v + ".css"), rd(H + "ws.css"), rd(H + "viz.css"), toolcss])
    if v in ("b", "d"): CSS = palette(CSS)
    if v == "e": CSS = rd(H + "e.css") + "\n" + palette_black("\n".join([rd(H + "ws.css"), rd(H + "viz.css"), toolcss]))
    if v == "f": CSS = rd(H + "e.css") + "\n" + rd(H + "f.css") + "\n" + palette_black("\n".join([rd(H + "ws.css"), rd(H + "viz.css"), toolcss]))
    FONTS = ("family=Libre+Baskerville:ital,wght@0,400;0,700;1,400" if v == "e" else
             "family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Mono:wght@400;500;600;700" if v == "f" else
             "family=Big+Shoulders+Display:wght@600;800&family=Overpass:wght@400;600;700;800&family=Overpass+Mono:wght@400;600;700" if v == "d"
             else "family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500")
    if v in ("d", "e", "f"):   # no 3D stage: GSAP drives the page
        SCRIPTS = '<script src="/vendor/gsap.min.js"></script>\n<script src="/vendor/ScrollTrigger.min.js"></script>\n<script type="module">\n' + rd(H + "common.js") + (rd(H + "e.js") + rd(H + "f.js") if v == "f" else rd(H + v + ".js"))
    else:
        SCRIPTS = rd(H + "scene_head.js") + rd(H + "common.js") + rd(H + v + ".js") + rd(H + "scene_run.js")
    page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<meta name="description" content="Ocula is the AI agent that reads every Pons launch on Robinhood Chain.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://oculaagent.com/">
<meta property="og:title" content="Ocula">
<meta property="og:description" content="The AI agent that reads every Pons launch on Robinhood Chain.">
<meta property="og:image" content="https://oculaagent.com/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@oculaagent">
<meta name="twitter:creator" content="@oculaagent">
<meta name="twitter:image" content="https://oculaagent.com/og.png">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?{FONTS}&display=swap" rel="stylesheet">
<style>
{CSS}
</style>
</head>
<body>
{"" if v in ("d", "e", "f") else '<canvas id="gl"></canvas>'}
{body}
{SCRIPTS}
{TOOLS}
</script>
</body>
</html>
"""
    open(D + f"design-{v}.html", "w").write(page)
    if v == "e": open(D + "index.html", "w").write(page)  # the agent design is the live home page
    if v == "f": open(D + "preview.html", "w").write(page)  # dossier redesign, shown at /preview
    # syntax check of the module script
    mod = page[page.index('<script type="module">') + len('<script type="module">'):page.rindex("</script>")]
    open(H + f"check-{v}.mjs", "w").write(mod)
    print("built design-" + v, len(page))

for v, title, fill in [("a", "NOVA · Monolith", "#e8e7e3"), ("b", "NOVA Labs", "#F3F0E7"), ("c", "NOVA · Ceramic", "#efeeea"), ("d", "NOVA Departures", "#F3F0E7"), ("e", "Ocula — the AI agent that reads Pons", "#161514"), ("f", "Ocula — every launch gets a file", "#161514")]:
    if os.path.exists(H + v + ".html") and (len(sys.argv) < 2 or v in sys.argv[1:]): build(v, title, fill)
