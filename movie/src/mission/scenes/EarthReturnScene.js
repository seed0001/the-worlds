import * as THREE from 'three';
import { buildCapsule } from '../models/capsule.js';

// The return to Earth — the last act. The command module separates from the
// service module, turns its heat shield into the air and comes in at eleven
// kilometres a second wrapped in a plasma fireball, then rides two drogues and
// three big chutes down to splashdown in the Pacific.
//
// The capsule stays near the origin and the world changes around it: the sky
// warms from the black of space to daylight blue, and the ocean rises up to
// meet it. Beats (dir.return): sep → reentry → chutes → splashdown.

const OCEAN_LEVEL = -1.4;   // where the sea sits under the capsule at splashdown

const SKY = {
  sep:        new THREE.Color(0x03040b),
  reentry:    new THREE.Color(0x140704),   // the fireball tints the whole sky
  chutes:     new THREE.Color(0x5f8fc4),
  splashdown: new THREE.Color(0x8fb6e2),
};

export class EarthReturnScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.3, 200000);
    this.bloom = { strength: 0.55, radius: 0.7, threshold: 0.6 };
    this.ready = false;
    this.phase = 'sep';
    this.bt = 0; this._t = 0;
    this._cam = 'sep';
    this.plasma = 0;        // 0..1 fireball intensity
    this.oceanY = -500;     // sea starts far below, out of sight
    this.splashed = false;
    this.chuteMains = 0;    // 0..1 main-canopy deployment
    this.chuteDrogue = 0;
  }

  async enter() {
    if (this.ready) return;
    this.scene.background = SKY.sep.clone();
    this.stars = starField(2400, 60000);
    this.scene.add(this.stars);

    this.sun = new THREE.DirectionalLight(0xffffff, 2.4);
    this.sun.position.set(200, 240, 160);
    this.scene.add(this.sun);
    this.scene.add(new THREE.AmbientLight(0x33465e, 0.6));

    this.capsule = buildCapsule();
    this.scene.add(this.capsule);

    // Service module: a plain cylinder jettisoned at separation.
    this.sm = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(1.96, 1.96, 7, 24),
      new THREE.MeshStandardMaterial({ color: 0xc9ccd1, roughness: 0.5, metalness: 0.7 }),
    );
    const smBell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 1.05, 2.2, 20, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x2e3136, roughness: 0.5, metalness: 0.6 }),
    );
    smBell.position.y = -4.5;
    this.sm.add(body, smBell);
    this.sm.position.set(0, -5.4, 0);
    this.scene.add(this.sm);

    this._buildPlasma();
    this._buildChutes();
    this._buildOcean();

    this._poseCapsule();
    this.camera.position.set(12, 2, 18);
    this.camera.lookAt(0, 1.5, 0);
    this.ready = true;
  }

  // ---- The plasma fireball: a bright shock cap under the heat shield, a wake
  // streaming up behind, and a point light so the fireball lights the capsule.
  _buildPlasma() {
    this.plasmaGroup = new THREE.Group();
    const capMat = new THREE.MeshBasicMaterial({ color: 0xffcaa0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.shockCap = new THREE.Mesh(new THREE.SphereGeometry(2.6, 24, 12, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), capMat);
    this.shockCap.scale.y = 0.55;
    this.shockCap.position.y = -0.3;
    this.plasmaGroup.add(this.shockCap);

    const coreMat = new THREE.MeshBasicMaterial({ color: 0xfff2d6, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.shockCore = new THREE.Mesh(new THREE.SphereGeometry(1.7, 20, 10, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), coreMat);
    this.shockCore.scale.y = 0.5;
    this.shockCore.position.y = -0.25;
    this.plasmaGroup.add(this.shockCore);

    // Wake: a long cone trailing up behind the falling capsule.
    const wakeMat = new THREE.MeshBasicMaterial({ color: 0xff8a3c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.wake = new THREE.Mesh(new THREE.ConeGeometry(2.2, 16, 20, 1, true), wakeMat);
    this.wake.position.y = 8;    // extends upward from the shield
    this.plasmaGroup.add(this.wake);

    this.fireLight = new THREE.PointLight(0xff7a30, 0, 40);
    this.fireLight.position.set(0, -1, 0);
    this.plasmaGroup.add(this.fireLight);

    this.scene.add(this.plasmaGroup);
  }

  _buildChutes() {
    this.chutes = new THREE.Group();
    this.scene.add(this.chutes);
    const apex = this.capsule.userData.apexY;

    const canopy = (radius, y, colorTex) => {
      const grp = new THREE.Group();
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
        new THREE.MeshStandardMaterial({ map: colorTex, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }),
      );
      grp.add(dome);
      // Riser bundle: a thin cone from the canopy skirt down to the capsule apex.
      const riseLen = y - apex;
      const riser = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.9, 0.08, riseLen, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
      );
      riser.position.y = -riseLen / 2;
      grp.add(riser);
      grp.position.y = y;
      grp.userData.baseY = y;
      return grp;
    };

    const mainTex = goreTexture('#e8663a', '#f2f2f2');
    const droTex = goreTexture('#f2f2f2', '#d8dde2');

    // Three mains in a shallow triangle overhead.
    this.mains = [];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const c = canopy(3.4, apex + 12, mainTex);
      c.position.x = Math.cos(a) * 2.4;
      c.position.z = Math.sin(a) * 2.4;
      c.userData.offset = new THREE.Vector2(Math.cos(a) * 2.4, Math.sin(a) * 2.4);
      this.chutes.add(c); this.mains.push(c);
    }
    // Two small drogues, higher and earlier.
    this.drogues = [];
    for (let i = 0; i < 2; i++) {
      const c = canopy(1.15, apex + 9, droTex);
      c.position.x = (i ? 1 : -1) * 1.1;
      c.userData.offset = new THREE.Vector2((i ? 1 : -1) * 1.1, 0);
      this.chutes.add(c); this.drogues.push(c);
    }
    this.chutes.visible = false;
  }

  _buildOcean() {
    const geo = new THREE.PlaneGeometry(6000, 6000, 60, 60);
    geo.rotateX(-Math.PI / 2);
    this._oceanBase = geo.getAttribute('position').array.slice();
    this.ocean = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: 0x123a63, roughness: 0.35, metalness: 0.2,
    }));
    this.ocean.position.y = this.oceanY;
    this.scene.add(this.ocean);

    // Splash: a ring that blooms out and fades at contact.
    this.splash = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 1.4, 32),
      new THREE.MeshBasicMaterial({ color: 0xdff0ff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.splash.rotation.x = -Math.PI / 2;
    this.splash.visible = false;
    this.scene.add(this.splash);
  }

  beat(dir = {}) {
    if (dir.cam) this._cam = dir.cam;
    if (dir.return) { this.phase = dir.return; this.bt = 0; }
  }

  _poseCapsule() {
    // Base-down through the whole descent, with a lean during reentry.
    const lean = this.phase === 'reentry' ? 0.16 : 0.03;
    this.capsule.rotation.z = lean;
    if (this.phase === 'reentry' && this.plasma > 0.2) {
      // Aerodynamic buffeting.
      this.capsule.rotation.x = (Math.random() - 0.5) * 0.05 * this.plasma;
      this.capsule.rotation.z = lean + (Math.random() - 0.5) * 0.05 * this.plasma;
    } else {
      this.capsule.rotation.x = 0;
    }
  }

  update(dt) {
    if (!this.ready) return;
    this._t += dt; this.bt += dt;
    const ph = this.phase;

    // Sky warms/cools toward the phase target.
    if (SKY[ph]) this.scene.background.lerp(SKY[ph], Math.min(1, dt * 1.5));
    this.stars.material.opacity = ph === 'sep' ? 0.9 : ph === 'reentry' ? Math.max(0, 0.5 - this.plasma) : Math.max(0, 0.2 - dt);

    if (ph === 'sep') {
      // Push the service module away and set it tumbling.
      this.sm.visible = true;
      this.sm.position.y = -5.4 - this.bt * 5;
      this.sm.position.x = -this.bt * 2.2;
      this.sm.rotation.x += dt * 0.7; this.sm.rotation.z += dt * 0.4;
      this.plasma = Math.max(0, this.plasma - dt);
    } else {
      this.sm.visible = false;
    }

    if (ph === 'reentry') {
      this.plasma = Math.min(1, this.plasma + dt * 0.8);
    } else if (ph !== 'sep') {
      this.plasma = Math.max(0, this.plasma - dt * 1.5);
    }
    this._updatePlasma();

    // Chutes.
    if (ph === 'chutes' || ph === 'splashdown') {
      this.chutes.visible = true;
      this.chuteDrogue = Math.min(1, this.chuteDrogue + dt * 1.3);
      // Mains blossom after the drogues have pulled the pack out.
      if (this.bt > 1.4 || ph === 'splashdown') this.chuteMains = Math.min(1, this.chuteMains + dt * 0.9);
      this._updateChutes(dt);
    }

    // Ocean rises to meet the capsule for the splashdown.
    const oceanTarget = ph === 'splashdown' ? OCEAN_LEVEL : ph === 'chutes' ? -55 : -500;
    this.oceanY += (oceanTarget - this.oceanY) * Math.min(1, dt * (ph === 'splashdown' ? 1.3 : 1.4));
    this.ocean.position.y = this.oceanY;
    this._waveOcean();

    if (ph === 'splashdown') this._updateSplashdown(dt);

    this._poseCapsule();
    this._driveCamera(dt);
  }

  _updatePlasma() {
    const p = this.plasma;
    const flick = 0.8 + Math.random() * 0.4;
    this.plasmaGroup.visible = p > 0.01;
    this.shockCap.material.opacity = p * 0.8 * flick;
    this.shockCore.material.opacity = p * 0.95 * flick;
    this.wake.material.opacity = p * 0.5 * flick;
    const s = 0.7 + p * 0.6;
    this.shockCap.scale.set(s, 0.55 * s, s);
    this.wake.scale.set(0.8 + p * 0.5, 0.7 + p * 0.6, 0.8 + p * 0.5);
    this.fireLight.intensity = p * 6 * flick;
  }

  _updateChutes(dt) {
    const apex = this.capsule.userData.apexY;
    for (const c of this.drogues) {
      const s = 0.05 + this.chuteDrogue * 0.95 * (1 - this.chuteMains * 0.9);
      c.scale.setScalar(Math.max(0.001, s));
      c.visible = this.chuteMains < 0.98;
    }
    // Gentle pendulum sway of the whole canopy set.
    const sway = Math.sin(this._t * 0.9) * 0.06;
    this.chutes.rotation.z = sway;
    for (const c of this.mains) {
      const s = 0.05 + this._ease(this.chuteMains);
      c.scale.setScalar(Math.max(0.001, s));
    }
  }

  _ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  _updateSplashdown(dt) {
    if (!this.splashed && this.oceanY > OCEAN_LEVEL - 1.2 && this.bt > 1.5) {
      this.splashed = true;
      this.splash.visible = true;
      this._splashT = 0;
      // Cut the chutes loose — they collapse and drift off.
      this._chuteCut = 0;
    }
    if (this.splashed) {
      this._splashT += dt;
      const k = Math.min(1, this._splashT / 1.6);
      this.splash.position.set(0, OCEAN_LEVEL + 0.05, 0);
      this.splash.scale.setScalar(1 + k * 10);
      this.splash.material.opacity = (1 - k) * 0.7;
      // Chutes released: shrink and slip away downwind, then out of sight.
      this._chuteCut = Math.min(1, (this._chuteCut ?? 0) + dt * 0.8);
      this.chutes.position.x = this._chuteCut * 55;
      this.chutes.position.y = -this._chuteCut * 20;
      this.chutes.children.forEach((c) => c.scale.multiplyScalar(1 - dt * 2.5));
      if (this._chuteCut > 0.7) this.chutes.visible = false;
      // The capsule bobs.
      this.capsule.position.y = OCEAN_LEVEL + 1.4 + Math.sin(this._t * 1.4) * 0.18;
      this.capsule.rotation.z = 0.05 + Math.sin(this._t * 1.1) * 0.05;
    }
  }

  _waveOcean() {
    if (this.oceanY < -100) return;   // skip work while the sea is out of sight
    const pos = this.ocean.geometry.getAttribute('position');
    const base = this._oceanBase;
    const t = this._t;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      const h = Math.sin(x * 0.03 + t) * 0.5 + Math.cos(z * 0.037 - t * 0.8) * 0.4;
      pos.setY(i, h);
    }
    pos.needsUpdate = true;
    this.ocean.geometry.computeVertexNormals();
  }

  _driveCamera(dt) {
    const c = this._cam;
    const cap = this.capsule.position;
    let pos, target = new THREE.Vector3(cap.x, cap.y + 1.5, cap.z);
    if (c === 'sep') {
      pos = new THREE.Vector3(11, 1, 17); target.set(0, -1, 0);
    } else if (c === 'reentry') {
      // Low and to the side so the fireball fills the frame, with a shake.
      const sh = this.plasma * 0.5;
      pos = new THREE.Vector3(9 + (Math.random() - 0.5) * sh, -1.5 + (Math.random() - 0.5) * sh, 13);
      target.set(0, 0.5, 0);
    } else if (c === 'chutes') {
      // Pull back and up so all three canopies fit against the sky.
      pos = new THREE.Vector3(14, 9, 22); target.set(0, 8, 0);
    } else { // splashdown
      pos = new THREE.Vector3(10, OCEAN_LEVEL + 3.5, 15);
      target.set(0, OCEAN_LEVEL + 1.5, 0);
    }
    const rate = c === 'reentry' ? 1 : Math.min(1, dt * 2);
    this.camera.position.lerp(pos, rate);
    this.camera.lookAt(target);
    this.stars.position.copy(this.camera.position);
  }

  dispose() {
    this.scene.traverse((o) => { o.geometry?.dispose?.(); if (o.material?.dispose) o.material.dispose(); });
  }
}

// A parachute gore texture: alternating radial wedges of two colours.
function goreTexture(a, b) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const cx = 64, cy = 64, n = 12;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i % 2 ? a : b;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, 64, (i / n) * Math.PI * 2, ((i + 1) / n) * Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
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
