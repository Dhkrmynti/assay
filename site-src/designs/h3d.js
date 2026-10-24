
// ---------- the field: a calm 3D landscape of lines, one per launch. Noise stays flat and faint; signal rises in the cold accent ----------
import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
(() => {
  const cv = document.getElementById("field"); if (!cv) return;
  let renderer; try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch { cv.remove(); return; }
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches, inScope = !!cv.closest(".scope");
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const field = new THREE.Group(); scene.add(field);
  const L = 44, P = 180, W = 16, D = 13;
  const light = cv.dataset.theme === "light";
  const SIG = new THREE.Color(light ? "#161514" : "#F5F3EC"), NOISE = new THREE.Color(light ? "#6B675F" : "#A39E94"), INT = new THREE.Color(light ? "#B5432E" : "#D9826E");
  // each line: its data (signal strength, seed) and the geometry it drives
  const lines = [];
  for (let j = 0; j < L; j++) {
    // fat lines (Line2): WebGL draws plain lines 1px wide, these take a width in pixels
    const pos = new Float32Array(P * 3);
    for (let i = 0; i < P; i++) pos[i * 3] = (i / (P - 1) - 0.5) * W;
    const g = new LineGeometry(); g.setPositions(pos);
    const m = new LineMaterial({ color: NOISE.clone(), transparent: true, opacity: 0.12, linewidth: 1 });
    const line = new Line2(g, m); line.position.z = (j / (L - 1) - 0.5) * D; field.add(line);
    lines.push({ line, g, m, pos, seg: g.attributes.instanceStart.data, seed: Math.random() * 100, amp: 0, ampTo: 0.08, peak: 0.55 + Math.random() * 0.3, kind: "noise" });
  }
  window.field = {
    set(rows) {
      // newest launches sit closest to the viewer
      lines.forEach((o, j) => {
        const r = rows[L - 1 - j];
        o.kind = !r ? "noise" : r.pass ? "sig" : r.devRugged ? "int" : "noise";
        o.ampTo = o.kind === "sig" ? 1 : o.kind === "int" ? 0.28 : 0.1;
        if (r) o.seed = parseInt(r.token.slice(2, 8), 16) % 1000 / 10;
      });
      if (still) frame(0);
    },
  };
  const look = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  addEventListener("pointermove", (e) => { look.x = e.clientX / innerWidth - 0.5; look.y = e.clientY / innerHeight - 0.5; }, { passive: true });
  function size() { const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); lines.forEach((o) => o.m.resolution.set(w, h)); cam.aspect = w / h; cam.updateProjectionMatrix(); const narrow = w < 800; if (inScope) { cam.position.set(0, 8.2, 17); cam.lookAt(0, -0.4, 0.6); field.position.x = 0; return; } cam.position.set(narrow ? 0 : -2.2, 5.2, 13.5); cam.lookAt(narrow ? 0 : -2.2, 0, 0); field.position.x = narrow ? 0 : 3.6; }
  new ResizeObserver(size).observe(cv); size();
  let visible = true; new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(cv);
  const clock = new THREE.Clock();
  function frame(dt) {
    const t = clock.elapsedTime;
    cur.x += (look.x - cur.x) * 0.03; cur.y += (look.y - cur.y) * 0.03;
    field.rotation.y = -0.18 + cur.x * 0.12; field.rotation.x = cur.y * 0.05;
    for (const o of lines) {
      o.amp += (o.ampTo - o.amp) * Math.min(1, dt * 1.5 || 1);
      const a = o.pos, col = o.kind === "sig" ? SIG : o.kind === "int" ? INT : NOISE;
      o.m.color.lerp(col, 0.05); o.m.opacity += ((o.kind === "sig" ? 1 : o.kind === "int" ? 0.55 : inScope ? 0.3 : light ? 0.34 : 0.16) - o.m.opacity) * 0.05;
      for (let i = 0; i < P; i++) {
        const u = i / (P - 1);
        const base = Math.sin(u * 9 + t * 0.35 + o.seed) * 0.05 + Math.sin(u * 23 - t * 0.6 + o.seed * 2) * 0.03;
        const bump = Math.exp(-Math.pow((u - o.peak) * 7, 2)) * (Math.sin(u * 60 - t * 1.4) * 0.35 + 0.65);
        a[i * 3 + 1] = base * (1 + o.amp) + bump * o.amp * (inScope || light ? 2.2 : 1.5) + (o.kind === "int" ? Math.sin(u * 140 + t * 3 + o.seed) * 0.06 : 0);
      }
      // copy the points into the line's segment buffer: [start xyz, end xyz] per segment
      const sa = o.seg.array;
      for (let i = 0; i < P - 1; i++) { sa.set(a.subarray(i * 3, i * 3 + 6), i * 6); }
      o.seg.needsUpdate = true;
      o.m.linewidth += ((o.kind === "sig" ? 4 : o.kind === "int" ? 1.8 : 1.15) - o.m.linewidth) * 0.08;
    }
    renderer.render(scene, cam);
  }
  if (still) { frame(0); return; }
  renderer.setAnimationLoop(() => { const dt = Math.min(0.05, clock.getDelta()); if (visible && !document.hidden) frame(dt); });
})();
