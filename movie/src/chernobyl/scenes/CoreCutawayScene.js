import * as THREE from 'three';
import { buildCore } from '../models/core.js';

// The cutaway — the reactor in cross-section, and the engine's centrepiece.
//
// One state machine, driven by beat(), walks the core through the night: a
// controlled reaction, the xenon-starved crawl, the rods pulled out, coolant
// flashing to steam, the scram that backfires, and the spike that tears the
// core apart. Two quantities carry almost all of it — the glow (how hard it is
// running) and the rod insertion — plus a steam field that thickens as the
// coolant boils. The graphite-tip flaw is staged literally: at the scram the
// glow ticks UP as the rods start down, then runs away.

const STEAM_MAX = 260;

export class CoreCutawayScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05060a);
    this.camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.bloom = { strength: 0.9, radius: 0.75, threshold: 0.62 };
    this.ready = false;

    this.phase = 'idle';
    this._camMode = 'wide';
    this._t = 0;

    // Targets the update loop eases toward.
    this.glow = 0.12; this.glowTarget = 0.12;
    this.rod = 0.15; this.rodTarget = 0.15; // insertion 0..1 (1 = withdrawn/out)
    this.steam = 0; this.steamTarget = 0;
    this._shake = 0;
    this._blown = false;
    this._debris = [];
  }

  async enter() {
    if (this.ready) return;

    this.scene.add(new THREE.AmbientLight(0x3c4a63, 1.1));
    const key = new THREE.DirectionalLight(0xbcd0ee, 1.3);
    key.position.set(-14, 20, 30);
    this.scene.add(key);
    // A neutral front fill so the graphite reads as lit stone even at idle,
    // before the core is running hot enough to light itself.
    const fill = new THREE.DirectionalLight(0x8898b4, 0.7);
    fill.position.set(10, 6, 40);
    this.scene.add(fill);
    // A warm fill from the core itself so the graphite reads lit from within.
    this.coreLight = new THREE.PointLight(0xff7a2a, 1.2, 120, 2);
    this.coreLight.position.set(0, 0, 6);
    this.scene.add(this.coreLight);

    this.core = buildCore();
    this.scene.add(this.core);
    const U = this.core.userData;
    this.W = U.W; this.H = U.H; this.D = U.D;

    // Steam field — points rising up the channels, thicker as the coolant boils.
    const pos = new Float32Array(STEAM_MAX * 3);
    this._steamState = [];
    for (let i = 0; i < STEAM_MAX; i++) { this._steamState.push({ life: 0, x: 0, z: 0, sp: 0 }); pos[i * 3 + 1] = -9999; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this._steamGeo = geo;
    this.steamPts = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xbfe4ff, size: 0.34, sizeAttenuation: true,
      transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.scene.add(this.steamPts);

    this.camera.position.set(0, 2, 42);
    this.camera.lookAt(0, 0, 0);
    this.ready = true;
  }

  /** Director seam. dir.core sets the phase; dir.cam the framing. */
  beat(dir = {}) {
    if (dir.cam) this._camMode = dir.cam;
    if (!dir.core) return;
    this.phase = dir.core;
    switch (dir.core) {
      case 'idle':                                  // a controlled reactor
        this.glowTarget = 0.26; this.rodTarget = 0.22; this.steamTarget = 0.06; break;
      case 'lowpower':                              // xenon poisoning: near-stall
        this.glowTarget = 0.07; this.rodTarget = 0.22; this.steamTarget = 0.0; break;
      case 'rods-out':                              // rods hauled out to recover
        this.glowTarget = 0.22; this.rodTarget = 0.92; this.steamTarget = 0.1; break;
      case 'steam':                                 // coolant boiling; void raises power
        this.glowTarget = 0.42; this.rodTarget = 0.92; this.steamTarget = 0.8; break;
      case 'creep':                                 // power climbing, unstable
        this.glowTarget = 0.6; this.rodTarget = 0.92; this.steamTarget = 1.0; break;
      case 'scram':                                 // AZ-5: rods start down, tips ADD reactivity
        this.rodTarget = 0.0; this.glowTarget = 0.78; this.steamTarget = 1.0; break;
      case 'spike':                                 // prompt criticality
        this.glowTarget = 1.0; this.steamTarget = 1.0; break;
      case 'blowout':                               // the core tears itself apart
        this._blowout(); break;
    }
  }

  _blowout() {
    if (this._blown) return;
    this._blown = true;
    this._shake = 1;
    // Hand the whole core — graphite blocks, fuel channels, and rods — to a
    // debris list and throw it. The reactor doesn't just shed its lid; it comes
    // apart.
    const pieces = [
      ...this.core.userData.blocks,
      ...this.core.userData.channels,
      ...this.core.userData.rods.map((r) => r.group),
    ];
    for (const p of pieces) {
      const dir = new THREE.Vector3(p.position.x, p.position.y + 1, p.position.z).normalize();
      this._debris.push({
        obj: p,
        v: dir.multiplyScalar(10 + Math.random() * 26).add(new THREE.Vector3(0, 12 + Math.random() * 14, 0)),
        spin: new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6),
      });
    }
  }

  _emitSteam(dt) {
    const rate = this.steam * 90 * dt;
    let budget = rate;
    const arr = this._steamGeo.attributes.position.array;
    for (let i = 0; i < STEAM_MAX && budget > 0; i++) {
      const s = this._steamState[i];
      if (s.life > 0) continue;
      if (Math.random() > budget) { budget -= 1; continue; }
      budget -= 1;
      s.life = 1.6 + Math.random() * 1.2;
      s.x = (Math.random() - 0.5) * this.W;
      s.z = this.D * 0.2 + (Math.random() - 0.5) * 0.6;
      s.sp = 3 + Math.random() * 4 + this.steam * 4;
      arr[i * 3] = s.x; arr[i * 3 + 1] = -this.H / 2; arr[i * 3 + 2] = s.z;
    }
  }

  update(dt) {
    if (!this.ready) return;
    this._t += dt;

    // The spike and blowout slam; everything else eases.
    const fast = this.phase === 'spike' || this.phase === 'scram' || this.phase === 'blowout';
    const kg = Math.min(1, dt * (fast ? 5.5 : 1.6));
    this.glow += (this.glowTarget - this.glow) * kg;
    this.rod += (this.rodTarget - this.rod) * Math.min(1, dt * (this.phase === 'scram' ? 1.2 : 2.2));
    this.steam += (this.steamTarget - this.steam) * Math.min(1, dt * 1.4);

    if (!this._blown) {
      this.core.userData.setGlow(this.glow);
      this.core.userData.setRods(this.rod);
    } else {
      // After the blast the core is a dull, broken ember, not a reactor — the
      // glow falls off quickly as the thrown fuel scatters and cools.
      this.glow += (0.18 - this.glow) * Math.min(1, dt * 1.6);
      this.core.userData.setGlow(this.glow * 0.5);
    }
    this.coreLight.color.setHSL(0.06, 0.9, 0.4 + this.glow * 0.4);
    this.coreLight.intensity = 0.8 + this.glow * this.glow * 9;

    // Steam field.
    this._emitSteam(dt);
    const arr = this._steamGeo.attributes.position.array;
    for (let i = 0; i < STEAM_MAX; i++) {
      const s = this._steamState[i];
      if (s.life <= 0) continue;
      s.life -= dt;
      if (s.life <= 0) { arr[i * 3 + 1] = -9999; continue; }
      arr[i * 3 + 1] += s.sp * dt;
      arr[i * 3] += Math.sin(this._t * 3 + i) * dt * 0.4;
    }
    this._steamGeo.attributes.position.needsUpdate = true;
    this.steamPts.material.opacity = this.steam * 0.7;

    // Debris flight after the blowout.
    if (this._blown) {
      for (const d of this._debris) {
        d.v.y -= dt * 16;
        d.obj.position.addScaledVector(d.v, dt);
        d.obj.rotation.x += d.spin.x * dt;
        d.obj.rotation.y += d.spin.y * dt;
        d.obj.rotation.z += d.spin.z * dt;
      }
    }

    this._shake = Math.max(0, this._shake - dt * 0.6);
    this._driveCamera(dt);
  }

  _driveCamera() {
    const mode = this._camMode;
    let pos, target = new THREE.Vector3(0, 0, 0);
    if (mode === 'channel') {
      pos = new THREE.Vector3(-3, 1, 20); target.set(-3, 1, 0);
    } else if (mode === 'rods') {
      pos = new THREE.Vector3(6, 3, 18); target.set(4, 1, 0);
    } else if (mode === 'spike') {
      pos = new THREE.Vector3(0, 1, 30); target.set(0, 0, 0);
    } else if (mode === 'blowout') {
      pos = new THREE.Vector3(2, 6, 58); target.set(0, 4, 0);
    } else { // wide
      pos = new THREE.Vector3(0, 2, 44); target.set(0, 0, 0);
    }
    if (this._shake > 0) {
      const s = this._shake * 2.2;
      pos = pos.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s,
      ));
    }
    this.camera.position.copy(pos);
    this.camera.lookAt(target);
  }

  dispose() {
    this._steamGeo?.dispose();
    this.steamPts?.material.dispose();
    this.scene.traverse((o) => { o.geometry?.dispose?.(); if (o.material?.dispose) o.material.dispose(); });
  }
}
