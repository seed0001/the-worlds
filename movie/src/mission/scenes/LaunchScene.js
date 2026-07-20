import * as THREE from 'three';
import { buildSaturnV } from '../models/saturnV.js';
import { buildPad } from '../models/pad.js';
import { Exhaust } from '../models/exhaust.js';

const _vc = new THREE.Vector3(); // scratch for separation-camera aim

// Launch — the pad, the countdown, and the ride to staging.
//
// The vehicle stays near the world origin; altitude is conveyed by the pad
// receding below, the sky darkening from dawn to space, and the speed of it —
// so the hero rocket is never a distant speck and the shot always has the
// hardware in frame. The director calls beat() to move between countdown,
// ignition, liftoff, roll, and staging; the scene integrates a simple ascent
// once released and fires the staging drop on cue.

const SKY_VERT = /* glsl */`
varying vec3 vDir;
void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const SKY_FRAG = /* glsl */`
uniform vec3 top; uniform vec3 horizon; uniform vec3 sunColor; uniform vec3 sunDir; uniform float space;
varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir);
  float h = clamp(d.y*0.5+0.5, 0.0, 1.0);
  vec3 col = mix(horizon, top, pow(h, 0.6));
  float sun = max(0.0, dot(d, normalize(sunDir)));
  col += sunColor * (pow(sun, 220.0)*10.0 + pow(sun, 8.0)*0.25*(1.0-space));
  gl_FragColor = vec4(col, 1.0);
}`;

// Colour keys: dawn at the pad -> daylight blue -> the black of space.
const DAWN_TOP = new THREE.Color(0x2c4a78), DAWN_HZ = new THREE.Color(0xe8a86a);
const DAY_TOP = new THREE.Color(0x3f7fd0), DAY_HZ = new THREE.Color(0xbcd6f0);
const SPACE_TOP = new THREE.Color(0x01020a), SPACE_HZ = new THREE.Color(0x0a1020);

export class LaunchScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.5, 60000);
    this.bloom = { strength: 0.5, radius: 0.7, threshold: 0.72 };
    this.ready = false;

    this.phase = 'pad';
    this.T = -10;          // mission clock; counts up, liftoff at 0
    this.counting = false; // countdown running
    this.lifted = false;
    this.alt = 0; this.vel = 0;
    this.throttle = 0; this.throttleTarget = 0;
    this.tilt = 0; this.roll = 0;
    this.staged = { s1c: false, s2: false };
    this._camMode = 'pad';
    this._t = 0;
    this._debris = [];
    this._engineLocalY = 0;  // local Y of the firing engine plane (rises after staging)
    this._flameScale = 1;    // upper stages fire smaller
    this._space = 0;         // eased dawn->space factor
  }

  async enter() {
    if (this.ready) return;
    const sunDir = new THREE.Vector3(0.5, 0.16, -0.6).normalize();
    this.sunDir = sunDir;

    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(40000, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: {
          top: { value: DAWN_TOP.clone() }, horizon: { value: DAWN_HZ.clone() },
          sunColor: { value: new THREE.Color(0xffd9a0) }, sunDir: { value: sunDir },
          space: { value: 0 },
        },
        vertexShader: SKY_VERT, fragmentShader: SKY_FRAG,
      }),
    );
    this.scene.add(this.sky);

    // Stars, hidden at first, revealed as the sky goes to space.
    this.stars = starField(1600, 30000);
    this.stars.material.opacity = 0;
    this.scene.add(this.stars);

    // Lighting — a low dawn key plus sky fill.
    this.sun = new THREE.DirectionalLight(0xffe6c4, 2.6);
    this.sun.position.copy(sunDir).multiplyScalar(400);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 10; this.sun.shadow.camera.far = 800;
    const sc = this.sun.shadow.camera; sc.left = -120; sc.right = 120; sc.top = 260; sc.bottom = -40;
    this.scene.add(this.sun, this.sun.target);
    this.fill = new THREE.HemisphereLight(0x9fc0e8, 0x3a3026, 0.6);
    this.scene.add(this.fill);

    // Ground — the coastal plain around the complex.
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(6000, 64),
      new THREE.MeshStandardMaterial({ color: 0x4a5a3a, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -3.0;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Pad + vehicle.
    this.pad = buildPad();
    this.scene.add(this.pad);
    this.rocket = buildSaturnV();
    this.scene.add(this.rocket);

    this.exhaust = new Exhaust();
    this.scene.add(this.exhaust.group);

    this.camera.position.set(55, 30, 75);
    this.camera.lookAt(0, 45, 0);
    this.ready = true;
  }

  /** The director's seam: set the beat and (optionally) the camera framing. */
  beat(dir = {}) {
    if (dir.launch) this.phase = dir.launch;
    if (dir.cam) this._camMode = dir.cam;
    switch (dir.launch) {
      case 'countdown': this.counting = true; break;
      case 'ignite': this.throttleTarget = 1; break;
      case 'liftoff':
        this.throttleTarget = 1;
        this.lifted = true;
        this.T = 0; // restart the clock at release for predictable ascent pacing
        break;
      case 'staging': this._stage('s1c'); break;
      case 'stage2': this._stage('s2'); break;
    }
  }

  _stage(which) {
    if (this.staged[which]) return;
    this.staged[which] = true;
    const bases = this.rocket.userData.engineBases;
    // The firing engine plane jumps up to the next stage, and its plume shrinks.
    if (which === 's1c') {
      this._engineLocalY = bases.afterS1c; this._flameScale = 0.45;
      // The escape tower has done its job by now — its motor yanks it up and
      // away rather than riding to orbit. (Real jettison is ~30 s into S-II.)
      const les = this.rocket.userData.stages.les;
      if (les && !this._lesGone) {
        this._lesGone = true;
        les.matrix.copy(les.matrixWorld);
        les.matrix.decompose(les.position, les.quaternion, les.scale);
        this.scene.add(les);
        this._debris.push({ grp: les, vUp: this.vel + 12, spin: 0.4, life: 0 });
      }
    }
    if (which === 's2') { this._engineLocalY = bases.afterS2; this._flameScale = 0.3; }
    const grp = this.rocket.userData.stages[which];
    if (!grp) return;
    // Hand the spent stage to the world at its current world transform.
    this.rocket.updateMatrixWorld(true);
    grp.matrix.copy(grp.matrixWorld);
    grp.matrix.decompose(grp.position, grp.quaternion, grp.scale);
    this.scene.add(grp);
    // It keeps almost all of the stack's upward speed and only drifts back — a
    // readable parting, not a plummet. The engines cut for a beat (the coast)
    // and the next stage lights, so the two are seen to separate.
    // Slow drift and a long coast keep the two pieces close and drifting for the
    // whole separation sequence, so the close-up angles have something to hold.
    // `vc` is the stage's visual centre above its group origin (the origin sits
    // at the old first-stage base, so upper stages need a big offset) — the
    // separation cameras aim there.
    const vc = which === 's1c' ? 25 : which === 's2' ? 64 : 20;
    const deb = { grp, vUp: this.vel - 3, spin: (Math.random() - 0.5) * 0.5, life: 0, vc };
    this._debris.push(deb);
    this._lastDebris = deb; // the spent stage the separation cameras frame
    this._coast = 3.6;
    this.throttleTarget = 0;
    // Retro-smoke at the separation plane so the split has a visible event.
    const sepY = this.rocket.position.y + this._engineLocalY;
    this.exhaust.burst(new THREE.Vector3(this.rocket.position.x, sepY, 0), 16);
  }

  update(dt) {
    if (!this.ready) return;
    this._t += dt;
    this.throttle += (this.throttleTarget - this.throttle) * Math.min(1, dt * 2.2);
    // Staging coast: engines are cut for a beat, then the next stage lights.
    if (this._coast > 0) {
      this._coast -= dt;
      if (this._coast <= 0) this.throttleTarget = 1;
    }

    // Countdown, then flight integration once lifted.
    if (this.counting && !this.lifted) this.T += dt;
    if (this.lifted) {
      this.T += dt;
      const accel = Math.min(48, 7 + this.T * 2.4) * this.throttle;
      this.vel += accel * dt;
      this.alt += this.vel * dt;
      this.rocket.position.y = this.alt;
      // Pitch/roll program a few seconds after tower clear.
      if (this.alt > 24) {
        this.tilt = Math.min(0.35, this.tilt + dt * 0.03);
        this.roll += dt * 0.12;
        this.rocket.rotation.z = -this.tilt;
        this.rocket.rotation.y = this.roll;
        this.rocket.position.x = this.tilt * this.alt * 0.4; // drift downrange
      }
    }

    // Sky: dawn -> day -> space by altitude. The orbit beat forces full space
    // regardless of the integrated altitude, so the final shot is always black.
    const day = THREE.MathUtils.clamp(this.alt / 900, 0, 1);
    const altSpace = THREE.MathUtils.clamp((this.alt - 900) / 6500, 0, 1);
    const spaceTarget = Math.max(altSpace, this.phase === 'orbit' ? 1 : 0);
    this._space += (spaceTarget - this._space) * Math.min(1, dt * 0.7);
    const space = this._space;
    const u = this.sky.material.uniforms;
    u.top.value.copy(DAWN_TOP).lerp(DAY_TOP, day).lerp(SPACE_TOP, space);
    u.horizon.value.copy(DAWN_HZ).lerp(DAY_HZ, day).lerp(SPACE_HZ, space);
    u.space.value = space;
    this.stars.material.opacity = space;
    // Keep a little fill even in "space" so a tumbling spent stage isn't a pure
    // black cutout in the separation close-ups.
    this.fill.intensity = 0.6 * (1 - space * 0.5);

    // Exhaust follows the firing engine plane — which rises up the stack after
    // each separation — in world space.
    const engineY = this.rocket.position.y + this._engineLocalY;
    const engineX = this.rocket.position.x + Math.sin(-this.tilt) * this._engineLocalY;
    this.exhaust.update(dt, this.throttle, new THREE.Vector3(engineX, engineY, 0), -3, this._flameScale);

    // Spent stages carry their inherited speed and slowly fall behind, tumbling.
    for (const d of this._debris) {
      d.life += dt;
      d.vUp -= dt * 2.2; // no thrust: it slows and drops back relative to the stack
      d.grp.position.y += d.vUp * dt;
      d.grp.position.x += Math.sin(this._t * 1.7 + d.life) * dt * 2;
      d.grp.rotation.x += d.spin * dt;
      d.grp.rotation.z += d.spin * 0.5 * dt;
      if (d.life > 9) d.grp.visible = false;
    }

    this.sun.position.copy(this.sunDir).multiplyScalar(400).add(new THREE.Vector3(0, this.alt, 0));
    this.sun.target.position.set(this.rocket.position.x, this.alt, 0);
    this.sky.position.set(this.camera.position.x, this.camera.position.y, this.camera.position.z);
    this.stars.position.copy(this.sky.position);

    this._driveCamera(dt);
  }

  _driveCamera(dt) {
    // The stack is ~122 m tall, so framings are set to hold the whole vehicle
    // (or deliberately go tight on the engines / a separation). Distances come
    // from the vehicle height, not eyeballed metres.
    const r = this.rocket.position;
    const mode = this._camMode;
    // The visible vehicle rides above the group origin (which sits at the old
    // first-stage base); after staging its centre climbs up the stack.
    const centreY = r.y + (this.staged.s1c ? 86 : 58);
    const target = new THREE.Vector3();
    let pos;
    if (mode === 'pad') {
      // Wide establishing: full rocket, tower, and the deck it stands on.
      pos = new THREE.Vector3(120, 78 + Math.sin(this._t * 0.1) * 3, 205);
      target.set(-2, 60, 0);
    } else if (mode === 'engines') {
      // Low and close on the F-1 cluster for ignition — flame in frame.
      pos = new THREE.Vector3(48, 14, 82);
      target.set(0, 16, 0);
    } else if (mode === 'liftoff') {
      // Three-quarter low, holding the base and the plume as it leaves the deck.
      pos = new THREE.Vector3(70, Math.max(34, r.y + 30), 150);
      target.set(r.x, r.y + 42, 0);
    } else if (mode === 'track') {
      // Long lens holding the whole climbing vehicle against the sky.
      pos = new THREE.Vector3(r.x + 95, centreY, 235);
      target.set(r.x, centreY, 0);
    } else if (mode.startsWith('sep') || mode === 'staging') {
      // All three separation angles frame the spent stage itself (the thing that
      // is separating), each from a different offset, with the live vehicle's
      // flame above it. sep-plane and sep-plane-b are opposing side views;
      // sep-fall rides in close as it tumbles away.
      const deb = this._lastDebris;
      const dp = deb?.grp?.position;
      // The centre offset is along the stage's own (tilted, tumbling) axis, so
      // rotate it by the group's orientation before adding — a vertical-only
      // offset lands off to the side once the stack has pitched over.
      let cx, cy, cz;
      if (dp) {
        _vc.set(0, deb.vc, 0).applyQuaternion(deb.grp.quaternion);
        cx = dp.x + _vc.x; cy = dp.y + _vc.y; cz = dp.z + _vc.z;
      } else { cx = r.x; cy = r.y + this._engineLocalY - 12; cz = 0; }
      if (mode === 'sep-plane-b') pos = new THREE.Vector3(cx - 22, cy + 10, -34);
      else if (mode === 'sep-fall') pos = new THREE.Vector3(cx + 16, cy + 7, 26);
      else pos = new THREE.Vector3(cx + 24, cy + 12, 36);
      target.set(cx, cy + 2, cz);
    } else { // orbit / default: pull back, vehicle small against black sky
      pos = new THREE.Vector3(r.x + 150, centreY + 20, 320);
      target.set(r.x, centreY, 0);
    }
    // Separation cams hard-follow their (fast-moving) subject rather than easing,
    // or a smooth-lerp would trail hundreds of metres behind a climbing rocket
    // and turn a close-up into a distant speck. Other framings ease as before.
    const hard = mode.startsWith('sep');
    if (hard || mode !== this._lastCamMode) this.camera.position.copy(pos);
    else this.camera.position.lerp(pos, Math.min(1, dt * 2.4));
    this._lastCamMode = mode;
    this.camera.lookAt(target);
  }

  dispose() {
    this.exhaust?.dispose();
    this.scene.traverse((o) => { o.geometry?.dispose?.(); if (o.material?.dispose) o.material.dispose(); });
  }
}

function starField(count, radius) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    pos[i * 3] = Math.cos(th) * r * radius;
    pos[i * 3 + 1] = Math.abs(u) * radius; // upper hemisphere
    pos[i * 3 + 2] = Math.sin(th) * r * radius;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 60, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false }));
}
