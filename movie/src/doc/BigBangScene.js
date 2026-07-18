import * as THREE from 'three';
import { makeRng, hashSeed } from '../core/rng.js';

// The cosmology stage, rebuilt to be what the narration promises: one universe,
// THIS universe. Everything visual derives from the cosmos' seed — the shape and
// lean of the primordial cloud, its spin, the filaments matter collapses into,
// where and how many supernovae detonate (one per stellar generation the seed
// actually rolled), and the colours enrichment seeds into the dark, tinted by
// the universe's own dominant elements. Two seeds, two different Big Bangs.
//
// It is also built around EVENTS, not eases. The bang is a detonation — white-out,
// shockwave, camera kick — recombination is a visible clearing, first stars pop on
// one by one, and every supernova is a flash with an expanding shell. The eases
// remain underneath (the universe still evolves between events), but the moments
// the narration names are moments on screen.
//
// All particle motion runs in the vertex shader; the CPU only animates a handful
// of uniforms, so the count can be high enough to read as a universe.

const COUNT = 60000;
const CLUMPS = 14; // filament anchor points matter collapses toward

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uRadius;
  uniform float uChurn;
  uniform float uTemp;
  uniform float uStars;
  uniform float uStructure;
  uniform float uEnrich;
  uniform float uFlash;
  uniform vec3 uHot;
  uniform vec3 uWarm;
  uniform vec3 uCool;
  uniform vec3 uStarC;
  uniform vec3 uPal0;
  uniform vec3 uPal1;
  uniform vec3 uPal2;

  attribute vec3 aDir;      // stable expansion ray
  attribute vec3 aClump;    // filament target (unit-ish direction * radius factor)
  attribute float aRfac;    // per-particle radius factor (denser toward centre)
  attribute float aPhase;   // churn phase offset
  attribute float aStarRand;// threshold vs uStars: below it, this particle is a star
  attribute float aSize;
  attribute float aTint;    // which enrichment colour this particle takes

  varying vec3 vColor;
  varying float vCore;

  void main() {
    // Expansion: every particle rides its own ray out as the universe grows.
    float jitter = uChurn * sin(uTime * 0.8 + aPhase) * 2.0;
    vec3 pos = aDir * (uRadius * aRfac + jitter);

    // Churn: tangential swirl so a hot universe boils instead of breathing.
    vec3 tang = normalize(cross(aDir, vec3(0.21, 1.0, 0.34)) + vec3(1e-4));
    pos += tang * uChurn * sin(uTime * 1.7 + aPhase * 2.3) * 1.8;
    pos += cross(aDir, tang) * uChurn * cos(uTime * 1.3 + aPhase * 3.1) * 1.2;

    // Structure: gravity. Particles slide off their rays toward their filament,
    // staggered per-particle so collapse sweeps through the cloud.
    float fall = uStructure * smoothstep(0.0, 1.0, uStructure * 1.4 - fract(aPhase * 0.159) * 0.4);
    pos = mix(pos, aClump * uRadius, clamp(fall, 0.0, 0.85));

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);

    // --- Colour ---
    // Temperature: blue-white heat down through amber to deep red.
    vec3 col;
    if (uTemp > 0.5) col = mix(uWarm, uHot, (uTemp - 0.5) * 2.0);
    else col = mix(uCool, uWarm, uTemp * 2.0);

    // Enrichment: supernova ejecta seed the cloud with this universe's own
    // elements — each particle takes one of the three dominant tints.
    vec3 pal = aTint < 0.34 ? uPal0 : (aTint < 0.67 ? uPal1 : uPal2);
    float enr = uEnrich * (0.35 + 0.65 * fract(aPhase * 0.618));
    col = mix(col, pal, clamp(enr, 0.0, 0.9));

    // Stars: once uStars passes this particle's threshold it ignites — with a
    // flare that spikes at the moment of crossing and settles to a twinkle.
    float lit = step(aStarRand, uStars);
    float flare = lit * (2.6 * exp(-16.0 * max(uStars - aStarRand, 0.0)));
    float tw = 0.65 + 0.35 * sin(uTime * 3.0 + aPhase * 7.0);
    col = mix(col, uStarC * (tw + flare), lit * 0.9);

    // Flash: an event whiting out the frame (bang, supernova).
    col += vec3(uFlash);

    vColor = col;
    vCore = aRfac; // fragment uses this to brighten the dense core

    float size = aSize * (1.0 + flare * 1.6 + uFlash * 1.2);
    gl_PointSize = size * (320.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vCore;
  void main() {
    vec2 d = gl_PointCoord - vec2(0.5);
    float r = length(d);
    if (r > 0.5) discard;
    float a = smoothstep(0.5, 0.0, r);
    // Hot centre in every particle sprite; reads as gas, not confetti.
    float core = 1.0 + (1.0 - smoothstep(0.0, 0.18, r)) * 0.8;
    gl_FragColor = vec4(vColor * core, a * (0.55 + 0.45 * (1.0 - vCore)));
  }
`;

// Base phase table — the SHAPE of the story (it must still expand, cool, clear,
// ignite). Every number gets a seeded jitter at construction so the pacing and
// look differ per universe. structure = how collapsed into filaments.
const BASE_PHASES = {
  void:            { radius: 0.5,  temp: 1.0,  churn: 0.15, spin: 0.02,  stars: 0,    structure: 0,    enrich: 0 },
  bang:            { radius: 9,    temp: 1.0,  churn: 3.2,  spin: 0.12,  stars: 0,    structure: 0,    enrich: 0 },
  firstmatter:     { radius: 17,   temp: 0.8,  churn: 1.6,  spin: 0.06,  stars: 0,    structure: 0,    enrich: 0 },
  nucleosynthesis: { radius: 23,   temp: 0.65, churn: 1.0,  spin: 0.05,  stars: 0,    structure: 0,    enrich: 0 },
  fog:             { radius: 29,   temp: 0.5,  churn: 0.55, spin: 0.04,  stars: 0,    structure: 0,    enrich: 0 },
  recombination:   { radius: 35,   temp: 0.35, churn: 0.3,  spin: 0.025, stars: 0,    structure: 0.05, enrich: 0 },
  structure:       { radius: 41,   temp: 0.28, churn: 0.22, spin: 0.022, stars: 0.15, structure: 0.5,  enrich: 0 },
  firststars:      { radius: 47,   temp: 0.3,  churn: 0.16, spin: 0.018, stars: 0.5,  structure: 0.6,  enrich: 0 },
  fusion:          { radius: 51,   temp: 0.34, churn: 0.16, spin: 0.018, stars: 0.7,  structure: 0.62, enrich: 0.1 },
  supernova:       { radius: 56,   temp: 0.5,  churn: 0.7,  spin: 0.024, stars: 0.8,  structure: 0.58, enrich: 0.55 },
  enrich:          { radius: 62,   temp: 0.32, churn: 0.2,  spin: 0.015, stars: 1.0,  structure: 0.65, enrich: 1.0 },
};

// What each element's glow looks like when it seeds a nebula. Impressionistic,
// but stable: a carbon-rich universe always runs amber, an oxygen-rich one ice.
const ELEMENT_TINTS = {
  O: 0x7fd4ff, C: 0xffb46a, Fe: 0xff6a4d, Si: 0xe8d9a0, Mg: 0x8affc0,
  N: 0x9a7bff, S: 0xfff06a, Ne: 0xff4d6b, Na: 0xffa03c, Al: 0xcfd8e8,
  Ca: 0xf0eaff, Ni: 0xc9f2dd, K: 0xd8a0ff, Ti: 0xb8c8ff, P: 0x86ffd9,
  Cl: 0xb0ff9a, H: 0xbfd4ff, He: 0xffeecc, Ar: 0xa8b8ff,
};

const MAX_SHOCKS = 12;

export class BigBangScene {
  /** @param {import('../cosmos/Cosmos.js').Cosmos} cosmos */
  constructor(cosmos) {
    this.cosmos = cosmos;
    const rng = makeRng(hashSeed('bigbang:' + cosmos.seed));
    this.rng = rng;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x02030a);
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 5000);
    this.bloom = { strength: 0.7, radius: 0.75, threshold: 0.0 };

    // --- Seeded identity of this universe's look -------------------------------
    // The three dominant heavy elements pick the enrichment palette.
    const heavies = cosmos.budget.fractions.filter((f) => !['H', 'He'].includes(f.sym)).slice(0, 3);
    this.palette = heavies.map((f) => new THREE.Color(ELEMENT_TINTS[f.sym] ?? 0xbfd4ff));
    while (this.palette.length < 3) this.palette.push(new THREE.Color(0xbfd4ff));

    // Jitter every phase so no two universes share pacing or scale.
    this.phases = {};
    for (const [name, p] of Object.entries(BASE_PHASES)) {
      this.phases[name] = {
        radius: p.radius * rng.range(0.85, 1.25),
        temp: Math.min(1, p.temp * rng.range(0.92, 1.08)),
        churn: p.churn * rng.range(0.7, 1.5),
        spin: p.spin * rng.range(0.6, 1.7),
        stars: p.stars,
        structure: p.structure * rng.range(0.85, 1.15),
        enrich: p.enrich,
      };
    }
    this._spinSign = rng.bool() ? 1 : -1;

    // The cloud leans: a seeded anisotropy so expansion isn't a perfect ball.
    const lean = rng.onSphere();
    const leanAmt = rng.range(0.12, 0.42);

    // Filament skeleton: pairs of anchor points; matter collapses toward the
    // lines between them. This is what "structure" looks like per seed.
    const anchors = [];
    for (let i = 0; i < CLUMPS; i++) {
      const d = rng.onSphere();
      const r = rng.range(0.3, 1.05);
      anchors.push(new THREE.Vector3(d.x * r, d.y * r, d.z * r));
    }

    this.target = { ...this.phases.void };
    this.current = { ...this.phases.void };
    this._t = 0;

    // --- Particle attributes ---------------------------------------------------
    const positions = new Float32Array(COUNT * 3); // unused; shader owns position
    const dirs = new Float32Array(COUNT * 3);
    const clumps = new Float32Array(COUNT * 3);
    const rfac = new Float32Array(COUNT);
    const phase = new Float32Array(COUNT);
    const starRand = new Float32Array(COUNT);
    const sizes = new Float32Array(COUNT);
    const tint = new Float32Array(COUNT);

    const a = new THREE.Vector3(), b = new THREE.Vector3(), pnt = new THREE.Vector3();
    for (let i = 0; i < COUNT; i++) {
      const d = rng.onSphere();
      // Anisotropy: stretch along the lean axis.
      const dot = d.x * lean.x + d.y * lean.y + d.z * lean.z;
      const stretch = 1 + leanAmt * dot * dot * 2;
      dirs[i * 3] = d.x * stretch;
      dirs[i * 3 + 1] = d.y * stretch;
      dirs[i * 3 + 2] = d.z * stretch;

      rfac[i] = 0.12 + Math.pow(rng(), 0.55); // denser toward centre
      phase[i] = rng.range(0, Math.PI * 2);
      starRand[i] = rng();
      sizes[i] = 1.0 + Math.pow(rng(), 2.0) * 2.2;
      tint[i] = rng();

      // Filament target: a point along the line between two anchors, plus a
      // little scatter so filaments have thickness.
      a.copy(rng.pick(anchors));
      b.copy(rng.pick(anchors));
      pnt.lerpVectors(a, b, rng()).multiplyScalar(1.0);
      const s = rng.onSphere();
      const th = rng.range(0, 0.08);
      clumps[i * 3] = pnt.x + s.x * th;
      clumps[i * 3 + 1] = pnt.y + s.y * th;
      clumps[i * 3 + 2] = pnt.z + s.z * th;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aDir', new THREE.BufferAttribute(dirs, 3));
    geo.setAttribute('aClump', new THREE.BufferAttribute(clumps, 3));
    geo.setAttribute('aRfac', new THREE.BufferAttribute(rfac, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    geo.setAttribute('aStarRand', new THREE.BufferAttribute(starRand, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aTint', new THREE.BufferAttribute(tint, 1));
    // The shader positions everything; make sure nothing gets culled.
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10000);
    this.geo = geo;

    this.uniforms = {
      uTime: { value: 0 },
      uRadius: { value: this.current.radius },
      uChurn: { value: this.current.churn },
      uTemp: { value: this.current.temp },
      uStars: { value: 0 },
      uStructure: { value: 0 },
      uEnrich: { value: 0 },
      uFlash: { value: 0 },
      uHot: { value: new THREE.Color(0xbfd4ff) },
      uWarm: { value: new THREE.Color(0xffd9a0) },
      uCool: { value: new THREE.Color(0x8a2b1a) },
      uStarC: { value: new THREE.Color(0xfff4e0) },
      uPal0: { value: this.palette[0] },
      uPal1: { value: this.palette[1] },
      uPal2: { value: this.palette[2] },
    };

    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, this.material);
    this.scene.add(this.points);

    // --- Shockwave rings (bang + supernovae), pooled ---------------------------
    this.shocks = [];
    for (let i = 0; i < MAX_SHOCKS; i++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.86, 1.0, 72),
        new THREE.MeshBasicMaterial({
          color: 0xffffff, transparent: true, opacity: 0,
          side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
        }),
      );
      ring.visible = false;
      this.scene.add(ring);
      this.shocks.push({ mesh: ring, life: 0, speed: 0, maxLife: 1 });
    }

    // --- Events, flash, shake --------------------------------------------------
    this._events = [];   // { at: sceneTime, fn }
    this._flash = 0;
    this._shake = 0;

    // Seeded camera choreography: orbit direction/speed/elevation are this
    // universe's own. The camera never sits still.
    this._camAz = rng.range(0, Math.PI * 2);
    this._camSpeed = rng.range(0.025, 0.06) * (rng.bool() ? 1 : -1);
    this._camElev = rng.range(-8, 20);
    this._camBob = rng.range(2, 6);

    this._spin = 0;
    this._supernovaeFired = false;
  }

  /** Queue a one-off event at now + delay seconds. */
  _after(delay, fn) {
    this._events.push({ at: this._t + delay, fn });
  }

  _fireShock(pos, { speed = 26, life = 1.6, color = 0xffffff } = {}) {
    const s = this.shocks.find((x) => x.life <= 0);
    if (!s) return;
    s.mesh.position.copy(pos);
    s.mesh.scale.setScalar(0.6);
    s.mesh.material.color.set(color);
    s.mesh.material.opacity = 0.9;
    s.mesh.visible = true;
    s.life = life;
    s.maxLife = life;
    s.speed = speed;
  }

  /** The director calls this with a cue's phase name. */
  setPhase(name) {
    const p = this.phases[name];
    if (!p) return;
    this.target = { ...p };

    if (name === 'bang') {
      // The detonation. White-out, shockwave, camera kick.
      this._flash = Math.max(this._flash, 1.0);
      this._shake = Math.max(this._shake, 1.2);
      this._fireShock(new THREE.Vector3(0, 0, 0), { speed: 42, life: 2.2 });
      this._after(0.5, () => this._fireShock(new THREE.Vector3(0, 0, 0), { speed: 30, life: 1.8, color: 0xffe0b8 }));
    }

    if (name === 'recombination') {
      // The fog clears: one soft pulse, then a sudden gain in clarity — bloom
      // drops and the churn stills, so the cut to "transparent" is visible.
      this._flash = Math.max(this._flash, 0.35);
      this._after(0.9, () => { this.target.churn *= 0.4; });
    }

    if (name === 'firststars') {
      // Stars don't fade in as a group — the threshold sweeps and each one pops
      // (the shader flares each star at its own ignition moment).
      this._shake = Math.max(this._shake, 0.15);
    }

    if (name === 'supernova' && !this._supernovaeFired) {
      this._supernovaeFired = true;
      // One detonation per stellar generation this universe actually had.
      const n = this.cosmos.cloud.generations;
      const rng = this.rng;
      for (let i = 0; i < n; i++) {
        const delay = i === 0 ? 0.2 : 0.2 + (i / n) * 8.5 + rng.range(0, 0.7);
        this._after(delay, () => {
          const d = rng.onSphere();
          const r = this.current.radius * rng.range(0.35, 0.9);
          const pos = new THREE.Vector3(d.x * r, d.y * r, d.z * r);
          this._flash = Math.max(this._flash, rng.range(0.45, 0.85));
          this._shake = Math.max(this._shake, rng.range(0.3, 0.6));
          const tint = rng.pick(this.palette);
          this._fireShock(pos, { speed: rng.range(16, 30), life: rng.range(1.2, 2.0), color: tint });
          // Each blast seeds a step more colour into the cloud.
          this.uniforms.uEnrich.value = Math.min(1, this.uniforms.uEnrich.value + 0.9 / n);
        });
      }
    }
  }

  update(dt) {
    this._t += dt;

    // Run due events.
    if (this._events.length) {
      const due = this._events.filter((e) => e.at <= this._t);
      if (due.length) {
        this._events = this._events.filter((e) => e.at > this._t);
        for (const e of due) e.fn();
      }
    }

    // Ease evolving parameters toward their phase targets.
    const k = Math.min(1, dt * 0.9);
    for (const key of Object.keys(this.target)) {
      this.current[key] += (this.target[key] - this.current[key]) * k;
    }

    // Flash and shake decay fast — they are events, not states.
    this._flash = Math.max(0, this._flash - this._flash * dt * 3.2 - dt * 0.02);
    this._shake = Math.max(0, this._shake - this._shake * dt * 2.6);

    // Feed the shader.
    const u = this.uniforms;
    u.uTime.value = this._t;
    u.uRadius.value = this.current.radius;
    u.uChurn.value = this.current.churn;
    u.uTemp.value = this.current.temp;
    u.uStructure.value = this.current.structure;
    u.uFlash.value = this._flash;
    // Stars sweep slowly toward their target so ignitions stagger over seconds.
    u.uStars.value += (this.current.stars - u.uStars.value) * Math.min(1, dt * 0.35);
    // Enrichment only ratchets up (supernova events push it); ease the remainder.
    u.uEnrich.value += (Math.max(this.current.enrich, u.uEnrich.value) - u.uEnrich.value) * Math.min(1, dt * 0.3);

    // Cloud spin.
    this._spin += this.current.spin * this._spinSign * dt;
    this.points.rotation.y = this._spin;

    // Shockwaves expand and fade, always facing the camera.
    for (const s of this.shocks) {
      if (s.life <= 0) continue;
      s.life -= dt;
      const t = 1 - s.life / s.maxLife;
      s.mesh.scale.setScalar(0.6 + s.speed * t * s.maxLife);
      s.mesh.material.opacity = 0.9 * (1 - t) * (1 - t);
      s.mesh.lookAt(this.camera.position);
      if (s.life <= 0) s.mesh.visible = false;
    }

    // Camera: a seeded slow orbit that drifts outward as the universe grows,
    // with bob, plus shake on events. Never a locked-off frame.
    this._camAz += this._camSpeed * dt * (1 + this.current.churn * 0.12);
    const dist = 132 - Math.min(64, this.current.radius * 0.95);
    const bob = Math.sin(this._t * 0.31) * this._camBob;
    const sx = this._shake * Math.sin(this._t * 47.3) * 2.2;
    const sy = this._shake * Math.sin(this._t * 39.1 + 1.7) * 2.2;
    this.camera.position.set(
      Math.sin(this._camAz) * dist + sx,
      this._camElev + bob + sy,
      Math.cos(this._camAz) * dist,
    );
    this.camera.lookAt(sx * 0.4, sy * 0.4, 0);
  }

  dispose() {
    this.geo.dispose();
    this.material.dispose();
    for (const s of this.shocks) {
      s.mesh.geometry.dispose();
      s.mesh.material.dispose();
    }
  }
}
