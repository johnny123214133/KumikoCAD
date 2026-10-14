import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// A drop-in for a native <select> whose open list the app draws itself. The browser draws a
// native select's list (on macOS and in Safari it is the operating system's own menu), and
// no stylesheet reaches it reliably, so on a dark theme it stayed white. This one is
// built from ordinary elements and follows the theme like everything else.
//
//   value, onChange(value)   the selected option's value, and the new value (not an event)
//   options                  [{ value, label }]
//   className, style, title, id, aria-label, disabled   as on the <select> it replaces
//
// Keyboard (focus stays on the button throughout, as in a native combobox): Enter, Space or
// the arrows open it; the arrows, Home and End move; Enter or Space picks; typing letters
// jumps to a matching option; Escape or Tab closes. The list is a portal on document.body
// so a scrolling side panel can't clip it, and it opens upward when there is no room below.
export const asOptions = (list) => list.map((o) => ({ value: o.value ?? o.id, label: o.label }))

export default function ThemedSelect({ value, onChange, options, className = '', style, title, id, 'aria-label': ariaLabel, disabled }) {
  const uid = useId()
  const listId = `${uid}-list`
  const btnRef = useRef(null)
  const listRef = useRef(null)
  const typed = useRef({ text: '', timer: null })
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [box, setBox] = useState(null) // { left, width, top } in viewport px

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value))
  const selected = options.find((o) => o.value === value)

  const openList = () => {
    if (disabled) return
    const r = btnRef.current.getBoundingClientRect()
    setBox({ left: r.left, width: r.width, top: r.bottom + 2, above: r.top - 2, hidden: true })
    setActive(selectedIndex)
    setOpen(true)
  }
  const closeList = () => setOpen(false)
  const choose = (i) => {
    const o = options[i]
    closeList()
    if (o && o.value !== value) onChange(o.value)
  }

  // Once the list has a size: flip upward if it would run off the bottom, and keep it on screen.
  useLayoutEffect(() => {
    if (!open || !box?.hidden || !listRef.current) return
    const h = listRef.current.offsetHeight
    const fitsBelow = box.top + h <= window.innerHeight - 8
    const top = fitsBelow || box.above - h < 8 ? box.top : box.above - h
    setBox((b) => ({ ...b, top, hidden: false }))
  }, [open, box])

  // Keep the active option in view when moving with the keyboard.
  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView?.({ block: 'nearest' })
  }, [open, active, box?.hidden])

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (listRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return
      closeList()
    }
    const onScroll = (e) => { if (!listRef.current?.contains(e.target)) closeList() }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('resize', closeList)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('resize', closeList)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  useEffect(() => () => clearTimeout(typed.current.timer), [])

  const onKeyDown = (e) => {
    if (disabled) return
    const last = options.length - 1
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openList() }
      return
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActive((i) => Math.min(last, i + 1)); break
      case 'ArrowUp': e.preventDefault(); setActive((i) => Math.max(0, i - 1)); break
      case 'Home': e.preventDefault(); setActive(0); break
      case 'End': e.preventDefault(); setActive(last); break
      case 'Enter': case ' ': e.preventDefault(); choose(active); break
      case 'Escape': e.preventDefault(); e.stopPropagation(); closeList(); break
      case 'Tab': closeList(); break
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const t = typed.current
          t.text += e.key.toLowerCase()
          clearTimeout(t.timer)
          t.timer = setTimeout(() => { t.text = '' }, 600)
          const from = t.text.length > 1 ? active : active + 1
          const order = [...options.keys()].map((_, k) => (from + k) % options.length)
          const hit = order.find((i) => options[i].label.toLowerCase().startsWith(t.text))
          if (hit != null) setActive(hit)
        }
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${uid}-${active}` : undefined}
        aria-label={ariaLabel}
        data-value={value}
        title={title}
        disabled={disabled}
        className={`form-select text-start text-truncate ${className}`}
        style={style}
        onClick={() => (open ? closeList() : openList())}
        onKeyDown={onKeyDown}
        onBlur={closeList}
      >
        {selected?.label ?? ''}
      </button>
      {open && box && createPortal(
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="kumiko-listbox"
          style={{ position: 'fixed', left: box.left, top: box.top, minWidth: box.width, visibility: box.hidden ? 'hidden' : 'visible' }}
        >
          {options.map((o, i) => (
            <div
              key={o.value}
              id={`${uid}-${i}`}
              role="option"
              aria-selected={o.value === value}
              data-value={o.value}
              data-active={i === active}
              className="kumiko-option"
              // mousedown must not move focus off the button, or its blur would close the list first.
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(i)}
            >
              <span aria-hidden="true" className="kumiko-option-check">{o.value === value ? '✓' : ''}</span>
              <span>{o.label}</span>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}
