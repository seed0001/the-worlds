import { BIOMES, BIOME_KEYS, rollRanges } from './biomes.js';
import { makeRng } from '../core/rng.js';
import { terrainHeight, detailHeightMetres, surfaceNormalMetres } from './terrain.js';

// A World is the single source of truth for one planet: the numbers the orbital
// shader draws, the numbers the surface mesher samples, and the flora/fauna
// budget. Both acts of the movie read from this same object, which is the only
// reason "the planet from the window" and "the planet he's stranded on" match.

const SYLLABLES_A = ['kor', 'val', 'ther', 'mar', 'sel', 'dra', 'ish', 'ven', 'tal', 'oz', 'cyr', 'hel'];
const SYLLABLES_B = ['ann', 'is', 'oth', 'ara', 'une', 'ix', 'orr', 'ael', 'ys', 'en', 'ume', 'ath'];

function makeName(rng) {
  const a = rng.pick(SYLLABLES_A);
  const b = rng.pick(SYLLABLES_B);
  const designation = `${rng.pick('ABCDEFGHJK'.split(''))}${rng.int(100, 999)}`;
  const name = (a + b).replace(/^./, (c) => c.toUpperCase());
  return { name, designation, full: `${name} (${designation})` };
}

export class World {
  /**
   * @param {string} seed - any string; same seed always yields the same world
   * @param {string} [biomeKey] - force a biome, otherwise picked from the seed
   * @param {object} [physical] - overrides for the world's physical scale, used
   *   by System.js so the five planets of a system aren't all the same size.
   *   Applied AFTER all rng rolls so overriding never shifts the rng stream —
   *   the same seed+biome yields the same terrain whether or not it's in a
   *   system. Accepts { radiusMetres, heightScaleMetres, dayLength }.
   */
  constructor(seed, biomeKey = null, physical = {}) {
    this.seed = seed;
    const rng = makeRng(seed);
    this.rng = rng;

    this.biomeKey = biomeKey ?? rng.pick(BIOME_KEYS);
    const template = BIOMES[this.biomeKey];
    if (!template) throw new Error(`Unknown biome "${this.biomeKey}"`);
    this.biome = template;

    // Identity
    Object.assign(this, makeName(rng));

    // Scale, and the one deliberate lie in the whole pipeline.
    //
    // The orbital planet is radius 20 with ~1.2 of terrain relief, so mountains
    // are 6% of the planet's radius. On a real world that ratio is nearer 0.04%
    // — Everest on a globe is smoother than an orange. Rendering it honestly
    // would give a featureless ball, so the orbital view keeps the exaggeration
    // (every planet render does this) while the surface uses real metres.
    //
    // radiusMetres and heightScaleMetres are therefore NOT related by a single
    // factor, and that is intentional. Vertical exaggeration in the orbital
    // shot is ~150x.
    this.radius = 20.0;              // orbital units, what the shader draws
    this.radiusMetres = 3_000_000;   // 3000 km — a small rocky world
    this.heightScaleMetres = 1000;   // metres per orbital unit of terrain height

    // Terrain — the shared height field.
    this.terrain = rollRanges(template.terrain, rng);
    this.terrain.octaves = Math.round(this.terrain.octaves);
    // Seeding by translation: the noise field itself has no seed input, so we
    // walk to a different neighbourhood of it instead.
    //
    // The magnitude is capped deliberately and the cap is NOT cosmetic. The
    // sample point runs through `floor()` and sign branches, and the GPU does
    // that in float32; once the offset is large, one ULP at that magnitude is
    // wider than the detail we care about, and CPU and GPU start choosing
    // different lattice cells. Measured GPU/CPU divergence against offset
    // magnitude (orbital units of terrain height):
    //
    //     0 -> 6e-6     20 -> 7e-5     160 -> 8e-4     1280 -> 4e-3
    //
    // At 5-40 the two agree to within ~0.2 m of terrain, which is invisible.
    // At the 200-2000 this originally used, they disagreed by up to 2 units —
    // 2 km of mountain, in the wrong place. Raise this and re-run the parity
    // check, or don't raise it.
    //
    // 40 units is still ~65 feature-widths at the base period, so worlds stay
    // fully decorrelated. There was never a reason to walk further.
    const o = rng.onSphere();
    const dist = rng.range(5, 40);
    this.terrain.seedOffset = { x: o.x * dist, y: o.y * dist, z: o.z * dist };

    this.colors = template.colors;
    this.bands = template.bands;
    this.atmosphere = rollRanges(template.atmosphere, rng);
    this.surface = rollRanges(template.surface, rng);

    this.flora = template.flora ? rollRanges(template.flora, rng) : null;
    this.fauna = (template.fauna ?? []).map((f) => {
      const rolled = rollRanges(f, rng);
      rolled.count = Math.round(rolled.count);
      return rolled;
    });

    // Star direction — drives both the orbital terminator and surface sun angle.
    const sun = rng.onSphere();
    this.sunDirection = sun;
    this.dayLength = rng.range(40, 140); // seconds of screen time per rotation

    this.rotationPeriod = rng.range(0.008, 0.02); // orbital-view spin, rad/s

    // Physical overrides last — see the constructor doc for why.
    if (physical.radiusMetres) this.radiusMetres = physical.radiusMetres;
    if (physical.heightScaleMetres) this.heightScaleMetres = physical.heightScaleMetres;
    if (physical.dayLength) this.dayLength = physical.dayLength;
  }

