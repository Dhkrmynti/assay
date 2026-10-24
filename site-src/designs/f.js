
// ---------- dossier: redactions lift, verdicts get stamped ----------
const rdo = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { const els = [...e.target.querySelectorAll("[data-rd]")]; els.forEach((r, i) => setTimeout(() => r.classList.add("open"), 500 + i * 450)); rdo.unobserve(e.target); } }), { threshold: 0.5 });
document.querySelectorAll(".hero h1, .memo").forEach((b) => (REDUCE ? b.querySelectorAll("[data-rd]").forEach((r) => r.classList.add("open")) : rdo.observe(b)));
let lastStamp = "";
const _paintWork = paintWork;
paintWork = function () {
  _paintWork();
  const v = el("termVerdict"), t = v.textContent, word = /^Reading/.test(t) ? "Reading" : /^Held/.test(t) ? "Held" : /^Picked/.test(t) ? "Picked" : "Cleared";
  v.title = t; v.textContent = word;
  v.className = "stamp " + (word === "Reading" ? "idle" : word === "Held" ? "" : "ok");
  if (word !== lastStamp && word !== "Reading") { void v.offsetWidth; v.classList.add("hit"); }
  lastStamp = word;
};
paintWork();
const _paintGallery = paintGallery;
paintGallery = function () {
  _paintGallery();
  document.querySelectorAll("#gal .case .q").forEach((q, i) => { q.textContent = q.textContent.replace(/^What about (\$\S+)\?$/, `File ${String(i + 1).padStart(2, "0")} · $1`); });
};
