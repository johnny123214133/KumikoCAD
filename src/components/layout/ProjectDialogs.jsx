import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import useProjectStore from '../../store/useProjectStore.js'

// The project's "are you sure?" dialog (opening a file over unsaved changes). Same Bootstrap
// modal markup as the delete-pattern dialog; Cancel has focus, Escape or a click outside cancels.
export default function ProjectDialogs() {
  const confirm = useProjectStore((s) => s.confirm)
  const answer = useProjectStore((s) => s.answer)
  const cancelRef = useRef(null)

  useEffect(() => {
    if (!confirm) return undefined
    cancelRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') answer(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [confirm, answer])

  if (!confirm) return null
  return createPortal(
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 2000 }} />
      <div
        className="modal d-block"
        style={{ zIndex: 2001 }}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="project-confirm-title"
        onMouseDown={(e) => { if (e.target === e.currentTarget) answer(false) }}
      >
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <div className="modal-content">
            <div className="modal-header py-2"><h6 className="modal-title" id="project-confirm-title">{confirm.title}</h6></div>
            <div className="modal-body small">{confirm.message}</div>
            <div className="modal-footer py-2">
              <button ref={cancelRef} type="button" className="btn btn-sm btn-outline-secondary" onClick={() => answer(false)}>Cancel</button>
              <button type="button" className="btn btn-sm btn-danger" onClick={() => answer(true)}>{confirm.confirmLabel}</button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
