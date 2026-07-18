// Deterministic RNG. Every world, flock, tree and critter derives from a seed
// string, so any shot can be reproduced exactly from its seed — which is what
// makes re-rendering a scene at higher quality possible later.

/** FNV-1a: string -> uint32 seed. */
export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, good enough for scattering and behaviour. */
export function makeRng(seed) {
  let a = typeof seed === 'string' ? hashSeed(seed) : seed >>> 0;

  const rng = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  rng.range = (min, max) => min + rng() * (max - min);
  rng.int = (min, max) => Math.floor(rng.range(min, max + 1));
  rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
  rng.bool = (p = 0.5) => rng() < p;
  /** Uniform point on the unit sphere. */
  rng.onSphere = () => {
    const z = rng.range(-1, 1);
    const t = rng.range(0, Math.PI * 2);
    const r = Math.sqrt(1 - z * z);
    return { x: r * Math.cos(t), y: r * Math.sin(t), z };
  };
  /** Derive an independent named stream from this one's seed. */
  rng.fork = (label) => makeRng(hashSeed(label + ':' + a));

  return rng;
}
