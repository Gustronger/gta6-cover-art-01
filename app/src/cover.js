// The cover renderer: draws a GTA-style multi-panel poster onto any 2D canvas.
// Everything on the poster is drawn here in code — gradient skies, a slatted
// synthwave sun, skyline and palm silhouettes, halftone dots and bold condensed
// lettering — so the art is original and the poster looks rich even before a
// photo is loaded. All randomness is seeded, so the same state draws the same
// bytes every time.

import { GRADES } from './grades.js';
import { LAYOUTS } from './layouts.js';

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

/** The lettering band across the foot of the cover: eyebrow, title, subtitle. */
function drawTitleBand(ctx, W, H, state, grade) {
  const bandH = Math.round(H * 0.2);
  const bandY = H - bandH;
  const band = ctx.createLinearGradient(0, bandY, 0, H);
  band.addColorStop(0, grade.bandTop);
  band.addColorStop(1, grade.bandBot);
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, W, bandH);
  ctx.fillStyle = grade.bandLine;
  ctx.fillRect(0, bandY, W, Math.max(3, bandH * 0.03));
  // Palm silhouettes at the band's edges, behind the lettering.
  ctx.save();
  ctx.globalAlpha = 0.9;
  drawPalm(ctx, W * 0.035, H - bandH * 0.04, bandH * 0.95, grade.palm);
  drawPalm(ctx, W * 0.965, H - bandH * 0.04, bandH * 0.8, grade.palm, true);
  ctx.restore();
  drawHalftone(ctx, W - bandH * 0.46, bandY + bandH * 0.1, bandH * 0.36, bandH * 0.3, grade.accent);
  drawSpacedLine(ctx, 'VICE COAST COVER STUDIO', W / 2, bandY + bandH * 0.24, W * 0.7, Math.max(10, bandH * 0.105), grade.accent);
  const title = (state.title || '').trim().toUpperCase() || 'VICE COAST';
  drawTitleText(ctx, title, W / 2, bandY + bandH * 0.7, W * 0.82, bandH * 0.46, grade);
  const sub = (state.subtitle || '').trim().toUpperCase();
  if (sub) {
    drawSpacedLine(ctx, sub, W / 2, bandY + bandH * 0.93, W * 0.72, Math.max(9, bandH * 0.13), grade.accent);
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
  const layout = LAYOUTS[state.layout] || LAYOUTS.duo;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = grade.edge;
  ctx.fillRect(0, 0, W, H);
  const corner = Math.min(14, Math.round(Math.min(W, H) * 0.012));
  const panels = layout.panels(W, H);
  panels.forEach((r, i) => {
    const panel = state.panels[i] || { src: 'art', zoom: 1, ox: 0, oy: 0 };
    ctx.save();
    roundRectPath(ctx, r.x, r.y, r.w, r.h, corner);
    ctx.clip();
    const img = state.photos ? state.photos.get(panel.src) : null;
    if (img) drawPhotoCover(ctx, img, r, panel);
    else drawScene(ctx, r, grade);
    applyWash(ctx, r, grade);
    drawVignette(ctx, r);
    ctx.restore();
    if (layout.id !== 'full') {
      ctx.strokeStyle = grade.panelLine;
      ctx.lineWidth = Math.max(2, Math.min(W, H) * 0.003);
      roundRectPath(ctx, r.x, r.y, r.w, r.h, corner);
      ctx.stroke();
    }
  });
  drawTitleBand(ctx, W, H, state, grade);
  ctx.strokeStyle = grade.accent;
  ctx.lineWidth = Math.max(3, Math.min(W, H) * 0.004);
  ctx.strokeRect(2, 2, W - 4, H - 4);
  drawGrain(ctx, W, H);
}
