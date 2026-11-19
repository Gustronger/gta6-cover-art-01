// Vice Coast Cover Studio: wires the editor page. A photo and a caption become a
// multi-panel GTA-style poster, drawn by cover.js onto the preview canvas and
// exported as a PNG. A `?shot=` query sets up a fixed scene for a screenshot
// instead (./shots.js). Everything runs offline: the only images are the bundled
// samples and the photos the person loads from their own machine.

import { drawCover } from './cover.js';
import { runShot } from './shots.js';
import { GRADES, GRADE_ORDER } from './grades.js';
import { LAYOUTS, LAYOUT_ORDER } from './layouts.js';

const SIZES = [
  { id: '1080x1080', w: 1080, h: 1080, label: '1080 × 1080' },
  { id: '1080x1350', w: 1080, h: 1350, label: '1080 × 1350' },
  { id: '1920x1080', w: 1920, h: 1080, label: '1920 × 1080' },
];

const SAMPLE_NAMES = { boulevard: 'Boulevard', pier: 'Pier' };

/** The caption a panel gets when it takes a photo: place, time, tagline, label. */
const CAPTION_DEFAULTS = {
  boulevard: { place: 'OCEAN DRIVE', time: '6:42 PM', tag: 'LOOKING FOR TROUBLE', label: 'THE DRIVER' },
  pier: { place: 'PIER 26', time: '5:30 AM', tag: 'GONE FISHING', label: 'THE ANGLER' },
  art: { place: 'VICE CITY', time: '12:00 AM', tag: 'SKYLINE AFTER DARK', label: '' },
};

function captionFor(src) {
  if (typeof src === 'string' && src.startsWith('up')) {
    return { place: 'YOUR STREET', time: 'RIGHT NOW', tag: 'SHOT BY YOU', label: 'THE STAR' };
  }
  return CAPTION_DEFAULTS[src] || CAPTION_DEFAULTS.art;
}

function blankPanel(src) {
  return { src, zoom: 1, ox: 0, oy: 0, ...captionFor(src) };
}

const state = {
  layout: 'show',
  grade: 'sunset',
  size: '1080x1080',
  title: 'VICE COAST',
  subtitle: 'Neon Tide',
  quote: '"HOTTER THAN THE ASPHALT" — THE PALM GAZETTE',
  stars: 5,
  tagline: 'ONE COAST · NO RULES · COMING SOON',
  footer: 'VICE COAST COVER STUDIO · STARRING YOU · SHOT ON YOUR OWN CAMERA · CAT. VC-0626',
  badges: { seal: true, est: true, vol: true, collector: true, wanted: true },
  panels: [
    blankPanel('boulevard'),
    blankPanel('pier'),
    blankPanel('art'),
    blankPanel('art'),
    blankPanel('art'),
    blankPanel('art'),
    blankPanel('art'),
  ],
  selected: 0,
  photos: new Map(),
};

let uploadCount = 0;

const preview = document.getElementById('preview');
const status = document.getElementById('status');
const titleInput = document.getElementById('titleInput');
const subtitleInput = document.getElementById('subtitleInput');
const zoomRange = document.getElementById('zoomRange');
const panXRange = document.getElementById('panXRange');
const panYRange = document.getElementById('panYRange');

function currentSize() {
  return SIZES.find((s) => s.id === state.size) ?? SIZES[0];
}

function currentLayout() {
  return LAYOUTS[state.layout] ?? LAYOUTS.duo;
}

/** Grows or shrinks the panel list to the current layout's panel count. */
function ensurePanels() {
  const count = currentLayout().count;
  while (state.panels.length < count) {
    state.panels.push(blankPanel('art'));
  }
  state.panels.length = count;
  if (state.selected >= count) state.selected = 0;
}

