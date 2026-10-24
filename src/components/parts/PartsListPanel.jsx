import React, { useMemo, useEffect, useDeferredValue } from 'react'
import useAppStore from '../../store/useAppStore.js'
import useGridStore from '../../store/useGridStore.js'
import usePatternStore from '../../store/usePatternStore.js'
import usePartsStore from '../../store/usePartsStore.js'
import Accordion, { AccordionHeader, useSectionOpen } from '../shared/Accordion.jsx'
import ThemedSelect from '../shared/ThemedSelect.jsx'
import PatternIcon from '../pattern-editor/PatternIcon.jsx'
import { sortPatterns } from '../pattern-editor/sortPatterns.js'
import { computePanelParts } from '../../geometry/parts/panelParts.js'
import { pieceEnd, endText, pieceLaps } from '../../geometry/parts/pieces.js'
import { formatLength } from '../../geometry/units.js'
import { stockText } from './stockLabels.js'
import HelpTip from '../shared/HelpTip.jsx'

// The Parts List: every piece of wood the panel is made of, counted. Information only — nothing
// here is editable. Two sections: the panel's own strips (border, grid strips) and the patterns'.
// The patterns' pieces are shown counted by piece (identical pieces from every pattern together,
// each one expandable to the patterns that need it) or grouped by pattern (each expandable to its
// own pieces, already multiplied by the number of copies of the pattern in the panel).

const SORT_CHOICES = [
  { value: 'default', label: 'Default' },
  { value: 'pattern', label: 'Pattern' },
]

// "3 × 120.5 mm" style one-line description of a piece.
function PieceFacts({ piece, unit }) {
  const len = (mm) => formatLength(mm, unit)
  const start = endText(pieceEnd(piece, 's')), end = endText(pieceEnd(piece, 'e'))
  const laps = pieceLaps(piece)
  const material = stockText(piece)
  return (
    <>
      <div className="text-muted" style={{ fontSize: 11 }}>
        {len(piece.width)} wide × {len(piece.thickness)} thick{material ? ` · ${material}` : ''}
      </div>
      <div className="text-muted" style={{ fontSize: 11 }}>
        Ends: {start === end ? `${start} both` : `${start} / ${end}`}
        {laps.length > 0 && ` · ${laps.map((l) => `${l.count} ${l.label}${l.count > 1 && l.kind !== 'notch' ? 's' : ''}`).join(', ')}`}
        {piece.curved && ' · curved (length is before bending)'}
      </div>
    </>
  )
}

const pieceLengthText = (piece, unit) => formatLength(piece.length, unit)

// One piece row. `children` (if any) makes it expandable.
function PieceRow({ id, item, unit, expandable, children }) {
  const [open, toggle] = useSectionOpen(`parts:${id}`, false)
  const { piece, qty } = item
  const selected = usePartsStore((s) => s.selectedKey === piece.key)
  const selectKey = usePartsStore((s) => s.selectKey)
  return (
    <div className="border-bottom py-1" style={{ fontSize: 13, background: selected ? 'rgba(var(--bs-primary-rgb), 0.12)' : undefined, boxShadow: selected ? 'inset 3px 0 0 var(--bs-primary)' : undefined }}>
      <div className="d-flex align-items-start gap-2">
        <div
          className="d-flex align-items-start gap-2 flex-grow-1"
          style={{ minWidth: 0, cursor: 'pointer' }}
          role="button"
          tabIndex={0}
          aria-pressed={selected}
          title="Show this piece's profiles"
          onClick={() => selectKey(piece.key)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectKey(piece.key) } }}
        >
          <span className="fw-semibold text-end flex-shrink-0" style={{ minWidth: 30 }}>{qty}×</span>
          <div className="flex-grow-1" style={{ minWidth: 0 }}>
            <div className="fw-medium">{pieceLengthText(piece, unit)} long</div>
            <PieceFacts piece={piece} unit={unit} />
          </div>
        </div>
        {expandable && (
          <button type="button" className="btn btn-link btn-sm p-0 text-muted text-decoration-none flex-shrink-0" aria-expanded={open} onClick={toggle} title={open ? 'Hide patterns' : 'Show patterns'}>
            {open ? '▾' : '▸'}
          </button>
        )}
      </div>
      {expandable && open && <div className="ms-4 mt-1">{children}</div>}
    </div>
  )
}

