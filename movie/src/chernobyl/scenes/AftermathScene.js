import * as THREE from 'three';
import { buildBlueColumn, Plume, Embers } from '../models/effects.js';

// The open core, close up — where the piece ends. Scattered graphite still
// burning on the ground, the plume standing straight up in the still night, and
// over it the faint blue column of ionized air: the thing the first men on the
// roof could see, and could not understand. It holds, and then a grey dawn
// comes up on it. No spectacle — stillness.

const NIGHT = new THREE.Color(0x060810);
const DAWN = new THREE.Color(0x5f636e);

export class AftermathScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = NIGHT.clone();
    this.camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 3000);
    this.bloom = { strength: 0.8, radius: 0.8, threshold: 0.5 };
    this.ready = false;

    this.phase = 'open';
    this._camMode = 'core';
    this._t = 0;
    this._dawn = 0; this._dawnTarget = 0;
    this._blue = 0; this._blueTarget = 0;
    this._fire = 1; this._fireTarget = 1;
  }

  async enter() {
    if (this.ready) return;
    this.ambient = new THREE.AmbientLight(0x2a3040, 0.5);
    this.scene.add(this.ambient);
    this.moon = new THREE.DirectionalLight(0x8fa0c0, 0.35);
    this.moon.position.set(-40, 60, 60);
    this.scene.add(this.moon);

    // Rubble ground.
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(400, 40),
      new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    // A ring of broken, glowing graphite blocks — the reactor, thrown out onto
    // its own roof and the ground around the hole.
    this.embersMats = [];
    const blockGeo = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < 60; i++) {
      const s = 1.5 + Math.random() * 4;
      const mat = new THREE.MeshStandardMaterial({
        color: 0x161514, roughness: 0.95,
        emissive: new THREE.Color(0xff5212), emissiveIntensity: 0.6 + Math.random(),
      });
      const b = new THREE.Mesh(blockGeo, mat);
      const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 40;
      b.position.set(Math.cos(a) * r, s * 0.4 + Math.random() * 2, Math.sin(a) * r - 6);
      b.scale.set(s, s * (0.5 + Math.random() * 0.5), s);
      b.rotation.set(Math.random(), Math.random(), Math.random());
      this.scene.add(b);
      this.embersMats.push({ mat, phase: Math.random() * Math.PI * 2 });
    }

    // Twisted structure silhouettes behind, hinting at the broken hall.
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 1 });
    for (let i = 0; i < 8; i++) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.8, 20 + Math.random() * 24, 0.8), steelMat);
      beam.position.set(-30 + i * 8 + Math.random() * 4, 8, -34);
      beam.rotation.z = (Math.random() - 0.5) * 0.9;
      this.scene.add(beam);
    }

    // The core-fire glow-light, the plume, the embers, and the blue column.
    this.fireLight = new THREE.PointLight(0xff6420, 5, 200, 2);
    this.fireLight.position.set(0, 2, -6);
    this.scene.add(this.fireLight);

    this.plume = new Plume({ spread: 8, rise: 10 });
    this.plume.setBase(0, 3, -6);
    this.scene.add(this.plume.group);
    this.embers = new Embers();
    this.embers.points.position.set(0, 1, -6);
    this.embers._span = 34;
    this.scene.add(this.embers.points);

    this.blue = buildBlueColumn(70);
    this.blue.position.set(0, 2, -6);
    this.scene.add(this.blue);

    this.camera.position.set(0, 10, 46);
    this.camera.lookAt(0, 10, -6);
    this.ready = true;
  }

  beat(dir = {}) {
    if (dir.cam) this._camMode = dir.cam;
    if (!dir.after) return;
    this.phase = dir.after;
    switch (dir.after) {
      case 'open':  this._fireTarget = 1; this._blueTarget = 0.1; break;
      case 'glow':  this._fireTarget = 0.8; this._blueTarget = 1; break;   // the blue column stands up
      case 'plume': this._fireTarget = 0.7; this._blueTarget = 0.8; break;
      case 'dawn':  this._fireTarget = 0.4; this._blueTarget = 0.15; this._dawnTarget = 1; break;
    }
  }

  update(dt) {
    if (!this.ready) return;
    this._t += dt;
    this._dawn += (this._dawnTarget - this._dawn) * Math.min(1, dt * 0.4);
    this._blue += (this._blueTarget - this._blue) * Math.min(1, dt * 1.2);
    this._fire += (this._fireTarget - this._fire) * Math.min(1, dt * 1.0);

    this.scene.background.copy(NIGHT).lerp(DAWN, this._dawn);
    this.ambient.intensity = 0.5 + this._dawn * 0.8;
    this.moon.intensity = 0.35 + this._dawn * 0.7;

    const flick = 0.8 + Math.sin(this._t * 8) * 0.12 + Math.random() * 0.08;
    this.fireLight.intensity = this._fire * 6 * flick;
    for (const e of this.embersMats) {
      e.mat.emissiveIntensity = this._fire * (0.6 + 0.5 * (0.5 + 0.5 * Math.sin(this._t * 3 + e.phase)));
    }
    this.plume.update(dt, this._fire);
    this.embers.update(dt, this._fire);
    this.blue.userData.setIntensity(this._blue * (0.85 + 0.15 * Math.sin(this._t * 2)) * (1 - this._dawn * 0.7));

    this._driveCamera();
  }

  _driveCamera() {
    const mode = this._camMode;
    const drift = Math.sin(this._t * 0.06) * 3;
    let pos, target;
    if (mode === 'blue') {
      pos = new THREE.Vector3(6 + drift * 0.3, 16, 40); target = new THREE.Vector3(0, 26, -6);
    } else if (mode === 'wide') {
      pos = new THREE.Vector3(38 + drift, 20, 54); target = new THREE.Vector3(0, 12, -6);
    } else { // core: close on the burning graphite
      pos = new THREE.Vector3(drift, 8, 40); target = new THREE.Vector3(0, 6, -6);
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
