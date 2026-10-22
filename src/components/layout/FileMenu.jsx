import React, { useEffect, useRef, useState } from 'react'
import useAppStore from '../../store/useAppStore.js'
import useProjectStore from '../../store/useProjectStore.js'
import { saveProject, openProject } from '../../store/projectActions.js'
import { SaveProjectIcon, LoadProjectIcon } from './icons.jsx'
import './chrome.css'

// Save, with a small menu beside it for Save As and Open. Closes on Escape, on a click
// outside, or on picking an item; arrow keys move through it.
export default function FileMenu() {
  const busy = useProjectStore((s) => s.busy)
  const [open, setOpen] = useState(false)
  const anchorRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    menuRef.current?.querySelector('button')?.focus()
    const onDown = (e) => { if (!menuRef.current?.contains(e.target) && !anchorRef.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpen(false); anchorRef.current?.focus() }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const items = [...menuRef.current.querySelectorAll('button:not(:disabled)')]
        const at = items.indexOf(document.activeElement)
        items[(at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
        e.preventDefault()
      }
    }
    const close = () => setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); window.removeEventListener('resize', close) }
  }, [open])

  const rect = open ? anchorRef.current?.getBoundingClientRect() : null
  const run = (fn) => () => { setOpen(false); fn() }
  return (
    <>
      <div className="btn-group btn-group-sm" role="group" aria-label="Project">
        <button type="button" className="btn btn-outline-secondary d-inline-flex align-items-center gap-1" title="Save project (Ctrl/Cmd + S)" disabled={busy} onClick={() => saveProject()}>
          <SaveProjectIcon /><span className="d-none d-lg-inline">Save</span>
        </button>
        <button
          ref={anchorRef}
          type="button"
          className={`btn ${open ? 'btn-dark' : 'btn-outline-secondary'}`}
          style={{ paddingLeft: 6, paddingRight: 6 }}
          title="Save As, Open, Export and print…"
          aria-label="More project actions"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span aria-hidden="true" style={{ fontSize: 10 }}>{'▾'}</span>
        </button>
      </div>
      {open && rect && (
        <div ref={menuRef} role="menu" aria-label="Project" className="kumiko-menu" style={{ top: rect.bottom + 4, left: Math.max(8, Math.min(rect.left, window.innerWidth - 236)) }}>
          <button type="button" role="menuitem" disabled={busy} onClick={run(() => saveProject({ saveAs: true }))}>
            <span className="d-inline-flex align-items-center gap-2"><SaveProjectIcon />Save As{'…'}</span><kbd>Ctrl/Cmd + Shift + S</kbd>
          </button>
          <button type="button" role="menuitem" disabled={busy} onClick={run(() => openProject())}>
            <span className="d-inline-flex align-items-center gap-2"><LoadProjectIcon />Open{'…'}</span><kbd>Ctrl/Cmd + O</kbd>
          </button>
          <button type="button" role="menuitem" onClick={run(() => useAppStore.getState().setExportDialogOpen(true))}>
            <span className="d-inline-flex align-items-center gap-2">Export and print{'…'}</span>
          </button>
        </div>
      )}
    </>
  )
}
