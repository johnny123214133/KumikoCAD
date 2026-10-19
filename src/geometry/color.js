// Small color utility — darkening a strip's own fill color for its
// selection border, rather than using one fixed color across every
// material (strip colors will vary once real wood/finish color mappings
// exist — see the request that prompted this: "we'll revisit it when we
// add the color mappings for all the wood and finish types").
// WCAG relative luminance (0..1) and contrast ratio (1..21) of hex colours.
export function luminance(hex) {
  const h = hex.replace('#', '');
  const f = (i) => { const c = parseInt(h.substring(i, i + 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(0) + 0.7152 * f(2) + 0.0722 * f(4);
}
export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function darkenHex(hex, amount = 0.35) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v) => clamp(v).toString(16).padStart(2, '0');
  return `#${toHex(r * (1 - amount))}${toHex(g * (1 - amount))}${toHex(b * (1 - amount))}`;
}

// The colour moved `amount` of the way toward white: a lighter tone of the same wood.
export function lightenHex(hex, amount = 0.5) {
  const h = hex.replace('#', '');
  const channel = (i) => parseInt(h.substring(i, i + 2), 16);
  const toHex = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${[0, 2, 4].map((i) => toHex(channel(i) + (255 - channel(i)) * amount)).join('')}`;
}
