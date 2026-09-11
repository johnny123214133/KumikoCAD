// Which "interaction layers" should be mounted for each active tool — the
// extensible mechanism from the brainstorm: right now every current tool
// wants the same thing (cell hit-regions clickable, per the placement
// mechanic), so every entry maps to the same single layer. A future tool
// (e.g. an "Orient to Point" tool for the planned grid-joint interactions)
// would add its OWN entry here mapping to a different layer name (e.g.
// 'jointHandles'), and whatever renders that layer checks for it the same
// way GridLayer.jsx checks for 'cellHitRegions' — this file is the single
// place that answers "which interactive things exist while tool X is
// active", so adding a new tool/layer pair doesn't require touching the
// layers' own rendering logic.
export const INTERACTION_LAYERS_BY_TOOL = {
  selection: ['cellHitRegions'],
  'place-pattern': ['cellHitRegions'],
  'multi-select': ['cellHitRegions'],
  'area-select': ['cellHitRegions'],
  'align-gridpoint': ['cellHitRegions'],
  'fill-paint': ['cellHitRegions'],
};

export function isInteractionLayerActive(activeTool, layerName) {
  return !!INTERACTION_LAYERS_BY_TOOL[activeTool]?.includes(layerName);
}
