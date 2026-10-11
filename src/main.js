import './style.css';
import { ic, hydrateIcons } from './icons.js';
import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { createWorld, createTween } from './world.js';
import { createBuilding } from './building.js';
import { BUILDINGS, TYPES, findRoom } from './layout.js';
import { BUILDINGS_POS, BLD, FLOOR_NAMES, FLOOR_SHORT, GATE } from './config.js';
import { createRouter } from './route.js';
import { DAYS, YEARS, KINDS, loadCourses, isSample, saveImported, resetImported, parseCSV, toMinutes } from './schedule.js';

const FH = BLD.FLOOR_H;
const $ = (s) => document.querySelector(s);

/* ======================= المشهد ======================= */
const world = createWorld($('#stage'));
const { scene, camera, controls, renderer, labelRenderer } = world;
const tween = createTween();
const router = createRouter();

const buildings = {};
[1, 2].forEach((b) => {
  buildings[b] = createBuilding(b, BUILDINGS[b], BUILDINGS_POS[b]);
  buildings[b].setMode('exterior');
  scene.add(buildings[b].group);
});

const fitFactor = () => Math.max(1, Math.min(2.6, 1.15 / camera.aspect));
const CAMPUS_TARGET = new THREE.Vector3(25, 0, -50);
const CAMPUS_VIEW = {
  get pos() {
    return CAMPUS_TARGET.clone().add(new THREE.Vector3(5, 100, 170).multiplyScalar(fitFactor()));
  },
  target: CAMPUS_TARGET,
};
camera.position.copy(CAMPUS_VIEW.pos);
controls.target.copy(CAMPUS_VIEW.target);

/* ======================= الحالة ======================= */
const S = {
  mode: 'campus', // campus | building | tour
  bld: null,
  level: 0,
  room: null,
  course: null,
  route: null,
  years: new Set(),
  day: null,
  q: '',
  hoverB: null,
  hoverRoom: null,
};
let courses = loadCourses();

/* ======================= أدوات ======================= */
const norm = (s) =>
  (s || '')
    .toString()
    .toLowerCase()
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ـ/g, '')
    .trim();

function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (t.hidden = true), ms);
}

const worldOf = (b, x, z, y = 0) => new THREE.Vector3(BUILDINGS_POS[b].x + x, y, BUILDINGS_POS[b].z + z);
const roomLabel = (r) => `مبنى ${r.building} · ${FLOOR_NAMES[r.floor]} · ${r.nameAr}`;

/* ======================= الدخول والخروج من المباني ======================= */
function buildingCenter(b, level = 0) {
  return worldOf(b, 0, 0, level * FH);
}

function viewCampus() {
  stopTour(true);
  S.mode = 'campus';
  S.bld = null;
  Object.values(buildings).forEach((x) => x.setMode('exterior'));
  clearDims();
  world.setShadowFocus(0, -40, 230);
  controls.minDistance = 20;
  controls.maxDistance = 520;
  tween.flyTo(camera, controls, CAMPUS_VIEW.pos, CAMPUS_VIEW.target, 1500);
  $('#floors').hidden = true;
  syncNav('campus');
}

function enterBuilding(b, level = S.level ?? 0, { fly = true, keepRoute = true } = {}) {
  if (S.mode === 'tour') stopTour(true);
  S.mode = 'building';
  S.bld = b;
  S.level = level;
  Object.values(buildings).forEach((x) => x.setMode(x.id === b ? 'interior' : 'exterior'));
  buildings[b].showFloorsUpTo(level);
  const c = buildingCenter(b, level);
  world.setShadowFocus(c.x, c.z, 80);
  controls.minDistance = 8;
  controls.maxDistance = 220;
  if (fly) tween.flyTo(camera, controls, c.clone().add(new THREE.Vector3(18, 78, 70).multiplyScalar(fitFactor())), c, 1500);
  buildFloorButtons();
  $('#floors').hidden = false;
  syncNav(`b${b}`);
  applySelection();
}

function setLevel(level) {
  if (S.mode !== 'building') return;
  S.level = level;
  buildings[S.bld].showFloorsUpTo(level);
  const c = buildingCenter(S.bld, level);
  const dy = c.y - controls.target.y;
  tween.flyTo(camera, controls, camera.position.clone().add(new THREE.Vector3(0, dy, 0)), new THREE.Vector3(controls.target.x, c.y, controls.target.z), 600);
  buildFloorButtons();
  clearDims();
  if (S.room && S.room.building === S.bld && S.room.floor === level) showDims(S.room);
  applySelection();
}

