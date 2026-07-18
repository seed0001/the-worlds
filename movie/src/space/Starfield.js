import * as THREE from 'three';
import { makeRng } from '../core/rng.js';

// Procedural starfield rather than the upstream 128px skybox cube — at the focal
// lengths a space battle wants, that cube reads as blurry mush. Points stay sharp
// at any zoom and cost nothing.
//
// Stars are drawn on a shell that rides with the camera, so they never parallax
// and never clip the far plane no matter how far a ship travels.

const STAR_VERT = /* glsl */ `
attribute float size;
attribute vec3 starColor;
varying vec3 vColor;

void main() {
  vColor = starColor;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const STAR_FRAG = /* glsl */ `
uniform float intensity;
varying vec3 vColor;

void main() {
  // Round, soft-edged point with a tight core — a square star reads as a bug.
  vec2 d = gl_PointCoord - vec2(0.5);
  float r = length(d) * 2.0;
  if (r > 1.0) discard;
  float falloff = pow(1.0 - r, 2.5);
  float core = pow(1.0 - r, 12.0);
  gl_FragColor = vec4(vColor * intensity * (falloff + core * 2.0), 1.0);
}
`;

// Rough stellar colours from hot to cool. Real skies are mostly white-ish with a
// few strong colours; the weights reflect that rather than being uniform.
const STAR_COLORS = [
  { color: [0.62, 0.71, 1.00], weight: 2 },  // blue giant
  { color: [0.78, 0.85, 1.00], weight: 5 },
  { color: [1.00, 1.00, 1.00], weight: 22 }, // white
  { color: [1.00, 0.96, 0.86], weight: 16 },
  { color: [1.00, 0.87, 0.66], weight: 8 },
  { color: [1.00, 0.72, 0.48], weight: 4 },  // red dwarf
];

function pickStarColor(rng) {
  const total = STAR_COLORS.reduce((s, c) => s + c.weight, 0);
  let roll = rng() * total;
  for (const entry of STAR_COLORS) {
    roll -= entry.weight;
    if (roll <= 0) return entry.color;
  }
  return STAR_COLORS[2].color;
}

export class Starfield extends THREE.Points {
  /**
   * @param {object} [opts]
   * @param {number} [opts.count] - 6000 is plenty; more just costs fill rate
   * @param {number} [opts.radius] - shell radius in scene units
   * @param {string} [opts.seed]
   */
  constructor({ count = 6000, radius = 4000, seed = 'stars' } = {}) {
    const rng = makeRng(seed);

    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const p = rng.onSphere();
      positions[i * 3 + 0] = p.x * radius;
      positions[i * 3 + 1] = p.y * radius;
      positions[i * 3 + 2] = p.z * radius;

      // Power-law brightness: mostly faint pinpricks, a handful of bright ones.
      const t = rng();
      sizes[i] = 1.0 + Math.pow(t, 8) * 9.0;

      const c = pickStarColor(rng);
      colors[i * 3 + 0] = c[0];
      colors[i * 3 + 1] = c[1];
      colors[i * 3 + 2] = c[2];
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('starColor', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.ShaderMaterial({
      uniforms: { intensity: { value: 1.0 } },
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      depthWrite: false,
      transparent: false,
    });

    super(geometry, material);

    this.frustumCulled = false;
    this.renderOrder = -1000; // always behind everything
    this.matrixAutoUpdate = false;
  }

  /** Keep the shell centred on the camera so stars never parallax or clip. */
  update(camera) {
    this.position.copy(camera.position);
    this.updateMatrix();
    this.updateMatrixWorld(true);
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
