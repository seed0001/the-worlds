// CPU twin of src/world/glsl/noise.js.
//
// The orbital planet is a GPU-displaced sphere: its mountains exist only in the
// vertex shader, which means nothing on the CPU knows where the ground is. This
// file fixes that. Every function here is a line-for-line port of its GLSL
// counterpart — including two upstream quirks that are reproduced on purpose:
//
//   1. fractal3 accumulates max_amp *after* multiplying by persistence.
//   2. fractal3 takes `sharpness` and never uses it.
//
// They are not bugs to fix here. They are the definition of the height field the
// shader draws, and the whole point of this file is to agree with the shader.
// If you change one side, change both, then re-run assertTerrainParity().

// Every arithmetic step below is rounded to float32 via Math.fround (aliased to
// `f`). This is not defensive style — it is load-bearing, and it is the single
// least obvious thing in this codebase.
//
// A faithful float64 port of this shader DOES NOT agree with the shader. The
// algorithm branches on `h = 1 - |x| - |y|`, where x and y are drawn off a 7x7
// gradient lattice, so h is *exactly zero* for a large share of lookups. At
// h == 0 the GPU's float32 arithmetic produces +5.96e-8 while float64 produces
// -1.1e-16; `sh = -step(h, 0.0)` then sends the two implementations down
// opposite branches, flipping the gradient's sign and changing the noise value
// outright — errors of 0.3+, not rounding dust. Measured, not theorised: see
// src/dev/noiseProbe.js, stage p1vec.
//
// Emulating float32 makes the branch land the same way on both sides. The cost
// is roughly 1.5x on CPU sampling, paid once per terrain patch behind a loading
// state, which is a bargain for trees that actually touch the ground.
const f = Math.fround;

const F3 = f(1.0 / 3.0);
const G3 = f(1.0 / 6.0);

/** GLSL mod(): differs from JS % for negative operands. */
function glslMod(x, y) {
  return x - y * Math.floor(x / y);
}

function permute(x) {
  return glslMod(f(f(f(x * 34.0) + 1.0) * x), 289.0);
}

const TAYLOR_A = f(1.79284291400159);
const TAYLOR_B = f(0.85373472095314);

function taylorInvSqrt(r) {
  return f(TAYLOR_A - f(TAYLOR_B * r));
}

/** step(edge, x) === x >= edge ? 1 : 0 */
function step(edge, x) {
  return x >= edge ? 1.0 : 0.0;
}

/**
 * Ashima simplex 3D noise, ported from GLSL. Returns roughly [-1, 1].
 * Hot path — written with scalars rather than vector objects on purpose.
 */