/** Gives a panel a photo and the caption that photo comes with. */
function setPanelSrc(i, src) {
  state.panels[i] = { ...state.panels[i], src, ...captionFor(src) };
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadSample(name) {
  if (!state.photos.has(name)) {
    state.photos.set(name, await loadImage(`samples/${name}.jpg`));
  }
  return state.photos.get(name);
}

/** Loads both bundled samples, so every panel has its photo ready. */
async function preloadSamples() {
  await loadSample('boulevard');
  await loadSample('pier');
}

function renderPreview() {
  ensurePanels();
  const size = currentSize();
  preview.width = size.w;
  preview.height = size.h;
  const ctx = preview.getContext('2d');
  drawCover(ctx, size.w, size.h, state);
  syncPanelControls();
}

function syncPanelControls() {
  const tabs = document.getElementById('panelTabs');
  tabs.replaceChildren();
  state.panels.forEach((panel, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `Panel ${i + 1}`;
    b.classList.toggle('active', i === state.selected);
    b.addEventListener('click', () => {
      state.selected = i;
      renderPreview();
    });
    tabs.appendChild(b);
  });
  const src = document.getElementById('panelSrc');
  src.replaceChildren();
  const panel = state.panels[state.selected];
  const choices = [
    ...Object.keys(SAMPLE_NAMES).map((name) => ({ id: name, label: SAMPLE_NAMES[name] })),
    { id: 'art', label: 'Sunset art' },
    ...[...state.photos.keys()].filter((k) => k.startsWith('up')).map((k) => ({ id: k, label: 'Upload' })),
  ];
  for (const choice of choices) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = choice.label;
    b.classList.toggle('active', panel.src === choice.id);
    b.addEventListener('click', () => {
      setPanelSrc(state.selected, choice.id);
      renderPreview();
    });
    src.appendChild(b);
  }
  zoomRange.value = String(panel.zoom);
  panXRange.value = String(panel.ox);
  panYRange.value = String(panel.oy);
  document.getElementById('placeInput').value = panel.place || '';
  document.getElementById('timeInput').value = panel.time || '';
  document.getElementById('panelTagInput').value = panel.tag || '';
  document.getElementById('labelInput').value = panel.label || '';
}

function buildButtonRow(containerId, items, activeId, onPick) {
  const box = document.getElementById(containerId);
  box.replaceChildren();
  for (const item of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = item.label;
    b.classList.toggle('active', item.id === activeId);
    b.addEventListener('click', () => onPick(item.id));
    box.appendChild(b);
  }
}

function syncOptionRows() {
  buildButtonRow(
    'layoutBtns',
    LAYOUT_ORDER.map((id) => ({ id, label: LAYOUTS[id].name })),
    state.layout,
    (id) => {
      state.layout = id;
      renderPreview();
      syncOptionRows();
    },
  );
  buildButtonRow(
    'gradeBtns',
    GRADE_ORDER.map((id) => ({ id, label: GRADES[id].name })),
    state.grade,
    (id) => {
      state.grade = id;
      renderPreview();
      syncOptionRows();
    },
  );
  buildButtonRow(
    'sizeBtns',
    SIZES.map((s) => ({ id: s.id, label: s.label })),
    state.size,
    (id) => {
      state.size = id;
      renderPreview();
      syncOptionRows();
    },
  );
}

/** The badge toggles: seal, roundel, volume, ribbon and wanted tag. */
function syncBadges() {
  const items = [
    { id: 'seal', label: 'Seal' },
    { id: 'est', label: 'EST. 2026' },
    { id: 'vol', label: 'VOL. 01' },
    { id: 'collector', label: "Collector's" },
    { id: 'wanted', label: 'WANTED' },
  ];
  const box = document.getElementById('badgeBtns');
  box.replaceChildren();
  for (const item of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = item.label;
    b.classList.toggle('active', !!state.badges[item.id]);
    b.addEventListener('click', () => {
      state.badges[item.id] = !state.badges[item.id];
      renderPreview();
      syncBadges();
    });
    box.appendChild(b);
  }
}

