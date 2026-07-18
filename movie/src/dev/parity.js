import * as THREE from 'three';
import { NOISE_GLSL } from '../world/glsl/noise.js';
import { terrainHeight } from '../world/terrain.js';
import { makeRng } from '../core/rng.js';

// GPU/CPU terrain parity check.
//
// The whole pipeline rests on one unverified-by-default assumption: that
// terrain.js computes the same height field as noise.js. If it doesn't, trees
// hover, the lander sinks, and the surface stops being the planet you saw from
// orbit — all of which look like art bugs, not maths bugs, and would cost days.
//
// So we measure it: run the real GLSL on the GPU over N sample directions, run
// the JS over the same directions, and diff. Called from main.js in dev; run it
// again after touching either side.

// One sample per draw, direction passed as a uniform.
//
// The first version of this harness packed all the directions into a float
// texture and evaluated them in a single draw. It reported enormous errors — and
// the errors were fake: both sides produced *plausible* heights that simply
// belonged to different points, which is the signature of a sampling
// misalignment rather than bad maths. A test you cannot trust is worse than no
// test, so the texture is gone. 512 draws costs a few milliseconds once, at dev
// startup, and leaves nothing between the two implementations but the maths.
const PARITY_FRAG = /* glsl */ `
${NOISE_GLSL}

uniform vec3 direction;
uniform int type;
uniform vec3 seedOffset;
uniform float amplitude;
uniform float sharpness;
uniform float offset;
uniform float period;
uniform float persistence;
uniform float lacunarity;
uniform int octaves;

void main() {
  float h = terrainHeight(
    type, direction, seedOffset,
    amplitude, sharpness, offset,
    period, persistence, lacunarity, octaves);

  gl_FragColor = vec4(h, 0.0, 0.0, 1.0);
}
`;

const PARITY_VERT = /* glsl */ `
void main() {
  gl_Position = vec4(position, 1.0);
}
`;

/**
 * @param {THREE.WebGLRenderer} renderer
 * @param {object} params - terrain params, as on World.terrain
 * @param {number} [samples]
 * @returns {{passed:boolean, maxAbsError:number, maxRelError:number, samples:number, worst:object}}
 */
export function checkTerrainParity(renderer, params, samples = 512) {
  const rng = makeRng('parity');

  const dirs = [];
  for (let i = 0; i < samples; i++) dirs.push(rng.onSphere());

  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.FloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: false,
    stencilBuffer: false,
  });

  const material = new THREE.ShaderMaterial({
    uniforms: {
      direction: { value: new THREE.Vector3() },
      type: { value: params.type },
      seedOffset: { value: new THREE.Vector3(params.seedOffset.x, params.seedOffset.y, params.seedOffset.z) },
      amplitude: { value: params.amplitude },
      sharpness: { value: params.sharpness },
      offset: { value: params.offset },
      period: { value: params.period },
      persistence: { value: params.persistence },
      lacunarity: { value: params.lacunarity },
      octaves: { value: params.octaves },
    },
    vertexShader: PARITY_VERT,
    fragmentShader: PARITY_FRAG,
    depthTest: false,
    depthWrite: false,
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  const scene = new THREE.Scene();
  scene.add(quad);
  const camera = new THREE.Camera();

  const prevTarget = renderer.getRenderTarget();
  renderer.setRenderTarget(target);

  const pixel = new Float32Array(4);
  let maxAbsError = 0;
  let maxRelError = 0;
  let worst = null;

  for (let i = 0; i < samples; i++) {
    const d = dirs[i];
    material.uniforms.direction.value.set(d.x, d.y, d.z);
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(target, 0, 0, 1, 1, pixel);

    const gpu = pixel[0];
    const cpu = terrainHeight(d.x, d.y, d.z, params);
    const absError = Math.abs(gpu - cpu);
    const relError = absError / Math.max(Math.abs(cpu), 1e-4);

    if (absError > maxAbsError) {
      maxAbsError = absError;
      worst = { index: i, dir: d, gpu, cpu, absError, relError };
    }
    maxRelError = Math.max(maxRelError, relError);
  }

  renderer.setRenderTarget(prevTarget);

  quad.geometry.dispose();
  material.dispose();
  target.dispose();

  // Tolerance in orbital units of terrain height; 1e-3 is 1 m of ground.
  //
  // The CPU emulates float32 (see terrain.js), so the two sides agree to about
  // 6e-6 at zero seed offset — essentially ULP-level. What is left is GLSL's
  // freedom to contract multiply-adds into FMA inside dot(), which we cannot
  // replicate from JS and which grows with the sample magnitude. World.js caps
  // the seed offset to keep that under ~2e-4.
  //
  // If this starts failing, check the seed offset magnitude before suspecting
  // the port.
  const passed = maxAbsError < 1e-3;

  return { passed, maxAbsError, maxRelError, samples, worst };
}
