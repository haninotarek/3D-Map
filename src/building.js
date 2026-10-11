// مجسم المبنى: واجهة خارجية + أدوار داخلية قابلة للكشف (cutaway)
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { BLD, BLD_H, FLOOR_NAMES } from './config.js';
import { TYPES, stairGeometry } from './layout.js';
import { facadeTexture, marbleTexture, roofTexture } from './textures.js';

const { FLOOR_H, SLAB, LEVELS, CORR } = BLD;
const WALL_H = FLOOR_H - SLAB;
const BAY = 4.5;

// بصمة المبنى (شكل π) — إحداثيات محلية (x, z)
export const FOOTPRINT = [
  [-27, -30],
  [27, -30],
  [27, 30],
  [7, 30],
  [7, -13],
  [-7, -13],
  [-7, 30],
  [-27, 30],
];
const ENTRANCE_EDGE = 4; // الضلع (7,-13) → (-7,-13)

const signedArea = (pts) => pts.reduce((s, p, i) => {
  const q = pts[(i + 1) % pts.length];
  return s + (p[0] * q[1] - q[0] * p[1]);
}, 0) / 2;

function edgesOf(fp) {
  const area = signedArea(fp);
  return fp.map((p, i) => {
    const q = fp[(i + 1) % fp.length];
    const dx = q[0] - p[0];
    const dz = q[1] - p[1];
    const len = Math.hypot(dx, dz);
    // الاتجاه الخارجي حسب اتجاه الرسم
    const s = area > 0 ? 1 : -1;
    const nx = (dz / len) * s;
    const nz = (-dx / len) * s;
    return { p, q, len, nx, nz, mx: (p[0] + q[0]) / 2, mz: (p[1] + q[1]) / 2, i };
  });
}

function shapeFrom(fp, holes = []) {
  const sh = new THREE.Shape(fp.map(([x, z]) => new THREE.Vector2(x, -z)));
  holes.forEach((h) => {
    const p = new THREE.Path();
    p.moveTo(h.x0, -h.z0);
    p.lineTo(h.x0, -h.z1);
    p.lineTo(h.x1, -h.z1);
    p.lineTo(h.x1, -h.z0);
    p.closePath();
    sh.holes.push(p);
  });
  return sh;
}

// شكل مسطح على مستوى y
function flatGeo(shape, y) {
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}
function extrudedFlat(shape, y0, thick) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  return g;
}

// مستطيل أفقي مع UV بالأمتار
function rectGeo(r, y, uvScale = 6) {
  const w = r.x1 - r.x0;
  const d = r.z1 - r.z0;
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  g.translate((r.x0 + r.x1) / 2, y, (r.z0 + r.z1) / 2);
  const uv = g.attributes.uv;
  const pos = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / uvScale, -pos.getZ(i) / uvScale);
  return g;
}

function boxAt(cx, cy, cz, sx, sy, sz) {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  g.translate(cx, cy, cz);
  return g;
}

// جدار محوري (أفقي أو رأسي) من a إلى b بسُمك t بين ارتفاع y0 و y1
function wall(list, ax, az, bx, bz, t, y0, y1) {
  const h = y1 - y0;
  if (h <= 0.001) return;
  if (Math.abs(az - bz) < 1e-6) {
    const x0 = Math.min(ax, bx);
    const x1 = Math.max(ax, bx);
    list.push(boxAt((x0 + x1) / 2, (y0 + y1) / 2, az, x1 - x0 + t, h, t));
  } else {
    const z0 = Math.min(az, bz);
    const z1 = Math.max(az, bz);
    list.push(boxAt(ax, (y0 + y1) / 2, (z0 + z1) / 2, t, h, z1 - z0 + t));
  }
}

const DOOR_W = 1.4;
const DOOR_H = 2.3;

