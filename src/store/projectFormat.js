import { WOOD_OPTIONS, FINISH_OPTIONS, canonicalWood, allowedFinish } from '../geometry/materials.js';
import {
  MAX_PANEL_CELLS, MIN_CELL_WIDTH_MM, MAX_CELL_WIDTH_MM, MIN_GRID_STRIP_WIDTH_MM, MAX_STRIP_WIDTH_FRACTION, MIN_STRIP_WIDTH_MM,
  MAX_BORDER_WIDTH_MM, minBorderWidthMm, MIN_PANEL_DEPTH_MM, MAX_PANEL_DEPTH_MM, DEFAULT_PANEL_DEPTH_MM,
} from '../geometry/units.js';
import { migrateStoredPattern, isKnownBasePattern, storedParams, paramDefsFor } from './usePatternStore.js';

// The project file: what Save writes and Open reads. Pure data in, pure data out — it knows
// nothing about the stores (store/projectActions.js moves data between the two).
//
// ── What a file holds ───────────────────────────────────────────────────────────────────
//   {
//     format: 'kumiko-cad-project',
//     formatVersion: 1,
//     savedAt: '2026-10-17T…Z',
//     panel:    { cols, rows, cellWidth, gridStripWidth, borderWidth, borderCorner, panelDepth, orientation,
//                 cornerBehavior, material, finish, placementFlip,
//                 cells: { 'r0-c3': { pattern: 'p1', rot: 0, flip: false }, … } },
//     patterns: { p1: { name, recipe: { basePatternId, patternStripWidth, material, finish,
//                                      params, stripMaterials } }, … }
//   }
// The panel's cells point at `patterns` by id; each pattern used on the panel is written once,
// as the RECIPE the CAD builds it from (the built-in shape it is based on plus its width, wood,
// finish, parameters and per-strip colours) — never as computed geometry. That keeps files
// small and lets them benefit from geometry fixes, but it also means a recipe means whatever the
// CAD's factory for that shape makes of it (see "What can still change a file's look" below).
//
// ── Keeping old files openable ──────────────────────────────────────────────────────────
// 1. Every file says which `formatVersion` wrote it. Opening one runs it through MIGRATIONS, one
//    version at a time, until it is current — so a file from any past version opens in the
//    current CAD, and only the migration from the previous version has to be written when the
//    format changes.
// 2. Read leniently, write strictly: fields this version doesn't know are ignored on open (so
//    ADDING an optional field never needs a version bump or a migration — give it a default
//    where it is read). Bump the version only for a change that would make an old file wrong
//    or unreadable: a field renamed, moved, re-unit-ed or given new meaning.
// 3. A file from a NEWER version than this CAD knows is refused with a clear message rather
//    than half-read and then overwritten by the next Save.
// 4. A recipe inside a file also goes through migrateStoredPattern (store/usePatternStore.js) —
//    the same renames and unit conversions applied to patterns saved in the browser (Rindo →
//    Matsuba, Goma spacing → inset, millimetres → ratios). Add pattern-level renames THERE and
//    both browser-saved patterns and project files get them.
// 5. Never edit or delete a migration once released; add a new one. Keep a sample file of every
//    version you have released and open them all in a test when the format changes.
//
// ── What can still change a file's look ─────────────────────────────────────────────────
// Because patterns are stored as recipes, editing a built-in shape's factory so it draws something
// different changes every file that uses it. If that is ever intended for an old shape, the
// honest options are a new shape id (leaving the old factory in place) or a migration that
// rewrites affected recipes.

export const FORMAT_ID = 'kumiko-cad-project';
export const CURRENT_VERSION = 1;
export const FILE_EXTENSION = '.kumiko.json';
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_DIMENSION = MAX_PANEL_CELLS; // cols / rows (each; their product is capped too)
const MAX_PATTERNS = 5000;

// MIGRATIONS[n] turns a version-n document into a version-(n+1) one (plain JSON in, plain
// JSON out; return the new object). Example, for a future change that renamed `panel.cols`:
//   1: (doc) => ({ ...doc, formatVersion: 2, panel: { ...doc.panel, columns: doc.panel.cols } }),
const MIGRATIONS = {};

export class ProjectFileError extends Error {}
const fail = (message) => { throw new ProjectFileError(message); };

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const WOODS = new Set(WOOD_OPTIONS.map((o) => o.id));
const FINISHES = new Set(FINISH_OPTIONS.map((o) => o.id));
const CELL_ID = /^r\d{1,5}-c\d{1,5}$/;

// Exported so a test can drive the machinery with made-up migrations.
export function migrateDocument(doc, migrations = MIGRATIONS, current = CURRENT_VERSION) {
  let version = doc.formatVersion;
  if (!Number.isInteger(version) || version < 1) fail('This file has no valid format version, so it can’t be opened.');
  if (version > current) {
    fail(`This project was saved by a newer version of Kumiko CAD (file format ${version}; this one reads up to ${current}). Update the app and try again.`);
  }
  while (version < current) {
    const step = migrations[version];
    if (!step) fail(`This file (format ${version}) is too old to be upgraded automatically.`);
    try { doc = step(doc); } catch { fail(`This file (format ${version}) couldn’t be upgraded to the current format.`); }
    if (!isObject(doc) || doc.formatVersion !== version + 1) fail('Upgrading this file produced something unexpected.');
    version = doc.formatVersion;
  }
  return doc;
}

