// خامات تُرسم برمجياً (canvas) — واجهات المبنى، رخام الممرات، الزجاج
import * as THREE from 'three';

const cache = new Map();
const PX_M = 56; // بكسل لكل متر
const BAY = 4.5;

function tex(canvas, repeat = true) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function glass(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#6d9ccd');
  g.addColorStop(0.5, '#3f6e9f');
  g.addColorStop(1, '#5d8dbb');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

function window_(ctx, x, y, w, h) {
  // إطار أبيض + زجاج أزرق + قوائم + عتبة
  ctx.fillStyle = '#f4efe3';
  ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
  glass(ctx, x, y, w, h);
  ctx.fillStyle = '#f4efe3';
  ctx.fillRect(x + w / 2 - 2, y, 4, h);
  ctx.fillRect(x, y + h * 0.38, w, 4);
  // انعكاس
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.beginPath();
  ctx.moveTo(x + 4, y + h - 4);
  ctx.lineTo(x + w * 0.45, y + 4);
  ctx.lineTo(x + w * 0.62, y + 4);
  ctx.lineTo(x + 18, y + h - 4);
  ctx.fill();
  // عتبة
  ctx.fillStyle = '#e8d6a8';
  ctx.fillRect(x - 10, y + h + 6, w + 20, 7);
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.fillRect(x - 10, y + h + 13, w + 20, 3);
}

/**
 * واجهة: عدد البايات × 4 أدوار
 * kind: normal | entrance | glass
 */
export function facadeTexture(nBays, kind = 'normal', levels = 4, floorH = 4.2) {
  const key = `f${nBays}-${kind}-${levels}`;
  if (cache.has(key)) return cache.get(key);
  const bw = Math.round(BAY * PX_M);
  const fh = Math.round(floorH * PX_M);
  const W = bw * nBays;
  const H = fh * levels;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  // الجدار الرملي
  const wall = ctx.createLinearGradient(0, 0, 0, H);
  wall.addColorStop(0, '#e4c991');
  wall.addColorStop(1, '#dcbc83');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, W, H);
  // ملمس
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = `rgba(${120 + Math.random() * 60},${90 + Math.random() * 50},50,${Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }
  // قاعدة حجرية
  const base = Math.round(0.9 * PX_M);
  ctx.fillStyle = '#c9a56f';
  ctx.fillRect(0, H - base, W, base);
  ctx.fillStyle = 'rgba(0,0,0,.12)';
  for (let x = 0; x < W; x += 70) ctx.fillRect(x, H - base, 2, base);

  for (let b = 0; b < nBays; b++) {
    const bx = b * bw;
    for (let L = 0; L < levels; L++) {
      const fy = H - (L + 1) * fh; // أعلى هذا الدور
      const isGround = L === 0;
      const isEntranceBay = kind === 'entrance' && isGround && b === Math.floor(nBays / 2);
      const glassStrip = kind === 'glass' && (b === Math.floor(nBays / 2) || b === Math.floor(nBays / 2) - 1);
      if (isEntranceBay) {
        // مدخل رئيسي: أبواب زجاجية كبيرة
        const dw = bw * 0.78;
        const dx = bx + (bw - dw) / 2;
        const dh = fh * 0.78;
        ctx.fillStyle = '#f4efe3';
        ctx.fillRect(dx - 8, fy + fh - dh - 8 - base * 0.0, dw + 16, dh + 8);
        glass(ctx, dx, fy + fh - dh, dw, dh - 4);
        ctx.fillStyle = '#f4efe3';
        for (let k = 1; k < 4; k++) ctx.fillRect(dx + (dw * k) / 4 - 2, fy + fh - dh, 4, dh - 4);
        ctx.fillRect(dx, fy + fh - dh + dh * 0.22, dw, 4);
        continue;
      }
      if (glassStrip) {
        // زجاج أزرق رأسي (أبراج أطراف الأجنحة)
        const gx = bx + bw * 0.08;
        const gw = bw * 0.84;
        glass(ctx, gx, fy + 14, gw, fh - 24);
        ctx.fillStyle = '#e8e4d8';
        ctx.fillRect(gx + gw / 2 - 2, fy + 14, 4, fh - 24);
        ctx.fillRect(gx, fy + fh * 0.55, gw, 4);
        continue;
      }
      const ww = bw * 0.46;
      const wh = isGround ? fh * 0.52 : fh * 0.5;
      const wx = bx + (bw - ww) / 2;
      const wy = fy + fh * (isGround ? 0.2 : 0.22);
      window_(ctx, wx, wy, ww, wh);
    }
    // بيلاستر (أعمدة جدارية) على حدود البايا
    ctx.fillStyle = '#ecd9a9';
    ctx.fillRect(bx, 0, 16, H - base);
    ctx.fillRect(bx + bw - 16, 0, 16, H - base);
    ctx.fillStyle = 'rgba(0,0,0,.12)';
    ctx.fillRect(bx + 16, 0, 3, H - base);
    ctx.fillRect(bx + bw - 19, 0, 3, H - base);
  }
  // أحزمة أفقية بين الأدوار
  for (let L = 1; L < levels; L++) {
    const y = H - L * fh;
    ctx.fillStyle = '#ecd9a9';
    ctx.fillRect(0, y - 5, W, 10);
    ctx.fillStyle = 'rgba(0,0,0,.14)';
    ctx.fillRect(0, y + 5, W, 3);
  }
  const t = tex(c);
  t.repeat.set(1, 1);
  cache.set(key, t);
  return t;
}

// رخام الممرات: مربعات بيج وإطار بني (كما في الفيديو)
export function marbleTexture() {
  if (cache.has('marble')) return cache.get('marble');
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e7dcc0';
  ctx.fillRect(0, 0, S, S);
  // شبكة البلاط
  ctx.strokeStyle = 'rgba(120,100,70,.35)';
  ctx.lineWidth = 2;
  const n = 4;
  for (let i = 0; i <= n; i++) {
    ctx.beginPath();
    ctx.moveTo((i * S) / n, 0);
    ctx.lineTo((i * S) / n, S);
    ctx.moveTo(0, (i * S) / n);
    ctx.lineTo(S, (i * S) / n);
    ctx.stroke();
  }
  // عروق
  for (let i = 0; i < 70; i++) {
    ctx.strokeStyle = `rgba(150,125,85,${0.05 + Math.random() * 0.08})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    const x = Math.random() * S;
    const y = Math.random() * S;
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + 40, y + 20, x + 60, y - 30, x + 110, y + 10);
    ctx.stroke();
  }
  // حزام بني
  ctx.fillStyle = '#8e7863';
  const band = 64;
  ctx.fillRect(0, 0, S, band * 0.5);
  ctx.fillRect(0, S - band * 0.5, S, band * 0.5);
  const t = tex(c);
  t.anisotropy = 8;
  cache.set('marble', t);
  return t;
}

export function groundDetailTexture() {
  if (cache.has('paver')) return cache.get('paver');
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#9a9488';
  ctx.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 16) {
    for (let x = (y / 16) % 2 ? 0 : 16; x < S + 32; x += 32) {
      const v = 128 + Math.random() * 30;
      ctx.fillStyle = `rgb(${v},${v - 4},${v - 12})`;
      ctx.fillRect(x - 16 + 1, y + 1, 30, 14);
    }
  }
  const t = tex(c);
  cache.set('paver', t);
  return t;
}

export function roofTexture() {
  if (cache.has('roof')) return cache.get('roof');
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#b9b3a6';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 1500; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`;
    ctx.fillRect(Math.random() * S, Math.random() * S, 2, 2);
  }
  const t = tex(c);
  cache.set('roof', t);
  return t;
}
