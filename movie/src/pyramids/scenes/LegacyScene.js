import * as THREE from 'three';
import { DesertSky } from '../models/sky.js';
import { buildDesert } from '../models/desert.js';
import { buildPyramid } from '../models/pyramid.js';
import { buildSphinx } from '../models/sphinx.js';
import { GIZA } from '../models/layout.js';

// The end — twice. First the pyramids as almost no living person ever saw them:
// finished, sheathed in smooth white Tura limestone, blazing under the sun. Then
// time takes the casing, wears the stone to its stepped core, and chips the
// tops: the three as they stand on the plateau today, forty-five centuries on.
//
// beat(dir): dir.legacy = 'gleaming' | 'today'; dir.cam the framing.

export class LegacyScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.5, 12000);
    this.bloom = { strength: 0.4, radius: 0.7, threshold: 0.7 };
    this.ready = false;
    this._camMode = 'gleaming';
    this._t = 0;
    this.dayT = 0.2;
    this.casing = 1; this.casingTarget = 1;
    this.weather = 0; this.weatherTarget = 0;
    this._ruined = false;
  }

  async enter() {
    if (this.ready) return;
    this.sky = new DesertSky(9000);
    this.scene.add(this.sky.group);
    this.desert = buildDesert();
    this.scene.add(this.desert);

    this.pyrs = [];
    for (const key of ['khufu', 'khafre', 'menkaure']) {
      const d = GIZA[key];
      const p = buildPyramid({ baseU: d.base, heightU: d.height, courses: d.courses });
      p.position.set(...d.pos);
      p.userData.setProgress(1);
      p.userData.setCasing(1);
      this.scene.add(p);
      this.pyrs.push({ p, courses: d.courses });
    }

    this.sphinx = buildSphinx();
    this.sphinx.position.set(...GIZA.sphinx.pos);
    this.sphinx.rotation.y = GIZA.sphinx.rotY;
    this.sphinx.scale.setScalar(GIZA.sphinx.scale);
    this.scene.add(this.sphinx);

    this.camera.position.set(170, 90, 230);
    this.camera.lookAt(-40, 30, -40);
    this.ready = true;
  }

  beat(dir = {}) {
    if (dir.cam) this._camMode = dir.cam;
    if (dir.legacy === 'gleaming') { this.casingTarget = 1; this.weatherTarget = 0; this.dayT = 0.2; }
    if (dir.legacy === 'today') { this.casingTarget = 0; this.weatherTarget = 1; }
  }

  update(dt) {
    if (!this.ready) return;
    this._t += dt;
    this.sky.setTime(this.dayT);
    this.sky.follow(this.camera);

    this.casing += (this.casingTarget - this.casing) * Math.min(1, dt * 0.7);
    this.weather += (this.weatherTarget - this.weather) * Math.min(1, dt * 0.5);

    for (const { p } of this.pyrs) {
      p.userData.setCasing(this.casing);
      p.userData.setWeathered(this.weather);
    }
    // Once weathering has taken hold, chip the tops — the real ruined summits.
    if (this.weather > 0.6 && !this._ruined) {
      this._ruined = true;
      for (const { p, courses } of this.pyrs) p.userData.ruinTop(Math.max(2, Math.round(courses * 0.08)));
    }

    this._driveCamera();
  }

  _driveCamera() {
    const mode = this._camMode;
    const drift = Math.sin(this._t * 0.04) * 14;
    let pos, target;
    if (mode === 'sphinx') {
      pos = new THREE.Vector3(150, 24, 140); target = new THREE.Vector3(92, 12, 74);
    } else if (mode === 'hero') {
      pos = new THREE.Vector3(90, 30, 150); target = new THREE.Vector3(0, 30, 0);
    } else { // wide (gleaming or today) — hold all three pyramids and the Sphinx
      pos = new THREE.Vector3(205 + drift, 76, 220); target = new THREE.Vector3(-62, 30, -42);
    }
    this.camera.position.copy(pos);
    this.camera.lookAt(target);
  }

  dispose() {
    this.sky?.dispose();
    this.scene.traverse((o) => { o.geometry?.dispose?.(); if (o.material?.dispose) o.material.dispose(); });
  }
}
