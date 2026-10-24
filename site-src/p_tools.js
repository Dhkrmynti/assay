// ---------- tools ----------
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const short = (a) => (a ? a.slice(0, 6) + "…" + a.slice(-4) : "");
const fmt = (v, d = 2) => Number(v).toLocaleString("en-US", { maximumFractionDigits: d });
const EXPLORER = "https://robinhoodchain.blockscout.com/";
const safeUrl = (u) => (/^https:\/\/[^\s"'<>]+$/.test(u || "") ? u : "");
const img = (u) => { u = String(u || ""); if (u.startsWith("ipfs://")) u = "https://gateway.pinata.cloud/ipfs/" + u.slice(7); return safeUrl(u); };
const loading = (t) => `<div class="load"><i></i>${esc(t)}</div>`;
async function api(url, opts) {
  const r = await fetch(url, opts); let j = {};
  try { j = await r.json(); } catch {}
  if (!r.ok) throw new Error(j.error || "Request failed (" + r.status + ").");
  return j;
}

// tabs
const VISOR = { launch: "LAUNCH", scan: "SCANNER", radar: "RADAR", snipe: "SNIPER", fees: "CLAIM", kit: "LAUNCH", agent: "AGENT" };
let radarTimer = null;
function openTab(t, scroll, quiet) {
  document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("on", b.dataset.t === t));
  document.querySelectorAll(".tool").forEach((p) => p.classList.toggle("on", p.dataset.p === t));
  window.nova?.say(VISOR[t]);
  clearInterval(radarTimer);
  if (t === "radar") { loadRadar(); radarTimer = setInterval(loadRadar, 10_000); }
  if (scroll) $("app").scrollIntoView({ behavior: "smooth", block: "start" });
  if (!quiet) history.replaceState(null, "", "#" + t);
}
$("tabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) openTab(b.dataset.t); });
document.addEventListener("click", (e) => { const a = e.target.closest("[data-open]"); if (a) { e.preventDefault(); openTab(a.dataset.open, true); } });

// scanner
const STEPS = ["Reading the Pons factory record", "Following every transfer since launch", "Checking the deployer's other launches", "Looking at the first minute of trading", "Signal is writing the summary"];
async function runScan(ca) {
  ca = ca.trim(); $("scanCa").value = ca;
  if (!/^0x[0-9a-fA-F]{40}$/.test(ca)) { $("scanOut").innerHTML = `<p class="err">Paste a token contract address (0x… 42 characters).</p>`; return; }
  $("scanGo").disabled = true;
  let i = 0; $("scanOut").innerHTML = loading(STEPS[0]);
  const t = setInterval(() => { i = Math.min(STEPS.length - 1, i + 1); const l = $("scanOut").querySelector(".load"); if (l) l.innerHTML = "<i></i>" + STEPS[i]; window.nova?.pulse(0.3); }, 1700);
  try { renderScan(await api("/api/scan?ca=" + ca)); }
  catch (e) { $("scanOut").innerHTML = `<p class="err">${esc(e.message)}</p>`; }
  finally { clearInterval(t); $("scanGo").disabled = false; }
}
// rug risk, bundled wallets and the X check, above the AI read
function riskBlock(r) {
  const k = r.risk; if (!k) return "";
  const b = r.facts.bundle || {}, x = r.facts.x || {}, nfmt = (n) => Number(n).toLocaleString("en-US");
  const xs = !x.linked ? `<p class="rnote">No X account is set on-chain.</p>`
    : x.found === false ? `<p class="rnote bad">The linked account @${esc(x.handle)} does not exist.</p>`
    : !x.found ? `<p class="rnote">Could not read @${esc(x.handle || "")} right now.</p>`
    : `<div class="xrow"><a href="https://x.com/${esc(x.handle)}" target="_blank" rel="noopener nofollow">@${esc(x.handle)}</a>${x.verified ? '<span class="xv">verified</span>' : ""}</div>
       <div class="xnums"><div><b>${nfmt(x.followers)}</b><span>followers</span></div><div><b>${x.ageDays}d</b><span>account age</span></div><div><b>${nfmt(x.posts)}</b><span>posts</span></div>
       ${x.post ? `<div><b>${nfmt(x.post.likes)}</b><span>likes on post</span></div><div><b>${x.post.views ? nfmt(x.post.views) : "–"}</b><span>views</span></div>` : ""}</div>
       <p class="rnote ${x.ageDays < 7 || x.followers < 100 || (x.post && x.post.likes > x.followers * 1.5 && x.post.likes > 50) ? "bad" : "good"}">${
         x.post && x.post.likes > x.followers * 1.5 && x.post.likes > 50 ? "Likes far exceed the followers: engagement may be bought." :
         x.ageDays < 7 ? "A brand-new account. Treat the hype with care." : x.followers < 100 ? "A small audience so far." : "Reach and age look organic."}</p>`;
  return `<div class="risk ${k.level}">
    <div class="rg"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" class="t"/><circle cx="60" cy="60" r="50" class="v" pathLength="100" stroke-dasharray="${k.score} 100" transform="rotate(-90 60 60)"/></svg><div><b>${k.score}%</b><span>rug risk</span></div></div>
    <div class="rw"><span class="lbl">Rug risk · <b>${k.level}</b></span><ul>${k.reasons.length ? k.reasons.slice(0, 6).map((x) => `<li>${esc(x)}</li>`).join("") : "<li>No red flags in the on-chain data.</li>"}</ul><p class="rnote">A read of on-chain signals, not a guarantee.</p></div>
  </div>
  <div class="two">
    <div><span class="lbl">Bundled wallets · <b>${b.count || 0}</b> · hold ${fmt(b.holdsPct || 0)}%</span>${b.wallets?.length ? `<table>${b.wallets.slice(0, 8).map((w) => `<tr><td><a href="${EXPLORER}address/${w.address}" target="_blank" rel="noopener">${short(w.address)}</a><div class="why">${w.reasons.map(esc).join(" · ")}</div></td><td class="r">${fmt(w.holdsPct)}%<div class="why">bought ${fmt(w.boughtPct)}%</div></td></tr>`).join("")}</table>` : `<p class="rnote good">No wallets look tied to the deployer or to each other.</p>`}</div>
    <div><span class="lbl">X check</span>${xs}</div>
  </div>`;
}
function renderScan(r) {
  const f = r.facts, t = f.token, p = f.pons, d = f.deployer, h = f.holders, e = f.early, tr = f.trading;
  const socials = Object.entries(t.socials || {}).map(([k, v]) => (safeUrl(v) ? `<a class="chipl" href="${esc(v)}" target="_blank" rel="noopener nofollow">${esc(k)}</a>` : "")).join("");
  const logo = img(t.logo);
  $("scanOut").innerHTML = `
  <div class="rh">${logo ? `<img src="${esc(logo)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}
    <div><h3>${esc(t.name)}<span>$${esc(t.symbol)}</span></h3><div class="ca">${esc(t.address)} · ${fmt(t.ageHours, 1)}h old</div></div>
    <div class="links">${socials}<a class="chipl" href="${EXPLORER}token/${esc(t.address)}" target="_blank" rel="noopener">explorer</a><a class="chipl" href="https://ponsfamily.com/launchpad/${esc(t.address)}" target="_blank" rel="noopener">pons</a></div></div>
  ${riskBlock(r)}
  <span class="lbl">Signal's read</span>
  <p class="read">${r.summary ? esc(r.summary) : `<span style="color:var(--dim);font-weight:500">${esc(r.summaryError || "")}</span>`}</p>
  <div class="flags">${r.flags.map((x) => `<div class="fl"><span class="lv ${esc(x.level)}">${esc(x.level)}</span><div><b>${esc(x.title)}</b><span class="d">${esc(x.detail)}</span></div></div>`).join("")}</div>
  <div class="nums">
    <div><span class="lbl">Holders</span><b>${h.count}</b><small>top 10 hold ${fmt(h.top10Pct)}%</small></div>
    <div><span class="lbl">Deployer</span><b>${fmt(d.holdsPct)}%</b><small>bought ${fmt(d.boughtPct)}% · out ${fmt(d.soldPct)}%</small></div>
    <div><span class="lbl">First minute</span><b>${e.wallets}</b><small>wallets took ${fmt(e.boughtPct)}%, hold ${fmt(e.stillHoldPct)}%</small></div>
    <div><span class="lbl">Trades</span><b>${tr.buys} / ${tr.sells}</b><small>buys / sells</small></div>
    <div><span class="lbl">Volume in</span><b>${fmt(tr.volumeInETH, 3)}</b><small>ETH bought · ${fmt(tr.volumeOutETH, 3)} sold</small></div>
    <div><span class="lbl">Last hour</span><b>${tr.lastHour.buys} / ${tr.lastHour.sells}</b><small>${fmt(tr.lastHour.inETH, 3)} in · ${fmt(tr.lastHour.outETH, 3)} out ETH</small></div>
    <div><span class="lbl">Creator tax</span><b>${fmt(p.creatorTaxPct)}%</b><small>${p.snipeTaxNowPct ? "snipe tax now " + fmt(p.snipeTaxNowPct) + "%" : "no snipe tax now"}</small></div>
    <div><span class="lbl">Graduation</span><b>${p.graduated ? "Done" : fmt(p.progressPct, 1) + "%"}</b><div class="pbar"><i style="width:${p.graduated ? 100 : Math.min(100, p.progressPct)}%"></i></div><small>${fmt(p.curveETH, 3)} / ${fmt(p.graduationETH)} ETH</small></div>
  </div>
  <div class="two">
    <div><span class="lbl">Top holders</span>${h.top.length ? `<table>${h.top.map((x, i) => `<tr><td style="width:26px;color:var(--dim)">${i + 1}</td><td><a href="${EXPLORER}address/${x.address}" target="_blank" rel="noopener">${short(x.address)}</a>${x.dev ? '<span class="pill">deployer</span>' : ""}${x.contract ? '<span class="pill">contract</span>' : ""}</td><td class="r">${fmt(x.pct)}%</td></tr>`).join("")}</table>` : `<p class="note">No one holds outside the curve.</p>`}</div>
    <div><span class="lbl">Deployer</span><table>
      <tr><td>Wallet</td><td class="r"><a href="${EXPLORER}address/${d.address}" target="_blank" rel="noopener">${short(d.address)}</a></td></tr>
      <tr><td>Fees go to</td><td class="r">${d.feeRecipientIsDeployer ? "the deployer" : short(d.feeRecipient)}</td></tr>
      <tr><td>Other Pons launches</td><td class="r">${d.otherLaunches}</td></tr>
      <tr><td>Graduated / look abandoned</td><td class="r">${d.otherLaunchesGraduated} / ${d.otherLaunchesDead}</td></tr>
      ${d.recent.map((x) => `<tr><td><a href="#" data-scan="${x.token}">$${esc(x.symbol)}</a></td><td class="r">${x.graduated ? "graduated" : fmt(x.curveETH, 3) + " ETH on curve"}</td></tr>`).join("")}
    </table></div>
  </div>
  <p class="note" style="text-align:right">Block ${f.scannedAtBlock}${r.cached ? " · cached" : ""} · ${fmt(r.ms / 1000, 1)}s</p>`;
}
$("scanForm").addEventListener("submit", (e) => { e.preventDefault(); runScan($("scanCa").value); });
document.addEventListener("click", (e) => { const a = e.target.closest("[data-scan]"); if (a) { e.preventDefault(); openTab("scan", true); runScan(a.dataset.scan); } });

// radar
let radarRows = [];
async function loadRadar() {
  try {
    const j = await api("/api/radar");
    radarRows = j.rows; $("radarHead").textContent = "block " + j.head.toLocaleString("en-US"); drawRadar();
  } catch (e) { if (!radarRows.length) $("radarOut").innerHTML = `<p class="err">${esc(e.message)}</p>`; }
}
function age(s) { return s < 60 ? s + "s" : s < 3600 ? Math.floor(s / 60) + "m" : Math.floor(s / 3600) + "h"; }
function drawRadar() {
  const rows = $("onlyPass").checked ? radarRows.filter((r) => r.pass) : radarRows;
  $("radarOut").innerHTML = rows.length ? rows.map((r) => {
    const logo = img(r.logo);
    return `<div class="rrow">${logo ? `<img src="${esc(logo)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'ph'}))">` : `<div class="ph"></div>`}
      <div class="nm"><b>$${esc(r.symbol)}</b><span>${esc(r.name)}</span><div class="pbar"><i style="width:${r.graduated ? 100 : r.progressPct}%"></i></div></div>
      <span class="age">${age(r.ageSec)} ago${r.snipePct ? `<br>tax ${fmt(r.snipePct)}%` : ""}</span>
      <div class="checks">${r.checks.map((c) => `<span class="ck${c.ok ? "" : " no"}">${c.ok ? "✓" : "✕"} ${esc(c.text)}</span>`).join("")}</div>
      <span class="verdict ${r.pass ? "p" : "s"}">${r.pass ? "PASS" : "SKIP"}</span>
      <div class="ract"><button data-scan="${r.token}">Scan</button><a href="https://ponsfamily.com/launchpad/${r.token}" target="_blank" rel="noopener">Pons</a></div></div>`;
  }).join("") : `<p class="empty">No launch passes right now. Untick the filter to see everything.</p>`;
}
$("onlyPass").addEventListener("change", drawRadar);

// fee claimer (read from the server, claim in the visitor's wallet)
const CHAIN = { chainId: "0x1237", chainName: "Robinhood Chain", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: ["https://rpc.mainnet.chain.robinhood.com"], blockExplorerUrls: [EXPLORER] };
let feeData = null, ethersLib = null;
const getEthers = async () => (ethersLib ||= await import("/vendor/ethers.min.js"));
async function connect() {
  if (!window.ethereum) throw new Error("No wallet found. Install MetaMask or Rabby, or paste your address to just check.");
  const [acc] = await window.ethereum.request({ method: "eth_requestAccounts" });
  try { await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN.chainId }] }); }
  catch (e) { if (e.code === 4902 || /Unrecognized|not been added/i.test(e.message || "")) await window.ethereum.request({ method: "wallet_addEthereumChain", params: [CHAIN] }); else throw e; }
  return acc;
}
async function checkFees(w) {
  w = w.trim(); $("feeWallet").value = w;
  if (!/^0x[0-9a-fA-F]{40}$/.test(w)) { $("feeOut").innerHTML = `<p class="err">Paste a wallet address (0x… 42 characters).</p>`; return; }
  $("feeGo").disabled = true; $("feeOut").innerHTML = loading("Finding every Pons token this wallet launched");
  try { feeData = await api("/api/fees?wallet=" + w); drawFees(); }
  catch (e) { $("feeOut").innerHTML = `<p class="err">${esc(e.message)}</p>`; }
  finally { $("feeGo").disabled = false; }
}
function drawFees() {
  const d = feeData, pend = d.rows.filter((r) => r.pendingETH > 0);
  $("feeOut").innerHTML = `
    <div class="total"><div><span class="lbl">Claimable now</span><br><b>${fmt(d.totalETH, 6)} ETH</b></div>
      <div style="text-align:right"><span class="lbl">${d.launched} token${d.launched === 1 ? "" : "s"} launched · ${pend.length} with fees on the curve · ${fmt(d.escrowETH, 6)} ETH in escrow</span><br>
      <button class="btn" id="claimAll" style="margin-top:10px" ${d.totalETH > 0 ? "" : "disabled"}>Claim all in my wallet <span class="ar">→</span></button></div></div>
    ${d.rows.length ? `<table>${d.rows.map((r) => `<tr><td><a href="#" data-scan="${r.token}">$${esc(r.symbol)}</a> <span style="color:var(--dim)">${esc(r.name)}</span></td><td class="r">${r.graduated ? '<span class="pill">graduated</span>' : ""} ${fmt(r.pendingETH, 6)} ETH</td></tr>`).join("")}</table>` : `<p class="note">This wallet has not launched a Pons token, so it has no curves to sweep.</p>`}
    <div class="steps2" id="claimLog"></div>
    <p class="note">Claiming sends one transaction per token with fees, then one to the escrow. Gas is paid by your wallet. Only the fee recipient wallet can claim.</p>`;
  $("claimAll")?.addEventListener("click", claimAll);
}
async function claimAll() {
  const log = (t, c = "") => { $("claimLog").insertAdjacentHTML("beforeend", `<div class="${c}">&gt; ${esc(t)}</div>`); };
  const btn = $("claimAll"); btn.disabled = true;
  try {
    const acc = await connect();
    if (acc.toLowerCase() !== feeData.wallet.toLowerCase()) throw new Error(`Your wallet is connected as ${short(acc)}. Switch to ${short(feeData.wallet)} to claim its fees.`);
    const { BrowserProvider, Contract } = await getEthers();
    const signer = await new BrowserProvider(window.ethereum).getSigner();
    for (const r of feeData.rows.filter((x) => x.pendingETH > 0)) {
      log(`sweeping $${r.symbol}…`);
      const tx = await new Contract(r.curve, ["function sweepFees(uint256 minBuybackTokensOut)"], signer).sweepFees(0);
      await tx.wait(); log(`$${r.symbol} swept · ${short(tx.hash)}`, "ok");
    }
    const st = await api("/api/status");
    const esc_ = new Contract(st.escrow, ["function balanceOf(address) view returns (uint256)", "function claim()"], signer);
    if ((await esc_.balanceOf(acc)) > 0n) { log("claiming from the escrow…"); const tx = await esc_.claim(); await tx.wait(); log(`claimed · ${short(tx.hash)}`, "ok"); }
    log("done. The ETH is in your wallet.", "ok"); window.nova?.pulse(1);
    setTimeout(() => checkFees(feeData.wallet), 2500);
  } catch (e) { log(e.shortMessage || e.info?.error?.message || e.message, "bad"); btn.disabled = false; }
}
$("feeForm").addEventListener("submit", (e) => { e.preventDefault(); checkFees($("feeWallet").value); });
$("feeConnect").addEventListener("click", async () => { try { checkFees(await connect()); } catch (e) { $("feeOut").innerHTML = `<p class="err">${esc(e.message)}</p>`; } });

// launch kit
$("kitForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target)); $("kitGo").disabled = true;
  $("kitOut").innerHTML = loading("Signal is writing your launch kit"); const t = setInterval(() => window.nova?.pulse(0.3), 400);
  try {
    const k = await api("/api/kit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f) });
    const card = (title, body, copy) => `<div class="kc"><h5>${title}</h5><button class="cp" type="button" data-copy="${esc(copy)}">Copy</button>${body}</div>`;
    const list = (a) => `<ol>${a.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>`;
    $("kitOut").innerHTML = `<div class="kit">
      ${card("Tagline", `<p>${esc(k.tagline)}</p>`, k.tagline)}
      ${card("X bio", `<p>${esc(k.bio)}</p>`, k.bio)}
      ${card("Lore", `<p>${esc(k.lore)}</p>`, k.lore)}
      ${card("Thread", list(k.thread), k.thread.join("\n\n"))}
      ${card("Posts", list(k.posts), k.posts.join("\n\n"))}
      ${card("Launch post", `<p>${esc(k.launchPost)}</p>`, k.launchPost)}</div>`;
  } catch (e2) { $("kitOut").innerHTML = `<p class="err" style="margin-top:18px">${esc(e2.message)}</p>`; }
  finally { clearInterval(t); $("kitGo").disabled = false; }
});
document.addEventListener("click", async (e) => { const b = e.target.closest("[data-copy]"); if (!b) return; try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = "Copied"; setTimeout(() => (b.textContent = "Copy"), 1200); } catch {} });

// agent studio
let chat = [];
$("chatForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = $("chatIn").value.trim(); if (!text) return;
  const f = Object.fromEntries(new FormData($("agentForm")));
  if (!chat.length) $("msgs").innerHTML = "";
  chat.push({ role: "user", content: text }); $("chatIn").value = "";
  $("msgs").insertAdjacentHTML("beforeend", `<div class="m u">${esc(text)}</div><div class="m a wait" id="wait">…</div>`);
  $("msgs").scrollTop = 1e9; $("chatGo").disabled = true; window.nova?.pulse(0.6);
  try {
    const r = await api("/api/agent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...f, messages: chat }) });
    chat.push({ role: "assistant", content: r.reply });
    $("wait").outerHTML = `<div class="m a"><b style="color:var(--acc)">${esc(f.name || "Agent")}</b>\n${esc(r.reply)}</div>`;
  } catch (e2) { chat.pop(); $("wait").outerHTML = `<div class="m a" style="color:#ff8a8d">${esc(e2.message)}</div>`; }
  finally { $("chatGo").disabled = false; $("msgs").scrollTop = 1e9; }
});
$("agentForm").addEventListener("input", () => { chat = []; });

// open from the address bar: #radar, #fees, … or ?ca=0x… for a scan
const qca = new URLSearchParams(location.search).get("ca");
const startTab = (location.hash || "").slice(1);
if (qca) { openTab("scan", false, true); runScan(qca); } else openTab(VISOR[startTab] ? startTab : "scan", false, true);
if (qca || VISOR[startTab]) setTimeout(() => $("app").scrollIntoView({ block: "start" }), 300);

// ---------- sniper: the same engine as the Signal sniper bot, the private key stays in this browser ----------
const PONS_FACTORY = "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e";
const SK = { key: "nova.sniper.key", cfg: "nova.sniper.cfg2", pos: "nova.sniper.pos2", hist: "nova.sniper.hist" };
const sstore = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
// same defaults as sniper-config.example.json
const SN_DEF = { buyEth: "0.005", maxTotalSpendEth: "0.05", takeProfitPercent: 50, stopLossPercent: 30, allowedDeployers: [], maxHoldSeconds: 0, maxOpenPositions: 3, gasReserveEth: "0.001", slippagePercent: 15, maxCreatorTaxPercent: 3, maxSnipeTaxPercent: 1, maxLaunchAgeSeconds: 30, requireSocials: 0, maxDeployerLaunches: 0, keywords: [], blockedKeywords: ["test"], blockedDeployers: [], mode: "manual", agentMinScore: 75 };
const SN_NUM = ["slippagePercent", "maxCreatorTaxPercent", "maxSnipeTaxPercent", "maxLaunchAgeSeconds", "maxOpenPositions", "takeProfitPercent", "stopLossPercent", "maxHoldSeconds", "requireSocials", "maxDeployerLaunches"];
const SN_ETH = ["buyEth", "maxTotalSpendEth", "gasReserveEth"];
const SN_LIST = ["keywords", "blockedKeywords", "allowedDeployers", "blockedDeployers"];
const SN_ABI = {
  curve: ["function buy(uint256 quoteIn, uint256 minTokensOut, address recipient) payable returns (uint256 tokensOut)", "function sell(uint256 tokensIn, uint256 minQuoteOut, address recipient) returns (uint256 quoteOut)", "function creatorTaxBps() view returns (uint256)", "function currentSnipeTaxBps(address recipient) view returns (uint256)", "function graduated() view returns (bool)", "event CurveSell(address indexed seller, address indexed recipient, uint256 tokensIn, uint256 quoteOut, uint256 fee, uint256 tax)"],
  token: ["function name() view returns (string)", "function symbol() view returns (string)", "function balanceOf(address) view returns (uint256)", "function allowance(address,address) view returns (uint256)", "function approve(address,uint256) returns (bool)", "function getTokenInfo() view returns (address tokenDeployer, string tokenLogo, string tokenDescription, tuple(string twitter, string telegram, string discord, string website, string farcaster) tokenSocials)"],
  factory: ["function getLaunchedToken(address token) view returns (tuple(address token, address curve, address deployer, address creatorFeeRecipient, address pairToken, uint256 graduationThreshold, uint256 initialLiquidity, uint24 poolFee, int24 tickSpacing, uint16 creatorTaxBps, bool buybackEnabled, uint8 phase, uint256 sweptQuote, uint256 sweptTokens, bool exists))"],
};
const SN_LAUNCHED = "0x" + "0".repeat(64); // set once ethers loads
let snCfg = { ...SN_DEF, ...sstore.get(SK.cfg, {}) }, snPositions = sstore.get(SK.pos, []), snHistory = sstore.get(SK.hist, []);
let Eth = null, snP = null, snW = null, snMode = null, snSpent = 0n, snNext = 0, snWaiting = [], snBuySent = new Set(), snTimer = null, snLastPos = 0, snTopic = null, snTx = Promise.resolve();
const snQ = (fn) => (snTx = snTx.then(fn, fn)); // one transaction at a time so nonces never clash
const snEth = (w) => Number(Eth.formatEther(BigInt(w))).toLocaleString("en-US", { maximumFractionDigits: 6 });
const snShort = (e) => (e?.shortMessage || e?.info?.error?.message || e?.message || String(e)).slice(0, 160);
function snLog(t, c = "") { const el = $("snLog"); el.insertAdjacentHTML("afterbegin", `<div class="${c}">[${new Date().toLocaleTimeString("en-GB")}] ${esc(t)}</div>`); while (el.children.length > 300) el.lastChild.remove(); }
const savePos = () => { sstore.set(SK.pos, snPositions); snDrawPos(); };

async function snBoot() {
  if (Eth) return;
  Eth = await getEthers();
  snP = new Eth.JsonRpcProvider(location.origin + "/rpc", 4663, { staticNetwork: true, batchMaxCount: 1, pollingInterval: 1000 });
  snTopic = Eth.id("TokenLaunched(address,address,address,address,uint256,uint256)");
  let k = null; try { k = localStorage.getItem(SK.key); } catch {}
  snW = k ? new Eth.Wallet(k, snP) : null;
  snFill(); snDrawWallet(); snDrawPos(); snDrawHist();
}
async function snDrawWallet() {
  $("snAddr").textContent = snW ? snW.address : "No private key yet. Paste one in Settings, or make a new wallet.";
  if (!snW) return ($("snBalLine").textContent = "");
  try { $("snBalLine").textContent = snEth(await snP.getBalance(snW.address)) + " ETH"; } catch { $("snBalLine").textContent = "balance unreadable"; }
}
function snFill() {
  for (const el of $("snForm").elements) {
    if (!el.name || el.name === "privateKey") continue;
    const v = snCfg[el.name]; el.value = Array.isArray(v) ? v.join(", ") : v ?? "";
  }
}
// same validation as the bot dashboard
$("snForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = $("snForm").elements, next = { ...snCfg };
  for (const n of SN_NUM) { const v = Number(f[n].value); if (!Number.isFinite(v) || v < 0) return snMsg(`${n} must be a number >= 0`, true); next[n] = v; }
  for (const n of SN_ETH) { const v = f[n].value.trim(); if (!/^\d+(\.\d{1,18})?$/.test(v)) return snMsg(`${n} must be an ETH amount like 0.005`, true); next[n] = v; }
  for (const n of SN_LIST) next[n] = f[n].value.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  if ([...next.keywords, ...next.blockedKeywords].some((k) => /^0x[0-9a-fA-F]{40}$/.test(k))) return snMsg("Keywords cannot be wallet addresses. Dev addresses go in field 6 (or Blocked devs).", true);
  const key = f.privateKey.value.trim();
  if (key) {
    if (!/^(0x)?[0-9a-fA-F]{64}$/.test(key)) return snMsg("The private key must be 64 hex characters.", true);
    if (snMode) return snMsg("Stop the bot before changing the key.", true);
    snW = new Eth.Wallet(key.startsWith("0x") ? key : "0x" + key, snP);
    try { localStorage.setItem(SK.key, snW.privateKey); } catch {}
    f.privateKey.value = "";
  }
  snCfg = next; sstore.set(SK.cfg, snCfg); snDrawWallet(); snMsg("Settings saved.");
});
function snMsg(t, bad) { $("snMsg").innerHTML = `<span style="color:${bad ? "#ff8a8d" : "var(--ok)"}">${esc(t)}</span>`; }
$("snNewWallet").addEventListener("click", () => {
  if (snMode) return snMsg("Stop the bot first.", true);
  if (snW && !confirm("Replace the saved sniper wallet with a new one? Export the old key first if it holds funds.")) return;
  const w = Eth.Wallet.createRandom(); snW = w.connect(snP); try { localStorage.setItem(SK.key, w.privateKey); } catch {}
  snDrawWallet(); snLog("new sniper wallet " + w.address + ". Fund it, and back up the key with Export key.");
});
$("snExport").addEventListener("click", () => { if (!snW) return; if (confirm("Show the private key? Anyone who sees it can take the funds.")) prompt("Sniper wallet private key:", snW.privateKey); });
$("snForget").addEventListener("click", async () => {
  if (!snW) return; if (snMode) return snMsg("Stop the bot first.", true);
  const bal = await snP.getBalance(snW.address).catch(() => 0n);
  if (!confirm(bal > 0n ? `This wallet still holds ${snEth(bal)} ETH. Export the key first or it is lost. Remove anyway?` : "Remove the key from this browser?")) return;
  try { localStorage.removeItem(SK.key); } catch {} snW = null; snDrawWallet();
});
$("snWithdraw").addEventListener("click", async () => {
  if (!snW) return;
  const to = (prompt("Send all ETH from the sniper wallet to (0x…):") || "").trim();
  if (!Eth.isAddress(to)) return to && alert("That is not an address.");
  await snQ(async () => {
    try {
      const bal = await snP.getBalance(snW.address), fee = await snP.getFeeData(), gp = (fee.maxFeePerGas || fee.gasPrice) * 2n, cost = 21000n * gp;
      if (bal <= cost) throw new Error("Balance is too small to cover gas.");
      const tx = await snW.sendTransaction({ to, value: bal - cost, gasLimit: 21000n, maxFeePerGas: gp, maxPriorityFeePerGas: fee.maxPriorityFeePerGas ?? 0n });
      snLog(`WITHDRAW ${snEth(bal - cost)} ETH -> ${to} (${tx.hash})`); await tx.wait(); snDrawWallet();
    } catch (e) { snLog("withdraw failed: " + snShort(e), "bad"); }
  });
});

// ---------- buying ----------
const lower = (a) => (a || []).map((s) => s.toLowerCase());
const devCount = new Map();
async function devLaunches(dev) {
  const c = devCount.get(dev); if (c !== undefined) return c;
  try { const j = await api("/api/dev?addr=" + dev); devCount.set(dev, j.launches24h); return j.launches24h; } catch { return 0; }
}
/** Same checks as the bot: the reason a launch is skipped, or null; retry when only the anti-snipe tax is in the way. */
async function snReject(l) {
  const dev = l.deployer.toLowerCase();
  if (l.pairToken !== Eth.ZeroAddress) return { reason: "not paired with ETH", symbol: "?" };
  if (lower(snCfg.blockedDeployers).includes(dev)) return { reason: "deployer is blocked", symbol: "?" };
  // an agent pick is chosen by Signal instead of by field 6, the launch age and the keyword list
  if (!l.agent && snCfg.allowedDeployers.length && !lower(snCfg.allowedDeployers).includes(dev)) return { reason: "deployer not in field 6", symbol: "?" };
  const t = new Eth.Contract(l.token, SN_ABI.token, snP), c = new Eth.Contract(l.curve, SN_ABI.curve, snP);
  const [name, symbol, tax, snipe, grad, lb, head] = await Promise.all([t.name(), t.symbol(), c.creatorTaxBps(), c.currentSnipeTaxBps(snW.address), c.graduated(), l.agent ? null : snP.getBlock(l.block), l.agent ? null : snP.getBlock("latest")]);
  const text = `${name} ${symbol}`.toLowerCase(), age = l.agent ? 0 : head.timestamp - lb.timestamp;
  let reason = null;
  if (grad) reason = "already graduated";
  else if (!l.agent && age > snCfg.maxLaunchAgeSeconds) reason = `too late (${age}s old)`;
  else if (Number(tax) > snCfg.maxCreatorTaxPercent * 100) reason = `creator tax ${Number(tax) / 100}% too high`;
  else if (lower(snCfg.blockedKeywords).some((k) => text.includes(k))) reason = "name matches blocked keywords";
  else if (!l.agent && snCfg.keywords.length && !lower(snCfg.keywords).some((k) => text.includes(k))) reason = "name matches no keyword";
  if (!reason && snCfg.requireSocials) { const ti = await t.getTokenInfo(); if (!Object.values(ti[3].toObject()).some((v) => String(v).trim())) reason = "no socials set"; }
  if (!reason && snCfg.maxDeployerLaunches) { const n = await devLaunches(dev); if (n > snCfg.maxDeployerLaunches) reason = `deployer launched ${n} other tokens in 24h (limit ${snCfg.maxDeployerLaunches})`; }
  if (reason) return { reason, symbol };
  if (Number(snipe) > snCfg.maxSnipeTaxPercent * 100) return { reason: `snipe tax ${Number(snipe) / 100}% still active`, symbol, retry: true };
  return { reason: null, symbol };
}
async function snSnipe(l) {
  if (snPositions.some((p) => p.token === l.token) || snBuySent.has(l.token)) return;
  let r;
  try { r = await snReject(l); }
  catch (e) {
    if (!snWaiting.some((w) => w.token === l.token)) { snWaiting.push(l); snLog(`wait  ${l.token}: ${snShort(e)}, retrying until max launch age`); }
    if (Date.now() - (l.seenAt ||= Date.now()) > (l.agent ? 120 : snCfg.maxLaunchAgeSeconds) * 1000) { snWaiting = snWaiting.filter((w) => w.token !== l.token); snLog(`skip  ${l.token}: could not be read in time`); }
    return;
  }
  const was = snWaiting.some((w) => w.token === l.token);
  if (r.retry) { if (!was) { snWaiting.push(l); snLog(`wait  $${r.symbol} ${l.token}: ${r.reason}, retrying until it drops`); } return; }
  snWaiting = snWaiting.filter((w) => w.token !== l.token);
  if (r.reason) return snLog(`skip  $${r.symbol} ${l.token}: ${r.reason}`);
  if (snPositions.length >= snCfg.maxOpenPositions) return snLog(`skip  $${r.symbol}: ${snPositions.length} positions already open`);
  const BUY = Eth.parseEther(snCfg.buyEth), RES = Eth.parseEther(snCfg.gasReserveEth);
  if (snSpent + BUY > Eth.parseEther(snCfg.maxTotalSpendEth)) return snLog(`skip  $${r.symbol}: total budget used up`);
  const bal = await snP.getBalance(snW.address), live = snMode === "live";
  // a wallet a little short still buys with what it has, like the bot; skip only under half of the buy size
  const spendable = bal > RES ? bal - RES : 0n, buyWei = bal < BUY + RES && live ? spendable : BUY;
  if (buyWei * 2n < BUY) return snLog(`skip  $${r.symbol}: wallet balance ${snEth(bal)} ETH is too low`);
  const curve = new Eth.Contract(l.curve, SN_ABI.curve, snW);
  let out;
  try { out = await curve.buy.staticCall(buyWei, 0n, snW.address, { value: buyWei }); }
  catch (e) {
    if (!live) { snSpent += BUY; return snLog(`DRY   would buy $${r.symbol} ${l.token} with ${snCfg.buyEth} ETH (fund the wallet to see the token amount)`, "dry"); }
    if (!snWaiting.some((w) => w.token === l.token)) snWaiting.push(l);
    return snLog(`wait  $${r.symbol}: buy simulation failed (${snShort(e)}), retrying until max launch age`);
  }
  if (!live) { snSpent += BUY; return snLog(`DRY   would buy $${r.symbol} ${l.token} with ${snCfg.buyEth} ETH -> ${Number(Eth.formatEther(out)).toLocaleString("en-US")} tokens`, "dry"); }
  const minOut = (out * BigInt(Math.round((100 - snCfg.slippagePercent) * 100))) / 10000n;
  await snQ(async () => {
    try {
      snBuySent.add(l.token); snSpent += buyWei;
      const tx = await curve.buy(buyWei, minOut, snW.address, { value: buyWei });
      snPositions.push({ token: l.token, curve: l.curve, symbol: r.symbol, costWei: buyWei.toString(), boughtAt: Date.now(), buyTx: tx.hash }); savePos();
      const rc = await tx.wait();
      if (rc.status !== 1) { snSpent -= buyWei; snPositions = snPositions.filter((p) => p.token !== l.token); savePos(); snBuySent.delete(l.token); snWaiting.push(l); return snLog(`FAIL  buy $${r.symbol} reverted (${tx.hash}), retrying with a fresh price`, "bad"); }
      snLog(`BUY   $${r.symbol} ${l.token} for ${Eth.formatEther(buyWei)} ETH (${tx.hash})`, "ok"); window.nova?.pulse(1); snDrawWallet();
      const a = await new Eth.Contract(l.token, SN_ABI.token, snW).approve(l.curve, Eth.MaxUint256); await a.wait();
    } catch (e) { snLog(`buy $${r.symbol} failed: ${snShort(e)}`, "bad"); }
  });
}

// ---------- selling ----------
async function snSellPos(pos, trigger) {
  return snQ(async () => {
    const me = snW.address, t = new Eth.Contract(pos.token, SN_ABI.token, snW), c = new Eth.Contract(pos.curve, SN_ABI.curve, snW);
    const bal = await t.balanceOf(me);
    if (bal === 0n) return snClose(pos, "sold outside the bot", null, null);
    if ((await t.allowance(me, pos.curve)) < bal) { const a = await t.approve(pos.curve, Eth.MaxUint256); await a.wait(); }
    const q = await c.sell.staticCall(bal, 0n, me);
    const tx = await c.sell(bal, (q * BigInt(Math.round((100 - snCfg.slippagePercent) * 100))) / 10000n, me);
    const rc = await tx.wait();
    if (rc.status !== 1) return snLog(`FAIL  sell $${pos.symbol} reverted (${tx.hash}), will retry`, "bad");
    // book what the curve really paid out
    let got = q; for (const lg of rc.logs) { try { const ev = c.interface.parseLog(lg); if (ev?.name === "CurveSell" && lg.address.toLowerCase() === pos.curve.toLowerCase()) got = ev.args.quoteOut; } catch {} }
    const pnl = Number(((got - BigInt(pos.costWei)) * 10000n) / BigInt(pos.costWei)) / 100;
    snClose(pos, trigger, got, tx.hash);
    snLog(`SELL  $${pos.symbol} (${trigger}) for ${Eth.formatEther(got)} ETH, ${pnl >= 0 ? "+" : ""}${pnl}% (${tx.hash})`, pnl >= 0 ? "ok" : "bad"); snDrawWallet();
  });
}
function snClose(pos, reason, got, tx) {
  snPositions = snPositions.filter((p) => p.token !== pos.token); savePos();
  snHistory.unshift({ token: pos.token, symbol: pos.symbol, costWei: pos.costWei, receivedWei: got === null ? null : got.toString(), boughtAt: pos.boughtAt, closedAt: Date.now(), reason, tx });
  sstore.set(SK.hist, snHistory); snDrawHist();
}
async function snManage() {
  const me = snW.address;
  for (const pos of [...snPositions]) {
    try {
      const t = new Eth.Contract(pos.token, SN_ABI.token, snP), c = new Eth.Contract(pos.curve, SN_ABI.curve, snP);
      const [bal, grad] = await Promise.all([t.balanceOf(me), c.graduated()]);
      if (bal === 0n) { snClose(pos, "sold outside the bot", null, null); snLog(`CLOSE $${pos.symbol}: no tokens left in the wallet`); continue; }
      if (grad) { snClose(pos, "graduated", null, null); snLog(`GRAD  $${pos.symbol} graduated to the DEX. Sell ${pos.token} there manually.`); continue; }
      const q = await c.sell.staticCall(bal, 0n, me).catch(() => null);
      if (q === null) continue;
      const cost = BigInt(pos.costWei), pnl = Number(((q - cost) * 10000n) / cost) / 100;
      pos.valueWei = q.toString(); pos.pnlPercent = pnl;
      const held = (Date.now() - pos.boughtAt) / 1000;
      let trig = null;
      if (pnl >= snCfg.takeProfitPercent) trig = "take profit"; else if (pnl <= -snCfg.stopLossPercent) trig = "stop loss"; else if (snCfg.maxHoldSeconds > 0 && held >= snCfg.maxHoldSeconds) trig = "max hold time";
      if (trig && snMode === "live") snSellPos(pos, trig).catch((e) => snLog(`sell $${pos.symbol} failed: ${snShort(e)}`, "bad"));
    } catch {}
  }
  savePos();
}

// ---------- main loop: new launches straight from the factory, like the bot ----------
async function snLoop() {
  if (!snMode) return;
  try {
    if (snCfg.mode === "agent") await snAgentTick();
    const head = snCfg.mode === "agent" ? 0 : await snP.getBlockNumber();
    if (!snNext) snNext = head + 1;
    if (snCfg.mode !== "agent" && head >= snNext) {
      const logs = await snP.getLogs({ address: PONS_FACTORY, topics: [snTopic], fromBlock: snNext, toBlock: Math.min(head, snNext + 4000) });
      snNext = Math.min(head, snNext + 4000) + 1;
      for (const lg of logs) {
        const l = { token: Eth.getAddress("0x" + lg.topics[1].slice(26)), curve: Eth.getAddress("0x" + lg.topics[2].slice(26)), deployer: Eth.getAddress("0x" + lg.topics[3].slice(26)), pairToken: Eth.getAddress("0x" + lg.data.slice(26, 66)), block: lg.blockNumber };
        snSnipe(l);
      }
    }
    for (const w of [...snWaiting]) snSnipe(w);
    if (Date.now() - snLastPos > 3000) { snLastPos = Date.now(); snManage(); }
  } catch (e) { snLog("rpc: " + snShort(e), "bad"); }
  snTimer = setTimeout(snLoop, 700);
}
// ---------- agent snipe: buy what Signal's AI picks from the radar ----------
let snPicks = [], snPicksAt = 0, snPicksErr = "", snPicksInfo = null;
const snTried = new Set();
async function snFetchPicks(refresh) {
  try { const j = await api("/api/picks" + (refresh ? "?refresh=1" : "")); snPicks = j.picks; snPicksErr = j.error || ""; snPicksAt = Date.now(); snPicksInfo = j; } catch (e) { snPicksErr = e.message; }
  snDrawPicks();
}
async function snAgentTick() {
  if (Date.now() - snPicksAt < 5000) return;
  await snFetchPicks();
  for (const p of snPicks) {
    if (p.score < snCfg.agentMinScore || snTried.has(p.token) || snHistory.some((h) => h.token === p.token) || snPositions.some((x) => x.token === p.token)) continue;
    snTried.add(p.token);
    snLog(`AGENT Signal picked $${p.symbol} (score ${p.score}): ${p.reason}`, "ok");
    snSnipe({ token: p.token, curve: p.curve, deployer: p.deployer, pairToken: Eth.ZeroAddress, agent: true });
  }
}
function snDrawPicks() {
  const min = snCfg.agentMinScore;
  $("pkStat").textContent = snPicksErr ? snPicksErr : snPicksAt ? `updated ${new Date(snPicksAt).toLocaleTimeString("en-GB")}` : "";
  $("pkList").innerHTML = snPicks.length ? snPicks.map((p) => `<div class="pick"><div class="ring" style="--v:${p.score};--c:${p.score >= 80 ? "var(--ok)" : p.score >= 70 ? "var(--acc)" : "var(--mid)"}" title="Signal score ${p.score}/100"><b>${p.score}</b></div>
      <div><div class="nm"><a href="#" data-scan="${p.token}">$${esc(p.symbol)}</a> <span style="color:var(--dim);font-weight:400">${esc(p.name)}</span>${p.score >= min ? ' <span class="pill2 dry" style="padding:2px 8px;font-size:11px">agent buys</span>' : ""}</div>
      <div class="rs">${esc(p.reason)}</div><div class="mt">${Math.round(p.ageSec / 60)}m old · curve ${p.progressPct.toFixed(1)}% · ${fmt(p.curveETH, 4)} ETH · tax ${p.taxPct}% · ${p.token.slice(0, 8)}…</div></div>
      <button class="btn sm ghost" type="button" data-pkbuy="${p.token}">Manual buy</button></div>`).join("")
    : `<p class="note">${!snPicksAt ? "Loading Signal picks…" : snPicksInfo?.checkedLastHour ? `Signal scored ${snPicksInfo.checkedLastHour} fresh launch${snPicksInfo.checkedLastHour > 1 ? "es" : ""} in the last hour; the best got ${snPicksInfo.bestLastHour}/100, under the ${snPicksInfo.minScore} needed to be a pick. It checks again every 15 seconds.` : "Signal is scoring the newest launches that passed the radar checks. Picks show here as soon as one scores high enough."}</p>`;
  if (snPicks.length && snPicksInfo?.checkedLastHour) $("pkList").insertAdjacentHTML("beforeend", `<p class="note" style="margin:4px 0 0">Signal scored ${snPicksInfo.checkedLastHour} fresh launches in the last hour; ${snPicks.length} made the cut.</p>`);
}
$("pkRefresh").addEventListener("click", async () => {
  const b = $("pkRefresh"), before = JSON.stringify(snPicks.map((p) => [p.token, p.score]));
  b.disabled = true; b.textContent = "Signal is checking…";
  await snBoot(); await snFetchPicks(true);
  const same = before === JSON.stringify(snPicks.map((p) => [p.token, p.score]));
  b.disabled = false; b.textContent = "Refresh";
  $("pkStat").textContent = (same ? "no better launch yet · " : "updated · ") + new Date().toLocaleTimeString("en-GB");
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-pkbuy]"); if (!b) return;
  $("mbToken").value = b.dataset.pkbuy; $("mbToken").scrollIntoView({ behavior: "smooth", block: "center" }); $("mbToken").focus();
});
// the picks list refreshes while the sniper tab is on screen
setInterval(() => { if (!snMode && $("pkList").offsetParent) snBoot().then(snFetchPicks); }, 10_000);
function snSetMode(m) {
  if (snMode) return snMsg("Stop the bot before switching mode.", true);
  snCfg.mode = m === "agent" ? "agent" : "manual"; sstore.set(SK.cfg, snCfg);
  document.querySelectorAll("#snModeSw button").forEach((b) => b.classList.toggle("on", b.dataset.mode === snCfg.mode));
  $("snAgentBox").hidden = snCfg.mode !== "agent";
}
document.querySelectorAll("#snModeSw button").forEach((b) => b.addEventListener("click", () => snSetMode(b.dataset.mode)));
function snMinShow(v) { $("snMinVal").textContent = v; $("snMinScore").style.setProperty("--p", ((v - 50) / 45) * 100 + "%"); }
$("snMinScore").value = snCfg.agentMinScore; snMinShow(snCfg.agentMinScore);
$("snMinScore").addEventListener("input", (e) => snMinShow(+e.target.value));
$("snMinScore").addEventListener("change", (e) => { snCfg.agentMinScore = Math.round(+e.target.value); sstore.set(SK.cfg, snCfg); snDrawPicks(); });
document.querySelectorAll("#snModeSw button").forEach((b) => b.classList.toggle("on", b.dataset.mode === snCfg.mode));
$("snAgentBox").hidden = snCfg.mode !== "agent";

async function snStart(mode) {
  await snBoot();
  if (!snW) return snMsg("Paste a private key in Settings (field 1) and save, or make a new wallet.", true);
  if (snMode) return snMsg("Already running. Stop it first.", true);
  if (mode === "live" && !confirm(`LIVE buys for real: ${snCfg.buyEth} ETH per token, up to ${snCfg.maxTotalSpendEth} ETH. Keep this tab open. Start?`)) return;
  snMode = mode; snSpent = 0n; snNext = 0; snWaiting = []; snTried.clear(); snPicksAt = 0;
  $("snState").textContent = mode === "live" ? "LIVE: real buys & sells" : "Dry run: no transactions"; $("snState").className = "pill2 " + mode;
  snLog(`Pons sniper ${mode === "live" ? "LIVE" : "DRY RUN"} · ${snCfg.mode === "agent" ? `AGENT mode: buys Signal picks scoring ${snCfg.agentMinScore}+` : "manual mode: your filters"} · wallet ${snW.address} · buy ${snCfg.buyEth} ETH each, budget ${snCfg.maxTotalSpendEth} ETH, max ${snCfg.maxOpenPositions} positions · TP +${snCfg.takeProfitPercent}% / SL -${snCfg.stopLossPercent}% / hold ${snCfg.maxHoldSeconds || "∞"}s`, mode === "live" ? "ok" : "dry");
  window.nova?.say(mode === "live" ? "LIVE" : "DRY RUN");
  snLoop();
}
function snStop() { if (!snMode) return; snMode = null; clearTimeout(snTimer); $("snState").textContent = "Off"; $("snState").className = "pill2"; snLog("stopped"); window.nova?.say("SNIPER"); }
$("snDry").addEventListener("click", () => snStart("dry"));
$("snLiveBtn").addEventListener("click", () => snStart("live"));
$("snStop").addEventListener("click", snStop);

// ---------- manual buy / sell ----------
$("mbGo").addEventListener("click", async () => {
  await snBoot();
  const ca = $("mbToken").value.trim(), m = (t, bad) => ($("mbMsg").innerHTML = `<span style="color:${bad ? "#ff8a8d" : "var(--ok)"}">${esc(t)}</span>`);
  if (!snW) return m("Save a private key first.", true);
  if (!Eth.isAddress(ca)) return m("Paste a token CA (0x…).", true);
  const amt = $("mbEth").value.trim() || snCfg.buyEth;
  if (!/^\d+(\.\d{1,18})?$/.test(amt)) return m("ETH must be an amount like 0.005.", true);
  try {
    const rec = await new Eth.Contract(PONS_FACTORY, SN_ABI.factory, snP).getLaunchedToken(ca);
    if (!rec.exists) return m("That token was not launched on Pons.", true);
    const curve = new Eth.Contract(rec.curve, SN_ABI.curve, snW), token = new Eth.Contract(ca, SN_ABI.token, snP);
    const [symbol, grad, snipe] = await Promise.all([token.symbol(), curve.graduated(), curve.currentSnipeTaxBps(snW.address)]);
    if (grad) return m(`$${symbol} already graduated to the DEX, buy it there.`, true);
    if (Number(snipe) > snCfg.maxSnipeTaxPercent * 100) return m(`Anti-snipe tax on $${symbol} is still ${Number(snipe) / 100}% (limit ${snCfg.maxSnipeTaxPercent}%). Wait a few seconds and try again.`, true);
    const wei = Eth.parseEther(amt), bal = await snP.getBalance(snW.address);
    if (bal < wei + Eth.parseEther(snCfg.gasReserveEth)) return m(`The sniper wallet has ${snEth(bal)} ETH. It needs ${amt} ETH plus the ${snCfg.gasReserveEth} ETH gas reserve.`, true);
    if (!confirm(`Buy $${symbol} for ${amt} ETH now?`)) return;
    const out = await curve.buy.staticCall(wei, 0n, snW.address, { value: wei });
    await snQ(async () => {
      const tx = await curve.buy(wei, (out * BigInt(Math.round((100 - snCfg.slippagePercent) * 100))) / 10000n, snW.address, { value: wei });
      m(`Buying $${symbol}… ${tx.hash}`);
      const rc = await tx.wait(); if (rc.status !== 1) throw new Error("buy reverted (price moved)");
      snPositions.push({ token: Eth.getAddress(ca), curve: rec.curve, symbol, costWei: wei.toString(), boughtAt: Date.now(), buyTx: tx.hash }); savePos();
      snLog(`BUY   $${symbol} ${ca} (manual) for ${amt} ETH (${tx.hash})`, "ok"); m(`Bought $${symbol}. The bot manages it with your take profit and stop loss while it runs.`);
      const a = await new Eth.Contract(ca, SN_ABI.token, snW).approve(rec.curve, Eth.MaxUint256); await a.wait(); snDrawWallet();
    });
  } catch (e) { m(snShort(e), true); }
});
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-snsell]"); if (!b) return;
  const pos = snPositions.find((p) => p.token === b.dataset.snsell); if (!pos || !snW) return;
  if (!confirm(`Sell all $${pos.symbol} now?`)) return;
  b.disabled = true; try { await snSellPos(pos, "manual"); } catch (er) { snLog(`sell $${pos.symbol} failed: ${snShort(er)}`, "bad"); b.disabled = false; }
});

