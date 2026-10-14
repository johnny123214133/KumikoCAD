// Which tool changes keep the current selection.
//
// The selecting tools share one selection, so moving between them (the Selection
// tool's shift+click even does it for you) must not drop it. Validation is a
// helper that opens and closes around whatever the user is doing, so going into
// or out of it never drops the selection either. Any other change of tool — Place
// Pattern, Fill / paint, Snap to Gridpoint — still starts from a clean selection.
export const SELECTING_TOOLS = ['selection', 'multi-select', 'drag-select'];

export function keepsSelection(from, to) {
  if (from === 'validation' || to === 'validation') return true;
  return SELECTING_TOOLS.includes(from) && SELECTING_TOOLS.includes(to);
}
