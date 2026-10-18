import React from 'react'
import useAppStore from '../../store/useAppStore.js'
import usePartsStore, { findPart } from '../../store/usePartsStore.js'
import { pieceEnd, endText } from '../../geometry/parts/pieces.js'
import { formatLength } from '../../geometry/units.js'
import { getMaterialLabel, getFinishLabel } from './stockLabels.js'

// The right panel of the Parts List: what the selected kind of piece is. Information only.
const Row = ({ label, children }) => (
  <div className="d-flex gap-2 py-1 border-bottom" style={{ fontSize: 13 }}>
    <span className="text-muted flex-shrink-0" style={{ width: 84 }}>{label}</span>
    <span className="flex-grow-1">{children}</span>
  </div>
)

const LAP_NAMES = { 2: 'Half lap', 3: 'Trilap' }

export default function PieceDetails() {
  const parts = usePartsStore((s) => s.parts)
  const selectedKey = usePartsStore((s) => s.selectedKey)
  const unit = useAppStore((s) => s.gridUnit)
  const found = findPart(parts, selectedKey)
  if (!found) return <p className="small text-muted mb-0">Pick a piece in the list to see its details here.</p>
  const { piece, qty, sections } = found
  const len = (mm) => formatLength(mm, unit)
  const start = endText(pieceEnd(piece, 's')), end = endText(pieceEnd(piece, 'e'))
  const laps = piece.cuts
    .filter((c) => c.role.startsWith('cut-'))
    .map((c) => ({ x: c.x, face: c.role.startsWith('cut-top') ? 'top' : 'bottom', name: LAP_NAMES[c.role.slice(-1)] ?? 'Lap', depth: c.depth * piece.thickness }))
    .sort((a, b) => a.x - b.x)
  const notches = piece.cuts.filter((c) => c.role === 'notch')
  return (
    <div>
      <h6 className="text-uppercase small text-muted mb-2" style={{ letterSpacing: '0.05em' }}>Selected piece</h6>
      <Row label="Count">{qty}</Row>
      <Row label="Length">{len(piece.length)}{piece.curved ? ' (before bending)' : ''}</Row>
      <Row label="Width">{len(piece.width)}</Row>
      <Row label="Thickness">{len(piece.thickness)}</Row>
      <Row label="Wood">{getMaterialLabel(piece.material)}</Row>
      <Row label="Finish">{getFinishLabel(piece.finish)}</Row>
      <Row label="Used in">{sections.join(', ')}</Row>
      <Row label="Start end">{start}</Row>
      <Row label="Finish end">{end}</Row>
      {(laps.length > 0 || notches.length > 0) && (
        <div className="mt-3">
          <div className="small fw-semibold mb-1">Cuts along the piece</div>
          <table className="table table-sm small mb-0">
            <thead><tr><th className="fw-normal text-muted">From start</th><th className="fw-normal text-muted">Cut</th><th className="fw-normal text-muted">Into</th><th className="fw-normal text-muted">Depth</th></tr></thead>
            <tbody>
              {laps.map((l, i) => (
                <tr key={`l${i}`}><td>{len(Math.max(0, l.x))}</td><td>{l.name}</td><td>{l.face} face</td><td>{len(l.depth)}</td></tr>
              ))}
              {notches.map((n, i) => (
                <tr key={`n${i}`}><td>{len(Math.max(0, n.x))}</td><td>V-notch</td><td>{n.side === 'R' ? 'right' : 'left'} side</td><td>{Number(n.angle.toFixed(1))}°</td></tr>
              ))}
            </tbody>
          </table>
          <div className="text-muted mt-1" style={{ fontSize: 11 }}>Positions are along the centreline, measured from the start end.</div>
        </div>
      )}
      <p className="text-muted mt-3 mb-0" style={{ fontSize: 11 }}>
        The profiles show the piece from above, from each side and from below (the left side as seen from that side, so its start is at the right). Where a cut face can be seen it is drawn a touch darker.
      </p>
    </div>
  )
}
