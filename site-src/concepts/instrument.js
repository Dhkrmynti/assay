TITLE = "Instrument"; BG = "#F5F3EC"; FG = "#161514"
HERO = """<div class="copy" style="left:6vw;top:22vh"><p class="kick">Signal Agent · The Instrument</p><h1>Measured,<br><em>not guessed.</em></h1>
<p class="lead">Signal Agent is a precision instrument. Every launch moves the needle; only a real signal leaves a mark worth reading.</p>
<div class="ask"><input placeholder="Ask Signal, or paste a token CA"><a href="/">Open →</a></div></div>
<div class="legend"><span>Small tremor = noise</span><span><b>Big swing</b> = signal</span></div>"""
CSS = ""
LINE = "rgba(22,21,20,.12)"; LINE2 = "rgba(22,21,20,.24)"; HOVER = "rgba(22,21,20,.04)"; INT = "#B5432E"
VOCAB = dict(sig="Mark", noise="Tremor", int="Spike", navband="Readings", bandkick="Today's readings", band="What moved <em>the needle.</em>",
  how="Measured, <em>not guessed.</em>", steps=[("Sense", "Every Pons launch moves the needle the block it happens."), ("Measure", "Dev sells, bundles, fake X, slow buyers: every tremor is weighed."), ("Record", "Only a real signal leaves a mark, with every reason.")],
  tools="Seven <em>gauges.</em>", ask="Not sure where to start? Ask the instrument.", token="Calibrate <em>with the token.</em>", bigword="the mark.")
# ---- js ----
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
const cv = document.getElementById("c"), renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.setClearColor(0xf5f3ec); renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const rig = new THREE.Group(); scene.add(rig);
// the paper on the drum: a live chart the pen writes into
const PW = 2048, PH = 512, pc = document.createElement("canvas"); pc.width = PW; pc.height = PH; const px = pc.getContext("2d");
function paperBase() {
  px.fillStyle = "#FBF9F3"; px.fillRect(0, 0, PW, PH);
  for (let x = 0; x < PW; x += 32) { px.fillStyle = x % 160 ? "rgba(22,21,20,.06)" : "rgba(22,21,20,.14)"; px.fillRect(x, 0, 1, PH); }
  for (let y = 0; y < PH; y += 32) { px.fillStyle = y % 128 ? "rgba(22,21,20,.06)" : "rgba(22,21,20,.14)"; px.fillRect(0, y, PW, 1); }
}
paperBase();
const paper = new THREE.CanvasTexture(pc); paper.colorSpace = THREE.SRGBColorSpace; paper.anisotropy = 8;
const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 4.6, 128, 1, true), new THREE.MeshStandardMaterial({ map: paper, roughness: 0.85, side: THREE.DoubleSide }));
drum.rotation.z = Math.PI / 2; rig.add(drum);
const metal = new THREE.MeshStandardMaterial({ color: 0x1d1c1a, roughness: 0.35, metalness: 0.8 });
for (const s of [-1, 1]) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.32, 0.12, 96), metal); cap.rotation.z = Math.PI / 2; cap.position.x = s * 2.36; rig.add(cap);
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.9, 0.5), metal); leg.position.set(s * 2.36, -1.2, 0); rig.add(leg); }
const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 5.4, 24), metal); axle.rotation.z = Math.PI / 2; rig.add(axle);
// the arm and pen, resting on the front of the drum
const arm = new THREE.Group(); arm.position.set(0, 0.2, 2.9); rig.add(arm);
const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.7), metal); bar.position.z = -0.85; arm.add(bar);
const pen = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 24), new THREE.MeshStandardMaterial({ color: 0x161514, roughness: 0.3 })); pen.rotation.x = -Math.PI / 2; pen.position.z = -1.72; arm.add(pen);
const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 32), metal); pivot.rotation.x = Math.PI / 2; arm.add(pivot);
const base = new THREE.Mesh(new THREE.BoxGeometry(6, 0.1, 4.6), new THREE.MeshStandardMaterial({ color: 0xece8dd, roughness: 0.9 })); base.position.y = -2.18; base.position.z = 0.8; rig.add(base);
scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c4, 0.6)); const sun = new THREE.DirectionalLight(0xffffff, 1.2); sun.position.set(-3, 6, 5); scene.add(sun);

