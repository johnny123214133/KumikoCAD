import { renderPatternToCanvas } from './renderPattern.js';

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
// drawBoundary is included here too — PatternIcon and the panel's per-cell
// renderer want DIFFERENT variants of the same pattern (with/without the
// triangle outline baked in); without this in the key they'd collide and
// silently serve each other's cached image.
export function buildPatternCacheKey(patternId, cellWidth, gridStripWidth, patternStripWidth, spacing, drawBoundary = false) {
  const spacingKey = spacing ? `${spacing.length}${spacing.unit}` : '';
  return `${patternId}:${cellWidth}:${gridStripWidth}:${patternStripWidth}:${spacingKey}:${drawBoundary ? 'b' : ''}`;
}

/**
 * Returns a cached offscreen-canvas render of `pattern` at `sizePx` — an
 * object { canvas, worldX, worldY, worldSize } (see renderPatternToCanvas),
 * computing and storing it on first request. `cacheKey` is supplied by the
 * caller rather than derived here — the caller already knows which inputs
 * (cellWidth, gridStripWidth, this pattern's effective strip width/spacing)
 * should invalidate the cache, and re-deriving that from the pattern object
 * itself would mean either re-hashing its full computed geometry (wasteful)
 * or guessing — simpler and more honest to let the caller decide.
 */
export function getPatternImage(cacheKey, pattern, sizePx, oversample = 3, drawBoundary = false) {
  const key = `${cacheKey}:${sizePx}:${oversample}`;
  let entry = cache.get(key);
  if (!entry) {
    entry = renderPatternToCanvas(pattern, sizePx, oversample, drawBoundary);
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
