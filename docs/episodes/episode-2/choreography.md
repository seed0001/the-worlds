# Episode 2 — Choreography (the chain + era staging)

Owner: Choreographer agent. Scope: what happens IN the world — staged
interaction events and the unbroken butterfly-effect chain (Act 4, cues 20–35)
plus era staging (cues 13–19). Camera framing is the cinematographer's; this
file never assigns a shot.

Everything here is written as a **perturbation of the real behavior system** in
`movie/src/fauna/Fauna.js`: the `Flock` boids (anchor, `cruise`, `range`,
separation weight `12*G.size*G.size`, `vmax=flySpeed`) and the `GroundBand`
state machine (`amble/pause/graze` via `targetSpeed`/`grazeP`, `heading`,
`home`+`leash`, `BAND_TUNING` per role). No new subsystem is required — every
event is a set of transient field overrides the Timeline pushes onto a
population and the existing `update(dt)` loop already reads.

---

## 0. The one shared mechanic: a transient "impulse" layer

To keep the chain buildable and generalizable, everything reduces to **two**
event primitives the Timeline sets on a population, decaying over a short
window. Both are read by the *existing* update loops with a few added lines.

### `Flock.alarm = { dir:Vector3, strength, t }` (decays `t → 0` over ~3 s)
Read inside the `Flock.update` per-agent loop, after `_v2` is assembled:
- **Escape burst:** `_v2.addScaledVector(alarm.dir, alarm.strength * vmax)` —
  a shared heading impulse so the whole flock breaks the same way (one body,
  not 90 arguments).
- **Scatter-then-cohere:** multiply the separation term
  `_v2.addScaledVector(_v, 12*G.size*G.size * (1 + 2*alarm.strength))` — spikes
  apart at the flush, relaxes back as `strength` decays.
- **Climb:** raise the altitude-spring target: replace `this.cruise` with
  `this.cruise + 40*alarm.strength` in the `_v2.y` line, and lift the speed cap
  `vmax*(1 + 0.6*alarm.strength)` — the flush is faster and higher than cruise.
- Decay: `alarm.strength *= exp(-dt/0.9)`; clear at `< 0.02`.

### `GroundBand.flee = { from:Vector3, strength, t }` (decays over ~4–6 s)
Read at the top of the `GroundBand.update` per-agent loop, overriding the state
machine while active:
- **Flip to flee:** `a.targetSpeed = G.walkSpeed * (T.speedHi + 1.4*strength)`
  (herd `speedHi` is only 1.0; this is the stampede term). Skip the
  `rng.bool(T.grazeP)` graze branch entirely while `strength > 0.15` — panicked
  animals do not graze.
- **Bias heading away from the threat:** let `awayAngle = atan2(a.pos.x-from.x,
  a.pos.z-from.z)`; steer `a.heading` toward `awayAngle` at rate
  `min(1, dt*3*strength)`. This is "bias heading away from the flock's
  centroid," expressed as a point-source repulsion so it composes with the
  existing leash/water steering already in the loop.
- **Twitchier:** temporarily raise the effective `T.turn` and shorten the state
  `timer` so headings update fast during panic.
- Decay: `strength *= exp(-dt/1.8)`; when it clears, the normal `BAND_TUNING`
  resumes and the herd drifts back onto its leash — the world re-settles itself.

`solitary` gets a third, one-off primitive for the predator only (§26):
### `GroundBand.commit = { targetAgent, t }`
- Disables the `home`/`leash` steering, sets `a.targetSpeed = G.walkSpeed*2.4`
  (override of solitary `speedHi=0.7`), and locks `a.heading` onto an intercept
  bearing to the chosen fleeing herd agent's predicted position. One agent only
  (the nearest stalker); the rest of the solitary band keep ambling.

That is the entire toolkit. The whole butterfly chain is: **the payoff of one
impulse becomes the `from`/`dir`/target of the next.** Nothing fires on a bare
timer if a prior payoff can fire it — that is what makes the thread unbroken.

---

## Role → species mapping (pick by ROLE, never by name)

The chain crosses zones because **no single biome roster in `biomes.js` holds
all six roles.** Resolve each role from the zone's rolled roster by predicate,
so it generalizes across seeds/biomes. Fallbacks listed for thin rosters.