// what moves the needle: noise all the time, a big swing for every signal
let queue = [], swing = 0, swingSig = false, lastX = -1, lastY = PH / 2;
launches().then((rows) => { queue = rows.length ? rows : DEMO.slice(0, 8).map((s, i) => ({ symbol: s, pass: i % 3 === 0 })); });
setInterval(() => { if (mode === 0) return; if (mode === 2) { swing = 1; swingSig = true; return; } const r = queue.shift(); if (!r) return; queue.push(r); swing = 1; swingSig = !!r.pass; }, 2600);
const ptr = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
addEventListener("pointermove", (e) => { ptr.x = e.clientX / innerWidth - 0.5; ptr.y = e.clientY / innerHeight - 0.5; }, { passive: true });
function size() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); rig.position.x = w < 800 ? 0 : 2.9; rig.position.y = w < 800 ? -1.3 : -0.2; rig.scale.setScalar(w < 800 ? 0.8 : 0.9); }
addEventListener("resize", size); size();
const clock = new THREE.Clock(), ray = new THREE.Raycaster(), tip = new THREE.Vector3(); let ang = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
  cur.x += (ptr.x - cur.x) * 0.04; cur.y += (ptr.y - cur.y) * 0.04;
  cam.position.set(rig.position.x * 0.45 + cur.x * 1.5, 2.6 - cur.y * 1.2, 11.5); cam.lookAt(rig.position.x * 0.62, rig.position.y, 0.4);
  ang += dt * 0.35; drum.rotation.x = ang;
  swing = Math.max(0, swing - dt * 0.9);
  const tremor = Math.sin(t * 37) * 0.04 + Math.sin(t * 13.3) * 0.05 + (Math.random() - 0.5) * 0.05;
  const big = swingSig ? Math.sin((1 - swing) * Math.PI * 3) * swing * 0.85 : Math.sin((1 - swing) * Math.PI * 6) * swing * 0.18;
  const off = tremor + big; arm.rotation.y = 0; arm.position.y = 0.2; pen.position.x = off * 1.6; bar.position.x = off * 0.8;
  // write onto the paper where the drum faces the pen
  // find the spot of paper under the pen tip
  rig.updateMatrixWorld(); pen.getWorldPosition(tip); ray.set(tip.add(new THREE.Vector3(0, 0, 0.6)), new THREE.Vector3(0, 0, -1)); const hit = ray.intersectObject(drum)[0];
  if (!hit) { renderer.render(scene, cam); return; }
  const X = hit.uv.x * PW, Y = (1 - hit.uv.y) * PH;
  if (lastX >= 0 && Math.abs(X - lastX) < 60) { px.strokeStyle = swingSig && swing > 0.05 ? "#161514" : "rgba(22,21,20,.55)"; px.lineWidth = swingSig && swing > 0.05 ? 3.2 : 1.4; px.beginPath(); px.moveTo(lastX, lastY); px.lineTo(X, Y); px.stroke(); }
  // clear a strip ahead of the pen so the chart keeps writing over fresh paper
  px.save(); px.beginPath(); px.rect(X - 260, 0, 60, PH); px.rect(X + 200, 0, 60, PH); px.clip(); paperBase(); px.restore();
  lastX = X; lastY = Y; paper.needsUpdate = true;
  renderer.render(scene, cam);
});

// ---- scroll: tremor, then a reading, then the mark ----
let mode = -1;
window.S3D = {
  section(n) { if (n !== "how") mode = -1; },
  step(i) { if (i === mode) return; mode = i; if (i === 1) { swing = 1; swingSig = false; } if (i === 2) { swing = 1; swingSig = true; } },
};
