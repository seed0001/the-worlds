# Episode 3 — The Ones Who Ask

**Status: design.** Approved in conversation 2026-07-19; nothing built yet.
Working title — final title is the user's call.

## Logline

On the living world, one lineage crosses a threshold no other does: it starts
to ask questions. Episode 3 follows intelligent, social, tool-making humanoid
life from the first spark of mind, through the eras of its civilization — its
languages, its plagues, its machines — to a moment very close to our own
present, and asks what a species does to the planet that made it.

## The honesty problem, and how this episode handles it

Episodes 1 and 2 are **true by construction**: every fact is derived from the
simulation, because physics and chemistry give us real rules to run forward.
History does not. We have exactly one dataset for how an intelligent species
builds societies, spreads disease, and reshapes a planet — **Earth** — so
Episode 3 makes a deliberate, documented departure:

- **Physically constrained by the sim.** What the humanoid *is* and what its
  world *permits* stay derived — body plan from `genome.js` (this planet's
  gravity, air, temperature, terrain build this body), materials and energy
  from the element budget (`cosmos.budget`: you cannot have a bronze age
  without tin and copper in the ground; a metal-poor cloud gets a different
  technological path), climate and disease pressure from the planet's real
  temperature and biomes.
- **Historically mirrored to Earth.** The *shape* of the arc — the sequence
  from language to agriculture to cities to industry to information, the way
  plagues follow population density and trade, the way a species changes its
  atmosphere by burning what it finds — is modeled on Earth's record, because
  Earth is the only record there is. The narrator is honest about this rather
  than pretending otherwise: this is the one story we know, told about a
  different world, bent by that world's real constraints.

