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
import { WOOD_OPTIONS, finishOptionsFor } from '../../geometry/materials.js'
import {
  formatLength, MAX_PANEL_CELLS, MAX_STRIP_WIDTH_FRACTION,
  MIN_CELL_WIDTH_MM, MAX_CELL_WIDTH_MM, CELL_MM_STEP, CELL_IN_STEP, snapCellWidthForUnit,
  MIN_GRID_STRIP_WIDTH_MM, GRID_STRIP_MM_STEP, GRID_STRIP_IN_STEP, snapGridStripWidthForUnit,
  BORDER_WIDTH_MM_STEP, BORDER_WIDTH_IN_STEP, MAX_BORDER_WIDTH_MM, minBorderWidthMm, snapBorderWidthForUnit,
  MIN_PANEL_DEPTH_MM, MAX_PANEL_DEPTH_MM, PANEL_DEPTH_MM_STEP, PANEL_DEPTH_IN_STEP, snapPanelDepthForUnit,
} from '../../geometry/units.js'


const SQRT3_2 = Math.sqrt(3) / 2

// A pattern in the panel can't be built at the requested size (some factories
// fail below a certain cell width) so the grid was left as it was.
const notifyRejected = ({ patternName }) =>
  toast.error(`${patternName ?? 'A pattern in the panel'} can't be built at that size — the grid was left as it was.`)

export default function GridInspector() {
  const {
    cols, rows, cellWidth, gridStripWidth, borderWidth, borderCorner, panelDepth, orientation, cornerBehavior, material, finish,
    setCols, setRows, setOrientation, setCornerBehavior, setMaterial, setFinish, setBorderWidth, setBorderCorner, setPanelDepth,
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
          <FieldLabel label="Grid size (cells)" tip={`The panel is limited to ${MAX_PANEL_CELLS} cells in all (X × Y). If a new X or Y would pass that, the other value scales back to fit.`} />
          <div className="d-flex gap-2 align-items-center">
            <DebouncedCountField label="X" ariaLabel="Cells along X" value={cols} onCommit={setCols} />
            <DebouncedCountField label="Y" ariaLabel="Cells along Y" value={rows} onCommit={setRows} />
          </div>
          <div className="form-text" style={{ fontSize: 11 }}>
            {cols * rows} of {MAX_PANEL_CELLS} cells
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

        {/* The border's inner face stays where the grid strips put it, so only its OUTSIDE
            moves with this: a border wider than a grid strip grows outward. Not a grid
            dimension (no pattern has to be rebuilt), so it is applied straight to the store. */}
        <DebouncedLengthField
          label="Border width"
          help="Width of the four strips framing the panel. The inside face stays half a grid strip in from the panel edge, so extra width is added to the outside only. At least half the grid strip width."
          valueMm={borderWidth}
          unit={unit}
          minMm={minBorderWidthMm(gridStripWidth)}
          maxMm={MAX_BORDER_WIDTH_MM}
          stepMm={BORDER_WIDTH_MM_STEP}
          stepIn={BORDER_WIDTH_IN_STEP}
          snap={(mm, u) => snapBorderWidthForUnit(mm, u, gridStripWidth)}
          busy={applying}
          onCommit={setBorderWidth}
        />

        <div className="mb-3">
          <FieldLabel label="Border corners" tip="How the border strips meet at the panel's corners: mitred at 45°, or half-lapped with the strips parallel to the cell's base edge on top. A corner that lands on a grid vertex also joins the grid strip running into it." />
          <div className="btn-group btn-group-sm w-100" role="group">
            <button type="button" className={`btn ${borderCorner === 'miter' ? 'btn-dark' : 'btn-outline-secondary'}`}
              onClick={() => setBorderCorner('miter')}>Mitered</button>
            <button type="button" className={`btn ${borderCorner === 'halfLap' ? 'btn-dark' : 'btn-outline-secondary'}`}
              onClick={() => setBorderCorner('halfLap')}>Half lap</button>
          </div>
        </div>

        {/* How far the panel stands off the wall. Nothing on the canvas changes with it: it is how deep
            the panel's own strips are, which the half laps and three-strip laps cut into. */}
        <DebouncedLengthField
          label="Panel depth"
          help="How far the panel stands off the wall it is mounted on. Nothing changes on screen, but it is how deep the grid and border strips are, which sets what the half laps and three-strip laps cut away. At least 10 mm."
          valueMm={panelDepth}
          unit={unit}
          minMm={MIN_PANEL_DEPTH_MM}
          maxMm={MAX_PANEL_DEPTH_MM}
          stepMm={PANEL_DEPTH_MM_STEP}
          stepIn={PANEL_DEPTH_IN_STEP}
          snap={snapPanelDepthForUnit}
          busy={applying}
          onCommit={setPanelDepth}
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
        <ColorSwatchLine className="" material={material} finish={finish} onPick={(w, f) => { setMaterial(w); setFinish(f) }} />
      </Accordion>
    </div>
  )
}
