// Writes a theme's UI tokens onto <html> as CSS variables (and Bootstrap's own), so the
// whole application chrome follows it. The canvas colours do not go through here — the
// Konva layers read them from the theme object (see theme/themeRuntime.js).

const enc = (hex) => hex.replace('#', '%23');

// Bootstrap draws the select arrow and the checkbox tick as images in fixed colours;
// regenerate them from the theme so they show on dark panels and on a light accent.
const chevron = (colour) =>
  `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='${enc(colour)}' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e")`;
const tick = (colour) =>
  `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3e%3cpath fill='none' stroke='${enc(colour)}' stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='m6 10 3 3 6-6'/%3e%3c/svg%3e")`;

const rgbTriplet = (hex) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(', ');
};

export function themeVariables(theme) {
  const u = theme.ui;
  return {
    '--kumiko-bg': u.bg,
    '--kumiko-panel': u.panel,
    '--kumiko-surface': u.surface,
    '--kumiko-border': u.border,
    '--kumiko-border-strong': u.borderStrong,
    '--kumiko-text': u.text,
    '--kumiko-muted': u.muted,
    '--kumiko-accent': u.accent,
    '--kumiko-accent-border': u.accentBorder,
    '--kumiko-on-accent': u.onAccent,
    '--kumiko-hover-bg': u.hover,
    '--kumiko-tip-bg': u.tipBg,
    '--kumiko-tip-fg': u.tipFg,
    '--kumiko-canvas': theme.canvas.bg,
    '--kumiko-chevron-img': chevron(u.text),
    '--kumiko-check-img': tick(u.onAccent),
    // Bootstrap 5.3's own variables, for the parts of it that read them.
    '--bs-body-bg': u.bg,
    '--bs-body-color': u.text,
    '--bs-body-color-rgb': rgbTriplet(u.text),
    '--bs-emphasis-color': u.text,
    '--bs-secondary-color': u.muted,
    '--bs-border-color': u.border,
    '--bs-secondary-bg': u.hover,
    '--bs-tertiary-bg': u.hover,
    '--bs-link-color': u.accent,
  };
}

export function applyThemeToDocument(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const [name, value] of Object.entries(themeVariables(theme))) root.style.setProperty(name, value);
  root.style.colorScheme = theme.mode; // native scrollbars, date pickers, select lists
  root.setAttribute('data-bs-theme', theme.mode); // Bootstrap 5.3's dark mode, where present
  root.setAttribute('data-kumiko-theme', theme.id);
  root.setAttribute('data-kumiko-mode', theme.mode);
}
