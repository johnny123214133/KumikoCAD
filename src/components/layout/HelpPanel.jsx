import React from 'react'
import useAppStore from '../../store/useAppStore.js'
import { TOOLS, VALIDATION, ACTIONS, SELECTION_NOTE, WORKSPACE_WORDS } from './toolDefs.js'

// The right panel's content while the Help tool is on: every tool available in the
// current editor and how to use it. The Close button is pinned to the bottom of the
// panel (the list scrolls above it) and turns the Help tool off again.
function Entry({ def, words }) {
  const { Icon, label } = def
  return (
    <section className="mb-3" aria-label={label}>
      <div className="d-flex align-items-center gap-2 mb-1">
        <span className="d-inline-flex align-items-center justify-content-center border rounded kumiko-surface" style={{ width: 28, height: 28, flexShrink: 0 }}>
          <Icon />
        </span>
        <h6 className="mb-0">{label}</h6>
      </div>
      <ul className="small ps-4 mb-0">
        {def.help(words).map((line, i) => <li key={i} className="mb-1">{line}</li>)}
      </ul>
    </section>
  )
}

export default function HelpPanel() {
  const workspace = useAppStore(s => s.workspace)
  const toggleHelp = useAppStore(s => s.toggleHelp)
  const words = WORKSPACE_WORDS[workspace]
  const here = (d) => d.workspaces.includes(workspace)
  return (
    <div className="d-flex flex-column flex-grow-1" style={{ minHeight: 0 }} role="region" aria-label="Help">
      <div className="mb-2">
        <h5 className="mb-0">Help</h5>
        <div className="small text-muted">{words.title} tools</div>
      </div>
      <div className="flex-grow-1 overflow-auto pe-1" style={{ minHeight: 0 }}>
        {TOOLS.filter(here).map(def => <Entry key={def.id} def={def} words={words} />)}
        {here(VALIDATION) && <Entry def={VALIDATION} words={words} />}
        <p className="small text-muted mb-3">{SELECTION_NOTE}</p>
        <h6 className="text-uppercase small text-muted mb-2">Other controls</h6>
        {ACTIONS.filter(here).map(def => <Entry key={def.id} def={def} words={words} />)}
      </div>
      <div className="pt-2 mt-2 border-top">
        <button type="button" className="btn btn-outline-secondary w-100" onClick={toggleHelp}>Close</button>
      </div>
    </div>
  )
}
