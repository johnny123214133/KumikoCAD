import { create } from 'zustand';
import { DEFAULT_LAYERS } from '../scene/layers.js';
import useSelectionStore from './useSelectionStore.js';
import { TOOL_LOCK } from '../scene/toolLock.js';
import { keepsSelection } from '../scene/toolGroups.js';

const PANEL_WIDTH_MIN = 180;
const PANEL_WIDTH_MAX = 480;
const DEFAULT_PANEL_WIDTH = 260;

function loadPanelWidth(key) {
  try {
    const v = Number(localStorage.getItem(key));
    if (Number.isFinite(v) && v >= PANEL_WIDTH_MIN && v <= PANEL_WIDTH_MAX) return v;
  } catch { /* localStorage unavailable — fall through to default */ }
  return DEFAULT_PANEL_WIDTH;
}
function clampPanelWidth(w) { return Math.min(PANEL_WIDTH_MAX, Math.max(PANEL_WIDTH_MIN, w)); }

// Left-panel library layout: how the pattern list is sorted, whether the Recently
// Used accordion is open, and how tall that section is (set by dragging the divider
// above it). Persisted so they survive reloads like the panel widths do.
const SORT_MODES = ['default', 'alpha', 'complexity', 'default-custom-first', 'alpha-custom-first', 'complexity-custom-first'];
function loadSetting(key, fallback, ok) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const v = JSON.parse(raw);
    return ok(v) ? v : fallback;
  } catch { return fallback; }
}
function saveSetting(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } }

