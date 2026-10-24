// ---------- Ocula · Agent Live ----------
const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
const el = (id) => document.getElementById(id);
const MARK = document.querySelector(".brand svg").outerHTML;
const CA_RE = /^0x[0-9a-fA-F]{40}$/;
const shortCa = (a) => a.slice(0, 6) + "…" + a.slice(-4);
const ageOf = (s) => (s < 60 ? Math.max(1, Math.round(s)) + "s" : s < 3600 ? Math.round(s / 60) + "m" : Math.round(s / 3600) + "h");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shell = document.querySelector(".shell"), talk = document.querySelector(".talk");
const TOOLS = ["scan", "radar", "snipe", "fees", "launch", "kit", "agent"];

// ---------- mobile: one column at a time ----------
function seg(name) { shell.dataset.seg = name; document.querySelectorAll(".seg button").forEach((b) => b.classList.toggle("on", b.dataset.seg === name)); }
document.querySelectorAll(".seg button").forEach((b) => b.addEventListener("click", () => seg(b.dataset.seg)));
seg("talk");

// ---------- greeting ----------
const hr = new Date().getHours();
el("greet").textContent = hr < 5 ? "Still up?" : hr < 12 ? "Good morning." : hr < 18 ? "Good afternoon." : "Good evening.";

// ---------- the conversation ----------
const thread = el("thread"), input = el("askIn"), send = el("send"), chatLog = [];
const grow = () => { input.style.height = "auto"; input.style.height = Math.min(180, input.scrollHeight) + "px"; send.disabled = !input.value.trim(); };
input.addEventListener("input", grow);
input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); el("ask").requestSubmit(); } });
const scrollThread = () => thread.scrollTo({ top: thread.scrollHeight, behavior: REDUCE ? "auto" : "smooth" });
function addUser(text) { talk.classList.add("chatting"); seg("talk"); thread.insertAdjacentHTML("beforeend", `<div class="msg u"><div class="t">${hesc(text)}</div></div>`); }
function addAgent() { thread.insertAdjacentHTML("beforeend", `<div class="msg a"><span class="av">${MARK}</span><div class="t"><span class="typing"><i></i><i></i><i></i></span></div></div>`); scrollThread(); return thread.lastElementChild; }
const actBtn = (a) => a.unlock ? `<button class="pill solid" type="button" data-unlock>${hesc(a.label)}</button>` : a.scan ? `<a class="pill" href="#app" data-scan="${hesc(a.scan)}">${hesc(a.label)}</a>`
  : a.snipe ? `<a class="pill" href="#app" data-open="snipe" data-snipe-ca="${hesc(a.snipe)}">${hesc(a.label)}</a>`
  : `<a class="pill" href="#app" data-open="${hesc(a.tool)}">${hesc(a.label)}</a>`;
function fill(m, text, actions = [], extra = "") {
  m.querySelector(".t").textContent = text;
  if (extra) m.insertAdjacentHTML("beforeend", extra);
  if (actions.length) m.insertAdjacentHTML("beforeend", `<div class="acts">${actions.map(actBtn).join("")}</div>`);
  scrollThread();
}
async function scanFlow(ca) {
  addUser(ca); const m = addAgent();
  try {
    const r = await fetch("/api/scan?ca=" + ca), j = await r.json();
    if (r.status === 402) { fill(m, j.error, [{ unlock: true, label: "Unlock with $OCULA" }]); refreshMe(); return; }
    if (!r.ok) throw new Error(j.error || "Scan failed.");
    const t = j.facts?.token || {}, order = ["high", "watch", "ok", "info"], flags = (j.flags || []).slice().sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level)).slice(0, 4);
    const logo = String(t.logo || "").replace(/^ipfs:\/\//, "https://gateway.pinata.cloud/ipfs/");
    const card = `<div class="rep"><div class="hd">${/^https:\/\//.test(logo) ? `<img src="${hesc(logo)}" alt="" onerror="this.remove()">` : ""}<div><b>${hesc(t.name || "Token")} · $${hesc(t.symbol || "?")}</b><br><span>${shortCa(ca)}</span></div>${j.risk ? `<span class="rk ${j.risk.level}">risk ${j.risk.score}/100</span>` : ""}</div>
      <ul>${flags.map((f) => `<li class="${hesc(f.level)}"><i></i><span><b>${hesc(f.title)}</b> — ${hesc(f.detail)}</span></li>`).join("")}</ul></div>`;
    const text = j.summary || (flags[0] ? `${flags[0].title}.` : "Here is what the chain shows.");
    fill(m, text, [{ scan: ca, label: "Full report" }, { snipe: ca, label: "Snipe it" }], card); refreshMe();
    chatLog.push({ role: "user", content: "Scan " + ca }, { role: "assistant", content: `${t.symbol}: ${text}` });
  } catch (e) { fill(m, e.message || "Ocula could not read that token."); }
}
async function chatFlow(text) {
  addUser(text); chatLog.push({ role: "user", content: text }); const m = addAgent();
  try {
    const r = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: chatLog }) }), j = await r.json();
    if (r.status === 402) { fill(m, j.error, [{ unlock: true, label: "Unlock with $OCULA" }]); chatLog.pop(); refreshMe(); return; }
    if (!r.ok) throw new Error(j.error || "Ocula could not answer.");
    fill(m, j.reply, j.actions || []); chatLog.push({ role: "assistant", content: j.reply }); refreshMe();
  } catch (e) { fill(m, e.message); chatLog.pop(); }
}
el("ask").addEventListener("submit", (e) => {
  e.preventDefault(); const v = input.value.trim(); if (!v) return;
  input.value = ""; grow();
  CA_RE.test(v) ? scanFlow(v) : chatFlow(v);
});
document.querySelectorAll(".chip[data-ask]").forEach((c) => c.addEventListener("click", () => { input.value = c.dataset.ask; grow(); el("ask").requestSubmit(); }));
document.addEventListener("click", (e) => { const a = e.target.closest("[data-snipe-ca]"); if (a) setTimeout(() => { const mb = el("mbToken"); if (mb) mb.value = a.dataset.snipeCa; }, 50); });
el("home").addEventListener("click", (e) => { e.preventDefault(); closeDrawer(); scrollTo({ top: 0, behavior: REDUCE ? "auto" : "smooth" }); input.focus(); });

