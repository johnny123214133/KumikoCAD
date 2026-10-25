import React, { useState } from 'react'
import { getMaterialColor, canonicalWood, allowedFinish } from '../../geometry/woodFinishColors.js'
import { WOOD_OPTIONS, FINISH_OPTIONS, paletteRows } from '../../geometry/materials.js'
import { darkenHex } from '../../geometry/color.js'

const labelOf = (list, id) => list.find((o) => o.id === id)?.label ?? id
const finishName = (id) => (id === 'natural' ? 'Unfinished' : labelOf(FINISH_OPTIONS, id))

// The wood + finish colour grid. Hovering (or focusing) a swatch names the wood and
// finish behind it; clicking calls onPick(wood, finish). `onCancel` adds a Cancel button.
export function ColorPalette({ material, finish, onPick, onCancel }) {
  const [hover, setHover] = useState(null)
  const wood = canonicalWood(material)
  const fin = allowedFinish(wood, finish)
  const shown = hover ?? { wood, finish: fin }
  return (
    <div data-color-palette onMouseLeave={() => setHover(null)}>
      <div className="small mb-2" style={{ minHeight: 36 }} aria-live="polite">
        <div className="fw-semibold">{labelOf(WOOD_OPTIONS, shown.wood)} · {finishName(shown.finish)}</div>
        <div className="text-muted">{getMaterialColor(shown.wood, shown.finish)}</div>
      </div>
      <div className="d-flex flex-column gap-1">
        {paletteRows().map(({ wood: w, finishes }) => (
          <div key={w.id} className="d-flex gap-1">
            {finishes.map((f) => {
              const c = getMaterialColor(w.id, f.id)
              const selected = w.id === wood && f.id === fin
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-label={`${w.label}, ${finishName(f.id)}`}
                  aria-pressed={selected}
                  data-color={c}
                  onMouseEnter={() => setHover({ wood: w.id, finish: f.id })}
                  onFocus={() => setHover({ wood: w.id, finish: f.id })}
                  onClick={() => onPick(w.id, f.id)}
                  style={{
                    width: 32, height: 24, padding: 0, borderRadius: 4, background: c, cursor: 'pointer',
                    border: selected ? '2px solid #212529' : `1px solid ${darkenHex(c, 0.15)}`,
                    outline: selected ? '2px solid #fff' : 'none', outlineOffset: -4,
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>
      {onCancel && <button type="button" className="btn btn-sm btn-outline-secondary w-100 mt-2" onClick={onCancel}>Cancel</button>}
    </div>
  )
}

// The colour a wood + finish comes out as: a swatch (edged in a darker shade of
// itself), a "Wood · Finish" caption and the hex value. Clicking the swatch opens the
// palette: via `onOpen` when the caller shows it itself (the Fill / paint window),
// otherwise as an inline section that calls onPick(wood, finish).
export default function ColorSwatchLine({ material, finish, className = 'mt-2', onPick, onOpen }) {
  const [open, setOpen] = useState(false)
  const wood = canonicalWood(material)
  const fin = allowedFinish(wood, finish)
  const color = getMaterialColor(wood, fin)
  const body = (
    <>
      <div
        aria-label="Resulting colour"
        data-color={color}
        style={{ width: 36, height: 36, borderRadius: 4, background: color, border: `2px solid ${darkenHex(color, 0.15)}`, flexShrink: 0 }}
      />
      <span className="small text-start lh-sm">
        <span className="d-block fw-semibold text-body">{labelOf(WOOD_OPTIONS, wood)} · {finishName(fin)}</span>
        <span className="text-muted">{color}</span>
      </span>
    </>
  )
  if (!onPick && !onOpen) return <div className={`d-flex align-items-center gap-2 ${className}`}>{body}</div>
  return (
    <div className={className}>
      <button
        type="button"
        className="d-flex align-items-center gap-2 btn btn-link p-0 text-decoration-none"
        aria-label="Choose colour from palette"
        aria-expanded={onOpen ? undefined : open}
        title="Choose from the palette"
        onClick={() => (onOpen ? onOpen() : setOpen((o) => !o))}
      >
        {body}
      </button>
      {!onOpen && open && (
        <div className="mt-2">
          <ColorPalette material={wood} finish={fin} onPick={(w, f) => { onPick(w, f); setOpen(false) }} onCancel={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}
