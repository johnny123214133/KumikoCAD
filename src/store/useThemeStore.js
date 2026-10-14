import { create } from 'zustand';
import { THEMES, DEFAULT_THEME_ID, themeById } from '../theme/themes.js';
import { setCurrentTheme } from '../theme/themeRuntime.js';
import { applyThemeToDocument } from '../theme/applyTheme.js';

// Which colour theme is in use. Persisted, so it survives reloads. The initial theme is
// applied as this module loads — before the first render — so the page never flashes the
// wrong colours.
const STORAGE_KEY = 'kumiko_theme';

function loadThemeId() {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (THEMES.some((t) => t.id === v)) return v;
  } catch { /* unavailable or corrupt — use the default */ }
  return DEFAULT_THEME_ID;
}

const initial = themeById(loadThemeId());
setCurrentTheme(initial);
applyThemeToDocument(initial);

const useThemeStore = create((set, get) => ({
  themeId: initial.id,
  setTheme: (id) => {
    const theme = THEMES.find((t) => t.id === id);
    if (!theme || theme.id === get().themeId) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(theme.id)); } catch { /* ignore */ }
    // Plain code (the offscreen renderer) and the document first, then subscribers re-render.
    setCurrentTheme(theme);
    applyThemeToDocument(theme);
    set({ themeId: theme.id });
  },
}));

export default useThemeStore;

// The active theme object; re-renders the caller when the theme changes.
export function useTheme() {
  return themeById(useThemeStore((s) => s.themeId));
}
