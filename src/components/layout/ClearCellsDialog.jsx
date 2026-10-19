import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import useAppStore from '../../store/useAppStore.js'
import { doClearSelectedCells } from './keyBindings.js'

// The warning shown when Delete (or Backspace, or the palette command) is about to replace the
// selected cells' patterns with Mitsukude A. Same Bootstrap modal markup as the other dialogs;
// Replace has focus so Enter confirms, Escape or a click outside cancels. "Don't show this
// again" is remembered between visits.
export default function ClearCellsDialog() {
  const count = useAppStore((s) => s.clearCellsRequest)
  const setRequest = useAppStore((s) => s.setClearCellsRequest)
  const setConfirm = useAppStore((s) => s.setConfirmClearCells)
  const okRef = useRef(null)
  const [dontAsk, setDontAsk] = useState(false)

  useEffect(() => {
    if (!count) return undefined
    setDontAsk(false)
    okRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') setRequest(0) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [count, setRequest])

  if (!count) return null
  const cancel = () => setRequest(0)
  const ok = () => {
    if (dontAsk) setConfirm(false)
    setRequest(0)
    doClearSelectedCells()
  }
  return createPortal(
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 2000 }} />
      <div
        className="modal d-block"
        style={{ zIndex: 2001 }}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="clear-cells-title"
        onMouseDown={(e) => { if (e.target === e.currentTarget) cancel() }}
      >
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <div className="modal-content">
            <div className="modal-header py-2">
              <h6 className="modal-title" id="clear-cells-title">Empty the selected cells?</h6>
            </div>
            <div className="modal-body small">
              <p className="mb-0">
                {count === 1 ? 'The selected cell' : `The ${count} selected cells`} will be replaced with <strong>Mitsukude A</strong>, the blank pattern.
              </p>
              <div className="form-check mt-2 mb-0">
                <input id="clear-cells-dont-ask" className="form-check-input" type="checkbox" checked={dontAsk} onChange={(e) => setDontAsk(e.target.checked)} />
                <label className="form-check-label" htmlFor="clear-cells-dont-ask">Don't show this again</label>
              </div>
            </div>
            <div className="modal-footer py-2">
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={cancel}>Cancel</button>
              <button ref={okRef} type="button" className="btn btn-sm btn-danger" onClick={ok}>Replace</button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
