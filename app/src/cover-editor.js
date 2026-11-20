// cover-editor.js — editor state, undo/redo, panel picking, uploads,
// presets and PNG export for Vice Coast Cover Lab.

import { LAYOUTS, layoutById } from './cover-layouts.js';
import { GRADES, gradeById } from './cover-grades.js';
import { renderCover, EXPORT_SIZES } from './cover-render.js';

export const SAMPLE_PHOTOS = [
  { file: 'samples/sample-convertible.jpg', label: 'Convertible' },
  { file: 'samples/sample-rooftop.jpg', label: 'Rooftop' },
  { file: 'samples/sample-neon.jpg', label: 'Neon Street' },
  { file: 'samples/sample-pier.jpg', label: 'Pier' },
];

const PRESETS = {
  photoCover: { layoutId: 'nine-panel', gradeId: 'poster-ink' },
  heroPhoto: { layoutId: 'hero-three', gradeId: 'sunset' },
  neonNight: { layoutId: 'full-bleed', gradeId: 'neon-nights' },
};

function defaultState() {
  return {
    layoutId: 'nine-panel',
    gradeId: 'poster-ink',
    title: 'VICE COAST',
    subtitle: 'summer nights',
    eyebrow: 'WELCOME TO THE',
    tagline: 'PALMS • NEON • GOLDEN HOUR',
    badge: 'NEW SUMMER 2026',
    panels: Array.from({ length: 9 }, (_, i) => ({
      photo: [0, 1, 2, 3, 0, 1, 2, 3, 0][i],
      zoom: 1,
      ox: 0,
      oy: 0,
    })),
  };
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

/** Load one image; resolves with the HTMLImageElement. */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load ' + src));
    img.src = src;
  });
}

export class CoverEditor {
  constructor(canvas) {
    this.canvas = canvas;
    this.state = defaultState();
    this.images = [];
    this.selectedPanel = 0;
    this.undoStack = [];
    this.redoStack = [];
    this.dragging = null;
    this.onStateChange = null;
  }

  async loadSamples() {
    this.images = await Promise.all(SAMPLE_PHOTOS.map((s) => loadImage(s.file)));
  }

