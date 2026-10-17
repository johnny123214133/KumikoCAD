// The Fill / paint tool's cursor over a cell or strip: a paint bucket tipped to pour,
// the paint it pours in the brush's colour. Drawn as an SVG data URI (the browser
// scales nothing, so it is drawn at 32 x 32); the hotspot is where the stream lands, at
// the bottom left. A pale outline under the dark one keeps it readable on any canvas.
// Falls back to the crosshair where cursor images aren't supported.
const cache = new Map();

export function fillCursor(color = '#c8a064') {
  let css = cache.get(color);
  if (css) return css;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">` +
    // the stream and the puddle where it lands
    `<path d="M10 14 C10 19 7 22 7 26" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/>` +
    `<path d="M10 14 C10 19 7 22 7 26" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>` +
    `<ellipse cx="7" cy="28" rx="4" ry="1.8" fill="${color}" stroke="#222" stroke-width="1"/>` +
    // the bucket, tipped about 40 degrees clockwise with its lip at the lower left
    `<g transform="translate(-2 3) rotate(-40 20 12)">` +
    `<path d="M11 6 H29 L26.5 22 H13.5 Z" fill="#fff" stroke="#fff" stroke-width="3.5" stroke-linejoin="round"/>` +
    `<path d="M11 6 H29 L26.5 22 H13.5 Z" fill="#9aa3ad" stroke="#222" stroke-width="1.3" stroke-linejoin="round"/>` +
    `<ellipse cx="20" cy="6" rx="9" ry="2.2" fill="${color}" stroke="#222" stroke-width="1.3"/>` +
    `<path d="M12 9 C6 6 6 -1 14 0" fill="none" stroke="#222" stroke-width="1.3"/>` +
    `</g></svg>`;
  css = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") 7 28, crosshair`;
  cache.set(color, css);
  return css;
}
