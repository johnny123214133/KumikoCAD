// Draws the grid's strips with a border that is always the same width ON SCREEN,
// like the pattern strips' (those are Konva shapes with strokeScaleEnabled off).
//
// The strips are real-width bands, so their border can't be a plain constant-width
// stroke: it is made in two passes — the whole lattice in the edge colour at
// (strip width + edge), then in the fill colour at (strip width - edge) on top —
// which leaves an edge-wide outline along the outside of the whole lattice and
// none across a junction. `edge` is in world units, so it has to follow the zoom;
// this runs inside a Konva Shape's sceneFunc, i.e. at draw time, so it always
// uses the current scale and nothing has to be re-rendered or re-cached when the
// zoom changes. Everything goes through a handful of paths, not hundreds of nodes.

export const GRID_EDGE_SCREEN_PX = 1;

// The border's width in world units for a view at `scale` (screen px per unit) —
// never more than a third of the strip, which would leave nothing of its fill.
export function gridEdgeWidth(scale, stripWidth) {
  const px = scale > 0 && Number.isFinite(scale) ? GRID_EDGE_SCREEN_PX / scale : 0;
  return Math.min(px, stripWidth / 3);
}

// ctx: a CanvasRenderingContext2D already in world units.
//   boundary: flat [x, y, x, y, ...] closed polygon (or empty)
//   segments: [[x1, y1, x2, y2], ...] open interior lines
//   joints:   [{ x, y }] where 2+ segments meet (round patches fill the gaps)
export function drawGridStrips(ctx, { scale, stripWidth, fillColor, edgeColor, boundary = [], segments = [], joints = [] }) {
  if (!(stripWidth > 0)) return;
  const edge = gridEdgeWidth(scale, stripWidth);
  ctx.save();
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  for (const [color, width] of [[edgeColor, stripWidth + edge], [fillColor, Math.max(0, stripWidth - edge)]]) {
    if (!(width > 0)) continue;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    if (boundary.length >= 4) {
      ctx.moveTo(boundary[0], boundary[1]);
      for (let i = 2; i < boundary.length; i += 2) ctx.lineTo(boundary[i], boundary[i + 1]);
      ctx.closePath();
    }
    for (const [x1, y1, x2, y2] of segments) { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }
    ctx.stroke();
    if (joints.length) {
      const r = width / 2;
      ctx.beginPath();
      for (const p of joints) { ctx.moveTo(p.x + r, p.y); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); }
      ctx.fill();
    }
  }
  ctx.restore();
}

// The scale to hand drawGridStrips from inside a Konva sceneFunc.
export const shapeScale = (shape) => Math.abs(shape.getAbsoluteScale?.().x) || 1;