  /**
   * Surface gravity relative to the 3000 km baseline world. Same rock density
   * assumed everywhere, so g scales linearly with radius. This is the single
   * number that makes a big planet's animals stocky and a small planet's leggy.
   */
  get gravity() {
    return this.radiusMetres / 3_000_000;
  }

  /**
   * Macro height in orbital units — the exact value the vertex shader computes.
   * Use this for anything that has to agree with the orbital render.
   */
  heightAt(dir) {
    return terrainHeight(dir.x, dir.y, dir.z, this.terrain);
  }

  /**
   * Ground height above base radius, in metres: macro terrain plus the
   * high-frequency detail the orbital view can't resolve. This is the function
   * the surface mesher, the tree scatterer and anything walking use.
   */
  heightMetresAt(dir) {
    return (
      this.heightAt(dir) * this.heightScaleMetres +
      detailHeightMetres(dir.x, dir.y, dir.z, this.terrain, this.surface.detail, this.radiusMetres)
    );
  }

  /** Outward surface normal at a direction (planet space, unit length). */
  normalAt(dir) {
    return surfaceNormalMetres(dir, this.radiusMetres, (q) => this.heightMetresAt(q));
  }

  /**
   * Sea level in orbital units. Terrain clamps at 0, so anything at exactly 0 is
   * ocean floor; the shader's first colour band boundary is the waterline.
   */
  get seaLevel() {
    return this.bands.transition2;
  }

  isUnderwater(dir) {
    return this.heightAt(dir) < this.seaLevel;
  }

  /**
   * Find a direction suitable for a landing site: dry land, gentle slope, inside
   * the flora altitude band if the world has any. Returns null if the search
   * fails, which for an ocean world is a legitimate answer.
   */
  findLandingSite(rng = this.rng, attempts = 400) {
    let best = null;
    for (let i = 0; i < attempts; i++) {
      const dir = rng.onSphere();
      const h = this.heightAt(dir);
      if (h <= this.seaLevel + 0.01) continue;

      // Macro height alone can lie: the surface adds ±30 m of detail relief on
      // top of it, so a site that clears sea level by a few metres of macro can
      // still come out underwater once the patch is actually meshed.
      const seaMetres = this.seaLevel * this.heightScaleMetres;
      if (this.heightMetresAt(dir) <= seaMetres + 8) continue;

      const n = this.normalAt(dir);
      const flatness = n.x * dir.x + n.y * dir.y + n.z * dir.z; // 1 = level
      if (flatness < 0.985) continue;

      const score = flatness - Math.abs(h - (this.seaLevel + 0.12)) * 0.5;
      if (!best || score > best.score) best = { dir, height: h, flatness, score };
    }
    return best;
  }

  /** Everything a UI or a shot list needs to describe this world in one line. */
  describe() {
    const t = this.terrain;
    return {
      seed: this.seed,
      name: this.full,
      biome: this.biome.label,
      radiusKm: Math.round(this.radiusMetres / 1000),
      peakMetres: Math.round(t.amplitude * this.heightScaleMetres),
      hasFlora: !!this.flora,
      faunaSpecies: this.fauna.map((f) => f.species),
    };
  }
}
