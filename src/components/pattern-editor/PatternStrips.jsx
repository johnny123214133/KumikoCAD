import React from 'react'
import { Line } from 'react-konva'
import { computeStripRenderData } from '../../geometry/renderPattern.js'

// Uses the shared computeStripRenderData (geometry/renderPattern.js) so this
// live Konva rendering and the offscreen-canvas cache renderer (used for
// pattern icons and panel cells) both draw from the exact same computation
// — no duplicated geometry logic between the two.
function StripBody({ data, wireframe }) {
  // Placement: y negated (Y-flip) and rotation negated — flipping Y also
  // flips the sense of a positive rotation, so both must flip together or
  // the strip ends up pointing the wrong way. See viewportMath.js. Konva has
  // no direct equivalent of Three.js's material.wireframe flag — adapted as:
  // hide the fill and show only the outline.
  return (
    <Line
      points={data.points}
      closed
      x={data.x}
      y={data.y}
      rotation={data.rotationDeg}
      fill={wireframe ? undefined : data.color}
      stroke={wireframe ? data.color : undefined}
      strokeWidth={1}
      strokeScaleEnabled={false}
    />
  )
}

export default function PatternStrips({ pattern, wireframe = false }) {
  const stripData = computeStripRenderData(pattern)
  return (
    <>
      {stripData.map(data => (
        <StripBody key={data.stripId} data={data} wireframe={wireframe} />
      ))}
    </>
  )
}
