import React, { useMemo } from 'react'
import { Line, Circle } from 'react-konva'
import PatternStrips from './PatternStrips.jsx'

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
 */
export function getPatternBoundingBox(pattern) {
  const { A, B, C } = pattern.vertices
  const xs = [A.x, B.x, C.x]
  const ys = [A.y, B.y, C.y]
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
}

export default function PatternLayer({ pattern, activeLayers }) {
  const boundaryPoints = useMemo(() => {
    const { A, B, C } = pattern.vertices
    return [A, B, C].flatMap(v => { const f = flip(v); return [f.x, f.y] })
  }, [pattern])

  return (
    <>
      <PatternStrips pattern={pattern} wireframe={!!activeLayers.wireframe} />

      <Line
        points={boundaryPoints}
        closed
        stroke="#334155"
        strokeWidth={1}
        strokeScaleEnabled={false}
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
          />
        )
      })}
    </>
  )
}