// جدار به فتحة باب
function wallWithDoor(list, side, rect, doorAt, t, doorW = DOOR_W) {
  const { x0, x1, z0, z1 } = rect;
  const horiz = side === 'n' || side === 's';
  const fixed = side === 'n' ? z0 : side === 's' ? z1 : side === 'w' ? x0 : x1;
  const a = horiz ? x0 : z0;
  const b = horiz ? x1 : z1;
  const d0 = doorAt - doorW / 2;
  const d1 = doorAt + doorW / 2;
  const put = (s, e, y0, y1) => {
    if (e - s < 0.02) return;
    if (horiz) wall(list, s, fixed, e, fixed, t, y0, y1);
    else wall(list, fixed, s, fixed, e, t, y0, y1);
  };
  put(a, d0, 0, WALL_H);
  put(d1, b, 0, WALL_H);
  put(d0, d1, DOOR_H, WALL_H); // عتب
}

function plainWall(list, side, rect, t) {
  const { x0, x1, z0, z1 } = rect;
  if (side === 'n') wall(list, x0, z0, x1, z0, t, 0, WALL_H);
  if (side === 's') wall(list, x0, z1, x1, z1, t, 0, WALL_H);
  if (side === 'w') wall(list, x0, z0, x0, z1, t, 0, WALL_H);
  if (side === 'e') wall(list, x1, z0, x1, z1, t, 0, WALL_H);
}

const mats = {};
function mat(name, make) {
  return (mats[name] ||= make());
}

