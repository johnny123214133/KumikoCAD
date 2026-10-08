import React, { useRef, useCallback, useState, useEffect } from 'react'
import useAppStore from '../../store/useAppStore.js'
import PatternLibrary from '../pattern-editor/PatternLibrary.jsx'
import RecentPatterns from '../pattern-editor/RecentPatterns.jsx'
import ViewControls from '../pattern-editor/ViewControls.jsx'

export default function LeftPanel() {
  const { leftPanelOpen, setLeftPanelOpen, leftPanelWidth, setLeftPanelWidth } = useAppStore()
  const dragRef = useRef(null)
  const handleRef = useRef(null)

  // Patterns / Recently Used split: the divider between them is draggable and sets the
  // height of the Recently Used section (the Patterns list takes the rest). It is only
  // a handle while that section is open — collapsed, it is just a rule.
  const { recentOpen, recentHeight, setRecentHeight } = useAppStore()
  const splitRef = useRef(null)
  const splitDrag = useRef(null)
  const [splitH, setSplitH] = useState(0)
  const [splitDragging, setSplitDragging] = useState(false)
  useEffect(() => {
    const el = splitRef.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(() => setSplitH(el.clientHeight))
    ro.observe(el)
    setSplitH(el.clientHeight)
    return () => ro.disconnect()
  }, [])
  const RECENT_MIN = 56, PATTERNS_MIN = 120
  const maxRecent = Math.max(RECENT_MIN, splitH - PATTERNS_MIN - 12)
  const shownRecent = Math.min(Math.max(recentHeight, RECENT_MIN), maxRecent)
  const onSplitDown = (e) => {
    e.preventDefault()
    splitDrag.current = { startY: e.clientY, startH: shownRecent }
    e.currentTarget.setPointerCapture(e.pointerId)
    setSplitDragging(true)
  }
  const onSplitMove = (e) => {
    if (!splitDrag.current) return
    const { startY, startH } = splitDrag.current
    setRecentHeight(Math.min(maxRecent, Math.max(RECENT_MIN, startH + (startY - e.clientY)))) // dragging up grows Recently Used
  }
  const onSplitUp = (e) => {
    splitDrag.current = null
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    setSplitDragging(false)
  }

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
        <div ref={splitRef} className="d-flex flex-column flex-grow-1" style={{ minHeight: 200 }}>
          <PatternLibrary />
          {recentOpen ? (
            <div
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize Patterns and Recently Used"
              title="Drag to resize"
              className={`split-handle${splitDragging ? ' dragging' : ''}`}
              onPointerDown={onSplitDown}
              onPointerMove={onSplitMove}
              onPointerUp={onSplitUp}
              onPointerCancel={onSplitUp}
            />
          ) : (
            <hr className="my-3 flex-shrink-0" />
          )}
          <div className="flex-shrink-0" style={{ height: recentOpen ? shownRecent : 'auto' }}>
            <RecentPatterns />
          </div>
        </div>
        <hr className="my-3 flex-shrink-0" />
        <ViewControls />
      </div>
    </div>
  )
}
