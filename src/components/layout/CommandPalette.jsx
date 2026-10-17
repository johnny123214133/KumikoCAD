import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import useAppStore from '../../store/useAppStore.js'
import usePatternStore from '../../store/usePatternStore.js'
import { searchItems } from '../../search/fuzzy.js'
import { patternFields } from '../../search/patternSearch.js'
import useDebouncedValue from '../../search/useDebouncedValue.js'
import { buildCommands, buildPatternCommands } from './commands.js'
import './chrome.css'

// Ctrl/Cmd + K: type to find a command, a tool, an overlay, a theme or a pattern, then Enter.
// The search is fuzzy (see search/fuzzy.js) and waits for a pause in typing. With nothing typed
// the commands for the current editor are listed; patterns only show once you search.
const MAX_RESULTS = 40
const DEBOUNCE_MS = 120

// `title` with the matched letters in bold.
function Highlighted({ text, positions }) {
  if (!positions?.length) return text
  const set = new Set(positions)
  const out = []
  let run = '', bold = false
  const flush = () => { if (run) out.push(bold ? <strong key={out.length}>{run}</strong> : run); run = '' }
  for (let i = 0; i < text.length; i++) {
    const b = set.has(i)
    if (b !== bold) { flush(); bold = b }
    run += text[i]
  }
  flush()
  return <>{out}</>
}

function PaletteBody({ onClose }) {
  const workspace = useAppStore((s) => s.workspace)
  const builtIns = usePatternStore((s) => s.builtInPatterns)
  const userPatterns = usePatternStore((s) => s.userPatterns)
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query, DEBOUNCE_MS)
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // Built once per opening / editor / library change.
  const commands = useMemo(() => buildCommands(workspace), [workspace])
  const patterns = useMemo(() => buildPatternCommands(workspace), [workspace, builtIns, userPatterns])
  const fieldsOf = useMemo(() => (c) => (c.pattern
    ? [{ text: c.pattern.name, weight: 1 }, ...patternFields(c.pattern, builtIns).slice(1), { text: c.section, weight: 0.3 }]
    : [{ text: c.title, weight: 1 }, { text: c.keywords ?? '', weight: 0.5 }, { text: c.section, weight: 0.3 }]), [builtIns])

  const run = (q) => {
    if (!q.trim()) return commands.map((item) => ({ item, matches: [] }))
    return searchItems([...commands, ...patterns], q, fieldsOf).slice(0, MAX_RESULTS)
  }
  const results = useMemo(() => run(debounced), [debounced, commands, patterns, fieldsOf]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { setActive(0) }, [results])
  useEffect(() => { listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest' }) }, [active, results])

  const choose = (entry) => {
    if (!entry) return
    onClose()
    entry.item.run()
  }
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Home' && e.ctrlKey) { e.preventDefault(); setActive(0) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      // Enter right after typing doesn't wait for the pause: it acts on what is typed now.
      choose(query === debounced ? results[active] : run(query)[0])
    } else if (e.key === 'Escape') { e.preventDefault(); onClose() }
  }

  // Titles, with the matched letters (the title is field 0 for commands and patterns alike).
  const rows = results.map((r) => ({ ...r, positions: r.matches?.[0] }))
  let lastSection = null
  return (
    <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 560, alignItems: 'flex-start', marginTop: '12vh' }}>
      <div className="modal-content shadow">
        <div className="p-2 border-bottom">
          <input
            ref={inputRef}
            className="form-control"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={rows[active] ? `palette-opt-${active}` : undefined}
            aria-label="Search commands and patterns"
            placeholder="Search commands, tools, themes and patterns…"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>
        <div ref={listRef} id="palette-list" role="listbox" aria-label="Results" style={{ maxHeight: '52vh', overflowY: 'auto' }}>
          {rows.length === 0 && <div className="text-muted small p-3">Nothing matches “{query.trim()}”.</div>}
          {rows.map((r, i) => {
            const showSection = !query.trim() && r.item.section !== lastSection
            lastSection = r.item.section
            return (
              <React.Fragment key={r.item.id}>
                {showSection && <div className="text-uppercase text-muted fw-semibold px-3 pt-2" style={{ fontSize: 10, letterSpacing: '0.05em' }}>{r.item.section}</div>}
                <div
                  id={`palette-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className="kumiko-palette-row d-flex align-items-center justify-content-between gap-3 px-3 py-1"
                  style={{ cursor: 'pointer', fontSize: 13 }}
                  onMouseMove={() => { if (i !== active) setActive(i) }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(r)}
                >
                  <span className="text-truncate"><Highlighted text={r.item.title} positions={r.item.pattern ? null : r.positions} /></span>
                  <span className="d-inline-flex align-items-center gap-2 flex-shrink-0">
                    {query.trim() && <span className="text-muted" style={{ fontSize: 11 }}>{r.item.section}</span>}
                    {r.item.keys && <kbd className="kumiko-kbd">{r.item.keys}</kbd>}
                  </span>
                </div>
              </React.Fragment>
            )
          })}
        </div>
        <div className="border-top px-3 py-1 text-muted d-flex gap-3" style={{ fontSize: 11 }}>
          <span>{'↑↓'} move</span><span>Enter run</span><span>Esc close</span>
        </div>
      </div>
    </div>
  )
}

export default function CommandPalette() {
  const open = useAppStore((s) => s.paletteOpen)
  const setOpen = useAppStore((s) => s.setPaletteOpen)
  if (!open) return null
  const close = () => setOpen(false)
  return createPortal(
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 2000 }} />
      <div
        className="modal d-block"
        style={{ zIndex: 2001 }}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}
      >
        <PaletteBody onClose={close} />
      </div>
    </>,
    document.body,
  )
}