function applySelection() {
  Object.values(buildings).forEach((x) => x.setSelectedRoom(null));
  if (S.room) buildings[S.room.building].setSelectedRoom(S.room.id);
  updateRouteVisibility();
}

function buildFloorButtons() {
  const box = $('#floors');
  box.innerHTML = '<div class="t">الأدوار</div>';
  for (let l = BLD.LEVELS - 1; l >= 0; l--) {
    const btn = document.createElement('button');
    btn.className = l === S.level ? 'on' : '';
    btn.innerHTML = `${FLOOR_SHORT[l]}<small>${l === 0 ? 'الأرضي' : 'الدور'}</small>`;
    btn.onclick = () => setLevel(l);
    box.appendChild(btn);
  }
  const ex = document.createElement('button');
  ex.className = 'exit';
  ex.innerHTML = ic('exit') + ' خروج';
  ex.onclick = viewCampus;
  box.appendChild(ex);
}

function syncNav(key) {
  document.querySelectorAll('#topbar .views button').forEach((b) => b.classList.toggle('on', b.dataset.view === key));
}
document.querySelectorAll('#topbar .views button').forEach((btn) => {
  btn.onclick = () => {
    const v = btn.dataset.view;
    if (v === 'campus') viewCampus();
    else enterBuilding(Number(v.slice(1)), 0);
  };
});
document.body.classList.add('hide-dims'); // أسماء الغرف بس، والأبعاد بتظهر لما تختار غرفة

/* ======================= أبعاد الغرفة ======================= */
let dimGroup = null;
function clearDims() {
  if (dimGroup) {
    dimGroup.parent?.remove(dimGroup);
    dimGroup.traverse((o) => o.element?.remove());
    dimGroup = null;
  }
}
function showDims(r) {
  clearDims();
  const f = buildings[r.building].floors[r.floor];
  const g = new THREE.Group();
  const { x0, x1, z0, z1 } = r.rect;
  const mk = (a, b) => [a, b];
  const pts = [];
  const y = 0.12;
  const ins = 0.35;
  const seg = (ax, az, bx, bz) => pts.push(new THREE.Vector3(ax, y, az), new THREE.Vector3(bx, y, bz));
  // خط العرض (على الجدار الجنوبي داخل الغرفة) + خط العمق (على الجدار الغربي)
  seg(x0 + 0.2, z1 - ins, x1 - 0.2, z1 - ins);
  seg(x0 + 0.2, z1 - ins - 0.3, x0 + 0.2, z1 - ins + 0.3);
  seg(x1 - 0.2, z1 - ins - 0.3, x1 - 0.2, z1 - ins + 0.3);
  seg(x0 + ins, z0 + 0.2, x0 + ins, z1 - 0.2);
  seg(x0 + ins - 0.3, z0 + 0.2, x0 + ins + 0.3, z0 + 0.2);
  seg(x0 + ins - 0.3, z1 - 0.2, x0 + ins + 0.3, z1 - 0.2);
  void mk;
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const line = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xff3d71, depthTest: false }));
  line.renderOrder = 20;
  g.add(line);
  const lab = (text, x, z) => {
    const el = document.createElement('div');
    el.className = 'dim-label';
    el.textContent = text;
    const o = new CSS2DObject(el);
    o.position.set(x, 0.3, z);
    g.add(o);
  };
  lab(`${r.w.toFixed(1)} م`, r.cx, z1 - ins);
  lab(`${r.d.toFixed(1)} م`, x0 + ins, r.cz);
  f.group.add(g);
  dimGroup = g;
}

/* ======================= اختيار غرفة ======================= */
function selectRoom(room, { fly = true, openDetail = true } = {}) {
  S.room = room;
  if (S.mode !== 'building' || S.bld !== room.building || S.level !== room.floor) {
    enterBuilding(room.building, room.floor, { fly: false });
  }
  applySelection();
  showDims(room);
  if (fly) {
    const t = worldOf(room.building, room.cx, room.cz, room.floor * FH);
    tween.flyTo(camera, controls, t.clone().add(new THREE.Vector3(6, 30, 26)), t, 1300);
  }
  if (openDetail) showRoomDetail(room);
}

