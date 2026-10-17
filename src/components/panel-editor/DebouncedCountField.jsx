import React, { useState, useEffect, useRef } from 'react'
import { createDebouncedCommitter } from './debouncedCommitter.js'

// How long a cell-count field waits after the last keystroke or spinner click. Deliberately long:
// changing the count rebuilds the whole panel, and typing "12" must not build a 1-column panel
// on the way. Blur and Enter apply at once.
export const CELL_COUNT_DEBOUNCE_MS = 900

// A whole-number input (the panel's X / Y cell counts) with a draft string, so it can be emptied
// and retyped freely: an empty or non-positive entry is simply not applied, and on leaving the
// field it goes back to the value in effect. `value` is what's in the store — it may differ from
// what was typed (the other axis is scaled back when X × Y would pass the limit), and the box
// follows it as soon as no edit is waiting.
export default function DebouncedCountField({ label, value, onCommit, ariaLabel }) {
  const [draft, setDraft] = useState(String(value))
  const [handedOff, setHandedOff] = useState(0) // re-sync after a commit that changed nothing
  const onCommitRef = useRef(onCommit)
  useEffect(() => { onCommitRef.current = onCommit })

  const ref = useRef(null)
  if (ref.current === null) {
    ref.current = createDebouncedCommitter((n) => {
      onCommitRef.current(n)
      setHandedOff((k) => k + 1)
    }, CELL_COUNT_DEBOUNCE_MS)
  }
  const committer = ref.current
  useEffect(() => () => { committer.flush() }, [committer])

  useEffect(() => {
    if (committer.hasPending()) return
    setDraft(String(value))
  }, [value, handedOff, committer])

  const onChange = (e) => {
    const raw = e.target.value
    setDraft(raw)
    const n = Number(raw)
    if (raw.trim() !== '' && Number.isFinite(n) && n >= 1) committer.schedule(Math.round(n))
    else committer.cancel() // empty / 0 / negative: wait for a real number
  }
  const onBlur = () => {
    committer.flush()
    const n = Number(draft)
    if (draft.trim() === '' || !(n >= 1)) setDraft(String(value))
  }

  return (
    <div className="input-group input-group-sm">
      <span className="input-group-text">{label}</span>
      <input
        type="number" min="1" step="1" className="form-control" aria-label={ariaLabel}
        value={draft} onChange={onChange} onBlur={onBlur}
        onKeyDown={(e) => { if (e.key === 'Enter') committer.flush() }}
      />
    </div>
  )
}
