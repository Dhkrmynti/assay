TITLE = "Monolith"; BG = "#161514"; FG = "#F5F3EC"
HERO = """<div class="copy" style="left:6vw;top:50%;transform:translateY(-50%)"><p class="kick">Signal Agent · The Monolith</p><h1>One core.<br><em>Every launch.</em></h1>
<p class="lead">Every launch on Pons flows into one core that never sleeps. What holds up leaves as a single clean beam of light.</p>
<div class="ask"><input placeholder="Ask Signal, or paste a token CA"><a href="/">Open →</a></div></div>
<div class="legend"><span>Particles = launches flowing in</span><span><b>Beam</b> = a signal leaves</span></div>"""
CSS = ""
LINE = "rgba(245,243,236,.12)"; LINE2 = "rgba(245,243,236,.26)"; HOVER = "rgba(245,243,236,.05)"; INT = "#D9826E"
VOCAB = dict(sig="Signal", noise="Absorbed", int="Rejected", navband="Received", bandkick="Received by the core", band="What the core <em>received.</em>",
  how="In as noise. <em>Out as signal.</em>", steps=[("Intake", "Every Pons launch flows into the core the block it happens."), ("Process", "Dev sells, bundles, fake X, slow buyers: the core weighs every one."), ("Emit", "What holds up leaves as one clean beam, with every reason.")],
  tools="One core. <em>Seven tools.</em>", ask="Not sure where to start? Ask the core.", token="Power <em>the core.</em>", bigword="one core.")
# ---- js ----
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
const cv = document.getElementById("c"), renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.setClearColor(0x161514); renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.fog = new THREE.Fog(0x161514, 9, 22);

// the core: a matte black slab with hairlines of light running up its face
const lc = document.createElement("canvas"); lc.width = 64; lc.height = 512; const lx = lc.getContext("2d");
lx.fillStyle = "#000"; lx.fillRect(0, 0, 64, 512); for (let y = 0; y < 512; y += 16) { lx.fillStyle = `rgba(245,243,236,${y % 128 ? 0.18 : 0.6})`; lx.fillRect(0, y, 64, y % 128 ? 1 : 2); }
const lines = new THREE.CanvasTexture(lc); lines.wrapT = THREE.RepeatWrapping; lines.repeat.set(1, 1.5);
const core = new THREE.Mesh(new RoundedBoxGeometry(1.5, 3.5, 0.55, 8, 0.1), new THREE.MeshPhysicalMaterial({ color: 0x1d1c1a, roughness: 0.32, metalness: 0.15, clearcoat: 0.7, clearcoatRoughness: 0.25, emissive: 0xf5f3ec, emissiveIntensity: 0.6, emissiveMap: lines }));
core.position.set(1.6, 0.1, 0); scene.add(core);
const key = new THREE.DirectionalLight(0xfff6ea, 1.4); key.position.set(-4, 5, 6); scene.add(key);
// floor: a faint reflection line
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x161514, roughness: 0.6, metalness: 0.4 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = -1.9; scene.add(floor);

// launches flowing in as particles
const N = 900, pos = new Float32Array(N * 3), life = new Float32Array(N);
const reset = (i) => { const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 6; pos.set([1.6 + Math.cos(a) * r, -1.5 + Math.random() * 4.5, Math.sin(a) * r], i * 3); life[i] = Math.random(); };
for (let i = 0; i < N; i++) reset(i);
const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
scene.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xf5f3ec, size: 0.035, transparent: true, opacity: 0.55, depthWrite: false })));

// the beam: a signal leaving the top of the core
// a soft vertical shaft of light, brightest at the core and fading upward
const bc = document.createElement("canvas"); bc.width = 64; bc.height = 512; const bx = bc.getContext("2d");
const gx = bx.createLinearGradient(0, 0, 64, 0); gx.addColorStop(0, "rgba(255,255,255,0)"); gx.addColorStop(0.5, "rgba(255,255,255,1)"); gx.addColorStop(1, "rgba(255,255,255,0)");
bx.fillStyle = gx; bx.fillRect(0, 0, 64, 512); bx.globalCompositeOperation = "destination-in"; const gy = bx.createLinearGradient(0, 0, 0, 512); gy.addColorStop(0, "rgba(0,0,0,0)"); gy.addColorStop(1, "rgba(0,0,0,1)"); bx.fillStyle = gy; bx.fillRect(0, 0, 64, 512);
const beam = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 14), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bc), color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
beam.position.set(1.6, 8.9, 0); beam.visible = false; scene.add(beam);
const glow = new THREE.Mesh(new THREE.SphereGeometry(0.07, 24, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, toneMapped: false })); glow.position.set(1.6, 1.95, 0); scene.add(glow);
let beamT = -1; const fire = () => (beamT = 0);
launches().then((rows) => { if (rows.some((r) => r.pass)) fire(); }); setInterval(fire, 7000); setTimeout(fire, 1500);

const ptr = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
addEventListener("pointermove", (e) => { ptr.x = e.clientX / innerWidth - 0.5; ptr.y = e.clientY / innerHeight - 0.5; }, { passive: true });
function size() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); core.position.x = beam.position.x = glow.position.x = w < 800 ? 0 : 1.6; }
addEventListener("resize", size); size();
const clock = new THREE.Clock(), tmp = new THREE.Vector3();
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
  cur.x += (ptr.x - cur.x) * 0.04; cur.y += (ptr.y - cur.y) * 0.04;
  cam.position.set(Math.sin(t * 0.08) * 1.5 + cur.x * 2, 0.9 - cur.y * 1.2, cam.position.z + (camZ - cam.position.z) * 0.05); cam.lookAt(innerWidth < 800 ? 0 : 0.9, 0.2, 0);
  core.rotation.y += ((Math.sin(t * 0.2) * 0.35 + cur.x * 0.3 + spinTo) - core.rotation.y) * 0.05;
  lines.offset.y -= dt * 0.06 * flow * 1.5;
  for (let i = 0; i < N; i++) {
    tmp.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); const to = new THREE.Vector3(core.position.x, core.position.y, 0).sub(tmp);
    const d = to.length(); if (d < 0.45) { reset(i); continue; }
    tmp.addScaledVector(to.normalize(), dt * flow * (0.4 + 2.2 / d)); pos.set([tmp.x, tmp.y, tmp.z], i * 3);
  }
  pg.attributes.position.needsUpdate = true;
  if (beamT >= 0) { beamT += dt; const k = beamT < 0.25 ? beamT / 0.25 : Math.max(0, 1 - (beamT - 0.25) / 1.6); beam.visible = k > 0.01; beam.material.opacity = k * 0.9; glow.material.opacity = k; beam.scale.x = 0.6 + k * 1.2; beam.lookAt(cam.position.x, beam.position.y, cam.position.z); core.material.emissiveIntensity = 0.6 + k * 1.4; if (beamT > 2) beamT = -1; }
  renderer.render(scene, cam);
});

// ---- scroll: the core works through its three stages ----
let flow = 1, spinTo = 0, camZ = 13, autoBeam = false;
window.S3D = {
  data(rows) { if (rows.some((r) => r.pass)) fire(); },
  scroll(p) { camZ = 13 - p * 2.5; },
  section(n) { if (n !== "how") { flow = 1; spinTo = 0; autoBeam = false; } },
  step(i) { flow = [3, 1.2, 0.6][i]; spinTo = [0, Math.PI * 0.5, 0][i]; if (i === 2 && !autoBeam) { autoBeam = true; fire(); } if (i !== 2) autoBeam = false; },
};
setInterval(() => autoBeam && fire(), 2200);
