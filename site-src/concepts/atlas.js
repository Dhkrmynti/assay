TITLE = "Atlas"; BG = "#F5F3EC"; FG = "#161514"
HERO = """<div class="copy" style="left:6vw;bottom:13vh"><p class="kick">Signal Agent · The Atlas</p><h1>Map the noise.<br><em>Mark the signal.</em></h1>
<p class="lead">Every launch is a new star on the map of Pons. Signal Agent charts them all and only names the ones that truly shine.</p>
<div class="ask"><input placeholder="Ask Signal, or paste a token CA"><a href="/">Open →</a></div></div>
<div class="legend"><span>Drag to turn the globe</span><span><b>Named</b> = signal</span></div><div id="labels"></div>"""
CSS = """#labels{position:fixed;inset:0;z-index:0;pointer-events:none}
.lb{position:absolute;transform:translate(10px,-50%);font:500 12px var(--mono);letter-spacing:.04em;white-space:nowrap;transition:opacity .3s}
.lb.sig{font:600 13px var(--sans);letter-spacing:-.01em}.lb.sig::before{content:"";position:absolute;left:-14px;top:50%;width:10px;height:1px;background:currentColor}
.lb.no{opacity:.45}.lb.hot{font-size:16px}"""
LINE = "rgba(22,21,20,.12)"; LINE2 = "rgba(22,21,20,.24)"; HOVER = "rgba(22,21,20,.04)"; INT = "#B5432E"
VOCAB = dict(sig="Named", noise="Dust", int="Fallen", navband="The map", bandkick="Newest on the map", band="The newest <em>stars.</em>",
  how="Map the noise. <em>Name the signal.</em>", steps=[("Chart", "Every Pons launch appears on the map the block it happens."), ("Measure", "Dev sells, bundles, fake X, slow buyers: every star is measured."), ("Name", "Only the ones that truly shine get a name, with every reason.")],
  tools="Seven instruments <em>for the map.</em>", ask="Not sure where to start? Ask the map.", token="Own a piece <em>of the map.</em>", bigword="the map.")
# ---- js ----
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
const cv = document.getElementById("c"), renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.setClearColor(0xf5f3ec);
const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(34, 1, 0.1, 100); cam.position.set(0, 1.2, 9.5);
const globe = new THREE.Group(); scene.add(globe);
const R = 2.25;
// dust: every other launch of the day, a faint point on the sphere
const N = 2600, p = new Float32Array(N * 3);
for (let i = 0; i < N; i++) { const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), a = i * 2.399963; p.set([Math.cos(a) * r * R, y * R, Math.sin(a) * r * R], i * 3); }
const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.BufferAttribute(p, 3));
globe.add(new THREE.Points(dg, new THREE.PointsMaterial({ color: 0x161514, size: 0.026, transparent: true, opacity: 0.5 })));
// meridians and the equator, like an atlas
const lm = new THREE.LineBasicMaterial({ color: 0x161514, transparent: true, opacity: 0.12 });
for (let k = 0; k < 6; k++) { const c = new THREE.EllipseCurve(0, 0, R, R).getPoints(160).map((q) => new THREE.Vector3(q.x, q.y, 0)); const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(c), lm); l.rotation.y = (k / 6) * Math.PI; globe.add(l); }
{ const c = new THREE.EllipseCurve(0, 0, R, R).getPoints(160).map((q) => new THREE.Vector3(q.x, 0, q.y)); globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(c), new THREE.LineBasicMaterial({ color: 0x161514, transparent: true, opacity: 0.3 }))); }
// stars: the newest launches, placed by their address; signal ones are bright and named
const stars = [], box = document.getElementById("labels");
function place(rows) {
  stars.forEach((s) => { globe.remove(s.m); s.el.remove(); }); stars.length = 0;
  const list = rows.length >= 8 ? rows : [...rows, ...DEMO.slice(0, 14 - rows.length).map((s, i) => ({ symbol: s, token: "0x" + ((i + 7) * 2654435761 >>> 0).toString(16).padStart(8, "0"), pass: i % 5 === 1 }))]; const _x = DEMO.slice(0, 10).map((s, i) => ({ symbol: s, token: "0x" + (i * 2654435761 >>> 0).toString(16).padStart(8, "0"), pass: i % 4 === 0 }));
  list.forEach((r) => {
    const h = parseInt(r.token.slice(2, 10), 16), u = (h % 1000) / 1000, v = ((h >>> 10) % 1000) / 1000;
    const th = u * Math.PI * 2, ph = Math.acos(2 * v - 1) * 0.8 + 0.3, pos = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)).multiplyScalar(R * 1.01);
    const m = new THREE.Mesh(new THREE.SphereGeometry(r.pass ? 0.075 : 0.035, 16, 16), new THREE.MeshBasicMaterial({ color: r.pass ? 0x161514 : 0x8a857b }));
    m.position.copy(pos); globe.add(m);
    const el = document.createElement("div"); el.className = "lb " + (r.pass ? "sig" : "no"); el.textContent = (r.pass ? "$" : "") + r.symbol + (r.pass ? "  · signal" : ""); box.appendChild(el);
    stars.push({ m, el, r });
  });
}
place([]); launches().then((rows) => rows.length && place(rows));
const ctl = new OrbitControls(cam, cv); ctl.enableZoom = false; ctl.enablePan = false; ctl.autoRotate = true; ctl.autoRotateSpeed = 0.6; ctl.enableDamping = true;
function size() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); globe.position.x = w < 800 ? 0 : 2.5; ctl.target.set(globe.position.x * 0.55, 0, 0); }
addEventListener("resize", size); size();
const v = new THREE.Vector3(), n = new THREE.Vector3(), toCam = new THREE.Vector3();
renderer.setAnimationLoop(() => {
  ctl.autoRotateSpeed += (spin - ctl.autoRotateSpeed) * 0.05; { const d = cam.position.distanceTo(ctl.target); cam.position.sub(ctl.target).multiplyScalar(1 + ((dist - d) / d) * 0.05).add(ctl.target); }
  ctl.update();
  stars.forEach((s) => {
    s.m.getWorldPosition(v); n.copy(v).sub(globe.position).normalize(); toCam.copy(cam.position).sub(v).normalize();
    const front = n.dot(toCam) > 0.05; v.project(cam);
    s.el.style.left = (v.x * 0.5 + 0.5) * innerWidth + "px"; s.el.style.top = (-v.y * 0.5 + 0.5) * innerHeight + "px";
    s.el.style.opacity = front ? (s.r.pass ? 1 : 0.45) : 0;
  });
  renderer.render(scene, cam);
});

// ---- scroll: the map zooms from overview to one named star ----
let dist = 9.6, spin = 0.6;
window.S3D = {
  section(n) { if (n === "hero") { dist = 9.6; spin = 0.6; } },
  step(i) { dist = [12.5, 8.4, 6.2][i]; spin = [2.2, 0.4, 0.05][i]; stars.forEach((s) => s.el.classList.toggle("hot", i === 2 && s.r.pass)); },
};
