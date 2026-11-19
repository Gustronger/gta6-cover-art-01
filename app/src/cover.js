// The cover renderer: draws a GTA-style multi-panel poster onto any 2D canvas.
// Everything on the poster is drawn here in code — gradient skies, a slatted
// synthwave sun, skyline and palm silhouettes, halftone dots and bold condensed
// lettering — so the art is original and the poster looks rich even before a
// photo is loaded. Every photo panel is redrawn through the cartoon filter
// (posterized flat colours + dark comic outlines), so any uploaded photo comes
// out as GTA-style illustration, never a plain photograph. All randomness is
// seeded, so the same state draws the same bytes every time.

import { GRADES } from './grades.js';
import { LAYOUTS, coverZones } from './layouts.js';

/** A seeded pseudo-random stream (LCG): the same seed draws the same skyline. */
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** '#rrggbb' with an alpha channel, as an rgba() string. */
function rgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.arcTo(x + w, y, x + w, y + rad, rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.arcTo(x + w, y + h, x + w - rad, y + h, rad);
  ctx.lineTo(x + rad, y + h);
  ctx.arcTo(x, y + h, x, y + h - rad, rad);
  ctx.lineTo(x, y + rad);
  ctx.arcTo(x, y, x + rad, y, rad);
  ctx.closePath();
}

