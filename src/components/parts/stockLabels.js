import { WOOD_OPTIONS, FINISH_OPTIONS } from '../../geometry/materials.js'

// Short display names for a piece's wood and finish ids ("Hinoki", "Natural"); the id itself if unknown.
const short = (label) => label.split(/ [(/]/)[0]
export const getMaterialLabel = (id) => { const o = WOOD_OPTIONS.find((w) => w.id === id); return o ? short(o.label) : id ?? '' }
export const getFinishLabel = (id) => { const o = FINISH_OPTIONS.find((f) => f.id === id); return o ? short(o.label) : id ?? '' }
