// Per-pattern parameter schema helpers.
//
// A pattern factory declares the parameters it understands as a list of defs
// (see definePattern in factories/_shared.js), e.g. Goma's `inset`:
//
//   { key: 'inset', label: 'Inset', kind: 'length', default: 6, min: 0,
//     max: (ctx) => ..., description: '...' }
//
// All lengths are in mm (imperial is display/input-only — see units.js).
// `min`/`max` may be a number or a function of ctx = { cellWidth,
// gridStripWidth, patternStripWidth, params }, because a parameter's valid
// range usually depends on the current cell/strip dimensions (and on params
// declared before it — see resolveParamState). Only kind 'length' is
// implemented; other kinds (angle, count, ...) can be added alongside it
// when a pattern needs one.
//
// A param VALUE is stored as { length, unit } under patternParams[key] (the
// shape the design docs use). Everything in this app persists mm, so values
// are written with unit 'mm'; readLengthMm still understands a bare number
// or an 'in' value so older/hand-edited data keeps loading.
import { inToMm } from './units.js';

// Ratio-based parameters.
//
// A def with `basis` is a DESIGN dimension that should keep its look when the cell is
// resized, so it is stored as a ratio rather than in mm:
//   basis: 'cell'  — a fraction of the cell width (inset, stub length, secondary spacing);
//   basis: 'range' — a position between the parameter's own min and max (curve length),
//                    0 = at its minimum, 1 = at its maximum.
// Its stored value is { ratio }; the mm value is worked out from the ratio at build time
// (resolveParamState), clamped into the range the current dimensions allow (the stored
// ratio is never altered by that, so growing the cell back restores the look) and, when
// ctx.paramStep is given, snapped to that step (the unit's rounding grid).
// `default` stays the value in mm at the reference dimensions below — what the pattern
// looks like at a 50 mm cell with 3 mm grid strips and its default strip width — and
// the default ratio is worked out from it. Defs without `basis` (strip widths, corner
// spacing, ...) are material or fixed dimensions and stay absolute mm: { length, unit }.
export const REFERENCE_CELL_WIDTH_MM = 50;
export const REFERENCE_GRID_STRIP_MM = 3;
export const isRatioDef = (def) => def?.basis === 'cell' || def?.basis === 'range';
export const ratioOf = (value) => (value && typeof value === 'object' && Number.isFinite(value.ratio) ? value.ratio : null);
export const ratioParam = (ratio) => ({ ratio });

export function readLengthMm(value, fallbackMm) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object' && Number.isFinite(value.length)) {
    return value.unit === 'in' ? inToMm(value.length) : value.length;
  }
  return fallbackMm;
}

export function lengthParam(mm) {
  return { length: mm, unit: 'mm' };
}

export function paramBounds(def, ctx) {
  const min = typeof def.min === 'function' ? def.min(ctx) : (def.min ?? 0);
  const rawMax = typeof def.max === 'function' ? def.max(ctx) : def.max;
  const max = rawMax == null ? Infinity : Math.max(min, rawMax);
  return { min, max };
}

// Effective value (mm) and valid range of every declared param. A value is
// the stored one if there is one, else the def's default, clamped into its
// currently-valid range — the clamp matters because a stored value can fall
// out of range after the user changes cell width / strip widths, and the
// factory still has to produce valid geometry.
//
// Defs resolve in declaration order and each min/max callback receives
// ctx.params: the already-resolved values (mm) of the params declared BEFORE
// it. That lets a later param's range depend on an earlier one — Sakura's
// corner spacing can only go as far as its thick strip width allows. Declare
// the param others depend on first.
const refMemo = new WeakMap(); // paramDefs array -> { [key]: default ratio }
// The default ratio of every ratio def: its `default` (mm at the reference dimensions)
// turned into a ratio at those dimensions. Worked out lazily, once per defs array —
// a def's range can be costly to evaluate (the curved patterns), so not at load time.
export function referenceRatios(paramDefs) {
  let out = refMemo.get(paramDefs);
  if (out) return out;
  out = {};
  const values = {};
  const stripWidth = paramDefs.find((d) => d.refStripWidth != null)?.refStripWidth ?? 2;
  for (const def of paramDefs) {
    const ctx = { cellWidth: REFERENCE_CELL_WIDTH_MM, gridStripWidth: REFERENCE_GRID_STRIP_MM, patternStripWidth: stripWidth, params: values };
    const b = paramBounds(def, ctx);
    const mm = Math.min(Math.max(def.default, b.min), b.max);
    if (isRatioDef(def)) {
      out[def.key] = def.basis === 'cell'
        ? def.default / REFERENCE_CELL_WIDTH_MM
        : (b.max > b.min ? Math.min(1, Math.max(0, (def.default - b.min) / (b.max - b.min))) : 0);
    }
    values[def.key] = mm;
  }
  refMemo.set(paramDefs, out);
  return out;
}

