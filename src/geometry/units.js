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
