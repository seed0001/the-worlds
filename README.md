# The Worlds

**A shelf of *scene engines*.** A scene engine is a small program that computes
a film in real time and plays it live in the browser — narrated, on a fixed
clock — instead of streaming a saved video. Some engines *generate* their
subject from a seed; others *recreate* a real one from history. Either way,
nothing on screen is pre-rendered: open a page and it renders itself.

The front door — the hub at `/` — lists every engine on the shelf. Three are
playable today:

| Engine | What it is | Kind | Voice |
| --- | --- | --- | --- |
| **The Worlds** | A whole universe — star, chemistry, planets, and the life that does or doesn't take hold — computed from one seed and narrated as a documentary. | generative (seeded) | Andrew / Sonia |
| **Apollo** | The Moon landing, recreated end to end: the Saturn V on the pad, the ride to orbit, the coast, the landing, the moonwalk, and the fall home to a splashdown. | recreation (history) | Andrew |
| **Chernobyl** | The destruction of Reactor No. 4 in the first minutes of 26 April 1986, told in cross-section of the core as a systems-and-physics failure. | recreation (history) | Andrew |

> **The one rule that makes them what they are: nothing is canned.** Every fact
> a narrator speaks is read off the running simulation — this star's mass, this
> reactor's void coefficient, this creature's leg length — so the narration is
> *true by construction*. A generative engine derives its facts from its seed; a
> recreation reads them from a grounded table of real figures. If the simulation
> can't produce a fact, the narrator doesn't say it.

The name is historical: *The Worlds* was the first engine, and the repo still
carries its name, but the project has grown into the shelf. The hub's own title
is **Scene Engines**.

## The engines

### The Worlds — a universe from a seed

Enter a seed and a whole cosmos is computed in front of you, then narrated as a
documentary. Change the seed and everything changes: a different star, different
chemistry, different worlds, a different film. The prose is written as seeded
variants, so two universes never tell their story in the same words.

| Episode | Title | Status | Voice |
| --- | --- | --- | --- |
| **1** | From Nothing to Worlds | shipped | Andrew (male, US) |
| **2** | The Living World | playable | Sonia (female, British) |
| **3** | The Ones Who Ask | designed | — |

- **Episode 1** runs the universe forward as a chain of causes: from the instant
  before space and time, through the Big Bang and the forging of the elements,
  to a solar system condensing and the one question that decides everything
  after — can any of these five worlds hold life?
- **Episode 2** lands on the world that passed the filter and follows life from
  the first self-copying molecule (the "soup") through deep-time eras to a living
  planet and its wildlife. Reachable from the splash and from the end of Episode
  1; both carry the seed, so it's the same universe.
- **Episode 3** (design only) is the humanoid/civilization arc. See
  [`docs/episodes/episode-3.md`](docs/episodes/episode-3.md).

Its generative chain, in one breath:

```
seed
 └─ nucleosynthesis   which elements exist, and in what amounts   (chemistry/)
     └─ a star        mass → brightness → the habitable zone       (cosmos/)
         └─ 5 orbits  planets at real spacings
             └─ condensation   each planet's temperature, water, air
                 └─ the filter  which one or two worlds can host life
                     └─ a World  terrain, biome, atmosphere, life budget (world/)
                         └─ Surface / Flora / Fauna  a place you can stand on
```

Nothing downstream is dealt at random if it could be derived from something
upstream — which is the only reason a documentary can narrate it. A creature's
body, for instance, is a real biomechanical argument run from the planet's
numbers (`fauna/genome.js`): gravity sets leg thickness and gait, air density
decides whether flight is possible and how big wings must be, temperature
applies Allen's rule, the ground palette becomes its camouflage.

Full episode documents — arcs, scripts, camera, data contracts — live in
[`docs/episodes/`](docs/episodes/), and the technical tour of this engine is in
[`docs/architecture.md`](docs/architecture.md).

### Apollo — the Moon landing, recreated

Not generated from a seed but recreated from history. The Saturn V on the pad
before dawn, the countdown and the ride to orbit; then the coast to the Moon,
the landing, the first steps and the rover, and the long fall home to a
splashdown. Every figure the narrator states — thrust, burn times, orbital
altitudes — is true to the hardware that flew, driven from a grounded facts
table (`src/mission/mission.js`).

