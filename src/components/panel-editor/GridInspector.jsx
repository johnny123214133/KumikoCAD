import React, { useSyncExternalStore } from 'react'
import { toast } from 'react-toastify'
import useGridStore from '../../store/useGridStore.js'
import useAppStore from '../../store/useAppStore.js'
import { commitGridDimensions, subscribeGridCommit, isGridCommitPending } from '../../store/gridDimensionsCommit.js'
import DebouncedCountField from './DebouncedCountField.jsx'
import DebouncedLengthField from './DebouncedLengthField.jsx'
import Accordion from '../shared/Accordion.jsx'
import ThemedSelect, { asOptions } from '../shared/ThemedSelect.jsx'
import { FieldLabel } from '../shared/HelpTip.jsx'
import ColorSwatchLine from '../shared/ColorSwatchLine.jsx'
import { WOOD_OPTIONS, FINISH_OPTIONS } from '../../geometry/materials.js'
import {
  formatLength, MAX_PANEL_CELLS, MAX_STRIP_WIDTH_FRACTION,
  MIN_CELL_WIDTH_MM, MAX_CELL_WIDTH_MM, CELL_MM_STEP, CELL_IN_STEP, snapCellWidthForUnit,
  MIN_GRID_STRIP_WIDTH_MM, GRID_STRIP_MM_STEP, GRID_STRIP_IN_STEP, snapGridStripWidthForUnit,
} from '../../geometry/units.js'


const SQRT3_2 = Math.sqrt(3) / 2

// A pattern in the panel can't be built at the requested size (some factories
// fail below a certain cell width) so the grid was left as it was.
const notifyRejected = ({ patternName }) =>
  toast.error(`${patternName ?? 'A pattern in the panel'} can't be built at that size — the grid was left as it was.`)