function PieceList({ idPrefix, items, unit, empty }) {
  if (!items.length) return <div className="text-muted small">{empty}</div>
  return items.map((item) => <PieceRow key={item.piece.key} id={`${idPrefix}:${item.piece.key}`} item={item} unit={unit} />)
}

function Subsection({ id, title, total, children }) {
  const [open, toggle] = useSectionOpen(`parts:${id}`, true)
  return (
    <div className="mb-2">
      <AccordionHeader open={open} onToggle={toggle} controls={`parts-${id}`} right={<span className="small text-muted">{total}</span>}>{title}</AccordionHeader>
      {open && <div id={`parts-${id}`} className="mt-1">{children}</div>}
    </div>
  )
}

// A pattern's name (the library entry's) — or its id if it is gone from the library.
function usePatternLookup() {
  const builtIn = usePatternStore((s) => s.builtInPatterns)
  const user = usePatternStore((s) => s.userPatterns)
  return useMemo(() => {
    const byId = new Map([...builtIn, ...user].map((p) => [p.id, p]))
    return { byId, order: sortPatterns(builtIn, user, 'default').map((p) => p.id) }
  }, [builtIn, user])
}

function PatternByPieceRow({ item, unit, names }) {
  return (
    <PieceRow id={`piece:${item.piece.key}`} item={item} unit={unit} expandable>
      {[...item.from.entries()].map(([patternId, n]) => (
        <div key={patternId} className="small d-flex gap-2"><span className="fw-semibold text-end" style={{ minWidth: 28 }}>{n}×</span><span className="text-truncate">{names(patternId)}</span></div>
      ))}
    </PieceRow>
  )
}

function PatternGroup({ group, pattern, unit }) {
  const [open, toggle] = useSectionOpen(`parts:pattern:${group.patternId}`, false)
  const setStockLaminated = useAppStore((s) => s.setStockLaminated)
  return (
    <div className="border-bottom">
      <div className="d-flex align-items-center gap-2 py-1" style={{ fontSize: 13 }}>
        <span className="fw-semibold text-end flex-shrink-0" style={{ minWidth: 30 }}>{group.cells}×</span>
        <button type="button" className="btn btn-link p-0 d-flex align-items-center gap-2 text-start text-decoration-none flex-grow-1" style={{ color: 'inherit', minWidth: 0 }} aria-expanded={open} onClick={toggle}>
          {pattern ? <PatternIcon pattern={pattern} size={28} /> : <span style={{ width: 28, height: 28, flexShrink: 0 }} />}
          <span className="fw-medium text-truncate">{pattern?.name ?? group.patternId}</span>
          <span className="text-muted flex-shrink-0" style={{ fontSize: 10 }} aria-hidden="true">{open ? '▾' : '▸'}</span>
        </button>
        <span className="small text-muted flex-shrink-0">{group.total} pcs</span>
      </div>
      {(group.edgeCells > 0 || group.approx) && (
        <div className="text-muted ms-5 pb-1" style={{ fontSize: 11 }}>
          {group.edgeCells > 0 && `${group.edgeCells} at the panel's edge, trimmed to fit.`}
          {group.approx && ' Some curved strips at the edge are counted whole.'}
        </div>
      )}
      {group.note && group.laminated == null && <div className="ms-5 pb-1 fst-italic" style={{ fontSize: 11 }}>{group.note}</div>}
      {group.laminated != null && (
        <label className="ms-5 pb-1 d-flex align-items-center gap-2" style={{ fontSize: 12 }}>
          <input type="checkbox" className="form-check-input m-0" checked={group.laminated} onChange={(e) => setStockLaminated(group.patternId, e.target.checked)} />
          Laminated
          {group.note && <HelpTip text={group.note} />}
        </label>
      )}
      {open && <div className="ms-3 mb-1"><PieceList idPrefix={`pattern:${group.patternId}`} items={group.items} unit={unit} empty="No pieces." /></div>}
    </div>
  )
}