// ---------- tools live in a drawer ----------
const drawer = el("drawer");
function setRail(t) { document.querySelectorAll(".rail button").forEach((b) => b.classList.toggle("on", b.dataset.rail === t)); }
function showDrawer() {
  if (!drawer.hidden) return;
  drawer.hidden = false; document.body.classList.add("drawer-open");
  const on = document.querySelector("#tabs button.on"); if (on) setRail(on.dataset.t);
}
function openDrawer(t) { showDrawer(); document.querySelector(`#tabs [data-t="${t}"]`)?.click(); setRail(t); }
function closeDrawer() { if (drawer.hidden) return; drawer.hidden = true; document.body.classList.remove("drawer-open"); setRail("chat"); }
document.addEventListener("click", (e) => {
  const r = e.target.closest("[data-rail]");
  if (r) { e.preventDefault(); r.dataset.rail === "chat" ? (closeDrawer(), scrollTo({ top: 0 }), input.focus()) : openDrawer(r.dataset.rail); return; }
  if (e.target.closest('[data-open],[data-scan],a[href="#app"]') && !e.target.closest(".drawer")) showDrawer();
}, true);
el("dClose").addEventListener("click", closeDrawer);
drawer.addEventListener("click", (e) => { if (e.target === drawer) closeDrawer(); });
new MutationObserver(() => { const b = document.querySelector("#tabs button.on"); if (b) { el("dTitle").textContent = b.querySelector(".tn")?.textContent || "Tools"; if (!drawer.hidden) setRail(b.dataset.t); } }).observe(el("tabs"), { attributes: true, subtree: true, attributeFilter: ["class"] });
if (TOOLS.includes(location.hash.slice(1)) || new URLSearchParams(location.search).get("ca")) showDrawer();

