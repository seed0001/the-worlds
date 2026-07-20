import * as THREE from 'three';
import { LunarGround } from '../models/lunarGround.js';
import { buildLM } from '../models/lem.js';
import { buildEarth } from '../models/bodies.js';
import { MoonDust } from '../models/moondust.js';

// The lunar surface — powered descent and touchdown (and, in Phase 3, the
// moonwalk). Black sky, hard sun, the Earth hanging fixed overhead, grey
// regolith underfoot. The LM flies down under its descent engine; near the
// ground the engine blasts dust out flat; at contact it settles onto its legs.

export class MoonSurfaceScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.3, 100000);
    this.bloom = { strength: 0.3, radius: 0.5, threshold: 0.8 };
    this.ready = false;
    this.phase = 'descent';
    this.bt = 0; this._t = 0;
    this.lmAlt = 130;      // metres above the pad
    this.throttle = 1;
    this.landed = false;
    this._cam = 'descent';
  }

  async enter() {
    if (this.ready) return;
    this.scene.background = new THREE.Color(0x000000);
    this.stars = starField(2600, 40000);
    this.scene.add(this.stars);

    // Hard, single sun; the shadowed side goes nearly black (no air to fill it).
    this.sun = new THREE.DirectionalLight(0xfff6e8, 3.2);
    this.sun.position.set(240, 160, 120);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 1; this.sun.shadow.camera.far = 600;
    const sc = this.sun.shadow.camera; sc.left = sc.bottom = -120; sc.right = sc.top = 120;
    this.scene.add(this.sun, this.sun.target);
    this.scene.add(new THREE.AmbientLight(0x0c0f14, 1.0));

    // Earth, fixed in the black sky.
    this.earth = buildEarth(22);
    this.earth.position.set(-150, 230, -300);
    this.scene.add(this.earth);

    this.ground = new LunarGround({ size: 1400, resolution: 220 });
    this.scene.add(this.ground.mesh);

    this.lm = buildLM();
    this.scene.add(this.lm);

    // Descent-engine flame (additive cone under the bell).
    this.flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.7, 5, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.flame.rotation.x = Math.PI;
    this.scene.add(this.flame);

    this.dust = new MoonDust();
    this.scene.add(this.dust.group);

    this.siteY = this.ground.heightAt(0, 0);
    this._poseLM();
    this.camera.position.set(40, 30, 55);
    this.camera.lookAt(0, this.siteY + this.lmAlt, 0);
    this.ready = true;
  }

  beat(dir = {}) {
    if (dir.moon) { this.phase = dir.moon; this.bt = 0; }
    if (dir.cam) this._cam = dir.cam;
  }

  _poseLM() {
    const y = this.siteY + this.lmAlt;
    this.lm.position.set(0, y, 0);
    // A little pitch during the descent, leveling for the final drop.
    const pitch = this.landed ? 0 : Math.max(0, (this.lmAlt - 20) / 130) * 0.28;
    this.lm.rotation.x = pitch;
    // Flame under the engine, on while descending.
    const on = !this.landed && this.throttle > 0.02;
    this.flame.visible = on;
    if (on) {
      this.flame.position.set(this.lm.position.x, y + 0.2, this.lm.position.z);
      const len = this.throttle * (0.85 + Math.random() * 0.15);
      this.flame.scale.set(this.throttle, len, this.throttle);
      this.flame.position.y -= 2.5 * len;
    }
  }

  update(dt) {
    if (!this.ready) return;
    this._t += dt; this.bt += dt;

    if (!this.landed) {
      // The 'descent' beat brings the LM down to a low hover; only the 'landing'
      // beat releases the final drop, so contact lands on the narrator's word.
      const floor = this.phase === 'descent' ? 15 : 0;
      const rate = this.lmAlt > 40 ? 18 : this.lmAlt > 8 ? 6 : 2;
      this.throttle = this.lmAlt > 8 ? 1 : 0.65;
      this.lmAlt = Math.max(floor, this.lmAlt - rate * dt);
      if (this.lmAlt <= 0.05) { this.landed = true; this.throttle = 0; }
    }
    this._poseLM();

    // Dust blasts once the engine is close to the surface, growing as it nears.
    if (!this.landed && this.lmAlt < 28) {
      const strength = Math.min(1, (28 - this.lmAlt) / 24) * this.throttle;
      this.dust.blast(this.lm.position.x, this.lm.position.z, this.siteY, strength);
    }
    this.dust.update(dt, this.siteY);

    this.sun.target.position.set(this.lm.position.x, this.siteY, this.lm.position.z);
    this._driveCamera(dt);
  }

  _driveCamera(dt) {
    const lm = this.lm.position;
    const c = this._cam;
    let pos, target = new THREE.Vector3(lm.x, lm.y - 2, lm.z);
    if (c === 'descent') {
      // Tracking from the side and a little below — LM against black sky, ground
      // creeping into the bottom of frame as it nears.
      pos = new THREE.Vector3(34, this.siteY + this.lmAlt * 0.7 + 10, 46);
      target.set(0, this.siteY + this.lmAlt * 0.6, 0);
    } else if (c === 'landing') {
      // Low, close to the pads and the dust.
      pos = new THREE.Vector3(16, this.siteY + Math.max(4, this.lmAlt * 0.5 + 3), 22);
      target.set(0, this.siteY + Math.min(this.lmAlt, 6), 0);
    } else { // landed: settle wide, Earth in the sky
      pos = new THREE.Vector3(20, this.siteY + 9, 30);
      target.set(0, this.siteY + 5, 0);
    }
    this.camera.position.lerp(pos, Math.min(1, dt * 2));
    this.camera.lookAt(target);
    this.stars.position.copy(this.camera.position);
  }

  dispose() {
    this.dust?.dispose();
    this.ground?.dispose();
    this.scene.traverse((o) => { o.geometry?.dispose?.(); if (o.material?.dispose) o.material.dispose(); });
  }
}

function starField(count, radius) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    pos[i * 3] = Math.cos(th) * r * radius; pos[i * 3 + 1] = Math.abs(u) * radius; pos[i * 3 + 2] = Math.sin(th) * r * radius;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 60, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false }));
}