The rule for the script: **never state an Earth-mirrored beat as a derived
fact.** If a number comes from the sim, speak it plainly. If a pattern comes
from Earth, frame it as pattern ("everywhere intelligence has arisen that we
know of, this has followed") — the mirror is the honesty, not a cheat.

So the seed still matters and still changes the story: a heavy-gravity world
builds squat humanoids and low architecture; a metal-poor world's technology
plateaus differently; a hot world's plagues and migrations run on a different
map. Same Earth-shaped arc, different world running it.

## Act structure (five sections)

### Act 1 — The threshold (emergence of mind)

Picks up Episode 2's most social lineage and follows it across the line into
intelligence. Grounded, not mystical: bigger brains are metabolically
expensive, so the narrator ties the leap to the planet's actual conditions —
food energy available, the manipulator limbs the body plan already has, the
social group size Episode 2 established. The humanoid body is **derived**, on
camera, the same way Episode 2 derives every creature: this world's gravity
sets its stance and height, its temperature sets its build, its light sets
its eyes. The moment: the first tool, the first fire, the first sign that
something here is *modeling* its world, not just living in it.

### Act 2 — The word (language and society)

The humanoid feature the user named: communication and socializing. From
signal to symbol to language — the invention that lets one mind's model pass
to another and outlive the body that made it. Kinship, cooperation, the first
settlements, the first division of labor, the first stories told around the
first fires. This is the act where the species becomes a *culture*, and where
the episode establishes the social units (band → tribe → settlement) that the
later eras and the plagues will act on.

### Act 3 — The eras (fast-forward through civilization)

Same device as Episode 2's deep-time jumps — hard cuts across time, narrated
cards — but now the transforming thing is the **civilization**, and the era
dial is technological, gated by the planet's real materials:

| Era | What changes | Gated by (sim) |
| --- | --- | --- |
| Stone & fire | Tools, hearth, first shelters | terrain, wood/stone availability |
| Cultivation | Agriculture, permanent settlement, surplus, first cities | temperate zones, water, arable biome |
| Metal | Whatever metallurgy the element budget allows — the "bronze/iron age" is not guaranteed | `cosmos.budget` metals (copper, tin, iron…) |
| Industry | Machines, mass production, burning stored energy | fuel-bearing chemistry; drives Act 5's atmosphere change |
| Information | Networks, one species talking to itself at planetary scale | — (the present) |

The point the narrator carries across the jumps: each era is built from the
last, faster each time, and the acceleration itself is the story.

### Act 4 — The invisible war (viruses, plague, health)

The dynamic the user specifically called for. Disease is not decoration — it
is a force with its own logic, and Episode 3 treats it as one:

- **Grounded in biology and density.** Plagues follow the things the sim and
  the mirror both give us: population density (from Act 3's cities), trade and
  travel routes (contact between settlements), and the humanoid's own biology.
  Crowding breeds contagion; connection spreads it.
- **The pattern, mirrored honestly.** The great mortality events — a plague
  that ravages a crowded era, the exchange of diseases when isolated
  populations first meet, the race between a pathogen and the medicine the
  civilization can muster — are modeled on Earth's record and framed as
  pattern, not prophecy.
- **Both directions.** Disease shapes the species (it culls, it selects, it
  redraws populations) and the species learns to fight back (sanitation,
  medicine, immunization) — the arms race that is still running at the
  episode's end.

### Act 5 — The mark (the present, and the changed planet)

Ends **close to our own current year**. The species now reshapes the planet
faster than the planet reshapes it — and the narrator reads that change
against the world Episode 2 handed us: the atmosphere it inherited vs. the
atmosphere it now has, the biomes that were vs. the biomes that are, the
species that shared the world and no longer do. Cause and effect, mirrored to
Earth because Earth is the only mirror: burn the stored carbon, warm the air;
crowd the world, stress the web. The episode does not moralize — it does what
the whole series does, and simply follows the rules forward to where they
lead. It closes on the open question, the species standing at a threshold it
cannot yet see past — the natural hook for whatever comes next.

## What must be built

Episode 3 stands on Episode 2's foundations (multi-biome worlds, the era dial,
the surface stages, the shot library). New work specific to Episode 3:

### 1. The humanoid

A humanoid body plan derived from the planet like any other creature, but
richer than the `fauna` rigs: upright stance, manipulator limbs, expressive
head. Extends `genome.js`/`rig.js` rather than replacing them — gravity,
temperature, light, and terrain drive height, build, and features, so the
humanoid is visibly *of this world*.

### 2. Civilization as a renderable, era-dialed thing

Settlements that grow across eras (shelters → village → city → sprawl),
built from this world's materials and palette. The scale jumps from
"creatures on a patch" to "a civilization on a landscape," so this likely
needs a new stage register (a settlement/landscape view) alongside the
surface patch.

### 3. The technology/materials gate

A small model that reads `cosmos.budget` and decides which technological path
this world's chemistry actually permits — so the eras in Act 3 are
seed-honest, not fixed. This is the mechanism that keeps a metal-poor world's
story genuinely different.

### 4. A history/epidemiology model (Earth-mirrored, sim-parameterized)

The engine behind Acts 3–5: population growth, settlement, plague events, and
planetary change, shaped like Earth's record but parameterized by the seed's
real numbers (temperature, density, materials, biomes). Deterministic per
seed. This is the most novel and most careful piece — its whole job is to be
honest about being a mirror.

### 5. `buildEpisode3Script(cosmos, world, history)`

Episode 1's contract, extended again: seeded prose variants, sim facts spoken
plainly, Earth-mirrored patterns framed as patterns. The script must make the
honesty framing audible without lecturing.

## Decisions on record

- Episode 3 covers intelligent/humanoid life: communication, socializing, the
  humanoid feature of life (user).
- Same fast-forward-through-eras device as Episode 2, applied to the humanoid
  civilization (user).
- Ends close to the current real-world year (user).
- Cause and effect between the species and its planet is **mirrored to Earth**,
  because Earth is the only dataset we have — while staying scientifically
  grounded in the periodic table and the sim's data-driven rules for what the
  planet permits (user).
- Must factor in viruses, plagues, and health as a real dynamic, not
  decoration (user).
- All of it in one episode, structured as five acts (user).

## Open items

- Final episode title.
- How hard to lean on the Earth mirror vs. letting the seed diverge — where is
  the line between "recognizable" and "not this world's own story"? (Needs a
  taste call once we see it running.)
- Episode 4+ hook: Act 5 ends on an unresolved threshold; what it points to is
  open.
- Runtime: five acts with a plague act and an era-jump act runs long; same
  trim levers as Episode 2 (fewer jumps, tighter chain).
