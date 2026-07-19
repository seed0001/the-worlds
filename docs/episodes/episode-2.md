# Episode 2 — The Living World

**Status: design.** Approved in conversation 2026-07-19; nothing built yet.
Working title — final title is the user's call.

## Logline

On the world that passed Episode 1's filter, chemistry crosses its strangest
threshold — it comes alive — and the episode follows life from the first
self-copying molecule to a planet-wide web of ecosystems, ending with one
unbroken chain of cause and effect that hands the camera from creature to
creature across every biome on the world.

## The gate: Episode 2 requires a living world

Episode 2 only exists for universes with at least one living world.

- **Living universe:** Episode 2 opens on `cosmos.livingWorlds[0]` (if two
  worlds live, the better-watered one leads; the second is Episode-3+
  material).
- **Dead universe:** the viewer gets an honest, dignified explanation — not
  an error. The narrator walks the system one planet at a time and reads each
  world's actual `chem.ruledOutBecause`: "your star was too dim; the water
  never thawed; there was no air to hold an ocean." Then the offer: the same
  rules, a new cloud — **begin another universe** (reroll). The explanation is
  already computed by Episode 1's chemistry; this beat spends it.

## Act structure

### Act 1 — Return (descent)

Continuity is the point: the world Episode 1 showed from orbit is the world
we land on. Orbit → atmosphere → the landing site, one continuous descent
(the trailer's descent shot already proves the technique). The narrator
re-introduces the world by its Episode 1 facts — its temperature, its air,
its water — because those numbers are about to become biology.

### Act 2 — The soup

A new abstract stage in the `BigBangScene` visual register (macro, glowing,
non-literal — chemistry as spectacle, not a biology-textbook diagram).
Beats:

1. **The shallows.** Warm water over mineral-rich rock; the world's actual
   element budget (from `cosmos.budget`) is the pantry, named on screen.
2. **Monomers.** Small molecules forming, breaking, reforming — chemistry
   that merely happens.
3. **The first replicator.** One molecule that copies itself. The hinge of
   the whole series: chemistry that *persists*.
4. **Error and selection.** Copies are imperfect; imperfections compete; the
   better copier wins. Evolution stated as arithmetic, not ideology.
5. **The membrane.** A bubble of oil separates inside from outside — the
   first self.
6. **The first cell.** Replicator inside membrane: metabolism, feeding on
   the chemistry around it.
7. **Mats.** Cells in their billions, staining the shallows — the first
   visible life, the bridge to Act 3.

### Act 3 — Fast-forwards (the same valley through deep time)

Locked on **one landing site**. Time jumps forward in hard cuts and the same
terrain transforms — the coastline underfoot never changes, which is what
sells the eras as one place. Each jump is a narrated card ("two hundred
million years later") plus a visible change of state.

The **era dial**: `Surface`/`Flora`/`Fauna` gain an era parameter that
controls what exists at each stage.

| Era | The valley shows |
| --- | --- |
| 0 · Sterile | Bare rock, empty sea, raw sky |
| 1 · Stained | Microbial mats coloring the shallows and wet rock |
| 2 · Greening | Ground cover creeps from the water's edge; first color shift |
| 3 · Rooted | First real flora — sparse, small, then forest |
| 4 · First movers | Small fauna only (swarm/skimmer scale) |
| 5 · The full roster | Every species this world rolled, at full counts |

Narration across the jumps carries one idea: nothing is added from outside —
each era is built from the last by the same rules, run longer.

### Act 4 — The chain (the ecosystem tour)

The centerpiece. One **unbroken chain of staged interactions**, each
interaction introducing the next creature, some handoffs crossing an
ecosystem boundary — so by the time the chain comes to rest, the viewer has
visited **every biome on the world** and met every creature through the
consequence of another. The camera never cuts arbitrarily; it is handed off.

Example grammar (actual chain is per-seed, from this world's real rosters):

> Flock startles off the coastal shallows → the wave of wings spooks the
> grazer herd → the stampede is what the stalker was waiting for → the kill
> draws the swarm → the swarm's column climbs the ridge on the wind → over
> the ridge is another climate, another ecosystem, and the chain continues
> in it with different bodies built by the same rules.

Along the chain, the narrator does what no other nature documentary can:
**derive each body on camera.** Every causal arrow is literally the code
that built the creature (`fauna/genome.js`):

| The planet's number | What it decides on screen |
| --- | --- |
| Gravity | Leg cross-section (mass ∝ size³, bone ∝ r²), gait frequency, how much anything dares bounce |
| Air density | Whether powered flight exists at all; wing area per unit weight — thin air, huge wings |
| Temperature | Allen's rule — cold compresses bodies and shortens extremities, heat stretches them into radiators; coats go shaggy below freezing |
| Terrain roughness | Leg length and stance |
| Ground palette / sky color | Coat camouflage and accent color |

Narrated in the Episode 1 voice: "This world pulls at 1.4 gravities. Look at
the legs — the planet left the animal no choice."

**Ending the chain:** it comes to rest at dusk on a quiet interaction (a
grazer herd settling, the flock returning to roost) — the web at equilibrium.
Close: everything on this world is one system; no creature's story can be
told alone. Tease Episode 3 (outline TBD by the user).

## What must be built (dependency order)

### 1. Multi-biome worlds — the long pole; everything else stands on it

Today one planet = one biome, uniform everywhere. Episode 2's tour requires
**ecosystems inside the living planet**:

- Zone model: climate zones from latitude + altitude + coast/interior
  (equator to poles on one world: e.g. desert belt, temperate band, tundra
  caps — driven by the planet's real temperature so a cold world skews
  cold-biased, a hot one hot-biased).
- `biomes.js` rosters become per-zone: each zone carries its own flora and
  fauna recipes; `genome.js` already makes the same recipe grow different
  bodies in different conditions — now it also varies *within* one world.
- Terrain, ground palette, and the orbital-view planet shader must all show
  the zones (the planet seen from orbit in Episode 1 should visibly be the
  zoned planet we then land on — continuity is the brand).
- Surface patches must be buildable at any chosen zone, not just the single
  landing site.

### 2. The era dial

`Surface`/`Flora`/`Fauna` accept an era stage (table above): flora density and
species mix, fauna rosters and counts, mat-staining on shallows, per era —
deterministic per seed as always.

### 3. The soup stage

New scene (working name `SoupScene`), abstract in the BigBangScene register,
with `setPhase` beats matching Act 2's list, consuming the world's real
element budget and water/temperature facts.

### 4. Surface shot library + chain choreography

- Director verbs for the surface, in the cue `direct` format:
  `site` (move the patch to a zone), `era`, `follow` (track a species),
  `handoff` (transfer the camera from creature A to the B it affects),
  plus framing primitives (orbit, low-track, rise-reveal).
- **Staged interactions**: behaviors gain triggerable events — startle a
  flock, spook a herd into a stampede, a stalker committing to a chase, a
  swarm converging. Deterministic per seed, cued by the timeline, and
  chainable (each event's payoff is the next event's trigger).
- Predation on camera: implied kill, not gore — the stalker commits, the
  chase resolves behind terrain/dust, the swarm arriving tells the outcome.

### 5. `buildEpisode2Script(cosmos, world)`

Episode 1's contract, extended: seeded prose variants (≥2–3 per beat), every
fact from the sim — now including genome facts (leg length, wing span, flap
rate, gait frequency) and zone facts. Also builds the dead-universe gate
script from `ruledOutBecause` when there is no living world.

### 6. Entry + gate UX

Splash/end-of-Episode-1 gains the Episode 2 entry; the gate plays the
explanation-and-reroll beat for dead universes. (Broader splash UX ideas are
a separate conversation, already had — not in this episode's scope.)

## Decisions on record

- Arc includes the primordial soup and microorganisms — yes (user).
- Time fast-forwards through eras — yes; locked to one site (user + confirmed).
- Final act explores **each ecosystem inside the living planet** — multi-biome
  worlds are required, not optional (user).
- Dead-universe seeds reroll until they land a living world, with an honest
  explanation of why theirs wasn't (user).
- Staged interactions — yes, chained butterfly-effect style, each interaction
  leading to the next creature (user).

## Open items

- Final episode title.
- Episode 3 outline (user is outlining next; its tease is this episode's
  last line).
- Runtime target (Episode 1 runs ~10–12 min spoken; this design naturally
  lands longer — 15–20 min. Trim lever: fewer era jumps, shorter chain).
- Whether the second living world (when a seed has two) gets a nod in this
  episode or is held entirely for later.
