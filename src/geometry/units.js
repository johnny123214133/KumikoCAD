// mm <-> inch conversion helpers shared by any UI that offers metric/imperial
// dimensions. All persisted dimension values in this app are mm — imperial is
// display/input-only, converted at the edges.
const MM_PER_INCH = 25.4;

export const mmToIn = (mm) => mm / MM_PER_INCH;
export const inToMm = (inches) => inches * MM_PER_INCH;

export const formatMm = (mm, decimals = 1) => `${mm.toFixed(decimals)} mm`;
export const formatIn = (mm, decimals = 2) => `${mmToIn(mm).toFixed(decimals)} in`;
// Display helpers for the one length unit ('mm' | 'in') the whole CAD is shown in.
// Values stay mm everywhere they are stored; these convert at the edge.
export const toUnit = (mm, unit) => (unit === 'in' ? mmToIn(mm) : mm);
export const fromUnit = (value, unit) => (unit === 'in' ? inToMm(value) : value);
// "12.5 mm" / "0.4921 in" — inches get 4 decimals so a 1/16" step (0.0625) shows exactly.
// A length of a metre or more also gets the larger units, "1053 mm (1 m, 5 cm, 3 mm)", and one of a foot
// or more "37.5 in (3 ft, 1.5 in)"; zero parts are left out.
export function formatLength(mm, unit, decimals = unit === 'in' ? 4 : 2) {
  const round = (v) => Number(v.toFixed(decimals));
  const v = round(toUnit(mm, unit));
  const text = `${v} ${unit}`;
  const sign = v < 0 ? -1 : 1, a = Math.abs(v);
  const parts = [];
  if (unit === 'in') {
    if (a < 12) return text;
    const ft = Math.floor(a / 12), rest = round(a - 12 * ft);
    parts.push(`${ft} ft`);
    if (rest > 0) parts.push(`${rest} in`);
  } else {
    if (a < 1000) return text;
    const m = Math.floor(a / 1000), r = a - 1000 * m, cm = Math.floor(r / 10), rest = round(r - 10 * cm);
    parts.push(`${m} m`);
    if (cm > 0) parts.push(`${cm} cm`);
    if (rest > 0) parts.push(`${rest} mm`);
  }
  if (sign < 0) parts[0] = `-${parts[0]}`;
  return `${text} (${parts.join(', ')})`;
}
export const formatBoth = (mm, mmDecimals = 1, inDecimals = 2) =>
  `${formatMm(mm, mmDecimals)} (${formatIn(mm, inDecimals)})`;

// Cell width: capped at 153mm — a deliberately loose, temporary limit per
// the brainstorm (not derived from 6in, which would be 152.4mm — 153 was
// stated explicitly and is being kept as-is rather than "corrected").
export const MAX_CELL_WIDTH_MM = 153;
// Grid strip width and pattern strip width each individually capped at 1/3
// of the current cell width.
export const MAX_STRIP_WIDTH_FRACTION = 1 / 3;

// Cell width increments by whole mm in metric, by 1/8" in imperial.
export const MM_STEP = 1;
export const IN_STEP = 1 / 8;

export const roundToMmStep = (mm) => Math.round(mm / MM_STEP) * MM_STEP;
export const roundToInStep = (inches) => Math.round(inches / IN_STEP) * IN_STEP;

// Called when the unit TOGGLE itself flips (not on every keystroke) — snaps
// the current value to a clean number in the newly-selected unit, per the
// brainstorm: round up when landing on mm (never end up silently over a
// limit due to rounding), round down when landing on inches (avoid an ugly
// sub-1/8" remainder).
export const roundUpToMmStep = (mm) => Math.ceil(mm / MM_STEP) * MM_STEP;
export const roundDownToInStep = (mm) => Math.floor(mmToIn(mm) / IN_STEP) * IN_STEP;

// Strip width: increments by whole mm in metric (same as cell width), but by
// a SIXTEENTH of an inch in imperial — finer than cell width's 1/8", since
// strip width sits at a much smaller absolute scale and 1/8" jumps would be
// coarse relative to it.
export const STRIP_IN_STEP = 1 / 16;
// "Always ensure the lower bound is 1 millimeter" — a hard floor independent
// of unit; the imperial display value is whatever that 1mm converts to, not
// separately rounded to a "clean" 1/16" figure.
export const MIN_STRIP_WIDTH_MM = 1;

// Strip width's unit-toggle rounding goes the OPPOSITE direction from cell
// width's: round UP when landing on inches (a finer metric value should
// never quietly imply a strip narrower than what ends up displayed) and
// round DOWN when landing on mm (avoid ending up over a limit purely from
// rounding up).
export const roundUpToStripInStep = (mm) => Math.ceil(mmToIn(mm) / STRIP_IN_STEP) * STRIP_IN_STEP;
export const roundDownToMmStep = (mm) => Math.floor(mm / MM_STEP) * MM_STEP;

