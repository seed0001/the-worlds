import { ELEMENTS } from './elements.js';
import { makeRng, hashSeed } from '../core/rng.js';

// How a universe fills its periodic table. This is Episode 1's first two acts,
// as a function.
//
// The Big Bang is nucleosynthesis with a hard stop: in the first minutes there
// is only enough time and the right conditions to fuse hydrogen into helium (and
// a trace of lithium). Every heavier element in existence — the carbon in a cell,
// the iron in a core, the silicon in a rock — was built later, inside stars, and
// scattered when they died. So a young universe is almost pure hydrogen and
// helium, and it is only after generations of stars have lived and died that
// there is enough heavy-element "metal" around to build rocky planets and life.
//
// That enrichment is captured by ONE number, metallicity Z: the fraction of
// ordinary matter that is not hydrogen or helium. Our own star sits near Z=0.014.
// Rolling Z per universe is what makes each session's documentary genuinely
// different: a metal-poor roll is a universe of gas giants and dead rock where
// life struggles to find a foothold; a metal-rich roll is crowded with worlds.

/**
 * @param {string} seed
 * @returns {{
 *   seed: string, generations: number, metallicity: number,
 *   abundances: Record<string, number>,  // atoms relative to H = 1
 *   forged: { bigbang: string[], fusion: string[], explosive: string[] },
 * }}
 */
export function synthesizeElements(seed) {
  const rng = makeRng(hashSeed('nucleo:' + seed));

  // How many stellar generations have enriched this cloud before our star forms.
  // More generations, more metal — but with diminishing returns, as real cosmic
  // chemical evolution shows.
  const generations = rng.int(2, 9);
  const enrichment = 1 - Math.exp(-generations / 3.2); // 0..~1
  // Z from ~0.004 (metal-poor, old-universe) to ~0.04 (metal-rich, crowded).
  const metallicity = 0.004 + enrichment * 0.036 * rng.range(0.8, 1.2);

  // Scale factor applied to every heavy element's primordial-relative abundance
  // so the mass fraction of metals lands on the rolled Z. Anchored to the real
  // solar table: our Sun's abundances correspond to Z≈0.014, so we scale the
  // whole heavy-element vector by (Z / 0.014).
  const metalScale = metallicity / 0.014;

  const abundances = {};
  for (const el of ELEMENTS) {
    if (el.origin === 'bigbang') {
      // H and He are primordial — barely touched by later enrichment.
      abundances[el.sym] = el.abundance;
    } else {
      // Heavy elements scale with how enriched this particular universe is, with
      // a little per-element scatter (different stars yield different mixes).
      abundances[el.sym] = el.abundance * metalScale * rng.range(0.75, 1.3);
    }
  }

  const forged = { bigbang: [], fusion: [], explosive: [] };
  for (const el of ELEMENTS) forged[el.origin].push(el.sym);

  return { seed, generations, metallicity, abundances, forged };
}

/**
 * Mass fractions of the whole element budget — what the cloud is made of BY
 * MASS, which is what actually determines how much rock vs gas is available to
 * build with. Returned sorted, richest first, for narration.
 */
export function massBudget(abundances) {
  const byMass = {};
  let total = 0;
  for (const el of ELEMENTS) {
    const m = (abundances[el.sym] ?? 0) * el.mass;
    byMass[el.sym] = m;
    total += m;
  }
  const fractions = ELEMENTS
    .map((el) => ({ sym: el.sym, name: el.name, fraction: byMass[el.sym] / total, el }))
    .sort((a, b) => b.fraction - a.fraction);
  return { total, fractions };
}
