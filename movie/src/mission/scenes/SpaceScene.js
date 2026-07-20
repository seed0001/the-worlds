import * as THREE from 'three';
import { buildEarth, buildMoon } from '../models/bodies.js';
import { buildCSM } from '../models/csm.js';
import { buildLM } from '../models/lem.js';
import { buildSIVB } from '../models/sivb.js';

// Space — Earth orbit to lunar orbit. The spacecraft stays near the origin and
// the bodies move around it (the same trick the launch used for altitude): Earth
// large below at the start, shrinking behind; the Moon growing ahead until it
// fills the frame. The director's beats drive it: orbit, the translunar burn,
// the transposition-and-docking that pulls the lander out, the coast, lunar
// orbit, and the undocking that hands off to the descent.

const _z = new THREE.Vector3(0, 0, 1);
const _yv = new THREE.Vector3(0, 1, 0);
const aimZ = (o, x, y, z) => o.quaternion.setFromUnitVectors(_z, new THREE.Vector3(x, y, z).normalize());
const aimY = (o, x, y, z) => o.quaternion.setFromUnitVectors(_yv, new THREE.Vector3(x, y, z).normalize());
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.max(0, Math.min(1, t));

// Per-phase target transforms for Earth and Moon (centre position + radius).
const BODY = {
  orbit:    { earth: [0, -175, 40, 150], moon: [1200, 400, -6000, 120] },
  tli:      { earth: [40, -190, -60, 150], moon: [1000, 350, -5000, 120] },
  transpose:{ earth: [80, -200, -120, 150], moon: [900, 320, -4200, 120] },
  castoff:  { earth: [120, -210, -160, 150], moon: [860, 300, -4000, 120] },
  coast:    { earth: [220, 130, 1900, 150], moon: [-30, -10, -430, 120] },
  'lunar-orbit': { earth: [-520, 260, 3400, 150], moon: [0, -30, -240, 150] },
  undock:   { earth: [-520, 260, 3400, 150], moon: [0, -30, -240, 150] },
};

