// بيانات الجداول — ⚠️ بيانات تجريبية (placeholder) لحد ما تضيف جداولكم الحقيقية
// الصيغة: كل مادة لها جلسات، والغرفة بصيغة [رقم المبنى, نوع الغرفة, رقمها]
// أنواع الغرف: LH قاعة محاضرات | CR فصل | LAB معمل | DR قاعة رسم
// تقدر تستورد جدول حقيقي من زر "استيراد" (JSON أو CSV) — شوف README
import { pickRoom, findRoom } from './layout.js';

export const DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
export const YEARS = [
  { n: 1, label: 'الفرقة الأولى' },
  { n: 2, label: 'الفرقة الثانية' },
  { n: 3, label: 'الفرقة الثالثة' },
  { n: 4, label: 'الفرقة الرابعة' },
];
export const KINDS = {
  lecture: { ar: 'محاضرة', color: '#4f8cff' },
  section: { ar: 'سكشن', color: '#2fbf8f' },
  lab: { ar: 'معمل', color: '#ff9b4a' },
};

const S = (day, start, end, kind, room, group) => ({ day, start, end, kind, room, group });

// ---------- الفرقة الثالثة — جدول حقيقي (Fall 2026-2027، مبنى هندسة 2) ----------
const P = { 1: ['10:00', '11:15'], 2: ['11:20', '12:30'], 3: ['12:35', '13:45'], 4: ['13:50', '15:00'] };
const slot = (day, p, kind, room, group) => S(day, P[p][0], P[p][1], kind, room, group);
const H = (n) => ['B2-LH' + n];
const LAB = (n) => ['B2-LAB' + n];
const Y3 = { year: 3, instructor: '', real: true };
const LEVEL3 = [
  { ...Y3, code: 'L3-SOC', ar: 'قضايا مجتمعية', en: 'Societal Issues', sessions: [slot('الاثنين', 2, 'lecture', 'B2-CR101', 'مجموعة أسبوعية: GA (1,2) / GB (3,4)')] },
  {
    ...Y3, code: 'L3-ALG', ar: 'تصميم وتحليل الخوارزميات', en: 'Algorithms Design and Analysis',
    sessions: [slot('الاثنين', 3, 'lecture', H(4)[0]), slot('الثلاثاء', 1, 'section', H(2)[0], 'سكشن 3,4'), slot('الثلاثاء', 4, 'section', H(4)[0], 'سكشن 1,2')],
  },
  { ...Y3, code: 'L3-HIS', ar: 'مقدمة في تاريخ الحضارات', en: 'Introduction to History of Civilizations', sessions: [slot('الاثنين', 4, 'lecture', H(2)[0])] },
  {
    ...Y3, code: 'L3-NET', ar: 'شبكات الحاسب', en: 'Computer Networks',
    sessions: [
      slot('الثلاثاء', 1, 'lab', LAB(1)[0], 'سكشن/لاب 1'),
      slot('الثلاثاء', 2, 'lab', LAB(1)[0], 'سكشن/لاب 3'),
      slot('الثلاثاء', 3, 'lab', LAB(2)[0], 'سكشن/لاب 2'),
      slot('الثلاثاء', 4, 'lab', LAB(2)[0], 'سكشن/لاب 4'),
      slot('الأربعاء', 2, 'lecture', H(2)[0]),
    ],
  },
  {
    ...Y3, code: 'L3-TOP', ar: 'موضوعات مختارة في علوم الحاسب', en: 'Selected Topics in C.S.',
    sessions: [
      slot('الثلاثاء', 1, 'lab', LAB(2)[0], 'سكشن/لاب 2'),
      slot('الثلاثاء', 2, 'lab', LAB(2)[0], 'سكشن/لاب 4'),
      slot('الثلاثاء', 3, 'lab', LAB(1)[0], 'سكشن/لاب 1'),
      slot('الثلاثاء', 4, 'lab', LAB(1)[0], 'سكشن/لاب 3'),
      slot('الأربعاء', 3, 'lecture', H(4)[0]),
    ],
  },
  {
    ...Y3, code: 'L3-AI', ar: 'الذكاء الاصطناعي', en: 'Artificial Intelligence',
    sessions: [slot('الثلاثاء', 2, 'section', H(4)[0], 'سكشن 1,2'), slot('الثلاثاء', 3, 'section', H(4)[0], 'سكشن 3,4'), slot('الأربعاء', 1, 'lecture', H(2)[0])],
  },
];