// ---------- tables ----------
const REASONS = { "take profit": "Take profit", "stop loss": "Stop loss", "max hold time": "Hold time over", manual: "Manual sell", graduated: "Graduated to DEX (sell manually)", "sold outside the bot": "Sold outside the bot" };
function snDrawPos() {
  if (!Eth) return;
  $("snPos").innerHTML = snPositions.length ? `<table><tr class="th"><td>Token</td><td>Cost</td><td>Value now</td><td>PnL</td><td>Bought</td><td></td></tr>${snPositions.map((p) => `<tr><td><a href="#" data-scan="${p.token}">$${esc(p.symbol)}</a></td><td>${snEth(p.costWei)} ETH</td><td>${p.valueWei ? snEth(p.valueWei) + " ETH" : "…"}</td><td style="color:${(p.pnlPercent ?? 0) >= 0 ? "var(--ok)" : "var(--high)"}">${p.pnlPercent === undefined ? "…" : (p.pnlPercent >= 0 ? "+" : "") + p.pnlPercent + "%"}</td><td>${new Date(p.boughtAt).toLocaleTimeString("en-GB")}</td><td class="r"><button class="btn sm danger" type="button" data-snsell="${p.token}">Sell now</button></td></tr>`).join("")}</table>` : `<p class="note">No positions.</p>`;
}
function snDrawHist() {
  if (!Eth) return;
  const known = snHistory.filter((t) => t.receivedWei !== null);
  const total = known.reduce((s, t) => s + BigInt(t.receivedWei) - BigInt(t.costWei), 0n);
  $("snPnl").textContent = known.length ? `Total PnL ${total >= 0n ? "+" : "-"}${snEth(total < 0n ? -total : total)} ETH over ${known.length} trades` : "";
  $("snHist").innerHTML = snHistory.length ? `<table><tr class="th"><td>Token</td><td>Cost</td><td>Got</td><td>PnL</td><td>Reason</td><td>Closed</td><td></td></tr>${snHistory.map((t, i) => {
    const pnl = t.receivedWei === null ? null : Number(((BigInt(t.receivedWei) - BigInt(t.costWei)) * 10000n) / BigInt(t.costWei)) / 100;
    return `<tr><td>$${esc(t.symbol)}</td><td>${snEth(t.costWei)} ETH</td><td>${t.receivedWei === null ? "-" : snEth(t.receivedWei) + " ETH"}</td><td style="color:${(pnl ?? 0) >= 0 ? "var(--ok)" : "var(--high)"}">${pnl === null ? "-" : (pnl >= 0 ? "+" : "") + pnl + "%"}</td><td>${esc(REASONS[t.reason] || t.reason)}</td><td>${new Date(t.closedAt).toLocaleString("en-GB")}</td><td class="r"><button class="btn sm ghost" type="button" data-sndel="${i}">Delete</button></td></tr>`;
  }).join("")}</table>` : `<p class="note">No finished trades yet.</p>`;
}
document.addEventListener("click", (e) => { const b = e.target.closest("[data-sndel]"); if (!b) return; snHistory.splice(+b.dataset.sndel, 1); sstore.set(SK.hist, snHistory); snDrawHist(); });
$("snClearHist").addEventListener("click", () => { if (snHistory.length && confirm("Delete the whole trade history?")) { snHistory = []; sstore.set(SK.hist, snHistory); snDrawHist(); } });
document.querySelector('#tabs button[data-t="snipe"]').addEventListener("click", () => snBoot());
if (location.hash === "#snipe") snBoot();

