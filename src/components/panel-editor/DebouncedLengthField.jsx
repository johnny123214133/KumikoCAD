import React, { useState, useEffect, useRef, useId } from 'react'
import { mmToIn, inToMm } from '../../geometry/units.js'
import { createDebouncedCommitter } from './debouncedCommitter.js'
import { FieldLabel } from '../shared/HelpTip.jsx'

// Inches get 4 decimals so a 1/16" step (0.0625) displays exactly — see the
// Inspector's identical note on its strip width input.
const toDisplay = (mm, unit) => String(Number((unit === 'mm' ? mm : mmToIn(mm)).toFixed(unit === 'mm' ? 2 : 4)))

// A length input for the Grid inspector (`help`, if given, is shown as a hover
// tooltip beside the label) whose edits are DEBOUNCED: what you type
// shows immediately, but it's only handed to `onCommit` (in mm) once you pause
// (GRID_FIELD_DEBOUNCE_MS), leave the field, or press Enter — typing "75" or
// clicking the spinner five times is one change, not several. Arrow keys and
// the spinner step by `stepMm` / `stepIn`, counting from the minimum (`minMm`);
// a typed value isn't forced onto that grid. When `unit` flips, the value is
// passed through `snap(mm, newUnit)` (if given) and the result applied, so it
// lands on a clean number in the new unit.
//
// Same draft-string approach as the Inspector's strip width: the text is free
// to be cleared and retyped, and an empty or non-positive entry simply isn't
// applied ("don't update the render when set to 0"). `valueMm` is the value
// actually in effect in the store (already clamped there); the box follows it
// when it changes — e.g. a too-large entry clamped to the maximum — but never
// over an edit that's still waiting. `busy` is "a change is being applied":
// the box holds still until it lands, then settles on the real value.
export default function DebouncedLengthField({ label, help, valueMm, unit, minMm, maxMm, stepMm, stepIn, snap, busy, onCommit }) {
  const inputId = useId()
  const [draft, setDraft] = useState(() => toDisplay(valueMm, unit))
  // Bumped whenever an edit is handed to onCommit, so the settle effect below
  // re-checks — covers a commit that turns out to change nothing (nothing else
  // would tell the box to snap back to the clamped value).
  const [handedOff, setHandedOff] = useState(0)
  // The length (mm) the box currently stands for: the latest valid thing typed,
  // else the value in effect. Kept so a unit switch converts what you typed
  // instead of snapping back to the (possibly not yet updated) stored value.
  const shownMm = useRef(valueMm)

  const onCommitRef = useRef(onCommit)
  useEffect(() => { onCommitRef.current = onCommit })

  const committerRef = useRef(null)
  if (committerRef.current === null) {
    committerRef.current = createDebouncedCommitter((mm) => {
      onCommitRef.current(mm)
      setHandedOff((n) => n + 1)
    })
  }
  const committer = committerRef.current

  // Leaving (e.g. switching to the pattern editor) with an edit still waiting
  // applies it rather than dropping it.
  useEffect(() => () => { committer.flush() }, [committer])

  const lastUnit = useRef(unit)
  useEffect(() => {
    const unitChanged = lastUnit.current !== unit
    lastUnit.current = unit
    if (unitChanged) {
      // Switching units: snap what the box stands for (including an edit that
      // was still waiting) onto a clean value in the new unit, and apply it.
      const snapped = snap ? snap(shownMm.current, unit) : shownMm.current
      committer.cancel()
      shownMm.current = snapped
      if (Math.abs(snapped - valueMm) > 1e-9) {
        onCommitRef.current(snapped)
        setHandedOff((n) => n + 1)
      }
    } else {
      if (busy || committer.hasPending()) return // an edit is in flight; don't overwrite it
      shownMm.current = valueMm
    }
    setDraft(toDisplay(shownMm.current, unit))
    // `snap` is read at the moment the unit flips and doesn't need to re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueMm, busy, handedOff, unit, committer])

  const onChange = (e) => {
    const raw = e.target.value
    setDraft(raw)
    const v = Number(raw)
    if (raw.trim() !== '' && Number.isFinite(v) && v > 0) {
      const mm = unit === 'mm' ? v : inToMm(v)
      shownMm.current = mm
      committer.schedule(mm)
    } else {
      committer.cancel()
    }
  }

  const onBlur = () => {
    committer.flush()
    const v = Number(draft)
    if (draft.trim() === '' || !(v > 0)) setDraft(toDisplay(shownMm.current, unit))
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter') committer.flush()
  }

  return (
    <div className="mb-3">
      <FieldLabel label={label} tip={help} htmlFor={inputId} />
      <div className="input-group input-group-sm">
        <input
          id={inputId}
          type="number"
          // The browser counts steps from min, so min has to sit ON the step grid:
          // in inches the true minimum rarely does, so it's rounded up to the next
          // step (the store still enforces the true minimum for typed values).
          min={unit === 'mm' ? minMm : Number((Math.ceil(mmToIn(minMm) / stepIn - 1e-9) * stepIn).toFixed(4))}
          max={maxMm != null ? Number(toDisplay(maxMm, unit)) : undefined}
          step={unit === 'mm' ? stepMm : stepIn}
          className="form-control"
          value={draft}
          onChange={onChange}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        />
        <span className="input-group-text">{unit}</span>
      </div>
    </div>
  )
}
