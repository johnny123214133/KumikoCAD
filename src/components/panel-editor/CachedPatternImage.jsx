import React, { useMemo } from 'react'
import { Image as KonvaImage } from 'react-konva'
import { getPatternImage, buildPatternCacheKey } from '../../geometry/patternImageCache.js'

// Fixed cache resolution for panel cells — a reasonable middle ground for
// typical working zoom levels. Known limitation, not solved here: zooming
// in far enough will show the raster upscaling (softer than the pattern
// editor's live vector strips) — a single fixed resolution can't serve both
// "zoomed out over hundreds of cells" and "zoomed in on one cell" equally
// well. Revisit with zoom-tier-based cache keys if that becomes a real
// problem in practice.
const CELL_CACHE_SIZE_PX = 128

// Renders a pattern's strips as a single cached bitmap instead of one Konva
// shape per strip — the panel-level performance work from the brainstorm.
// listening=false deliberately: click handling for a cell lives entirely on
// the hit-region Line in GridLayer.jsx's Cell component (wrapped in the same
// parent Group so Konva's bubbling still reaches it if a click lands on this
// image) — this image doesn't need its own hit-testing, which would just be
// redundant hit-canvas cost for every cell in the grid.
export default function CachedPatternImage({ pattern, cellWidth, gridStripWidth, patternStripWidth, spacing }) {
  const { canvas, worldX, worldY, worldSize } = useMemo(() => {
    // drawBoundary=false, explicitly — the grid already draws its own
    // real-width cell boundaries (GridLayer.jsx), so baking a triangle
    // outline into every cell's own cached image would double up. Contrast
    // PatternIcon.jsx, which has no such surrounding context and passes
    // true. Written out explicitly rather than left to the default so this
    // choice doesn't silently drift if that default ever changes.
    const cacheKey = buildPatternCacheKey(pattern.id, cellWidth, gridStripWidth, patternStripWidth, spacing, false)
    return getPatternImage(cacheKey, pattern, CELL_CACHE_SIZE_PX, 3, false)
  }, [pattern, cellWidth, gridStripWidth, patternStripWidth, spacing])

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
