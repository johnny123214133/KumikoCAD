import { lazy } from 'react'

// React.lazy for a component whose loading indicator should not flash. The indicator itself
// (CanvasLoader) only appears after `delayMs`; if the module took longer than that to arrive,
// the lazy load is held until the indicator has been up for `minShowMs`, so it shows as a
// short animation and not a blink. A module that arrives quickly is used at once.
export function lazyWithMinimum(loader, { delayMs = 150, minShowMs = 700 } = {}) {
  return lazy(async () => {
    const t0 = performance.now()
    const mod = await loader()
    const took = performance.now() - t0
    if (took > delayMs) await new Promise((r) => setTimeout(r, Math.max(0, minShowMs - (took - delayMs))))
    return mod
  })
}