// ---------- fee claimer: many accounts of one seed, derived and signed only in this browser ----------
const SEED_PATH = "m/44'/60'/0'/0"; // MetaMask / Rabby accounts: Account 1 = index 0
let seedAccs = [], seedRows = [], seedProv = null, seedBusy = false;
document.querySelectorAll(".fmode button").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll(".fmode button").forEach((x) => x.classList.toggle("on", x === b));
  $("feeOne").hidden = b.dataset.m !== "one"; $("feeSeed").hidden = b.dataset.m !== "seed";
}));
function drawWords(n) {
  const old = [...document.querySelectorAll("#words input")].map((i) => i.value);
  $("words").innerHTML = Array.from({ length: n }, (_, i) => `<label><span>${i + 1}</span><input type="password" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(old[i] || "")}"></label>`).join("");
}
drawWords(12);
$("wordCount").addEventListener("change", (e) => drawWords(+e.target.value));
$("words").addEventListener("paste", (e) => {
  const t = (e.clipboardData?.getData("text") || "").trim().toLowerCase().split(/\s+/);
  if (t.length < 2) return;
  e.preventDefault();
  if (t.length === 24 || t.length === 12) { $("wordCount").value = String(t.length); drawWords(t.length); }
  document.querySelectorAll("#words input").forEach((inp, i) => (inp.value = t[i] || ""));
});
$("showWords").addEventListener("change", (e) => document.querySelectorAll("#words input").forEach((i) => (i.type = e.target.checked ? "text" : "password")));
function forgetSeed() {
  document.querySelectorAll("#words input").forEach((i) => (i.value = "")); seedAccs = []; seedRows = [];
  $("seedOut").innerHTML = `<p class="note">Seed cleared from this page.</p>`;
}
$("seedForget").addEventListener("click", forgetSeed);

