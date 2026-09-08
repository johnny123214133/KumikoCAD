import React, { useMemo } from 'react'
import { Line } from 'react-konva'
import { buildStripLocalPoints } from '../../geometry/stripShape.js'

// Extracted from PatternLayer.jsx so both the single-pattern editing view
// (PatternLayer) and the grid/panel view (CellPattern, one instance per grid
// cell) share the exact same strip-body geometry — no duplicated logic.
function StripBody({ strip, pattern, spMap, wireframe }) {
  const pt = pattern.pieceTemplates.find(p => p.stripId === strip.id)
  const sp = pt ? spMap[pt.stripPropertyId] : pattern.stripProperties[0]
  const width = sp?.width ?? 6
  const color = sp?.color ?? '#e8d5b0'

  const dx = strip.end.x - strip.start.x
  const dy = strip.end.y - strip.start.y
  const length = Math.sqrt(dx * dx + dy * dy)

  const endCuts = strip.cuts.filter(c => c.role === 'end')
  const unitDx = Math.cos(strip.orientation)
  const unitDy = Math.sin(strip.orientation)

  const localised = endCuts
    .map(c => ({
      angle: c.angle,
      jointId: c.jointId,
      localX: (c.position.x - strip.start.x) * unitDx + (c.position.y - strip.start.y) * unitDy,
    }))
    .sort((a, b) => a.localX - b.localX)

  const startAngle = localised[0]?.angle ?? 90
  const endAngle = localised[localised.length - 1]?.angle ?? 90
  const startJointId = localised[0]?.jointId
  const endJointId = localised[localised.length - 1]?.jointId
  const startNotchType = pattern.joints.find(j => j.id === startJointId)?.notchType
  const endNotchType = pattern.joints.find(j => j.id === endJointId)?.notchType

  const points = useMemo(
    () => buildStripLocalPoints(length, width / 2, startAngle, endAngle, startNotchType, endNotchType),
    [length, width, startAngle, endAngle, startNotchType, endNotchType]
  )
  // The local points must ALSO have y negated here, in addition to the position
  // and rotation being flipped below — Flip(Rotate(θ, p) + start) is NOT the
  // same as Rotate(-θ, p) + Flip(start); it's Rotate(-θ, Flip(p)) + Flip(start).
  // Skipping this swaps each cut's top/bottom corners — invisible for symmetric
  // (taper) cuts, since the corners are interchangeable, but visibly wrong for
  // any asymmetric (miter/butt-not-90°) cut, which is exactly what Goma and
  // Mikado's grid-touching miter joints are. Verified numerically before fixing.
  const flippedPoints = useMemo(
    () => points.map((v, i) => (i % 2 === 1 ? -v : v)),
    [points]
  )

  // Placement: y negated (Y-flip) and rotation negated — flipping Y also
  // flips the sense of a positive rotation, so both must flip together or
  // the strip ends up pointing the wrong way. See viewportMath.js.
  // Konva has no direct equivalent of Three.js's material.wireframe flag —
  // adapted as: hide the fill and show only the outline.
  return (
    <Line
      points={flippedPoints}
      closed
      x={strip.start.x}
      y={-strip.start.y}
      rotation={-(strip.orientation * 180) / Math.PI}
      fill={wireframe ? undefined : color}
      stroke={wireframe ? color : undefined}
      strokeWidth={1}
      strokeScaleEnabled={false}
    />
  )
}

export default function PatternStrips({ pattern, wireframe = false }) {
  const spMap = useMemo(
    () => Object.fromEntries(pattern.stripProperties.map(sp => [sp.id, sp])),
    [pattern]
  )
  return (
    <>
      {pattern.strips.map(strip => (
        <StripBody key={strip.id} strip={strip} pattern={pattern} spMap={spMap} wireframe={wireframe} />
      ))}
    </>
  )
}
