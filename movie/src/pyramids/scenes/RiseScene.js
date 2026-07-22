import * as THREE from 'three';
import { DesertSky } from '../models/sky.js';
import { buildDesert } from '../models/desert.js';
import { buildPyramid } from '../models/pyramid.js';
import { buildSphinx } from '../models/sphinx.js';
import { scatterWorkers } from '../models/crowd.js';
import { GIZA } from '../models/layout.js';

// The rise — the engine's spine. The three pyramids grow course by course while
// the sun wheels overhead, day blurring into day: the twenty years compressed.
// Khufu leads, Khafre follows, little Menkaure last, the way the reigns did. A
// ramp climbs Khufu's flank and grows with it; at the top, the smooth white
// casing slides on and the Great Pyramid blazes.
//
// beat(dir): dir.rise sets the build phase, dir.cam the framing.

export class RiseScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.5, 12000);
    this.bloom = { strength: 0.25, radius: 0.6, threshold: 0.75 };
    this.ready = false;

    this.phase = 'ground';
    this._camMode = 'aerial';
    this._t = 0;
    this._sunPhase = 0.5;                 // ping-pongs so the sun arcs but never sets
    this.dayRate = 0.05;                 // sun-sweep speed (bumped up while building)
    this.progress = 0; this.progressTarget = 0.0;
    this.casing = 0; this.casingTarget = 0;
  }

  async enter() {
    if (this.ready) return;
    this.sky = new DesertSky(9000);
    this.scene.add(this.sky.group);
    this.desert = buildDesert();
    this.scene.add(this.desert);

    // The three pyramids.
    this.khufu = buildPyramid({ baseU: GIZA.khufu.base, heightU: GIZA.khufu.height, courses: GIZA.khufu.courses });
    this.khufu.position.set(...GIZA.khufu.pos);
    this.khafre = buildPyramid({ baseU: GIZA.khafre.base, heightU: GIZA.khafre.height, courses: GIZA.khafre.courses });
    this.khafre.position.set(...GIZA.khafre.pos);
    this.menkaure = buildPyramid({ baseU: GIZA.menkaure.base, heightU: GIZA.menkaure.height, courses: GIZA.menkaure.courses });
    this.menkaure.position.set(...GIZA.menkaure.pos);
    this.scene.add(this.khufu, this.khafre, this.menkaure);

    this.sphinx = buildSphinx();
    this.sphinx.position.set(...GIZA.sphinx.pos);
    this.sphinx.rotation.y = GIZA.sphinx.rotY;
    this.sphinx.scale.setScalar(GIZA.sphinx.scale);
    this.scene.add(this.sphinx);

    // Khufu's construction ramp — a broad earthen wedge up the +z face.
    this.ramp = new THREE.Mesh(
      new THREE.BoxGeometry(GIZA.khufu.base * 0.28, 2, 1),
      new THREE.MeshStandardMaterial({ color: 0xb08a58, roughness: 1 }),
    );
    this.ramp.castShadow = this.ramp.receiveShadow = true;
    this.scene.add(this.ramp);

    // A scatter of workers around Khufu's base for life.
    this._stepWorkers = scatterWorkers(this.scene, 60, { radius: 70, cx: 0, cz: GIZA.khufu.base * 0.6 });

    this.camera.position.set(160, 120, 220);
    this.camera.lookAt(-40, 30, -40);
    this.ready = true;
  }

  beat(dir = {}) {
    if (dir.cam) this._camMode = dir.cam;
    if (!dir.rise) return;
    this.phase = dir.rise;
    switch (dir.rise) {
      case 'ground':  this.progressTarget = 0.03; this.dayRate = 0.05; break;
      case 'rising':  this.progressTarget = 0.5;  this.dayRate = 0.28; break;
      case 'higher':  this.progressTarget = 0.82; this.dayRate = 0.28; break;
      case 'cap':     this.progressTarget = 1.0;  this.dayRate = 0.18; break;
      case 'casing':  this.progressTarget = 1.0;  this.casingTarget = 1; this.dayRate = 0.05; break;
    }
  }

  _applyRamp() {
    // The ramp runs from the ground up to the current working height on +z face.
    const top = Math.max(1, this.khufu.userData.topY());
    const run = top * 3 + 8;
    const len = Math.sqrt(top * top + run * run);
    const z0 = GIZA.khufu.pos[2] + GIZA.khufu.base / 2;
    this.ramp.position.set(GIZA.khufu.pos[0], top / 2, z0 + run / 2);
    this.ramp.rotation.x = -Math.atan2(top, run);
    this.ramp.scale.z = len;
    this.ramp.visible = this.casing < 0.4 && this.phase !== 'casing';
  }

  update(dt) {
    if (!this.ready) return;
    this._t += dt;

    // The sun arcs up and back down (a triangle wave) but stays above the
    // horizon, so the time-lapse reads as day after day passing — shadows
    // sweeping — without ever plunging the rising pyramid into darkness.
    this._sunPhase += dt * this.dayRate;
    const tri = 1 - Math.abs((this._sunPhase % 2) - 1);
    this.sky.setTime(0.04 + tri * 0.42);
    this.sky.follow(this.camera);

    this.progress += (this.progressTarget - this.progress) * Math.min(1, dt * 0.5);
    this.casing += (this.casingTarget - this.casing) * Math.min(1, dt * 0.8);

    // Staggered growth: Khufu leads, Khafre follows, Menkaure last.
    const P = this.progress;
    this.khufu.userData.setProgress(THREE.MathUtils.clamp(P * 1.05, 0, 1));
    this.khafre.userData.setProgress(THREE.MathUtils.clamp((P - 0.18) * 1.5, 0, 1));
    this.menkaure.userData.setProgress(THREE.MathUtils.clamp((P - 0.42) * 2.0, 0, 1));
    this.khufu.userData.setCasing(this.casing);
    this._applyRamp();

    this._stepWorkers?.(dt, this._t);

    this._driveCamera();
  }

  _driveCamera() {
    const mode = this._camMode;
    const c = new THREE.Vector3(-40, 20, -40);        // centre of the complex
    let pos, target = c.clone();
    if (mode === 'orbit') {
      const a = this._t * 0.06;
      pos = new THREE.Vector3(c.x + Math.cos(a) * 240, 150, c.z + Math.sin(a) * 240);
      target.set(-40, 40, -40);
    } else if (mode === 'low') {
      pos = new THREE.Vector3(120, 22, 150); target.set(0, 40, 0);
    } else if (mode === 'hero') {
      // Close on Khufu's rising face and the ramp.
      pos = new THREE.Vector3(70, 40, 130); target.set(0, Math.max(20, this.khufu.userData.topY() * 0.6), 20);
    } else { // aerial establishing
      const a = this._t * 0.03;
      pos = new THREE.Vector3(c.x + Math.cos(a) * 300, 210, c.z + Math.sin(a) * 300);
      target.set(-50, 30, -50);
    }
    this.camera.position.copy(pos);
    this.camera.lookAt(target);
  }

  dispose() {
    this.sky?.dispose();
    this.scene.traverse((o) => { o.geometry?.dispose?.(); if (o.material?.dispose) o.material.dispose(); });
  }
}
