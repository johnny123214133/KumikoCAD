import React, { useState, useEffect } from 'react'
import usePatternStore from '../../store/usePatternStore.js'
import useGridStore from '../../store/useGridStore.js'
import { resolveParamState } from '../../geometry/params.js'
import { mmToIn, inToMm, MM_STEP, STRIP_IN_STEP } from '../../geometry/units.js'

const sectionLabelStyle = { letterSpacing: '0.05em', fontSize: '11px' }

const toDisplay = (mm, unit) => Number((unit === 'mm' ? mm : mmToIn(mm)).toFixed(unit === 'mm' ? 2 : 4))

// One numeric length input with an mm/in toggle. Same draft-string approach
// as the Inspector's strip width: the user can freely clear/retype, and only a
// valid number is committed (the store clamps it to the parameter's range).
// Values are always persisted in mm; the unit select is display/input only.
function LengthParamInput({ def, valueMm, bounds, onCommit }) {
  const [unit, setUnit] = useState('mm')
  const [draft, setDraft] = useState(String(toDisplay(valueMm, unit)))

  // Re-sync when the effective value changes from outside this input (a
  // clamp from a dimension change, a different pattern, a unit flip).
  useEffect(() => { setDraft(String(toDisplay(valueMm, unit))) }, [valueMm, unit])

  const onChange = (e) => {
    const raw = e.target.value
    setDraft(raw)
    const v = Number(raw)
    if (raw.trim() !== '' && Number.isFinite(v)) onCommit(unit === 'mm' ? v : inToMm(v))
  }
  // Snap the text back to the value actually in effect (e.g. after an
  // out-of-range entry was clamped, or the field was left empty).
  const onBlur = () => setDraft(String(toDisplay(valueMm, unit)))

  const hasMax = Number.isFinite(bounds.max)
  // The arrows step by the def's own `step` (mm; default half a millimetre).
  // A number input steps from its `min`, so a fractional minimum (a stub's
  // (√3/2)·w floor, say) would put every arrow-step off the grid; round the
  // attribute up to a whole step so 8 → 8.5 → 9. The store still clamps to the
  // true range.
  const stepMm = def.step ?? MM_STEP / 2
  const minAttr = unit === 'mm' ? Math.ceil(bounds.min / stepMm - 1e-9) * stepMm : toDisplay(bounds.min, unit)
  return (
    <div className="mb-3">
      <label className="form-label small mb-1">{def.label}</label>
      <div className="input-group input-group-sm">
        <input
          type="number"
          min={unit === 'mm' ? Number(minAttr.toFixed(4)) : minAttr}
          max={hasMax ? toDisplay(bounds.max, unit) : undefined}
          step={unit === 'mm' ? stepMm : STRIP_IN_STEP}
          className="form-control"
          value={draft}
          onChange={onChange}
          onBlur={onBlur}
        />
        <select className="form-select" style={{ maxWidth: '70px', flex: '0 0 auto' }} value={unit} onChange={(e) => setUnit(e.target.value)}>
          <option value="mm">mm</option>
          <option value="in">in</option>
        </select>
      </div>
      <div className="form-text" style={{ fontSize: '11px' }}>
        {def.description}
        {hasMax && ` Range ${toDisplay(bounds.min, unit)}–${toDisplay(bounds.max, unit)} ${unit} at the current dimensions.`}
      </div>
    </div>
  )
}

// Controls for the active pattern's own parameters, built from the
// definitions its factory declares (geometry/params.js) — so a new pattern's
// parameters show up here without touching this component. Renders nothing
// for patterns that declare none.
export default function PatternParams({ pattern, patternStripWidth }) {
  const getParamDefs = usePatternStore(s => s.getParamDefs)
  const setPatternParam = usePatternStore(s => s.setPatternParam)
  const cellWidth = useGridStore(s => s.cellWidth)
  const gridStripWidth = useGridStore(s => s.gridStripWidth)

  const defs = getParamDefs(pattern.id)
  if (!defs.length) return null

  // Resolved in declaration order, so a param's range can depend on earlier
  // ones (Sakura's corner spacing on its thick strip width).
  const { bounds } = resolveParamState(defs, pattern.patternParams, { cellWidth, gridStripWidth, patternStripWidth })

  return (
    <>
      <hr className="my-3" />
      <div>
        <div className="fw-semibold small text-uppercase text-muted mb-2" style={sectionLabelStyle}>Pattern parameters</div>
        {defs.map(def => (
          <LengthParamInput
            key={`${pattern.id}:${def.key}`}
            def={def}
            // pattern.patternParams holds the EFFECTIVE value (already
            // clamped by the factory), not necessarily what was last typed.
            valueMm={pattern.patternParams?.[def.key]?.length ?? def.default}
            bounds={bounds[def.key]}
            onCommit={(mm) => setPatternParam(pattern.id, def.key, mm)}
          />
        ))}
      </div>
    </>
  )
}