/* ======================= البحث ======================= */
function buildChips() {
  const yc = $('#yearChips');
  yc.innerHTML = '';
  YEARS.forEach((y) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = y.label;
    b.onclick = () => {
      S.years.has(y.n) ? S.years.delete(y.n) : S.years.add(y.n);
      b.classList.toggle('on', S.years.has(y.n));
      renderResults();
    };
    yc.appendChild(b);
  });
  const dsel = $('#dayFilter');
  DAYS.forEach((d) => dsel.add(new Option(d, d)));
  dsel.onchange = () => {
    S.day = dsel.value || null;
    renderResults();
  };
}

function renderResults() {
  const box = $('#results');
  $('#detail').hidden = true;
  box.hidden = false;
  $('#sampleNote').hidden = !isSample();
  $('#noteText').innerHTML = 'جدول <b>الفرقتين الثانية والثالثة</b> حقيقي (خريف 2026-2027). الأولى والرابعة <b>تجريبية</b> لحد ما تبعتوا جداولهم.';
  const q = norm(S.q);
  const tokens = q.split(/\s+/).filter(Boolean);
  const rooms = Object.values(BUILDINGS).flatMap((b) => b.rooms);

  let list = courses.filter((c) => !S.years.size || S.years.has(c.year));
  if (tokens.length) {
    list = list.filter((c) => {
      const hay = norm([c.ar, c.en, c.code, c.instructor, ...c.sessions.map((s) => findRoom(s.roomId)?.nameAr + ' ' + findRoom(s.roomId)?.nameEn + ' ' + s.roomId)].join(' '));
      return tokens.every((t) => hay.includes(t));
    });
  }
  const html = [];
  // نتائج الغرف
  if (tokens.length) {
    const rm = rooms.filter((r) => tokens.every((t) => norm(`${r.nameAr} ${r.nameEn} ${r.id} مبنى ${r.building}`).includes(t))).slice(0, 6);
    if (rm.length) {
      html.push(`<div class="group-title">${ic('door')} الغرف</div>`);
      rm.forEach((r) => {
        html.push(`<button class="roomcard" data-room="${r.id}"><i style="background:${TYPES[r.type].color}"></i><div><b>${r.nameAr} <small>${r.nameEn}</small></b><small>مبنى ${r.building} · ${FLOOR_NAMES[r.floor]} · ${r.w.toFixed(1)}×${r.d.toFixed(1)} م</small></div></button>`);
      });
    }
  }
  if (list.length) html.push(`<div class="group-title">${ic('book')} المواد</div>`);
  list.forEach((c) => {
    const ss = c.sessions.filter((s) => !S.day || s.day === S.day);
    if (!ss.length) return;
    ss.sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || toMinutes(a.start) - toMinutes(b.start));
    html.push(`<div class="course"><h4><span>${c.ar}</span><small>${c.code}</small></h4>
      <div class="meta">${[c.en, YEARS.find((y) => y.n === c.year)?.label, c.instructor].filter(Boolean).join(' · ')}</div>
      ${ss
        .map((s) => {
          const r = findRoom(s.roomId);
          return `<button class="sess" data-course="${c.code}" data-room="${s.roomId}" data-day="${s.day}" data-start="${s.start}">
          <span class="badge" style="background:${KINDS[s.kind]?.color || '#666'}">${KINDS[s.kind]?.ar || s.kind}</span>
          <span><span class="when">${s.day} ${s.start}–${s.end}${s.group ? ' · ' + s.group : ''}</span><br><span class="where">${r.nameAr} · مبنى ${r.building} · ${FLOOR_NAMES[r.floor]}</span></span>
          <span class="go">وديني ${ic('go')}</span></button>`;
        })
        .join('')}</div>`);
  });
  if (!html.length) html.push(`<div class="empty">${ic('searchx','2em')}<br>مفيش نتائج<br>جرّب كلمة تانية أو شيل الفلاتر</div>`);
  box.innerHTML = html.join('');
  box.querySelectorAll('.sess').forEach((el) => {
    el.onclick = () => {
      const c = courses.find((x) => x.code === el.dataset.course);
      S.course = { c, day: el.dataset.day, start: el.dataset.start };
      showDestination(findRoom(el.dataset.room), c);
    };
  });
  box.querySelectorAll('.roomcard').forEach((el) => {
    el.onclick = () => {
      S.course = null;
      selectRoom(findRoom(el.dataset.room));
    };
  });
}
$('#q').addEventListener('input', (e) => {
  S.q = e.target.value;
  renderResults();
});

