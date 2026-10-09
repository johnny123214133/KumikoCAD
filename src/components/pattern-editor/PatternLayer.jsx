import React, { useMemo, useEffect, useState } from 'react'
import { Line, Circle, Label, Tag, Text } from 'react-konva'
import PatternStrips from './PatternStrips.jsx'
import GridBorderStrip from './GridBorderStrip.jsx'
import useGridStore from '../../store/useGridStore.js'
import useSelectionStore from '../../store/useSelectionStore.js'
import { computeStripRenderData } from '../../geometry/renderPattern.js'
import { curveSampler } from '../../geometry/curve.js'

const NOTCH_COLORS = {
  halfLap: '#4a9eff',
  triLap:  '#6366f1',
  dado:    '#ff6b4a',
  star:    '#ffd700',
  miter:   '#7bc67e',
  taper:   '#a78bfa',
  butt:    '#fb923c',
  vNotch:  '#f472b6',
  asymMiter: '#22d3ee',
  custom:  '#aaaaaa',
}

// Names shown in the joint-dot tooltip.
const NOTCH_LABELS = {
  halfLap: 'Half lap',
  triLap: 'Tri lap',
  dado: 'Dado',
  star: 'Star',
  miter: 'Miter',
  taper: 'Taper',
  butt: 'Butt',
  vNotch: 'V-notch',
  asymMiter: 'Asymmetric taper',
  custom: 'Custom',
}
const notchLabel = (t) => NOTCH_LABELS[t] ?? t

// Joints whose dots sit on top of each other (several strip ends meeting at
// one point) are reported together, so the tooltip never hides one of them.
const COINCIDENT_MM = 0.05

// See scene/viewportMath.js for why world points get their y negated here.
const flip = (p) => ({ x: p.x, y: -p.y })

/**
 * Returns the pattern's world-space bounding box (Y-up, unflipped) — used by
 * Viewport's zoomToFit. Frames the triangle cell itself, not just the strips
 * (see the comment this replaced in the old PatternRenderer.getBoundingBox —
 * strips don't reach the vertices for Tsumiishi-kikko or Mikado).
 *
 * `margin` (mm, default 0): inflates the box uniformly on all sides. Needed
 * because GridBorderStrip's band/wireframe extends beyond the nominal
 * triangle vertices by gridStripWidth/2 — without this, zoom-to-fit could
 * frame tightly enough that the border's outer edge (especially the thin
 * wireframe outline sitting right at that boundary) ends up just outside
 * the fitted view, looking like it isn't rendering at all even though it is.
 */
export function getPatternBoundingBox(pattern, margin = 0) {
  const { A, B, C } = pattern.vertices
  const xs = [A.x, B.x, C.x]
  const ys = [A.y, B.y, C.y]
  return {
    minX: Math.min(...xs) - margin, maxX: Math.max(...xs) + margin,
    minY: Math.min(...ys) - margin, maxY: Math.max(...ys) + margin,
  }
}

