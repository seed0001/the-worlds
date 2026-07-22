import * as THREE from 'three';
import { buildControlRoom } from '../models/controlRoom.js';

// Control Room No. 4. The human side of the same physics: the power meter
// sagging to nothing and then dragged back up, the covered AZ-5 pressed, the
// annunciator strip lighting red. The scene reads dir.room and moves the meter,
// the lamps, the button and the alarms; it never speaks for anyone.

export class ControlRoomScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0d10);
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 500);
    this.bloom = { strength: 0.35, radius: 0.6, threshold: 0.5 };
    this.ready = false;

    this.phase = 'calm';
    this._camMode = 'wide';
    this._t = 0;
    this.power = 0.6; this.powerTarget = 0.6;
    this.alarm = 0; this.alarmTarget = 0;
    this.az5 = 0; this.az5Target = 0;
    this.lampsFrac = 0.85;
    this._lampTick = 0;
  }

  async enter() {
    if (this.ready) return;
    this.scene.add(new THREE.AmbientLight(0x53607a, 1.3));
    const key = new THREE.SpotLight(0xfff0d8, 180, 160, 1.1, 0.6, 1.0);
    key.position.set(0, 34, 34);
    key.target.position.set(0, 0, 0);
    this.scene.add(key, key.target);
    // A broad front fill from the camera side so every panel — and both the
    // meter and the button, off to the wings — reads clearly in close-up.
    const fill = new THREE.PointLight(0xbcccdc, 1.4, 200);
    fill.position.set(0, 8, 40);
    this.scene.add(fill);
    const fillL = new THREE.PointLight(0xa8b8cc, 0.8, 120);
    fillL.position.set(-18, 6, 26);
    this.scene.add(fillL);
    const fillR = new THREE.PointLight(0xccb89a, 0.8, 120);
    fillR.position.set(18, 6, 26);
    this.scene.add(fillR);

    this.room = buildControlRoom();
    this.scene.add(this.room);

    this.camera.position.set(0, 6, 40);
    this.camera.lookAt(0, 2, 0);
    this.ready = true;
  }

  beat(dir = {}) {
    if (dir.cam) this._camMode = dir.cam;
    if (!dir.room) return;
    this.phase = dir.room;
    switch (dir.room) {
      case 'calm':    this.powerTarget = 0.6; this.lampsFrac = 0.85; this.alarmTarget = 0; break;
      case 'fall':    this.powerTarget = 0.02; this.lampsFrac = 0.2; break;   // the near-stall
      case 'recover': this.powerTarget = 0.2; this.lampsFrac = 0.45; break;   // clawed back to ~200 MW
      case 'test':    this.powerTarget = 0.24; this.lampsFrac = 0.5; break;
      case 'az5':     this.az5Target = 1; this.powerTarget = 0.6; break;      // pressed
      case 'alarm':   this.powerTarget = 1.15; this.alarmTarget = 1; this.lampsFrac = 0.3; break; // off the scale
      case 'silence': this.powerTarget = 0; this.alarmTarget = 0.4; this.lampsFrac = 0.08; break;
    }
  }

  update(dt) {
    if (!this.ready) return;
    this._t += dt;
    const fast = this.phase === 'alarm' || this.phase === 'az5';
    this.power += (this.powerTarget - this.power) * Math.min(1, dt * (fast ? 4 : 1.6));
    this.alarm += (this.alarmTarget - this.alarm) * Math.min(1, dt * 3);
    this.az5 += (this.az5Target - this.az5) * Math.min(1, dt * 8);

    const U = this.room.userData;
    U.setPower(this.power);
    U.setAz5(this.az5);
    // Alarm tiles flicker when live.
    U.setAlarm(this.alarm > 0.02 ? this.alarm * (0.7 + 0.3 * Math.sin(this._t * 12)) : 0);

    // Re-roll the mimic lamps a few times a second so a starved panel visibly
    // goes dark and a worked one shimmers.
    this._lampTick -= dt;
    if (this._lampTick <= 0) { U.setLamps(this.lampsFrac); this._lampTick = 0.18; }

    this._driveCamera();
  }

  _driveCamera() {
    const mode = this._camMode;
    const drift = Math.sin(this._t * 0.15) * 1.4;
    let pos, target;
    if (mode === 'meter') {
      pos = new THREE.Vector3(-13 + drift * 0.2, 4.2, 16); target = new THREE.Vector3(-13, 3.9, 5.2);
    } else if (mode === 'button') {
      pos = new THREE.Vector3(13 + drift * 0.2, 3.4, 16); target = new THREE.Vector3(13, 3, 5.2);
    } else { // wide room
      pos = new THREE.Vector3(drift, 8, 46); target = new THREE.Vector3(0, 3, 0);
    }
    this.camera.position.copy(pos);
    this.camera.lookAt(target);
  }

  dispose() {
    this.scene.traverse((o) => { o.geometry?.dispose?.(); if (o.material?.dispose) o.material.dispose(); });
  }
}
