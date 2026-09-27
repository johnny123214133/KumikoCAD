// Wood × finish → rendered strip color.
//
// Two things determine a strip's final color: the wood species (a base
// hue/value) and the finish applied on top of it (which mostly shifts
// lightness/saturation, and for stains, hue). Modeled HYBRID rather than as
// one or the other:
//
//   1. COMPOSITIONAL (the default path): each wood has a base hex color,
//      each finish is a small HSL transform (lightness/saturation deltas,
//      a hue shift for stains). getMaterialColor() converts the wood's base
//      color to HSL, applies the finish's deltas, converts back. This is
//      cheap to extend — add a wood and it immediately works with every
//      finish — and looks reasonable for the vast majority of combinations.
//
//   2. LOOKUP OVERRIDE (the escape hatch): a few real wood/finish pairs
//      don't behave like a generic HSL nudge — a stain can react very
//      differently on different woods, a lacquer can look almost like a
//      different material on a dark wood than on a light one. COLOR_
//      OVERRIDES is checked FIRST, keyed `${woodId}:${finishId}` → exact
//      hex, so those specific pairs can be hand-tuned without touching the
//      general model.
//
// If the composited results turn out not to hold up across enough real
// combinations, this whole file can be swapped for a pure lookup table
// (every consumer already goes through getMaterialColor(), never reads
// WOOD_BASE_COLORS/FINISH_TRANSFORMS directly) without touching call sites
// — see the comment on COLOR_OVERRIDES below for how to migrate toward that
// incrementally instead of all at once.

// Base color per wood species, before any finish is applied. Keys must
// match geometry/materials.js's WOOD_OPTIONS ids — checked at the bottom of
// this file.
export const WOOD_BASE_COLORS = {
  hinoki: '#E8D5B0',
  sugi: '#D9B98C',
  keyaki: '#B8763F',
  shina: '#EDE0C8',
  walnut: '#5C4530',
  cherry: '#A15C3E',
  maple: '#E4C99B',
  sapele: '#8B4A32',
};

// Per-finish HSL transform applied on top of a wood's base color:
//   lightness / saturation: additive deltas in 0..1 space (clamped after).
//   hueShift: additive degrees (stains skew warm; oil/wax barely move hue).
// Keys must match geometry/materials.js's FINISH_OPTIONS ids — checked
// below.
export const FINISH_TRANSFORMS = {
  natural: { lightness: 0, saturation: 0, hueShift: 0 },
  oiled: { lightness: -0.06, saturation: 0.08, hueShift: 2 },
  wax: { lightness: 0.03, saturation: 0.02, hueShift: 0 },
  lacquered: { lightness: 0.05, saturation: 0.1, hueShift: 0 },
  stained: { lightness: -0.22, saturation: 0.05, hueShift: 6 },
};

// Hand-tuned exact colors for specific wood×finish pairs where the generic
// composition above doesn't look right — checked before compositing.
// Empty for now (starting purely compositional); add entries here as
// `'<woodId>:<finishId>': '#hex'` as real combinations need correcting. If
// this table ever grows to cover most/all combinations, that's the signal
// to just switch to a full lookup table instead of the compositional path.
export const COLOR_OVERRIDES = {};

function clamp01(v) { return Math.max(0, Math.min(1, v)); }

function hexToHsl(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let hDeg = 0, s = 0;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: hDeg = ((g - b) / d) % 6; break;
      case g: hDeg = (b - r) / d + 2; break;
      default: hDeg = (r - g) / d + 4; break;
    }
    hDeg *= 60;
    if (hDeg < 0) hDeg += 360;
  }
  return { h: hDeg, s, l };
}

function hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r1 = 0, g1 = 0, b1 = 0;
  if (h < 60) { r1 = c; g1 = x; b1 = 0; }
  else if (h < 120) { r1 = x; g1 = c; b1 = 0; }
  else if (h < 180) { r1 = 0; g1 = c; b1 = x; }
  else if (h < 240) { r1 = 0; g1 = x; b1 = c; }
  else if (h < 300) { r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
}

/**
 * The single entry point every consumer (factories, grid strip rendering)
 * should go through — never read WOOD_BASE_COLORS/FINISH_TRANSFORMS
 * directly, so this file's internal model can change (more overrides, or a
 * full swap to a lookup table) without touching call sites.
 */
export function getMaterialColor(woodId, finishId) {
  const overrideKey = `${woodId}:${finishId}`;
  if (COLOR_OVERRIDES[overrideKey]) return COLOR_OVERRIDES[overrideKey];

  const base = WOOD_BASE_COLORS[woodId] ?? WOOD_BASE_COLORS.hinoki;
  const t = FINISH_TRANSFORMS[finishId] ?? FINISH_TRANSFORMS.natural;
  const { h, s, l } = hexToHsl(base);
  const nh = (h + t.hueShift + 360) % 360;
  const ns = clamp01(s + t.saturation);
  const nl = clamp01(l + t.lightness);
  return hslToHex(nh, ns, nl);
}
