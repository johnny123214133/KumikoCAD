import React, { useRef, useCallback } from 'react'
import useAppStore from '../../store/useAppStore.js'
import PatternLibrary from '../pattern-editor/PatternLibrary.jsx'
import RecentPatterns from '../pattern-editor/RecentPatterns.jsx'
import ViewControls from '../pattern-editor/ViewControls.jsx'

export default function LeftPanel() {
  const { leftPanelOpen, setLeftPanelOpen, leftPanelWidth, setLeftPanelWidth } = useAppStore()
  const dragRef = useRef(null)
  const handleRef = useRef(null)

  const onPointerDown = useCallback((e) => {
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startWidth: leftPanelWidth }
    handleRef.current?.setPointerCapture(e.pointerId)
    handleRef.current?.classList.add('dragging')
  }, [leftPanelWidth])

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current) return
    const { startX, startWidth } = dragRef.current
    setLeftPanelWidth(startWidth + (e.clientX - startX)) // dragging the right edge rightward grows a left panel
  }, [setLeftPanelWidth])

  const onPointerUp = useCallback((e) => {
    dragRef.current = null
    handleRef.current?.releasePointerCapture(e.pointerId)
    handleRef.current?.classList.remove('dragging')
  }, [])

  return (
    <div
      className="side-panel"
      style={{ width: leftPanelOpen ? leftPanelWidth : 0, minWidth: leftPanelOpen ? leftPanelWidth : 0 }}
    >
      <button className="panel-toggle-btn" onClick={() => setLeftPanelOpen(!leftPanelOpen)}>
        {leftPanelOpen ? '◀' : '▶'}
      </button>
      <div
        ref={handleRef}
        className="resize-handle"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
      {/* Always mounted (not conditional on leftPanelOpen) — see custom.css's
          .side-panel comment for why: this is what makes close animate the
          same way open does, instead of content vanishing instantly. */}
      <div className="p-3 d-flex flex-column flex-grow-1 overflow-auto" style={{ minHeight: 0 }}>
        <PatternLibrary />
        <hr className="my-3 flex-shrink-0" />
        <RecentPatterns />
        <hr className="my-3 flex-shrink-0" />
        <ViewControls />
      </div>
    </div>
  )
}
