import { create } from 'zustand';
import { DEFAULT_LAYERS } from '../scene/layers.js';

const useAppStore = create((set) => ({
  workspace: 'panel-editor',
  leftPanelOpen: true,
  rightPanelOpen: true,
  defaultPatternLength : 50,
  defaultPanelDepth : 12,
  gridStripWidth : 3,
  defaultPatterStripWidth : 2.3,
  activeLayers: { ...DEFAULT_LAYERS },
  // Not reactive render state — just a handle Viewport publishes on mount so
  // sibling components (e.g. ViewControls in the left panel) can call into the
  // SceneManager/PatternRenderer instances that live inside Viewport's canvas.
  viewportApi: null,
  setWorkspace: (workspace) => set({ workspace }),
  setLeftPanelOpen: (open) => set({ leftPanelOpen: open }),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  toggleLayer: (key) => set((s) => ({ activeLayers: { ...s.activeLayers, [key]: !s.activeLayers[key] } })),
  setViewportApi: (api) => set({ viewportApi: api }),
}));

export default useAppStore;


// tanihata dimensions
// 50 x 12 x 3 x 2.3
// 100 x 12 x 6 x 4.6