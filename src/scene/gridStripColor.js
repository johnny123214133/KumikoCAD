// Grid-strip color — used by both the panel's real grid strips
// (GridLayer.jsx) and the pattern editor's single-cell border reference
// (GridBorderStrip.jsx), kept as one function so the two stay in sync by
// construction rather than by remembering to update both by hand.
//
// The grid's colour comes from the same wood × finish model the pattern strips
// use (geometry/woodFinishColors.js's getMaterialColor, driven by useGridStore's
// material/finish — the Wood/Finish selectors in GridInspector.jsx), with NO
// grid-specific adjustment: a grid strip of a given wood and finish is exactly
// the colour a pattern strip of that wood and finish is. (It used to be
// darkened a little to read as distinct from the pattern strips; that meant the
// grid never drew from the shared colour library's actual values.) Deliberately
// a plain function of (material, finish) rather than reading useGridStore
// itself — callers already subscribe to material/finish to re-render on
// change, so they pass the values through.
import { getMaterialColor } from '../geometry/woodFinishColors.js';

function hexToRgbTriplet(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

export function getGridStripColor(material, finish) {
  return getMaterialColor(material, finish);
}

export function getGridStripColorRgb(material, finish) {
  return hexToRgbTriplet(getGridStripColor(material, finish));
}
