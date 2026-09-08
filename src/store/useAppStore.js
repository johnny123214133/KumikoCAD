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
  // Which toolbar tool is visually selected (selection / multi-select / area-select /
  // align-to-gridpoint / fill-paint). UI state only — per this task's instructions,
  // none of these tools have any actual canvas behavior wired up yet.
  activeTool: 'selection',
  // Not reactive render state — just a handle Viewport publishes on mount so
  // sibling components (e.g. ViewControls in the left panel) can call into the
  // SceneManager/PatternRenderer instances that live inside Viewport's canvas.
  viewportApi: null,
  setWorkspace: (workspace) => set({ workspace }),
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
  setViewportApi: (api) => set({ viewportApi: api }),
}));

export default useAppStore;


// tanihata dimensions
// 50 x 12 x 3 x 2.3
// 100 x 12 x 6 x 4.6