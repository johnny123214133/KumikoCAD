// Every piece of the panel as a plan outline in panel millimetres, for the 1:1 layout printout. Pure.
//
// Coordinates are the page's: origin at the panel's top-left corner, x right, y DOWN, in mm.
//   border, grid strips   their pieces' outlines (with the mitres, laps' ends and the trimming at the panel's edge)
//   pattern strips        each cell's pattern strips placed in the cell like the canvas does; a half cell at the panel's
//                         edge shows its pattern through the cell's own window, so those outlines carry a `clip`
// Returns { width, height, shapes: [{ kind: 'border' | 'grid' | 'pattern', pts: [[x, y], ...], clip?: [[x, y], ...] }] }

import { computeCellPlacement } from '../geometry/grid/computeGridGeometry.js';
import { computeStripRenderData } from '../geometry/renderPattern.js';

const DEG = Math.PI / 180;
const BLANK = 'builtin:blank';

export function panelOutlines({ parts, grid, getPattern }) {
  const outer = parts.model.rects.outer;
  const ox = outer.x0, oy = outer.y1; // panel (Y up) -> page: x - ox, oy - y
  const toPage = (x, y) => [x - ox, oy - y];
  const shapes = [];

  for (const [kind, list] of [['border', parts.border.items], ['grid', parts.gridStrips.items]]) {
    for (const item of list) {
      for (const { piece, x, y, angle } of item.placed?.values() ?? []) {
        const c = Math.cos(angle), s = Math.sin(angle);
        if (piece.outline?.length >= 3) shapes.push({ kind, pts: piece.outline.map(([px, py]) => toPage(x + px * c - py * s, y + px * s + py * c)) });
      }
    }
  }

  // The patterns: each distinct pattern's strip outlines once (in its own Konva frame), then every cell's turn of them.
  const cache = new Map();
  const outlinesOf = (id, pattern) => {
    if (!cache.has(id)) {
      cache.set(id, computeStripRenderData(pattern).map((d) => {
        const th = d.rotationDeg * DEG, c = Math.cos(th), s = Math.sin(th);
        const pts = [];
        for (let i = 0; i < d.points.length; i += 2) pts.push([d.x + d.points[i] * c - d.points[i + 1] * s, d.y + d.points[i] * s + d.points[i + 1] * c]);
        return pts;
      }));
    }
    return cache.get(id);
  };
  for (const space of parts.geometry.spaces) {
    const id = grid.spacePatterns?.[space.id];
    if (!id || id === BLANK) continue;
    let pattern;
    try { pattern = getPattern(id); } catch { continue; }
    if (!pattern || pattern instanceof Error) continue;
    const xform = grid.spaceXforms?.[space.id] ?? { rot: 0, flip: false };
    const pl = computeCellPlacement(space, pattern, xform);
    const th = pl.rotationDeg * DEG, c = Math.cos(th), s = Math.sin(th);
    // pattern Konva frame -> panel Konva frame (y down) -> page (the Konva y is the page's, offset by oy)
    const place = ([px, py]) => { const sx = px * pl.scaleX, sy = py * pl.scaleY; return [pl.x + sx * c - sy * s - ox, oy + (pl.y + sx * s + sy * c)]; };
    const clip = space.spaceType === 'half' ? space.vertices.map((v) => toPage(v.x, v.y)) : undefined;
    for (const poly of outlinesOf(id, pattern)) shapes.push({ kind: 'pattern', pts: poly.map(place), ...(clip ? { clip } : {}) });
  }
  return { width: outer.x1 - outer.x0, height: outer.y1 - outer.y0, shapes };
}
