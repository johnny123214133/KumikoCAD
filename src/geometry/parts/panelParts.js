// The parts list's data: every piece of wood the panel is made of, counted.
//
//   border     the four border strips, grouped into identical pieces
//   gridStrips the grid strips, grouped
//   patterns   everything the placed patterns are made of, two ways round:
//                byPiece    identical pieces from ALL patterns counted together, each saying which
//                           patterns need it and how many each
//                byPattern  one entry per pattern in the panel: how many cells hold it, and its own
//                           pieces (identical ones grouped), already multiplied by those cells
//
// Pure: it is handed the grid's settings and a way to get a pattern's computed strips, and touches
// no store, so it can be tested on its own (and the parts list view is just this, rendered).
//
// Patterns in the half cells at the ends of the rows are trimmed to the panel (see clipToWindow.js),
// so those cells make different — fewer, shorter — pieces than a full cell; `edgeCells` counts them.
// A pattern placed flipped is made of mirror-image pieces (see pieces.js).

import { canonicalWood, allowedFinish } from '../woodFinishColors.js';
import { computeGridGeometry } from '../grid/computeGridGeometry.js';
import { computePanelStrips, stripWidthOf, stripThicknessOf } from '../grid/gridStrips.js';
import { DEFAULT_PANEL_DEPTH_MM } from '../units.js';
import { lapRegions, lapKey } from './laps.js';
import { pieceFromStrip, mirrorPiece, addToTally, byPieceSize } from './pieces.js';
import { windowInPattern, clipStripToWindow } from './clipToWindow.js';

const BLANK_PATTERN_ID = 'builtin:blank';
const GRID = 'grid', BORDER = 'border';

const items = (tally) => [...tally.values()].sort(byPieceSize);
const total = (list) => list.reduce((n, it) => n + it.qty, 0);

// The pieces one cell of `pattern` makes. `window`: the polygon (pattern frame) a half cell shows
// the pattern through, or null for a full cell.
function piecesOfCell(pattern, window, mirrored, thickness, laminate) {
  const jointMap = new Map(pattern.joints.map((j) => [j.id, j]));
  const props = new Map(pattern.stripProperties.map((sp) => [sp.id, sp]));
  const templateOf = new Map((pattern.pieceTemplates ?? []).map((pt) => [pt.stripId, pt]));
  const used = []; // the strips that are really made: { strip, sp }
  const extraJoints = [];
  let approx = false;
  const spOfStrip = (strip) => props.get(templateOf.get(strip.id)?.stripPropertyId) ?? pattern.stripProperties[0];
  // Laminated stock (a group of strips glued face to face before cutting) counts as ONE strip: the core,
  // as wide as the whole stack, since every layer's end cuts lie on the same lines.
  const skip = new Set(), merged = new Map(); // layer ids left out; core id -> its stack's sp
  if (laminate) {
    const byId = new Map(pattern.strips.map((s) => [s.id, s]));
    for (const group of pattern.laminations ?? []) {
      // [outer, core, inner]: each layer one strip id, or several ids when the layer is made of more
      // than one piece (an inner strip split by a notch) — those share their first piece's width and wood.
      const layerIds = group.map((e) => (Array.isArray(e) ? e : [e]));
      const reps = layerIds.map((ids) => byId.get(ids[0]));
      if (reps.some((s) => !s)) continue;
      const core = reps[1];
      const mid = (s) => ({ x: (s.start.x + s.end.x) / 2, y: (s.start.y + s.end.y) / 2 });
      const ux = Math.cos(core.orientation), uy = Math.sin(core.orientation);
      const side = (s) => ux * (mid(s).y - mid(core).y) - uy * (mid(s).x - mid(core).x); // > 0: to the core's left
      const stack = [...reps].sort((p, q) => side(q) - side(p)); // leftmost first
      const layers = stack.map((s) => { const sp = spOfStrip(s); return { width: sp.width, material: canonicalWood(sp.material), finish: allowedFinish(sp.material, sp.finish) }; });
      merged.set(core.id, { ...spOfStrip(core), width: layers.reduce((n, l) => n + l.width, 0), layers });
      layerIds.flat().filter((id) => id !== core.id).forEach((id) => skip.add(id));
    }
  }
  for (const strip of pattern.strips) {
    if (skip.has(strip.id)) continue;
    let use = strip;
    const sp = merged.get(strip.id) ?? spOfStrip(strip);
    if (window) {
      const clipped = clipStripToWindow(strip, window, { width: sp.width, joints: jointMap });
      if (!clipped) continue;
      use = clipped.strip;
      approx = approx || clipped.approx;
      extraJoints.push(...clipped.joints);
    }
    used.push({ strip: use, sp });
  }
  const joints = new Map([...jointMap, ...extraJoints.map((j) => [j.id, j])]);
  const widthById = new Map(used.map(({ strip, sp }) => [strip.id, sp.width]));
  const regions = lapRegions({ strips: used.map((u) => u.strip), joints: [...joints.values()], widthOf: (id) => widthById.get(id) });
  const pieces = used.map(({ strip, sp }) => {
    // At the panel's edge a lap whose mate was trimmed away is not cut.
    const kept = window ? { ...strip, cuts: strip.cuts.filter((c) => !c.role.startsWith('cut-') || regions.get(lapKey(strip.id, c.jointId, c.role))?.length) } : strip;
    const piece = pieceFromStrip({ strip: kept, joints, width: sp.width, thickness, material: canonicalWood(sp.material), finish: allowedFinish(sp.material, sp.finish), lapRegions: regions, layers: sp.layers });
    return mirrored ? mirrorPiece(piece) : piece;
  });
  return { pieces, approx };
}

