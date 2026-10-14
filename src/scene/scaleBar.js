import { mmToIn, inToMm } from '../geometry/units.js';

// "Show Scale" overlay: a ruler line with a tick at regular intervals and a number
// on every few of them. Everything here is pure except drawScaleAxis, which draws
// onto a canvas context from inside a Konva Shape's sceneFunc — i.e. at draw time —
// so the tick spacing, tick length and text size are worked out from the current
// zoom and stay the same size on screen.

// Nice steps, in the unit being shown.
const MM_LADDER = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
const IN_LADDER = [1 / 16, 1 / 8, 1 / 4, 1 / 2, 1, 2, 4, 6, 12, 24, 48, 96];

export const MINOR_TICK_MIN_PX = 8;   // closest two ticks may be on screen
export const LABEL_MIN_PX = 56;       // closest two numbers may be on screen
export const TICK_PX = { minor: 5, major: 9 };
export const LABEL_FONT_PX = 11;
export const LABEL_GAP_PX = 3;

// { minor, major } tick spacings in mm for a view at `scale` (screen px per mm).
// The major step is a whole multiple of the minor one, so every numbered tick is
// also a tick.
export function chooseScaleSteps(scale, unit) {
  const toMm = unit === 'in' ? inToMm : (v) => v;
  const ladder = (unit === 'in' ? IN_LADDER : MM_LADDER).map(toMm);
  const px = (mm) => mm * scale;
  const minor = ladder.find((s) => px(s) >= MINOR_TICK_MIN_PX) ?? ladder[ladder.length - 1];
  const eps = 1e-9;
  const major = ladder.find((s) => s >= minor - eps && px(s) >= LABEL_MIN_PX
    && Math.abs(s / minor - Math.round(s / minor)) < 1e-6) ?? minor;
  return { minor, major };
}

// [{ pos, major }] along an axis `length` mm long, starting from 0.
export function scaleTicks(length, { minor, major }) {
  if (!(length > 0) || !(minor > 0)) return [];
  const ticks = [];
  const n = Math.floor(length / minor + 1e-6);
  const every = Math.max(1, Math.round(major / minor));
  for (let i = 0; i <= n; i++) ticks.push({ pos: i * minor, major: i % every === 0 });
  return ticks;
}

// The number on a tick: in the CAD's unit, no trailing zeros ("0", "12.5", "0.0625").
export function formatTickLabel(mm, unit) {
  const v = unit === 'in' ? mmToIn(mm) : mm;
  return String(Number(v.toFixed(unit === 'in' ? 4 : 2)));
}

// Draws one axis. ctx is a CanvasRenderingContext2D in world units (y already
// flipped by the caller, as everywhere in the scene).
//   origin: {x, y} where 0 sits;  dir: unit vector along the axis (to its end)
//   out:    unit vector the ticks and numbers stick out toward (away from the work)
//   gapPx:  how far (screen px) the line sits off `origin`, along `out`
//   length: axis length in mm;    scale: screen px per world unit
export function drawScaleAxis(ctx, { origin, dir, out, length, scale, unit, gapPx = 0, color = '#475569' }) {
  if (!(length > 0) || !(scale > 0)) return;
  const px = 1 / scale;
  const ticks = scaleTicks(length, chooseScaleSteps(scale, unit));
  const o = { x: origin.x + out.x * gapPx * px, y: origin.y + out.y * gapPx * px };
  const at = (pos, off) => [o.x + dir.x * pos + out.x * off * px, o.y + dir.y * pos + out.y * off * px];
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = px;               // one screen pixel
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(...at(0, 0));
  ctx.lineTo(...at(length, 0));
  for (const t of ticks) {
    ctx.moveTo(...at(t.pos, 0));
    ctx.lineTo(...at(t.pos, t.major ? TICK_PX.major : TICK_PX.minor));
  }
  ctx.stroke();
  // Numbers (drawn upright whatever the axis direction): in a font sized in screen px.
  ctx.font = `${LABEL_FONT_PX * px}px sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = Math.abs(out.x) > 0.5 ? (out.x < 0 ? 'right' : 'left') : 'center';
  const labelOff = TICK_PX.major + LABEL_GAP_PX + (Math.abs(out.y) > 0.5 ? LABEL_FONT_PX / 2 : 0);
  for (const t of ticks) {
    if (!t.major) continue;
    const [x, y] = at(t.pos, labelOff);
    ctx.fillText(formatTickLabel(t.pos, unit), x, y);
  }
  // The unit, just past the end of the line.
  const [ex, ey] = at(length, 0);
  if (Math.abs(dir.x) > 0.5) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(unit, ex + dir.x * 6 * px, ey);
  } else {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(unit, ex, ey + dir.y * 6 * px);
  }
  ctx.restore();
}
