import { World } from './World.js';
import { BIOME_KEYS } from './biomes.js';
import { makeRng, hashSeed } from '../core/rng.js';

// A System is five worlds around one star — the movie's whole map.
//
// One planet of each biome, always: the story needs the full range of places
// (somewhere survivable, somewhere lethal, somewhere empty), so the system
// generator deals the five archetypes like a hand of cards rather than rolling
// each planet independently and praying for variety. What IS rolled per seed:
// which biome lands on which orbit, how big each world is (and therefore its
// gravity, which fauna/genome.js turns into body plans), day length, and the
// orbital choreography for the establishing shot.

const STAR_NAMES_A = ['Aur', 'Kel', 'Sor', 'Vey', 'Tham', 'Ost', 'Rul', 'Ny'];
const STAR_NAMES_B = ['eia', 'os', 'ara', 'ith', 'une', 'ex', 'ion', 'ai'];

export class System {
  /** @param {string} seed - any string; same seed always yields the same system */
  constructor(seed) {
    this.seed = seed;
    const rng = makeRng(hashSeed('system:' + seed));

    this.starName = rng.pick(STAR_NAMES_A) + rng.pick(STAR_NAMES_B);
    this.starColor = rng.pick([0xfff2d0, 0xffe8b8, 0xfff8e8, 0xffd9a0]);

    // Fisher-Yates over the biome archetypes: which world sits on which orbit.
    const order = [...BIOME_KEYS];
    for (let i = order.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [order[i], order[j]] = [order[j], order[i]];
    }

    this.worlds = order.map((biomeKey, i) => {
      // 2200-4400 km of radius is a factor of two in surface gravity — enough
      // to visibly change what walks and what flies on each world.
      const radiusMetres = Math.round(rng.range(2_200_000, 4_400_000));
      return new World(`${seed}:p${i + 1}`, biomeKey, {
        radiusMetres,
        dayLength: rng.range(40, 140),
      });
    });

    // Orbital layout, in the orbital-view units the Planet meshes use. Spacing
    // grows outward (a nod at Titius-Bode, not a simulation of it) and each
    // orbit gets a small inclination so the establishing shot isn't a flat disc.
    let radius = 70;
    this.orbits = this.worlds.map(() => {
      const orbit = {
        radius,
        // Inner planets sweep faster — rough Keplerian falloff, tuned for a
        // shot that reads in seconds, not a physics lesson.
        speed: 0.09 * Math.pow(70 / radius, 1.5),
        phase: rng.range(0, Math.PI * 2),
        inclination: rng.range(-0.06, 0.06),
      };
      radius += rng.range(48, 70);
      return orbit;
    });
  }

  /** One line per planet — HUD and shot-list food. */
  describe() {
    return {
      seed: this.seed,
      star: this.starName,
      planets: this.worlds.map((w, i) => ({
        index: i,
        name: w.full,
        biome: w.biome.label,
        radiusKm: Math.round(w.radiusMetres / 1000),
        gravity: w.gravity.toFixed(2),
        fauna: w.fauna.map((f) => f.species),
      })),
    };
  }
}
