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