export default function PartsListPanel() {
  const grid = useGridStore((s) => s)
  const unit = useAppStore((s) => s.gridUnit)
  const partsSort = useAppStore((s) => s.partsSort)
  const setPartsSort = useAppStore((s) => s.setPartsSort)
  const getComputedPattern = usePatternStore((s) => s.getComputedPattern)
  const lookup = usePatternLookup()

  // (memoised: useDeferredValue needs the same object back while nothing changed)
  const { cols, rows, cellWidth, orientation, cornerBehavior, gridStripWidth, borderWidth, borderCorner, panelDepth, material, finish, spacePatterns, spaceXforms } = grid
  const stockLaminated = useAppStore((s) => s.stockLaminated)
  const current = useMemo(
    () => ({ cols, rows, cellWidth, orientation, cornerBehavior, gridStripWidth, borderWidth, borderCorner, panelDepth, material, finish, spacePatterns, spaceXforms, stockLaminated }),
    [cols, rows, cellWidth, orientation, cornerBehavior, gridStripWidth, borderWidth, borderCorner, panelDepth, material, finish, spacePatterns, spaceXforms, stockLaminated],
  )
  const input = useDeferredValue(current)
  const overrides = usePatternStore((s) => s.patternOverrides) // a pattern's own edits change its pieces
  const parts = useMemo(() => {
    try { return { value: computePanelParts({ grid: input, getPattern: (id, ctx) => getComputedPattern(id, { ...ctx, gridMaterial: input.material, gridFinish: input.finish }) }) } } catch (error) { return { error } }
  }, [input, getComputedPattern, lookup, overrides])

  const setParts = usePartsStore((s) => s.setParts)
  useEffect(() => { if (parts.value) setParts(parts.value) }, [parts, setParts])

  if (parts.error) return <p className="small text-danger mb-0">The parts list couldn't be worked out for this panel.</p>
  const { border, gridStrips, patterns } = parts.value
  const name = (id) => lookup.byId.get(id)?.name ?? id
  const groups = [...patterns.byPattern].sort((a, b) => lookup.order.indexOf(a.patternId) - lookup.order.indexOf(b.patternId))
  const patternCount = patterns.byPattern.reduce((n, g) => n + g.cells, 0)

  return (
    <div className="parts-list">
      <Accordion id="parts-panel" title="Panel" defaultOpen right={<span className="small text-muted">{border.total + gridStrips.total}</span>}>
        <Subsection id="border" title="Border" total={border.total}>
          <PieceList idPrefix="border" items={border.items} unit={unit} empty="No border strips." />
        </Subsection>
        <Subsection id="grid" title="Grid strips" total={gridStrips.total}>
          <PieceList idPrefix="grid" items={gridStrips.items} unit={unit} empty="No grid strips." />
        </Subsection>
      </Accordion>

      <Accordion id="parts-patterns" title="Patterns" defaultOpen right={<span className="small text-muted">{patterns.total}</span>}>
        <div className="d-flex align-items-center gap-2 mb-2">
          <span className="small text-muted flex-shrink-0">Sort</span>
          <ThemedSelect className="form-select form-select-sm" value={partsSort} onChange={setPartsSort} options={SORT_CHOICES} aria-label="Sort the patterns' pieces" />
        </div>
        {patternCount === 0 && <div className="text-muted small">No patterns are placed in the panel.</div>}
        {patterns.unbuilt.length > 0 && (
          <div className="small text-warning mb-2">{patterns.unbuilt.map(name).join(', ')} can't be built at this cell width, so {patterns.unbuilt.length > 1 ? 'they are' : 'it is'} not counted.</div>
        )}
        {partsSort === 'default'
          ? patterns.byPiece.map((item) => <PatternByPieceRow key={item.piece.key} item={item} unit={unit} names={name} />)
          : groups.map((g) => <PatternGroup key={g.patternId} group={g} pattern={lookup.byId.get(g.patternId)} unit={unit} />)}
      </Accordion>
    </div>
  )
}