export default function PatternLayer({ pattern, activeLayers }) {
  // Joint-dot tooltip: the dot under the cursor (Konva-flipped position) and
  // the stage's scale when it was hovered, so the label can be drawn at a
  // constant on-screen size whatever the zoom.
  const [hoveredDot, setHoveredDot] = useState(null) // { x, y, scale, text } | null
  const gridStripWidth = useGridStore(s => s.gridStripWidth)
  const boundaryPoints = useMemo(() => {
    const { A, B, C } = pattern.vertices
    return [A, B, C].flatMap(v => { const f = flip(v); return [f.x, f.y] })
  }, [pattern])

  // Publishes each strip's ACTUAL cut-shape polygon, transformed into the
  // same Konva-flipped world space it's actually drawn in — reusing
  // computeStripRenderData (geometry/renderPattern.js), the same source of
  // truth PatternStrips.jsx renders from, so this is exactly the shape on
  // screen, not an approximation of it. Multi-select's click-and-drag
  // rectangle hit-tests against this (see Viewport.jsx, geometry/
  // rectSelect.js's rectTouchesPolygon).
  //
  // This replaced a bounding-box approximation (centerline bbox expanded by
  // half the strip's width) that was a real, reported bug: a rotated
  // strip's own bbox can be dramatically bigger than the strip itself,
  // so dragging into the box's "phantom" corner — nowhere near the actual
  // diagonal strip — incorrectly selected it anyway.
  useEffect(() => {
    const items = computeStripRenderData(pattern).map((data) => {
      const rad = (data.rotationDeg * Math.PI) / 180
      const cos = Math.cos(rad), sin = Math.sin(rad)
      const polygon = []
      for (let i = 0; i < data.points.length; i += 2) {
        const lx = data.points[i], ly = data.points[i + 1]
        polygon.push(data.x + lx * cos - ly * sin, data.y + lx * sin + ly * cos)
      }
      return { id: data.stripId, polygon }
    })
    useSelectionStore.getState().setSelectableStrips(items)
  }, [pattern])

  // The label is sized for the zoom it appeared at, so drop it the moment the
  // view moves (wheel zoom or a pan drag) rather than let it go stale.
  useEffect(() => {
    if (!hoveredDot) return undefined
    const stage = hoveredDot.stage
    const clear = () => setHoveredDot(null)
    stage.on('wheel.jointTip dragstart.jointTip', clear)
    return () => stage.off('wheel.jointTip dragstart.jointTip')
  }, [hoveredDot])
  // Nothing to show once the dots are switched off or the pattern changes.
  useEffect(() => { setHoveredDot(null) }, [activeLayers.jointDots, pattern])

  const showTip = (e, joint) => {
    const stage = e.target.getStage()
    const here = joint.position
    const text = [...new Set(pattern.joints
      .filter((o) => Math.hypot(o.position.x - here.x, o.position.y - here.y) < COINCIDENT_MM)
      .map((o) => notchLabel(o.notchType)))].join(' / ')
    const p = flip(here)
    stage.container().style.cursor = 'help'
    setHoveredDot({ x: p.x, y: p.y, scale: stage.scaleX(), text, stage })
  }
  const hideTip = (e) => {
    e.target.getStage().container().style.cursor = ''
    setHoveredDot(null)
  }

  return (
    <>
      <GridBorderStrip pattern={pattern} gridStripWidth={gridStripWidth} wireframe={!!activeLayers.wireframe} />

      <PatternStrips pattern={pattern} wireframe={!!activeLayers.wireframe} />

      <Line
        points={boundaryPoints}
        closed
        stroke="#334155"
        strokeWidth={1}
        strokeScaleEnabled={false}
        listening={false}
      />

      {activeLayers.centerlines && pattern.strips.map(s => {
        const start = flip(s.start), end = flip(s.end)
        let pts = [start.x, start.y, end.x, end.y]
        if (s.curve) {
          // A bent strip's centerline is its parabola, not the straight chord (see geometry/curve.js).
          const dx = s.end.x - s.start.x, dy = s.end.y - s.start.y, c = Math.hypot(dx, dy)
          const nx = -dy / c, ny = dx / c
          pts = []
          const { centre } = curveSampler(c, s.curve), ux = dx / c, uy = dy / c
          for (let i = 0; i <= 64; i++) {
            const [lx, ly] = centre(i / 64)
            const q = flip({ x: s.start.x + ux * lx + nx * ly, y: s.start.y + uy * lx + ny * ly })
            pts.push(q.x, q.y)
          }
        }
        return (
          <Line
            key={`cl-${s.id}`}
            points={pts}
            stroke="#94a3b8"
            strokeWidth={1}
            strokeScaleEnabled={false}
            listening={false}
          />
        )
      })}

      {activeLayers.jointDots && pattern.joints.map(j => {
        const p = flip(j.position)
        return (
          <Circle
            key={`jd-${j.id}`}
            x={p.x}
            y={p.y}
            radius={0.75}
            fill={NOTCH_COLORS[j.notchType] ?? '#aaaaaa'}
            // A fat invisible ring (14 screen px, whatever the zoom) so the
            // tiny dot is easy to hover.
            stroke="transparent"
            strokeWidth={1}
            strokeScaleEnabled={false}
            hitStrokeWidth={14}
            onMouseEnter={(e) => showTip(e, j)}
            onMouseLeave={hideTip}
          />
        )
      })}

      {activeLayers.jointDots && hoveredDot && (
        // Counter-scaled so the label is a constant size on screen; offset up
        // and to the right of the dot (offsets are in screen px).
        <Label
          x={hoveredDot.x}
          y={hoveredDot.y}
          scaleX={1 / hoveredDot.scale}
          scaleY={1 / hoveredDot.scale}
          offsetX={-10}
          offsetY={30}
          listening={false}
        >
          <Tag fill="#1f2937" cornerRadius={4} opacity={0.94} />
          <Text text={hoveredDot.text} fontSize={12} fontFamily="sans-serif" fill="#ffffff" padding={6} />
        </Label>
      )}
    </>
  )
}