/** A palm silhouette: a curved trunk and seven fronds, drawn at (x, y) rising s px. */
function drawPalm(ctx, x, y, s, color, mirror = false) {
  ctx.save();
  ctx.translate(x, y);
  if (mirror) ctx.scale(-1, 1);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  // Trunk, leaning right.
  ctx.lineWidth = Math.max(2, s * 0.055);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(s * 0.06, -s * 0.5, s * 0.22, -s * 0.86);
  ctx.stroke();
  const crownX = s * 0.22;
  const crownY = -s * 0.86;
  // Fronds fanning out from the crown, each a curved stroke with leaflets.
  const fronds = [
    { a: -2.6, len: 0.52 },
    { a: -2.0, len: 0.58 },
    { a: -1.4, len: 0.6 },
    { a: -0.8, len: 0.58 },
    { a: -0.2, len: 0.52 },
    { a: 0.4, len: 0.46 },
    { a: 1.0, len: 0.4 },
  ];
  for (const f of fronds) {
    const dx = Math.cos(f.a) * s * f.len;
    const dy = Math.sin(f.a) * s * f.len * 0.7 - s * 0.08;
    const mx = crownX + dx * 0.5;
    const my = crownY + dy * 0.5 - s * 0.12;
    ctx.lineWidth = Math.max(1.5, s * 0.035);
    ctx.beginPath();
    ctx.moveTo(crownX, crownY);
    ctx.quadraticCurveTo(mx, my, crownX + dx, crownY + dy);
    ctx.stroke();
    // Leaflets along the frond.
    ctx.lineWidth = Math.max(1, s * 0.016);
    for (let t = 0.3; t <= 0.95; t += 0.22) {
      const lx = crownX + dx * t;
      const ly = crownY + dy * t - s * 0.1 * Math.sin(t * Math.PI);
      const drop = s * 0.09;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + s * 0.05, ly + drop);
      ctx.stroke();
    }
  }
  // Coconuts at the crown.
  ctx.beginPath();
  ctx.arc(crownX - s * 0.02, crownY + s * 0.03, s * 0.035, 0, Math.PI * 2);
  ctx.arc(crownX + s * 0.04, crownY + s * 0.04, s * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A synthwave sun: a gradient disc with horizontal slats cut through its lower half. */
function drawSun(ctx, x, y, radius, grade, skyGradient) {
  ctx.save();
  const glow = ctx.createRadialGradient(x, y, radius * 0.3, x, y, radius * 2.4);
  glow.addColorStop(0, rgba(grade.sun, 0.5));
  glow.addColorStop(1, rgba(grade.sun, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(x - radius * 2.4, y - radius * 2.4, radius * 4.8, radius * 4.8);
  const body = ctx.createLinearGradient(0, y - radius, 0, y + radius);
  body.addColorStop(0, grade.sunCore);
  body.addColorStop(1, grade.sun);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  // Slats: bands of sky gradient, thicker toward the bottom of the disc.
  ctx.fillStyle = skyGradient;
  let slatY = y + radius * 0.08;
  let thick = Math.max(2, radius * 0.045);
  while (slatY < y + radius) {
    ctx.fillRect(x - radius - 2, slatY, radius * 2 + 4, thick);
    slatY += thick + radius * 0.16;
    thick *= 1.45;
  }
  ctx.restore();
}

/** A dark skyline silhouette with a few lit windows, along the bottom of a rect. */
function drawSkyline(ctx, rect, horizonY, grade) {
  const rand = lcg(7);
  ctx.save();
  ctx.fillStyle = grade.skyline;
  let x = rect.x;
  const top = horizonY - rect.h * 0.34;
  while (x < rect.x + rect.w) {
    const bw = rect.w * (0.05 + rand() * 0.09);
    const bh = rect.h * (0.12 + rand() * 0.24);
    ctx.fillRect(x, horizonY - bh, bw, bh);
    if (rand() > 0.6) {
      // Antenna.
      ctx.fillRect(x + bw / 2 - 1, horizonY - bh - rect.h * 0.08, 2, rect.h * 0.08);
    }
    if (rand() > 0.45) {
      // Lit windows.
      ctx.fillStyle = rgba(grade.accent, 0.75);
      const wins = 1 + Math.floor(rand() * 4);
      for (let i = 0; i < wins; i++) {
        ctx.fillRect(
          x + bw * (0.15 + rand() * 0.6),
          horizonY - bh + rect.h * (0.05 + rand() * 0.6),
          Math.max(2, bw * 0.08),
          Math.max(2, rect.h * 0.02),
        );
      }
      ctx.fillStyle = grade.skyline;
    }
    x += bw + rect.w * 0.008;
  }
  void top;
  ctx.restore();
}

/** A full procedural scene for a panel with no photo: sky, sun, skyline, palms. */
function drawScene(ctx, r, grade) {
  const sky = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  sky.addColorStop(0, grade.skyTop);
  sky.addColorStop(0.55, grade.skyMid);
  sky.addColorStop(1, grade.skyBot);
  ctx.fillStyle = sky;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  // Stars in the upper sky.
  const rand = lcg(2026);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (let i = 0; i < 42; i++) {
    const sx = r.x + rand() * r.w;
    const sy = r.y + rand() * r.h * 0.42;
    const sr = rand() > 0.85 ? 2 : 1;
    ctx.globalAlpha = 0.25 + rand() * 0.6;
    ctx.fillRect(sx, sy, sr, sr);
  }
  ctx.globalAlpha = 1;
  // Sun.
  const sunR = Math.min(r.w, r.h) * 0.26;
  drawSun(ctx, r.x + r.w * 0.68, r.y + r.h * 0.4, sunR, grade, sky);
  // Ground with the sun's reflection.
  const horizon = r.y + r.h * 0.62;
  const ground = ctx.createLinearGradient(0, horizon, 0, r.y + r.h);
  ground.addColorStop(0, grade.skyBot);
  ground.addColorStop(0.3, grade.ground);
  ground.addColorStop(1, grade.ground);
  ctx.fillStyle = ground;
  ctx.fillRect(r.x, horizon, r.w, r.y + r.h - horizon);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const streak = ctx.createLinearGradient(0, horizon, 0, r.y + r.h);
  streak.addColorStop(0, rgba(grade.sun, 0.35));
  streak.addColorStop(1, rgba(grade.sun, 0));
  ctx.fillStyle = streak;
  ctx.fillRect(r.x + r.w * 0.68 - sunR * 0.45, horizon, sunR * 0.9, r.y + r.h - horizon);
  ctx.restore();
  drawSkyline(ctx, r, horizon, grade);
  drawPalm(ctx, r.x + r.w * 0.07, r.y + r.h * 0.99, r.h * 0.36, grade.palm);
  drawPalm(ctx, r.x + r.w * 0.95, r.y + r.h * 0.99, r.h * 0.3, grade.palm, true);
}

/** Draws a photo to cover a panel rect, with the panel's zoom and pan. */
function drawPhotoCover(ctx, img, r, panel) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(r.w / iw, r.h / ih) * (panel.zoom || 1);
  const pw = iw * scale;
  const ph = ih * scale;
  const cx = r.x + r.w / 2 + (panel.ox || 0) * r.w;
  const cy = r.y + r.h / 2 + (panel.oy || 0) * r.h;
  ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
}

function clamp255(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

/**
 * The cartoon treatment: redraws a photo panel as flat comic art. The photo is
 * painted onto an offscreen canvas at panel size, then every pixel is pushed
 * through a saturation boost and quantized to five flat steps per channel,
 * and a Sobel edge pass inks dark outlines where the picture changes sharply.
 * Pure pixel math, no randomness — the same photo always cartoons the same way.
 */
function drawCartoonPhoto(ctx, img, r, panel) {
  const w = Math.max(2, Math.round(r.w));
  const h = Math.max(2, Math.round(r.h));
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const o = off.getContext('2d');
  drawPhotoCover(o, img, { x: 0, y: 0, w, h }, panel);
  const image = o.getImageData(0, 0, w, h);
  const d = image.data;
  const levels = 5;
  const step = 255 / (levels - 1);
  const lum = new Float32Array(w * h);
  for (let p = 0; p < d.length; p += 4) {
    const i = p / 4;
    const r0 = d[p];
    const g0 = d[p + 1];
    const b0 = d[p + 2];
    lum[i] = 0.299 * r0 + 0.587 * g0 + 0.114 * b0;
    const avg = (r0 + g0 + b0) / 3;
    d[p] = clamp255(Math.round((avg + (r0 - avg) * 1.3) / step) * step);
    d[p + 1] = clamp255(Math.round((avg + (g0 - avg) * 1.3) / step) * step);
    d[p + 2] = clamp255(Math.round((avg + (b0 - avg) * 1.3) / step) * step);
  }
  // Ink the outlines: where luminance jumps between neighbours, darken toward ink.
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        Math.abs(lum[i - 1] - lum[i + 1]) +
        0.5 * Math.abs(lum[i - w - 1] - lum[i - w + 1]) +
        0.5 * Math.abs(lum[i + w - 1] - lum[i + w + 1]);
      const gy =
        Math.abs(lum[i - w] - lum[i + w]) +
        0.5 * Math.abs(lum[i - w - 1] - lum[i + w - 1]) +
        0.5 * Math.abs(lum[i - w + 1] - lum[i + w + 1]);
      const mag = gx + gy;
      if (mag > 46) {
        const p = i * 4;
        const k = Math.min(1, (mag - 46) / 90);
        d[p] = d[p] * (1 - k) + 18 * k;
        d[p + 1] = d[p + 1] * (1 - k) + 12 * k;
        d[p + 2] = d[p + 2] * (1 - k) + 20 * k;
      }
    }
  }
  o.putImageData(image, 0, 0);
  ctx.drawImage(off, r.x, r.y, r.w, r.h);
}

/** The grade's wash over a panel: a sunset or neon tint, strongest at the foot. */
function applyWash(ctx, r, grade) {
  const wash = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  wash.addColorStop(0, grade.washTop);
  wash.addColorStop(1, grade.washBot);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = wash;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.restore();
  // A breath of light at the top of the panel.
  const light = ctx.createLinearGradient(0, r.y, 0, r.y + r.h * 0.22);
  light.addColorStop(0, 'rgba(255,255,255,0.10)');
  light.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = light;
  ctx.fillRect(r.x, r.y, r.w, r.h * 0.22);
}

function drawVignette(ctx, r) {
  const v = ctx.createRadialGradient(
    r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) * 0.32,
    r.x + r.w / 2, r.y + r.h / 2, Math.max(r.w, r.h) * 0.78,
  );
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = v;
  ctx.fillRect(r.x, r.y, r.w, r.h);
}

