import * as THREE from 'three';
import { makeGenome } from './genome.js';
import { SpeciesRig, headingQuat } from './rig.js';

// Wildlife for a Surface patch — the manager and the two behaviour families.
//
// Same contract as Flora: built from the World's forked rng so a seed always
// hatches the same animals in the same places, updated on the Stage's fixed
// timestep so frame N of a shot is always the same frame. Behaviours consume
// their per-agent rng streams in a fixed order per tick, which keeps even the
// "random" wander deterministic.
//
// Two families cover every role in biomes.js:
//   Flock       - air. Classic boids over the terrain, altitude-sprung.
//   GroundBand  - ground. One state machine (amble/pause/graze) tuned three
//                 ways: herd (loose, grazes), swarm (tight, twitchy, never
//                 still), solitary (each agent alone in its own territory).

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _m = new THREE.Matrix4();

class Population {
  constructor(genome, rig, count) {
    this.genome = genome;
    this.rig = rig;
    this.group = new THREE.Group();
    this.group.name = `fauna:${genome.species}`;
    this.agents = [];
    this.count = count;

    this.meshes = new Map();
    for (const part of rig.parts) {
      const mesh = new THREE.InstancedMesh(part.geometry, part.material, count * part.perAgent);
      // Agents roam the whole patch; per-mesh bounds would cull the batch the
      // moment its origin left frame. Same reasoning as Flora.
      mesh.frustumCulled = false;
      mesh.castShadow = true;
      mesh.name = `fauna:${genome.species}:${part.key}`;
      this.meshes.set(part.key, { mesh, perAgent: part.perAgent });
      this.group.add(mesh);
    }
  }

  /** Write every agent's pose into the instance buffers. */
  writePoses() {
    for (let i = 0; i < this.agents.length; i++) {
      const agent = this.agents[i];
      this.rig.pose(agent, (key, sub, matrix) => {
        const entry = this.meshes.get(key);
        entry.mesh.setMatrixAt(i * entry.perAgent + sub, matrix);
      });
    }
    for (const { mesh } of this.meshes.values()) mesh.instanceMatrix.needsUpdate = true;
  }

  /** Park unused capacity at zero scale (agents can be fewer than capacity). */
  hideFrom(index) {
    _m.makeScale(0, 0, 0);
    for (const { mesh, perAgent } of this.meshes.values()) {
      for (let i = index * perAgent; i < mesh.count; i++) mesh.setMatrixAt(i, _m);
    }
  }

  dispose() {
    for (const { mesh } of this.meshes.values()) mesh.dispose();
    this.rig.dispose();
    this.group.clear();
  }
}

// ---------------------------------------------------------------------------

class Flock extends Population {
  constructor(genome, rig, surface, rng) {
    const count = Math.min(genome.count, 120); // matrices are cheap; overdraw isn't
    super(genome, rig, count);
    this.surface = surface;

    // The flock lives around an anchor near the landing site — the shot is at
    // the origin, so that's where the sky should be alive.
    this.anchor = new THREE.Vector3(rng.range(-250, 250), 0, rng.range(-250, 250));
    this.cruise = rng.range(35, 90); // metres above ground
    this.range = 420;

    for (let i = 0; i < count; i++) {
      const pos = new THREE.Vector3(
        this.anchor.x + rng.range(-60, 60),
        0,
        this.anchor.z + rng.range(-60, 60),
      );
      pos.y = surface.heightAt(pos.x, pos.z) + this.cruise + rng.range(-15, 15);
      const heading = rng.range(0, Math.PI * 2);
      this.agents.push({
        pos,
        vel: new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading)).multiplyScalar(genome.flySpeed * 0.6),
        quat: new THREE.Quaternion(),
        flapPhase: rng.range(0, Math.PI * 2),
        gaitPhase: 0, stride: 0, nod: 0,
      });
    }
    this.hideFrom(count);
  }

  update(dt) {
    const G = this.genome;
    const agents = this.agents;
    const sepR = 4 * G.size, sepR2 = sepR * sepR;
    const neighR2 = 30 * 30;
    const vmax = G.flySpeed, vmin = G.flySpeed * 0.35;

    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];
      let cx = 0, cy = 0, cz = 0, ax = 0, ay = 0, az = 0, n = 0;
      _v.set(0, 0, 0); // separation

      for (let j = 0; j < agents.length; j++) {
        if (j === i) continue;
        const b = agents[j];
        const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y, dz = b.pos.z - a.pos.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > neighR2) continue;
        cx += b.pos.x; cy += b.pos.y; cz += b.pos.z;
        ax += b.vel.x; ay += b.vel.y; az += b.vel.z;
        n++;
        if (d2 < sepR2 && d2 > 1e-6) {
          const w = 1 / d2;
          _v.x -= dx * w; _v.y -= dy * w; _v.z -= dz * w;
        }
      }

      _v2.set(0, 0, 0);
      if (n > 0) {
        _v2.x = (cx / n - a.pos.x) * 0.15 + (ax / n - a.vel.x) * 0.5;
        _v2.y = (cy / n - a.pos.y) * 0.15 + (ay / n - a.vel.y) * 0.5;
        _v2.z = (cz / n - a.pos.z) * 0.15 + (az / n - a.vel.z) * 0.5;
      }
      _v2.addScaledVector(_v, 12 * G.size * G.size);

      // Leash to the anchor, spring to cruise altitude above the real terrain.
      const ox = this.anchor.x - a.pos.x, oz = this.anchor.z - a.pos.z;
      const od = Math.hypot(ox, oz);
      if (od > this.range) {
        const w = (od - this.range) * 0.01;
        _v2.x += ox / od * w * vmax; _v2.z += oz / od * w * vmax;
      }
      const groundY = this.surface.heightAt(a.pos.x, a.pos.z);
      _v2.y += (groundY + this.cruise - a.pos.y) * 0.4 - a.vel.y * 0.8;

      a.vel.addScaledVector(_v2, dt);
      const speed = a.vel.length();
      if (speed > vmax) a.vel.multiplyScalar(vmax / speed);
      else if (speed < vmin && speed > 1e-4) a.vel.multiplyScalar(vmin / speed);
      a.pos.addScaledVector(a.vel, dt);

      // Climbing costs wingbeats; diving is a glide.
      const climb = Math.max(0, a.vel.y) / vmax;
      a.flapPhase += dt * Math.PI * 2 * G.flapHz * (0.7 + 1.1 * climb);
      headingQuat(a.quat, a.vel);
    }
    this.writePoses();
  }
}

