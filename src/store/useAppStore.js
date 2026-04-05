import { create } from 'zustand';
import { DEFAULT_LAYERS } from '../scene/layers.js';

const useAppStore = create((set) => ({
  workspace: 'panel-editor',
  leftPanelOpen: true,
  rightPanelOpen: true,
  activeLayers: { ...DEFAULT_LAYERS },
  setWorkspace: (workspace) => set({ workspace }),
  setLeftPanelOpen: (open) => set({ leftPanelOpen: open }),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  toggleLayer: (key) => set((s) => ({ activeLayers: { ...s.activeLayers, [key]: !s.activeLayers[key] } })),
}));

export default useAppStore;
