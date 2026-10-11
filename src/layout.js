// توليد تخطيط المبنيين: الغرف، الممرات، السلالم، وشبكة المسارات
// ⚠️ توزيع القاعات والمعامل تقريبي ومبني على الفيديو — عدّله من TEMPLATES تحت
import { BLD } from './config.js';

const { CORR, FLOOR_H, LEVELS } = BLD;
const HC = CORR / 2;

// ---------- أنواع الغرف ----------
export const TYPES = {
  LH: { ar: 'قاعة محاضرات', en: 'Lecture Hall', w: 1.4, color: '#7aa7e0', numbered: true },
  CR: { ar: 'فصل', en: 'Classroom', w: 0.85, color: '#9bd0a8', numbered: true },
  LAB: { ar: 'معمل', en: 'Laboratory', w: 1.15, color: '#e0a07a', numbered: true },
  DR: { ar: 'قاعة رسم', en: 'Drawing Hall', w: 1.25, color: '#c59be0', numbered: true },
  OFF: { ar: 'مكتب أعضاء هيئة تدريس', en: 'Staff Office', w: 0.7, color: '#e0cf7a', numbered: true },
  ADM: { ar: 'إدارة', en: 'Administration', w: 0.9, color: '#e07a8f', numbered: true },
  WC: { ar: 'دورات مياه', en: 'Restrooms', w: 0.55, color: '#9aa7b0', numbered: false },
  STAIR: { ar: 'سلم', en: 'Stairs', w: 0, color: '#b8b0a0', numbered: false },
  LOBBY: { ar: 'البهو الرئيسي', en: 'Main Lobby', w: 0, color: '#e8d9b0', numbered: false },
};

// ---------- القوالب ----------
// n: غرف الجزء الشمالي (اثنتين) | o: الصف الخارجي | i: الصف الداخلي (بعد السلم)
// W = الجناح الغربي، E = الجناح الشرقي
const T = (s) => s.split(',');
const TEMPLATES = {
  1: [
    // الدور الأرضي
    { W: { n: T('ADM,ADM'), o: T('CR,LH,LH,CR'), i: T('WC,CR,LH') }, E: { n: T('ADM,OFF'), o: T('LH,LH,CR,CR'), i: T('WC,DR,DR') } },
    { W: { n: T('LH,LH'), o: T('CR,CR,LAB,LAB'), i: T('WC,LH,CR') }, E: { n: T('DR,DR'), o: T('DR,LH,CR,CR'), i: T('WC,LAB,CR') } },
    { W: { n: T('LH,LH'), o: T('CR,LAB,LAB,CR'), i: T('WC,CR,CR') }, E: { n: T('LH,DR'), o: T('DR,CR,LH,CR'), i: T('WC,LAB,LH') } },
    { W: { n: T('OFF,OFF'), o: T('CR,CR,CR,LAB'), i: T('WC,OFF,CR') }, E: { n: T('LH,LH'), o: T('LAB,CR,CR,CR'), i: T('WC,OFF,LAB') } },
  ],
  2: [
    { W: { n: T('ADM,OFF'), o: T('CR,CR,LH,CR'), i: T('WC,OFF,CR') }, E: { n: T('ADM,ADM'), o: T('LH,CR,CR,LAB'), i: T('WC,OFF,LAB') } },
    { W: { n: T('LH,LH'), o: T('LAB,LAB,CR,CR'), i: T('WC,LAB,CR') }, E: { n: T('LAB,LAB'), o: T('LH,CR,LAB,LAB'), i: T('WC,CR,LH') } },
    { W: { n: T('LAB,LAB'), o: T('LAB,LAB,LAB,CR'), i: T('WC,LH,LH') }, E: { n: T('LH,LH'), o: T('CR,LAB,LAB,LAB'), i: T('WC,CR,LAB') } },
    { W: { n: T('LH,LAB'), o: T('LAB,CR,CR,LAB'), i: T('WC,LAB,CR') }, E: { n: T('OFF,OFF'), o: T('LAB,LAB,CR,LH'), i: T('WC,OFF,OFF') } },
  ],
};

// أرقام فصول محجوزة لمعامل بتتسمى "Room NNN" في الجداول (مبنى 1)
const RESERVED = { 1: { 1: [104, 106], 2: [205] } };
// [الدور، النوع، ترتيبها جوه الدور، الاسم المستعار]
const ALIASES = {
  1: [
    [1, 'LAB', 0, 'Room 104'],
    [1, 'LAB', 1, 'Room 106'],
    [2, 'LAB', 0, 'Room 205'],
  ],
};

