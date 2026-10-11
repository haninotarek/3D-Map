// ثوابت الخريطة — كل الأبعاد بالمتر
// صورة القمر الصناعي: 1081 × 1180 بكسل، المقياس التقريبي 0.35 متر / بكسل
export const IMG_W = 1081;
export const IMG_H = 1180;
export const M_PER_PX = 0.35;
export const IMG_CX = 540.5; // البكسل الذي يمثل x = 0
export const IMG_CZ = 590; // البكسل الذي يمثل z = 0

export const px2world = (px, py) => ({
  x: (px - IMG_CX) * M_PER_PX,
  z: (py - IMG_CZ) * M_PER_PX,
});

// قياسات المبنى (شكل π: جسم علوي + جناحين وفناء بينهما)
export const BLD = {
  W: 54,
  D: 60,
  WING_W: 20,
  COURT_W: 14,
  SPINE_D: 17, // عمق الجسم العلوي
  CORR: 3.6, // عرض الممر
  FLOOR_H: 4.2,
  SLAB: 0.3,
  LEVELS: 4, // أرضي + 3 أدوار (من اللافتة THIRD FLOOR في الفيديو)
};
export const BLD_H = BLD.FLOOR_H * BLD.LEVELS;

export const FLOOR_NAMES = ['الدور الأرضي', 'الدور الأول', 'الدور الثاني', 'الدور الثالث'];
export const FLOOR_SHORT = ['أرضي', '1', '2', '3'];

// موقع المبنيين (مركز البصمة) على الخريطة — من صورة القمر الصناعي
// swap: لو المبنى 1 هو اللي على اليمين خلّي true
const SWAP = true;
const left = { ...px2world(520, 434) };
const right = { ...px2world(712, 434) };
export const BUILDINGS_POS = {
  1: SWAP ? right : left,
  2: SWAP ? left : right,
};

// بوابة الكلية (من أول الفيديو) — جنوب الحرم
export const GATE = { ...px2world(422, 1165), name: 'البوابة الرئيسية' };

// المباني الأخرى في الحرم (للسياق فقط): مركز px، العرض والعمق بالبكسل، الدوران
export const CONTEXT_BUILDINGS = [
  { c: [365, 225], w: 150, d: 170, kind: 'block' },
  { c: [220, 435], w: 170, d: 150, kind: 'c', rot: 90 },
  { c: [150, 635], w: 170, d: 145, kind: 'c', rot: 90 },
  { c: [150, 825], w: 170, d: 150, kind: 'c', rot: 90 },
  { c: [325, 1015], w: 150, d: 145, kind: 'c', rot: 180 },
  { c: [520, 1015], w: 150, d: 145, kind: 'c', rot: 180 },
];
