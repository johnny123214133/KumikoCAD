import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import useAppStore from '../../store/useAppStore.js'
import { useTheme } from '../../store/useThemeStore.js'
import { getMaterialColor } from '../../geometry/woodFinishColors.js'
import { pieceSolid, layerSolids } from '../../geometry/parts/pieceSolid.js'
import { jointDotsOf } from '../../geometry/parts/profiles.js'
import { formatLength } from '../../geometry/units.js'
import { notchLabel } from '../pattern-editor/PatternLayer.jsx'
import { useSelectedProfile } from './PartsProfileLayer.jsx'
import LightPad from './LightPad.jsx'

// The Parts List's 3D view: the selected piece as a solid you can orbit (drag), pan (right-drag) and
// zoom (wheel), slide sideways / raise and lower (arrow keys, the buttons by the zoom controls), light
// from a point you choose (LightPad), with the joint dots and the scale of the other view. The
// geometry is geometry/parts/pieceSolid.js. The piece frame is x along the strip, y across it, z up
// from the bottom face; three.js is Y-up, so a point goes to (x, z, -y), a plain rotation.
const toThree = (positions) => {
  const out = new Float32Array(positions.length)
  for (let i = 0; i < positions.length; i += 3) { out[i] = positions[i]; out[i + 1] = positions[i + 2]; out[i + 2] = -positions[i + 1] }
  return out
}
const P = (x, y, z) => new THREE.Vector3(x, z, -y)
const SLIDE = 0.06 // of the distance to the piece, per key press

// A solid's faces and its edges drawn as lines one pixel wide.
function meshOf(positions, material, lineMaterial) {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(toThree(positions), 3))
  geo.computeVertexNormals()
  const group = new THREE.Group()
  const mesh = new THREE.Mesh(geo, material)
  group.add(mesh)
  const lines = new LineSegments2(new LineSegmentsGeometry().fromEdgesGeometry(new THREE.EdgesGeometry(geo, 25)), lineMaterial)
  group.add(lines)
  return { group, mesh }
}

