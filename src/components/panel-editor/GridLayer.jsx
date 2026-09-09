import React, { useMemo } from 'react'
import { Line, Group } from 'react-konva'
import useAppStore from '../../store/useAppStore.js'
import useGridStore from '../../store/useGridStore.js'
import usePatternStore from '../../store/usePatternStore.js'
import PatternStrips from '../pattern-editor/PatternStrips.jsx'
import { computeGridGeometry, computeCellPlacement } from '../../geometry/grid/computeGridGeometry.js'

const flip = (p) => ({ x: p.x, y: -p.y })
const BLANK_PATTERN_ID = 'builtin:blank'

function Cell({ space, pattern, onClick }) {
  const flippedVertices = useMemo(
    () => space.vertices.flatMap(v => { const f = flip(v); return [f.x, f.y] }),
    [space]
  )
  const placement = useMemo(
    () => (space.spaceType === 'full' ? computeCellPlacement(space, pattern) : null),
    [space, pattern]
  )

  return (
    <Group onClick={onClick} onTap={onClick}>
      {/* Click hit-region — also the only visual for 'half' spaces, since
          fitting a pattern into a half-cell (per the schema's symmetryAxis/
          handedness fields) isn't implemented yet. A subtle fill so empty
          cells still read as "there" and clickable. Wrapped together with
          the strips below in one Group (rather than each having its own
          onClick) so a click lands the same whether it hits the background
          or a strip shape drawn on top of it — Konva bubbles child clicks up
          to the Group either way. */}
      <Line
        points={flippedVertices}
        closed
        fill="rgba(15, 23, 42, 0.025)"
        stroke="#cbd5e1"
        strokeWidth={0.3}
        strokeScaleEnabled={false}
      />
      {placement && (
        <Group x={placement.x} y={placement.y} rotation={placement.rotationDeg} scaleX={placement.scale} scaleY={placement.scale}>
          <PatternStrips pattern={pattern} />
        </Group>
      )}
    </Group>
  )
}

export default function GridLayer() {
  const { cols, rows, cellWidth, orientation, cornerBehavior, spacePatterns, setSpacePattern } = useGridStore()
  const builtInPatterns = usePatternStore(s => s.builtInPatterns)
  const userPatterns = usePatternStore(s => s.userPatterns)
  const activePatternId = usePatternStore(s => s.activePatternId)
  const activeTool = useAppStore(s => s.activeTool)

  const patternsById = useMemo(
    () => Object.fromEntries([...builtInPatterns, ...userPatterns].map(p => [p.id, p])),
    [builtInPatterns, userPatterns]
  )
  const blankPattern = patternsById[BLANK_PATTERN_ID]

  const geometry = useMemo(
    () => computeGridGeometry({ cols, rows, cellWidth, orientation, cornerBehavior }),
    [cols, rows, cellWidth, orientation, cornerBehavior]
  )

  const boundaryPoints = useMemo(() => {
    const { width, height } = geometry.bounds
    const corners = [
      { x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height },
    ]
    return corners.flatMap(c => { const f = flip(c); return [f.x, f.y] })
  }, [geometry.bounds])

  return (
    <>
      <Line points={boundaryPoints} closed stroke="#94a3b8" strokeWidth={1} strokeScaleEnabled={false} />

      {geometry.gridLines.map((pts, i) => {
        const [x1, y1, x2, y2] = pts
        return (
          <Line
            key={i}
            points={[x1, -y1, x2, -y2]}
            stroke="#334155"
            strokeWidth={1}
            strokeScaleEnabled={false}
          />
        )
      })}

      {geometry.spaces.map(space => (
        <Cell
          key={space.id}
          space={space}
          pattern={patternsById[spacePatterns[space.id]] ?? blankPattern}
          onClick={() => { if (activeTool === 'place-pattern') setSpacePattern(space.id, activePatternId) }}
        />
      ))}
    </>
  )
}