export function createBuilding(bid, layout, pos, labelsRoot) {
  const group = new THREE.Group();
  group.position.set(pos.x, 0, pos.z);
  group.userData.bid = bid;

  const edges = edgesOf(FOOTPRINT);

  /* ===================== الواجهة الخارجية ===================== */
  const exterior = new THREE.Group();
  group.add(exterior);
  const facadeMeshes = [];

  edges.forEach((e) => {
    const nB = Math.max(1, Math.round(e.len / BAY));
    const isEntrance = e.i === ENTRANCE_EDGE;
    const isWingEnd = Math.abs(e.len - 20) < 0.1 && Math.abs(e.mz - 30) < 0.01;
    const kind = isEntrance ? 'entrance' : isWingEnd ? 'glass' : 'normal';
    const t = facadeTexture(nB, kind);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(e.len, BLD_H),
      new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, metalness: 0 }),
    );
    m.position.set(e.mx, BLD_H / 2, e.mz);
    m.rotation.y = Math.atan2(e.nx, e.nz);
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.building = bid;
    exterior.add(m);
    facadeMeshes.push(m);

    // كورنيش
    const cornice = new THREE.Mesh(
      new THREE.BoxGeometry(e.len + 0.8, 0.55, 0.9),
      mat('cornice', () => new THREE.MeshStandardMaterial({ color: '#efdcae', roughness: 0.85 })),
    );
    cornice.position.set(e.mx + e.nx * 0.35, BLD_H - 0.1, e.mz + e.nz * 0.35);
    cornice.rotation.y = Math.atan2(e.nx, e.nz);
    cornice.castShadow = true;
    cornice.userData.building = bid;
    exterior.add(cornice);
  });

  // السطح
  const roofMat = new THREE.MeshStandardMaterial({ map: roofTexture(), roughness: 0.95 });
  roofMat.map.repeat.set(0.1, 0.1);
  const roof = new THREE.Mesh(extrudedFlat(shapeFrom(FOOTPRINT), BLD_H - 0.05, 0.35), roofMat);
  roof.receiveShadow = true;
  roof.castShadow = true;
  roof.userData.building = bid;
  exterior.add(roof);
  // برابيت السطح
  const parapet = [];
  edges.forEach((e) => {
    const pts = e;
    const tx = e.nx * -0.25;
    const tz = e.nz * -0.25;
    const horiz = Math.abs(e.p[1] - e.q[1]) < 1e-6;
    if (horiz) wall(parapet, e.p[0] + tx, e.p[1] + tz, e.q[0] + tx, e.q[1] + tz, 0.3, BLD_H + 0.3, BLD_H + 1.2);
    else wall(parapet, e.p[0] + tx, e.p[1] + tz, e.q[0] + tx, e.q[1] + tz, 0.3, BLD_H + 0.3, BLD_H + 1.2);
  });
  const parapetMesh = new THREE.Mesh(mergeGeometries(parapet), mat('cornice', () => new THREE.MeshStandardMaterial({ color: '#efdcae', roughness: 0.85 })));
  parapetMesh.castShadow = true;
  parapetMesh.userData.building = bid;
  exterior.add(parapetMesh);
  // وحدات تكييف على السطح
  const acMat = new THREE.MeshStandardMaterial({ color: '#9aa0a6', roughness: 0.6, metalness: 0.4 });
  for (let i = 0; i < 9; i++) {
    const ac = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 1.4), acMat);
    const wx = [-20, -15, -10, 10, 15, 20, -22, 22, 0][i];
    const wz = i < 6 ? -24 : 10 + (i - 6) * 8;
    ac.position.set(wx, BLD_H + 0.95, i < 6 ? -24 : wz);
    if (i === 8) ac.position.set(0, BLD_H + 0.95, -26);
    ac.castShadow = true;
    ac.userData.building = bid;
    exterior.add(ac);
  }

  // الرواق عند المدخل الرئيسي (أعمدة + سقف + درج) — على الضلع الجنوبي للبهو
  const portico = new THREE.Group();
  const pcMat = new THREE.MeshStandardMaterial({ color: '#f0dfb4', roughness: 0.8 });
  for (let i = 0; i < 4; i++) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, FLOOR_H * 2, 20), pcMat);
    col.position.set(-4.8 + i * 3.2, FLOOR_H, 3.6);
    col.castShadow = true;
    portico.add(col);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.35, 1.3), pcMat);
    cap.position.set(-4.8 + i * 3.2, FLOOR_H * 2 + 0.17, 3.6);
    portico.add(cap);
  }
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(12.5, 0.9, 4.6), pcMat);
  canopy.position.set(0, FLOOR_H * 2 + 0.8, 2.0);
  canopy.castShadow = true;
  portico.add(canopy);
  for (let s = 0; s < 4; s++) {
    const depth = 4.6 - s * 0.9;
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(14.4 - s * 0.8, 0.17 * (s + 1), depth),
      new THREE.MeshStandardMaterial({ color: '#c9b690', roughness: 0.9 }),
    );
    step.position.set(0, (0.17 * (s + 1)) / 2, depth / 2);
    step.receiveShadow = true;
    portico.add(step);
  }
  portico.position.set(0, 0, -13);
  portico.userData.building = bid;
  portico.traverse((o) => (o.userData.building = bid));
  exterior.add(portico);

  // اسم المبنى (وسم HTML)
  const tag = document.createElement('div');
  tag.className = 'bld-tag';
  tag.innerHTML = `<b>مبنى ${bid}</b><span>${bid === 1 ? 'هندسي 1' : 'هندسي 2'}</span>`;
  const tagObj = new CSS2DObject(tag);
  tagObj.position.set(0, BLD_H + 6, 0);
  group.add(tagObj);

  /* ===================== الأدوار الداخلية ===================== */
  const floors = [];
  const interior = new THREE.Group();
  interior.visible = false;
  group.add(interior);

  const slabMat = new THREE.MeshStandardMaterial({ color: '#d9d2c2', roughness: 0.95 });
  const wallMat = new THREE.MeshStandardMaterial({ color: '#f1ead8', roughness: 0.95 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#bcd8f0',
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const marble = new THREE.MeshStandardMaterial({ map: marbleTexture(), roughness: 0.35, metalness: 0.02 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: '#f6f3ea', roughness: 0.95, side: THREE.DoubleSide });
  const stepMat = new THREE.MeshStandardMaterial({ color: '#a8a39a', roughness: 0.8 });
  const stairWallMat = new THREE.MeshStandardMaterial({ color: '#efe3c8', roughness: 0.9 });
  const doorMat = new THREE.MeshStandardMaterial({ color: '#e9d79a', roughness: 0.6 });
  const lockerMat = new THREE.MeshStandardMaterial({ color: '#efe9d6', roughness: 0.55 });
  const deskMat = new THREE.MeshStandardMaterial({ color: '#c7c0b2', roughness: 0.6 });
  const chairMat = new THREE.MeshStandardMaterial({ color: '#4a6fa5', roughness: 0.7 });
  const screenMat = new THREE.MeshStandardMaterial({ color: '#101820', emissive: '#2a6fb0', emissiveIntensity: 0.5, roughness: 0.3 });
  const boardMat = new THREE.MeshStandardMaterial({ color: '#fafafa', roughness: 0.4 });
  const lightMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 1.1 });
  const pipeRed = new THREE.MeshStandardMaterial({ color: '#b3261e', roughness: 0.5 });
  const ductMat = new THREE.MeshStandardMaterial({ color: '#aeb4ba', roughness: 0.5, metalness: 0.5 });

  const pickMeshes = [];
  const bounds = new THREE.Box3();

  for (let L = 0; L < LEVELS; L++) {
    const lay = layout.floors[L];
    const fg = new THREE.Group();
    fg.position.y = L * FLOOR_H;
    fg.userData.level = L;
    interior.add(fg);
    const f = { level: L, group: fg, labels: [], walls: null, ceiling: null, rooms: new Map(), dimObjs: [] };

    // بلاطة الأرضية (بها فتحات السلالم للأدوار العليا)
    const voids = L >= 1 ? layout.stairVoids : [];
    const slab = new THREE.Mesh(extrudedFlat(shapeFrom(FOOTPRINT, voids), -SLAB, SLAB), slabMat);
    slab.receiveShadow = true;
    slab.castShadow = true;
    fg.add(slab);

    // أرضية الممرات والبهو (رخام)
    const floorGeos = [];
    lay.corridors.forEach((c) => floorGeos.push(rectGeo(c, 0.012)));
    // البهو مع فتحة للسلالم؟ (البهو لا يحتوي سلالم)
    floorGeos.push(rectGeo(lay.lobby, 0.012));
    const floorMesh = new THREE.Mesh(mergeGeometries(floorGeos), marble);
    floorMesh.receiveShadow = true;
    fg.add(floorMesh);

    // أرضيات الغرف (ملوّنة حسب النوع + قابلة للنقر)
    [...lay.rooms].forEach((r) => {
      const t = TYPES[r.type];
      const m = new THREE.MeshStandardMaterial({
        color: new THREE.Color(t.color).lerp(new THREE.Color('#f3ecd8'), 0.55),
        roughness: 0.7,
      });
      const mesh = new THREE.Mesh(rectGeo({ x0: r.rect.x0 + 0.1, x1: r.rect.x1 - 0.1, z0: r.rect.z0 + 0.1, z1: r.rect.z1 - 0.1 }, 0.02), m);
      mesh.receiveShadow = true;
      mesh.userData = { roomId: r.id, building: bid, level: L, baseColor: m.color.clone() };
      fg.add(mesh);
      pickMeshes.push(mesh);
      f.rooms.set(r.id, mesh);
    });

    // أرضية غرف السلالم (حول فتحة السلم في الأدوار العليا)
    const stairFloor = [];
    lay.stairs.forEach((s) => {
      const r = s.rect;
      const inner = { x0: r.x0 + 0.1, x1: r.x1 - 0.1, z0: r.z0 + 0.1, z1: r.z1 - 0.1 };
      if (L === 0) return stairFloor.push(rectGeo(inner, 0.02));
      const v = layout.stairVoids.find((x) => x.wing === s.wing);
      const parts = [
        { x0: inner.x0, x1: inner.x1, z0: inner.z0, z1: v.z0 },
        { x0: inner.x0, x1: inner.x1, z0: v.z1, z1: inner.z1 },
        { x0: inner.x0, x1: v.x0, z0: v.z0, z1: v.z1 },
        { x0: v.x1, x1: inner.x1, z0: v.z0, z1: v.z1 },
      ];
      parts.forEach((p) => p.x1 - p.x0 > 0.05 && p.z1 - p.z0 > 0.05 && stairFloor.push(rectGeo(p, 0.02)));
    });
    const sfm = new THREE.Mesh(mergeGeometries(stairFloor), stairWallMat);
    sfm.receiveShadow = true;
    fg.add(sfm);

    /* ----- الجدران ----- */
    const wl = []; // جدران داخلية
    lay.rooms.forEach((r) => {
      ['n', 's', 'e', 'w'].forEach((side) => {
        if (r.door.side === side) wallWithDoor(wl, side, r.rect, r.door.at, 0.16);
        else plainWall(wl, side, r.rect, 0.16);
      });
    });
    lay.stairs.forEach((s) => {
      ['n', 's', 'e', 'w'].forEach((side) => {
        if (s.door.side === side) wallWithDoor(wl, side, s.rect, s.door.at, 0.16);
        else plainWall(wl, side, s.rect, 0.16);
      });
    });
    const wallsMesh = new THREE.Mesh(mergeGeometries(wl), wallMat);
    wallsMesh.castShadow = true;
    wallsMesh.receiveShadow = true;
    fg.add(wallsMesh);
    f.walls = wallsMesh;

    // الجدران الخارجية (زجاجية شفافة) + فتحة المدخل في الدور الأرضي
    const ow = [];
    edges.forEach((e) => {
      if (L === 0 && e.i === ENTRANCE_EDGE) {
        const rect = { x0: -7, x1: 7, z0: -13, z1: -13 };
        wallWithDoor(ow, 's', rect, 0, 0.4, 3.2);
      } else {
        const horiz = Math.abs(e.p[1] - e.q[1]) < 1e-6;
        wall(ow, e.p[0], e.p[1], e.q[0], e.q[1], 0.4, 0, WALL_H);
        void horiz;
      }
    });
    const outer = new THREE.Mesh(mergeGeometries(ow), glassMat);
    outer.renderOrder = 5;
    fg.add(outer);
    f.outer = outer;
    // جدران خارجية صلبة بنفس لون الواجهة (تظهر في الجولة الداخلية)
    const outerSolid = new THREE.Mesh(
      mergeGeometries(ow),
      new THREE.MeshStandardMaterial({ color: '#e9dcb8', roughness: 0.9 }),
    );
    outerSolid.visible = false;
    outerSolid.castShadow = true;
    fg.add(outerSolid);
    f.outerSolid = outerSolid;

    /* ----- أبواب مفتوحة قليلاً ----- */
    const doorMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.0, 2.1, 0.05), doorMat, lay.doors.length);
    const dm = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    lay.doors.forEach((d, k) => {
      const { x0, x1, z0, z1 } = d.rect;
      const side = d.door.side;
      let hx;
      let hz;
      let ang;
      if (side === 's') {
        hx = d.door.at - DOOR_W / 2;
        hz = z1;
        ang = -1.0;
      } else if (side === 'n') {
        hx = d.door.at - DOOR_W / 2;
        hz = z0;
        ang = 1.0;
      } else if (side === 'e') {
        hx = x1;
        hz = d.door.at - DOOR_W / 2;
        ang = Math.PI / 2 - 1.0;
      } else {
        hx = x0;
        hz = d.door.at - DOOR_W / 2;
        ang = Math.PI / 2 + 1.0;
      }
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ang);
      // مفصلة الباب في طرف الفتحة؛ المركز على بعد نصف العرض
      const off = new THREE.Vector3(0.5, 0, 0).applyQuaternion(q);
      dm.compose(new THREE.Vector3(hx + off.x, 1.05, hz + off.z), q, new THREE.Vector3(1, 1, 1));
      doorMesh.setMatrixAt(k, dm);
    });
    doorMesh.castShadow = true;
    fg.add(doorMesh);
    f.doors = doorMesh;

    /* ----- لوكرات في الممرات (من الفيديو) ----- */
    const lockerM = [];
    const lockerPos = [];
    lay.corridors
      .filter((c) => !c.passage)
      .forEach((c) => {
        const sides = [
          { x: c.x0 + 0.25, dir: 1 },
          { x: c.x1 - 0.25, dir: -1 },
        ];
        const doorZs = lay.doors.filter((d) => (d.door.side === 'e' || d.door.side === 'w') && d.rect.z0 >= -16.7).map((d) => d.door.at);
        sides.forEach((sd) => {
          for (let z = c.z0 + 3.2; z < c.z1 - 1; z += 0.62) {
            if (doorZs.some((dz) => Math.abs(dz - z) < 1.4)) continue;
            lockerPos.push([sd.x, z]);
          }
        });
      });
    const lockers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.46, 1.9, 0.58), lockerMat, lockerPos.length);
    lockerPos.forEach(([x, z], k) => {
      dm.makeTranslation(x, 0.95, z);
      lockers.setMatrixAt(k, dm);
    });
    lockers.castShadow = true;
    f.lockers = lockers;
    fg.add(lockers);

    /* ----- أثاث القاعات ----- */
    const desks = [];
    const chairs = [];
    const screens = [];
    const boards = [];
    lay.rooms.forEach((r) => furnish(r, desks, chairs, screens, boards));
    const mkInst = (geo, material, arr, y, yaw0 = 0) => {
      if (!arr.length) return null;
      const im = new THREE.InstancedMesh(geo, material, arr.length);
      arr.forEach((a, k) => {
        dm.compose(new THREE.Vector3(a[0], y, a[1]), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), a[2] || yaw0), new THREE.Vector3(a[3] || 1, 1, a[4] || 1));
        im.setMatrixAt(k, dm);
      });
      im.castShadow = true;
      fg.add(im);
      return im;
    };
    mkInst(new THREE.BoxGeometry(1, 0.74, 0.55), deskMat, desks, 0.37);
    mkInst(new THREE.BoxGeometry(0.42, 0.45, 0.42), chairMat, chairs, 0.23);
    mkInst(new THREE.BoxGeometry(0.5, 0.34, 0.05), screenMat, screens, 0.93);
    mkInst(new THREE.BoxGeometry(1, 1.3, 0.05), boardMat, boards, 1.5);

    /* ----- السلالم ----- */
    if (L < LEVELS - 1) {
      lay.stairs.forEach((s) => buildStairs(fg, s, stepMat));
    }
    // دربزين وسلم الدور العلوي: جدار وصول
    lay.stairs.forEach((s) => {
      const g = stairGeometry(s);
      if (L > 0) {
        // درابزين حول الفتحة
        const rails = [];
        const x0 = g.xW - 0.1;
        const x1 = g.xE + g.width + 0.1;
        wallRail(rails, x0, g.zA, x1, g.zA);
        wallRail(rails, x0, g.zB + 0.15, x1, g.zB + 0.15);
        wallRail(rails, x0, g.zA, x0, g.zB + 0.15);
        wallRail(rails, x1, g.zA, x1, g.zB + 0.15);
        const rm = new THREE.Mesh(mergeGeometries(rails), new THREE.MeshStandardMaterial({ color: '#cfd4d8', metalness: 0.8, roughness: 0.3 }));
        fg.add(rm);
      }
    });

    /* ----- السقف + لمبات + مواسير (للجولة) ----- */
    const ceilGroup = new THREE.Group();
    ceilGroup.visible = false;
    const ceilY = FLOOR_H - SLAB - 0.35;
    const ceilShape = shapeFrom(FOOTPRINT, voids.length ? voids : []);
    const ceil = new THREE.Mesh(flatGeo(ceilShape, ceilY), ceilMat);
    ceilGroup.add(ceil);
    // ألواح الإضاءة
    const lights = [];
    lay.corridors
      .filter((c) => !c.passage)
      .forEach((c) => {
        for (let z = c.z0 + 2; z < c.z1; z += 5) lights.push(boxAt((c.x0 + c.x1) / 2, ceilY - 0.02, z, 0.6, 0.04, 0.6));
      });
    lights.push(boxAt(0, ceilY - 0.02, -21, 0.9, 0.04, 0.9), boxAt(-3, ceilY - 0.02, -16, 0.9, 0.04, 0.9), boxAt(3, ceilY - 0.02, -16, 0.9, 0.04, 0.9));
    lay.rooms.forEach((r) => {
      const nx = Math.max(1, Math.floor(r.w / 3.2));
      const nz = Math.max(1, Math.floor(r.d / 3.6));
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) lights.push(boxAt(r.rect.x0 + ((i + 0.5) * r.w) / nx, ceilY - 0.02, r.rect.z0 + ((j + 0.5) * r.d) / nz, 0.6, 0.04, 0.6));
    });
    const lm = new THREE.Mesh(mergeGeometries(lights), lightMat);
    ceilGroup.add(lm);
    // مواسير حمراء ومجاري هواء على امتداد الممرات
    const pipes = [];
    const ducts = [];
    lay.corridors
      .filter((c) => !c.passage)
      .forEach((c) => {
        const len = c.z1 - c.z0;
        const p = new THREE.CylinderGeometry(0.07, 0.07, len, 8);
        p.rotateX(Math.PI / 2);
        p.translate(c.x0 + 0.6, ceilY - 0.12, (c.z0 + c.z1) / 2);
        pipes.push(p);
        ducts.push(boxAt(c.x1 - 0.9, ceilY - 0.25, (c.z0 + c.z1) / 2, 0.8, 0.45, len));
      });
    ceilGroup.add(new THREE.Mesh(mergeGeometries(pipes), pipeRed), new THREE.Mesh(mergeGeometries(ducts), ductMat));
    fg.add(ceilGroup);
    f.ceiling = ceilGroup;

    /* ----- وسوم الغرف ----- */
    const addLabel = (r) => {
      const el = document.createElement('div');
      el.className = `room-label t-${r.type}`;
      el.innerHTML = `<b>${r.nameAr}</b><i>${r.w.toFixed(1)} × ${r.d.toFixed(1)} م</i>`;
      el.dataset.room = r.id;
      const o = new CSS2DObject(el);
      o.position.set(r.cx, 0.5, r.cz);
      o.visible = false;
      fg.add(o);
      f.labels.push(o);
    };
    lay.rooms.forEach(addLabel);
    // وسم البهو والسلالم
    const lobbyEl = document.createElement('div');
    lobbyEl.className = 'room-label t-LOBBY';
    lobbyEl.innerHTML = `<b>البهو الرئيسي</b><i>14.0 × 17.0 م</i>`;
    const lo = new CSS2DObject(lobbyEl);
    lo.position.set(0, 0.5, -21.5);
    lo.visible = false;
    fg.add(lo);
    f.labels.push(lo);
    lay.stairs.forEach((s) => {
      const el = document.createElement('div');
      el.className = 'room-label t-STAIR';
      el.innerHTML = `<b>سلم</b>`;
      const o = new CSS2DObject(el);
      o.position.set((s.rect.x0 + s.rect.x1) / 2, 0.5, (s.rect.z0 + s.rect.z1) / 2);
      o.visible = false;
      fg.add(o);
      f.labels.push(o);
    });
    // وسم اسم الدور
    const fl = document.createElement('div');
    fl.className = 'floor-chip';
    fl.textContent = FLOOR_NAMES[L];
    const flo = new CSS2DObject(fl);
    flo.position.set(-27, 0.5, 33);
    flo.visible = false;
    fg.add(flo);
    f.labels.push(flo);
    f.dimObjs = [];
    floors.push(f);
  }
  bounds.set(new THREE.Vector3(-27, 0, -30), new THREE.Vector3(27, BLD_H, 30));

  /* ====== واجهة التحكم ====== */
  const api = {
    id: bid,
    group,
    exterior,
    interior,
    floors,
    pickMeshes,
    facadeMeshes,
    tagObj,
    pos,
    /** @param {'exterior'|'interior'} mode */
    setMode(mode) {
      exterior.visible = mode === 'exterior';
      interior.visible = mode === 'interior';
      tagObj.visible = mode === 'exterior';
    },
    hideTag() {
      tagObj.visible = false;
    },
    /** إظهار الأدوار حتى مستوى معيّن */
    showFloorsUpTo(level, { tour = false, activeLevel = level } = {}) {
      floors.forEach((f) => {
        f.group.visible = f.level <= level;
        const active = f.level === activeLevel;
        f.labels.forEach((o) => (o.visible = !tour && active && f.group.visible));
        f.ceiling.visible = tour && active;
        f.walls.scale.y = tour ? 1 : 0.42;
        f.outer.scale.y = tour ? 1 : 0.42;
        f.outerSolid.scale.y = tour ? 1 : 0.42;
        f.outer.visible = !tour;
        f.outerSolid.visible = tour;
        f.lockers.scale.y = 1;
      });
    },
    setHoverRoom(roomId, on) {
      pickMeshes.forEach((m) => {
        if (m.userData.roomId === roomId) {
          m.material.emissive.setHex(on ? 0x2244aa : 0x000000);
          m.material.emissiveIntensity = on ? 0.5 : 0;
        }
      });
    },
    setSelectedRoom(roomId) {
      pickMeshes.forEach((m) => {
        const sel = m.userData.roomId === roomId;
        m.material.emissive.setHex(sel ? 0xff3d71 : 0x000000);
        m.material.emissiveIntensity = sel ? 0.65 : 0;
      });
    },
    bounds,
  };
  return api;
}

