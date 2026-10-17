// The overlay toggles shown in the editor bar, per editor. `key` is the activeLayers key in
// useAppStore (the Shift + number shortcuts in keyBindings.js use the same keys). `tips` are
// the hover explanations, per editor where the overlay means something different.
export const OVERLAYS = [
  { key: 'centerlines', label: 'Centerlines', workspaces: ['pattern-editor'] },
  { key: 'jointDots', label: 'Joint dots', workspaces: ['pattern-editor'] },
  { key: 'wireframe', label: 'Wireframe', workspaces: ['pattern-editor'] },
  {
    key: 'viewOrientation', label: 'View orientation', workspaces: ['pattern-editor', 'panel-editor'],
    tips: { 'panel-editor': 'Draws an arrow from the centre of every cell, and of the pattern icons, pointing toward the pattern’s own "up". It turns and mirrors with the pattern.' },
  },
  {
    key: 'showScale', label: 'Show Scale', workspaces: ['pattern-editor', 'panel-editor'],
    tips: { 'panel-editor': 'Draws a ruler along the left and bottom of the panel, in the unit chosen in the status bar.' },
  },
]

export const overlaysFor = (workspace) => OVERLAYS.filter((o) => o.workspaces.includes(workspace))
