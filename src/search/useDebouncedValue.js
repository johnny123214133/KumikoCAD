import { useEffect, useState } from 'react'

// `value`, but only after it has stopped changing for `delay` ms — so a search runs when the
// typing pauses, not on every keystroke. The first value is returned at once.
export default function useDebouncedValue(value, delay = 150) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    if (value === debounced) return undefined
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay, debounced])
  return debounced
}
