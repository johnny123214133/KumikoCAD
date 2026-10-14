import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// "Are you sure?" dialog for deleting a custom pattern. Built from Bootstrap's
// modal markup/CSS (no Bootstrap JS), and rendered into document.body so it
// isn't clipped or offset by the side panel it was opened from. Escape or a
// click outside cancels; Cancel is the focused button so Enter can't delete by
// accident.
export default function ConfirmDeletePattern({ pattern, placedCount, twinName, onConfirm, onCancel }) {
  const cancelRef = useRef(null)
  const [dontAsk, setDontAsk] = useState(false)

  useEffect(() => {
    cancelRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return createPortal(
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 2000 }} />
      <div
        className="modal d-block"
        style={{ zIndex: 2001 }}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-pattern-title"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}
      >
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <div className="modal-content">
            <div className="modal-header py-2">
              <h6 className="modal-title" id="delete-pattern-title">Delete pattern?</h6>
            </div>
            <div className="modal-body small">
              <p className="mb-2">Are you sure you want to delete <strong>{pattern.name}</strong>? This can't be undone.</p>
              {placedCount > 0 && (twinName ? (
                <p className="mb-0">
                  It's placed in {placedCount} {placedCount === 1 ? 'cell' : 'cells'} of the panel — {placedCount === 1 ? 'that cell' : 'those cells'} will switch to <strong>{twinName}</strong>, which is identical.
                </p>
              ) : (
                <p className="mb-0 text-danger">
                  It's placed in {placedCount} {placedCount === 1 ? 'cell' : 'cells'} of the panel — {placedCount === 1 ? 'that cell' : 'those cells'} will be emptied.
                </p>
              ))}
              <div className="form-check mt-2 mb-0">
                <input id="delete-pattern-dont-ask" className="form-check-input" type="checkbox" checked={dontAsk} onChange={(e) => setDontAsk(e.target.checked)} />
                <label className="form-check-label" htmlFor="delete-pattern-dont-ask">Don't show this again</label>
              </div>
            </div>
            <div className="modal-footer py-2">
              <button ref={cancelRef} type="button" className="btn btn-sm btn-outline-secondary" onClick={onCancel}>Cancel</button>
              <button type="button" className="btn btn-sm btn-danger" onClick={() => onConfirm({ dontAskAgain: dontAsk })}>Delete</button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
