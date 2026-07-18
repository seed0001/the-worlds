import { World } from '../world/World.js';
import { makeRng, hashSeed } from '../core/rng.js';
import { synthesizeElements, massBudget } from '../chemistry/nucleosynthesis.js';
import { condensePlanet, biomeFromChemistry } from '../chemistry/planetChemistry.js';

// A whole universe from one seed, built as a chain of causes — which is the only
// reason a documentary can narrate it. Nothing here is dealt at random that
// could instead be derived from something upstream:
//
//   seed -> which elements exist and in what amount   (nucleosynthesis)
//        -> a star of some mass, and therefore brightness
//        -> five orbits at real distances
//        -> each planet's temperature, composition, water, air   (condensation)
//        -> which one or two can host life                        (the filter)
//
// The rendered planets are ordinary World objects — the existing shader draws
// them — but their biome, size and temperature are no longer rolled. They are
// what the chemistry says they must be.

const STAR_NAMES_A = ['Aur', 'Kel', 'Sor', 'Vey', 'Tham', 'Ost', 'Rul', 'Ny', 'Cae', 'Ith'];
const STAR_NAMES_B = ['eia', 'os', 'ara', 'ith', 'une', 'ex', 'ion', 'ai', 'yr', 'ophi'];

const SOLAR_LUMINOSITY = 3.828e26;

export class Cosmos {
  /** @param {string} seed - any string; each session rolls a fresh one */
  constructor(seed) {
    this.seed = seed;
    const rng = makeRng(hashSeed('cosmos:' + seed));

    // --- The star. Mass sets brightness by the real mass-luminosity relation,
    //     L ∝ M^3.5, so a modestly heavier star is a much brighter one, which
    //     pushes its whole habitable zone outward. ---
    this.starName = rng.pick(STAR_NAMES_A) + rng.pick(STAR_NAMES_B);
    this.starMass = rng.range(0.6, 1.4);                 // in reference-star masses
    this.starLuminosity = SOLAR_LUMINOSITY * Math.pow(this.starMass, 3.5);
    this.starColor = this._starColor(this.starMass);

    // --- The element budget this universe has to build with. ---
    this.cloud = synthesizeElements(seed);
    this.budget = massBudget(this.cloud.abundances);

    // --- Five orbits. Spacing widens outward (a nod at Titius–Bode), scaled by
    //     the star's brightness so a bright star's planets sit farther out. ---
    const zoneScale = Math.sqrt(this.starLuminosity / SOLAR_LUMINOSITY);
    let a = rng.range(0.3, 0.75) * zoneScale;
    this.planets = [];
    for (let i = 0; i < 5; i++) {
      const prng = rng.fork(`planet:${i}`);
      const chem = condensePlanet(this.cloud, { luminosity: this.starLuminosity }, a, prng);
      const { biomeKey, physical } = biomeFromChemistry(chem);

      const world = new World(`${seed}:p${i + 1}`, biomeKey, {
        radiusMetres: physical.radiusMetres,
        dayLength: prng.range(40, 140),
      });
      world.chem = chem;
      world.temperatureC = physical.temperatureC;
      world.distanceAU = a;

      this.planets.push({ index: i, world, chem });
      // Wide spacing variance: sometimes a big gap jumps clean over the
      // habitable zone, leaving it empty — a legitimately lifeless system.
      a *= rng.range(1.45, 2.35);
    }

    // --- The filter's verdict: who can host life. At most two, sometimes none —
    //     a dead universe is a legitimate and honest roll. ---
    this.livingWorlds = this.planets.filter((p) => p.chem.habitable);
    // If more than two clear the bar, life takes the two best-watered ones.
    if (this.livingWorlds.length > 2) {
      this.livingWorlds = [...this.livingWorlds]
        .sort((x, y) => y.chem.waterCapacity - x.chem.waterCapacity)
        .slice(0, 2);
      const keep = new Set(this.livingWorlds);
      for (const p of this.planets) if (!keep.has(p)) p.chem.habitable = false;
    }
  }

  _starColor(mass) {
    // Hotter (heavier) stars are bluer-white; lighter ones warmer. Real-ish.
    if (mass > 1.25) return 0xfff4ff;
    if (mass > 1.05) return 0xfff8e8;
    if (mass > 0.85) return 0xfff2d0;
    return 0xffd9a0;
  }

  /** Facts for narration and HUD — the whole causal chain in plain data. */
  describe() {
    return {
      seed: this.seed,
      star: { name: this.starName, mass: this.starMass.toFixed(2), color: this.starColor },
      generations: this.cloud.generations,
      metallicity: this.cloud.metallicity,
      topElements: this.budget.fractions.slice(0, 6).map((f) => ({
        sym: f.sym, name: f.name, pct: (f.fraction * 100).toFixed(1),
      })),
      planets: this.planets.map((p) => ({
        index: p.index,
        name: p.world.full,
        biome: p.world.biome.label,
        distanceAU: p.chem.distanceAU.toFixed(2),
        tempC: Math.round(p.chem.surfaceTempK - 273),
        radiusKm: Math.round(p.world.radiusMetres / 1000),
        gravity: p.chem.gravity.toFixed(2),
        type: p.chem.isGiant ? 'gas giant' : 'terrestrial',
        water: p.chem.waterState,
        habitable: p.chem.habitable,
        ruledOut: p.chem.ruledOutBecause,
      })),
      living: this.livingWorlds.map((p) => p.world.full),
    };
  }
}