| Role | Predicate (on the zone's `fauna[]`) | Temperate/Arid/Frozen planet | Fallbacks |
|------|-------------------------------------|------------------------------|-----------|
| **A** flock | `domain==='air' && role==='flock'`, warm/low zone | `skimmer` (coast) | `duneskimmer`, `frostskimmer` |
| **B** herd | `domain==='ground' && role==='herd'`, highest `count`, warm zone | `grazer` (coast) | `strider`, `shagback` |
| **C** solitary predator | `role==='solitary'`, drier/rockier zone | `stalker` (scrub/arid) | `cinderstalker`; if none, skip §26 (see degradation) |
| **D** swarm | `role==='swarm'`, same zone as C | `scuttler` (scrub) | `ashmite`, `skitterer` |
| **E** cold herd | `role==='herd'` in the COLDEST zone (min `temperatureC`) | `shagback` (highland/frozen) | any herd whose zone is coldest |
| **F** distinct body plan | most extreme morphology hint: `legs!==4` OR `neck>=1.2` OR `armored`, not already used as A–E | `strider` (biped, long neck) | `cinderstalker` (armored) |

**Zone → biome resolution.** The planet is one world shown as several zones via
the `site` tokens. Bind sites to the seed's biomes by climate rank:
- `coast` → warmest/wettest biome (temperate).
- `scrub` → the next drier/rockier biome (arid).
- `ridge` → the saddle between scrub and highland (transition, no roster of its
  own; it is a boundary, not a habitat).
- `highland` → the coldest biome (frozen; else the highest-altitude one).
- `interior` → deep upland; hosts F. If the coldest biome has no distinct-body
  species (frozen only rolls `shagback`+`frostskimmer`), F is pulled from the
  planet's overall standout not yet featured (the temperate `strider`, shown in
  a temperate-upland interior pocket) — the tour has already established the
  planet is multi-biome, so this reads honestly.

**Graceful degradation (seeds with sparse rosters):**
- No `solitary` anywhere → §26 predator-commit becomes **herd-splits-herd**: the
  stampeding B drives *through* a second grazing band; that band's own `flee`
  impulse is the payoff that draws D. The "nothing happens alone" thesis holds
  without a kill.
- No `swarm` anywhere → §27–28 swarm-rise is carried by the smallest flier
  (a second `flock`) lofting off the carrion instead; the up-slope column
  motivation (§28) is identical.
- Single-biome seed (e.g. everything temperate) → `scrub`/`highland` become
  altitude bands of the one biome; C/E resolve from the same roster and the
  Allen's-rule derivation at §30 keys off the *upland* temperature lapse rather
  than a biome swap. The chain never breaks; it just travels less far.

---

## ERA STAGING — cues 13–19 (the locked valley)

Scene `surface`, one locked temperate coast site, era dial 0→5. This is mostly
Flora/Surface phase work, but here is what visibly populates the fixed frame at
each era and **when each Fauna role first appears** (counts ramp in, they do not
pop in). Fauna is spawned by role at its era and its `count` is scaled up over
the era so the valley *fills* rather than blinks full.

| Cue | Era | Mats / ground stain | Flora | Fauna roles present (count fraction) |
|-----|-----|---------------------|-------|--------------------------------------|
| 13 | 0 · sterile | none | none | none. Bare rock, empty sea. Establish the frame. |
| 14 | 1 · stained | mat coverage creeps from waterline up the wet rock (Surface `mats` phase, ~30% of the intertidal). | none | none — the trick: the place is *alive* (color) yet nothing has moved. |
| 15 | 2 · greening | mats now blanket the shallows; low ground-cover crawls a few metres above the tideline. | smallest flora only, sparse (`density`→~15% of biome max, min `scale`). | none. |
| 16 | 3 · rooted | stain saturated, receding under shade. | trees ramp `density`→~40% then →biome max; `flora.dominant` now nameable; canopy closes over the valley. | none — the world stands up before it walks. |
| 17 | 4 · first movers | — | mature. | **D (swarm)** at ~30% count, low and twitchy in the leaf litter; **A (flock)** at ~20% count, small and tentative over the water. First things that move that aren't wind. Nothing large yet. |
| 18 | 5 · full roster | — | mature. | wave by wave to full `species.count`: **B (herd)** fills the flats, then **C (solitary)** takes its territory at the treeline, then **F (distinct body plan)** last — the tallest silhouette arrives when the valley is already crowded. A/D ramp to full counts. |
| 19 | 5 | — | mature. | full roster teeming; then the lens pulls back — one place on a world of many. Hand to the tour. |