/** The title in bold condensed capitals, gradient-filled with a dark outline. */
function drawTitleText(ctx, text, cx, baselineY, maxW, maxSize, grade) {
  let size = maxSize;
  const setFont = (s) => {
    ctx.font = `900 ${s}px "Arial Black", "Arial Bold", Arial, sans-serif`;
  };
  setFont(size);
  const width = () => ctx.measureText(text).width * 0.86;
  while (width() > maxW && size > 10) {
    size -= 2;
    setFont(size);
  }
  const grad = ctx.createLinearGradient(0, baselineY - size, 0, baselineY + size * 0.2);
  grad.addColorStop(0, grade.titleFrom);
  grad.addColorStop(1, grade.titleTo);
  ctx.save();
  ctx.translate(cx, 0);
  ctx.scale(0.86, 1);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.05;
  ctx.strokeStyle = grade.titleStroke;
  ctx.lineWidth = Math.max(2, size * 0.07);
  ctx.strokeText(text, 0, baselineY);
  ctx.fillStyle = grad;
  ctx.fillText(text, 0, baselineY);
  ctx.restore();
}

/** Letterspaced capitals on one line, shrinking until they fit. */
function drawSpacedLine(ctx, text, cx, baselineY, maxW, size, color, weight = 700) {
  let s = size;
  const setFont = (v) => {
    ctx.font = `${weight} ${v}px Arial, sans-serif`;
  };
  setFont(s);
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.max(1, Math.round(s * 0.3))}px`;
  while (ctx.measureText(text).width > maxW && s > 8) {
    s -= 1;
    setFont(s);
  }
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(text, cx, baselineY);
  ctx.restore();
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
}

/** Halftone dots growing toward the corner, for the title band. */
function drawHalftone(ctx, x, y, w, h, color) {
  const cols = 6;
  const rows = 3;
  ctx.save();
  ctx.fillStyle = color;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const t = (c + r) / (cols + rows);
      const rad = 1 + t * h * 0.14;
      ctx.globalAlpha = 0.25 + t * 0.35;
      ctx.beginPath();
      ctx.arc(x + (c / (cols - 1)) * w, y + (r / (rows - 1)) * h, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** One five-pointed star, centred at (cx, cy) with outer radius r. */
function drawStar(ctx, cx, cy, r, fill, stroke) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.stroke();
  }
  ctx.restore();
}

/** A row of five stars, left-aligned from x, `count` of them filled gold. */
function drawStarsRow(ctx, x, cy, size, count, color = '#ffd166') {
  const gap = size * 2.3;
  for (let i = 0; i < 5; i++) {
    const cx = x + size + i * gap;
    if (i < count) drawStar(ctx, cx, cy, size, color, '#7b1e3b');
    else drawStar(ctx, cx, cy, size, 'rgba(255,255,255,0.14)', color);
  }
  return gap * 5;
}

/** The caption chip at a panel's foot: place on top, time — tagline below. */
function drawPanelCaption(ctx, r, panel, grade) {
  const place = (panel.place || '').trim().toUpperCase();
  const sub = [panel.time, panel.tag].filter(Boolean).join(' — ').toUpperCase();
  if (!place && !sub) return;
  const pad = Math.max(6, Math.round(r.w * 0.02));
  let pSize = Math.max(10, Math.round(Math.min(r.w, r.h) * 0.055));
  let sSize = Math.max(8, Math.round(pSize * 0.68));
  const lines = [];
  if (place) lines.push({ text: place, weight: 800, color: '#ffffff' });
  if (sub) lines.push({ text: sub, weight: 700, color: '#ffd166' });
  const measure = (size, weight, text) => {
    ctx.font = `${weight} ${size}px Arial, sans-serif`;
    return ctx.measureText(text).width;
  };
  for (let tries = 0; tries < 14; tries++) {
    const w1 = lines[0] ? measure(pSize, lines[0].weight, lines[0].text) : 0;
    const w2 = lines[1] ? measure(sSize, lines[1].weight, lines[1].text) : 0;
    if (Math.max(w1, w2) + pad * 2 <= r.w - 8) break;
    pSize -= 1;
    sSize = Math.max(7, Math.round(pSize * 0.68));
  }
  lines[0] && (lines[0].size = pSize);
  lines[1] && (lines[1].size = sSize);
  const chipW =
    Math.max(...lines.map((l) => measure(l.size, l.weight, l.text))) + pad * 2;
  const chipH = pad * 1.2 + lines.reduce((a, l) => a + l.size * 1.25, 0);
  const x = r.x + Math.max(4, r.w * 0.02);
  const y = r.y + r.h - chipH - Math.max(4, r.h * 0.02);
  ctx.save();
  ctx.fillStyle = 'rgba(8,2,16,0.88)';
  roundRectPath(ctx, x, y, chipW, chipH, Math.max(3, pad * 0.5));
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  let ty = y + pad * 0.6;
  for (const l of lines) {
    ty += l.size * 0.95;
    ctx.font = `${l.weight} ${l.size}px Arial, sans-serif`;
    ctx.fillStyle = l.color;
    ctx.fillText(l.text, x + pad, ty);
    ty += l.size * 0.3;
  }
  ctx.restore();
  void grade;
}

/** A small tilted white sticker naming the panel's character, top-left. */
function drawCharLabel(ctx, r, label) {
  const text = (label || '').trim().toUpperCase();
  if (!text) return;
  const size = Math.max(9, Math.round(Math.min(r.w, r.h) * 0.045));
  ctx.save();
  ctx.font = `800 ${size}px Arial, sans-serif`;
  const w = ctx.measureText(text).width + size * 1.1;
  const h = size * 1.7;
  const x = r.x + Math.max(4, r.w * 0.025);
  const y = r.y + Math.max(4, r.h * 0.025);
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(-0.045);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#12081d';
  ctx.lineWidth = 2;
  roundRectPath(ctx, -w / 2, -h / 2, w, h, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#12081d';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, size * 0.06);
  ctx.restore();
}

/** The "WANTED ★★★★★" pill over the cover's top-right corner. */
function drawWantedTag(ctx, W, H, z, state) {
  const stars = state.stars ?? 5;
  const size = Math.max(11, Math.round(Math.min(W, H) * 0.014));
  ctx.save();
  ctx.font = `900 ${size}px Arial, sans-serif`;
  const wText = ctx.measureText('WANTED').width;
  const starsW = 5 * size * 0.75 * 2.3;
  const pad = size * 0.9;
  const w = wText + size * 0.6 + starsW + pad * 2;
  const h = size * 2.1;
  const x = W - z.frame - w - 8;
  const y = z.frame + 8;
  ctx.fillStyle = 'rgba(8,2,16,0.92)';
  roundRectPath(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#ffd166';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('WANTED', x + pad, y + h / 2 + 1);
  drawStarsRow(ctx, x + pad + wText + size * 0.6, y + h / 2, size * 0.75, stars);
  ctx.restore();
}

/** The strip above the title band: five stars and a newspaper quote. */
function drawQuoteStrip(ctx, W, H, z, state) {
  const quote = (state.quote || '').trim();
  if (!quote) return;
  const stars = state.stars ?? 5;
  const starSize = Math.max(9, z.quoteH * 0.42);
  const midY = z.quoteY + z.quoteH * 0.58;
  let qSize = Math.max(11, Math.round(z.quoteH * 0.42));
  const setFont = (v) => {
    ctx.font = `700 ${v}px Arial, sans-serif`;
  };
  setFont(qSize);
  const maxW = W * 0.52;
  while (ctx.measureText(quote).width > maxW && qSize > 9) {
    qSize -= 1;
    setFont(qSize);
  }
  const qW = ctx.measureText(quote).width;
  const starsW = 5 * starSize * 2.3;
  const gap = starSize * 0.9;
  const totalW = starsW + gap + qW;
  const x = (W - totalW) / 2;
  drawStarsRow(ctx, x, midY, starSize, stars);
  ctx.save();
  setFont(qSize);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(quote, x + starsW + gap, midY);
  ctx.restore();
}

/** A spiky starburst seal: "ORIGINAL / COVER ART" with a dashed inner ring. */
function drawStarburst(ctx, cx, cy, r) {
  const spikes = 16;
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const ang = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.78;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffd166';
  ctx.fill();
  ctx.strokeStyle = '#ff2e88';
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = '#7b1e3b';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.setLineDash([]);
  drawStar(ctx, cx - r * 0.32, cy - r * 0.42, r * 0.08, '#3b115f');
  drawStar(ctx, cx + r * 0.32, cy - r * 0.42, r * 0.08, '#3b115f');
  ctx.fillStyle = '#3b115f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${r * 0.26}px Arial, sans-serif`;
  ctx.fillText('ORIGINAL', cx, cy - r * 0.13);
  ctx.font = `900 ${r * 0.21}px Arial, sans-serif`;
  ctx.fillText('COVER ART', cx, cy + r * 0.17);
  ctx.restore();
}