/* ======================= لوحة التفاصيل ======================= */
const ICONS = { gate: ic('door'), door: ic('landmark'), walk: ic('walk'), right: ic('right'), left: ic('left'), up: ic('up'), down: ic('down'), pin: ic('pin') };
let startKey = 'gate';

function sessionsOfRoom(roomId) {
  const out = [];
  courses.forEach((c) => c.sessions.forEach((s) => s.roomId === roomId && out.push({ c, s })));
  out.sort((a, b) => DAYS.indexOf(a.s.day) - DAYS.indexOf(b.s.day) || toMinutes(a.s.start) - toMinutes(b.s.start));
  return out;
}

function roomScheduleHTML(r) {
  const list = sessionsOfRoom(r.id);
  if (!list.length) return '<div class="empty" style="padding:10px">مفيش محاضرات متسجلة في القاعة دي في الجداول الحالية.</div>';
  return list
    .map(({ c, s }) => `<div class="sess" style="cursor:default"><span class="badge" style="background:${KINDS[s.kind]?.color}">${KINDS[s.kind]?.ar}</span><span><span class="when">${s.day} ${s.start}–${s.end}</span><br><span class="where">${c.ar} · ${YEARS.find((y) => y.n === c.year)?.label}</span></span><span></span></div>`)
    .join('');
}

function factsHTML(r) {
  return `<div class="dimline">${r.w.toFixed(1)} × ${r.d.toFixed(1)} م${r.capacity ? ` · حوالي ${r.capacity} فرد` : ''}</div>`;
}

function showRoomDetail(r) {
  $('#results').hidden = true;
  $('#sampleNote').hidden = true;
  const d = $('#detail');
  d.hidden = false;
  d.innerHTML = `<button class="back">${ic('back')} رجوع للبحث</button>
    <h3>${r.nameAr}</h3><div class="sub">${r.nameEn} · مبنى ${r.building} · ${FLOOR_NAMES[r.floor]}</div>
    ${factsHTML(r)}
    <button class="cta" id="goHere">${ic('nav')} وديني للقاعة دي</button>
    <div class="sched"><h5>${ic('calendar')} محاضرات القاعة</h5>${roomScheduleHTML(r)}</div>`;
  d.querySelector('.back').onclick = backToSearch;
  d.querySelector('#goHere').onclick = () => showDestination(r, null);
}

function showDestination(room, course) {
  S.room = room;
  const d = $('#detail');
  $('#results').hidden = true;
  $('#sampleNote').hidden = true;
  d.hidden = false;
  S.course = course ? S.course : null;
  const render = () => {
    const r = router.route(startKey, room);
    S.route = r;
    drawRoute(r);
    const mins = Math.max(1, Math.round(r.length / 75));
    d.innerHTML = `<button class="back">${ic('back')} رجوع</button>
      <div class="dest">
        <div class="dest-title">${course ? course.ar : room.nameAr}</div>
        <div class="pills"><span>${ic('building')} مبنى ${room.building}</span><span>${FLOOR_NAMES[room.floor]}</span><span>${room.nameAr}</span></div>
        ${course ? `<div class="sub">${S.course?.day || ''} ${S.course?.start || ''}</div>` : ''}
      </div>
      <button class="cta" id="tourBtn">${ic('walk')} ابدأ الجولة · ${mins} دقيقة مشي</button>
      <div class="mini-row">
        <label>من <select id="startSel">
          <option value="gate" ${startKey === 'gate' ? 'selected' : ''}>البوابة</option>
          <option value="B1" ${startKey === 'B1' ? 'selected' : ''}>مبنى 1</option>
          <option value="B2" ${startKey === 'B2' ? 'selected' : ''}>مبنى 2</option>
        </select></label>
        <button class="link" id="viewBtn">${ic('map')} على الخريطة</button>
      </div>
      <details class="stepsbox"><summary>خطوات الطريق</summary>
        <ol class="steps">${r.steps.map((s, i) => `<li data-i="${i}"><span class="ic">${ICONS[s.icon] || '•'}</span><span>${s.text}</span></li>`).join('')}</ol>
      </details>`;
    d.querySelector('.back').onclick = backToSearch;
    d.querySelector('#startSel').onchange = (e) => {
      startKey = e.target.value;
      render();
    };
    d.querySelector('#tourBtn').onclick = () => startTour(S.route);
    d.querySelector('#viewBtn').onclick = () => selectRoom(room, { openDetail: false });
    d.querySelectorAll('.steps li').forEach((li) => {
      li.onclick = () => focusStep(S.route, Number(li.dataset.i));
    });
  };
  // ادخل المبنى المستهدف ووضّح المسار
  enterBuilding(room.building, room.floor, { fly: false });
  render();
  applySelection();
  showDims(room);
  frameRoute(S.route);
}

