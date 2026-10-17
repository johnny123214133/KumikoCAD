import React, { useEffect, useMemo, useState } from 'react'
import { useTheme } from '../../store/useThemeStore.js'
import { ASANOHA_TRIANGLE, ASANOHA_STRIPS } from './asanohaShape.js'
import { WOOD_OPTIONS } from '../../geometry/materials.js'
import { getMaterialColor } from '../../geometry/woodFinishColors.js'

// The canvas's loading indicator, shown in place of the canvas only (the rest of the app is
// already usable): six Asanoha cells around a point — the star the pattern is named for —
// whose strips change wood one at a time, at random. It waits `delayMs` before showing at
// all, so a canvas that is ready at once never flashes it. Still (no animation) for people
// who ask their system for reduced motion.
const rotate = (pts, deg) => {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r)
  return pts.map(([x, y]) => [x * c - y * s, x * s + y * c])
}
const toPath = (pts) => `M${pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L')}Z`
const STEP_MS = 260
const WOODS = WOOD_OPTIONS.map((w) => getMaterialColor(w.id, 'natural'))

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

export default function CanvasLoader({ delayMs = 0, label = 'Loading the canvas…' }) {
  const theme = useTheme()
  const [visible, setVisible] = useState(delayMs <= 0)
  useEffect(() => {
    if (visible) return undefined
    const t = setTimeout(() => setVisible(true), delayMs)
    return () => clearTimeout(t)
  }, [visible, delayMs])

  // Six copies of the cell turned about its first corner make the hexagon: 18 strips.
  const cells = useMemo(() => Array.from({ length: 6 }, (_, k) => ({
    tri: rotate(ASANOHA_TRIANGLE, k * 60),
    strips: ASANOHA_STRIPS.map((s) => rotate(s, k * 60)),
  })), [])
  const total = cells.length * ASANOHA_STRIPS.length
  const [colors, setColors] = useState(() => Array(total).fill(WOODS[0]))
  const [last, setLast] = useState(-1)
  useEffect(() => {
    if (!visible || reducedMotion()) return undefined
    const id = setInterval(() => {
      setColors((cur) => {
        let i = Math.floor(Math.random() * total)
        if (i === last) i = (i + 1 + Math.floor(Math.random() * (total - 1))) % total
        let w = WOODS[Math.floor(Math.random() * WOODS.length)]
        if (w === cur[i]) w = WOODS[(WOODS.indexOf(w) + 1) % WOODS.length]
        setLast(i)
        const next = cur.slice()
        next[i] = w
        return next
      })
    }, STEP_MS)
    return () => clearInterval(id)
  }, [visible, total, last])

  if (!visible) return null
  const { canvas, ui } = theme
  return (
    <div
      data-canvas-loader
      role="status"
      aria-live="polite"
      style={{
        position: 'absolute', inset: 0, zIndex: 6, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 14, background: canvas.bg, color: ui.muted,
      }}
    >
      <svg width="112" height="112" viewBox="-56 -56 112 112" aria-hidden="true">
        {cells.map((c, k) => (
          <path key={`t${k}`} d={toPath(c.tri)} fill="none" stroke={canvas.boundary} strokeWidth="2.4" strokeLinejoin="round" />
        ))}
        {cells.map((c, k) => c.strips.map((s, j) => {
          const color = colors[k * ASANOHA_STRIPS.length + j]
          return <path key={`s${k}-${j}`} d={toPath(s)} fill={color} stroke={color} strokeWidth="2" strokeLinejoin="round" style={{ transition: 'fill 320ms ease, stroke 320ms ease' }} />
        }))}
      </svg>
      <div style={{ fontSize: 13 }}>{label}</div>
    </div>
  )
}
