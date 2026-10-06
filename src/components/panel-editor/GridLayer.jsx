import React, { useMemo, useRef, useEffect } from 'react'
import { Line, Circle, Group } from 'react-konva'
import useAppStore from '../../store/useAppStore.js'
import useGridStore from '../../store/useGridStore.js'
import usePatternStore from '../../store/usePatternStore.js'
import useSelectionStore from '../../store/useSelectionStore.js'
import CachedPatternImage from './CachedPatternImage.jsx'
import { computeGridGeometry, computeCellPlacement } from '../../geometry/grid/computeGridGeometry.js'
import { isInteractionLayerActive } from '../../scene/interactionLayers.js'
import { getGridStripColor } from '../../scene/gridStripColor.js'

const flip = (p) => ({ x: p.x, y: -p.y })
const BLANK_PATTERN_ID = 'builtin:blank'

function Cell({ space, pattern, cellWidth, gridStripWidth, patternStripWidth, patternParams, onClick, interactive, selected }) {
  const flippedVertices = useMemo(
    () => space.vertices.flatMap(v => { const f = flip(v); return [f.x, f.y] }),
    [space]
  )
  const placement = useMemo(
    () => (space.spaceType === 'full' ? computeCellPlacement(space, pattern) : null),
    [space, pattern]
  )

  return (
    <Group
      onClick={interactive ? onClick : undefined}
      onTap={interactive ? onClick : undefined}
      listening={interactive}
    >
      {/* Click hit-region — also the only visual for 'half' spaces, since
          fitting a pattern into a half-cell (per the schema's symmetryAxis/
          handedness fields) isn't implemented yet. A subtle fill so empty
          cells still read as "there" and clickable. Wrapped together with
          the cached pattern image below in one Group (rather than each
          having its own onClick) so a click lands the same whether it hits
          the background or the pattern image drawn on top of it — Konva
          bubbles child clicks up to the Group either way. Stays visually
          present even when `interactive` is false (the parent Group's
          listening=false is what actually disables hit-testing) — a tool
          that doesn't want cell clicks shouldn't make the grid itself
          disappear, just stop responding to them. */}
      <Line
        points={flippedVertices}
        closed
        fill="rgba(15, 23, 42, 0.025)"
        stroke="#cbd5e1"
        strokeWidth={0.3}
        strokeScaleEnabled={false}
      />
      {placement && (
        <Group x={placement.x} y={placement.y} rotation={placement.rotationDeg} scaleX={placement.scale} scaleY={placement.scale}>
          <CachedPatternImage
            pattern={pattern}
            cellWidth={cellWidth}
            gridStripWidth={gridStripWidth}
            patternStripWidth={patternStripWidth}
            patternParams={patternParams}
            selected={selected}
          />
        </Group>
      )}
    </Group>
  )
}

// Margin (world mm) beyond the visible viewport that cells stay mounted
// within — avoids pop-in right at the edge of the screen during a pan.
const CULL_MARGIN_CELLS = 2

export default function GridLayer() {
  const { cols, rows, cellWidth, gridStripWidth, orientation, cornerBehavior, spacePatterns, setSpacePattern, material, finish } = useGridStore()
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

  const boundaryPoints = useMemo(() => {
    const { width, height } = geometry.bounds
    const corners = [
      { x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height },
    ]
    return corners.flatMap(c => { const f = flip(c); return [f.x, f.y] })
  }, [geometry.bounds])

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

  const gridLinesRef = useRef(null)
  // Grid lines (now real-width strips, not thin reference lines) only
  // change when the grid's topology/dimensions change, never on pan/zoom —
  // cache the whole thing as one bitmap (Konva's own node-level caching, not
  // the pattern image cache) so redrawing during a pan/zoom doesn't mean
  // re-stroking every one of the (currently un-merged, one-per-cell-edge —
  // see computeGridGeometry.js's file comment) line segments plus every
  // junction patch every frame.
  useEffect(() => {
    gridLinesRef.current?.cache()
  }, [geometry.gridLines, geometry.jointPoints, gridStripWidth, strokeColor])

  return (
    <>
      <Group ref={gridLinesRef} listening={false}>
        {/* Boundary — one continuous closed path, so Konva's own miter join
            handles its 4 corners correctly on its own, same as the single-
            cell GridBorderStrip's non-wireframe band. */}
        <Line points={boundaryPoints} closed stroke={strokeColor} strokeWidth={gridStripWidth} lineJoin="miter" />

        {/* Interior grid-line segments — separate paths, so they do NOT
            auto-miter with each other at shared endpoints; butt caps avoid
            any stray overhang past each segment's own exact endpoint, and
            the patch circles below fill the resulting gaps at junctions. */}
        {geometry.gridLines.map((pts, i) => {
          const [x1, y1, x2, y2] = pts
          return (
            <Line
              key={i}
              points={[x1, -y1, x2, -y2]}
              stroke={strokeColor}
              strokeWidth={gridStripWidth}
              lineCap="butt"
            />
          )
        })}

        {/* Junction patches — every point where 2+ grid-line segments meet
            (see computeGridGeometry.js's jointPoints). A filled circle of
            radius gridStripWidth/2 exactly covers the notch/gap a butt-capped
            multi-segment T or X junction would otherwise leave. */}
        {flippedJointPoints.map((p, i) => (
          <Circle key={i} x={p.x} y={p.y} radius={gridStripWidth / 2} fill={strokeColor} />
        ))}
      </Group>

      {visibleSpaces.map(space => {
        const patternId = spacePatterns[space.id] ?? BLANK_PATTERN_ID
        const pattern = getComputedPattern(patternId)
        return (
          <Cell
            key={space.id}
            space={space}
            pattern={pattern}
            cellWidth={cellWidth}
            gridStripWidth={gridStripWidth}
            patternStripWidth={getEffectiveStripWidth(patternId)}
            patternParams={pattern.patternParams}
            interactive={cellsInteractive}
            selected={selectedSpaceIds.includes(space.id)}
            onClick={() => handleCellClick(space.id)}
          />
        )
      })}
    </>
  )
}
