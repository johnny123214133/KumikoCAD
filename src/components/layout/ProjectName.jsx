import React, { useState, useRef, useEffect } from 'react'
import useProjectStore from '../../store/useProjectStore.js'
import { renameProject } from '../../store/projectActions.js'

// The project's name in the toolbar, with a dot when it has changes the file doesn't. Click
// it to rename (Enter keeps, Escape cancels). Renaming means the next Save asks where to
// put the file, since it is no longer the one that was opened.
// A long name never pushes the toolbar wider: the box (and the rename field) is capped, and the
// name is cut with an ellipsis inside it. The full name is in the tooltip.
const NAME_WIDTH = 'clamp(90px, 16vw, 240px)'

export default function ProjectName() {
  const name = useProjectStore((s) => s.name)
  const dirty = useProjectStore((s) => s.dirty)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const inputRef = useRef(null)
  useEffect(() => { if (editing) { inputRef.current?.focus(); inputRef.current?.select() } }, [editing])

  const finish = (keep) => {
    setEditing(false)
    if (keep) renameProject(draft)
  }
  if (editing) {
    return (
      <input
        ref={inputRef}
        className="form-control form-control-sm"
        style={{ width: NAME_WIDTH, minWidth: 0 }}
        aria-label="Project name"
        maxLength={100}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => finish(true)}
        onKeyDown={(e) => { if (e.key === 'Enter') finish(true); else if (e.key === 'Escape') finish(false) }}
      />
    )
  }
  return (
    <button
      type="button"
      className="btn btn-link btn-sm p-0 text-decoration-none text-muted d-inline-flex align-items-baseline"
      style={{ maxWidth: NAME_WIDTH, minWidth: 0, flex: '0 1 auto' }}
      title={dirty ? `${name} — unsaved changes. Click to rename.` : `${name} — click to rename`}
      onClick={() => { setDraft(name); setEditing(true) }}
    >
      <span className="text-truncate" style={{ minWidth: 0 }}>{name}</span>
      {dirty && <span aria-label="unsaved changes" style={{ marginLeft: 4, flex: '0 0 auto' }}>{'•'}</span>}
    </button>
  )
}
