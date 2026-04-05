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

  /**
   * Build a THREE.Shape for a strip in piece-local space.
   * Centerline runs along the x-axis from 0 to length; strip spans y ∈ [-hw, +hw].
   *
   * Each end cut is a line through the joint point on the centerline:
   *   start cut: passes through (0, 0) at world-angle (180 + startAngleDeg)°
   *   end cut:   passes through (length, 0) at world-angle endAngleDeg°
   *
   * Both the top AND bottom edge intersections are computed so the shape is a
   * symmetric quadrilateral — no centerline vertices, no triangulation seam.
   */
  _buildStripShape(length, hw, startAngleDeg, endAngleDeg, startNotchType, endNotchType) {
    // console.log('length: ' + length)
    // console.log('hw: ' + hw)
    // console.log('startAngleDeg: ' + startAngleDeg)
    // console.log('endAngleDeg: ' + endAngleDeg)
    // console.log('startNotchType: ' + startNotchType)
    // console.log('endNotchType: ' + endNotchType)

    const startRad = (180 + startAngleDeg) * (Math.PI / 180);
    const endRad   = endAngleDeg           * (Math.PI / 180);

    // console.log('startRad: ' + startRad)
    // console.log('endRad: ' + endRad)

    const xAtY = (x0, rad, y) => {
      const s = Math.sin(rad);
      return Math.abs(s) < 1e-6 ? x0 : x0 + Math.cos(rad) * y / s;
    };

    if (startNotchType == 'taper') 

    // console.log(': ' + )
    // console.log('(xAtY(0,      startRad, -hw), -hw): (' + xAtY(0,      startRad, -hw) + ', ' + -hw + ')')
    // console.log('(xAtY(length, endRad,   -hw), -hw): (' + xAtY(length, endRad,   -hw) + ', ' + -hw + ')')
    // console.log('(xAtY(length, endRad,    hw),  hw): (' + xAtY(length, endRad,    hw) + ', ' +  hw + ')')
    // console.log('(xAtY(0,      startRad,  hw),  hw): (' + xAtY(0,      startRad,  hw) + ', ' +  hw + ')')

    const shape = new THREE.Shape();


    // strip start
    if (startNotchType == 'taper') {
      // top left point
      shape.moveTo(xAtY(0,      startRad,  hw),  hw)

      // left midpoint
      shape.lineTo(0,0)

      // bottom left point
      shape.lineTo(xAtY(0,     startRad,  hw),  -hw)

    }
    else { // miter
      // top left point
      shape.moveTo(xAtY(0,      startRad,  hw),  hw)
      //bottom left point
      shape.lineTo(xAtY(0,      startRad, -hw), -hw);
    }

    // strip end
    if (endNotchType == 'taper') {
      // bottom right point
      shape.lineTo(xAtY(length,  -endRad,   -hw), -hw)

      // right midpoint
      shape.lineTo(length, 0)

      // top right point
      shape.lineTo(xAtY(length, endRad,    hw),  hw)

      shape.closePath()
    }

    else { // miter
      // bottom right point
      shape.lineTo(xAtY(length, endRad,   -hw), -hw);
      //top right point
      shape.lineTo(xAtY(length, endRad,    hw),  hw);
      
      shape.closePath();
    }




    return shape;
  }

  _buildStripBodies(pattern) {
    console.log('pattern: ' )
    console.dir(pattern, {depth : null})
    console.log('\nrendering pattern: ' + pattern.name)

    const spMap = Object.fromEntries(pattern.stripProperties.map(sp => [sp.id, sp]));

    for (const strip of pattern.strips) {
      console.log('\nrendering strip: ' + strip.id)
      const pt = pattern.pieceTemplates.find(p => p.stripId === strip.id);
      const sp = pt ? spMap[pt.stripPropertyId] : pattern.stripProperties[0];
      const width  = sp?.width  ?? 6;
      const hexColor = sp?.color ? parseInt(sp.color.replace('#', ''), 16) : 0xe8d5b0;

      const dx = strip.end.x - strip.start.x;
      const dy = strip.end.y - strip.start.y;
      const length = Math.sqrt(dx * dx + dy * dy);

      // Find end cuts and project to piece-local x to distinguish start vs end
      const endCuts = strip.cuts.filter(c => c.role === 'end');
      const unitDx  = Math.cos(strip.orientation);
      const unitDy  = Math.sin(strip.orientation);

      const localised = endCuts.map(c => ({
        angle:  c.angle,
        jointId : c.jointId,
        localX: (c.position.x - strip.start.x) * unitDx + (c.position.y - strip.start.y) * unitDy,
      })).sort((a, b) => a.localX - b.localX);

      const startAngle = localised[0]?.angle ?? 90;
      const endAngle   = localised[localised.length - 1]?.angle ?? 90;

      const startJointId = localised[0]?.jointId
      const endJointId = localised[localised.length - 1]?.jointId

      // console.log('startJointId:' + startJointId)
      // console.log('endJointId:' + endJointId)

      const startNotchType = pattern.joints.filter(joint => joint.id === startJointId)?.[0].notchType
      const endNotchType = pattern.joints.filter(joint => joint.id === endJointId)?.[0].notchType

      // console.log('startNotchType:' + startNotchType)
      // console.log('endNotchType:' + endNotchType)

      const shape = this._buildStripShape(length, width / 2, startAngle, endAngle, startNotchType, endNotchType);
      const geo   = new THREE.ShapeGeometry(shape);
      const mat   = new THREE.MeshBasicMaterial({
        color: hexColor, side: THREE.DoubleSide, transparent: true, opacity: 1,
      });
      const mesh = new THREE.Mesh(geo, mat);

      // Place at strip.start, rotated along strip orientation
      mesh.position.set(strip.start.x, strip.start.y, 0);
      mesh.rotation.z = strip.orientation;

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
