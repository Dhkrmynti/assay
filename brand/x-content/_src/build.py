import json, re, sys
sys.path.insert(0, "/private/tmp/claude-501/-Users-sergiodyegogmail-com-Documents-projek-token-pon-launch/370aa872-99dc-48a5-9108-42246b8ef80e/scratchpad/designs")
from viz import VIZ
VIZCSS = open("/private/tmp/claude-501/-Users-sergiodyegogmail-com-Documents-projek-token-pon-launch/370aa872-99dc-48a5-9108-42246b8ef80e/scratchpad/designs/viz.css").read()
sym = open("../../logo2/kit/ocula-symbol.svg").read(); lid, dot = re.findall(r'<path d="([^"]+)"', sym)
rows = json.load(open("radar.json"))["rows"]; st = json.load(open("status.json")); sc = json.load(open("scan.json"))
total = st["index"]["recent"]
ok = [r for r in rows if r["pass"]][:3]; held = [r for r in rows if not r["pass"]][:1]
age = lambda s: f"{max(1, round(s / 60))}m ago" if s < 3600 else f"{round(s / 3600)}h ago"
answer = (f"{total:,} tokens launched on Pons in the last 24 hours. The newest that passed every check: "
          + ", ".join("$" + r["symbol"] for r in ok) + ". "
          + (f"${held[0]['symbol']} is held: {', '.join(c['text'] for c in held[0]['checks'] if not c['ok'])}." if held else "")
          + " Open the radar to watch them live.")
r0 = next(r for r in rows if r["symbol"] == sc["facts"]["token"]["symbol"])
term = [f"New launch <b>${r0['symbol']}</b> · {r0['token'][:8]}…",
        "<span class='g'>Deployer: first launch in 24h</span>" if not r0["devLaunches24h"] else f"<span class='r'>Deployer launched {r0['devLaunches24h']} others in 24h</span>",
        "Creator fees go to the deployer" if r0["feesToDev"] else "<span class='r'>Fees go to another wallet</span>",
        f"Tax {r0['taxPct']}% · <span class='g'>{r0['socials']} social link{'s' if r0['socials'] != 1 else ''}</span> · curve {r0['progressPct']:.1f}%"]
summary = sc["summary"].split(". ")
data = {"total": total, "answer": answer, "term": term, "verdict": "Cleared all four checks" if r0["pass"] else "Held",
        "rows": [{"symbol": r["symbol"], "ca": r["token"], "tax": r["taxPct"], "age": age(r["ageSec"]), "pass": r["pass"], "why": next((c["text"] for c in r["checks"] if not c["ok"]), "")} for r in (ok[:3] + held[:1] + [r for r in rows if r["pass"]][3:4])],
        "scan": {"name": sc["facts"]["token"]["name"], "symbol": sc["facts"]["token"]["symbol"], "ca": r0["token"], "flags": [{"level": f["level"], "title": f["title"], "detail": f["detail"]} for f in sc["flags"][:4]], "summary": summary[1].rstrip(".") + "."}}
t = open("scenes.tpl.html").read().replace("{{VIZCSS}}", VIZCSS).replace("{{LID}}", lid).replace("{{DOT}}", dot).replace("{{VIZ}}", json.dumps(VIZ)).replace("{{DATA}}", json.dumps(data))
open("scenes.html", "w").write(t); json.dump(data, open("data.json", "w"), indent=1); print(answer); print(data["scan"]["summary"])
