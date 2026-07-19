import { makeRng, hashSeed } from '../../core/rng.js';
import { castGenomes, baseTempC } from '../../fauna/cast.js';

// Episode 2's script — "The Living World" — generated from one real world.
//
// Same contract as Episode 1 (see ../narration.js): nothing is canned, every
// fact is read off the simulation for THIS seed, and the prose is seeded so two
// universes never tell the story in the same words. A cue is one spoken beat:
//   { text, scene, direct, hold }.
//
// Scene keys the Episode 2 player understands:
//   'orbit'   OrbitScene — the world from space (Act 1)
//   'surface' SurfaceScene — standing on the world (descent + Acts 3–5)
//   'soup'    SoupScene — the origin of life (Act 2)
//   'system'  SystemScene — the no-life gate only
//
// The principals A–F come from fauna/cast.js — the same module the surface
// stage spawns them from. The genomes quoted here ARE the rendered bodies, at
// the staged sites the camera flies to. One derivation; words and pictures
// cannot disagree.

const list = (names) => {
  const a = names.filter(Boolean);
  if (a.length <= 1) return a[0] ?? '';
  return a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
};
const m1 = (x) => `${x.toFixed(1)} metres`;
const cm = (x) => `${Math.round(x * 100)} centimetres`;

/** Coat clause for a cold-built principal (Allen's rule made audible). */
function coatClause(genome) {
  if (genome.shaggy) return 'A shaggy coat, bleached toward the white of snow, seals the rest.';
  return 'The coat is thick and pale.';
}

