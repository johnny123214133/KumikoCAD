import React, { useState, useEffect, useRef, useId } from 'react'
import usePatternStore from '../../store/usePatternStore.js'
import useGridStore from '../../store/useGridStore.js'
import useAppStore from '../../store/useAppStore.js'
import { resolveParamState, isRatioDef, inDisplayOrder } from '../../geometry/params.js'
import { mmToIn, inToMm, MM_STEP, STRIP_IN_STEP } from '../../geometry/units.js'
import { FieldLabel } from '../shared/HelpTip.jsx'

const toDisplay = (mm, unit) => Number((unit === 'mm' ? mm : mmToIn(mm)).toFixed(unit === 'mm' ? 2 : 4))

// One numeric length input, in the CAD-wide unit (shown beside the box). Same draft-string approach
// as the Inspector's strip width: the user can freely clear/retype, and only a
// valid number is committed (the store clamps it to the parameter's range).
// Values are always persisted in mm; the unit is display/input only.
function LengthParamInput({ def, valueMm, bounds, ratioNote, onCommit }) {
  const unit = useAppStore(s => s.gridUnit)
  const inputId = useId()
  const [draft, setDraft] = useState(String(toDisplay(valueMm, unit)))

  // Re-sync when the effective value changes from outside this input (a
  // clamp from a dimension change, a different pattern, a unit flip). Not while the
  // field is being typed in: a ratio parameter is put on the unit's rounding grid when the
  // pattern is built, so the value in effect can differ from the half-typed text.
  const focused = useRef(false)
  useEffect(() => { if (!focused.current) setDraft(String(toDisplay(valueMm, unit))) }, [valueMm, unit])

  const onChange = (e) => {
    const raw = e.target.value
    setDraft(raw)
    const v = Number(raw)
    if (raw.trim() !== '' && Number.isFinite(v)) onCommit(unit === 'mm' ? v : inToMm(v))
  }
  // Snap the text back to the value actually in effect (e.g. after an
  // out-of-range entry was clamped, or the field was left empty).
  const onBlur = () => { focused.current = false; setDraft(String(toDisplay(valueMm, unit))) }

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
      <FieldLabel
        label={def.label}
        htmlFor={inputId}
        tip={[def.description, ratioNote && `${ratioNote}.`].filter(Boolean).join(' ') || undefined}
      />
      <div className="input-group input-group-sm">
        <input
          id={inputId}
          type="number"
          min={unit === 'mm' ? Number(minAttr.toFixed(4)) : minAttr}
          max={hasMax ? toDisplay(bounds.max, unit) : undefined}
          step={unit === 'mm' ? stepMm : STRIP_IN_STEP}
          className="form-control"
          value={draft}
          onChange={onChange}
          onFocus={() => { focused.current = true }}
          onBlur={onBlur}
        />
        <span className="input-group-text">{unit}</span>
      </div>
      {/* What the pattern can physically be built with at the current dimensions. */}
      <div className="form-text" style={{ fontSize: '11px' }}>
        {hasMax
          ? `Range ${toDisplay(bounds.min, unit)}–${toDisplay(bounds.max, unit)} ${unit}`
          : `Minimum ${toDisplay(bounds.min, unit)} ${unit}`}
      </div>
    </div>
  )
}

// "Scales with the cell: 12% of its width" — for the parameters stored as ratios, so the
// user can tell they follow the cell size when it is changed.
function ratioNoteFor(def, valueMm, cellWidth, declared) {
  if (!isRatioDef(def) || !Number.isFinite(valueMm)) return null
  if (def.basis === 'cell') return `Scales with the cell (${Number(((valueMm / cellWidth) * 100).toFixed(1))}% of its width)`
  const span = declared && declared.max - declared.min
  return span > 0 ? `Scales with the cell (${Math.round(((valueMm - declared.min) / span) * 100)}% of the way through its range)` : null
}

// Controls for the active pattern's own parameters, built from the
// definitions its factory declares (geometry/params.js) — so a new pattern's
// parameters show up here without touching this component. Renders nothing
// for patterns that declare none. (The section heading and the strip width above
// these belong to the Inspector's Pattern Parameters accordion.)
export default function PatternParams({ pattern, patternStripWidth }) {
  const getParamDefs = usePatternStore(s => s.getParamDefs)
  const setPatternParam = usePatternStore(s => s.setPatternParam)
  const getParamLimits = usePatternStore(s => s.getParamLimits)
  const cellWidth = useGridStore(s => s.cellWidth)
  const gridStripWidth = useGridStore(s => s.gridStripWidth)

  const defs = getParamDefs(pattern.id)
  if (!defs.length) return null

  // Resolved in declaration order, so a param's range can depend on earlier
  // ones (Sakura's corner spacing on its thick strip width).
  const declared = resolveParamState(defs, pattern.patternParams, { cellWidth, gridStripWidth, patternStripWidth }).bounds
  // The range each param really allows: its declared one, tightened to what the whole
  // pattern can be built with (a value that's fine for its own strip can still make
  // another strip impossible).
  const limits = getParamLimits(pattern.id, patternStripWidth)
  const bounds = Object.fromEntries(defs.map(d => [d.key, limits[d.key] ?? declared[d.key]]))

  return (
    <>
      {inDisplayOrder(defs).map(def => (
        <LengthParamInput
          key={`${pattern.id}:${def.key}`}
          def={def}
          // pattern.patternParams holds the EFFECTIVE value (already
          // clamped by the factory), not necessarily what was last typed.
          valueMm={pattern.patternParams?.[def.key]?.length ?? def.default}
          bounds={bounds[def.key]}
          ratioNote={ratioNoteFor(def, pattern.patternParams?.[def.key]?.length, cellWidth, declared[def.key])}
          onCommit={(mm) => setPatternParam(pattern.id, def.key, mm)}
        />
      ))}
    </>
  )
}
