import { ELEMENTS, BY_SYMBOL } from '../chemistry/elements.js';

// Episode 1's script, generated from one real universe.
//
// Nothing here is canned prose with the numbers blanked in. Every line is built
// from what the chemistry engine actually produced for THIS seed — this star's
// mass, these elements in these amounts, this planet ruled out for this reason —
// so the narration is true to the universe on screen by construction. Change the
// seed and the documentary tells a different, equally honest story.
//
// A cue is one spoken beat:
//   text      what the narrator says (and what the caption shows)
//   scene     which visual stage should be up ('bigbang' | 'system')
//   direct    an optional instruction the director hands the scene
//             (advance the cosmology phase, focus a planet, etc.)
//   hold      minimum seconds to dwell even if speech finishes early
//
// The Timeline speaks each cue, waits for the voice to finish (or `hold`,
// whichever is longer), then moves on. Total runtime is the sum of the spoken
// lengths — write more beats for a longer episode.

const A_AN = (w) => (/^[aeiou]/i.test(w) ? 'an' : 'a');

function elementRoll(cosmos) {
  // The three or four elements that dominate this universe's rock and air,
  // named for the narrator.
  return cosmos.budget.fractions
    .filter((f) => !['H', 'He'].includes(f.sym))
    .slice(0, 3)
    .map((f) => f.name);
}

function list(names) {
  if (names.length <= 1) return names[0] ?? '';
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
}

