import React, { useMemo, useEffect, useLayoutEffect, useState, useRef, useCallback } from 'react'
import { matchingSpaceIds } from '../../scene/validationMatch.js'
import { wasDragGesture } from '../../scene/gestureGuard.js'
import { Line, Circle, Group, Shape, Label, Tag, Text } from 'react-konva'
import { insetConvexPolygon } from '../../geometry/insetPolygon.js'
import ScaleOverlay from '../shared/ScaleOverlay.jsx'
import useAppStore from '../../store/useAppStore.js'
import useGridStore from '../../store/useGridStore.js'
import usePatternStore from '../../store/usePatternStore.js'
import useSelectionStore from '../../store/useSelectionStore.js'
import CachedPatternImage from './CachedPatternImage.jsx'
import { computeGridGeometry, computeCellPlacement, computeGridpoints } from '../../geometry/grid/computeGridGeometry.js'
import { panelBorderRects } from '../../geometry/grid/gridStrips.js'
import { drawGridStrips, shapeScale } from '../../scene/drawGridStrips.js'
import { isInteractionLayerActive } from '../../scene/interactionLayers.js'
import { getGridStripColor } from '../../scene/gridStripColor.js'
import { darkenHex } from '../../geometry/color.js'
import { cellRasterSizeFor, getCellRasterSizePx, setCellRasterSizePx } from '../../geometry/patternImageCache.js'
import { paintCells } from '../../store/paintActions.js'
import { applyPatternToSelection } from '../../store/applyPattern.js'
import OrientationArrow from '../shared/OrientationArrow.jsx'
import { useTheme } from '../../store/useThemeStore.js'
import { stripEdgeColor } from '../../theme/themeRuntime.js'

const flip = (p) => ({ x: p.x, y: -p.y })
const BLANK_PATTERN_ID = 'builtin:blank'

// The Validation tool's cue on a cell that matches the one hovered/pinned is a faint
// tint over the cell's face (the theme's canvas.highlightFill). Deliberately light — it
// has to sit under the selected cell's border and the pattern's own strips without
// competing with either.

