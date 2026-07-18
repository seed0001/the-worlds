import { makeRng, hashSeed } from '../core/rng.js';

// Episode 1's script, generated from one real universe.
//
// Nothing here is canned prose with the numbers blanked in. Every line is built
// from what the chemistry engine actually produced for THIS seed — this star's
// mass, these elements in these amounts, this planet ruled out for this reason —
// so the narration is true to the universe on screen by construction. And the
// prose itself is seeded: each beat picks among written variants, so two
// universes never tell their story in quite the same words. Change the seed and
// the documentary tells a different, equally honest story — differently.
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

  // Seeded phrasing: every `pick(...)` chooses a variant deterministically from
  // the cosmos seed, in order — so a seed pins the whole read, word for word.
  const rng = makeRng(hashSeed('script:' + cosmos.seed));
  const pick = (...variants) => variants[Math.floor(rng() * variants.length)];

  const heavies = elementRoll(cosmos);
  const living = cosmos.livingWorlds;

  // --- 1. Cold open ---------------------------------------------------------
  say(pick(
    'In the beginning, there is nothing to see. No space to cross. No time to cross it in.',
    'Before anything, there is nothing. Not darkness — darkness needs space to fill, and there is no space. Not silence — silence needs time to last, and there is no time.',
    'Start with nothing. No stage, no clock, no distance. The words "before" and "outside" do not mean anything yet.',
  ), { scene: 'bigbang', direct: { phase: 'void' }, hold: 5 });

  say(pick(
    'Everything that will ever exist is here — not spread across a universe, because there is no universe yet for it to spread across. Only energy, waiting.',
    'And yet everything is already present. Every star that will ever burn, every world, every drop of every ocean — folded into a single point of pure energy, waiting.',
    'All of it is here already. Not stored, not arranged — just energy, all of it, everywhere at once, because there is nowhere else to be.',
  ), { direct: { phase: 'point' }, hold: 5 });

  say(pick(
    'Watch what a handful of rules — energy, gravity, light, and the elements they build — can make out of that.',
    'What follows is not a miracle. It is a handful of rules — energy, gravity, light — applied without mercy and without pause, for a very long time. Watch.',
    'This film is about what happens next: how a few blunt rules, given enough time, turn that into everything.',
  ), { direct: { phase: 'strain' }, hold: 4 });

  // --- 2. The Big Bang ------------------------------------------------------
  say(pick(
    'Then it begins to expand. Not an explosion into space — space itself, unfolding, and cooling as it grows.',
    'Then — expansion. Not a bomb going off in an empty room. The room itself is what explodes: space unfolding out of nothing, cooling as it stretches.',
    'And then it lets go. Space itself tears outward in every direction at once — there is no centre, because every point is the centre — and as it grows, it cools.',
  ), { direct: { phase: 'bang' }, hold: 6 });

  say(pick(
    'For the first instants it is too hot for matter to hold together. Energy and particles trade places freely, faster than the eye of any instrument could ever follow.',
    'In these first instants, nothing can hold its shape. Particles flash into existence and are annihilated in the same breath — matter and energy trading places faster than measurement itself.',
    'The young universe is too hot to keep anything. Whatever forms is torn apart at once; energy becomes matter becomes energy, over and over, trillions of times a second.',
  ), { direct: { phase: 'foam' }, hold: 5 });

  say(pick(
    'As it cools, the first matter freezes out of pure energy. And here the universe has almost no choice in what to make.',
    'But cooling changes the rules. Out of the fire, the first lasting matter condenses — and what it can be is not a choice. It is dictated.',
    'Then comes the first threshold: cool enough, at last, for matter to freeze out of energy and stay. And the universe gets almost no say in what kind.',
  ), { direct: { phase: 'firstmatter' }, hold: 5 });

  say(pick(
    'In the first few minutes, only the lightest nuclei can form: hydrogen, the simplest atom there is, and helium. Roughly three parts hydrogen to one part helium — and almost nothing else.',
    'The window lasts minutes. Long enough to fuse the two simplest things possible — hydrogen, and helium — in a ratio of roughly three to one. Then the window closes, and almost nothing else was made.',
    'There are perhaps twenty minutes in which nuclei can form at all. The output: hydrogen, three parts; helium, one part. A trace of lithium. That is the whole list.',
  ), { direct: { phase: 'nucleosynthesis' }, hold: 6 });

  say(pick(
    'That is the entire inventory of the young universe. Every richer thing — every rock, every ocean, every living cell that this story will arrive at — has to be built later, from these two ingredients.',
    'Hold on to that. Two ingredients. Every rock, every sea, every cell this story will ever reach must somehow be assembled from those two — because there is nothing else in stock.',
    'So the pantry of the universe holds exactly two things. Everything else — iron, water, bone — is not missing. It simply has not been invented yet.',
  ), { direct: { phase: 'inventory' }, hold: 5 });

  say(pick(
    'For now the cosmos is a fog: matter and light tangled together, opaque, glowing.',
    'And for hundreds of thousands of years, that is all there is: a glowing fog, matter and light so tangled that light cannot travel a finger’s width before being knocked aside.',
    'What follows is the longest single stretch of this story in which nothing happens: an opaque, glowing fog, light trapped inside matter, going nowhere.',
  ), { direct: { phase: 'fog' }, hold: 4 });

  say(pick(
    'Until it cools enough for atoms to capture their electrons and hold. In that instant the fog clears, and light travels free across the universe for the first time.',
    'Until one threshold more is crossed. Cool enough for atoms to close around their electrons — and the instant they do, the fog lets go of the light. The universe becomes transparent, all at once.',
    'Then the temperature drops below one precise line, atoms capture their electrons and hold them — and the fog simply clears. Light streams free across the universe for the first time, and it has never stopped.',
  ), { direct: { phase: 'recombination' }, hold: 6 });

  // --- 3. Gravity and the stars ---------------------------------------------
  say(pick(
    'Now gravity takes over. The young universe is not perfectly smooth — some regions are a whisper denser than others.',
    'Now the patient force takes over. Gravity. The young universe is almost perfectly smooth — almost. Some regions hold a whisper more matter than others, and a whisper is enough.',
    'What happens next is decided by imperfection. Had the universe been perfectly even, nothing more would ever have occurred. It was not perfectly even.',
  ), { direct: { phase: 'structure' }, hold: 5 });

  say(pick(
    'Gravity pulls matter toward matter. The dense places grow denser, draining the space around them, until clouds of hydrogen and helium collapse under their own weight.',
    'Matter pulls on matter. The rich grow richer: dense regions drain their surroundings, gathering into filaments and knots, until whole clouds of hydrogen and helium are falling inward under their own weight.',
    'Gravity amplifies every flaw. Each slightly-denser region pulls harder, gathers more, pulls harder still — until the gas of the universe is draped into filaments, and the knots in them begin to collapse.',
  ), { direct: { phase: 'gravity' }, hold: 5 });

  say(pick(
    'Squeeze hydrogen hard enough and it ignites. Nuclei fuse, and a star switches on — pouring out light, and holding itself up against gravity by the heat of its own fusion.',
    'Squeeze hydrogen hard enough, and it fights back. In the crushed heart of a collapsing cloud, nuclei fuse — and a star switches on: the first new light since the fog cleared, holding itself up by its own fire.',
    'At the centre of a collapsing knot, the pressure becomes unanswerable, and hydrogen does the only thing left to it: it fuses. A star ignites — and then another, and another, and the dark ages end.',
  ), { direct: { phase: 'firststars' }, hold: 6 });

  say(pick(
    'Inside that furnace, the universe finally builds something new. Hydrogen fuses to helium; helium to carbon and oxygen; and on up the ladder, forging the heavier elements the Big Bang never could.',
    'And inside that furnace, for the first time since the opening minutes, the universe builds something new. Hydrogen to helium. Helium to carbon, to oxygen — rung by rung up a ladder the Big Bang never had time to climb.',
    'A star is not just a light. It is a foundry. In its core, the two primordial ingredients are forged into carbon, oxygen, silicon — the first new elements in hundreds of millions of years.',
  ), { direct: { phase: 'fusion' }, hold: 6 });

  say(pick(
    'But fusion pays out less and less energy as it climbs, and it stops cold at iron. To build iron and beyond takes something more violent than a living star.',
    'But the ladder has a top. Each rung of fusion pays out less energy than the last, and at iron it pays nothing at all. A living star can climb no further. Beyond iron, the forge must be something worse.',
    'There is a limit, though. Fusion earns less with every step, and at iron the account runs dry. Nothing heavier can be made by a star that intends to survive.',
  ), { direct: { phase: 'iron' }, hold: 5 });

  say(pick(
    'A massive star, running out of fuel, collapses and detonates — a single blast outshining a galaxy, forging the heaviest elements and blasting everything it ever made back into space.',
    'When a massive star exhausts its fuel, it loses its long argument with gravity in a single second. The collapse rebounds as a detonation that outshines a galaxy — forging, in that one blast, every element a living star could not.',
    'So the heaviest elements are minted at a funeral. A giant star runs dry, collapses, and detonates — one second of violence outshining a hundred billion suns, and everything the star ever made is thrown back into the dark.',
  ), { direct: { phase: 'supernova' }, hold: 6 });

  say(pick(
    `Generation after generation of stars live and die this way, seeding the darkness with the elements of worlds. This universe took about ${d.generations} such generations to enrich the cloud that our story forms from.`,
    `And this happens again, and again — each generation of stars seeding the dark with elements for the next. The cloud our story forms from was enriched by about ${d.generations} generations of stars before it ever began to fall.`,
    `Every blast salts the gas for the stars that follow. Count the cycles: in this universe, roughly ${d.generations} generations of stars lived, forged and died to fill the cloud where our story begins.`,
  ), { direct: { phase: 'enrich' }, hold: 6 });

  // --- 4. A system condenses ------------------------------------------------
  say(pick(
    `From that enriched cloud, one more collapse — and this time the debris does not all fall in. Spinning, it flattens into a disc, and at its centre a new star ignites: ${d.star.name}.`,
    `In that enriched cloud, one knot among billions begins to fall. Spinning as it collapses, it flattens into a disc of gas and dust — and at the centre, pressure does what pressure does. A star ignites. Its name, for this story, is ${d.star.name}.`,
    `Now watch one cloud in particular. It collapses, spins, flattens into a disc — and at its heart a new star switches on. Call it ${d.star.name}. Everything that follows belongs to it.`,
  ), { scene: 'system', direct: { phase: 'ignite' }, hold: 7 });

  say(pick(
    `${d.star.name} is a star of about ${d.star.mass} times the mass of a typical yellow sun — and mass is destiny for a star. Heavier means hotter, brighter, and a warm zone thrown farther out into the dark.`,
    `Weigh it: about ${d.star.mass} times the mass of a typical yellow sun. For a star, that single number is destiny — it fixes how hot it burns, how bright, how long it lives, and how far out into the dark its warmth can reach.`,
    `Everything about ${d.star.name} follows from its weight — ${d.star.mass} times a typical yellow sun. That one number sets its brightness, its lifespan, and the exact band of distance where a world could be warm.`,
  ), { hold: 6 });

  say(pick(
    `The cloud it formed from is richest, after hydrogen and helium, in ${list(heavies)} — and that mix decides what its planets can be made of.`,
    `And the disc around it carries the fingerprint of every star that died to make it: after hydrogen and helium, it is richest in ${list(heavies)}. That inventory is the whole toolkit its planets get.`,
    `Read the disc's ingredients, because they are a budget, not a suggestion: beyond hydrogen and helium, mostly ${list(heavies)}. Whatever worlds form here will be built from exactly this, and nothing else.`,
  ), { direct: { phase: 'disc' }, hold: 6 });

  say(pick(
    'In the disc, temperature sorts everything. Close to the star it is searing, and only the most stubborn materials — metal and rock — can freeze into solid grains. The light, icy stuff is boiled away and blown outward.',
    'The disc is a sorting machine, and the sorter is heat. Near the star, only metal and rock are stubborn enough to freeze into solid grains; everything lighter is boiled off and driven outward into the cold.',
    'Distance from the star now decides everything. Close in, the disc is a furnace where only rock and metal can condense. The volatile things — water, ices, gas — are blasted outward to wait in the dark.',
  ), { direct: { phase: 'condense' }, hold: 7 });

  say(pick(
    'So the inner worlds are built from rock and metal, small and dense. Far out, past the frost line where water can freeze, ice joins the rock — and a world there can grow massive enough to swallow gas whole and balloon into a giant.',
    'The result is a rule written across every solar system: small, dense worlds of rock and metal close in; and past the frost line, where water freezes solid, worlds that grow fat on ice until they can swallow gas whole and become giants.',
    'And so geography is destiny. Inside the frost line, small rocky worlds. Beyond it, where ice is a building material, a growing world can tip past the point of no return, seize the disc’s gas, and balloon into a giant.',
  ), { direct: { phase: 'planets' }, hold: 7 });

  say(pick(
    `When the dust settles, ${d.star.name} holds five worlds. From here, they all look like possibilities. The question the rest of this story turns on is a narrow one: could any of them hold life?`,
    `When the disc is spent, five worlds remain in orbit around ${d.star.name}. From this distance every one of them is a possibility. The rest of this episode asks one narrow question: can any of them hold life?`,
    `The disc drains away, and what is left is the answer this system will have to live with: five worlds around ${d.star.name}. Now comes the only question that matters here — is any of them a place where life could start?`,
  ), { direct: { phase: 'reveal' }, hold: 6 });

  // --- 5. The habitability filter -------------------------------------------
  say(pick(
    'Life, as far as chemistry is concerned, needs a few specific things at once: liquid water, an atmosphere to hold it, and the handful of elements life builds its bodies from. Miss any one, and the door is closed.',
    'Chemistry’s requirements for life are short but absolute: water that stays liquid, an atmosphere to keep it, and the few elements bodies are built from. Every requirement at once — miss one, and the door is closed.',
    'The checklist for life is brutally short. Liquid water. An atmosphere to hold it down. The handful of elements a cell is made of. But it is a checklist, not a menu — a world must have all of it, at the same time.',
  ), { hold: 7 });

  for (const p of d.planets) {
    const chem = cosmos.planets[p.index].chem;
    const ordinal = ['first', 'second', 'third', 'fourth', 'fifth'][p.index];
    const tempWord = p.tempC > 60 ? 'scorched' : p.tempC < -10 ? 'frozen' : 'temperate';

    say(pick(
      `The ${ordinal} world, ${p.name}. ${cap(A_AN(p.type))} ${p.type} world orbiting at ${p.distanceAU} times our reference distance, with a surface near ${p.tempC} degrees — ${tempWord}.`,
      `${cap(ordinal)}: ${p.name}. ${cap(A_AN(p.type))} ${p.type} world at ${p.distanceAU} times our reference distance, its surface near ${p.tempC} degrees. ${cap(tempWord)}.`,
      `Move to the ${ordinal} orbit: ${p.name}, ${A_AN(p.type)} ${p.type} world at ${p.distanceAU} times our reference distance. Take its temperature — around ${p.tempC} degrees. ${cap(tempWord)}.`,
    ), { direct: { focus: p.index }, hold: 6 });

    if (p.habitable) {
      say(pick(
        `And here everything lines up. Liquid water, standing on the surface. Air thick enough to hold it. The elements of life, present in the rock. ${p.name} is not just survivable — it is a candidate for life.`,
        `Run the checklist. Liquid water — standing on the surface. An atmosphere — thick enough to hold it. The elements of life — present in the rock. ${p.name} passes every test at once. This is a candidate for life.`,
        `And against every odds in this episode, it all lines up here. The water is liquid, the air holds it down, the rock carries the elements a cell would need. ${p.name} is more than survivable. It is a candidate.`,
      ), { direct: { verdict: 'life', focus: p.index }, hold: 7 });
    } else {
      const reason = chem.ruledOutBecause[0];
      say(pick(
        `But ${p.name} is ruled out — ${reason}. ${closingFor(chem, pick)}`,
        `And that is where it fails. ${cap(reason)} — so ${p.name} is ruled out. ${closingFor(chem, pick)}`,
        `The checklist stops it cold: ${reason}. ${p.name} is out. ${closingFor(chem, pick)}`,
      ), { direct: { verdict: 'dead', focus: p.index }, hold: 6 });
    }
  }

  // --- 6. Close -------------------------------------------------------------
  if (living.length === 0) {
    say(pick(
      'And so this system ends its formation lifeless. Five worlds, not one of them able to hold life. It is not a failure — it is simply the most common outcome in a universe indifferent to whether anyone is watching.',
      'And so the verdict on this whole system is: no. Five worlds, and not one crossed the line. Understand that this is not a tragedy — it is the ordinary result, the one the universe produces almost everywhere, almost always.',
      'Five worlds; five refusals. This system will spin on, complete and dead, for billions of years — and the universe registers no disappointment, because the universe was never trying.',
    ), { direct: { phase: 'survey' }, hold: 8 });
    say(pick(
      'Somewhere else, under another star, the dice may fall differently. But not here.',
      'The same rules, run under a different star, will someday deal a different hand. But not here. Here, the story of life never begins.',
      'For that story, we would need another cloud, another star, another roll. It exists, somewhere. It is not here.',
    ), { hold: 6 });
  } else {
    const names = living.map((p) => p.world.full);
    const oneWord = living.length === 1;
    say(pick(
      `Out of five worlds, ${oneWord ? 'one' : 'two'} cleared every hurdle at once: ${list(names)}. On a cosmic scale, that is a razor's margin — and it is everything.`,
      `Count the survivors: of five worlds, ${oneWord ? 'exactly one' : 'two'} cleared every hurdle at once — ${list(names)}. That margin is a razor’s edge on a cosmic scale. It is also everything.`,
      `The filter passes ${oneWord ? 'a single world' : 'two worlds'}: ${list(names)}. One roll of chemistry slightly different, and this system would be as silent as the last. Instead — a door, standing open.`,
    ), { direct: { phase: 'survivors' }, hold: 8 });
    say(pick(
      `Because on ${oneWord ? 'that world' : 'those worlds'}, the same chemistry that built the planet is about to do something the rest of the universe never will. It is about to come alive.`,
      `Because on ${oneWord ? 'that world' : 'those worlds'}, the very chemistry that assembled the rock and pooled the water is about to attempt something it attempts almost nowhere: it is about to organize, and persist, and become alive.`,
      `On ${oneWord ? 'that world' : 'those worlds'}, matter is about to cross its strangest threshold yet — from chemistry that merely happens, to chemistry that maintains itself. From rock and water, to something alive.`,
    ), { direct: { focus: living[0].index }, hold: 7 });
    say(pick(
      'That is where we go next.',
      'That story is Episode 2.',
      'And that is where this story goes next.',
    ), { hold: 5 });
  }

  return { title: `Episode 1 — From Nothing to Worlds`, subtitle: `${d.star.name} system · seed ${d.seed}`, cues };
}

function closingFor(chem, pick) {
  if (chem.isGiant) return pick(
    'There is no ground here to hold an ocean, or a footprint.',
    'A world of weather with no floor — nowhere for an ocean to rest, or a footprint to land.',
  );
  if (chem.waterState === 'ice') return pick(
    'Whatever water it has is locked away as ice, and still.',
    'Its water is all present and all useless — locked solid, to the bottom, forever still.',
  );
  if (chem.waterState === 'vapour') return pick(
    'Any water boils away before it can ever pool.',
    'Water arrives here only as steam, and leaves the same way — nothing ever pools.',
  );
  return pick(
    'A world, but not a home.',
    'A finished world; an empty one.',
  );
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
