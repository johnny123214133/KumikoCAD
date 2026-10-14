// The Validation tool's question: "which cells match these ones?"
//
// Two cells match when they hold patterns with the same recipe — the same base
// pattern, strip width, wood/finish and parameters — however the patterns are
// named or saved (a custom copy of a built-in matches it while their recipes
// are equal). Rotation, mirroring and a cell's own paint don't count, and blank
// cells match each other.
//
// Pure: `keyOf(spaceId)` gives a cell's match key (a string); the caller decides
// how to work it out (and should memoize it per pattern).

// Ids (a Set) of every cell in `spaceIds` whose key equals the key of any
// reference cell. No references means nothing is highlighted.
export function matchingSpaceIds(spaceIds, keyOf, referenceIds) {
  const wanted = new Set();
  for (const id of referenceIds) {
    if (id != null) wanted.add(keyOf(id));
  }
  const out = new Set();
  if (!wanted.size) return out;
  for (const id of spaceIds) {
    if (wanted.has(keyOf(id))) out.add(id);
  }
  return out;
}
