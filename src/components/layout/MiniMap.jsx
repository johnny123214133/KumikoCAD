import React, { useEffect, useMemo, useRef, useState } from 'react'
import useAppStore from '../../store/useAppStore.js'
import useGridStore from '../../store/useGridStore.js'
import useSelectionStore from '../../store/useSelectionStore.js'
import { useTheme } from '../../store/useThemeStore.js'
import { computeGridGeometry } from '../../geometry/grid/computeGridGeometry.js'
import { rgba } from '../../theme/themes.js'

// A small overview in the canvas's bottom-left corner, shown only while the view is zoomed
// in far enough that it no longer shows most of the work: a simplified drawing of the
// whole panel (or of the open pattern) and a box marking the part currently on screen.
// It is a plain SVG in the work's own coordinates (Konva space: y down), so it needs no
// redraw when the view moves — only the box moves. Clicking in it, or clicking and
// dragging, moves the camera to that point (Viewport's panTo). It can be switched off
// (the toolbar button, O).
const BOX_W = 190, BOX_H = 130, PAD = 8
const SHOW_BELOW = 0.25
const SLIDE_MS = 240 // shown once the view covers less than this fraction of the work's area

const polyPath = (pts) => `M${pts.map((p) => `${+p[0].toFixed(2)} ${+p[1].toFixed(2)}`).join('L')}Z`