// Nearest-value rounding for strip width, used when a manually TYPED value
// loses focus (blur) — snaps it onto the strip step grid without forcing a
// particular direction, unlike the unit-toggle helpers above which round
// only one way. mm reuses roundToMmStep (MM_STEP is the same 1mm grid for
// both cell and strip width); inches needs its own since strip width's
// imperial step (1/16") is finer than cell width's (1/8").
export const roundToStripInStep = (mm) => Math.round(mmToIn(mm) / STRIP_IN_STEP) * STRIP_IN_STEP;

// ---------------------------------------------------------------------------
// Panel editor grid inputs: cell width and grid strip width
// ---------------------------------------------------------------------------
// (The older MM_STEP / IN_STEP / roundUpToMmStep ... helpers above predate
// these limits and now serve the pattern Inspector's strip width; the grid
// inputs have their own steps and bounds below.)
//
// Cell width: 50 mm minimum (also its default), 153 mm maximum, stepping by
// 5 mm in metric and 3/16" in imperial.
export const MIN_CELL_WIDTH_MM = 50;
export const DEFAULT_CELL_WIDTH_MM = 50;
export const CELL_MM_STEP = 5;
export const CELL_IN_STEP = 3 / 16;
// Grid strip width: 2 mm minimum, 3 mm default, stepping by half a mm / 1/16".
// (Its maximum is a third of the current cell width.)
export const MIN_GRID_STRIP_WIDTH_MM = 2;
export const DEFAULT_GRID_STRIP_WIDTH_MM = 3;
export const GRID_STRIP_MM_STEP = 0.5;
export const GRID_STRIP_IN_STEP = 1 / 16;
// A pattern's regular strip width when nothing else says (and the width each
// built-in pattern's template starts at).
export const DEFAULT_PATTERN_STRIP_WIDTH_MM = 2;

// Only the spinner/arrow-key steps are on those grids — a typed value isn't
// forced onto them. These tolerate the float noise in inch↔mm conversions
// (11 steps of 3/16" should floor to 11, not 10.999999).
const EPS = 1e-9;
const ceilTo = (v, step) => Math.ceil(v / step - EPS) * step;
const floorTo = (v, step) => Math.floor(v / step + EPS) * step;

// Called when the unit TOGGLE itself flips — snaps a value to a clean number in
// the newly selected unit, with the same direction rules as before, just on
// each field's own step grid. Cell width: round UP when landing on mm (never
// end up silently under a limit), round DOWN when landing on inches (avoid an
// ugly sub-step remainder). Grid strip width goes the OPPOSITE way: UP when
// landing on inches, DOWN when landing on mm. Results are mm, kept inside the
// field's own bounds (landing on inches rounds the minimum up onto the inch
// grid, since the grid's steps count from it).
export function snapCellWidthForUnit(mm, unit) {
  if (unit === 'mm') return Math.min(Math.max(ceilTo(mm, CELL_MM_STEP), MIN_CELL_WIDTH_MM), MAX_CELL_WIDTH_MM);
  const inches = Math.max(floorTo(mmToIn(mm), CELL_IN_STEP), ceilTo(mmToIn(MIN_CELL_WIDTH_MM), CELL_IN_STEP));
  return Math.min(inToMm(inches), MAX_CELL_WIDTH_MM);
}
export function snapGridStripWidthForUnit(mm, unit) {
  if (unit === 'mm') return Math.max(floorTo(mm, GRID_STRIP_MM_STEP), MIN_GRID_STRIP_WIDTH_MM);
  return inToMm(Math.max(ceilTo(mmToIn(mm), GRID_STRIP_IN_STEP), ceilTo(mmToIn(MIN_GRID_STRIP_WIDTH_MM), GRID_STRIP_IN_STEP)));
}

// Border width: the width of the panel's four border strips (the frame round the grid).
// The border's INNER face never moves, whatever the border width, so the border cells keep their
// shape. On the two sides that run along the cell's base edge it sits half a grid strip in from
// the panel's nominal edge (where the grid strips stop the patterns beside them), and the rest of
// the border (width - half a grid strip) lies outside the nominal edge. On the two sides across
// the base edge it sits ON the nominal edge, which is the median of the half cells there, and the
// whole border lies outside it. Steps by half a mm (or 1/16" in imperial, like the grid strip
// width). Its minimum is the grid strip width (rounded UP to the next half mm): the diagonal grid
// strips that run into the border across the base edge reach (√3/2) of a strip width into it.
export const BORDER_WIDTH_MM_STEP = 0.5;
export const BORDER_WIDTH_IN_STEP = 1 / 16;
export const MAX_BORDER_WIDTH_MM = 100;
export const DEFAULT_BORDER_WIDTH_MM = DEFAULT_GRID_STRIP_WIDTH_MM;
export const minBorderWidthMm = (gridStripWidth) => ceilTo(gridStripWidth, BORDER_WIDTH_MM_STEP);
// A border width held between its minimum (which follows the grid strip width) and maximum.
export const clampBorderWidth = (borderWidth, gridStripWidth) =>
  Math.min(Math.max(Number.isFinite(borderWidth) ? borderWidth : DEFAULT_BORDER_WIDTH_MM, minBorderWidthMm(gridStripWidth)), MAX_BORDER_WIDTH_MM);