/** Renders the cover at full export size and downloads it as a PNG. */
export function exportPng() {
  const size = currentSize();
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off.getContext('2d'), size.w, size.h, state);
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-coast-cover-${size.w}x${size.h}.png`;
      a.click();
      status.textContent = `Saved vice-coast-cover-${size.w}x${size.h}.png`;
      resolve(blob);
    }, 'image/png');
  });
}

/** Programmatic export for automated checks: the PNG as a data URL. */
window.__exportCoverPng = async (w, h) => {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off.getContext('2d'), w, h, state);
  return off.toDataURL('image/png');
};

async function addUpload(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const id = `up${uploadCount++}`;
  const img = await loadImage(URL.createObjectURL(file));
  state.photos.set(id, img);
  setPanelSrc(state.selected, id);
  renderPreview();
  status.textContent = `Loaded ${file.name} into panel ${state.selected + 1}`;
}

function setLayout(id) {
  if (LAYOUTS[id]) {
    state.layout = id;
    syncOptionRows();
  }
}

function setGrade(id) {
  if (GRADES[id]) {
    state.grade = id;
    syncOptionRows();
  }
}

function setTitle(text) {
  state.title = text;
  titleInput.value = text;
}

function setSubtitle(text) {
  state.subtitle = text;
  subtitleInput.value = text;
}

/** The cover scene: the cover alone, filling the viewport, for a screenshot. */
async function showCoverShot(photo, caption, script) {
  await loadSample(photo);
  const other = photo === 'pier' ? 'boulevard' : 'pier';
  await loadSample(other);
  setPanelSrc(0, photo);
  setPanelSrc(1, other);
  setTitle(caption);
  setSubtitle(script || 'Neon Tide');
  preview.width = window.innerWidth;
  preview.height = window.innerHeight;
  drawCover(preview.getContext('2d'), preview.width, preview.height, state);
}

/** The editor scene: the editor with a sample photo loaded, for a screenshot. */
async function showEditorShot(photo, caption, script) {
  await loadSample(photo);
  setPanelSrc(state.selected, photo);
  setTitle(caption);
  setSubtitle(script || 'Neon Tide');
  renderPreview();
}

const app = { setLayout, setGrade, setTitle, setSubtitle, showCoverShot, showEditorShot, preloadSamples };

titleInput.addEventListener('input', () => {
  state.title = titleInput.value;
  renderPreview();
});
subtitleInput.addEventListener('input', () => {
  state.subtitle = subtitleInput.value;
  renderPreview();
});
document.getElementById('quoteInput').addEventListener('input', (e) => {
  state.quote = e.target.value;
  renderPreview();
});
document.getElementById('taglineInput').addEventListener('input', (e) => {
  state.tagline = e.target.value;
  renderPreview();
});
document.getElementById('footerInput').addEventListener('input', (e) => {
  state.footer = e.target.value;
  renderPreview();
});
document.getElementById('starsRange').addEventListener('input', (e) => {
  state.stars = Number(e.target.value);
  document.getElementById('starsValue').textContent = '★'.repeat(state.stars) + '☆'.repeat(5 - state.stars);
  renderPreview();
});
document.getElementById('placeInput').addEventListener('input', (e) => {
  state.panels[state.selected].place = e.target.value;
  renderPreview();
});
document.getElementById('timeInput').addEventListener('input', (e) => {
  state.panels[state.selected].time = e.target.value;
  renderPreview();
});
document.getElementById('panelTagInput').addEventListener('input', (e) => {
  state.panels[state.selected].tag = e.target.value;
  renderPreview();
});
document.getElementById('labelInput').addEventListener('input', (e) => {
  state.panels[state.selected].label = e.target.value;
  renderPreview();
});
zoomRange.addEventListener('input', () => {
  state.panels[state.selected].zoom = Number(zoomRange.value);
  renderPreview();
});
panXRange.addEventListener('input', () => {
  state.panels[state.selected].ox = Number(panXRange.value);
  renderPreview();
});
panYRange.addEventListener('input', () => {
  state.panels[state.selected].oy = Number(panYRange.value);
  renderPreview();
});
document.getElementById('resetPanelBtn').addEventListener('click', () => {
  setPanelSrc(state.selected, 'art');
  state.panels[state.selected].zoom = 1;
  state.panels[state.selected].ox = 0;
  state.panels[state.selected].oy = 0;
  renderPreview();
});
document.getElementById('exportBtn').addEventListener('click', exportPng);
document.getElementById('photoInput').addEventListener('change', async (e) => {
  for (const file of e.target.files) await addUpload(file);
  e.target.value = '';
});
document.getElementById('sampleBoulevard').addEventListener('click', async () => {
  await loadSample('boulevard');
  setPanelSrc(state.selected, 'boulevard');
  renderPreview();
});
document.getElementById('samplePier').addEventListener('click', async () => {
  await loadSample('pier');
  setPanelSrc(state.selected, 'pier');
  renderPreview();
});

const dropZone = document.getElementById('dropZone');
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dropping');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dropping'));
dropZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  dropZone.classList.remove('dropping');
  for (const file of e.dataTransfer.files) await addUpload(file);
});

preview.addEventListener('click', (e) => {
  const rect = preview.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * preview.width;
  const y = ((e.clientY - rect.top) / rect.height) * preview.height;
  const panels = currentLayout().panels(preview.width, preview.height);
  const hit = panels.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
  if (hit >= 0) {
    state.selected = hit;
    renderPreview();
  }
});

syncOptionRows();
syncBadges();

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), app);
} else {
  loadSample('boulevard').then(() => loadSample('pier')).then(() => {
    renderPreview();
  });
}
