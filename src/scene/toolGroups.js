// Which tool changes keep the current selection.
//
// The selecting tools share one selection, so moving between them (the Selection
// tool's shift+click even does it for you) must not drop it. Validation is a
// helper that opens and closes around whatever the user is doing, so going into
// or out of it never drops the selection either. Fill / paint acts on the selection (its
// menu's "apply to selected" buttons), so it keeps the selection too, in and out. Any other
// change of tool — Place Pattern, Snap to Gridpoint — still starts from a clean selection.
export const SELECTING_TOOLS = ['selection', 'multi-select', 'drag-select'];

const KEEPING_TOOLS = [...SELECTING_TOOLS, 'fill-paint'];

export function keepsSelection(from, to) {
  if (from === 'validation' || to === 'validation') return true;
  return KEEPING_TOOLS.includes(from) && KEEPING_TOOLS.includes(to);
}
