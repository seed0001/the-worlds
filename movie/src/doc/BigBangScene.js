import * as THREE from 'three';
import { makeRng, hashSeed } from '../core/rng.js';

// The cosmology act as an actual shot list.
//
// The old version was one wide particle cloud whose numbers eased around for
// fifteen beats — which read as a firework that never changes. This version
// cuts. Every narration beat gets its own framed shot of the thing being
// described: the single point before the bang, macro close-ups of particle
// pairs flashing in and out of existence, nuclei visibly snapping together,
// the inside of a fog you can't see through, electrons spiralling onto atoms
// as the fog clears, one knot collapsing into the first star, the churning
// interior of that star while it fuses, the fusion flashes dying at iron, the
// collapse and detonation, and colour finally flooding a wide frame.
//
// The wide cosmos cloud still exists and still derives everything from the
// seed — it is simply no longer the only thing on screen. A CPU-choreographed
// macro particle cast plays the close-ups; sprite banks play fog and nebulae;
// a hero star plays ignition and death. The camera is cut per shot: close,
// inside, wide — never the same framing twice in a row.

const COUNT = 60000;
const CLUMPS = 14; // filament anchor points matter collapses toward
const MACRO = 420; // CPU-choreographed close-up particles
const MACRO_MAIN = 300; // the main cast; the rest are extras (electrons, sparks)
const MAX_SHOCKS = 12;
const FOGS = 26; // soft sprite banks: fog in act one, nebulae in the finale

