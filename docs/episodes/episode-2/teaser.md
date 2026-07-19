# Episode 2 teaser — "The Living World"

Standalone ~90-second teaser. Assumes the viewer knows the premise (they saw the
worlds form in Episode 1); promises the payoff of Episode 2 — the descent, the
origin of life, deep time reshaping one valley, and the living world's chain of
wildlife — **without spoiling the on-camera body-derivations** (those stay in the
episode; here they are only promised, in the same register the Episode 1 trailer
used: "bodies shaped by this world's own gravity, its air, and its cold").

Mirrors the shipped `teaser.js` shape: an ordered cue list, ≥3 written variants
per spoken beat (engine picks one per seed), each cue carries `scene`, a
`direct` block (`phase` / `era` / `site` / `shot`), and a `hold`. Ends on a
title card in the Episode 1 teaser's register.

All camera shots drawn from the BRIEF vocabulary; **≤2 uses of any shot within
the teaser** (ledger at the bottom — every shot here is used exactly once).
`${tokens}` are read off the viewer's own simulation (true by construction);
the data-contract agent owns their definitions.

11 cues + closing card.

---

## Cue 1 — Callback: the world that passed the filter
- **scene:** `return` · **direct:** `{ phase: 'orbit', shot: 'MACRO_ORBIT' }` · **hold:** 7
- **tokens:** `${world.name}`, `${star.name}`

Variants:
1. `You watched a universe build itself. Out of all the worlds ${star.name} made, one held onto its water. This is ${world.name} — the one that passed the filter. This time, we land.`
2. `Last time, we left this world hanging in orbit, still cooling, still empty. ${world.name}. The one world of ${star.name} where the chemistry said yes. Now we go down to see what it did with the chance.`
3. `A universe formed, and a handful of worlds failed the test. One did not. ${world.name}, in orbit around ${star.name} — checked, warm, wet, and waiting. You saw it form. Now watch it come alive.`

---

## Cue 2 — The descent
- **scene:** `return` · **direct:** `{ phase: 'descent', shot: 'DESCENT' }` · **hold:** 7
- **tokens:** `${world.tempC}`

Variants:
1. `Down through the air, and the numbers stop being astronomy. ${world.tempC} degrees. Liquid water. A sky thick enough to breathe. Facts, until now. About to become biology.`
2. `The descent proper — the world swelling in the frame until it is the frame. Everything Episode One measured from a distance is down there, close enough to touch: ${world.tempC} degrees, standing water, an atmosphere that holds.`
3. `We fall toward it. And the readings that ruled this planet in — a temperature of ${world.tempC}, an ocean that stays an ocean — are about to matter to something other than physics.`

---

## Cue 3 — Touchdown at the warm shallows
- **scene:** `surface` · **direct:** `{ phase: 'shallows', shot: 'WATER_LEVEL' }` · **hold:** 6
- **tokens:** none

Variants:
1. `The edge of a warm sea over bare rock. No life here. Not yet. But everything that will ever live on this world begins in exactly this puddle.`
2. `Touchdown, at the waterline. Warm shallows, raw stone, sunlight. It looks like nothing is happening. It is where all of it starts.`
3. `We come to rest where the water meets the rock, shallow and warm. An empty shore. Watch this shore. It is the beginning of everything.`

---

## Cue 4 — The soup: one molecule copies itself
- **scene:** `soup` · **direct:** `{ phase: 'replicator', shot: 'MACRO_PUSH' }` · **hold:** 8
- **tokens:** `${budget.topElements}`

Variants:
1. `Built from just what this world had lying around — ${budget.topElements} — chemistry churns for an age, going nowhere. Then one molecule does the thing that changes the universe: it makes a copy of itself.`
2. `From this world's own pantry — ${budget.topElements}, and nothing else — molecules form and break and form again, pointlessly, for longer than you can hold in your head. Until one of them copies itself. And keeps copying.`
3. `Everything you are about to meet is assembled from ${budget.topElements}. For an unimaginable stretch, that chemistry merely happens. And then it persists — one molecule, copying itself, over and over. This is the hinge of the whole story.`

---

## Cue 5 — The first life you could see
- **scene:** `soup` · **direct:** `{ phase: 'mats', shot: 'MACRO_DRIFT' }` · **hold:** 6
- **tokens:** none

Variants:
1. `Copies become cells. Cells become billions. Until the shallows themselves change colour — the first life on this world you could see from orbit.`
2. `A wall goes up between inside and outside — the first self in the universe — and then it feeds, and then it multiplies, until it stains the whole shore. Life, finally, visible.`
3. `From one copy, an entire population; from that, a colour spreading across the water. The planet has life now, and for the first time you could point at it.`

---

## Cue 6 — Deep time, one valley locked
- **scene:** `surface` · **direct:** `{ era: 0, shot: 'TIME_LOCK' }` · **hold:** 7
- **tokens:** none

Variants:
1. `Now hold this one valley in your eye, and do not look away. Two hundred million years is nothing here. The frame will not move. Everything else will.`
2. `One place. One locked frame — this coastline, this ridge. Watch what deep time does to it without the camera ever turning its head.`
3. `Fix on this valley. The rock underfoot will not shift for the rest of the teaser. But run the clock, and this exact view becomes unrecognisable.`

---