### Chernobyl — the reactor that ran away

The destruction of Reactor No. 4 in the first minutes of 26 April 1986,
recreated link by physical link: a routine safety test, a reactor starved by
xenon and then over-driven, the positive void coefficient turning the core into
a trap, and the AZ-5 shutdown button that — through the graphite tips of the
control rods — became the trigger. Told cutaway-first, in cross-section of the
core itself, as a systems failure and not a spectacle. No operator is named;
every number is read from a facts table of the record (`src/chernobyl/reactor.js`).

## How an engine works

Every engine, generative or recreation, runs on the same small spine:

- **`core/Stage.js`** — owns the renderer, the post-processing composer, and a
  loop that advances simulation on a **fixed timestep** and renders whatever the
  clock lands on. Scenes register with it; it activates one at a time. The fixed
  step is what makes a film deterministic: the same seed and frame number always
  produce the same image.
- **`doc/Timeline.js`** — the cue player. A script is an ordered list of cues,
  each one spoken beat: `{ text, scene, direct, hold }`.
- **`doc/Narrator.js`** — speaks each cue in a neural voice and mirrors it as a
  caption, so the muted experience is complete.

An engine's `main.js` wires those three together, registers its scenes, and
gives the Timeline a **director**: for each cue it activates `cue.scene` and
calls that scene's `beat(cue.direct)` to move its state machine (ignite the
rocket, pull the rods, press AZ-5) and pick the camera. A scene is anything that
exposes `{ scene, camera, update(dt, elapsed) }` — that small contract is the
whole seam.

The two families differ only in where the facts come from. A **generative**
engine builds its subject from a seed with seeded randomness throughout, so the
same seed reproduces the same universe *and* the same words. A **recreation**
replaces the seed with a fixed table of real figures; the script is authored,
but every number in it is read from that table, so it stays true to history.

### Adding an engine

The architecture is built to grow by addition, not surgery:

1. Drop a folder under `movie/src/<engine>/` — a facts source, a `narration.js`
   (the cue script), `scenes/` and `models/`, and a `main.js` that wires
   `Stage`/`Narrator`/`Timeline` and routes cues to scenes.
2. Add a page, `movie/<engine>.html`, that loads that `main.js`.
3. Register it twice: one input line in `vite.config.js`, and one object in
   `src/hub/engines.js` — which is all the hub needs to render a new card.

Nothing else changes; the existing engines and the shared spine are left
untouched. Apollo and Chernobyl were each added exactly this way.

## Repository layout

This repo is a small monorepo of three projects:

| Path | What it is |
| --- | --- |
| **`movie/`** | The site and every engine — the whole shelf. Vite + Three.js front end, Express server for production. Everything above lives here. |
| **`ez-tree/`** | A vendored copy of the [ez-tree](https://github.com/dgreenheck/ez-tree) procedural tree library, consumed by `movie/` as a `file:` dependency (with a prebuilt bundle committed so deploys resolve). Grows The Worlds' flora. |
| **`threejs-procedural-planets/`** | A standalone procedural-planet reference project, runnable on its own. Not part of the shipped site. |

Inside `movie/src/` — the shared spine, the hub, and one directory per engine's
own guts:

| Directory | Role |
| --- | --- |
| `core/` | **Shared spine.** `Stage` (renderer + fixed-timestep loop + scene registry), `FlyCamera`, seeded `rng`. |
| `doc/` | **Shared spine + The Worlds.** `Timeline` (cue player), `Narrator` (voice + captions), caption styling (`doc.css`); plus The Worlds' own documentary scenes and scripts (`BigBangScene`, `SystemScene`, `SoupScene`, `episode2/`). |
| `hub/` | **The front door.** The engine registry (`engines.js`) and the grid that renders it into `index.html`. |
| `mission/` | **Apollo.** Its facts table (`mission.js`), narration, `scenes/` and `models/`. |
| `chernobyl/` | **Chernobyl.** Its facts table (`reactor.js`), narration, `scenes/` and `models/`. |
| `chemistry/` | *(The Worlds)* Nucleosynthesis and planet condensation — the element budget and each world's physical chemistry. |
| `cosmos/` | *(The Worlds)* `Cosmos` — a whole universe (star, five planets, the habitability verdict) from one seed. |
| `world/` | *(The Worlds)* `World` — one planet as the single source of truth: terrain, biome, atmosphere, flora/fauna budget, and the orbital planet shader. |
| `surface/` | *(The Worlds)* The standable ground patch (`Surface`) and its vegetation (`Flora`). |
| `fauna/` | *(The Worlds)* Wildlife: `genome` (body plan from planet physics), `rig` (how it's drawn), `Fauna` (behaviour). |
| `scenes/` | *(The Worlds)* `OrbitScene` (a world in space) and `SurfaceScene` (standing on it, with a real ocean). |
| `space/` | *(The Worlds)* `Starfield`. |
| `dev/` | Development tools (frame parity checks, a noise probe, the soup harness). |

### Page routes (`movie/`)

| Route | What it serves |
| --- | --- |
| `index.html` | The hub — the front door that lists every engine. |
| `worlds.html` | The Worlds: splash, trailer, Episode 1. |
| `apollo.html` | Apollo — the mission. |
| `chernobyl.html` | Chernobyl — the reactor. |
| `episode2.html` | The Worlds, Episode 2 direct (`?seed=<seed>`). |
| `episode1.html` | Legacy deep link, redirects to `/worlds.html`. |
| `set.html` | Dev tool: a free-fly "set browser" for orbit/surface scenes. |
| `soup.html` | Dev set-piece: Episode 2's origin-of-life act on its own. |

## Running it locally

Requires Node 20+.

```bash
cd movie
npm install
npm run dev        # http://localhost:5180
```

Then open `/` for the hub and pick an engine — or go straight to one:

- `/worlds.html` — The Worlds (or `/episode2.html?seed=eden` for Episode 2; any
  seed with a living world works — `eden`, `gaia`, `life`, `ocean`, `aria` …;
  seeds with no living world play an honest "no life here" gate and offer a
  reroll).
- `/apollo.html` — Apollo.
- `/chernobyl.html` — Chernobyl.

The dev server includes the `/api/tts` narration endpoint (see below), so the
narrators speak in dev exactly as in production.

## Narration & voices

A narrator's voice is a Microsoft neural voice, fetched as MP3 from `/api/tts`.
Only Edge exposes these voices through the browser, so the server synthesizes
each line itself against the same free online service (no key needed) and streams
it back; if that endpoint is unavailable, the browser's own speech synthesis is
the fallback, and captions carry the film regardless.

- **The Worlds** narrates Episode 1 in **Andrew**
  (`en-US-AndrewMultilingualNeural`) and Episode 2 in **Sonia**
  (`en-GB-SoniaNeural`).
- **Apollo** and **Chernobyl** both narrate in **Andrew**.
- `/api/tts` takes a `voice` param validated against an allowlist; the dev-server
  plugin (`vite.config.js`) and the production server (`server.js`) mirror each
  other exactly, so the films sound identical locally and deployed. Anything off
  the allowlist falls back to Andrew — so a new engine narrates in Andrew with no
  server change.

## Deployment

Deployed on **Railway** from the `main` branch. The root `package.json` drives it:

```jsonc
"build": "npm --prefix movie install --include=dev --ignore-scripts && npm --prefix movie run build",
"start": "node movie/server.js"
```

`build` produces `movie/dist/` (every engine's page is a Vite input, so all of
them ship); `start` runs a small Express server (`movie/server.js`) that serves
the built site and the `/api/tts` narration endpoint. Merging to `main` triggers
a redeploy.

## Design principles

- **True by construction.** Facts come from the simulation — a seed's derivation
  or a table of the record — never a template.
- **Nothing is canned.** Every engine renders on demand; no saved video files.
- **Seeded and deterministic.** Same seed → same universe, same words, same
  frames. Fixed-timestep loop; seeded RNG throughout the generative engines.
- **Engines are self-contained and additive.** A new engine is a folder, a page,
  and two lines of registration — never a rewrite of what already ships.
- **Creative decisions belong to the author.** What things look like, what
  exists, and how a story is told are deliberate choices — see
  [`CLAUDE.md`](CLAUDE.md) for the working rules this repo is built under.

## Tech

Three.js (WebGL, GPU) · Vite · Express · `msedge-tts` · vanilla ES modules,
no framework.
