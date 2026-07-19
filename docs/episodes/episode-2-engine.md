# Episode 2 — engine architecture

**Status: design.** This is how Episode 2 *plays* — cue by cue, narrated,
generated live from a seed, exactly like Episode 1. The script is the content;
this is the machine that renders it.

## First, the thing worth being clear about: we are NOT writing a new engine

Episode 1 already is an engine, and Episode 2 runs on it. The reusable core —
everything that makes a documentary *play* — is untouched:

| Reused as-is (the playback engine) | File | What it does |
|---|---|---|
| `Stage` | `core/Stage.js` | Renderer, bloom composer, fixed-timestep clock, scene registry, `activate()` cuts. Deterministic per frame. |
| `Timeline` | `doc/Timeline.js` | Speaks a cue, calls the director, waits for voice-or-`hold`, advances. Knows nothing about three.js. |
| `Narrator` | `doc/Narrator.js` | The Andrew neural voice + caption mirror, via `/api/tts`. |
| Cue format + director seam | — | `{ text, scene, direct, hold }`; a director callback stages visuals. |
| Site glue pattern | `doc/main.js` | Splash → build script → activate scenes → `timeline.play()`. |
| `SurfaceScene` + `Surface`/`Flora`/`Fauna` | `scenes/`, `surface/`, `fauna/` | A standing-on-the-planet stage ALREADY EXISTS. The trailer already flies a scripted descent onto it. |
| `OrbitScene` | `scenes/OrbitScene.js` | A world hanging in space — the descent's starting plate. |

So the honest scope of "the engine for Episode 2" is: **one new scene (the
soup), a few new capabilities bolted onto the surface scene that already
exists, and an episode-player refactor so the site can play more than one
episode.** That is the whole build. Nothing about cosmology, playback, voice,
terrain, trees, or wildlife gets rewritten.

## The one real refactor: make an episode a value, not hardcoded

Today `doc/main.js` hardcodes Episode 1: it builds `buildEpisode1Script`,
registers `bigbang`+`system`, and wires one director. To play two episodes we
extract that into a small player and make each episode a config object.

```js
// doc/Episode.js  (NEW — ~120 lines, mostly moved out of main.js)
// An episode is data: how to build its script, which scenes it needs, and a
// director that maps cue.direct onto those scenes. The player is generic.
class EpisodePlayer {
  constructor(stage, narrator, episode /* {buildScript, scenes, director} */) {}
  async build(seed) { /* make cosmos/world, script, register scenes */ }
  play() { /* timeline.play() */ }
  dispose() {}
}
```

- **Episode 1** becomes `episodes/episode1.js`: `{ buildScript:
  buildEpisode1Script, scenes: {bigbang, system}, director: ep1Director }`.
  Behavior identical — this is a lift-and-shift, verified against the current
  build.
- **Episode 2** becomes `episodes/episode2.js`: its own script builder, its
  own scene set, its own director. Same player runs both.

The splash/site (`main.js`) picks which episode to play (URL `?ep=2`, or the
end-of-Episode-1 handoff, or the splash). Dead-seed gate lives here too.

## The scenes Episode 2 stages

Episode 2's director maps `cue.scene` to three stages:

### `return` — the descent (mostly reuse, little new)

Orbit → atmosphere → the surface, one continuous move. This already exists in
spirit: `teaser.js` flies `OrbitScene` → `SurfaceScene` with a scripted
`descend` camera driver, including the hard-won gotchas (find a tree clearing,
approach opposite the flock, hold canopy clearance). Episode 2's `return` is
that path, promoted from teaser-private into a reusable scripted transition.
**New work: small** — generalize the descent driver; reuse everything under it.

### `soup` — the origin of life (the one genuinely new renderer)

`doc/SoupScene.js` (NEW). Abstract/macro, in the visual register of
`BigBangScene` (glowing, non-literal, phase-driven). It exposes the same
contract every scene does — `{ scene, camera, update, setPhase, bloom }` — so
`Stage` and `Timeline` drive it with zero special-casing. Its `setPhase`
handles the Act 2 beats: `pantry → monomers → replicator → selection →
membrane → cell → split → mats`. This is a particle/shader piece, the way
`BigBangScene` is; it's the biggest single new asset but it's self-contained
and owes nothing to the rest.

### `surface` — the living world (extend the scene that exists)

`SurfaceScene` already meshes terrain, grows trees, hatches wildlife, and
drives a cinematic camera. Episode 2 adds four capabilities to it:

1. **The era dial** — `Surface`/`Flora`/`Fauna` take an `era` (0..5). Era
   gates mat-staining on the shallows, flora density/species, and which fauna
   roles exist at what counts (see the fast-forward table in
   `episode-2.md`). Deterministic per seed. **This is additive** — era 5 is
   today's fully-populated surface; lower eras subtract.
