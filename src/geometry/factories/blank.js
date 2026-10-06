import { definePattern } from './_shared.js';

// The empty cell — no strips, but its vertices/centroid still need to scale
// with cellWidth (definePattern supplies them) so the pattern-editor's own
// preview, which draws pattern.vertices directly, stays correctly sized.
export const buildBlank = definePattern({
  id: 'builtin:blank',
  name: 'Blank',
  meta: {
    difficulty: 'n/a',
    tags: ['utility'],
    description: 'An empty cell — no strips. Used as the default/clearable pattern for grid cells in the panel editor: placing this pattern in a cell clears whatever was there.',
    thumbnail: null,
  },
  build: () => ({ strips: [], joints: [] }),
});