Staging rule for 17→18: spawn order is **swarm/flock → herd → solitary →
distinct** — the real trophic build order (small movers before large before
predators), so "everything was built from era 1's stain, nothing added from
outside" is literally true on screen.

---

## THE CHAIN — cues 20–35

Format per event: **Trigger** (what fires it — a cue, or the *previous payoff*)
· **Mechanic** (concrete Fauna.js override) · **Payoff** (what's seen, and how
it becomes the next trigger) · **Roles**.

### Cue 20 — `coast`, no event — establish, calm
- **Staging:** Flock A at cruise over the shallows (`Flock` nominal); herd B
  grazing on the flats (`grazeP=0.55`, ambling); everything on its leash. No
  impulse active. This is the still water the first domino drops into. The one
  quiet beat before the chain — deliberately event-free.
- **Roles:** A (skimmer), B (grazer) both visible, both calm.

### Cue 21 — `coast` focus A — meet the flock (derivation cue)
- **Staging:** Flock A holds cruise; narrator derives `wingSpan` from `air`.
  Behavior nominal — the derivation reads the animal at rest so cue 22's flush
  lands harder by contrast.
- **Roles:** A.

### Cue 22 — event **`startle-flock`** — the first domino
- **Trigger:** timeline cue 22 (the chain's ignition — the only event fired by
  the clock rather than by a prior payoff).
- **Mechanic:** set `A.alarm = { dir: normalize(inland, i.e. from the shallows
  toward B's anchor), strength: 1.0, t: 3 }`. The whole flock breaks off the
  water as one body: escape burst + scatter-spike + climb (§0). Direction is
  **not** random — it points at herd B's anchor, so the flush *aims* the chain.
- **Payoff:** a wall of wings erupts and sweeps inland. The flock's moving
  centroid (`mean(agents.pos)`) is now a travelling threat point → it is the
  `from` for the next event.
- **Roles:** A.

### Cue 23 — `coast` focus B — meet the herd (derivation cue)
- **Staging:** as the shadow of A crosses toward them, B is still grazing —
  narrator derives `legLen`/gait from `gravity`. Behavior nominal for one more
  beat; the tension is that A's centroid is closing.
- **Roles:** B.

### Cue 24 — event **`spook-herd`** — the ground starts moving
- **Trigger:** **payoff of `startle-flock`** — fired when A's centroid passes
  within ~80 m of B's `anchor` (or at cue 24, whichever the assembler prefers;
  the geometric trigger is truer). The passing flock IS the scare.
- **Mechanic:** set `B.flee = { from: A.centroid, strength: 1.0, t: 6 }`. The
  herd flips out of graze into stampede: `targetSpeed` spikes to
  `walkSpeed*(1.0+1.4)`, graze branch suppressed, all headings bias away from
  the overhead flock — i.e. **further inland, toward the scrub.** The herd's own
  `home`/`leash` term is temporarily slackened (multiply `T.leash` by 3 while
  fleeing) so the stampede can actually leave the flats.
- **Payoff:** the flats break into a running herd trailing dust, driving toward
  the scrub treeline. The leading edge of the herd is now the input to the
  predator: its position/heading is what C intercepts.
- **Roles:** B (A still visible, peeling back to the water as its alarm decays).

### Cue 25 — `coast`→`scrub` focus C — meet the predator (derivation cue)
- **Staging:** the herd's dust reaches the scrub. C (solitary) has been ambling
  in its wide territory (`spread=300`, slow `speedLo/Hi=0.3/0.7`). Narrator
  derives C's `build` from terrain/`tempC`. C orients toward the incoming herd
  (a cheap pre-commit: bias its `heading` toward the herd's leading edge at low
  rate) — it has been *waiting* for exactly this.
- **Roles:** C.

### Cue 26 — event **`predator-commit`** — the chase (kill OFF-camera)
- **Trigger:** **payoff of `spook-herd`** — the stampede's leading edge enters
  C's territory radius.
- **Mechanic:** set `C.commit = { targetAgent: nearest fleeing B agent, t }` on
  the single closest stalker (§0 commit primitive): leash off, `targetSpeed =
  walkSpeed*2.4`, heading locked to intercept. The target B agent keeps its
  `flee` heading. They converge.
