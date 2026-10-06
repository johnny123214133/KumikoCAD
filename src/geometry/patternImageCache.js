import { renderPatternToCanvas } from './renderPattern.js';
import { paramsKey } from './params.js';

// Simple growing Map cache — deliberately not doing LRU eviction or a size
// cap. The number of DISTINCT patterns actually in use at once (built-ins +
// whatever's been forked) is small; this would only grow unbounded under
// constant dimension-tweaking, which isn't a real usage pattern. Worth
// revisiting if that assumption turns out wrong.
const cache = new Map();

// Shared by every call site (PatternIcon.jsx, the panel's per-cell
// renderer) so cache keys are built the same consistent way. Takes the raw
// inputs that affect a pattern's geometry but aren't reflected in the
// computed pattern object's own fields (gridStripWidth isn't stored
// anywhere on the output — only its effect on strip/joint positions is).
// drawBoundary and selected are included here too — different variants of
// the same pattern at the same dimensions (with/without the triangle
// outline, with/without every strip's selection border); without these in
// the key they'd collide and silently serve each other's cached image.
// `color` (the strip's fully-resolved render color, e.g.
// stripProperties[0].color) is included directly rather than passing
// material+finish separately and re-deriving it here — the caller already
// has the resolved color on the computed pattern object, and keying on the
// actual output rather than its inputs means this cache key stays correct
// even if getMaterialColor's derivation logic changes shape later.
// `patternParams` is the pattern's whole parameter map ({ key: {length, unit} },
// e.g. Goma's inset) — keyed generically so a new pattern's parameters
// invalidate its cached images without touching this function.
export function buildPatternCacheKey(patternId, cellWidth, gridStripWidth, patternStripWidth, patternParams, drawBoundary = false, selected = false, color = '') {
  return `${patternId}:${cellWidth}:${gridStripWidth}:${patternStripWidth}:${paramsKey(patternParams)}:${drawBoundary ? 'b' : ''}:${selected ? 's' : ''}:${color}`;
}

/**
 * Returns a cached offscreen-canvas render of `pattern` at `sizePx` — an
 * object { canvas, worldX, worldY, worldSize } (see renderPatternToCanvas),
 * computing and storing it on first request. `cacheKey` is supplied by the
 * caller rather than derived here — the caller already knows which inputs
 * (cellWidth, gridStripWidth, this pattern's effective strip width/parameters)
 * should invalidate the cache, and re-deriving that from the pattern object
 * itself would mean either re-hashing its full computed geometry (wasteful)
 * or guessing — simpler and more honest to let the caller decide.
 */
export function getPatternImage(cacheKey, pattern, sizePx, oversample = 3, drawBoundary = false, selected = false) {
  const key = `${cacheKey}:${sizePx}:${oversample}`;
  let entry = cache.get(key);
  if (!entry) {
    entry = renderPatternToCanvas(pattern, sizePx, oversample, drawBoundary, selected);
    cache.set(key, entry);
  }
  return entry;
}

// Exposed for the rare case a caller explicitly needs to force a redraw
// (not currently used — cache keys already change naturally when their
// inputs do) rather than for routine invalidation.
export function clearPatternImageCache() {
  cache.clear();
}
