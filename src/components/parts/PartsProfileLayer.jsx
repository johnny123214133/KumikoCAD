import React, { useMemo, useEffect, useState } from 'react'
import { Shape, Circle, Label, Tag, Text } from 'react-konva'
import useAppStore from '../../store/useAppStore.js'
import usePartsStore, { findPart } from '../../store/usePartsStore.js'
import { useTheme } from '../../store/useThemeStore.js'
import ScaleOverlay from '../shared/ScaleOverlay.jsx'
import { profileLayout, jointDotsOf, viewLayers } from '../../geometry/parts/profiles.js'
import { getMaterialColor } from '../../geometry/woodFinishColors.js'
import { darkenHex, lightenHex } from '../../geometry/color.js'
import { stripEdgeColor } from '../../theme/themeRuntime.js'
import { shapeScale } from '../../scene/drawGridStrips.js'
import { notchLabel } from '../pattern-editor/PatternLayer.jsx'

// How much darker a cut face is drawn than the wood around it.
const CUT_FACE_DARKEN = 0.2
// The part of a strip that is cut off at the panel's edge: a lighter tone of the wood, dotted outline.
const MISSING_LIGHTEN = 0.55
const LABEL_PX = 12
const LABEL_GAP_PX = 10

// The selected piece and its three views, or nulls. Shared with the viewport (zoom to fit).
export function useSelectedProfile() {
  const parts = usePartsStore((s) => s.parts)
  const selectedKey = usePartsStore((s) => s.selectedKey)
  return useMemo(() => {
    const found = findPart(parts, selectedKey)
    return { found, layout: found ? profileLayout(found.piece) : null }
  }, [parts, selectedKey])
}

const tracePolygon = (ctx, pts) => {
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
  ctx.closePath()
}

