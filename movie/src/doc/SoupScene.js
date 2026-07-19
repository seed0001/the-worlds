import * as THREE from 'three';
import { makeRng, hashSeed } from '../core/rng.js';

// Episode 2, Act 2 — the origin of life, as an actual shot list.
//
// Same philosophy as BigBangScene: every narration beat is its own framed shot,
// cut on setPhase, moved in _updateCamera. Abstract and macro — chemistry as
// spectacle, not a biology-textbook diagram. Two casts carry it, exactly as the
// cosmology act does: a wide "soup" point cloud (thousands of molecules drifting
// in warm water) that is always present, and a small CPU-choreographed hero cast
// that plays the close-ups — the first replicator templating its copy, oil
// beading into a membrane, the first cell, the lineage splitting in two.
//
// The soup is tinted to THIS world: its colours are pulled from the planet's own
// ground, air and star, so the pool that wakes up belongs to the world Episode 1
// picked. Everything is seeded, so a seed always paints the same soup.
//
// Phases (the eight beats of the act):
//   pantry      the element budget as a lit chemistry set, drifting
//   monomers    small molecules forming, breaking, reforming — going nowhere
//   replicator  ONE molecule templates a copy of itself (the hinge)
//   selection   imperfect copies compete; the better copier wins
//   membrane    oil beads into a bubble — the first inside/outside
//   cell        replicator sealed in membrane, feeding — the first cell
//   split       the lineage forks: bodies vs. the parasite (the Ep3 seed)
//   mats        cells in billions stain the shallows — first visible life

const SOUP = 9000;   // ambient molecules
const MACRO = 260;   // the hero close-up cast
const SLAB = 70;     // half-extent of the soup volume

const ss = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------------------------------------------------------------------
// Soup point cloud shader: molecules drifting in water, able to flatten and
// spread into a stained sheet for the final "mats" beat.
// ---------------------------------------------------------------------------

const SOUP_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uChurn;
  uniform float uSpread;   // 0 = suspended volume, 1 = flattened, spreading sheet
  uniform float uSizeScale;

  attribute vec3 aDrift;   // per-particle drift direction
  attribute float aSeed;   // phase offset
  attribute float aTint;   // 0..1 pick among the three soup tints
  attribute float aSize;

  varying float vTint;
  varying float vGlow;

  void main() {
    vec3 pos = position;

    // Brownian churn — everything jostles in the warm water.
    pos += aDrift * uChurn * sin(uTime * 0.6 + aSeed * 6.28) * 3.0;
    pos.y += uChurn * cos(uTime * 0.4 + aSeed * 4.0) * 1.5;

    // Mats: settle toward a thin slab at the floor and spread outward, as the
    // colony carpets the shallows.
    float flatY = mix(pos.y, -26.0 + 4.0 * sin(aSeed * 20.0), uSpread);
    vec2 spread2 = pos.xz * (1.0 + uSpread * 1.4);
    pos = vec3(spread2.x, flatY, spread2.y);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    // Clamp the on-screen size: without this a molecule that drifts close to the
    // lens gets a huge PointSize (300/z) and blooms into a soft orb that eats the
    // frame. Cap it, and fade points that come very near so they don't stack.
    float ps = aSize * uSizeScale * (300.0 / max(-mv.z, 1.0));
    gl_PointSize = min(ps, 34.0);
    float near = smoothstep(5.0, 20.0, -mv.z);

    vTint = aTint;
    vGlow = (0.6 + 0.4 * sin(uTime * 1.3 + aSeed * 9.0)) * near;
  }
`;

const SOUP_FRAG = /* glsl */ `
  precision mediump float;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform float uAlpha;

  varying float vTint;
  varying float vGlow;

  void main() {
    vec2 d = gl_PointCoord - vec2(0.5);
    float r = length(d);
    if (r > 0.5) discard;
    float soft = smoothstep(0.5, 0.0, r);

    vec3 col = vTint < 0.34 ? uColorA : (vTint < 0.67 ? uColorB : uColorC);
    col *= vGlow;
    gl_FragColor = vec4(col, soft * uAlpha);
  }
`;

// The hero cast reuses the same look but takes per-point colour and size on the
// CPU so it can spell out molecules, shells and dividing cells.
const HERO_FRAG = /* glsl */ `
  precision mediump float;
  varying vec3 vColor;
  void main() {
    vec2 d = gl_PointCoord - vec2(0.5);
    float r = length(d);
    if (r > 0.5) discard;
    float soft = smoothstep(0.5, 0.0, r);
    gl_FragColor = vec4(vColor, soft);
  }
