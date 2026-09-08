// Pure pan/zoom math for the Konva stage — no Konva imports here, so this is
// unit-testable on its own and mirrors what the old SceneManager.js (Three.js
// OrthographicCamera version) did, adapted for a canvas/Konva Y-down stage.
//
// IMPORTANT — the Y-flip: pattern data (triangle vertices, strip endpoints)
// uses a Y-up math convention (apex C has the largest y). The old Three.js
// camera was itself Y-up, so pattern coordinates were used completely as-is.
// Canvas/Konva is Y-down. To render identically (not upside down), every
// world point's y is negated when building shape points, AND — because
// strip bodies are placed via a Konva rotation prop rather than pre-rotated
// point math — the strip's rotation angle must ALSO be negated, since
// flipping Y also flips the sense of a positive rotation. See PatternLayer.jsx.

export const ZOOM_IN_FACTOR = 1.1;
export const ZOOM_OUT_FACTOR = 0.9;
export const MIN_ZOOM = 0.01;
export const MAX_ZOOM = 100;
export const ZOOM_TO_FIT_FILL = 0.8; // pattern fills 80% of viewport, matches old SceneManager.zoomToFit

export function clampZoom(scale) {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale));
}

/**
 * bbox is in WORLD (pattern, Y-up) space, e.g. from PatternLayer.getBoundingBox().
 * viewportW/H are the stage's current pixel dimensions.
 * insetLeft/insetRight (px, default 0): the stage is always full-bleed now
 * (panels overlay it rather than resizing it — see custom.css), so without
 * this, "zoom to fit" would size content to the FULL canvas even while an
 * open panel visually covers part of it, leaving the fitted content partly
 * hidden underneath. Passing the current open panels' widths here fits the
 * content into the actually-visible gap between them instead.
 * Returns the Konva stage {scale, x, y} to center and fit that bbox.
 */
export function computeZoomToFit(bbox, viewportW, viewportH, insetLeft = 0, insetRight = 0) {
  const cx = (bbox.minX + bbox.maxX) / 2;
  const cyWorld = (bbox.minY + bbox.maxY) / 2;
  const cyScreen = -cyWorld; // Y-flip
  const pw = bbox.maxX - bbox.minX || 1;
  const ph = bbox.maxY - bbox.minY || 1;
  const visibleW = Math.max(1, viewportW - insetLeft - insetRight);
  const scale = clampZoom(Math.min((visibleW * ZOOM_TO_FIT_FILL) / pw, (viewportH * ZOOM_TO_FIT_FILL) / ph));
  return {
    scale,
    x: insetLeft + visibleW / 2 - cx * scale,
    y: viewportH / 2 - cyScreen * scale,
  };
}

/**
 * Standard "zoom relative to pointer" recipe. oldScale/stagePos describe the
 * stage's current (uncontrolled, Konva-owned) transform; pointer is the
 * pointer position in stage-container pixels; deltaY is the wheel event's
 * deltaY (sign only is used, matching the old fixed-factor-per-tick behavior
 * rather than magnitude-proportional zoom).
 */
export function computeWheelZoom({ oldScale, stageX, stageY, pointer, deltaY }) {
  const worldPointerX = (pointer.x - stageX) / oldScale;
  const worldPointerY = (pointer.y - stageY) / oldScale;
  const factor = deltaY > 0 ? ZOOM_OUT_FACTOR : ZOOM_IN_FACTOR;
  const newScale = clampZoom(oldScale * factor);
  return {
    scale: newScale,
    x: pointer.x - worldPointerX * newScale,
    y: pointer.y - worldPointerY * newScale,
  };
}
