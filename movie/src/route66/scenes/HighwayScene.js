import * as THREE from 'three';
import { makeRng } from '../../core/rng.js';
import { RoadSky } from '../models/sky.js';
import { buildTwoLane, buildInterstate, ROAD_LEN } from '../models/road.js';
import { buildBelAir } from '../models/belair.js';
import {
  makeStateSign, makeShield, makeBillboard, makeBurmaShave,
  makeHistoricSign, makeInterstateSign, makeBeginSign,
} from '../models/signs.js';
import {
  PROPS, DRESSING, makePole, makeMotorCourt, makeTownStrip, makeGasStation,
  makeNeonMotel, makeWigwams, makeRoys, makeBarnAd, makeSkyline, makeDiner,
} from '../models/scenery.js';

// The drive — the engine's spine, all eight states of it. The Bel Air never
// moves; the world streams past it at two-lane cruising speed, and the scene
// re-dresses that stream state by state: ground colour, horizon props, the
// billboards the cue script schedules.
//
// beat(dir):
//   dir.state  a state id from route66.js — swaps the dressing and sends the
//              ENTERING sign up the road
//   dir.cam    'chase' | 'side' | 'front' | 'wide' | 'signview'
//   dir.time   time of day in [0,1) — 0.18 morning, 0.25 noon, 0.47 dusk
//   dir.spawn  [{ kind, at, side?, opts? }] roadside pieces, `at` metres ahead
//   dir.flash  'interstate' | 'motel' | 'ghost' | 'neon' | 'roys' | 'alive'
//              — CUT TO THE PRESENT: the world freezes, the car vanishes, the
//              light goes flat, and this stretch shows what it is now.
//   dir.flash null — cut home to 1957: whatever ruin we stood in comes back
//              to life beside us and the drive resumes.
//
// The flash never moves the camera. That is the whole trick: same framing,
// same spot on the road, sixty-eight years apart.

const CRUISE = 24;              // m/s — an honest two-lane 54 mph
const DESPAWN_Z = 60;           // behind the camera, gone
const SPAWN_Z = -640;           // where the horizon hands us new things

const CAR_X = 1.7;              // centre of the westbound lane

