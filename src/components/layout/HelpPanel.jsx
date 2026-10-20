import React from 'react'
import useAppStore from '../../store/useAppStore.js'
import { useSectionOpen } from '../shared/Accordion.jsx'
import { TOOLS, VALIDATION, ACTIONS, SELECTION_NOTE, WORKSPACE_WORDS } from './toolDefs.js'
import { KEY_BINDINGS } from './keyBindings.js'

// The right panel's content while the Help tool is on: every tool available in the
// current editor, the keyboard shortcuts, and how to use them. Each tool's
// description is folded away under its name and icon; clicking that line opens or
// closes it (the little arrow says there is more, as in the other menus). Which are
// open is remembered for the session, so closing and reopening Help keeps them. The
// Close button is pinned to the bottom of the panel (the list scrolls above it) and
// turns the Help tool off again.
const Arrow = ({ open }) => (
  <span className="text-muted" style={{ fontSize: '10px', width: '10px', display: 'inline-block', flexShrink: 0 }} aria-hidden="true">{open ? '▾' : '▸'}</span>
)

function Entry({ def, words }) {
  const { Icon, label } = def
  const [open, toggle] = useSectionOpen(`help-${def.id}`, false)
  const bodyId = `help-body-${def.id}`
  return (
    <section className="mb-2" aria-label={label}>
      <button
        type="button"
        className="btn btn-link p-0 w-100 d-flex align-items-center gap-2 text-start text-decoration-none"
        style={{ color: 'inherit' }}
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={toggle}
      >
        <span className="d-inline-flex align-items-center justify-content-center border rounded kumiko-surface" style={{ width: 28, height: 28, flexShrink: 0 }}>
          <Icon />
        </span>
        <h6 className="mb-0 flex-grow-1">{label}</h6>
        <Arrow open={open} />
      </button>
      {open && (
        <ul id={bodyId} className="small ps-4 mb-0 mt-1">
          {def.help(words).map((line, i) => <li key={i} className="mb-1">{line}</li>)}
        </ul>
      )}
    </section>
  )
}

function Kbd({ children }) {
  return (
    <kbd
      className="d-inline-block text-nowrap"
      style={{
        fontFamily: 'inherit', fontSize: 11, lineHeight: '18px', padding: '0 6px', borderRadius: 4,
        background: 'var(--kumiko-surface)', color: 'var(--kumiko-text)', border: '1px solid var(--kumiko-border-strong)',
      }}
    >
      {children}
    </kbd>
  )
}

function Shortcuts({ workspace }) {
  const [open, toggle] = useSectionOpen('help-shortcuts', true)
  const rows = KEY_BINDINGS.filter((b) => b.workspaces.includes(workspace))
  return (
    <section className="mb-3" aria-label="Keyboard shortcuts">
      <button
        type="button"
        className="btn btn-link p-0 w-100 d-flex align-items-center gap-1 text-start text-decoration-none"
        style={{ color: 'inherit' }}
        aria-expanded={open}
        aria-controls="help-body-shortcuts"
        onClick={toggle}
      >
        <Arrow open={open} />
        <span className="fw-semibold small text-uppercase text-muted" style={{ letterSpacing: '0.05em', fontSize: '11px' }}>Keyboard shortcuts</span>
      </button>
      {open && (
        <div id="help-body-shortcuts" className="small mt-2">
          {[...new Set(rows.map((b) => b.group))].map((group) => (
            <div key={group} className="mb-2" data-binding-group={group}>
              <div className="text-muted fw-semibold mb-1" style={{ fontSize: 11 }}>{group}</div>
              {rows.filter((b) => b.group === group).map((b) => (
                <div key={b.id} className="d-flex align-items-baseline gap-2 mb-1" data-binding={b.id}>
                  <span className="flex-shrink-0" style={{ minWidth: 92 }}><Kbd>{b.keys}</Kbd></span>
                  <span>{b.label}</span>
                </div>
              ))}
            </div>
          ))}
          <div className="text-muted mt-2">Shortcuts are ignored while you type in a field or have a dropdown open.</div>
        </div>
      )}
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
        <div className="small text-muted">{words.title}{TOOLS.some(here) ? ' tools' : ''}</div>
      </div>
      <div className="flex-grow-1 overflow-auto pe-1" style={{ minHeight: 0 }}>
        {TOOLS.filter(here).map(def => <Entry key={def.id} def={def} words={words} />)}
        {here(VALIDATION) && <Entry def={VALIDATION} words={words} />}
        {TOOLS.some(here) && <p className="small text-muted mt-3 mb-3">{SELECTION_NOTE}</p>}
        {!TOOLS.some(here) && <p className="small text-muted mb-3">The Parts List counts every piece of wood the panel is made of — the border, the grid strips and the strips of each pattern — with its length, width, wood, finish and the cuts at its ends and along it. It is for information only: nothing in it can be edited. Click a piece in the list to see its Top, Right side, Bottom and Left side profiles in the middle of the screen, and its details on the right. Where a cut face can be seen from a view it is drawn a touch darker, with a darker line where two cut faces meet. The 2D / 3D buttons switch to a 3D view of the piece (see 3D view below). The Joint dots and Show Scale overlays work in both.</p>}
        <Shortcuts workspace={workspace} />
        <h6 className="text-uppercase small text-muted mb-2">Other controls</h6>
        {ACTIONS.filter(here).map(def => <Entry key={def.id} def={def} words={words} />)}
      </div>
      <div className="pt-2 mt-2 border-top">
        <button type="button" className="btn btn-outline-secondary w-100" onClick={toggleHelp}>Close</button>
      </div>
    </div>
  )
}
