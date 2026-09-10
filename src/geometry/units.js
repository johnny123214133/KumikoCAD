// mm <-> inch conversion helpers shared by any UI that offers metric/imperial
// dimensions. All persisted dimension values in this app are mm — imperial is
// display/input-only, converted at the edges.
const MM_PER_INCH = 25.4;

export const mmToIn = (mm) => mm / MM_PER_INCH;
export const inToMm = (inches) => inches * MM_PER_INCH;

export const formatMm = (mm, decimals = 1) => `${mm.toFixed(decimals)} mm`;
export const formatIn = (mm, decimals = 2) => `${mmToIn(mm).toFixed(decimals)} in`;
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
