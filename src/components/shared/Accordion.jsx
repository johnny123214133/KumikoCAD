import React from 'react'
import useAppStore from '../../store/useAppStore.js'

// The accordion header used by the Recently Used list and by every section of the
// right-hand menus: a small triangle outside the (uppercase) section name, and the
// whole thing is one button that opens/closes the section. `right` is anything to
// show at the far end of the header row (a count, a spinner) — outside the button.
export function AccordionHeader({ open, onToggle, controls, children, right }) {
  return (
    <div className="d-flex align-items-center justify-content-between gap-2 flex-shrink-0">
      <button
        type="button"
        className="btn btn-link p-0 d-flex align-items-center gap-1 text-start text-decoration-none flex-shrink-0"
        style={{ color: 'inherit' }}
        aria-expanded={open}
        aria-controls={controls}
        onClick={onToggle}
      >
        <span className="text-muted" style={{ fontSize: '10px', width: '10px', display: 'inline-block' }} aria-hidden="true">{open ? '▾' : '▸'}</span>
        <span className="fw-semibold small text-uppercase text-muted" style={{ letterSpacing: '0.05em', fontSize: '11px' }}>{children}</span>
      </button>
      {right}
    </div>
  )
}

// Whether a section is open lives in useAppStore (not in the component) so it
// survives the menu unmounting on a workspace switch, and is remembered for the
// session. `defaultOpen` applies until the user has toggled it.
export function useSectionOpen(id, defaultOpen = false) {
  const open = useAppStore(s => s.sectionOpen[id] ?? defaultOpen)
  const setSectionOpen = useAppStore(s => s.setSectionOpen)
  return [open, () => setSectionOpen(id, !open)]
}

// One independently expandable section. A closed section doesn't render its body.
export default function Accordion({ id, title, defaultOpen = false, right, children }) {
  const [open, toggle] = useSectionOpen(id, defaultOpen)
  const bodyId = `section-${id}`
  return (
    <section className="border-bottom pb-2 mb-2" data-section={id}>
      <AccordionHeader open={open} onToggle={toggle} controls={bodyId} right={right}>{title}</AccordionHeader>
      {open && <div id={bodyId} className="mt-2 pb-1">{children}</div>}
    </section>
  )
}
