const SCENES = {
  // $OCULA right now: counters fill in, tile by tile
  token: { dur: 10, html: () => `<div class="stage" style="justify-content:center;padding-bottom:140px">
      <div class="nhead"><span class="chipx"><i></i>Ocula update · ${D.when}</span><span class="nca">$OCULA · ${D.oc.ca.slice(0, 6)}…${D.oc.ca.slice(-4)}</span></div>
      <h2 id="h" style="margin-top:26px">$OCULA right now. <span style="color:var(--mute)">Read by Ocula, straight from the chain.</span></h2>
      <div class="tiles">${D.oc.tiles.map((t, i) => `<div class="fade" id="t${i}"><b data-v="${t.v}" data-d="${t.d || 0}" data-p="${t.pre || ""}" data-s="${t.suf || ""}">0</b><span>${t.label}</span></div>`).join("")}</div>
      <div class="bar fade" id="bar"><div class="bt"><span>Bonding curve</span><span>${D.oc.curveETH} / ${D.oc.gradETH} ETH to graduate</span></div><div class="track2"><i id="fill"></i></div></div></div>${foot()}`,
    at(t) { show($("#h"), t, 0, .8);
      $$(".tiles>div").forEach((el, i) => { show(el, t, .8 + i * .35, .5, 14); const b = el.querySelector("b"), k = ease((t - .9 - i * .35) / 1.6); b.textContent = b.dataset.p + (Number(b.dataset.v) * k).toLocaleString("en-US", { minimumFractionDigits: +b.dataset.d, maximumFractionDigits: +b.dataset.d }) + b.dataset.s; });
      show($("#bar"), t, 3.6, .6, 10); $("#fill").style.width = D.oc.progress * ease((t - 4) / 2) + "%"; } },

  // the last 24 hours on Pons and what the newest launches look like
  radar: { dur: 11, dark: true, html: () => `<div class="stage" style="justify-content:center;padding-bottom:140px">
      <div style="display:flex;align-items:baseline;gap:30px"><div class="big" id="n" style="font-size:190px">0</div><h2 id="b">Pons launches<br><span style="color:#8d887e">in the last 24 hours.</span></h2></div>
      <p class="sub fade" id="s" style="max-width:none;margin-top:30px">Of the newest ${D.radar.n}, here is what Ocula found:</p>
      <div class="segs fade" id="sg">${D.radar.segs.map((g) => `<i class="${g.k}" style="flex:${g.v}"></i>`).join("")}</div>
      <div class="legend">${D.radar.segs.map((g, i) => `<div class="fade" id="lg${i}"><i class="${g.k}"></i><b>${g.v}</b> ${g.label}</div>`).join("")}</div></div>${foot()}`,
    at(t) { $("#n").textContent = Math.round(D.radar.total * ease(t / 2.4)).toLocaleString("en-US"); show($("#b"), t, .5, .8); show($("#s"), t, 2.6, .6);
      show($("#sg"), t, 3.2, .4, 0); $$("#sg i").forEach((x, i) => { x.style.transform = `scaleX(${ease((t - 3.4 - i * .5) / .8)})`; });
      D.radar.segs.forEach((g, i) => show($("#lg" + i), t, 3.6 + i * .5, .5, 8)); } },

  // the busiest launch where the dev already left
  trap: { dur: 12, dark: true, html: () => `<div class="stage" style="justify-content:center">
      <p class="sub fade" id="k" style="margin:0 0 10px;color:#8d887e">$${D.trap.symbol} · ${D.trap.age} after launch</p>
      <div style="display:flex;align-items:baseline;gap:28px"><div class="big" id="n" style="font-size:200px">0</div><h2 id="b">buyers.<br><span style="color:#8d887e">Looks alive.</span></h2></div>
      <ul class="reads">${D.trap.lines.map((l) => `<li class="fade"><i></i>${l}</li>`).join("")}</ul>
      <div class="stamp fade" id="v">${D.trap.verdict}</div></div>${foot()}`,
    at(t) { show($("#k"), t, 0, .6); $("#n").textContent = Math.round(D.trap.buyers * ease(t / 2.6)); show($("#b"), t, .6, .8);
      $$(".reads li").forEach((li, i) => show(li, t, 3.4 + i * 1.2, .6, 12)); show($("#v"), t, 3.4 + D.trap.lines.length * 1.2 + .3, .6, 0); } },

  // one launch that cleared every check right now
  pick: { dur: 11, html: () => `<div class="stage"><div class="split" style="grid-template-columns:1fr 1fr;gap:80px"><div>
      <span class="chipx fade" id="c"><i></i>Cleared every check · ${D.pick.age} old</span>
      <h1 id="h" style="margin-top:26px">$${D.pick.symbol}</h1><p class="sub fade" id="s">${D.pick.line}</p><p class="note2 fade" id="nf">On-chain read, not advice.</p></div>
      <ul class="ticks">${D.pick.checks.map((c) => `<li class="fade"><i>✓</i>${c}</li>`).join("")}</ul></div></div>${foot()}`,
    at(t) { show($("#c"), t, 0, .6); show($("#h"), t, .4, .8); show($("#s"), t, 1.2, .7); $$(".ticks li").forEach((li, i) => show(li, t, 2 + i * .7, .5, 10)); show($("#nf"), t, 2.4 + D.pick.checks.length * .7, .6, 0); } },

  // the burn so far (only when there has been one)
  burn: { html: () => `<div class="stage center" style="gap:24px"><span class="chipx"><i></i>Buyback &amp; burn</span><div class="big" style="font-size:180px;margin-top:20px">${D.burn.tokens}</div>
      <h2>$OCULA sent to the dead address.</h2><p class="sub" style="margin:0;max-width:none">${D.burn.line}</p></div>${foot()}` },
};
