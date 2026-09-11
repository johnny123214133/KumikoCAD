import React, { useMemo } from 'react'
import useGridStore from '../../store/useGridStore.js'
import usePatternStore from '../../store/usePatternStore.js'
import { getPatternImage, buildPatternCacheKey } from '../../geometry/patternImageCache.js'

// Pattern thumbnail, rendered from the pattern's actual current strips/
// joints via the shared offscreen-canvas cache (geometry/patternImageCache,
// geometry/renderPattern) — reflects live dimension changes and per-pattern
// width overrides, same as the panel view. Every place that shows a pattern
// (list view, icon view, recently-used) renders through this one component.
//
// Rendered as an <img src={canvas.toDataURL()}>, not the raw cached canvas
// node — a canvas is a real DOM element with exactly one parent, and the
// same pattern can appear in multiple places at once (the main list AND
// Recently Used), which would silently steal the node from one of them.
//
// It rotates with the grid's cell orientation (horizontal/vertical, set in
// the grid/panel right-sidebar) via a CSS transform on the img.
export default function PatternIcon({ pattern, size = 28 }) {
  const orientation = useGridStore(s => s.orientation)
  const cellWidth = useGridStore(s => s.cellWidth)
  const gridStripWidth = useGridStore(s => s.gridStripWidth)
  const getComputedPattern = usePatternStore(s => s.getComputedPattern)
  const getEffectiveStripWidth = usePatternStore(s => s.getEffectiveStripWidth)
  const patternOverrides = usePatternStore(s => s.patternOverrides)
  const rotationDeg = orientation === 'vertical' ? 90 : 0

  const dataUrl = useMemo(() => {
    const computed = getComputedPattern(pattern.id)
    const stripWidth = getEffectiveStripWidth(pattern.id)
    const spacing = patternOverrides[pattern.id]?.spacing ?? computed.patternParams?.spacing
    const cacheKey = buildPatternCacheKey(pattern.id, cellWidth, gridStripWidth, stripWidth, spacing, true)
    const result = getPatternImage(cacheKey, computed, size, 3, true)
    return result.canvas.toDataURL()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pattern.id, cellWidth, gridStripWidth, size, patternOverrides])

  return (
    <img
      src={dataUrl}
      alt=""
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        border: '1px solid #ced4da',
        borderRadius: 3,
        background: '#fff',
        transform: rotationDeg ? `rotate(${rotationDeg}deg)` : undefined,
      }}
    />
  )
}