export function simplex3(vx, vy, vz) {
  vx = f(vx);
  vy = f(vy);
  vz = f(vz);

  // dot(v, C.yyy), accumulated left to right as a GLSL compiler would.
  const dotC = f(f(f(f(vx * F3) + f(vy * F3))) + f(vz * F3));
  const ix = Math.floor(f(vx + dotC));
  const iy = Math.floor(f(vy + dotC));
  const iz = Math.floor(f(vz + dotC));

  const dotI = f(f(f(f(ix * G3) + f(iy * G3))) + f(iz * G3));
  const x0x = f(f(vx - ix) + dotI);
  const x0y = f(f(vy - iy) + dotI);
  const x0z = f(f(vz - iz) + dotI);

  // g = step(x0.yzx, x0.xyz)
  const gx = step(x0y, x0x);
  const gy = step(x0z, x0y);
  const gz = step(x0x, x0z);
  // l = 1 - g, then i1 = min(g.xyz, l.zxy), i2 = max(g.xyz, l.zxy)
  const lx = 1.0 - gx;
  const ly = 1.0 - gy;
  const lz = 1.0 - gz;

  const i1x = Math.min(gx, lz);
  const i1y = Math.min(gy, lx);
  const i1z = Math.min(gz, ly);
  const i2x = Math.max(gx, lz);
  const i2y = Math.max(gy, lx);
  const i2z = Math.max(gz, ly);

  const G3_2 = f(2.0 * G3);
  const G3_3 = f(3.0 * G3);

  const x1x = f(f(x0x - i1x) + G3);
  const x1y = f(f(x0y - i1y) + G3);
  const x1z = f(f(x0z - i1z) + G3);
  const x2x = f(f(x0x - i2x) + G3_2);
  const x2y = f(f(x0y - i2y) + G3_2);
  const x2z = f(f(x0z - i2z) + G3_2);
  const x3x = f(f(x0x - 1.0) + G3_3);
  const x3y = f(f(x0y - 1.0) + G3_3);
  const x3z = f(f(x0z - 1.0) + G3_3);

  const mi = glslMod(ix, 289.0);
  const mj = glslMod(iy, 289.0);
  const mk = glslMod(iz, 289.0);

  // Three nested permutes over the four simplex corners.
  const pz0 = permute(mk + 0.0);
  const pz1 = permute(mk + i1z);
  const pz2 = permute(mk + i2z);
  const pz3 = permute(mk + 1.0);

  const py0 = permute(f(f(pz0 + mj) + 0.0));
  const py1 = permute(f(f(pz1 + mj) + i1y));
  const py2 = permute(f(f(pz2 + mj) + i2y));
  const py3 = permute(f(f(pz3 + mj) + 1.0));

  const p0v = permute(f(f(py0 + mi) + 0.0));
  const p1v = permute(f(f(py1 + mi) + i1x));
  const p2v = permute(f(f(py2 + mi) + i2x));
  const p3v = permute(f(f(py3 + mi) + 1.0));

  // ns = (1/7) * D.wyz - D.xzx  with D = (0, 0.5, 1, 2)
  const n_ = f(1.0 / 7.0);
  const nsx = f(n_ * 2.0);
  const nsy = f(f(n_ * 0.5) - 1.0);
  const nsz = f(n_ * 1.0);

  const gradients = new Float64Array(12); // p0..p3, xyz each
  const hArr = new Float64Array(4);
  const pArr = [p0v, p1v, p2v, p3v];

  for (let c = 0; c < 4; c++) {
    const p = pArr[c];
    const j = f(p - f(49.0 * Math.floor(f(f(p * nsz) * nsz))));
    const xf = Math.floor(f(j * nsz));
    const yf = Math.floor(f(j - f(7.0 * xf)));

    const x = f(f(xf * nsx) + nsy);
    const y = f(f(yf * nsx) + nsy);
    // The branch this whole file exists to get right: h is exactly 0 for a
    // large share of lattice entries, and float32 lands on +5.96e-8 where
    // float64 lands on -1.1e-16.
    const h = f(f(1.0 - Math.abs(x)) - Math.abs(y));

    const sx = f(f(Math.floor(x) * 2.0) + 1.0);
    const sy = f(f(Math.floor(y) * 2.0) + 1.0);
    const sh = -step(h, 0.0); // h <= 0 ? -1 : 0

    gradients[c * 3 + 0] = f(x + f(sx * sh));
    gradients[c * 3 + 1] = f(y + f(sy * sh));
    gradients[c * 3 + 2] = h;
    hArr[c] = h;
  }

  // Normalize gradients
  for (let c = 0; c < 4; c++) {
    const gxx = gradients[c * 3 + 0];
    const gyy = gradients[c * 3 + 1];
    const gzz = gradients[c * 3 + 2];
    const norm = taylorInvSqrt(f(f(f(gxx * gxx) + f(gyy * gyy)) + f(gzz * gzz)));
    gradients[c * 3 + 0] = f(gxx * norm);
    gradients[c * 3 + 1] = f(gyy * norm);
    gradients[c * 3 + 2] = f(gzz * norm);
  }

  const d0 = f(f(f(x0x * x0x) + f(x0y * x0y)) + f(x0z * x0z));
  const d1 = f(f(f(x1x * x1x) + f(x1y * x1y)) + f(x1z * x1z));
  const d2 = f(f(f(x2x * x2x) + f(x2y * x2y)) + f(x2z * x2z));
  const d3 = f(f(f(x3x * x3x) + f(x3y * x3y)) + f(x3z * x3z));

  const SIX_TENTHS = f(0.6);
  let m0 = Math.max(f(SIX_TENTHS - d0), 0.0);
  let m1 = Math.max(f(SIX_TENTHS - d1), 0.0);
  let m2 = Math.max(f(SIX_TENTHS - d2), 0.0);
  let m3 = Math.max(f(SIX_TENTHS - d3), 0.0);
  m0 = f(m0 * m0);
  m1 = f(m1 * m1);
  m2 = f(m2 * m2);
  m3 = f(m3 * m3);

  const dot3 = (ax, ay, az, bx, by, bz) =>
    f(f(f(ax * bx) + f(ay * by)) + f(az * bz));

  const t0 = dot3(gradients[0], gradients[1], gradients[2], x0x, x0y, x0z);
  const t1 = dot3(gradients[3], gradients[4], gradients[5], x1x, x1y, x1z);
  const t2 = dot3(gradients[6], gradients[7], gradients[8], x2x, x2y, x2z);
  const t3 = dot3(gradients[9], gradients[10], gradients[11], x3x, x3y, x3z);

  const weighted = dot3(
    f(m0 * m0), f(m1 * m1), f(m2 * m2),
    t0, t1, t2,
  );
  return f(42.0 * f(weighted + f(f(m3 * m3) * t3)));
}

