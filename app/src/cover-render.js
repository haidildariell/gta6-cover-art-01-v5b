// cover-render.js — draws a finished cover onto a canvas.
// One entry point: renderCover(canvas, state, images).
// Panels are drawn photo -> grade (gradient map + posterize) -> halftone,
// then the title block, badge, tagline, grain and vignette go on top.

import { layoutById } from './cover-layouts.js';
import {
  gradeById,
  buildGradeLut,
  applyGradeToPixels,
  drawHalftoneDots,
  drawFilmGrain,
  drawVignette,
} from './cover-grades.js';

/** Shrink a font until the text fits maxWidth; returns the fitted size. */
function fitTextSize(ctx, text, family, weight, startSize, maxWidth) {
  let size = startSize;
  while (size > 8) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  ctx.font = `${weight} ${size}px ${family}`;
  return size;
}

/** Letter-spaced fillText (canvas has no native letter-spacing everywhere). */
function drawSpacedText(ctx, text, x, y, spacing) {
  let cursor = x;
  for (const ch of text) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + spacing;
  }
  return cursor - x;
}

/** Width of a letter-spaced string. */
function spacedWidth(ctx, text, spacing) {
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + spacing;
  return w - spacing;
}

/**
 * Draw one photo into a panel rect with cover-fit, zoom and pan offsets.
 * ox/oy are fractions of the panel size; zoom 1 = cover fit.
 */
function drawPhotoCover(ctx, img, px, py, pw, ph, zoom, ox, oy) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(pw / iw, ph / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = px + (pw - dw) / 2 + ox * pw;
  const dy = py + (ph - dh) / 2 + oy * ph;
  ctx.drawImage(img, dx, dy, dw, dh);
}