  /** Add user-uploaded photos (File objects) to the library. */
  async addUploads(files) {
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('read failed'));
        reader.readAsDataURL(file);
      });
      this.images.push(await loadImage(dataUrl));
    }
    this.redraw();
  }

  pushHistory() {
    this.undoStack.push(cloneState(this.state));
    if (this.undoStack.length > 60) this.undoStack.shift();
    this.redoStack.length = 0;
    this.syncUndoButtons();
  }

  undo() {
    if (this.undoStack.length === 0) return;
    this.redoStack.push(cloneState(this.state));
    this.state = this.undoStack.pop();
    this.selectedPanel = Math.min(this.selectedPanel, this.panelCount() - 1);
    this.syncUndoButtons();
    this.syncInputs();
    this.redraw();
  }

  redo() {
    if (this.redoStack.length === 0) return;
    this.undoStack.push(cloneState(this.state));
    this.state = this.redoStack.pop();
    this.selectedPanel = Math.min(this.selectedPanel, this.panelCount() - 1);
    this.syncUndoButtons();
    this.syncInputs();
    this.redraw();
  }

  panelCount() {
    return layoutById(this.state.layoutId).build().panels.length;
  }

  setLayout(layoutId) {
    if (this.state.layoutId === layoutId) return;
    this.pushHistory();
    this.state.layoutId = layoutId;
    const panels = layoutById(layoutId).build().panels;
    panels.forEach((panel, i) => {
      if (this.state.panels[i]) this.state.panels[i].photo = panel.photo;
    });
    this.selectedPanel = 0;
    this.syncInputs();
    this.redraw();
  }

  setGrade(gradeId) {
    if (this.state.gradeId === gradeId) return;
    this.pushHistory();
    this.state.gradeId = gradeId;
    this.syncInputs();
    this.redraw();
  }

  applyPreset(name) {
    const preset = PRESETS[name];
    if (!preset) return;
    this.pushHistory();
    this.state.layoutId = preset.layoutId;
    this.state.gradeId = preset.gradeId;
    const panels = layoutById(preset.layoutId).build().panels;
    panels.forEach((panel, i) => {
      if (this.state.panels[i]) this.state.panels[i].photo = panel.photo;
    });
    this.selectedPanel = 0;
    this.syncInputs();
    this.redraw();
  }

  setText(key, value) {
    if (this.state[key] === value) return;
    this.state[key] = value;
    this.redraw();
  }

  commitText() {
    this.pushHistory();
  }

  setPanelPhoto(index, photoIndex) {
    this.pushHistory();
    this.state.panels[index].photo = photoIndex;
    this.redraw();
  }

  setPanelZoom(index, zoom) {
    this.state.panels[index].zoom = zoom;
    this.redraw();
  }

  setPanelOffset(index, ox, oy) {
    this.state.panels[index].ox = ox;
    this.state.panels[index].oy = oy;
    this.redraw();
  }

  fillAllPanels(photoIndex) {
    this.pushHistory();
    const count = this.panelCount();
    for (let i = 0; i < count; i++) this.state.panels[i].photo = photoIndex;
    this.redraw();
  }

  /** Which panel (if any) sits under a point in preview-canvas pixels. */
  panelAtPoint(px, py) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const nx = (px * scaleX) / this.canvas.width;
    const ny = (py * scaleY) / this.canvas.height;
    const panels = layoutById(this.state.layoutId).build().panels;
    for (let i = panels.length - 1; i >= 0; i--) {
      const p = panels[i];
      if (nx >= p.x && nx <= p.x + p.w && ny >= p.y && ny <= p.y + p.h) return i;
    }
    return -1;
  }

  beginDrag(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const index = this.panelAtPoint(clientX - rect.left, clientY - rect.top);
    if (index < 0) return false;
    this.selectedPanel = index;
    this.pushHistory();
    this.dragging = { index, lastX: clientX, lastY: clientY };
    this.syncInputs();
    this.redraw();
    return true;
  }

  moveDrag(clientX, clientY) {
    if (!this.dragging) return;
    const rect = this.canvas.getBoundingClientRect();
    const panel = layoutById(this.state.layoutId).build().panels[this.dragging.index];
    const slot = this.state.panels[this.dragging.index];
    slot.ox += ((clientX - this.dragging.lastX) / rect.width / panel.w) * 0.9;
    slot.oy += ((clientY - this.dragging.lastY) / rect.height / panel.h) * 0.9;
    slot.ox = Math.max(-1, Math.min(1, slot.ox));
    slot.oy = Math.max(-1, Math.min(1, slot.oy));
    this.dragging.lastX = clientX;
    this.dragging.lastY = clientY;
    this.syncInputs();
    this.redraw();
  }

  endDrag() {
    this.dragging = null;
  }

  redraw() {
    if (this.images.length === 0) return;
    renderCover(this.canvas, this.state, this.images);
    if (this.onStateChange) this.onStateChange();
  }

  /** Render at an export size and return a PNG blob. */
  async exportPng(sizeId) {
    const size = EXPORT_SIZES.find((s) => s.id === sizeId) || EXPORT_SIZES[0];
    const off = document.createElement('canvas');
    off.width = size.w;
    off.height = size.h;
    await document.fonts.load('900 100px Anton');
    await document.fonts.load('100px Pacifico');
    renderCover(off, this.state, this.images);
    return new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  }

  async downloadExport(sizeId) {
    const blob = await this.exportPng(sizeId);
    if (!blob) return false;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vice-coast-cover-${sizeId}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return true;
  }

  // -- DOM wiring (filled in by main.js) --------------------------------
  syncInputs() {}
  syncUndoButtons() {}
}

export { LAYOUTS, GRADES, gradeById, EXPORT_SIZES };