function wallRail(list, ax, az, bx, bz) {
  const len = Math.hypot(bx - ax, bz - az);
  const g = new THREE.BoxGeometry(Math.abs(bx - ax) < 1e-6 ? 0.05 : len, 0.05, Math.abs(bz - az) < 1e-6 ? 0.05 : len);
  g.translate((ax + bx) / 2, 1.0, (az + bz) / 2);
  list.push(g);
  // قوائم
  const n = Math.max(2, Math.round(len / 0.9));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = new THREE.BoxGeometry(0.04, 1.0, 0.04);
    p.translate(ax + (bx - ax) * t, 0.5, az + (bz - az) * t);
    list.push(p);
  }
}

// سلم ذو مرحلتين (ذهاب وعودة) داخل غرفة السلم
function buildStairs(fg, s, material) {
  const g = stairGeometry(s);
  const geos = [];
  const rise = FLOOR_H / 2;
  const n = 12;
  const runLen = g.zLand0 - g.zA;
  const tread = runLen / n;
  const h = rise / n;
  // المرحلة الأولى: ترتفع من 0 إلى rise على امتداد +z عند العمود الأقرب
  for (let i = 0; i < n; i++) {
    const z = g.zA + tread * (i + 0.5);
    const y = h * (i + 1);
    geos.push(boxAt(g.colNear + g.width / 2, y / 2, z, g.width, y, tread));
  }
  // بسطة منتصف
  geos.push(boxAt((g.xW + g.xE + g.width) / 2, rise / 2 - 0.05, (g.zLand0 + g.zB) / 2, g.xE + g.width - g.xW, rise - 0.1, g.zB - g.zLand0));
  // المرحلة الثانية: ترتفع من rise إلى 2*rise على امتداد −z
  for (let i = 0; i < n; i++) {
    const z = g.zLand0 - tread * (i + 0.5);
    const y = rise + h * (i + 1);
    geos.push(boxAt(g.colFar + g.width / 2, y / 2, z, g.width, y, tread));
  }
  const m = new THREE.Mesh(mergeGeometries(geos), material);
  m.castShadow = true;
  m.receiveShadow = true;
  fg.add(m);
}

