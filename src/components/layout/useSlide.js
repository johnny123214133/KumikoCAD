import { useEffect, useState } from 'react'

export const SLIDE_MS = 240

// Drives a window that slides up into view when `want` becomes true and back down out of it
// when it becomes false (the overview window, the Fill panel): the element stays mounted for
// the slide-out, and gets mounted one frame before `shown` flips so the slide-in has a start
// position to move from. Returns { render, shown } — render the element while `render`, put
// it in its resting place while `shown`.
export default function useSlide(want, ms = SLIDE_MS) {
  const [mounted, setMounted] = useState(false)
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    if (want) {
      setMounted(true)
      let raf = requestAnimationFrame(() => { raf = requestAnimationFrame(() => setEntered(true)) })
      return () => cancelAnimationFrame(raf)
    }
    setEntered(false)
    const t = setTimeout(() => setMounted(false), ms)
    return () => clearTimeout(t)
  }, [want, ms])
  return { render: mounted || want, shown: entered && want }
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
