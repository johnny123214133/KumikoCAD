import React, { useState, useMemo } from 'react'
import usePatternStore from '../../store/usePatternStore.js'
import useAppStore from '../../store/useAppStore.js'
import PatternIcon from './PatternIcon.jsx'
import usePatternDelete from './usePatternDelete.jsx'
import useApplyToSelection from './useApplyToSelection.jsx'
import { ListViewIcon, GridViewIcon } from '../layout/icons.jsx'
import { SORT_OPTIONS, sortPatterns, canReorderCustom } from './sortPatterns.js'
import ThemedSelect, { asOptions } from '../shared/ThemedSelect.jsx'
import { searchItems } from '../../search/fuzzy.js'
import { patternFields } from '../../search/patternSearch.js'
import useDebouncedValue from '../../search/useDebouncedValue.js'
import { choosePattern } from '../../store/patternActions.js'

export default function PatternLibrary() {
  const builtInPatterns = usePatternStore(s => s.builtInPatterns)
  const userPatterns = usePatternStore(s => s.userPatterns)
  const activePatternId = usePatternStore(s => s.activePatternId)
  const patternSort = useAppStore(s => s.patternSort)
  const setPatternSort = useAppStore(s => s.setPatternSort)
  const reorderUserPatterns = usePatternStore(s => s.reorderUserPatterns)
  const sorted = useMemo(() => sortPatterns(builtInPatterns, userPatterns, patternSort), [builtInPatterns, userPatterns, patternSort])
  // The search box: fuzzy, run once typing pauses. It looks in a pattern's name, for a custom
  // pattern the name of the built-in shape it is based on, and its wood and finish; results
  // are ordered best match first instead of by the sort option.
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 150)
  const searching = debouncedQuery.trim() !== ''
  const all = useMemo(
    () => (searching ? searchItems(sorted, debouncedQuery, (p) => patternFields(p, builtInPatterns)).map((r) => r.item) : sorted),
    [sorted, searching, debouncedQuery, builtInPatterns],
  )
  const [view, setView] = useState('list') // 'list' | 'icon'
  // Drag and drop: in the default orderings, custom patterns can be dragged onto
  // one another to put them in a new order (kept across reloads).
  const reorderable = canReorderCustom(patternSort) && !searching
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)
  const isCustom = (p) => !p.readOnly
  const dragProps = (p) => {
    if (!reorderable || !isCustom(p)) return {}
    return {
      draggable: true,
      onDragStart: (e) => { setDragId(p.id); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', p.id) } catch { /* ignore */ } },
      onDragEnd: () => { setDragId(null); setOverId(null) },
      onDragOver: (e) => { if (dragId && dragId !== p.id) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (overId !== p.id) setOverId(p.id) } },
      onDrop: (e) => { e.preventDefault(); if (dragId && dragId !== p.id) reorderUserPatterns(dragId, p.id); setDragId(null); setOverId(null) },
      'data-dragging': dragId === p.id ? 'true' : undefined,
      'data-drop-target': overId === p.id && dragId !== p.id ? 'true' : undefined,
      style: {
        opacity: dragId === p.id ? 0.4 : 1,
        boxShadow: overId === p.id && dragId !== p.id ? 'inset 0 2px 0 0 var(--kumiko-accent)' : undefined,
      },
    }
  }
  // Hover (x) + "are you sure?" dialog for custom patterns — see usePatternDelete.
  const { deleteButton, deleteDialog } = usePatternDelete()
  // Hover menu: "Apply to Current Selection" (panel editor, cells selected).
  const { hoverProps, applyMenu, panelDraggable, startPanelDrag } = useApplyToSelection()
  // dragProps (custom cards: drag to reorder) plus, in the panel editor, dragging
  // any card onto the panel to apply it to the selected cells.
  const cardProps = (p) => {
    const base = dragProps(p)
    if (!panelDraggable) return base
    return {
      ...base,
      draggable: true,
      onDragStart: (e) => { base.onDragStart?.(e); startPanelDrag(e, p) },
    }
  }

  // In the panel editor, picking a pattern here means "place copies of this
  // pattern" — so it should behave as if the Place Pattern tool button
  // itself was clicked (switch to that tool, and lock the viewport the same
  // way selecting that tool from the toolbar does), not just quietly change
  // which pattern is selected underneath whatever tool was already active.
  const selectPattern = (id) => choosePattern(id)

  return (
    <div className="d-flex flex-column flex-grow-1" style={{ minHeight: 0 }}>
      <div className="d-flex align-items-center justify-content-between mb-2 gap-2">
        <div className="fw-semibold small text-uppercase text-muted" style={{ letterSpacing: '0.05em', fontSize: '11px' }}>Patterns</div>
        <ThemedSelect
          className="form-select-sm ms-auto"
          // (the chevron is drawn smaller and nearer the edge, with room kept for it, so the text never runs under it)
          style={{ width: 'auto', fontSize: '11px', padding: '1px 24px 1px 6px', minWidth: 0, backgroundSize: '10px 8px', backgroundPosition: 'right 8px center' }}
          value={patternSort}
          onChange={setPatternSort}
          options={asOptions(SORT_OPTIONS)}
          title="Sort patterns — custom patterns are sorted the same way; the 'custom first' options list them above the built-in ones. In the Default orderings, drag custom patterns to reorder them."
          aria-label="Sort patterns"
        />
        <div className="btn-group btn-group-sm" role="group" aria-label="Pattern view">
          <button
            type="button"
            className={`btn ${view === 'list' ? 'btn-dark' : 'btn-outline-secondary'}`}
            style={{ padding: '2px 6px' }}
            title="List view"
            aria-label="List view"
            aria-pressed={view === 'list'}
            onClick={() => setView('list')}
          >
            <ListViewIcon />
          </button>
          <button
            type="button"
            className={`btn ${view === 'icon' ? 'btn-dark' : 'btn-outline-secondary'}`}
            style={{ padding: '2px 6px' }}
            title="Icon view — see more patterns at once"
            aria-label="Icon view"
            aria-pressed={view === 'icon'}
            onClick={() => setView('icon')}
          >
            <GridViewIcon />
          </button>
        </div>
      </div>

      <div className="position-relative mb-2">
        <input
          type="text"
          className="form-control form-control-sm"
          style={{ paddingRight: 26 }}
          placeholder="Search patterns…"
          aria-label="Search patterns"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape' && query) { e.preventDefault(); e.stopPropagation(); setQuery('') } }}
        />
        {query && (
          <button
            type="button"
            className="btn btn-link position-absolute top-50 end-0 translate-middle-y p-0 me-2 text-decoration-none text-muted"
            style={{ fontSize: 16, lineHeight: 1 }}
            aria-label="Clear search"
            title="Clear search"
            onClick={() => setQuery('')}
          >
            ×
          </button>
        )}
      </div>

      {/* This is the scrollable region — header above and Recently Used /
          View sections below (rendered by LeftPanel) stay fixed in place. */}
      <div className="overflow-auto" style={{ minHeight: 0, flex: '1 1 auto' }}>
        {searching && all.length === 0 && <div className="text-muted small px-1 py-2">No patterns match “{debouncedQuery.trim()}”.</div>}
        {view === 'list' ? (
          <div className="list-group list-group-flush">
            {all.map(p => (
              <div key={p.id} className="pattern-card" {...cardProps(p)} {...hoverProps(p)}>
                <button
                  className={`list-group-item list-group-item-action py-2 px-2 d-flex align-items-center gap-2 ${activePatternId === p.id ? 'active' : ''}`}
                  style={{ fontSize: '13px' }}
                  onClick={() => selectPattern(p.id)}
                >
                  <PatternIcon pattern={p} size={28} />
                  <div className="fw-medium text-truncate">{p.name}</div>
                  {/* Difficulty hidden for now (per request) — may bring back later. */}
                </button>
                {deleteButton(p)}
              </div>
            ))}
          </div>
        ) : (
          <div
            className="d-grid gap-2 pb-1"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))' }}
          >
            {all.map(p => (
              <div key={p.id} className="pattern-card" {...cardProps(p)} {...hoverProps(p)}>
                <button
                  title={p.name}
                  onClick={() => selectPattern(p.id)}
                  className={`btn w-100 p-1 d-flex flex-column align-items-center gap-1 ${activePatternId === p.id ? 'btn-dark' : 'btn-outline-secondary'}`}
                  style={{ fontSize: '10px', lineHeight: 1.1 }}
                >
                  <PatternIcon pattern={p} size={40} />
                  <span className="text-truncate w-100 text-center">{p.name}</span>
                </button>
                {deleteButton(p)}
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteDialog}
      {applyMenu}
    </div>
  )
}
