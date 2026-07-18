import { ELEMENTS, BY_SYMBOL, LIQUID_WATER } from './elements.js';

// One cloud, one distance from the star -> one planet, decided entirely by
// chemistry. This is Episode 1's third and fourth acts: a system condenses, and
// the habitability filter walks it.
//
// The physics, in order, each step causing the next:
//
//   1. Temperature. A planet's temperature is set by how much starlight reaches
//      it: the real radiative-equilibrium law, T = (L(1-a) / (16 π σ d²))^¼.
//      Closer is hotter, and it falls off with the square root of distance.
//
//   2. Condensation. At that temperature, every element is either frozen into
//      solid grains (it can build a planet) or still gas (it blows away unless
//      the planet is already big enough to hold it). Compare the planet's
//      formation temperature to each element's condenseK. This is the sort that
//      makes inner worlds rock and metal, outer worlds ice and gas.
//
//   3. Water. Oxygen is the swing vote. Where it's cold enough for water ice to
//      be stable AND hydrogen is around, you get water — oceans if the surface
//      then sits in the liquid band, ice caps if it's colder, vapour if hotter.
//
//   4. Life's chance. Liquid water + an atmosphere to hold it + the biogenic
//      elements (C, N, P, S) actually present in the rock. Miss any one and the
//      world is ruled out, and the narration can say exactly which one it missed.

const STEFAN_BOLTZMANN = 5.670e-8;
const SOLAR_LUMINOSITY = 3.828e26; // W, the unit we measure the rolled star in
const AU = 1.496e11;               // m, only as a distance unit — no Earth implied

/**
 * @param {object} cloud - { abundances } from synthesizeElements
 * @param {object} star  - { luminosity } in watts
 * @param {number} distanceAU - orbital distance
 * @param {Function} rng
 */
