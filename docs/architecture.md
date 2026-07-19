# Architecture

How *The Worlds* turns one seed into a narrated, generated documentary. This is
the technical companion to the top-level [README](../README.md); the creative
side (arcs, scripts) is in [`episodes/`](episodes/).

There are two halves: a **generative pipeline** that builds a universe as a
chain of causes, and a **playback engine** that films and narrates it.

---

## Part 1 — The generative pipeline

Everything derives from the seed. The rule throughout: never deal something at
random if it can be derived from something upstream.

### Chemistry — `movie/src/chemistry/`

- `nucleosynthesis.js` — from the seed, how many generations of stars enriched
  this universe's gas cloud, and therefore which elements exist and in what
  abundances (the "element budget").
- `planetChemistry.js` — `condensePlanet()` decides a planet's temperature,
  composition, water state and air from its star and orbit; `biomeFromChemistry()`
  turns that into a biome key and physical scale.
- `elements.js` — the periodic-table data (including the CHNOPS biogenic set the
  origin-of-life act reasons from).

### Cosmos — `movie/src/cosmos/Cosmos.js`

`new Cosmos(seed)` assembles a whole universe:

1. A **star**: mass rolled from the seed, brightness by the real mass–luminosity
   relation (`L ∝ M^3.5`), which sets the habitable zone.
2. The **element budget** from nucleosynthesis.
3. **Five orbits** at widening spacings (a nod to Titius–Bode), scaled by the
   star's brightness.
4. Each planet **condensed** into a real `World` — its biome, size and
   temperature are what the chemistry says they must be, not rolled.
5. The **habitability filter**: at most two worlds host life (the best-watered
   ones); often none, which is a legitimate, honest outcome.

`cosmos.describe()` returns the whole causal chain as plain data — the contract
the narration reads from. `cosmos.livingWorlds` is the survivors.

### World — `movie/src/world/`

A `World` is the **single source of truth for one planet** — the same object the
orbital shader draws and the surface mesher samples, which is why "the planet in
the window" and "the planet underfoot" match.

- `World.js` — identity, terrain field, biome, atmosphere, surface palette, and
  the flora/fauna budget. `gravity = radiusMetres / 3e6` is the one number that
  makes a big planet's animals stocky and a small planet's leggy. Exposes
  `heightAt`, `heightMetresAt`, `normalAt`, `findLandingSite`.
- `biomes.js` — the biome templates: terrain params, colour palettes,
  atmosphere, and per-biome flora/fauna *recipes* (a recipe names a species and
  its role; the body is derived later).
- `terrain.js` — the shared height field (macro + high-frequency detail),
  sampled identically on CPU and GPU.
- `Planet.js`, `Atmosphere.js`, `System.js`, `glsl/` — the orbital-view planet
  shader and its support.

> **The one deliberate lie:** the orbital planet exaggerates terrain height
> ~150× so a 3000 km world isn't a smooth ball on screen; the surface uses real
> metres. `radiusMetres` and `heightScaleMetres` are intentionally unrelated.
> See the comment in `World.js`.

### Surface, Flora, Fauna — `movie/src/surface/`, `movie/src/fauna/`

- `Surface.js` — a standable ground patch, meshed in a **local tangent frame**
  centred on the landing site (planet-space coordinates would quantise in
  float32). Keeps the planet's curvature, so the horizon drops on its own.
- `Flora.js` — scatters ez-tree vegetation across the patch by the biome's
  weighted species list, respecting slope and altitude bands.
- `fauna/genome.js` — the heart of the "true by construction" idea for life:
  a body plan derived from the planet. Gravity → leg cross-section and gait
  frequency; air density → whether flight works and the wing area needed;
  temperature → Allen's rule (compact cold bodies, stretched hot ones, shaggy
  coats below freezing); terrain → leg length and stance; ground/sky colour →
  coat. The same recipe grows a different animal on a different world.
- `fauna/rig.js` — turns a genome into drawn geometry (instanced parts).
- `fauna/Fauna.js` — behaviour: flocks (boids) and ground bands (a herd/swarm/
  solitary state machine), all deterministic per seed.

Everything here is seeded and updated on the fixed timestep, so frame *N* of a
shot is always the same frame.

