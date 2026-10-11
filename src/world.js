// المشهد العام: السماء، الأرض (صورة القمر الصناعي)، الإضاءة، المباني المحيطة
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { IMG_W, IMG_H, M_PER_PX, CONTEXT_BUILDINGS, px2world } from './config.js';
import { facadeTexture, roofTexture } from './textures.js';

export const SUN_DIR = new THREE.Vector3(-0.75, 0.85, 0.55).normalize();

export function createWorld(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  container.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.className = 'label-layer';
  container.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#cfdceb', 0.0011);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 4000);
  camera.position.set(0, 190, 210);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.minDistance = 8;
  controls.maxDistance = 520;
  controls.target.set(0, 0, -40);
  controls.screenSpacePanning = false;

  // السماء
  const sky = new Sky();
  sky.scale.setScalar(3500);
  const u = sky.material.uniforms;
  u.turbidity.value = 4;
  u.rayleigh.value = 1.2;
  u.mieCoefficient.value = 0.004;
  u.mieDirectionalG.value = 0.82;
  u.sunPosition.value.copy(SUN_DIR);
  scene.add(sky);

  // الإضاءة
  const hemi = new THREE.HemisphereLight('#d6e6ff', '#d3c19a', 1.7);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1d6', 3.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.35;
  scene.add(sun, sun.target);
  const setShadowFocus = (cx, cz, radius) => {
    sun.target.position.set(cx, 0, cz);
    sun.position.set(cx, 0, cz).addScaledVector(SUN_DIR, 400);
    const c = sun.shadow.camera;
    c.left = -radius;
    c.right = radius;
    c.top = radius;
    c.bottom = -radius;
    c.near = 50;
    c.far = 900;
    c.updateProjectionMatrix();
  };
  setShadowFocus(0, -40, 230);

  // الأرض
  const sand = new THREE.Mesh(
    new THREE.CircleGeometry(2400, 48),
    new THREE.MeshStandardMaterial({ color: '#d3c4a0', roughness: 1 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.y = -0.2;
  sand.receiveShadow = true;
  scene.add(sand);

  const loader = new THREE.TextureLoader();
  const campusTex = loader.load(import.meta.env.BASE_URL + 'campus.jpg');
  campusTex.colorSpace = THREE.SRGBColorSpace;
  campusTex.anisotropy = 16;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(IMG_W * M_PER_PX, IMG_H * M_PER_PX),
    new THREE.MeshStandardMaterial({ map: campusTex, roughness: 1, color: new THREE.Color(1.55, 1.5, 1.42) }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((IMG_W / 2 - 540.5) * M_PER_PX, 0, (IMG_H / 2 - 590) * M_PER_PX);
  ground.receiveShadow = true;
  scene.add(ground);

  // المباني المحيطة (للسياق فقط)
  const context = new THREE.Group();
  scene.add(context);
  CONTEXT_BUILDINGS.forEach((b) => {
    const p = px2world(b.c[0], b.c[1]);
    const rot = ((b.rot || 0) * Math.PI) / 180;
    const swap = (b.rot || 0) === 90;
    const Wm = (swap ? b.d : b.w) * M_PER_PX;
    const Dm = (swap ? b.w : b.d) * M_PER_PX;
    const fp = b.kind === 'block' ? rectFootprint(Wm, Dm) : piFootprint(Wm, Dm, 17, 15);
    const g = shell(fp, 13 * (b.kind === 'block' ? 1.3 : 1), 3);
    g.position.set(p.x, 0, p.z);
    g.rotation.y = rot;
    context.add(g);
  });

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  return { renderer, labelRenderer, scene, camera, controls, sun, hemi, setShadowFocus, context, resize, sky };
}

export function piFootprint(W, D, legW, spineD) {
  const x = W / 2;
  const z = D / 2;
  return [
    [-x, -z],
    [x, -z],
    [x, z],
    [x - legW, z],
    [x - legW, -z + spineD],
    [-x + legW, -z + spineD],
    [-x + legW, z],
    [-x, z],
  ];
}
export function rectFootprint(W, D) {
  return [
    [-W / 2, -D / 2],
    [W / 2, -D / 2],
    [W / 2, D / 2],
    [-W / 2, D / 2],
  ];
}

// قشرة مبنى بسيطة (واجهات + سطح) للمباني المحيطة
function shell(fp, H, levels) {
  const g = new THREE.Group();
  const area = fp.reduce((s, p, i) => {
    const q = fp[(i + 1) % fp.length];
    return s + (p[0] * q[1] - q[0] * p[1]);
  }, 0) / 2;
  const sgn = area > 0 ? 1 : -1;
  fp.forEach((p, i) => {
    const q = fp[(i + 1) % fp.length];
    const dx = q[0] - p[0];
    const dz = q[1] - p[1];
    const len = Math.hypot(dx, dz);
    const nx = (dz / len) * sgn;
    const nz = (-dx / len) * sgn;
    const nB = Math.max(1, Math.round(len / 4.5));
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(len, H),
      new THREE.MeshStandardMaterial({ map: facadeTexture(nB, 'normal', levels, H / levels), roughness: 0.95, color: '#d8d3c8' }),
    );
    m.position.set((p[0] + q[0]) / 2, H / 2, (p[1] + q[1]) / 2);
    m.rotation.y = Math.atan2(nx, nz);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  });
  const shape = new THREE.Shape(fp.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.4, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, H - 0.05, 0);
  const roof = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: roofTexture(), roughness: 1, color: '#bdb7aa' }));
  roof.castShadow = true;
  roof.receiveShadow = true;
  g.add(roof);
  return g;
}

/* ---------- حركة الكاميرا ---------- */
export function createTween() {
  let active = null;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  return {
    get busy() {
      return !!active;
    },
    flyTo(camera, controls, pos, target, ms = 1400, done) {
      const p0 = camera.position.clone();
      const t0 = controls.target.clone();
      const p1 = pos.clone();
      const t1 = target.clone();
      const start = performance.now();
      active = (now) => {
        const k = Math.min(1, (now - start) / ms);
        const e = ease(k);
        camera.position.lerpVectors(p0, p1, e);
        controls.target.lerpVectors(t0, t1, e);
        // رفعة خفيفة أثناء الانتقال
        camera.position.y += Math.sin(k * Math.PI) * 6;
        if (k >= 1) {
          active = null;
          done?.();
        }
      };
    },
    update(now) {
      active?.(now);
    },
    cancel() {
      active = null;
    },
  };
}
