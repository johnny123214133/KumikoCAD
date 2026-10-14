import React, { useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// A small question-mark icon that shows `text` in a tooltip while it is hovered or
// focused. The tooltip is drawn in a portal on document.body so the side panel's
// scrolling can't clip it, and is nudged to stay on screen.
export default function HelpTip({ text, label = 'More information' }) {
  const iconRef = useRef(null)
  const tipRef = useRef(null)
  const id = useId()
  const [anchor, setAnchor] = useState(null) // { x, y } just under the icon, in viewport px

  const show = () => {
    const r = iconRef.current?.getBoundingClientRect()
    if (r) setAnchor({ x: r.left + r.width / 2, y: r.bottom })
  }
  const hide = () => setAnchor(null)

  // Centre under the icon, then pull back inside the window if that overflows.
  useLayoutEffect(() => {
    const el = tipRef.current
    if (!anchor || !el) return
    const w = el.offsetWidth
    const left = Math.max(8, Math.min(anchor.x - w / 2, window.innerWidth - w - 8))
    el.style.left = `${left}px`
    el.style.visibility = 'visible'
  }, [anchor])

  return (
    <>
      <span
        ref={iconRef}
        className="text-muted"
        tabIndex={0}
        role="img"
        aria-label={label}
        aria-describedby={anchor ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          width: 14, height: 14, marginLeft: '0.5rem', borderRadius: '50%', border: '1px solid currentColor',
          fontSize: 10, fontWeight: 600, lineHeight: 1, cursor: 'help', userSelect: 'none',
        }}
      >
        ?
      </span>
      {anchor && createPortal(
        <div
          ref={tipRef}
          id={id}
          role="tooltip"
          style={{
            position: 'fixed', top: anchor.y + 6, left: 0, visibility: 'hidden', zIndex: 3000,
            width: 'max-content', maxWidth: 240, padding: '6px 8px', borderRadius: 4, pointerEvents: 'none',
            background: 'var(--kumiko-tip-bg)', color: 'var(--kumiko-tip-fg)', fontSize: 12, lineHeight: 1.35, boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          }}
        >
          {text}
        </div>,
        document.body,
      )}
    </>
  )
}

// A form label with an optional help tooltip a little way after its text.
export function FieldLabel({ label, tip, htmlFor, className = 'mb-1' }) {
  return (
    <div className={`d-flex align-items-center ${className}`}>
      <label className="form-label small mb-0" htmlFor={htmlFor}>{label}</label>
      {tip && <HelpTip text={tip} />}
    </div>
  )
}
