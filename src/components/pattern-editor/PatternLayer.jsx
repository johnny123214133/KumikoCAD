import React, { useMemo, useEffect } from 'react'
import { Line, Circle } from 'react-konva'
import PatternStrips from './PatternStrips.jsx'
import GridBorderStrip from './GridBorderStrip.jsx'
import useGridStore from '../../store/useGridStore.js'
import useSelectionStore from '../../store/useSelectionStore.js'
import { computeStripRenderData } from '../../geometry/renderPattern.js'

const NOTCH_COLORS = {
  halfLap: '#4a9eff',
  dado:    '#ff6b4a',
  star:    '#ffd700',
  miter:   '#7bc67e',
  taper:   '#a78bfa',
  butt:    '#fb923c',
  custom:  '#aaaaaa',
}

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
        return (
          <Line
            key={`cl-${s.id}`}
            points={[start.x, start.y, end.x, end.y]}
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
            listening={false}
          />
        )
      })}
    </>
  )
}