$("seedScan").addEventListener("click", async () => {
  if (seedBusy) return;
  const E2 = await getEthers();
  const phrase = [...document.querySelectorAll("#words input")].map((i) => i.value.trim().toLowerCase()).join(" ");
  if (!E2.Mnemonic.isValidMnemonic(phrase)) return ($("seedOut").innerHTML = `<p class="err">These words are not a valid seed phrase. Check the spelling and the order.</p>`);
  const n = Math.min(200, Math.max(1, parseInt($("seedCount").value) || 100));
  seedProv ||= new E2.JsonRpcProvider(location.origin + "/rpc", 4663, { staticNetwork: true, batchMaxCount: 1, pollingInterval: 1500 });
  seedBusy = true; $("seedScan").disabled = true;
  $("seedOut").innerHTML = loading(`Making ${n} accounts in your browser`);
  try {
    await new Promise((r) => setTimeout(r, 30));
    const root = E2.HDNodeWallet.fromPhrase(phrase, undefined, SEED_PATH);
    seedAccs = Array.from({ length: n }, (_, i) => root.deriveChild(i).connect(seedProv));
    if (!E2.isAddress($("seedDest").value.trim())) $("seedDest").value = seedAccs[0].address;
    $("seedOut").innerHTML = loading(`Reading fees for ${n} accounts (only addresses are sent)`);
    const j = await api("/api/fees-many", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ wallets: seedAccs.map((a) => a.address) }) });
    seedRows = j.accounts.map((r, i) => ({ ...r, i })); seedEscrow = j.escrow; drawSeed();
  } catch (e) { $("seedOut").innerHTML = `<p class="err">${esc(e.message)}</p>`; }
  finally { seedBusy = false; $("seedScan").disabled = false; }
});
let seedEscrow = null, seedAll = false;
function drawSeed() {
  const E2 = ethersLib, min = E2.parseEther(String(parseFloat($("seedMin").value) || 0));
  const total = seedRows.reduce((s, r) => s + BigInt(r.totalWei), 0n);
  const ready = seedRows.filter((r) => BigInt(r.totalWei) >= min && BigInt(r.totalWei) > 0n);
  const launched = seedRows.filter((r) => r.tokens.length).length;
  const rows = seedAll ? seedRows : seedRows.filter((r) => r.tokens.length || BigInt(r.escrowWei) > 0n);
  $("seedOut").innerHTML = `
    <div class="total"><div><span class="lbl">Claimable across ${seedRows.length} accounts</span><br><b>${fmt(Number(E2.formatEther(total)), 6)} ETH</b></div>
      <div style="text-align:right"><span class="lbl">${launched} accounts launched tokens · ${ready.length} above the minimum</span><br>
      <button class="btn" id="seedClaim" style="margin-top:10px" ${ready.length ? "" : "disabled"}>Claim all ${ready.length} accounts <span class="ar">→</span></button></div></div>
    <label class="tog" style="margin-bottom:8px"><input type="checkbox" id="seedShowAll" ${seedAll ? "checked" : ""}> show accounts with nothing to claim</label>
    ${rows.length ? `<table>${rows.map((r) => `<tr><td style="color:var(--dim);width:72px">Acc ${r.i + 1}</td><td class="mono" style="font-size:12px">${short(seedAccs[r.i].address)}</td>
      <td>${r.tokens.map((t) => `<a href="#" data-scan="${t.token}">$${esc(t.symbol)}</a>`).join(" ") || '<span style="color:var(--dim)">—</span>'}</td>
      <td class="r">${fmt(Number(E2.formatEther(BigInt(r.totalWei))), 6)} ETH</td><td class="r" style="color:var(--dim)">gas ${fmt(Number(E2.formatEther(BigInt(r.ethWei))), 5)}</td></tr>`).join("")}</table>` : `<p class="note">None of these accounts launched a Pons token.</p>`}
    <div class="steps2" id="seedLog"></div>`;
  $("seedShowAll").onchange = (e) => { seedAll = e.target.checked; drawSeed(); };
  $("seedClaim")?.addEventListener("click", seedClaimAll);
}
$("seedMin").addEventListener("input", () => seedRows.length && drawSeed());

