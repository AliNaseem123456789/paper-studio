// The asset library.
//
// Assets have stable slugs. The LLM is given a catalogue of those slugs, so
// when it wants a lion it writes assetId:"animal.lion" and your own artwork
// lands in the output. When nothing in the library fits, it writes
// generate:"a friendly lion cub" instead, and the app either renders a
// placeholder or calls the image model. Either way the teacher can swap the
// picture afterwards without disturbing the layout.
//
// Three kinds:
//   builtin  -- emoji shipped with the app, always available, free
//   upload   -- your own PNG/SVG from Figma, Canva, anywhere (assets/ folder)
//   ai       -- generated once, cached, reusable

import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = path.resolve(HERE, '..', 'assets');
export const BRAND_DIR = path.resolve(HERE, '..', 'brand');

/**
 * Artwork shipped with the app as real files rather than emoji -- the
 * school's own marks. These behave like builtins (always present, never
 * deletable) but resolve to a URL, so the masthead can show the real
 * monogram out of the box with nothing uploaded.
 */
const BRAND = {
  'school.monogram': { file: 'monogram.png', label: 'School monogram', group: 'school' },
};

/**
 * Built-in set. Emoji so it needs no files and prints everywhere, but the
 * slug scheme is what matters: replace any entry's `glyph` with an uploaded
 * file and every document referencing that slug updates at once.
 */
const BUILTIN = {
  // animals
  'animal.lion': '🦁', 'animal.monkey': '🐒', 'animal.camel': '🐫',
  'animal.giraffe': '🦒', 'animal.bear': '🐻', 'animal.cow': '🐄',
  'animal.duck': '🦆', 'animal.cat': '🐈', 'animal.bird': '🐦',
  'animal.fish': '🐟', 'animal.whale': '🐳', 'animal.sheep': '🐑',
  'animal.elephant': '🐘', 'animal.horse': '🐎',
  // food
  'food.apple': '🍎', 'food.mango': '🥭', 'food.banana': '🍌',
  'food.grapes': '🍇', 'food.orange': '🍊', 'food.pear': '🍐',
  'food.bread': '🍞', 'food.cake': '🍰', 'food.chocolate': '🍫',
  'food.icecream': '🍦', 'food.noodles': '🍜', 'food.jam': '🍯',
  'food.pineapple': '🍍', 'food.spinach': '🥬', 'food.onion': '🧅',
  // stationery + school
  'school.pencil': '✏️', 'school.sharpener': '📐', 'school.book': '📘',
  'school.eraser': '🧽', 'school.desk': '🪑', 'school.bag': '🎒',
  'school.crayons': '🖍️', 'school.paint': '🎨', 'school.abacus': '🧮',
  'school.ruler': '📏', 'school.notebook': '📒', 'school.scissors': '✂️',
  // computer
  'tech.computer': '💻', 'tech.monitor': '🖥️', 'tech.keyboard': '⌨️',
  'tech.mouse': '🖱️', 'tech.printer': '🖨️', 'tech.floppy': '💾',
  'tech.joystick': '🕹️', 'tech.cpu': '🖲️', 'tech.cd': '💿',
  'tech.phone': '📱', 'tech.plug': '🔌', 'tech.bulb': '💡',
  // transport
  'transport.aeroplane': '✈️', 'transport.boat': '⛵', 'transport.train': '🚆',
  'transport.cycle': '🚲', 'transport.ship': '🚢', 'transport.truck': '🚚',
  'transport.bike': '🏍️', 'transport.car': '🚗', 'transport.bus': '🚌',
  // nature
  'nature.sun': '☀️', 'nature.moon': '🌙', 'nature.star': '⭐',
  'nature.cloud': '☁️', 'nature.tree': '🌳', 'nature.flower': '🌸',
  'nature.rose': '🌹', 'nature.leaf': '🍃', 'nature.water': '💧',
  'nature.mountain': '⛰️', 'nature.rain': '🌧️', 'nature.wind': '💨',
  // body
  'body.eye': '👁️', 'body.ear': '👂', 'body.nose': '👃',
  'body.hand': '✋', 'body.mouth': '👄', 'body.foot': '🦶',
  // household
  'home.iron': '🪭', 'home.fridge': '🧊', 'home.fan': '🌀',
  'home.lamp': '🪔', 'home.clock': '🕐', 'home.key': '🔑',
  'home.lock': '🔒', 'home.hat': '🎩', 'home.shoe': '👞',
  'home.cup': '🥤', 'home.spoon': '🥄', 'home.chair': '🪑',
  // manners / habits (for syllabus panels)
  'habit.wake': '🌅', 'habit.brush': '🪥', 'habit.bath': '🛁',
  'habit.greet': '🤝', 'habit.breakfast': '🥣', 'habit.school': '🏫',
  'habit.study': '📖', 'habit.walk': '🚶', 'habit.play': '⚽',
  'habit.sorry': '🙏', 'habit.thanks': '💐', 'habit.sleep': '😴',
  // islamiat / general
  'gk.flag': '🇵🇰', 'gk.mosque': '🕌', 'gk.quran': '📗',
  'gk.kaaba': '🕋', 'gk.globe': '🌍', 'gk.map': '🗺️',
  // shapes / maths
  'math.numbers': '🔢', 'math.plus': '➕', 'math.minus': '➖',
  'math.equals': '🟰', 'math.circle': '⭕', 'math.square': '🟦',
  'math.triangle': '🔺', 'math.star': '⭐',
};

