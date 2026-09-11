// Pure, framework-agnostic computation of "what to draw" for a pattern's
// strip bodies — extracted from PatternStrips.jsx's StripBody so the exact
// same geometry feeds both the live Konva rendering (pattern editor) and
// the offscreen-canvas cache renderer below (pattern icons, panel cells).
// One source of truth for "how a strip's cut shape becomes a placed
// polygon" — see PatternStrips.jsx's StripBody for the Y-flip/rotation-sign
// reasoning this carries over unchanged.
import { buildStripLocalPoints } from './stripShape.js';

export function computeStripRenderData(pattern) {
  const spMap = Object.fromEntries(pattern.stripProperties.map(sp => [sp.id, sp]));
  return pattern.strips.map((strip) => {
    const pt = pattern.pieceTemplates.find(p => p.stripId === strip.id);
    const sp = pt ? spMap[pt.stripPropertyId] : pattern.stripProperties[0];
    const width = sp?.width ?? 6;
    const color = sp?.color ?? '#e8d5b0';

    const dx = strip.end.x - strip.start.x;
    const dy = strip.end.y - strip.start.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    const endCuts = strip.cuts.filter(c => c.role === 'end');
    const unitDx = Math.cos(strip.orientation);
    const unitDy = Math.sin(strip.orientation);

    const localised = endCuts
      .map(c => ({
        angle: c.angle,
        jointId: c.jointId,
        localX: (c.position.x - strip.start.x) * unitDx + (c.position.y - strip.start.y) * unitDy,
      }))
      .sort((a, b) => a.localX - b.localX);

    const startAngle = localised[0]?.angle ?? 90;
    const endAngle = localised[localised.length - 1]?.angle ?? 90;
    const startNotchType = pattern.joints.find(j => j.id === localised[0]?.jointId)?.notchType;
    const endNotchType = pattern.joints.find(j => j.id === localised[localised.length - 1]?.jointId)?.notchType;

    const points = buildStripLocalPoints(length, width / 2, startAngle, endAngle, startNotchType, endNotchType);
    // See PatternStrips.jsx's StripBody comment — flipping y here AND
    // negating rotation/position below are both required together.
    const flippedPoints = points.map((v, i) => (i % 2 === 1 ? -v : v));

    return {
      stripId: strip.id,
      points: flippedPoints,
      x: strip.start.x,
      y: -strip.start.y,
      rotationDeg: -(strip.orientation * 180) / Math.PI,
      color,
    };
  });
}

/**
 * Renders a pattern's strip bodies to an offscreen canvas, oversampled for
 * crisp thin lines/sharp joints under raster upscaling (see the panel-level
 * brainstorm: raster caching trades vector precision for shape-count/redraw
 * cost, and oversampling is how that trade is kept from looking blurry).
 * Returns the canvas element directly — usable as a Konva.Image `image`
 * source as-is, no conversion needed.
 *
 * `drawBoundary` (default false): also strokes the triangle cell outline on
 * top of the strips, matching PatternLayer.jsx's live boundary line. Off by
 * default for the panel's per-cell use (CachedPatternImage.jsx) — the grid
 * already draws its own real-width cell boundaries there, so baking another
 * one into every cell's image would double up. On for the sidebar thumbnail
 * (PatternIcon.jsx), where nothing else supplies that context and the
 * strips would otherwise look like they're just floating in space.
 *
 * Deliberately reuses computeStripRenderData's output AS-IS (same points/x/
 * y/rotationDeg values fed to the live Konva <Line> elsewhere) rather than
 * re-deriving a differently-flipped version for canvas — the outer
 * fit-to-canvas transform below is a plain uniform positive scale+translate,
 * which doesn't interact with flip/rotation sign at all, so composing it
 * with already-correct Konva-convention data can't introduce a new sign bug
 * the way re-deriving a second flip convention could.
 */
export function renderPatternToCanvas(pattern, sizePx, oversample = 3, drawBoundary = false) {
  const { A, B, C } = pattern.vertices;
  const flip = (p) => ({ x: p.x, y: -p.y }); // same convention as scene/viewportMath.js
  const [fA, fB, fC] = [A, B, C].map(flip);
  const minX = Math.min(fA.x, fB.x, fC.x), maxX = Math.max(fA.x, fB.x, fC.x);
  const minY = Math.min(fA.y, fB.y, fC.y), maxY = Math.max(fA.y, fB.y, fC.y);
  const spanX = maxX - minX || 1, spanY = maxY - minY || 1;

  const px = Math.max(1, Math.round(sizePx * oversample));
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d');

  const margin = px * 0.06;
  const scale = Math.min((px - 2 * margin) / spanX, (px - 2 * margin) / spanY);
  const offsetX = (px - spanX * scale) / 2 - minX * scale;
  const offsetY = (px - spanY * scale) / 2 - minY * scale;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  for (const s of computeStripRenderData(pattern)) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate((s.rotationDeg * Math.PI) / 180);
    ctx.beginPath();
    for (let i = 0; i < s.points.length; i += 2) {
      if (i === 0) ctx.moveTo(s.points[i], s.points[i + 1]);
      else ctx.lineTo(s.points[i], s.points[i + 1]);
    }
    ctx.closePath();
    ctx.fillStyle = s.color;
    ctx.fill();
    ctx.restore();
  }

  if (drawBoundary) {
    // Same boundary color as PatternLayer.jsx's live <Line stroke="#334155">.
    // lineWidth divided by `scale` here for the same reason Konva's
    // strokeScaleEnabled={false} exists on that live line — without it, the
    // ctx.scale(scale, scale) above would make the boundary's thickness
    // track the pattern's own size instead of staying a fixed, crisp
    // on-image thickness.
    ctx.beginPath();
    ctx.moveTo(fA.x, fA.y);
    ctx.lineTo(fB.x, fB.y);
    ctx.lineTo(fC.x, fC.y);
    ctx.closePath();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5 / scale;
    ctx.stroke();
  }

  ctx.restore();

  // Where the FULL canvas (all px×px of it, not just the pattern content)
  // maps back to in the same flipped local coordinate space the pattern's
  // own vertices/strips live in — canvas (0,0) is top-left (Y-down);
  // inverting the scale+translate above gives that corner's world position
  // and the world-space size of one canvas pixel row/column. Callers place
  // the image with this rectangle directly — no need to know anything about
  // the margin/fit logic above.
  const worldX = -offsetX / scale;
  const worldY = -offsetY / scale;
  const worldSize = px / scale;

  return { canvas, worldX, worldY, worldSize };
}