const useAppStore = create((set, get) => ({
  patternSort: loadSetting('kumiko_patternSort', 'default', (v) => SORT_MODES.includes(v)),
  // How the Parts List groups the patterns' pieces: 'default' (identical pieces counted together) or 'pattern'.
  partsSort: loadSetting('kumiko_partsSort', 'default', (v) => v === 'default' || v === 'pattern'),
  setPartsSort: (mode) => { if (mode === 'default' || mode === 'pattern') { saveSetting('kumiko_partsSort', mode); set({ partsSort: mode }); } },
  recentOpen: loadSetting('kumiko_recentOpen', true, (v) => typeof v === 'boolean'),
  recentHeight: loadSetting('kumiko_recentHeight', 180, (v) => Number.isFinite(v) && v >= 0),
  setPatternSort: (mode) => { if (SORT_MODES.includes(mode)) { saveSetting('kumiko_patternSort', mode); set({ patternSort: mode }); } },
  setRecentOpen: (open) => { saveSetting('kumiko_recentOpen', !!open); set({ recentOpen: !!open }); },
  setRecentHeight: (h) => { const v = Math.max(0, Math.round(h)); saveSetting('kumiko_recentHeight', v); set({ recentHeight: v }); },
  workspace: 'pattern-editor',
  leftPanelOpen: true,
  rightPanelOpen: true,
  // User-resizable (drag the panel's inner edge), persisted to localStorage
  // so it survives reloads — not just in-session toggles.
  leftPanelWidth: loadPanelWidth('kumiko_leftPanelWidth'),
  rightPanelWidth: loadPanelWidth('kumiko_rightPanelWidth'),
  defaultPatternLength : 50,
  defaultPanelDepth : 12,
  gridStripWidth : 3,
  defaultPatterStripWidth : 2.3,
  activeLayers: { ...DEFAULT_LAYERS },
  // Which toolbar tool is visually selected (selection / place-pattern /
  // multi-select / fill-paint / snap-gridpoint).
  activeTool: 'selection',
  // Locks the viewport's pan/zoom (Stage draggable + wheel-zoom, see
  // Viewport.jsx). Deliberately NOT auto-derived from activeTool via a
  // reactive rule inside this store — see Toolbar.jsx: selecting a tool
  // sets both activeTool AND viewportLocked together at the call site
  // (reading TOOL_LOCK), while the lock button itself sets both
  // independently (always forces activeTool to 'selection' AND
  // independently toggles viewportLocked) — keeping setActiveTool a plain
  // setter is what lets those two triggers not fight each other. This
  // INITIAL value still has to agree with TOOL_LOCK[activeTool] by hand,
  // though, since nothing runs selectTool's logic before the app has even
  // rendered — reading TOOL_LOCK.selection directly here (rather than
  // hardcoding true/false again) is what keeps it from silently drifting
  // out of sync with Toolbar.jsx's mapping the way it did before (this bug
  // shipped twice: once here, once in setWorkspace below, because the fact
  // "selection locks" lived only in Toolbar.jsx's copy of TOOL_LOCK and
  // nothing enforced the other two spots matching it).
  viewportLocked: TOOL_LOCK.selection,
  // Which right-menu sections (components/shared/Accordion.jsx) the user has opened
  // or closed, by section id; a section not listed uses its own default. Lives here
  // rather than in the menus because Inspector/GridInspector unmount whenever the
  // workspace switches. In-session only.
  sectionOpen: {},
  setSectionOpen: (id, open) => set((s) => ({ sectionOpen: { ...s.sectionOpen, [id]: !!open } })),
  // The one length unit the whole CAD is entered and shown in (grid and pattern
  // inspectors, strip details, the scale overlay) — 'mm' | 'in'. Display/input only; every
  // stored dimension stays mm (see geometry/units.js). Lives here for the same
  // reason as sectionOpen: GridInspector unmounts whenever the workspace
  // switches, which would otherwise reset it. In-session only.
  // "Don't show again" on the delete-pattern confirmation. Session only: it
  // resets on reload so a fresh session always asks first.
  confirmDeletePattern: true,
  // Delete key (Panel editor): warn before the selected cells are emptied. "Don't show again" is remembered.
  confirmClearCells: loadSetting('kumiko_confirmClearCells', true, (v) => typeof v === 'boolean'),
  setConfirmClearCells: (v) => { saveSetting('kumiko_confirmClearCells', !!v); set({ confirmClearCells: !!v }); },
  clearCellsRequest: 0, // number of cells awaiting the warning's answer (0 = no dialog)
  setClearCellsRequest: (n) => set({ clearCellsRequest: n }),
  setConfirmDeletePattern: (v) => set({ confirmDeletePattern: !!v }),
  gridUnit: loadSetting('kumiko_unit', 'mm', (v) => v === 'mm' || v === 'in'),
  // Not reactive render state — just a handle Viewport publishes on mount so
  // sibling components (e.g. ViewControls in the left panel) can call into the
  // SceneManager/PatternRenderer instances that live inside Viewport's canvas.
  viewportApi: null,
  // The Parts List's canvas shows the piece's profiles ('2d') or the piece as a solid ('3d'); view3dApi is the 3D view's zoom handle.
  partsView: '2d', // always opens on the 2D profiles; switching is for the session
  setPartsView: (v) => { if (v === '2d' || v === '3d') set({ partsView: v }); },
  // The Export dialog (parts list PDF / spreadsheet, 1:1 layout) and the paper the PDFs are made for.
  exportDialogOpen: false,
  setExportDialogOpen: (open) => set({ exportDialogOpen: !!open }),
  // Per pattern: has the user glued up its laminated stock (a pattern with `laminations`)? Missing = yes.
  stockLaminated: loadSetting('kumiko_stockLaminated', {}, (v) => v && typeof v === 'object' && !Array.isArray(v)),
  setStockLaminated: (patternId, on) => set((s) => { const next = { ...s.stockLaminated, [patternId]: !!on }; saveSetting('kumiko_stockLaminated', next); return { stockLaminated: next }; }),
  printPaper: loadSetting('kumiko_printPaper', 'letter', (v) => v === 'letter' || v === 'a4'),
  setPrintPaper: (v) => { if (v === 'letter' || v === 'a4') { saveSetting('kumiko_printPaper', v); set({ printPaper: v }); } },
  focusPick: false, // the 3D view is waiting for a click on the piece to look at
  setFocusPick: (on) => set({ focusPick: !!on }),
  view3dApi: null, // { zoomBy(k), zoomToFit(), slide(dx, dy) } while the 3D view is mounted
  // Where the 3D view's light is, in the plane through the camera that faces the piece: x right, y up, within the unit circle.
  lightPos: loadSetting('kumiko_lightPos', { x: -0.45, y: 0.6 }, (v) => v && Number.isFinite(v.x) && Number.isFinite(v.y) && Math.hypot(v.x, v.y) <= 1.0001),
  setLightPos: (p) => { const r = Math.hypot(p.x, p.y); const k = r > 1 ? 1 / r : 1; const v = { x: p.x * k, y: p.y * k }; saveSetting('kumiko_lightPos', v); set({ lightPos: v }); },
  setView3dApi: (api) => set({ view3dApi: api }),
  // Current visible world-rect (Y-up, same convention as computeGridGeometry
  // — {minX,maxX,minY,maxY}), used by GridLayer to cull off-screen cells
  // instead of mounting every cell in the whole grid regardless of zoom/pan.
  // Updated by Viewport.jsx on drag/wheel/zoomToFit, throttled to at most
  // once per animation frame (see Viewport.jsx) — this is read-heavy
  // (culling recomputes on every change) so it's deliberately NOT updated on
  // every raw pointermove.
  viewportVisibleRect: null,
  // The stage's current zoom (screen px per world mm), published together with
  // the visible rect. GridLayer uses it to pick the resolution cells are
  // rasterized at once the zoom settles.
  viewportZoom: null,
  // The editor the published visible rect belongs to (it is stale for a moment after a switch).
  viewportRectWorkspace: null,
  // Switching workspaces resets the tool to 'selection' but keeps the viewport lock as it was
  // (so an unlocked camera stays unlocked in the other editor). There's only one path to a
  // workspace switch (the toolbar's buttons and the number keys), so unlike activeTool this
  // side effect is safe to bake in here. Also clears the active selection
  // (useSelectionStore) — same rule as setActiveTool below.
  setWorkspace: (workspace) => {
    useSelectionStore.getState().clearSelection();
    // The viewport lock carries over: whatever it was stays, only the tool goes back to Selection.
    set({ workspace, activeTool: 'selection', validationActive: false, validationPinnedId: null, validationReturn: null });
  },
  // The Validation tool (panel editor). Clicking its button ARMS it: it becomes the
  // only active tool (activeTool 'validation'), hovering a cell highlights the cells
  // that match it, and clicking a cell PINS that highlight. Pinning hands the
  // previous tool back (validationReturn remembers it and its viewport lock) and
  // the highlight stays, whichever tool is used, until the button is clicked again.
  // Choosing another tool while still armed cancels it. Turning it on or off never
  // touches the selection (see scene/toolGroups.js).
  validationActive: false,
  // The cell whose matches stay highlighted (a cell id, not a pattern, so the
  // highlight follows that cell if its pattern is edited).
  validationPinnedId: null,
  validationReturn: null, // { tool, locked } to restore on pinning/cancelling, while armed
  toggleValidation: () => {
    const s = get();
    if (s.validationActive) {
      const back = s.activeTool === 'validation';
      const ret = s.validationReturn;
      set({
        validationActive: false, validationPinnedId: null, validationReturn: null,
        ...(back ? { activeTool: ret?.tool ?? 'selection', viewportLocked: ret?.locked ?? TOOL_LOCK.selection } : {}),
      });
      return;
    }
    set({
      validationActive: true, validationPinnedId: null,
      validationReturn: { tool: s.activeTool, locked: s.viewportLocked },
      activeTool: 'validation', viewportLocked: TOOL_LOCK.validation,
    });
  },
  // Armed -> pinned on this cell. Does nothing unless armed.
  pinValidation: (spaceId) => {
    const s = get();
    if (!s.validationActive || s.activeTool !== 'validation') return;
    const ret = s.validationReturn;
    set({
      validationPinnedId: spaceId, validationReturn: null,
      activeTool: ret?.tool ?? 'selection', viewportLocked: ret?.locked ?? TOOL_LOCK.selection,
    });
  },
  // The Help panel replaces the right panel's usual content while open.
  helpOpen: false,
  toggleHelp: () => set((s) => (s.helpOpen ? { helpOpen: false } : { helpOpen: true, rightPanelOpen: true })),
  setLeftPanelOpen: (open) => set({ leftPanelOpen: open }),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  setLeftPanelWidth: (w) => {
    const width = clampPanelWidth(w);
    try { localStorage.setItem('kumiko_leftPanelWidth', String(width)); } catch { /* ignore */ }
    set({ leftPanelWidth: width });
  },
  setRightPanelWidth: (w) => {
    const width = clampPanelWidth(w);
    try { localStorage.setItem('kumiko_rightPanelWidth', String(width)); } catch { /* ignore */ }
    set({ rightPanelWidth: width });
  },
  // The command palette (components/layout/CommandPalette.jsx).
  paletteOpen: false,
  setPaletteOpen: (open) => set({ paletteOpen: !!open }),
  toggleLayer: (key) => set((s) => ({ activeLayers: { ...s.activeLayers, [key]: !s.activeLayers[key] } })),
  // Changing tools clears the active selection — except between the selecting
  // tools, and into/out of Validation (scene/toolGroups.js). Safe to bake in
  // regardless of caller (Toolbar's selectTool, the lock button, PatternLibrary's
  // selectPattern). An armed Validation that is left for another tool is cancelled:
  // it has nothing to show without a pinned cell.
  setActiveTool: (tool) => {
    const s = get();
    if (!keepsSelection(s.activeTool, tool)) useSelectionStore.getState().clearSelection();
    const cancel = s.validationActive && s.activeTool === 'validation' && tool !== 'validation';
    set({
      activeTool: tool,
      ...(cancel ? { validationActive: false, validationPinnedId: null, validationReturn: null } : {}),
    });
  },
  // setActiveTool plus the tool's viewport lock (what the toolbar buttons and the
  // Selection tool's shift+click use).
  selectTool: (tool) => {
    get().setActiveTool(tool);
    if (tool in TOOL_LOCK) set({ viewportLocked: TOOL_LOCK[tool] });
  },
  setViewportLocked: (locked) => set({ viewportLocked: locked }),
  // The overview window (components/layout/MiniMap.jsx): whether it may show at all. It
  // still only appears while the view is zoomed in. Remembered between visits.
  overviewOn: loadSetting('kumiko_overview', true, (v) => typeof v === 'boolean'),
  setOverviewOn: (on) => { saveSetting('kumiko_overview', !!on); set({ overviewOn: !!on }); },
  // Backslash: if the left panel, the right panel or the overview is on, hide all three for
  // a clean canvas; only when all three are off does it turn all three back on.
  toggleAllChrome: () => {
    const s = get();
    const show = !(s.leftPanelOpen || s.rightPanelOpen || s.overviewOn);
    saveSetting('kumiko_overview', show);
    set({ leftPanelOpen: show, rightPanelOpen: show, overviewOn: show });
  },
  toggleOverview: () => set((s) => { saveSetting('kumiko_overview', !s.overviewOn); return { overviewOn: !s.overviewOn }; }),
  // The L key / palette command: flips the lock and drops to the Selection tool. The lock
  // button is disabled while Multi-select is active, so from there this first switches to the
  // Selection tool (which sets that tool's lock) and then flips the lock.
  toggleViewportLock: () => {
    if (get().activeTool === 'multi-select') get().selectTool('selection');
    get().setViewportLocked(!get().viewportLocked);
    get().setActiveTool('selection');
  },
  // Use store/unitActions.js's setUnit, which also snaps values onto the new
  // unit's step grids.
  setGridUnit: (unit) => { if (unit === 'mm' || unit === 'in') { saveSetting('kumiko_unit', unit); set({ gridUnit: unit }); } },
  setViewportApi: (api) => set({ viewportApi: api }),
  setViewportVisibleRect: (rect, zoom, workspace) => set({ viewportVisibleRect: rect, viewportRectWorkspace: workspace ?? null, ...(zoom > 0 ? { viewportZoom: zoom } : {}) }),
}));

export default useAppStore;

// The camera the zoom buttons, Z and the palette drive: the Parts List's 3D view when it is up, else the canvas's.
export const is3dView = (s) => s.workspace === 'parts-list' && s.partsView === '3d';
export const pickCameraApi = (s) => (is3dView(s) ? s.view3dApi : s.viewportApi);
export const cameraApi = () => pickCameraApi(useAppStore.getState());
export const useCameraApi = () => useAppStore(pickCameraApi);


// tanihata dimensions
// 50 x 12 x 3 x 2.3
// 100 x 12 x 6 x 4.6