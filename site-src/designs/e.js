// ---------- Ocula as an agent you talk to ----------
const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
const el = (id) => document.getElementById(id);
const MARK = document.querySelector(".brand svg").outerHTML;
const CA_RE = /^0x[0-9a-fA-F]{40}$/;
const shortCa = (a) => a.slice(0, 6) + "…" + a.slice(-4);
const ago = (s) => (s < 60 ? Math.max(1, Math.round(s)) + "s" : s < 3600 ? Math.round(s / 60) + "m" : Math.round(s / 3600) + "h");

// ---------- the chat ----------
const thread = el("thread"), input = el("askIn"), send = el("send"), chatLog = [];
const grow = () => { input.style.height = "auto"; input.style.height = Math.min(200, input.scrollHeight) + "px"; send.disabled = !input.value.trim(); };
input.addEventListener("input", grow);
input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); el("ask").requestSubmit(); } });
function addUser(text) { thread.insertAdjacentHTML("beforeend", `<div class="msg u"><div class="t">${hesc(text)}</div></div>`); }
function addNova() {
  thread.insertAdjacentHTML("beforeend", `<div class="msg a"><span class="av">${MARK}</span><div class="t"><span class="typing"><i></i><i></i><i></i></span></div></div>`);
  const m = thread.lastElementChild; m.scrollIntoView({ block: "nearest", behavior: REDUCE ? "auto" : "smooth" }); return m;
}
const actBtn = (a) => a.unlock ? `<button class="btn" type="button" data-unlock>${hesc(a.label)}</button>` : a.scan ? `<a class="btn ghost" href="#app" data-scan="${hesc(a.scan)}">${hesc(a.label)}</a>`
  : a.snipe ? `<a class="btn ghost" href="#app" data-open="snipe" data-snipe-ca="${hesc(a.snipe)}">${hesc(a.label)}</a>`
  : `<a class="btn ghost" href="#app" data-open="${hesc(a.tool)}">${hesc(a.label)}</a>`;
function fill(m, text, actions = [], extra = "") {
  m.querySelector(".t").textContent = text;
  if (extra) m.insertAdjacentHTML("beforeend", extra);
  if (actions.length) m.insertAdjacentHTML("beforeend", `<div class="acts">${actions.map(actBtn).join("")}</div>`);
}
async function scanFlow(ca) {
  addUser(ca); const m = addNova();
  try {
    const r = await fetch("/api/scan?ca=" + ca), j = await r.json();
    if (r.status === 402) { fill(m, j.error, [{ unlock: true, label: "Unlock with $OCULA" }]); refreshMe(); return; }
    if (!r.ok) throw new Error(j.error || "Scan failed.");
    const t = j.facts?.token || {}, flags = (j.flags || []).slice().sort((a, b) => ["high", "watch", "ok", "info"].indexOf(a.level) - ["high", "watch", "ok", "info"].indexOf(b.level)).slice(0, 4);
    const logo = String(t.logo || "").replace(/^ipfs:\/\//, "https://gateway.pinata.cloud/ipfs/");
    const card = `<div class="rep"><div class="hd">${/^https:\/\//.test(logo) ? `<img src="${hesc(logo)}" alt="" onerror="this.remove()">` : ""}<div><b>${hesc(t.name || "Token")} · $${hesc(t.symbol || "?")}</b><br><span>${shortCa(ca)}</span></div>${j.risk ? `<span class="rk ${j.risk.level}">${j.risk.score}% rug risk</span>` : ""}</div>
      <ul>${flags.map((f) => `<li class="${hesc(f.level)}"><i></i><span><b>${hesc(f.title)}</b> — ${hesc(f.detail)}</span></li>`).join("")}</ul></div>`;
    const text = j.summary || (flags[0] ? `${flags[0].title}.` : "Here is what the chain shows.");
    fill(m, text, [{ scan: ca, label: "Full report" }, { snipe: ca, label: "Snipe it" }], card); refreshMe();
    chatLog.push({ role: "user", content: "Scan " + ca }, { role: "assistant", content: `${t.symbol}: ${text}` });
  } catch (e) { fill(m, e.message || "Ocula could not read that token."); }
}
async function chatFlow(text) {
  addUser(text); chatLog.push({ role: "user", content: text }); const m = addNova();
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
document.querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => {
  if (c.dataset.ask) { input.value = c.dataset.ask; grow(); el("ask").requestSubmit(); return; }
  if (c.dataset.tool === "scan") { input.placeholder = "Paste the token CA (0x…) and press Enter"; input.focus(); return; }
  document.querySelector(`#tabs [data-t="${c.dataset.tool}"]`)?.click(); el("app").scrollIntoView({ behavior: REDUCE ? "auto" : "smooth" });
}));
// "Snipe it" fills the sniper's manual buy with the token
document.addEventListener("click", (e) => { const a = e.target.closest("[data-snipe-ca]"); if (a) setTimeout(() => { const mb = el("mbToken"); if (mb) mb.value = a.dataset.snipeCa; }, 50); });
el("backChat").addEventListener("click", (e) => { e.preventDefault(); scrollTo({ top: 0, behavior: REDUCE ? "auto" : "smooth" }); setTimeout(() => input.focus(), 500); });