// ---------- الفرقة الثانية — جدول حقيقي (Fall 2026-2027) ----------
// الخانات اللي مفيهاش اسم مبنى افترضنا إنها مبنى 2، وقاعة الرسم 3 في مبنى 1 (مفيش قاعات رسم في مبنى 2)
const Y2 = { year: 2, instructor: '' };
const rm = (kind, b, n) => `B${b}-${kind}${n}`;
const L2 = (code, ar, en, rows) => ({
  ...Y2,
  code,
  ar,
  en,
  sessions: rows.map(([day, p, kind, room, group]) => slot(day, p, kind, room, group)),
});
const LEVEL2 = [
  L2('L2-MA3', 'رياضيات 3', 'Mathematics III', [
    ['الأحد', 1, 'lecture', rm('LH', 2, 1), 'سكشن 1-4'],
    ['الأحد', 2, 'lecture', rm('LH', 2, 1), 'سكشن 5-8'],
    ['الأحد', 1, 'section', rm('LH', 2, 3), 'سكشن 5,6'],
    ['الأحد', 2, 'section', rm('LH', 2, 3), 'سكشن 1,2'],
    ['الأحد', 4, 'section', rm('LH', 2, 1), 'سكشن 3,4'],
    ['الاثنين', 4, 'section', rm('LAB', 2, 2), 'سكشن 7,8'],
  ]),
  L2('L2-LOG', 'منطق', 'Logic', [
    ['الأحد', 1, 'lab', rm('LAB', 2, 2), 'سكشن/لاب 7'],
    ['الأحد', 3, 'section', rm('LH', 2, 3), 'سكشن/لاب 1,2'],
    ['الأحد', 3, 'lab', rm('LAB', 2, 2), 'سكشن/لاب 8'],
    ['الاثنين', 4, 'section', rm('LH', 2, 4), 'سكشن/لاب 5,6'],
    ['الأربعاء', 4, 'section', rm('LH', 2, 2), 'سكشن/لاب 3,4'],
  ]),
  L2('L2-NUM', 'تحليل عددي', 'Numerical Analysis', [
    ['الأحد', 3, 'section', rm('LH', 2, 1), 'سكشن/لاب 3,4'],
    ['الأحد', 3, 'lab', rm('DR', 1, 3), 'سكشن/لاب 5'],
    ['الأحد', 4, 'lab', rm('DR', 1, 3), 'سكشن/لاب 6'],
    ['الاثنين', 3, 'section', rm('LH', 2, 2), 'سكشن/لاب 7,8'],
    ['الثلاثاء', 1, 'lecture', rm('LH', 2, 3), 'سكشن 5-8'],
    ['الثلاثاء', 2, 'lecture', rm('LH', 2, 3), 'سكشن 1-4'],
    ['الأربعاء', 4, 'section', rm('LH', 2, 4), 'سكشن/لاب 1,2'],
  ]),
  L2('L2-SAD', 'تحليل وتصميم النظم', 'Systems Analysis and Design', [
    ['الأحد', 4, 'section', rm('LH', 2, 3), 'سكشن/لاب 7,8'],
    ['الاثنين', 3, 'section', rm('CR', 2, 101), 'سكشن/لاب 3,4'],
    ['الاثنين', 4, 'section', rm('CR', 2, 101), 'سكشن/لاب 1,2'],
    ['الثلاثاء', 1, 'lecture', rm('LH', 2, 1), 'سكشن 1-4'],
    ['الثلاثاء', 2, 'lecture', rm('LH', 2, 1), 'سكشن 5-8'],
    ['الأربعاء', 4, 'section', rm('CR', 2, 101), 'سكشن/لاب 5,6'],
  ]),
  L2('L2-OOP', 'البرمجة كائنية التوجه', 'Object-Oriented Programming', [
    ['الاثنين', 1, 'lecture', rm('LH', 2, 2), 'سكشن 1-4'],
    ['الاثنين', 2, 'lecture', rm('LH', 2, 2), 'سكشن 5-8'],
    ['الثلاثاء', 3, 'lab', rm('LAB', 1, 2), 'سكشن/لاب 1'],
    ['الثلاثاء', 3, 'lab', rm('DR', 1, 3), 'سكشن/لاب 2'],
    ['الثلاثاء', 4, 'lab', rm('LAB', 1, 2), 'سكشن/لاب 3'],
    ['الثلاثاء', 4, 'lab', rm('DR', 1, 3), 'سكشن/لاب 4'],
    ['الأربعاء', 1, 'lab', rm('LAB', 1, 2), 'سكشن/لاب 5'],
    ['الأربعاء', 1, 'lab', rm('DR', 1, 3), 'سكشن/لاب 6'],
    ['الأربعاء', 3, 'lab', rm('LAB', 1, 2), 'سكشن/لاب 7'],
    ['الأربعاء', 3, 'lab', rm('DR', 1, 3), 'سكشن/لاب 8'],
  ]),
  L2('L2-LD', 'تصميم منطقي', 'Logic Design', [
    ['الاثنين', 1, 'lecture', rm('LH', 2, 4), 'سكشن 5-8'],
    ['الاثنين', 2, 'lecture', rm('LH', 2, 4), 'سكشن 1-4'],
  ]),
  L2('L2-CS', 'مهارات الحاسب', 'Computer Skills', [['الأربعاء', 2, 'lecture', rm('LH', 2, 4), 'سكشن 1-8']]),
];