function backToSearch() {
  stopTour(true);
  S.room = null;
  S.route = null;
  clearRoute();
  clearDims();
  applySelection();
  renderResults();
}

function focusStep(r, i) {
  const st = r.steps[i];
  if (st == null) return;
  const idx = r.nodeIdx[Math.min(st.idx ?? 0, r.nodeIdx.length - 1)];
  const p = r.points[idx];
  const t = new THREE.Vector3(p.x, p.y, p.z);
  document.querySelectorAll('.steps li').forEach((li) => li.classList.toggle('on', Number(li.dataset.i) === i));
  if (p.bld && S.mode === 'building' && p.level !== S.level) setLevel(p.level);
  tween.flyTo(camera, controls, t.clone().add(new THREE.Vector3(10, p.bld ? 24 : 40, 22)), t, 1000);
}

/* ======================= رسم المسار ======================= */
const routeGroup = new THREE.Group();
scene.add(routeGroup);
const dashTex = (() => {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 8;
  const x = c.getContext('2d');
  x.clearRect(0, 0, 64, 8);
  x.fillStyle = '#fff';
  x.fillRect(0, 0, 38, 8);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
})();
let routeParts = []; // لتحديث الظهور حسب الدور
let marker = null;

function clearRoute() {
  routeGroup.traverse((o) => o.element?.remove());
  routeGroup.clear();
  routeParts = [];
  marker = null;
}

function drawRoute(r) {
  clearRoute();
  if (!r) return;
  // قسّم المسار حسب الدور/الخارج لتحكم الظهور
  const pts = r.points;
  const segs = [];
  let cur = null;
  const keyOf = (p) => (p.bld ? `${p.bld}:${Math.round(p.level)}` : 'out');
  pts.forEach((p, i) => {
    const k = p.stair ? (cur ? cur.key : keyOf(p)) : keyOf(p);
    if (!cur || (cur.key !== k && !p.stair)) {
      if (cur) cur.pts.push(p); // وصّل بين القطع
      cur = { key: k, bld: p.bld, level: Math.round(p.level), pts: cur ? [pts[i - 1], p] : [p] };
      segs.push(cur);
    } else cur.pts.push(p);
  });
  segs.forEach((sg) => {
    if (sg.pts.length < 2) return;
    const vs = sg.pts.map((p) => new THREE.Vector3(p.x, p.y + 0.22, p.z));
    const path = new THREE.CurvePath();
    for (let i = 0; i < vs.length - 1; i++) if (vs[i].distanceTo(vs[i + 1]) > 0.01) path.add(new THREE.LineCurve3(vs[i], vs[i + 1]));
    if (!path.curves.length) return;
    const len = path.getLength();
    const geo = new THREE.TubeGeometry(path, Math.max(8, Math.round(len * 1.2)), 0.2, 6, false);
    const dash = dashTex.clone();
    dash.needsUpdate = true;
    dash.repeat.set(len / 1.6, 1);
    const flow = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: dash, color: '#22d3ee', transparent: true, depthTest: false, depthWrite: false }));
    flow.renderOrder = 30;
    const base = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#0284c7', transparent: true, opacity: 0.55, depthWrite: false }));
    base.renderOrder = 29;
    const grp = new THREE.Group();
    grp.add(base, flow);
    grp.userData = { bld: sg.bld, level: sg.level, dash };
    routeGroup.add(grp);
    routeParts.push(grp);
  });
  // نقطة البداية والوجهة
  const first = pts[0];
  const last = pts[pts.length - 1];
  const mkPin = (p, text, cls) => {
    const el = document.createElement('div');
    el.className = `pin-label ${cls}`;
    el.textContent = text;
    const o = new CSS2DObject(el);
    o.position.set(p.x, p.y + 4.2, p.z);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4, 6), new THREE.MeshBasicMaterial({ color: cls ? '#16a34a' : '#ff3d71' }));
    stem.position.set(p.x, p.y + 2.1, p.z);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), new THREE.MeshBasicMaterial({ color: cls ? '#16a34a' : '#ff3d71' }));
    ball.position.set(p.x, p.y + 0.5, p.z);
    const g = new THREE.Group();
    g.add(o, stem, ball);
    g.userData = { bld: p.bld, level: Math.round(p.level), always: !p.bld };
    routeGroup.add(g);
    routeParts.push(g);
  };
  mkPin(first, r.startKey === 'gate' ? 'البداية: البوابة' : `البداية: مبنى ${r.startKey.slice(1)}`, 'start');
  mkPin(last, r.room.nameAr, '');
  // نقطة "أنت"
  marker = new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 16), new THREE.MeshBasicMaterial({ color: '#fff' }));
  marker.renderOrder = 40;
  marker.material.depthTest = false;
  routeGroup.add(marker);
  updateRouteVisibility();
}