export default function MiniMap({ workspace, pattern }) {
  const theme = useTheme()
  const visibleRect = useAppStore((s) => s.viewportVisibleRect)
  const zoom = useAppStore((s) => s.viewportZoom)
  const rectWorkspace = useAppStore((s) => s.viewportRectWorkspace)
  const leftOpen = useAppStore((s) => s.leftPanelOpen)
  const leftWidth = useAppStore((s) => s.leftPanelWidth)
  const rightOpen = useAppStore((s) => s.rightPanelOpen)
  const rightWidth = useAppStore((s) => s.rightPanelWidth)
  const cols = useGridStore((s) => s.cols)
  const rows = useGridStore((s) => s.rows)
  const cellWidth = useGridStore((s) => s.cellWidth)
  const orientation = useGridStore((s) => s.orientation)
  const cornerBehavior = useGridStore((s) => s.cornerBehavior)
  const spacePatterns = useGridStore((s) => s.spacePatterns)
  const strips = useSelectionStore((s) => s.selectableStrips)
  const overviewOn = useAppStore((s) => s.overviewOn)
  const viewportApi = useAppStore((s) => s.viewportApi)
  const svgRef = useRef(null)
  const inPanel = workspace === 'panel-editor'
  const reducedMotion = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

  // The geometry that doesn't change as cells are filled: the outline of the work and the
  // path of every cell.
  const base = useMemo(() => {
    if (inPanel) {
      const g = computeGridGeometry({ cols, rows, cellWidth, orientation, cornerBehavior })
      const cells = g.spaces.map((sp) => ({ id: sp.id, pts: sp.vertices.map((v) => [v.x, -v.y]) }))
      return { bbox: { minX: 0, maxX: g.bounds.width, minY: -g.bounds.height, maxY: 0 }, cells }
    }
    const { A, B, C } = pattern.vertices
    const tri = [A, B, C].map((v) => [v.x, -v.y])
    const xs = tri.map((p) => p[0]), ys = tri.map((p) => p[1])
    return { bbox: { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }, tri }
  // (The open pattern only matters in the pattern editor; ignoring it in the panel keeps the
  // panel's geometry from being rebuilt on every unrelated render.)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inPanel, cols, rows, cellWidth, orientation, cornerBehavior, inPanel ? null : pattern])

  const drawing = useMemo(() => {
    if (inPanel) {
      let outline = '', filled = ''
      for (const c of base.cells) {
        const d = polyPath(c.pts)
        outline += d
        if (spacePatterns[c.id]) filled += d
      }
      return { outline, filled }
    }
    return { outline: polyPath(base.tri), filled: strips.map((s) => {
      const pts = []
      for (let i = 0; i < s.polygon.length; i += 2) pts.push([s.polygon[i], s.polygon[i + 1]])
      return polyPath(pts)
    }).join('') }
  }, [inPanel, base, spacePatterns, strips])

  // Whether the overview should be showing now: switched on, and the view zoomed in far enough.
  const { bbox } = base
  const cw = bbox.maxX - bbox.minX, ch = bbox.maxY - bbox.minY
  // (A view rectangle published for the other editor is stale for a moment after switching.)
  const usable = !!visibleRect && rectWorkspace === workspace && zoom > 0 && cw > 0 && ch > 0
  // What the person actually sees: the canvas is full-size under the side panels, so their
  // widths come off. (Konva space: y down, so the view's y range is the flipped world one.)
  const view = usable ? {
    x0: visibleRect.minX + (leftOpen ? leftWidth / zoom : 0),
    x1: visibleRect.maxX - (rightOpen ? rightWidth / zoom : 0),
    y0: -visibleRect.maxY, y1: -visibleRect.minY,
  } : null
  const ix0 = usable ? Math.max(view.x0, bbox.minX) : 0, ix1 = usable ? Math.min(view.x1, bbox.maxX) : 0
  const iy0 = usable ? Math.max(view.y0, bbox.minY) : 0, iy1 = usable ? Math.min(view.y1, bbox.maxY) : 0
  const covered = usable ? (Math.max(0, ix1 - ix0) * Math.max(0, iy1 - iy0)) / (cw * ch) : 1
  const want = overviewOn && usable && covered < SHOW_BELOW

  // It slides up into the corner when it appears and back down when it goes: kept mounted for
  // the length of the exit, then removed. `entered` is what the CSS transition follows.
  const [mounted, setMounted] = useState(false)
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    if (want) {
      setMounted(true)
      // Two frames, so the element has been painted in its starting place before it moves.
      let raf = requestAnimationFrame(() => { raf = requestAnimationFrame(() => setEntered(true)) })
      return () => cancelAnimationFrame(raf)
    }
    setEntered(false)
    const t = setTimeout(() => setMounted(false), SLIDE_MS)
    return () => clearTimeout(t)
  }, [want])
  if (!usable || !(mounted || want)) return null

  const scale = Math.min((BOX_W - 2 * PAD) / cw, (BOX_H - 2 * PAD) / ch)
  const w = cw * scale + 2 * PAD, h = ch * scale + 2 * PAD
  const pad = PAD / scale
  const { canvas, ui } = theme
  const hasView = ix1 > ix0 && iy1 > iy0
  const vb = { x: bbox.minX - pad, y: bbox.minY - pad, w: cw + 2 * pad, h: ch + 2 * pad }

  // Pointer -> the point in the work it is over (clamped to the work), then the camera goes there.
  const moveTo = (e) => {
    const r = svgRef.current?.getBoundingClientRect()
    if (!r || !r.width || !r.height || !viewportApi?.panTo) return
    const x = vb.x + ((e.clientX - r.left) / r.width) * vb.w
    const y = vb.y + ((e.clientY - r.top) / r.height) * vb.h
    viewportApi.panTo(Math.min(bbox.maxX, Math.max(bbox.minX, x)), Math.min(bbox.maxY, Math.max(bbox.minY, y)))
  }
  const onPointerDown = (e) => {
    if (e.button != null && e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    moveTo(e)
  }
  const onPointerMove = (e) => {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId) ?? (e.buttons & 1)) moveTo(e)
  }

  return (
    <div
      data-minimap
      role="img"
      aria-label="Overview: the part of the work you are looking at. Click or drag to move the view."
      title="Click or drag to move the view"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      style={{
        position: 'absolute', bottom: 12, left: (leftOpen ? leftWidth : 0) + 12, zIndex: 5,
        cursor: 'crosshair', touchAction: 'none', userSelect: 'none',
        transform: entered && want ? 'translateY(0)' : 'translateY(calc(100% + 24px))',
        opacity: entered && want ? 1 : 0,
        transition: reducedMotion ? 'none' : `transform ${SLIDE_MS}ms cubic-bezier(0.22, 0.8, 0.3, 1), opacity ${SLIDE_MS}ms ease`,
        pointerEvents: entered && want ? 'auto' : 'none',
        background: ui.panel, border: `1px solid ${ui.borderStrong}`, borderRadius: 6,
        boxShadow: '0 1px 4px rgba(0,0,0,0.25)', lineHeight: 0,
      }}
    >
      <svg ref={svgRef} width={w} height={h} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}>
        <clipPath id="minimap-clip"><rect x={bbox.minX} y={bbox.minY} width={cw} height={ch} /></clipPath>
        <rect x={bbox.minX} y={bbox.minY} width={cw} height={ch} fill={canvas.bg} />
        <g clipPath="url(#minimap-clip)">
          {drawing.filled && <path d={drawing.filled} fill={rgba(ui.accent, inPanel ? 0.4 : 0.35)} stroke="none" />}
          <path d={drawing.outline} fill="none" stroke={inPanel ? rgba(canvas.centerline, 0.55) : canvas.patternBoundary} strokeWidth={inPanel ? 0.6 : 1} vectorEffect="non-scaling-stroke" />
        </g>
        <rect x={bbox.minX} y={bbox.minY} width={cw} height={ch} fill="none" stroke={canvas.boundary} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {hasView && (
          <rect
            data-minimap-view
            x={ix0} y={iy0} width={ix1 - ix0} height={iy1 - iy0}
            fill={rgba(ui.accent, 0.18)} stroke={ui.accent} strokeWidth={2} vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
    </div>
  )
}
