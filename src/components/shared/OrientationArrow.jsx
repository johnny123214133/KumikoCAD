import React, { useMemo } from 'react'
import { Group, Line, Circle } from 'react-konva'
import { orientationArrowShape } from '../../scene/orientationArrow.js'
import { useTheme } from '../../store/useThemeStore.js'

// The "view orientation" overlay's arrow (see scene/orientationArrow.js) for a
// pattern whose canonical triangle is `vertices` ({A, B, C}, Y-up like all
// pattern data). Draw it in the same frame the pattern itself is drawn in — the
// pattern editor's layer directly, or inside a panel cell's placement Group —
// and it ends up wherever, and however turned or mirrored, the pattern does.
export default function OrientationArrow({ vertices }) {
  const { arrow, arrowHalo } = useTheme().canvas
  const { x, y, shape } = useMemo(() => {
    const { A, B, C } = vertices
    const sideLength = Math.hypot(B.x - A.x, B.y - A.y)
    return {
      // Centroid, flipped into Konva's Y-down space.
      x: (A.x + B.x + C.x) / 3,
      y: -(A.y + B.y + C.y) / 3,
      shape: orientationArrowShape(sideLength),
    }
  }, [vertices])

  return (
    <Group x={x} y={y} listening={false}>
      {/* The theme's optional outline: the arrow lies over wood and bare canvas alike,
          and a light arrow on pale wood (dark themes) would otherwise vanish. */}
      {arrowHalo && (
        <>
          <Line name="arrow-halo" points={shape.shaft} stroke={arrowHalo} strokeWidth={shape.strokeWidth * 3.2} opacity={0.85} lineCap="round" listening={false} />
          <Line name="arrow-halo" points={shape.head} stroke={arrowHalo} strokeWidth={shape.strokeWidth * 3.2} opacity={0.85} lineCap="round" lineJoin="round" listening={false} />
          <Circle name="arrow-halo" radius={shape.strokeWidth * 2.8} fill={arrowHalo} opacity={0.85} listening={false} />
        </>
      )}
      <Line points={shape.shaft} stroke={arrow} strokeWidth={shape.strokeWidth} lineCap="round" listening={false} />
      <Line points={shape.head} stroke={arrow} strokeWidth={shape.strokeWidth} lineCap="round" lineJoin="round" listening={false} />
      <Circle radius={shape.strokeWidth * 1.6} fill={arrow} listening={false} />
    </Group>
  )
}
