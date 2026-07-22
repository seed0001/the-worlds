import * as THREE from 'three';
import { DesertSky } from '../models/sky.js';
import { buildDesert } from '../models/desert.js';
import { buildPyramid } from '../models/pyramid.js';
import { Gang, scatterWorkers } from '../models/crowd.js';

// The worksite, at ground level and full daylight — the labour up close. A gang
// drags one block on a wooden sledge while water is poured on the sand ahead to
// slick the way; behind them a pyramid stands half-built, a ramp up its side,
// and a quarry face where the next blocks are being cut. This is the human
// engine under the time-lapse.
//
// beat(dir): dir.work sets what we're watching, dir.cam the framing.

const WATER_MAX = 120;

export class WorksiteScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 8000);
    this.bloom = { strength: 0.2, radius: 0.6, threshold: 0.8 };
    this.ready = false;
    this._camMode = 'haul';
    this._t = 0;
  }

  async enter() {
    if (this.ready) return;
    this.sky = new DesertSky(6000);
    this.sky.setTime(0.22);       // mid-morning
    this.scene.add(this.sky.group);
    this.desert = buildDesert();
    this.scene.add(this.desert);

    // A half-built pyramid as backdrop, with its ramp.
    this.pyr = buildPyramid({ baseU: 120, heightU: 76, courses: 44 });
    this.pyr.position.set(-40, 0, -160);
    this.pyr.userData.setProgress(0.42);
    this.scene.add(this.pyr);
    const ramp = new THREE.Mesh(
      new THREE.BoxGeometry(34, 3, 120),
      new THREE.MeshStandardMaterial({ color: 0xb08a58, roughness: 1 }),
    );
    ramp.position.set(-40, 16, -70);
    ramp.rotation.x = -Math.atan2(32, 120);
    ramp.receiveShadow = true;
    this.scene.add(ramp);

    // The quarry: a rough rock face and a few cut blocks off to one side.
    const rock = new THREE.Mesh(
      new THREE.BoxGeometry(120, 40, 60),
      new THREE.MeshStandardMaterial({ color: 0xbfa273, roughness: 1, flatShading: true }),
    );
    rock.position.set(180, 12, -120);
    rock.receiveShadow = rock.castShadow = true;
    this.scene.add(rock);
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 6), new THREE.MeshStandardMaterial({ color: 0xcdb488, roughness: 0.95 }));
      b.position.set(120 + i * 9, 2.5, -70 + (i % 2) * 12);
      b.rotation.y = Math.random() * 0.3;
      b.castShadow = true;
      this.scene.add(b);
    }

    // The hauling gang.
    this.gang = new Gang({ workers: 18, blockSize: 3.2 });
    this.gang.group.position.set(30, 0, -20);
    this.scene.add(this.gang.group);

    // Water poured on the sand ahead of the sledge.
    const pos = new Float32Array(WATER_MAX * 3);
    this._waterState = [];
    for (let i = 0; i < WATER_MAX; i++) { this._waterState.push({ life: 0, vx: 0, vy: 0, vz: 0 }); pos[i * 3 + 1] = -9999; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this._waterGeo = geo;
    this.water = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xbfe0ee, size: 0.4, sizeAttenuation: true, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.scene.add(this.water);
    // A dark wet patch on the sand in front of the sledge.
    this.wet = new THREE.Mesh(new THREE.CircleGeometry(4, 20), new THREE.MeshStandardMaterial({ color: 0x7a5a34, roughness: 1, transparent: true, opacity: 0.5 }));
    this.wet.rotation.x = -Math.PI / 2; this.wet.position.y = 0.15;
    this.scene.add(this.wet);

    this._stepWorkers = scatterWorkers(this.scene, 24, { radius: 60, cx: 60, cz: -100 });

    this.camera.position.set(70, 8, 20);
    this.camera.lookAt(30, 4, -10);
    this.ready = true;
  }

  beat(dir = {}) { if (dir.cam) this._camMode = dir.cam; if (dir.work) this.phase = dir.work; }

  _emitWater(dt, wx, wy, wz) {
    let budget = 40 * dt;
    const arr = this._waterGeo.attributes.position.array;
    for (let i = 0; i < WATER_MAX && budget > 0; i++) {
      const s = this._waterState[i];
      if (s.life > 0) continue;
      if (Math.random() > budget) { budget -= 1; continue; }
      budget -= 1;
      s.life = 0.5 + Math.random() * 0.4;
      arr[i * 3] = wx + (Math.random() - 0.5) * 1.2;
      arr[i * 3 + 1] = wy + 2.4;
      arr[i * 3 + 2] = wz + (Math.random() - 0.5) * 1.2;
      s.vx = (Math.random() - 0.5) * 2; s.vy = -1 - Math.random(); s.vz = (Math.random() - 0.5) * 2;
    }
  }

  update(dt) {
    if (!this.ready) return;
    this._t += dt;
    this.sky.follow(this.camera);

    // The gang trudges forward (+z), the block sledge with it.
    this.gang.group.position.z += dt * 1.6;
    this.gang.update(dt);

    // Water poured just ahead of the sledge; the wet patch tracks it.
    const gx = this.gang.group.position.x, gz = this.gang.group.position.z;
    const wz = gz + 6;
    this._emitWater(dt, gx, 0, wz);
    this.wet.position.set(gx, 0.15, wz);
    const arr = this._waterGeo.attributes.position.array;
    for (let i = 0; i < WATER_MAX; i++) {
      const s = this._waterState[i];
      if (s.life <= 0) continue;
      s.life -= dt;
      if (s.life <= 0) { arr[i * 3 + 1] = -9999; continue; }
      s.vy -= dt * 6;
      arr[i * 3] += s.vx * dt; arr[i * 3 + 1] += s.vy * dt; arr[i * 3 + 2] += s.vz * dt;
      if (arr[i * 3 + 1] < 0.1) { arr[i * 3 + 1] = -9999; s.life = 0; }
    }
    this._waterGeo.attributes.position.needsUpdate = true;

    this._stepWorkers?.(dt, this._t);
    this._driveCamera();
  }

  _driveCamera() {
    const mode = this._camMode;
    const g = this.gang.group.position;
    let pos, target;
    if (mode === 'quarry') {
      pos = new THREE.Vector3(120, 14, -30); target = new THREE.Vector3(170, 8, -110);
    } else if (mode === 'water') {
      pos = new THREE.Vector3(g.x + 14, 4, g.z + 10); target = new THREE.Vector3(g.x, 1, g.z + 6);
    } else if (mode === 'ramp') {
      pos = new THREE.Vector3(30, 30, 40); target = new THREE.Vector3(-40, 30, -120);
    } else { // haul — side-on the gang
      pos = new THREE.Vector3(g.x + 34, 10, g.z + 6); target = new THREE.Vector3(g.x, 4, g.z + 4);
    }
    this.camera.position.copy(pos);
    this.camera.lookAt(target);
  }

  dispose() {
    this.sky?.dispose();
    this.gang?.dispose();
    this._waterGeo?.dispose();
    this.scene.traverse((o) => { o.geometry?.dispose?.(); if (o.material?.dispose) o.material.dispose(); });
  }
}