/** Starburst badge path centred at (cx, cy). */
function starburstPath(ctx, cx, cy, outer, inner, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/**
 * Render the whole cover. `state` holds layoutId, gradeId, title, subtitle,
 * eyebrow, tagline, badge and panels [{photo, zoom, ox, oy}].
 * `images` is an array of loaded HTMLImageElements (samples + uploads).
 */
export function renderCover(canvas, state, images) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const layout = layoutById(state.layoutId).build();
  const grade = gradeById(state.gradeId);
  const lut = buildGradeLut(grade);

  // ---- background -------------------------------------------------------
  if (layout.background === 'sunset') {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#2b1055');
    sky.addColorStop(0.45, '#c22e5e');
    sky.addColorStop(0.75, '#ff7a18');
    sky.addColorStop(1, '#ffd166');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    const sun = ctx.createRadialGradient(W * 0.5, H * 0.42, 4, W * 0.5, H * 0.42, H * 0.34);
    sun.addColorStop(0, 'rgba(255, 225, 140, 0.95)');
    sun.addColorStop(0.5, 'rgba(255, 122, 24, 0.45)');
    sun.addColorStop(1, 'rgba(255, 122, 24, 0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = '#0d0716';
    ctx.fillRect(0, 0, W, H);
  }

  // ---- photo panels -----------------------------------------------------
  layout.panels.forEach((panel, index) => {
    const slot = state.panels[index] || { photo: panel.photo, zoom: 1, ox: 0, oy: 0 };
    const img = images[slot.photo];
    const px = panel.x * W;
    const py = panel.y * H;
    const pw = panel.w * W;
    const ph = panel.h * H;
    if (!img || pw < 4 || ph < 4) return;

    // Grade on a temp canvas at panel resolution, then place it.
    const temp = document.createElement('canvas');
    temp.width = Math.max(2, Math.round(pw));
    temp.height = Math.max(2, Math.round(ph));
    const tctx = temp.getContext('2d');
    drawPhotoCover(tctx, img, 0, 0, temp.width, temp.height, slot.zoom, slot.ox, slot.oy);
    const imageData = tctx.getImageData(0, 0, temp.width, temp.height);
    applyGradeToPixels(imageData.data, lut, grade);
    tctx.putImageData(imageData, 0, 0);
    if (grade.halftone > 0) drawHalftoneDots(tctx, temp, 0, 0, temp.width, temp.height, grade.halftone);

    ctx.save();
    if (panel.rot) {
      ctx.translate(px + pw / 2, py + ph / 2);
      ctx.rotate((panel.rot * Math.PI) / 180);
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = Math.max(8, W * 0.012);
      ctx.shadowOffsetY = Math.max(6, H * 0.008);
      ctx.fillStyle = '#ffffff';
      const border = Math.max(4, W * 0.006);
      ctx.fillRect(-pw / 2 - border, -ph / 2 - border, pw + border * 2, ph + border * 2);
      ctx.shadowColor = 'transparent';
      ctx.drawImage(temp, -pw / 2, -ph / 2, pw, ph);
    } else {
      ctx.drawImage(temp, px, py, pw, ph);
    }
    ctx.restore();
  });

  // ---- title band -------------------------------------------------------
  const band = layout.title;
  const bx = band.x * W;
  const by = band.y * H;
  const bw = band.w * W;
  const bh = band.h * H;
  if (band.overlay && layout.background !== 'sunset') {
    const scrim = ctx.createLinearGradient(0, by - bh * 0.4, 0, by + bh);
    scrim.addColorStop(0, 'rgba(13,7,22,0)');
    scrim.addColorStop(1, 'rgba(13,7,22,0.92)');
    ctx.fillStyle = scrim;
    ctx.fillRect(bx, by - bh * 0.4, bw, bh * 1.4);
  } else if (!band.overlay) {
    const bandGrad = ctx.createLinearGradient(0, by, 0, by + bh);
    bandGrad.addColorStop(0, '#1c0b33');
    bandGrad.addColorStop(1, '#0d0716');
    ctx.fillStyle = bandGrad;
    ctx.fillRect(bx, by, bw, bh);
    const edge = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    edge.addColorStop(0, '#ffd166');
    edge.addColorStop(0.5, '#ff2e88');
    edge.addColorStop(1, '#b967ff');
    ctx.fillStyle = edge;
    ctx.fillRect(bx, by, bw, Math.max(2, H * 0.004));
  }

  const pad = bw * 0.035;
  const alignCenter = band.align === 'center';
  const textX = alignCenter ? bx + bw / 2 : bx + pad;
  const textMax = bw - pad * 2;

  // Eyebrow.
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  const eyebrowSize = Math.max(10, bh * 0.08);
  ctx.font = `700 ${eyebrowSize}px Anton, sans-serif`;
  ctx.fillStyle = '#ffd166';
  const eyebrowY = by + bh * 0.14;
  if (alignCenter) {
    const w = spacedWidth(ctx, state.eyebrow, eyebrowSize * 0.28);
    drawSpacedText(ctx, state.eyebrow, textX - w / 2, eyebrowY, eyebrowSize * 0.28);
  } else {
    drawSpacedText(ctx, state.eyebrow, textX, eyebrowY, eyebrowSize * 0.28);
  }

  // Giant gradient title with a black outline.
  const titleSize = fitTextSize(ctx, state.title, 'Anton, sans-serif', 900, bh * 0.44, textMax);
  const titleY = by + bh * 0.6;
  const titleGrad = ctx.createLinearGradient(bx, titleY - titleSize, bx + bw, titleY);
  titleGrad.addColorStop(0, '#ffd166');
  titleGrad.addColorStop(0.35, '#ff7a18');
  titleGrad.addColorStop(0.7, '#ff2e88');
  titleGrad.addColorStop(1, '#b967ff');
  ctx.textAlign = alignCenter ? 'center' : 'left';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#12041f';
  ctx.lineWidth = Math.max(2, titleSize * 0.09);
  ctx.strokeText(state.title, textX, titleY);
  ctx.fillStyle = titleGrad;
  ctx.fillText(state.title, textX, titleY);

  // Neon script subtitle, tucked under the title, right side.
  ctx.save();
  const scriptSize = Math.max(12, bh * 0.21);
  ctx.font = `${scriptSize}px Pacifico, cursive`;
  ctx.shadowColor = '#ff2e88';
  ctx.shadowBlur = Math.max(10, bh * 0.12);
  ctx.fillStyle = '#ff8fd0';
  ctx.textAlign = 'right';
  ctx.fillText(state.subtitle, bx + bw - pad, by + bh * 0.88);
  ctx.restore();

  // Starburst badge, top right of the band.
  const badgeR = Math.max(14, bh * 0.3);
  const badgeCx = bx + bw - pad - badgeR * 0.4;
  const badgeCy = by + bh * 0.3;
  ctx.save();
  ctx.translate(badgeCx, badgeCy);
  ctx.rotate(-0.21);
  starburstPath(ctx, 0, 0, badgeR, badgeR * 0.78, 12);
  ctx.fillStyle = '#ffd166';
  ctx.fill();
  ctx.strokeStyle = '#12041f';
  ctx.lineWidth = Math.max(2, badgeR * 0.06);
  ctx.stroke();
  ctx.fillStyle = '#12041f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${badgeR * 0.34}px Anton, sans-serif`;
  ctx.fillText('NEW', 0, -badgeR * 0.18);
  ctx.font = `900 ${badgeR * 0.2}px Anton, sans-serif`;
  ctx.fillText('SUMMER 2026', 0, badgeR * 0.22);
  ctx.restore();
  ctx.restore();

  // ---- tagline strip ----------------------------------------------------
  if (layout.tagline) {
    const t = layout.tagline;
    const ty = t.y * H;
    ctx.save();
    ctx.font = `700 ${Math.max(9, H * 0.016)}px Anton, sans-serif`;
    ctx.fillStyle = '#ffb347';
    ctx.textAlign = 'center';
    const tagY = ty + (t.h * H) * 0.72;
    const tagW = spacedWidth(ctx, state.tagline, H * 0.004);
    drawSpacedText(ctx, state.tagline, W / 2 - tagW / 2, tagY, H * 0.004);
    ctx.restore();
  }

  // ---- finish: grain + vignette ----------------------------------------
  drawFilmGrain(ctx, W, H, grade.grain, 20261120);
  drawVignette(ctx, W, H);
}

/** Export sizes offered by the app. */
export const EXPORT_SIZES = [
  { id: '1080x1080', label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  { id: '1080x1350', label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  { id: '1920x1080', label: 'Landscape 1920 x 1080', w: 1920, h: 1080 },
];