export function condensePlanet(cloud, star, distanceAU, rng) {
  const d = distanceAU * AU;

  // --- 1. Temperature (radiative equilibrium, albedo rolled per world) ---
  const albedo = rng.range(0.1, 0.45);
  const eqTempK =
    Math.pow((star.luminosity * (1 - albedo)) / (16 * Math.PI * STEFAN_BOLTZMANN * d * d), 0.25);

  // --- 2. Condensation: split the element budget into solids vs gas here ---
  const solids = {};   // atoms available to build the body, relative units
  const gases = {};    // atoms that stay gaseous at this temperature
  let refractoryMass = 0, metalMass = 0, iceMass = 0, gasMass = 0;

  for (const el of ELEMENTS) {
    const atoms = cloud.abundances[el.sym] ?? 0;
    const mass = atoms * el.mass;
    if (eqTempK < el.condenseK) {
      solids[el.sym] = atoms;
      if (el.role === 'metal') metalMass += mass;
      else if (el.role === 'rock') refractoryMass += mass;
      else iceMass += mass; // volatiles frozen out (water, CO2, ammonia ices)
    } else {
      gases[el.sym] = atoms;
      gasMass += mass;
    }
  }

  const solidMass = refractoryMass + metalMass + iceMass;

  // --- 3. Body type and size ---
  // The cloud fixes the RATIOS of what condenses; how much a given planet
  // actually gathers is a separate roll — its feeding zone in the disk. This is
  // why one system holds both runts and giants. Past the frost line, ices join
  // the solids and the extra building material lets a world grow massive enough
  // to capture gas and run away into a giant.
  const iceFraction = solidMass > 0 ? iceMass / solidMass : 0;
  const beyondFrostLine = eqTempK < BY_SYMBOL.O.condenseK;

  // Accretion in reference-terrestrial masses. Outer, ice-fed worlds can gather
  // far more, so their roll is scaled up — the seed of the giant/terrestrial split.
  const feedScale = beyondFrostLine ? rng.range(1.0, 6.0) : rng.range(0.3, 2.6);
  const accretionMass = feedScale;
  const isGiant = beyondFrostLine && iceFraction > 0.5 && accretionMass > 3.2;

  const coreFraction = (refractoryMass + metalMass) > 0
    ? metalMass / (refractoryMass + metalMass) : 0; // iron core share

  // Physical size and surface gravity. Same density assumed, so radius grows as
  // the cube root of mass and gravity with it; an iron-rich world is denser and
  // pulls a little harder. gravity here is in reference-world g.
  const sizeScale = Math.cbrt(accretionMass);
  const gravity = sizeScale * (1 + coreFraction * 0.35);
  const rockBudget = accretionMass; // what biomeFromChemistry sizes the world on

  // --- 4. Atmosphere, greenhouse, and water ---
  // An atmosphere survives when the world's gravity can outrun thermal escape.
  // Escape velocity scales with the size of the gravity well; how fast gas
  // molecules flee scales with the square root of temperature. So retention is
  // gravity against sqrt(T), normalised so a reference-gravity world in a
  // liquid-water climate keeps a modest atmosphere, and a small hot rock loses it.
  const retention = gravity / Math.sqrt(eqTempK / 288);
  // Cap terrestrial atmospheres below a giant's: a rocky world can hold a thick
  // sky but not an unbounded one, and letting it saturate to 1 made every big
  // cold world a max-greenhouse oven.
  const atmosphere = isGiant ? 1.0 : Math.max(0, Math.min(0.8, (retention - 0.55) / 1.6));

  // Greenhouse warming: an atmosphere re-radiates the star's heat back down, so
  // the SURFACE runs hotter than bare sunlight alone. Crucially it MULTIPLIES the
  // heat already arriving — it traps sunlight, it doesn't manufacture it — so a
  // thick blanket bakes a sun-drenched inner world into an oven while barely
  // warming a frozen outer one. A thin skin adds a few percent; a thick one can
  // more than double the surface temperature and run away past boiling. This is
  // what makes the second planet from a star an oven and turns "in the
  // liquid-water zone" from a guarantee into a knife-edge.
  const greenhouseFactor = 0.1 * atmosphere + 1.3 * Math.pow(atmosphere, 4);
  const surfaceTempK = eqTempK * (1 + greenhouseFactor);
  const greenhouseK = surfaceTempK - eqTempK;

  const oxygen = cloud.abundances.O ?? 0;
  const hydrogen = cloud.abundances.H ?? 0;
  const waterCapacity = Math.min(oxygen, hydrogen / 2); // H2O stoichiometry
  const hasWater = waterCapacity > 1e-4;

  // Water's phase is set by the SURFACE temperature — sunlight plus greenhouse.
  let waterState = 'none';
  if (hasWater) {
    if (surfaceTempK < LIQUID_WATER.min) waterState = 'ice';
    else if (surfaceTempK > LIQUID_WATER.max) waterState = 'vapour';
    else waterState = 'liquid';
  }

  // --- 5. Biogenic inventory: are the elements of life actually in the rock? ---
  const biogenic = {};
  let biogenicScore = 0;
  for (const sym of ['C', 'N', 'P', 'S']) {
    const present = (solids[sym] ?? gases[sym] ?? 0) > 1e-6;
    biogenic[sym] = present;
    if (present) biogenicScore++;
  }

  // --- 6. The filter itself ---
  const reasons = [];
  const runaway = greenhouseK > 90 && waterState === 'vapour';
  const thinAir = !isGiant && atmosphere < 0.15;
  if (isGiant) reasons.push('a gas giant — no solid surface to stand on');
  if (runaway) reasons.push('a runaway greenhouse: its own thick air bakes the surface');
  if (waterState === 'ice') reasons.push('frozen solid: any water is locked as ice');
  if (waterState === 'vapour' && !runaway) reasons.push('too hot: water can only exist as vapour');
  if (waterState === 'none') reasons.push('no water: oxygen and hydrogen never met here');
  if (thinAir) reasons.push('too little gravity to hold a breathable atmosphere');
  if (biogenicScore < 3) reasons.push('missing the elements life is built from');

  const habitable =
    !isGiant && waterState === 'liquid' && atmosphere >= 0.15 && biogenicScore >= 3;

  return {
    distanceAU,
    eqTempK,
    surfaceTempK,
    greenhouseK,
    albedo,
    isGiant,
    accretionMass,
    sizeScale,
    gravity,
    rockBudget,
    coreFraction,
    iceFraction,
    composition: { refractoryMass, metalMass, iceMass, gasMass, solidMass },
    waterCapacity,
    waterState,
    atmosphere,
    biogenic,
    biogenicScore,
    habitable,
    // Why it failed, or [] if it didn't. Narration reads this straight.
    ruledOutBecause: habitable ? [] : reasons,
    solids,
    gases,
  };
}

/**
 * Map a finished chemistry result to one of the render biomes plus physical
 * overrides for World. This is the seam between the real-chemistry engine and
 * the existing planet renderer: chemistry decides, the shader draws.
 */
export function biomeFromChemistry(chem) {
  const T = chem.surfaceTempK;
  let biomeKey;
  if (chem.isGiant) biomeKey = 'frozen';        // stand-in until a giant shader exists
  else if (chem.habitable) biomeKey = 'temperate';
  else if (T > LIQUID_WATER.max + 120) biomeKey = 'volcanic';
  else if (T > LIQUID_WATER.max) biomeKey = 'arid';
  else if (T < LIQUID_WATER.min) biomeKey = 'frozen';
  else if (chem.atmosphere < 0.08) biomeKey = 'barren';
  else biomeKey = 'arid';

  // Physical scale from accreted mass: gravity is radius/3e6 in World, so setting
  // the radius from the chemistry's sizeScale makes World.gravity agree with the
  // gravity the atmosphere calc already used. Clamped to the pipeline's range.
  const radiusMetres = Math.round(
    Math.max(1_800_000, Math.min(5_500_000, 3_000_000 * chem.sizeScale)),
  );

  return {
    biomeKey,
    physical: {
      radiusMetres,
      temperatureC: chem.surfaceTempK - 273,
    },
  };
}