const OUTER_Z0 = -16.6; // بداية الصف الخارجي
const INNER_Z0 = -4; // بعد غرفة السلم
const Z_END = 30;
const NORTH_Z0 = -30;

// أبعاد الأجنحة
const WINGS = {
  W: { xa: -27, xb: -7, cx: -17, inner: 'east' },
  E: { xa: 7, xb: 27, cx: 17, inner: 'west' },
};

function splitLengths(types, z0, z1) {
  const ws = types.map((t) => TYPES[t].w || 1);
  const sum = ws.reduce((a, b) => a + b, 0);
  const total = z1 - z0;
  let z = z0;
  return types.map((t, k) => {
    const len = (total * ws[k]) / sum;
    const r = { type: t, z0: z, z1: z + len };
    z += len;
    return r;
  });
}

// ---------- بناء تخطيط مبنى ----------
export function buildLayout(bid) {
  const counters = {};
  const rooms = [];
  const floors = [];

  const nameRoom = (type, level) => {
    const t = TYPES[type];
    if (!t.numbered) return { ar: t.ar, en: t.en, num: null };
    if (type === 'CR') {
      // الفصول بترقيم الدور: 101 = أول فصل في الدور الأول
      const taken = RESERVED[bid]?.[level] || [];
      let n;
      do {
        counters[`CR${level}`] = (counters[`CR${level}`] || 0) + 1;
        n = level * 100 + counters[`CR${level}`];
      } while (taken.includes(n));
      return { ar: `فصل ${n}`, en: `Room ${n}`, num: n };
    }
    counters[type] = (counters[type] || 0) + 1;
    const n = counters[type];
    return { ar: `${t.ar} ${n}`, en: `${t.en} ${n}`, num: n };
  };

  for (let level = 0; level < LEVELS; level++) {
    const tpl = TEMPLATES[bid][level];
    const fl = { level, rooms: [], corridors: [], stairs: [], lobby: null, doors: [] };

    for (const wk of ['W', 'E']) {
      const wg = WINGS[wk];
      const cl = wg.cx - HC;
      const cr = wg.cx + HC;
      const t = tpl[wk];

      // ممر الجناح
      fl.corridors.push({ x0: cl, x1: cr, z0: OUTER_Z0, z1: Z_END, wing: wk });
      // الممر العرضي نحو البهو
      const passage =
        wg.inner === 'east'
          ? { x0: cr, x1: wg.xb, z0: OUTER_Z0, z1: -13 }
          : { x0: wg.xa, x1: cl, z0: OUTER_Z0, z1: -13 };
      fl.corridors.push({ ...passage, wing: wk, passage: true });

      // الجزء الشمالي: غرفتين
      const northRooms = [
        { rect: { x0: wg.xa, x1: wg.cx, z0: NORTH_Z0, z1: OUTER_Z0 }, door: { side: 's', at: wg.cx - 0.9 } },
        { rect: { x0: wg.cx, x1: wg.xb, z0: NORTH_Z0, z1: OUTER_Z0 }, door: { side: 's', at: wg.cx + 0.9 } },
      ];
      t.n.forEach((type, k) => addRoom(type, northRooms[k].rect, northRooms[k].door, wk, 'n'));

      // الصف الخارجي
      const outerX = wg.inner === 'east' ? { x0: wg.xa, x1: cl, doorSide: 'e' } : { x0: cr, x1: wg.xb, doorSide: 'w' };
      splitLengths(t.o, OUTER_Z0, Z_END).forEach((s) =>
        addRoom(s.type, { x0: outerX.x0, x1: outerX.x1, z0: s.z0, z1: s.z1 }, { side: outerX.doorSide, at: (s.z0 + s.z1) / 2 }, wk, 'o'),
      );

      // الصف الداخلي: سلم ثم غرف
      const innerX = wg.inner === 'east' ? { x0: cr, x1: wg.xb, doorSide: 'w' } : { x0: wg.xa, x1: cl, doorSide: 'e' };
      const stairRect = { x0: innerX.x0, x1: innerX.x1, z0: -13, z1: INNER_Z0 };
      const stair = {
        id: `B${bid}-S${wk}`,
        wing: wk,
        rect: stairRect,
        door: { side: innerX.doorSide, at: stairRect.z0 + 0.8 },
      };
      fl.stairs.push(stair);
      fl.doors.push({ rect: stairRect, door: stair.door });
      splitLengths(t.i, INNER_Z0, Z_END).forEach((s) =>
        addRoom(s.type, { x0: innerX.x0, x1: innerX.x1, z0: s.z0, z1: s.z1 }, { side: innerX.doorSide, at: (s.z0 + s.z1) / 2 }, wk, 'i'),
      );
    }

    // البهو
    fl.lobby = { x0: -7, x1: 7, z0: NORTH_Z0, z1: -13 };
    floors.push(fl);

    function addRoom(type, rect, door, wing, row) {
      const nm = nameRoom(type, level);
      const room = {
        id: `B${bid}-${type}${nm.num ?? ''}${nm.num ? '' : `-F${level}${wing}${row}`}`,
        building: bid,
        floor: level,
        type,
        wing,
        nameAr: nm.ar,
        nameEn: nm.en,
        rect,
        door,
        w: rect.x1 - rect.x0,
        d: rect.z1 - rect.z0,
        cx: (rect.x0 + rect.x1) / 2,
        cz: (rect.z0 + rect.z1) / 2,
      };
      room.area = room.w * room.d;
      room.capacity = capacityOf(room);
      fl.rooms.push(room);
      rooms.push(room);
      fl.doors.push({ rect, door });
    }
  }

  (ALIASES[bid] || []).forEach(([lv, type, k, alias]) => {
    const r = floors[lv].rooms.filter((x) => x.type === type)[k];
    if (r) {
      r.alias = alias;
      r.nameAr += ` (${alias})`;
      r.nameEn += ` (${alias})`;
    }
  });
  const graph = buildGraph(bid, floors);
  return { id: bid, floors, rooms, graph, stairVoids: stairVoids(floors) };
}

