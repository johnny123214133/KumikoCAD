// Tiling a selection of cells across the panel.
//
// A cell is r{row}-c{col} (see computeGridGeometry.js): columns are half a cell apart, and a cell
// points up or down by the parity of row + column. Moving a cell by (dRow, dCol) is a plain
// translation of the lattice, so it keeps the cell's orientation, exactly when dRow + dCol is even.
//
// The selection's bounding box (rows r0..r1, columns c0..c1) is the repeating tile. To make every
// copy sit on cells of the same orientation as the original, the box is widened by one column when it
// spans an odd number of columns, so that it starts and ends on cells of opposite orientation. Its
// width W is then even, and tiles side by side repeat every W columns. Tiles above and below
// repeat every H rows, shifted one column sideways when H is odd (the lattice's own slant), so
// the copies fit together whatever the height is. Copies are made in every direction; those that
// fall off the panel are dropped.

const SPACE_ID = /^r(\d+)-c(\d+)$/;

export function parseSpaceId(id) {
  const m = SPACE_ID.exec(id);
  return m ? { r: Number(m[1]), c: Number(m[2]) } : null;
}
const spaceId = (r, c) => `r${r}-c${c}`;

/**
 * The tile of a selection, and where its copies land.
 *   selectedIds  cell ids (those not on a cols × rows panel are ignored)
 * Returns { box: { r0, r1, c0, c1 }, pairs: [{ from, to }] } — `from` a selected cell, `to` the cell
 * it is copied to (never a selected cell, never twice) — or null for an empty selection.
 */
export function tileSelection(selectedIds, cols, rows) {
  const maxC = 2 * cols;
  const cells = [];
  for (const id of selectedIds) {
    const p = parseSpaceId(id);
    if (p && p.r < rows && p.c <= maxC) cells.push({ id, ...p });
  }
  if (!cells.length) return null;
  let r0 = Infinity, r1 = -Infinity, c0 = Infinity, c1 = -Infinity;
  for (const { r, c } of cells) { r0 = Math.min(r0, r); r1 = Math.max(r1, r); c0 = Math.min(c0, c); c1 = Math.max(c1, c); }
  if ((c1 - c0 + 1) % 2 === 1) { // start and end on opposite orientations
    if (c1 + 1 <= maxC) c1 += 1;
    else if (c0 - 1 >= 0) c0 -= 1;
    // (a box as wide as the whole panel has no side-by-side copies, so it needs no widening)
  }
  const W = c1 - c0 + 1, H = r1 - r0 + 1, slant = H % 2;
  const I = Math.ceil(rows / H), J = Math.ceil((maxC + 1 + I) / W) + 1;
  const pairs = [];
  const taken = new Set(cells.map((q) => q.id));
  for (let i = -I; i <= I; i++) {
    for (let j = -J; j <= J; j++) {
      if (i === 0 && j === 0) continue;
      for (const { id, r, c } of cells) {
        const tr = r + i * H, tc = c + j * W + i * slant;
        if (tr < 0 || tr >= rows || tc < 0 || tc > maxC) continue;
        const to = spaceId(tr, tc);
        if (taken.has(to)) continue;
        taken.add(to);
        pairs.push({ from: id, to });
      }
    }
  }
  return { box: { r0, r1, c0, c1 }, pairs };
}