// ---------- holder access ----------
const LOCK_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 10V7a5 5 0 0 1 10 0v3h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V7a3 3 0 0 0-6 0z"/></svg>';
let me = { holder: false, launched: false, trialsLeft: 3 };
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };
// a lock over every tool but the launchpad
document.querySelectorAll(".ws .tool[data-p]").forEach((t) => {
  if (t.dataset.p === "launch") return;
  const name = document.querySelector(`#tabs [data-t="${t.dataset.p}"] .tn`)?.textContent || "This tool";
  t.insertAdjacentHTML("afterbegin", `<div class="lock"><div>${LOCK_SVG}<b>${hesc(name)} is for $OCULA holders</b><p>Hold at least 0.1% of $OCULA and unlock it with your wallet. The Pons Launchpad stays free for everyone.</p><button class="btn" type="button" data-unlock style="background:#F5F3EC;color:#161514;border-color:#F5F3EC">Unlock</button></div></div>`);
});
document.querySelectorAll("#tabs button[data-t]").forEach((b) => b.dataset.t !== "launch" && b.classList.add("lockd"));
async function refreshMe() {
  try { me = await (await fetch("/api/me")).json(); } catch {}
  document.body.classList.toggle("holder", !!me.holder);
  const hb = el("holderBtn");
  hb.textContent = me.holder ? (me.owner ? "Owner access" : "Holder · " + shortCa(me.address || "0x0000000000")) : "Holder access";
  hb.classList.toggle("on", !!me.holder);
  el("hint").textContent = me.holder ? "Holder access · ask Ocula anything." : `${me.trialsLeft} free read${me.trialsLeft === 1 ? "" : "s"} left today · hold $OCULA for unlimited.`;
}
const modal = el("modal");
function openModal() {
  el("mErr").textContent = "";
  el("mText").textContent = me.launched
    ? "Hold at least 0.1% of $OCULA supply. Connect the wallet that holds it and sign a short message. Signing is free and sends nothing."
    : "Holder access opens when $OCULA launches. Until then the tools stay locked. The Pons Launchpad is free for everyone, today.";
  el("mSign").hidden = !me.launched || !window.ethereum;
  if (me.launched && !window.ethereum) el("mErr").textContent = "No browser wallet found. Open this page in MetaMask, Rabby or another wallet browser.";
  if (me.holder) { el("mText").textContent = "You're unlocked. Every Ocula tool is open in this browser for 24 hours."; el("mSign").hidden = true; }
  modal.hidden = false;
}
const closeModal = () => (modal.hidden = true);
el("holderBtn").addEventListener("click", openModal);
el("mClose").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
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
refreshMe().then(() => { if (!me.holder && !location.hash) document.querySelector('#tabs [data-t="launch"]')?.click(); });

// header button: "Buy $OCULA" once the token address is configured on the server
fetch("/api/status").then((r) => r.json()).then((j) => {
  const b = el("buyNova"); if (!j.novaToken || !b) return;
  b.textContent = "Buy $OCULA"; b.removeAttribute("aria-disabled");
  b.href = "https://ponsfamily.com/launchpad/" + j.novaToken; b.target = "_blank"; b.rel = "noopener";
}).catch(() => {});

