import * as THREE from 'three';

// The cosmology stage: one particle universe that plays every beat from the void
// to an enriched cloud, driven by named phases the narration calls out. It is
// deliberately impressionistic — this is the one stretch of the film with no
// real geometry to mesh, so it trades literal accuracy for the FEEL of the
// physics: expansion, cooling from white-hot to deep red, fog clearing, the
// first points of starlight, a supernova flash seeding colour into the dark.

const COUNT = 6000;

const VERT = /* glsl */ `
  attribute float size;
  attribute vec3 pcolor;
  varying vec3 vColor;
  void main() {
    vColor = pcolor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vColor;
  void main() {
    vec2 d = gl_PointCoord - vec2(0.5);
    float r = length(d);
    if (r > 0.5) discard;
    float a = smoothstep(0.5, 0.0, r);
    gl_FragColor = vec4(vColor, a);
  }
`;

// Phase -> target look. radius: how far the cloud spreads. temp: colour, hot
// (1, white/blue) to cold (0, deep red/dark). churn: random motion. glow: bloom.
const PHASES = {
  void:           { radius: 0.4,  temp: 1.0, churn: 0.0,  spin: 0.0,  glow: 0.2, stars: 0 },
  bang:           { radius: 8,    temp: 1.0, churn: 2.5,  spin: 0.1,  glow: 1.0, stars: 0 },
  firstmatter:    { radius: 16,   temp: 0.8, churn: 1.2,  spin: 0.05, glow: 0.7, stars: 0 },
  nucleosynthesis:{ radius: 22,   temp: 0.65, churn: 0.7, spin: 0.04, glow: 0.5, stars: 0 },
  fog:            { radius: 28,   temp: 0.5, churn: 0.4,  spin: 0.03, glow: 0.9, stars: 0 },
  recombination:  { radius: 34,   temp: 0.35, churn: 0.2, spin: 0.02, glow: 0.3, stars: 0 },
  structure:      { radius: 40,   temp: 0.28, churn: 0.15, spin: 0.02, glow: 0.25, stars: 0.2 },
  firststars:     { radius: 46,   temp: 0.3,  churn: 0.1, spin: 0.015, glow: 0.5, stars: 0.5 },
  fusion:         { radius: 50,   temp: 0.34, churn: 0.1, spin: 0.015, glow: 0.6, stars: 0.7 },
  supernova:      { radius: 54,   temp: 0.55, churn: 0.5, spin: 0.02, glow: 1.2, stars: 0.8 },
  enrich:         { radius: 58,   temp: 0.32, churn: 0.12, spin: 0.012, glow: 0.5, stars: 1.0 },
};

const hot = new THREE.Color(0xbfd4ff);   // blue-white, hottest
const warm = new THREE.Color(0xffd9a0);
const cool = new THREE.Color(0x8a2b1a);   // deep red, cold
const starC = new THREE.Color(0xfff4e0);

export class BigBangScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x02030a);
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 5000);
    this.camera.position.set(0, 6, 120);
    this.bloom = { strength: 0.6, radius: 0.7, threshold: 0.0 };

    this.target = { ...PHASES.void };
    this.current = { ...PHASES.void };
    this._t = 0;

    // Each particle keeps a stable direction and a per-particle radius factor, so
    // "expansion" is just scaling every particle along its own ray — cheap, and
    // it reads exactly like a universe growing.
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);
    this.dirs = new Float32Array(COUNT * 3);
    this.rfac = new Float32Array(COUNT);
    this.isStar = new Float32Array(COUNT);
    this.phase = new Float32Array(COUNT); // churn phase offset

    for (let i = 0; i < COUNT; i++) {
      const z = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - z * z);
      const dx = r * Math.cos(t), dy = r * Math.sin(t), dz = z;
      this.dirs[i * 3] = dx; this.dirs[i * 3 + 1] = dy; this.dirs[i * 3 + 2] = dz;
      this.rfac[i] = 0.15 + Math.pow(Math.random(), 0.5); // denser toward centre
      this.isStar[i] = Math.random();                     // threshold vs phase.stars
      this.phase[i] = Math.random() * Math.PI * 2;
      sizes[i] = 1.2 + Math.random() * 1.5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('pcolor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.geo = geo;

    this.material = new THREE.ShaderMaterial({
      uniforms: {}, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, this.material);
    this.scene.add(this.points);

    this._spin = 0;
    this._writePositions(0);
  }

  /** The director calls this with a cue's phase name. */
  setPhase(name) {
    const p = PHASES[name];
    if (p) this.target = { ...p };
  }

  _writePositions(dt) {
    const pos = this.geo.getAttribute('position');
    const col = this.geo.getAttribute('pcolor');
    const c = this.current;
    const tmp = new THREE.Color();

    for (let i = 0; i < COUNT; i++) {
      const churn = c.churn;
      const ph = this._t * 0.7 + this.phase[i];
      const jitter = churn * Math.sin(ph) * 2.0;
      const rad = c.radius * this.rfac[i] + jitter;

      pos.setXYZ(i,
        this.dirs[i * 3] * rad,
        this.dirs[i * 3 + 1] * rad,
        this.dirs[i * 3 + 2] * rad,
      );

      // Colour by temperature, with hot cores and cold edges. Stars punch through
      // once the phase turns them on.
      const temp = c.temp;
      if (temp > 0.5) tmp.copy(warm).lerp(hot, (temp - 0.5) * 2);
      else tmp.copy(cool).lerp(warm, temp * 2);

      if (this.isStar[i] < c.stars) {
        const tw = 0.6 + 0.4 * Math.sin(this._t * 3 + this.phase[i] * 5);
        tmp.copy(starC).multiplyScalar(tw);
      }
      col.setXYZ(i, tmp.r, tmp.g, tmp.b);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
  }

  update(dt) {
    this._t += dt;
    // Ease every visual parameter toward its phase target — transitions read as
    // the universe evolving, not as hard cuts.
    const k = Math.min(1, dt * 0.9);
    for (const key of Object.keys(this.target)) {
      this.current[key] += (this.target[key] - this.current[key]) * k;
    }
    this.bloom.strength = 0.3 + this.current.glow * 0.7;

    this._spin += this.current.spin * dt;
    this.points.rotation.y = this._spin;

    this._writePositions(dt);

    // Drift the camera slowly in as the universe fills out.
    const targetZ = 120 - Math.min(60, this.current.radius);
    this.camera.position.z += (targetZ - this.camera.position.z) * Math.min(1, dt * 0.5);
    this.camera.lookAt(0, 0, 0);
  }

  dispose() {
    this.geo.dispose();
    this.material.dispose();
  }
}
