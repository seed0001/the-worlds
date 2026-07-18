import * as THREE from 'three';
import { NOISE_GLSL } from '../world/glsl/noise.js';
import { simplex3Debug } from '../world/terrain.js';

// Stage-by-stage diff of the GPU and CPU simplex implementations for a single
// input point. When checkTerrainParity fails, this says *where*.
//
// Each stage shares one prelude that reproduces the full simplex setup, then
// writes four floats out. Comparing per-corner vectors directly — rather than
// only the final scalar — is what makes a transposed swizzle findable.

const PROBE_VERT = 'void main(){ gl_Position = vec4(position, 1.0); }';

const PRELUDE = /* glsl */ `
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

  vec3 im = mod(i, 289.0);
  vec4 p = permute(permute(permute(
             im.z + vec4(0.0, i1.z, i2.z, 1.0))
           + im.y + vec4(0.0, i1.y, i2.y, 1.0))
           + im.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 1.0/7.0;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
`;

const STAGES = {
  cell: 'gl_FragColor = vec4(i, 0.0);',
  x0: 'gl_FragColor = vec4(x0, 0.0);',
  offsets: 'gl_FragColor = vec4(i1.x, i1.y, i1.z, i2.x);',
  i2vec: 'gl_FragColor = vec4(i2, 0.0);',
  permuted: 'gl_FragColor = p;',
  // Per-corner gradient vectors, pre-normalisation.
  p0vec: 'gl_FragColor = vec4(p0, 0.0);',
  p1vec: 'gl_FragColor = vec4(p1, 0.0);',
  p2vec: 'gl_FragColor = vec4(p2, 0.0);',
  p3vec: 'gl_FragColor = vec4(p3, 0.0);',
  // Per-corner offset vectors.
  x1vec: 'gl_FragColor = vec4(x1, 0.0);',
  x2vec: 'gl_FragColor = vec4(x2, 0.0);',
  x3vec: 'gl_FragColor = vec4(x3, 0.0);',
  result: 'gl_FragColor = vec4(simplex3(v), 0.0, 0.0, 0.0);',
};

/**
 * @param {THREE.WebGLRenderer} renderer
 * @param {{x:number,y:number,z:number}} v
 * @returns {Array<{stage:string, gpu:number[], cpu:number[], maxDiff:number}>}
 */
export function probeNoise(renderer, v = { x: 0.3, y: -0.7, z: 0.5 }) {
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.FloatType,
    format: THREE.RGBAFormat,
    depthBuffer: false,
    stencilBuffer: false,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
  });

  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const geometry = new THREE.PlaneGeometry(2, 2);
  const prevTarget = renderer.getRenderTarget();
  const pixel = new Float32Array(4);

  const c = simplex3Debug(v.x, v.y, v.z);
  const grad = (n) => [c.gradients[n * 3], c.gradients[n * 3 + 1], c.gradients[n * 3 + 2]];

  const cpuStages = {
    cell: c.cell,
    x0: c.x0,
    offsets: [c.i1[0], c.i1[1], c.i1[2], c.i2[0]],
    i2vec: c.i2,
    permuted: c.permuted,
    p0vec: grad(0),
    p1vec: grad(1),
    p2vec: grad(2),
    p3vec: grad(3),
    x1vec: c.corners[1],
    x2vec: c.corners[2],
    x3vec: c.corners[3],
    result: [c.result, 0, 0, 0],
  };

  const report = [];

  for (const [stage, body] of Object.entries(STAGES)) {
    const material = new THREE.ShaderMaterial({
      uniforms: { v: { value: new THREE.Vector3(v.x, v.y, v.z) } },
      vertexShader: PROBE_VERT,
      fragmentShader: `${NOISE_GLSL}\nuniform vec3 v;\nvoid main(){\n${PRELUDE}\n${body}\n}`,
      depthTest: false,
      depthWrite: false,
    });
    const quad = new THREE.Mesh(geometry, material);
    scene.add(quad);

    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(target, 0, 0, 1, 1, pixel);

    scene.remove(quad);
    material.dispose();

    const expected = cpuStages[stage];
    const gpuValues = Array.from(pixel).slice(0, expected.length);
    let maxDiff = 0;
    for (let i = 0; i < expected.length; i++) {
      maxDiff = Math.max(maxDiff, Math.abs(gpuValues[i] - expected[i]));
    }

    report.push({
      stage,
      gpu: gpuValues.map((n) => +n.toPrecision(8)),
      cpu: expected.map((n) => +n.toPrecision(8)),
      maxDiff: +maxDiff.toExponential(3),
    });
  }

  renderer.setRenderTarget(prevTarget);
  geometry.dispose();
  target.dispose();

  return report;
}
