// TODO: replace with grid tiling once computeGridGeometry() is implemented
import * as THREE from 'three';

export class PanelRenderer {
  constructor(scene) {
    this.scene = scene;
    this._group = new THREE.Group();
    scene.add(this._group);
  }

  setDimensions(widthMm = 300, heightMm = 400) {
    while (this._group.children.length) this._group.remove(this._group.children[0]);
    const hw = widthMm / 2, hh = heightMm / 2;
    const pts = [
      new THREE.Vector3(-hw, -hh, 0), new THREE.Vector3(hw, -hh, 0),
      new THREE.Vector3(hw, hh, 0), new THREE.Vector3(-hw, hh, 0),
      new THREE.Vector3(-hw, -hh, 0),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: 0x94a3b8 });
    this._group.add(new THREE.Line(geo, mat));
  }

  dispose() { this.scene.remove(this._group); }
}