/**
 * simplex3 with its intermediates exposed, for src/dev/noiseProbe.js. Kept in
 * lockstep with simplex3 above by construction: it calls the same helpers and
 * repeats the same steps, so a divergence here is a divergence there.
 */
export function simplex3Debug(vx, vy, vz) {
  vx = f(vx);
  vy = f(vy);
  vz = f(vz);

  const dotC = f(f(f(f(vx * F3) + f(vy * F3))) + f(vz * F3));
  const cell = [Math.floor(f(vx + dotC)), Math.floor(f(vy + dotC)), Math.floor(f(vz + dotC))];

  const dotI = f(f(f(f(cell[0] * G3) + f(cell[1] * G3))) + f(cell[2] * G3));
  const x0 = [f(f(vx - cell[0]) + dotI), f(f(vy - cell[1]) + dotI), f(f(vz - cell[2]) + dotI)];

  const g = [step(x0[1], x0[0]), step(x0[2], x0[1]), step(x0[0], x0[2])];
  const l = [1 - g[0], 1 - g[1], 1 - g[2]];
  const i1 = [Math.min(g[0], l[2]), Math.min(g[1], l[0]), Math.min(g[2], l[1])];
  const i2 = [Math.max(g[0], l[2]), Math.max(g[1], l[0]), Math.max(g[2], l[1])];

  const mi = glslMod(cell[0], 289.0);
  const mj = glslMod(cell[1], 289.0);
  const mk = glslMod(cell[2], 289.0);

  const zOff = [0.0, i1[2], i2[2], 1.0];
  const yOff = [0.0, i1[1], i2[1], 1.0];
  const xOff = [0.0, i1[0], i2[0], 1.0];

  const permuted = [];
  for (let c = 0; c < 4; c++) {
    const a = permute(f(mk + zOff[c]));
    const b = permute(f(f(a + mj) + yOff[c]));
    permuted.push(permute(f(f(b + mi) + xOff[c])));
  }

  // Gradient stage, mirroring the loop in simplex3 (float32 emulation included —
  // without it this probe would report the very divergence it exists to find).
  const n_ = f(1.0 / 7.0);
  const nsx = f(n_ * 2.0);
  const nsy = f(f(n_ * 0.5) - 1.0);
  const nsz = f(n_ * 1.0);

  const gradients = [];
  const gx = [];
  const gy = [];
  const hVals = [];
  const jVals = [];

  for (let c = 0; c < 4; c++) {
    const p = permuted[c];
    const j = f(p - f(49.0 * Math.floor(f(f(p * nsz) * nsz))));
    const xf = Math.floor(f(j * nsz));
    const yf = Math.floor(f(j - f(7.0 * xf)));

    const x = f(f(xf * nsx) + nsy);
    const y = f(f(yf * nsx) + nsy);
    const h = f(f(1.0 - Math.abs(x)) - Math.abs(y));

    const sx = f(f(Math.floor(x) * 2.0) + 1.0);
    const sy = f(f(Math.floor(y) * 2.0) + 1.0);
    const sh = -step(h, 0.0);

    gradients.push(f(x + f(sx * sh)), f(y + f(sy * sh)), h);
    gx.push(x);
    gy.push(y);
    hVals.push(h);
    jVals.push(j);
  }

  // Corner offset vectors and falloff weights, mirroring simplex3.
  const G3_2 = f(2.0 * G3);
  const G3_3 = f(3.0 * G3);
  const corners = [
    x0,
    [f(f(x0[0] - i1[0]) + G3), f(f(x0[1] - i1[1]) + G3), f(f(x0[2] - i1[2]) + G3)],
    [f(f(x0[0] - i2[0]) + G3_2), f(f(x0[1] - i2[1]) + G3_2), f(f(x0[2] - i2[2]) + G3_2)],
    [f(f(x0[0] - 1.0) + G3_3), f(f(x0[1] - 1.0) + G3_3), f(f(x0[2] - 1.0) + G3_3)],
  ];

  const m = corners.map((c) => Math.max(0.6 - (c[0] * c[0] + c[1] * c[1] + c[2] * c[2]), 0));

  const t = [];
  for (let c = 0; c < 4; c++) {
    const gxx = gradients[c * 3 + 0];
    const gyy = gradients[c * 3 + 1];
    const gzz = gradients[c * 3 + 2];
    const norm = taylorInvSqrt(gxx * gxx + gyy * gyy + gzz * gzz);
    t.push(
      gxx * norm * corners[c][0] + gyy * norm * corners[c][1] + gzz * norm * corners[c][2],
    );
  }

  return {
    cell, x0, i1, i2, permuted,
    gradients, gx, gy, h: hVals, j: jVals, m, t, corners,
    result: simplex3(vx, vy, vz),
  };
}

