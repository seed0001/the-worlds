import * as THREE from 'three';

// WASD + mouse-drag camera. This is the "operator" rig — how you find a shot
// before committing it to a camera move. Deliberately simple: no inertia beyond
// a little smoothing, because hunting for framing with a floaty camera is
// miserable.
//
// Controls: drag to look, WASD to move, Q/E down/up, Shift to sprint,
// scroll to change speed, F to toggle a fixed height above ground.

export class FlyCamera {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {HTMLElement} domElement
   * @param {object} [opts]
   * @param {number} [opts.speed] - metres per second
   * @param {Function} [opts.groundHeight] - (x, z) => ground y, enables walk mode
   */
  constructor(camera, domElement, { speed = 60, groundHeight = null } = {}) {
    this.camera = camera;
    this.dom = domElement;
    this.speed = speed;
    this.groundHeight = groundHeight;

    this.enabled = true;
    this.walkMode = false;
    this.eyeHeight = 1.7;

    this.keys = new Set();
    this._dragging = false;
    this._yaw = 0;
    this._pitch = 0;
    this._velocity = new THREE.Vector3();

    // Seed yaw/pitch from the camera's current orientation so enabling the rig
    // doesn't snap the view.
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    this._yaw = euler.y;
    this._pitch = euler.x;

    this._bind();
  }

  _bind() {
    this._onKeyDown = (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'KeyF') this.walkMode = !this.walkMode;
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);

    this._onPointerDown = (e) => {
      if (e.button !== 0) return;
      this._dragging = true;
      this.dom.setPointerCapture?.(e.pointerId);
    };
    this._onPointerUp = (e) => {
      this._dragging = false;
      this.dom.releasePointerCapture?.(e.pointerId);
    };
    this._onPointerMove = (e) => {
      if (!this._dragging || !this.enabled) return;
      const sensitivity = 0.0022;
      this._yaw -= e.movementX * sensitivity;
      this._pitch -= e.movementY * sensitivity;
      const limit = Math.PI / 2 - 0.01;
      this._pitch = Math.max(-limit, Math.min(limit, this._pitch));
    };
    this._onWheel = (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      this.speed = Math.max(1, Math.min(4000, this.speed * (e.deltaY > 0 ? 0.85 : 1.18)));
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    this.dom.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('pointermove', this._onPointerMove);
    this.dom.addEventListener('wheel', this._onWheel, { passive: false });
  }

  update(dt) {
    if (!this.enabled) return;

    this.camera.quaternion.setFromEuler(new THREE.Euler(this._pitch, this._yaw, 0, 'YXZ'));

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);

    if (this.walkMode) {
      // Keep movement in the ground plane so walking doesn't fly you off a hill.
      forward.y = 0;
      forward.normalize();
      right.y = 0;
      right.normalize();
    }

    const target = new THREE.Vector3();
    if (this.keys.has('KeyW')) target.add(forward);
    if (this.keys.has('KeyS')) target.sub(forward);
    if (this.keys.has('KeyD')) target.add(right);
    if (this.keys.has('KeyA')) target.sub(right);
    if (!this.walkMode) {
      if (this.keys.has('KeyE')) target.y += 1;
      if (this.keys.has('KeyQ')) target.y -= 1;
    }

    if (target.lengthSq() > 0) target.normalize();
    const sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 4 : 1;
    target.multiplyScalar(this.speed * sprint * (this.walkMode ? 0.12 : 1));

    // Light smoothing — enough to take the edge off key-down, not enough to
    // feel like the camera is on ice.
    this._velocity.lerp(target, Math.min(1, dt * 12));
    this.camera.position.addScaledVector(this._velocity, dt);

    if (this.walkMode && this.groundHeight) {
      const ground = this.groundHeight(this.camera.position.x, this.camera.position.z);
      if (Number.isFinite(ground)) this.camera.position.y = ground + this.eyeHeight;
    }
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.dom.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('pointermove', this._onPointerMove);
    this.dom.removeEventListener('wheel', this._onWheel);
  }
}