export function buildEpisode1Script(cosmos) {
  const d = cosmos.describe();
  const cues = [];
  const say = (text, opts = {}) => cues.push({ text, ...opts });

  const heavies = elementRoll(cosmos);
  const living = cosmos.livingWorlds;

  // --- 1. Cold open ---------------------------------------------------------
  say('In the beginning, there is nothing to see. No space to cross. No time to cross it in.',
    { scene: 'bigbang', direct: { phase: 'void' }, hold: 5 });
  say('Everything that will ever exist is here — not spread across a universe, because there is no universe yet for it to spread across. Only energy, waiting.',
    { hold: 5 });
  say('Watch what a handful of rules — energy, gravity, light, and the elements they build — can make out of that.',
    { hold: 4 });

  // --- 2. The Big Bang ------------------------------------------------------
  say('Then it begins to expand. Not an explosion into space — space itself, unfolding, and cooling as it grows.',
    { direct: { phase: 'bang' }, hold: 6 });
  say('For the first instants it is too hot for matter to hold together. Energy and particles trade places freely, faster than the eye of any instrument could ever follow.',
    { hold: 5 });
  say('As it cools, the first matter freezes out of pure energy. And here the universe has almost no choice in what to make.',
    { direct: { phase: 'firstmatter' }, hold: 5 });
  say('In the first few minutes, only the lightest nuclei can form: hydrogen, the simplest atom there is, and helium. Roughly three parts hydrogen to one part helium — and almost nothing else.',
    { direct: { phase: 'nucleosynthesis' }, hold: 6 });
  say('That is the entire inventory of the young universe. Every richer thing — every rock, every ocean, every living cell that this story will arrive at — has to be built later, from these two ingredients.',
    { hold: 5 });
  say('For now the cosmos is a fog: matter and light tangled together, opaque, glowing.',
    { direct: { phase: 'fog' }, hold: 4 });
  say('Until it cools enough for atoms to capture their electrons and hold. In that instant the fog clears, and light travels free across the universe for the first time.',
    { direct: { phase: 'recombination' }, hold: 6 });

  // --- 3. Gravity and the stars ---------------------------------------------
  say('Now gravity takes over. The young universe is not perfectly smooth — some regions are a whisper denser than others.',
    { direct: { phase: 'structure' }, hold: 5 });
  say('Gravity pulls matter toward matter. The dense places grow denser, draining the space around them, until clouds of hydrogen and helium collapse under their own weight.',
    { hold: 5 });
  say('Squeeze hydrogen hard enough and it ignites. Nuclei fuse, and a star switches on — pouring out light, and holding itself up against gravity by the heat of its own fusion.',
    { direct: { phase: 'firststars' }, hold: 6 });
  say('Inside that furnace, the universe finally builds something new. Hydrogen fuses to helium; helium to carbon and oxygen; and on up the ladder, forging the heavier elements the Big Bang never could.',
    { direct: { phase: 'fusion' }, hold: 6 });
  say('But fusion pays out less and less energy as it climbs, and it stops cold at iron. To build iron and beyond takes something more violent than a living star.',
    { hold: 5 });
  say('A massive star, running out of fuel, collapses and detonates — a single blast outshining a galaxy, forging the heaviest elements and blasting everything it ever made back into space.',
    { direct: { phase: 'supernova' }, hold: 6 });
  say(`Generation after generation of stars live and die this way, seeding the darkness with the elements of worlds. This universe took about ${d.generations} such generations to enrich the cloud that our story forms from.`,
    { direct: { phase: 'enrich' }, hold: 6 });

  // --- 4. A system condenses ------------------------------------------------
  say(`From that enriched cloud, one more collapse — and this time the debris does not all fall in. Spinning, it flattens into a disc, and at its centre a new star ignites: ${d.star.name}.`,
    { scene: 'system', direct: { phase: 'ignite' }, hold: 7 });
  say(`${d.star.name} is a star of about ${d.star.mass} times the mass of a typical yellow sun — and mass is destiny for a star. Heavier means hotter, brighter, and a warm zone thrown farther out into the dark.`,
    { hold: 6 });
  say(`The cloud it formed from is richest, after hydrogen and helium, in ${list(heavies)} — and that mix decides what its planets can be made of.`,
    { direct: { phase: 'disc' }, hold: 6 });
  say('In the disc, temperature sorts everything. Close to the star it is searing, and only the most stubborn materials — metal and rock — can freeze into solid grains. The light, icy stuff is boiled away and blown outward.',
    { direct: { phase: 'condense' }, hold: 7 });
  say('So the inner worlds are built from rock and metal, small and dense. Far out, past the frost line where water can freeze, ice joins the rock — and a world there can grow massive enough to swallow gas whole and balloon into a giant.',
    { direct: { phase: 'planets' }, hold: 7 });
  say(`When the dust settles, ${d.star.name} holds five worlds. From here, they all look like possibilities. The question the rest of this story turns on is a narrow one: could any of them hold life?`,
    { direct: { phase: 'reveal' }, hold: 6 });

  // --- 5. The habitability filter -------------------------------------------
  say('Life, as far as chemistry is concerned, needs a few specific things at once: liquid water, an atmosphere to hold it, and the handful of elements life builds its bodies from. Miss any one, and the door is closed.',
    { hold: 7 });

  for (const p of d.planets) {
    const chem = cosmos.planets[p.index].chem;
    const ordinal = ['first', 'second', 'third', 'fourth', 'fifth'][p.index];
    const tempWord = p.tempC > 60 ? 'scorched' : p.tempC < -10 ? 'frozen' : 'temperate';

    say(`The ${ordinal} world, ${p.name}. ${cap(A_AN(p.type))} ${p.type} world orbiting at ${p.distanceAU} times our reference distance, with a surface near ${p.tempC} degrees — ${tempWord}.`,
      { direct: { focus: p.index }, hold: 6 });

    if (p.habitable) {
      say(`And here everything lines up. Liquid water, standing on the surface. Air thick enough to hold it. The elements of life, present in the rock. ${p.name} is not just survivable — it is a candidate for life.`,
        { direct: { verdict: 'life', focus: p.index }, hold: 7 });
    } else {
      const reason = chem.ruledOutBecause[0];
      say(`But ${p.name} is ruled out — ${reason}. ${closingFor(chem)}`,
        { direct: { verdict: 'dead', focus: p.index }, hold: 6 });
    }
  }

  // --- 6. Close -------------------------------------------------------------
  if (living.length === 0) {
    say('And so this system ends its formation lifeless. Five worlds, not one of them able to hold life. It is not a failure — it is simply the most common outcome in a universe indifferent to whether anyone is watching.',
      { direct: { phase: 'survey' }, hold: 8 });
    say('Somewhere else, under another star, the dice may fall differently. But not here.',
      { hold: 6 });
  } else {
    const names = living.map((p) => p.world.full);
    const oneWord = living.length === 1;
    say(`Out of five worlds, ${oneWord ? 'one' : 'two'} cleared every hurdle at once: ${list(names)}. On a cosmic scale, that is a razor's margin — and it is everything.`,
      { direct: { phase: 'survivors' }, hold: 8 });
    say(`Because on ${oneWord ? 'that world' : 'those worlds'}, the same chemistry that built the planet is about to do something the rest of the universe never will. It is about to come alive.`,
      { direct: { focus: living[0].index }, hold: 7 });
    say('That is where we go next.', { hold: 5 });
  }

  return { title: `Episode 1 — From Nothing to Worlds`, subtitle: `${d.star.name} system · seed ${d.seed}`, cues };
}

function closingFor(chem) {
  if (chem.isGiant) return 'There is no ground here to hold an ocean, or a footprint.';
  if (chem.waterState === 'ice') return 'Whatever water it has is locked away as ice, and still.';
  if (chem.waterState === 'vapour') return 'Any water boils away before it can ever pool.';
  return 'A world, but not a home.';
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