/** The yellow "EST. 2026" roundel with a dashed ring. */
function drawRoundel(ctx, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd166';
  ctx.fill();
  ctx.strokeStyle = '#12081d';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2);
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = '#12081d';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#12081d';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${r * 0.26}px Arial, sans-serif`;
  ctx.fillText('EST.', cx, cy - r * 0.28);
  ctx.font = `900 ${r * 0.42}px Arial, sans-serif`;
  ctx.fillText('2026', cx, cy + r * 0.14);
  ctx.font = `700 ${r * 0.15}px Arial, sans-serif`;
  ctx.fillText('★ ★ ★', cx, cy + r * 0.52);
  ctx.restore();
}

/** A cyan "VOL. 01" box. */
function drawVolBadge(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = '#00e5ff';
  roundRectPath(ctx, x, y, w, h, 4);
  ctx.fill();
  ctx.strokeStyle = '#12081d';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#12081d';
  ctx.font = `900 ${h * 0.52}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VOL. 01', x + w / 2, y + h / 2 + 1);
  ctx.restore();
}

/** A tilted pink "COLLECTOR'S EDITION" ribbon, anchored at its right end. */
function drawCollectorRibbon(ctx, rightX, y) {
  const text = "COLLECTOR'S EDITION";
  const size = 13;
  ctx.save();
  ctx.translate(rightX, y);
  ctx.rotate(-0.05);
  ctx.font = `800 ${size}px Arial, sans-serif`;
  const w = ctx.measureText(text).width + size * 1.6;
  const h = size * 1.9;
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(-w, -h / 2, w, h);
  ctx.fillStyle = '#b3006b';
  ctx.beginPath();
  ctx.moveTo(-w, -h / 2);
  ctx.lineTo(-w - h * 0.5, 0);
  ctx.lineTo(-w, h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, -w / 2, 1);
  ctx.restore();
}

/** The pink script line under the title: italic serif with a neon glow. */
function drawScriptLine(ctx, text, cx, baselineY, maxW, size, color) {
  let s = size;
  const setFont = (v) => {
    ctx.font = `italic 700 ${v}px Georgia, "Times New Roman", serif`;
  };
  setFont(s);
  while (ctx.measureText(text).width > maxW && s > 10) {
    s -= 2;
    setFont(s);
  }
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = color;
  ctx.shadowBlur = s * 0.35;
  ctx.fillStyle = color;
  ctx.fillText(text, cx, baselineY);
  ctx.restore();
}

/** The tagline strip: gradient band, palms at the edges, centred tagline. */
function drawTaglineStrip(ctx, W, H, z, state, grade) {
  const y = z.stripY;
  const h = z.stripH;
  const g = ctx.createLinearGradient(0, y, W, y);
  g.addColorStop(0, grade.bandTop);
  g.addColorStop(0.5, grade.accent);
  g.addColorStop(1, grade.bandTop);
  ctx.fillStyle = g;
  ctx.fillRect(0, y, W, h);
  ctx.save();
  ctx.globalAlpha = 0.85;
  drawPalm(ctx, W * 0.03, y + h - 2, h * 1.1, grade.palm);
  drawPalm(ctx, W * 0.97, y + h - 2, h * 0.95, grade.palm, true);
  ctx.restore();
  const tag = (state.tagline || '').trim().toUpperCase();
  if (tag) {
    drawSpacedLine(ctx, tag, W / 2, y + h * 0.68, W * 0.8, Math.max(10, h * 0.34), '#ffffff');
  }
}

/** The dense footer: small print on the left, a procedural barcode on the right. */
function drawFooter(ctx, W, H, z, state) {
  const y = z.footY;
  const h = z.footH;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, y, W, h);
  ctx.fillStyle = '#ff5e8a';
  ctx.fillRect(0, y, W, Math.max(2, h * 0.05));
  // Barcode: a white plate with seeded black bars and a catalogue number.
  const bw = Math.max(70, Math.round(W * 0.09));
  const bh = h * 0.72;
  const bx = W - z.frame - bw - 6;
  const by = y + (h - bh) / 2;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(bx, by, bw, bh);
  const rand = lcg(626);
  ctx.fillStyle = '#000000';
  let bx2 = bx + 4;
  while (bx2 < bx + bw - 4) {
    const wbar = 1 + Math.floor(rand() * 3);
    if (rand() > 0.42) ctx.fillRect(bx2, by + 3, wbar, bh * 0.6);
    bx2 += wbar + 1 + Math.floor(rand() * 2);
  }
  ctx.font = `700 ${Math.max(7, Math.round(bh * 0.2))}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('VC-0626', bx + bw / 2, by + bh - 2);
  // Small print, shrinking until it fits before the barcode.
  const text = (state.footer || '').trim().toUpperCase();
  if (text) {
    let fSize = Math.max(8, Math.round(h * 0.24));
    const setFont = (v) => {
      ctx.font = `700 ${v}px Arial, sans-serif`;
    };
    setFont(fSize);
    const maxW = bx - z.frame - 16;
    while (ctx.measureText(text).width > maxW && fSize > 7) {
      fSize -= 1;
      setFont(fSize);
    }
    ctx.save();
    ctx.fillStyle = '#c9b8d8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '1px';
    ctx.fillText(text, z.frame + 8, y + h / 2 + 1);
    ctx.restore();
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
}

/** The lettering band across the foot of the cover: eyebrow, title, subtitle. */
function drawTitleBand(ctx, W, H, z, state, grade) {
  const bandY = z.bandY;
  const bandH = z.bandH;
  const band = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  band.addColorStop(0, grade.bandTop);
  band.addColorStop(1, grade.bandBot);
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, W, bandH);
  ctx.fillStyle = grade.bandLine;
  ctx.fillRect(0, bandY, W, Math.max(3, bandH * 0.03));
  // Palm silhouettes at the band's edges, behind the lettering.
  ctx.save();
  ctx.globalAlpha = 0.9;
  drawPalm(ctx, W * 0.035, bandY + bandH - bandH * 0.04, bandH * 0.95, grade.palm);
  drawPalm(ctx, W * 0.965, bandY + bandH - bandH * 0.04, bandH * 0.8, grade.palm, true);
  ctx.restore();
  drawHalftone(ctx, W - bandH * 0.46, bandY + bandH * 0.1, bandH * 0.36, bandH * 0.3, grade.accent);
  drawSpacedLine(ctx, 'VICE COAST COVER STUDIO', W / 2, bandY + bandH * 0.2, W * 0.7, Math.max(10, bandH * 0.105), grade.accent);
  const title = (state.title || '').trim().toUpperCase() || 'VICE COAST';
  drawTitleText(ctx, title, W / 2, bandY + bandH * 0.62, W * 0.74, bandH * 0.42, grade);
  const sub = (state.subtitle || '').trim();
  if (sub) {
    drawScriptLine(ctx, sub, W / 2, bandY + bandH * 0.9, W * 0.62, Math.max(12, bandH * 0.2), grade.accent);
  }
  // Badges, each toggleable from the editor.
  const badges = state.badges || {};
  if (badges.vol) {
    drawVolBadge(ctx, z.frame + 10, bandY + 10, Math.max(72, W * 0.11), Math.max(22, bandH * 0.17));
  }
  if (badges.est) {
    drawRoundel(ctx, z.frame + bandH * 0.34 + 14, bandY + bandH * 0.62, bandH * 0.34);
  }
  if (badges.collector) {
    drawCollectorRibbon(ctx, W - z.frame - 4, bandY + bandH - 16);
  }
  if (badges.seal) {
    // Far right of the title band, clear of the title and the quote above it.
    const r = Math.min(W, H) * 0.05;
    drawStarburst(ctx, W - z.frame - r - 6, bandY + bandH * 0.3, r);
  }
}

