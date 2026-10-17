// The colour themes. Each one is a full set of tokens, in two groups:
//
//   ui      the application chrome — toolbar, side panels, inputs, buttons. Written to
//           CSS variables on <html> (theme/applyTheme.js); styles/custom.css and
//           Bootstrap's own variables read them.
//   canvas  everything drawn in the viewport. Read by the Konva layers through useTheme()
//           (store/useThemeStore.js) or, from plain code, getTheme() (theme/themeRuntime.js).
//
// Everything a theme controls on the canvas:
//   bg             the canvas background
//   boundary       the placeholder panel outline
//   patternBoundary the pattern editor's triangle outline (also baked into library icons)
//   centerline     strip centrelines
//   scale          the Show Scale rulers
//   arrow, arrowHalo  the View orientation arrow, and (optional) an outline behind it so it
//                  reads against both wood and canvas
//   selection      colour of a selected cell's / strip's border. null = keep the default:
//                  the strip colour darkened, a brown for wood. The dark themes use cream.
//   highlight, highlightFill  the Validation tool's cue on matching cells
//   snap           the Snap to Gridpoint circles
//   marquee        the Multi-select rectangle
//   joints         joint-dot colour for each notch type
//   tipBg, tipFg   the joint-dot tooltip
//   iconBg         behind the library's pattern thumbnails
//
// Wood and finish colours are the user's choice and are not part of a theme.

