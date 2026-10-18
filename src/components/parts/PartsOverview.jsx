import React, { useMemo } from 'react'
import useAppStore from '../../store/useAppStore.js'
import usePartsStore from '../../store/usePartsStore.js'
import { useTheme } from '../../store/useThemeStore.js'
import { rgba } from '../../theme/themes.js'
import { stripWidthOf } from '../../geometry/grid/gridStrips.js'
import useSlide, { SLIDE_MS, prefersReducedMotion } from '../layout/useSlide.js'

// The Parts List's overview window: the whole panel in the canvas's bottom-left corner, with
// every cell and every border / grid strip that uses the selected piece highlighted. It shows and
// hides like the editors' overview (the same toolbar button and O key, the same slide), but there
// is no view box to move: the canvas here shows the piece, not the panel. It is shown while a
// piece is selected. Plain SVG in the panel's coordinates flipped to y down.
const BOX_W = 190, BOX_H = 130, PAD = 8

const polyPath = (pts) => `M${pts.map((p) => `${+p[0].toFixed(2)} ${+p[1].toFixed(2)}`).join('L')}Z`

export default function PartsOverview() {
  const { canvas, ui } = useTheme()
  const parts = usePartsStore((s) => s.parts)
  const selectedKey = usePartsStore((s) => s.selectedKey)
  const overviewOn = useAppStore((s) => s.overviewOn)
  const leftOpen = useAppStore((s) => s.leftPanelOpen)
  const leftWidth = useAppStore((s) => s.leftPanelWidth)

  // What the panel looks like (it only changes with the parts) and which of it the piece is in.
  const drawing = useMemo(() => {
    if (!parts?.model || !parts.geometry) return null
    const { model, geometry } = parts
    const o = model.rects.outer
    const stripIds = new Set(), spaceIds = new Set()
    for (const list of [parts.border.items, parts.gridStrips.items]) {
      for (const it of list) if (it.piece.key === selectedKey) it.stripIds?.forEach((id) => stripIds.add(id))
    }
    for (const it of parts.patterns.byPiece) if (it.piece.key === selectedKey) it.spaceIds?.forEach((id) => spaceIds.add(id))
    const cells = geometry.spaces.map((sp) => ({ id: sp.id, d: polyPath(sp.vertices.map((v) => [v.x, -v.y])) }))
    const strips = model.strips.map((st) => ({
      id: st.id,
      x1: st.start.x, y1: -st.start.y, x2: st.end.x, y2: -st.end.y,
      w: stripWidthOf(st, parts.dims),
    }))
    return {
      bbox: { minX: o.x0, maxX: o.x1, minY: -o.y1, maxY: -o.y0 },
      cellsOutline: cells.map((c) => c.d).join(''),
      cellsHit: cells.filter((c) => spaceIds.has(c.id)).map((c) => c.d).join(''),
      strips, stripIds,
      any: stripIds.size > 0 || spaceIds.size > 0,
    }
  }, [parts, selectedKey])

  const want = overviewOn && !!drawing && selectedKey != null
  const { render, shown } = useSlide(want)
  if (!drawing || !render) return null

  const { bbox } = drawing
  const cw = bbox.maxX - bbox.minX, ch = bbox.maxY - bbox.minY
  if (!(cw > 0 && ch > 0)) return null
  const scale = Math.min((BOX_W - 2 * PAD) / cw, (BOX_H - 2 * PAD) / ch)
  const w = cw * scale + 2 * PAD, h = ch * scale + 2 * PAD
  const pad = PAD / scale
  const vb = { x: bbox.minX - pad, y: bbox.minY - pad, w: cw + 2 * pad, h: ch + 2 * pad }
  const minWidth = 1.5 / scale // a strip is never thinner than a line you can see
  const still = prefersReducedMotion()

  return (
    <div
      data-parts-overview
      role="img"
      aria-label="Overview: where the selected piece is used in the panel, highlighted."
      title="Where the selected piece is used"
      style={{
        position: 'absolute', bottom: 12, left: (leftOpen ? leftWidth : 0) + 12, zIndex: 5,
        userSelect: 'none',
        transform: shown ? 'translateY(0)' : 'translateY(calc(100% + 24px))',
        opacity: shown ? 1 : 0,
        transition: still ? 'none' : `transform ${SLIDE_MS}ms cubic-bezier(0.22, 0.8, 0.3, 1), opacity ${SLIDE_MS}ms ease`,
        pointerEvents: 'none',
        background: ui.panel, border: `1px solid ${ui.borderStrong}`, borderRadius: 6,
        boxShadow: '0 1px 4px rgba(0,0,0,0.25)', lineHeight: 0,
      }}
    >
      <svg width={w} height={h} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}>
        <rect x={bbox.minX} y={bbox.minY} width={cw} height={ch} fill={canvas.bg} />
        {drawing.cellsHit && <path d={drawing.cellsHit} fill={rgba(ui.accent, 0.45)} stroke="none" />}
        <path d={drawing.cellsOutline} fill="none" stroke={rgba(canvas.centerline, 0.4)} strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
        {drawing.strips.map((s) => (
          <line
            key={s.id} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
            stroke={drawing.stripIds.has(s.id) ? ui.accent : rgba(canvas.centerline, 0.35)}
            strokeWidth={Math.max(s.w, minWidth)} strokeLinecap="butt"
          />
        ))}
        <rect x={bbox.minX} y={bbox.minY} width={cw} height={ch} fill="none" stroke={canvas.boundary} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  )
}