/** Seeded film grain over the whole cover, so flat areas never look digital. */
function drawGrain(ctx, W, H) {
  const rand = lcg(20261119);
  const n = Math.min(4200, Math.round((W * H) / 1200));
  ctx.save();
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(rand() * W, rand() * H, 1.5, 1.5);
  }
  ctx.restore();
}

/**
 * Draws the whole cover. `state` holds layout, grade, title, subtitle, panels
 * (one per layout panel: { src, zoom, ox, oy }) and photos (a Map of id to image).
 */
export function drawCover(ctx, W, H, state) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  const layout = LAYOUTS[state.layout] || LAYOUTS.show;
  const z = coverZones(W, H);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);
  const corner = Math.min(14, Math.round(Math.min(W, H) * 0.012));
  const panels = layout.panels(W, H);
  panels.forEach((r, i) => {
    const panel = state.panels[i] || { src: 'art', zoom: 1, ox: 0, oy: 0 };
    ctx.save();
    roundRectPath(ctx, r.x, r.y, r.w, r.h, corner);
    ctx.clip();
    const img = state.photos ? state.photos.get(panel.src) : null;
    if (img) drawCartoonPhoto(ctx, img, r, panel);
    else drawScene(ctx, r, grade);
    applyWash(ctx, r, grade);
    drawVignette(ctx, r);
    drawPanelCaption(ctx, r, panel, grade);
    if (panel.label) drawCharLabel(ctx, r, panel.label);
    ctx.restore();
    if (layout.id !== 'full') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, Math.min(W, H) * 0.003);
      roundRectPath(ctx, r.x, r.y, r.w, r.h, corner);
      ctx.stroke();
    }
  });
  const badges = state.badges || {};
  if (badges.wanted) drawWantedTag(ctx, W, H, z, state);
  drawQuoteStrip(ctx, W, H, z, state);
  drawTitleBand(ctx, W, H, z, state, grade);
  drawTaglineStrip(ctx, W, H, z, state, grade);
  drawFooter(ctx, W, H, z, state);
  // Outer frame: an accent line at the very edge and a thin white line inside.
  ctx.strokeStyle = grade.accent;
  ctx.lineWidth = Math.max(3, Math.min(W, H) * 0.004);
  ctx.strokeRect(2, 2, W - 4, H - 4);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  ctx.strokeRect(z.frame - 1, z.frame - 1, W - 2 * z.frame + 2, H - 2 * z.frame + 2);
  drawGrain(ctx, W, H);
}
