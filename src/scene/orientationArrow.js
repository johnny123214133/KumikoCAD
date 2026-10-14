// The "view orientation" overlay's arrow: a thin arrow whose tail ends at the
// centre of a cell and which points "up" in the pattern's own frame — toward the
// apex, perpendicular to its A-B edge — with a barb on each side of the tip. It
// is drawn inside the same transform a pattern is placed with, so it turns and
// mirrors with the pattern: on the panel it shows where each cell's canonical
// "up" has ended up, which is what you need to see when working out how
// patterns rotate between orientations or reflect between corner types.
//
// Pure geometry, shared by the pattern editor and the panel (through
// components/shared/OrientationArrow.jsx). Only the editors' canvases show it —
// the pattern-library icons deliberately don't.
// The arrow's colour belongs to the theme (theme/themes.js: canvas.arrow, canvas.arrowHalo).

// Proportions, as fractions of the cell's side length.
const LENGTH = 0.22;               // tail end to tip
const BARB = { x: 0.05, y: 0.07 }; // tip to each barb end: back along the shaft, out to the side
const STROKE = 0.009;

// Polylines relative to the tail end (the cell centre), in the canonical frame
// as drawn on screen (y down, so "up" is -y): the shaft (tail -> tip) and the
// head (barb end -> tip -> other barb end).
export function orientationArrowShape(sideLength) {
  const s = sideLength;
  const tipY = -LENGTH * s;
  return {
    shaft: [0, 0, 0, tipY],
    head: [-BARB.x * s, tipY + BARB.y * s, 0, tipY, BARB.x * s, tipY + BARB.y * s],
    strokeWidth: STROKE * s,
  };
}
