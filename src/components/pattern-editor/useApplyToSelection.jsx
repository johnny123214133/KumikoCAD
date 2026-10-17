import React, { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import useAppStore from '../../store/useAppStore.js'
import useGridStore from '../../store/useGridStore.js'
import useSelectionStore from '../../store/useSelectionStore.js'

// Panel editor: hovering a pattern card in the library / Recently Used list,
// while cells are selected, opens a small menu to the right of the card with
// an "Apply to Current Selection" button — places that pattern in every
// selected cell (without switching tools or changing the active pattern).
// Returns:
//   hoverProps(pattern) — spread onto the `.pattern-card` wrapper;
//   applyMenu           — render once (a portal; null when closed).
const CLOSE_DELAY_MS = 180
// dataTransfer type for a library card being dragged onto the panel (Viewport.jsx).
export const PATTERN_DRAG_TYPE = 'application/x-kumiko-pattern'

export default function useApplyToSelection() {
  const workspace = useAppStore((s) => s.workspace)
  const selectedCount = useSelectionStore((s) => s.selectedSpaceIds.length)
  const [open, setOpen] = useState(null) // { pattern, top, left }
  const timer = useRef(null)
  const enabled = workspace === 'panel-editor' && selectedCount > 0

  const cancelClose = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null } }
  const scheduleClose = useCallback(() => {
    cancelClose()
    timer.current = setTimeout(() => setOpen(null), CLOSE_DELAY_MS)
  }, [])
  useEffect(() => () => cancelClose(), [])
  // Selection emptied or workspace switched while open: close.
  useEffect(() => { if (!enabled) setOpen(null) }, [enabled])

  const hoverProps = (pattern) => !enabled ? {} : {
    onMouseEnter: (e) => {
      cancelClose()
      const r = e.currentTarget.getBoundingClientRect()
      setOpen({ pattern, top: r.top, left: r.right + 4, height: r.height })
    },
    onMouseLeave: scheduleClose,
  }

  // Dragging a card onto the panel applies the pattern to the selected cells. In
  // the panel editor every card is draggable; the hover menu closes while dragging.
  const panelDraggable = workspace === 'panel-editor'
  const startPanelDrag = (e, pattern) => {
    cancelClose()
    setOpen(null)
    try {
      e.dataTransfer.setData(PATTERN_DRAG_TYPE, pattern.id)
      e.dataTransfer.effectAllowed = 'copyMove'
    } catch { /* ignore */ }
  }

  const apply = () => {
    const ids = useSelectionStore.getState().selectedSpaceIds
    useGridStore.getState().setSpacesPattern(ids, open.pattern.id)
    setOpen(null)
  }

  const applyMenu = enabled && open && createPortal(
    <div
      role="menu"
      className="card shadow-sm p-1"
      style={{ position: 'fixed', top: open.top, left: open.left, zIndex: 1000 }}
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
    >
      <button type="button" role="menuitem" className="btn btn-sm btn-outline-secondary text-nowrap" onClick={apply}>
        Apply to Current Selection
      </button>
    </div>,
    document.body,
  )

  return { hoverProps, applyMenu, panelDraggable, startPanelDrag }
}
