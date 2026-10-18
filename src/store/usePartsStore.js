import { create } from 'zustand';

// The Parts List's shared state: the parts the left panel has counted (it publishes them here, as
// the grid layer publishes the cells that can be selected) and which kind of piece is selected
// (`selectedKey` is a piece's identity key, see geometry/parts/pieces.js). The canvas draws the
// selected piece's profiles and the right panel describes it; neither can edit anything.
const usePartsStore = create((set) => ({
  parts: null,
  selectedKey: null,
  setParts: (parts) => set({ parts }),
  // Clicking the selected piece again clears the selection.
  selectKey: (key) => set((s) => ({ selectedKey: s.selectedKey === key ? null : key })),
  clearSelection: () => set({ selectedKey: null }),
}));

// The selected piece and where it is used, or null: { piece, qty, sections: ['Border' | 'Grid strips' | 'Patterns'] }.
export function findPart(parts, key) {
  if (!parts || key == null) return null;
  const found = [];
  const look = (label, items) => { for (const it of items) if (it.piece.key === key) found.push({ label, it }); };
  look('Border', parts.border.items);
  look('Grid strips', parts.gridStrips.items);
  look('Patterns', parts.patterns.byPiece);
  if (!found.length) return null;
  return { piece: found[0].it.piece, qty: found.reduce((n, f) => n + f.it.qty, 0), sections: found.map((f) => f.label) };
}

export default usePartsStore;