// ---------------------------------------------------------------------------

const BAND_TUNING = {
  herd:     { spread: 60,  leash: 130, grazeP: 0.55, pauseMin: 2.5, pauseMax: 7, speedLo: 0.4, speedHi: 1.0, turn: 0.5 },
  swarm:    { spread: 22,  leash: 60,  grazeP: 0.1,  pauseMin: 0.4, pauseMax: 1.6, speedLo: 0.8, speedHi: 1.6, turn: 2.2 },
  solitary: { spread: 300, leash: 160, grazeP: 0.35, pauseMin: 3,   pauseMax: 9, speedLo: 0.3, speedHi: 0.7, turn: 0.35 },
};

class GroundBand extends Population {
  constructor(genome, rig, surface, rng) {
    const count = Math.min(genome.count, 60);
    super(genome, rig, count);
    this.surface = surface;
    this.tune = BAND_TUNING[genome.role] ?? BAND_TUNING.herd;
    this.seaLocal = surface.bounds.seaLevelLocal;

    // Find dry, walkable ground for the band's anchor — or per-agent anchors
    // for solitary animals, which want distance from each other, not company.
    const anchorFor = (minR, maxR) => {
      for (let tries = 0; tries < 60; tries++) {
        const t = rng.range(0, Math.PI * 2);
        const r = rng.range(minR, maxR);
        const x = Math.sin(t) * r, z = Math.cos(t) * r;
        if (surface.heightAt(x, z) > this.seaLocal + 4) return new THREE.Vector3(x, 0, z);
      }
      return new THREE.Vector3(0, 0, 0); // the landing site is dry by construction
    };
    this.anchor = genome.role === 'solitary' ? null : anchorFor(80, 450);

    for (let i = 0; i < count; i++) {
      const home = this.anchor ?? anchorFor(120, 800);
      const x = home.x + rng.range(-this.tune.spread, this.tune.spread);
      const z = home.z + rng.range(-this.tune.spread, this.tune.spread);
      this.agents.push({
        pos: new THREE.Vector3(x, 0, z),
        quat: new THREE.Quaternion(),
        home,
        heading: rng.range(0, Math.PI * 2),
        speed: 0, targetSpeed: 0,
        timer: rng.range(0, 2),
        gaitPhase: rng.range(0, Math.PI * 2),
        flapPhase: 0, stride: 0,
        nod: 0, nodTarget: 0,
        rng: rng.fork(`agent:${i}`),
      });
    }
    this.hideFrom(count);
  }

  update(dt) {
    const G = this.genome;
    const T = this.tune;
    const agents = this.agents;
    const sepR = 2.4 * G.size, sepR2 = sepR * sepR;

    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];

      // State machine: every few seconds pick a new intent.
      a.timer -= dt;
      if (a.timer <= 0) {
        if (a.rng.bool(T.grazeP)) {
          a.targetSpeed = 0;
          a.nodTarget = 0.8;
        } else {
          a.targetSpeed = G.walkSpeed * a.rng.range(T.speedLo, T.speedHi);
          a.nodTarget = 0;
          a.heading += a.rng.range(-1.2, 1.2);
        }
        a.timer = a.rng.range(T.pauseMin, T.pauseMax);
      }
      a.heading += a.rng.range(-1, 1) * T.turn * dt;