// Memoized: hovering with the Validation tool changes which cells are highlighted
// on almost every mouse move, and only those cells' props change (onCellClick and
// onHover are stable), so only they re-render rather than the whole grid.
const Cell = React.memo(function Cell({ space, pattern, xform, cellWidth, gridStripWidth, patternStripWidth, patternParams, rasterSizePx, onCellClick, onHover, onMove, hoverable, interactive, selected, highlighted, selectedBorderColor, highlightFill, showOrientation }) {
  const flippedVertices = useMemo(
    () => space.vertices.flatMap(v => { const f = flip(v); return [f.x, f.y] }),
    [space]
  )
  // Where the grid strips meet this cell: its outline pulled in by half a grid strip.
  const innerBorder = useMemo(
    () => {
      if (!selected && !highlighted) return []
      // A half cell's third edge is the border's inner face itself: nothing to pull in there.
      let cut = -1
      if (space.spaceType === 'half') {
        const moved = [0, 1].find((i) => Math.hypot(space.vertices[i].x - space.fullVertices[i].x, space.vertices[i].y - space.fullVertices[i].y) > 1e-6)
        if (moved !== undefined) cut = moved === 1 ? 1 : 2 // the edge from the moved vertex to the apex
      }
      return insetConvexPolygon(flippedVertices, [0, 1, 2].map((e) => (e === cut ? 0 : gridStripWidth / 2)))
    },
    [selected, highlighted, flippedVertices, gridStripWidth, space]
  )
  // Cells listen while the active tool clicks them (Validation included: while it
  // is armed, hovering a cell shows its matches and clicking one pins them).
  const handleClick = interactive ? (e) => onCellClick(space.id, !!e?.evt?.shiftKey, !!(e?.evt?.ctrlKey || e?.evt?.metaKey)) : undefined
  // A 'half' space is a window onto a virtual full cell (see
  // computeGridGeometry.js): the pattern is placed on the whole triangle, as in
  // a full space, and clipped to the part that is inside the panel.
  const isHalf = space.spaceType === 'half'
  // The window is the half cell itself: the border's inner face is on the cell's median.
  const clipFunc = useMemo(() => {
    if (!isHalf) return undefined
    const pts = space.vertices.flatMap(v => { const f = flip(v); return [f.x, f.y] })
    return (ctx) => {
      ctx.beginPath()
      ctx.moveTo(pts[0], pts[1])
      for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1])
      ctx.closePath()
    }
  }, [isHalf, space])
  const rot = xform?.rot ?? 0
  const mirrored = !!xform?.flip
  const placement = useMemo(
    () => computeCellPlacement(space, pattern, { rot, flip: mirrored }),
    [space, pattern, rot, mirrored]
  )

  return (
    <Group
      onClick={handleClick}
      onTap={handleClick}
      onMouseEnter={hoverable ? (e) => onHover(space.id, true, e) : undefined}
      onMouseLeave={hoverable ? (e) => onHover(space.id, false, e) : undefined}
      onMouseMove={hoverable && onMove ? onMove : undefined}
      listening={interactive}
    >
      {/* Click hit-region — and the subtle fill that lets empty cells still
          read as "there" and clickable. Wrapped together with the cached
          pattern image below in one Group (rather than each having its own
          onClick) so a click lands the same whether it hits the background or
          the pattern image drawn on top of it — Konva bubbles child clicks up
          to the Group either way. Stays visually present even when
          `interactive` is false (the parent Group's listening=false is what
          actually disables hit-testing) — a tool that doesn't want cell clicks
          shouldn't make the grid itself disappear, just stop responding to
          them. */}
      <Line
        points={flippedVertices}
        closed
        fill="rgba(0, 0, 0, 0)"
      />
      {/* The clip sits on an untransformed Group around the placement Group, so
          it is in the cell's own (panel) coordinates. */}
      <Group clipFunc={clipFunc}>
        <Group x={placement.x} y={placement.y} rotation={placement.rotationDeg} scaleX={placement.scaleX} scaleY={placement.scaleY}>
          <CachedPatternImage
            pattern={pattern}
            cellWidth={cellWidth}
            gridStripWidth={gridStripWidth}
            patternStripWidth={patternStripWidth}
            patternParams={patternParams}
            selected={selected}
            sizePx={rasterSizePx}
          />
        </Group>
      </Group>
      {/* Validation: a faint tint over the cell's face when it matches the hovered or
          pinned cell. A cell can be highlighted and selected at once — the tint sits
          under the selected border below, so both read. */}
      {highlighted && innerBorder.length > 0 && (
        <Line
          name="validation-highlight"
          points={innerBorder}
          closed
          fill={highlightFill}
          listening={false}
        />
      )}
      {/* Selected cell, base cue: the cell's inner border (the face where the grid
          strips meet it) goes darker and heavier, like the selected variant of its
          pattern strips — so empty cells read as selected too, and every cell has
          the same cue before its pattern adds its own. Constant width on screen. */}
      {selected && innerBorder.length > 0 && (
        <Line
          name="selected-cell-border"
          points={innerBorder}
          closed
          stroke={selectedBorderColor}
          strokeWidth={2.5}
          strokeScaleEnabled={false}
          lineJoin="miter"
          listening={false}
        />
      )}
      {/* "View orientation" overlay: through the same placement as the image
          (so it turns and mirrors with it), but outside the clip — a half
          space's centre is on the panel edge and the arrow shouldn't be cut
          in two. */}
      {showOrientation && (
        <Group x={placement.x} y={placement.y} rotation={placement.rotationDeg} scaleX={placement.scaleX} scaleY={placement.scaleY} listening={false}>
          <OrientationArrow vertices={pattern.vertices} />
        </Group>
      )}
    </Group>
  )
})