/**
 * @param {object} input
 *   grid      { cols, rows, cellWidth, gridStripWidth, borderWidth, borderCorner, panelDepth, orientation,
 *               cornerBehavior, material, finish, spacePatterns, spaceXforms }
 *   getPattern(id)  the computed pattern (strips, joints, stripProperties, pieceTemplates); may throw
 */
export function computePanelParts({ grid, getPattern }) {
  // ── The panel's own strips
  const model = computePanelStrips(grid);
  const jointMap = new Map(model.joints.map((j) => [j.id, j]));
  const borderTally = new Map(), gridTally = new Map();
  const stripById = new Map(model.strips.map((st) => [st.id, st]));
  const regions = lapRegions({ strips: model.strips, joints: model.joints, widthOf: (id) => stripWidthOf(stripById.get(id), grid) });
  for (const strip of model.strips) {
    const piece = pieceFromStrip({
      strip, joints: jointMap,
      width: stripWidthOf(strip, grid), thickness: stripThicknessOf(strip, grid),
      material: canonicalWood(grid.material), finish: allowedFinish(grid.material, grid.finish), lapRegions: regions,
    });
    const entry = addToTally(strip.kind === 'border' ? borderTally : gridTally, piece, 1, strip.kind === 'border' ? BORDER : GRID);
    (entry.stripIds ??= []).push(strip.id);
    // Where this strip's piece sits in the panel (for the 1:1 layout): the piece frame's origin and turn, panel mm, Y up.
    const shift = strip.trim && !strip.curve ? strip.trim.c0 : 0;
    (entry.placed ??= new Map()).set(strip.id, { piece, x: strip.start.x + Math.cos(strip.orientation) * shift, y: strip.start.y + Math.sin(strip.orientation) * shift, angle: strip.orientation });
  }
  const border = items(borderTally), gridStrips = items(gridTally);

  // ── The patterns
  const geometry = computeGridGeometry(grid);
  const patternCache = new Map(); // id -> computed pattern | Error
  const cellCache = new Map(); // id|flip|window -> { pieces, approx }
  const perPattern = new Map(); // id -> { cells, edgeCells, approx, tally }
  const byPieceTally = new Map();
  const unbuilt = new Set();
  const thickness = grid.panelDepth ?? DEFAULT_PANEL_DEPTH_MM; // patterns are as deep as the panel

  for (const space of geometry.spaces) {
    const id = grid.spacePatterns?.[space.id];
    if (!id || id === BLANK_PATTERN_ID) continue;
    const half = space.spaceType === 'half';
    const xform = grid.spaceXforms?.[space.id] ?? { rot: 0, flip: false };
    let pattern = patternCache.get(id);
    if (pattern === undefined) {
      try { pattern = getPattern(id); } catch (error) { pattern = error instanceof Error ? error : new Error(String(error)); }
      patternCache.set(id, pattern);
    }
    if (pattern instanceof Error) { unbuilt.add(id); continue; }

    const mirrored = !!xform.flip;
    const window = half ? windowInPattern(space, pattern, xform) : null;
    const laminate = grid.stockLaminated?.[id] !== false;
    const cacheKey = `${id}|${laminate ? 'L' : ''}|${mirrored ? 1 : 0}|${window ? window.map((v) => `${v.x.toFixed(2)},${v.y.toFixed(2)}`).join(';') : ''}`;
    let cell = cellCache.get(cacheKey);
    if (!cell) { cell = piecesOfCell(pattern, window, mirrored, thickness, laminate); cellCache.set(cacheKey, cell); }

    let entry = perPattern.get(id);
    if (!entry) { entry = { patternId: id, cells: 0, edgeCells: 0, approx: false, note: pattern.meta?.partsNote, laminated: pattern.laminations?.length ? grid.stockLaminated?.[id] !== false : null, tally: new Map() }; perPattern.set(id, entry); }
    entry.cells++;
    if (half) entry.edgeCells++;
    entry.approx = entry.approx || cell.approx;
    for (const piece of cell.pieces) {
      (addToTally(entry.tally, piece, 1).spaceIds ??= new Set()).add(space.id);
      (addToTally(byPieceTally, piece, 1, id).spaceIds ??= new Set()).add(space.id);
    }
  }

  const byPattern = [...perPattern.values()].map((e) => {
    const list = items(e.tally);
    return { patternId: e.patternId, cells: e.cells, edgeCells: e.edgeCells, approx: e.approx, note: e.note, laminated: e.laminated, items: list, total: total(list) };
  });
  const byPiece = items(byPieceTally);

  return {
    border: { items: border, total: total(border) },
    gridStrips: { items: gridStrips, total: total(gridStrips) },
    patterns: { byPattern, byPiece, total: total(byPiece), unbuilt: [...unbuilt] },
    model,
    geometry,
    dims: { gridStripWidth: grid.gridStripWidth, borderWidth: grid.borderWidth }, // the widths the strips were counted at
  };
}
