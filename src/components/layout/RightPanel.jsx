import React, { useRef, useCallback } from 'react'
import useAppStore from '../../store/useAppStore.js'
import Inspector from '../inspector/Inspector.jsx'
import GridInspector from '../panel-editor/GridInspector.jsx'

export default function RightPanel() {
  const { workspace, rightPanelOpen, setRightPanelOpen, rightPanelWidth, setRightPanelWidth } = useAppStore()
  const dragRef = useRef(null)
  const handleRef = useRef(null)

  const onPointerDown = useCallback((e) => {
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startWidth: rightPanelWidth }
    handleRef.current?.setPointerCapture(e.pointerId)
    handleRef.current?.classList.add('dragging')
  }, [rightPanelWidth])

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current) return
    const { startX, startWidth } = dragRef.current
    setRightPanelWidth(startWidth - (e.clientX - startX)) // dragging the left edge leftward grows a right panel
  }, [setRightPanelWidth])

  const onPointerUp = useCallback((e) => {
    dragRef.current = null
    handleRef.current?.releasePointerCapture(e.pointerId)
    handleRef.current?.classList.remove('dragging')
  }, [])

  return (
    <div
      className="side-panel right"
      style={{ width: rightPanelOpen ? rightPanelWidth : 0, minWidth: rightPanelOpen ? rightPanelWidth : 0 }}
    >
      <button className="panel-toggle-btn" onClick={() => setRightPanelOpen(!rightPanelOpen)}>
        {rightPanelOpen ? '▶' : '◀'}
      </button>
      <div
        ref={handleRef}
        className="resize-handle"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
      {/* Always mounted — see custom.css's .side-panel comment. */}
      <div className="p-3 d-flex flex-column flex-grow-1 overflow-auto" style={{ minHeight: 0 }}>
        {workspace === 'panel-editor' ? <GridInspector /> : <Inspector />}
      </div>
    </div>
  )
}
