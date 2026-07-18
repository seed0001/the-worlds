import * as THREE from 'three';
import { ATMOSPHERE_VERT, ATMOSPHERE_FRAG } from './glsl/planet.js';

// Cloud shell, adapted from the planets repo. Two changes: shaders come from a
// module instead of the DOM, and particle placement uses the world's seeded rng
// so a given world's cloud deck is reproducible across renders.

const texLoader = new THREE.TextureLoader();
let cloudTex = null;

function getCloudTexture() {
  if (!cloudTex) cloudTex = texLoader.load('/textures/cloud.png');
  return cloudTex;
}

export class Atmosphere extends THREE.Points {
  /**
   * @param {object} params - THREE uniform-style params ({value} wrappers)
   * @param {Function} rng - seeded rng from core/rng.js
   */
  constructor(params, rng) {
    super();

    this.params = params;
    this.rng = rng ?? Math.random;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pointTexture: { value: getCloudTexture() },
        ...params,
      },
      vertexShader: ATMOSPHERE_VERT,
      fragmentShader: ATMOSPHERE_FRAG,
      blending: THREE.NormalBlending,
      depthWrite: false,
      transparent: true,
    });

    this.rebuild();
  }

  rebuild() {
    this.geometry?.dispose();

    const rng = this.rng;
    const count = Math.round(this.params.particles.value);
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const minSize = this.params.minParticleSize.value;
    const maxSize = this.params.maxParticleSize.value;

    for (let i = 0; i < count; i++) {
      const r = rng() * this.params.thickness.value + this.params.radius.value;

      // Rejection-free uniform direction: normalizing a cube sample avoids the
      // pole bunching you get from parameterising spherical coordinates.
      let x = 2 * rng() - 1;
      let y = 2 * rng() - 1;
      let z = 2 * rng() - 1;
      const len = Math.hypot(x, y, z) || 1;
      x = (x / len) * r;
      y = (y / len) * r;
      z = (z / len) * r;

      positions[i * 3 + 0] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      sizes[i] = rng() * (maxSize - minSize) + minSize;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.geometry = geometry;
  }

  update(elapsed) {
    this.material.uniforms.time.value = elapsed;
  }

  dispose() {
    this.geometry?.dispose();
    this.material.dispose();
  }
}
