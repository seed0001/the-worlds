import * as THREE from 'three';
import { RoadSky } from '../models/sky.js';
import { buildBelAir } from '../models/belair.js';

// The end of the trail. 2,448 miles from Grant Park the road runs out of
// continent: the Pacific, the pier, the sign. The Bel Air rolls to a stop and
// the film holds on the one place on the whole route the present tense never
// managed to kill.
//
// beat(dir): dir.pier 'arrive' (1957, golden hour, the car easing in) or
// 'today' (the same frame now — the sign is still there); dir.cam 'wide',
// 'sign', 'ocean'.

export class PierScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 9000);
    this.bloom = { strength: 0.3, radius: 0.6, threshold: 0.8 };
    this.ready = false;
    this.phase = 'arrive';
    this._camMode = 'wide';
    this._t = 0;
    this._carZ = 26;              // rolls from here down to the sign
  }

  async enter() {
    if (this.ready) return;

    this.sky = new RoadSky();
    this.sky.setTint(0xf0c090);
    // The day the film has been spending since Chicago ends here: swing the
    // sky so the sun goes down over the water (-z), dead ahead of the pier.
    this.sky.group.rotation.y = -Math.PI / 2;
    this.sky.setTime(0.475);      // sunset over the Pacific
    this.scene.add(this.sky.group);

    // The ocean, and the beach the pier walks out over.
    this.ocean = new THREE.Mesh(
      new THREE.PlaneGeometry(4000, 2400, 40, 24),
      new THREE.MeshStandardMaterial({ color: 0x4a8ba0, roughness: 0.3, metalness: 0.15 }),
    );
    this.ocean.rotation.x = -Math.PI / 2;
    this.ocean.position.set(0, -0.6, -1400);
    this.scene.add(this.ocean);

    const beach = new THREE.Mesh(
      new THREE.PlaneGeometry(4000, 800),
      new THREE.MeshStandardMaterial({ color: 0xd8c294, roughness: 1 }),
    );
    beach.rotation.x = -Math.PI / 2;
    beach.position.set(0, -0.2, 180);
    this.scene.add(beach);

    // The last yards of road, dead-ending at the pier gate.
    const stub = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 220),
      new THREE.MeshStandardMaterial({ color: 0x3f4045, roughness: 0.92 }),
    );
    stub.rotation.x = -Math.PI / 2;
    stub.position.set(0, 0.02, 110);
    stub.receiveShadow = true;
    this.scene.add(stub);

    // The pier: deck on piles, marching out over the water, lamps down its rail.
    const pier = new THREE.Group();
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x8a6f4d, roughness: 0.95 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(16, 0.5, 240), deckMat);
    deck.position.set(0, 1.4, -120);
    pier.add(deck);
    for (let z = 0; z > -240; z -= 16) {
      for (const x of [-6.5, 6.5]) {
        const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 6, 6), deckMat);
        pile.position.set(x, -1.4, z - 6);
        pier.add(pile);
      }
      for (const x of [-7.6, 7.6]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.0, 15), deckMat);
        rail.position.set(x, 2.1, z - 8);
        pier.add(rail);
      }
    }
    this.lamps = [];
    for (let z = -20; z > -230; z -= 42) {
      for (const x of [-7.4, 7.4]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.4, 6),
          new THREE.MeshStandardMaterial({ color: 0x2c3038, roughness: 0.6, metalness: 0.4 }));
        post.position.set(x, 3.3, z);
        const globe = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8),
          new THREE.MeshStandardMaterial({ color: 0xfff2cc, emissive: 0xffd890, emissiveIntensity: 1.4, roughness: 0.4 }));
        globe.position.set(x, 5.1, z);
        pier.add(post, globe);
        this.lamps.push(globe);
      }
    }
    this.scene.add(pier);

    // THE sign. White on ocean blue, hung over the pier gate.
    const c = document.createElement('canvas');
    c.width = 1280; c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1d3a5f';
    ctx.fillRect(0, 0, 1280, 512);
    ctx.strokeStyle = '#f2efe6';
    ctx.lineWidth = 14;
    ctx.strokeRect(20, 20, 1240, 472);
    ctx.fillStyle = '#f2efe6';
    ctx.textAlign = 'center';
    ctx.font = 'bold 120px Georgia, serif';
    ctx.fillText('SANTA MONICA', 640, 165);
    ctx.font = 'bold 96px Georgia, serif';
    ctx.fillText('66', 640, 300);
    ctx.font = 'bold 88px Georgia, serif';
    ctx.fillText('End of the Trail', 640, 440);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.sign = new THREE.Mesh(
      new THREE.BoxGeometry(9, 3.6, 0.15),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }),
    );
    this.sign.position.set(0, 6.4, 4);
    for (const x of [-4.2, 4.2]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 6.4, 0.24),
        new THREE.MeshStandardMaterial({ color: 0x8a8f96, metalness: 0.4, roughness: 0.6 }));
      post.position.set(x, 3.2, 4);
      this.scene.add(post);
    }
    this.scene.add(this.sign);

    // A few palms flanking the last of the road.
    const palmMat = new THREE.MeshStandardMaterial({ color: 0x8a7452, roughness: 0.95 });
    const frondMat = new THREE.MeshStandardMaterial({ color: 0x3f6b35, roughness: 0.9 });
    for (const [x, z] of [[-14, 30], [15, 48], [-16, 70], [13, 92]]) {
      const h = 7 + (Math.abs(x * z) % 3);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, h, 6), palmMat);
      trunk.position.set(x, h / 2, z);
      this.scene.add(trunk);
      for (let i = 0; i < 7; i++) {
        const frond = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 2.8), frondMat);
        const ang = (i / 7) * Math.PI * 2;
        frond.position.set(x + Math.cos(ang) * 1.1, h + 0.2, z + Math.sin(ang) * 1.1);
        frond.rotation.y = -ang + Math.PI / 2;
        frond.rotation.x = 0.35;
        this.scene.add(frond);
      }
    }

    this.car = buildBelAir();
    this.car.position.set(1.7, 0, this._carZ);
    this.car.userData.setLights(true);
    this.scene.add(this.car);

    this.camera.position.set(14, 4, 40);
    this.camera.lookAt(0, 3, -30);
    this.ready = true;
  }

  beat(dir = {}) {
    if (dir.cam) this._camMode = dir.cam;
    if (!dir.pier) return;
    this.phase = dir.pier;
    if (dir.pier === 'today') {
      this.sky.setPresent(true);
      this.car.visible = false;
      for (const l of this.lamps) l.material.emissiveIntensity = 0;
    } else {
      this.sky.setPresent(false);
      this.sky.setTime(0.475);
      this.car.visible = true;
      for (const l of this.lamps) l.material.emissiveIntensity = 1.4;
    }
  }

  update(dt) {
    if (!this.ready) return;
    this._t += dt;

    // The car rolls the last yards and stops under the sign.
    if (this.phase === 'arrive' && this._carZ > 9) {
      this._carZ = Math.max(9, this._carZ - dt * 4);
      this.car.position.z = this._carZ;
      this.car.userData.setSpeed(this._carZ > 9.2 ? 4 : 0);
    } else {
      this.car.userData.setSpeed(0);
    }
    this.car.userData.update(dt, this._t);

    // The ocean breathes.
    const pos = this.ocean.geometry.attributes.position;
    for (let i = 0; i < pos.count; i += 3) {
      pos.setZ(i, Math.sin(this._t * 0.8 + i * 0.7) * 0.5);
    }
    pos.needsUpdate = true;

    this.sky.follow(this.camera);
    this._driveCamera();
  }

  _driveCamera() {
    const sway = Math.sin(this._t * 0.4) * 0.5;
    let pos, look;
    if (this._camMode === 'sign') {
      pos = new THREE.Vector3(-6 + sway * 0.3, 2.2, 16);
      look = new THREE.Vector3(0, 5.6, 4);
    } else if (this._camMode === 'ocean') {
      pos = new THREE.Vector3(3 + sway * 0.3, 5.4, -6);
      look = new THREE.Vector3(0, 2.5, -220);
    } else { // wide — the pier, the sign, the car, the water
      const a = this._t * 0.02;
      pos = new THREE.Vector3(22 * Math.cos(a) + sway, 7, 34 + 6 * Math.sin(a));
      look = new THREE.Vector3(-2, 4, -40);
    }
    this.camera.position.lerp(pos, 0.05);
    this.camera.lookAt(look);
  }

  dispose() {
    this.sky?.dispose();
    this.scene.traverse((o) => { o.geometry?.dispose?.(); if (o.material?.dispose) o.material.dispose(); });
  }
}
