// Parameter definitions for the curved patterns that hang a bent pair of strips off a thick strip
// (Ume, Sakura-shippo): the curved strip LENGTH leads, and the thick strip's width and spacing
// range over the positions at which the chosen length can be made.
//
// `familyFor(ctx, thick, spacing)` is the pattern's cached curveFamily for one position of the thick
// strip. The length's own range is everything the pattern can do over all positions, scanned on a
// coarse grid (whole mm); the thick strip's range is the widths at which SOME spacing makes the
// current length, and the spacing's the spacings that make it for the current width. Order matters:
// each range reads the values resolved before it.
export const scan = (lo, hi, step = 1) => {
  const v = [lo];
  for (let x = (Math.floor(lo / step) + 1) * step; x < hi - 1e-9; x += step) v.push(x);
  if (hi > lo + 1e-9) v.push(hi);
  return v;
};
const reaches = (fam, L) => fam.feasible && L >= fam.Lmin - 1e-6 && L <= fam.Lmax + 1e-6;

export function lengthLedParams({ spacingStep = 1, familyFor, thickLo, thickCap, spacingLo, spacingCap, defaultLength, defaultThick, defaultSpacing, lengthDescription, thickDescription, thickLabel, spacingDescription }) {
  const gridCache = new Map();
  const gridFor = (ctx) => {
    const { cellWidth, gridStripWidth, patternStripWidth: w } = ctx;
    const key = `${cellWidth}|${gridStripWidth}|${w}|${ctx.params?.outerStripWidth ?? ''}`;
    if (!gridCache.has(key)) {
      if (gridCache.size > 64) gridCache.clear();
      const g = [];
      for (const t of scan(thickLo(ctx), thickCap(ctx))) for (const s of scan(spacingLo(ctx, t), spacingCap(ctx, t), spacingStep)) g.push({ t, s, fam: familyFor(ctx, t, s) });
      gridCache.set(key, g);
    }
    return gridCache.get(key);
  };
  const feasibleGrid = (ctx) => gridFor(ctx).filter((c) => c.fam.feasible);
  return [
    {
      key: 'curveLength',
      label: 'Curved strip length',
      kind: 'length',
      // A position within its own range (the range is what moves with the cell), so it keeps the
      // bow it was given when the cell is resized. `default` is the length in mm at the reference
      // dimensions (50 mm cell, 3 mm grid strips, the pattern's starting strip width).
      basis: 'range',
      default: defaultLength,
      step: 0.5,
      min: (ctx) => { const fs = feasibleGrid(ctx); return fs.length ? Math.min(...fs.map((c) => c.fam.Lmin)) : 0; },
      max: (ctx) => { const fs = feasibleGrid(ctx); return fs.length ? Math.max(...fs.map((c) => c.fam.Lmax)) : 0; },
      description: lengthDescription,
    },
    {
      key: 'thickStripWidth',
      label: thickLabel ?? 'Thick strip width',
      ...(thickLabel ? { laminated: true } : {}),
      kind: 'length',
      default: defaultThick,
      min: (ctx) => { const fs = gridFor(ctx).filter((c) => reaches(c.fam, ctx.params.curveLength)); return fs.length ? Math.min(...fs.map((c) => c.t)) : thickLo(ctx); },
      max: (ctx) => { const fs = gridFor(ctx).filter((c) => reaches(c.fam, ctx.params.curveLength)); return fs.length ? Math.max(...fs.map((c) => c.t)) : thickLo(ctx); },
      description: thickDescription,
    },
    {
      key: 'cornerSpacing',
      label: 'Corner spacing',
      kind: 'length',
      default: defaultSpacing,
      min: (ctx) => {
        const t = ctx.params.thickStripWidth;
        const ok = scan(spacingLo(ctx, t), spacingCap(ctx, t), spacingStep).filter((s) => reaches(familyFor(ctx, t, s), ctx.params.curveLength));
        return ok.length ? Math.min(...ok) : spacingLo(ctx, t);
      },
      max: (ctx) => {
        const t = ctx.params.thickStripWidth;
        const ok = scan(spacingLo(ctx, t), spacingCap(ctx, t), spacingStep).filter((s) => reaches(familyFor(ctx, t, s), ctx.params.curveLength));
        return ok.length ? Math.max(...ok) : spacingLo(ctx, t);
      },
      description: spacingDescription,
    },
  ];
}
