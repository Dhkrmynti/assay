
// ---------- the Eye: Ocula in 3D. A breathing cloud of points under a lid; every launch it reads flies in as a spark ----------
import * as THREE from "three";
(() => {
  const cv = document.getElementById("eye"); if (!cv) return;
  let renderer; try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: "high-performance" }); } catch { cv.remove(); return; }
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50); cam.position.set(0, 0, 8.6);
  const eye = new THREE.Group(); scene.add(eye);
  const MINT = new THREE.Color("#8FE3C0"), CORAL = new THREE.Color("#F08A78"), PAPER = new THREE.Color("#F5F3EC");

  // point cloud on a sphere, displaced by a slow noise in the shader
  const N = 3200, pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), t = i * 2.399963;
    pos.set([Math.cos(t) * r, y, Math.sin(t) * r], i * 3); seed[i] = Math.random();
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pos, 3)); pg.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
  const U = { uT: { value: 0 }, uPulse: { value: 0 }, uTint: { value: MINT.clone() }, uPx: { value: renderer.getPixelRatio() } };
  const cloud = new THREE.Points(pg, new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uT,uPulse,uPx; attribute float seed; varying float vA; varying float vS;
      void main(){ vec3 p=position; float w=sin(p.y*4.0+uT*.9+seed*6.2)*.5+sin(p.x*3.0-uT*.7)*.5;
        p*=1.0+w*.045+uPulse*.12*(.4+seed);
        vec4 mv=modelViewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*mv;
        vA=.35+.65*smoothstep(-1.0,1.0,p.z); vS=seed;
        gl_PointSize=(2.0+seed*2.6+uPulse*2.5)*uPx*(8.0/-mv.z); }`,
    fragmentShader: `uniform vec3 uTint; uniform float uPulse; varying float vA; varying float vS;
      void main(){ vec2 c=gl_PointCoord-.5; float d=length(c); if(d>.5) discard;
        vec3 col=mix(vec3(.96,.95,.92),uTint,smoothstep(.55,1.0,vS)+uPulse*.6);
        gl_FragColor=vec4(col,pow(1.0-d*2.0,1.5)*vA); }`,
  }));
  eye.add(cloud);

  // the iris: a soft glowing core
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.34, 48, 48), new THREE.ShaderMaterial({
    uniforms: { uTint: U.uTint, uPulse: U.uPulse }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uTint; uniform float uPulse; varying vec3 vN; varying vec3 vV; void main(){ float f=pow(1.-abs(dot(vN,vV)),1.6); gl_FragColor=vec4(mix(vec3(1.),uTint,.55),.35+f*.65+uPulse*.4); }`,
  }));
  eye.add(core);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 32), new THREE.MeshBasicMaterial({ color: PAPER })); eye.add(dot);

  // the lid: the arc of the Ocula mark, floating above the eye
  const lid = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.075, 24, 160, Math.PI), new THREE.MeshBasicMaterial({ color: PAPER, transparent: true, opacity: 0.95 }));
  lid.position.y = 0.12; eye.add(lid);

  // orbit rings
  const ringMat = new THREE.LineBasicMaterial({ color: 0xf5f3ec, transparent: true, opacity: 0.12 });
  const rings = [1.75, 2.1].map((r, i) => {
    const pts = []; for (let k = 0; k <= 200; k++) { const a = (k / 200) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat); l.rotation.x = Math.PI / 2 + (i ? -0.5 : 0.35); l.rotation.y = i ? 0.4 : -0.3; scene.add(l); return l;
  });

  // sparks: each launch Ocula reads flies in from the edge and is absorbed
  const sparks = [];
  const sparkGeo = new THREE.SphereGeometry(0.045, 12, 12);
  function spark(kind) {
    const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: kind === "ok" ? MINT : kind === "no" ? CORAL : PAPER, transparent: true }));
    const a = Math.random() * Math.PI * 2, b = (Math.random() - 0.5) * 1.2;
    m.userData = { from: new THREE.Vector3(Math.cos(a) * 3.4, Math.sin(b) * 2.2, Math.sin(a) * 3.4), t: 0, kind };
    m.position.copy(m.userData.from); scene.add(m); sparks.push(m);
    const trail = new THREE.Line(new THREE.BufferGeometry().setFromPoints([m.position.clone(), m.position.clone()]), new THREE.LineBasicMaterial({ color: m.material.color, transparent: true, opacity: 0.5 }));
    scene.add(trail); m.userData.trail = trail;
  }
  let pulse = 0;
  window.eye = { ping(kind) { spark(kind); if (still) render(0); } };

  // follow the pointer, gently
  const look = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  addEventListener("pointermove", (e) => { look.x = (e.clientX / innerWidth - 0.5) * 0.9; look.y = (e.clientY / innerHeight - 0.5) * 0.6; }, { passive: true });

  function size() { const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  new ResizeObserver(size).observe(cv); size();
  let visible = true; new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(cv);
  const clock = new THREE.Clock();
  function render(dt) {
    const t = clock.elapsedTime;
    U.uT.value = t; pulse = Math.max(0, pulse - dt * 1.4); U.uPulse.value = pulse;
    cur.x += (look.x - cur.x) * 0.05; cur.y += (look.y - cur.y) * 0.05;
    eye.rotation.y = cur.x + Math.sin(t * 0.25) * 0.12; eye.rotation.x = cur.y * 0.6 + Math.sin(t * 0.31) * 0.05;
    cloud.rotation.y = t * 0.06; lid.rotation.z = Math.sin(t * 0.5) * 0.04; lid.position.y = 0.12 + Math.sin(t * 0.8) * 0.03;
    rings[0].rotation.z = t * 0.05; rings[1].rotation.z = -t * 0.035;
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i], u = s.userData; u.t += dt * 0.55; const k = Math.min(1, u.t), e = 1 - Math.pow(1 - k, 3);
      const p = u.from.clone().lerp(new THREE.Vector3(0, 0, 0), e); p.y += Math.sin(k * Math.PI) * 0.6; s.position.copy(p);
      u.trail.geometry.setFromPoints([u.from.clone().lerp(p, Math.max(0, e - 0.25)), p]); u.trail.material.opacity = 0.5 * (1 - k);
      if (k >= 1) {
        scene.remove(s, u.trail); u.trail.geometry.dispose(); s.material.dispose(); sparks.splice(i, 1);
        pulse = 1; if (u.kind) U.uTint.value.copy(u.kind === "no" ? CORAL : MINT);
      }
    }
    U.uTint.value.lerp(MINT, dt * 0.6);
    renderer.render(scene, cam);
  }
  if (still) { render(0); return; }
  renderer.setAnimationLoop(() => { const dt = Math.min(0.05, clock.getDelta()); if (visible && !document.hidden) render(dt); });
})();
