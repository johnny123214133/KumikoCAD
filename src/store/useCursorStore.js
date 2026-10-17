import { create } from 'zustand';

// Where the pointer is over the canvas, in the work's own coordinates (mm, y up, the same
// convention as the geometry: the panel's bottom-left corner / the pattern's first vertex is
// 0, 0). null while the pointer is off the canvas. Only the status bar reads it.
const useCursorStore = create((set) => ({
  point: null,
  setPoint: (point) => set({ point }),
}));

export default useCursorStore;