export default function PieceView3D() {
  const { canvas } = useTheme()
  const leftOpen = useAppStore((s) => s.leftPanelOpen)
  const leftWidth = useAppStore((s) => s.leftPanelWidth)
  const rightOpen = useAppStore((s) => s.rightPanelOpen)
  const rightWidth = useAppStore((s) => s.rightPanelWidth)
  const layers = useAppStore((s) => s.activeLayers)
  const unit = useAppStore((s) => s.gridUnit)
  const light = useAppStore((s) => s.lightPos)
  const setView3dApi = useAppStore((s) => s.setView3dApi)
  const picking = useAppStore((s) => s.focusPick)
  const setFocusPick = useAppStore((s) => s.setFocusPick)
  const { found } = useSelectedProfile()
  const piece = found?.piece
  const host = useRef(null)
  const three = useRef(null)
  const [tip, setTip] = useState(null) // { x, y, text }
  const bg = canvas?.bg ?? '#fff'
  const dots = useMemo(() => (piece ? jointDotsOf(piece) : []), [piece])

  // the renderer, camera and controls live as long as the view does
  useEffect(() => {
    const el = host.current
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio || 1)
    el.appendChild(renderer.domElement)
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%'
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100000)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x7a6a58, 0.85))
    // The light is a child of the camera, in the plane facing the piece, so wherever you look it is lit from the same side of the view.
    const sun = new THREE.DirectionalLight(0xffffff, 2)
    sun.target.position.set(0, 0, -1)
    camera.add(sun, sun.target)
    scene.add(camera)
    // the focal point, shown while it is being set: a dot that stays the same size on screen
    const focal = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: 0xe5484d, depthTest: false, transparent: true }))
    focal.renderOrder = 10; focal.visible = false
    scene.add(focal)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    const state = { renderer, scene, camera, controls, sun, focal, content: null, lineMats: [], labels: [], hits: [], center: new THREE.Vector3(), radius: 100, raf: 0, size: new THREE.Vector2(1, 1) }
    three.current = state
    const resize = () => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1
      renderer.setSize(w, h, false)
      camera.aspect = w / h; camera.updateProjectionMatrix()
      state.size.set(w, h)
      for (const m of state.lineMats) m.resolution.set(w, h)
    }
    const ro = new ResizeObserver(resize); ro.observe(el); resize()
    const v = new THREE.Vector3()
    const loop = () => {
      state.raf = requestAnimationFrame(loop)
      controls.update()
      if (focal.visible) { focal.position.copy(controls.target); focal.scale.setScalar(camera.position.distanceTo(controls.target) * 0.012) }
      renderer.render(scene, camera)
      for (const l of state.labels) { // scale numbers follow their points on screen
        v.copy(l.at).project(camera)
        const behind = v.z > 1
        l.el.style.display = behind ? 'none' : 'block'
        l.el.style.transform = `translate(-50%,-50%) translate(${((v.x + 1) / 2) * state.size.x}px, ${((1 - v.y) / 2) * state.size.y}px)`
      }
    }
    loop()
    const dolly = (k) => { const d = camera.position.clone().sub(controls.target).multiplyScalar(1 / k); camera.position.copy(controls.target).add(d) }
    const fit = () => {
      controls.target.copy(state.center)
      const dist = (state.radius / Math.sin((camera.fov * Math.PI) / 360)) * 1.15
      camera.position.copy(controls.target).add(new THREE.Vector3(0.45, 0.8, 1).normalize().multiplyScalar(dist))
      camera.near = dist / 100; camera.far = dist * 20; camera.updateProjectionMatrix()
      controls.update()
    }
    // Slide: the camera and the point it looks at move together, along the camera's own right / up.
    const slide = (dx, dy) => {
      const dist = camera.position.distanceTo(controls.target)
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion)
      const move = right.multiplyScalar(dx * dist * SLIDE).add(up.multiplyScalar(dy * dist * SLIDE))
      camera.position.add(move); controls.target.add(move)
      controls.update()
    }
    state.fit = fit
    setView3dApi({ zoomBy: dolly, zoomToFit: fit, slide })
    return () => {
      setView3dApi(null)
      cancelAnimationFrame(state.raf); ro.disconnect(); controls.dispose()
      scene.traverse((o) => { o.geometry?.dispose?.() })
      renderer.dispose(); renderer.domElement.remove(); three.current = null
    }
  }, [setView3dApi])

  // while the focal-point button is lit: show the dot, wait for a click on the piece
  useEffect(() => {
    const s = three.current
    if (!s) return undefined
    s.focal.visible = picking
    host.current.style.cursor = picking ? 'crosshair' : ''
    if (!picking) return undefined
    const esc = (e) => { if (e.key === 'Escape') setFocusPick(false) }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [picking, setFocusPick])
  useEffect(() => () => setFocusPick(false), [setFocusPick, piece])

  // a click (not a drag) while picking: on the piece it becomes the focal point, anywhere else it cancels
  const down = useRef(null)
  const onDown = (e) => { down.current = { x: e.clientX, y: e.clientY } }
  const onUp = (e) => {
    const s = three.current
    const d = down.current; down.current = null
    if (!s || !picking || !d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) return
    const r = host.current.getBoundingClientRect()
    const ray = new THREE.Raycaster()
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)), s.camera)
    const hit = s.madeMeshes?.length ? ray.intersectObjects(s.madeMeshes, false)[0] : null
    if (hit) { s.controls.target.copy(hit.point); s.controls.update() }
    setFocusPick(false)
  }

  // the light follows the pad: x right, y up, in the plane through the camera
  useEffect(() => { three.current?.sun.position.set(light.x * 2, light.y * 2, 0) }, [light])

  // the piece, and what is drawn on it
  useEffect(() => {
    const s = three.current
    if (!s) return
    if (s.content) { s.scene.remove(s.content); s.content.traverse((o) => { o.geometry?.dispose?.() }); s.content = null }
    for (const l of s.labels) l.el.remove()
    s.labels = []; s.hits = []; s.lineMats = []
    setTip(null)
    if (!piece) return
    const solid = pieceSolid(piece)
    const wood = getMaterialColor(piece.material, piece.finish)
    const dark = new THREE.Color(wood).multiplyScalar(0.35)
    const content = new THREE.Group()
    const woodMat = new THREE.MeshStandardMaterial({ color: wood, roughness: 0.75, metalness: 0, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })
    const edgeMat = new LineMaterial({ color: dark, linewidth: 1 })
    edgeMat.resolution.copy(s.size)
    s.lineMats.push(edgeMat)
    const madeMeshes = []
    if (piece.layers?.length) {
      // laminated stock: each layer in its own wood
      for (const { layer, made } of layerSolids(piece)) {
        if (!made.positions.length) continue
        const l = piece.layers[layer]
        const c = getMaterialColor(l.material, l.finish)
        const mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, metalness: 0, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })
        const em = new LineMaterial({ color: new THREE.Color(c).multiplyScalar(0.35), linewidth: 1 })
        em.resolution.copy(s.size)
        s.lineMats.push(em)
        const m = meshOf(made.positions, mat, em); content.add(m.group); madeMeshes.push(m.mesh)
      }
    } else if (solid.made.positions.length) { const m = meshOf(solid.made.positions, woodMat, edgeMat); content.add(m.group); madeMeshes.push(m.mesh) }
    // the part of a trimmed strip that isn't made, as a ghost
    const ghostMat = new THREE.MeshStandardMaterial({ color: wood, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide })
    const ghostEdge = new LineMaterial({ color: dark, linewidth: 1, transparent: true, opacity: 0.4 })
    ghostEdge.resolution.copy(s.size)
    s.lineMats.push(ghostEdge)
    for (const m of solid.missing) if (m.positions.length) content.add(meshOf(m.positions, ghostMat, ghostEdge).group)
    s.content = content
    s.scene.add(content)
    s.madeMeshes = madeMeshes

    const box = new THREE.Box3().setFromObject(content)
    s.center = box.getCenter(new THREE.Vector3())
    s.radius = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 1)
    s.fit()
  }, [piece])

  useEffect(() => { if (three.current) three.current.scene.background = new THREE.Color(bg) }, [bg])

  // overlays (joint dots, scale): rebuilt when the piece or the layers change, without moving the camera
  useEffect(() => {
    const s = three.current
    if (!s || !piece) return undefined
    const ov = new THREE.Group()
    s.scene.add(ov)
    for (const l of s.labels) l.el.remove()
    s.labels = []; s.hits = []
    const xs = piece.outline.map((p) => p[0]), ys = piece.outline.map((p) => p[1])
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), t = piece.thickness
    const size = Math.max(x1 - x0, y1 - y0, t)
    const cy = (y0 + y1) / 2

    if (layers.jointDots) {
      const r = Math.max(Math.min(0.75, piece.width / 4), size / 160)
      for (const d of dots) {
        const color = new THREE.Color(canvas.joints?.[d.kinds[0]] ?? '#aaaaaa')
        for (const z of [t, 0]) { // on the top face and the bottom face, where the 2D views show them
          const dot = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), new THREE.MeshBasicMaterial({ color }))
          dot.position.copy(P(d.x, cy, z)); ov.add(dot)
          const hit = new THREE.Mesh(new THREE.SphereGeometry(Math.max(r * 2, size / 70), 8, 6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }))
          hit.position.copy(dot.position); hit.userData.text = d.kinds.map(notchLabel).join(' / '); ov.add(hit); s.hits.push(hit)
        }
      }
    }

    if (layers.showScale) {
      const off = Math.max(size * 0.06, 4), tick = off * 0.35
      const colour = new THREE.Color(canvas.scale ?? '#888888')
      const segs = []
      const dim = (a, b, ta, tb, value) => { // a line from a to b, a tick at each end (along ta / tb), and its number
        segs.push(a, b, a, a.clone().add(ta), b, b.clone().add(tb))
        const el = document.createElement('div')
        el.textContent = formatLength(value, unit)
        el.style.cssText = `position:absolute;left:0;top:0;font:600 11px sans-serif;white-space:nowrap;pointer-events:none;color:${canvas.scale ?? '#888'};text-shadow:0 0 3px ${bg},0 0 3px ${bg}`
        host.current.appendChild(el)
        s.labels.push({ el, at: a.clone().add(b).multiplyScalar(0.5).add(new THREE.Vector3().copy(ta).normalize().multiplyScalar(-tick * 1.4)) })
      }
      // length along the front edge of the bottom face, width across the far end, thickness up the near corner
      dim(P(x0, y0 - off, 0), P(x1, y0 - off, 0), P(0, tick, 0), P(0, tick, 0), x1 - x0)
      dim(P(x1 + off, y0, 0), P(x1 + off, y1, 0), P(-tick, 0, 0), P(-tick, 0, 0), y1 - y0)
      dim(P(x0 - off, y0, 0), P(x0 - off, y0, t), P(tick, 0, 0), P(tick, 0, 0), t)
      const g = new THREE.BufferGeometry().setFromPoints(segs)
      ov.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: colour, depthTest: false })))
    }
    return () => { s.scene.remove(ov); ov.traverse((o) => { o.geometry?.dispose?.() }); for (const l of s.labels) l.el.remove(); s.labels = []; s.hits = [] }
  }, [piece, dots, layers.jointDots, layers.showScale, unit, canvas, bg])

  // hovering a joint dot says what it is
  const onMove = (e) => {
    const s = three.current
    if (!s || !s.hits.length) { if (tip) setTip(null); return }
    const r = host.current.getBoundingClientRect()
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1))
    const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, s.camera)
    const first = ray.intersectObjects(s.madeMeshes?.length ? [...s.hits, ...s.madeMeshes] : s.hits, false)[0] // (the piece in front hides a dot behind it)
    if (first?.object.userData.text) {
      host.current.style.cursor = picking ? 'crosshair' : 'help'
      setTip({ x: e.clientX - r.left, y: e.clientY - r.top, text: first.object.userData.text })
    } else { host.current.style.cursor = picking ? 'crosshair' : ''; if (tip) setTip(null) }
  }

  return (
    <>
      <div
        ref={host}
        data-piece-3d
        onPointerMove={onMove}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerLeave={() => setTip(null)}
        style={{ position: 'absolute', top: 0, bottom: 0, left: leftOpen ? leftWidth : 0, right: rightOpen ? rightWidth : 0, background: bg, zIndex: 1, overflow: 'hidden' }}
      >
        {tip && (
          <div style={{ position: 'absolute', left: tip.x + 12, top: tip.y + 16, zIndex: 3, pointerEvents: 'none', background: canvas.tipBg, color: canvas.tipFg, font: '12px sans-serif', padding: '6px 8px', borderRadius: 4, opacity: 0.94 }}>{tip.text}</div>
        )}
      </div>
      <LightPad />
    </>
  )
}
