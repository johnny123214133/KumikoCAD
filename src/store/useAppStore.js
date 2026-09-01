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
  setWorkspace: (workspace) => set({ workspace }),
  setLeftPanelOpen: (open) => set({ leftPanelOpen: open }),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  toggleLayer: (key) => set((s) => ({ activeLayers: { ...s.activeLayers, [key]: !s.activeLayers[key] } })),
}));

export default useAppStore;


// tanihata dimensions
// 50 x 12 x 3 x 2.3
// 100 x 12 x 6 x 4.6