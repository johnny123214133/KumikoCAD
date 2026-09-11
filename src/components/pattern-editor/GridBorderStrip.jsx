import React, { useMemo } from 'react'
import { Line } from 'react-konva'
import { centroidOf, inradius, scaleFromCentroid, dist } from '../../geometry/factories/_shared.js'
import { GRID_STRIP_COLOR_RGB } from '../../scene/gridStripColor.js'

// See scene/viewportMath.js for the Y-flip convention.
const flip = (p) => ({ x: p.x, y: -p.y })
const toFlippedPoints = (pts) => pts.flatMap(v => { const f = flip(v); return [f.x, f.y] })

// Renders the grid strip's own physical footprint around the cell — a thin
// triangular frame straddling the three nominal edges (half inside the
// cell, half outside — per the brainstorm: grid strip centerlines sit
// exactly on the nominal edge).
//
// Color matches GridLayer.jsx's real grid strips in the panel editor
// (GRID_STRIP_COLOR_RGB, scene/gridStripColor.js) — same literal value for
// now; will become the same actual parameter once grid material/color is
// wired up for real, per the request that prompted this.
//
// Non-wireframe: a single stroked Line along the boundary path with
// strokeWidth set to the real gridStripWidth. Canvas centers strokes on the
// path automatically, and its default miter join at each 60° corner is
// exactly the correct intersection of two adjacent border segments' offset
// edges (verified numerically) — no separate inner/outer-triangle geometry
// needed for this case.
//
// Wireframe: that trick only gives ONE filled band, not two independent
// outlines — so this draws the actual inner and outer edges explicitly,
// each computed via scaleFromCentroid (the same exact centroid-scaling
// relationship used to fix the pattern factories' own boundary retraction:
// inset/outset by a perpendicular amount = uniform scale from centroid for
// an equilateral triangle).
//
// Same overlay behavior as the pattern strips (toggled by the same
// wireframe boolean as PatternStrips' body), EXCEPT the border's own
// centerline — PatternLayer's existing always-on boundary stroke — is never
// gated by any toggle, unlike pattern strip centerlines
// (activeLayers.centerlines). This component only draws the band/outlines;
// the centerline stays exactly as it already was in PatternLayer.
export default function GridBorderStrip({ pattern, gridStripWidth, wireframe }) {
  const { A, B, C } = pattern.vertices
  const G = useMemo(() => centroidOf(A, B, C), [A, B, C])

  const boundaryPoints = useMemo(() => toFlippedPoints([A, B, C]), [A, B, C])

  const { innerPoints, outerPoints } = useMemo(() => {
    const sideLength = dist(A, B)
    const r = inradius(sideLength)
    const inset = gridStripWidth / 2
    const innerFactor = Math.max(0, (r - inset) / r)
    const outerFactor = (r + inset) / r
    const inner = [A, B, C].map(P => scaleFromCentroid(P, G, innerFactor))
    const outer = [A, B, C].map(P => scaleFromCentroid(P, G, outerFactor))
    return { innerPoints: toFlippedPoints(inner), outerPoints: toFlippedPoints(outer) }
  }, [A, B, C, G, gridStripWidth])

  if (!(gridStripWidth > 0)) return null

  if (wireframe) {
    return (
      <>
        <Line key="inner" points={innerPoints} closed stroke={`rgba(${GRID_STRIP_COLOR_RGB}, 0.6)`} strokeWidth={1} strokeScaleEnabled={false} />
        <Line key="outer" points={outerPoints} closed stroke={`rgba(${GRID_STRIP_COLOR_RGB}, 0.6)`} strokeWidth={1} strokeScaleEnabled={false} />
      </>
    )
  }

  return (
    <Line
      points={boundaryPoints}
      closed
      stroke={`rgba(${GRID_STRIP_COLOR_RGB}, 0.35)`}
      strokeWidth={gridStripWidth}
      lineJoin="miter"
    />
  )
}
