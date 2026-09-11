import { create } from 'zustand';
import { DEFAULT_LAYERS } from '../scene/layers.js';

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

const useAppStore = create((set) => ({
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
  // multi-select / area-select / align-to-gridpoint / fill-paint).
  activeTool: 'selection',
  // Locks the viewport's pan/zoom (Stage draggable + wheel-zoom, see
  // Viewport.jsx). Deliberately NOT auto-derived from activeTool inside this
  // store — see Toolbar.jsx: selecting a tool sets both activeTool AND
  // (for selection/place-pattern specifically) viewportLocked together at
  // the call site, while the lock button itself sets both independently
  // (always forces activeTool to 'selection' AND independently toggles
  // viewportLocked) — keeping setActiveTool a plain setter is what lets
  // those two triggers not fight each other.
  viewportLocked: false,
  // Whether the Inspector's Strips section (pattern-editor right panel) is
  // expanded. Lives here rather than as local state in Inspector.jsx because
  // Inspector actually unmounts/remounts every time you switch to
  // panel-editor and back (RightPanel swaps it for GridInspector) — local
  // state wouldn't survive that. Collapsed by default, in-session only (not
  // persisted to localStorage — wasn't asked for here, unlike panel widths).
  stripsExpanded: false,
  // Not reactive render state — just a handle Viewport publishes on mount so
  // sibling components (e.g. ViewControls in the left panel) can call into the
  // SceneManager/PatternRenderer instances that live inside Viewport's canvas.
  viewportApi: null,
  // Current visible world-rect (Y-up, same convention as computeGridGeometry
  // — {minX,maxX,minY,maxY}), used by GridLayer to cull off-screen cells
  // instead of mounting every cell in the whole grid regardless of zoom/pan.
  // Updated by Viewport.jsx on drag/wheel/zoomToFit, throttled to at most
  // once per animation frame (see Viewport.jsx) — this is read-heavy
  // (culling recomputes on every change) so it's deliberately NOT updated on
  // every raw pointermove.
  viewportVisibleRect: null,
  // Switching workspaces resets tool selection and unlocks the viewport —
  // there's only one path to a workspace switch (the toolbar's workspace
  // buttons), so unlike activeTool this side effect is safe to bake in here.
  setWorkspace: (workspace) => set({ workspace, activeTool: 'selection', viewportLocked: false }),
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
  toggleLayer: (key) => set((s) => ({ activeLayers: { ...s.activeLayers, [key]: !s.activeLayers[key] } })),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setViewportLocked: (locked) => set({ viewportLocked: locked }),
  setStripsExpanded: (expanded) => set({ stripsExpanded: expanded }),
  setViewportApi: (api) => set({ viewportApi: api }),
  setViewportVisibleRect: (rect) => set({ viewportVisibleRect: rect }),
}));

export default useAppStore;


// tanihata dimensions
// 50 x 12 x 3 x 2.3
// 100 x 12 x 6 x 4.6