// ---------- live data: the work panel and today's gallery ----------
let live = { rows: [], picks: new Set() }, workStep = -1;
function verdictOf(r) {
  const picked = live.picks.has(r.token.toLowerCase());
  return picked ? { tag: "picked", cls: "ok", text: "Picked for the sniper" } : r.pass ? { tag: "Cleared", cls: "ok", text: "Cleared every check" } : { tag: "Held", cls: "held", text: "Held · " + r.checks.filter((c) => !c.ok).map((c) => c.text).join(", ") };
}
function paintWork() {
  const r = live.rows[0]; if (!r) return;
  const v = verdictOf(r), dev = r.devLaunches24h;
  const lines = [
    `New launch <b>$${hesc(r.symbol)}</b> · ${ago(r.ageSec)} ago · ${shortCa(r.token)}`,
    r.devRugged ? `<em>Dev dumped: sold ${r.devSoldPct}%, holds ${r.devHoldPct}%</em>` : r.devSold ? `Dev sold ${r.devSoldPct}%, still holds ${r.devHoldPct}%` : dev ? `<em>Deployer launched ${dev} other token${dev > 1 ? "s" : ""} in 24h</em>` : `<u>Dev has not sold · first launch in 24h</u>`,
    `${r.feesToDev ? "Creator fees go to the deployer" : "<em>Creator fees go to another wallet</em>"}`,
    `Creator tax ${r.taxPct}% · ${r.socials ? `<u>${r.socials} social link${r.socials > 1 ? "s" : ""}</u>` : "<em>no socials</em>"} · curve ${r.progressPct.toFixed(1)}%`,
  ];
  el("termLines").innerHTML = lines.map((l, i) => `<div class="ln${i <= workStep || workStep < 0 && REDUCE ? " on" : ""}"><i>${i + 1}</i><span>${l}</span></div>`).join("");
  el("termVerdict").textContent = workStep >= 3 || REDUCE ? v.text : "Reading…";
  el("termAge").textContent = "block " + Number(r.block).toLocaleString("en-US");
  el("termScan").dataset.scan = r.token;
}
function setWork(s) {
  if (s === workStep) return; workStep = s;
  document.querySelectorAll("#steps li").forEach((li, i) => li.classList.toggle("on", i === s));
  paintWork();
}
function paintGallery() {
  el("gal").innerHTML = live.rows.slice(0, 6).map((r, i) => {
    const v = verdictOf(r);
    return `<a class="case${i === 0 ? " big" : ""}" href="#app" data-scan="${r.token}"><span class="q">What about $${hesc(r.symbol)}?</span>
      <div class="a"><span class="av">${MARK}</span><span><b>${hesc(v.text)}.</b> Tax ${r.taxPct}%, ${r.socials} social link${r.socials === 1 ? "" : "s"}, curve ${r.progressPct.toFixed(1)}%, launched ${ago(r.ageSec)} ago.</span></div>
      <span class="tag ${v.cls}">${hesc(v.tag)}</span></a>`;
  }).join("");
}
async function loadLive() {
  try {
    const [rd, pk] = await Promise.all([fetch("/api/radar").then((r) => r.json()), fetch("/api/picks?peek=1").then((r) => r.json()).catch(() => ({ picks: [] }))]);
    live = { rows: rd.rows || [], picks: new Set((pk.picks || []).map((p) => p.token.toLowerCase())) };
    paintWork(); paintGallery(); ScrollTrigger.refresh();
  } catch {}
}
loadLive(); setInterval(() => !document.hidden && loadLive(), 15000);

// ---------- motion: calm, like the references; one pinned moment ----------
gsap.registerPlugin(ScrollTrigger);
const mm = gsap.matchMedia();
mm.add("(prefers-reduced-motion: no-preference)", () => {
  gsap.from([".live", ".hero h1", ".box", ".chips"], { y: 18, opacity: 0, duration: 1.1, ease: "expo.out", stagger: 0.09 });
  ScrollTrigger.batch(".sh, .case, .sf, #app .ws, .term", { start: "top 88%", once: true, onEnter: (els) => gsap.fromTo(els, { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: "expo.out", stagger: 0.08, overwrite: true }) });
});
mm.add("(min-width: 901px) and (prefers-reduced-motion: no-preference)", () => {
  // the reading happens while you scroll: four steps, four lines, then the verdict
  ScrollTrigger.create({ trigger: "#workPin", start: "top top", end: "+=180%", pin: true, onUpdate: (st) => setWork(Math.min(3, Math.floor(st.progress * 4.4))) });
  const steps = [...document.querySelectorAll(".fstep")];
  gsap.to("#drawn", { strokeDashoffset: 0, ease: "none", scrollTrigger: { trigger: "#flowRow", start: "top 75%", end: "bottom 55%", scrub: 1, onUpdate: (st) => steps.forEach((s, i) => s.classList.toggle("on", st.progress >= i / (steps.length - 1) - 0.02)) } });
});
mm.add("(max-width: 900px), (prefers-reduced-motion: reduce)", () => {
  setWork(3); document.querySelectorAll(".fstep").forEach((s) => s.classList.add("on"));
});
addEventListener("load", () => ScrollTrigger.refresh());
document.fonts?.ready.then(() => ScrollTrigger.refresh());
