import React, { useEffect, useRef, useState } from 'react'
import useThemeStore from '../../store/useThemeStore.js'
import { THEMES } from '../../theme/themes.js'
import { PaletteIcon } from './icons.jsx'

// The toolbar's colour-theme selector: a button that opens a small menu of every theme,
// light ones then dark ones, each with a swatch of its colours. Picking one applies it
// at once and the menu stays open, so themes can be compared on the real canvas; it
// closes on Escape, on a click outside, or on the button again.
const WIDTH = 264

function Swatch({ theme }) {
  const chips = [theme.ui.bg, theme.ui.panel, theme.ui.accent, theme.canvas.bg]
  return (
    <span
      aria-hidden="true"
      className="d-inline-flex flex-shrink-0 overflow-hidden"
      style={{ borderRadius: 4, border: '1px solid var(--kumiko-border-strong)' }}
    >
      {chips.map((c, i) => <span key={i} style={{ width: 14, height: 18, background: c }} />)}
    </span>
  )
}

function ThemeRow({ theme, active, onPick }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      data-theme-id={theme.id}
      title={theme.blurb}
      onClick={() => onPick(theme.id)}
      className={`list-group-item list-group-item-action d-flex align-items-center gap-2 py-1 px-2 border-0 rounded ${active ? 'fw-semibold' : ''}`}
    >
      <Swatch theme={theme} />
      <span className="flex-grow-1 text-start small">{theme.name}</span>
      <span aria-hidden="true" style={{ width: 14, textAlign: 'center', color: 'var(--kumiko-accent)' }}>{active ? '✓' : ''}</span>
    </button>
  )
}

export default function ThemePicker() {
  const themeId = useThemeStore(s => s.themeId)
  const setTheme = useThemeStore(s => s.setTheme)
  const [open, setOpen] = useState(false)
  const anchorRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (menuRef.current?.contains(e.target) || anchorRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      anchorRef.current?.focus()
    }
    const close = () => setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', close)
    }
  }, [open])

  const rect = open ? anchorRef.current?.getBoundingClientRect() : null
  const current = THEMES.find(t => t.id === themeId)

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={`btn btn-sm ${open ? 'btn-dark' : 'btn-outline-secondary'}`}
        title={`Colour theme — ${current?.name ?? ''}`}
        aria-label="Colour theme"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <PaletteIcon />
      </button>
      {open && rect && (
        <div
          ref={menuRef}
          role="dialog"
          aria-label="Colour theme"
          className="card shadow-sm p-2"
          style={{ position: 'fixed', top: rect.bottom + 4, left: Math.max(8, Math.min(rect.right - WIDTH, window.innerWidth - WIDTH - 8)), width: WIDTH, zIndex: 1000 }}
        >
          {['light', 'dark'].map((mode) => (
            <div key={mode} role="radiogroup" aria-label={`${mode === 'light' ? 'Light' : 'Dark'} themes`} className="mb-1">
              <div className="text-uppercase text-muted fw-semibold px-2 py-1" style={{ fontSize: 10, letterSpacing: '0.05em' }}>
                {mode === 'light' ? 'Light' : 'Dark'}
              </div>
              {THEMES.filter(t => t.mode === mode).map(t => (
                <ThemeRow key={t.id} theme={t} active={t.id === themeId} onPick={setTheme} />
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
