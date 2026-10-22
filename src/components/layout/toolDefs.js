import {
  SelectionIcon, PlacePatternIcon, MultiSelectIcon, DragSelectIcon, HighlighterIcon, InspectIcon, FillPaintIcon,
  SnapGridpointIcon, RotateCcwIcon, LockIcon, PaletteIcon, OverviewIcon, SaveProjectIcon, TileSelectIcon, ZoomFitIcon, LayersIcon, SearchIcon,
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
    id: 'tile', label: 'Tiling', Icon: TileSelectIcon, workspaces: ['panel-editor'],
    help: () => [
      'The two tiling buttons (T and Shift + T) repeat what is selected across the whole panel, in every direction. The selection\u2019s bounding box is the tile; if it spans an odd number of columns it is widened by one so the copies land on cells that point the same way as the originals. Copies that fall off the panel are dropped.',
      'Tile selection (T) adds the copies to the selection. Tile patterns (Shift + T) puts the selected cells\u2019 patterns, with their turns and mirroring, into the copies, replacing what was there (an empty selected cell empties its copies) \u2014 all as one step.',
    ],
  },
  {
    id: 'zoom', label: 'Zoom', Icon: ZoomFitIcon, workspaces: ['pattern-editor', 'panel-editor', 'parts-list'],
    help: () => [
      'Zoom to fit (Z) frames the whole work (in the Parts List\u2019s 3D view, the piece). The zoom buttons at the bottom right of the canvas zoom out, fit and zoom in; the mouse wheel zooms too (in the Parts List always; in the editors while the viewport is unlocked).',
      'The status bar along the bottom shows how far in you are (100% is the real size on a 96 dpi screen; click it to zoom to fit), where the pointer is, what is selected, and the unit lengths are shown in.',
    ],
  },
  {
    id: 'view3d', label: '3D view', Icon: OverviewIcon, workspaces: ['parts-list'],
    help: () => [
      'The 2D / 3D buttons at the bottom right of the canvas (or X) switch between the selected piece\u2019s profiles and the piece itself as a solid, with its laps and notches cut in and the part of a trimmed strip that is not made shown faintly. Every edge is outlined.',
      'Drag to orbit around the piece, right-drag to pan, scroll to zoom. The arrow keys (or the arrow buttons above the zoom buttons) slide the camera left and right and raise and lower it, taking the point it looks at along; hold one to keep moving. The target button beside them (F) sets the focal point: while it is lit a dot shows where the camera is looking and orbiting from; click the piece to look at that spot instead, or click empty canvas (or press Esc) to cancel. Zoom to fit (Z) and the zoom buttons work here too.',
      'The window in the top-right corner sets the light. The camera is in its middle and the light is the dot: drag it anywhere in the circle (arrow keys nudge it when it has focus; double-click puts it back). The light is always level with the camera, so the piece is never backlit \u2014 the middle is a headlight and the edge rakes across the piece to show its cuts. The overview window in the bottom-left corner shows where the piece is used, as in the 2D view.',
      'Joint dots (hover one to see what it is) and Show Scale work in 3D: dots sit on the top and bottom faces where the piece is cut, and the scale gives its length, width and thickness.',
    ],
  },
  {
    id: 'overlays', label: 'Overlays', Icon: LayersIcon, workspaces: ['pattern-editor', 'panel-editor', 'parts-list'],
    help: (w) => [
      `The second line of the toolbar, beside the editor tabs, switches the drawing aids for this editor on and off (Shift + 1 to 5). ${w.work === 'pattern' ? 'Centerlines, joint dots (hover one to see its joint type), wireframe, the view-orientation arrow and a scale ruler.' : w.work === 'piece' ? 'Joint dots where the selected piece is cut (hover one to see what it is), and a scale ruler under its profiles (in 3D, its length, width and thickness)' : 'The view-orientation arrow on every cell, and a scale ruler along the panel.'}`,
    ],
  },
  {
    id: 'export', label: 'Export and print', Icon: SaveProjectIcon, workspaces: ['pattern-editor', 'panel-editor', 'parts-list'],
    help: () => [
      'The \u25be beside Save, then Export and print\u2026 (or the command palette), makes three files from the panel as it is now. Choose US Letter or A4 first.',
      'The 1:1 layout is a PDF of the whole panel at full size with every piece outlined, cut into sheets that join edge to edge: each sheet has a margin, its page number, the number of the sheet that joins each side, an overlap band and + registration marks to line up, and a 50 mm bar to check the print scale. Print at 100% (Actual size).',
      'The parts list PDF lists every strip by section and pattern, with its cuts, and a box beside each section, pattern and strip to tick off as you build. The spreadsheet (.xlsx) has the same hierarchy as collapsible rows with a Done column, and a flat cut list to sort and filter.',
    ],
  },
  {
    id: 'palette', label: 'Command palette', Icon: SearchIcon, workspaces: ['pattern-editor', 'panel-editor', 'parts-list'],
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
    id: 'overview', label: 'Overview window', Icon: OverviewIcon, workspaces: ['pattern-editor', 'panel-editor', 'parts-list'],
    help: (w) => w.work === 'piece' ? [
      'Toggles a small window in the bottom-left corner showing the whole panel, with every cell and every border or grid strip that uses the selected piece highlighted. It appears once a piece is picked in the list.',
    ] : [
      `Toggles a small window in the bottom-left corner that appears when you are zoomed far in on the ${w.work}. It shows the whole ${w.work} with a box around the part you are looking at.`,
      'Click anywhere in it, or click and drag, to move the view there. This works even while the viewport is locked.',
    ],
  },
  {
    id: 'theme', label: 'Colour theme', Icon: PaletteIcon, workspaces: ['pattern-editor', 'panel-editor', 'parts-list'],
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
  'parts-list': { title: 'Parts list', item: 'piece', items: 'pieces', work: 'piece' },
}