function capacityOf(r) {
  switch (r.type) {
    case 'LH':
      return Math.round(r.area / 1.1);
    case 'LAB':
      return Math.round(r.area / 3.2);
    case 'DR':
      return Math.round(r.area / 2.6);
    case 'CR':
      return Math.round(r.area / 1.8);
    default:
      return 0;
  }
}

// ---------- السلالم ----------
// المنحدر: ذهاب وإياب (دورتين) داخل غرفة السلم. نرجع المسار ثلاثي الأبعاد لكل دور.
export function stairGeometry(stair) {
  const r = stair.rect;
  const cxm = (r.x0 + r.x1) / 2;
  const zA = r.z0 + 1.6; // بداية المرحلة (الطرف الشمالي) — شمالها بسطة الدخول
  const zB = r.z1 - 0.4;
  const width = 2.0;
  const landing = 1.4;
  const xW = cxm - width - 0.15; // بداية العمود الغربي
  const xE = cxm + 0.15; // بداية العمود الشرقي
  const nearWest = stair.door.side === 'w';
  const colNear = nearWest ? xW : xE;
  const colFar = nearWest ? xE : xW;
  return {
    xW,
    xE,
    width,
    zA,
    zB,
    landing,
    zLand0: zB - landing,
    xsNear: colNear + width / 2, // عمود المرحلة الأولى (الأقرب للباب)
    xsFar: colFar + width / 2,
    colNear,
    colFar,
  };
}

function stairVoids(floors) {
  // فتحات السلالم في البلاطات
  return floors[0].stairs.map((s) => {
    const g = stairGeometry(s);
    return { wing: s.wing, x0: g.xW - 0.1, x1: g.xE + g.width + 0.1, z0: g.zA, z1: g.zB + 0.15 };
  });
}