const SAMPLE = [
  // ---------- الفرقة الأولى (مبنى 1) ----------
  { code: 'CS101', ar: 'أساسيات البرمجة', en: 'Programming Fundamentals', year: 1, instructor: 'د. أحمد سمير', sessions: [S('السبت', '09:00', '10:30', 'lecture', [1, 'LH', 1]), S('الاثنين', '11:00', '12:30', 'lab', [1, 'LAB', 1], 'G1')] },
  { code: 'MA101', ar: 'تفاضل وتكامل 1', en: 'Calculus 1', year: 1, instructor: 'د. منى عبد الله', sessions: [S('السبت', '11:00', '12:30', 'lecture', [1, 'LH', 2]), S('الثلاثاء', '09:00', '10:30', 'section', [1, 'CR', 3])] },
  { code: 'PH101', ar: 'فيزياء عامة', en: 'General Physics', year: 1, instructor: 'د. هاني فؤاد', sessions: [S('الأحد', '09:00', '10:30', 'lecture', [1, 'LH', 3]), S('الأربعاء', '11:00', '12:30', 'lab', [1, 'LAB', 2], 'G1')] },
  { code: 'IT101', ar: 'مقدمة في تقنية المعلومات', en: 'Intro to IT', year: 1, instructor: 'د. سارة إبراهيم', sessions: [S('الأحد', '11:00', '12:30', 'lecture', [1, 'LH', 1]), S('الخميس', '09:00', '10:30', 'section', [1, 'CR', 1])] },
  { code: 'EN101', ar: 'لغة إنجليزية', en: 'Technical English', year: 1, instructor: 'أ. نهى حسن', sessions: [S('الاثنين', '09:00', '10:30', 'lecture', [1, 'CR', 5])] },
  { code: 'DR101', ar: 'رسم هندسي', en: 'Engineering Drawing', year: 1, instructor: 'م. طارق السيد', sessions: [S('الثلاثاء', '11:00', '14:00', 'lab', [1, 'DR', 3]), S('الخميس', '11:00', '12:30', 'lecture', [1, 'LH', 2])] },
  { code: 'LD101', ar: 'تصميم منطقي', en: 'Logic Design', year: 1, instructor: 'د. وليد مصطفى', sessions: [S('الأربعاء', '09:00', '10:30', 'lecture', [1, 'LH', 4]), S('السبت', '13:00', '14:30', 'lab', [1, 'LAB', 3], 'G2')] },

  ...LEVEL2,
  ...LEVEL3,

  // ---------- الفرقة الرابعة (مبنى 2) ----------
  { code: 'CS401', ar: 'تعلم الآلة', en: 'Machine Learning', year: 4, instructor: 'د. كريم صلاح', sessions: [S('السبت', '09:00', '10:30', 'lecture', [2, 'LH', 4]), S('الأحد', '11:00', '12:30', 'lab', [2, 'LAB', 7], 'G1')] },
  { code: 'CS402', ar: 'أمن المعلومات', en: 'Information Security', year: 4, instructor: 'د. ماجد سعيد', sessions: [S('الأحد', '13:00', '14:30', 'lecture', [2, 'LH', 2]), S('الثلاثاء', '09:00', '10:30', 'lab', [2, 'LAB', 3], 'G2')] },
  { code: 'CS403', ar: 'الحوسبة السحابية', en: 'Cloud Computing', year: 4, instructor: 'د. لمياء حمدي', sessions: [S('الاثنين', '11:00', '12:30', 'lecture', [2, 'LH', 3]), S('الأربعاء', '11:00', '12:30', 'lab', [2, 'LAB', 2], 'G1')] },
  { code: 'CS404', ar: 'معالجة الصور', en: 'Image Processing', year: 4, instructor: 'د. أحمد سمير', sessions: [S('الثلاثاء', '11:00', '12:30', 'lecture', [2, 'LH', 1])] },
  { code: 'CS499', ar: 'مشروع التخرج', en: 'Graduation Project', year: 4, instructor: 'لجنة المشاريع', sessions: [S('الخميس', '09:00', '12:30', 'section', [2, 'CR', 1])] },
];