// أثاث حسب نوع الغرفة — السبورة دائماً على الجدار الشمالي
function furnish(r, desks, chairs, screens, boards) {
  const { x0, x1, z0, z1 } = r.rect;
  const w = r.w;
  const d = r.d;
  const inset = 0.5;
  if (['LH', 'CR', 'LAB', 'DR'].includes(r.type)) {
    const boardW = Math.min(w - 2, r.type === 'LH' ? 6 : 4);
    boards.push([r.cx, z0 + 0.15, 0, boardW, 1]);
    const rowGap = r.type === 'LAB' ? 1.55 : r.type === 'DR' ? 1.9 : 1.2;
    const deskW = r.type === 'DR' ? 1.8 : 1.2;
    const cols = Math.max(1, Math.floor((w - 1.4) / (deskW + 0.15)));
    const startX = r.cx - ((cols - 1) * (deskW + 0.15)) / 2;
    const startZ = z0 + (r.type === 'LH' ? 3.6 : 3.2);
    // الباب غالباً على الجانب — نترك ممراً
    const endZ = z1 - 0.8;
    for (let z = startZ; z < endZ; z += rowGap) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * (deskW + 0.15);
        if (r.door.side === 's' && z > z1 - 1.6) continue;
        desks.push([x, z, 0, deskW, r.type === 'DR' ? 1.3 : 1]);
        chairs.push([x, z + (r.type === 'DR' ? 0.95 : 0.65), 0]);
        if (r.type === 'LAB') screens.push([x, z - 0.05, 0]);
      }
    }
  } else if (r.type === 'OFF' || r.type === 'ADM') {
    const n = Math.max(1, Math.floor(w / 3));
    for (let i = 0; i < n; i++) {
      const x = x0 + ((i + 0.5) * w) / n;
      desks.push([x, r.cz - d / 4, 0, 1.5, 1.2]);
      chairs.push([x, r.cz - d / 4 + 0.9, 0]);
      screens.push([x, r.cz - d / 4, 0]);
    }
  }
}
