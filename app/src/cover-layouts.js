// cover-layouts.js — the six panel layouts for Vice Coast Cover Lab.
// Every layout is a function of the cover size returning normalised panels
// (x, y, w, h in 0..1), a title band and an optional tagline strip.
// `photo` is the default sample-photo index for that panel.

const GAP = 0.008;
const TITLE_H = 0.26;
const PHOTO_H = 1 - TITLE_H;

function gridPanels(cols, rows, areaH, photos) {
  const panels = [];
  const pw = (1 - GAP * (cols + 1)) / cols;
  const ph = (areaH - GAP * (rows + 1)) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      panels.push({
        x: GAP + c * (pw + GAP),
        y: GAP + r * (ph + GAP),
        w: pw,
        h: ph,
        rot: 0,
        photo: photos[panels.length % photos.length],
      });
    }
  }
  return panels;
}

function titleBand(overlay) {
  return { x: 0, y: PHOTO_H, w: 1, h: TITLE_H, align: 'left', overlay: !!overlay };
}

function taglineStrip() {
  return { x: 0, y: 0.965, w: 1, h: 0.035 };
}

export const LAYOUTS = [
  {
    id: 'nine-panel',
    name: 'Photo Grid',
    blurb: 'Nine photos, title block below',
    build() {
      return {
        background: 'dark',
        panels: gridPanels(3, 3, PHOTO_H, [0, 1, 2, 3, 0, 1, 2, 3, 0]),
        title: titleBand(false),
        tagline: taglineStrip(),
      };
    },
  },
  {
    id: 'hero-three',
    name: 'Hero + Three',
    blurb: 'One big hero, three stacked beside it',
    build() {
      const heroW = 0.615;
      const sideX = heroW + GAP;
      const sideW = 1 - sideX - GAP;
      const sh = (PHOTO_H - GAP * 4) / 3;
      return {
        background: 'dark',
        panels: [
          { x: GAP, y: GAP, w: heroW, h: PHOTO_H - GAP * 2, rot: 0, photo: 0 },
          { x: sideX, y: GAP, w: sideW, h: sh, rot: 0, photo: 1 },
          { x: sideX, y: GAP * 2 + sh, w: sideW, h: sh, rot: 0, photo: 2 },
          { x: sideX, y: GAP * 3 + sh * 2, w: sideW, h: sh, rot: 0, photo: 3 },
        ],
        title: titleBand(false),
        tagline: taglineStrip(),
      };
    },
  },
  {
    id: 'full-bleed',
    name: 'Full Bleed',
    blurb: 'One photo edge to edge, title over it',
    build() {
      return {
        background: 'dark',
        panels: [{ x: 0, y: 0, w: 1, h: 1, rot: 0, photo: 0 }],
        title: titleBand(true),
        tagline: taglineStrip(),
      };
    },
  },
  {
    id: 'tilted-snapshots',
    name: 'Tilted Snapshots',
    blurb: 'Three tilted prints on a sunset sky',
    build() {
      return {
        background: 'sunset',
        panels: [
          { x: 0.045, y: 0.3, w: 0.42, h: 0.4, rot: -6, photo: 0 },
          { x: 0.535, y: 0.26, w: 0.42, h: 0.44, rot: 4, photo: 1 },
          { x: 0.27, y: 0.62, w: 0.46, h: 0.32, rot: -2, photo: 2 },
        ],
        title: { x: 0, y: 0.03, w: 1, h: 0.2, align: 'center', overlay: true },
        tagline: taglineStrip(),
      };
    },
  },
  {
    id: 'four-panel',
    name: 'Four Panel',
    blurb: 'Classic 2 x 2 poster grid',
    build() {
      return {
        background: 'dark',
        panels: gridPanels(2, 2, PHOTO_H, [0, 1, 2, 3]),
        title: titleBand(false),
        tagline: taglineStrip(),
      };
    },
  },
  {
    id: 'two-split',
    name: 'Two Panel Split',
    blurb: 'Two tall panels side by side',
    build() {
      return {
        background: 'dark',
        panels: gridPanels(2, 1, PHOTO_H, [0, 1]),
        title: titleBand(false),
        tagline: taglineStrip(),
      };
    },
  },
];

/** Look a layout up by id; fall back to the nine-panel grid. */
export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}
