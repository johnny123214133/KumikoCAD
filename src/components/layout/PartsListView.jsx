import React from 'react'
import useAppStore from '../../store/useAppStore.js'
import usePartsStore from '../../store/usePartsStore.js'
import { useSelectedProfile } from '../parts/PartsProfileLayer.jsx'

// The Parts List editor's canvas is drawn by PartsProfileLayer (the Top, Side and Bottom profiles
// of the piece picked in the list). This is what sits over it until a piece is picked.
export default function PartsListView() {
  const { found } = useSelectedProfile()
  const picked = usePartsStore((s) => s.selectedKey != null)
  const leftOpen = useAppStore((s) => s.leftPanelOpen)
  const leftWidth = useAppStore((s) => s.leftPanelWidth)
  const rightOpen = useAppStore((s) => s.rightPanelOpen)
  const rightWidth = useAppStore((s) => s.rightPanelWidth)
  if (found) return null
  return (
    <div
      className="d-flex align-items-center justify-content-center text-muted text-center small"
      style={{ position: 'absolute', inset: 0, paddingLeft: leftOpen ? leftWidth : 0, paddingRight: rightOpen ? rightWidth : 0, pointerEvents: 'none' }}
    >
      <span>{picked ? 'That piece is no longer in the panel.' : 'Pick a piece in the list to see its top, side and bottom profiles.'}</span>
    </div>
  )
}