async function seedClaimAll() {
  const E2 = ethersLib, log = (t, c = "") => $("seedLog").insertAdjacentHTML("beforeend", `<div class="${c}">&gt; ${esc(t)}</div>`);
  const dest = $("seedDest").value.trim();
  if (!E2.isAddress(dest)) return log("Fill in a valid wallet to send the fees to.", "bad");
  const min = E2.parseEther(String(parseFloat($("seedMin").value) || 0));
  const todo = seedRows.filter((r) => BigInt(r.totalWei) >= min && BigInt(r.totalWei) > 0n);
  if (!confirm(`Claim fees from ${todo.length} accounts and send them to ${short(dest)}? Each account signs its own transactions in this browser.`)) return;
  $("seedClaim").disabled = true; seedBusy = true;
  const funder = seedAccs[0], escrowAbi = ["function balanceOf(address) view returns (uint256)", "function claim()"];
  let done = 0, got = 0n;
  try {
    for (const r of todo) {
      const acc = seedAccs[r.i], label = `Acc ${r.i + 1}`, sweeps = r.tokens.filter((t) => BigInt(t.pendingWei) > 0n);
      try {
        const fee = await seedProv.getFeeData(), gp = (fee.maxFeePerGas || fee.gasPrice) * 3n / 2n;
        const need = (BigInt(sweeps.length) * 600_000n + 150_000n + 30_000n) * gp;
        const has = await seedProv.getBalance(acc.address);
        if (has < need && acc.address !== funder.address) {
          const top = need - has;
          log(`${label}: sending ${fmt(Number(E2.formatEther(top)), 6)} ETH gas from Acc 1`);
          const t = await funder.sendTransaction({ to: acc.address, value: top }); await t.wait();
        }
        for (const t of sweeps) {
          const tx = await new E2.Contract(t.curve, ["function sweepFees(uint256 minBuybackTokensOut)"], acc).sweepFees(0);
          await tx.wait(); log(`${label}: swept $${t.symbol}`);
        }
        const esc_ = new E2.Contract(seedEscrow, escrowAbi, acc), owed = await esc_.balanceOf(acc.address);
        if (owed > 0n) { const tx = await esc_.claim(); await tx.wait(); log(`${label}: claimed ${fmt(Number(E2.formatEther(owed)), 6)} ETH`, "ok"); got += owed; }
        if (owed > 0n && acc.address.toLowerCase() !== dest.toLowerCase()) {
          const tx = await acc.sendTransaction({ to: dest, value: owed }); await tx.wait();
          log(`${label}: sent ${fmt(Number(E2.formatEther(owed)), 6)} ETH → ${short(dest)}`, "ok");
        }
        done++;
      } catch (e) { log(`${label}: ${e.shortMessage || e.info?.error?.message || e.message}`, "bad"); }
    }
    log(`done: ${done}/${todo.length} accounts, ${fmt(Number(E2.formatEther(got)), 6)} ETH claimed.`, "ok"); window.nova?.pulse(1);
  } finally { seedBusy = false; }
}