- **The misdirection (how the kill resolves unseen):**
  1. **Geometry does the hiding, not a cut.** Aim the herd's flee vector (set in
     §24) across a **terrain fold** — pick the flee `from` so `awayAngle` points
     at the nearest rise where `surface.heightAt` climbs then drops. The
     intercept is timed to land in the **dead ground beyond the crest**: both
     `commit` predator and target agent cross the ridge line and, on the frame
     their separation `< contactR`, are `hideFrom`-style parked at zero scale
     (or simply pass behind the crest for the camera). No blood, no ragdoll —
     they were there, then the crest is empty.
  2. **The stampede's own dust is the veil.** The herd (§24) is already trailing
     a dust wake toward that crest; the predator's `walkSpeed*2.4` sprint kicks
     its own. The contact point is inside that haze.
  3. **Attention is pulled, not the kill shown.** The payoff (below) fires the
     swarm at the contact point — the audience's eye jumps to the *rising* thing
     and infers the *fallen* thing. Restraint by construction.
- **Payoff:** a single settling dust plume marks a fixed point in the scrub —
  the **carrion point**. That point is the `home` seed for the swarm.
- **Roles:** C, one B agent (both vanish behind the fold).

### Cue 27 — `scrub` focus D — meet the swarm (derivation cue)
- **Trigger:** **payoff of `predator-commit`** — the carrion point exists.
- **Mechanic (emergence, phase 1 of swarm-rise):** spawn/activate swarm D with
  `anchor = carrion point`. Swarm tuning is already twitchy (`spread=22`,
  `grazeP=0.1`, `pauseMin/Max=0.4/1.6`, `turn=2.2`, `speedHi=1.6`). They boil up
  out of the litter around the point in their thousands — nominal swarm update,
  just densely seeded on one spot. Narrator derives `count`/`size`.
- **Payoff:** a seething mass at the kill site — life feeding on life, nothing
  wasted. Sets up the column.
- **Roles:** D (scuttler).

### Cue 28 — event **`swarm-rise`** — the column that crosses the world
- **Trigger:** **payoff of cue 27** — the swarm is massed at the carrion point.
- **Mechanic (phase 2, two parts, both buildable on `GroundBand`):**
  1. **Loft the core.** Add a transient vertical term to the swarm's
     `a.pos.y = surface.heightAt(...) + hipHeight + loft`, where
     `loft = riseAmp * strength * clamp(density_i)` — the densest agents billow
     upward off the ground on the warm updraft (a small, event-gated addition to
     the one `pos.y` line; zero for non-swarm bands). Reads as a column boiling
     up, not a carpet.
  2. **Migrate the anchor up-slope.** Animate the swarm's `home`/`anchor` along
     the terrain gradient toward the **ridge saddle** (the `ridge` site): each
     tick, step `anchor` toward the uphill neighbour of `surface.heightAt`, and
     raise `targetSpeed`. Because `home` moves, the whole leashed band *streams
     uphill* as a dense ribbon — a rising column of animals pouring up a warm
     slope.
- **Payoff / the biome crossing (cue 29 motivation):** the column's leading edge
  crests the ridge. The rising, up-slope-migrating swarm is the single moving
  element that **motivates the camera crossing the biome boundary** — it does
  not cut to the highland, it *follows the column over the saddle*. On the far
  side the same column descends into a colder climate: same rules, different
  place. That is cue 29.
- **Roles:** D. (Note: the loft term is the only genuinely new line in
  `Fauna.js`; it is a one-line, event-gated addition and defaults off.)

### Cue 29 — `ridge` (biome boundary) — no new interaction, the crossing itself
- **Staging:** the swarm column tops the saddle and spills down the cold side.
  The narrator's "same rules, run in a colder place" lands as the *bodies on the
  far side visibly differ.* No impulse fired here — the swarm-rise payoff is
  still in motion and carries us over. Camera-owned shot; choreography only
  guarantees a continuous moving subject across the line.
- **Roles:** D crossing; E about to appear below.

### Cue 30 — `highland` focus E — meet the cold herd (derivation cue)
- **Staging:** below the ridge, herd E grazes the cold flats (`shagback`,
  nominal herd tuning). Narrator derives Allen's rule: `bodyRad` up, `neckLen`
  down, `shaggy` coat — from `tempC`. Behavior nominal; E is calm, which sets up
  the next flush.
