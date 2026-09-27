// Grid-strip color — used by both the panel's real grid strips
// (GridLayer.jsx) and the pattern editor's single-cell border reference
// (GridBorderStrip.jsx), kept as one function so the two stay in sync by
// construction rather than by remembering to update both by hand.
//
// Previously a fixed literal ('#8a7860'); now genuinely derived from
// useGridStore's material/finish (the grid/panel right-sidebar's Wood/
// Finish selectors — see GridInspector.jsx) via the same wood×finish color
// model the pattern strips use (geometry/woodFinishColors.js), so the grid's
// own structural strips and a cell's pattern strips both respond to the
// same kind of parameter the same way. Deliberately a plain function of
// (material, finish) rather than reading useGridStore itself — callers
// already need to subscribe to material/finish via the useGridStore hook
// to re-render on change, so they pass the values through rather than this
// module reaching into the store non-reactively behind their back.
//
// Darkened a bit relative to the raw wood/finish color (same darkenHex
// used for a selected strip's border, geometry/color.js) rather than
// returning that color as-is: useGridStore's material/finish and a
// pattern's own stripProperties material/finish are separate settings that
// both happen to default to hinoki/natural, so an as-is color made the
// grid frame and a cell's strips render as the exact same hex by default —
// reported as "the border now matches the strip color instead of the
// brownish we were using" once real material colors replaced the old fixed
// placeholder. Darkening keeps the frame genuinely tied to the chosen wood/
// finish (still updates when either changes) while keeping it visually
// read as a distinct, slightly heavier-toned structural member framing the
// cell, the way the old fixed placeholder did incidentally.
import { getMaterialColor } from '../geometry/woodFinishColors.js';
import { darkenHex } from '../geometry/color.js';

const GRID_STRIP_DARKEN_AMOUNT = 0.3;

function hexToRgbTriplet(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

export function getGridStripColor(material, finish) {
  return darkenHex(getMaterialColor(material, finish), GRID_STRIP_DARKEN_AMOUNT);
}

export function getGridStripColorRgb(material, finish) {
  return hexToRgbTriplet(getGridStripColor(material, finish));
}
