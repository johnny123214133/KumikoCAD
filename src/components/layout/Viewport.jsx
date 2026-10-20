import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Stage, Layer, Rect } from 'react-konva'
import useAppStore from '../../store/useAppStore.js'
import usePatternStore from '../../store/usePatternStore.js'
import useGridStore from '../../store/useGridStore.js'
import useSelectionStore from '../../store/useSelectionStore.js'
import { useTheme } from '../../store/useThemeStore.js'
import PatternLayer, { getPatternBoundingBox } from '../pattern-editor/PatternLayer.jsx'
import GridLayer from '../panel-editor/GridLayer.jsx'
import { computeGridGeometry } from '../../geometry/grid/computeGridGeometry.js'
import { computeZoomToFit, computeWheelZoom, clampZoom } from '../../scene/viewportMath.js'
import { PATTERN_DRAG_TYPE } from '../pattern-editor/useApplyToSelection.jsx'
import { createPlacementStroke, sampleStepFor } from '../../scene/placementStroke.js'
import { flagDragGesture } from '../../scene/gestureGuard.js'
import { normalizeRect, rectTouchesPolygon } from '../../geometry/rectSelect.js'
import { isOutsidePanel, isOutsideTriangle } from '../../scene/clickOutside.js'
import MiniMap from './MiniMap.jsx'
import PartsOverview from '../parts/PartsOverview.jsx'
import CanvasControls from './CanvasControls.jsx'
import useCursorStore from '../../store/useCursorStore.js'
import PartsListView from './PartsListView.jsx'
import PieceView3D from '../parts/PieceView3D.jsx'
import PartsProfileLayer, { useSelectedProfile } from '../parts/PartsProfileLayer.jsx'
import usePartsStore from '../../store/usePartsStore.js'
import CanvasLoader from './CanvasLoader.jsx'
import { paintCells } from '../../store/paintActions.js'
import { fillCursor } from '../../scene/fillCursor.js'
import { getMaterialColor } from '../../geometry/woodFinishColors.js'

