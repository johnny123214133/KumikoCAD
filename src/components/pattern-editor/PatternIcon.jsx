import React, { useMemo, useDeferredValue } from 'react'
import useGridStore from '../../store/useGridStore.js'
import usePatternStore from '../../store/usePatternStore.js'
import { useTheme } from '../../store/useThemeStore.js'
import { DEFAULT_PATTERN_STRIP_WIDTH_MM } from '../../geometry/units.js'
import { getPatternImage, buildPatternCacheKey } from '../../geometry/patternImageCache.js'

// Pattern thumbnail, rendered from the pattern's own SAVED/canonical recipe
// via the shared offscreen-canvas cache (geometry/patternImageCache,
// geometry/renderPattern) — via getCanonicalPattern, NOT getComputedPattern,
// so it deliberately does NOT reflect this session's live, not-yet-saved
// edits (strip width/wood/finish typed into the Inspector while this
// pattern is active). Per the request that prompted this: the icon should
// only change when Save Pattern actually creates a new library entry with
// its own baked-in recipe, not on every keystroke of an in-progress edit —
// otherwise an unsaved edit looked indistinguishable from an already-saved
// pattern. Still reactive to the grid's actual cellWidth/gridStripWidth
// (panel-wide, not a per-pattern "parameter" in this sense). Every place
// that shows a pattern (list view, icon view, recently-used) renders
// through this one component.
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
  const theme = useTheme()
  // Deferred: when the grid's cell width / strip width change, the panel
  // updates first and the thumbnails catch up in a lower-priority render that
  // React can interrupt (and drop, if the dimensions change again meanwhile).
  // Rebuilding every pattern in the library at the new size is by far the most
  // expensive part of a dimension change — Ume A/B alone are ~0.5 s each —
  // and none of it is visible in the panel. The deferred values are passed to
  // getCanonicalPattern explicitly (it would otherwise read the live ones).
  const cellWidth = useDeferredValue(useGridStore(s => s.cellWidth))
  const gridStripWidth = useDeferredValue(useGridStore(s => s.gridStripWidth))
  const getCanonicalPattern = usePatternStore(s => s.getCanonicalPattern)
  const rotationDeg = orientation === 'vertical' ? 90 : 0

  // `pattern` (the library entry itself) is a dependency so the thumbnail follows a
  // built-in's Set as Default / Revert to Default, which swap that entry for a new one.
  const dataUrl = useMemo(() => {
    // Some patterns can't be built below a certain cell width (their factory
    // throws). An error here would unmount the whole app, so that one icon
    // just goes blank (null → the placeholder below) until the size allows it.
    try {
      const computed = getCanonicalPattern(pattern.id, { cellWidth, gridStripWidth })
      const stripWidth = computed.stripProperties?.[0]?.width ?? DEFAULT_PATTERN_STRIP_WIDTH_MM
      // Every distinct color in use, not just stripProperties[0] — a per-strip
      // wood/finish override (usePatternStore's applyStripColorOverrides) adds
      // ADDITIONAL stripProperties entries beyond index 0, so keying on [0]
      // alone would miss a color-only change that only affects some other
      // strip and keep serving a stale cached thumbnail.
      const color = computed.stripProperties?.map(sp => sp.color).join(',')
      const cacheKey = buildPatternCacheKey(pattern.id, cellWidth, gridStripWidth, stripWidth, computed.patternParams, true, false, color)
      const result = getPatternImage(cacheKey, computed, size, 3, true)
      return result.canvas.toDataURL()
    } catch {
      return null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pattern, cellWidth, gridStripWidth, size, theme.id])

  if (!dataUrl) {
    return (
      <span
        aria-hidden="true"
        title="Can't be drawn at this cell width"
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          flexShrink: 0,
          border: '1px dashed var(--kumiko-border-strong)',
          borderRadius: 3,
          background: theme.canvas.iconBg,
        }}
      />
    )
  }

  return (
    <img
      src={dataUrl}
      alt=""
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        border: '1px solid var(--kumiko-border-strong)',
        borderRadius: 3,
        background: theme.canvas.iconBg,
        transform: rotationDeg ? `rotate(${rotationDeg}deg)` : undefined,
      }}
    />
  )
}
