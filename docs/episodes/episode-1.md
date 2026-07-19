# Episode 1 — From Nothing to Worlds

**Status: shipped.** This document describes the episode as built. Code lives
in `movie/src/doc/` (script: `narration.js`, stages: `BigBangScene.js`,
`SystemScene.js`, playback: `Timeline.js`, voice: `Narrator.js`, site glue:
`main.js`).

## Logline

From the instant before space and time to the moment a solar system finishes
forming — and the one narrow question that decides everything after: can any
of these five worlds hold life?

## How the episode is honest

The episode is generated, not played back:

- `Cosmos` (`movie/src/cosmos/Cosmos.js`) builds the universe as a **chain of
  causes**: seed → nucleosynthesis (which elements exist, in what amounts) →
  a star of some mass, and therefore brightness → five orbits at real spacings
  → each planet's temperature, composition, water state, and air → the
  habitability verdict. Nothing is dealt at random that could be derived from
  something upstream. That is the only reason a documentary can narrate it.
- `buildEpisode1Script(cosmos)` writes the narration **from that data**. Star
  name and mass, the enrichment generations, the element budget, each
  planet's temperature and the exact reason it was ruled out — all read off
  the simulation, never blanked into a template.
- Prose is **seeded**: every beat has 2–3 written variants and the seed pins
  which one is spoken, so a seed pins the whole read word-for-word, and two
  universes never sound alike.
- A dead universe is a legitimate roll. If no planet passes the filter, the
  episode says so and means it.

## The cue format

The script is an ordered list of cues; the `Timeline` speaks each one, waits
for the voice to finish (or `hold` seconds, whichever is longer), then
advances. A director callback in `main.js` applies `direct` to the active
stage.

```js
{
  text:   'what the narrator says (and the caption shows)',
  scene:  'bigbang' | 'system',        // which stage should be up
  direct: {
    phase:   'supernova',              // advance the stage's visual phase
    focus:   2,                        // aim the camera at planet index 2
    verdict: 'life' | 'dead',          // stamp the verdict on the focused planet
  },
  hold:   6,                           // minimum seconds to dwell
}
```

Runtime is the sum of spoken lengths — write more beats for a longer episode.
The episode runs roughly 36 cues (varies with the ending).

## Act structure

### Act 1 — Cold open (3 cues · BigBangScene)

Phases `void → point → strain`. Nothing exists; everything that ever will is
already present as energy; the promise of the series — watch what a handful
of rules can build.

### Act 2 — The Big Bang (7 cues · BigBangScene)

Phases `bang → foam → firstmatter → nucleosynthesis → inventory → fog →
recombination`. Space unfolds and cools; matter freezes out; the
twenty-minute window that makes hydrogen and helium and then closes; the
opaque fog; the moment it clears and light runs free.

### Act 3 — Gravity and the stars (7 cues · BigBangScene)

Phases `structure → gravity → firststars → fusion → iron → supernova →
enrich`. Imperfection is destiny; collapse; first light; the stellar foundry
climbing the element ladder; the iron wall; the supernova that mints
everything beyond it; and the seed-specific fact that closes the act — **this
universe took `d.generations` generations of stars** to enrich the cloud the
story forms from. (BigBangScene carries these 17 phases end to end — the
"17-shot cosmology sequence.")

### Act 4 — A system condenses (6 cues · SystemScene)

Phases `ignite → disc → condense → planets → reveal`. The star ignites and is
named (`d.star.name`); its mass (`d.star.mass`) is read as destiny; the disc
carries the fingerprint of every dead star (top elements past H/He, by name);
heat sorts the disc — rock and metal close in, ice and giants past the frost
line; the dust settles on five worlds and the episode's one question.

### Act 5 — The habitability filter (11 cues · SystemScene)

The checklist: liquid water, an atmosphere to hold it, the elements of life —
all at once or not at all. Then planet by planet (5 × 2 cues): a focus cue
naming the world, its type, orbit distance, and measured temperature; then
the verdict cue. A habitable world passes the checklist on screen
(`verdict: 'life'`); a dead one is ruled out **for its actual first reason**
(`chem.ruledOutBecause[0]`) with a closing line matched to how it died
(gas giant / ice / vapour / other).

### Act 6 — Close (2–3 cues)

- **Dead universe** (no survivors): five refusals, honestly counted — the
  most common outcome in a universe that was never trying. "Somewhere else,
  under another star, the dice may fall differently. But not here."
- **Living universe** (one or two survivors, by name): the razor's margin;
  chemistry about to cross its strangest threshold; and the direct handoff —
  **"That story is Episode 2."**

## Data the script consumes

Everything comes from `cosmos.describe()` plus per-planet `chem`:

| Fact | Source |
| --- | --- |
| Star name, mass | `d.star.name`, `d.star.mass` |
| Stellar generations before the cloud | `d.generations` |
| Dominant heavy elements, by name | `cosmos.budget.fractions` (top 3 past H/He) |
| Per planet: name, type, orbit, temperature | `d.planets[i]` |
| Habitability verdict and the reason it failed | `chem.habitable`, `chem.ruledOutBecause` |
| How its water died (ice / vapour / no floor) | `chem.isGiant`, `chem.waterState` |
| The survivors | `cosmos.livingWorlds` |

## Presentation

- Narration in the Microsoft Andrew neural voice (`Narrator.js` → `/api/tts`),
  identical in dev and production; captions mirror every line, so the muted
  experience is complete.
- Progress chrome shows `cue / total`; a mute toggle is always available.
- On completion the caption clears and a replay control offers a fresh
  universe.
