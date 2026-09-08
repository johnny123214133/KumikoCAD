import React, { useState, useEffect } from 'react'
import usePatternStore from '../../store/usePatternStore.js'
import { WOOD_OPTIONS, FINISH_OPTIONS } from '../../geometry/materials.js'
import { mmToIn, inToMm } from '../../geometry/units.js'

const sectionLabelStyle = { letterSpacing: '0.05em', fontSize: '11px' }

function dist(a, b) { return Math.hypot(b.x - a.x, b.y - a.y) }
function midpoint(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }
function fmtPt(p) { return `(${p.x.toFixed(2)}, ${p.y.toFixed(2)})` }

// Cut role strings look like 'end', 'cut-top-2', 'role-middle-3', etc. — see
// patterns/*.json. Parses out a human label and, for cuts shared by multiple
// strips, which of those strips this specific cut plays which role in
// (top/middle/bottom), per the "n-way" suffix.
function describeCutRole(role) {
  if (role === 'end') return 'End (miter to grid boundary)'
  const m = /^(?:cut|role)-(top|middle|bottom)-(\d+)$/.exec(role || '')
  if (m) {
    const [, position, n] = m
    const cap = position[0].toUpperCase() + position.slice(1)
    return `${cap} strip of ${n}-way joint`
  }
  return role || '—'
}

function StripCard({ strip, pattern }) {
  const length = dist(strip.start, strip.end)
  const mid = midpoint(strip.start, strip.end)
  return (
    <div className="border rounded p-2 mb-2" style={{ fontSize: '12px' }}>
      <div className="fw-semibold mb-1">Strip {strip.id}</div>
      <table className="table table-sm table-borderless mb-2" style={{ fontSize: '11px' }}>
        <tbody>
          <tr><td className="text-muted py-0 pe-2">Length</td><td className="py-0">{length.toFixed(2)} mm</td></tr>
          <tr><td className="text-muted py-0 pe-2">Start</td><td className="py-0">{fmtPt(strip.start)}</td></tr>
          <tr><td className="text-muted py-0 pe-2">End</td><td className="py-0">{fmtPt(strip.end)}</td></tr>
          <tr><td className="text-muted py-0 pe-2">Midpoint</td><td className="py-0">{fmtPt(mid)}</td></tr>
        </tbody>
      </table>
      <div className="text-muted mb-1" style={{ fontSize: '10px', letterSpacing: '0.03em' }}>CUTS</div>
      <ul className="list-unstyled mb-0 d-flex flex-column gap-1">
        {strip.cuts.map((cut, i) => {
          const joint = pattern.joints.find(j => j.id === cut.jointId)
          return (
            <li key={i} className="ps-2 border-start">
              <div>{fmtPt(cut.position)} — {joint?.notchType ?? 'unknown'}, {cut.angle}°, depth {cut.depth}</div>
              <div className="text-muted">{describeCutRole(cut.role)}</div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function Inspector() {
  const getActivePattern = usePatternStore(s => s.getActivePattern)
  const activePatternId = usePatternStore(s => s.activePatternId)
  const pattern = getActivePattern()

  // Strip width + material/finish editors below are local UI state, seeded
  // from the active pattern's first stripProperties entry and re-synced
  // whenever the active pattern changes. Built-in patterns are readOnly, and
  // there's no fork/save-to-user-pattern wiring yet (still a TODO in
  // usePatternStore), so — same as the toolbar's Save/Load Project buttons —
  // these are editable in the UI but don't yet write back to the pattern or
  // affect rendering.
  const sp = pattern?.stripProperties?.[0]
  const [widthMm, setWidthMm] = useState(sp?.width ?? 0)
  const [widthUnit, setWidthUnit] = useState('mm')
  const [material, setMaterial] = useState(sp?.material ?? WOOD_OPTIONS[0].id)
  const [finish, setFinish] = useState(sp?.finish ?? FINISH_OPTIONS[0].id)

  useEffect(() => {
    setWidthMm(sp?.width ?? 0)
    setMaterial(sp?.material ?? WOOD_OPTIONS[0].id)
    setFinish(sp?.finish ?? FINISH_OPTIONS[0].id)
  }, [activePatternId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!pattern) return null

  const displayedWidth = widthUnit === 'mm' ? widthMm : mmToIn(widthMm)
  const onWidthInputChange = (e) => {
    const v = Number(e.target.value)
    setWidthMm(widthUnit === 'mm' ? v : inToMm(v))
  }

  return (
    <div className="d-flex flex-column flex-grow-1" style={{ minHeight: 0 }}>
      {/* Upper section — strip list, scrollable */}
      <div className="d-flex flex-column flex-grow-1" style={{ minHeight: 0 }}>
        <div className="fw-semibold small text-uppercase text-muted mb-2" style={sectionLabelStyle}>
          Strips ({pattern.strips.length})
        </div>
        <div className="overflow-auto" style={{ minHeight: 0, flex: '1 1 auto' }}>
          {pattern.strips.map(strip => (
            <StripCard key={strip.id} strip={strip} pattern={pattern} />
          ))}
        </div>
      </div>

      <hr className="my-3 flex-shrink-0" />

      {/* Lower section — strip width + material, pinned below the scroll area */}
      <div className="flex-shrink-0">
        <div className="fw-semibold small text-uppercase text-muted mb-2" style={sectionLabelStyle}>Strip properties</div>

        <div className="mb-3">
          <label className="form-label small mb-1">Strip width</label>
          <div className="input-group input-group-sm">
            <input
              type="number"
              min="0"
              step={widthUnit === 'mm' ? 0.1 : 0.01}
              className="form-control"
              value={Number(displayedWidth.toFixed(widthUnit === 'mm' ? 2 : 3))}
              onChange={onWidthInputChange}
            />
            <select className="form-select" style={{ maxWidth: '70px', flex: '0 0 auto' }} value={widthUnit} onChange={(e) => setWidthUnit(e.target.value)}>
              <option value="mm">mm</option>
              <option value="in">in</option>
            </select>
          </div>
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
    </div>
  )
}
