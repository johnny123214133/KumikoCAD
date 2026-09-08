import React from 'react'
import { Line } from 'react-konva'

// Port of the old scene/PanelRenderer.js. Renders the panel-boundary rectangle
// placeholder (see the // TODO carried over below — unchanged from the original,
// this is still out of scope until computeGridGeometry() exists).
// TODO: replace with grid tiling once computeGridGeometry() is implemented
export default function PanelBoundary({ widthMm = 300, heightMm = 400 }) {
  const hw = widthMm / 2, hh = heightMm / 2
  return (
    <Line
      points={[-hw, -hh, hw, -hh, hw, hh, -hw, hh]}
      closed
      stroke="#94a3b8"
      strokeWidth={1}
      strokeScaleEnabled={false}
    />
  )
}