`;
const HERO_VERT = /* glsl */ `
  attribute float size;
  attribute vec3 color;
  varying vec3 vColor;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = size * (300.0 / max(-mv.z, 1.0));
    vColor = color;
  }
`;

// Per-phase soup + camera targets, eased each frame.
const PHASES = {
  // alpha is deliberately low on the intimate hero beats (replicator → split):
  // the camera pushes into the soup volume there, and a dense additive cloud
  // would drown the subject. Dim the pool so the hero cast reads.
  pantry:     { churn: 0.5, spread: 0, alpha: 0.85, size: 1.0 },
  monomers:   { churn: 1.0, spread: 0, alpha: 0.55, size: 0.85 },
  replicator: { churn: 0.35, spread: 0, alpha: 0.28, size: 0.75 },
  selection:  { churn: 0.6, spread: 0, alpha: 0.34, size: 0.8 },
  membrane:   { churn: 0.4, spread: 0, alpha: 0.28, size: 0.75 },
  cell:       { churn: 0.4, spread: 0, alpha: 0.30, size: 0.8 },
  split:      { churn: 0.5, spread: 0, alpha: 0.38, size: 0.85 },
  mats:       { churn: 0.7, spread: 1, alpha: 1.0, size: 1.15 },
};
const HERO_SHOTS = new Set(['monomers', 'replicator', 'selection', 'membrane', 'cell', 'split']);

export class SoupScene {
  /** @param {import('../world/World.js').World} world - the living world (for palette) */
  constructor(world) {
    this.world = world;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x03060c);
    this._bgTarget = new THREE.Color(0x061019);
    this.bloom = { strength: 0.4, radius: 0.6, threshold: 0.14 };

    this.camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 6000);
    this.camera.position.set(0, 8, 95);

    const rng = makeRng(hashSeed('soup:' + (world?.seed ?? 'soup')));
    this.rng = rng;

    // Three soup tints, drawn from this world so the pool belongs to the planet:
    // its mineral rock, its air, its starlight — pushed luminous for the water.
    const g = world?.surface?.ground ?? {};
    const mineral = new THREE.Color(g.soil ?? 0x6a563c).lerp(new THREE.Color(0xffffff), 0.15);
    const air = new THREE.Color(world?.atmosphere?.color ?? 0x8fd0ff).lerp(new THREE.Color(0xffffff), 0.1);
    const star = new THREE.Color(world?.surface?.sunColor ?? 0xfff0d0);
    this.tints = { a: mineral, b: air, c: star };

    this._buildSoup();
    this._buildHero();

    // Phase state (mirrors BigBangScene).
    this._t = 0;
    this.shot = 'pantry';
    this.shotT = 0;
    this.current = { ...PHASES.pantry };
    this.target = { ...PHASES.pantry };
    this._camAz = 0;

    this.setPhase('pantry');
  }

  _buildSoup() {
    const n = SOUP;
    const pos = new Float32Array(n * 3);
    const drift = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    const tint = new Float32Array(n);
    const size = new Float32Array(n);
    const r = this.rng;
    for (let i = 0; i < n; i++) {
      // A wide, slightly flattened volume of warm water.
      pos[i * 3] = r.range(-SLAB, SLAB);
      pos[i * 3 + 1] = r.range(-SLAB * 0.45, SLAB * 0.45);
      pos[i * 3 + 2] = r.range(-SLAB, SLAB);
      const d = r.onSphere();
      drift[i * 3] = d.x; drift[i * 3 + 1] = d.y; drift[i * 3 + 2] = d.z;
      seed[i] = r.range(0, 1);
      tint[i] = r.range(0, 1);
      size[i] = r.range(1.2, 3.4);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aDrift', new THREE.BufferAttribute(drift, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geo.setAttribute('aTint', new THREE.BufferAttribute(tint, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));

    this.soupUniforms = {
      uTime: { value: 0 },
      uChurn: { value: 0.5 },
      uSpread: { value: 0 },
      uSizeScale: { value: 1 },
      uAlpha: { value: 0.9 },
      uColorA: { value: this.tints.a },
      uColorB: { value: this.tints.b },
      uColorC: { value: this.tints.c },
    };
    this.soupGeo = geo;
    this.soupMat = new THREE.ShaderMaterial({
      uniforms: this.soupUniforms,
      vertexShader: SOUP_VERT,
      fragmentShader: SOUP_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.soup = new THREE.Points(geo, this.soupMat);
    this.soup.frustumCulled = false;
    this.scene.add(this.soup);
  }

  _buildHero() {
    const n = MACRO;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('size', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
    this.heroGeo = geo;
    this.heroMat = new THREE.ShaderMaterial({
      vertexShader: HERO_VERT,
      fragmentShader: HERO_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.hero = new THREE.Points(geo, this.heroMat);
    this.hero.frustumCulled = false;
    this.hero.visible = false;
    this.scene.add(this.hero);
    // Scratch colours reused so the writers allocate nothing per frame.
    this._c0 = new THREE.Color();
  }

  // --- Hero writers: each fills position/color/size for the active shot. ------

  _writePoint(i, x, y, z, color, s) {
    const p = this.heroGeo.attributes.position.array;
    const c = this.heroGeo.attributes.color.array;
    const z0 = this.heroGeo.attributes.size.array;
    p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z;
    c[i * 3] = color.r; c[i * 3 + 1] = color.g; c[i * 3 + 2] = color.b;
    z0[i] = s;
  }

  _heroDirty() {
    this.heroGeo.attributes.position.needsUpdate = true;
    this.heroGeo.attributes.color.needsUpdate = true;
    this.heroGeo.attributes.size.needsUpdate = true;
  }

  _writeHero() {
    const t = this._t, st = this.shotT;
    const { a, b, c } = this.tints;
    const dim = this._c0;

    switch (this.shot) {
      case 'monomers': {
        // ~30 little clusters wandering, forming and breaking transient bonds.
        const G = 30, per = Math.floor(MACRO / G);
        for (let gi = 0; gi < G; gi++) {
          const cx = Math.sin(gi * 1.7 + t * 0.15) * 40;
          const cy = Math.cos(gi * 2.3 + t * 0.11) * 22;
          const cz = Math.sin(gi * 0.9 - t * 0.13) * 40;
          const bond = 0.5 + 0.5 * Math.sin(t * 0.8 + gi); // pulses tight/loose
          for (let k = 0; k < per; k++) {
            const i = gi * per + k;
            const a2 = k * 2.4 + t * (0.6 + gi * 0.03);
            const rad = lerp(6, 1.6, bond) * (0.6 + 0.4 * Math.sin(a2 * 1.3));
            this._writePoint(i,
              cx + Math.cos(a2) * rad,
              cy + Math.sin(a2 * 1.4) * rad * 0.7,
              cz + Math.sin(a2) * rad,
              b, 3.2);
          }
        }
        break;
      }
      case 'replicator': {
        // A template strand; a copy assembles alongside it, base by base.
        const K = 18;
        const prog = ss(1.5, 11, st);         // how much of the copy exists
        const built = Math.floor(prog * K);
        const fresh = prog * K - built;        // the base currently locking on
        let i = 0;
        for (let n = 0; n < K; n++, i++) {
          const y = (n - (K - 1) / 2) * 3.0;
          const twist = n * 0.5 + t * 0.2;
          // template (left), gently helical
          this._writePoint(i, -3 + Math.cos(twist) * 1.2, y, Math.sin(twist) * 1.2, c, 4.2);
        }
        for (let n = 0; n < K; n++, i++) {
          const y = (n - (K - 1) / 2) * 3.0;
          const twist = n * 0.5 + t * 0.2;
          let on = n < built ? 1 : (n === built ? fresh : 0);
          const flash = n === built ? 1 + 3 * (1 - fresh) : 1;
          const x = 3 - Math.cos(twist) * 1.2;
          this._writePoint(i, x, y, -Math.sin(twist) * 1.2, a, 4.2 * on * flash);
        }
        // Remaining points: the monomer pool being drawn down.
        for (; i < MACRO; i++) {
          const s = i * 12.9898;
          const fade = 1 - prog * 0.7;
          this._writePoint(i,
            Math.sin(s) * 26, Math.cos(s * 1.7) * 20, Math.sin(s * 2.3) * 26,
            dim.copy(b).multiplyScalar(0.4 * fade), 2.2 * fade);
        }
        break;
      }
      case 'selection': {
        // Several competing copier blobs; the fittest wins share over time.
        const B = 6;
        let i = 0;
        for (let bi = 0; bi < B; bi++) {
          const fitness = 0.2 + 0.8 * ((bi * 0.618) % 1); // deterministic spread
          // The best blob's share grows with shotT; the rest shrink.
          const win = ss(0, 14, st) * (fitness > 0.75 ? 1 : -0.5);
          const share = Math.max(0.02, fitness + win);
          const count = Math.max(2, Math.floor((share / B) * MACRO * 1.4));
          const cx = Math.sin(bi * 2.1) * 34;
          const cy = Math.cos(bi * 1.3) * 20;
          const cz = Math.sin(bi * 3.7) * 30;
          const bright = 0.3 + fitness;
          for (let k = 0; k < count && i < MACRO; k++, i++) {
            const a2 = k * 2.399 + t * 0.3;
            const rad = 3 + (k / count) * 7;
            this._writePoint(i,
              cx + Math.cos(a2) * rad,
              cy + Math.sin(a2 * 1.7) * rad * 0.6,
              cz + Math.sin(a2) * rad,
              dim.copy(a).multiplyScalar(bright), 3.4);
          }
        }
        for (; i < MACRO; i++) this._writePoint(i, 0, -9999, 0, dim.setRGB(0, 0, 0), 0);
        break;
      }
      case 'membrane': {
        // Scattered oil converges into a hollow shell — the first boundary.
        const conv = ss(0.5, 9, st);
        const R = 14;
        for (let i = 0; i < MACRO; i++) {
          const s = i * 1.0;
          // deterministic point on a sphere (golden spiral)
          const y = 1 - (i / (MACRO - 1)) * 2;
          const rad = Math.sqrt(Math.max(0, 1 - y * y));
          const th = i * 2.399963;
          const sx = Math.cos(th) * rad, sy = y, sz = Math.sin(th) * rad;
          // scattered start position
          const jx = Math.sin(s * 12.9) * 40, jy = Math.cos(s * 7.3) * 30, jz = Math.sin(s * 4.1) * 40;
          const wob = 1 + 0.03 * Math.sin(t * 1.5 + i);
          this._writePoint(i,
            lerp(jx, sx * R * wob, conv),
            lerp(jy, sy * R * wob, conv),
            lerp(jz, sz * R * wob, conv),
            b, lerp(2.4, 3.6, conv));
        }
        break;
      }
      case 'cell': {
        // The shell, now settled and slowly turning, with a replicator core
        // pulsing inside — metabolism.
        const R = 14;
        const spin = t * 0.25;
        const shellN = Math.floor(MACRO * 0.72);
        for (let i = 0; i < shellN; i++) {
          const y = 1 - (i / (shellN - 1)) * 2;
          const rad = Math.sqrt(Math.max(0, 1 - y * y));
          const th = i * 2.399963 + spin;
          this._writePoint(i, Math.cos(th) * rad * R, y * R, Math.sin(th) * rad * R, b, 3.2);
        }
        const pulse = 3 + 1.6 * Math.sin(t * 2.2); // feeding rhythm
        for (let i = shellN; i < MACRO; i++) {
          const a2 = i * 2.399 + t * 0.6;
          const rad = pulse * (0.4 + 0.6 * Math.sin(i));
          this._writePoint(i, Math.cos(a2) * rad, Math.sin(a2 * 1.3) * rad, Math.sin(a2) * rad,
            this._c0.copy(a).lerp(c, 0.5), 3.6);
        }
        break;
      }
      case 'split': {
        // Two lineages diverge: bodies (big, bright, many) and the parasite
        // (small, dim, few). A thinning bridge of shared ancestry between them.
        const sep = ss(0, 10, st);
        const c1 = { x: -sep * 26, y: 0, z: 0 };          // bodies
        const c2 = { x: sep * 24, y: sep * 10, z: 0 };    // parasite
        const bodyN = Math.floor(MACRO * 0.78);
        for (let i = 0; i < bodyN; i++) {
          const a2 = i * 2.399 + t * 0.25;
          const rad = 3 + (i / bodyN) * 10;
          this._writePoint(i,
            c1.x + Math.cos(a2) * rad, c1.y + Math.sin(a2 * 1.7) * rad * 0.7, c1.z + Math.sin(a2) * rad,
            a, 3.6);
        }
        const bridge = Math.floor(MACRO * 0.06);
        for (let i = bodyN; i < bodyN + bridge; i++) {
          const f = (i - bodyN) / Math.max(1, bridge - 1);
          this._writePoint(i,
            lerp(c1.x, c2.x, f), lerp(c1.y, c2.y, f), 0,
            this._c0.copy(b).multiplyScalar(0.5 * (1 - sep)), 2.0 * (1 - sep));
        }
        for (let i = bodyN + bridge; i < MACRO; i++) {
          const a2 = i * 2.7 + t * 0.5;
          const rad = 1.4 + 2 * Math.sin(i);
          this._writePoint(i,
            c2.x + Math.cos(a2) * rad, c2.y + Math.sin(a2) * rad, c2.z + Math.sin(a2 * 1.3) * rad,
            this._c0.copy(b).multiplyScalar(0.5), 2.2);
        }
        break;
      }
      default:
        return;
    }
    this._heroDirty();
  }

  // --- Scene contract --------------------------------------------------------

  setPhase(name) {
    const p = PHASES[name];
    if (!p) return;
    this.shot = name;
    this.shotT = 0;
    this.target = { ...p };
    this.hero.visible = HERO_SHOTS.has(name);
    // Background warms for the pantry, cools/darkens toward the abstract beats,
    // brightens for the mats reveal.
    const bg = {
      pantry: 0x0a1420, monomers: 0x07101a, replicator: 0x05080f, selection: 0x070a12,
      membrane: 0x05080f, cell: 0x060a10, split: 0x080a14, mats: 0x0c1a22,
    }[name] ?? 0x061019;
    this._bgTarget.setHex(bg);
    this._camAz = 0;
  }

  update(dt) {
    this._t += dt;
    this.shotT += dt;

    // Ease soup params toward the phase target.
    const k = Math.min(1, dt * 0.9);
    for (const key of Object.keys(this.target)) {
      this.current[key] += (this.target[key] - this.current[key]) * k;
    }
    const u = this.soupUniforms;
    u.uTime.value = this._t;
    u.uChurn.value = this.current.churn;
    u.uSpread.value = this.current.spread;
    u.uSizeScale.value = this.current.size;
    u.uAlpha.value = this.current.alpha;

    if (this.hero.visible) this._writeHero();

    this.scene.background.lerp(this._bgTarget, Math.min(1, dt * 2));
    this._updateCamera(dt);
  }

  /** Every beat its own framing. Cuts on setPhase; moves here. */
  _updateCamera(dt) {
    const t = this._t, st = this.shotT;
    const cam = this.camera;

    const orbit = (dist, elev, speed = 0.12) => {
      this._camAz += speed * dt;
      cam.position.set(Math.sin(this._camAz) * dist, elev + Math.sin(t * 0.3) * 2, Math.cos(this._camAz) * dist);
      cam.lookAt(0, 0, 0);
    };

    switch (this.shot) {
      case 'pantry': {
        // Wide, weightless lateral drift across the lit pool.
        const x = Math.sin(t * 0.06) * 24;
        cam.position.set(x, 10 + Math.sin(t * 0.15) * 3, 95);
        cam.lookAt(x * 0.4, 0, 0);
        break;
      }
      case 'monomers':
        cam.position.set(Math.sin(t * 0.1) * 8, 4 + Math.sin(t * 0.2) * 2, 52);
        cam.lookAt(Math.sin(t * 0.07) * 6, 0, 0);
        break;
      case 'replicator': {
        // A deliberate push onto the molecule that copies itself.
        const z = lerp(58, 22, ss(0, 11, st));
        cam.position.set(Math.sin(t * 0.05) * 3, 1, z);
        cam.lookAt(0, 0, 0);
        break;
      }
      case 'selection':
        orbit(50, 8, 0.18);
        break;
      case 'membrane': {
        const z = lerp(46, 20, ss(0, 9, st));
        cam.position.set(Math.sin(t * 0.06) * 3, 2, z);
        cam.lookAt(0, 0, 0);
        break;
      }
      case 'cell':
        orbit(26, 3, 0.22);
        break;
      case 'split': {
        // Track the diverging pair from the side.
        const sep = ss(0, 10, st);
        cam.position.set(lerp(-6, -2, sep), 6, lerp(40, 54, sep));
        cam.lookAt(0, sep * 4, 0);
        break;
      }
      case 'mats': {
        // Pull back and rise, tilting down as the colony carpets the shallows.
        const pull = ss(0, 12, st);
        cam.position.set(0, lerp(10, 70, pull), lerp(40, 130, pull));
        cam.lookAt(0, lerp(0, -20, pull), 0);
        break;
      }
      default:
        orbit(80, 10);
    }
  }

  dispose() {
    this.soupGeo.dispose();
    this.soupMat.dispose();
    this.heroGeo.dispose();
    this.heroMat.dispose();
  }
}