// ---------- شبكة المسارات الداخلية ----------
// عقدة: { id, bld, level, x, z, kind, label? }
function buildGraph(bid, floors) {
  const nodes = new Map();
  const edges = new Map();
  const add = (id, level, x, z, kind, extra = {}) => {
    nodes.set(id, { id, bld: bid, level, x, z, kind, ...extra });
    edges.set(id, []);
    return id;
  };
  const link = (a, b, via = null, cost = null) => {
    const na = nodes.get(a);
    const nb = nodes.get(b);
    const c = cost ?? Math.hypot(na.x - nb.x, na.z - nb.z) + (na.level !== nb.level ? 8 : 0);
    edges.get(a).push({ to: b, cost: c, via });
    edges.get(b).push({ to: a, cost: c, via: via ? [...via].reverse() : null });
  };

  floors.forEach((fl) => {
    const L = fl.level;
    const key = (s) => `${bid}:${L}:${s}`;
    const passZ = (OUTER_Z0 + -13) / 2; // -14.8
    // بهو
    add(key('lobby'), L, 0, passZ, 'lobby');
    if (L === 0) add(key('entrance'), 0, 0, -13.2, 'entrance');
    for (const wk of ['W', 'E']) {
      const wg = WINGS[wk];
      // نقطة الالتقاء بين الممر العرضي وممر الجناح
      add(key(`${wk}j`), L, wg.cx, passZ, 'junction', { wing: wk });
      link(key('lobby'), key(`${wk}j`));
      // نقط على ممر الجناح (عند كل باب)
      const pts = [];
      const rowsHere = fl.rooms.filter((r) => r.wing === wk && (r.door.side === 'e' || r.door.side === 'w'));
      rowsHere.forEach((r) => pts.push({ z: r.door.at, id: r.id }));
      fl.stairs.filter((s) => s.wing === wk).forEach((s) => pts.push({ z: s.door.at, id: s.id }));
      // الغرف الشمالية: بابها على z = OUTER_Z0 عند الممر (نرجع عقدة على الممر)
      const northRooms = fl.rooms.filter((r) => r.wing === wk && r.door.side === 's');
      pts.sort((a, b) => a.z - b.z);
      // شريط الممر: junction (-14.8) هو مرجع؛ نبني سلسلة مرتبة بالـ z
      const chain = [{ id: key(`${wk}j`), z: passZ }];
      pts.forEach((p) => {
        const cid = key(`${wk}c${p.id}`);
        add(cid, L, wg.cx, p.z, 'corridor', { wing: wk });
        chain.push({ id: cid, z: p.z });
      });
      chain.sort((a, b) => a.z - b.z);
      for (let k = 0; k < chain.length - 1; k++) link(chain[k].id, chain[k + 1].id);
      // الغرف
      [...rowsHere, ...northRooms].forEach((r) => {
        const rid = key(r.id);
        if (r.door.side === 's') {
          // الباب على الجدار الجنوبي للغرفة الشمالية — يتصل بالممر عند طرفه الشمالي
          add(rid, L, r.door.at, OUTER_Z0 + 0.2, 'door', { room: r.id, wing: wk });
          const cid = key(`${wk}cn${r.id}`);
          add(cid, L, wg.cx, OUTER_Z0 + 1.0, 'corridor', { wing: wk });
          link(rid, cid);
          link(cid, key(`${wk}j`));
        } else {
          add(rid, L, r.door.side === 'e' ? WINGS[wk].cx - HC : WINGS[wk].cx + HC, r.door.at, 'door', { room: r.id, wing: wk });
          link(rid, key(`${wk}c${r.id}`));
        }
      });
      // السلم
      fl.stairs
        .filter((s) => s.wing === wk)
        .forEach((s) => {
          const sid = key(s.id);
          add(sid, L, s.door.side === 'w' ? s.rect.x0 + 0.2 : s.rect.x1 - 0.2, s.door.at, 'stairdoor', { wing: wk, stair: s.id });
          link(sid, key(`${wk}c${s.id}`));
        });
    }
    if (L === 0) link(key('entrance'), key('lobby'));
  });

  // الربط الرأسي بين الأدوار عبر السلالم
  for (let L = 0; L < floors.length - 1; L++) {
    floors[L].stairs.forEach((s) => {
      const g = stairGeometry(s);
      const a = `${bid}:${L}:${s.id}`;
      const b = `${bid}:${L + 1}:${s.id}`;
      // مسار المنحدر بالإحداثيات المحلية (y نسبي للدور L)
      const via = stairPath(g);
      link(a, b, via);
    });
  }
  return { nodes, edges };
}

// مسار السلم: ينطلق من باب السلم على دور L ويصعد لباب السلم على دور L+1
export function stairPath(g) {
  const yMid = FLOOR_H / 2;
  return [
    { x: g.xsNear, z: g.zA - 0.7, y: 0 },
    { x: g.xsNear, z: g.zA, y: 0 },
    { x: g.xsNear, z: g.zLand0, y: yMid },
    { x: g.xsNear, z: g.zLand0 + 0.7, y: yMid },
    { x: g.xsFar, z: g.zLand0 + 0.7, y: yMid },
    { x: g.xsFar, z: g.zA, y: FLOOR_H },
    { x: g.xsFar, z: g.zA - 0.7, y: FLOOR_H },
  ];
}

export const BUILDINGS = { 1: buildLayout(1), 2: buildLayout(2) };

export function findRoom(id) {
  for (const b of Object.values(BUILDINGS)) {
    const r = b.rooms.find((x) => x.id === id);
    if (r) return r;
  }
  return null;
}

export function pickRoom(bld, type, n) {
  const list = BUILDINGS[bld].rooms.filter((r) => r.type === type);
  if (!list.length) return null;
  return list[(n - 1) % list.length];
}
