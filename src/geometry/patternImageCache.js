import { renderPatternToCanvas } from './renderPattern.js';
import { paramsKey } from './params.js';
import { themeRasterKey } from '../theme/themeRuntime.js';

// A Map used as an LRU, bounded by the pixel memory the canvases hold. Most
// entries are small (a panel cell at the base tier is 384 x 384 px, ~0.6 MB), so
// the bound only matters once zoom-aware cells (CELL_RASTER_SIZES below) add
// large variants: a 1536 x 1536 px canvas is ~9 MB. Least-recently-used entries
// go first; one still on screen stays alive through its Konva Image regardless,
// and is simply rebuilt if asked for again.
const cache = new Map();
const CACHE_BUDGET_BYTES = 320 * 1024 * 1024;
let cacheBytes = 0;

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
  // Every bitmap carries theme colours: the selected border, the triangle outline, and the
  // edge round each strip (light on a dark theme where the wood would otherwise vanish).
  const themed = themeRasterKey();
  return `${patternId}:${cellWidth}:${gridStripWidth}:${patternStripWidth}:${paramsKey(patternParams)}:${drawBoundary ? 'b' : ''}:${selected ? 's' : ''}:${color}:${themed}`;
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
export function getPatternImage(cacheKey, pattern, sizePx, oversample = 3, drawBoundary = false, selected = false, strokeRefPx = 0) {
  const key = `${cacheKey}:${sizePx}:${oversample}`;
  let entry = cache.get(key);
  if (entry) {
    cache.delete(key); // re-insert: most recently used goes last
    cache.set(key, entry);
    return entry;
  }
  entry = renderPatternToCanvas(pattern, sizePx, oversample, drawBoundary, selected, strokeRefPx);
  cache.set(key, entry);
  cacheBytes += entry.canvas.width * entry.canvas.height * 4;
  for (const [oldKey, old] of cache) {
    if (cacheBytes <= CACHE_BUDGET_BYTES || cache.size <= 1) break;
    if (old === entry) continue;
    cache.delete(oldKey);
    cacheBytes -= old.canvas.width * old.canvas.height * 4;
  }
  return entry;
}

// Panel cell resolutions. Cells are rasterized at 128 px (x3 oversample = 384 px
// on the canvas) by default; zoomed in far enough that a cell is drawn bigger
// than that, GridLayer asks for the next size up once the zoom settles
// (cellRasterSizeFor) so the pattern stays crisp. Each size is its own cache
// entry (the size is part of the key), so zooming back out is instant.
export const CELL_CACHE_SIZE_PX = 128;
export const CELL_RASTER_SIZES = [128, 256, 512];
const CELL_OVERSAMPLE = 3;
// The pattern fills 88% of its canvas (renderPatternToCanvas's 6% margins).
const CONTENT_FRACTION = 0.88;

// The smallest cell raster size that still has at least one canvas pixel per
// screen pixel when a cell is `cellScreenPx` wide on screen (CSS px x device
// pixel ratio) — or the largest, if even that isn't enough.
export function cellRasterSizeFor(cellScreenPx) {
  const needPx = cellScreenPx / CONTENT_FRACTION;
  for (const size of CELL_RASTER_SIZES) if (size * CELL_OVERSAMPLE >= needPx) return size;
  return CELL_RASTER_SIZES[CELL_RASTER_SIZES.length - 1];
}

// The size the panel is currently drawing its cells at. GridLayer publishes it
// whenever it changes; the grid-dimension commit reads it so the images it
// prepares ahead of a change are at the size the panel will actually ask for.
let currentCellRasterSizePx = CELL_CACHE_SIZE_PX;
export const getCellRasterSizePx = () => currentCellRasterSizePx;
export const setCellRasterSizePx = (sizePx) => { currentCellRasterSizePx = sizePx; };

// The panel cell's cached image for `pattern` at the given dimensions — THE
// one place that decides a panel cell's cache key and render settings.
// CachedPatternImage (what the panel draws) and the grid-dimension commit
// (store/gridDimensionsCommit.js, which rasterizes the new dimensions' images
// ahead of applying them) both call it, so the image that's prepared is, by
// construction, the exact cache entry the panel then asks for.
//
// drawBoundary is false, explicitly — the grid draws its own real-width cell
// boundaries (GridLayer.jsx), so baking a triangle outline into every cell's
// image would double up. Contrast PatternIcon.jsx, which has no such
// surrounding context and passes true.
export function getPanelCellImage(pattern, { cellWidth, gridStripWidth, patternStripWidth, selected = false, sizePx = currentCellRasterSizePx }) {
  // Every distinct color in use, not just stripProperties[0] — see
  // PatternIcon.jsx's identical comment: a per-strip wood/finish override
  // adds stripProperties entries beyond index 0.
  const color = pattern.stripProperties?.map(sp => sp.color).join(',');
  const cacheKey = buildPatternCacheKey(pattern.id, cellWidth, gridStripWidth, patternStripWidth, pattern.patternParams, false, selected, color);
  return getPatternImage(cacheKey, pattern, sizePx, CELL_OVERSAMPLE, false, selected, CELL_CACHE_SIZE_PX * CELL_OVERSAMPLE);
}

// Exposed for the rare case a caller explicitly needs to force a redraw
// (not currently used — cache keys already change naturally when their
// inputs do) rather than for routine invalidation.
export function clearPatternImageCache() {
  cache.clear();
  cacheBytes = 0;
}
