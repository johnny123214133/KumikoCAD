import React from 'react'
import useGridStore from '../../store/useGridStore.js'
import { WOOD_OPTIONS, FINISH_OPTIONS } from '../../geometry/materials.js'
import { formatBoth } from '../../geometry/units.js'

const sectionLabelStyle = { letterSpacing: '0.05em', fontSize: '11px' }
const SQRT3_2 = Math.sqrt(3) / 2

export default function GridInspector() {
  const {
    cols, rows, cellWidth, gridStripWidth, orientation, cornerBehavior, material, finish,
    setCols, setRows, setCellWidth, setGridStripWidth, setOrientation, setCornerBehavior, setMaterial, setFinish,
  } = useGridStore()

  const cellHeight = cellWidth * SQRT3_2
  // 'horizontal' = AB edge along x (flat base at bottom); 'vertical' rotates
  // that 90° (AB edge along y, point left) — so the two overall-envelope
  // dimensions swap which axis they apply to. See grid_schema_v1.json's
  // TriangleGrid.orientation notes.
  const panelWidthMm = orientation === 'horizontal' ? cols * cellWidth : rows * cellHeight
  const panelHeightMm = orientation === 'horizontal' ? rows * cellHeight : cols * cellWidth

  return (
    <div>
      <div className="fw-semibold small text-uppercase text-muted mb-3" style={sectionLabelStyle}>Grid</div>

      <div className="mb-3">
        <label className="form-label small mb-1">Grid size (cells)</label>
        <div className="d-flex gap-2 align-items-center">
          <div className="input-group input-group-sm">
            <span className="input-group-text">X</span>
            <input type="number" min="1" step="1" className="form-control" value={cols}
              onChange={(e) => setCols(Number(e.target.value))} />
          </div>
          <div className="input-group input-group-sm">
            <span className="input-group-text">Y</span>
            <input type="number" min="1" step="1" className="form-control" value={rows}
              onChange={(e) => setRows(Number(e.target.value))} />
          </div>
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label small mb-1">Overall grid dimensions</label>
        <div style={{ fontSize: '13px' }}>{formatBoth(panelWidthMm)} × {formatBoth(panelHeightMm)}</div>
      </div>

      <div className="mb-3">
        <label className="form-label small mb-1">Grid strip width (mm)</label>
        <input type="number" min="0" step="0.1" className="form-control form-control-sm" value={gridStripWidth}
          onChange={(e) => setGridStripWidth(Number(e.target.value))} />
      </div>

      <div className="mb-3">
        <label className="form-label small mb-1">Cell width (mm)</label>
        <input type="number" min="0" step="0.5" className="form-control form-control-sm" value={cellWidth}
          onChange={(e) => setCellWidth(Number(e.target.value))} />
        <div className="form-text" style={{ fontSize: '11px' }}>Side length of the equilateral triangle cell.</div>
      </div>

      <div className="mb-3">
        <label className="form-label small mb-1 d-block">Cell orientation</label>
        <div className="btn-group btn-group-sm w-100" role="group">
          <button type="button" className={`btn ${orientation === 'horizontal' ? 'btn-dark' : 'btn-outline-secondary'}`}
            onClick={() => setOrientation('horizontal')}>Horizontal</button>
          <button type="button" className={`btn ${orientation === 'vertical' ? 'btn-dark' : 'btn-outline-secondary'}`}
            onClick={() => setOrientation('vertical')}>Vertical</button>
        </div>
        <div className="form-text" style={{ fontSize: '11px' }}>Whether a cell's base edge runs horizontal or vertical. Also rotates pattern icons in the left sidebar.</div>
      </div>

      <div className="mb-3">
        <label className="form-label small mb-1 d-block">Corner type</label>
        <div className="btn-group btn-group-sm w-100" role="group">
          <button type="button" className={`btn ${cornerBehavior === 'taper' ? 'btn-dark' : 'btn-outline-secondary'}`}
            onClick={() => setCornerBehavior('taper')}>Gridpoint</button>
          <button type="button" className={`btn ${cornerBehavior === 'fill' ? 'btn-dark' : 'btn-outline-secondary'}`}
            onClick={() => setCornerBehavior('fill')}>Midpoint</button>
        </div>
        <div className="form-text" style={{ fontSize: '11px' }}>Whether the panel's corners land on a cell's apex (gridpoint) or a cell edge's midpoint.</div>
      </div>

      <div className="mb-2">
        <label className="form-label small mb-1">Wood</label>
        <select className="form-select form-select-sm" value={material} onChange={(e) => setMaterial(e.target.value)}>
          {WOOD_OPTIONS.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}
        </select>
      </div>

      <div>
        <label className="form-label small mb-1">Finish</label>
        <select className="form-select form-select-sm" value={finish} onChange={(e) => setFinish(e.target.value)}>
          {FINISH_OPTIONS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </div>
    </div>
  )
}