/** Uploaded + AI assets. Persisted as a JSON sidecar next to the files. */
const INDEX_FILE = path.join(UPLOAD_DIR, 'index.json');
let custom = {};

function ensureDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function loadIndex() {
  try {
    custom = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  } catch {
    custom = {};
  }
}

function saveIndex() {
  ensureDir();
  fs.writeFileSync(INDEX_FILE, JSON.stringify(custom, null, 2));
}

loadIndex();

/** Slugify a label into a stable, LLM-friendly id. */
export function slugify(group, label) {
  const clean = String(label || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'item';
  return `${group || 'custom'}.${clean}`;
}

/**
 * An AI asset already drawn for this exact prompt, if there is one.
 * Generation is the expensive part of the app, so never pay twice for the
 * same picture.
 */
export function findByPrompt(prompt) {
  const want = String(prompt || '').trim().toLowerCase();
  if (!want) return null;
  const hit = Object.values(custom).find(
    (a) => a.kind === 'ai' && String(a.prompt || '').trim().toLowerCase() === want);
  return hit ? { ...hit, url: `/api/assets/file/${hit.file}` } : null;
}

export function addAsset({ group = 'custom', label, buffer, mime, kind = 'upload', slug, prompt }) {
  ensureDir();
  let id = slug || slugify(group, label);
  if (custom[id] && !slug) id = `${id}-${randomUUID().slice(0, 4)}`;

  const ext = (mime || '').includes('svg') ? 'svg'
    : (mime || '').includes('png') ? 'png'
    : (mime || '').includes('webp') ? 'webp' : 'jpg';
  const file = `${id.replace(/\./g, '_')}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, file), buffer);

  custom[id] = { id, kind, label: String(label || id), file, mime, group,
                 ...(prompt ? { prompt: String(prompt) } : {}) };
  saveIndex();
  return custom[id];
}

export function removeAsset(id) {
  const a = custom[id];
  if (!a) return false;
  try { fs.unlinkSync(path.join(UPLOAD_DIR, a.file)); } catch { /* already gone */ }
  delete custom[id];
  saveIndex();
  return true;
}

export function getAsset(id) {
  if (custom[id]) return { ...custom[id], url: `/api/assets/file/${custom[id].file}` };
  if (BRAND[id]) return { id, kind: 'brand', ...BRAND[id], url: `/api/assets/brand/${BRAND[id].file}` };
  if (BUILTIN[id]) return { id, kind: 'builtin', glyph: BUILTIN[id], label: id.split('.')[1] };
  return null;
}

export function listAssets() {
  const brand = Object.entries(BRAND).map(([id, a]) => ({
    id, kind: 'brand', ...a, url: `/api/assets/brand/${a.file}`,
  }));
  const builtin = Object.entries(BUILTIN).map(([id, glyph]) => ({
    id, kind: 'builtin', glyph, group: id.split('.')[0], label: id.split('.')[1],
  }));
  const mine = Object.values(custom).map((a) => ({
    ...a, url: `/api/assets/file/${a.file}`,
  }));
  return [...brand, ...mine, ...builtin];
}

/**
 * The catalogue handed to the model. Compact on purpose -- this rides along
 * with every generation, so it is slugs only, grouped, no descriptions.
 * Uploaded assets come first so your own artwork is preferred.
 */
export function catalogue(limit = 240) {
  const groups = {};
  for (const a of listAssets().slice(0, limit)) {
    (groups[a.group || 'custom'] ||= []).push(a.id);
  }
  return Object.entries(groups)
    .map(([g, ids]) => `${g}: ${ids.join(', ')}`)
    .join('\n');
}

/** Resolve every slug a document uses, so the client can draw them. */
export function resolveMany(ids = []) {
  const out = {};
  for (const id of ids) {
    const a = getAsset(id);
    if (a) out[id] = a;
  }
  return out;
}
