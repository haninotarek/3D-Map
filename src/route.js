// المسارات: شبكة خارجية (من البوابة للمبنيين) + الشبكات الداخلية → Dijkstra → اتجاهات بالعربي
import { BUILDINGS } from './layout.js';
import { BUILDINGS_POS, GATE, BLD, FLOOR_NAMES, px2world } from './config.js';

const FH = BLD.FLOOR_H;

export function createRouter() {
  const nodes = new Map();
  const edges = new Map();

  const addNode = (id, data) => {
    nodes.set(id, { id, ...data });
    edges.set(id, []);
  };
  const link = (a, b, cost, via = null, base = 0) => {
    edges.get(a).push({ to: b, cost, via, base });
    edges.get(b).push({ to: a, cost, via: via ? [...via].reverse() : null, base });
  };
  const wdist = (a, b) => Math.hypot(nodes.get(a).wx - nodes.get(b).wx, nodes.get(a).wz - nodes.get(b).wz);

  /* ----- الشبكة الخارجية ----- */
  const out = (id, px, py, extra = {}) => {
    const p = px2world(px, py);
    addNode(id, { wx: p.x, wz: p.z, wy: 0, bld: null, level: 0, kind: 'path', ...extra });
  };
  addNode('gate', { wx: GATE.x, wz: GATE.z, wy: 0, bld: null, level: 0, kind: 'gate' });
  out('o1', 422, 1000);
  out('o2', 422, 900);
  out('o3', 420, 700);
  out('o4', 450, 600);
  out('o6', 600, 585);
  [1, 2].forEach((b) => {
    const p = BUILDINGS_POS[b];
    addNode(`B${b}out`, { wx: p.x, wz: p.z + 34, wy: 0, bld: null, level: 0, kind: 'bout', target: b });
  });
  const chain = ['gate', 'o1', 'o2', 'o3', 'o4'];
  for (let i = 0; i < chain.length - 1; i++) link(chain[i], chain[i + 1], wdist(chain[i], chain[i + 1]));
  // أي مبنى هو الأقرب لـ o4؟ نربط كلاً بالطريق
  const left = BUILDINGS_POS[1].x < BUILDINGS_POS[2].x ? 1 : 2;
  const right = left === 1 ? 2 : 1;
  link('o4', `B${left}out`, wdist('o4', `B${left}out`));
  link('o4', 'o6', wdist('o4', 'o6'));
  link('o6', `B${right}out`, wdist('o6', `B${right}out`));

  /* ----- الشبكات الداخلية ----- */
  [1, 2].forEach((b) => {
    const pos = BUILDINGS_POS[b];
    const g = BUILDINGS[b].graph;
    g.nodes.forEach((n, id) => addNode(id, { ...n, wx: pos.x + n.x, wz: pos.z + n.z, wy: n.level * FH, bld: b, lx: n.x, lz: n.z }));
    g.edges.forEach((list, id) => {
      list.forEach((e) => {
        if (id < e.to) {
          // أضف مرة واحدة فقط
          const na = nodes.get(id);
          const nb = nodes.get(e.to);
          const base = Math.min(na.level, nb.level);
          let via = e.via;
          if (via) {
            // via مخزّن بالإحداثيات المحلية — نحوله لعالمي
            via = via.map((v) => ({ wx: pos.x + v.x, wz: pos.z + v.z, wy: base * FH + v.y }));
          }
          const cost = e.cost;
          edges.get(id).push({ to: e.to, cost, via });
          edges.get(e.to).push({ to: id, cost, via: via ? [...via].reverse() : null });
        }
      });
    });
    // ربط الفناء بمدخل المبنى
    link(`B${b}out`, `${b}:0:entrance`, wdist(`B${b}out`, `${b}:0:entrance`));
  });

  /* ----- Dijkstra ----- */
  function shortest(from, to) {
    const dist = new Map([[from, 0]]);
    const prev = new Map();
    const done = new Set();
    const queue = [from];
    while (queue.length) {
      queue.sort((a, b) => dist.get(a) - dist.get(b));
      const u = queue.shift();
      if (done.has(u)) continue;
      done.add(u);
      if (u === to) break;
      for (const e of edges.get(u)) {
        const nd = dist.get(u) + e.cost;
        if (nd < (dist.get(e.to) ?? Infinity)) {
          dist.set(e.to, nd);
          prev.set(e.to, { from: u, edge: e });
          queue.push(e.to);
        }
      }
    }
    if (!dist.has(to)) return null;
    const ids = [to];
    const used = [];
    let c = to;
    while (c !== from) {
      const p = prev.get(c);
      used.unshift(p.edge);
      ids.unshift(p.from);
      c = p.from;
    }
    return { ids, edges: used, length: dist.get(to) };
  }

  /** نقطة بداية: 'gate' | 'B1' | 'B2' ، نقطة النهاية: معرّف غرفة */
  function route(startKey, room) {
    const from = startKey === 'gate' ? 'gate' : `${startKey.slice(1)}:0:entrance`;
    const to = `${room.building}:${room.floor}:${room.id}`;
    if (!nodes.has(to)) return null;
    const r = shortest(from, to);
    if (!r) return null;
    // نقاط ثلاثية الأبعاد
    const points = [];
    const nodeIdx = [];
    r.ids.forEach((id, i) => {
      const n = nodes.get(id);
      nodeIdx.push(points.length);
      points.push({ x: n.wx, y: n.wy, z: n.wz, bld: n.bld, level: n.level, id });
      if (i < r.ids.length - 1) {
        const e = r.edges[i];
        if (e.via) {
          const lv = e.via.map((v) => ({ x: v.wx, y: v.wy, z: v.wz, bld: n.bld, level: v.wy / FH, id: null, stair: true }));
          points.push(...lv);
        }
      }
    });
    return { ...r, points, nodeIdx, startKey, room, steps: directions(r, startKey, room) };
  }

  function directions(r, startKey, room) {
    const steps = [];
    const ns = r.ids.map((id) => nodes.get(id));
    const D = (a, b) => Math.hypot(a.wx - b.wx, a.wz - b.wz);
    const fmt = (m) => `${Math.max(5, Math.round(m / 5) * 5)} متر`;
    const bname = (n) => `مبنى ${n}`;
    const target = room.building;

    // البداية
    steps.push({ icon: startKey === 'gate' ? 'gate' : 'door', text: startKey === 'gate' ? 'ابدأ من البوابة الرئيسية للكلية.' : `ابدأ من المدخل الرئيسي لـ${bname(startKey.slice(1))}.`, at: 0 });

    // الجزء الخارجي: لحد B?out
    const boutIdx = ns.findIndex((n) => n.kind === 'bout');
    if (boutIdx > 0) {
      let d = 0;
      for (let i = 0; i < boutIdx; i++) d += D(ns[i], ns[i + 1]);
      steps.push({ icon: 'walk', text: `امشِ في الطريق الرئيسي حوالي ${fmt(d)} ناحية ${bname(target)} (من الجهة الجنوبية للمبنى).`, at: r.ids.length ? 1 : 0, idx: 1 });
    }
    // من الفناء للمدخل
    const entIdx = ns.findIndex((n) => n.kind === 'entrance');
    if (boutIdx >= 0 && entIdx > boutIdx) {
      steps.push({ icon: 'walk', text: `ادخل الفناء اللي بين الجناحين وامشِ حوالي ${fmt(D(ns[boutIdx], ns[entIdx]))} لحد المدخل الرئيسي (الأعمدة الكبيرة والباب الزجاجي).`, idx: boutIdx });
    }
    if (entIdx >= 0) steps.push({ icon: 'door', text: `ادخل من المدخل الرئيسي لـ${bname(target)} (الدور الأرضي) — هتلاقي البهو وكاونتر الاستقبال.`, idx: entIdx });

    // الجزء الداخلي
    let heading = { x: 0, z: -1 };
    const startIn = Math.max(entIdx, 0) === 0 && ns[0].bld ? 0 : entIdx;
    let i = startIn >= 0 ? startIn : 0;
    let lastTurnIdx = i;
    const wingSide = (w) => (w === 'W' ? 'الأيسر' : 'الأيمن');
    const turn = (h1, h2) => (h1.x * h2.z - h1.z * h2.x > 0 ? 'يمين' : 'شمال');
    while (i < ns.length - 1) {
      const a = ns[i];
      const b = ns[i + 1];
      const hv = { x: b.wx - a.wx, z: b.wz - a.wz };
      const hl = Math.hypot(hv.x, hv.z);
      if (b.kind === 'junction' && a.kind === 'lobby') {
        const dir = turn(heading, hv);
        steps.push({ icon: dir === 'يمين' ? 'right' : 'left', text: `من البهو اتجه ${dir} ناحية الجناح ${wingSide(b.wing)}.`, idx: i + 1 });
        heading = { x: hv.x / hl, z: hv.z / hl };
        lastTurnIdx = i + 1;
      } else if (b.kind === 'stairdoor' && a.level === b.level && !(ns[i + 2] && ns[i + 2].kind === 'stairdoor' && ns[i + 2].level === b.level)) {
        // وصلنا باب السلم
        let j = i + 1;
        const fromL = b.level;
        while (j + 1 < ns.length && ns[j + 1].kind === 'stairdoor' && ns[j + 1].stair === b.stair && ns[j + 1].level !== ns[j].level) j++;
        const toL = ns[j].level;
        const dwalk = D(ns[lastTurnIdx], b);
        if (toL !== fromL) {
          steps.push({ icon: 'walk', text: `امشِ في الممر حوالي ${fmt(dwalk)} وادخل أول باب سلم.`, idx: i + 1 });
          steps.push({ icon: toL > fromL ? 'up' : 'down', text: `${toL > fromL ? 'اطلع' : 'انزل'} السلم من ${FLOOR_NAMES[fromL]} إلى ${FLOOR_NAMES[toL]}.`, idx: j });
          const nx = ns[j + 1];
          if (nx) {
            heading = { x: nx.wx - ns[j].wx, z: nx.wz - ns[j].wz };
            const hh = Math.hypot(heading.x, heading.z) || 1;
            heading = { x: heading.x / hh, z: heading.z / hh };
          }
          lastTurnIdx = j;
          i = j;
          continue;
        }
      } else if (b.kind === 'door' && i + 1 === ns.length - 1) {
        // آخر خطوة: الباب
        const pv = ns[i - 1];
        const prevDir = pv && D(pv, a) > 0.01 ? { x: (a.wx - pv.wx) / D(pv, a), z: (a.wz - pv.wz) / D(pv, a) } : heading;
        const rv = { x: room.cx - b.lx, z: room.cz - b.lz };
        const side = turn(prevDir, rv);
        const dwalk = D(ns[lastTurnIdx], a);
        // لو الباب في طرف الممر الشمالي
        steps.push({ icon: 'walk', text: `كمل في الممر حوالي ${fmt(Math.max(dwalk, 3))}.`, idx: i });
        steps.push({ icon: side === 'يمين' ? 'right' : 'left', text: `${room.nameAr} (${room.nameEn}) على ${side === 'يمين' ? 'يمينك' : 'شمالك'} — وصلت!`, idx: i + 1 });
      }
      i++;
    }
    if (ns[ns.length - 1].kind !== 'door') steps.push({ icon: 'pin', text: 'وصلت!', idx: ns.length - 1 });
    return steps;
  }

  return { nodes, edges, route };
}
