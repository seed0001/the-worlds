import * as THREE from 'three';
import { makeGenome } from './genome.js';
import { ZONE_SITE } from './cast.js';
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
  constructor(genome, rig, surface, rng, opts = {}) {
    const count = Math.min(genome.count, 120); // matrices are cheap; overdraw isn't
    super(genome, rig, count);
    this.surface = surface;
    // Choreography state: an alarmed flock flies harder, higher, and with a
    // shared direction until the alarm decays.
    this.alarm = 0;
    this.alarmT = 1;
    this.alarmDir = new THREE.Vector3(1, 0, 0);

    // The flock lives around an anchor near its home ground — the landing site
    // by default, or a staged zone site when the episode places the cast.
    const origin = opts.origin ?? { x: 0, z: 0 };
    const spread = opts.near ? 110 : 250;
    this.anchor = new THREE.Vector3(
      origin.x + rng.range(-spread, spread),
      0,
      origin.z + rng.range(-spread, spread),
    );
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

  /** Escape burst: the whole flock leaves as one body, biased along `dir`. */
  startle(dir, duration = 7) {
    this.alarm = this.alarmT = duration;
    if (dir && dir.lengthSq() > 1e-6) this.alarmDir.copy(dir).setY(0).normalize();
  }

  /** The day winds down: drop the alarm and let the leash bring them home. */
  calm() {
    this.alarm = 0;
  }

  update(dt) {
    const G = this.genome;
    const agents = this.agents;
    const sepR = 4 * G.size, sepR2 = sepR * sepR;
    const neighR2 = 30 * 30;
    if (this.alarm > 0) this.alarm = Math.max(0, this.alarm - dt);
    const urgency = this.alarm > 0 ? this.alarm / this.alarmT : 0;
    const vmax = G.flySpeed * (1 + urgency * 0.9), vmin = G.flySpeed * 0.35;

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

      // Alarm: one shared impulse — up off the water and away — that acts on
      // every bird at once, which is exactly what an eruption looks like.
      if (urgency > 0) {
        _v2.addScaledVector(this.alarmDir, vmax * 2.2 * urgency);
        _v2.y += vmax * 0.8 * urgency;
      }

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
  constructor(genome, rig, surface, rng, opts = {}) {
    const count = Math.min(genome.count, 60);
    super(genome, rig, count);
    this.surface = surface;
    this.tune = BAND_TUNING[genome.role] ?? BAND_TUNING.herd;
    this.seaLocal = surface.bounds.seaLevelLocal;

    // Find dry, walkable ground for the band's anchor — or per-agent anchors
    // for solitary animals, which want distance from each other, not company.
    // Bands live around the landing site by default; a staged cast population
    // gets a zone site as its origin and keeps close to it, so the camera cue
    // that flies to the scrub finds the scrub's animals there.
    const origin = opts.origin ?? { x: 0, z: 0 };
    const bandR = opts.near ? [30, 160] : [80, 450];
    const soloR = opts.near ? [60, 320] : [120, 800];
    const anchorFor = (minR, maxR) => {
      for (let tries = 0; tries < 60; tries++) {
        const t = rng.range(0, Math.PI * 2);
        const r = rng.range(minR, maxR);
        const x = origin.x + Math.sin(t) * r, z = origin.z + Math.cos(t) * r;
        if (surface.heightAt(x, z) > this.seaLocal + 4) return new THREE.Vector3(x, 0, z);
      }
      return new THREE.Vector3(origin.x, 0, origin.z); // home ground is dry by construction
    };
    this.anchor = genome.role === 'solitary' ? null : anchorFor(bandR[0], bandR[1]);

    // Choreography state (see the episode-2 choreography doc): a panicking
    // band runs one way fast; a rushing hunter sprints at a live target; a
    // rising swarm spirals up a thermal column.
    this.panic = 0;
    this.panicHeading = 0;
    this.urgency = 2.2;
    this.rushTarget = null;
    this.liftHold = 0;
    this.lift = 0;

    for (let i = 0; i < count; i++) {
      const home = this.anchor ?? anchorFor(soloR[0], soloR[1]);
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

  /** Panic run: the whole band bolts along `dir`, fast, until it decays. */
  stampede(dir, duration = 8, urgency = 2.2) {
    this.panic = duration;
    this.urgency = urgency;
    this.rushTarget = null;
    if (dir && dir.lengthSq() > 1e-6) this.panicHeading = Math.atan2(dir.x, dir.z);
  }

  /** Predator commit: sprint at whatever `targetFn` returns, one rush, all in. */
  rush(targetFn, duration = 7) {
    this.rushTarget = targetFn;
    this.panic = duration;
    this.urgency = 2.8;
  }

  /** Thermal column: the swarm spirals up off the ground while this holds. */
  rise(duration = 10) {
    this.liftHold = duration;
  }

  /** The day winds down: stop, stand, graze. */
  calm() {
    this.panic = 0;
    this.rushTarget = null;
    this.liftHold = 0;
    for (const a of this.agents) {
      a.targetSpeed = 0;
      a.nodTarget = 0.8;
      a.timer = 6;
    }
  }

  update(dt) {
    const G = this.genome;
    const T = this.tune;
    const agents = this.agents;
    const sepR = 2.4 * G.size, sepR2 = sepR * sepR;

    if (this.panic > 0) this.panic = Math.max(0, this.panic - dt);
    this.liftHold = Math.max(0, this.liftHold - dt);
    this.lift += ((this.liftHold > 0 ? 1 : 0) - this.lift) * Math.min(1, dt * 0.5);
    const panicking = this.panic > 0;
    const target = panicking && this.rushTarget ? this.rushTarget() : null;

    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];

      if (panicking) {
        // Panic overrides deliberation: one heading, top speed, heads up.
        const want = target
          ? Math.atan2(target.x - a.pos.x, target.z - a.pos.z)
          : this.panicHeading + Math.sin(i * 3.1) * 0.35;
        const d = want - a.heading;
        a.heading += Math.atan2(Math.sin(d), Math.cos(d)) * Math.min(1, dt * 3);
        a.targetSpeed = G.walkSpeed * this.urgency;
        a.nodTarget = 0;
        a.timer = Math.max(a.timer, 0.5); // no idle re-rolls mid-panic
      }

      // State machine: every few seconds pick a new intent.
      a.timer -= dt;
      if (!panicking && a.timer <= 0) {
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

      // Stay out of the water and on the leash (panic outruns the leash —
      // a stampede goes the only way panic ever goes: forward).
      const hx = a.home.x - a.pos.x, hz = a.home.z - a.pos.z;
      const hd = Math.hypot(hx, hz);
      const homeAngle = Math.atan2(hx, hz);
      if (!panicking && hd > T.leash) {
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

      // Riding the thermal: the column lifts each agent to its own height and
      // swirls the band around its home point.
      if (this.lift > 1e-3) {
        a.pos.y += this.lift * (16 + 12 * Math.abs(Math.sin(i * 2.399)));
        const ang = Math.atan2(a.pos.x - a.home.x, a.pos.z - a.home.z);
        const want = ang + Math.PI * 0.55; // tangential, spiralling inward
        const d = want - a.heading;
        a.heading += Math.atan2(Math.sin(d), Math.cos(d)) * Math.min(1, dt * 2) * this.lift;
        a.targetSpeed = Math.max(a.targetSpeed, G.walkSpeed * 0.9 * this.lift);
      }

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

  /**
   * Hatch the patch. Returns the number of animals.
   *
   * Without `cast`: every species the world rolled, anchored around the
   * landing site — the free-roam behaviour.
   *
   * With `cast` ({ specs, gen, sites } — see fauna/cast.js): the populations
   * ARE Episode 2's principal cast. Each principal spawns from its zone-built
   * genome, anchored at its staged site, so the hot-stretched prowler stands
   * in the scrub and the cold-rounded pale grazer stands on the highland —
   * the exact bodies the narration describes, where it says they are. The
   * spawned populations are indexed in `this.cast` (A–F) for the director.
   */
  populate(cast = null) {
    const rng = this.world.rng.fork('fauna');
    let total = 0;

    if (cast) {
      this.sites = cast.sites;
      this.cast = {};
      const spawned = new Map(); // two principals naming one population share it
      for (const k of Object.keys(cast.specs)) {
        const spec = cast.specs[k];
        const genome = cast.gen[k];
        if (!spec || !genome || spec.count < 1 || !genome.canFly) continue;
        const siteKey = ZONE_SITE[k] ?? 'coast';
        const dupKey = `${spec.species}@${siteKey}`;
        if (spawned.has(dupKey)) { this.cast[k] = spawned.get(dupKey); continue; }
        const srng = rng.fork('cast:' + k);
        const rig = new SpeciesRig(genome, srng);
        const Pop = genome.domain === 'air' ? Flock : GroundBand;
        const site = cast.sites[siteKey] ?? cast.sites.coast;
        const pop = new Pop(genome, rig, this.surface, srng, { origin: site, near: true });
        pop.castKey = k;
        pop.writePoses();
        this.populations.push(pop);
        this.group.add(pop.group);
        this.cast[k] = pop;
        spawned.set(dupKey, pop);
        total += pop.agents.length;
      }
      return total;
    }

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
