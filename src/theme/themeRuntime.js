import { themeById, DEFAULT_THEME_ID } from './themes.js';

// The active theme for plain (non-React) code: the offscreen pattern renderer, the cache
// keys. React components use useTheme() (store/useThemeStore.js), which re-renders them
// when the theme changes; this is kept in step by the store's setTheme.
let current = themeById(DEFAULT_THEME_ID);

export const getTheme = () => current;
export const setCurrentTheme = (theme) => { current = theme; };

// Part of the cache key of every cached pattern bitmap that has theme colours baked in
// (its selected border, the triangle outline), so changing theme asks for new ones
// instead of serving the old theme's — and switching back finds the old ones again.
export const themeRasterKey = () => current.id;

// The colour a selected strip / cell is outlined in: the theme's own, or `fallback` (the
// strip colour darkened, from the caller) when the theme has none.
export const selectionColor = (fallback) => current.canvas.selection ?? fallback;