export function buildEpisode2Script(cosmos, world) {
  const d = cosmos.describe();
  const rng = makeRng(hashSeed('script:ep2:' + cosmos.seed));
  const pick = (...variants) => variants[Math.floor(rng() * variants.length)];

  // --- World facts, read off the sim ---------------------------------------
  const wname = world.full;
  const star = d.star.name;
  const tempC = baseTempC(world);
  const airNum = world.atmosphere.opacity * (0.5 + 0.5 * (world.atmosphere.thickness / 1.5));
  const air = airNum.toFixed(2);
  const airWord = airNum > 0.42 ? 'thick' : airNum > 0.3 ? 'dense' : airNum > 0.2 ? 'thin' : 'barely there';
  const gravity = world.gravity.toFixed(2);
  const heavies = list(
    cosmos.budget.fractions.filter((f) => !['H', 'He'].includes(f.sym)).slice(0, 3).map((f) => f.name),
  );
  const biomeLabel = world.biome.label;
  const groundColor = 'green';

  // --- The principal cast: the same specs and genomes the stage spawns -----
  const fa = world.fauna ?? [];
  const { specs, gen } = castGenomes(world, cosmos.seed);
  const nm = (k) => specs[k]?.species ?? 'the animal';
  const flora = world.flora?.species?.[0]?.preset ?? 'the trees';
  const speciesCount = fa.length;
  const zonesList = list(['the coast', 'the scrub', 'the highlands', 'the interior']);
  const zonesCount = 4;

  const cues = [];
  const say = (text, opts = {}) => cues.push({ text, ...opts });

  // === ACT 1 — RETURN ======================================================
  say(pick(
    `At the end of the last story, out of five worlds, one door stood open. This is what was behind it. ${wname}, still turning under ${star}, exactly where we left it.`,
    `Here it is again. The one world in this whole system that passed every test at once — ${wname} — hanging in the light of ${star}, waiting for us to come back and finish the sentence.`,
    `One world cleared the filter. Just one. From up here it is only a bright curve against the dark, turning under ${star} — but ${wname} is where chemistry is about to do the thing it does almost nowhere.`,
  ), { scene: 'orbit', direct: { phase: 'orbit' }, hold: 6 });

  say(pick(
    `We measured this world once already, from a distance, as astronomy. A surface near ${tempC} degrees. Water that stays liquid. Air ${airWord} enough to hold it down. Watch those three numbers stop being astronomy, and start being biology.`,
    `Three facts carried us here: ${tempC} degrees at the surface, water liquid rather than frozen or boiled away, and ${airWord} air pressing it flat. In the last episode they were the reasons this world survived. In this one, they are the reasons it can live.`,
    `Everything that is about to happen is already written in the readings. Temperature, ${tempC}. Water, liquid. Air, ${airWord}. Ingredients, not scenery — and the recipe is finally about to be followed.`,
  ), { scene: 'orbit', direct: { phase: 'approach' }, hold: 6 });

  say(pick(
    'So we go down. Not a cut, not a jump — one continuous fall, through the top of the air and into it, the curve of the world flattening into a horizon, the horizon flattening into ground.',
    'Down through the atmosphere, then. The same air that held the ocean from space now thickens around us, and the planet stops being a sphere and becomes a place — with a sky above it and a floor below.',
    'We drop toward it. The whole world swings up to meet the frame and keeps growing until it is no longer a world at all, just weather, then cloud, then a coastline rushing up out of the blue.',
  ), { scene: 'surface', direct: { phase: 'descent', era: 0 }, hold: 7 });

  say(pick(
    'And we come to rest here. Warm shallows over bare rock, at the edge where water meets stone. Nothing lives on this whole planet yet. But of every place it could begin, it begins in a pool exactly like this one.',
    'Touchdown, at the waterline. No soil, no green, no sound but the water — just warm sea running thin over naked rock. Remember this shore. This is the address where life has its first idea.',
    'Here. Where the sea goes shallow and the rock lies just beneath it, sun-warmed and mineral-stained. It looks like nothing. It is the most important place on the world, because this is where the chemistry is about to wake up.',
  ), { scene: 'surface', direct: { phase: 'shallows', era: 0 }, hold: 6 });

  // === ACT 2 — THE SOUP ====================================================
  say(pick(
    `First, take stock of the pantry — because life cannot use what the universe never made. Beyond hydrogen, this world's rock and water are richest in ${heavies}. That short list is the entire toolkit. Everything that follows is built from exactly this, and nothing else.`,
    `Warm water, mineral-rich rock, and a fixed set of ingredients: after hydrogen, the elements most abundant here are ${heavies}. Not chosen — inherited, forged in dying stars two episodes ago. Every molecule, every membrane, every cell this story reaches has to be assembled from that handful.`,
    `The shallows are a chemistry set, and the bottles are already on the shelf: ${heavies}, dissolved in warm water over rock. That is the whole stock. Life is not going to reach outside this pool for a single new part.`,
  ), { scene: 'soup', direct: { phase: 'pantry' }, hold: 7 });

  say(pick(
    'And at first, chemistry simply happens. Small molecules assemble, come apart, assemble again in slightly different ways — energy in, energy out, building nothing that lasts. This goes on for a length of time the human mind is not built to hold.',
    'Heat and light drive the reactions; the reactions run in every direction at once. Molecules form and break and re-form, endlessly, pointlessly, patient beyond patience. For hundreds of millions of years, that is the entire story: chemistry that goes nowhere.',
    'Watch it churn. Bonds make and unmake, shapes gather and dissolve — a restlessness with no direction and no memory. Nothing here is alive. Nothing here is even trying. It is only chemistry, doing what chemistry does, for an unimaginably long time.',
  ), { scene: 'soup', direct: { phase: 'monomers' }, hold: 6 });

  say(pick(
    'And then, once, in all that churning, something different. A molecule assembles that happens to be a template for itself — it pulls the loose parts of the pool into its own shape, and makes a copy. That is all. But that is everything. Because now there are two, and both of them can do it again.',
    'Then a threshold, crossed quietly and only once. A molecule forms with a shape that copies itself: it lines up the scattered pieces of the soup along its own body and lets them lock into a second molecule just like it. Chemistry that merely happened has become chemistry that persists.',
    'Somewhere in the endless reshuffling, a pattern appears that can print itself. Not designed, not intended — stumbled into, the way a key is eventually cut that fits a lock. But this pattern makes another of itself, and a line begins that has not been broken from that day to this.',
  ), { scene: 'soup', direct: { phase: 'replicator' }, hold: 8 });

  say(pick(
    'The copies are not perfect. Every so often one comes out slightly wrong — and a wrong copy that happens to copy faster, or hold together longer, leaves more descendants than its neighbours. Do that for a million generations and the pool fills with the best copiers. No one is choosing. It is only arithmetic.',
    'Copying makes mistakes, and mistakes are the point. Most are useless. But now and then an error copies a little better than the original — and better copiers, by definition, make more copies. That tilt has a name. It is called evolution, and it is nothing more than counting.',
    'Nothing here has a will. But imperfect copies compete for the same loose parts, and the ones that gather those parts fastest simply come to outnumber the rest. Stated plainly: the better copier wins, and there is more of it tomorrow than there was today.',
  ), { scene: 'soup', direct: { phase: 'selection' }, hold: 7 });

  say(pick(
    'Then oil does what oil does in water: it beads. A film of it closes into a bubble — and for the first time in the history of the universe, there is an inside and an outside. A wall between a small pocket of chemistry and everything else. The first boundary. The first faint idea of a self.',
    'Among the products of the soup are molecules with two faces — one that loves water, one that flees it. Crowded together, they have only one stable answer: curl into a sphere, wet side out, and seal. A membrane. Suddenly the pool has edges in it, each one dividing me from not-me for the very first time.',
    'A droplet of oil wraps itself shut, and something unprecedented exists — a here and a there. Whatever chemistry is caught inside that bubble is now, however slightly, protected, concentrated, its own. It is not alive yet. But it is separate, and separateness is where a self has to begin.',
  ), { scene: 'soup', direct: { phase: 'membrane' }, hold: 7 });

  say(pick(
    'Now put the two together. A replicator, sealed inside a membrane, drawing the chemistry of the pool in through its wall to build more of itself. It copies. It feeds. It holds a border against the world. That is a cell — the first one — and every living thing that has ever existed is a version of it.',
    'The copier finds itself inside the bubble, and the bubble becomes a machine. It takes in raw material from the water, spends it to make more copies and more wall, and keeps its inside different from its outside. Copying, feeding, maintaining — that combination is what we mean by the word alive.',
    'A wall around a copier that eats. Say it that simply. But eating means running chemistry on purpose, to a pattern, to stay in one piece against a universe that wears everything else down — and that is metabolism, the engine that has run in every cell without stopping since. It starts here, in one bubble, in this pool.',
  ), { scene: 'soup', direct: { phase: 'cell' }, hold: 7 });

  say(pick(
    'From that first cell, the line divides — and how it divides decides the rest of this series. Most of its descendants will spend the coming ages learning to build: walls, then bodies, then the whole tree of life we are about to climb. But a few take the other road. They never build a body at all. They stay small, and simple, and learn instead to live inside the ones that did. Remember them. We will not see them again for a long time.',
    'Two ways out of the soup, and the world takes both. Down one road: cells that cooperate, specialise, and eventually assemble into everything large enough to have a name. Down the other, quieter road: cells that give all of that up, keep almost nothing, and make their entire living inside another cell’s wall. That second road leaves this story now. It is not gone. It is waiting.',
    'The tree of life has a root, and here it forks. One branch reaches upward — toward bodies, toward the creatures and forests still to come. The other reaches inward: cells that never grow large, that survive by borrowing what a neighbour built. We follow the first branch for the whole of this episode. The second one has been patient. Keep it in the back of your mind.',
  ), { scene: 'soup', direct: { phase: 'split' }, hold: 7 });

  say(pick(
    'And then there are not two cells, or a thousand, but numbers the pool can no longer hold apart. They spread across the wet rock in their billions until the shallows change colour — a stain you could see from orbit. This is the first life large enough to be visible from space. Now hold this shore in your eye, because time is about to move.',
    'Copying has one inevitable result: more. The cells carpet the shallows, layer on layer, until the bare rock of the coastline is washed in the colour of living things. That smear is the planet’s first visible breath. Fix the frame. We are about to let two hundred million years run across it.',
    'A single cell, copied without pause, becomes a film, becomes a mat, becomes a shoreline of them — the first time this world wears life on the outside where the sky can see it. Keep your eyes on this exact stretch of coast. Everything after this is just time, and what time does to a living shore.',
  ), { scene: 'soup', direct: { phase: 'mats' }, hold: 8 });

  // === ACT 3 — FAST-FORWARDS ==============================================
  say(pick(
    'This is the same shore we landed on — bare rock, an empty sea, a raw sky, and not one living thing in any of it. Fix the frame in your mind. Two hundred million years is nothing to a world like this. Watch.',
    'Here is the valley, sterile. No green, no motion but the water, no sound that anything made. Hold this picture — the coastline, the rock, the line of the sea. We are about to run the clock, and only one thing in the frame will change.',
    'Look at it while it is still empty: raw stone, standing water, and the same sky the chemistry breathed under. Deep time is about to pass across this exact place. The camera will not move. Everything else will.',
  ), { scene: 'surface', direct: { era: 0, phase: 'sterile' }, hold: 6 });

  say(pick(
    'The mats have reached the shore. Colour is bleeding into the shallows and along the wet rock — and nothing else in the frame has stirred. Same stone. Same sea. The place is simply alive now.',
    'Watch the water’s edge. That stain is the soup, arrived at the surface in its billions. We did not move the camera and we did not cut away. The valley you were just looking at has been colonised without a single other thing changing.',
    'There. The wet rock has taken on a colour it did not have a moment ago. That is life you could see from orbit — and it crept in under a locked frame, so you would have to believe it. Same shore. Now stained.',
  ), { scene: 'surface', direct: { era: 1, phase: 'stained' }, hold: 6 });

  say(pick(
    `Now it climbs out of the water. Ground cover crawls up from the tide line onto bare stone — the first ${groundColor} to hold the land at all. Life has left the sea’s edge and started to take the rock.`,
    `The stain does not stay in the shallows. It creeps uphill, a ${groundColor} film spreading off the water and onto dry ground, because anything that can copy itself and catch the light will go wherever the light is. And the light is everywhere.`,
    `Same valley, a new angle on it — and a new colour. Low cover is working its way up from the sea, turning wet rock to ${groundColor}. The land, for the first time, is being lived on.`,
  ), { scene: 'surface', direct: { era: 2, phase: 'greening' }, hold: 6 });

  say(pick(
    `Then life stands up off the ground. The first true plants take root — sparse at first, ${flora} finding a footing — and then, in a breath of deep time, a forest closes over the whole valley.`,
    `Flat cover is not the end of it. Something reaches upward for the light and beats its neighbours to it, and once one plant stands, they all must. ${flora} rises across the slopes until the bare valley is roofed in living tissue.`,
    `Now the valley grows a third dimension. Roots go down, stems go up, and ${flora} spreads until what was raw stone is a standing forest. Every stalk of it was assembled from the same water and rock we watched come alive.`,
  ), { scene: 'surface', direct: { era: 3, phase: 'rooted' }, hold: 7 });

  say(pick(
    'And then something moves that is not the wind. Look at the air over the shore — it has come alive. The first animals, riding the sky above the forest that fed on the light. Tentative. But they move on their own account.',
    'Watch the sky over the water. That drift is not weather — it is the first movers, airborne in numbers, and far off at the edge of the frame something smaller is testing the open ground. Life has learned to go and get its food instead of waiting for it.',
    'Up to now everything in this frame has stayed where it grew. No longer. Motion enters the valley — wings over the shallows, a faint restlessness in the far distance — and for the first time this world contains something that can decide to be somewhere else.',
  ), { scene: 'surface', direct: { era: 4, phase: 'firstmovers' }, hold: 6 });

  say(pick(
    `Now the shore fills. Grazers come down to the water; the flock thickens over the shallows — this valley gathering its own kinds, while over every horizon the same slow crowding happens in other shapes. ${speciesCount} species now share this world, and every one of them was folded out of that first stain. Nothing was added from outside.`,
    `Wave on wave, life claims the frame — herds on the ground, fliers over the water. And this shore is only keeping its share: across the planet the roster has filled to ${speciesCount} kinds of animal, each one a different answer worked out from the same starting chemistry. Rewind it and you would find no seam, no import, no outside hand — only era one, run longer.`,
    `The valley settles into its cast — the herds, the flock above them — and it looks complete. It is not even the whole story: ${speciesCount} species now live on this world, most of them beyond that ridge, in country we have not seen. It looks designed. It was not. It is what one pool of self-copying chemistry does, left alone with the light for long enough.`,
  ), { scene: 'surface', direct: { era: 5, phase: 'fullroster', event: 'flock-rest' }, hold: 7 });

  say(pick(
    `And this is one valley. Pull back. The same deep time has been running everywhere at once — ${zonesCount} climates on this single world, ${zonesList}, each with its own life built to its own conditions. We have been watching one shore of a whole living planet.`,
    `Now widen out, because this crowded coast is not the world — it is a corner of it. ${biomeLabel} here; something else over every horizon. ${zonesCount} distinct zones, one planet, and the same rules ran in all of them. Let us go and see the others.`,
    `Hold that valley in your mind and then let it shrink, until it is one patch of green on a globe that has ${zonesCount} kinds of climate on it at once. ${zonesList} — every one alive, every one different. The tour of a living world starts now.`,
  ), { scene: 'surface', direct: { era: 5, phase: 'reveal' }, hold: 7 });

  // === ACT 4 — THE CHAIN ===================================================
  say(pick(
    'Start on the coast, at rest. Warm shallows, a long tide line, the forest at its back. It looks like a set of separate lives minding their own business. It is not. On this world — on any living world — nothing happens alone. Watch one thing move, and follow what it touches.',
    'This is the coastal zone, calm for the moment. Remember that word — for the moment. Everything you are about to see is a single chain of cause and effect, and it begins here, quietly, before anything has been disturbed.',
    'Come down to the shore. Peace, of a kind: grazers, fliers, the hunters that price them all, laid out along the water as if none of them had anything to do with the others. Every one of them has everything to do with the others. It starts with the first thing to take fright.',
  ), { scene: 'surface', direct: { site: 'coast', focus: 'ecosystem' }, hold: 7 });

  say(pick(
    `Meet ${nm('A')}, working the shallows in a flock. And look at the wings — because the air here decided them. This atmosphere is ${airWord}; ${air} is all the density there is to push against. Poor lift has one answer: more wing. To carry a body this size, ${nm('A')} needs ${m1(gen.A?.wingSpan ?? 2)} of span. The planet did the arithmetic; the animal is the result.`,
    `${nm('A')}, on the water in numbers. That it flies at all is a fact about the air, not about ambition — this world sits only just above the floor of density, at ${air}. So the wings are enormous: ${m1(gen.A?.wingSpan ?? 2)} across, beating slowly to claw altitude out of an atmosphere that barely gives any. Thin air, huge wings. It is a rule, and here is the rule made flesh.`,
    `Watch the flock. Every one of those wingspans — ${m1(gen.A?.wingSpan ?? 2)} of it — is the same equation solved out loud. Lift is air times wing area times speed; the air is fixed and ${airWord}, at ${air}; the body must be held up regardless. Give the same bird a thick sky and it would need half the span. This sky, it needs all of it.`,
  ), { scene: 'surface', direct: { site: 'coast', focus: 'speciesA' }, hold: 8 });

  say(pick(
    `Then something spooks them — and the whole flock leaves the water as one body, a single sheet of wings tearing upward off the shallows. The first domino has fallen.`,
    `And there it goes. One alarm runs through the flock faster than any of them could think, and ${nm('A')} erupts off the water in a single motion, a thousand wings acting as one. Watch where it sends them.`,
    `All it takes is a shadow. The flock detonates off the surface at once — not a thousand decisions but one, sweeping up and inland. Nothing that big moves without pushing on something else.`,
  ), { scene: 'surface', direct: { site: 'coast', event: 'startle-flock', focus: 'speciesA' }, hold: 5 });

  say(pick(
    `The wall of wings sweeps inland — straight over a herd of ${nm('B')}, grazing. And now gravity takes its turn to speak. This world pulls at ${gravity} gravities, and a body must be held up on legs against it. Weight climbs with the cube of size; bone strength only with its cross-section — so the legs come out thick, ${cm(gen.B?.legRad ?? 0.1)} across at the bone. Look at them. The planet left the animal no choice.`,
    `Inland, the panic reaches ${nm('B')} — a grazer built by weight. As a pillar, each leg carries ${gravity} gravities of load, which is why it is ${cm(gen.B?.legRad ?? 0.1)} thick and not a delicate thing. As a pendulum it sets the gait — a short heavy leg swings fast, so this herd runs at ${(gen.B?.gaitHz ?? 1).toFixed(1)} strides a second whether it wants to or not. Physics picked the walk before the animal was born.`,
    `Meet ${nm('B')}, a herd of them, directly in the flock’s path. Every proportion of those legs is gravity’s signature. At ${gravity} gravities, a ${m1(gen.B?.legLen ?? 1.5)} leg has to be ${cm(gen.B?.legRad ?? 0.1)} at the bone or it snaps under its owner — mass goes as the cube, strength only as the square. There is no styling here. Only load.`,
  ), { scene: 'surface', direct: { site: 'coast', focus: 'speciesB' }, hold: 8 });

  say(pick(
    `The herd catches the flock’s fear the way dry grass catches a spark — and breaks. Now it is not the air that is moving. It is the ground.`,
    `${nm('B')} does not wait to learn what frightened the birds. The whole herd wheels and runs as one animal, and the coast that was still a moment ago is a stampede — going the only way panic ever goes: forward.`,
    `Fear is contagious across the species line. The wingbeat overhead is enough; the herd bolts. Watch the second domino take the third — because a stampede this size is exactly what something else has been lying still, waiting for.`,
  ), { scene: 'surface', direct: { site: 'coast', event: 'spook-herd', focus: 'speciesB' }, hold: 5 });

  say(pick(
    `The stampede is precisely what the stalker was built for. Meet ${nm('C')}, alone in the scrub — and read its body off the country it hunts. This is broken ground, and the hottest hunting country this world owns, and both facts are written on the animal. Rough terrain wants long legs and a wide stance, so its stride is ${m1(gen.C?.legLen ?? 1.3)}; heat wants extremities that shed it, so the frame is drawn out long and lean. A cold-country hunter of the same stock would be squat. This one is stretched. The climate stretched it.`,
    `${nm('C')} has been motionless this whole time, because a hunter’s whole economy is one accurate rush. The terrain is rough, so the legs are long — ${m1(gen.C?.legLen ?? 1.3)} — and the stance is wide, for footing on bad ground. This is the hot end of the world's weather, so the body is long and thin, all radiator, throwing off the heat a sprint dumps into it. Every line of it is terrain and temperature, solved.`,
    `Now the predator. ${nm('C')} waited in the scrub for exactly this panic, and its body is a map of where it waited. Broken ground gave it the ${m1(gen.C?.legLen ?? 1.3)} legs and the planted, wide-set stance. Hunting through the hottest hours this country has gave it the long lean build, because heat that cannot be shed is death mid-chase. It is shaped to not overheat, and here that is the same as being shaped to kill.`,
  ), { scene: 'surface', direct: { site: 'scrub', focus: 'speciesC' }, hold: 8 });

  say(pick(
    `And it commits. One rush, everything spent at once — and the chase tears out of the frame and into the broken country. We hold the shot. We do not need to see how it ends. We know.`,
    `There is no second attempt in that body, so it does not hesitate. The stalker breaks cover, the chase pours through the frame and away, and we let it resolve where we cannot watch. This is a documentary about how the world works, not a thing to watch bleed.`,
    `It goes — low, flat, all of it at once. Hunter and herd cross the frame together and are gone, and the story finishes out of sight. Somewhere out there, one animal is down. Watch instead what that draws.`,
  ), { scene: 'surface', direct: { site: 'scrub', event: 'predator-commit', focus: 'speciesC' }, hold: 5 });

  say(pick(
    `The kill calls the swarm. ${nm('D')} rises out of the ground as one seething body — each animal barely ${m1(gen.D?.size ?? 0.3)} across — because on a living world nothing edible is ever wasted, and the smallest mouths are always the most numerous. What the hunter could not finish, these will.`,
    `And here is what the dust was hiding: ${nm('D')}, boiling up out of the soil the instant there is death to feed on. Singly they are nothing, ${m1(gen.D?.size ?? 0.3)} of body apiece. Together they will reduce the kill to bare ground. Life eating life eating light — and not a gram of it thrown away.`,
    `No carcass lasts long here. The scent of the kill pulls ${nm('D')} up in a living haze, none larger than ${m1(gen.D?.size ?? 0.3)}. This is the chain’s quiet arithmetic: the big animal fed the hunter, the hunter’s leavings feed the swarm, and the swarm is about to feed the wind.`,
  ), { scene: 'surface', direct: { site: 'scrub', focus: 'speciesD', event: 'kill' }, hold: 7 });

  say(pick(
    'Sated, the swarm lifts — and the warm ground gives it a road. A column of them rides the updraft upward, off the coast entirely, climbing toward the ridge. The camera goes with it.',
    'Then the whole cloud rises as one, caught on the heat coming off the baked scrub, and it stacks into a column that leans against the ridge and climbs it. Follow that column. It is about to carry us out of this world and into another one — on the same planet.',
    'Warm air rises, and the swarm rises on it, spiralling up in a column that clears the coastal plain and reaches for the high ground. Stay with it. Where it is going, the rules are the same and the answers are completely different.',
  ), { scene: 'surface', direct: { site: 'scrub', event: 'swarm-rise', focus: 'speciesD' }, hold: 6 });

  say(pick(
    'Over the ridge — and everything changes but the physics. This is still the same world, the same seed, the same handful of laws. But up here the air is thinner and the cold is real, and that is a different set of numbers fed into the same machine. Same rules, run in a harder place, build something else. Watch what they build.',
    `Cross the ridge and you cross a border no map drew — a border of climate. Behind us, the warm coast. Ahead, ${zonesList} — colder, higher, lit the same but held to a different temperature. Nothing about the rules has changed. Everything about the answers is about to.`,
    'The column tips us over the top, and the coast is gone. New country: high, thin-aired, cold. We have not left the planet — we have only moved to where its numbers read differently. Feed a colder temperature into the same body-building rules, and out comes a creature the coast could never have grown.',
  ), { scene: 'surface', direct: { site: 'ridge', focus: 'ecosystem' }, hold: 8 });

  say(pick(
    `Meet ${nm('E')}, of the high cold. And now temperature takes the chisel. Winter owns this ground for most of the year, and cold has one commandment: lose less heat. So the body is pulled inward — round and compact, ${m1(gen.E?.bodyRad ?? 1)} through the torso where the coast’s animals are lean — and every extremity is cut short, ${m1(gen.E?.legLen ?? 1)} legs, a stubbed neck. ${coatClause(gen.E ?? {})} The planet left it no choice but to hoard warmth, and this is the shape of hoarding.`,
    `${nm('E')} is the same kind of life we met on the shore, built under a colder sky, and the difference is Allen’s rule made visible. Surface loses heat; volume keeps it; so a cold-country animal minimises the first and maximises the second. The result: a rounded ${m1(gen.E?.bodyRad ?? 1)} torso, short ${m1(gen.E?.legLen ?? 1)} legs, everything tucked in close against the high cold. ${coatClause(gen.E ?? {})} Nothing here is for looks.`,
    `Here is what the cold builds. On this ground, on the coldest nights, a long lean body would bleed its warmth into the air and die of it, so ${nm('E')} is the exact opposite of the coastal hunter — compact, ${m1(gen.E?.bodyRad ?? 1)} at the barrel, legs cut down to ${m1(gen.E?.legLen ?? 1)}. ${coatClause(gen.E ?? {})} Same starting stock as the shore. A different thermometer. That thermometer is the whole reason it looks like this.`,
  ), { scene: 'surface', direct: { site: 'highland', focus: 'speciesE' }, hold: 8 });

  say(pick(
    `And the thread does not break at the ridge. ${nm('E')} moves off, and its moving flushes something larger from the high ground — the chain has found its next link, native to this cold country, and it hands us on.`,
    'Watch: nothing up here happens alone either. The herd shifts, and the shift startles a bigger body out of cover further up the slope. Same grammar as the coast, played in a colder key. Follow it.',
    `Even here, one life pulls the next. As ${nm('E')} climbs, it disturbs the ground ahead, and up out of that disturbance comes the last of our principals. The coast handed us to the highland; the highland now hands us on.`,
  ), { scene: 'surface', direct: { site: 'highland', event: 'highland-link', focus: 'speciesE' }, hold: 5 });

  say(pick(
    `And meet the last of them: ${nm('F')} — a body plan unlike anything on the coast. Where the others were built low, this one is built tall. Look at the neck: ${m1(gen.F?.neckLen ?? 1)} of it, reaching for food nothing else can touch, on a frame ${m1(gen.F?.size ?? 3)} at the shoulder standing over ${gen.F?.legCount ?? 4} legs. The same rules that made a stub-necked animal in the cold made a long-necked one where the food grew high.`,
    `The chain ends on ${nm('F')}, and it is worth ending on — because it is the most extreme answer this world wrote. ${gen.F?.legCount ?? 4} legs under a body ${m1(gen.F?.size ?? 3)} across, carrying a neck ${m1(gen.F?.neckLen ?? 1)} long. That neck is not decoration; it is reach, and reach is worth a great deal wherever the browse is tall and the competition is short. Different problem, same solver, wildly different shape.`,
    `Last, and least like the rest: ${nm('F')}. Everything about it is that ${m1(gen.F?.neckLen ?? 1)} neck and the ${gen.F?.legCount ?? 4}-legged tower that holds it up, ${m1(gen.F?.size ?? 3)} at the shoulder. On the coast, being low paid. Here in the interior, being tall pays — so the identical rule book, read against a different landscape, produced this. One world. One set of laws. And bodies this far apart.`,
  ), { scene: 'surface', direct: { site: 'interior', focus: 'speciesF' }, hold: 8 });

  say(pick(
    'And then the chain slows, and the light goes long and gold. The day’s violence is spent — the chase, the stampede, the swarm, all of it behind us now. The world exhales toward evening.',
    'The links come further and further apart, until they stop. Dusk. The low sun turns the whole interior amber, and everything that ran today stands quiet. Nothing is chasing anything now. Watch a living world let go of a day.',
    'Evening reaches the high country. The gold comes in low and long, and the frantic arithmetic of the afternoon settles into stillness. The chain has carried us across the whole world; here, at last, it rests.',
  ), { scene: 'surface', direct: { site: 'interior', phase: 'dusk', focus: 'ecosystem' }, hold: 7 });

  say(pick(
    `Now pull all the way out, and hold the whole thing in one frame at once. Every biome we crossed — coast, scrub, highland, interior — ${zonesCount} climates, ${speciesCount} species, one web. This is what grew from a single warm pool. Not a set of separate stories. One story, with this many characters.`,
    `Let the lens go wide enough to take in everything we walked through. ${zonesCount} zones on one planet, ${speciesCount} kinds of life stitched together by exactly the chain we just followed. From up here you cannot see where one ecosystem ends and the next begins, because — in truth — they don’t.`,
    `Widen out to the whole living web. ${speciesCount} species across ${zonesCount} climates, every one of them connected to every other by something eating, fleeing, feeding, or falling. We traced one thread through it. There are more threads than there are creatures.`,
  ), { scene: 'surface', direct: { site: 'vista', focus: 'world' }, hold: 8 });

  say(pick(
    'And come to rest on one quiet thing. A herd bedding down in the last light; the flock drifting back to roost over the water. The web at equilibrium — not still, never still, but balanced. Tomorrow it runs again.',
    'Settle on a single calm corner of it: animals folding down into the dusk, the day’s chain wound all the way out. Nothing is happening, which on a living world is its own kind of event — the moment the balance holds.',
    'Let it end gently. Somewhere in the frame a herd lies down; somewhere a flock comes home. This is what all that violence is for — a world that keeps running, night after night, in balance with itself. Watch it breathe.',
  ), { scene: 'surface', direct: { site: 'coast', event: 'settle', focus: 'speciesB' }, hold: 6 });

  // === ACT 5 — CLOSE =======================================================
  say(pick(
    `Every creature you have met tonight, every biome we crossed, the forests and the swarms and that impossible neck — all of it grew from one warm pool of chemistry on ${wname}. One system. You cannot take a piece of it out and have the piece, or the rest, still make sense.`,
    `Remember where this started: a stain in the shallows. Everything since — ${wname} entire, coast to cold cap — is that same chemistry, elaborated and elaborated until it could run itself. It is not many things. It is one thing, indivisible, wearing a great many shapes.`,
    `Step back once more and see it whole. ${wname} is not a planet with life on it. It is a planet that turned part of itself into life and never stopped — one continuous system, from the first replicator to the last herd lying down in the dark. There is no seam anywhere in it. We looked.`,
  ), { scene: 'surface', direct: { focus: 'world' }, hold: 8 });

  say(pick(
    'But cast your mind back to the soup, to the moment the first cell formed — because two lineages left that pool, not one. One built bodies, and became everything we have spent this hour with. The other never built a body at all. It stayed small, and hidden, and it learned to live inside the first. It is here right now, in every creature on this world. You simply cannot see it.',
    'There is one thread we let go of, back at the beginning, and it is time to pick it up. When the lineage split, most of it went on to make the visible world. A sliver of it did not. It gave up on bodies and moved into them instead — into the grazers, the fliers, the hunters, all of them. The other has been inside the frame this whole time.',
    'Everything tonight has been the lineage you can see. But remember the whisper in the soup — the copies that never became creatures, that stayed parasitic, that made their living within other lives. They did not fail. They chose a different door, and it led straight into the bodies of everything here. One living world. Two lineages. And only one of them has taken a bow.',
  ), { scene: 'surface', direct: { focus: 'world' }, hold: 8 });

  say(pick(
    'And somewhere on this world, among all these lives, something is about to do the strangest thing chemistry has ever done — it is about to start asking questions about itself. That story is Episode 3. Or take a new seed, and begin a whole world over.',
    `The chain is not finished. On ${wname}, one of these lineages is about to cross a threshold stranger than being alive — it is about to become aware that it is. Where that goes is the next episode. And the world it goes in is yours to choose: a new seed rolls a new one from nothing.`,
    'One threshold remains. Somewhere down there, life is about to look up and wonder what it is — and the unseen lineage is waiting for exactly that. That story is Episode 3. When you are ready, roll another seed, and we will build you another world to find it in.',
  ), { scene: 'surface', direct: { focus: 'world' }, hold: 6 });

  return { title: 'The Worlds — Episode 2: The Living World', cues, living: true };
}

