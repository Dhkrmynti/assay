"""Ocula content bank: pulls the live state from oculaagent.com's server and writes fresh posts.
Run:  python3 build_now.py        (needs ssh access to the VPS; the studio key never leaves the server)
Output: x-content/now/<date-time>/png, video, caption.md"""
import json, re, subprocess, sys, os, datetime
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.dirname(HERE)
VPS = "root@202.155.13.133"
REMOTE = r'''
import json, urllib.request
K = [l.split("=", 1)[1].strip() for l in open("/opt/ocula/app/.env") if l.startswith("NOVA_ADMIN_KEY=")][0]
B = "http://127.0.0.1:3050"
def get(p, h=None):
    r = urllib.request.Request(B + p, headers=h or {}); return json.load(urllib.request.urlopen(r, timeout=150))
P = json.load(urllib.request.urlopen(urllib.request.Request(B + "/api/auth", data=json.dumps({"ownerKey": K}).encode(), headers={"content-type": "application/json"}), timeout=30))["pass"]
H = {"x-ocula-pass": P}; out = {"status": get("/api/status"), "radar": get("/api/radar", H)}
tok = out["status"].get("novaToken")
try: out["burn"] = get("/api/studio/burn", {"x-nova-key": K})
except Exception: out["burn"] = None
if tok:
    try: out["oc"] = get("/api/scan?ca=" + tok, H)
    except Exception as e: out["oc"] = None
rugs = sorted([r for r in out["radar"]["rows"] if r.get("devRugged")], key=lambda r: -r["buyers"])
out["trap"] = None
if rugs:
    try: out["trap"] = get("/api/scan?ca=" + rugs[0]["token"], H)
    except Exception: pass
print(json.dumps(out))
'''
raw = subprocess.run(["ssh", VPS, "python3", "-"], input=REMOTE, capture_output=True, text=True, timeout=600)
if raw.returncode: sys.exit(raw.stderr)
L = json.loads(raw.stdout)
now = datetime.datetime.now(); stamp = now.strftime("%Y-%m-%d-%H%M"); when = now.strftime("%d %b %Y · %H:%M WIB").lstrip("0")
rows = L["radar"]["rows"]; total = L["status"]["index"]["recent"]
nf = lambda x, d=0: f"{x:,.{d}f}"
short = lambda x: re.sub(r"(\d+\.\d{2})\d+", r"\1", x)
ago = lambda s: f"{max(1, round(s / 60))} min" if s < 3600 else f"{s / 3600:.1f} h"
data = {"when": when}; scenes = []; cap = []

# 1. $OCULA
oc = L.get("oc")
if oc and "facts" in oc:
    f = oc["facts"]; p = f["pons"]; t = f["trading"]
    burned = float(L["burn"]["burned"]) if L.get("burn") and L["burn"].get("burned") else 0
    tiles = [{"v": f["holders"]["count"], "label": "holders"}, {"v": t["buyers"], "label": "unique buyers"},
             {"v": p["curveETH"], "d": 2, "suf": " ETH", "label": "on the curve"}, {"v": f["deployer"]["soldPct"], "d": 0, "suf": "%", "label": "sold by the dev"},
             {"v": f["bundle"]["count"], "label": "bundled wallets"}, {"v": f["holders"]["top10Pct"], "d": 1, "suf": "%", "label": "held by the top 10"},
             {"v": oc["risk"]["score"], "suf": "/100", "label": "rug risk"}, ({"v": burned, "label": "$OCULA burned"} if burned else {"v": f["x"].get("followers", 0) if f.get("x") else 0, "label": "followers on X"})]
    data["oc"] = {"ca": f["token"]["address"], "tiles": tiles, "progress": round(p["progressPct"], 1), "curveETH": f"{p['curveETH']:.2f}", "gradETH": f"{p['graduationETH']:g}"}
    scenes.append("token")
    cap.append(("token", "$OCULA right now", f"""Ocula update · {when}

$OCULA, read by Ocula:
· {f['holders']['count']} holders, {t['buyers']} unique buyers
· {p['curveETH']:.2f} ETH on the curve ({p['progressPct']:.1f}% to graduation)
· dev sold {f['deployer']['soldPct']:g}%
· {f['bundle']['count']} bundled wallets
· rug risk {oc['risk']['score']}/100{chr(10) + '· ' + nf(burned) + ' $OCULA burned' if burned else ''}

CA: {f['token']['address']}
oculaagent.com"""))

# 2. radar
n = len(rows); rug = sum(1 for r in rows if r.get("devRugged")); ok = sum(1 for r in rows if r["pass"])
slow = sum(1 for r in rows if not r["pass"] and not r.get("devRugged") and not r.get("active"))
other = n - rug - ok - slow
segs = [s for s in [{"k": "rug", "v": rug, "label": "dev already sold everything"}, {"k": "slow", "v": slow, "label": "not growing"},
                    {"k": "other", "v": other, "label": "failed another check"}, {"k": "ok", "v": ok, "label": "cleared every check"}] if s["v"]]
