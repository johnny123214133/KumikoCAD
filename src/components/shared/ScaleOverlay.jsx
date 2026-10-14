import React from 'react'
import { Shape } from 'react-konva'
import useAppStore from '../../store/useAppStore.js'
import { useTheme } from '../../store/useThemeStore.js'
import { drawScaleAxis } from '../../scene/scaleBar.js'
import { shapeScale } from '../../scene/drawGridStrips.js'

// "Show Scale": one or two ruler axes drawn by a single Konva Shape. `axes` are
// in Konva (y-flipped) world coordinates; `gap` is how far (screen px) the line
// sits off the work. Size-on-screen things (ticks, numbers) are worked out at
// draw time from the current zoom — see scene/scaleBar.js.
//   axes: [{ origin: {x,y}, dir: {x,y}, out: {x,y}, length }]  (mm / world units)
export default function ScaleOverlay({ axes, name = 'scale-overlay' }) {
  const unit = useAppStore((s) => s.gridUnit)
  const color = useTheme().canvas.scale
  return (
    <Shape
      name={name}
      listening={false}
      sceneFunc={(context, shape) => {
        const scale = shapeScale(shape)
        for (const axis of axes) drawScaleAxis(context._context, { ...axis, scale, unit, color })
      }}
    />
  )
}
