import { create } from 'zustand';

// Selection state for both editors — kept in one store since the rules are
// symmetric (pattern-editor strips vs panel-editor cells), just applied to
// different id spaces. Selection is a highlighter only for now — no bulk
// action on a multi-selection yet (that's explicitly deferred: "we'll add
// functionality to manipulate the active selection later").
//
// selectableStrips/selectableSpaces: published by PatternLayer.jsx/
// GridLayer.jsx respectively (each { id, polygon: [x0,y0,x1,y1,...] } — the
// item's exact shape as a flat point array, same Konva-flipped convention
// everything else already uses) — this is what lets Viewport.jsx's
// drag-rectangle handler hit-test against "whatever's currently selectable"
// without needing to know anything about pattern/grid geometry itself.
const useSelectionStore = create((set, get) => ({
  selectedStripIds: [],
  selectedSpaceIds: [],
  selectableStrips: [],
  selectableSpaces: [],

  setSelectableStrips: (list) => set({ selectableStrips: list }),
  setSelectableSpaces: (list) => set({ selectableSpaces: list }),

  // Selection tool: clicking the single already-selected item deselects it;
  // clicking anything else replaces the selection (this tool never holds
  // more than one item at a time).
  toggleStripSelection: (id) => set((s) => ({
    selectedStripIds: (s.selectedStripIds.length === 1 && s.selectedStripIds[0] === id) ? [] : [id],
  })),
  toggleSpaceSelection: (id) => set((s) => ({
    selectedSpaceIds: (s.selectedSpaceIds.length === 1 && s.selectedSpaceIds[0] === id) ? [] : [id],
  })),

  // Multi-select tool, individual click: toggles membership in the running
  // list — clicking an already-selected item removes just that item;
  // clicking anything else adds it. Named distinctly from
  // toggleStripSelection/toggleSpaceSelection above (the Selection tool's
  // single-item toggle) since the two are easy to confuse but behave
  // differently — this one only ever removes the ONE clicked item, never
  // the rest of the list.
  toggleStripMultiSelection: (id) => set((s) => ({
    selectedStripIds: s.selectedStripIds.includes(id)
      ? s.selectedStripIds.filter((x) => x !== id)
      : [...s.selectedStripIds, id],
  })),
  toggleSpaceMultiSelection: (id) => set((s) => ({
    selectedSpaceIds: s.selectedSpaceIds.includes(id)
      ? s.selectedSpaceIds.filter((x) => x !== id)
      : [...s.selectedSpaceIds, id],
  })),

  // Multi-select tool, drag-rectangle release: REPLACES the current
  // selection (confirmed explicitly, not additive).
  setStripSelection: (ids) => set({ selectedStripIds: ids }),
  setSpaceSelection: (ids) => set({ selectedSpaceIds: ids }),

  // Called on every tool change (see useAppStore's setActiveTool/
  // setWorkspace) — confirmed explicitly that switching tools always clears
  // the active selection, not just transitions specifically between
  // Selection and Multi-select.
  clearSelection: () => set({ selectedStripIds: [], selectedSpaceIds: [] }),
}));

export default useSelectionStore;