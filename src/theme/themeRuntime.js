import { themeById, DEFAULT_THEME_ID, mix } from './themes.js';
import { contrastRatio } from '../geometry/color.js';

// The active theme for plain (non-React) code: the offscreen pattern renderer, the cache
// keys. React components use useTheme() (store/useThemeStore.js), which re-renders them
// when the theme changes; this is kept in step by the store's setTheme.
let current = themeById(DEFAULT_THEME_ID);

export const getTheme = () => current;
export const setCurrentTheme = (theme) => { current = theme; };

// Part of the cache key of every cached pattern bitmap that has theme colours baked in
// (selected border, triangle outline, strip edges), so changing theme asks for new ones
// instead of serving the old theme's — and switching back finds the old ones again.
export const themeRasterKey = () => current.id;

// The thin edge drawn round a strip. Normally a touch darker than the strip itself
// (`usual`, from the caller). On a dark theme that is exactly wrong for the dark woods
// and finishes: a walnut or stained strip is as dark as the canvas, and a darker edge
// leaves it invisible. So where a strip would sit too close to the canvas, its edge is a
// light tint of its own colour instead.
const MIN_STRIP_CONTRAST = 2.2;
export function stripEdgeColor(fill, usual) {
  if (current.mode !== 'dark') return usual;
  if (contrastRatio(fill, current.canvas.bg) >= MIN_STRIP_CONTRAST) return usual;
  return mix(fill, '#F8F1E3', 0.6);
}

// The colour a selected strip / cell is outlined in: the theme's own, or `fallback` (the
// strip colour darkened, from the caller) when the theme has none.
export const selectionColor = (fallback) => current.canvas.selection ?? fallback;