// --- colour helpers ---------------------------------------------------------
const parse = (hex) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const toHex = (rgb) => '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
// t = 0 gives a, t = 1 gives b.
export const mix = (a, b, t) => {
  const A = parse(a), B = parse(b);
  return toHex(A.map((v, i) => v + (B[i] - v) * t));
};
export const rgba = (hex, alpha) => {
  const [r, g, b] = parse(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Joint dots: ten notch types that must stay tellable apart, so each keeps its own hue —
// but every theme re-tunes how those hues are rendered (how saturated, how light, and a
// small turn of the whole wheel) to sit with its palette: earthy dyes on Washi and
// Hinoki, crisp inks on Graphite and Blueprint Paper, soft pastels on Sumi Cream, neon-lit
// tones on Midnight Blueprint.
const hslToHex = (h, s, l) => {
  h = ((h % 360) + 360) % 360;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return toHex([f(0) * 255, f(8) * 255, f(4) * 255]);
};
// [hue, saturation offset, lightness offset] per notch type.
const NOTCH_BASE = {
  halfLap: [214, 0, 0], triLap: [256, -0.05, -0.07], dado: [2, 0, -0.05], star: [58, 0.08, 0.07],
  miter: [136, -0.1, 0], taper: [274, -0.05, 0.05], butt: [22, 0.05, 0.04], vNotch: [326, 0, 0],
  asymMiter: [186, 0, 0.02],
};
export function jointPalette({ s, l, shift = 0, grey, dark = false }) {
  const out = {};
  for (const [type, [h, ds, dl]] of Object.entries(NOTCH_BASE)) {
    // Yellow is the one hue that is light at any saturation: on a light canvas it has to be
    // pulled down hard (to ochre) to show at all.
    const dl2 = type === 'star' && !dark ? -0.08 : (dark && type === 'triLap' ? -0.035 : dark && type === 'dado' ? dl * 0.2 : dl);
    out[type] = hslToHex(h + shift, Math.max(0, Math.min(1, s + ds)), Math.max(0, Math.min(1, l + dl2)));
  }
  out.custom = grey;
  return out;
}

export const DARK_SELECTION = '#F8F1E3';

function build({ id, name, mode, blurb, bg, panel, border, text, muted, accent, onAccent, highlight, canvas, scale, arrow, snap, joints }) {
  const dark = mode === 'dark';
  return {
    id, name, mode, blurb,
    ui: {
      bg, panel, border, text, muted, accent, onAccent,
      surface: dark ? mix(panel, '#ffffff', 0.05) : mix(panel, '#ffffff', 0.6),
      hover: mix(panel, text, 0.08),
      borderStrong: mix(border, text, 0.3),
      accentBorder: mix(accent, dark ? '#ffffff' : '#000000', 0.15),
      tipBg: text,
      tipFg: panel,
    },
    canvas: {
      bg: canvas,
      boundary: mix(canvas, text, 0.4),
      patternBoundary: mix(canvas, text, 0.8),
      centerline: mix(canvas, text, 0.45),
      scale,
      arrow,
      arrowHalo: dark ? canvas : null,
      selection: dark ? DARK_SELECTION : null,
      highlight,
      highlightFill: rgba(highlight, dark ? 0.2 : 0.16),
      snap,
      snapFill: rgba(snap, 0.22),
      snapFillHover: rgba(snap, 0.55),
      marquee: rgba(accent, 0.6),
      joints: jointPalette({ ...joints, dark }),
      tipBg: text,
      tipFg: panel,
      iconBg: canvas,
    },
  };
}

export const THEMES = [
  build({
    id: 'washi', name: 'Washi', mode: 'light',
    blurb: 'Warm paper with an indigo accent. Closest to the original off-white canvas.',
    bg: '#EFEBE2', panel: '#FAF8F3', border: '#D8D1C2', text: '#2A2621', muted: '#6B6457',
    accent: '#2F5D8A', onAccent: '#FFFFFF', highlight: '#1F8A7A', canvas: '#FBFAF6', scale: '#4A443A',
    arrow: '#33415C', snap: '#B8472F',
    joints: { s: 0.55, l: 0.40, shift: 0, grey: '#6F6A60' },
  }),
  build({
    id: 'hinoki', name: 'Hinoki', mode: 'light',
    blurb: 'Pale-wood cream with a cedar accent. The warmest light theme.',
    bg: '#EEE5D3', panel: '#F8F1E3', border: '#D9CBB0', text: '#33281C', muted: '#75654E',
    accent: '#A24E2A', onAccent: '#FFFFFF', highlight: '#3E7C59', canvas: '#FFFAF0', scale: '#4A3B2A',
    arrow: '#4E3320', snap: '#8A3B1E',
    joints: { s: 0.55, l: 0.38, shift: 6, grey: '#74644E' },
  }),
  build({
    id: 'blueprint-paper', name: 'Blueprint Paper', mode: 'light',
    blurb: 'Cool and crisp, the familiar CAD feel. The orange highlight stands off the blue accent.',
    bg: '#E9EEF4', panel: '#FFFFFF', border: '#CBD5E1', text: '#0F1B2D', muted: '#52627A',
    accent: '#1D5FD8', onAccent: '#FFFFFF', highlight: '#C2650A', canvas: '#F8FAFC', scale: '#334155',
    arrow: '#173A7A', snap: '#1D5FD8',
    joints: { s: 0.80, l: 0.42, shift: -4, grey: '#5A6B85' },
  }),
  build({
    id: 'graphite', name: 'Graphite', mode: 'light',
    blurb: 'Neutral grey and white, the highest contrast. The vermilion accent stays clear of wood tones.',
    bg: '#ECECEC', panel: '#FFFFFF', border: '#D0D0D0', text: '#151515', muted: '#5E5E5E',
    accent: '#C8401E', onAccent: '#FFFFFF', highlight: '#2B7A78', canvas: '#FFFFFF', scale: '#3A3A3A',
    arrow: '#222222', snap: '#C8401E',
    joints: { s: 0.85, l: 0.42, shift: 0, grey: '#6B6B6B' },
  }),
  build({
    id: 'sumi-ink', name: 'Sumi Ink', mode: 'dark',
    blurb: 'Warm near-black with an amber accent.',
    bg: '#26231F', panel: '#312D28', border: '#4A453D', text: '#E0D9CB', muted: '#AEA495',
    accent: '#E3A347', onAccent: '#1A1815', highlight: '#5FB3A5', canvas: '#494439', scale: '#D9D0BE',
    arrow: '#F2E3C0', snap: '#E3A347',
    joints: { s: 0.60, l: 0.62, shift: 6, grey: '#B5AC9B' },
  }),
  build({
    id: 'sumi-cream', name: 'Sumi Cream', mode: 'dark',
    blurb: 'Sumi Ink’s darks with a cream accent, the Hinoki panel colour. Sage marks matching cells.',
    bg: '#26231F', panel: '#312D28', border: '#4A453D', text: '#E0D9CB', muted: '#AEA495',
    accent: '#F8F1E3', onAccent: '#1A1815', highlight: '#8DBE8F', canvas: '#494439', scale: '#D9D0BE',
    arrow: '#F8F1E3', snap: '#F8F1E3',
    joints: { s: 0.62, l: 0.74, shift: 8, grey: '#C9C1B1' },
  }),
  build({
    id: 'urushi', name: 'Urushi', mode: 'dark',
    blurb: 'Lacquer black with a vermilion accent and a cool cyan highlight.',
    bg: '#281C1D', panel: '#342627', border: '#503C3D', text: '#EBDFDB', muted: '#BBA49E',
    accent: '#EF6A4F', onAccent: '#1A1213', highlight: '#6FB6C9', canvas: '#4D3736', scale: '#E0CFC8',
    arrow: '#F7D8CD', snap: '#EF6A4F',
    joints: { s: 0.72, l: 0.66, shift: 2, grey: '#C4A9A2' },
  }),
  build({
    id: 'midnight-blueprint', name: 'Midnight Blueprint', mode: 'dark',
    blurb: 'Navy drafting table with a bright blue accent and an amber highlight.',
    bg: '#18253A', panel: '#20304A', border: '#364C6E', text: '#DCE5F0', muted: '#98ADC8',
    accent: '#4EA1FF', onAccent: '#0D1520', highlight: '#F2B35A', canvas: '#314560', scale: '#C2D1E4',
    arrow: '#BCD8F6', snap: '#4EA1FF',
    joints: { s: 0.88, l: 0.68, shift: -6, grey: '#9DB0C8' },
  }),
  build({
    id: 'forest-charcoal', name: 'Forest Charcoal', mode: 'dark',
    blurb: 'Green-black with a mint accent and a gold highlight. Easy on the eyes for long sessions.',
    bg: '#1C2622', panel: '#26332D', border: '#3D4F47', text: '#DCE7E1', muted: '#98ADA4',
    accent: '#4FC9A2', onAccent: '#0C100F', highlight: '#E6B450', canvas: '#36473F', scale: '#C5D8CF',
    arrow: '#CDEBDD', snap: '#4FC9A2',
    joints: { s: 0.50, l: 0.62, shift: 14, grey: '#A5B8AF' },
  }),
];

export const DEFAULT_THEME_ID = 'washi';
export const themeById = (id) => THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === DEFAULT_THEME_ID);
