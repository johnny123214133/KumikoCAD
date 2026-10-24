import React from 'react'
import useAppStore from '../../store/useAppStore.js'
import usePartsStore, { findPart } from '../../store/usePartsStore.js'
import { pieceEnd, endText } from '../../geometry/parts/pieces.js'
import { formatLength } from '../../geometry/units.js'
import { getMaterialLabel, getFinishLabel, stockText } from './stockLabels.js'

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
    .map((c) => {
      // the cut-away's footprint: how far it runs along the piece and across it
      const pts = (c.regions ?? []).flat()
      const along = pts.length ? [Math.min(...pts.map((q) => q[0])), Math.max(...pts.map((q) => q[0]))] : null
      const across = pts.length ? Math.max(...pts.map((q) => q[1])) - Math.min(...pts.map((q) => q[1])) : null
      return { x: c.x, face: c.role.startsWith('cut-top') ? 'top' : 'bottom', name: LAP_NAMES[c.role.slice(-1)] ?? 'Lap', depth: c.depth * piece.thickness, along, across }
    })
    .sort((a, b) => a.x - b.x)
  const notches = piece.cuts.filter((c) => c.role === 'notch')
  // The cuts that make the ends (mitres, tapers, cuts against the border), listed with the rest; a square end is no cut.
  const ENDS = { miter: 'Miter', miterHalfLap: 'Miter', taper: 'Taper', vNotch: 'V-notch end', butt: 'Butt cut at the border' }
  const ends = piece.cuts
    .filter((c) => (c.role === 'end' || c.role === 'border') && c.end && (Math.abs(c.angle - 90) > 0.05 || (c.notch && c.notch !== 'miter' && c.notch !== 'miterHalfLap')))
    .map((c) => ({ x: c.x, end: c.end, name: ENDS[c.notch] ?? 'End cut', angle: c.angle }))
    .sort((a, b) => a.x - b.x)
  return (
    <div>
      <h6 className="text-uppercase small text-muted mb-2" style={{ letterSpacing: '0.05em' }}>Selected piece</h6>
      <Row label="Count">{qty}</Row>
      <Row label="Length">{len(piece.length)}{piece.curved ? ' (before bending)' : ''}</Row>
      <Row label="Width">{len(piece.width)}</Row>
      <Row label="Thickness">{len(piece.thickness)}</Row>
      {piece.layers?.length ? (
        <Row label="Stock">{stockText(piece)}</Row>
      ) : (
        <>
          <Row label="Wood">{getMaterialLabel(piece.material)}</Row>
          <Row label="Finish">{getFinishLabel(piece.finish)}</Row>
        </>
      )}
      <Row label="Used in">{sections.join(', ')}</Row>
      <Row label="Start end">{start}</Row>
      <Row label="Finish end">{end}</Row>
      {(laps.length > 0 || notches.length > 0 || ends.length > 0) && (
        <div className="mt-3">
          <div className="small fw-semibold mb-1">Cuts</div>
          <table className="table table-sm small mb-0">
            <thead><tr><th className="fw-normal text-muted">From start</th><th className="fw-normal text-muted">Cut</th><th className="fw-normal text-muted">Into</th><th className="fw-normal text-muted">Depth</th></tr></thead>
            <tbody>
              {ends.map((e, i) => (
                <tr key={`e${i}`}><td>{len(Math.max(0, e.x))}</td><td>{e.name} {Math.abs(e.angle - 90) > 0.05 ? `${Number(e.angle.toFixed(1))}°` : ''}</td><td>{e.end === 's' ? 'start' : 'finish'} end</td><td>through</td></tr>
              ))}
              {laps.flatMap((l, i) => [
                <tr key={`l${i}`} style={l.along ? { borderBottomColor: 'transparent' } : undefined}><td>{len(Math.max(0, l.x))}</td><td>{l.name}</td><td>{l.face} face</td><td>{len(l.depth)}</td></tr>,
                l.along && (
                  <tr key={`l${i}m`}><td colSpan={4} className="text-muted pt-0">
                    Cut away {len(l.along[1] - l.along[0])} along the piece (from {len(Math.max(0, l.along[0]))} to {len(Math.max(0, l.along[1]))}), {len(l.across)} across, {len(l.depth)} deep — leaves {len(piece.thickness - l.depth)} of {len(piece.thickness)}
                  </td></tr>
                ),
              ])}
              {notches.flatMap((n, i) => [
                <tr key={`n${i}`} style={n.open ? { borderBottomColor: 'transparent' } : undefined}><td>{len(Math.max(0, n.x))}</td><td>V-notch</td><td>{n.side === 'R' ? 'right' : 'left'} side</td><td>{Number(n.angle.toFixed(1))}°</td></tr>,
                n.open > 0 && (
                  <tr key={`n${i}m`}><td colSpan={4} className="text-muted pt-0">
                    Opens {len(n.open)} wide at the face, apex {len(n.reach)} in from it; {Number(n.angle.toFixed(1))}° included angle
                  </td></tr>
                ),
              ])}
            </tbody>
          </table>
          <div className="text-muted mt-1" style={{ fontSize: 11 }}>Positions are along the centreline, measured from the start end.</div>
        </div>
      )}
      {piece.missing?.length > 0 && (
        <p className="mt-3 mb-0" style={{ fontSize: 12 }}>
          Cut at the panel's edge: this piece is made only as far as the border, {piece.cuts.some((c) => c.role === 'border' && !c.end) ? 'which also runs along it, so it is cut down its length as well. ' : 'with a butt joint against it. '}
          The rest of the strip, which would lie under the border, is drawn dotted in a lighter tone and is not made.
        </p>
      )}
      <p className="text-muted mt-3 mb-0" style={{ fontSize: 11 }}>
        The profiles show the piece from above, from each side and from below (the left side as seen from that side, so its start is at the right). Where a cut face can be seen it is drawn a touch darker.
      </p>
    </div>
  )
}
