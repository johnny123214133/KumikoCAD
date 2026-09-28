import React from 'react'
import { Line } from 'react-konva'
import { computeStripRenderData } from '../../geometry/renderPattern.js'
import useAppStore from '../../store/useAppStore.js'
import useSelectionStore from '../../store/useSelectionStore.js'

// Uses the shared computeStripRenderData (geometry/renderPattern.js) so this
// live Konva rendering and the offscreen-canvas cache renderer (used for
// pattern icons and panel cells) both draw from the exact same computation
// — no duplicated geometry logic between the two.
function StripBody({ data, wireframe, selected, onClick }) {
  // Placement: y negated (Y-flip) and rotation negated — flipping Y also
  // flips the sense of a positive rotation, so both must flip together or
  // the strip ends up pointing the wrong way. See viewportMath.js. Konva has
  // no direct equivalent of Three.js's material.wireframe flag — adapted as:
  // hide the fill and show only the outline.
  //
  // Selection border takes priority over both the wireframe outline color
  // AND the plain always-on edge below when both apply — selection is the
  // more specific state, so its color should win rather than being visually
  // indistinguishable from either. In filled (non-wireframe) mode, every
  // strip now gets a thin edge a touch darker than its OWN color
  // (data.edgeColor, geometry/renderPattern.js — moves with wood/finish
  // just like the selection border already did) purely so adjacent strips
  // read as separate pieces rather than one flat color field; wireframe
  // mode is unchanged (it's already all outline, in the strip's own color,
  // no separate fill to set apart from a neighbor's).
  // fill is NEVER left undefined, even in wireframe mode — Konva only
  // hit-tests a shape's STROKE LINE when fill is unset, not its visual
  // interior, so a wireframe strip with fill=undefined would silently fail
  // to register clicks anywhere except its exact 1px outline. 'transparent'
  // draws nothing (same visual result as undefined) while keeping the
  // interior hit-testable — same fix already applied to GridLayer.jsx's
  // cell hit-region for the same reason.
  return (
    <Line
      points={data.points}
      closed
      x={data.x}
      y={data.y}
      rotation={data.rotationDeg}
      fill={wireframe ? 'transparent' : data.color}
      stroke={selected ? data.borderColor : (wireframe ? data.color : data.edgeColor)}
      strokeWidth={selected ? 2 : 1}
      strokeScaleEnabled={false}
      onClick={onClick}
      onTap={onClick}
    />
  )
}

export default function PatternStrips({ pattern, wireframe = false }) {
  const stripData = computeStripRenderData(pattern)
  const activeTool = useAppStore(s => s.activeTool)
  const selectedStripIds = useSelectionStore(s => s.selectedStripIds)
  const toggleStripSelection = useSelectionStore(s => s.toggleStripSelection)
  const toggleStripMultiSelection = useSelectionStore(s => s.toggleStripMultiSelection)

  const handleClick = (stripId) => {
    if (activeTool === 'selection') toggleStripSelection(stripId)
    else if (activeTool === 'multi-select') toggleStripMultiSelection(stripId)
    // other tools: no strip-click behavior yet
  }

  return (
    <>
      {stripData.map(data => (
        <StripBody
          key={data.stripId}
          data={data}
          wireframe={wireframe}
          selected={selectedStripIds.includes(data.stripId)}
          onClick={() => handleClick(data.stripId)}
        />
      ))}
    </>
  )
}