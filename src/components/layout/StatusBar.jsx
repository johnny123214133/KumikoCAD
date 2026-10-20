import React from 'react'
import useAppStore, { useCameraApi, is3dView } from '../../store/useAppStore.js'
import useCursorStore from '../../store/useCursorStore.js'
import useSelectionStore from '../../store/useSelectionStore.js'
import { toUnit } from '../../geometry/units.js'
import UnitToggle from '../shared/UnitToggle.jsx'

// The bar along the bottom: where the pointer is over the work, how far in the view is,
// what is selected, and the unit everything is shown in.
const PX_PER_MM_AT_100 = 96 / 25.4 // 100% = the work at its real size on a 96-dpi screen

const cell = { display: 'inline-flex', alignItems: 'baseline', gap: 6, whiteSpace: 'nowrap' }
const num = { fontVariantNumeric: 'tabular-nums', display: 'inline-block', textAlign: 'right' }

function Cursor({ unit }) {
  const point = useCursorStore((s) => s.point)
  const places = unit === 'in' ? 3 : 1
  const fmt = (mm) => toUnit(mm, unit).toFixed(places)
  return (
    <span style={cell} aria-label="Pointer position">
      <span className="text-muted">X</span><span style={{ ...num, minWidth: '6ch' }}>{point ? fmt(point.x) : '–'}</span>
      <span className="text-muted">Y</span><span style={{ ...num, minWidth: '6ch' }}>{point ? fmt(point.y) : '–'}</span>
      <span className="text-muted">{unit}</span>
    </span>
  )
}

function Selection({ workspace }) {
  const strips = useSelectionStore((s) => s.selectedStripIds.length)
  const cells = useSelectionStore((s) => s.selectedSpaceIds.length)
  const panel = workspace === 'panel-editor'
  const n = panel ? cells : strips
  const noun = panel ? (n === 1 ? 'cell' : 'cells') : (n === 1 ? 'strip' : 'strips')
  return <span style={cell} aria-live="polite">{n ? `${n} ${noun} selected` : <span className="text-muted">Nothing selected</span>}</span>
}

export default function StatusBar() {
  const workspace = useAppStore((s) => s.workspace)
  const unit = useAppStore((s) => s.gridUnit)
  const zoom = useAppStore((s) => s.viewportZoom)
  const rectWorkspace = useAppStore((s) => s.viewportRectWorkspace)
  const api = useCameraApi()
  const in3d = useAppStore(is3dView)
  const canvas = workspace !== 'parts-list'
  const pct = !in3d && zoom > 0 && rectWorkspace === workspace ? Math.round((zoom / PX_PER_MM_AT_100) * 100) : null
  return (
    <footer
      className="kumiko-statusbar d-flex align-items-center gap-3 px-3"
      style={{ flexShrink: 0, minHeight: 28, fontSize: 12, zIndex: 100, columnGap: '1.25rem', overflow: 'hidden' }}
    >
      {canvas && <Cursor unit={unit} />}
      {(
        <button
          type="button"
          className="btn btn-link p-0 text-decoration-none"
          style={{ ...cell, fontSize: 12, color: 'inherit' }}
          title="Zoom — 100% is the real size on a 96 dpi screen. Click to zoom to fit."
          aria-label={pct != null ? `Zoom ${pct} percent. Zoom to fit` : 'Zoom to fit'}
          disabled={!api}
          onClick={() => api?.zoomToFit()}
        >
          <span className="text-muted">Zoom</span><span style={{ ...num, minWidth: '4ch' }}>{pct != null ? `${pct}%` : '–'}</span>
        </button>
      )}
      {canvas && <Selection workspace={workspace} />}
      <span className="ms-auto d-inline-flex align-items-center gap-2">
        <span className="text-muted">Units</span>
        <UnitToggle />
      </span>
    </footer>
  )
}
