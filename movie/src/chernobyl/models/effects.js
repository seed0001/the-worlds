import * as THREE from 'three';

// The aftermath's atmosphere: the smoke plume off the open core, the drifting
// embers of the graphite fire, and the faint blue column of ionized air that
// stood over Reactor 4 in the dark. All cheap, all procedural — the same soft
// sprite the rocket engine used, recoloured for a fire that no one could see the
// danger of.

function softSprite(inner = 'rgba(255,255,255,0.9)', mid = 'rgba(230,228,222,0.5)') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 3, 64, 64, 62);
  g.addColorStop(0, inner);
  g.addColorStop(0.5, mid);
  g.addColorStop(1, 'rgba(210,208,200,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// --- Smoke plume: dark, slow, buoyant. Emits from a base point. -------------
const PLUME_COUNT = 70;

export class Plume {
  constructor({ color = 0x2a2622, spread = 6, rise = 8 } = {}) {
    this.group = new THREE.Group();
    this.group.name = 'plume';
    this.spread = spread;
    this.rise = rise;
    this.base = new THREE.Color(color);
    const tex = softSprite('rgba(120,116,110,0.85)', 'rgba(70,66,62,0.5)');
    this.puffs = [];
    for (let i = 0; i < PLUME_COUNT; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, color: this.base.clone(), transparent: true, opacity: 0, depthWrite: false,
      }));
      s.visible = false;
      this.group.add(s);
      this.puffs.push({ sprite: s, life: 0, max: 1, vx: 0, vy: 0, vz: 0, base: 6 });
    }
    this._next = 0;
    this._pos = new THREE.Vector3();
  }

  setBase(x, y, z) { this._pos.set(x, y, z); }

  _emit() {
    const s = this.puffs[this._next];
    this._next = (this._next + 1) % this.puffs.length;
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * this.spread;
    s.sprite.position.set(this._pos.x + Math.cos(a) * r, this._pos.y + Math.random() * 3, this._pos.z + Math.sin(a) * r);
    s.vx = Math.cos(a) * (1 + Math.random() * 2.5);
    s.vz = Math.sin(a) * (1 + Math.random() * 2.5);
    s.vy = this.rise * (0.5 + Math.random());
    s.life = 0;
    s.max = 4 + Math.random() * 4;
    s.base = 7 + Math.random() * 10;
    s.sprite.visible = true;
  }

  // intensity 0..1 sets how many puffs per second and how black they are.
  update(dt, intensity = 1) {
    let budget = intensity * 6;
    while (budget > 0) {
      if (Math.random() < budget) this._emit();
      budget -= 1;
    }
    for (const s of this.puffs) {
      if (!s.sprite.visible) continue;
      s.life += dt;
      const k = s.life / s.max;
      if (k >= 1) { s.sprite.visible = false; s.sprite.material.opacity = 0; continue; }
      s.vy += dt * 1.2;
      s.vx *= 1 - dt * 0.2;
      s.sprite.position.x += s.vx * dt;
      s.sprite.position.y += s.vy * dt;
      s.sprite.position.z += s.vz * dt;
      const scale = s.base * (0.7 + k * 2.4);
      s.sprite.scale.set(scale, scale, 1);
      s.sprite.material.opacity = Math.sin(k * Math.PI) * 0.55 * intensity;
      // Lit orange from below near the base, cooling to grey-brown as it rises.
      const heat = Math.max(0, 1 - k * 2.2);
      s.sprite.material.color.setRGB(0.16 + heat * 0.7, 0.15 + heat * 0.28, 0.14);
    }
  }

  dispose() { for (const s of this.puffs) s.sprite.material.dispose(); }
}

// --- Embers: additive sparks that lift off the burning graphite. ------------
const EMBER_COUNT = 160;

export class Embers {
  constructor() {
    const pos = new Float32Array(EMBER_COUNT * 3);
    this.state = [];
    for (let i = 0; i < EMBER_COUNT; i++) this.state.push({ life: 0, max: 0, vx: 0, vy: 0, vz: 0 });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.geo = geo;
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xff8a3a, size: 0.5, sizeAttenuation: true,
      transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.points.name = 'embers';
    this._span = 20; // horizontal spread of the source
  }

  update(dt, intensity = 1) {
    const arr = this.geo.attributes.position.array;
    for (let i = 0; i < EMBER_COUNT; i++) {
      const s = this.state[i];
      s.life -= dt;
      if (s.life <= 0) {
        if (Math.random() < intensity * 0.6) {
          s.max = s.life = 1.4 + Math.random() * 2.2;
          arr[i * 3] = (Math.random() - 0.5) * this._span;
          arr[i * 3 + 1] = Math.random() * 1.5;
          arr[i * 3 + 2] = (Math.random() - 0.5) * this._span * 0.4;
          s.vx = (Math.random() - 0.5) * 2;
          s.vy = 5 + Math.random() * 9;
          s.vz = (Math.random() - 0.5) * 2;
        } else {
          arr[i * 3 + 1] = -9999; // parked out of view
          continue;
        }
      }
      s.vy -= dt * 1.5;
      arr[i * 3] += s.vx * dt;
      arr[i * 3 + 1] += s.vy * dt;
      arr[i * 3 + 2] += s.vz * dt;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.points.material.opacity = 0.9 * intensity;
  }

  dispose() { this.geo.dispose(); this.points.material.dispose(); }
}

// --- The blue glow: ionized air over the open core. A faint additive column
// plus a cold point light. This is the image the piece closes toward. --------
const ION_VERT = /* glsl */`
varying float vY;
void main(){ vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const ION_FRAG = /* glsl */`
uniform vec3 uColor; uniform float uOpacity;
varying float vY;
void main(){
  // Wispy, not solid: brightest low down where the air is densest and most
  // ionized, thinning to nothing as it rises. Additive, so it reads as light.
  float a = uOpacity * pow(max(0.0, 1.0 - vY), 1.6);
  gl_FragColor = vec4(uColor, a);
}`;

export function buildBlueColumn(height = 56) {
  const group = new THREE.Group();
  group.name = 'ion-glow';

  // Two nested cones — a faint wide haze and a brighter slim core — both fading
  // out with height, so the column looks like glowing air rather than a wall.
  const mat = (opacity, color) => new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity } },
    vertexShader: ION_VERT, fragmentShader: ION_FRAG,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const haze = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 7.5, height, 28, 1, true), mat(0, 0x4fb8ff));
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 3.2, height * 0.9, 24, 1, true), mat(0, 0x9fe4ff));
  haze.position.y = height / 2;
  core.position.y = height * 0.45;
  group.add(haze, core);

  const light = new THREE.PointLight(0x8fdcff, 0, 120, 2);
  light.position.y = 6;
  group.add(light);

  group.userData = {
    light,
    setIntensity(v) {
      const k = THREE.MathUtils.clamp(v, 0, 1);
      haze.material.uniforms.uOpacity.value = k * 0.28;
      core.material.uniforms.uOpacity.value = k * 0.5;
      light.intensity = k * 3.2;
    },
  };
  return group;
}