const ss = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ---------------------------------------------------------------------------
// Wide cosmos cloud shader (the seeded universe, unchanged in spirit — plus
// uFade so shots can take the whole cloud off screen).
// ---------------------------------------------------------------------------

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
  varying float vDim;

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
    pos = mix(pos, aClump * uRadius, clamp(fall, 0.0, 0.92));

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

    // Web contrast: once gravity is winning, the haze that HASN'T fallen onto
    // a filament dims away, so the web reads as lines against dark instead of
    // a blob with lines hidden inside it. Applied to alpha as well as colour —
    // with additive blending, colour alone can't stop the stack saturating.
    float webDim = 1.0 - uStructure * 0.75 * (1.0 - smoothstep(0.25, 0.8, fall));
    col *= webDim;
    // Collapse concentrates the whole cloud into a few strands — cut alpha as
    // structure rises or the filaments burn white.
    webDim *= 1.0 - uStructure * 0.62;

    // Flash: an event whiting out the frame (bang, supernova).
    col += vec3(uFlash);

    vColor = col;
    vCore = aRfac; // fragment uses this to brighten the dense core
    vDim = webDim;

    float size = aSize * (1.0 + flare * 1.6 + uFlash * 1.2);
    gl_PointSize = size * (230.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform float uFade;
  varying vec3 vColor;
  varying float vCore;
  varying float vDim;
  void main() {
    vec2 d = gl_PointCoord - vec2(0.5);
    float r = length(d);
    if (r > 0.5) discard;
    float a = smoothstep(0.5, 0.0, r);
    // Hot centre in every particle sprite; reads as gas, not confetti. Alpha is
    // kept low: 60k additive sprites saturate to a white wall otherwise.
    float core = 1.0 + (1.0 - smoothstep(0.0, 0.18, r)) * 0.8;
    gl_FragColor = vec4(vColor * core, a * (0.14 + 0.12 * (1.0 - vCore)) * vDim * uFade);
  }
`;

// ---------------------------------------------------------------------------
// Macro cast shader — position/colour/size fed from the CPU every frame, so
// the close-ups can be choreographed like actors instead of eased like fields.
// ---------------------------------------------------------------------------

const M_VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3 aCol;
  varying vec3 vColor;
  void main() {
    vColor = aCol;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (340.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const M_FRAG = /* glsl */ `
  varying vec3 vColor;
  void main() {
    vec2 d = gl_PointCoord - vec2(0.5);
    float r = length(d);
    if (r > 0.5) discard;
    float a = smoothstep(0.5, 0.0, r);
    float core = 1.0 + (1.0 - smoothstep(0.0, 0.16, r)) * 1.4;
    gl_FragColor = vec4(vColor * core, a);
  }
`;

// Base phase table for the WIDE cloud — the shape of the story (it must still
// expand, cool, clear, ignite) even while close-up shots hide it, so that
// whenever the camera comes back wide the universe has kept growing. Every
// number gets a seeded jitter at construction.
const BASE_PHASES = {
  void:            { radius: 0.5,  temp: 1.0,  churn: 0.15, spin: 0.02,  stars: 0,    structure: 0,    enrich: 0 },
  point:           { radius: 0.5,  temp: 1.0,  churn: 0.15, spin: 0.02,  stars: 0,    structure: 0,    enrich: 0 },
  strain:          { radius: 0.5,  temp: 1.0,  churn: 0.2,  spin: 0.02,  stars: 0,    structure: 0,    enrich: 0 },
  bang:            { radius: 9,    temp: 1.0,  churn: 3.2,  spin: 0.12,  stars: 0,    structure: 0,    enrich: 0 },
  foam:            { radius: 14,   temp: 0.95, churn: 2.4,  spin: 0.08,  stars: 0,    structure: 0,    enrich: 0 },
  firstmatter:     { radius: 18,   temp: 0.8,  churn: 1.6,  spin: 0.06,  stars: 0,    structure: 0,    enrich: 0 },
  nucleosynthesis: { radius: 23,   temp: 0.65, churn: 1.0,  spin: 0.05,  stars: 0,    structure: 0,    enrich: 0 },
  inventory:       { radius: 26,   temp: 0.6,  churn: 0.8,  spin: 0.045, stars: 0,    structure: 0,    enrich: 0 },
  fog:             { radius: 29,   temp: 0.5,  churn: 0.55, spin: 0.04,  stars: 0,    structure: 0,    enrich: 0 },
  recombination:   { radius: 35,   temp: 0.35, churn: 0.3,  spin: 0.025, stars: 0,    structure: 0.05, enrich: 0 },
  structure:       { radius: 41,   temp: 0.28, churn: 0.22, spin: 0.022, stars: 0.12, structure: 0.7,  enrich: 0 },
  gravity:         { radius: 44,   temp: 0.26, churn: 0.2,  spin: 0.022, stars: 0.2,  structure: 0.95, enrich: 0 },
  firststars:      { radius: 47,   temp: 0.3,  churn: 0.16, spin: 0.018, stars: 0.55, structure: 1.0,  enrich: 0 },
  fusion:          { radius: 51,   temp: 0.34, churn: 0.16, spin: 0.018, stars: 0.7,  structure: 0.95, enrich: 0.1 },
  iron:            { radius: 53,   temp: 0.32, churn: 0.16, spin: 0.017, stars: 0.75, structure: 0.95, enrich: 0.1 },
  supernova:       { radius: 56,   temp: 0.5,  churn: 0.7,  spin: 0.024, stars: 0.8,  structure: 0.9,  enrich: 0.55 },
  enrich:          { radius: 62,   temp: 0.32, churn: 0.2,  spin: 0.015, stars: 1.0,  structure: 0.95, enrich: 1.0 },
};

// What each element's glow looks like when it seeds a nebula. Impressionistic,
// but stable: a carbon-rich universe always runs amber, an oxygen-rich one ice.
const ELEMENT_TINTS = {
  O: 0x7fd4ff, C: 0xffb46a, Fe: 0xff6a4d, Si: 0xe8d9a0, Mg: 0x8affc0,
  N: 0x9a7bff, S: 0xfff06a, Ne: 0xff4d6b, Na: 0xffa03c, Al: 0xcfd8e8,
  Ca: 0xf0eaff, Ni: 0xc9f2dd, K: 0xd8a0ff, Ti: 0xb8c8ff, P: 0x86ffd9,
  Cl: 0xb0ff9a, H: 0xbfd4ff, He: 0xffeecc, Ar: 0xa8b8ff,
};

export class BigBangScene {
  /** @param {import('../cosmos/Cosmos.js').Cosmos} cosmos */
  constructor(cosmos) {
    this.cosmos = cosmos;
    const rng = makeRng(hashSeed('bigbang:' + cosmos.seed));
    this.rng = rng;
    this.mrng = rng.fork('macro'); // the close-up cast's own stream

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000004);
    this._bgTarget = new THREE.Color(0x000004);
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 5000);
    this.bloom = { strength: 0.5, radius: 0.6, threshold: 0.12 };

    // --- Seeded identity of this universe's look -----------------------------
    const heavies = cosmos.budget.fractions.filter((f) => !['H', 'He'].includes(f.sym)).slice(0, 3);
    this.palette = heavies.map((f) => new THREE.Color(ELEMENT_TINTS[f.sym] ?? 0xbfd4ff));
    while (this.palette.length < 3) this.palette.push(new THREE.Color(0xbfd4ff));

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

    const lean = rng.onSphere();
    const leanAmt = rng.range(0.12, 0.42);

    // Filament skeleton: anchor points; matter collapses toward the lines
    // between them. Also where the first star lives and nebulae bloom.
    this.anchors = [];
    for (let i = 0; i < CLUMPS; i++) {
      const d = rng.onSphere();
      const r = rng.range(0.3, 1.05);
      this.anchors.push(new THREE.Vector3(d.x * r, d.y * r, d.z * r));
    }
    // Sparse edges — each anchor links only to its 2 nearest neighbours. Every
    // anchor pair as a filament fills the volume solid and reads as a blob.
    const edges = [];
    const seen = new Set();
    for (let i = 0; i < CLUMPS; i++) {
      const dists = this.anchors
        .map((p, j) => ({ j, d: p.distanceTo(this.anchors[i]) }))
        .filter((e) => e.j !== i)
        .sort((x, y) => x.d - y.d);
      for (const { j } of dists.slice(0, 2)) {
        const key = Math.min(i, j) + ':' + Math.max(i, j);
        if (!seen.has(key)) {
          seen.add(key);
          edges.push([this.anchors[i], this.anchors[j]]);
        }
      }
    }

    this.target = { ...this.phases.void };
    this.current = { ...this.phases.void };
    this._t = 0;
    this.shot = 'void';
    this.shotT = 0;

    // --- Wide cloud particle attributes --------------------------------------
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
      const dot = d.x * lean.x + d.y * lean.y + d.z * lean.z;
      const stretch = 1 + leanAmt * dot * dot * 2;
      dirs[i * 3] = d.x * stretch;
      dirs[i * 3 + 1] = d.y * stretch;
      dirs[i * 3 + 2] = d.z * stretch;

      rfac[i] = 0.12 + Math.pow(rng(), 0.55);
      phase[i] = rng.range(0, Math.PI * 2);
      starRand[i] = rng();
      sizes[i] = 1.0 + Math.pow(rng(), 2.0) * 2.2;
      tint[i] = rng();

      const edge = rng.pick(edges);
      a.copy(edge[0]);
      b.copy(edge[1]);
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
      uFade: { value: 0 },
      uHot: { value: new THREE.Color(0xbfd4ff) },
      uWarm: { value: new THREE.Color(0xffd9a0) },
      uCool: { value: new THREE.Color(0x8a2b1a) },
      uStarC: { value: new THREE.Color(0xfff4e0) },
      uPal0: { value: this.palette[0] },
      uPal1: { value: this.palette[1] },
      uPal2: { value: this.palette[2] },
    };
    this._fadeTarget = 0;

    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, this.material);
    this.scene.add(this.points);

    // --- Hero star: rides the cloud's spin so it stays on its filament -------
    const tex = this._makeGlowTex();
    this.hero = new THREE.Group();
    this.heroMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff3da }),
    );
    this.heroGlowMat = new THREE.SpriteMaterial({
      map: tex, color: 0xffe9c4, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.heroGlow = new THREE.Sprite(this.heroGlowMat);
    this.heroGlow.scale.setScalar(7);
    this.hero.add(this.heroMesh, this.heroGlow);
    this.hero.visible = false;
    this.points.add(this.hero);

    // --- The primordial point ------------------------------------------------
    this.pointMat = new THREE.SpriteMaterial({
      map: tex, color: 0xfff6e8, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.pointSprite = new THREE.Sprite(this.pointMat);
    this.pointSprite.scale.setScalar(2.2);
    this.scene.add(this.pointSprite);
    this._pointTarget = 0;

    // --- Interior core glow (inside the star) --------------------------------
    this.coreGlowMat = new THREE.SpriteMaterial({
      map: tex, color: 0xff7a30, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.coreGlow = new THREE.Sprite(this.coreGlowMat);
    this.coreGlow.scale.setScalar(30);
    this.scene.add(this.coreGlow);
    this._coreTarget = 0;

    // --- Fog banks / nebulae -------------------------------------------------
    this.fogs = [];
    for (let i = 0; i < FOGS; i++) {
      const mat = new THREE.SpriteMaterial({
        map: tex, color: 0xffa25c, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const s = new THREE.Sprite(mat);
      s.visible = false;
      this.scene.add(s);
      this.fogs.push({ s, mat, target: 0, drift: new THREE.Vector3(), phase: rng.range(0, 7) });
    }

    // --- Macro cast ----------------------------------------------------------
    this.mPos = new Float32Array(MACRO * 3);
    this.mCol = new Float32Array(MACRO * 3);
    this.mSize = new Float32Array(MACRO);
    const mgeo = new THREE.BufferGeometry();
    mgeo.setAttribute('position', new THREE.BufferAttribute(this.mPos, 3));
    mgeo.setAttribute('aCol', new THREE.BufferAttribute(this.mCol, 3));
    mgeo.setAttribute('aSize', new THREE.BufferAttribute(this.mSize, 1));
    mgeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10000);
    this.mgeo = mgeo;
    this.mMat = new THREE.ShaderMaterial({
      vertexShader: M_VERT, fragmentShader: M_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.macro = new THREE.Points(mgeo, this.mMat);
    this.macro.visible = false;
    this.macro.frustumCulled = false;
    this.scene.add(this.macro);
    this._mode = 'off';
    this._m = {};

    // --- Shockwave rings (bang + supernovae), pooled -------------------------
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

    // --- Events, flash, shake, camera ---------------------------------------
    this._events = [];
    this._flash = 0;
    this._shake = 0;
    this._camAz = rng.range(0, Math.PI * 2);
    this._camSpeed = rng.range(0.03, 0.06) * (rng.bool() ? 1 : -1);
    this._spin = 0;
    this._supernovaeFired = false;
    this._tmpV = new THREE.Vector3();
    this._tmpV2 = new THREE.Vector3();
  }

  _makeGlowTex() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
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

  /** Where the hero star currently is, in world space (the cloud spins). */
  _knotWorld(out) {
    return this.hero.getWorldPosition(out);
  }

  // --- Macro cast helpers ----------------------------------------------------

  _set(i, x, y, z, r, g, b, size) {
    this.mPos[i * 3] = x; this.mPos[i * 3 + 1] = y; this.mPos[i * 3 + 2] = z;
    this.mCol[i * 3] = r; this.mCol[i * 3 + 1] = g; this.mCol[i * 3 + 2] = b;
    this.mSize[i] = size;
  }

  _clearMacro() {
    this.mSize.fill(0);
  }

  _macroDirty() {
    this.mgeo.attributes.position.needsUpdate = true;
    this.mgeo.attributes.aCol.needsUpdate = true;
    this.mgeo.attributes.aSize.needsUpdate = true;
  }

  /** Pairs of particles flashing into existence and annihilating (the foam). */
  _initFoam() {
    const R = this.mrng;
    const pairs = [];
    for (let k = 0; k < MACRO_MAIN / 2; k++) {
      pairs.push(this._newPair(R));
    }
    this._mode = 'foam';
    this._m = { pairs };
    this._clearMacro();
    this.macro.visible = true;
  }

  _newPair(R) {
    const d = R.onSphere();
    return {
      cx: R.range(-14, 14), cy: R.range(-8, 8), cz: R.range(-5, 5),
      dx: d.x, dy: d.y, dz: d.z,
      life: R.range(0.8, 1.3),
      t: R.range(0, 1.3),
      frozen: false,
      bob: R.range(0, 7),
    };
  }

  _updFoam(dt) {
    const R = this.mrng;
    // In 'firstmatter' the flashing slows and a growing fraction freezes into
    // motes that survive. In 'foam' nothing survives.
    const freezeF = this.shot === 'firstmatter' ? ss(0, 9, this.shotT) * 0.98 : 0;
    const lifeStretch = this.shot === 'firstmatter' ? 1 + ss(0, 9, this.shotT) * 1.1 : 1;
    const pairs = this._m.pairs;
    for (let k = 0; k < pairs.length; k++) {
      const p = pairs[k];
      const i = k * 2, j = k * 2 + 1;
      if (p.frozen) {
        const bob = Math.sin(this._t * 0.9 + p.bob) * 0.1;
        this._set(i, p.cx + p.dx * 0.5, p.cy + p.dy * 0.5 + bob, p.cz + p.dz * 0.5, 0.62, 0.56, 0.47, 1.3);
        this._set(j, p.cx - p.dx * 0.5, p.cy - p.dy * 0.5 - bob, p.cz - p.dz * 0.5, 0.62, 0.56, 0.47, 1.3);
        continue;
      }
      p.t += dt;
      if (p.t >= p.life * lifeStretch) {
        if (R() < freezeF) {
          p.frozen = true;
        } else {
          const d = R.onSphere();
          p.cx = R.range(-14, 14); p.cy = R.range(-8, 8); p.cz = R.range(-5, 5);
          p.dx = d.x; p.dy = d.y; p.dz = d.z;
          p.life = R.range(0.8, 1.3);
          p.t = 0;
        }
        continue;
      }
      const ph = p.t / (p.life * lifeStretch);
      const sep = Math.sin(ph * Math.PI) * 1.5;
      const edge = Math.min(ph, 1 - ph);
      const bright = 0.35 + 1.9 * Math.exp(-edge * 9);
      this._set(i, p.cx + p.dx * sep, p.cy + p.dy * sep, p.cz + p.dz * sep,
        0.75 * bright, 0.85 * bright, 1.0 * bright, 1.1 + bright * 0.8);
      this._set(j, p.cx - p.dx * sep, p.cy - p.dy * sep, p.cz - p.dz * sep,
        0.75 * bright, 0.85 * bright, 1.0 * bright, 1.1 + bright * 0.8);
    }
  }

  /** Nuclei assemble: pairs of hydrogen, quads of helium — visibly snapping. */
  _initAssembly() {
    const R = this.mrng;
    const idx = Array.from({ length: MACRO_MAIN }, (_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(R() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    const groups = [];
    let cursor = 0;
    const takeGroup = (n, isHe) => {
      const members = idx.slice(cursor, cursor + n);
      cursor += n;
      const offsets = [];
      if (n === 2) {
        const d = R.onSphere();
        offsets.push([d.x * 0.34, d.y * 0.34, d.z * 0.34], [-d.x * 0.34, -d.y * 0.34, -d.z * 0.34]);
      } else {
        // A rough tetrahedron: helium reads as a heavier cluster.
        const s = 0.42;
        offsets.push([s, s, s], [s, -s, -s], [-s, s, -s], [-s, -s, s]);
      }
      groups.push({
        members, offsets, isHe,
        ax: R.range(-16, 16), ay: R.range(-8.5, 8.5), az: R.range(-5, 5),
        delay: R.range(0, 6), age: 0, pulse: 0,
        starts: members.map((m) => [this.mp?.[m]?.x ?? R.range(-14, 14), this.mp?.[m]?.y ?? R.range(-8, 8), this.mp?.[m]?.z ?? R.range(-5, 5)]),
        bob: R.range(0, 7),
      });
    };
    // Capture where every particle currently sits, so nuclei fly in from the
    // frozen motes on screen rather than teleporting.
    this.mp = [];
    for (let i = 0; i < MACRO_MAIN; i++) {
      this.mp.push({ x: this.mPos[i * 3], y: this.mPos[i * 3 + 1], z: this.mPos[i * 3 + 2] });
    }
    for (let k = 0; k < 112; k++) takeGroup(2, false); // hydrogen pairs
    for (let k = 0; k < 19; k++) takeGroup(4, true);   // helium quads
    this._mode = 'assembly';
    this._m = { groups, electrons: [], age: 0 };
    this._clearMacro();
    this.macro.visible = true;
  }

  _updAssembly(dt) {
    const m = this._m;
    m.age += dt;
    const dim = this.shot === 'fog' ? 0.3 : 1;
    for (const g of m.groups) {
      const arrive = ss(g.delay, g.delay + 1.8, m.age);
      const past = m.age - (g.delay + 1.8);
      const flash = past > 0 ? Math.exp(-past * 5) : 0;
      g.pulse = Math.max(0, g.pulse - g.pulse * dt * 3);
      const bright = (0.45 + 0.55 * arrive) * dim * (1 + flash * 2.2 + g.pulse * 1.6);
      const cr = g.isHe ? 1.0 : 0.7, cg = g.isHe ? 0.78 : 0.85, cb = g.isHe ? 0.5 : 1.0;
      const bob = Math.sin(this._t * 0.8 + g.bob) * 0.14 * arrive;
      for (let n = 0; n < g.members.length; n++) {
        const i = g.members[n];
        const s = g.starts[n], o = g.offsets[n];
        const x = s[0] + (g.ax + o[0] - s[0]) * arrive;
        const y = s[1] + (g.ay + o[1] + bob - s[1]) * arrive;
        const z = s[2] + (g.az + o[2] - s[2]) * arrive;
        this._set(i, x, y, z, cr * bright, cg * bright, cb * bright, (g.isHe ? 1.65 : 1.45) + flash);
      }
    }
    // Electrons (recombination): spiral in, lock, and the atom brightens.
    for (const e of m.electrons) {
      e.t += dt;
      if (e.t < 0) { this.mSize[e.idx] = 0; continue; }
      const r = 2.4 + (0.5 - 2.4) * ss(0, 3.2, e.t);
      if (!e.locked && r <= 0.55) {
        e.locked = true;
        m.groups[e.gi].pulse = 1;
      }
      e.ang += e.av * dt;
      const g = m.groups[e.gi];
      const x = g.ax + (e.ux * Math.cos(e.ang) + e.vx * Math.sin(e.ang)) * r;
      const y = g.ay + (e.uy * Math.cos(e.ang) + e.vy * Math.sin(e.ang)) * r;
      const z = g.az + (e.uz * Math.cos(e.ang) + e.vz * Math.sin(e.ang)) * r;
      this._set(e.idx, x, y, z, 0.8, 1.0, 1.05, 0.8);
    }
  }

  _spawnElectrons() {
    if (this._mode !== 'assembly') return;
    const R = this.mrng;
    const m = this._m;
    // The nuclei nearest the camera get visible electron captures.
    const near = m.groups
      .map((g, gi) => ({ gi, d: g.az }))
      .sort((a, b) => b.d - a.d)
      .slice(0, 16);
    let idx = MACRO_MAIN;
    for (const { gi } of near) {
      const n = R.bool(0.4) ? 2 : 1;
      for (let k = 0; k < n && idx < MACRO; k++) {
        const ax = R.onSphere();
        const u = new THREE.Vector3(ax.x, ax.y, ax.z);
        const any = Math.abs(u.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
        const v1 = new THREE.Vector3().crossVectors(u, any).normalize();
        const v2 = new THREE.Vector3().crossVectors(u, v1).normalize();
        m.electrons.push({
          idx: idx++, gi,
          t: -R.range(0, 4.5), // staggered starts
          ang: R.range(0, Math.PI * 2), av: R.range(6, 10) * (R.bool() ? 1 : -1),
          ux: v1.x, uy: v1.y, uz: v1.z, vx: v2.x, vy: v2.y, vz: v2.z,
          locked: false,
        });
      }
    }
  }

  /** A knot of gas spirals inward until the first star ignites. */
  _initInfall() {
    const R = this.mrng;
    const parts = [];
    for (let i = 0; i < 140; i++) {
      const ax = R.onSphere();
      const u = new THREE.Vector3(ax.x, ax.y, ax.z);
      const any = Math.abs(u.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      const v1 = new THREE.Vector3().crossVectors(u, any).normalize();
      const v2 = new THREE.Vector3().crossVectors(u, v1).normalize();
      parts.push({
        r0: R.range(2.5, 9), theta: R.range(0, Math.PI * 2),
        u: v1, v: v2, w: u,
        wob: R.range(-0.6, 0.6),
        delay: R.range(0, 2.4), dur: R.range(2.2, 3.6),
      });
    }
    this._mode = 'infall';
    this._m = { parts, ignited: false };
    this._clearMacro();
    this.macro.visible = true;
  }

  _updInfall(dt) {
    const m = this._m;
    const knot = this._knotWorld(this._tmpV);
    if (!m.ignited && this.shotT >= 4.6) {
      m.ignited = true;
      this.hero.visible = true;
      this._flash = Math.max(this._flash, 0.7);
      this._shake = Math.max(this._shake, 0.4);
      this._fireShock(knot.clone(), { speed: 20, life: 1.6 });
      this._fadeTarget = 0.4; // the star lights its neighbourhood first
    }
    const fade = m.ignited ? Math.exp(-4 * (this.shotT - 4.6)) : 1;
    for (let i = 0; i < m.parts.length; i++) {
      const p = m.parts[i];
      const k = ss(p.delay, p.delay + p.dur, this.shotT);
      const r = p.r0 * (1 - k * 0.95) + 0.18;
      p.theta += (1.0 + 3.2 * k) * dt;
      const x = knot.x + (p.u.x * Math.cos(p.theta) + p.v.x * Math.sin(p.theta)) * r + p.w.x * p.wob * (1 - k);
      const y = knot.y + (p.u.y * Math.cos(p.theta) + p.v.y * Math.sin(p.theta)) * r + p.w.y * p.wob * (1 - k);
      const z = knot.z + (p.u.z * Math.cos(p.theta) + p.v.z * Math.sin(p.theta)) * r + p.w.z * p.wob * (1 - k);
      const bright = (0.35 + 0.85 * k) * fade;
      this._set(i, x, y, z, 0.78 * bright, 0.88 * bright, 1.0 * bright, 1.2 * fade);
    }
    // Hero ignition: swells on, then burns steady.
    const s = 1.2 * ss(4.6, 5.3, this.shotT);
    this.heroMesh.scale.setScalar(Math.max(0.001, s));
    this.heroGlow.scale.setScalar(Math.max(0.001, s * 4.5 * (1 + 0.05 * Math.sin(this._t * 3.1))));
  }

  /** Inside the star: an ember swarm; nuclei slam together and fuse. */
  _initStar() {
    const R = this.mrng;
    const swarm = [];
    for (let i = 0; i < MACRO_MAIN; i++) {
      const ax = R.onSphere();
      const u = new THREE.Vector3(ax.x, ax.y, ax.z);
      const any = Math.abs(u.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      const v1 = new THREE.Vector3().crossVectors(u, any).normalize();
      const v2 = new THREE.Vector3().crossVectors(u, v1).normalize();
      swarm.push({
        r: R.range(3.5, 11), theta: R.range(0, Math.PI * 2),
        u: v1, v: v2,
        speed: R.range(1.0, 2.2) * (R.bool() ? 1 : -1),
        heavy: false, state: 'orbit', dartT: 0, flash: 0,
        sx: 0, sy: 0, sz: 0, mx: 0, my: 0, mz: 0, mate: -1,
      });
    }
    this._mode = 'star';
    this._m = { swarm, stage: 'fusion', next: 0.5, ironT: 0, collapsed: false };
    this._clearMacro();
    this.macro.visible = true;
  }

  _updStar(dt) {
    const R = this.mrng;
    const m = this._m;
    if (this.shot === 'iron') m.ironT += dt;
    const ironK = ss(0, 8, m.ironT);

    // Fusion events: two nuclei dart together, flash, and one comes out heavier.
    // At iron, the events space out and finally stop — the forge dies on screen.
    if (m.stage !== 'collapse' && m.stage !== 'ejecta') {
      const stopped = this.shot === 'iron' && m.ironT > 7.5;
      m.next -= dt;
      if (m.next <= 0 && !stopped) {
        m.next = this.shot === 'iron'
          ? R.range(0.5, 0.9) * (1 + m.ironT * 0.7)
          : R.range(0.45, 0.85);
        const free = m.swarm.filter((p) => p.state === 'orbit' && !p.heavy);
        if (free.length >= 2) {
          const a = free[Math.floor(R() * free.length)];
          let b = free[Math.floor(R() * free.length)];
          if (b === a) b = free[(free.indexOf(a) + 1) % free.length];
          const d = R.onSphere();
          const mr = R.range(1.6, 4.2);
          for (const p of [a, b]) {
            p.state = 'dart'; p.dartT = 0;
            p.mx = d.x * mr; p.my = d.y * mr; p.mz = d.z * mr;
            const px = (p.u.x * Math.cos(p.theta) + p.v.x * Math.sin(p.theta)) * p.r;
            const py = (p.u.y * Math.cos(p.theta) + p.v.y * Math.sin(p.theta)) * p.r;
            const pz = (p.u.z * Math.cos(p.theta) + p.v.z * Math.sin(p.theta)) * p.r;
            p.sx = px; p.sy = py; p.sz = pz;
          }
          a.mate = m.swarm.indexOf(b);
          b.mate = -2; // the follower; the leader resolves the merge
        }
      }
    }

    const ambient = m.stage === 'collapse'
      ? Math.max(0, 1 - this.shotT / 1.0)
      : (this.shot === 'iron' ? 1 - ironK * 0.6 : 1);

    for (let i = 0; i < m.swarm.length; i++) {
      const p = m.swarm[i];
      p.flash = Math.max(0, p.flash - p.flash * dt * 6);

      if (m.stage === 'ejecta') {
        p.life = (p.life ?? 0) + dt;
        p.sx += p.evx * dt; p.sy += p.evy * dt; p.sz += p.evz * dt;
        p.evx *= 1 - 0.45 * dt; p.evy *= 1 - 0.45 * dt; p.evz *= 1 - 0.45 * dt;
        const b = Math.max(0, 1 - p.life / 3.8);
        this._set(i, p.sx, p.sy, p.sz, p.ecr * b * 1.6, p.ecg * b * 1.6, p.ecb * b * 1.6, 1.9 * b);
        continue;
      }

      if (m.stage === 'collapse') {
        p.r *= Math.exp(-3.4 * dt);
      }

      if (p.state === 'dart') {
        p.dartT += dt;
        const k = ss(0, 0.35, p.dartT);
        const x = p.sx + (p.mx - p.sx) * k;
        const y = p.sy + (p.my - p.sy) * k;
        const z = p.sz + (p.mz - p.sz) * k;
        if (k >= 1 && p.mate >= 0) {
          // The merge: leader becomes a heavier, golden nucleus.
          const other = m.swarm[p.mate];
          other.state = 'orbit'; other.r = R.range(9, 11); other.flash = 0;
          other.heavy = false;
          p.state = 'orbit';
          p.heavy = true;
          p.r = Math.max(1.2, Math.hypot(p.mx, p.my, p.mz));
          p.flash = 1;
          p.mate = -1;
        } else if (k >= 1) {
          p.state = 'orbit';
        }
        const fl = 1 + (k > 0.85 ? (k - 0.85) / 0.15 * 2.5 : 0);
        this._set(i, x, y, z, 1.0 * fl * ambient, 0.75 * fl * ambient, 0.5 * fl * ambient, 1.4 + p.flash * 2.5);
        continue;
      }

      // Orbiting ember. Heavies sink toward the core; at iron they go dark.
      p.theta += p.speed * dt * (p.heavy ? 0.5 : 1) * (1 - ironK * 0.55);
      if (p.heavy && this.shot === 'iron') {
        p.r += (0.9 - p.r) * dt * 0.35;
      }
      const x = (p.u.x * Math.cos(p.theta) + p.v.x * Math.sin(p.theta)) * p.r;
      const y = (p.u.y * Math.cos(p.theta) + p.v.y * Math.sin(p.theta)) * p.r;
      const z = (p.u.z * Math.cos(p.theta) + p.v.z * Math.sin(p.theta)) * p.r;
      let cr, cg, cb, size;
      if (p.heavy) {
        const dark = this.shot === 'iron' ? ironK : 0;
        cr = 1.0 - dark * 0.55; cg = 0.85 - dark * 0.7; cb = 0.45 - dark * 0.37;
        size = 2.1;
      } else {
        cr = 1.0; cg = 0.52; cb = 0.28;
        size = 1.15;
      }
      const b = (0.5 + p.flash * 1.8) * ambient;
      this._set(i, x, y, z, cr * b + p.flash, cg * b + p.flash, cb * b + p.flash, size + p.flash * 2);
    }

    // The detonation: interior dies, then everything is thrown outward.
    if (this.shot === 'supernova' && !m.collapsed && this.shotT >= 1.1) {
      m.collapsed = true;
      m.stage = 'ejecta';
      const knot = this._knotWorld(this._tmpV);
      for (const p of m.swarm) {
        const d = R.onSphere();
        const sp = R.range(14, 44);
        p.sx = knot.x; p.sy = knot.y; p.sz = knot.z;
        p.evx = d.x * sp; p.evy = d.y * sp; p.evz = d.z * sp;
        const tintC = R.pick(this.palette);
        p.ecr = tintC.r; p.ecg = tintC.g; p.ecb = tintC.b;
        p.life = 0;
      }
      this._flash = Math.max(this._flash, 1.0);
      this._shake = Math.max(this._shake, 1.0);
      this._fireShock(knot.clone(), { speed: 40, life: 2.2 });
      this._after(0.4, () => this._fireShock(this._knotWorld(this._tmpV).clone(), { speed: 28, life: 1.8, color: 0xffd9a8 }));
      this._bgTarget.set(0x02030a);
      this._fadeTarget = 1;
      this._coreTarget = 0;
    }
  }

  /** Sparks flicking off the straining point. */
  _initSparks() {
    this._mode = 'sparks';
    this._m = { sparks: [], next: 0.8 };
    this._clearMacro();
    this.macro.visible = true;
  }

  _updSparks(dt) {
    const R = this.mrng;
    const m = this._m;
    m.next -= dt;
    if (m.next <= 0) {
      m.next = R.range(0.7, 1.4) * Math.max(0.35, 1 - this.shotT * 0.06);
      for (let k = 0; k < 3; k++) {
        const d = R.onSphere();
        m.sparks.push({ x: 0, y: 0, z: 0, vx: d.x * R.range(4, 8), vy: d.y * R.range(4, 8), vz: d.z * R.range(4, 8), life: 0 });
      }
      if (m.sparks.length > MACRO_MAIN) m.sparks.splice(0, m.sparks.length - MACRO_MAIN);
    }
    this._clearMacro();
    for (let i = 0; i < m.sparks.length; i++) {
      const s = m.sparks[i];
      s.life += dt;
      s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
      const b = Math.max(0, 1 - s.life / 0.4);
      if (b > 0) this._set(i, s.x, s.y, s.z, b, b * 0.95, b * 0.85, 1.2 * b);
    }
  }

  // --- Shots -----------------------------------------------------------------

  /** The director calls this with a cue's phase name. */
  setPhase(name) {
    const p = this.phases[name];
    if (!p) return;
    this.target = { ...p };
    this.shot = name;
    this.shotT = 0;
    this._enterShot(name);
  }

  _enterShot(name) {
    // Defaults each cut resets; individual shots opt back in below.
    this._pointTarget = 0;
    this._coreTarget = 0;
    for (const f of this.fogs) f.target = 0;

    switch (name) {
      case 'void':
        this._fadeTarget = 0;
        this._mode = 'off';
        this.macro.visible = false;
        this._bgTarget.set(0x000004);
        break;

      case 'point':
        this._pointTarget = 0.85;
        this._fadeTarget = 0;
        this._mode = 'off';
        this.macro.visible = false;
        this._bgTarget.set(0x000004);
        break;

      case 'strain':
        this._pointTarget = 1;
        this._fadeTarget = 0;
        this._initSparks();
        this._bgTarget.set(0x000004);
        break;

      case 'bang':
        this._fadeTarget = 1;
        this._mode = 'off';
        this.macro.visible = false;
        this._bgTarget.set(0x02030a);
        this._flash = Math.max(this._flash, 1.0);
        this._shake = Math.max(this._shake, 1.2);
        this._fireShock(new THREE.Vector3(0, 0, 0), { speed: 42, life: 2.2 });
        this._after(0.5, () => this._fireShock(new THREE.Vector3(0, 0, 0), { speed: 30, life: 1.8, color: 0xffe0b8 }));
        break;

      case 'foam':
        this._fadeTarget = 0;
        this._bgTarget.set(0x010208);
        this._initFoam();
        break;

      case 'firstmatter':
        // Same cast; the flashing slows and freezes. Init only if we somehow
        // arrived without the foam before us.
        this._fadeTarget = 0;
        this._bgTarget.set(0x010207);
        if (this._mode !== 'foam') this._initFoam();
        break;

      case 'nucleosynthesis':
        this._fadeTarget = 0;
        this._bgTarget.set(0x010206);
        this._initAssembly();
        break;

      case 'inventory':
        this._fadeTarget = 0;
        this._bgTarget.set(0x010206);
        if (this._mode !== 'assembly') this._initAssembly();
        break;

      case 'fog':
        this._fadeTarget = 0;
        this._bgTarget.set(0x0a0503);
        if (this._mode !== 'assembly') this._initAssembly();
        // Banks of glow crowd the camera; visibility drops to a few feet.
        for (const f of this.fogs) {
          const d = this.mrng.onSphere();
          const r = this.mrng.range(6, 24);
          f.s.position.set(d.x * r, d.y * r * 0.55, d.z * r);
          f.s.scale.setScalar(this.mrng.range(12, 26));
          f.mat.color.set(0xffa25c);
          f.target = this.mrng.range(0.2, 0.4);
          f.drift.set(this.mrng.range(-0.3, 0.3), this.mrng.range(-0.12, 0.12), this.mrng.range(-0.3, 0.3));
          f.s.visible = true;
        }
        break;

      case 'recombination':
        this._fadeTarget = 0; // the clear universe is revealed mid-shot
        this._bgTarget.set(0x030408);
        if (this._mode !== 'assembly') this._initAssembly();
        // Fog stays until the capture moment — the drain is handled in update.
        for (const f of this.fogs) f.target = Math.min(0.45, f.mat.opacity || 0.45);
        this._spawnElectrons();
        this._after(6.2, () => { this._flash = Math.max(this._flash, 0.3); });
        break;

      case 'structure':
        this._fadeTarget = 1;
        this._mode = 'off';
        this.macro.visible = false;
        this._bgTarget.set(0x02030a);
        break;

      case 'gravity':
        this._fadeTarget = 1;
        this._mode = 'off';
        this.macro.visible = false;
        this._bgTarget.set(0x02030a);
        break;

      case 'firststars':
        this._fadeTarget = 0.03; // near-black: the collapsing knot is the subject
        this._bgTarget.set(0x02030a);
        this.hero.position.copy(this.anchors[0]).multiplyScalar(this.phases.firststars.radius * 0.8);
        this.heroMesh.scale.setScalar(0.001);
        this.heroGlow.scale.setScalar(0.001);
        this.hero.visible = false;
        this._initInfall();
        this._shake = Math.max(this._shake, 0.15);
        break;

      case 'fusion':
        this._fadeTarget = 0;
        this._bgTarget.set(0x160703);
        this.hero.visible = false;
        this._coreTarget = 0.5;
        this.coreGlowMat.color.set(0xff7a30);
        this._initStar();
        break;

      case 'iron':
        this._fadeTarget = 0;
        this._bgTarget.set(0x0a0302);
        this._coreTarget = 0.14;
        if (this._mode !== 'star') this._initStar();
        break;

      case 'supernova':
        this._bgTarget.set(0x000000);
        this._coreTarget = 0;
        if (this._mode !== 'star') this._initStar();
        this._m.stage = 'collapse';
        this._m.collapsed = false;
        if (!this._supernovaeFired) {
          this._supernovaeFired = true;
          // After the hero's own death: one blast per stellar generation this
          // universe actually had, out across the wide cloud.
          const n = this.cosmos.cloud.generations;
          const rng = this.rng;
          for (let i = 0; i < n; i++) {
            const delay = 2.4 + (i / n) * 8.5 + rng.range(0, 0.7);
            this._after(delay, () => {
              const d = rng.onSphere();
              const r = this.current.radius * rng.range(0.35, 0.9);
              const pos = new THREE.Vector3(d.x * r, d.y * r, d.z * r);
              this._flash = Math.max(this._flash, rng.range(0.4, 0.75));
              this._shake = Math.max(this._shake, rng.range(0.25, 0.5));
              const tintC = rng.pick(this.palette);
              this._fireShock(pos, { speed: rng.range(16, 30), life: rng.range(1.2, 2.0), color: tintC });
              this.uniforms.uEnrich.value = Math.min(1, this.uniforms.uEnrich.value + 0.9 / n);
            });
          }
        }
        break;

      case 'enrich':
        this._fadeTarget = 1;
        this._mode = 'off';
        this.macro.visible = false;
        this._bgTarget.set(0x02030a);
        // The fog banks come back as coloured nebulae blooming on the filaments.
        for (let i = 0; i < this.fogs.length; i++) {
          const f = this.fogs[i];
          const anchor = this.anchors[i % this.anchors.length];
          const rr = this.phases.enrich.radius * 0.75;
          f.s.position.set(anchor.x * rr, anchor.y * rr, anchor.z * rr);
          f.s.scale.setScalar(this.mrng.range(14, 30));
          f.mat.color.copy(this.palette[i % 3]);
          f.target = i < 12 ? this.mrng.range(0.18, 0.32) : 0;
          f.drift.set(this.mrng.range(-0.2, 0.2), this.mrng.range(-0.1, 0.1), this.mrng.range(-0.2, 0.2));
          f.s.visible = true;
        }
        break;
    }
  }

  // --- Frame update ----------------------------------------------------------

  update(dt) {
    this._t += dt;
    this.shotT += dt;

    // Run due events.
    if (this._events.length) {
      const due = this._events.filter((e) => e.at <= this._t);
      if (due.length) {
        this._events = this._events.filter((e) => e.at > this._t);
        for (const e of due) e.fn();
      }
    }

    // Ease evolving wide-cloud parameters toward their phase targets.
    const k = Math.min(1, dt * 0.9);
    for (const key of Object.keys(this.target)) {
      this.current[key] += (this.target[key] - this.current[key]) * k;
    }

    // Flash and shake decay fast — they are events, not states.
    this._flash = Math.max(0, this._flash - this._flash * dt * 3.2 - dt * 0.02);
    this._shake = Math.max(0, this._shake - this._shake * dt * 2.6);

    // Recombination beats: fog drains at the capture moment, then the clear
    // deep universe fades up behind the atoms.
    if (this.shot === 'recombination') {
      if (this.shotT > 4.5) for (const f of this.fogs) f.target = 0;
      // Reveal the cleared universe only once the dolly-back has carried the
      // camera outside the cloud — fading it in earlier just fills the frame.
      if (this.shotT > 8.5) this._fadeTarget = Math.max(this._fadeTarget, 0.55);
    }
    // First stars: the full web comes back only once the pull-back is under way.
    if (this.shot === 'firststars' && this.shotT > 7.5) this._fadeTarget = 1;

    // Feed the wide-cloud shader.
    const u = this.uniforms;
    u.uTime.value = this._t;
    u.uRadius.value = this.current.radius;
    u.uChurn.value = this.current.churn;
    u.uTemp.value = this.current.temp;
    u.uStructure.value = this.current.structure;
    u.uFlash.value = this._flash;
    u.uFade.value += (this._fadeTarget - u.uFade.value) * Math.min(1, dt * 1.5);
    this.points.visible = u.uFade.value > 0.004;
    u.uStars.value += (this.current.stars - u.uStars.value) * Math.min(1, dt * 0.35);
    u.uEnrich.value += (Math.max(this.current.enrich, u.uEnrich.value) - u.uEnrich.value) * Math.min(1, dt * 0.3);

    // Cloud spin.
    this._spin += this.current.spin * this._spinSign * dt;
    this.points.rotation.y = this._spin;

    // The macro cast.
    switch (this._mode) {
      case 'foam': this._updFoam(dt); break;
      case 'assembly': this._updAssembly(dt); break;
      case 'infall': this._updInfall(dt); break;
      case 'star': this._updStar(dt); break;
      case 'sparks': this._updSparks(dt); break;
    }
    if (this.macro.visible) this._macroDirty();

    // Sprites: the primordial point, the core glow, fog banks / nebulae.
    this.pointMat.opacity += (this._pointTarget - this.pointMat.opacity) * Math.min(1, dt * 2);
    this.pointSprite.visible = this.pointMat.opacity > 0.004;
    if (this.shot === 'strain') {
      const throb = 1 + 0.22 * Math.sin(this.shotT * (2.5 + this.shotT * 0.9));
      this.pointSprite.scale.setScalar(2.2 * throb);
    } else if (this.shot === 'point') {
      this.pointSprite.scale.setScalar(2.2 * (1 + 0.04 * Math.sin(this._t * 1.7)));
    }

    this.coreGlowMat.opacity += (this._coreTarget - this.coreGlowMat.opacity) * Math.min(1, dt * 1.6);
    this.coreGlow.visible = this.coreGlowMat.opacity > 0.004;
    this.coreGlow.scale.setScalar(30 * (1 + 0.06 * Math.sin(this._t * 2.3)));

    for (const f of this.fogs) {
      f.mat.opacity += (f.target - f.mat.opacity) * Math.min(1, dt * 1.4);
      if (f.mat.opacity <= 0.004 && f.target === 0) { f.s.visible = false; continue; }
      f.s.visible = true;
      f.s.position.addScaledVector(f.drift, dt);
      const breathe = 1 + 0.05 * Math.sin(this._t * 0.5 + f.phase);
      f.s.scale.setScalar(f.s.scale.x * (breathe / (f._lastBreathe ?? 1)));
      f._lastBreathe = breathe;
    }

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

    // Background drifts to each shot's tone.
    this.scene.background.lerp(this._bgTarget, Math.min(1, dt * 2));

    this._updateCamera(dt);
  }

  /** Every shot gets its own framing. Cuts happen on setPhase; moves in here. */
  _updateCamera(dt) {
    const t = this._t, st = this.shotT;
    const sx = this._shake * Math.sin(t * 47.3) * 2.2;
    const sy = this._shake * Math.sin(t * 39.1 + 1.7) * 2.2;
    const cam = this.camera;
    const look = this._tmpV2.set(sx * 0.4, sy * 0.4, 0);

    const orbit = (dist, elev, speedMul = 1) => {
      this._camAz += this._camSpeed * speedMul * dt;
      cam.position.set(
        Math.sin(this._camAz) * dist + sx,
        elev + Math.sin(t * 0.31) * 3 + sy,
        Math.cos(this._camAz) * dist,
      );
      cam.lookAt(look);
    };

    switch (this.shot) {
      case 'void':
        cam.position.set(Math.sin(t * 0.05) * 0.5, 1.5, 26);
        cam.lookAt(0, 0, 0);
        break;

      case 'point': {
        // A slow push-in on the only thing that exists.
        const z = 30 + (14 - 30) * ss(0, 12, st);
        cam.position.set(Math.sin(t * 0.06) * 0.8, 1, z);
        cam.lookAt(0, 0, 0);
        break;
      }

      case 'strain': {
        const z = 14 + (10 - 14) * ss(0, 8, st);
        const j = 0.06 * (1 + st * 0.15);
        cam.position.set(Math.sin(t * 31) * j, Math.cos(t * 27) * j + 0.5, z);
        cam.lookAt(0, 0, 0);
        break;
      }

      case 'bang': {
        // Thrown backward by the detonation, then settling wide. The additive
        // cloud saturates to white if the camera sits too close — stay past
        // ~4x its radius so the blast resolves into a fireball, not a whiteout.
        const r = this.current.radius;
        const dist = 12 + (48 + r * 1.6 - 12) * ss(0, 2.5, st);
        this._camAz += this._camSpeed * dt;
        cam.position.set(Math.sin(this._camAz) * dist + sx, 4 + sy, Math.cos(this._camAz) * dist);
        cam.lookAt(look);
        break;
      }

      case 'foam':
        cam.position.set(Math.sin(t * 0.07) * 1.5 + sx * 0.3, 2 + Math.sin(t * 0.21) * 0.8, 22);
        cam.lookAt(Math.sin(t * 0.05) * 2, 0, 0);
        break;

      case 'firstmatter': {
        const z = 22 + (18 - 22) * ss(0, 12, st);
        cam.position.set(Math.sin(t * 0.07) * 1.5, 2, z);
        cam.lookAt(0, 0, 0);
        break;
      }

      case 'nucleosynthesis':
        cam.position.set(Math.sin(t * 0.11) * 2.5, 1.5, 19);
        cam.lookAt(Math.sin(t * 0.11) * 1.2, 0, 0);
        break;

      case 'inventory': {
        // A slow lateral pan across the finished stock of the universe.
        const x = -15 + 30 * ss(0.5, 15.5, st);
        cam.position.set(x, 1.5, 20);
        cam.lookAt(x * 0.55, 0, 0);
        break;
      }

      case 'fog':
        cam.position.set(0, 1, 13);
        cam.lookAt(Math.sin(t * 0.13) * 6, Math.sin(t * 0.09) * 3, -4);
        break;

      case 'recombination': {
        // Close on the atoms; then, as the fog lets go, dolly back until the
        // whole transparent universe is in frame.
        const z = 19 + (58 - 19) * ss(6, 13, st);
        cam.position.set(Math.sin(t * 0.06) * 2, 2, z);
        cam.lookAt(0, 0, 0);
        break;
      }

      case 'structure':
        orbit(Math.max(60, this.current.radius * 1.55), 34); // high angle down onto the web
        break;

      case 'gravity':
        orbit(Math.max(64, this.current.radius * 1.45), 10, 2.2); // circling the draining web
        break;

      case 'firststars': {
        const knot = this._knotWorld(this._tmpV);
        const pull = ss(5.2, 11.5, st);
        const dist = 11 + (Math.max(66, this.current.radius * 1.5) - 11) * pull;
        const az = t * 0.12;
        cam.position.set(
          knot.x * (1 - pull) + Math.sin(az) * dist + sx,
          knot.y * (1 - pull) + 4 + sy,
          knot.z * (1 - pull) + Math.cos(az) * dist,
        );
        look.set(knot.x * (1 - pull) + sx * 0.4, knot.y * (1 - pull) + sy * 0.4, knot.z * (1 - pull));
        cam.lookAt(look);
        break;
      }

      case 'fusion': {
        const az = t * 0.06;
        const r = 13.5;
        cam.position.set(Math.sin(az) * r + sx * 0.5, 2.5 + Math.sin(t * 0.4) * 0.8, Math.cos(az) * r);
        cam.lookAt(0, 0, 0);
        break;
      }

      case 'iron': {
        const az = t * 0.05;
        const r = 13.5 + (10.5 - 13.5) * ss(0, 10, st);
        cam.position.set(Math.sin(az) * r, 2.2, Math.cos(az) * r);
        cam.lookAt(0, 0, 0);
        break;
      }

      case 'supernova': {
        if (st < 1.1) {
          // Still inside as the core gives way.
          const az = t * 0.05;
          cam.position.set(Math.sin(az) * 10 + sx, 2, Math.cos(az) * 10);
          cam.lookAt(0, 0, 0);
        } else {
          const knot = this._knotWorld(this._tmpV);
          const pull = ss(1.1, 9, st);
          const dist = 42 + (84 - 42) * pull;
          const az = t * 0.05;
          const lx = knot.x * (1 - pull), ly = knot.y * (1 - pull), lz = knot.z * (1 - pull);
          cam.position.set(lx + Math.sin(az) * dist + sx, ly + 8 + sy, lz + Math.cos(az) * dist);
          cam.lookAt(lx + sx * 0.4, ly + sy * 0.4, lz);
        }
        break;
      }

      case 'enrich':
        orbit(Math.max(95, this.current.radius * 1.5), 12, 0.7); // far, wide, unhurried
        break;

      default:
        orbit(70, 10);
    }
  }

  dispose() {
    this.geo.dispose();
    this.material.dispose();
    this.mgeo.dispose();
    this.mMat.dispose();
    this.pointMat.map?.dispose();
    this.pointMat.dispose();
    this.coreGlowMat.dispose();
    this.heroGlowMat.dispose();
    this.heroMesh.geometry.dispose();
    this.heroMesh.material.dispose();
    for (const f of this.fogs) f.mat.dispose();
    for (const s of this.shocks) {
      s.mesh.geometry.dispose();
      s.mesh.material.dispose();
    }
  }
}