// A stored value in the current shape: { ratio } for a ratio def, { length, unit } for the
// rest. `value` may be either shape (a legacy { length } for a ratio def is converted as if
// it was authored at the reference dimensions); undefined gives the def's default.
export function storedParamFor(def, value, paramDefs, authoredStripWidth) {
  if (!isRatioDef(def)) return lengthParam(readLengthMm(value, def.default));
  const r = ratioOf(value);
  if (r != null) return ratioParam(r);
  const ratios = referenceRatios(paramDefs);
  const mm = readLengthMm(value, null);
  if (mm == null) return ratioParam(ratios[def.key]);
  return ratioParam(ratioFromReferenceMm(def, mm, paramDefs, authoredStripWidth));
}

// mm authored at the reference dimensions -> ratio (see storedParamFor).
// A range-based value depends on the strip width it was authored with (the range moves with it).
function ratioFromReferenceMm(def, mm, paramDefs, authoredStripWidth) {
  if (def.basis === 'cell') return mm / REFERENCE_CELL_WIDTH_MM;
  const stripWidth = authoredStripWidth ?? paramDefs.find((d) => d.refStripWidth != null)?.refStripWidth ?? 2;
  const values = {};
  for (const d of paramDefs) {
    const b = paramBounds(d, { cellWidth: REFERENCE_CELL_WIDTH_MM, gridStripWidth: REFERENCE_GRID_STRIP_MM, patternStripWidth: stripWidth, params: values });
    if (d === def) return b.max > b.min ? Math.min(1, Math.max(0, (mm - b.min) / (b.max - b.min))) : 0;
    values[d.key] = Math.min(Math.max(d.default, b.min), b.max);
  }
  return 0;
}

// Converts every ratio def's legacy { length } in a patternParams object (saved custom
// patterns, saved defaults) to { ratio }; everything else is left alone.
export function migrateParams(paramDefs, patternParams, authoredStripWidth) {
  if (!patternParams || !paramDefs?.some(isRatioDef)) return patternParams;
  let changed = false;
  const out = { ...patternParams };
  for (const def of paramDefs) {
    if (!isRatioDef(def) || !(def.key in out)) continue;
    if (ratioOf(out[def.key]) != null) continue;
    out[def.key] = storedParamFor(def, out[def.key], paramDefs, authoredStripWidth);
    changed = true;
  }
  return changed ? out : patternParams;
}

// The ratio that gives `mm` under the CURRENT dimensions (what editing a ratio parameter
// in the Inspector stores). `bounds` = this def's { min, max } at those dimensions.
export function ratioForMm(def, mm, { cellWidth }, bounds) {
  if (def.basis === 'cell') return cellWidth > 0 ? mm / cellWidth : 0;
  return bounds && bounds.max > bounds.min ? Math.min(1, Math.max(0, (mm - bounds.min) / (bounds.max - bounds.min))) : 0;
}

