import json, re, random
tpl = open("scenes.tpl.html").read()
head, rest = tpl.split("const SCENES = {", 1); tail = rest.split("\n};\n", 1)[1]
html = head.replace("</style>", open("scenes2.css").read() + "</style>") + open("scenes2.js").read() + tail
sym = open("../../logo2/kit/ocula-symbol.svg").read(); lid, dot = re.findall(r'<path d="([^"]+)"', sym)
import sys; sys.path.insert(0, "/private/tmp/claude-501/-Users-sergiodyegogmail-com-Documents-projek-token-pon-launch/370aa872-99dc-48a5-9108-42246b8ef80e/scratchpad/designs")
from viz import VIZ
VIZCSS = open("/private/tmp/claude-501/-Users-sergiodyegogmail-com-Documents-projek-token-pon-launch/370aa872-99dc-48a5-9108-42246b8ef80e/scratchpad/designs/viz.css").read()
rows = json.load(open("radar2.json"))["rows"]; sc = json.load(open("scan2.json")); f = sc["facts"]
r0 = next(r for r in rows if r["token"].lower() == f["token"]["address"].lower()) if "address" in f["token"] else next(r for r in rows if r["symbol"] == f["token"]["symbol"])
b = f["bundle"]; t = f["trading"]
trap = {"symbol": f["token"]["symbol"], "ageMin": round(r0["ageSec"] / 60), "buyers": t["buyers"], "score": sc["risk"]["score"],
        "lines": [f"The dev sold the whole bag: {round(f['deployer']['soldPct'],2)}% out, {f['deployer']['holdsPct']}% left",
                  f"{b['count']} snipe-tax-exempt wallets bought {round(b['boughtPct'],1)}%, now hold {b['holdsPct']}%",
                  f"{t['sellers']} of {t['buyers']} buyers already sold"]}
random.seed(4)
A = sorted(66 + random.random() * 33 for _ in range(20)); B = sorted(random.random() * 48 for _ in range(43))
data = {"trap": trap,
  "risk": {"score": sc["risk"]["score"], "reasons": [re.sub(r"(\d+\.\d{2})\d+%", r"\1%", x[0].upper() + x[1:]) for x in sc["risk"]["reasons"][:4]]},
  "growth": [{"label": "Launch A · 10 minutes old", "pass": True, "dots": 20, "at": A, "cut": 50, "text": "20 buyers in 10 minutes. Two new wallets a minute, still arriving."},
             {"label": "Launch B · 31 minutes old", "pass": False, "dots": 43, "at": B, "cut": 50, "text": "43 buyers, but none new in the last 15 minutes. It stopped growing."}],
  "bund": {"count": b["count"], "bought": round(b["boughtPct"], 1), "holds": b["holdsPct"], "ws": [w["boughtPct"] / max(x["boughtPct"] for x in b["wallets"]) for x in [0] for w in b["wallets"]]},
  "x": {"handle": f["x"]["handle"], "followers": f["x"]["followers"], "ageDays": f["x"]["ageDays"], "posts": f["x"]["posts"]},
  "stat": {"total": len(rows), "dumped": sum(1 for r in rows if r.get("devRugged")), "pass": sum(1 for r in rows if r["pass"])}}
oc = json.load(open("oc-scan.json"))["facts"]; ocr = json.load(open("oc-scan.json"))["risk"]
data["oc"] = {"date": "24 Oct 2026", "ca": oc["token"]["address"], "tiles": [
  [str(oc["holders"]["count"]), "holders so far"], [f'{oc["pons"]["progressPct"]:.1f}%', f'of the curve, {oc["pons"]["curveETH"]:.2f} ETH in'],
  ["0", "bundled wallets found"], ["0%", "sold by the dev"], [f'{ocr["score"]}/100', "rug risk, by Ocula's own scanner"]],
  "news": [["Holder unlock is on.", "Hold 0.1% of $OCULA and sign once to open every tool."], ["Radar ranks by growth.", "New buyers per minute, not a fixed count."],
           ["Rug detection.", "A dev who sold the whole bag is held at once."], ["Scanner risk score.", "0 to 100, with bundles and an X check."]]}
html = html.replace("{{VIZCSS}}", VIZCSS).replace("{{LID}}", lid).replace("{{DOT}}", dot).replace("{{VIZ}}", json.dumps(VIZ)).replace("{{DATA}}", json.dumps(data))
open("scenes2.html", "w").write(html); json.dump(data, open("data2.json", "w"), indent=1); print(json.dumps(data["trap"]), data["stat"], data["risk"])
