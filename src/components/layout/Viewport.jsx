import React, { useRef, useEffect } from 'react'
import { SceneManager } from '../../scene/SceneManager.js'
import { PatternRenderer } from '../../scene/PatternRenderer.js'
import useAppStore from '../../store/useAppStore.js'
import usePatternStore from '../../store/usePatternStore.js'

export default function Viewport() {
  const canvasRef = useRef(null)
  const smRef = useRef(null)
  const prRef = useRef(null)
  const activeLayers = useAppStore(s => s.activeLayers)
  const activePatternId = usePatternStore(s => s.activePatternId)
  const getActivePattern = usePatternStore(s => s.getActivePattern)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const sm = new SceneManager(canvas)
    smRef.current = sm
    const pr = new PatternRenderer(sm.scene)
    prRef.current = pr

    const ro = new ResizeObserver(() => {
      sm.onResize()
    })
    ro.observe(canvas.parentElement)
    sm.onResize()

    return () => {
      ro.disconnect()
      pr.dispose()
      sm.dispose()
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
