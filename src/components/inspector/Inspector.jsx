import React, { useState, useEffect } from 'react'
import usePatternStore from '../../store/usePatternStore.js'
import useAppStore from '../../store/useAppStore.js'
import { WOOD_OPTIONS, FINISH_OPTIONS } from '../../geometry/materials.js'
import { mmToIn, inToMm } from '../../geometry/units.js'
import OverlayControls from '../pattern-editor/OverlayControls.jsx'

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
  const getEffectiveStripWidth = usePatternStore(s => s.getEffectiveStripWidth)
  const setPatternStripWidth = usePatternStore(s => s.setPatternStripWidth)
  const getEffectiveMaterial = usePatternStore(s => s.getEffectiveMaterial)
  const getEffectiveFinish = usePatternStore(s => s.getEffectiveFinish)
  const setPatternMaterial = usePatternStore(s => s.setPatternMaterial)
  const setPatternFinish = usePatternStore(s => s.setPatternFinish)
  // Not read directly — subscribed so this re-renders (and the effect below
  // re-syncs the draft input) when patternOverrides changes for a reason
  // OTHER than this component's own edit, e.g. useGridStore.setCellWidth's
  // shrink-clamp broadcast reaching this pattern from outside.
  usePatternStore(s => s.patternOverrides)
  const pattern = getActivePattern()
  const stripsExpanded = useAppStore(s => s.stripsExpanded)
  const setStripsExpanded = useAppStore(s => s.setStripsExpanded)

  // Strip width is genuinely live now — draft is a plain string so the user
  // can freely clear/retype (a bare controlled number input fights you the
  // instant the field is empty), and only commits to the store (which does
  // its own clamping and IS what drives rendering everywhere this pattern
  // appears — pattern editor and every matching cell in the panel) when the
  // typed value parses to a valid positive number. Typing 0 or clearing the
  // field just doesn't commit — "don't update the render when set to 0" —
  // rather than reverting what's displayed.
  const effectiveWidthMm = getEffectiveStripWidth(activePatternId)
  const [widthUnit, setWidthUnit] = useState('mm')
  const [draftWidth, setDraftWidth] = useState(String(effectiveWidthMm))
  // Material/finish are now genuinely live — same pattern as strip width
  // above: read through getEffectiveMaterial/Finish (template default, or a
  // live override), write through setPatternMaterial/Finish, which is what
  // drives rendering everywhere this pattern appears (see usePatternStore's
  // getComputedPattern -> factory -> makeStripProperties ->
  // geometry/woodFinishColors.js's getMaterialColor). No local-only state
  // or draft-string dance needed here — a <select> has no equivalent of the
  // empty-text-field problem a number input has, so every change commits
  // straight to the store.
  const material = getEffectiveMaterial(activePatternId)
  const finish = getEffectiveFinish(activePatternId)

  useEffect(() => {
    setDraftWidth(String(Number((widthUnit === 'mm' ? effectiveWidthMm : mmToIn(effectiveWidthMm)).toFixed(widthUnit === 'mm' ? 2 : 3))))
  }, [activePatternId, effectiveWidthMm, widthUnit])

  if (!pattern) return null

  const onWidthInputChange = (e) => {
    const raw = e.target.value
    setDraftWidth(raw)
    const v = Number(raw)
    if (Number.isFinite(v) && v > 0) {
      setPatternStripWidth(activePatternId, widthUnit === 'mm' ? v : inToMm(v))
    }
  }

  return (
    <div>
      {/* Strips section — collapsed by default (state lives in useAppStore,
          not here, so it survives Inspector unmounting on a workspace
          switch). When expanded this is a FIXED max-height box with its own
          scroll, not a flex-grow region — flex-grow by construction fills
          exactly the space left over and can never overflow its container,
          which is why the rest of the panel (Strip properties, Overlays)
          used to always stay in view but this section could get squeezed to
          almost nothing. A fixed box lets total content genuinely exceed the
          panel's height when expanded, which is what lets RightPanel's
          existing overflow-auto wrapper actually activate and scroll the
          whole menu — that mechanism was already there, just never
          triggered before. */}
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div className="fw-semibold small text-uppercase text-muted" style={sectionLabelStyle}>
          Strips ({pattern.strips.length})
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          style={{ padding: '1px 8px', fontSize: '11px' }}
          onClick={() => setStripsExpanded(!stripsExpanded)}
          aria-expanded={stripsExpanded}
        >
          {stripsExpanded ? '▲ Collapse' : '▼ Expand'}
        </button>
      </div>
      {stripsExpanded && (
        <div className="overflow-auto mb-1" style={{ maxHeight: '55vh', minHeight: '220px' }}>
          {pattern.strips.map(strip => (
            <StripCard key={strip.id} strip={strip} pattern={pattern} />
          ))}
        </div>
      )}

      <hr className="my-3" />

      {/* Strip properties */}
      <div>
        <div className="fw-semibold small text-uppercase text-muted mb-2" style={sectionLabelStyle}>Strip properties</div>

        <div className="mb-3">
          <label className="form-label small mb-1">Strip width</label>
          <div className="input-group input-group-sm">
            <input
              type="number"
              min="0"
              step={widthUnit === 'mm' ? 0.1 : 0.01}
              className="form-control"
              value={draftWidth}
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
          <select className="form-select form-select-sm" value={material} onChange={(e) => setPatternMaterial(activePatternId, e.target.value)}>
            {WOOD_OPTIONS.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}
          </select>
        </div>

        <div>
          <label className="form-label small mb-1">Finish</label>
          <select className="form-select form-select-sm" value={finish} onChange={(e) => setPatternFinish(activePatternId, e.target.value)}>
            {FINISH_OPTIONS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </div>
      </div>

      <hr className="my-3" />

      {/* Overlay toggles — this used to live in the left panel, before that
          sidebar's pattern-list section was built out; the component itself
          was never deleted, just no longer imported anywhere. Reused as-is. */}
      <div>
        <OverlayControls />
      </div>
    </div>
  )
}