      // Stay out of the water and on the leash.
      const hx = a.home.x - a.pos.x, hz = a.home.z - a.pos.z;
      const hd = Math.hypot(hx, hz);
      const homeAngle = Math.atan2(hx, hz);
      if (hd > T.leash) {
        const drift = homeAngle - a.heading;
        a.heading += Math.atan2(Math.sin(drift), Math.cos(drift)) * Math.min(1, dt * 2);
      }
      const groundY = this.surface.heightAt(a.pos.x, a.pos.z);
      if (groundY < this.seaLocal + 2.5) {
        a.heading = homeAngle; // straight back inland
        a.targetSpeed = Math.max(a.targetSpeed, G.walkSpeed * 0.8);
      }

      // Personal space — position push, not a steering debate.
      for (let j = i + 1; j < agents.length; j++) {
        const b = agents[j];
        const dx = a.pos.x - b.pos.x, dz = a.pos.z - b.pos.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < sepR2 && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const push = (sepR - d) * 0.5;
          const nx = dx / d, nz = dz / d;
          a.pos.x += nx * push * dt * 4; a.pos.z += nz * push * dt * 4;
          b.pos.x -= nx * push * dt * 4; b.pos.z -= nz * push * dt * 4;
        }
      }

      a.speed += (a.targetSpeed - a.speed) * Math.min(1, dt * 2.5);
      a.pos.x += Math.sin(a.heading) * a.speed * dt;
      a.pos.z += Math.cos(a.heading) * a.speed * dt;

      const walking = G.walkSpeed > 0 ? Math.min(1.2, a.speed / G.walkSpeed) : 0;
      a.stride = Math.min(1, walking);
      a.gaitPhase += dt * Math.PI * 2 * G.gaitHz * walking;
      a.nod += (a.nodTarget - a.nod) * Math.min(1, dt * 3);

      // Feet on the real ground, hips at genome height, a bounce the planet's
      // gravity allows. Slope tilt comes from the mesher's own normal.
      const y = this.surface.heightAt(a.pos.x, a.pos.z);
      a.pos.y = y + G.hipHeight + G.bounce * Math.abs(Math.sin(a.gaitPhase)) * a.stride;

      const nrm = this.surface.normalAt(a.pos.x, a.pos.z, 1.5);
      _v2.set(nrm.x, nrm.y, nrm.z).lerp(_v.set(0, 1, 0), 0.55).normalize();
      _v.set(Math.sin(a.heading), 0, Math.cos(a.heading));
      headingQuat(a.quat, _v, _v2);
    }
    this.writePoses();
  }
}

// ---------------------------------------------------------------------------

export class Fauna {
  /**
   * @param {import('../world/World.js').World} world
   * @param {import('../surface/Surface.js').Surface} surface
   */
  constructor(world, surface) {
    this.world = world;
    this.surface = surface;
    this.group = new THREE.Group();
    this.group.name = 'fauna';
    this.populations = [];
  }

  /** Hatch every species the world rolled. Returns the number of animals. */
  populate() {
    const rng = this.world.rng.fork('fauna');
    let total = 0;

    for (const spec of this.world.fauna) {
      if (spec.count < 1) continue;
      const srng = rng.fork(spec.species);
      const genome = makeGenome(this.world, spec, srng);

      // A flier spec on a world with no meaningful air is a contradiction the
      // genome flags rather than draws — the species simply never took wing.
      if (!genome.canFly) continue;

      const rig = new SpeciesRig(genome, srng);
      const Pop = genome.domain === 'air' ? Flock : GroundBand;
      const pop = new Pop(genome, rig, this.surface, srng);
      pop.writePoses(); // valid first frame even before update runs
      this.populations.push(pop);
      this.group.add(pop.group);
      total += pop.agents.length;
    }
    return total;
  }

  update(dt) {
    for (const pop of this.populations) {
      if (pop.group.visible) pop.update(dt);
    }
  }

  /**
   * Deep-time dial. Before era 4 nothing moves; era 4 shows only the first
   * movers (the swarm on the ground, the flock in the air, per the episode's
   * choreography); era 5 is the full roster. Hidden populations also skip
   * their behaviour update, which is a real perf win in the early acts.
   */
  setEra(era) {
    for (const pop of this.populations) {
      const firstMover = pop.genome.role === 'swarm' || pop.genome.domain === 'air';
      pop.group.visible = era >= 5 || (era === 4 && firstMover);
    }
  }

  /** Species roster for the HUD. */
  stats() {
    return this.populations.map((p) => ({
      species: p.genome.species,
      count: p.agents.length,
      domain: p.genome.domain,
    }));
  }

  dispose() {
    for (const pop of this.populations) pop.dispose();
    this.group.clear();
  }
}