data["radar"] = {"total": total, "n": n, "segs": segs}; scenes.append("radar")
cap.append(("radar", "The last 24 hours on Pons", f"""{nf(total)} tokens launched on Pons in the last 24 hours.

Ocula read the newest {n}:
· {rug} had a dev who already sold everything
· {slow} stopped growing
· {ok} cleared every check

Most launches are noise. Some are traps. Ocula reads them all.
oculaagent.com"""))

# 3. trap: the busiest launch whose dev already left
rr = sorted([r for r in rows if r.get("devRugged")], key=lambda r: -r["buyers"])
if rr and rr[0]["buyers"] >= 10:
    r = rr[0]; tr = L.get("trap"); lines = [f"The dev sold the whole bag: {r['devSoldPct']:.2f}% out, {r['devHoldPct']:g}% left"]
    score = None
    if tr and "facts" in tr:
        b = tr["facts"]["bundle"]; tt = tr["facts"]["trading"]; score = tr["risk"]["score"]
        if b["count"] >= 3: lines.append(f"{b['count']} bundled wallets bought {b['boughtPct']:.1f}%, now hold {b['holdsPct']:.1f}%")
        if tt["sellers"]: lines.append(f"{tt['sellers']} of {tt['buyers']} buyers already sold")
    data["trap"] = {"symbol": r["symbol"], "age": ago(r["ageSec"]), "buyers": r["buyers"], "lines": lines, "verdict": "Held" + (f" · rug risk {score}/100" if score is not None else "")}
    scenes.append("trap")
    cap.append(("trap", f"${r['symbol']}: busy, but the dev is gone", f"""{r['buyers']} buyers in {ago(r['ageSec'])}. Looks alive.

Ocula read it anyway:
""" + "\n".join("· " + x[0].lower() + x[1:] for x in lines) + f"""

Held{f', rug risk {score}/100' if score is not None else ''}. A busy chart is not a healthy one.
oculaagent.com"""))

# 4. pick: one launch that cleared everything
pp = sorted([r for r in rows if r["pass"]], key=lambda r: -r.get("buyersPerMin", 0))
if pp:
    r = pp[0]
    data["pick"] = {"symbol": r["symbol"], "age": ago(r["ageSec"]), "line": next((c["text"] for c in r["checks"] if "grow" in c["text"]), "").capitalize() + ".",
                    "checks": [short(c["text"][0].upper() + c["text"][1:]) for c in r["checks"]]}
    scenes.append("pick")
    cap.append(("pick", f"${r['symbol']} cleared every check", f"""${r['symbol']} cleared every check on Ocula's radar, {ago(r['ageSec'])} after launch:

""" + "\n".join("✓ " + short(c["text"]) for c in r["checks"]) + f"""

An on-chain read, not advice. Scan it yourself on oculaagent.com
CA: {r['token']}"""))

# 5. burn
if L.get("burn") and L["burn"].get("log"):
    lg = L["burn"]["log"]; tot = float(L["burn"]["burned"]); usd = sum(x["usd"] for x in lg)
    data["burn"] = {"tokens": nf(tot), "line": f"${usd:g} of buybacks so far · last tx {lg[0]['tx'][:10]}…"}
    scenes.append("burn")
    cap.append(("burn", "Buyback & burn", f"""{nf(tot)} $OCULA sent to the dead address so far (${usd:g} of buybacks).

Last burn: https://robinhoodchain.blockscout.com/tx/{lg[0]['tx']}
oculaagent.com"""))

# build page
tpl = open(os.path.join(SRC, "scenes.tpl.html")).read()
head, rest = tpl.split("const SCENES = {", 1); tail = rest.split("\n};\n", 1)[1]
sym = open(os.path.join(SRC, "../../logo2/kit/ocula-symbol.svg")).read(); lid, dot = re.findall(r'<path d="([^"]+)"', sym)
html = head.replace("</style>", open(os.path.join(HERE, "scenes-now.css")).read() + "</style>") + open(os.path.join(HERE, "scenes-now.js")).read() + tail
html = html.replace("{{VIZCSS}}", "").replace("{{LID}}", lid).replace("{{DOT}}", dot).replace("{{VIZ}}", "{}").replace("{{DATA}}", json.dumps(data))
open(os.path.join(HERE, "scenes-now.html"), "w").write(html)
out = os.path.join(SRC, "..", "now", stamp); os.makedirs(out + "/png", exist_ok=True); os.makedirs(out + "/video", exist_ok=True)
json.dump(data, open(os.path.join(out, "data.json"), "w"), indent=1)
md = [f"# Ocula · current state · {when}\n", "Every number is live on-chain data read by Ocula at the time above. Images 2400×1350 PNG; videos 1920×1080 MP4 (silent), one per post.\n"]
for k, title, text in cap:
    files = f"`png/{k}.png`" + (f" · `video/{k}.mp4`" if k != "burn" else "")
    md.append(f"---\n\n### {title}\n{files}\n\n" + "\n".join("> " + l if l else ">" for l in text.split("\n")) + "\n")
open(os.path.join(out, "caption.md"), "w").write("\n".join(md))
print(json.dumps({"out": os.path.abspath(out), "scenes": scenes}))
