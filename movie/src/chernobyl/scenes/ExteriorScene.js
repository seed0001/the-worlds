import * as THREE from 'three';
import { buildPlant } from '../models/plant.js';
import { Plume, Embers } from '../models/effects.js';

// The plant from outside: the establishing night, the explosion seen wide, and
// the grey dawn that finds the building broken open. The reactor-hall roof is a
// real slab here — the blast hides it and throws it, and from the hole the fire
// and plume rise for the rest of the shot.

const NIGHT_SKY = new THREE.Color(0x070a12);
const DAWN_SKY = new THREE.Color(0x6b6f7a);

export class ExteriorScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = NIGHT_SKY.clone();
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 6000);
    this.bloom = { strength: 0.55, radius: 0.7, threshold: 0.55 };
    this.ready = false;

    this.phase = 'night';
    this._camMode = 'wide';
    this._t = 0;
    this._dawn = 0; this._dawnTarget = 0;
    this._fire = 0; this._fireTarget = 0;
    this._flash = 0;
    this._blown = false;
    this._debris = [];
  }

  async enter() {
    if (this.ready) return;

    this.moon = new THREE.DirectionalLight(0x9fb0d0, 0.5);
    this.moon.position.set(-60, 80, 120);
    this.moon.castShadow = true;
    this.moon.shadow.mapSize.set(1024, 1024);
    const sc = this.moon.shadow.camera; sc.near = 10; sc.far = 500; sc.left = -160; sc.right = 160; sc.top = 160; sc.bottom = -40;
    this.scene.add(this.moon, this.moon.target);
    this.ambient = new THREE.AmbientLight(0x2a3346, 0.6);
    this.scene.add(this.ambient);

    // Ground.
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(3000, 48),
      new THREE.MeshStandardMaterial({ color: 0x23262a, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Stars.
    this.stars = starField(1400, 2500);
    this.scene.add(this.stars);

    this.plant = buildPlant();
    this.scene.add(this.plant);
    this.coreTop = this.plant.userData.coreTop.clone();

    // Fire from the open core: an orange glow-light plus plume and embers.
    this.fireLight = new THREE.PointLight(0xff6a1e, 0, 260, 2);
    this.fireLight.position.copy(this.coreTop);
    this.scene.add(this.fireLight);
    this.flashLight = new THREE.PointLight(0xfff2d0, 0, 900, 2);
    this.flashLight.position.copy(this.coreTop);
    this.scene.add(this.flashLight);

    this.plume = new Plume({ spread: 10, rise: 12 });
    this.plume.setBase(this.coreTop.x, this.coreTop.y + 2, this.coreTop.z);
    this.scene.add(this.plume.group);
    this.embers = new Embers();
    this.embers.points.position.copy(this.coreTop);
    this.embers._span = 40;
    this.scene.add(this.embers.points);

    this.camera.position.set(150, 70, 230);
    this.camera.lookAt(20, 40, 0);
    this.ready = true;
  }

  beat(dir = {}) {
    if (dir.cam) this._camMode = dir.cam;
    if (!dir.ext) return;
    this.phase = dir.ext;
    switch (dir.ext) {
      case 'night': this._fireTarget = 0; this._dawnTarget = 0; break;
      case 'explosion': this._explode(); break;
      case 'fire': this._fireTarget = 1; break;
      case 'dawn': this._fireTarget = 0.5; this._dawnTarget = 1; break;
    }
  }

  _explode() {
    if (this._blown) return;
    this._blown = true;
    this._flash = 1;
    this._fireTarget = 1;

    // Take the roof off and throw it, plus a scatter of debris chunks.
    const roof = this.plant.userData.hallRoof;
    roof.userData.v = new THREE.Vector3((Math.random() - 0.5) * 20, 55, (Math.random() - 0.5) * 20);
    this._debris.push({ obj: roof, v: roof.userData.v, spin: new THREE.Vector3(0.6, 0.3, 0.9) });
    const chunkMat = new THREE.MeshStandardMaterial({ color: 0x33363b, roughness: 1 });
    for (let i = 0; i < 26; i++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(2 + Math.random() * 4, 2 + Math.random() * 4, 2 + Math.random() * 4), chunkMat);
      c.position.copy(this.coreTop);
      this.scene.add(c);
      const dir = new THREE.Vector3((Math.random() - 0.5) * 2, 1, (Math.random() - 0.5) * 2).normalize();
      this._debris.push({
        obj: c,
        v: dir.multiplyScalar(20 + Math.random() * 40).add(new THREE.Vector3(0, 30 + Math.random() * 40, 0)),
        spin: new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8),
      });
    }
  }

  update(dt) {
    if (!this.ready) return;
    this._t += dt;

    this._dawn += (this._dawnTarget - this._dawn) * Math.min(1, dt * 0.5);
    this._fire += (this._fireTarget - this._fire) * Math.min(1, dt * 1.2);
    this._flash = Math.max(0, this._flash - dt * 1.6);

    // Sky and lighting drift from night to dawn.
    this.scene.background.copy(NIGHT_SKY).lerp(DAWN_SKY, this._dawn);
    this.ambient.intensity = 0.6 + this._dawn * 0.7;
    this.moon.intensity = 0.5 + this._dawn * 0.9;
    this.stars.material.opacity = (1 - this._dawn) * 0.9;

    // Windows fade as dawn comes up.
    for (const w of this.plant.userData.windows) w.material.opacity = 1 - this._dawn * 0.85;

    // Fire from the open core.
    const flick = 0.8 + Math.sin(this._t * 9) * 0.12 + Math.random() * 0.08;
    this.fireLight.intensity = this._fire * 6 * flick;
    this.flashLight.intensity = this._flash * 40;
    this.plume.update(dt, this._fire);
    this.embers.update(dt, this._fire);

    // Debris flight.
    for (const d of this._debris) {
      d.v.y -= dt * 30;
      d.obj.position.addScaledVector(d.v, dt);
      d.obj.rotation.x += d.spin.x * dt;
      d.obj.rotation.y += d.spin.y * dt;
      d.obj.rotation.z += d.spin.z * dt;
      if (d.obj.position.y < 0) { d.obj.position.y = 0; d.v.set(0, 0, 0); d.spin.set(0, 0, 0); }
    }

    this._driveCamera();
  }

  _driveCamera() {
    const mode = this._camMode;
    const drift = Math.sin(this._t * 0.08) * 6;
    let pos, target;
    if (mode === 'hall') {
      pos = new THREE.Vector3(96, 66 + drift * 0.4, 150); target = new THREE.Vector3(40, 52, 0);
    } else if (mode === 'stack') {
      pos = new THREE.Vector3(120, 60, 170); target = new THREE.Vector3(58, 70, -6);
    } else if (mode === 'dawn') {
      pos = new THREE.Vector3(170, 84, 250); target = new THREE.Vector3(24, 44, 0);
    } else { // wide establishing
      pos = new THREE.Vector3(150 + drift, 72, 236); target = new THREE.Vector3(20, 40, 0);
    }
    if (this._flash > 0.2) {
      const s = this._flash * 3;
      pos = pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, 0));
    }
    this.camera.position.copy(pos);
    this.camera.lookAt(target);
  }

  dispose() {
    this.plume?.dispose();
    this.embers?.dispose();
    this.scene.traverse((o) => { o.geometry?.dispose?.(); if (o.material?.dispose) o.material.dispose(); });
  }
}

function starField(count, radius) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    pos[i * 3] = Math.cos(th) * r * radius;
    pos[i * 3 + 1] = Math.abs(u) * radius;
    pos[i * 3 + 2] = Math.sin(th) * r * radius;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xdfe8ff, size: 4, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false,
  }));
}
