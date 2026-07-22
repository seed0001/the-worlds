import * as THREE from 'three';
import { DesertSky } from '../models/sky.js';
import { buildDesert } from '../models/desert.js';
import { scatterWorkers } from '../models/crowd.js';
import { GIZA } from '../models/layout.js';

// Before anything: the bare Giza plateau at first light. The river to the east,
// the empty sand, and — scratched into it — the surveyed outlines where the
// pyramids will stand. This is the ambition, before a single block is laid.
//
// beat(dir): dir.plateau moves the light/mood, dir.cam the framing.

export class PlateauScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.5, 12000);
    this.bloom = { strength: 0.35, radius: 0.7, threshold: 0.7 };
    this.ready = false;
    this._camMode = 'wide';
    this._t = 0;
    this.dayT = 0.14;          // warm early morning
    this.dayTarget = 0.14;
  }

  async enter() {
    if (this.ready) return;
    this.sky = new DesertSky(9000);
    this.scene.add(this.sky.group);
    this.desert = buildDesert();
    this.scene.add(this.desert);

    // Surveyed foundation outlines where the three pyramids will rise.
    const line = new THREE.MeshBasicMaterial({ color: 0xe8dcc0 });
    const outline = (base, [x, , z]) => {
      const g = new THREE.Group();
      const half = base / 2;
      for (const [w, d, ox, oz] of [[base, 1.2, 0, half], [base, 1.2, 0, -half], [1.2, base, half, 0], [1.2, base, -half, 0]]) {
        const s = new THREE.Mesh(new THREE.PlaneGeometry(w, d), line);
        s.rotation.x = -Math.PI / 2; s.position.set(x + ox, 0.2, z + oz);
        g.add(s);
      }
      return g;
    };
    this.scene.add(outline(GIZA.khufu.base, GIZA.khufu.pos));
    this.scene.add(outline(GIZA.khafre.base, GIZA.khafre.pos));
    this.scene.add(outline(GIZA.menkaure.base, GIZA.menkaure.pos));

    // Surveyors and the first workers, small on the vast site.
    this._stepWorkers = scatterWorkers(this.scene, 30, { radius: 90, cx: -40, cz: 0 });

    this.camera.position.set(180, 60, 200);
    this.camera.lookAt(-40, 10, -40);
    this.ready = true;
  }

  beat(dir = {}) {
    if (dir.cam) this._camMode = dir.cam;
    if (dir.plateau === 'dawn') this.dayTarget = 0.15;
    if (dir.plateau === 'day') this.dayTarget = 0.24;
  }

  update(dt) {
    if (!this.ready) return;
    this._t += dt;
    this.dayT += (this.dayTarget - this.dayT) * Math.min(1, dt * 0.3);
    this.sky.setTime(this.dayT);
    this.sky.follow(this.camera);
    this._stepWorkers?.(dt, this._t);
    this._driveCamera();
  }

  _driveCamera() {
    const mode = this._camMode;
    const drift = Math.sin(this._t * 0.05) * 12;
    let pos, target;
    if (mode === 'site') {
      pos = new THREE.Vector3(60, 18, 120); target = new THREE.Vector3(0, 2, 0);
    } else if (mode === 'river') {
      pos = new THREE.Vector3(300, 40, 200); target = new THREE.Vector3(760, 4, 0);
    } else { // wide
      pos = new THREE.Vector3(200 + drift, 70, 210); target = new THREE.Vector3(-40, 8, -40);
    }
    this.camera.position.copy(pos);
    this.camera.lookAt(target);
  }

  dispose() {
    this.sky?.dispose();
    this.scene.traverse((o) => { o.geometry?.dispose?.(); if (o.material?.dispose) o.material.dispose(); });
  }
}