/** The no-life gate: plays instead of the episode when a seed has no living world. */
export function buildEpisode2Gate(cosmos) {
  const d = cosmos.describe();
  const rng = makeRng(hashSeed('script:ep2gate:' + cosmos.seed));
  const pick = (...v) => v[Math.floor(rng() * v.length)];
  const star = d.star.name;
  const n = d.planets.length;
  const cues = [];
  const say = (text, opts = {}) => cues.push({ text, ...opts });

  say(pick(
    `This universe finished forming, and cleared no world for life. ${star} holds ${n} planets, and not one of them can hold a living thing. That is not a fault in the machine. It is the machine working, and returning the answer it returns most often: no.`,
    `We ran the whole story — the fire, the stars, the elements, the ${n} worlds that condensed around ${star} — and it ended in silence. Nothing went wrong here. A universe with no life in it is not a broken universe. It is the ordinary one.`,
    `Here the door never opens. ${star} and its ${n} worlds are complete, and every one of them is dead. Before we leave, we owe this system the courtesy the last one got: not to look away, but to read exactly why.`,
  ), { scene: 'system', direct: { phase: 'survey', focus: -1 }, hold: 8 });

  d.planets.forEach((p, i) => {
    const reason = Array.isArray(p.ruledOut) ? p.ruledOut[0] : p.ruledOut;
    if (!reason) return;
    say(pick(
      `Take them one at a time. ${p.name}: ruled out, because ${reason}. No argument, no near miss — just a fact the world could not get around.`,
      `${p.name}, and its reason, in its own data: ${reason}. The checklist for life is short and it is absolute, and this world failed it exactly there.`,
      `Then ${p.name}. What closed the door here was simple — ${reason}. Read it and move on; the world cannot.`,
    ), { scene: 'system', direct: { phase: 'survey', focus: i }, hold: 6 });
  });

  say(pick(
    'None of that is bad luck. A universe does not aim at life; it aims at nothing at all. It simply runs its rules, and the rules produce empty worlds far more easily than they produce a single living one. Silence is not the exception here. Silence is the baseline.',
    'This is what the cosmos does almost everywhere, almost always. Life is the rare accident, not the intended result. You are looking at the common case.',
    'Do not read tragedy into it. There is no one here for it to be a tragedy for — that was rather the point. The same blind rules that could have built a living world simply, this time, did not.',
  ), { scene: 'system', direct: { phase: 'survey' }, hold: 7 });

  say(pick(
    'But the rules that failed here are the same rules everywhere. A different cloud, a different star, a different roll of the same chemistry, and the answer could come back the other way. That universe exists. It is simply not this one. Shall we begin another?',
    'Nothing here was rigged against life; it just didn’t fall that way. And the beauty of a rule is that it can be run again. Begin again, and let’s find a warm shore that does wake up.',
    'The story is not over — only this telling of it. Give me one more cloud, and we will run the whole thing from nothing, and see whether this time the door opens.',
  ), { scene: 'system', direct: { phase: 'survey' }, hold: 6 });

  return { title: 'The Worlds — Episode 2 (no living world)', cues, living: false };
}
