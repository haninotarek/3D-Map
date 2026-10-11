// الجداول — خريف 2026-2027 (من جداول الكلية). أسماء المواد زي ما هي مكتوبة بالإنجليزي.
// أكواد الغرف: B1-LH3 = مبنى 1 قاعة محاضرات 3 | LAB معمل | DR قاعة رسم | CR فصل (B1-CR105 = Room 105)
// افتراضات: الفرقة الأولى والرابعة في مبنى 1، والخانات اللي من غير اسم مبنى في الفرقة التانية = مبنى 2
// تقدر تستورد جدول بديل من زر "الجداول" (JSON أو CSV)
import { findRoom } from './layout.js';

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

const PERIODS = { 1: ['10:00', '11:15'], 2: ['11:20', '12:30'], 3: ['12:35', '13:45'], 4: ['13:50', '15:00'] };
const D = { Sun: 'الأحد', Mon: 'الاثنين', Tue: 'الثلاثاء', Wed: 'الأربعاء', Thu: 'الخميس' };
const L = 'lecture';
const S = 'section';
const B = 'lab';

// صف: [يوم، فترة، نوع، غرفة، مجموعة]
const course = (code, name, year, rows) => ({
  code,
  ar: name,
  en: '',
  year,
  instructor: '',
  sessions: rows.map(([day, p, kind, room, group]) => ({ day: D[day], start: PERIODS[p][0], end: PERIODS[p][1], kind, room, group: group || '' })),
});