// ---------- launchpad: the LOCKEY Pons launch, signed in the visitor's own wallet ----------
const LP = {
  factory: "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e",
  launchAndBuy: "0xe33E9E479dF8802cb0866d5d05258bEc4cF62948",
  fallbackLogo: "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
};
const LP_PARAMS = "(string name,string symbol,string logo,string description,(string twitter,string telegram,string discord,string website,string farcaster) socials,address creatorFeeRecipient,uint16 creatorTaxBps,bool buybackEnabled,bytes32 expectedEconomics,bytes32 salt)";
const LP_ABI = [
  `function launchToken(${LP_PARAMS} params, uint256 launchConfigId, address pairToken) payable returns (address token, address curve)`,
  `function launchToken(${LP_PARAMS} params, uint256 launchConfigId, address pairToken, address[] snipeTaxExemptions) payable returns (address token, address curve)`,
  "function previewLaunchEconomics(uint256 launchConfigId, address pairToken) view returns (bytes32)",
  "function launchFee() view returns (uint256)",
  "event TokenLaunched(address indexed token, address indexed curve, address indexed deployer, address pairToken, uint256 launchConfigId, uint256 graduationThreshold)",
];
const LP_ROUTER = [`function launchAndBuy(${LP_PARAMS} params, uint256 launchConfigId, address pairToken, uint256 quoteIn, uint256 minTokensOut, address recipient, address[] snipeTaxExemptions) payable returns (address token, address curve, uint256 tokensOut)`];
let lpE = null, lpRead = null, lpFee = null, lpEcon = null, lpAcc = null, lpBalWei = null, lpLogo = "", lpUploading = false, lpTax = 1;
const lpF = () => $("lpForm").elements;
const lpMsg = (t, c = "") => $("lpMsg").insertAdjacentHTML("beforeend", `<div class="${c}">&gt; ${esc(t)}</div>`);

