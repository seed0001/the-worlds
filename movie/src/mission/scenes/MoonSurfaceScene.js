import * as THREE from 'three';
import { LunarGround } from '../models/lunarGround.js';
import { buildLM } from '../models/lem.js';
import { buildEarth } from '../models/bodies.js';
import { buildAstronaut } from '../models/astronaut.js';
import { buildRover } from '../models/rover.js';
import { buildFlag } from '../models/flag.js';
import { MoonDust } from '../models/moondust.js';

// The lunar surface — powered descent, touchdown, and then the moonwalk: the
// crew egress, the flag, the rover unfolded from the lander and driven across
// the regolith throwing its flat rooster-tail of dust. Black sky, hard sun, the
// Earth fixed overhead, grey regolith underfoot.
//
// Beats (dir.moon): descent → landing → landed → egress → flag → rover → drive
// → survey. The first three fly the LM down; the rest play out on the ground,
// where the crew, flag and rover are hidden until their beat brings them in.

const SITE = { x: 0, z: 0 };            // the LM sets down at the origin
const LADDER_Z = 2.35;                  // front face of the descent stage
const FLAG_AT = { x: -6, z: 6.5 };
const ROVER_STOW = { x: 4.4, z: 0.4 };  // folded against the LM's +X flank, up high
const ROVER_DEPLOY = { x: 7.5, z: 4.5 };
const LOPE_SPEED = 1.3;                 // m/s — the unhurried 1/6-g glide
const DRIVE_TOP = 5.0;                  // m/s on screen (≈ the LRV's real top speed)