// ---------- holder access ----------
const LOCK_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 10V7a5 5 0 0 1 10 0v3h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V7a3 3 0 0 0-6 0z"/></svg>';
let me = { holder: false, launched: false, trialsLeft: 3 };
const store = { set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };
document.querySelectorAll(".ws .tool[data-p]").forEach((t) => {
  if (t.dataset.p === "launch") return;
  const name = document.querySelector(`#tabs [data-t="${t.dataset.p}"] .tn`)?.textContent || "This tool";
  t.insertAdjacentHTML("afterbegin", `<div class="lock"><div>${LOCK_SVG}<b>${hesc(name)} is for $OCULA holders</b><p>Hold at least 0.1% of $OCULA and unlock it with your wallet. The Pons Launchpad stays free for everyone.</p><button class="pill solid" type="button" data-unlock>Unlock</button></div></div>`);
});
document.querySelectorAll("#tabs button[data-t]").forEach((b) => b.dataset.t !== "launch" && b.classList.add("lockd"));
document.querySelectorAll(".rail button[data-rail]").forEach((b) => !["chat", "launch"].includes(b.dataset.rail) && b.classList.add("lockd"));
async function refreshMe() {
  try { me = await (await fetch("/api/me")).json(); } catch {}
  document.body.classList.toggle("holder", !!me.holder);
  const hb = el("holderBtn");
  hb.textContent = me.holder ? (me.owner ? "Owner access" : "Holder · " + shortCa(me.address || "0x0000000000")) : "Holder access";
  hb.classList.toggle("on", !!me.holder);
  el("hint").textContent = me.holder ? "Full agent unlocked · ask Ocula anything." : `${me.trialsLeft} free read${me.trialsLeft === 1 ? "" : "s"} left today · hold $OCULA for the full agent.`;
}
const modal = el("modal");
function openModal() {
  el("mErr").textContent = "";
  el("mText").textContent = me.launched
    ? "Hold at least 0.1% of $OCULA supply. Connect the wallet that holds it and sign a short message. Signing is free and sends nothing."
    : "Holder access opens when $OCULA launches. The Pons Launchpad is free for everyone, today.";
  el("mSign").hidden = !me.launched || !window.ethereum;
  if (me.launched && !window.ethereum) el("mErr").textContent = "No browser wallet found. Open this page in MetaMask, Rabby or another wallet browser.";
  if (me.holder) { el("mText").textContent = "You're unlocked. Every Ocula tool is open in this browser for 24 hours."; el("mSign").hidden = true; }
  modal.hidden = false;
}
const closeModal = () => (modal.hidden = true);
el("holderBtn").addEventListener("click", openModal);
el("mClose").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
addEventListener("keydown", (e) => { if (e.key === "Escape") { modal.hidden ? closeDrawer() : closeModal(); } });
document.addEventListener("click", (e) => { if (e.target.closest("[data-unlock]")) { e.preventDefault(); openModal(); } });
async function unlockWith(body) {
  const r = await fetch("/api/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Could not unlock.");
  store.set("ocula.pass", j.pass); await refreshMe(); openModal();
}
el("mSign").addEventListener("click", async () => {
  el("mErr").textContent = "";
  try {
    const [address] = await window.ethereum.request({ method: "eth_requestAccounts" });
    const message = `Unlock Ocula\nWallet: ${address}\nIssued: ${Date.now()}`;
    const signature = await window.ethereum.request({ method: "personal_sign", params: [message, address] });
    await unlockWith({ address, message, signature });
  } catch (e) { el("mErr").textContent = e.message || "Signing was cancelled."; }
});
el("ownerForm").addEventListener("submit", async (e) => { e.preventDefault(); el("mErr").textContent = ""; try { await unlockWith({ ownerKey: el("ownerKey").value.trim() }); el("ownerKey").value = ""; } catch (er) { el("mErr").textContent = er.message; } });
refreshMe().then(() => { if (!me.holder && !TOOLS.includes(location.hash.slice(1))) document.querySelector('#tabs [data-t="launch"]')?.click(); });

fetch("/api/status").then((r) => r.json()).then((j) => {
  const b = el("buyNova"); if (!j.novaToken || !b) return;
  b.textContent = "Buy $OCULA"; b.removeAttribute("aria-disabled");
  b.href = "https://ponsfamily.com/launchpad/" + j.novaToken; b.target = "_blank"; b.rel = "noopener";
}).catch(() => {});
async function counts() { try { const j = await (await fetch("/api/status")).json(); el("nRead").textContent = nf(j.index.recent); } catch {} }
counts(); setInterval(() => !document.hidden && counts(), 10000);