export class HighwayScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 9000);
    this.bloom = { strength: 0.35, radius: 0.6, threshold: 0.8 };
    this.ready = false;

    this.rng = makeRng('route66');
    this.speed = 0;
    this.speedTarget = CRUISE;
    this.era = 'past';
    this.flashKind = null;
    this._camMode = 'chase';
    this._t = 0;
    // The film is one long day: sunrise over Chicago, noon on the plains,
    // sunset into the Pacific. Cues push the target west with the sun.
    this._time = 0.04;
    this._timeTarget = 0.04;

    this._odometer = 0;         // metres of world scrolled past, ever
    this._nextPole = 20;
    this._nextShield = 240;
    this._nextNear = 30;
    this._nextFar = 60;

    this.stateId = 'illinois';
    this._groundTarget = new THREE.Color(DRESSING.illinois.ground);
    this._tintTarget = new THREE.Color(DRESSING.illinois.tint);
  }

  async enter() {
    if (this.ready) return;

    this.sky = new RoadSky();
    this.scene.add(this.sky.group);

    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(2400, ROAD_LEN + 800),
      new THREE.MeshStandardMaterial({ color: DRESSING.illinois.ground, roughness: 1 }),
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.z = -ROAD_LEN / 2 + 200;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    this.road = buildTwoLane();
    this.scene.add(this.road);

    this.interstate = buildInterstate();
    this.scene.add(this.interstate);

    this.car = buildBelAir();
    this.car.position.set(CAR_X, 0, 0);
    this.scene.add(this.car);

    this.world = new THREE.Group();   // every mover: signs, props, buildings
    this.scene.add(this.world);

    this.flashPiece = null;           // the set piece the current flash stands in

    this.camera.position.set(CAR_X + 2.6, 2.6, 14);
    this.camera.lookAt(CAR_X, 1.2, -40);
    this.ready = true;
  }

  // ------------------------------------------------------------- direction --

  beat(dir = {}) {
    if (dir.cam) this._camMode = dir.cam;
    if (dir.time !== undefined) this._timeTarget = dir.time;

    if (dir.state) {
      this.stateId = dir.state;
      const d = DRESSING[dir.state];
      this._groundTarget.set(d.ground);
      this._tintTarget.set(d.tint);
      if (dir.sign !== false) {
        const s = makeStateSign(dir.signName, dir.signNickname);
        this._place(s, 9.5, -(dir.signAt ?? 130), -Math.PI / 12);
      }
    }

    for (const spec of dir.spawn ?? []) this._spawn(spec);

    if (dir.flash !== undefined) {
      if (dir.flash) this._flashForward(dir.flash);
      else this._flashBack();
    }
  }

  _place(obj, x, z, yaw = 0) {
    obj.position.set(x, 0, z);
    if (yaw) obj.rotation.y = yaw;
    this.world.add(obj);
    return obj;
  }

  _spawn({ kind, at = 200, side = 1, opts = {} }) {
    const z = -at;
    const x = side * (opts.off ?? 14);
    const face = side > 0 ? -Math.PI / 2 : Math.PI / 2;   // fronts toward the road
    switch (kind) {
      case 'billboard': return this._place(makeBillboard(opts), side * 13, z, side * -Math.PI / 14);
      case 'barn':      return this._place(makeBarnAd(opts.text), side * 26, z, face + 0.4);
      case 'burma': {
        (opts.lines ?? []).forEach((line, i) => this._place(makeBurmaShave(line), 8.5, z - i * 26));
        return;
      }
      case 'begin':     return this._place(makeBeginSign(), 7.5, z, opts.face ? Math.PI : 0);
      case 'skyline': {
        const sky = this._place(makeSkyline(), -40, z, 0);
        sky.userData.despawnZ = 900;              // it starts BEHIND us; let it linger
        return sky;
      }
      case 'diner':     return this._place(makeDiner(), 16, z, face);
      case 'wigwams':   return this._place(makeWigwams(), 20, z, face);
      case 'gas':       return this._place(makeGasStation(opts), 17, z, face);
      case 'motorcourt': return this._place(makeMotorCourt(), 19, z, face);
      case 'town':      return this._place(makeTownStrip(opts), 22, z, face);
      case 'neon':      return this._place(makeNeonMotel(), 17, z, face);
      case 'roys':      return this._place(makeRoys(), 17, z, face);
      case 'prop':      return this._place(PROPS[opts.prop](this.rng), side * (opts.off ?? 15), z, this.rng() * Math.PI * 2);
      case 'shield':    return this._place(makeShield(), 8.5, z);
      case 'historic':  return this._place(makeHistoricSign(), 8.5, z);
      case 'interstateSign': return this._place(makeInterstateSign(opts.text ?? 'INTERSTATE', opts.sub ?? ''), side * 16, z, side * -Math.PI / 16);
    }
  }

  // The cut forward: freeze the world in the present tense.
  _flashForward(kind) {
    this.era = 'present';
    this.flashKind = kind;
    this.speedTarget = 0;
    this.speed = 0;                       // hard cut — the motion just stops
    this.car.visible = false;
    this.sky.setPresent(true);
    this.road.userData.setEra(kind === 'alive' ? 'past' : 'present');
    // The whole visible world changes tense together: any era-pair set piece
    // still on screen (a motel we just passed, a town up the road) decays too.
    for (const o of this.world.children) o.userData.setEra?.('present');

    // Where the ruin stands depends on where this camera mode is looking:
    // the chase/wide cams look up the road, the side cam looks across it at
    // the (now empty) spot where the car was, the front cam looks back east.
    const spotZ = this._camMode === 'side' ? -2 : this._camMode === 'front' ? 4 : -26;

    if (kind === 'interstate') {
      this.interstate.visible = true;
      // The median guide sign reads only for the down-road cameras.
      if (this._camMode !== 'side' && this._camMode !== 'front') {
        this._flashProp(makeInterstateSign('INTERSTATE', 'WEST'), 24, -34);
      }
    } else if (kind === 'alive') {
      this._flashProp(makeHistoricSign(), 8.5, spotZ - 8);
    } else {
      // A building flash: raise the set piece where the camera looks, already dead.
      const factory = { motel: makeMotorCourt, ghost: makeTownStrip, neon: makeNeonMotel, roys: makeRoys }[kind];
      if (factory) {
        this.flashPiece = this._place(factory(), kind === 'ghost' ? 24 : 18, spotZ, -Math.PI / 2);
        this.flashPiece.userData.setEra('present');
      }
    }
  }

  // ...and the cut home: 1957 floods back in, and whatever stood dead beside
  // us is suddenly alive, lit, open for business. Then we drive away from it.
  _flashBack() {
    this.era = 'past';
    this.speedTarget = CRUISE;
    this.car.visible = true;
    this.sky.setPresent(false);
    this.road.userData.setEra('past');
    this.interstate.visible = false;
    this._flashExtra?.removeFromParent();
    this._flashExtra = null;
    for (const o of this.world.children) o.userData.setEra?.('past');
    this.flashPiece = null;
    this.flashKind = null;
  }

  _flashProp(obj, x, z) {
    this._flashExtra?.removeFromParent();
    this._flashExtra = this._place(obj, x, z);
  }

  // --------------------------------------------------------------- ambient --

  _ambientSpawns(dz) {
    const d = DRESSING[this.stateId];
    this._odometer += dz;

    // Telephone poles: the road's metronome, staggered on both shoulders.
    if (this._odometer >= this._nextPole) {
      this._nextPole += 42;
      const side = (this._nextPole / 42) % 2 === 0 ? 1 : -1;
      this._place(makePole(), side * 9.5, SPAWN_Z);
    }
    // A US 66 shield every quarter mile, like clockwork.
    if (this._odometer >= this._nextShield) {
      this._nextShield += 380;
      this._place(makeShield(), 8.2, SPAWN_Z);
    }
    // Near scatter from the state's recipe.
    if (this._odometer >= this._nextNear) {
      this._nextNear += 26 + this.rng() * 30;
      const kind = d.near[(this.rng() * d.near.length) | 0];
      const side = this.rng() < 0.5 ? -1 : 1;
      const prop = PROPS[kind](this.rng);
      this._place(prop, side * (16 + this.rng() * 46), SPAWN_Z, this.rng() * Math.PI * 2);
      if (prop.userData.rotor) (this._spinners ??= new Set()).add(prop);
    }
    // Far horizon pieces (hills, mesas, derricks) on their own cadence.
    if (d.farEvery && this._odometer >= this._nextFar) {
      this._nextFar += d.farEvery + this.rng() * d.farEvery;
      const kind = d.far[(this.rng() * d.far.length) | 0];
      const side = this.rng() < 0.5 ? -1 : 1;
      this._place(PROPS[kind](this.rng), side * (90 + this.rng() * 160), SPAWN_Z - this.rng() * 200);
    }
  }

  // ---------------------------------------------------------------- update --

  update(dt) {
    if (!this.ready) return;
    this._t += dt;

    this.speed += (this.speedTarget - this.speed) * Math.min(1, dt * 1.6);
    const dz = this.speed * dt;

    // Day drifts toward the cue's time of day.
    this._time += (this._timeTarget - this._time) * Math.min(1, dt * 0.4);
    if (this.era === 'past') this.sky.setTime(this._time);
    this.sky.follow(this.camera);
    // Dusk chapter: the Bel Air's lights come on.
    this.car.userData.setLights(this._time > 0.4);

    // The world streams past.
    this.road.userData.scroll(dz);
    for (let i = this.world.children.length - 1; i >= 0; i--) {
      const o = this.world.children[i];
      o.position.z += dz;
      if (o.position.z > (o.userData.despawnZ ?? DESPAWN_Z)) {
        this._spinners?.delete(o);
        this.world.remove(o);
        o.traverse((n) => {
          n.geometry?.dispose?.();
          // Only dispose textured materials — those are always per-spawn canvas
          // textures. Untextured materials may be module-shared (post wood, steel).
          const mats = Array.isArray(n.material) ? n.material : n.material ? [n.material] : [];
          for (const m of mats) if (m.map?.isTexture) { m.map.dispose(); m.dispose(); }
        });
      }
    }
    if (this.speed > 0.1) this._ambientSpawns(dz);
    if (this._spinners) for (const w of this._spinners) w.userData.rotor.rotation.z += dt * 2.4;

    // Ground and horizon ease between states as the line is crossed.
    this.ground.material.color.lerp(this._groundTarget, Math.min(1, dt * 0.5));
    this.sky.setTint(this.sky.tint.lerp(this._tintTarget, Math.min(1, dt * 0.5)));

    this.car.userData.setSpeed(this.speed);
    this.car.userData.update(dt, this._t);
    if (this.interstate.visible) this.interstate.userData.update(dt);

    this._driveCamera(dt);
  }

  _driveCamera() {
    // The present is a photograph: while flashed forward the camera holds
    // perfectly still — same position, same framing, different decade.
    if (this.era === 'present') return;
    const sway = Math.sin(this._t * 0.5) * 0.35;
    const bob = Math.sin(this._t * 1.7) * 0.05;
    let pos, look;
    switch (this._camMode) {
      case 'side':
        pos = new THREE.Vector3(-7 + sway * 0.4, 2.0 + bob, -7.5);
        look = new THREE.Vector3(CAR_X + 1, 1.1, 1.0);
        break;
      case 'front':
        pos = new THREE.Vector3(CAR_X - 2.4 + sway * 0.3, 1.25 + bob, -12);
        look = new THREE.Vector3(CAR_X + 0.6, 1.1, 10);
        break;
      case 'wide':
        pos = new THREE.Vector3(CAR_X + 18 + sway, 24, 30);
        look = new THREE.Vector3(CAR_X - 4, 0, -90);
        break;
      case 'signview':
        pos = new THREE.Vector3(7.2 + sway * 0.3, 2.3 + bob, -20);
        look = new THREE.Vector3(CAR_X - 2, 1.5, -60);
        break;
      default: // chase
        pos = new THREE.Vector3(CAR_X + 2.6 + sway, 2.7 + bob, 14);
        look = new THREE.Vector3(CAR_X - 0.6, 1.3, -40);
    }
    this.camera.position.lerp(pos, 0.06);
    const cur = new THREE.Vector3();
    this.camera.getWorldDirection(cur);
    this.camera.lookAt(look);
  }

  dispose() {
    this.sky?.dispose();
    this.scene.traverse((o) => { o.geometry?.dispose?.(); if (o.material?.dispose) o.material.dispose(); });
  }
}