export default function Viewport() {
  const containerRef = useRef(null)
  const stageRef = useRef(null)
  const [size, setSize] = useState({ width: 0, height: 0 }) // drives the <Stage> element's own pixel size
  const [stageMounted, setStageMounted] = useState(false)
  // False until the stage exists and has drawn its first fitted frame; until then (if that
  // takes a moment) the canvas area shows the loading animation.
  const [ready, setReady] = useState(false)
  const workspace = useAppStore(s => s.workspace)
  const theme = useTheme()
  useAppStore(s => s.gridUnit) // ratio-based pattern parameters are built on the unit's rounding grid
  const activeTool = useAppStore(s => s.activeTool)
  const paintMaterial = useGridStore(s => s.paintMaterial)
  const paintFinish = useGridStore(s => s.paintFinish)
  const activeLayers = useAppStore(s => s.activeLayers)
  const setViewportApi = useAppStore(s => s.setViewportApi)
  const setViewportVisibleRect = useAppStore(s => s.setViewportVisibleRect)
  const viewportLocked = useAppStore(s => s.viewportLocked)
  const leftPanelOpen = useAppStore(s => s.leftPanelOpen)
  const leftPanelWidth = useAppStore(s => s.leftPanelWidth)
  const rightPanelOpen = useAppStore(s => s.rightPanelOpen)
  const partsView = useAppStore(s => s.partsView)
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
  // The Parts List's selected piece, laid out in its three views (zoom to fit frames them).
  const { layout: profileLayoutNow } = useSelectedProfile()
  const profileRef = useRef(profileLayoutNow)
  useEffect(() => { profileRef.current = profileLayoutNow }, [profileLayoutNow])
  const selectedPartKey = usePartsStore((s) => s.selectedKey)
  const { cols, rows, cellWidth, gridStripWidth, borderWidth, orientation, cornerBehavior } = useGridStore()

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
  const workspaceRef = useRef(workspace)
  useEffect(() => { workspaceRef.current = workspace }, [workspace])
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
      setViewportVisibleRect({ minX: kx0, maxX: kx1, minY: -ky1, maxY: -ky0 }, scale, workspaceRef.current)
    })
  }, [setViewportVisibleRect])

  // Moves the camera so the point (Konva-local coordinates) is in the middle of what is
  // visible between the side panels, keeping the zoom. Used by the overview window; it works
  // whatever the viewport lock says (the lock is about dragging the canvas).
  const panTo = useCallback((x, y) => {
    const stage = stageRef.current
    const container = containerRef.current
    if (!stage || !container) return
    const { leftPanelOpen, leftPanelWidth, rightPanelOpen, rightPanelWidth } = panelStateRef.current
    const l = leftPanelOpen ? leftPanelWidth : 0
    const r = rightPanelOpen ? rightPanelWidth : 0
    const cx = l + (container.clientWidth - l - r) / 2
    const cy = container.clientHeight / 2
    const s = stage.scaleX()
    stage.position({ x: cx - x * s, y: cy - y * s })
    stage.batchDraw()
    updateVisibleRect()
  }, [updateVisibleRect])

  // Zooms about the middle of what is visible between the side panels (the zoom buttons).
  const zoomBy = useCallback((factor) => {
    const stage = stageRef.current
    const container = containerRef.current
    if (!stage || !container) return
    const { leftPanelOpen, leftPanelWidth, rightPanelOpen, rightPanelWidth } = panelStateRef.current
    const l = leftPanelOpen ? leftPanelWidth : 0
    const r = rightPanelOpen ? rightPanelWidth : 0
    const cx = l + (container.clientWidth - l - r) / 2
    const cy = container.clientHeight / 2
    const old = stage.scaleX()
    const next = clampZoom(old * factor)
    const wx = (cx - stage.x()) / old
    const wy = (cy - stage.y()) / old
    stage.scale({ x: next, y: next })
    stage.position({ x: cx - wx * next, y: cy - wy * next })
    stage.batchDraw()
    updateVisibleRect()
  }, [updateVisibleRect])

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
    let bbox
    if (workspace === 'parts-list') {
      const lay = profileRef.current
      if (!lay) return
      // (the layout is y down; the fit works in y up) with room to the left for the views' names
      const room = Math.max(8, lay.length * 0.08)
      bbox = { minX: lay.bounds.minX - room, maxX: lay.bounds.maxX, minY: -lay.bounds.maxY, maxY: -lay.bounds.minY }
    } else if (workspace === 'panel-editor') {
      const { width, height } = computeGridGeometry({ cols, rows, cellWidth, orientation, cornerBehavior }).bounds
      bbox = { minX: 0, maxX: width, minY: 0, maxY: height }
    } else {
      bbox = getPatternBoundingBox(patternRef.current, gridStripWidth)
    }
    // Show Scale puts a ruler below (and, in the panel, left of) the work: leave room.
    if (useAppStore.getState().activeLayers.showScale) {
      const room = 0.12 * Math.max(bbox.maxX - bbox.minX, bbox.maxY - bbox.minY)
      bbox = { ...bbox, minY: bbox.minY - room, minX: workspace === 'panel-editor' ? bbox.minX - room : bbox.minX }
    }
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
  //
  // The panel editor's camera (zoom and position) is remembered while you are in the
  // pattern editor and put back when you return, so a close-up of one part of a big
  // panel isn't thrown away each time. It is only put back if the panel's layout is the
  // same as when you left (changing the grid's size, cell width, orientation or corner
  // type re-fits it as before), and zoomToFit (the Z key, the View button) refits as usual.
  const panelKeyRef = useRef('')
  const panelCameraRef = useRef(null) // { key, scale, x, y } | null
  const prevWorkspaceRef = useRef(null)
  useEffect(() => {
    const stage = stageRef.current
    const switched = prevWorkspaceRef.current !== workspace
    const key = `${cols}|${rows}|${cellWidth}|${orientation}|${cornerBehavior}`
    // Leaving the panel editor: the stage still holds its camera, so take it now.
    if (switched && prevWorkspaceRef.current === 'panel-editor' && stage) {
      const pos = stage.position()
      panelCameraRef.current = { key: panelKeyRef.current, scale: stage.scaleX(), x: pos.x, y: pos.y }
    }
    prevWorkspaceRef.current = workspace
    panelKeyRef.current = key
    const saved = panelCameraRef.current
    if (switched && workspace === 'panel-editor' && stage && saved && saved.key === key) {
      stage.scale({ x: saved.scale, y: saved.scale })
      stage.position({ x: saved.x, y: saved.y })
      stage.batchDraw()
      updateVisibleRect()
    } else {
      zoomToFit()
    }
  }, [workspace, cols, rows, cellWidth, orientation, cornerBehavior, stageMounted, zoomToFit, updateVisibleRect])

  useEffect(() => {
    if (ready || !stageMounted) return undefined
    let a = requestAnimationFrame(() => { a = requestAnimationFrame(() => setReady(true)) })
    return () => cancelAnimationFrame(a)
  }, [ready, stageMounted])

  // Separately: in pattern-editor specifically, switching which pattern is
  // open for editing SHOULD refit (you're now looking at a different shape).
  // Guarded by a ref rather than listing `workspace` as a dependency so this
  // doesn't ALSO re-fire on workspace switches — the effect above already
  // handles those.
  useEffect(() => {
    if (workspaceRef.current === 'pattern-editor') zoomToFit()
  }, [activePatternId, zoomToFit])
  // The Parts List: choosing another kind of piece shows it fitted, too.
  useEffect(() => {
    if (workspaceRef.current === 'parts-list') zoomToFit()
  }, [selectedPartKey, zoomToFit])

  useEffect(() => {
    setViewportApi({ zoomToFit, panTo, zoomBy })
    return () => setViewportApi(null)
  }, [zoomToFit, panTo, zoomBy, setViewportApi])

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

  // Place Pattern, click-and-drag: the active pattern goes into every cell the
  // cursor passes over (scene/placementStroke.js batches the updates). Only with
  // the viewport locked — unlocked, a drag pans the view instead.
  const strokeRef = useRef(null) // { stroke, stage, stop } | null
  const endStroke = () => {
    const cur = strokeRef.current
    strokeRef.current = null
    if (!cur) return
    window.removeEventListener('mouseup', cur.stop)
    const pointer = cur.stage.getPointerPosition?.()
    cur.stroke.end(pointer ? toKonvaLocal(cur.stage, pointer) : undefined)
  }

  const startStroke = (e, tool) => {
    if (e.evt?.button != null && e.evt.button !== 0) return
    const stage = e.target.getStage()
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    const inPanel = workspace === 'panel-editor'
    const select = useSelectionStore.getState
    // Drag select selects cells (strips in the pattern editor). A plain stroke
    // replaces the old selection (as Multi-select's rectangle does) — so pressing
    // on empty canvas, where it reaches nothing, clears it; with shift held the
    // stroke appends to the selection instead.
    if (tool === 'drag-select' && !e.evt?.shiftKey) select().clearSelection()
    const getCells = () => (inPanel ? select().selectableSpaces : select().selectableStrips)
    const apply = tool === 'place-pattern'
      // Place Pattern: the active pattern goes into the cells.
      ? (ids) => useGridStore.getState().setSpacesPattern(ids, usePatternStore.getState().activePatternId)
      : tool === 'fill-paint'
        // Fill / paint: the brush's wood and finish go onto the cells (or strips).
        ? (ids) => {
            if (inPanel) return paintCells(ids)
            const { paintMaterial, paintFinish } = useGridStore.getState()
            const { activePatternId, paintStrips } = usePatternStore.getState()
            paintStrips(activePatternId, ids, paintMaterial, paintFinish)
          }
        : (ids) => (inPanel ? select().addSpacesToSelection(ids) : select().addStripsToSelection(ids))
    const stroke = createPlacementStroke({
      getCells,
      topOnly: tool === 'fill-paint',
      // Cells are sampled a sixth of a cell apart; strips are a couple of mm wide,
      // so they need a step matched to the thinnest one.
      getStep: () => (inPanel ? useGridStore.getState().cellWidth / 6 : sampleStepFor(getCells())),
      apply,
    })
    // Released outside the canvas: the stroke still ends.
    const stop = () => endStroke()
    strokeRef.current = { stroke, stage, stop }
    window.addEventListener('mouseup', stop)
    stroke.start(toKonvaLocal(stage, pointer))
  }

  // Selection and Multi-select: a plain click on empty canvas — outside the
  // panel / the pattern — clears the selection. The press is remembered here and
  // judged on release, so a drag (a pan, or Multi-select's rectangle) isn't a click.
  const pressRef = useRef(null) // { screenX, screenY, outside } | null
  const isOutsideWork = (world) => {
    if (workspace === 'panel-editor') {
      // the border's outer face is the edge of the work (it can stand well out from the nominal edge)
      return isOutsidePanel(useSelectionStore.getState().selectableSpaces, Math.max(gridStripWidth / 2, borderWidth), world.x, world.y)
    }
    const { A, B, C } = pattern.vertices
    return isOutsideTriangle([A.x, -A.y, B.x, -B.y, C.x, -C.y], gridStripWidth / 2, world.x, world.y)
  }

  const handleStageMouseDown = (e) => {
    if (workspace === 'parts-list') return // nothing to select or draw on in the Parts List
    // Ctrl / Cmd + click on the panel applies the current pattern to the selection (GridLayer):
    // it isn't the start of a stroke, a drag rectangle or a click on empty canvas.
    if (workspace === 'panel-editor' && (e.evt?.ctrlKey || e.evt?.metaKey)) return
    // Fill / paint: a click that is not on a cell or strip (where the bucket cursor is not showing)
    // hands the canvas back to the Selection tool instead of painting nothing.
    if (activeTool === 'fill-paint' && viewportLocked) {
      const stage = e.target.getStage()
      const over = e.target !== stage && e.target.listening?.() !== false
      if (!over) { stage.container().style.cursor = ''; useAppStore.getState().selectTool('selection'); return }
    }
    if (viewportLocked && ((activeTool === 'place-pattern' && workspace === 'panel-editor') || activeTool === 'drag-select' || activeTool === 'fill-paint')) {
      return startStroke(e, activeTool)
    }
    if (activeTool !== 'selection' && activeTool !== 'multi-select') return
    if (e.evt?.button != null && e.evt.button !== 0) return
    const stage = e.target.getStage()
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    const world = toKonvaLocal(stage, pointer)
    pressRef.current = { screenX: pointer.x, screenY: pointer.y, outside: isOutsideWork(world), shift: !!e.evt?.shiftKey }
    if (activeTool !== 'multi-select') return
    dragAnchorRef.current = { worldX: world.x, worldY: world.y, screenX: pointer.x, screenY: pointer.y }
    setDragRectState({ x1: world.x, y1: world.y, x2: world.x, y2: world.y })
  }

  // Fill / paint: over a cell or strip the cursor is a pouring paint bucket in the
  // brush's colour. Over empty canvas it is the normal arrow.
  // Leaving Fill / paint, or the canvas, puts the cursor back.
  useEffect(() => {
    if (activeTool === 'fill-paint' && viewportLocked) return undefined
    const c = stageRef.current?.container?.()
    if (c) c.style.cursor = ''
    return undefined
  }, [activeTool, viewportLocked])
  const handleStageMouseLeave = (e) => {
    if (activeTool === 'fill-paint') e.target.getStage().container().style.cursor = ''
    useCursorStore.getState().setPoint(null)
  }

  // The pointer's place in the work (mm, y up), for the status bar — at most once a frame.
  const cursorRaf = useRef(0)
  useEffect(() => () => cancelAnimationFrame(cursorRaf.current), [])
  useEffect(() => { useCursorStore.getState().setPoint(null) }, [workspace])
  const publishCursor = (stage) => {
    if (cursorRaf.current) return
    cursorRaf.current = requestAnimationFrame(() => {
      cursorRaf.current = 0
      const p = stage.getPointerPosition()
      if (!p) return
      const s = stage.scaleX(), pos = stage.position()
      useCursorStore.getState().setPoint({ x: (p.x - pos.x) / s, y: -((p.y - pos.y) / s) })
    })
  }

  const handleStageMouseMove = (e) => {
    if (workspace === 'parts-list') return
    publishCursor(e.target.getStage())
    if (activeTool === 'fill-paint' && viewportLocked) {
      const stage = e.target.getStage()
      const over = e.target !== stage && e.target.listening?.() !== false
      stage.container().style.cursor = over ? fillCursor(getMaterialColor(paintMaterial, paintFinish)) : ''
    }
    if (strokeRef.current) {
      const stage = e.target.getStage()
      const pointer = stage.getPointerPosition()
      if (pointer) strokeRef.current.stroke.move(toKonvaLocal(stage, pointer))
      return
    }
    if (activeTool !== 'multi-select' || !dragAnchorRef.current) return
    const stage = e.target.getStage()
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    const world = toKonvaLocal(stage, pointer)
    const a = dragAnchorRef.current
    setDragRectState({ x1: a.worldX, y1: a.worldY, x2: world.x, y2: world.y })
  }

  const handleStageMouseUp = (e) => {
    if (workspace === 'parts-list') return
    if (strokeRef.current) return endStroke()
    const press = pressRef.current
    pressRef.current = null
    const anchor = dragAnchorRef.current
    dragAnchorRef.current = null
    setDragRectState(null)
    if (activeTool !== 'selection' && activeTool !== 'multi-select') return
    const stage = e.target.getStage()
    const pointer = stage.getPointerPosition()
    if (!pointer || !press) return
    const screenDist = Math.hypot(pointer.x - press.screenX, pointer.y - press.screenY)
    if (screenDist < DRAG_THRESHOLD_PX) {
      // A plain click: on a cell/strip the shape's own onClick already handled it;
      // on empty canvas there is no shape, so the selection is cleared here (unless
      // shift is held — shift only ever adds).
      if (press.outside && !press.shift) useSelectionStore.getState().clearSelection()
      return
    }
    // A drag: the click Konva fires on the shape under the cursor next must not toggle it.
    flagDragGesture()
    if (activeTool !== 'multi-select' || !anchor) return
    const world = toKonvaLocal(stage, pointer)
    const rect = normalizeRect(anchor.worldX, anchor.worldY, world.x, world.y)
    const sel = useSelectionStore.getState()
    // Shift + drag adds what the rectangle touches to the selection; otherwise it replaces it.
    if (workspace === 'panel-editor') {
      const ids = sel.selectableSpaces.filter(c => rectTouchesPolygon(rect, c.polygon)).map(c => c.id)
      if (press.shift) sel.addSpacesToSelection(ids); else sel.setSpaceSelection(ids)
    } else {
      const ids = sel.selectableStrips.filter(c => rectTouchesPolygon(rect, c.polygon)).map(c => c.id)
      if (press.shift) sel.addStripsToSelection(ids); else sel.setStripSelection(ids)
    }
  }

  // A pattern dragged from the library and dropped anywhere on the panel goes into
  // the currently selected cells (the whole panel is the drop target, so a slightly
  // off drop still lands, while a stray drag from the library with nothing selected
  // does nothing — the cursor shows "not allowed" for it).
  const dragIsPattern = (e) => workspace === 'panel-editor'
    && Array.from(e.dataTransfer?.types ?? []).includes(PATTERN_DRAG_TYPE)
    && useSelectionStore.getState().selectedSpaceIds.length > 0
  const handlePatternDragOver = (e) => {
    if (!dragIsPattern(e)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }
  const handlePatternDrop = (e) => {
    if (!dragIsPattern(e)) return
    e.preventDefault()
    const id = e.dataTransfer.getData(PATTERN_DRAG_TYPE)
    if (id) useGridStore.getState().setSpacesPattern(useSelectionStore.getState().selectedSpaceIds, id)
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
    <div
      className="viewport-container"
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
      onDragOver={handlePatternDragOver}
      onDrop={handlePatternDrop}
    >
      {size.width > 0 && size.height > 0 && (
        <Stage
          ref={setStageRef}
          width={size.width}
          height={size.height}
          draggable={workspace === 'parts-list' || !viewportLocked}
          onWheel={viewportLocked && workspace !== 'parts-list' ? (e) => e.evt.preventDefault() : handleWheel}
          onDragMove={updateVisibleRect}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseLeave={handleStageMouseLeave}
          onMouseUp={handleStageMouseUp}
          style={{ background: theme.canvas.bg }}
        >
          <Layer>
            {workspace === 'panel-editor'
              ? <GridLayer />
              : workspace === 'parts-list' ? <PartsProfileLayer />
              : <PatternLayer pattern={pattern} activeLayers={activeLayers} />}
            {dragRectState && (() => {
              const r = normalizeRect(dragRectState.x1, dragRectState.y1, dragRectState.x2, dragRectState.y2)
              return (
                <Rect
                  x={r.minX}
                  y={r.minY}
                  width={r.maxX - r.minX}
                  height={r.maxY - r.minY}
                  stroke={theme.canvas.marquee}
                  strokeWidth={1}
                  strokeScaleEnabled={false}
                  listening={false}
                />
              )
            })()}
          </Layer>
        </Stage>
      )}
      {!ready && <CanvasLoader delayMs={200} />}
      {/* Zoomed far in: a small overview of the whole panel / pattern with the visible part boxed. */}
      {workspace !== 'parts-list' ? <MiniMap workspace={workspace} pattern={pattern} /> : <PartsOverview />}
      {workspace === 'parts-list' && partsView === '3d' && <PieceView3D />}
      <CanvasControls workspace={workspace} />
      {/* The Parts List's canvas draws the selected piece's profiles; until one is picked it says so. */}
      {workspace === 'parts-list' && <PartsListView />}
    </div>
  )
}