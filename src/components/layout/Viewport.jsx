import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Stage, Layer } from 'react-konva'
import useAppStore from '../../store/useAppStore.js'
import usePatternStore from '../../store/usePatternStore.js'
import PatternLayer, { getPatternBoundingBox } from '../pattern-editor/PatternLayer.jsx'
import PanelBoundary from '../pattern-editor/PanelBoundary.jsx'
import { computeZoomToFit, computeWheelZoom } from '../../scene/viewportMath.js'

export default function Viewport() {
  const containerRef = useRef(null)
  const stageRef = useRef(null)
  const [size, setSize] = useState({ width: 0, height: 0 }) // drives the <Stage> element's own pixel size
  const [stageMounted, setStageMounted] = useState(false)
  const activeLayers = useAppStore(s => s.activeLayers)
  const setViewportApi = useAppStore(s => s.setViewportApi)
  const activePatternId = usePatternStore(s => s.activePatternId)
  const getActivePattern = usePatternStore(s => s.getActivePattern)
  const pattern = getActivePattern()

  // Stage only mounts once size is known (see the conditional render below), so
  // stageRef.current is still null on the very first render pass — a plain ref
  // can't be a dependency, so this state flag is what lets the zoomToFit effect
  // below notice "the stage just became available" and actually run once, on
  // top of running on every pattern switch.
  const setStageRef = useCallback((node) => {
    stageRef.current = node
    setStageMounted(!!node)
  }, [])

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
    const bbox = getPatternBoundingBox(pattern)
    const t = computeZoomToFit(bbox, w, h)
    stage.scale({ x: t.scale, y: t.scale })
    stage.position({ x: t.x, y: t.y })
    stage.batchDraw()
  }, [pattern])

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

  // Zoom-to-fit on pattern switch (including the initial mount) — matches the
  // old behavior: panel-toggle resizes do NOT re-center/re-zoom, only switching
  // patterns (or the stage first becoming available) does, so the user's
  // pan/zoom survives a panel toggle. stageMounted is what fixes the original
  // bug: without it, this effect's only invocation on initial load happened
  // while the Stage hadn't mounted yet, so zoomToFit() silently no-op'd and
  // never got a second chance to run.
  useEffect(() => {
    zoomToFit()
  }, [activePatternId, stageMounted, zoomToFit])

  useEffect(() => {
    setViewportApi({ zoomToFit })
    return () => setViewportApi(null)
  }, [zoomToFit, setViewportApi])

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
  }

  return (
    <div className="viewport-container" ref={containerRef} style={{ width: '100%', height: '100%' }}>
      {size.width > 0 && size.height > 0 && (
        <Stage
          ref={setStageRef}
          width={size.width}
          height={size.height}
          draggable
          onWheel={handleWheel}
          style={{ background: '#fafaf8' }}
        >
          <Layer>
            <PanelBoundary />
            <PatternLayer pattern={pattern} activeLayers={activeLayers} />
          </Layer>
        </Stage>
      )}
    </div>
  )
}