export class MoonSurfaceScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.3, 100000);
    this.bloom = { strength: 0.3, radius: 0.5, threshold: 0.8 };
    this.ready = false;
    this.phase = 'descent';
    this.bt = 0; this._t = 0;
    this.lmAlt = 130;      // metres above the pad
    this.throttle = 1;
    this.landed = false;
    this._cam = 'descent';
    // EVA state, also read by the verifier.
    this.crewOut = false;
    this.flagUp = false;
    this.roverDeployed = false;
    this.roverDist = 0;
  }

  async enter() {
    if (this.ready) return;
    this.scene.background = new THREE.Color(0x000000);
    this.stars = starField(2600, 40000);
    this.scene.add(this.stars);

    // Hard, single sun; the shadowed side goes nearly black (no air to fill it).
    this.sun = new THREE.DirectionalLight(0xfff6e8, 3.2);
    this.sun.position.set(240, 160, 120);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 1; this.sun.shadow.camera.far = 600;
    const sc = this.sun.shadow.camera; sc.left = sc.bottom = -120; sc.right = sc.top = 120;
    this.scene.add(this.sun, this.sun.target);
    this.scene.add(new THREE.AmbientLight(0x0c0f14, 1.0));

    // Earth, fixed in the black sky.
    this.earth = buildEarth(22);
    this.earth.position.set(-150, 230, -300);
    this.scene.add(this.earth);

    this.ground = new LunarGround({ size: 1400, resolution: 220 });
    this.scene.add(this.ground.mesh);
    this.siteY = this.ground.heightAt(SITE.x, SITE.z);

    this.lm = buildLM();
    this.scene.add(this.lm);
    this._addLadder();
    // The ascent stage flies home; the descent stage stays as its launch pad.
    this.ascentStage = this.lm.userData.ascentStage;
    this.descentStage = this.lm.userData.descentStage;
    this.ascentAlt = 0;
    this.liftedOff = false;
    // Ascent-engine flame, hidden until the Moon liftoff.
    this.ascentFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 3.4, 14, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.ascentFlame.rotation.x = Math.PI;
    this.ascentFlame.position.y = -1.7;
    this.ascentFlame.visible = false;
    this.ascentStage.add(this.ascentFlame);

    // Descent-engine flame (additive cone under the bell).
    this.flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.7, 5, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.flame.rotation.x = Math.PI;
    this.scene.add(this.flame);

    this.dust = new MoonDust();
    this.scene.add(this.dust.group);

    // ---- Ground cast: crew, flag, rover, and the wheel tracks. All hidden
    // until the LM is down and the moonwalk begins.
    this.crew = [buildAstronaut(), buildAstronaut()];
    for (const a of this.crew) { a.visible = false; a.userData.wp = 0; this.scene.add(a); }
    // Commander (does the first step and drives) and the lunar-module pilot.
    this._place(this.crew[0], SITE.x + 0.6, LADDER_Z + 1.2, Math.PI);
    this._place(this.crew[1], SITE.x - 2.2, LADDER_Z + 1.6, Math.PI);

    this.flag = buildFlag();
    this.flag.visible = false;
    this.flag.position.set(FLAG_AT.x, this.ground.heightAt(FLAG_AT.x, FLAG_AT.z), FLAG_AT.z);
    this.flag.rotation.y = -0.5;
    this.scene.add(this.flag);

    this.rover = buildRover();
    this.rover.visible = false;
    this.rover.position.set(ROVER_STOW.x, this.siteY + 2.4, ROVER_STOW.z);
    this.rover.rotation.z = 0.5;     // canted, as if still clamped to the LM flank
    this.scene.add(this.rover);
    this.roverHeading = Math.atan2(-1, 0.25);  // set when the drive begins

    this._buildTracks();

    this._poseLM();
    this.camera.position.set(40, 30, 55);
    this.camera.lookAt(0, this.siteY + this.lmAlt, 0);
    this.ready = true;
  }

  _addLadder() {
    const grey = new THREE.MeshStandardMaterial({ color: 0xb8bcc2, roughness: 0.55, metalness: 0.6 });
    const ladder = new THREE.Group();
    const top = this.siteY + 3.0, bot = this.siteY + 0.2;
    for (const sx of [-0.22, 0.22]) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, top - bot, 6), grey);
      rail.position.set(sx, (top + bot) / 2, LADDER_Z);
      ladder.add(rail);
    }
    for (let i = 0; i <= 6; i++) {
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.44, 6), grey);
      rung.rotation.z = Math.PI / 2;
      rung.position.set(0, bot + (i / 6) * (top - bot), LADDER_Z);
      ladder.add(rung);
    }
    this.scene.add(ladder);
  }

  _buildTracks() {
    this.tracks = new THREE.Group();
    this.scene.add(this.tracks);
    const mat = new THREE.MeshStandardMaterial({ color: 0x6d6b64, roughness: 1.0, metalness: 0.0, transparent: true, opacity: 0.55 });
    const geo = new THREE.PlaneGeometry(0.26, 0.5);
    this._trackPool = [];
    for (let i = 0; i < 160; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      this.tracks.add(m);
      this._trackPool.push(m);
    }
    this._trackNext = 0;
    this._lastTrack = null;
  }

  // Position a figure on the regolith at (x,z), facing yaw.
  _place(a, x, z, yaw) {
    const y = this.ground.heightAt(x, z);
    a.position.set(x, y, z);
    a.rotation.y = yaw;
    a.userData.x = x; a.userData.z = z;
  }

  beat(dir = {}) {
    if (dir.cam) this._cam = dir.cam;
    if (!dir.moon) return;
    this.phase = dir.moon;
    this.bt = 0;

    if (dir.moon === 'egress') {
      this.crew[0].visible = this.crew[1].visible = true;
      this.crewOut = true;
      // Commander steps off the pad and out onto open ground.
      this.crew[0].userData.target = { x: SITE.x + 0.4, z: 7.5 };
      this.crew[1].userData.target = { x: SITE.x - 2.4, z: 4.6 };
    } else if (dir.moon === 'flag') {
      this.flag.visible = true; this.flagUp = true;
      this.crew[0].userData.target = { x: FLAG_AT.x + 1.3, z: FLAG_AT.z + 0.4 };
    } else if (dir.moon === 'rover') {
      this.rover.visible = true;
      // Both crew move over to the rover to board it.
      this.crew[0].userData.target = { x: ROVER_DEPLOY.x - 0.6, z: ROVER_DEPLOY.z - 1.0 };
      this.crew[1].userData.target = { x: ROVER_DEPLOY.x + 0.9, z: ROVER_DEPLOY.z - 1.0 };
    } else if (dir.moon === 'drive') {
      this.crew[0].userData.target = null;
      this.crew[1].userData.target = null;
      this.seated = true;
      this.roverPos = new THREE.Vector3(this.rover.position.x, 0, this.rover.position.z);
    } else if (dir.moon === 'liftoff') {
      // The crew are back inside the ascent stage; the rover and flag stay.
      this.seated = false;
      for (const a of this.crew) a.visible = false;
      this.liftedOff = true;
    }
  }

  _poseLM() {
    const y = this.siteY + this.lmAlt;
    this.lm.position.set(SITE.x, y, SITE.z);
    const pitch = this.landed ? 0 : Math.max(0, (this.lmAlt - 20) / 130) * 0.28;
    this.lm.rotation.x = pitch;
    const on = !this.landed && this.throttle > 0.02;
    this.flame.visible = on;
    if (on) {
      this.flame.position.set(this.lm.position.x, y + 0.2, this.lm.position.z);
      const len = this.throttle * (0.85 + Math.random() * 0.15);
      this.flame.scale.set(this.throttle, len, this.throttle);
      this.flame.position.y -= 2.5 * len;
    }
  }

  update(dt) {
    if (!this.ready) return;
    this._t += dt; this.bt += dt;

    if (!this.landed) {
      const floor = this.phase === 'descent' ? 15 : 0;
      const rate = this.lmAlt > 40 ? 18 : this.lmAlt > 8 ? 6 : 2;
      this.throttle = this.lmAlt > 8 ? 1 : 0.65;
      this.lmAlt = Math.max(floor, this.lmAlt - rate * dt);
      if (this.lmAlt <= 0.05) { this.landed = true; this.throttle = 0; }
      this._poseLM();
      if (!this.landed && this.lmAlt < 28) {
        const strength = Math.min(1, (28 - this.lmAlt) / 24) * this.throttle;
        this.dust.blast(this.lm.position.x, this.lm.position.z, this.siteY, strength);
      }
    }

    this._updateEva(dt);
    if (this.phase === 'liftoff') this._updateLiftoff(dt);
    this.dust.update(dt, this.siteY);
    this.sun.target.position.set(SITE.x, this.siteY, SITE.z);
    this._driveCamera(dt);
  }

  _updateEva(dt) {
    // Deploy: crane the rover down off the LM flank and level it onto the ground.
    if (this.phase === 'rover' && !this.roverDeployed) {
      const k = Math.min(1, this.bt / 3.2);
      const gy = this.ground.heightAt(ROVER_DEPLOY.x, ROVER_DEPLOY.z);
      this.rover.position.set(
        THREE.MathUtils.lerp(ROVER_STOW.x, ROVER_DEPLOY.x, k),
        THREE.MathUtils.lerp(this.siteY + 2.4, gy, k),
        THREE.MathUtils.lerp(ROVER_STOW.z, ROVER_DEPLOY.z, k),
      );
      this.rover.rotation.z = 0.5 * (1 - k);   // uncants as it settles
      this.rover.rotation.y = this.roverHeading;
      if (k >= 1) this.roverDeployed = true;
    }

    // Walk any figure with a target toward it, playing the lope.
    for (const a of this.crew) {
      if (!a.visible) continue;
      const tgt = a.userData.target;
      if (tgt) {
        const dx = tgt.x - a.userData.x, dz = tgt.z - a.userData.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.15) {
          const step = Math.min(d, LOPE_SPEED * dt);
          a.userData.x += (dx / d) * step;
          a.userData.z += (dz / d) * step;
          a.position.set(a.userData.x, this.ground.heightAt(a.userData.x, a.userData.z), a.userData.z);
          a.rotation.y = Math.atan2(dx, dz);
          a.userData.wp = (a.userData.wp + dt * 1.4) % 1;
          a.userData.lope(a.userData.wp, 1);
        } else {
          a.userData.target = null;
          a.userData.stand();
        }
      } else if (!this.seated) {
        a.userData.stand();
      }
    }

    // Drive: roll the rover across the regolith, spinning wheels, throwing the
    // rooster-tail, laying tracks — and carry the seated crew with it.
    if (this.phase === 'drive' && this.roverDeployed) {
      const speed = DRIVE_TOP * Math.min(1, this.bt / 2.5);   // ease up to speed
      this.roverHeading += 0.08 * dt;                         // a slow left sweep
      const fwd = new THREE.Vector3(Math.sin(this.roverHeading), 0, Math.cos(this.roverHeading));
      this.roverPos.addScaledVector(fwd, speed * dt);
      this.roverDist += speed * dt;
      const gy = this.ground.heightAt(this.roverPos.x, this.roverPos.z);
      this.rover.position.set(this.roverPos.x, gy, this.roverPos.z);
      this.rover.rotation.y = this.roverHeading;

      // Spin the wheels to match ground speed.
      const spin = (speed / this.rover.userData.wheelR) * dt;
      for (const w of this.rover.userData.wheels) w.rotation.x -= spin;

      // Rooster-tail off each rear wheel, and tracks behind them.
      const strength = speed / DRIVE_TOP;
      for (const w of this.rover.userData.rearWheels) {
        const wp = w.getWorldPosition(new THREE.Vector3());
        this.dust.spray(wp.x, wp.z, gy, fwd.x, fwd.z, strength);
      }
      this._layTracks(fwd);
    }

    // Seat the crew on the rover once driving.
    if (this.seated) {
      const seats = this.rover.userData.seats;
      for (let i = 0; i < this.crew.length; i++) {
        const a = this.crew[i];
        const sw = seats[i].getWorldPosition(new THREE.Vector3());
        a.position.set(sw.x, sw.y - 0.30, sw.z);
        a.rotation.y = this.rover.rotation.y;
        a.userData.sit();
      }
    }
  }

  _updateLiftoff(dt) {
    const t = this.bt;
    // A held moment of engine, a flash of dust off the descent stage, then the
    // ascent stage cuts loose and climbs, accelerating away.
    this.ascentFlame.visible = true;
    const flick = 0.85 + Math.random() * 0.3;
    this.ascentFlame.scale.set(flick, flick, flick);
    if (t < 1.6) this.dust.blast(0, 0, this.siteY, 1);
    // Accelerating climb, capped once it is well out of frame.
    if (t > 0.6) this.ascentAlt = Math.min(400, this.ascentAlt + (2.4 + this.ascentAlt * 0.8) * dt);
    this.ascentStage.position.y = 4.0 + this.ascentAlt;
  }

  _layTracks(fwd) {
    const p = this.rover.position;
    if (this._lastTrack && p.distanceTo(this._lastTrack) < 0.8) return;
    this._lastTrack = p.clone();
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x);   // perpendicular, on the ground
    const yaw = Math.atan2(fwd.x, fwd.z);
    for (const sx of [-1, 1]) {
      const x = p.x + right.x * this.rover.userData.halfW * sx;
      const z = p.z + right.z * this.rover.userData.halfW * sx;
      const m = this._trackPool[this._trackNext];
      this._trackNext = (this._trackNext + 1) % this._trackPool.length;
      m.position.set(x, this.ground.heightAt(x, z) + 0.02, z);
      m.rotation.set(-Math.PI / 2, 0, -yaw);
      m.visible = true;
    }
  }

  _driveCamera(dt) {
    const lm = this.lm.position;
    const c = this._cam;
    let pos, target;
    if (c === 'descent') {
      pos = new THREE.Vector3(34, this.siteY + this.lmAlt * 0.7 + 10, 46);
      target = new THREE.Vector3(0, this.siteY + this.lmAlt * 0.6, 0);
    } else if (c === 'landing') {
      pos = new THREE.Vector3(16, this.siteY + Math.max(4, this.lmAlt * 0.5 + 3), 22);
      target = new THREE.Vector3(0, this.siteY + Math.min(this.lmAlt, 6), 0);
    } else if (c === 'landed') {
      pos = new THREE.Vector3(20, this.siteY + 9, 30);
      target = new THREE.Vector3(0, this.siteY + 5, 0);
    } else if (c === 'egress') {
      // Low and close on the commander coming off the ladder, LM shoulder in frame.
      const a = this.crew[0].position;
      pos = new THREE.Vector3(a.x + 6, this.siteY + 3.4, a.z + 7.5);
      target = new THREE.Vector3(a.x, a.y + 1.1, a.z);
    } else if (c === 'flag') {
      // Flag and commander against the black sky, Earth up over the shoulder.
      const f = this.flag.position;
      pos = new THREE.Vector3(f.x + 7, this.siteY + 4.5, f.z + 8.5);
      target = new THREE.Vector3(f.x - 1, f.y + 1.4, f.z);
    } else if (c === 'rover') {
      // Wide on the rover coming off the lander and settling.
      const r = this.rover.position;
      pos = new THREE.Vector3(r.x + 9, this.siteY + 7, r.z + 11);
      target = new THREE.Vector3((r.x + lm.x) / 2, this.siteY + 3, (r.z + lm.z) / 2);
    } else if (c === 'drive') {
      // Chase from behind and to the side, low, so the fantail catches the sun.
      const r = this.rover.position, h = this.roverHeading;
      const back = new THREE.Vector3(-Math.sin(h), 0, -Math.cos(h));
      const side = new THREE.Vector3(Math.cos(h), 0, -Math.sin(h));
      pos = new THREE.Vector3(
        r.x + back.x * 10 + side.x * 5, this.siteY + 4.5, r.z + back.z * 10 + side.z * 5);
      target = new THREE.Vector3(r.x, r.y + 1.2, r.z);
    } else if (c === 'liftoff') {
      // Low and back, so the descent stage, flag and rover stay in frame while
      // the ascent stage climbs up and out the top — what's left behind.
      pos = new THREE.Vector3(7, this.siteY + 3.5, 19);
      target = new THREE.Vector3(-0.5, this.siteY + 3 + Math.min(this.ascentAlt * 0.5, 6), 1);
    } else { // survey — pull back and hold the whole site
      const r = this.rover.position;
      pos = new THREE.Vector3(r.x + 16, this.siteY + 12, r.z + 20);
      target = new THREE.Vector3((r.x + lm.x) / 2, this.siteY + 4, (r.z + lm.z) / 2);
    }
    const rate = c === 'drive' ? dt * 4 : dt * 2;
    this.camera.position.lerp(pos, Math.min(1, rate));
    this.camera.lookAt(target);
    this.stars.position.copy(this.camera.position);
  }

  dispose() {
    this.dust?.dispose();
    this.ground?.dispose();
    this.scene.traverse((o) => { o.geometry?.dispose?.(); if (o.material?.dispose) o.material.dispose(); });
  }
}

function starField(count, radius) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    pos[i * 3] = Math.cos(th) * r * radius; pos[i * 3 + 1] = Math.abs(u) * radius; pos[i * 3 + 2] = Math.sin(th) * r * radius;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 60, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false }));
}
