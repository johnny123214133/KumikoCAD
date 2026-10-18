import React from 'react'
import useAppStore from '../../store/useAppStore.js'
import useGridStore from '../../store/useGridStore.js'
import useSelectionStore from '../../store/useSelectionStore.js'
import usePatternStore from '../../store/usePatternStore.js'
import { paintCells } from '../../store/paintActions.js'
import { useTheme } from '../../store/useThemeStore.js'
import { WOOD_OPTIONS, FINISH_OPTIONS } from '../../geometry/materials.js'
import ColorSwatchLine from '../shared/ColorSwatchLine.jsx'
import ThemedSelect, { asOptions } from '../shared/ThemedSelect.jsx'
import { ZoomFitIcon, ZoomInIcon, ZoomOutIcon } from './icons.jsx'
import useSlide, { SLIDE_MS, prefersReducedMotion } from './useSlide.js'
import { keyFor } from './keyBindings.js'

// Controls floating over the bottom-right of the canvas, clear of the right panel whatever its
// width: always the zoom buttons, and above them the Fill panel, which slides up into view
// while the Fill / paint tool is active and back down when it isn't (the same motion as the
// overview window in the bottom-left corner).
const ZOOM_STEP = 1.25
const MARGIN = 12
const CLUSTER_H = 34

const cardStyle = (ui) => ({
  background: ui.panel, border: `1px solid ${ui.borderStrong}`, borderRadius: 6, boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
})

function useRightOffset() {
  const open = useAppStore((s) => s.rightPanelOpen)
  const width = useAppStore((s) => s.rightPanelWidth)
  return (open ? width : 0) + MARGIN
}

function ZoomCluster({ right }) {
  const { ui } = useTheme()
  const api = useAppStore((s) => s.viewportApi)
  const reduced = prefersReducedMotion()
  const btn = (label, Icon, run, title) => (
    <button type="button" className="btn btn-sm btn-outline-secondary border-0" style={{ padding: '4px 8px' }} aria-label={label} title={title ?? label} disabled={!api} onClick={run}>
      <Icon />
    </button>
  )
  return (
    <div
      data-canvas-zoom
      role="group"
      aria-label="Zoom"
      style={{ position: 'absolute', bottom: MARGIN, right, zIndex: 5, display: 'flex', height: CLUSTER_H, alignItems: 'center', transition: reduced ? 'none' : 'right 220ms ease', ...cardStyle(ui) }}
    >
      {btn('Zoom out', ZoomOutIcon, () => api?.zoomBy(1 / ZOOM_STEP))}
      {btn('Zoom to fit', ZoomFitIcon, () => api?.zoomToFit(), `Zoom to fit${keyFor('zoom-fit') ? ` (${keyFor('zoom-fit')})` : ''}`)}
      {btn('Zoom in', ZoomInIcon, () => api?.zoomBy(ZOOM_STEP))}
    </div>
  )
}

// The wood and finish the Fill / paint tool applies, a swatch of the result, and the
// "apply to selected" buttons (actions on the selection — they leave the tool and the
// selection as they are).
function FillPanel({ right, workspace }) {
  const { ui } = useTheme()
  const active = useAppStore((s) => s.activeTool === 'fill-paint')
  const { render, shown } = useSlide(active)
  const paintMaterial = useGridStore((s) => s.paintMaterial)
  const paintFinish = useGridStore((s) => s.paintFinish)
  const setPaintMaterial = useGridStore((s) => s.setPaintMaterial)
  const setPaintFinish = useGridStore((s) => s.setPaintFinish)
  const spacePatterns = useGridStore((s) => s.spacePatterns)
  const selectedSpaceIds = useSelectionStore((s) => s.selectedSpaceIds)
  const selectedStripIds = useSelectionStore((s) => s.selectedStripIds)
  const reduced = prefersReducedMotion()
  if (!render) return null
  const inPatternEditor = workspace === 'pattern-editor'
  const targets = inPatternEditor ? selectedStripIds : selectedSpaceIds.filter((id) => spacePatterns[id])
  const applyToSelected = () => {
    if (inPatternEditor) {
      const { activePatternId, paintStrips } = usePatternStore.getState()
      paintStrips(activePatternId, useSelectionStore.getState().selectedStripIds, paintMaterial, paintFinish)
    } else {
      paintCells(useSelectionStore.getState().selectedSpaceIds)
    }
  }
  const applyToWhole = () => {
    const { activePatternId, paintWholePattern } = usePatternStore.getState()
    paintWholePattern(activePatternId, paintMaterial, paintFinish)
  }
  return (
    <div
      data-fill-panel
      role="region"
      aria-label="Fill / paint"
      className="p-2"
      style={{
        position: 'absolute', bottom: MARGIN + CLUSTER_H + 8, right, width: 240, zIndex: 4,
        transform: shown ? 'translateY(0)' : `translateY(calc(100% + ${MARGIN + CLUSTER_H + 24}px))`,
        opacity: shown ? 1 : 0,
        transition: reduced ? 'none' : `transform ${SLIDE_MS}ms cubic-bezier(0.22, 0.8, 0.3, 1), opacity ${SLIDE_MS}ms ease, right 220ms ease`,
        pointerEvents: shown ? 'auto' : 'none',
        ...cardStyle(ui),
      }}
    >
      <div className="fw-semibold small text-uppercase text-muted mb-2" style={{ letterSpacing: '0.05em', fontSize: 11 }}>Fill / paint</div>
      <label className="form-label small mb-1">Wood</label>
      <ThemedSelect className="form-select-sm mb-2" aria-label="Paint wood" value={paintMaterial} onChange={setPaintMaterial} options={asOptions(WOOD_OPTIONS)} />
      <label className="form-label small mb-1">Finish</label>
      <ThemedSelect className="form-select-sm mb-2" aria-label="Paint finish" value={paintFinish} onChange={setPaintFinish} options={asOptions(FINISH_OPTIONS)} />
      <ColorSwatchLine material={paintMaterial} finish={paintFinish} className="mb-2" />
      <div className="d-flex flex-column gap-2">
        <button
          type="button"
          className="btn btn-sm btn-dark"
          disabled={!targets.length}
          title={targets.length
            ? (inPatternEditor ? 'Apply this wood and finish to the selected strips' : 'Apply this wood and finish to every strip of the selected patterns')
            : (inPatternEditor ? 'Select one or more strips first' : 'Select one or more placed patterns first')}
          onClick={applyToSelected}
        >
          {inPatternEditor ? 'Apply to selected strips' : 'Apply to selected patterns'}
        </button>
        {inPatternEditor && (
          <button type="button" className="btn btn-sm btn-outline-dark" title="Apply this wood and finish to every strip of the pattern" onClick={applyToWhole}>
            Apply to whole pattern
          </button>
        )}
      </div>
    </div>
  )
}

export default function CanvasControls({ workspace }) {
  const right = useRightOffset()
  return (
    <>
      {workspace !== 'parts-list' && <FillPanel right={right} workspace={workspace} />}
      <ZoomCluster right={right} />
    </>
  )
}