// A clickable ring on a gridpoint (Snap to Gridpoint tool). Radius is in mm; the
// outline stays a constant width on screen.
function GridpointHandle({ x, y, radius, onSnap }) {
  const [hover, setHover] = useState(false)
  const { snap, snapFill, snapFillHover } = useTheme().canvas
  const setCursor = (e, cursor) => { const c = e.target.getStage()?.container(); if (c) c.style.cursor = cursor }
  return (
    <Circle
      x={x}
      y={y}
      radius={radius}
      fill={hover ? snapFillHover : snapFill}
      stroke={snap}
      strokeWidth={1.5}
      strokeScaleEnabled={false}
      hitStrokeWidth={10}
      onClick={onSnap}
      onTap={onSnap}
      onMouseEnter={(e) => { setHover(true); setCursor(e, 'pointer') }}
      onMouseLeave={(e) => { setHover(false); setCursor(e, '') }}
    />
  )
}

// How long the zoom has to hold still before cells are re-rasterized for it.
const ZOOM_SETTLE_MS = 250

// The resolution (CELL_RASTER_SIZES) the cells' images are drawn at. While the
// view is being zoomed the images already on screen just scale; once it has
// stopped for a moment, the size that matches the new on-screen cell width is
// adopted (sharper if zoomed in, back to the cheap one if zoomed out). It's also
// published to the image cache module, which the grid-dimension commit reads so
// it prepares images at the size the panel will ask for.
function useCellRasterSize(cellWidth, settledZoom) {
  const [sizePx, setSizePx] = useState(getCellRasterSizePx)
  useEffect(() => {
    if (!(settledZoom > 0)) return
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1
    setSizePx(cellRasterSizeFor(cellWidth * settledZoom * dpr))
  }, [settledZoom, cellWidth])
  useLayoutEffect(() => { setCellRasterSizePx(sizePx) }, [sizePx])
  return sizePx
}

// The view's zoom (screen px per mm), once it has held still for ZOOM_SETTLE_MS —
// what the cells' bitmaps and the grid strips' cache are made sharp for.
function useSettledZoom() {
  const zoom = useAppStore(s => s.viewportZoom)
  const [settled, setSettled] = useState(zoom)
  useEffect(() => {
    if (!(zoom > 0) || zoom === settled) return undefined
    const timer = setTimeout(() => setSettled(zoom), ZOOM_SETTLE_MS)
    return () => clearTimeout(timer)
  }, [zoom, settled])
  return settled
}

// Margin (world mm) beyond the visible viewport that cells stay mounted
// within — avoids pop-in right at the edge of the screen during a pan.
const CULL_MARGIN_CELLS = 2

