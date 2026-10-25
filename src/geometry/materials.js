// Shared reference lists for wood species / finish dropdowns — used by both
// the grid strips (GridInspector) and pattern strips (Inspector) selectors.
// Starter list based on common kumiko/joinery material choices; the four
// built-in patterns use 'basswood' + 'natural', so both are included here. Extend as needed — nothing else depends on this being
// exhaustive.
export const WOOD_OPTIONS = [
  { id: 'basswood', label: 'Basswood' },
  { id: 'cedar', label: 'Cedar' },
  { id: 'keyaki', label: 'Keyaki (zelkova)' },
  { id: 'walnut', label: 'Walnut' },
  { id: 'blackWalnut', label: 'Black Walnut' },
  { id: 'cherry', label: 'Cherry' },
  { id: 'maple', label: 'Maple' },
  { id: 'sapele', label: 'Sapele' },
  { id: 'purpleheart', label: 'Purpleheart' },
  { id: 'padauk', label: 'Padauk' },
];

export const FINISH_OPTIONS = [
  { id: 'natural', label: 'Natural / unfinished' },
  { id: 'oiled', label: 'Oiled' },
  { id: 'lacquered', label: 'Lacquered' },
  { id: 'stained', label: 'Stained' },
  { id: 'wax', label: 'Wax' },
];

// Every id listed above needs a matching entry in geometry/woodFinishColors.js
// (WOOD_BASE_COLORS / FINISH_TRANSFORMS) or getMaterialColor() silently falls
// back to basswood/natural for it — checked once here at module load so adding
// an option to one file without the other fails loudly instead of quietly
// rendering the wrong color.
import { WOOD_BASE_COLORS, FINISH_TRANSFORMS, WOOD_FINISHES, canonicalWood, allowedFinish } from './woodFinishColors.js';
export { canonicalWood, allowedFinish };
// The finishes a wood is offered in (all of them unless the wood limits them, as Purpleheart does).
export const finishOptionsFor = (woodId) => {
  const list = WOOD_FINISHES[canonicalWood(woodId)];
  return list ? FINISH_OPTIONS.filter((f) => list.includes(f.id)) : FINISH_OPTIONS;
};
WOOD_OPTIONS.forEach(({ id }) => {
  if (!(id in WOOD_BASE_COLORS)) console.error(`[materials] WOOD_OPTIONS has '${id}' but woodFinishColors.js has no base color for it`);
});
FINISH_OPTIONS.forEach(({ id }) => {
  if (!(id in FINISH_TRANSFORMS)) console.error(`[materials] FINISH_OPTIONS has '${id}' but woodFinishColors.js has no transform for it`);
});

// Every wood + finish pairing on offer, grouped by wood — the palette's contents.
// Rows run light to dark with similar base colours side by side (pale yellows,
// then warm oranges and reds, then purples, then browns).
const PALETTE_ORDER = ['basswood', 'maple', 'cedar', 'cherry', 'sapele', 'keyaki', 'padauk', 'purpleheart', 'walnut', 'blackWalnut'];
export const paletteRows = () => PALETTE_ORDER
  .map((id) => WOOD_OPTIONS.find((w) => w.id === id))
  .filter(Boolean)
  .map((w) => ({ wood: w, finishes: finishOptionsFor(w.id) }));