export function resolveParamState(paramDefs, patternParams, ctx) {
  const values = {};
  const bounds = {};
  const ratios = paramDefs.some(isRatioDef) ? referenceRatios(paramDefs) : null;
  for (const def of paramDefs) {
    const b = paramBounds(def, { ...ctx, params: values });
    bounds[def.key] = b;
    const stored = patternParams?.[def.key];
    if (isRatioDef(def) && readLengthMm(stored, null) == null) {
      // Ratio parameter (stored { ratio }, or nothing stored -> the default ratio).
      const ratio = ratioOf(stored) ?? ratios[def.key];
      const raw = def.basis === 'cell' ? ratio * ctx.cellWidth
        : Number.isFinite(b.max) ? b.min + ratio * (b.max - b.min) : def.default;
      let v = Math.min(Math.max(raw, b.min), b.max);
      // On the unit's rounding grid (whole/half mm, or 1/16"), staying inside the range.
      const step = ctx.paramStep > 0 ? ctx.paramStep : (def.step ?? 0.5);
      let r = Math.round(v / step) * step;
      if (r < b.min - 1e-9) r += step;
      if (r > b.max + 1e-9) r -= step;
      if (r >= b.min - 1e-9 && r <= b.max + 1e-9) v = Number(r.toFixed(6));
      values[def.key] = v;
      continue;
    }
    // A def may give its default as a position within its own current range (`defaultFraction`,
    // 0 = min, 1 = max) — for params whose range moves with the dimensions, where one literal
    // can't be a sensible starting point everywhere. `default` still serves as the literal fallback.
    const computed = typeof def.defaultValue === 'function' ? def.defaultValue({ ...ctx, params: values }) : null; // a default worked out from the dimensions
    const fallback = computed != null && Number.isFinite(computed) ? computed
      : def.defaultFraction != null && Number.isFinite(b.max) ? b.min + def.defaultFraction * (b.max - b.min) : def.default;
    const raw = readLengthMm(stored, fallback);
    let v = Math.min(Math.max(raw, b.min), b.max);
    // A default (nothing stored for this param) sits on the param's own step grid — a whole or
    // half millimetre — rather than at whatever a fraction of the range or a clamp gave. The
    // snapped value stays inside the range (a range narrower than a step is left as it is).
    if (stored == null) {
      const step = def.step ?? 0.5;
      let r = Math.round(v / step) * step;
      if (r < b.min - 1e-9) r += step;
      if (r > b.max + 1e-9) r -= step;
      if (r >= b.min - 1e-9 && r <= b.max + 1e-9) v = Number(r.toFixed(6));
    }
    values[def.key] = v;
  }
  return { values, bounds };
}

export function resolveParams(paramDefs, patternParams, ctx) {
  return resolveParamState(paramDefs, patternParams, ctx).values;
}

export function toPatternParams(resolvedMm) {
  return Object.fromEntries(Object.entries(resolvedMm).map(([k, mm]) => [k, lengthParam(mm)]));
}

// Stable string for cache keys / duplicate-recipe comparison. Sorted by key;
// values normalised to mm so { 6, 'mm' } and a bare 6 compare equal.
export function paramsKey(patternParams) {
  return Object.entries(patternParams || {})
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => (ratioOf(v) != null ? `${k}=r${Number(ratioOf(v).toFixed(6))}` : `${k}=${readLengthMm(v, '')}`))
    .join(',');
}

// The order the Inspector lists a pattern's parameters in (declaration order is kept for resolving
// them, since a range can depend on earlier params): secondary strips, stubs, curve, thick strip,
// inset, corner spacing, the secondary inset, then the laminated strips' widths.
const DISPLAY_RANK = { secondaryStripWidth: 1, stubLength: 2, curveLength: 3, thickStripWidth: 4, inset: 5, cornerSpacing: 6, edgeInset: 7, secondarySpacing: 7, outerStripWidth: 9 };
export const displayRank = (def) => (def.laminated && def.key === 'thickStripWidth' ? 8 : DISPLAY_RANK[def.key] ?? 5.5);
export const inDisplayOrder = (defs) => defs.map((d, i) => [d, i]).sort((a, b) => displayRank(a[0]) - displayRank(b[0]) || a[1] - b[1]).map((x) => x[0]);