function updateRouteVisibility() {
  routeParts.forEach((g) => {
    const { bld, level, always } = g.userData;
    if (always || !bld) g.visible = true;
    else if (S.mode === 'tour') g.visible = true;
    else g.visible = S.mode === 'building' && S.bld === bld ? level <= S.level : true;
    if (bld && S.mode === 'building' && S.bld === bld) {
      // بنخفي الأجزاء اللي فوق الدور المعروض
      g.visible = level <= S.level;
    }
  });
}

function frameRoute(r) {
  if (!r) return;
  const room = r.room;
  const c = buildingCenter(room.building, room.floor);
  tween.flyTo(camera, controls, c.clone().add(new THREE.Vector3(16, 74, 74).multiplyScalar(fitFactor())), c, 1500);
}

/* ======================= جولة المشي (Walk-through) ======================= */
const T = { on: false, playing: true, s: 0, speed: 1, len: 0, cum: [], pts: [], look: new THREE.Vector3(), lastStep: -1, route: null, inside: null, stepAt: [] };
const EYE = 1.65;

function startTour(r) {
  if (!r) return;
  clearDims();
  S.mode = 'tour';
  tween.cancel();
  controls.enabled = false;
  T.on = true;
  T.playing = true;
  T.route = r;
  T.pts = r.points.map((p) => new THREE.Vector3(p.x, p.y, p.z));
  T.cum = [0];
  for (let i = 1; i < T.pts.length; i++) T.cum.push(T.cum[i - 1] + T.pts[i].distanceTo(T.pts[i - 1]));
  T.len = T.cum[T.cum.length - 1];
  T.s = 0;
  T.lastStep = -1;
  T.inside = null;
  T.stepAt = r.steps.map((st) => T.cum[r.nodeIdx[Math.min(st.idx ?? 0, r.nodeIdx.length - 1)]] ?? 0);
  const p0 = T.pts[0];
  const p1 = samplePath(Math.min(6, T.len));
  T.look.set(p1.x, p1.y + 1.5, p1.z);
  camera.position.set(p0.x, p0.y + EYE, p0.z);
  camera.fov = 68;
  camera.near = 0.15;
  camera.updateProjectionMatrix();
  scene.fog.density = 0.0006;
  world.setShadowFocus(p0.x, p0.z, 120);
  $('#tourbar').hidden = false;
  $('#subtitle').hidden = false;
  $('#tPlay').innerHTML = ic('pause');
  document.body.classList.add('touring');
  if (window.innerWidth < 900) $('#panel').classList.add('collapsed');
  updateRouteVisibility();
}

function samplePath(s) {
  s = Math.max(0, Math.min(T.len, s));
  let i = 1;
  while (i < T.cum.length - 1 && T.cum[i] < s) i++;
  const a = T.pts[i - 1];
  const b = T.pts[i];
  const seg = T.cum[i] - T.cum[i - 1] || 1;
  return a.clone().lerp(b, (s - T.cum[i - 1]) / seg);
}
function segIndexAt(s) {
  let i = 1;
  while (i < T.cum.length - 1 && T.cum[i] < s) i++;
  return i;
}

function stopTour(silent = false) {
  if (!T.on) return;
  T.on = false;
  controls.enabled = true;
  camera.fov = 45;
  camera.near = 0.1;
  camera.updateProjectionMatrix();
  scene.fog.density = 0.0011;
  $('#tourbar').hidden = true;
  $('#subtitle').hidden = true;
  document.body.classList.remove('touring');
  S.mode = 'campus';
  if (!silent && T.route) {
    const room = T.route.room;
    enterBuilding(room.building, room.floor, { fly: false });
    frameRoute(T.route);
    document.querySelectorAll('.steps li').forEach((li) => li.classList.remove('on'));
  }
  if (T.route) T.route = null;
}

