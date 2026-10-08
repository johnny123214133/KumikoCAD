// Ordering for the pattern library (left panel).
//   default    — the order patterns are listed in the store
//   alpha      — by name, A → Z
//   complexity — by number of strips, fewest first (ties by name)
// Built-in patterns are ordered by the chosen mode and custom (user) patterns
// are ordered the same way among themselves, then appended after the built-ins.
export const SORT_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'alpha', label: 'Alphabetical' },
  { value: 'complexity', label: 'Complexity (strips)' },
]

const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })

// A custom pattern is a recipe on a built-in one, so it has no strips of its own:
// it has as many as its base pattern.
export function stripCount(pattern, builtInsById) {
  if (Array.isArray(pattern.strips)) return pattern.strips.length
  return builtInsById[pattern.basePatternId]?.strips?.length ?? 0
}

export function sortGroup(patterns, mode, builtInsById) {
  if (mode === 'alpha') return [...patterns].sort(byName)
  if (mode === 'complexity') {
    return [...patterns].sort((a, b) => stripCount(a, builtInsById) - stripCount(b, builtInsById) || byName(a, b))
  }
  return [...patterns]
}

export function sortPatterns(builtIn, user, mode) {
  const byId = Object.fromEntries(builtIn.map((p) => [p.id, p]))
  return [...sortGroup(builtIn, mode, byId), ...sortGroup(user, mode, byId)]
}
