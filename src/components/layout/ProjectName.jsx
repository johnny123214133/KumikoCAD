import React, { useState, useRef, useEffect } from 'react'
import useProjectStore from '../../store/useProjectStore.js'
import { renameProject } from '../../store/projectActions.js'

// The project's name in the toolbar, with a dot when it has changes the file doesn't. Click
// it to rename (Enter keeps, Escape cancels). Renaming means the next Save asks where to
// put the file, since it is no longer the one that was opened.
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
        style={{ width: 180 }}
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
      className="btn btn-link btn-sm p-0 text-decoration-none text-muted text-truncate"
      style={{ maxWidth: 200 }}
      title={dirty ? `${name} — unsaved changes. Click to rename.` : `${name} — click to rename`}
      onClick={() => { setDraft(name); setEditing(true) }}
    >
      {name}{dirty && <span aria-label="unsaved changes" style={{ marginLeft: 4 }}>{'•'}</span>}
    </button>
  )
}
