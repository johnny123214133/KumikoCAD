import React from 'react'
import { getMaterialColor } from '../../geometry/woodFinishColors.js'
import { darkenHex } from '../../geometry/color.js'

// The colour a wood + finish comes out as: a swatch (edged in a darker shade of
// itself) and its hex value. Shared by the Fill / paint menu and the Strip
// Properties sections.
export default function ColorSwatchLine({ material, finish, className = 'mt-2' }) {
  const color = getMaterialColor(material, finish)
  return (
    <div className={`d-flex align-items-center gap-2 ${className}`}>
      <div
        aria-label="Resulting colour"
        data-color={color}
        style={{ width: 36, height: 36, borderRadius: 4, background: color, border: `2px solid ${darkenHex(color, 0.15)}`, flexShrink: 0 }}
      />
      <span className="small text-muted">{color}</span>
    </div>
  )
}
