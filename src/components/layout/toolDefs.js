import {
  SelectionIcon, PlacePatternIcon, MultiSelectIcon, DragSelectIcon, HighlighterIcon, InspectIcon, FillPaintIcon,
  SnapGridpointIcon, RotateCcwIcon, LockIcon, PaletteIcon, OverviewIcon, ZoomFitIcon, LayersIcon, SearchIcon,
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
      'Pick a pattern in the library, then click a cell to place it. Ctrl (Cmd on a Mac) + click any cell, with any tool but Snap to gridpoint, to put the current pattern into all the selected cells.',
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
    id: 'inspect', label: 'Inspection', Icon: InspectIcon, workspaces: ['panel-editor'],
    help: () => [
      'Click a cell to open its pattern in the pattern editor. A painted cell opens its painted pattern.',
      'Empty cells do nothing. Going back to the panel editor puts you on the Selection tool.',
    ],
  },
  {
    id: 'fill-paint', label: 'Fill / paint', Icon: FillPaintIcon, workspaces: ['pattern-editor', 'panel-editor'],
    help: (w) => [
      'While this tool is active a Fill panel slides up at the bottom right of the canvas: choose a wood and a finish there. The cursor becomes a pouring paint bucket, in that colour, over anything you can paint.',
      w.item === 'cell'
        ? 'Click a cell, or click and drag across cells, to paint them. A painted cell holds the pattern of the same shape in that wood and finish: an existing one from the library, or a new custom pattern if there is none. Its rotation is kept. "Apply to selected patterns" paints all the selected cells.'
        : 'Click a strip, or click and drag across strips, to paint them. "Apply to selected strips" paints the selection; "Apply to whole pattern" paints every strip.',
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
  id: 'validation', label: 'Highlighter/Validation', Icon: HighlighterIcon, workspaces: ['panel-editor'],
  help: () => [
    'Click Highlighter/Validation, then hover a cell: every cell with matching parameters is highlighted. Matching means the same pattern recipe — strip widths, wood, finish and parameters. Rotation is ignored; empty cells match each other.',
    'Click a cell to pin the highlight. The other tools work again, and the highlight stays until you click Highlighter/Validation again.',
    'Shift + click pins the highlight and also adds the highlighted cells to the selection.',
    'Turning Highlighter/Validation on or off never changes the selection. Choosing another tool before you click a cell cancels it.',
  ],
}

// Buttons that act rather than select.
export const ACTIONS = [
  {
    id: 'rotate', label: 'Rotate selected patterns', Icon: RotateCcwIcon, workspaces: ['panel-editor'],
    help: () => ['The two rotate buttons turn the patterns in the selected cells 120° counterclockwise or clockwise.'],
  },
  {
    id: 'zoom', label: 'Zoom', Icon: ZoomFitIcon, workspaces: ['pattern-editor', 'panel-editor'],
    help: () => [
      'Zoom to fit (Z) frames the whole work. The zoom buttons at the bottom right of the canvas zoom out, fit and zoom in; the mouse wheel zooms too, while the viewport is unlocked.',
      'The status bar along the bottom shows how far in you are (100% is the real size on a 96 dpi screen; click it to zoom to fit), where the pointer is, what is selected, and the unit lengths are shown in.',
    ],
  },
  {
    id: 'overlays', label: 'Overlays', Icon: LayersIcon, workspaces: ['pattern-editor', 'panel-editor'],
    help: (w) => [
      `The second line of the toolbar, beside the editor tabs, switches the drawing aids for this editor on and off (Shift + 1 to 5). ${w.work === 'pattern' ? 'Centerlines, joint dots (hover one to see its joint type), wireframe, the view-orientation arrow and a scale ruler.' : 'The view-orientation arrow on every cell, and a scale ruler along the panel.'}`,
    ],
  },
  {
    id: 'palette', label: 'Command palette', Icon: SearchIcon, workspaces: ['pattern-editor', 'panel-editor', 'cut-list'],
    help: () => [
      'Ctrl/Cmd + K opens a search over everything: commands, tools, overlays, themes and the pattern library. Typing is forgiving (letters in order, in any word order, small typos), and Enter runs the top result.',
    ],
  },
  {
    id: 'lock', label: 'Viewport lock', Icon: LockIcon, workspaces: ['pattern-editor', 'panel-editor'],
    help: () => [
      'Every tool locks the view so clicks and drags belong to the tool.',
      'Unlock it to drag the canvas to pan and scroll to zoom. Clicking the lock also switches to the Selection tool.',
    ],
  },
  {
    id: 'overview', label: 'Overview window', Icon: OverviewIcon, workspaces: ['pattern-editor', 'panel-editor'],
    help: (w) => [
      `Toggles a small window in the bottom-left corner that appears when you are zoomed far in on the ${w.work}. It shows the whole ${w.work} with a box around the part you are looking at.`,
      'Click anywhere in it, or click and drag, to move the view there. This works even while the viewport is locked.',
    ],
  },
  {
    id: 'theme', label: 'Colour theme', Icon: PaletteIcon, workspaces: ['pattern-editor', 'panel-editor', 'cut-list'],
    help: () => [
      'Opens the list of colour themes, light ones then dark ones. Click one to apply it straight away; click the palette again, press Escape, or click elsewhere to close the list.',
      'A theme sets the colours of the whole interface and of what the canvas draws: validation highlights, joint dots, snap circles, the orientation arrow, the scale and the selection outline. Wood and finish colours are never changed. Your choice is remembered.',
    ],
  },
]

export const SELECTION_NOTE =
  'The selection is shared: switching between Selection, Multi-select and Drag select keeps it, as does turning Highlighter/Validation on or off. Choosing any other tool clears it.'

export const WORKSPACE_WORDS = {
  'panel-editor': { title: 'Panel editor', item: 'cell', items: 'cells', work: 'panel' },
  'pattern-editor': { title: 'Pattern editor', item: 'strip', items: 'strips', work: 'pattern' },
  'cut-list': { title: 'Cut list', item: 'strip', items: 'strips', work: 'panel' },
}
