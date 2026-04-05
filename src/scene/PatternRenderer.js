import * as THREE from 'three';

const NOTCH_COLORS = {
  halfLap: 0x4a9eff,
  dado:    0xff6b4a,
  star:    0xffd700,
  miter:   0x7bc67e,
  taper:   0xa78bfa,
  butt:    0xfb923c,
  custom:  0xaaaaaa,
};

export class PatternRenderer {
  constructor(scene) {
    this.scene = scene;
    this._group = new THREE.Group();
    scene.add(this._group);
    this._centerlineObjs = [];
    this._jointDotObjs = [];
    this._stripBodyObjs = [];
  }

  setPattern(pattern) {
    // Clear
    while (this._group.children.length) this._group.remove(this._group.children[0]);
    this._centerlineObjs = [];
    this._jointDotObjs = [];
    this._stripBodyObjs = [];

    this._buildBoundary(pattern);
    this._buildStripBodies(pattern);
    this._buildCenterlines(pattern);
    this._buildJointDots(pattern);
  }

  _buildBoundary(pattern) {
    const { A, B, C } = pattern.vertices;
    const pts = [A, B, C, A].map(v => new THREE.Vector3(v.x, v.y, 0.5));
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: 0x334155 });
    this._group.add(new THREE.Line(geo, mat));
  }

  _buildCenterlines(pattern) {
    const mat = new THREE.LineBasicMaterial({ color: 0x94a3b8 });
    for (const s of pattern.strips) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(s.start.x, s.start.y, 1),
        new THREE.Vector3(s.end.x, s.end.y, 1),
      ]);
      const line = new THREE.Line(geo, mat.clone());
      this._group.add(line);
      this._centerlineObjs.push(line);
    }
  }

  _buildJointDots(pattern) {
    for (const j of pattern.joints) {
      const color = NOTCH_COLORS[j.notchType] ?? 0xaaaaaa;
      const geo = new THREE.CircleGeometry(1.5, 16);
      const mat = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(j.position.x, j.position.y, 2);
      this._group.add(mesh);
      this._jointDotObjs.push(mesh);
    }
  }

  _buildStripBodies(pattern) {
    const spMap = Object.fromEntries(pattern.stripProperties.map(sp => [sp.id, sp]));
    for (const strip of pattern.strips) {
      const pt = pattern.pieceTemplates.find(p => p.stripId === strip.id);
      const sp = pt ? spMap[pt.stripPropertyId] : pattern.stripProperties[0];
      const width = sp?.width ?? 6;
      const hexColor = sp?.color ? parseInt(sp.color.replace('#', ''), 16) : 0xe8d5b0;
      const dx = strip.end.x - strip.start.x;
      const dy = strip.end.y - strip.start.y;
      const length = Math.sqrt(dx*dx + dy*dy);
      const angle = Math.atan2(dy, dx);
      const geo = new THREE.PlaneGeometry(length, width);
      const mat = new THREE.MeshBasicMaterial({ color: hexColor, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set((strip.start.x+strip.end.x)/2, (strip.start.y+strip.end.y)/2, 0);
      mesh.rotation.z = angle;
      this._group.add(mesh);
      this._stripBodyObjs.push(mesh);
    }
  }

  applyLayers(layers) {
    this._centerlineObjs.forEach(o => { o.visible = !!layers.centerlines; });
    this._jointDotObjs.forEach(o => { o.visible = !!layers.jointDots; });
    this._stripBodyObjs.forEach(o => { o.material.wireframe = !!layers.wireframe; });
  }

  getBoundingBox(pattern) {
    const xs = pattern.strips.flatMap(s => [s.start.x, s.end.x]);
    const ys = pattern.strips.flatMap(s => [s.start.y, s.end.y]);
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  }

  dispose() { this.scene.remove(this._group); }
}