- **Roles:** E (shagback).

### Cue 31 — event **`highland-link`** — the thread continues in the cold
- **Trigger:** **cue 31**, motivated by the swarm column settling among E (or E
  simply reacting to the descending swarm). Reuses the `startle-flock`
  primitive, cold-biome cast.
- **Mechanic:** E's herd, disturbed (the arriving swarm column is the `from`),
  shifts hard — a light `E.flee` impulse — and that movement **flushes the
  highland flock** native to this biome (`frostskimmer`, an air/flock species):
  set `highlandFlock.alarm = { dir: toward the interior, strength: 0.8, t: 3 }`.
  The flock erupts off the cold ground exactly as A did on the coast — the same
  mechanic, a different animal, proving the rules travel.
- **Payoff:** the highland flock's flight-line vectors toward the interior;
  its heading is the pointer that leads the eye to species F. Thread unbroken.
- **Roles:** E (herd, the disturber) + highland flock (the flushed link).

### Cue 32 — `highland`→`interior` focus F — meet the last principal (derivation cue)
- **Trigger:** **payoff of `highland-link`** — the flushed flock's vector lands
  the camera in the interior, on F.
- **Staging:** F (distinct body plan — `strider`: biped, long neck, or
  `cinderstalker`: armored) stands in the interior. Narrator derives its
  signature: `legCount`/`neckLen` (the biped's pendulum gait and radiator neck)
  or armor. Behavior nominal — F is the chain's terminus, shown at rest.
- **Roles:** F.

### Cue 33 — `interior`, light turning — the chain slows
- **Staging:** no new impulse. All active `flee`/`alarm` fields have decayed to
  zero by now; the world is drifting back onto its leashes — herds re-graze,
  flocks re-cruise. The de-escalation is literally the impulse layer relaxing.
  Dusk. The day's violence spent.
- **Roles:** ambient (whatever is in frame, all calm).

### Cue 34 — `vista` (WIDE) — the scope reveal
- **Staging:** pull all the way out; every zone we crossed held in one frame —
  coast, scrub, ridge, highland, interior. All populations on nominal tuning,
  visibly alive but unhurried. `species.count`/`zones` cited. No event.
- **Roles:** all.

### Cue 35 — event **`settle`** — the web at equilibrium
- **Trigger:** cue 35 (the closing beat).
- **Mechanic:** a global relaxation impulse — the inverse of alarm. For every
  `GroundBand`: raise effective `grazeP`→~0.8 and push `targetSpeed`→0 (bedding
  down); for every `Flock`: lower `cruise` toward a roost altitude (reduce the
  altitude-spring target over ~4 s), raise cohesion / drop separation so the
  flock balls up onto its anchor (returning to roost). Everything eases to rest
  on its leash.
- **Payoff:** one quiet interaction — a herd bedding down, a flock settling to
  roost. The web at equilibrium. Close.
- **Roles:** one herd (B or E) + one flock (A), whichever the vista framing
  favors.

---

## Event token list (for assembler + dialogue sync)

**Canonical `event` tokens used (all from the skeleton — no renames):**
1. `startle-flock` — cue 22
2. `spook-herd` — cue 24
3. `predator-commit` — cue 26 (resolves off-camera)
4. `swarm-rise` — cue 28 (carries the biome crossing at 29)
5. `highland-link` — cue 31
6. `settle` — cue 35

**New tokens introduced:** none. The chain is fully expressible with the six
skeleton tokens. Two are worth flagging to the assembler as **carrying internal
sub-phases** (so they are not mistaken for missing events):
- `swarm-rise` runs in two phases — *emergence* (cue 27's payoff) then
  *loft + up-slope migration* (cue 28) — and it is the motivator for the cue 29
  `ridge` crossing, which needs no event of its own.
- `predator-commit` includes the off-camera resolution (crest occlusion + dust
  veil + attention pull); no separate "kill" token exists or is needed.

**One new engine line flagged for the assembler/build:** the swarm-rise loft is
the only genuinely new term in `Fauna.js` — an event-gated vertical offset on
the swarm's `pos.y`, defaulting off for all non-swarm bands. Every other event
is a transient override of existing fields (`alarm`, `flee`, `commit`).
