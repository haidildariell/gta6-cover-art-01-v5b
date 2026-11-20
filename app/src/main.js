// main.js — bootstrap for Vice Coast Cover Lab.
// Normal mode wires the editor UI. Shot mode (?shot=cover|story|square)
// renders the default cover full-frame for screenshots: the app's own
// drawing, at the window's size, with no editor chrome.

import { CoverEditor, SAMPLE_PHOTOS, loadImage } from './cover-editor.js';
import { LAYOUTS } from './cover-layouts.js';
import { GRADES } from './cover-grades.js';
import { renderCover, EXPORT_SIZES } from './cover-render.js';

const $ = (id) => document.getElementById(id);

async function loadFonts() {
  try {
    await Promise.all([
      document.fonts.load('900 100px Anton'),
      document.fonts.load('400 100px Anton'),
      document.fonts.load('100px Pacifico'),
    ]);
    await document.fonts.ready;
  } catch (err) {
    // Fonts are local files; if one fails the canvas falls back to sans.
  }
}

async function loadSampleImages() {
  return Promise.all(SAMPLE_PHOTOS.map((s) => loadImage(s.file)));
}

async function runShotMode(kind) {
  document.body.classList.add('shot-mode');
  const canvas = $('coverCanvas');
  const ratio = kind === 'story' ? 1080 / 1350 : kind === 'square' ? 1 : 1920 / 1080;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let w = vw;
  let h = Math.round(vw / ratio);
  if (h > vh) {
    h = vh;
    w = Math.round(vh * ratio);
  }
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const editor = new CoverEditor(canvas);
  await loadFonts();
  editor.images = await loadSampleImages();
  editor.redraw();
  document.documentElement.dataset.ready = '1';
}

function buildPicker(container, items, activeId, onPick, renderItem) {
  container.innerHTML = '';
  for (const item of items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pick' + (item.id === activeId ? ' active' : '');
    button.dataset.id = item.id;
    renderItem(button, item);
    button.addEventListener('click', () => {
      onPick(item.id);
      for (const child of container.children) child.classList.toggle('active', child.dataset.id === item.id);
    });
    container.appendChild(button);
  }
}

function buildPanelControls(editor) {
  const wrap = $('panelControls');
  const slot = editor.state.panels[editor.selectedPanel];
  const layout = editor.state.layoutId;
  const count = editor.panelCount();
  wrap.innerHTML = '';
  const title = document.createElement('div');
  title.className = 'panel-title';
  title.textContent = `Panel ${editor.selectedPanel + 1} of ${count} — ${layout}`;
  wrap.appendChild(title);

  const photoLabel = document.createElement('label');
  photoLabel.textContent = 'Photo in this panel';
  const photoSelect = document.createElement('select');
  photoSelect.id = 'panelPhoto';
  editor.images.forEach((img, i) => {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = i < SAMPLE_PHOTOS.length ? `Sample: ${SAMPLE_PHOTOS[i].label}` : `Upload ${i - SAMPLE_PHOTOS.length + 1}`;
    photoSelect.appendChild(option);
  });
  photoSelect.value = String(slot.photo);
  photoSelect.addEventListener('change', () => editor.setPanelPhoto(editor.selectedPanel, Number(photoSelect.value)));
  photoLabel.appendChild(photoSelect);
  wrap.appendChild(photoLabel);

  const zoomLabel = document.createElement('label');
  zoomLabel.textContent = `Zoom ${slot.zoom.toFixed(2)}x`;
  const zoom = document.createElement('input');
  zoom.type = 'range';
  zoom.min = '1';
  zoom.max = '2.5';
  zoom.step = '0.05';
  zoom.value = String(slot.zoom);
  zoom.addEventListener('input', () => {
    editor.setPanelZoom(editor.selectedPanel, Number(zoom.value));
    zoomLabel.textContent = `Zoom ${Number(zoom.value).toFixed(2)}x`;
  });
  zoom.addEventListener('change', () => editor.pushHistory());
  zoomLabel.appendChild(zoom);
  wrap.appendChild(zoomLabel);

  const oxLabel = document.createElement('label');
  oxLabel.textContent = `Pan left / right ${slot.ox.toFixed(2)}`;
  const ox = document.createElement('input');
  ox.type = 'range';
  ox.min = '-1';
  ox.max = '1';
  ox.step = '0.02';
  ox.value = String(slot.ox);
  ox.addEventListener('input', () => {
    editor.setPanelOffset(editor.selectedPanel, Number(ox.value), slot.oy);
    oxLabel.textContent = `Pan left / right ${Number(ox.value).toFixed(2)}`;
  });
  ox.addEventListener('change', () => editor.pushHistory());
  oxLabel.appendChild(ox);
  wrap.appendChild(oxLabel);

  const oyLabel = document.createElement('label');
  oyLabel.textContent = `Pan up / down ${slot.oy.toFixed(2)}`;
  const oy = document.createElement('input');
  oy.type = 'range';
  oy.min = '-1';
  oy.max = '1';
  oy.step = '0.02';
  oy.value = String(slot.oy);
  oy.addEventListener('input', () => {
    editor.setPanelOffset(editor.selectedPanel, slot.ox, Number(oy.value));
    oyLabel.textContent = `Pan up / down ${Number(oy.value).toFixed(2)}`;
  });
  oy.addEventListener('change', () => editor.pushHistory());
  oyLabel.appendChild(oy);
  wrap.appendChild(oyLabel);

  const fillButton = document.createElement('button');
  fillButton.type = 'button';
  fillButton.className = 'btn secondary';
  fillButton.textContent = 'Fill every panel with this photo';
  fillButton.addEventListener('click', () => editor.fillAllPanels(slot.photo));
  wrap.appendChild(fillButton);
}

