# The Worlds

**A documentary series generated from a single seed.** Every universe — its
physics, its star, its elements, its worlds, and the story the narrator tells
about them — is computed live, in the browser, from one seed. Nothing is
filmed, drawn, or written in advance. Change the seed and everything changes:
a different star, different chemistry, different worlds, a different
documentary.

> **The one rule that makes it what it is: nothing is canned.** Every fact the
> narrator speaks is read off the simulation for the viewer's own seed — this
> star's mass, this planet's temperature, this creature's leg length — so the
> narration is *true by construction*. The prose is written as seeded variants,
> so two universes never tell their story in the same words. If the simulation
> can't produce a fact, the narrator doesn't say it.

## What it is

You land on a one-page site. Your **seed is your universe** — shown big,
because it's the key to coming back to the same one. From there you can watch a
~90-second trailer or begin an episode. The first click doubles as the audio
permission, so the film opens with its narrator's voice; captions mirror every
line, so the muted experience is complete.

### The episodes

| Episode | Title | Status | Voice |
| --- | --- | --- | --- |
| **1** | From Nothing to Worlds | shipped | Andrew (male, US) |
| **2** | The Living World | playable | Sonia (female, British) |
| **3** | The Ones Who Ask | designed | — |

- **Episode 1** runs the universe forward as a chain of causes: from the
  instant before space and time, through the Big Bang and the forging of the
  elements, to a solar system condensing and the one question that decides
  everything after — can any of these five worlds hold life?
- **Episode 2** lands on the world that passed the filter and follows life from
  the first self-copying molecule (the "soup") through deep-time eras to a
  living planet and its wildlife. Reachable from the splash and from the end of
  Episode 1; both carry the seed, so it's the same universe.
- **Episode 3** (design only) is the humanoid/civilization arc. See
  [`docs/episodes/episode-3.md`](docs/episodes/episode-3.md).

Full episode documents — arcs, scripts, camera, data contracts — live in
[`docs/episodes/`](docs/episodes/).

## How it works, in one breath

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
decides whether flight is even possible and how big wings must be, temperature
applies Allen's rule, the ground palette becomes its camouflage.

A **playback engine** turns that world into a narrated film. A script is an
ordered list of cues (`{ text, scene, direct, hold }`); the `Timeline` speaks
each one in the neural narrator voice, tells a director what to show, waits, and
advances. Everything runs on a **fixed timestep with seeded randomness**, so the
same seed and frame number always produce the same image — the film is
deterministic.

A deeper technical tour is in [`docs/architecture.md`](docs/architecture.md).

## Repository layout

This repo is a small monorepo of three projects:

| Path | What it is |
| --- | --- |
| **`movie/`** | The site and the series — the whole generative documentary. Vite + Three.js front end, Express server for production. Everything above lives here. |
| **`ez-tree/`** | A vendored copy of the [ez-tree](https://github.com/dgreenheck/ez-tree) procedural tree library, consumed by `movie/` as a `file:` dependency (with a prebuilt bundle committed so deploys resolve). Grows the flora. |
| **`threejs-procedural-planets/`** | A standalone procedural-planet reference project, runnable on its own. Not part of the shipped site. |

Inside `movie/src/`:

| Directory | Role |
| --- | --- |
| `chemistry/` | Nucleosynthesis and planet condensation — the element budget and each world's physical chemistry. |
| `cosmos/` | `Cosmos` — a whole universe (star, five planets, the habitability verdict) from one seed. |
| `world/` | `World` — one planet as the single source of truth: terrain, biome, atmosphere, flora/fauna budget. Plus the orbital planet shader. |
| `surface/` | The standable ground patch (`Surface`) and its vegetation (`Flora`). |
| `fauna/` | Wildlife: `genome` (body plan from planet physics), `rig` (how it's drawn), `Fauna` (behaviour). |
| `core/` | `Stage` (renderer + fixed-timestep loop + scene registry), `FlyCamera`, seeded `rng`. |
| `doc/` | The documentary itself: `Timeline` (cue player), `Narrator` (voice + captions), the scenes (`BigBangScene`, `SystemScene`, `SoupScene`), and the episode scripts. |
| `scenes/` | `OrbitScene` (a world in space) and `SurfaceScene` (standing on it, with a real ocean). |
| `space/` | `Starfield`. |

### Page routes (`movie/`)

| Route | What it serves |
| --- | --- |
| `index.html` | The site: splash, trailer, Episode 1. |
| `episode2.html` | Episode 2 — the living world (`?seed=<seed>`). |
| `episode1.html` | Legacy deep link, redirects to `/`. |
| `soup.html` | Dev set-piece: Episode 2's origin-of-life act on its own. |
| `set.html` | Dev tool: a free-fly "set browser" for orbit/surface scenes. |

## Running it locally

Requires Node 20+.

```bash
cd movie
npm install
npm run dev        # http://localhost:5180
```

Then open `/` for the site, or `/episode2.html?seed=eden` for Episode 2
(any seed with a living world — `eden`, `gaia`, `life`, `ocean`, `aria` …;
seeds with no living world play an honest "no life here" gate and offer a
reroll).

The dev server includes the `/api/tts` narration endpoint (see below), so the
narrator speaks in dev exactly as in production.

## Narration & voices

The narrator's voice is a Microsoft neural voice, fetched as MP3 from
`/api/tts`. Only Edge exposes these voices through the browser, so the server
synthesizes each line itself against the same free online service (no key
needed) and streams it back; if that endpoint is unavailable, the browser's own
speech synthesis is the fallback, and captions carry the film regardless.

- **Episode 1** narrates in **Andrew** (`en-US-AndrewMultilingualNeural`).
- **Episode 2** narrates in **Sonia** (`en-GB-SoniaNeural`).
- `/api/tts` takes a `voice` param validated against an allowlist; the dev-server
  plugin (`vite.config.js`) and the production server (`server.js`) mirror each
  other exactly, so the film sounds identical locally and deployed.

## Deployment

Deployed on **Railway** from the `main` branch. The root `package.json` drives it:

```jsonc
"build": "npm --prefix movie install --include=dev --ignore-scripts && npm --prefix movie run build",
"start": "node movie/server.js"
```

`build` produces `movie/dist/`; `start` runs a small Express server
(`movie/server.js`) that serves the built site and the `/api/tts` narration
endpoint. Merging to `main` triggers a redeploy.

## Design principles

- **True by construction.** Facts come from the simulation, never a template.
- **Seeded and deterministic.** Same seed → same universe, same words, same
  frames. Fixed-timestep loop; seeded RNG throughout.
- **Creative decisions belong to the author.** What things look like, what
  exists, and how the story works are deliberate choices — see
  [`CLAUDE.md`](CLAUDE.md) for the working rules this repo is built under.

## Tech

Three.js (WebGL, GPU) · Vite · Express · `msedge-tts` · vanilla ES modules,
no framework.