function updateTour(dt) {
  if (!T.on) return;
  if (T.playing) {
    const idx = segIndexAt(T.s);
    const pp = T.route.points[idx];
    const speed = (pp && pp.bld ? 3.4 : 5.2) * T.speed;
    T.s = Math.min(T.len, T.s + speed * dt);
    if (T.s >= T.len) {
      T.playing = false;
      $('#tPlay').innerHTML = ic('replay');
    }
  }
  const pos = samplePath(T.s);
  const idx = segIndexAt(T.s);
  const pt = T.route.points[idx];
  const prevPt = T.route.points[idx - 1];
  const lvl = Math.round((pos.y) / FH + (pt?.stair || prevPt?.stair ? 0 : 0) - 0.0001);
  // الدور الحالي (على السلم بنحسب من الارتفاع)
  const curLevel = Math.max(0, Math.min(BLD.LEVELS - 1, Math.floor((pos.y + 0.6) / FH)));
  const inside = pt?.bld && prevPt?.bld && pt.bld === prevPt.bld ? pt.bld : null;
  const key = inside ? `${inside}:${curLevel}` : 'out';
  if (key !== T.inside) {
    T.inside = key;
    Object.values(buildings).forEach((b) => {
      if (inside && b.id === inside) {
        b.setMode('interior');
        b.showFloorsUpTo(curLevel, { tour: true, activeLevel: curLevel });
        const c = buildingCenter(b.id);
        world.setShadowFocus(c.x, c.z, 60);
      } else b.setMode('exterior');
      b.hideTag();
    });
    if (!inside) world.setShadowFocus(pos.x, pos.z, 120);
  }
  void lvl;
  // الكاميرا
  const eye = pos.clone().add(new THREE.Vector3(0, EYE, 0));
  const ahead = samplePath(T.s + (inside ? 3.5 : 9));
  const target = new THREE.Vector3(ahead.x, ahead.y + EYE - 0.1, ahead.z);
  const k = 1 - Math.exp(-dt * (inside ? 4 : 3));
  T.look.lerp(target, k);
  camera.position.copy(eye);
  camera.lookAt(T.look);
  // نقطة ال marker
  if (marker) marker.position.set(pos.x, pos.y + 0.3, pos.z);
  // شريط التقدم والترجمة
  $('#tSeek').value = Math.round((T.s / T.len) * 1000);
  let cur = 0;
  T.stepAt.forEach((a, i) => {
    if (T.s + 0.5 >= a) cur = i;
  });
  if (cur !== T.lastStep) {
    T.lastStep = cur;
    $('#subtitle').textContent = T.route.steps[cur].text;
    document.querySelectorAll('.steps li').forEach((li) => li.classList.toggle('on', Number(li.dataset.i) === cur));
  }
}
$('#tPlay').onclick = () => {
  if (T.s >= T.len - 0.01) T.s = 0;
  T.playing = !T.playing;
  $('#tPlay').innerHTML = T.playing ? ic('pause') : ic('play');
};
$('#tSpeed').onclick = () => {
  T.speed = T.speed >= 3 ? 1 : T.speed + 1;
  $('#tSpeed').textContent = `×${T.speed}`;
};
$('#tSeek').oninput = (e) => {
  T.s = (Number(e.target.value) / 1000) * T.len;
  T.playing = false;
  $('#tPlay').innerHTML = ic('play');
  T.inside = null;
};
$('#tExit').onclick = () => stopTour(false);

/* ======================= التفاعل بالماوس ======================= */
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function pick(ev, objects) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return ray.intersectObjects(objects, false)[0];
}
const exteriorTargets = () => Object.values(buildings).flatMap((b) => b.exterior.children.flatMap((c) => (c.isGroup ? c.children : [c])));