export class SpaceScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 200000);
    this.bloom = { strength: 0.42, radius: 0.6, threshold: 0.7 };
    this.ready = false;
    this.phase = 'orbit';
    this.bt = 0;         // seconds within the current beat
    this._cam = 'stack';
    this._t = 0;
    this.undocking = 0;  // 0..1 LM separation progress
  }

  async enter() {
    if (this.ready) return;
    this.scene.background = new THREE.Color(0x01020a);
    this.stars = starField(2600, 60000);
    this.scene.add(this.stars);

    this.sun = new THREE.DirectionalLight(0xffffff, 2.3);
    this.sun.position.set(300, 120, 200);
    this.scene.add(this.sun);
    this.scene.add(new THREE.AmbientLight(0x223044, 0.45));

    this.earth = buildEarth(150); this.scene.add(this.earth);
    this.moon = buildMoon(120); this.scene.add(this.moon);

    this.sivb = buildSIVB(); this.scene.add(this.sivb);
    this.lm = buildLM(); this.scene.add(this.lm);
    this.csm = buildCSM(); this.scene.add(this.csm);

    // The S-IVB sits just below the origin, adapter opening up toward the CSM.
    this.sivb.position.set(0, -6, 0);
    this._applyBodies(BODY.orbit, 1);
    this._poseSpacecraft();
    this.camera.position.set(20, 7, 30);
    this.camera.lookAt(0, 2, 0);
    this.ready = true;
  }

  beat(dir = {}) {
    if (dir.space) { this.phase = dir.space; this.bt = 0; }
    if (dir.cam) this._cam = dir.cam;
  }

  _applyBodies(target, k) {
    const set = (obj, t) => {
      const p = obj.position;
      p.x = lerp(p.x, t[0], k); p.y = lerp(p.y, t[1], k); p.z = lerp(p.z, t[2], k);
      const s = t[3] / (obj.userData.radius || 120);
      obj.scale.setScalar(lerp(obj.scale.x, s, k));
    };
    set(this.earth, target.earth);
    set(this.moon, target.moon);
  }

  _poseSpacecraft() {
    const ph = this.phase, bt = this.bt;
    const petals = this.sivb.userData;
    const bayY = this.sivb.position.y + petals.lmBayY;

    if (ph === 'orbit' || ph === 'tli') {
      petals.setOpen(0);
      this.sivb.visible = true;
      // Stacked: LM stowed in the closed adapter, CSM on top nose-up.
      this.lm.position.set(0, bayY, 0); aimY(this.lm, 0, 1, 0);
      this.lm.scale.setScalar(0.6); // folded/stowed reads smaller
      this.csm.position.set(0, bayY + 6.5, 0); aimZ(this.csm, 0, 1, 0);
      return;
    }

    if (ph === 'transpose') {
      // A scripted maneuver over ~9 s: CSM pulls up, petals open, CSM flips and
      // docks with the exposed LM, then the docked pair backs out of the S-IVB.
      const t = bt;
      const open = clamp01((t - 1.5) / 2.5);
      petals.setOpen(open);
      this.sivb.visible = t < 8.5;
      this.lm.scale.setScalar(1);
      this.lm.position.set(0, bayY, 0); aimY(this.lm, 0, 1, 0);

      const up = clamp01(t / 2) * 10;                 // CSM rises away
      const flip = clamp01((t - 2.5) / 2.2) * Math.PI; // then rotates 180°
      const back = clamp01((t - 5) / 2) * 9.5;         // then comes back down
      const csmY = bayY + 6.5 + up - back;
      this.csm.position.set(0, csmY, 0);
      // Flip about X: nose from +Y (up, θ=-π/2) to -Y (down, θ=+π/2).
      this.csm.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2 + flip, 0, 0));

      // Once docked (t>7), the pair rises together and the S-IVB drops away.
      if (t > 7) {
        const extract = clamp01((t - 7) / 2) * 10;
        this.lm.position.y = bayY + extract;
        this.csm.position.y = csmY + extract;
        this.sivb.position.y = -6 - extract * 2.2;
      }
      return;
    }

    // Castoff / coast / lunar orbit / undock: the docked pair — CSM nose-down,
    // docked to the LM's top hatch — in the slow "barbecue roll" about the
    // vertical axis that spread the sun's heat evenly on the real coast. On the
    // castoff beat the spent S-IVB is kept in view, drifting away below.
    this.sivb.visible = ph === 'castoff';
    if (ph === 'castoff') {
      this.sivb.userData.setOpen(1);
      this.sivb.position.set(0, -26 - this.bt * 7, -this.bt * 3);
    }
    const roll = this._t * 0.2;
    const qDown = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
    const qRoll = new THREE.Quaternion().setFromAxisAngle(_yv, roll);
    this.csm.position.set(0, 3.4, 0);
    this.csm.quaternion.copy(qRoll).multiply(qDown);
    this.csm.scale.setScalar(1);
    let lmY = -1.6;
    if (ph === 'undock') {
      const u = clamp01(this.bt / 3);     // LM separates and drops toward the Moon
      lmY -= u * 42;
    }
    this.lm.position.set(0, lmY, 0);
    this.lm.scale.setScalar(1);
    this.lm.quaternion.copy(qRoll);
  }

  update(dt) {
    if (!this.ready) return;
    this._t += dt; this.bt += dt;
    const target = BODY[this.phase] ?? BODY.orbit;
    this._applyBodies(target, Math.min(1, dt * 0.9));
    // Bodies spin slowly.
    if (this.earth.userData.clouds) this.earth.userData.clouds.rotation.y += dt * 0.01;
    this.earth.rotation.y += dt * 0.006;
    this.moon.rotation.y += dt * 0.004;
    this._poseSpacecraft();
    this._driveCamera(dt);
  }

  _driveCamera(dt) {
    const c = this._cam;
    let pos, target = new THREE.Vector3(0, 1, 0);
    if (c === 'stack') { pos = new THREE.Vector3(20, 6, 30); target.set(0, 3, 0); }
    else if (c === 'maneuver') { pos = new THREE.Vector3(16, 5, 24); target.set(0, 3, 0); }
    else if (c === 'castoff') { pos = new THREE.Vector3(13, -2, 30); target.set(0, -10, 0); }
    else if (c === 'coast') { pos = new THREE.Vector3(6, 7, 34); target.set(0, 3, 0); }
    else if (c === 'moon') { pos = new THREE.Vector3(15, 6, 30); target.set(0, 2, 0); }
    else if (c === 'undock-close') {
      // Tight on the lander as it drops from the command ship just above it.
      const lp = this.lm.position;
      pos = new THREE.Vector3(7, lp.y + 4, 13); target.copy(lp);
    } else if (c === 'undock') {
      pos = new THREE.Vector3(14, 6, 26);
      target.copy(this.lm.position).lerp(new THREE.Vector3(0, -2, 0), 0.4);
    } else pos = new THREE.Vector3(20, 8, 32);
    this.camera.position.lerp(pos, Math.min(1, dt * 2));
    this.camera.lookAt(target);
    this.stars.position.copy(this.camera.position);
  }

  dispose() {
    this.scene.traverse((o) => { o.geometry?.dispose?.(); if (o.material?.dispose) o.material.dispose(); });
  }
}

function starField(count, radius) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    pos[i * 3] = Math.cos(th) * r * radius; pos[i * 3 + 1] = u * radius; pos[i * 3 + 2] = Math.sin(th) * r * radius;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 90, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false }));
}
