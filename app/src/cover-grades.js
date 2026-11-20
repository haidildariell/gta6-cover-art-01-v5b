// cover-grades.js — the six colour grades for Vice Coast Cover Lab.
// Every grade is a gradient map (shadow -> highlight) plus saturation,
// contrast, optional posterize steps and an optional halftone strength.
// The grade is applied per pixel on a real canvas, never a CSS filter.

/** Hex colour ("#rrggbb") to [r, g, b]. */
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Linear interpolation between two rgb triples. */
function lerpRgb(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export const GRADES = [
  {
    id: 'sunset',
    name: 'Sunset',
    swatch: '#ff7a18',
    stops: [[0, '#160a2e'], [0.42, '#c22e5e'], [0.72, '#ff7a18'], [1, '#ffd166']],
    mix: 0.62,
    saturation: 1.18,
    contrast: 1.08,
    brightness: 1.02,
    posterize: 0,
    halftone: 0,
    grain: 0.05,
  },
  {
    id: 'neon-nights',
    name: 'Neon Nights',
    swatch: '#ff2e88',
    stops: [[0, '#050514'], [0.4, '#7a1e6e'], [0.7, '#ff2e88'], [1, '#7df9ff']],
    mix: 0.66,
    saturation: 1.32,
    contrast: 1.12,
    brightness: 1.0,
    posterize: 0,
    halftone: 0,
    grain: 0.06,
  },
  {
    id: 'teal-noir',
    name: 'Teal Noir',
    swatch: '#0f766e',
    stops: [[0, '#02141a'], [0.45, '#0f766e'], [0.78, '#5eead4'], [1, '#e0f2f1']],
    mix: 0.6,
    saturation: 0.92,
    contrast: 1.15,
    brightness: 0.98,
    posterize: 0,
    halftone: 0,
    grain: 0.07,
  },
  {
    id: 'rose-gold',
    name: 'Rose Gold',
    swatch: '#e07856',
    stops: [[0, '#2b0a1e'], [0.45, '#a83a5c'], [0.75, '#e07856'], [1, '#ffe3c2']],
    mix: 0.6,
    saturation: 1.1,
    contrast: 1.06,
    brightness: 1.03,
    posterize: 0,
    halftone: 0,
    grain: 0.04,
  },
  {
    id: 'mono-poster',
    name: 'Mono Poster',
    swatch: '#8a8a8a',
    stops: [[0, '#0d0d0d'], [0.5, '#8a8a8a'], [1, '#ffffff']],
    mix: 0.85,
    saturation: 0,
    contrast: 1.18,
    brightness: 1.0,
    posterize: 5,
    halftone: 0.45,
    grain: 0.08,
  },
  {
    id: 'poster-ink',
    name: 'Poster Ink',
    swatch: '#ff5e3a',
    stops: [[0, '#12041f'], [0.42, '#8f1d4e'], [0.72, '#ff5e3a'], [1, '#ffe259']],
    mix: 0.78,
    saturation: 1.25,
    contrast: 1.14,
    brightness: 1.0,
    posterize: 4,
    halftone: 1,
    grain: 0.06,
  },
];

/** Look a grade up by id; fall back to Sunset. */
export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

/**
 * Build a 256-entry lookup table for a grade: luminance in, mapped rgb out.
 * The table is built once per render so the per-pixel loop stays cheap.
 */
export function buildGradeLut(grade) {
  const stops = grade.stops.map(([t, hex]) => [t, hexToRgb(hex)]);
  const r = new Uint8Array(256);
  const g = new Uint8Array(256);
  const b = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let lo = stops[0];
    let hi = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) {
        lo = stops[s];
        hi = stops[s + 1];
        break;
      }
    }
    const span = hi[0] - lo[0] || 1;
    const f = Math.min(1, Math.max(0, (t - lo[0]) / span));
    const c = lerpRgb(lo[1], hi[1], f);
    r[i] = c[0];
    g[i] = c[1];
    b[i] = c[2];
  }
  return { r, g, b };
}

/**
 * Apply a grade to raw pixel data in place: luminance -> gradient map,
 * blended with the original colour, then saturation / contrast / brightness.
 * `levels` posterizes the luminance before the map when > 0.
 */
export function applyGradeToPixels(data, lut, grade) {
  const mix = grade.mix;
  const sat = grade.saturation;
  const con = grade.contrast;
  const bri = grade.brightness;
  const levels = grade.posterize;
  const step = levels > 1 ? 255 / (levels - 1) : 0;
  for (let i = 0; i < data.length; i += 4) {
    const or = data[i];
    const og = data[i + 1];
    const ob = data[i + 2];
    let lum = 0.2126 * or + 0.7152 * og + 0.0722 * ob;
    lum = (lum - 128) * con + 128;
    lum *= bri;
    if (lum < 0) lum = 0;
    else if (lum > 255) lum = 255;
    if (levels > 1) lum = Math.round(lum / step) * step;
    const li = lum | 0;
    let nr = or + (lut.r[li] - or) * mix;
    let ng = og + (lut.g[li] - og) * mix;
    let nb = ob + (lut.b[li] - ob) * mix;
    if (sat !== 1) {
      const gray = 0.2126 * nr + 0.7152 * ng + 0.0722 * nb;
      nr = gray + (nr - gray) * sat;
      ng = gray + (ng - gray) * sat;
      nb = gray + (nb - gray) * sat;
    }
    data[i] = nr < 0 ? 0 : nr > 255 ? 255 : nr;
    data[i + 1] = ng < 0 ? 0 : ng > 255 ? 255 : ng;
    data[i + 2] = nb < 0 ? 0 : nb > 255 ? 255 : nb;
  }
}

/**
 * Real halftone: sample the graded panel's luminance on a grid and stamp
 * ink dots whose radius grows with the darkness underneath.
 */
export function drawHalftoneDots(ctx, sourceCanvas, x, y, w, h, strength) {
  if (strength <= 0 || w < 8 || h < 8) return;
  const step = Math.max(5, Math.round(w / 150));
  const probe = document.createElement('canvas');
  probe.width = Math.max(1, Math.ceil(w / step));
  probe.height = Math.max(1, Math.ceil(h / step));
  const pctx = probe.getContext('2d');
  pctx.drawImage(sourceCanvas, 0, 0, probe.width, probe.height);
  const px = pctx.getImageData(0, 0, probe.width, probe.height).data;
  ctx.save();
  ctx.fillStyle = 'rgba(12, 4, 26, 0.62)';
  for (let gy = 0; gy < probe.height; gy++) {
    for (let gx = 0; gx < probe.width; gx++) {
      const i = (gy * probe.width + gx) * 4;
      const lum = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
      const radius = (1 - lum / 255) * step * 0.52 * strength;
      if (radius < 0.4) continue;
      ctx.beginPath();
      ctx.arc(x + gx * step + step / 2, y + gy * step + step / 2, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Deterministic seeded random (mulberry32) so grain is identical every export. */
export function makeSeededRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Film grain: sparse light and dark specks over the whole cover. */
export function drawFilmGrain(ctx, w, h, amount, seed) {
  if (amount <= 0) return;
  const rand = makeSeededRandom(seed);
  const count = Math.round(w * h * amount * 0.00012);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const v = rand();
    ctx.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)';
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 2);
  }
  ctx.restore();
}

/** Soft dark vignette pulling the eye to the centre. */
export function drawVignette(ctx, w, h) {
  const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(8,2,18,0.42)');
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