const COURSES = [
  /* ================= Level One (مبنى 1) ================= */
  course('L1-FCS', 'Fundamentals of Computer Science', 1, [
    ['Mon', 1, L, 'B1-LH3', 'Group A · Sec 1:5'],
    ['Mon', 2, L, 'B1-LH3', 'Group B · Sec 6:10'],
    ['Tue', 2, B, 'B1-DR3', 'Sec/Lab 9'],
    ['Tue', 3, S, 'B1-LH3', 'Sec/Lab 1,2'],
    ['Tue', 4, S, 'B1-LH3', 'Sec/Lab 5,6'],
    ['Tue', 1, B, 'B1-DR3', 'Sec/Lab 10'],
    ['Wed', 3, S, 'B1-LH3', 'Sec/Lab 3,4'],
    ['Thu', 4, S, 'B1-LH3', 'Sec/Lab 7,8'],
  ]),
  course('L1-MA1', 'Mathematics I', 1, [
    ['Mon', 2, S, 'B1-DR3', 'Sec 5'],
    ['Mon', 1, S, 'B1-DR3', 'Sec 6'],
    ['Mon', 4, S, 'B1-LH3', 'Sec 9,10'],
    ['Wed', 4, S, 'B1-LH3', 'Sec 7,8'],
    ['Thu', 1, L, 'B1-LH3', 'Group B · Sec 6:10'],
    ['Thu', 2, L, 'B1-LH3', 'Group A · Sec 1:5'],
    ['Thu', 3, S, 'B1-LH3', 'Sec 1,2'],
    ['Thu', 4, S, 'B1-LH1', 'Sec 3,4'],
  ]),
  course('L1-PH1', 'Physics 1', 1, [
    ['Mon', 1, S, 'B1-LH1', 'Sec 7,8'],
    ['Mon', 2, S, 'B1-LH1', 'Sec 3,4'],
    ['Tue', 2, S, 'B1-CR105', 'Sec 5'],
    ['Tue', 3, S, 'B1-CR105', 'Sec 6'],
    ['Wed', 1, L, 'B1-LH1', 'Group A · Sec 1:5'],
    ['Wed', 2, L, 'B1-LH1', 'Group B · Sec 6:10'],
    ['Wed', 3, S, 'B1-LH1', 'Sec 1,2'],
    ['Wed', 4, S, 'B1-LH1', 'Sec 9,10'],
  ]),
  course('L1-LAW', 'Principles of Law and Human Rights', 1, [['Mon', 3, L, 'B1-LH1', 'Weekly Group']]),
  course('L1-PF', 'Programming Fundamentals', 1, [
    ['Tue', 1, B, 'B1-LAB1', 'Sec/Lab 1'],
    ['Tue', 2, B, 'B1-LAB1', 'Sec/Lab 7'],
    ['Tue', 3, B, 'B1-LAB1', 'Sec/Lab 3'],
    ['Tue', 4, B, 'B1-LAB1', 'Sec/Lab 9'],
    ['Tue', 1, B, 'B1-LAB2', 'Sec/Lab 2'],
    ['Tue', 2, B, 'B1-LAB2', 'Sec/Lab 8'],
    ['Tue', 3, B, 'B1-LAB2', 'Sec/Lab 4'],
    ['Tue', 4, B, 'B1-LAB2', 'Sec/Lab 10'],
    ['Wed', 3, B, 'B1-LAB1', 'Sec/Lab 5'],
    ['Wed', 3, B, 'B1-LAB2', 'Sec/Lab 6'],
    ['Thu', 1, L, 'B1-LH1', 'Group A · Sec 1:5'],
    ['Thu', 2, L, 'B1-LH1', 'Group B · Sec 6:10'],
  ]),
  course('L1-DM', 'Discrete Mathematics', 1, [
    ['Mon', 4, S, 'B1-LH1', 'Sec 1,2'],
    ['Tue', 1, S, 'B1-LAB2', 'Sec 3'],
    ['Tue', 2, S, 'B1-LAB2', 'Sec 4'],
    ['Tue', 4, S, 'B1-LH1', 'Sec 7,8'],
    ['Tue', 3, S, 'B1-LH1', 'Sec 9,10'],
    ['Wed', 1, L, 'B1-LH3', 'Group B · Sec 6:10'],
    ['Wed', 2, L, 'B1-LH3', 'Group A · Sec 1:5'],
    ['Thu', 3, S, 'B1-LH1', 'Sec 5,6'],
  ]),

  /* ================= Level Two ================= */
  course('L2-MA3', 'Mathematics III', 2, [
    ['Sun', 1, L, 'B2-LH1', 'Sec 1:4'],
    ['Sun', 2, L, 'B2-LH1', 'Sec 5:8'],
    ['Sun', 1, S, 'B2-LH3', 'Sec 5,6'],
    ['Sun', 2, S, 'B2-LH3', 'Sec 1,2'],
    ['Sun', 4, S, 'B2-LH1', 'Sec 3,4'],
    ['Mon', 4, S, 'B2-LAB2', 'Sec 7,8'],
  ]),
  course('L2-LOG', 'Logic', 2, [
    ['Sun', 1, B, 'B2-LAB2', 'Sec/Lab 7'],
    ['Sun', 3, S, 'B2-LH3', 'Sec/Lab 1,2'],
    ['Sun', 3, B, 'B2-LAB2', 'Sec/Lab 8'],
    ['Mon', 4, S, 'B2-LH4', 'Sec/Lab 5,6'],
    ['Wed', 4, S, 'B2-LH2', 'Sec/Lab 3,4'],
  ]),
  course('L2-NUM', 'Numerical Analysis', 2, [
    ['Sun', 3, S, 'B2-LH1', 'Sec/Lab 3,4'],
    ['Sun', 3, B, 'B1-DR3', 'Sec/Lab 5'],
    ['Sun', 4, B, 'B1-DR3', 'Sec/Lab 6'],
    ['Mon', 3, S, 'B2-LH2', 'Sec/Lab 7,8'],
    ['Tue', 1, L, 'B2-LH3', 'Sec 5:8'],
    ['Tue', 2, L, 'B2-LH3', 'Sec 1:4'],
    ['Wed', 4, S, 'B2-LH4', 'Sec/Lab 1,2'],
  ]),
  course('L2-SAD', 'Systems Analysis and Design', 2, [
    ['Sun', 4, S, 'B2-LH3', 'Sec/Lab 7,8'],
    ['Mon', 3, S, 'B2-CR101', 'Sec/Lab 3,4'],
    ['Mon', 4, S, 'B2-CR101', 'Sec/Lab 1,2'],
    ['Tue', 1, L, 'B2-LH1', 'Sec 1:4'],
    ['Tue', 2, L, 'B2-LH1', 'Sec 5:8'],
    ['Wed', 4, S, 'B2-CR101', 'Sec/Lab 5,6'],
  ]),
  course('L2-OOP', 'Object-Oriented Programming', 2, [
    ['Mon', 1, L, 'B2-LH2', 'Sec 1:4'],
    ['Mon', 2, L, 'B2-LH2', 'Sec 5:8'],
    ['Tue', 3, B, 'B1-LAB2', 'Sec/Lab 1'],
    ['Tue', 3, B, 'B1-DR3', 'Sec/Lab 2'],
    ['Tue', 4, B, 'B1-LAB2', 'Sec/Lab 3'],
    ['Tue', 4, B, 'B1-DR3', 'Sec/Lab 4'],
    ['Wed', 1, B, 'B1-LAB2', 'Sec/Lab 5'],
    ['Wed', 1, B, 'B1-DR3', 'Sec/Lab 6'],
    ['Wed', 3, B, 'B1-LAB2', 'Sec/Lab 7'],
    ['Wed', 3, B, 'B1-DR3', 'Sec/Lab 8'],
  ]),
  course('L2-LD', 'Logic Design', 2, [
    ['Mon', 1, L, 'B2-LH4', 'Sec 5:8'],
    ['Mon', 2, L, 'B2-LH4', 'Sec 1:4'],
  ]),
  course('L2-CS', 'Computer Skills', 2, [['Wed', 2, L, 'B2-LH4', 'Sec 1:8']]),

  /* ================= Level Three (مبنى 2) ================= */
  course('L3-SOC', 'Societal Issues', 3, [['Mon', 2, L, 'B2-CR101', 'Weekly Group · GA (1,2) / GB (3,4)']]),
  course('L3-ALG', 'Algorithms Design and Analysis', 3, [
    ['Mon', 3, L, 'B2-LH4'],
    ['Tue', 1, S, 'B2-LH2', 'Sec/Lab 3,4'],
    ['Tue', 4, S, 'B2-LH4', 'Sec/Lab 1,2'],
  ]),
  course('L3-HIS', 'Introduction to History of Civilizations', 3, [['Mon', 4, L, 'B2-LH2']]),
  course('L3-NET', 'Computer Networks', 3, [
    ['Tue', 1, B, 'B2-LAB1', 'Sec/Lab 1'],
    ['Tue', 2, B, 'B2-LAB1', 'Sec/Lab 3'],
    ['Tue', 3, B, 'B2-LAB2', 'Sec/Lab 2'],
    ['Tue', 4, B, 'B2-LAB2', 'Sec/Lab 4'],
    ['Wed', 2, L, 'B2-LH2'],
  ]),
  course('L3-TOP', 'Selected Topics in C.S.', 3, [
    ['Tue', 1, B, 'B2-LAB2', 'Sec/Lab 2'],
    ['Tue', 2, B, 'B2-LAB2', 'Sec/Lab 4'],
    ['Tue', 3, B, 'B2-LAB1', 'Sec/Lab 1'],
    ['Tue', 4, B, 'B2-LAB1', 'Sec/Lab 3'],
    ['Wed', 3, L, 'B2-LH4'],
  ]),
  course('L3-AI', 'Artificial Intelligence', 3, [
    ['Tue', 2, S, 'B2-LH4', 'Sec/Lab 1,2'],
    ['Tue', 3, S, 'B2-LH4', 'Sec/Lab 3,4'],
    ['Wed', 1, L, 'B2-LH2'],
  ]),

  /* ================= Level Four (مبنى 1 — Room 205) ================= */
  course('L4-IP', 'Image Processing', 4, [
    ['Mon', 1, B, 'B1-LAB4', 'sec/Lab'],
    ['Wed', 3, L, 'B1-LAB4'],
  ]),
  course('L4-DL', 'Deep Learning', 4, [
    ['Mon', 2, B, 'B1-LAB4', 'sec/Lab'],
    ['Wed', 1, L, 'B1-LAB4'],
  ]),
  course('L4-PC', 'Parallel Computation', 4, [
    ['Mon', 3, L, 'B1-LAB4'],
    ['Wed', 2, B, 'B1-LAB4', 'sec/Lab'],
  ]),
  course('L4-GP', 'Graduation Project I', 4, [
    ['Mon', 4, S, 'B1-LAB4'],
    ['Tue', 4, S, 'B1-LAB4'],
    ['Wed', 4, S, 'B1-LAB4'],
    ['Thu', 4, S, 'B1-LAB4'],
  ]),
  course('L4-CC', 'Cloud Computing', 4, [
    ['Tue', 2, B, 'B1-LAB4', 'sec/Lab'],
    ['Thu', 3, L, 'B1-LAB4'],
  ]),
  course('L4-TCC', 'Theory of Computation & Compilers', 4, [
    ['Tue', 3, L, 'B1-LAB4'],
    ['Thu', 2, B, 'B1-LAB4', 'sec/Lab'],
  ]),
];

// تحويل الجلسات إلى صيغة موحّدة بمعرّف الغرفة (الغرف اللي مش موجودة بتتشال)
function normalize(courses) {
  return courses.map((c) => ({
    code: c.code,
    ar: c.ar,
    en: c.en || '',
    year: Number(c.year),
    instructor: c.instructor || '',
    sessions: c.sessions
      .map((s) => {
        const room = findRoom(s.room);
        return room ? { day: s.day, start: s.start, end: s.end, kind: s.kind || 'lecture', group: s.group || '', roomId: room.id } : null;
      })
      .filter(Boolean),
  }));
}

const KEY = 'campus3d.schedule.v1';
export function loadCourses() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {}
  return normalize(COURSES);
}
export const isSample = () => false;
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
    if (!map.has(code)) map.set(code, { code, ar: c[idx('name_en')] || c[idx('name_ar')], en: '', year: c[idx('year')], instructor: c[idx('instructor')] || '', sessions: [] });
    map.get(code).sessions.push({ day: c[idx('day')], start: c[idx('start')], end: c[idx('end')], kind: c[idx('kind')] || 'lecture', room: c[idx('room')], group: c[idx('group')] || '' });
  });
  return [...map.values()];
}

export function toMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}