export default function GridLayer() {
  const { cols, rows, cellWidth, gridStripWidth, borderWidth, orientation, cornerBehavior, spacePatterns, spaceXforms, setSpacePattern, material, finish } = useGridStore()
  const getComputedPattern = usePatternStore(s => s.getComputedPattern)
  const getEffectiveStripWidth = usePatternStore(s => s.getEffectiveStripWidth)
  const activePatternId = usePatternStore(s => s.activePatternId)
  // Not read directly — subscribed so every cell re-renders when any pattern's
  // live overrides (strip width, wood/finish, parameters) change, since
  // getComputedPattern is a stable function that won't trigger it itself.
  const patternOverrides = usePatternStore(s => s.patternOverrides)
  const userPatterns = usePatternStore(s => s.userPatterns)
  const builtInDefaults = usePatternStore(s => s.builtInDefaults)
  const getMatchKey = usePatternStore(s => s.getMatchKey)
  const validationActive = useAppStore(s => s.validationActive)
  const pinnedId = useAppStore(s => s.validationPinnedId)
  const pinValidation = useAppStore(s => s.pinValidation)
  const selectTool = useAppStore(s => s.selectTool)
  const addSpacesToSelection = useSelectionStore(s => s.addSpacesToSelection)
  const activeTool = useAppStore(s => s.activeTool)
  const visibleRect = useAppStore(s => s.viewportVisibleRect)
  const selectedSpaceIds = useSelectionStore(s => s.selectedSpaceIds)
  const toggleSpaceSelection = useSelectionStore(s => s.toggleSpaceSelection)
  const toggleSpaceMultiSelection = useSelectionStore(s => s.toggleSpaceMultiSelection)
  const cellsInteractive = isInteractionLayerActive(activeTool, 'cellHitRegions')
  const showOrientation = useAppStore(s => !!s.activeLayers.viewOrientation)
  const showScale = useAppStore(s => !!s.activeLayers.showScale)
  // Not read directly: ratio-based pattern parameters are built on the unit's rounding grid, so a unit flip rebuilds them.
  useAppStore(s => s.gridUnit)
  const settledZoom = useSettledZoom()
  const rasterSizePx = useCellRasterSize(cellWidth, settledZoom)
  const snapActive = isInteractionLayerActive(activeTool, 'jointHandles')
  const setSpaceRotations = useGridStore(s => s.setSpaceRotations)

  const geometry = useMemo(
    () => computeGridGeometry({ cols, rows, cellWidth, orientation, cornerBehavior }),
    [cols, rows, cellWidth, orientation, cornerBehavior]
  )

  // Publishes every space's ACTUAL triangle polygon (exact, from its own
  // vertices) rather than its bounding box, for the multi-select tool's
  // click-and-drag rectangle to hit-test against (geometry/rectSelect.js's
  // rectTouchesPolygon). Cells are less prone to the bbox-vs-actual-shape
  // gap than pattern-editor strips are (a triangle's bbox isn't nearly as
  // oversized relative to its own area as a thin rotated strip's is), but
  // since the exact vertices are already right here, using them costs
  // nothing extra and keeps both editors' hit-testing consistently exact
  // rather than leaving a milder version of the same approximation here.
  // Published as the FULL set, not just visibleSpaces below — a screen-
  // bounded drag rectangle can't reach off-screen cells anyway, so culling
  // this list wouldn't change what's selectable, only risk excluding a
  // partially-visible cell right at the culling margin's edge.
  useEffect(() => {
    const items = geometry.spaces.map(space => {
      // flip Y to match the Konva-flipped convention the drag rectangle uses
      const polygon = space.vertices.flatMap(v => [v.x, -v.y])
      return { id: space.id, polygon }
    })
    useSelectionStore.getState().setSelectableSpaces(items)
  }, [geometry.spaces])

  // Validation armed: hovering shows a cell's matches, clicking pins them. Once a
  // cell is pinned the tool hands back the previous one, and hovering no longer
  // changes the highlight.
  const armed = activeTool === 'validation'

  const handleCellClick = (spaceId, shift, applyKey) => {
    // Ctrl (Cmd on a Mac) + click, with any tool: the current pattern goes into every selected
    // cell. The click itself selects nothing and does nothing else.
    if (applyKey) { applyPatternToSelection(); return }
    if (activeTool === 'validation') {
      // Shift + click pins the highlight AND adds the highlighted cells to the selection.
      if (shift) addSpacesToSelection([...matchesFor([spaceId])])
      pinValidation(spaceId)
      return
    }
    if (activeTool === 'selection' || activeTool === 'multi-select') {
      if (wasDragGesture()) return // the end of a rectangle drag, not a click
      // Shift + click on the Selection tool: on to Multi-select, adding this cell.
      if (shift && activeTool === 'selection') { selectTool('multi-select'); addSpacesToSelection([spaceId]) }
      else if (activeTool === 'selection') toggleSpaceSelection(spaceId)
      else toggleSpaceMultiSelection(spaceId)
    }
    else if (activeTool === 'place-pattern') setSpacePattern(spaceId, activePatternId)
    else if (activeTool === 'inspect') {
      // Open the cell's pattern in the pattern editor (an empty cell has none to open).
      const id = spacePatterns[spaceId]
      if (!id || id === BLANK_PATTERN_ID) return
      usePatternStore.getState().setActivePattern(id) // while still in the panel editor: nothing to discard
      useAppStore.getState().setWorkspace('pattern-editor')
    }
    else if (activeTool === 'fill-paint') paintCells([spaceId])
    // other tools: no cell-click behavior (Drag select works on the stroke, see Viewport.jsx)
  }
  // Cells get one stable click handler (so they can be memoized) that always calls
  // the latest handleCellClick.
  const clickRef = useRef(handleCellClick)
  clickRef.current = handleCellClick
  const onCellClick = useCallback((spaceId, shift, applyKey) => clickRef.current(spaceId, shift, applyKey), [])

  // The cell under the cursor while Validation is armed or Inspection is active (local state:
  // it changes with every mouse move and nothing else needs it).
  const inspecting = activeTool === 'inspect'
  const [hoverId, setHoverId] = useState(null)
  // Inspection's tooltip: where it is (Konva-local) and the zoom it was opened at, so it stays a
  // constant size on screen. After it opens, mouse moves reposition the node directly, with no
  // React render per move.
  const tipRef = useRef(null)
  const tipAt = useRef({ x: 0, y: 0, scale: 1 })
  const pointerLocal = (e) => {
    const stage = e?.target?.getStage?.()
    const p = stage?.getPointerPosition?.()
    if (!stage || !p) return null
    const scale = stage.scaleX()
    return { x: (p.x - stage.x()) / scale, y: (p.y - stage.y()) / scale, scale }
  }
  const onHover = useCallback((spaceId, entering, e) => {
    if (entering) { const at = pointerLocal(e); if (at) tipAt.current = at }
    setHoverId((h) => (entering ? spaceId : (h === spaceId ? null : h)))
  }, [])
  const onCellMove = useCallback((e) => {
    const node = tipRef.current, at = pointerLocal(e)
    if (!node || !at) return
    node.position({ x: at.x, y: at.y })
    node.getLayer?.()?.batchDraw?.()
  }, [])
  useEffect(() => { if (!armed && !inspecting) setHoverId(null) }, [armed, inspecting])

  // Every cell whose pattern has the same recipe as one of `refs`.
  const matchesFor = (refs) => {
    const ids = geometry.spaces.map((s) => s.id)
    const known = new Set(ids)
    const live = refs.filter((id) => id != null && known.has(id))
    if (!live.length) return new Set()
    const keys = new Map() // pattern id -> match key, worked out once per distinct pattern
    const keyOf = (spaceId) => {
      const patternId = spacePatterns[spaceId] ?? BLANK_PATTERN_ID
      let key = keys.get(patternId)
      if (key === undefined) { key = getMatchKey(patternId); keys.set(patternId, key) }
      return key
    }
    return matchingSpaceIds(ids, keyOf, live)
  }
  // Pinned: that cell's matches, and only those. Otherwise, while armed: the hovered cell's.
  const highlighted = useMemo(() => {
    if (!validationActive) return null
    const refs = pinnedId != null ? [pinnedId] : (armed ? [hoverId] : [])
    return refs.length ? matchesFor(refs) : null
    // userPatterns/builtInDefaults/patternOverrides change what a pattern id means.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validationActive, armed, pinnedId, hoverId, geometry.spaces, spacePatterns, getMatchKey, patternOverrides, userPatterns, builtInDefaults])

  // Viewport culling — only mount Cells whose bounding box overlaps the
  // current visible world-rect (+ margin), instead of every cell in the
  // whole grid regardless of what's actually on screen. This is the
  // performance fix that matters for a genuinely large grid (e.g. 40 rows ×
  // 121 spaces/row ≈ 4,840 cells — nowhere near all of those are visible at
  // a normal working zoom). visibleRect is null before Viewport's first
  // frame; fall back to showing everything rather than nothing in that gap.
  const visibleSpaces = useMemo(() => {
    if (!visibleRect) return geometry.spaces
    const margin = CULL_MARGIN_CELLS * cellWidth
    const vMinX = visibleRect.minX - margin, vMaxX = visibleRect.maxX + margin
    const vMinY = visibleRect.minY - margin, vMaxY = visibleRect.maxY + margin
    return geometry.spaces.filter(space => {
      const xs = space.vertices.map(v => v.x), ys = space.vertices.map(v => v.y)
      const sMinX = Math.min(...xs), sMaxX = Math.max(...xs)
      const sMinY = Math.min(...ys), sMaxY = Math.max(...ys)
      return sMaxX >= vMinX && sMinX <= vMaxX && sMaxY >= vMinY && sMinY <= vMaxY
    })
  }, [geometry.spaces, visibleRect, cellWidth])

  // The lattice vertices the Snap to Gridpoint tool offers (only worked out while
  // that tool is active).
  const gridpoints = useMemo(
    () => (snapActive ? computeGridpoints(geometry.spaces, geometry.bounds) : []),
    [snapActive, geometry]
  )

  // The border: a closed band along its centreline (borderWidth wide); its inner face is half a grid
  // strip inside the nominal edge along the base edge and on it across it (geometry/grid/gridStrips.js, panelBorderRects).
  const borderRects = useMemo(
    () => panelBorderRects({ ...geometry.bounds, gridStripWidth, borderWidth, orientation }),
    [geometry.bounds, gridStripWidth, borderWidth, orientation]
  )
  const boundaryPoints = useMemo(() => {
    const { x0, y0, x1, y1 } = borderRects.centre
    return [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }].flatMap(c => { const f = flip(c); return [f.x, f.y] })
  }, [borderRects])
  const latticeClip = useMemo(() => {
    const { x0, y0, x1, y1 } = borderRects.inner
    return [x0, -y1, x1, -y0]
  }, [borderRects])

  // Show Scale: a vertical ruler left of the panel and a horizontal one under it,
  // both counting from the bottom-left corner (Konva space: y down, bottom is y = 0).
  // They stand clear of the border's outer face.
  const scaleAxes = useMemo(() => {
    const { width, height } = geometry.bounds
    const { x0, y0 } = borderRects.outer
    return [
      { origin: { x: 0, y: -y0 }, dir: { x: 1, y: 0 }, out: { x: 0, y: 1 }, length: width, gapPx: 14 },
      { origin: { x: x0, y: 0 }, dir: { x: 0, y: -1 }, out: { x: -1, y: 0 }, length: height, gapPx: 14 },
    ]
  }, [geometry.bounds, borderRects])

  const flippedJointPoints = useMemo(
    () => geometry.jointPoints.map(flip),
    [geometry.jointPoints]
  )

  // Shared with GridBorderStrip.jsx's pattern-editor reference border via
  // scene/gridStripColor.js's getGridStripColor — both derive from this
  // grid's own material/finish (see GridInspector.jsx's Wood/Finish
  // selectors), so the two stay visually in sync by construction rather
  // than by matching a literal value by hand. Declared BEFORE the effect
  // below that depends on it — `const` isn't hoisted the way a function
  // declaration is, so referencing it in that effect's deps array while
  // it was still declared further down threw "Cannot access 'strokeColor'
  // before initialization" on every render, which is why the whole panel
  // editor went blank.
  const strokeColor = getGridStripColor(material, finish)
  // The same thin, slightly darker edge the pattern strips have, and like theirs
  // it stays one screen pixel wide at every zoom: the strips are drawn by a
  // Shape (scene/drawGridStrips.js) that works the edge out from the current
  // scale each time it draws, so there is no cache to remake and no re-render
  // when the zoom changes.
  const theme = useTheme()
  const edgeColor = stripEdgeColor(strokeColor, darkenHex(strokeColor, 0.15))
  // The selected-cell border: the theme's selection colour if it has one (cream on the dark
  // themes), else the same 0.35 darkening the pattern strips' selected border uses.
  const selectedBorderColor = theme.canvas.selection ?? darkenHex(strokeColor, 0.35)
  const flippedGridLines = useMemo(
    () => {
      // The lines on the nominal edge are the border's own (it is drawn there instead). A line that ends
      // on the edge runs on a strip width beyond it, under the border, so that where the lattice is
      // clipped to the border's inner face (latticeClip) its end is cut flush with that face.
      const { width, height } = geometry.bounds
      const eps = 1e-6
      const lineOn = (a, b) => (p) => Math.abs(p[a] - b) < eps
      const onEdge = [lineOn('x', 0), lineOn('x', width), lineOn('y', 0), lineOn('y', height)]
      const out = []
      for (const [x1, y1, x2, y2] of geometry.gridLines) {
        const p = { x: x1, y: y1 }, q = { x: x2, y: y2 }
        if (onEdge.some((on) => on(p) && on(q))) continue
        const len = Math.hypot(x2 - x1, y2 - y1)
        const ux = (x2 - x1) / len, uy = (y2 - y1) / len
        const ext = gridStripWidth * 2
        const a = onEdge.some((on) => on(p)) ? { x: x1 - ux * ext, y: y1 - uy * ext } : p
        const b = onEdge.some((on) => on(q)) ? { x: x2 + ux * ext, y: y2 + uy * ext } : q
        out.push([a.x, -a.y, b.x, -b.y])
      }
      return out
    },
    [geometry.gridLines, geometry.bounds, gridStripWidth]
  )

  // Each distinct pattern is resolved once per render, not once per cell —
  // with hundreds of cells sharing a handful of patterns, that's the
  // difference between a handful of lookups and hundreds. (The store also
  // memoizes the build itself, so even a lookup isn't a rebuild.)
  const resolvedPatterns = new Map()
  const resolvePattern = (patternId) => {
    let resolved = resolvedPatterns.get(patternId)
    if (!resolved) {
      resolved = { pattern: getComputedPattern(patternId), patternStripWidth: getEffectiveStripWidth(patternId) }
      resolvedPatterns.set(patternId, resolved)
    }
    return resolved
  }

  return (
    <>
      <Shape
        listening={false}
        sceneFunc={(context, shape) => drawGridStrips(context._context, {
          scale: shapeScale(shape),
          stripWidth: gridStripWidth,
          boundaryWidth: borderWidth,
          fillColor: strokeColor,
          edgeColor,
          boundary: boundaryPoints,
          latticeClip,
          segments: flippedGridLines,
          joints: flippedJointPoints,
        })}
      />

      {showScale && <ScaleOverlay axes={scaleAxes} />}

      {visibleSpaces.map(space => {
        const patternId = spacePatterns[space.id] ?? BLANK_PATTERN_ID
        const resolved = resolvePattern(patternId)
        const { pattern, patternStripWidth } = resolved
        return (
          <Cell
            key={space.id}
            space={space}
            pattern={pattern}
            cellWidth={cellWidth}
            gridStripWidth={gridStripWidth}
            patternStripWidth={patternStripWidth}
            patternParams={pattern.patternParams}
            xform={spacePatterns[space.id] ? spaceXforms[space.id] : undefined}
            rasterSizePx={rasterSizePx}
            showOrientation={showOrientation}
            interactive={cellsInteractive}
            hoverable={(armed && pinnedId == null) || inspecting}
            selected={selectedSpaceIds.includes(space.id)}
            highlighted={!!highlighted?.has(space.id)}
            selectedBorderColor={selectedBorderColor}
            highlightFill={theme.canvas.highlightFill}
            onCellClick={onCellClick}
            onHover={onHover}
            onMove={inspecting ? onCellMove : undefined}
          />
        )
      })}

      {/* Inspection: the name of the pattern in the hovered cell, by the cursor. Counter-scaled so it
          is a constant size on screen; offset up and to the right of the pointer (screen px). */}
      {inspecting && hoverId != null && spacePatterns[hoverId] && (() => {
        const patterns = usePatternStore.getState()
        const name = [...patterns.builtInPatterns, ...patterns.userPatterns].find((p) => p.id === spacePatterns[hoverId])?.name
        if (!name) return null
        const at = tipAt.current
        return (
          <Label ref={tipRef} name="inspection-tooltip" x={at.x} y={at.y} scaleX={1 / at.scale} scaleY={1 / at.scale} offsetX={-12} offsetY={34} listening={false}>
            <Tag fill={theme.canvas.tipBg} cornerRadius={4} opacity={0.94} />
            <Text text={name} fontSize={12} fontFamily="sans-serif" fill={theme.canvas.tipFg} padding={6} />
          </Label>
        )
      })()}

      {/* Snap to Gridpoint: a handle on every gridpoint. Clicking one turns each
          cell around it so its pattern's "up" (the view-orientation arrow)
          points at it. */}
      {snapActive && gridpoints.map(point => (
        <GridpointHandle
          key={`${point.x.toFixed(3)},${point.y.toFixed(3)}`}
          x={point.x}
          y={-point.y}
          radius={cellWidth * 0.07}
          onSnap={() => setSpaceRotations(Object.fromEntries(point.cells.map(c => [c.id, c.rot])))}
        />
      ))}
    </>
  )
}