/** Port of fractal3. Quirks preserved — see file header. */
export function fractal3(vx, vy, vz, sharpness, period, persistence, lacunarity, octaves) {
  let n = 0.0;
  let a = 1.0;
  let maxAmp = 0.0;
  let P = f(period);

  for (let i = 0; i < octaves; i++) {
    n = f(n + f(a * simplex3(f(vx / P), f(vy / P), f(vz / P))));
    a = f(a * persistence);
    maxAmp = f(maxAmp + a);
    P = f(P / lacunarity);
  }

  return f(n / maxAmp);
}

/**
 * Port of terrainHeight. `v` must be a unit vector (a direction on the sphere);
 * the return value is the height above the base radius, in orbital units.
 *
 * @param {object} p - terrain params (type, amplitude, sharpness, offset,
 *   period, persistence, lacunarity, octaves, seedOffset:{x,y,z})
 */
export function terrainHeight(vx, vy, vz, p) {
  const sx = f(vx + p.seedOffset.x);
  const sy = f(vy + p.seedOffset.y);
  const sz = f(vz + p.seedOffset.z);

  let h = 0.0;

  if (p.type === 1) {
    h = f(p.amplitude * simplex3(f(sx / p.period), f(sy / p.period), f(sz / p.period)));
  } else if (p.type === 2) {
    h = f(p.amplitude * fractal3(sx, sy, sz, p.sharpness, p.period, p.persistence, p.lacunarity, p.octaves));
    h = f(p.amplitude * f(Math.pow(Math.max(0.0, f(f(h + 1.0) / 2.0)), p.sharpness)));
  } else if (p.type === 3) {
    h = fractal3(sx, sy, sz, p.sharpness, p.period, p.persistence, p.lacunarity, p.octaves);
    h = f(p.amplitude * f(Math.pow(Math.max(0.0, f(1.0 - Math.abs(h))), p.sharpness)));
  }

  return Math.max(0.0, f(h + p.offset));
}

/**
 * High-frequency detail, in METRES.
 *
 * The orbital height field is sampled on the unit sphere, so its features have
 * angular size — a period of 0.6 spans about a third of a radian, i.e. hundreds
 * of kilometres. Perfectly good for a continent seen from orbit; completely flat
 * under a person's boots. Detail octaves are therefore specified in metres and
 * converted to angular periods here, which is the only place that knows the
 * planet's true size.
 *
 * @param {object} detail - { amplitudeM, periodM, persistence, lacunarity, octaves }
 * @param {number} radiusMetres
 * @returns {number} metres of relief to add to the macro height
 */
export function detailHeightMetres(vx, vy, vz, p, detail, radiusMetres) {
  if (!detail || detail.octaves <= 0) return 0;

  const sx = vx + p.seedOffset.x;
  const sy = vy + p.seedOffset.y;
  const sz = vz + p.seedOffset.z;

  let total = 0;
  let a = detail.amplitudeM;
  let period = detail.periodM / radiusMetres; // metres -> radians of arc

  for (let i = 0; i < detail.octaves; i++) {
    total += a * simplex3(sx / period, sy / period, sz / period);
    a *= detail.persistence;
    period /= detail.lacunarity;
  }

  return total;
}

/**
 * Surface normal at a direction, via finite differences on two tangent axes.
 * Returns a normalized {x,y,z} in planet space. Used to orient trees, rocks and
 * footprints so they sit flush with the slope.
 *
 * `heightFn(dir)` must return metres above the base radius; `radiusMetres` is the
 * base radius. Both must be in the same units or the slope comes out wrong by a
 * factor of the scale ratio — which looks like trees leaning uphill.
 */
export function surfaceNormalMetres(dir, radiusMetres, heightFn, epsMetres = 0.5) {
  // Build an orthonormal tangent basis around `dir`.
  const up = Math.abs(dir.y) < 0.99 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  const tx = normalize(cross(up, dir));
  const ty = cross(dir, tx);

  // Step in radians so that the arc length on the surface is epsMetres.
  const eps = epsMetres / radiusMetres;

  const at = (ox, oy) => {
    const q = normalize({
      x: dir.x + tx.x * ox + ty.x * oy,
      y: dir.y + tx.y * ox + ty.y * oy,
      z: dir.z + tx.z * ox + ty.z * oy,
    });
    const r = radiusMetres + heightFn(q);
    return { x: q.x * r, y: q.y * r, z: q.z * r };
  };

  const c = at(0, 0);
  const a = at(eps, 0);
  const b = at(0, eps);

  return normalize(
    cross(
      { x: a.x - c.x, y: a.y - c.y, z: a.z - c.z },
      { x: b.x - c.x, y: b.y - c.y, z: b.z - c.z },
    ),
  );
}

function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalize(v) {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}
