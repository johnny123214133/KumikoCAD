import {
  SelectionIcon, PlacePatternIcon, MultiSelectIcon, DragSelectIcon, ValidationIcon, FillPaintIcon,
  SnapGridpointIcon, RotateCcwIcon, LockIcon,
} from './icons.jsx'

// The toolbar's tools, and what the Help panel says about each — kept together so
// the two can't drift apart. `help(w)` returns the how-to lines for the editor
// `w` describes: { item, items, work } = what is being selected there ("cell",
// "cells", "panel") or ("strip", "strips", "pattern").

// Which workspace(s) each tool applies to. Selection, Multi-select and Drag select
// select cells in the panel editor (GridLayer.jsx) and strips in the pattern
// editor (PatternStrips.jsx). Place Pattern is panel-editor only. Fill / paint
// works in both. Snap to Gridpoint is panel-editor only.
export const TOOLS = [
  {
    id: 'selection', label: 'Selection', Icon: SelectionIcon, workspaces: ['pattern-editor', 'panel-editor'],
    help: (w) => [
      `Click a ${w.item} to select it; click it again to deselect it.`,
      `Click empty canvas, outside the ${w.work}, to clear the selection.`,
      `Shift + click switches to Multi-select and adds the clicked ${w.item} to the selection.`,
    ],
  },
  {
    id: 'place-pattern', label: 'Place Pattern', Icon: PlacePatternIcon, workspaces: ['panel-editor'],
    help: () => [
      'Pick a pattern in the library, then click a cell to place it.',
      'Click and drag to paint the pattern into every cell the cursor passes through.',
      'You can also drag a pattern from the library onto the panel to place it in all the selected cells.',
    ],
  },
  {
    id: 'multi-select', label: 'Multi-select', Icon: MultiSelectIcon, workspaces: ['pattern-editor', 'panel-editor'],
    help: (w) => [
      `Click ${w.items} to add them to the selection or remove them from it.`,
      `Click and drag to draw a rectangle: every ${w.item} it touches becomes the selection.`,
      'Shift + drag adds what the rectangle touches to the current selection instead of replacing it.',
      `Click empty canvas, outside the ${w.work}, to clear the selection.`,
    ],
  },
  {
    id: 'drag-select', label: 'Drag select', Icon: DragSelectIcon, workspaces: ['pattern-editor', 'panel-editor'],
    help: (w) => [
      `Click and drag across ${w.items}: every ${w.item} the cursor passes through is selected, replacing the previous selection.`,
      'Shift + drag appends to the current selection instead.',
      'Pressing on empty canvas clears the selection.',
    ],
  },
  {
    id: 'fill-paint', label: 'Fill / paint', Icon: FillPaintIcon, workspaces: ['pattern-editor', 'panel-editor'],
    help: (w) => [
      'Hover the tool to choose a wood and a finish.',
      w.item === 'cell'
        ? 'Click a cell to paint every strip of its pattern. "Apply to selected patterns" paints all the selected cells.'
        : 'Click a strip to paint it. "Apply to selected strips" paints the selection; "Apply to whole pattern" paints every strip.',
    ],
  },
  {
    id: 'snap-gridpoint', label: 'Snap to gridpoint', Icon: SnapGridpointIcon, workspaces: ['panel-editor'],
    help: () => [
      'A handle appears on every gridpoint of the panel.',
      'Click one to turn the cells around it so each cell\'s pattern points "up" at that point. Turn on the View orientation layer to see which way a pattern\'s "up" is.',
    ],
  },
]

// Switches sit beside the tools rather than in the tool group: they don't replace
// the active tool.
export const VALIDATION = {
  id: 'validation', label: 'Validation', Icon: ValidationIcon, workspaces: ['panel-editor'],
  help: () => [
    'Click Validation, then hover a cell: every cell with matching parameters is highlighted. Matching means the same pattern recipe — strip widths, wood, finish and parameters. Rotation and a cell\'s own paint are ignored; empty cells match each other.',
    'Click a cell to pin the highlight. The other tools work again, and the highlight stays until you click Validation again.',
    'Shift + click pins the highlight and also adds the highlighted cells to the selection.',
    'Turning Validation on or off never changes the selection. Choosing another tool before you click a cell cancels it.',
  ],
}

// Buttons that act rather than select.
export const ACTIONS = [
  {
    id: 'rotate', label: 'Rotate selected patterns', Icon: RotateCcwIcon, workspaces: ['panel-editor'],
    help: () => ['The two rotate buttons turn the patterns in the selected cells 120° counterclockwise or clockwise.'],
  },
  {
    id: 'lock', label: 'Viewport lock', Icon: LockIcon, workspaces: ['pattern-editor', 'panel-editor'],
    help: () => [
      'Every tool locks the view so clicks and drags belong to the tool.',
      'Unlock it to drag the canvas to pan and scroll to zoom. Clicking the lock also switches to the Selection tool.',
    ],
  },
]

export const SELECTION_NOTE =
  'The selection is shared: switching between Selection, Multi-select and Drag select keeps it, as does turning Validation on or off. Choosing any other tool clears it.'

export const WORKSPACE_WORDS = {
  'panel-editor': { title: 'Panel editor', item: 'cell', items: 'cells', work: 'panel' },
  'pattern-editor': { title: 'Pattern editor', item: 'strip', items: 'strips', work: 'pattern' },
}
