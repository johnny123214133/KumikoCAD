import { WOOD_OPTIONS, FINISH_OPTIONS, canonicalWood } from '../../geometry/materials.js'

// Short display names for a piece's wood and finish ids ("Basswood", "Natural"); the id itself if unknown.
const short = (label) => label.split(/ [(/]/)[0]
export const getMaterialLabel = (id) => { const o = WOOD_OPTIONS.find((w) => w.id === canonicalWood(id)); return o ? short(o.label) : id ?? '' }
export const getFinishLabel = (id) => { const o = FINISH_OPTIONS.find((f) => f.id === id); return o ? short(o.label) : id ?? '' }

// A piece's stock in words: "Basswood, Natural", or for laminated stock "Laminated: Walnut / Basswood / Walnut".
export function stockText(piece) {
  if (piece.layers?.length) {
    const finishes = [...new Set(piece.layers.map((l) => getFinishLabel(l.finish)))].join(', ')
    return `Laminated: ${piece.layers.map((l) => getMaterialLabel(l.material)).join(' / ')}${finishes ? `, ${finishes}` : ''}`
  }
  return [getMaterialLabel(piece.material), getFinishLabel(piece.finish)].filter(Boolean).join(', ')
}