// تحويل الجلسات إلى صيغة موحّدة بمعرّف الغرفة
function normalize(courses) {
  const out = [];
  courses.forEach((c) => {
    const sessions = [];
    c.sessions.forEach((s) => {
      let room = null;
      if (Array.isArray(s.room)) room = pickRoom(s.room[0], s.room[1], s.room[2]);
      else if (typeof s.room === 'string') room = findRoom(s.room);
      if (!room) return;
      sessions.push({ day: s.day, start: s.start, end: s.end, kind: s.kind || 'lecture', group: s.group || '', roomId: room.id });
    });
    out.push({ code: c.code, ar: c.ar, en: c.en || '', year: Number(c.year), instructor: c.instructor || '', sessions });
  });
  return out;
}

const KEY = 'campus3d.schedule.v1';
export function loadCourses() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {}
  return normalize(SAMPLE);
}
export const isSample = () => {
  try {
    return !localStorage.getItem(KEY);
  } catch {
    return true;
  }
};
export function saveImported(courses) {
  localStorage.setItem(KEY, JSON.stringify(courses));
}
export function resetImported() {
  localStorage.removeItem(KEY);
}

// استيراد CSV: code,name_ar,name_en,year,instructor,day,start,end,kind,room,group
export function parseCSV(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  const head = lines.shift().split(',').map((h) => h.trim().toLowerCase());
  const idx = (k) => head.indexOf(k);
  const map = new Map();
  lines.forEach((ln) => {
    const c = ln.split(',').map((x) => x.trim());
    const code = c[idx('code')];
    if (!map.has(code)) map.set(code, { code, ar: c[idx('name_ar')], en: c[idx('name_en')] || '', year: c[idx('year')], instructor: c[idx('instructor')] || '', sessions: [] });
    map.get(code).sessions.push({ day: c[idx('day')], start: c[idx('start')], end: c[idx('end')], kind: c[idx('kind')] || 'lecture', room: c[idx('room')], group: c[idx('group')] || '' });
  });
  return [...map.values()];
}

export function toMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}
