import React, { useMemo } from 'react'
import { Image as KonvaImage } from 'react-konva'
import { getPanelCellImage } from '../../geometry/patternImageCache.js'
import { useTheme } from '../../store/useThemeStore.js'

// Renders a pattern's strips as a single cached bitmap instead of one Konva
// shape per strip — the panel-level performance work from the brainstorm.
// listening=false deliberately: click handling for a cell lives entirely on
// the hit-region Line in GridLayer.jsx's Cell component (wrapped in the same
// parent Group so Konva's bubbling still reaches it if a click lands on this
// image) — this image doesn't need its own hit-testing, which would just be
// redundant hit-canvas cost for every cell in the grid.
export default function CachedPatternImage({ pattern, cellWidth, gridStripWidth, patternStripWidth, patternParams, selected = false, sizePx }) {
  // The key and render settings live in getPanelCellImage (patternImageCache.js)
  // so the grid-dimension commit can prepare this exact entry ahead of time.
  // `sizePx` is the zoom-dependent raster size GridLayer chose (undefined = the
  // image cache's current one). It reads the pattern's own patternParams — the `patternParams` prop is the
  // same object (GridLayer passes pattern.patternParams) and stays in the deps
  // purely so a change to it re-runs the lookup.
  const themeId = useTheme().id // the selected variant carries the theme's border colour
  const { canvas, worldX, worldY, worldSize } = useMemo(
    () => getPanelCellImage(pattern, { cellWidth, gridStripWidth, patternStripWidth, selected, sizePx }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pattern, cellWidth, gridStripWidth, patternStripWidth, patternParams, selected, sizePx, themeId]
  )

  return (
    <KonvaImage
      image={canvas}
      x={worldX}
      y={worldY}
      width={worldSize}
      height={worldSize}
      listening={false}
    />
  )
}
