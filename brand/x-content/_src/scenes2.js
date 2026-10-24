const SCENES = {
  // ---------- videos ----------
  trap: { dur: 13, dark: true, html: () => `<div class="stage" style="justify-content:center">
      <p class="sub fade" id="k" style="margin:0 0 10px;color:#8d887e">$${D.trap.symbol} · ${D.trap.ageMin} minutes after launch</p>
      <div style="display:flex;align-items:baseline;gap:28px"><div class="big" id="n" style="font-size:200px">0</div><h2 id="b">buyers.<br><span style="color:#8d887e">Looks alive.</span></h2></div>
      <ul class="reads">${D.trap.lines.map((l) => `<li class="fade"><i></i>${l}</li>`).join("")}</ul>
      <div class="stamp fade" id="v">Held · rug risk ${D.trap.score}/100</div></div>${foot()}`,
    at(t) { show($("#k"), t, 0, .6); $("#n").textContent = Math.round(D.trap.buyers * ease(t / 2.6)); show($("#b"), t, .6, .8);
      $$(".reads li").forEach((li, i) => show(li, t, 3.6 + i * 1.3, .6, 12)); show($("#v"), t, 3.6 + D.trap.lines.length * 1.3 + .4, .6, 0); } },
  risk: { dur: 11, html: () => `<div class="stage"><div class="split" style="grid-template-columns:auto 1fr;gap:110px"><div class="gauge">
      <svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="84" fill="none" stroke="var(--sunk)" stroke-width="12"/><circle id="arc" cx="100" cy="100" r="84" fill="none" stroke="var(--high)" stroke-width="12" stroke-linecap="round" pathLength="100" stroke-dasharray="0 100" transform="rotate(-90 100 100)"/></svg>
      <div><b id="sc">0</b><span>rug risk</span></div></div>
      <div><h2 id="h">One number for the risk.<br><span style="color:var(--mute)">Every reason behind it.</span></h2>
      <ul class="why">${D.risk.reasons.map((r) => `<li class="fade">${r}</li>`).join("")}</ul></div></div></div>${foot()}`,
    at(t) { const k = ease((t - .6) / 2.4) * D.risk.score; $("#sc").textContent = Math.round(k); $("#arc").setAttribute("stroke-dasharray", `${k} 100`);
      show($("#h"), t, 0, .8); $$(".why li").forEach((li, i) => show(li, t, 3.4 + i * .9, .6, 10)); } },
  growth: { dur: 12, html: () => `<div class="stage" style="justify-content:center"><h2 id="h">Not how many buyers.<br><span style="color:var(--mute)">How fast they keep coming.</span></h2>
      <div class="lanes">${D.growth.map((g, i) => `<div class="lane fade" id="l${i}"><div class="lh"><b>${g.label}</b><span class="tag ${g.pass ? "ok" : "held"}">${g.pass ? "Pass" : "Skip"}</span></div>
        <div class="track">${Array.from({ length: g.dots }, (_, j) => `<i style="left:${g.at[j]}%"></i>`).join("")}<em style="left:${g.cut}%"><small>15 min ago</small></em><u>now</u></div><p>${g.text}</p></div>`).join("")}</div></div>${foot()}`,
    at(t) { show($("#h"), t, 0, .8); D.growth.forEach((g, i) => { show($("#l" + i), t, 1 + i * .6, .6, 12); $$(`#l${i} .track i`).forEach((d, j) => { d.style.opacity = t > 1.8 + i * .6 + (g.at[j] / 100) * 5 ? 1 : 0; }); }); } },

  // ---------- stills ----------
  dumped: { html: () => `<div class="stage" style="justify-content:center"><h2>Selling is not the same as leaving.</h2><div class="pair">
      <div class="card"><span class="tag ok">Still in</span><b>Dev sold some.</b><p>Took a little profit and still holds part of the bag. Ocula keeps reading.</p><div class="bag"><span style="width:62%"></span></div><small>still holding</small></div>
      <div class="card bad"><span class="tag held">Held</span><b>Dev sold everything.</b><p>The deployer wallet is empty. On the radar today: ${D.stat.dumped} of ${D.stat.total} new launches.</p><div class="bag"><span style="width:0"></span></div><small>holds 0%</small></div></div></div>${foot()}` },
  bundles: { html: () => `<div class="stage"><div class="split" style="grid-template-columns:1fr 1fr"><div><h2>One operator.<br>${D.bund.count} wallets.</h2><p class="sub">$${D.trap.symbol}: the deployer exempted ${D.bund.count} wallets from snipe tax. They bought ${D.bund.bought}% at launch. They hold ${D.bund.holds}% now.</p></div>
      <svg class="web" viewBox="-200 -200 400 400">${D.bund.ws.map((w, i) => { const a = (i / D.bund.ws.length) * Math.PI * 2 - Math.PI / 2, x = Math.cos(a) * 150, y = Math.sin(a) * 150, r = 6 + w * 7; return `<line x1="0" y1="0" x2="${x}" y2="${y}"/><circle cx="${x}" cy="${y}" r="${r}"/>`; }).join("")}<circle class="dev" r="30"/><text y="6">dev</text></svg></div></div>${foot()}` },
  xcheck: { html: () => `<div class="stage"><div class="split"><div><h2>Is the hype real?</h2><p class="sub">Ocula opens the token's X account: how old it is, who follows it, and whether the likes fit the audience.</p></div>
      <div class="xcard"><div class="xh"><span class="xa"><svg viewBox="0 0 24 24" width="30" height="30"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></span><div><b>@${D.x.handle}</b><span>linked by $${D.trap.symbol}</span></div></div>
      <div class="xn"><div><b>${D.x.ageDays}</b><span>days old</span></div><div><b>${D.x.followers}</b><span>followers</span></div><div><b>${D.x.posts}</b><span>posts</span></div></div>
      <p class="xv">A week-old account with ${D.x.followers} followers, next to ${D.trap.buyers} buyers in ${D.trap.ageMin} minutes.</p></div></div></div>${foot()}` },
  stat: { dark: true, html: () => `<div class="stage" style="justify-content:center"><div class="trio">
      <div><b>${D.stat.total}</b><span>new launches read</span></div><div><b>${D.stat.dumped}</b><span>devs already sold everything</span></div><div class="on"><b>${D.stat.pass}</b><span>cleared every check</span></div></div>
      <h2 style="margin-top:70px">Ocula would rather point at nothing<br><span style="color:#8d887e">than point at a trap.</span></h2></div>${foot()}` },
  news: { html: () => `<div class="stage" style="justify-content:center;padding-bottom:140px"><div class="nhead"><span class="livechip lt"><i></i>Update · ${D.oc.date}</span><span class="nca">$OCULA · ${D.oc.ca.slice(0, 6)}…${D.oc.ca.slice(-4)}</span></div>
      <h2 style="margin-top:26px">$OCULA is live. <span style="color:var(--mute)">Here is what Ocula reads on its own token.</span></h2>
      <div class="ntiles">${D.oc.tiles.map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join("")}</div>
      <div class="nnew"><span class="lbl2">New in the workspace</span><ul>${D.oc.news.map((n) => `<li><b>${n[0]}</b> ${n[1]}</li>`).join("")}</ul></div></div>${foot()}` },
  paydex: { dark: true, html: () => `<div class="stage center" style="gap:26px"><div class="livechip"><i style="background:#e8c35a;box-shadow:0 0 14px #e8c35a"></i>Coming soon</div><div style="width:130px;margin-top:16px">${MARK}</div>
      <h1 style="font-size:116px">Paid DEX. Soon.</h1><p class="sub" style="margin:0;max-width:none">$OCULA's DEX Screener profile is on the way: logo, banner, links and the full story in one place.</p></div>
      <div class="foot"><span>$OCULA · Robinhood Chain</span><span>oculaagent.com</span></div>` },
  live: { dark: true, html: () => `<div class="stage center" style="gap:26px"><div class="livechip"><i></i>Live on Robinhood Chain</div><div style="width:170px;margin-top:20px">${MARK}</div><h1 style="font-size:120px">$OCULA is live.</h1>
      <p class="sub" style="margin:0;max-width:none">The agent that reads every Pons launch now has a token.</p>
      <div class="unl"><div><b>0.1%</b><span>of supply unlocks the agent</span></div><div><b>7</b><span>tools in one workspace</span></div><div><b>Free</b><span>Pons Launchpad, always</span></div></div></div>
      <div class="foot"><span>Launched on Pons · CA in the post</span><span>oculaagent.com</span></div>` },
  follow: { dark: true, html: () => `<div class="stage center" style="gap:30px"><div style="width:150px">${MARK}</div><h1>Ocula is on X.</h1><p class="sub" style="margin:0;max-width:none">What the agent sees on Pons, as it sees it.</p><div class="handle">@oculaagent</div></div><div class="foot"><span>Robinhood Chain · Pons</span><span>oculaagent.com</span></div>` },
};
