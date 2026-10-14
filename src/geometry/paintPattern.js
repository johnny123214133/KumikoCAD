import { getMaterialColor } from './woodFinishColors.js';

// A copy of `pattern` with every strip set to one wood and finish — what a
// painted cell shows. The geometry is untouched; only the stripProperties
// entries (which every piece template points at) change colour, so the cell
// image cache (keyed on strip colours) picks it up by itself.
//
// Memoized per source pattern object and wood/finish, so the same painted
// object comes back on every render and downstream memoization holds.
const memo = new WeakMap();

export function paintPattern(pattern, material, finish) {
  if (!pattern?.stripProperties?.length || !material || !finish) return pattern;
  let byKey = memo.get(pattern);
  if (!byKey) { byKey = new Map(); memo.set(pattern, byKey); }
  const key = `${material}|${finish}`;
  let painted = byKey.get(key);
  if (!painted) {
    const color = getMaterialColor(material, finish);
    painted = {
      ...pattern,
      stripProperties: pattern.stripProperties.map((sp) => ({ ...sp, material, finish, color })),
    };
    byKey.set(key, painted);
  }
  return painted;
}