let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY, t: performance.now() }));
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  down = null;
  if (moved > 6 || S.mode === 'tour') return;
  if (S.mode === 'campus') {
    const hit = pick(e, exteriorTargets());
    const b = hit?.object.userData.building;
    if (b) enterBuilding(b, 0);
  } else if (S.mode === 'building') {
    const bd = buildings[S.bld];
    const hit = pick(e, bd.pickMeshes.filter((m) => m.userData.level === S.level));
    if (hit) {
      S.course = null;
      const room = findRoom(hit.object.userData.roomId);
      selectRoom(room, { fly: false });
    }
  }
});
let lastMove = 0;
renderer.domElement.addEventListener('pointermove', (e) => {
  const now = performance.now();
  if (now - lastMove < 40 || S.mode === 'tour') return;
  lastMove = now;
  if (S.mode === 'campus') {
    const hit = pick(e, exteriorTargets());
    const b = hit?.object.userData.building || null;
    if (b !== S.hoverB) {
      Object.values(buildings).forEach((x) => x.facadeMeshes.forEach((m) => m.material.emissive.setHex(x.id === b ? 0x3a2a08 : 0x000000)));
      S.hoverB = b;
      renderer.domElement.style.cursor = b ? 'pointer' : 'grab';
    }
  } else if (S.mode === 'building') {
    const bd = buildings[S.bld];
    const hit = pick(e, bd.pickMeshes.filter((m) => m.userData.level === S.level));
    const id = hit?.object.userData.roomId || null;
    if (id !== S.hoverRoom) {
      if (S.hoverRoom && S.hoverRoom !== S.room?.id) bd.setHoverRoom(S.hoverRoom, false);
      if (id && id !== S.room?.id) bd.setHoverRoom(id, true);
      S.hoverRoom = id;
      renderer.domElement.style.cursor = id ? 'pointer' : 'grab';
    }
  }
});

/* ======================= الاستيراد ======================= */
function setupImport() {
  $('#btnImport').onclick = () => {
    $('#modal').hidden = false;
    const codes = Object.values(BUILDINGS).flatMap((b) => b.rooms).map((r) => `<code dir="ltr" title="${r.nameAr} — ${FLOOR_NAMES[r.floor]}">${r.id}</code>`);
    $('#roomCodes').innerHTML = codes.join('');
  };
  $('#mClose').onclick = () => ($('#modal').hidden = true);
  $('#modal').onclick = (e) => e.target.id === 'modal' && ($('#modal').hidden = true);
  $('#mFile').onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const text = await f.text();
    try {
      const data = f.name.endsWith('.json') ? JSON.parse(text) : parseCSV(text);
      saveImported(data);
      courses = loadCourses();
      const n = courses.reduce((a, c) => a + c.sessions.length, 0);
      $('#modal').hidden = true;
      toast(`تم استيراد ${courses.length} مادة (${n} محاضرة)`);
      renderResults();
    } catch (err) {
      toast('الملف مش مظبوط: ' + err.message, 4000);
    }
  };
  $('#mReset').onclick = () => {
    resetImported();
    courses = loadCourses();
    $('#modal').hidden = true;
    renderResults();
    toast('رجعنا لجداول الكلية الأصلية');
  };
  $('#mSample').onclick = () => {
    const rows = ['code,name_ar,name_en,year,instructor,day,start,end,kind,room,group', 'CS101,أساسيات البرمجة,Programming Fundamentals,1,د. أحمد سمير,السبت,09:00,10:30,lecture,B1-LH1,', 'CS101,أساسيات البرمجة,Programming Fundamentals,1,د. أحمد سمير,الاثنين,11:00,12:30,lab,B1-LAB1,G1'];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + rows.join('\n')], { type: 'text/csv' }));
    a.download = 'schedule-sample.csv';
    a.click();
  };
}

/* ======================= الأساسيات ======================= */
function buildLegend() {
  $('#legend').innerHTML = ['LH', 'CR', 'LAB', 'DR', 'OFF', 'ADM'].map((t) => `<span><i style="background:${TYPES[t].color}"></i>${TYPES[t].ar}</span>`).join('');
}
$('#panelToggle').onclick = () => $('#panel').classList.toggle('collapsed');
if (window.innerWidth < 900) $('#panel').classList.add('collapsed');
$('#q').addEventListener('focus', () => $('#panel').classList.remove('collapsed'));

hydrateIcons();
buildChips();
renderResults();
buildLegend();
setupImport();

// حلقة الرسم
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const now = performance.now();
  tween.update(now);
  updateTour(dt);
  if (S.mode !== 'tour') controls.update();
  // حركة الخط المتقطع
  routeParts.forEach((g) => {
    if (g.userData.dash) g.userData.dash.offset.x -= dt * 0.9;
  });
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();

// للتجربة والتصحيح
window.__app = { S, T, buildings, enterBuilding, viewCampus, selectRoom, showDestination, startTour, router, camera, controls, findRoom, THREE };
if (new URLSearchParams(location.search).get('b')) {
  const b = Number(new URLSearchParams(location.search).get('b'));
  setTimeout(() => enterBuilding(b, Number(new URLSearchParams(location.search).get('l') || 0)), 400);
}
void GATE;