async function lpBoot() {
  if (lpE) return;
  lpE = await getEthers();
  lpRead = new lpE.JsonRpcProvider(location.origin + "/rpc", 4663, { staticNetwork: true, batchMaxCount: 1 });
  const f = new lpE.Contract(LP.factory, LP_ABI, lpRead);
  try { [lpFee, lpEcon] = await Promise.all([f.launchFee(), f.previewLaunchEconomics(0n, lpE.ZeroAddress)]); } catch { lpFee = lpE.parseEther("0.0005"); }
  lpSummary();
}
function lpDevWei() { const v = lpF().devBuy.value.trim(); try { return v && Number(v) > 0 ? lpE.parseEther(v) : 0n; } catch { return null; } }
function lpSummary() {
  if (!lpE) return;
  const dev = lpDevWei(), fee = lpFee ?? lpE.parseEther("0.0005");
  $("lpFee").textContent = lpE.formatEther(fee) + " ETH";
  $("lpDev").textContent = dev === null ? "not a number" : lpE.formatEther(dev) + " ETH";
  $("lpTotal").textContent = dev === null ? "…" : lpE.formatEther(fee + dev) + " ETH";
  $("lpBal").textContent = lpBalWei === null || lpBalWei === undefined ? "—" : Number(lpE.formatEther(lpBalWei)).toFixed(5) + " ETH";
  $("lpTax2").textContent = lpTax + "%";
  const short_ = lpBalWei != null && dev !== null && lpBalWei < fee + dev;
  $("lpBal").style.color = short_ ? "var(--high)" : "";
}
$("lpForm").addEventListener("input", (e) => { if (e.target.name === "symbol") e.target.value = e.target.value.toUpperCase(); if (e.target.name === "logoUrl") lpLinkLogo(); lpSummary(); });
$("lpTaxes").addEventListener("click", (e) => { const b = e.target.closest("[data-tax]"); if (!b) return; lpTax = +b.dataset.tax; $("lpTaxes").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); $("lpTaxLbl").textContent = `${lpTax}% (${lpTax * 100} bps)`; lpSummary(); });