// The Parts List's canvas: Top, Side and Bottom profiles of the selected kind of piece, each
// running horizontally, one below the other.
export default function PartsProfileLayer() {
  const { canvas: colors } = useTheme()
  const { found, layout } = useSelectedProfile()
  const activeLayers = useAppStore((s) => s.activeLayers)
  const [tip, setTip] = useState(null) // { x, y, scale, text, stage }
  const piece = found?.piece

  const fill = piece ? getMaterialColor(piece.material, piece.finish) : '#e8d5b0'
  const cutFill = darkenHex(fill, CUT_FACE_DARKEN)
  const missingFill = lightenHex(fill, MISSING_LIGHTEN)
  const edge = stripEdgeColor(fill, darkenHex(fill, 0.35))
  const seamColor = darkenHex(fill, 0.45) // the line where two different cut faces meet

  useEffect(() => {
    if (!tip) return undefined
    const stage = tip.stage
    const clear = () => setTip(null)
    stage.on('wheel.partsTip dragstart.partsTip', clear)
    return () => stage.off('wheel.partsTip dragstart.partsTip')
  }, [tip])
  useEffect(() => { setTip(null) }, [activeLayers.jointDots, piece])

  const dots = useMemo(() => (piece ? jointDotsOf(piece) : []), [piece])
  const scaleAxes = useMemo(() => (layout ? [{
    origin: { x: layout.x0, y: layout.bounds.maxY }, dir: { x: 1, y: 0 }, out: { x: 0, y: 1 }, length: layout.length, gapPx: 14,
  }] : []), [layout])

  if (!layout) return null

  return (
    <>
      <Shape
        listening={false}
        sceneFunc={(context, shape) => {
          const ctx = context._context
          const px = 1 / shapeScale(shape)
          ctx.save()
          ctx.lineWidth = px
          ctx.lineJoin = 'miter'
          for (const view of layout.views) {
            if (view.outline) {
              for (const poly of view.missing ?? []) {
                tracePolygon(ctx, poly)
                ctx.fillStyle = missingFill
                ctx.fill()
                ctx.setLineDash([3 * px, 3 * px])
                ctx.strokeStyle = edge
                ctx.stroke()
                ctx.setLineDash([])
              }
              tracePolygon(ctx, view.outline)
              ctx.fillStyle = fill
              ctx.fill()
              if (view.bands) {
                // Laminated stock: each layer in its own wood, the glue lines between them.
                const xs = view.outline.map((p) => p[0])
                const bx0 = Math.min(...xs), bx1 = Math.max(...xs)
                ctx.save()
                tracePolygon(ctx, view.outline)
                ctx.clip()
                for (const b of view.bands) {
                  const l = piece.layers[b.layer]
                  ctx.fillStyle = getMaterialColor(l.material, l.finish)
                  ctx.fillRect(bx0, b.y0, bx1 - bx0, b.y1 - b.y0)
                }
                ctx.strokeStyle = seamColor
                const edges = [...new Set(view.bands.flatMap((b) => [b.y0, b.y1]))].sort((m, n) => m - n).slice(1, -1)
                for (const y of edges) { ctx.beginPath(); ctx.moveTo(bx0, y); ctx.lineTo(bx1, y); ctx.stroke() }
                ctx.restore()
              }
              ctx.fillStyle = cutFill
              // (one path, so pieces of one cut-away that touch leave no seam between them)
              ctx.beginPath()
              for (const poly of view.dark) {
                poly.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
                ctx.closePath()
              }
              ctx.fill()
              tracePolygon(ctx, view.outline)
              ctx.strokeStyle = edge
              ctx.stroke()
            } else {
              // Laminated stock: the side you look at is the outermost layer on it (right side = the last layer).
              const lay = viewLayers(piece ?? {}, view.id === 'side-left')
              const tone = (r) => (lay ? getMaterialColor(lay[r.layer ?? lay.length - 1].material, lay[r.layer ?? lay.length - 1].finish) : fill)
              for (const r of view.rects) {
                // laminated stock: a cut face is shown in the wood of the layer it is cut through (core or outer)
                ctx.fillStyle = r.state === 'cut' ? (lay ? darkenHex(tone(r), CUT_FACE_DARKEN) : cutFill) : tone(r)
                ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0)
              }
              ctx.strokeStyle = edge
              for (const r of view.rects) ctx.strokeRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0)
              // Where one cut face ends and another begins: a darker line between them.
              ctx.strokeStyle = seamColor
              ctx.lineWidth = 1.5 * px
              for (const r of view.rects) {
                if (!r.seam) continue
                const x = r.seam === 'x0' ? r.x0 : r.x1
                ctx.beginPath()
                ctx.moveTo(x, r.y0)
                ctx.lineTo(x, r.y1)
                ctx.stroke()
              }
              ctx.lineWidth = px
            }
            // The view's name, to the left of it, upright at a fixed size on screen.
            ctx.fillStyle = colors.scale
            ctx.font = `600 ${LABEL_PX * px}px sans-serif`
            ctx.textAlign = 'right'
            ctx.textBaseline = 'middle'
            ctx.fillText(view.label, layout.labelX - LABEL_GAP_PX * px, (view.box.y0 + view.box.y1) / 2)
          }
          ctx.restore()
        }}
      />

      {activeLayers.showScale && <ScaleOverlay axes={scaleAxes} />}

      {activeLayers.jointDots && dots.flatMap((d) => Object.entries(layout.centreY).map(([name, y], i) => (
        <Circle
          key={`${d.x}-${i}`}
          x={name === 'sideLeft' ? layout.x0 * 2 + layout.length - d.x : d.x}
          y={y}
          radius={Math.min(0.75, piece.width / 4)}
          fill={colors.joints[d.kinds[0]] ?? '#aaaaaa'}
          stroke="transparent"
          strokeWidth={1}
          strokeScaleEnabled={false}
          hitStrokeWidth={14}
          onMouseEnter={(e) => {
            const stage = e.target.getStage()
            stage.container().style.cursor = 'help'
            setTip({ x: name === 'sideLeft' ? layout.x0 * 2 + layout.length - d.x : d.x, y, scale: stage.scaleX(), text: d.kinds.map(notchLabel).join(' / '), stage })
          }}
          onMouseLeave={(e) => { e.target.getStage().container().style.cursor = ''; setTip(null) }}
        />
      )))}

      {activeLayers.jointDots && tip && (
        <Label x={tip.x} y={tip.y} scaleX={1 / tip.scale} scaleY={1 / tip.scale} offsetX={-10} offsetY={30} listening={false}>
          <Tag fill={colors.tipBg} cornerRadius={4} opacity={0.94} />
          <Text text={tip.text} fontSize={12} fontFamily="sans-serif" fill={colors.tipFg} padding={6} />
        </Label>
      )}
    </>
  )
}