---

## Part 2 — The playback engine

The generated world is filmed by a tiny, framework-free engine. It knows
nothing about any specific episode — an episode is just data fed to it.

### Stage — `movie/src/core/Stage.js`

Owns the renderer (Three.js WebGL, ACES tonemapping, an UnrealBloom composer),
a **fixed-timestep clock**, and a registry of scenes. A scene is anything with
`{ scene, camera, update(dt, elapsed) }` and optionally `enter/exit/dispose/
setPhase/bloom`. `activate(name)` cuts to a scene and rebuilds the post
pipeline. The loop advances simulation on a fixed step and renders whatever the
accumulator lands on — costing a little smoothness, buying determinism (same
seed + frame → same pixels, at any frame rate). A watchdog keeps the loop
breathing in a backgrounded tab so tooling can capture frames.

### Timeline — `movie/src/doc/Timeline.js`

Plays a **script**: an ordered list of cues. For each cue it calls the
**director** (stage the visuals), then has the `Narrator` speak the line,
waiting for the voice to finish or the cue's `hold`, whichever is longer, then
advances. It knows nothing about Three.js — the director is the seam.

A cue:

```js
{
  text:   'what the narrator says (and the caption shows)',
  scene:  'bigbang' | 'system' | 'orbit' | 'surface' | 'soup',
  direct: { phase, era, site, shot, focus, event, verdict },  // for the director
  hold:   6,                                                   // min seconds to dwell
}
```

### Narrator — `movie/src/doc/Narrator.js`

Voice and captions. Each line is fetched as MP3 from `/api/tts` in a Microsoft
neural voice (Andrew for Episode 1, Sonia for Episode 2 — the `voice` option);
if the endpoint is unavailable it falls back to browser speech, and the caption
always shows. A line is over when its audio actually ends; `hold` is a floor.

### Scenes

| Scene | File | What it stages |
| --- | --- | --- |
| `BigBangScene` | `doc/BigBangScene.js` | The cosmology act as a 17-phase shot list — void → Big Bang → nucleosynthesis → first stars → supernova → enrichment. A wide seeded particle cloud plus a CPU-choreographed macro cast, cut per beat. |
| `SystemScene` | `doc/SystemScene.js` | A star igniting and five worlds condensing; the habitability filter applied planet by planet. |
| `OrbitScene` | `scenes/OrbitScene.js` | One world hanging in space (the plate for descents). |
| `SurfaceScene` | `scenes/SurfaceScene.js` | Standing on the world: terrain, trees, wildlife, sky dome, sun, and a real reflective **ocean** (the three.js `Water`). Supports a scripted cinematic camera. |
| `SoupScene` | `doc/SoupScene.js` | Episode 2's origin-of-life act — eight abstract, macro phases (pantry → replicator → membrane → cell → split → mats), tinted to the world's own palette. |

### Episodes as data

- **The site** — `doc/main.js` + `index.html`: splash (seed as identity),
  trailer (`doc/teaser.js`), and Episode 1. Episode 1's script is
  `doc/narration.js` (`buildEpisode1Script(cosmos)`).
- **Episode 2** — `doc/episode2/`: `narration.js` builds the 38-cue script and
  the no-life gate (each principal creature derived at its own climate through a
  lightweight *zone view*, so the "cold body / hot body" lines are true), and
  `main.js` is the player + director that maps cues onto the orbit / soup /
  surface / system scenes.

Both episodes run on the same `Stage` + `Timeline` + `Narrator`. Adding an
episode is: write a script builder, choose a scene set, write a director.

---

## Determinism, end to end

- Seeded RNG (`core/rng.js`) everywhere a choice is made.
- Fixed-timestep simulation (`Stage`), so physics and behaviour are frame-exact.
- Seeded prose selection in the scripts, so a seed pins the narration
  word-for-word.

Same seed ⇒ same universe, same story, same words, same frames — whether it runs
at 144 fps in a browser or one frame at a time to disk.

## Where to go next

- Episode designs and scripts: [`episodes/`](episodes/).
- The build roadmap for Episode 2's remaining fidelity (era dial, multi-biome
  zones, staged interactions): [`episodes/episode-2-engine.md`](episodes/episode-2-engine.md).
