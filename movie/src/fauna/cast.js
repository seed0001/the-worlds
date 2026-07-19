import { makeRng, hashSeed } from '../core/rng.js';
import { makeGenome } from './genome.js';

// Episode 2's principal cast — one derivation, two consumers.
//
// The narration (doc/episode2/narration.js) reads these genomes to SAY what
// each principal is: wingspans, leg bones, coats. The surface stage
// (fauna/Fauna.js) spawns rendered populations from the SAME genomes to SHOW
// them. There is exactly one source, so the animal the narrator describes and
// the animal on screen are the same animal, by construction.
//
// Each principal lives in one of four staged climate zones of the landing
// patch — coast, scrub, highland, interior — sited on the real terrain by
// findCastSites. A zone overrides only the climate the genome reads, so a body
// the narrator calls cold really was built cold, and that cold-built body is
// the one that walks the highland.

/** Temperature offset per principal, degrees C from the world's base climate. */
export const ZONE_TEMP_OFFSET = { A: 0, B: 0, C: 22, D: 22, E: -38, F: -12 };

/** The staged site each principal is anchored to (keys of findCastSites). */
export const ZONE_SITE = { A: 'coast', B: 'coast', C: 'scrub', D: 'scrub', E: 'highland', F: 'interior' };

/** Base climate the zone offsets apply to — one rounding, shared everywhere. */
export function baseTempC(world) {
  return Math.round(world.temperatureC ?? world.biome.temperatureC ?? 15);
}

/** A view of the world with only the three fields makeGenome reads swapped. */
export function zoneView(world, tempC) {
  return {
    gravity: world.gravity,
    atmosphere: world.atmosphere,
    biome: { ...world.biome, temperatureC: tempC },
    surface: {
      ...world.surface,
      detail: { ...world.surface.detail },
      ground: world.surface.ground,
    },
  };
}

/**
 * The A–F principal cast, selected from the world's fauna by role. The living
 * world's roster (biomes.js, temperate) carries every role this needs, so on
 * the episode's world each fallback below is dormant, not load-bearing.
 */
export function principalCast(fa) {
  const anyGround = fa.find((f) => f.domain === 'ground') ?? fa[0];
  const herd0 = fa.find((f) => f.role === 'herd' && f.domain === 'ground') ?? anyGround;
  return {
    A: fa.find((f) => f.domain === 'air') ?? fa[0],
    B: herd0,
    C: fa.find((f) => f.role === 'solitary') ?? anyGround,
    D: fa.find((f) => f.role === 'swarm') ?? anyGround,
    E: herd0,
    // F is "the most extreme body plan": a long neck first, then any other
    // odd build that isn't the swarm — the swarm is already principal D.
    F: fa.find((f) => f.neck && f.neck >= 1.2)
      ?? fa.find((f) => f.role !== 'swarm' && ((f.legs && f.legs !== 4) || f.armored))
      ?? fa.find((f) => (f.legs && f.legs !== 4) || f.armored)
      ?? herd0,
  };
}

/**
 * Spec + zone-built genome per principal. `seed` is the cosmos seed, and the
 * rng streams are keyed exactly as the narration has always keyed them — so a
 * given seed's spoken numbers are also its rendered bodies.
 */
export function castGenomes(world, seed) {
  const specs = principalCast(world.fauna ?? []);
  const t0 = baseTempC(world);
  const gen = {};
  for (const k of Object.keys(specs)) {
    const spec = specs[k];
    gen[k] = spec
      ? makeGenome(zoneView(world, t0 + ZONE_TEMP_OFFSET[k]), spec, makeRng(hashSeed('ep2:' + seed + ':' + k)))
      : null;
  }
  return { specs, gen };
}

/**
 * Stage the four climate zones on the real terrain. Deterministic — pure
 * function of the meshed patch, no rng — so a seed always stages the same
 * tour. Every site is dry ground; on a patch that is essentially all ocean
 * everything collapses to the landing site rather than staging in the sea.
 *
 * @param {import('../surface/Surface.js').Surface} surface
 * @returns {{coast, scrub, highland, interior}} local-metre points {x, z, y}
 */
export function findCastSites(surface) {
  const sea = surface.bounds.seaLevelLocal;
  const coast = { x: 0, z: 0, y: surface.heightAt(0, 0) };
  // Stay well inside the meshed patch (±1500 m): the establishing shots orbit
  // a site at up to ~340 m, and the far side of that orbit must still be land.
  const R = 1000, N = 33;
  const dry = [];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const x = -R + (2 * R * i) / (N - 1);
      const z = -R + (2 * R * j) / (N - 1);
      const y = surface.heightAt(x, z);
      if (!Number.isFinite(y) || y < sea + 6) continue;
      dry.push({ x, z, y, d0: Math.hypot(x, z) });
    }
  }
  if (!dry.length) return { coast, scrub: coast, highland: coast, interior: coast };

  // Prefer ground that is its own place, not the coast camp's backyard.
  const far = dry.filter((s) => s.d0 > 350);
  const cand = far.length ? far : dry;
  let yMin = Infinity, yMax = -Infinity;
  for (const s of cand) { yMin = Math.min(yMin, s.y); yMax = Math.max(yMax, s.y); }
  const ySpan = Math.max(1, yMax - yMin);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const apart = (s, others) => Math.min(...others.map((o) => dist(s, o))) / 1000;
  const pickBest = (score) => cand.reduce((b, s) => (score(s) > score(b) ? s : b));

  // Highland: the highest dry stand on the patch, clear of the shore.
  const highland = pickBest((s) => (s.y - yMin) / ySpan + apart(s, [coast]) * 0.4);
  // Scrub: low, dry, and separate from both the coast and the high ground.
  const scrub = pickBest((s) => (yMax - s.y) / ySpan + apart(s, [coast, highland]));
  // Interior: the farthest ground from everything already staged.
  const interior = pickBest((s) => apart(s, [coast, highland, scrub]));

  const at = ({ x, z, y }) => ({ x, z, y });
  return { coast, scrub: at(scrub), highland: at(highland), interior: at(interior) };
}
