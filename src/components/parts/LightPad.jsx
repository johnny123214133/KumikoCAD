import React, { useRef } from 'react'
import useAppStore from '../../store/useAppStore.js'
import { useTheme } from '../../store/useThemeStore.js'
import { prefersReducedMotion } from '../layout/useSlide.js'

// The 3D view's light: a small window in the canvas's top-right corner, beside the right panel. The
// camera sits in its middle, and the light is a dot you drag anywhere inside the circle. The window is
// the plane through the camera that faces the piece (x right, y up), so the light is always level with
// the camera and never behind the piece. The middle is a headlight; the edge is a raking light.
// Double-click to put it back where it started.
const SIZE = 112, PAD = 14, R = SIZE / 2 - PAD
export const DEFAULT_LIGHT = { x: -0.45, y: 0.6 }

export default function LightPad() {
  const { ui } = useTheme()
  const light = useAppStore((s) => s.lightPos)
  const setLight = useAppStore((s) => s.setLightPos)
  const open = useAppStore((s) => s.rightPanelOpen)
  const width = useAppStore((s) => s.rightPanelWidth)
  const box = useRef(null)
  const reduced = prefersReducedMotion()
  const move = (e) => {
    const r = box.current.getBoundingClientRect()
    setLight({ x: (e.clientX - r.left - SIZE / 2) / R, y: -(e.clientY - r.top - SIZE / 2) / R })
  }
  const nudge = (e) => {
    const step = e.shiftKey ? 0.2 : 0.05
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key]
    if (!d) return
    e.preventDefault(); e.stopPropagation()
    setLight({ x: light.x + d[0], y: light.y + d[1] })
  }
  const cx = SIZE / 2 + light.x * R, cy = SIZE / 2 - light.y * R
  return (
    <div
      ref={box}
      data-light-pad
      role="slider"
      tabIndex={0}
      aria-label="Light position"
      aria-valuetext={`${Math.round(light.x * 100)}% right, ${Math.round(light.y * 100)}% up from the camera`}
      title="Light: drag the dot (double-click to reset). The camera is in the middle."
      onKeyDown={nudge}
      onDoubleClick={() => setLight(DEFAULT_LIGHT)}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); move(e) }}
      onPointerMove={(e) => { if (e.buttons & 1) move(e) }}
      style={{
        position: 'absolute', top: 12, right: (open ? width : 0) + 12, width: SIZE, height: SIZE, zIndex: 5, touchAction: 'none', cursor: 'crosshair', userSelect: 'none',
        transition: reduced ? 'none' : 'right 220ms ease',
        background: ui.panel, border: `1px solid ${ui.borderStrong}`, borderRadius: 6, boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
      }}
    >
      <svg width={SIZE} height={SIZE} style={{ display: 'block' }}>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke={ui.borderStrong} strokeDasharray="3 3" />
        <line x1={SIZE / 2} y1={SIZE / 2} x2={cx} y2={cy} stroke={ui.accent} strokeOpacity="0.5" />
        {/* the camera, seen from behind */}
        <g transform={`translate(${SIZE / 2 - 9} ${SIZE / 2 - 7})`} fill="none" stroke={ui.text} strokeWidth="1.6" strokeLinejoin="round">
          <rect x="1" y="3" width="16" height="11" rx="2" /><path d="M6 3 L7.5 1 H10.5 L12 3" /><circle cx="9" cy="8.5" r="3" />
        </g>
        {/* the light */}
        <g transform={`translate(${cx} ${cy})`}>
          <circle r="6" fill="#ffd54a" stroke={ui.text} strokeWidth="1.2" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line key={a} x1={8.5 * Math.cos((a * Math.PI) / 180)} y1={8.5 * Math.sin((a * Math.PI) / 180)} x2={11 * Math.cos((a * Math.PI) / 180)} y2={11 * Math.sin((a * Math.PI) / 180)} stroke={ui.text} strokeWidth="1.2" strokeLinecap="round" />
          ))}
        </g>
      </svg>
    </div>
  )
}