// ---------- the agent thinking, live: every new launch is read out loud, then filed ----------
const stream = el("stream"), cards = el("cards"), seen = new Set(), queue = [];
let block = 0, filed = { ok: 0, no: 0 };
const atBottom = () => stream.scrollHeight - stream.scrollTop - stream.clientHeight < 60;
function cardHtml(r) {
  const bad = r.checks.filter((c) => !c.ok), why = r.pass ? (r.checks.find((c) => /grow/.test(c.text))?.text || "cleared every check") : bad[0]?.text || "held";
  const logo = String(r.logo || "").replace(/^ipfs:\/\//, "https://gateway.pinata.cloud/ipfs/");
  return `<button class="card ${r.pass ? "ok" : ""}" type="button" data-card="${r.token}" title="Ask Ocula about $${hesc(r.symbol)}">
    <span class="lg">${/^https:\/\//.test(logo) ? `<img src="${hesc(logo)}" alt="" loading="lazy" onerror="this.remove()">` : hesc((r.symbol || "?")[0])}</span>
    <span class="nm">$${hesc(r.symbol)} <span style="color:var(--faint);font-weight:400;font-size:12px">${ageOf(r.ageSec)}</span></span><span class="vd ${r.pass ? "ok" : "no"}">${r.pass ? "CLEARED" : "HELD"}</span>
    <span class="why">${hesc(why.replace(/(\d+\.\d{2})\d+/g, "$1"))}</span></button>`;
}
function fileCard(r, quiet) {
  cards.querySelector(".none")?.remove();
  cards.querySelector(`[data-card="${r.token}"]`)?.remove();
  cards.insertAdjacentHTML("afterbegin", cardHtml(r));
  if (quiet) cards.firstElementChild.style.animation = "none";
  while (cards.children.length > 16) cards.lastElementChild.remove();
  filed = { ok: cards.querySelectorAll(".card.ok").length, no: cards.querySelectorAll(".card:not(.ok)").length };
  el("nPassF").textContent = filed.ok; el("nHeldF").textContent = filed.no;
}
cards.addEventListener("click", (e) => { const c = e.target.closest("[data-card]"); if (c) scanFlow(c.dataset.card); });
function waitLine() {
  let w = stream.querySelector(".wait");
  if (!w) { stream.insertAdjacentHTML("beforeend", `<div class="wait"></div>`); w = stream.lastElementChild; }
  w.textContent = block ? `watching block #${nf(block)} for the next launch` : "connecting to Robinhood Chain";
  el("mindState").textContent = "watching";
}
async function think(r) {
  stream.querySelector(".wait")?.remove(); el("mindState").textContent = "reading";
  const follow = atBottom(), fast = queue.length > 3 ? 0.35 : 1;
  stream.insertAdjacentHTML("beforeend", `<div class="ev"><div class="h">reading $${hesc(r.symbol)} <em>· ${shortCa(r.token)} · ${ageOf(r.ageSec)} old</em></div></div>`);
  const ev = stream.lastElementChild;
  if (follow) stream.scrollTop = stream.scrollHeight;
  for (const c of r.checks) {
    await sleep((REDUCE ? 0 : 320) * fast);
    ev.insertAdjacentHTML("beforeend", `<div class="l ${c.ok ? "ok" : "no"}">${hesc(c.text.replace(/(\d+\.\d{2})\d+/g, "$1"))}</div>`);
    if (follow) stream.scrollTop = stream.scrollHeight;
  }
  await sleep((REDUCE ? 0 : 420) * fast);
  const bad = r.checks.find((c) => !c.ok);
  ev.insertAdjacentHTML("beforeend", r.pass ? `<div class="v ok">→ cleared. filed under findings</div>` : `<div class="v no">→ held: ${hesc(bad ? bad.text.replace(/(\d+\.\d{2})\d+/g, "$1") : "failed a check")}</div>`);
  if (follow) stream.scrollTop = stream.scrollHeight;
  fileCard(r);
  window.eye?.ping(r.pass ? "ok" : "no");
  while (stream.querySelectorAll(".ev").length > 40) stream.querySelector(".ev").remove();
}
(async function run() {
  for (;;) {
    if (queue.length && !document.hidden) { await think(queue.shift()); await sleep(REDUCE ? 0 : queue.length ? 500 : 900); }
    else { waitLine(); await sleep(1000); }
  }
})();
let first = true;
async function pull() {
  try {
    const [rd, st] = await Promise.all([fetch("/api/radar").then((r) => r.json()), fetch("/api/status").then((r) => r.json()).catch(() => null)]);
    if (st?.index?.indexedTo) block = st.index.indexedTo;
    const rows = rd.rows || [];
    if (first) {
      first = false;
      rows.slice(6, 22).reverse().forEach((r) => { seen.add(r.token); fileCard(r, true); });
      rows.slice(0, 6).reverse().forEach((r) => { seen.add(r.token); queue.push(r); });
      if (!rows.length) cards.innerHTML = `<p class="none">No launches read yet.</p>`;
      return;
    }
    rows.filter((r) => !seen.has(r.token)).reverse().forEach((r) => { seen.add(r.token); queue.push(r); });
    // refresh verdicts on cards already filed: a launch can turn from cleared to held (and back)
    rows.forEach((r) => { const c = cards.querySelector(`[data-card="${r.token}"]`); if (c && c.classList.contains("ok") !== r.pass) c.outerHTML = cardHtml(r); });
  } catch {}
}
pull(); setInterval(() => !document.hidden && pull(), 12000);
