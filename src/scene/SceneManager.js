import * as THREE from 'three';

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xfafaf8);

    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 600;
    this.camera = new THREE.OrthographicCamera(-w/2, w/2, h/2, -h/2, 0.1, 10000);
    this.camera.position.set(0, 0, 100);
    this.camera.lookAt(0, 0, 0);

    this._isPanning = false;
    this._lastPointer = { x: 0, y: 0 };
    this._bindEvents();
    this._startRenderLoop();
  }

  _bindEvents() {
    this.canvas.addEventListener('wheel', this._onWheel.bind(this), { passive: false });
    this.canvas.addEventListener('pointerdown', this._onPointerDown.bind(this));
    this.canvas.addEventListener('pointermove', this._onPointerMove.bind(this));
    this.canvas.addEventListener('pointerup', this._onPointerUp.bind(this));
    this.canvas.addEventListener('pointerleave', this._onPointerUp.bind(this));
  }

  _onWheel(e) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    this.camera.zoom = Math.max(0.01, Math.min(100, this.camera.zoom * factor));
    this.camera.updateProjectionMatrix();
  }

  _onPointerDown(e) {
    this._isPanning = true;
    this._lastPointer = { x: e.clientX, y: e.clientY };
    this.canvas.setPointerCapture(e.pointerId);
  }

  _onPointerMove(e) {
    if (!this._isPanning) return;
    const dx = e.clientX - this._lastPointer.x;
    const dy = e.clientY - this._lastPointer.y;
    this._lastPointer = { x: e.clientX, y: e.clientY };
    const rect = this.canvas.getBoundingClientRect();
    const worldW = (this.camera.right - this.camera.left) / this.camera.zoom;
    const worldH = (this.camera.top - this.camera.bottom) / this.camera.zoom;
    this.camera.position.x -= (dx / rect.width) * worldW;
    this.camera.position.y += (dy / rect.height) * worldH;
  }

  _onPointerUp() { this._isPanning = false; }

  onResize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.left = -w/2; this.camera.right = w/2;
    this.camera.top = h/2; this.camera.bottom = -h/2;
    this.camera.updateProjectionMatrix();
  }

  zoomToFit(bb) {
    const cx = (bb.minX + bb.maxX) / 2;
    const cy = (bb.minY + bb.maxY) / 2;
    const pw = bb.maxX - bb.minX || 1;
    const ph = bb.maxY - bb.minY || 1;
    const vw = this.camera.right - this.camera.left;
    const vh = this.camera.top - this.camera.bottom;
    this.camera.zoom = Math.min((vw * 0.8) / pw, (vh * 0.8) / ph);
    this.camera.position.set(cx, cy, 100);
    this.camera.updateProjectionMatrix();
  }

  _startRenderLoop() {
    const tick = () => {
      this._rafId = requestAnimationFrame(tick);
      this.renderer.render(this.scene, this.camera);
    };
    tick();
  }

  dispose() {
    cancelAnimationFrame(this._rafId);
    this.canvas.removeEventListener('wheel', this._onWheel);
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    this.canvas.removeEventListener('pointermove', this._onPointerMove);
    this.canvas.removeEventListener('pointerup', this._onPointerUp);
    this.canvas.removeEventListener('pointerleave', this._onPointerUp);
    this.renderer.dispose();
  }
}
