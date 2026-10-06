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
export function resolveParamState(paramDefs, patternParams, ctx) {
  const values = {};
  const bounds = {};
  for (const def of paramDefs) {
    const b = paramBounds(def, { ...ctx, params: values });
    const raw = readLengthMm(patternParams?.[def.key], def.default);
    bounds[def.key] = b;
    values[def.key] = Math.min(Math.max(raw, b.min), b.max);
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
    .map(([k, v]) => `${k}=${readLengthMm(v, '')}`)
    .join(',');
}
