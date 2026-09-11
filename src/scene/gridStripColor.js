// Shared grid-strip color — used by both the panel's real grid strips
// (GridLayer.jsx) and the pattern editor's single-cell border reference
// (GridBorderStrip.jsx), kept as one literal value so the two stay in sync
// by construction rather than by remembering to update both by hand. This
// will become a real parameter (tied to the grid's chosen material/color,
// see useGridStore's material/finish fields) later; for now it's just this
// shared constant.
export const GRID_STRIP_COLOR = '#8a7860';
export const GRID_STRIP_COLOR_RGB = '138, 120, 96'; // same color, components separated for rgba() use