// One embedded pattern's recipe, checked and put in the shape the pattern store uses.
function readRecipe(raw, where) {
  if (!isObject(raw)) fail(`${where} has no recipe.`);
  // Every parameter value must be a shape some version of the app has written: a bare number
  // (millimetres, the oldest), { length, unit } or { ratio }. Checked before the migrations, which
  // would otherwise quietly turn a garbled value into the default.
  if (raw.params !== undefined) {
    if (!isObject(raw.params)) fail(`${where} has invalid parameters.`);
    for (const [key, v] of Object.entries(raw.params)) {
      const ok = isNum(v) || (isObject(v) && (isNum(v.ratio) || isNum(v.length)));
      if (!ok) fail(`${where} has an invalid value for \u201c${key.slice(0, 40)}\u201d.`);
    }
  }
  // The browser-saved-pattern migrations, applied to a stand-in template.
  const migrated = migrateStoredPattern({
    basePatternId: raw.basePatternId,
    patternParams: isObject(raw.params) ? raw.params : {},
    stripProperties: [{ width: raw.patternStripWidth }],
  });
  const basePatternId = migrated.basePatternId;
  if (!isKnownBasePattern(basePatternId) || basePatternId === 'builtin:blank') {
    fail(`${where} uses a pattern shape this version doesn’t have (${String(basePatternId).slice(0, 60)}).`);
  }
  if (!isNum(raw.patternStripWidth) || raw.patternStripWidth < MIN_STRIP_WIDTH_MM || raw.patternStripWidth > 1000) fail(`${where} has an invalid strip width.`);
  raw = { ...raw, material: canonicalWood(raw.material) }; // an earlier version's wood id stands for its successor
  if (!WOODS.has(raw.material)) fail(`${where} uses a wood this version doesn’t have (${String(raw.material).slice(0, 40)}).`);
  if (!FINISHES.has(raw.finish)) fail(`${where} uses a finish this version doesn’t have (${String(raw.finish).slice(0, 40)}).`);
  raw = { ...raw, finish: allowedFinish(raw.material, raw.finish) };

  // Parameters: only the shapes the app writes, only the ones the shape declares.
  const defs = paramDefsFor(basePatternId);
  const params = {};
  for (const def of defs) {
    const v = migrated.patternParams[def.key];
    if (v === undefined) continue;
    const ok = isObject(v) && ((isNum(v.ratio) && v.ratio >= 0 && v.ratio <= 1)
      || (isNum(v.length) && v.length >= 0 && v.length <= 10000 && (v.unit === 'mm' || v.unit === 'in')));
    if (!ok) fail(`${where} has an invalid value for “${def.key}”.`);
    params[def.key] = v;
  }

  const stripMaterials = Object.create(null);
  if (raw.stripMaterials !== undefined) {
    if (!isObject(raw.stripMaterials)) fail(`${where} has invalid strip colours.`);
    for (const [stripId, v] of Object.entries(raw.stripMaterials)) {
      if (stripId.length > 80 || !isObject(v)) fail(`${where} has invalid strip colours.`);
      const entry = {};
      if (v.material !== undefined) { if (!WOODS.has(canonicalWood(v.material))) fail(`${where} has a strip in an unknown wood.`); entry.material = canonicalWood(v.material); }
      if (v.finish !== undefined) { if (!FINISHES.has(v.finish)) fail(`${where} has a strip in an unknown finish.`); entry.finish = v.finish; }
      if (entry.material || entry.finish) stripMaterials[stripId] = entry;
    }
  }
  return {
    basePatternId,
    patternStripWidth: raw.patternStripWidth,
    material: raw.material,
    finish: raw.finish,
    params: storedParams(basePatternId, params),
    stripMaterials,
  };
}

