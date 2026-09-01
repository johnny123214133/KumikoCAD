import React, { useRef, useEffect } from 'react'
import { SceneManager } from '../../scene/SceneManager.js'
import { PatternRenderer } from '../../scene/PatternRenderer.js'
import { PanelRenderer } from '../../scene/PanelRenderer.js'
import useAppStore from '../../store/useAppStore.js'
import usePatternStore from '../../store/usePatternStore.js'

export default function Viewport() {
  const canvasRef = useRef(null)
  const smRef = useRef(null)
  const prRef = useRef(null)
  const panelRef = useRef(null)
  const activeLayers = useAppStore(s => s.activeLayers)
  const setViewportApi = useAppStore(s => s.setViewportApi)
  const activePatternId = usePatternStore(s => s.activePatternId)
  const getActivePattern = usePatternStore(s => s.getActivePattern)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const sm = new SceneManager(canvas)
    smRef.current = sm
    const pr = new PatternRenderer(sm.scene)
    prRef.current = pr
    // Was never instantiated before — acceptance criterion #7 (panel rectangle
    // placeholder) silently failed. Renders the 300x400mm default per the plan;
    // TODO (unchanged from PanelRenderer.js): replace with grid tiling once
    // computeGridGeometry() is implemented.
    const panel = new PanelRenderer(sm.scene)
    panel.setDimensions()
    panelRef.current = panel

    const ro = new ResizeObserver(() => {
      sm.onResize()
    })
    ro.observe(canvas.parentElement)
    sm.onResize()

    // Publish a handle so ViewControls (left panel) can trigger zoom-to-fit —
    // previously the button existed but was permanently disabled.
    setViewportApi({
      zoomToFit: () => sm.zoomToFit(pr.getBoundingBox(getActivePattern())),
    })

    return () => {
      ro.disconnect()
      pr.dispose()
      panel.dispose()
      sm.dispose()
      setViewportApi(null)
    }
  }, [])

  useEffect(() => {
    const pr = prRef.current
    const sm = smRef.current
    if (!pr || !sm) return
    const pattern = getActivePattern()
    pr.setPattern(pattern)
    pr.applyLayers(activeLayers)
    sm.zoomToFit(pr.getBoundingBox(pattern))
  }, [activePatternId])

  useEffect(() => {
    const pr = prRef.current
    if (!pr) return
    pr.applyLayers(activeLayers)
  }, [activeLayers])

  return (
    <div className="viewport-container">
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