// Same direction rules as the grid strip width on a unit switch: down to a half mm, up to a 1/16".
export function snapBorderWidthForUnit(mm, unit, gridStripWidth) {
  const min = minBorderWidthMm(gridStripWidth);
  if (unit === 'mm') return Math.min(Math.max(floorTo(mm, BORDER_WIDTH_MM_STEP), min), MAX_BORDER_WIDTH_MM);
  const inches = Math.max(ceilTo(mmToIn(mm), BORDER_WIDTH_IN_STEP), ceilTo(mmToIn(min), BORDER_WIDTH_IN_STEP));
  return Math.min(inToMm(inches), MAX_BORDER_WIDTH_MM);
}

// Panel depth: how far the panel as a whole stands off the wall it is mounted on. It draws
// nothing, but it is how deep the panel's own strips (grid and border) are, so it sets what the
// half laps and three-strip laps cut away, and the dimensions of those strips. At least 10 mm,
// which also keeps it deeper than the pattern strips (6 mm), which sit in the middle of it.
export const MIN_PANEL_DEPTH_MM = 10;
export const DEFAULT_PANEL_DEPTH_MM = 12;
export const MAX_PANEL_DEPTH_MM = 100;
export const PANEL_DEPTH_MM_STEP = 1; // whole millimetres, or eighths of an inch
export const PANEL_DEPTH_IN_STEP = 1 / 8;
export const clampPanelDepth = (depth) =>
  Math.min(Math.max(Number.isFinite(depth) ? depth : DEFAULT_PANEL_DEPTH_MM, MIN_PANEL_DEPTH_MM), MAX_PANEL_DEPTH_MM);
// Same direction rules as the strip widths on a unit switch, to this field's steps: down to a whole mm,
// up to a 1/8".
export function snapPanelDepthForUnit(mm, unit) {
  if (unit === 'mm') return clampPanelDepth(floorTo(mm, PANEL_DEPTH_MM_STEP));
  const inches = Math.max(ceilTo(mmToIn(mm), PANEL_DEPTH_IN_STEP), ceilTo(mmToIn(MIN_PANEL_DEPTH_MM), PANEL_DEPTH_IN_STEP));
  return Math.min(inToMm(inches), MAX_PANEL_DEPTH_MM);
}

// The thickness a pattern's strips have when their own settings say nothing.
export const PANEL_STRIP_THICKNESS_MM = 6;

// The one place the grid's dimension rules live, shared by the store's
// immediate setters (useGridStore) and the debounced commit used by the Grid
// inspector (store/gridDimensionsCommit.js). `current` is { cellWidth,
// gridStripWidth }; `requested` holds whichever of those the caller wants to
// change. A non-positive request is ignored ("don't update the render when set
// to 0"); otherwise cell width is held between MIN_CELL_WIDTH_MM and
// MAX_CELL_WIDTH_MM, grid strip width is at least MIN_GRID_STRIP_WIDTH_MM, and
// the grid strip is capped at a third of the (possibly just-changed) cell
// width — so shrinking the cell also pulls a now-too-wide grid strip down.
export function clampGridDimensions(current, requested = {}) {
  let { cellWidth, gridStripWidth } = current;
  if (requested.cellWidth > 0) cellWidth = Math.min(Math.max(requested.cellWidth, MIN_CELL_WIDTH_MM), MAX_CELL_WIDTH_MM);
  if (requested.gridStripWidth > 0) gridStripWidth = Math.max(requested.gridStripWidth, MIN_GRID_STRIP_WIDTH_MM);
  gridStripWidth = Math.min(gridStripWidth, cellWidth * MAX_STRIP_WIDTH_FRACTION);
  return { cellWidth, gridStripWidth };
}

// The most cells (X × Y) a panel can have. Past this the panel is too heavy to draw and edit.
export const MAX_PANEL_CELLS = 3000;

// Cell counts after the user sets one of them (`which` = 'cols' | 'rows') to `value`: that one is
// rounded and kept to 1..MAX_PANEL_CELLS, and if the product would pass the limit the OTHER one is
// scaled back (rounded down) until X × Y is at or under it.
export function fitCellCounts(current, which, value) {
  const other = which === 'cols' ? 'rows' : 'cols';
  const n = Math.min(Math.max(Math.round(Number(value)) || 1, 1), MAX_PANEL_CELLS);
  const o = current[other] * n > MAX_PANEL_CELLS ? Math.max(1, Math.floor(MAX_PANEL_CELLS / n)) : current[other];
  return { [which]: n, [other]: o };
}