// Checks a (migrated) document and returns it cleaned: only known fields, only valid values.
// Throws ProjectFileError naming the first thing wrong.
function validate(doc) {
  const p = doc.panel;
  if (!isObject(p)) fail('The file has no panel.');
  const cols = p.cols, rows = p.rows;
  if (!Number.isInteger(cols) || cols < 1 || cols > MAX_DIMENSION) fail('The panel’s column count is invalid.');
  if (!Number.isInteger(rows) || rows < 1 || rows > MAX_DIMENSION) fail('The panel’s row count is invalid.');
  if (cols * rows > MAX_PANEL_CELLS) fail(`The panel has ${cols * rows} cells; the limit is ${MAX_PANEL_CELLS}.`);
  if (!isNum(p.cellWidth) || p.cellWidth < MIN_CELL_WIDTH_MM || p.cellWidth > MAX_CELL_WIDTH_MM) fail('The panel’s cell width is out of range.');
  const maxStrip = p.cellWidth * MAX_STRIP_WIDTH_FRACTION + 1e-9;
  if (!isNum(p.gridStripWidth) || p.gridStripWidth < MIN_GRID_STRIP_WIDTH_MM || p.gridStripWidth > maxStrip) fail('The panel’s grid strip width is out of range.');
  // borderWidth and borderCorner came later than format 1: a file without them is a panel whose border
  // was as wide as a grid strip with mitred corners (optional fields never need a version bump).
  const borderWidth = p.borderWidth === undefined ? p.gridStripWidth : p.borderWidth;
  if (!isNum(borderWidth) || borderWidth <= 0 || borderWidth > MAX_BORDER_WIDTH_MM) fail('The panel’s border width is out of range.');
  const borderCorner = p.borderCorner === undefined ? 'miter' : p.borderCorner;
  if (borderCorner !== 'miter' && borderCorner !== 'halfLap') fail('The panel’s border corner type is invalid.');
  // panelDepth (how far the panel stands off the wall) is optional too: an older file gets the default.
  const panelDepth = p.panelDepth === undefined ? DEFAULT_PANEL_DEPTH_MM : p.panelDepth;
  if (!isNum(panelDepth) || panelDepth < MIN_PANEL_DEPTH_MM - 1e-9 || panelDepth > MAX_PANEL_DEPTH_MM) fail('The panel’s depth is out of range.');
  if (p.orientation !== 'horizontal' && p.orientation !== 'vertical') fail('The panel’s orientation is invalid.');
  if (p.cornerBehavior !== 'taper' && p.cornerBehavior !== 'fill') fail('The panel’s corner type is invalid.');
  p = { ...p, material: canonicalWood(p.material) };
  if (!WOODS.has(p.material)) fail('The panel’s wood is not one this version has.');
  if (!FINISHES.has(p.finish)) fail('The panel’s finish is not one this version has.');
  p = { ...p, finish: allowedFinish(p.material, p.finish) };
  if (typeof p.placementFlip !== 'boolean') fail('The panel’s mirroring setting is invalid.');

  const rawPatterns = isObject(doc.patterns) ? doc.patterns : {};
  const patternIds = Object.keys(rawPatterns);
  if (patternIds.length > MAX_PATTERNS) fail('The file lists too many patterns.');
  const patterns = Object.create(null); // no prototype: an id like "__proto__" is just a name
  for (const id of patternIds) {
    const entry = rawPatterns[id];
    const where = `Pattern “${id.slice(0, 30)}”`;
    if (!isObject(entry)) fail(`${where} is invalid.`);
    const name = typeof entry.name === 'string' ? entry.name.trim().slice(0, 120) : '';
    patterns[id] = { name: name || 'Pattern', recipe: readRecipe(entry.recipe, where) };
  }

  const rawCells = isObject(p.cells) ? p.cells : {};
  const cells = Object.create(null);
  for (const [cellId, c] of Object.entries(rawCells)) {
    if (!CELL_ID.test(cellId)) fail(`The panel has a cell with an invalid id (${cellId.slice(0, 30)}).`);
    if (!isObject(c) || !(c.pattern in patterns) || !Object.prototype.hasOwnProperty.call(patterns, c.pattern)) fail(`Cell ${cellId} points at a pattern the file doesn’t contain.`);
    const rot = c.rot ?? 0, flip = c.flip ?? false;
    if (![0, 1, 2].includes(rot) || typeof flip !== 'boolean') fail(`Cell ${cellId} has an invalid rotation.`);
    cells[cellId] = { pattern: c.pattern, rot, flip };
  }

  return {
    panel: {
      cols, rows, cellWidth: p.cellWidth, gridStripWidth: p.gridStripWidth, borderWidth: Math.max(borderWidth, minBorderWidthMm(p.gridStripWidth)), borderCorner, panelDepth, orientation: p.orientation,
      cornerBehavior: p.cornerBehavior, material: p.material, finish: p.finish, placementFlip: p.placementFlip, cells,
    },
    patterns,
  };
}

// Text of a project file -> { panel, patterns } ready to apply. Throws ProjectFileError with a
// message fit to show the user.
export function parseProjectText(text) {
  if (typeof text !== 'string' || !text.trim()) fail('The file is empty.');
  if (text.length > MAX_FILE_BYTES) fail('The file is too large to be a project.');
  let doc;
  try { doc = JSON.parse(text); } catch { fail('That file isn’t a Kumiko CAD project (it isn’t valid JSON).'); }
  if (!isObject(doc) || doc.format !== FORMAT_ID) fail('That file isn’t a Kumiko CAD project.');
  return validate(migrateDocument(doc));
}

// What the app builds from its stores (see projectActions.js) -> the text to write. Cells and
// patterns are written in a fixed order, so saving an unchanged project gives identical text.
export function stringifyProject({ panel, patterns }, { savedAt } = {}) {
  const doc = {
    format: FORMAT_ID,
    formatVersion: CURRENT_VERSION,
    ...(savedAt ? { savedAt } : {}),
    panel,
    patterns,
  };
  return JSON.stringify(doc, null, 2);
}