export default function GridInspector() {
  const {
    cols, rows, cellWidth, gridStripWidth, orientation, cornerBehavior, material, finish,
    setCols, setRows, setOrientation, setCornerBehavior, setMaterial, setFinish,
  } = useGridStore()
  const unit = useAppStore(s => s.gridUnit)
  // True from the moment a cell/strip width edit is handed off until the panel
  // has been updated with it (see store/gridDimensionsCommit.js).
  const applying = useSyncExternalStore(subscribeGridCommit, isGridCommitPending)

  const cellHeight = cellWidth * SQRT3_2
  // 'horizontal' = AB edge along x (flat base at bottom); 'vertical' rotates
  // that 90° (AB edge along y, point left) — so the two overall-envelope
  // dimensions swap which axis they apply to. See grid_schema_v1.json's
  // TriangleGrid.orientation notes.
  const panelWidthMm = orientation === 'horizontal' ? cols * cellWidth : rows * cellHeight
  const panelHeightMm = orientation === 'horizontal' ? rows * cellHeight : cols * cellWidth

  // Three independent accordions; Grid Dimensions starts open. Cell width, cell
  // orientation, corner type and the overlays explain themselves in hover tooltips.
  return (
    <div>
      <Accordion
        id="ge.dims"
        title="Grid Dimensions"
        defaultOpen
        right={applying && (
          <span
            className="spinner-border text-secondary"
            role="status"
            aria-label="Updating panel"
            title="Updating panel…"
            style={{ width: '0.8rem', height: '0.8rem', borderWidth: '0.15em' }}
          />
        )}
      >
        <div className="mb-3">
          <label className="form-label small mb-1">Overall grid dimensions</label>
          <div style={{ fontSize: '13px' }}>{formatLength(panelWidthMm, unit, unit === 'in' ? 2 : 1)} × {formatLength(panelHeightMm, unit, unit === 'in' ? 2 : 1)}</div>
        </div>

        <div className="mb-3">
          <label className="form-label small mb-1">Grid size (cells)</label>
          <div className="d-flex gap-2 align-items-center">
            <DebouncedCountField label="X" ariaLabel="Cells along X" value={cols} onCommit={setCols} />
            <DebouncedCountField label="Y" ariaLabel="Cells along Y" value={rows} onCommit={setRows} />
          </div>
          <div className="form-text" style={{ fontSize: 11 }}>
            {cols * rows} of {MAX_PANEL_CELLS} cells. If X × Y would pass {MAX_PANEL_CELLS}, the other value scales back.
          </div>
        </div>

        {/* Both fields are debounced and applied through commitGridDimensions —
            the panel changes once, after the patterns for the new size are ready
            (see store/gridDimensionsCommit.js). Cell width steps by 5 mm / 3/16",
            grid strip width by 0.5 mm / 1/16"; both snap on a unit switch. */}
        <DebouncedLengthField
          label="Grid strip width"
          valueMm={gridStripWidth}
          unit={unit}
          minMm={MIN_GRID_STRIP_WIDTH_MM}
          maxMm={cellWidth * MAX_STRIP_WIDTH_FRACTION}
          stepMm={GRID_STRIP_MM_STEP}
          stepIn={GRID_STRIP_IN_STEP}
          snap={snapGridStripWidthForUnit}
          busy={applying}
          onCommit={(mm) => commitGridDimensions({ gridStripWidth: mm }, { onReject: notifyRejected })}
        />

        <DebouncedLengthField
          label="Cell width"
          help="Side length of the equilateral triangle cell."
          valueMm={cellWidth}
          unit={unit}
          minMm={MIN_CELL_WIDTH_MM}
          maxMm={MAX_CELL_WIDTH_MM}
          stepMm={CELL_MM_STEP}
          stepIn={CELL_IN_STEP}
          snap={snapCellWidthForUnit}
          busy={applying}
          onCommit={(mm) => commitGridDimensions({ cellWidth: mm }, { onReject: notifyRejected })}
        />

        <div className="mb-3">
          <FieldLabel label="Cell orientation" tip="Whether a cell's base edge runs horizontal or vertical. Also rotates pattern icons in the left sidebar." />
          <div className="btn-group btn-group-sm w-100" role="group">
            <button type="button" className={`btn ${orientation === 'horizontal' ? 'btn-dark' : 'btn-outline-secondary'}`}
              onClick={() => setOrientation('horizontal')}>Horizontal</button>
            <button type="button" className={`btn ${orientation === 'vertical' ? 'btn-dark' : 'btn-outline-secondary'}`}
              onClick={() => setOrientation('vertical')}>Vertical</button>
          </div>
        </div>

        <div>
          <FieldLabel label="Corner type" tip="Whether the panel's corners land on a cell's apex (gridpoint: a 30° half cell, then a full cell) or a cell edge's midpoint (midpoint: a 90° half cell). Switching reflects the placed patterns." />
          <div className="btn-group btn-group-sm w-100" role="group">
            <button type="button" className={`btn ${cornerBehavior === 'taper' ? 'btn-dark' : 'btn-outline-secondary'}`}
              onClick={() => setCornerBehavior('taper')}>Gridpoint</button>
            <button type="button" className={`btn ${cornerBehavior === 'fill' ? 'btn-dark' : 'btn-outline-secondary'}`}
              onClick={() => setCornerBehavior('fill')}>Midpoint</button>
          </div>
        </div>
      </Accordion>

      <Accordion id="ge.props" title="Strip Properties">
        <div className="mb-2">
          <label className="form-label small mb-1">Wood</label>
          <ThemedSelect className="form-select-sm" aria-label="Wood" value={material} onChange={setMaterial} options={asOptions(WOOD_OPTIONS)} />
        </div>
        <div>
          <label className="form-label small mb-1">Finish</label>
          <ThemedSelect className="form-select-sm" aria-label="Finish" value={finish} onChange={setFinish} options={asOptions(FINISH_OPTIONS)} />
        </div>
        <ColorSwatchLine material={material} finish={finish} />
      </Accordion>
    </div>
  )
}
