import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Stage, Layer, Rect } from 'react-konva'
import useAppStore from '../../store/useAppStore.js'
import usePatternStore from '../../store/usePatternStore.js'
import useGridStore from '../../store/useGridStore.js'
import useSelectionStore from '../../store/useSelectionStore.js'
import PatternLayer, { getPatternBoundingBox } from '../pattern-editor/PatternLayer.jsx'
import GridLayer from '../panel-editor/GridLayer.jsx'
import { computeGridGeometry } from '../../geometry/grid/computeGridGeometry.js'
import { computeZoomToFit, computeWheelZoom } from '../../scene/viewportMath.js'
import { normalizeRect, rectTouchesPolygon } from '../../geometry/rectSelect.js'

export default function Viewport() {
  const containerRef = useRef(null)
  const stageRef = useRef(null)
  const [size, setSize] = useState({ width: 0, height: 0 }) // drives the <Stage> element's own pixel size
  const [stageMounted, setStageMounted] = useState(false)
  const workspace = useAppStore(s => s.workspace)
  const activeTool = useAppStore(s => s.activeTool)
  const activeLayers = useAppStore(s => s.activeLayers)
  const setViewportApi = useAppStore(s => s.setViewportApi)
  const setViewportVisibleRect = useAppStore(s => s.setViewportVisibleRect)
  const viewportLocked = useAppStore(s => s.viewportLocked)
  const leftPanelOpen = useAppStore(s => s.leftPanelOpen)
  const leftPanelWidth = useAppStore(s => s.leftPanelWidth)
  const rightPanelOpen = useAppStore(s => s.rightPanelOpen)
  const rightPanelWidth = useAppStore(s => s.rightPanelWidth)
  // Read via ref (not useCallback deps) inside zoomToFit below — panels are
  // now an overlay, not a resize, so toggling/resizing one should behave
  // like the pre-existing "panel toggle doesn't auto-refit" rule always has:
  // zoomToFit should account for whichever panels happen to be open WHEN
  // IT'S CALLED (pattern switch, workspace switch, or the manual button),
  // but a panel opening/closing/resizing shouldn't by itself trigger a fit.
  const panelStateRef = useRef({ leftPanelOpen, leftPanelWidth, rightPanelOpen, rightPanelWidth })
  useEffect(() => {
    panelStateRef.current = { leftPanelOpen, leftPanelWidth, rightPanelOpen, rightPanelWidth }
  }, [leftPanelOpen, leftPanelWidth, rightPanelOpen, rightPanelWidth])
  const activePatternId = usePatternStore(s => s.activePatternId)
  const getActivePattern = usePatternStore(s => s.getActivePattern)
  // Not read directly — subscribed purely so this component re-renders (and
  // re-calls getActivePattern() below) whenever a live edit changes the
  // active pattern's own computed geometry/color WITHOUT activePatternId
  // itself changing (strip width, wood, finish — all live in
  // patternOverrides, see Inspector.jsx). getActivePattern()/
  // getComputedPattern() are plain functions, not reactive state on their
  // own — Zustand only re-renders a subscriber when a slice it actually
  // subscribed to changes, so without this the pattern editor's strips kept
  // showing stale geometry/color until something UNRELATED (switching
  // workspace and back, which remounts this component and calls
  // getActivePattern() fresh) happened to force a re-render. Was previously
  // masked for strip width by incidental re-renders (pan/zoom state changes
  // while the mouse was over the canvas); wood/finish changes from the
  // right panel never touch the canvas, so there was nothing to mask it —
  // reported as "pattern editor doesn't update strip color on a wood/finish
  // change until switching workspaces and back."
  usePatternStore(s => s.patternOverrides)
  const pattern = getActivePattern()
  // Also read via ref, and NOT included in zoomToFit's own deps below — this
  // is what actually fixes "changing the active pattern shouldn't move the
  // panel-editor's viewport": panel-editor's bbox doesn't even use `pattern`
  // (activePatternId there just means "which pattern the placement tool will
  // stamp", unrelated to what's visible), but if `pattern` were still in
  // zoomToFit's deps, its changing identity would still indirectly re-fire
  // the auto-refit effect below (since that effect depends on zoomToFit
  // itself) regardless of workspace. Keeping it out of zoomToFit's deps
  // entirely, and reading the latest value via this ref instead, breaks that
  // chain at the source rather than special-casing the workspace check.
  const patternRef = useRef(pattern)
  useEffect(() => { patternRef.current = pattern }, [pattern])
  const { cols, rows, cellWidth, gridStripWidth, orientation, cornerBehavior } = useGridStore()

  // Stage only mounts once size is known (see the conditional render below), so
  // stageRef.current is still null on the very first render pass — a plain ref
  // can't be a dependency, so this state flag is what lets the zoomToFit effect
  // below notice "the stage just became available" and actually run once, on
  // top of running on every pattern switch.
  const setStageRef = useCallback((node) => {
    stageRef.current = node
    setStageMounted(!!node)
  }, [])

  // Publishes the current visible world-rect for GridLayer's viewport
  // culling (see useAppStore's viewportVisibleRect comment). Throttled to at
  // most once per animation frame via rafPendingRef — dragmove and wheel can
  // both fire far more often than that, and culling only needs "roughly
  // current", not every intermediate frame.
  const rafPendingRef = useRef(false)
  const updateVisibleRect = useCallback(() => {
    if (rafPendingRef.current) return
    rafPendingRef.current = true
    requestAnimationFrame(() => {
      rafPendingRef.current = false
      const stage = stageRef.current
      const container = containerRef.current
      if (!stage || !container) return
      const scale = stage.scaleX()
      const pos = stage.position()
      const w = container.clientWidth, h = container.clientHeight
      // Screen (0,0)-(w,h) -> Konva-flipped local space, then flip Y to match
      // the same Y-up world convention computeGridGeometry's spaces use.
      const kx0 = (0 - pos.x) / scale, kx1 = (w - pos.x) / scale
      const ky0 = (0 - pos.y) / scale, ky1 = (h - pos.y) / scale
      setViewportVisibleRect({ minX: kx0, maxX: kx1, minY: -ky1, maxY: -ky0 })
    })
  }, [setViewportVisibleRect])

  const zoomToFit = useCallback(() => {
    const stage = stageRef.current
    const container = containerRef.current
    if (!stage || !container) return
    // Read live DOM size rather than the `size` state, so this works correctly
    // even if called before a resize/state round-trip has happened (e.g. the
    // very first frame) — mirrors how the old SceneManager read
    // canvas.clientWidth/clientHeight directly rather than relying on React state.
    const w = container.clientWidth, h = container.clientHeight
    if (!w || !h) return
    const bbox = workspace === 'panel-editor'
      ? (() => {
          const { width, height } = computeGridGeometry({ cols, rows, cellWidth, orientation, cornerBehavior }).bounds
          return { minX: 0, maxX: width, minY: 0, maxY: height }
        })()
      : getPatternBoundingBox(patternRef.current, gridStripWidth)
    const { leftPanelOpen, leftPanelWidth, rightPanelOpen, rightPanelWidth } = panelStateRef.current
    const t = computeZoomToFit(
      bbox, w, h,
      leftPanelOpen ? leftPanelWidth : 0,
      rightPanelOpen ? rightPanelWidth : 0,
    )
    stage.scale({ x: t.scale, y: t.scale })
    stage.position({ x: t.x, y: t.y })
    stage.batchDraw()
    updateVisibleRect()
  }, [workspace, cols, rows, cellWidth, gridStripWidth, orientation, cornerBehavior, updateVisibleRect])

  // Panel-editor's Stage/canvas sizing — was previously an imperative
  // sm.onResize() call; now just updates the <Stage> width/height props.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => {
      setSize({ width: container.clientWidth, height: container.clientHeight })
    })
    ro.observe(container)
    setSize({ width: container.clientWidth, height: container.clientHeight })
    return () => ro.disconnect()
  }, [])

  // Refit on workspace switch, grid dimension change, or initial mount —
  // deliberately does NOT include activePatternId: panel-editor's bbox
  // doesn't depend on which pattern is active (see patternRef comment
  // above), so this must not re-fire just because a different pattern was
  // picked in the placement tool while sitting in panel-editor. stageMounted
  // is what fixes the original "ran once before the Stage existed" bug.
  useEffect(() => {
    zoomToFit()
  }, [workspace, cols, rows, cellWidth, orientation, cornerBehavior, stageMounted, zoomToFit])

  // Separately: in pattern-editor specifically, switching which pattern is
  // open for editing SHOULD refit (you're now looking at a different shape).
  // Guarded by a ref rather than listing `workspace` as a dependency so this
  // doesn't ALSO re-fire on workspace switches — the effect above already
  // handles those.
  const workspaceRef = useRef(workspace)
  useEffect(() => { workspaceRef.current = workspace }, [workspace])
  useEffect(() => {
    if (workspaceRef.current === 'pattern-editor') zoomToFit()
  }, [activePatternId, zoomToFit])

  useEffect(() => {
    setViewportApi({ zoomToFit })
    return () => setViewportApi(null)
  }, [zoomToFit, setViewportApi])

  // Multi-select's click-and-drag rectangle selection. One corner anchors
  // at mousedown, the opposite corner follows the cursor, and releasing
  // REPLACES the current selection with whatever overlaps the rectangle
  // (touch-select — see geometry/rectSelect.js for where a future contain-
  // select mode would slot in). dragRectRef holds the anchor point in
  // Konva-local coordinates (not React state) so mousemove doesn't need a
  // state round-trip just to read it back; dragRectState IS React state,
  // since the rectangle's current extent needs to actually re-render as the
  // cursor moves. A small screen-pixel distance threshold distinguishes a
  // real drag from a plain click — below it, this does nothing and leaves
  // the click to the individual strip/cell's own onClick handler (which is
  // how multi-select's "add one clicked item to the list" behavior already
  // works, entirely separately from this).
  const DRAG_THRESHOLD_PX = 4
  const dragAnchorRef = useRef(null) // { worldX, worldY, screenX, screenY } | null
  const [dragRectState, setDragRectState] = useState(null) // { x1, y1, x2, y2 } in Konva-local coords, for rendering only

  const toKonvaLocal = (stage, screenPos) => {
    const scale = stage.scaleX()
    const pos = stage.position()
    return { x: (screenPos.x - pos.x) / scale, y: (screenPos.y - pos.y) / scale }
  }

  const handleStageMouseDown = (e) => {
    if (activeTool !== 'multi-select') return
    const stage = e.target.getStage()
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    const world = toKonvaLocal(stage, pointer)
    dragAnchorRef.current = { worldX: world.x, worldY: world.y, screenX: pointer.x, screenY: pointer.y }
    setDragRectState({ x1: world.x, y1: world.y, x2: world.x, y2: world.y })
  }

  const handleStageMouseMove = (e) => {
    if (activeTool !== 'multi-select' || !dragAnchorRef.current) return
    const stage = e.target.getStage()
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    const world = toKonvaLocal(stage, pointer)
    const a = dragAnchorRef.current
    setDragRectState({ x1: a.worldX, y1: a.worldY, x2: world.x, y2: world.y })
  }

  const handleStageMouseUp = (e) => {
    if (activeTool !== 'multi-select') return
    const anchor = dragAnchorRef.current
    dragAnchorRef.current = null
    setDragRectState(null)
    if (!anchor) return
    const stage = e.target.getStage()
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    const screenDist = Math.hypot(pointer.x - anchor.screenX, pointer.y - anchor.screenY)
    if (screenDist < DRAG_THRESHOLD_PX) return // a plain click — the shape's own onClick already handled it
    const world = toKonvaLocal(stage, pointer)
    const rect = normalizeRect(anchor.worldX, anchor.worldY, world.x, world.y)
    const sel = useSelectionStore.getState()
    if (workspace === 'panel-editor') {
      sel.setSpaceSelection(sel.selectableSpaces.filter(c => rectTouchesPolygon(rect, c.polygon)).map(c => c.id))
    } else {
      sel.setStripSelection(sel.selectableStrips.filter(c => rectTouchesPolygon(rect, c.polygon)).map(c => c.id))
    }
  }

  const handleWheel = (e) => {
    e.evt.preventDefault()
    const stage = e.target.getStage()
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    const t = computeWheelZoom({
      oldScale: stage.scaleX(),
      stageX: stage.x(),
      stageY: stage.y(),
      pointer,
      deltaY: e.evt.deltaY,
    })
    stage.scale({ x: t.scale, y: t.scale })
    stage.position({ x: t.x, y: t.y })
    stage.batchDraw()
    updateVisibleRect()
  }

  return (
    <div className="viewport-container" ref={containerRef} style={{ width: '100%', height: '100%' }}>
      {size.width > 0 && size.height > 0 && (
        <Stage
          ref={setStageRef}
          width={size.width}
          height={size.height}
          draggable={!viewportLocked}
          onWheel={viewportLocked ? (e) => e.evt.preventDefault() : handleWheel}
          onDragMove={updateVisibleRect}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          style={{ background: '#fafaf8' }}
        >
          <Layer>
            {workspace === 'panel-editor'
              ? <GridLayer />
              : <PatternLayer pattern={pattern} activeLayers={activeLayers} />}
            {dragRectState && (() => {
              const r = normalizeRect(dragRectState.x1, dragRectState.y1, dragRectState.x2, dragRectState.y2)
              return (
                <Rect
                  x={r.minX}
                  y={r.minY}
                  width={r.maxX - r.minX}
                  height={r.maxY - r.minY}
                  stroke="rgba(13, 110, 253, 0.6)"
                  strokeWidth={1}
                  strokeScaleEnabled={false}
                  listening={false}
                />
              )
            })()}
          </Layer>
        </Stage>
      )}
    </div>
  )
}