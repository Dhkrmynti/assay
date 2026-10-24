TITLE = "Lens"; BG = "#F5F3EC"; FG = "#161514"
BODY = """<div class="copy" style="left:6vw;bottom:13vh"><p class="kick">Signal Agent · The Lens</p><h1>Everything is blurry.<br><em>Until it isn't.</em></h1>
<p class="lead">Every Pons launch looks the same at first. Signal Agent is the lens: what holds up comes into focus, the rest stays a blur.</p>
<div class="ask"><input placeholder="Ask Signal, or paste a token CA"><a href="/">Open →</a></div></div>
<div class="legend"><span>Move your cursor: the lens follows</span><span><b>Sharp</b> = in focus</span></div>"""
CSS = ".copy::before{content:\"\";position:absolute;inset:-40px -80px -40px -60px;background:radial-gradient(closest-side,rgba(245,243,236,.85),rgba(245,243,236,0));z-index:-1}"
# ---- js ----
import * as THREE from "three";
const cv = document.getElementById("c"), renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.setClearColor(0xf5f3ec);
const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(35, 1, 0.1, 100); cam.position.z = 8;

// the wall of launches, drawn twice: once sharp (seen through the lens), once blurred (everything else)
const TW = 2048, TH = 1024;
function wall(rows, blur) {
  const c = document.createElement("canvas"); c.width = TW; c.height = TH; const x = c.getContext("2d");
  x.fillStyle = "#F5F3EC"; x.fillRect(0, 0, TW, TH);
  if (blur) x.filter = "blur(9px)";
  const names = rows.length ? rows : DEMO.map((s, i) => ({ symbol: s, pass: i % 7 === 0 }));
  const R = 9, rh = TH / R;
  for (let r = 0; r < R; r++) {
    let px = -((r * 173) % 400);
    x.font = `${r % 2 ? 500 : 600} ${rh * 0.5}px "Inter Tight", system-ui, sans-serif`; x.textBaseline = "middle";
    for (let k = 0; px < TW; k++) {
      const t = names[(r * 5 + k) % names.length], label = "$" + t.symbol;
      x.fillStyle = blur ? "rgba(22,21,20,.32)" : t.pass ? "#161514" : "rgba(22,21,20,.55)";
      x.fillText(label, px, rh * (r + 0.5));
      if (!blur && t.pass) { const w = x.measureText(label).width; x.font = `500 ${rh * 0.16}px "JetBrains Mono", monospace`; x.fillText("IN FOCUS", px + w + 12, rh * (r + 0.32)); x.font = `${r % 2 ? 500 : 600} ${rh * 0.5}px "Inter Tight", system-ui, sans-serif`; }
      px += x.measureText(label).width + rh * 0.9;
    }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
const U = { uSharp: { value: null }, uBlur: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uT: { value: 0 }, uC: { value: new THREE.Vector2(0.6, 0.5) } };
const MAP = `uniform vec2 uRes; uniform float uT; vec2 wallUv(vec2 s){ float a=(uRes.x/uRes.y)/2.0; return vec2(s.x*a + uT*0.012, s.y); }`;
// full-screen blurred wall
const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: U, depthWrite: false,
  vertexShader: `varying vec2 vS; void main(){ vS=position.xy*.5+.5; gl_Position=vec4(position.xy,.999,1.); }`,
  fragmentShader: `uniform sampler2D uBlur; varying vec2 vS; ${MAP} void main(){ gl_FragColor=texture2D(uBlur,wallUv(vS)); }` }));
bg.frustumCulled = false; scene.add(bg);
// the lens: a biconvex disc that samples the sharp wall, magnified and bent at the edges
const lens = new THREE.Group(); scene.add(lens);
const glass = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), new THREE.ShaderMaterial({ uniforms: U,
  vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `uniform sampler2D uSharp; uniform vec2 uC; varying vec3 vN; varying vec3 vV; ${MAP}
    void main(){ vec2 s=gl_FragCoord.xy/uRes; float fr=pow(1.-abs(dot(vN,vV)),2.2);
      vec2 m=uC+(s-uC)*.82+vN.xy*.035*fr;                                  // magnify, bend at the rim
      vec3 col=vec3(texture2D(uSharp,wallUv(m+vec2(.0015,0))).r, texture2D(uSharp,wallUv(m)).g, texture2D(uSharp,wallUv(m-vec2(.0015,0))).b);
      float spec=pow(max(dot(reflect(-vV,vN),normalize(vec3(-.4,.6,1.))),0.),40.);
      col=mix(col,vec3(1.),fr*.35+spec*.55); col=mix(col,vec3(.09,.08,.08),smoothstep(.75,1.,fr)*.5);
      gl_FragColor=vec4(col,1.); }` }));
glass.scale.set(1.55, 1.55, 0.34); lens.add(glass);
const ring = new THREE.Mesh(new THREE.TorusGeometry(1.56, 0.035, 24, 160), new THREE.MeshBasicMaterial({ color: 0x161514 })); lens.add(ring);
const ticks = new THREE.Group(); for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2, l = i % 5 ? 0.06 : 0.14; const m = new THREE.Mesh(new THREE.BoxGeometry(0.012, l, 0.01), new THREE.MeshBasicMaterial({ color: 0x161514 })); m.position.set(Math.cos(a) * 1.7, Math.sin(a) * 1.7, 0); m.rotation.z = a - Math.PI / 2; ticks.add(m); } lens.add(ticks);

const ptr = { x: 0.25, y: 0.1 }, cur = { x: 0.25, y: 0.1 };
addEventListener("pointermove", (e) => { ptr.x = (e.clientX / innerWidth) * 2 - 1; ptr.y = -(e.clientY / innerHeight) * 2 + 1; }, { passive: true });
function size() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); U.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio()); }
addEventListener("resize", size); size();
launches().then((rows) => { U.uSharp.value = wall(rows, false); U.uBlur.value = wall(rows, true); });
U.uSharp.value = wall([], false); U.uBlur.value = wall([], true);
const clock = new THREE.Clock(), v = new THREE.Vector3();
renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime(); U.uT.value = t;
  cur.x += (Math.max(-0.2, ptr.x) - cur.x) * 0.06; cur.y += (ptr.y - cur.y) * 0.06;
  const vh = Math.tan((cam.fov * Math.PI) / 360) * cam.position.z, vw = vh * cam.aspect;
  lens.position.set(cur.x * vw * 0.7 + vw * 0.12, cur.y * vh * 0.55, 0);
  lens.rotation.set(Math.sin(t * 0.5) * 0.12 - cur.y * 0.25, Math.cos(t * 0.4) * 0.14 + cur.x * 0.3, 0);
  ticks.rotation.z = t * 0.05;
  v.copy(lens.position).project(cam); U.uC.value.set(v.x * 0.5 + 0.5, v.y * 0.5 + 0.5);
  renderer.render(scene, cam);
});