2. **Multi-biome zones** — the long pole. Today one planet = one biome
   everywhere. Zones make climate vary across the planet (latitude + altitude
   + coast), so `cue.direct.site` can move the patch to `coast`, `highland`,
   `interior`, etc., each with its own roster. Touches `World`, `terrain.js`,
   `biomes.js`, and the orbital planet shader (so the zoned planet seen from
   orbit is the one we land in). Detailed below.
3. **Staged interactions** — `Fauna` gains fireable `event`s (startle-flock,
   spook-herd, predator-commit, swarm-rise, …) implemented as perturbations of
   the existing boids/state-machine (the choreographer agent specs the exact
   mechanics). Each event's payoff triggers the next — the butterfly chain.
4. **The surface shot library** — the named cinematic shots (LOW_TRACK,
   ORBIT_SUBJECT, RIDGE_CROSS, HANDOFF_WHIP, …) as reusable camera drivers,
   generalizing what `teaser.js` does ad hoc. `cue.direct.shot` selects one.

## The director for Episode 2

Same seam as Episode 1 — a callback the `Timeline` hands each cue. It reads
the extended `direct` vocabulary and drives whichever stage is up:

```js
function ep2Director(cue) {
  if (cue.scene) await ensureScene(cue.scene);   // return | soup | surface
  const d = cue.direct; if (!d) return;
  const s = stage.active;
  if (d.phase) s.setPhase?.(d.phase);            // soup / descent phases
  if (d.era   != null) s.setEra?.(d.era);        // Act 3 fast-forwards
  if (d.site)  await s.goToZone?.(d.site);        // Act 4 biome moves
  if (d.shot)  s.playShot?.(d.shot, d.focus);     // named camera shot
  if (d.event) s.fauna?.fire?.(d.event);          // staged interaction
}
```

Every one of `setPhase/setEra/goToZone/playShot/fire` is a method on the
scene, so the director stays a thin dispatcher — exactly like Episode 1's.

## The data contract (what the script reads)

`buildEpisode2Script(cosmos, world)` consumes a `describe()`-shaped object,
the direct descendant of `cosmos.describe()`. Every `${token}` in the dialogue
binds to a field here. The data-contract agent enumerates the full surface;
the new fields it must add to today's data are **zones** (per-zone climate +
roster) and **per-principal-species genome facts** (leg length, wing span,
etc., already computed in `genome.js` — just surfaced for narration). The
pathogen/soup-chemistry facts are derived from the element budget for the
soup act and Episode 3.

## Multi-biome zones — the long pole, broken down

This is the only genuinely large build. Staged so it lands incrementally:

1. **Zone model** — a function of latitude (equator→pole), altitude, and
   distance-to-coast that returns a biome key + local climate, biased by the
   planet's real mean temperature (a cold world skews cold across all zones).
2. **Terrain & palette become zone-aware** — `terrain.js`/`Surface` blend
   ground colors and biome params by zone, so a patch built at a given
   `site` shows that zone.
3. **Rosters become per-zone** — `biomes.js` rosters attach to zones; `Fauna`
   and `Flora` populate a patch from its zone's roster.
4. **Orbital continuity** — the planet shader in `Planet.js` shows the zones
   from space, so Episode 1's orbital view and Episode 2's landing agree.

Everything else in Episode 2 can be built and made to PLAY against a
single-zone stand-in first, then upgraded when zones land — so the episode is
playable early and gets richer, rather than blocked on the long pole.

## Build order (each milestone PLAYS)

The point of this ordering: there is a playable Episode 2 at the end of **M1**,
and every milestone after just makes it fuller. We never sit on an unplayable
pile of code.

- **M0 — Episode player refactor.** Extract `EpisodePlayer`; port Episode 1
  onto it unchanged (regression-check it still plays identically); add the
  `?ep=` / handoff routing and the dead-seed gate. *Plays: Episode 1, via the
  new player.*
- **M1 — Episode 2 skeleton, playable end to end.** Wire
  `buildEpisode2Script` + `ep2Director`; use `return` (reuse descent) +
  existing `SurfaceScene` (single zone, era 5) + a placeholder soup. Narration
  and captions run start to finish for a living seed; gate+reroll for dead
  seeds. *Plays: the whole episode, rough.*
- **M2 — The soup.** Build `SoupScene` with its phases. *Plays: Act 2 for
  real.*
- **M3 — The era dial.** `Surface`/`Flora`/`Fauna` era staging. *Plays: Act 3
  fast-forwards for real.*
- **M4 — Staged interactions + shot library.** `Fauna.fire(event)` + the
  named cinematic shots + handoffs. *Plays: Act 4's chain for real.*
- **M5 — Multi-biome zones.** The long pole; the tour crosses real biome
  boundaries; orbital view matches. *Plays: the full-fidelity episode.*

## Definition of done

From any seed with a living world, opening Episode 2 plays the full narrated
sequence — return, soup, eras, the unbroken cross-biome chain, close — voice
and captions synced, generated live, cut cue-by-cue by the `Timeline`, obeying
the no-shot-more-than-twice rule. From a seed with no living world, it plays
the honest gate and offers a reroll. Same engine that plays Episode 1, with
new scenes plugged into it.