## Cue 7 — The same valley, greened and grown
- **scene:** `surface` · **direct:** `{ era: 3, shot: 'RISE_REVEAL' }` · **hold:** 7
- **tokens:** `${flora.dominant}`

Variants:
1. `Colour crawls up from the waterline. Then cover. Then ${flora.dominant} standing up off the ground and closing over the valley — and the rock beneath it never moved.`
2. `Same frame. The stain reaches the shore, greens, roots, and rises into ${flora.dominant} — a forest where a moment ago there was bare stone. Nothing was added from outside. It grew.`
3. `The shallows spill their life onto the land; ground cover becomes ${flora.dominant}, sparse then closing overhead. One place, transformed — built entirely out of that first coloured smear on the water.`

---

## Cue 8 — The living world, the chain begins
- **scene:** `surface` · **direct:** `{ site: 'coast', shot: 'LOW_TRACK' }` · **hold:** 7
- **tokens:** none

Variants:
1. `And where there are plants, there are things that eat them — and things that eat those. A whole world of animals, and not one of them lives alone.`
2. `Then the valley starts to move in ways the wind cannot explain. A living world, wall to wall — and here nothing happens by itself.`
3. `Life stands up, and then it walks. Herds, flocks, hunters — a crowded, running world, every creature tied to the one before it. Nothing here happens alone.`

---

## Cue 9 — The chain crosses a biome
- **scene:** `surface` · **direct:** `{ site: 'ridge', shot: 'RIDGE_CROSS' }` · **hold:** 6
- **tokens:** `${zones}`

Variants:
1. `Follow one panic over the ridge, and the world changes underneath you — ${zones} different climates on the same planet, each building different bodies from the same rules.`
2. `The thread never breaks. It carries you across a ridge into another country entirely — one of ${zones} on this single world — colder, higher, and stocked with creatures you have not met.`
3. `One startled flock hands you to a herd, the herd to a hunter, the hunter over the ridge — into a different biome, a different cast, the same planet. ${zones} worlds inside one world.`

---

## Cue 10 — The promise: bodies proven from this world's numbers
- **scene:** `surface` · **direct:** `{ site: 'vista', shot: 'WIDE_ECOSYSTEM' }` · **hold:** 8
- **tokens:** `${species.count}`

Variants:
1. `${species.count} kinds of life, every biome at once. And here is what no other film can do: for each one, we show you why it is shaped the way it is — from this world's own gravity, its air, and its cold.`
2. `Pull all the way out — the whole web, ${species.count} species, held in a single frame. In the episode, we prove every one of them: the exact reason it looks like that, read off this planet's numbers.`
3. `The full living world, ${species.count} creatures across every zone you crossed. Not invented. Derived — each body an argument this world's gravity, air, and temperature could not help but make.`

---

## Cue 11 — Closing title card
- **scene:** `surface` · **direct:** `{ card: true, shot: 'SILHOUETTE_DUSK' }` · **hold:** 7
- **tokens:** none

Card variants (≥3):
1. `The Worlds. Episode Two — The Living World. You saw the worlds form. Now watch one come alive.`
2. `The Worlds. Episode Two — The Living World. Your seed already made a planet. This is what it did next.`
3. `The Worlds. Episode Two — The Living World. Enter a seed. Bring one to life.`

---

## Shot ledger (proof of ≤2 uses within the teaser)

| Shot | Cues used | Count |
|------|-----------|-------|
| `MACRO_ORBIT` | 1 | 1 |
| `DESCENT` | 2 | 1 |
| `WATER_LEVEL` | 3 | 1 |
| `MACRO_PUSH` | 4 | 1 |
| `MACRO_DRIFT` | 5 | 1 |
| `TIME_LOCK` | 6 | 1 |
| `RISE_REVEAL` | 7 | 1 |
| `LOW_TRACK` | 8 | 1 |
| `RIDGE_CROSS` | 9 | 1 |
| `WIDE_ECOSYSTEM` | 10 | 1 |
| `SILHOUETTE_DUSK` | 11 (card) | 1 |

11 distinct shots, one use each — comfortably inside the ≤2 rule. No shot is
reused, so the teaser reads as a fast sweep of setups rather than a repeated
frame. (The `TIME_LOCK` locked-frame trick is stated in the narration of cue 6
and paid off across cues 6→7, but as a teaser it uses a single take, leaving the
sanctioned two-take `TIME_LOCK` exception fully available to the episode proper.)

## Notes for the assembler
- Tokens used: `${world.name}`, `${star.name}`, `${world.tempC}`,
  `${budget.topElements}`, `${flora.dominant}`, `${zones}`, `${species.count}`.
  All are already required by the episode spine (SKELETON cues 1, 2, 5, 16, 19,
  18) — the teaser introduces no new derived facts.
- **No derivations are spoiled.** Cue 10 promises the on-camera proofs
  ("gravity, air, and cold") in the same non-specific register as the shipped
  Episode 1 trailer; it never shows an arrow (no `wingSpan`, `legLen`, gravity
  number, Allen's-rule beat). Those remain the episode's payoff.
- Runtime estimate: ~90–100 seconds. Ten spoken beats plus a held card; spoken
  lengths run at or above the `hold` floors (holds sum to 69 s, and several
  variants speak longer), matching the shipped ~90 s trailer while carrying one
  extra beat.