async function runEditorMode() {
  const canvas = $('coverCanvas');
  const editor = new CoverEditor(canvas);
  window.coverApp = editor;

  // Fit the preview canvas to its box, keeping the export aspect.
  function fitPreview() {
    const box = $('previewBox');
    const rect = box.getBoundingClientRect();
    const ratio = 16 / 9;
    let w = Math.min(rect.width, 960);
    let h = w / ratio;
    if (h > rect.height) {
      h = rect.height;
      w = h * ratio;
    }
    canvas.width = Math.max(320, Math.round(w));
    canvas.height = Math.max(180, Math.round(h));
    editor.redraw();
  }

  editor.syncInputs = () => {
    $('titleInput').value = editor.state.title;
    $('subtitleInput').value = editor.state.subtitle;
    $('eyebrowInput').value = editor.state.eyebrow;
    $('taglineInput').value = editor.state.tagline;
    buildPanelControls(editor);
  };
  editor.syncUndoButtons = () => {
    $('undoBtn').disabled = editor.undoStack.length === 0;
    $('redoBtn').disabled = editor.redoStack.length === 0;
  };
  editor.onStateChange = () => {};

  buildPicker($('layoutPicker'), LAYOUTS, editor.state.layoutId, (id) => editor.setLayout(id), (button, item) => {
    button.textContent = item.name;
    button.title = item.blurb;
  });
  buildPicker($('gradePicker'), GRADES, editor.state.gradeId, (id) => editor.setGrade(id), (button, item) => {
    button.innerHTML = `<span class="swatch" style="background:${item.swatch}"></span>${item.name}`;
  });

  const sampleRow = $('sampleRow');
  SAMPLE_PHOTOS.forEach((sample, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sample-thumb';
    button.title = `Try sample: ${sample.label}`;
    const img = document.createElement('img');
    img.src = sample.file;
    img.alt = sample.label;
    button.appendChild(img);
    button.appendChild(document.createTextNode(sample.label));
    button.addEventListener('click', () => editor.fillAllPanels(i));
    sampleRow.appendChild(button);
  });

  $('uploadInput').addEventListener('change', async (event) => {
    const files = [...event.target.files];
    if (files.length === 0) return;
    $('uploadStatus').textContent = `Loading ${files.length} photo${files.length > 1 ? 's' : ''}…`;
    try {
      await editor.addUploads(files);
      $('uploadStatus').textContent = `${editor.images.length} photos loaded. Click a panel, then pick a photo.`;
      editor.syncInputs();
    } catch (err) {
      $('uploadStatus').textContent = 'That file could not be read as a photo.';
    }
    event.target.value = '';
  });

  for (const [key, id] of [['title', 'titleInput'], ['subtitle', 'subtitleInput'], ['eyebrow', 'eyebrowInput'], ['tagline', 'taglineInput']]) {
    const input = $(id);
    input.value = editor.state[key];
    input.addEventListener('input', () => editor.setText(key, input.value));
    input.addEventListener('change', () => editor.commitText());
  }

  $('presetPhoto').addEventListener('click', () => editor.applyPreset('photoCover'));
  $('presetHero').addEventListener('click', () => editor.applyPreset('heroPhoto'));
  $('presetNeon').addEventListener('click', () => editor.applyPreset('neonNight'));
  $('undoBtn').addEventListener('click', () => editor.undo());
  $('redoBtn').addEventListener('click', () => editor.redo());

  const exportRow = $('exportRow');
  for (const size of EXPORT_SIZES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn export';
    button.textContent = `Export PNG ${size.label}`;
    button.addEventListener('click', async () => {
      button.disabled = true;
      button.textContent = 'Rendering…';
      const ok = await editor.downloadExport(size.id);
      button.textContent = ok ? `Saved ${size.label}` : 'Export failed — try again';
      button.disabled = false;
      setTimeout(() => { button.textContent = `Export PNG ${size.label}`; }, 2500);
    });
    exportRow.appendChild(button);
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (editor.beginDrag(event.clientX, event.clientY)) canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => editor.moveDrag(event.clientX, event.clientY));
  canvas.addEventListener('pointerup', () => editor.endDrag());
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const slot = editor.state.panels[editor.selectedPanel];
    const next = Math.max(1, Math.min(2.5, slot.zoom - Math.sign(event.deltaY) * 0.1));
    editor.setPanelZoom(editor.selectedPanel, next);
    editor.syncInputs();
  }, { passive: false });

  window.addEventListener('resize', fitPreview);
  await loadFonts();
  await editor.loadSamples();
  fitPreview();
  editor.syncInputs();
  editor.syncUndoButtons();
  editor.redraw();
  document.documentElement.dataset.ready = '1';
}

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot === 'cover' || shot === 'story' || shot === 'square') {
  runShotMode(shot);
} else {
  runEditorMode();
}