// logo: upload (Catbox, then GitHub backup on the server) or a pasted link
function lpShow(src) { const i = $("lpPrev"); if (src) { i.src = src; i.hidden = false; $("lpDropTxt").hidden = true; } else { i.hidden = true; $("lpDropTxt").hidden = false; } }
function lpLinkLogo() {
  const u = lpF().logoUrl.value.trim();
  if (!u) { if (!lpUploading && !lpLogo) lpShow(null); return; }
  if (!/^https:\/\/[^\s"'<>]+$/.test(u)) { $("lpUpMsg").innerHTML = `<span style="color:#ff8a8d">Paste a full image link that starts with https://</span>`; return; }
  lpLogo = u; lpShow(u); $("lpUpMsg").textContent = "Using the pasted link.";
}
async function lpUpload(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) return ($("lpUpMsg").innerHTML = `<span style="color:#ff8a8d">File size exceeds 5MB limit</span>`);
  lpShow(URL.createObjectURL(file)); lpUploading = true; lpLogo = ""; lpF().logoUrl.value = "";
  $("lpUpMsg").innerHTML = `<span class="load" style="padding:0;justify-content:flex-start"><i></i>Uploading image…</span>`;
  try {
    const r = await fetch("/api/upload", { method: "POST", headers: { "content-type": file.type || "application/octet-stream" }, body: file });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || (r.status === 413 ? "Image too large for the server." : "Upload failed (" + r.status + ")."));
    lpLogo = j.url; $("lpUpMsg").innerHTML = `Hosted at <a href="${esc(j.url)}" target="_blank" rel="noopener">${esc(j.url)}</a>`;
  } catch (e) { lpShow(null); $("lpUpMsg").innerHTML = `<span style="color:#ff8a8d">${esc(e.message)}</span>`; }
  finally { lpUploading = false; }
}
$("lpDrop").addEventListener("click", () => $("lpFile").click());
$("lpFile").addEventListener("change", (e) => lpUpload(e.target.files?.[0]));
$("lpDrop").addEventListener("dragover", (e) => { e.preventDefault(); $("lpDrop").classList.add("over"); });
$("lpDrop").addEventListener("dragleave", () => $("lpDrop").classList.remove("over"));
$("lpDrop").addEventListener("drop", (e) => { e.preventDefault(); $("lpDrop").classList.remove("over"); lpUpload(e.dataTransfer.files?.[0]); });

// wallet
async function lpConnect() {
  await lpBoot();
  lpAcc = lpE.getAddress(await connect());
  $("lpWallet").textContent = lpAcc; $("lpConnect").textContent = "Connected";
  lpBalWei = await lpRead.getBalance(lpAcc).catch(() => null); lpSummary();
  return lpAcc;
}
$("lpConnect").addEventListener("click", () => lpConnect().catch((e) => lpMsg(e.message, "bad")));
$("lpMax").addEventListener("click", async () => {
  await lpBoot(); $("lpDevHint").textContent = "";
  if (!lpAcc) return ($("lpDevHint").textContent = "Connect your EVM wallet (Robinhood Chain) first.");
  lpBalWei = await lpRead.getBalance(lpAcc);
  const safe = lpBalWei - lpFee - lpE.parseEther("0.001");
  if (safe <= 0n) return ($("lpDevHint").textContent = `Balance ${Number(lpE.formatEther(lpBalWei)).toFixed(5)} ETH only covers the launch fee (${lpE.formatEther(lpFee)} ETH + 0.001 gas buffer). Top up ETH on Robinhood Chain.`);
  lpF().devBuy.value = lpE.formatEther(safe); lpSummary();
});
$("lpAddSniper").addEventListener("click", async () => {
  let k = null; try { k = localStorage.getItem("nova.sniper.key"); } catch {}
  if (!k) return lpMsg("No Signal sniper wallet in this browser yet. Make one in the Sniper tab.", "bad");
  const E2 = await getEthers(), a = new E2.Wallet(k).address, inp = lpF().exempt;
  if (!inp.value.toLowerCase().includes(a.toLowerCase())) inp.value = [inp.value.trim(), a].filter(Boolean).join(", ");
});

// launch (same parameters and checks as LOCKEY)
$("lpGo").addEventListener("click", async () => {
  $("lpMsg").innerHTML = "";
  await lpBoot();
  const f = lpF(), name = f.name.value.trim(), symbol = f.symbol.value.trim();
  if (!name || !symbol) return lpMsg("Fill in the name and the ticker.", "bad");
  if (lpUploading) return lpMsg("The logo is still uploading. Wait until it finishes.", "bad");
  const ex = f.exempt.value.split(/[\s,]+/).filter(Boolean), badEx = ex.find((a) => !lpE.isAddress(a));
  if (badEx) return lpMsg(`Snipe tax exempt wallet "${badEx}" is not a valid 0x address.`, "bad");
  const dev = lpDevWei(); if (dev === null) return lpMsg("Dev buy must be an ETH amount like 0.01.", "bad");
  try {
    const acc = lpAcc || (await lpConnect());
    const fee = lpFee ?? lpE.parseEther("0.0005"), total = fee + dev;
    lpBalWei = await lpRead.getBalance(acc).catch(() => lpBalWei); lpSummary();
    if (lpBalWei != null && lpBalWei < total) return lpMsg("Insufficient ETH balance for launch fee + dev buy.", "bad");
    const exempt = [...new Set(ex.map((a) => lpE.getAddress(a)))];
    const params = {
      name, symbol, logo: lpLogo || LP.fallbackLogo, description: f.description.value.trim(),
      socials: { twitter: f.twitter.value.trim(), telegram: f.telegram.value.trim(), discord: f.discord.value.trim(), website: f.website.value.trim(), farcaster: "" },
      creatorFeeRecipient: acc, creatorTaxBps: Math.min(Math.max(Math.round(lpTax * 100), 0), 1000), buybackEnabled: false,
      expectedEconomics: lpEcon || lpE.ZeroHash, salt: lpE.hexlify(crypto.getRandomValues(new Uint8Array(32))),
    };
    if (!confirm(`Launch $${symbol} on Pons for ${lpE.formatEther(total)} ETH${dev > 0n ? " (incl. dev buy)" : ""}?`)) return;
    const signer = await new lpE.BrowserProvider(window.ethereum).getSigner();
    $("lpGo").disabled = true; lpMsg("Confirm the transaction in your wallet…");
    let tx;
    if (dev > 0n) tx = await new lpE.Contract(LP.launchAndBuy, LP_ROUTER, signer).launchAndBuy(params, 0n, lpE.ZeroAddress, dev, 0n, acc, exempt, { value: total });
    else {
      const fc = new lpE.Contract(LP.factory, LP_ABI, signer);
      tx = exempt.length ? await fc["launchToken(" + LP_PARAMS + ",uint256,address,address[])"](params, 0n, lpE.ZeroAddress, exempt, { value: fee })
                         : await fc["launchToken(" + LP_PARAMS + ",uint256,address)"](params, 0n, lpE.ZeroAddress, { value: fee });
    }
    lpMsg(`Sent ${tx.hash}. Waiting for the chain…`);
    const rc = await tx.wait();
    if (rc.status !== 1) throw new Error("The launch transaction reverted.");
    const iface = new lpE.Interface(LP_ABI); let token = null, curve = null;
    for (const lg of rc.logs) { try { const ev = iface.parseLog(lg); if (ev?.name === "TokenLaunched") { token = ev.args.token; curve = ev.args.curve; break; } } catch {} }
    if (!token) for (const lg of rc.logs) if (lg.address.toLowerCase() === LP.factory.toLowerCase() && lg.topics[1]) { token = lpE.getAddress("0x" + lg.topics[1].slice(26)); break; }
    lpMsg(`$${symbol} launched!`, "ok"); window.nova?.pulse(1); window.nova?.say("LAUNCHED");
    $("lpDone").innerHTML = `<div class="kc" style="margin-top:12px;border-color:var(--acc2)"><h5>Launched</h5><p style="margin:0 0 8px"><b>${esc(name)}</b> <span style="color:var(--dim)">$${esc(symbol)}</span></p>
      <div class="mono" style="font-size:12px;word-break:break-all">${esc(token || "")}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px"><a class="btn sm" href="https://ponsfamily.com/launchpad/${esc(token)}" target="_blank" rel="noopener">Open on Pons ↗</a>
      <a class="btn sm ghost" href="${EXPLORER}tx/${esc(tx.hash)}" target="_blank" rel="noopener">Transaction ↗</a><a class="btn sm ghost" href="#" data-scan="${esc(token)}">Scan it</a><a class="btn sm ghost" href="#app" data-open="fees">Claim its fees later</a></div></div>`;
    lpBalWei = await lpRead.getBalance(acc).catch(() => lpBalWei); lpSummary();
  } catch (e) { lpMsg(e.shortMessage || e.info?.error?.message || e.message, "bad"); }
  finally { $("lpGo").disabled = false; }
});
document.querySelector('#tabs button[data-t="launch"]').addEventListener("click", () => lpBoot());
if (location.hash === "#launch") lpBoot();
