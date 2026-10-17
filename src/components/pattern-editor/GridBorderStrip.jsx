import React, { useMemo } from 'react'
import { useTheme } from '../../store/useThemeStore.js'
import { stripEdgeColor } from '../../theme/themeRuntime.js'
import { Line, Shape } from 'react-konva'
import { centroidOf, inradius, scaleFromCentroid, dist } from '../../geometry/factories/_shared.js'
import { getGridStripColor, getGridStripColorRgb } from '../../scene/gridStripColor.js'
import { darkenHex } from '../../geometry/color.js'
import { drawGridStrips, shapeScale } from '../../scene/drawGridStrips.js'
import useGridStore from '../../store/useGridStore.js'

// See scene/viewportMath.js for the Y-flip convention.
const flip = (p) => ({ x: p.x, y: -p.y })
const toFlippedPoints = (pts) => pts.flatMap(v => { const f = flip(v); return [f.x, f.y] })

// Renders the grid strip's own physical footprint around the cell — a thin
// triangular frame straddling the three nominal edges (half inside the
// cell, half outside — per the brainstorm: grid strip centerlines sit
// exactly on the nominal edge).
//
// Color matches GridLayer.jsx's real grid strips in the panel editor —
// both derive from useGridStore's material/finish via
// scene/gridStripColor.js's getGridStripColorRgb, so this reference border
// always shows the grid's actual chosen wood/finish combination, not a
// fixed placeholder.
//
// Non-wireframe: a single stroked Line along the boundary path with
// strokeWidth set to the real gridStripWidth. Canvas centers strokes on the
// path automatically, and its default miter join at each 60° corner is
// exactly the correct intersection of two adjacent border segments' offset
// edges (verified numerically) — no separate inner/outer-triangle geometry
// needed for this case.
//
// The band gets the same thin, slightly darker edge the pattern strips have
// (renderPattern.js: edgeColor = the fill darkened 0.15, a stroke centred on the
// strip's outline). Here that is two passes along the same path: the edge colour
// at the strip's width plus the edge width, then the fill colour over it at the
// width minus the edge width — which leaves the edge centred on the strip's two
// nominal faces and the miter corners correct, like the strips' own outline.
// The edge is one screen pixel wide at every zoom, like the strips' own.
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
  const material = useGridStore(s => s.material)
  const finish = useGridStore(s => s.finish)
  const strokeColor = `rgba(${getGridStripColorRgb(material, finish)})`
  const fillColor = getGridStripColor(material, finish)
  useTheme() // the edge colour depends on the theme
  const edgeColor = stripEdgeColor(fillColor, darkenHex(fillColor, 0.15))
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
        <Line key="inner" points={innerPoints} closed stroke={strokeColor} strokeWidth={1} strokeScaleEnabled={false} listening={false} />
        <Line key="outer" points={outerPoints} closed stroke={strokeColor} strokeWidth={1} strokeScaleEnabled={false} listening={false} />
      </>
    )
  }

  // One screen pixel of edge at every zoom — worked out at draw time from the
  // current scale (scene/drawGridStrips.js), like the pattern strips' own edge.
  return (
    <Shape
      listening={false}
      sceneFunc={(context, shape) => drawGridStrips(context._context, {
        scale: shapeScale(shape),
        stripWidth: gridStripWidth,
        fillColor,
        edgeColor,
        boundary: boundaryPoints,
      })}
    />
  )
}
