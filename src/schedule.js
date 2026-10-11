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

const SAMPLE = [
  // ---------- الفرقة الأولى (مبنى 1) ----------
  { code: 'CS101', ar: 'أساسيات البرمجة', en: 'Programming Fundamentals', year: 1, instructor: 'د. أحمد سمير', sessions: [S('السبت', '09:00', '10:30', 'lecture', [1, 'LH', 1]), S('الاثنين', '11:00', '12:30', 'lab', [1, 'LAB', 1], 'G1')] },
  { code: 'MA101', ar: 'تفاضل وتكامل 1', en: 'Calculus 1', year: 1, instructor: 'د. منى عبد الله', sessions: [S('السبت', '11:00', '12:30', 'lecture', [1, 'LH', 2]), S('الثلاثاء', '09:00', '10:30', 'section', [1, 'CR', 3])] },
  { code: 'PH101', ar: 'فيزياء عامة', en: 'General Physics', year: 1, instructor: 'د. هاني فؤاد', sessions: [S('الأحد', '09:00', '10:30', 'lecture', [1, 'LH', 3]), S('الأربعاء', '11:00', '12:30', 'lab', [1, 'LAB', 2], 'G1')] },
  { code: 'IT101', ar: 'مقدمة في تقنية المعلومات', en: 'Intro to IT', year: 1, instructor: 'د. سارة إبراهيم', sessions: [S('الأحد', '11:00', '12:30', 'lecture', [1, 'LH', 1]), S('الخميس', '09:00', '10:30', 'section', [1, 'CR', 1])] },
  { code: 'EN101', ar: 'لغة إنجليزية', en: 'Technical English', year: 1, instructor: 'أ. نهى حسن', sessions: [S('الاثنين', '09:00', '10:30', 'lecture', [1, 'CR', 5])] },
  { code: 'DR101', ar: 'رسم هندسي', en: 'Engineering Drawing', year: 1, instructor: 'م. طارق السيد', sessions: [S('الثلاثاء', '11:00', '14:00', 'lab', [1, 'DR', 3]), S('الخميس', '11:00', '12:30', 'lecture', [1, 'LH', 2])] },
  { code: 'LD101', ar: 'تصميم منطقي', en: 'Logic Design', year: 1, instructor: 'د. وليد مصطفى', sessions: [S('الأربعاء', '09:00', '10:30', 'lecture', [1, 'LH', 4]), S('السبت', '13:00', '14:30', 'lab', [1, 'LAB', 3], 'G2')] },

  // ---------- الفرقة الثانية (مبنى 1 + مبنى 2) ----------
  { code: 'CS201', ar: 'هياكل البيانات', en: 'Data Structures', year: 2, instructor: 'د. محمود رضا', sessions: [S('السبت', '09:00', '10:30', 'lecture', [2, 'LH', 1]), S('الأحد', '13:00', '14:30', 'lab', [2, 'LAB', 1], 'G1')] },
  { code: 'CS202', ar: 'البرمجة كائنية التوجه', en: 'Object-Oriented Programming', year: 2, instructor: 'د. إيمان جلال', sessions: [S('الاثنين', '09:00', '10:30', 'lecture', [1, 'LH', 5]), S('الثلاثاء', '13:00', '14:30', 'lab', [2, 'LAB', 2], 'G1')] },
  { code: 'MA201', ar: 'رياضيات متقطعة', en: 'Discrete Mathematics', year: 2, instructor: 'د. خالد نبيل', sessions: [S('الأحد', '09:00', '10:30', 'lecture', [1, 'LH', 3]), S('الأربعاء', '09:00', '10:30', 'section', [1, 'CR', 6])] },
  { code: 'CS203', ar: 'تنظيم وعمارة الحاسب', en: 'Computer Organization', year: 2, instructor: 'د. باسم عادل', sessions: [S('الثلاثاء', '09:00', '10:30', 'lecture', [2, 'LH', 2]), S('الخميس', '11:00', '12:30', 'section', [2, 'CR', 2])] },
  { code: 'IT201', ar: 'قواعد البيانات', en: 'Database Systems', year: 2, instructor: 'د. رشا عمر', sessions: [S('الأربعاء', '11:00', '12:30', 'lecture', [2, 'LH', 1]), S('السبت', '11:00', '12:30', 'lab', [2, 'LAB', 3], 'G2')] },
  { code: 'ST201', ar: 'احتمالات وإحصاء', en: 'Probability & Statistics', year: 2, instructor: 'د. أمل شوقي', sessions: [S('الاثنين', '11:00', '12:30', 'lecture', [1, 'LH', 2])] },

  // ---------- الفرقة الثالثة (مبنى 2) ----------
  { code: 'CS301', ar: 'تصميم وتحليل الخوارزميات', en: 'Algorithms', year: 3, instructor: 'د. محمود رضا', sessions: [S('السبت', '11:00', '12:30', 'lecture', [2, 'LH', 3]), S('الاثنين', '13:00', '14:30', 'section', [2, 'CR', 4])] },
  { code: 'CS302', ar: 'نظم التشغيل', en: 'Operating Systems', year: 3, instructor: 'د. هبة كمال', sessions: [S('الأحد', '09:00', '10:30', 'lecture', [2, 'LH', 2]), S('الثلاثاء', '11:00', '12:30', 'lab', [2, 'LAB', 4], 'G1')] },
  { code: 'CS303', ar: 'شبكات الحاسب', en: 'Computer Networks', year: 3, instructor: 'د. ياسر عبد الحميد', sessions: [S('الاثنين', '09:00', '10:30', 'lecture', [2, 'LH', 4]), S('الخميس', '09:00', '10:30', 'lab', [2, 'LAB', 5], 'G2')] },
  { code: 'SE301', ar: 'هندسة البرمجيات', en: 'Software Engineering', year: 3, instructor: 'د. دينا فاروق', sessions: [S('الثلاثاء', '09:00', '10:30', 'lecture', [2, 'LH', 3]), S('الأربعاء', '13:00', '14:30', 'section', [2, 'CR', 2])] },
  { code: 'AI301', ar: 'مقدمة في الذكاء الاصطناعي', en: 'Intro to AI', year: 3, instructor: 'د. كريم صلاح', sessions: [S('الأربعاء', '09:00', '10:30', 'lecture', [2, 'LH', 1]), S('السبت', '13:00', '14:30', 'lab', [2, 'LAB', 6], 'G1')] },
  { code: 'WB301', ar: 'تطوير تطبيقات الويب', en: 'Web Development', year: 3, instructor: 'م. مصطفى عيد', sessions: [S('الخميس', '11:00', '14:00', 'lab', [2, 'LAB', 1], 'G1')] },

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
