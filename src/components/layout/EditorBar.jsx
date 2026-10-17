import React from 'react'
import useAppStore from '../../store/useAppStore.js'
import { EDITORS } from './editors.js'
import { overlaysFor } from './overlays.js'
import { keyFor } from './keyBindings.js'
import './chrome.css'

// The second line of the toolbar: the editor tabs on the left, the current editor's overlay
// toggles on the right.
export default function EditorBar() {
  const workspace = useAppStore((s) => s.workspace)
  const setWorkspace = useAppStore((s) => s.setWorkspace)
  const activeLayers = useAppStore((s) => s.activeLayers)
  const toggleLayer = useAppStore((s) => s.toggleLayer)
  const overlays = overlaysFor(workspace)

  const onTabKey = (e, i) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = EDITORS[(i + step + EDITORS.length) % EDITORS.length]
    setWorkspace(next.id)
    document.getElementById(`editor-tab-${next.id}`)?.focus()
  }

  return (
    <div className="kumiko-editorbar d-flex align-items-end justify-content-between flex-wrap px-3" style={{ columnGap: '1rem' }}>
      <div role="tablist" aria-label="Editors" className="d-flex">
        {EDITORS.map((ed, i) => (
          <button
            key={ed.id}
            id={`editor-tab-${ed.id}`}
            type="button"
            role="tab"
            className="kumiko-tab"
            aria-selected={workspace === ed.id}
            tabIndex={workspace === ed.id ? 0 : -1}
            title={`${ed.label} (${i + 1})`}
            onClick={() => setWorkspace(ed.id)}
            onKeyDown={(e) => onTabKey(e, i)}
          >
            {ed.label}<kbd aria-hidden="true">{i + 1}</kbd>
          </button>
        ))}
      </div>
      {overlays.length > 0 && (
        <div role="group" aria-label="Overlays" className="d-flex align-items-center flex-wrap py-1" style={{ gap: '0.375rem' }}>
          <span className="text-muted small me-1">Overlays</span>
          {overlays.map((o) => {
            const on = !!activeLayers[o.key]
            const shortcut = keyFor(`overlay-${o.key}`)
            const tip = o.tips?.[workspace]
            return (
              <button
                key={o.key}
                type="button"
                className={`btn btn-sm ${on ? 'btn-dark' : 'btn-outline-secondary'}`}
                style={{ fontSize: 12, padding: '1px 8px' }}
                aria-pressed={on}
                title={[`${o.label} overlay${shortcut ? ` (${shortcut})` : ''}`, tip].filter(Boolean).join(' — ')}
                onClick={() => toggleLayer(o.key)}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
