import React, { useMemo, useEffect, useLayoutEffect, useState } from 'react'
import { Line, Circle, Group, Shape } from 'react-konva'
import { insetConvexPolygon } from '../../geometry/insetPolygon.js'
import ScaleOverlay from '../shared/ScaleOverlay.jsx'
import useAppStore from '../../store/useAppStore.js'
import useGridStore from '../../store/useGridStore.js'
import usePatternStore from '../../store/usePatternStore.js'
import useSelectionStore from '../../store/useSelectionStore.js'
import CachedPatternImage from './CachedPatternImage.jsx'
import { computeGridGeometry, computeCellPlacement, computeGridpoints } from '../../geometry/grid/computeGridGeometry.js'
import { drawGridStrips, shapeScale } from '../../scene/drawGridStrips.js'
import { isInteractionLayerActive } from '../../scene/interactionLayers.js'
import { getGridStripColor } from '../../scene/gridStripColor.js'
import { darkenHex } from '../../geometry/color.js'
import { cellRasterSizeFor, getCellRasterSizePx, setCellRasterSizePx } from '../../geometry/patternImageCache.js'
import { paintCells } from '../../store/paintActions.js'
import { paintPattern } from '../../geometry/paintPattern.js'
import OrientationArrow from '../shared/OrientationArrow.jsx'

const flip = (p) => ({ x: p.x, y: -p.y })
const BLANK_PATTERN_ID = 'builtin:blank'

function Cell({ space, pattern, xform, cellWidth, gridStripWidth, patternStripWidth, patternParams, rasterSizePx, onClick, interactive, selected, selectedBorderColor, showOrientation }) {
  const flippedVertices = useMemo(
    () => space.vertices.flatMap(v => { const f = flip(v); return [f.x, f.y] }),
    [space]
  )
  // Where the grid strips meet this cell: its outline pulled in by half a grid strip.
  const innerBorder = useMemo(
    () => (selected ? insetConvexPolygon(flippedVertices, gridStripWidth / 2) : []),
    [selected, flippedVertices, gridStripWidth]
  )
  // A 'half' space is a window onto a virtual full cell (see
  // computeGridGeometry.js): the pattern is placed on the whole triangle, as in
  // a full space, and clipped to the part that is inside the panel.
  const isHalf = space.spaceType === 'half'
  const clipFunc = useMemo(() => {
    if (!isHalf) return undefined
    return (ctx) => {
      ctx.beginPath()
      ctx.moveTo(flippedVertices[0], flippedVertices[1])
      ctx.lineTo(flippedVertices[2], flippedVertices[3])
      ctx.lineTo(flippedVertices[4], flippedVertices[5])
      ctx.closePath()
    }
  }, [isHalf, flippedVertices])
  const rot = xform?.rot ?? 0
  const mirrored = !!xform?.flip
  const placement = useMemo(
    () => computeCellPlacement(space, pattern, { rot, flip: mirrored }),
    [space, pattern, rot, mirrored]
  )

  return (
    <Group
      onClick={interactive ? onClick : undefined}
      onTap={interactive ? onClick : undefined}
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
}

// A clickable ring on a gridpoint (Snap to Gridpoint tool). Radius is in mm; the
// outline stays a constant width on screen.
function GridpointHandle({ x, y, radius, onSnap }) {
  const [hover, setHover] = useState(false)
  const setCursor = (e, cursor) => { const c = e.target.getStage()?.container(); if (c) c.style.cursor = cursor }
  return (
    <Circle
      x={x}
      y={y}
      radius={radius}
      fill={hover ? 'rgba(13, 110, 253, 0.55)' : 'rgba(13, 110, 253, 0.22)'}
      stroke="#0d6efd"
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
  const { cols, rows, cellWidth, gridStripWidth, orientation, cornerBehavior, spacePatterns, spaceXforms, spaceFills, setSpacePattern, material, finish } = useGridStore()
  const getComputedPattern = usePatternStore(s => s.getComputedPattern)
  const getEffectiveStripWidth = usePatternStore(s => s.getEffectiveStripWidth)
  const activePatternId = usePatternStore(s => s.activePatternId)
  // Not read directly — subscribed so every cell re-renders when any pattern's
  // live overrides (strip width, wood/finish, parameters) change, since
  // getComputedPattern is a stable function that won't trigger it itself.
  usePatternStore(s => s.patternOverrides)
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

  const handleCellClick = (spaceId) => {
    if (activeTool === 'place-pattern') setSpacePattern(spaceId, activePatternId)
    else if (activeTool === 'selection') toggleSpaceSelection(spaceId)
    else if (activeTool === 'multi-select') toggleSpaceMultiSelection(spaceId)
    else if (activeTool === 'fill-paint') paintCells([spaceId])
    // other tools: no cell-click behavior yet
  }

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

  const boundaryPoints = useMemo(() => {
    const { width, height } = geometry.bounds
    const corners = [
      { x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height },
    ]
    return corners.flatMap(c => { const f = flip(c); return [f.x, f.y] })
  }, [geometry.bounds])

  // Show Scale: a vertical ruler left of the panel and a horizontal one under it,
  // both counting from the bottom-left corner (Konva space: y down, bottom is y = 0).
  const scaleAxes = useMemo(() => {
    const { width, height } = geometry.bounds
    const half = gridStripWidth / 2
    return [
      { origin: { x: 0, y: half }, dir: { x: 1, y: 0 }, out: { x: 0, y: 1 }, length: width, gapPx: 14 },
      { origin: { x: -half, y: 0 }, dir: { x: 0, y: -1 }, out: { x: -1, y: 0 }, length: height, gapPx: 14 },
    ]
  }, [geometry.bounds, gridStripWidth])

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
  const edgeColor = darkenHex(strokeColor, 0.15)
  // The selected-cell border: the same 0.35 darkening the pattern strips' selected border uses.
  const selectedBorderColor = darkenHex(strokeColor, 0.35)
  const flippedGridLines = useMemo(
    () => geometry.gridLines.map(([x1, y1, x2, y2]) => [x1, -y1, x2, -y2]),
    [geometry.gridLines]
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
          fillColor: strokeColor,
          edgeColor,
          boundary: boundaryPoints,
          segments: flippedGridLines,
          joints: flippedJointPoints,
        })}
      />

      {showScale && <ScaleOverlay axes={scaleAxes} />}

      {visibleSpaces.map(space => {
        const patternId = spacePatterns[space.id] ?? BLANK_PATTERN_ID
        const resolved = resolvePattern(patternId)
        const fill = spacePatterns[space.id] ? spaceFills[space.id] : undefined
        const pattern = fill ? paintPattern(resolved.pattern, fill.material, fill.finish) : resolved.pattern
        const { patternStripWidth } = resolved
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
            selected={selectedSpaceIds.includes(space.id)}
            selectedBorderColor={selectedBorderColor}
            onClick={() => handleCellClick(space.id)}
          />
        )
      })}

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
