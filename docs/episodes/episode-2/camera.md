# Episode 2 — Camera shotlist & no-repeat ledger

Owner: Cinematographer agent. This file assigns exactly one named shot to every
cue (1–38), every gate cue (G1–G4), and every teaser beat, and proves the hard
rule holds.

**THE HARD RULE:** no camera shot used more than twice across the episode. The
main-episode ledger (cues 1–38) is the binding one and is at the bottom. The
**no-life gate** is an *alternate branch* (it plays instead of the episode, never
alongside it) and the **teaser** is a *standalone separate deliverable*; each
therefore carries its own independent ledger, listed with its section.

**Sanctioned exception used:** `TIME_LOCK` covers eras 0 and 1 (cues 13–14) as
its two uses — the "same valley, identical locked frame" trick. Eras 2–5 (cues
15–18) each get a *different moving shot* of that same valley, per the rule.

**Vocabulary note:** the brief calls the list "24 shots," but the enumerated
names total 25 (it includes `POV_CREATURE`). I use all 25 in the main episode —
maximum breadth, no favorites — so every named shot earns its place and none
runs a third time.

**Engine-achievability constraints carried from `teaser.js` (`_driveSurface` /
`_driveOrbit`):** (a) forested patches have no clearance — any descent/crane must
land in an actual `flora.placements` clearing and hold above canopy (~46 m) until
the final drop; (b) approach a flock from the *far* side of its anchor so the
birds don't fill the frame; (c) mind the near-plane on low/POV work — keep the
lens ≥2 m off the ground (`Math.max(eye, ground+2)`); (d) creature framing follows
the live group centroid (agents amble, camera ambles). Shots below are written to
be drivable exactly this way.

---

## ACT 1 — RETURN (scene: `return`) · cues 1–4

| # | shot | framing / move / lens — start → end | handoff to next |
|---|------|-------------------------------------|-----------------|
| 1 | `MACRO_ORBIT` | Slow wide orbit of the whole planet against `${star.name}`; long lens, the world hanging still. Start high az, drift laterally around the limb. Reintroduces `${world.name}`. | Orbit tightens its radius → decays straight into the push of cue 2 (match on inward motion). |
| 2 | `MACRO_PUSH` | Steady push toward the planet, the disc growing until atmosphere fills frame; the Ep1 facts (temp, air, water) become a promise as it swells. | Push overruns the atmosphere line → hands the frame to the descent, no cut. |
| 3 | `DESCENT` | Continuous vertiginous fall through cloud and air, world filling the frame, horizon curving flat. Wide, slightly vertiginous FOV. | Descent decelerates over an open shoreline clearing (avoid canopy/flock per engine note) → cue 4 cranes the last stretch down. |
| 4 | `CRANE_DOWN` | Crane the final 150 m down into the clearing, settling to eye level at the water's edge — warm shallows over bare rock. Ends looking across the shallows. | Camera is now at the waterline on the exact spot; scale collapses inward → dissolve to the soup at this same shore. |

## ACT 2 — THE SOUP (scene: `soup`, macro/abstract) · cues 5–12

| # | shot | framing / move / lens — start → end | handoff to next |
|---|------|-------------------------------------|-----------------|
| 5 | `MACRO_DRIFT` | Weightless drift across the mineral-rich shallows as a chemistry set; the element budget (`${budget.topElements}`) reads like a lit pantry going by. | Drift slows and locks onto a knot of forming molecules → cue 6 holds there. |
| 6 | `SLOW_ZOOM_HOLD` | Near-locked frame, an almost-imperceptible zoom on monomers forming/breaking/reforming — motion that goes nowhere. Sells deep time by *not* cutting. | Time compresses; one molecule in frame does something the others don't → push in. |
| 7 | `PUSH_IN` | Deliberate, weighted push into the single molecule that copies itself — the hinge of the series. Shallow depth, everything else falls off. | Hold on the first copy, then a second copy peels away → lateral move reveals the field of copies. |
| 8 | `DOLLY_LATERAL` | Lateral track across a field of competing copies; the better copier stays sharp while rivals blur past. Evolution as arithmetic. | Lateral motion continues but narrows to two lineages → cue 11 will reuse that separation; first, a wall forms (cue 9). |
| 9 | `MACRO_PUSH` (2/2) | Push toward a bead of oil closing into a membrane — the first inside/outside, me/not-me. Ends framed on the sealed bubble. | Push settles on the closed bubble → orbit it as an object with an interior. |
| 10 | `ORBIT_SUBJECT` | Orbit the first cell — replicator sealed in membrane, feeding on the chemistry around it. Treats the cell as our first "subject." | Orbit reveals the cell dividing; one daughter drifts a different way → lateral fork. |
| 11 | `DOLLY_LATERAL` (2/2) | Quiet lateral drift following ONE branch peeling parasitic-small away from the body-building line. A whisper — Ep3 seed — one unhurried move. | Pull the eye back up out of the micro-world → reveal the stained shallows at scale. |
| 12 | `PULL_BACK` | Pull back from the stained water until the whole shore reads — the first life visible from a distance. Bridges upward and out of the soup. | Rack of scale ends on the bare shoreline → straight into Act 3's locked valley frame. |

## ACT 3 — FAST-FORWARDS (scene: `surface`, locked site, era dial) · cues 13–19

TIME_LOCK holds the *identical* frame for eras 0–1 (its two uses). Eras 2–5 are
each a different moving shot of the *same valley* — the coastline underfoot never
changes, which is what sells them as one place.

| # | era | shot | framing / move / lens — start → end | handoff to next |
|---|-----|------|-------------------------------------|-----------------|
| 13 | 0 · sterile | `TIME_LOCK` (1/2) | The locked establishing frame: bare rock, empty sea, raw sky. Absolutely still — this is the frame we will hold. "Watch." | No move — the frame is held identically into cue 14. |
| 14 | 1 · stained | `TIME_LOCK` (2/2) | Same locked frame, pixel-for-pixel; only the shallows and wet rock take on color as the mats arrive. The trick lands: alive now, nothing else moved. | The lock finally breaks — first camera move of the act begins the era montage. |
| 15 | 2 · greening | `RISE_REVEAL` | Rise up off the water's edge, revealing ground cover crawling inland — the first green (or its equivalent) climbing the valley. | Rise crests; forest is about to stand → tilt up. |
| 16 | 3 · rooted | `TILT_UP` | Tilt up as `${flora.dominant}` stands off the ground — sparse stalks, then a canopy closing over the valley. "Life stands up." | Tilt settles on canopy height; something small moves below → drop low. |
| 17 | 4 · first movers | `LOW_TRACK` | Low tracking glide at ground level catching the first animals — small, tentative, swarm/skimmer scale. The first motion that isn't wind. | Track widens as the roster floods in → crane down into the crowd. |
| 18 | 5 · full roster | `CRANE_DOWN` (2/2) | Crane down *into* the now-crowded valley, wave after wave of the cast, until it's as full as it ever gets. Everything grew from era 1's stain. | Reaches the valley floor amid the throng, then reverses intent → pull back for the scope line. |
| 19 | 5 | `PULL_BACK` (2/2) | Pull the lens all the way back: this teeming valley is one place on a whole living world of many. Turns us toward the tour. | The wider world enters frame → cut to the coast to begin the chain. |

## ACT 4 — THE CHAIN (scene: `surface`, zones + interactions) · cues 20–35

One unbroken thread. Every cue is written to hand into the next — a match on
movement or a whip — and two handoffs (28→29 and 31→32) cross a biome boundary
on the same planet. Derivations happen on-camera.

| # | site / event | shot | framing / move / lens — start → end | handoff to next |
|---|--------------|------|-------------------------------------|-----------------|
| 20 | `coast` | `LOCKED_WIDE` | Locked wide of the calm coast ecosystem — the whole stage of the act, still, before the first domino. | Held wide; the flock settles onto the shallows inside the frame → drop to their level. |
| 21 | `coast` focus `speciesA` | `WATER_LEVEL` | Camera at the waterline among the flock on the shallows; derive it — thin `${world.air}` forces the huge `${A.wingSpan}`. Low, glassy reflection. | Something spooks them; the whole flock loads to launch → lift with it. |
| 22 | event `startle-flock` | `AERIAL_FOLLOW` | The flock erupts off the water as one body; camera lifts and banks with the wall of wings. (Engine: rise from the far side so birds don't smother the frame.) | The wall sweeps *inland* → match the sweep onto the herd it's about to reach. |
| 23 | `coast` focus `speciesB` | `HANDHELD_FOLLOW` | Handheld follow across the grazer herd as the wings pass overhead; derive it — `${B.gravity}` sets `${B.legLen}` and the gait. Slightly loose, alive. | The herd catches the flock's panic → the follow destabilizes into the stampede. |
| 24 | event `spook-herd` | `POV_CREATURE` | Ride inside the breaking herd — a fleeing grazer's POV, ground hammering past, the world tilting. The ground itself now moving. (Engine: keep lens ≥2 m up.) | The POV terrain shifts coast→scrub and, for an instant, reveals the waiting stalker → hero reveal. |
| 25 | `coast`→`scrub` focus `speciesC` | `HERO_LOW` | Low heroic angle on the solitary predator revealed as the stampede tears past; derive its build from `${C.tempC}` / terrain (`${C.build}`). Held, coiled. | It commits — the coil releases → whip. |
| 26 | event `predator-commit` | `HANDOFF_WHIP` | A hard whip that follows the lunge and *loses* it behind dust and terrain — the kill implied, not shown. Restraint by design; the whip is the cut. | The whip lands on settling dust — and the smell of the kill draws the swarm up → cue 27. |
| 27 | `scrub` focus `speciesD` | `ORBIT_SUBJECT` (2/2) | Orbit the swarm boiling up out of the ground in their thousands (`${D.count}` × `${D.size}`) — life feeding on life, nothing wasted. | The swarm coheres into a rising column on the warm updraft → follow it up. |
| 28 | event `swarm-rise` | `AERIAL_FOLLOW` (2/2) | Climb with the column as it lifts on the updraft toward the ridge; camera goes with it, gaining ridge height. | The climb carries us over the crest → straight into the ridge crossing (biome boundary). |
| 29 | `ridge` | `RIDGE_CROSS` | Cross the ridgeline at the crest; the far side opens onto a colder, higher biome — same rules, different place. `${zones}`. | Descend the far slope into the highland → meet species E. |
| 30 | `highland` focus `speciesE` | `STATIC_PORTRAIT` | Still, composed portrait of E holding against the cold; the frame lets us *read* Allen's rule — compact `${E.bodyRad}`, short extremities, `${E.shaggy}` coat born of `${E.tempC}`. | Something native to this biome moves through the portrait → the link fires. |
| 31 | event `highland-link` | `HANDHELD_FOLLOW` (2/2) | Handheld follow of the biome-native interaction (a highland flush / a scavenger drawn in) that ties E to F. The thread stays unbroken. | The follow carries across the highland→interior boundary onto F. |
| 32 | `highland`→`interior` focus `speciesF` | `TILT_UP` (2/2) | Tilt up the last principal's strikingly tall/long-necked plan to read its signature feature — `${F.neckLen}`, `${F.legCount}`, `${F.size}`. The tilt IS the derivation. | The tilt reaches the sky as the light goes long → the day cools into dusk. |
| 33 | `interior` (light turning) | `SILHOUETTE_DUSK` | Bodies reduced to silhouettes against long gold light; the chain slows, the day's violence spent. | Hold the calm, then release outward → pull all the way out. |
| 34 | `vista` | `WIDE_ECOSYSTEM` | Pull to the grand wide: the whole living web at once — every biome we crossed held in one frame (`${species.count}`, `${zones}`). The scope reveal. | From the whole web, settle toward one quiet corner of it. |
| 35 | `vista` event `settle` | `SLOW_ZOOM_HOLD` (2/2) | A slow zoom that comes to rest and holds on one quiet interaction — a herd bedding down, a flock returning to roost. The web at equilibrium. | Rest on stillness → dissolve to the close. |

## ACT 5 — CLOSE · cues 36–38

| # | shot | framing / move / lens — start → end | handoff to next |
|---|------|-------------------------------------|-----------------|
| 36 | `MACRO_ORBIT` (2/2) | Return to orbit and circle `${world.name}` once more — a deliberate bookend to cue 1. Every creature, every biome, one indivisible system, from one warm pool. | The orbit finds a single point on the surface → push toward it. |
| 37 | `PUSH_IN` (2/2) | Slow, quiet, faintly ominous push toward one ordinary creature — the callback to the split: one lineage you see, one you cannot, waiting inside the others. (Ep3 seed.) | The push holds intimate, then lifts its gaze upward → the handoff rise. |
| 38 | `RISE_REVEAL` (2/2) | A final rise, lifting off the world and turning outward — something here is about to start asking questions about itself. Hands to Episode 3; optional new-seed invite. | End of episode. |

---

## NO-LIFE GATE (alternate branch) · cues G1–G4

Plays *instead of* the episode when `cosmos.livingWorlds` is empty — so it never
co-occurs with cues 1–38 and carries its own independent ledger. Honest and
dignified, built from each planet's real `ruledOutBecause`.

| # | scene | shot | framing / move / lens | handoff |
|---|-------|------|-----------------------|---------|
| G1 | `system` | `LOCKED_WIDE` | Locked wide of the finished, barren system around `${star.name}` — `${planets.length}` worlds, none cleared. Not a bug, a result. | Hold, then begin walking the worlds. |
| G2 | `system` | `DOLLY_LATERAL` | Lateral dolly past each planet in turn, pausing on each to read its actual `${planets[].ruledOut}` — too dim, never thawed, no air. | The last dead world exits frame → pull back. |
| G3 | `system` | `PULL_BACK` | Pull back off the system into indifferent dark — silence is the ordinary outcome, far more often than song. | The dark opens room for a new beginning. |
| G4 | `system` | `MACRO_DRIFT` | Drift toward a fresh gathering cloud — the rules are the same everywhere; another roll begins another universe. Reroll invite. | Ends the gate. |

**Gate ledger (independent):** `LOCKED_WIDE`→G1 · `DOLLY_LATERAL`→G2 ·
`PULL_BACK`→G3 · `MACRO_DRIFT`→G4. 4 distinct shots, each 1 use. Holds.

---

## TEASER (standalone deliverable) · beats T1–T10

~90 s, standalone, owned by the teaser agent — separate playback, own independent
ledger. Sells Ep2 (descent, origin of life, deep-time eras, living world & chain)
*without* spoiling the on-camera derivations. Ends on a card in the Ep1 teaser's
register.

| # | beat | shot | framing / move / lens | handoff |
|---|------|------|-----------------------|---------|
| T1 | the world that passed the filter, in orbit | `MACRO_ORBIT` | Slow orbit of the living world hanging in space. | Tighten toward it → fall. |
| T2 | descent through the atmosphere | `DESCENT` | Continuous vertiginous fall, world filling frame. | Decelerate over a shoreline clearing. |
| T3 | touchdown at the warm shallows | `CRANE_DOWN` | Crane the last stretch to eye level at the water's edge. | Scale collapses inward. |
| T4 | one molecule copies itself | `MACRO_PUSH` | Push into the replicator — origin of life, no derivation spoiled. | Time compresses → deep time. |
| T5 | the valley, deep time | `TIME_LOCK` | The locked establishing valley frame, held. | The lock breaks → the eras run. |
| T6 | the valley greens and fills | `RISE_REVEAL` | Rise revealing the valley greening and crowding across eras. | Life stands and moves. |
| T7 | the living world — a creature | `AERIAL_FOLLOW` | The flock erupts; camera lifts with it (far-side approach). | Motion sweeps inland → the chain. |
| T8 | the chain — herd & hunter | `LOW_TRACK` | Low tracking glide through herd and the terrain a predator waits in. | Widen to the whole web. |
| T9 | the scope of one living world | `WIDE_ECOSYSTEM` | Grand wide of the whole living web, every biome at once. | Settle toward dusk. |
| T10 | end card | `SILHOUETTE_DUSK` | Silhouettes holding under the card, Ep1-teaser register. | End of teaser. |

**Teaser ledger (independent):** `MACRO_ORBIT`, `DESCENT`, `CRANE_DOWN`,
`MACRO_PUSH`, `TIME_LOCK`, `RISE_REVEAL`, `AERIAL_FOLLOW`, `LOW_TRACK`,
`WIDE_ECOSYSTEM`, `SILHOUETTE_DUSK` — 10 distinct shots, each 1 use. Holds.

---

## MAIN-EPISODE LEDGER (binding — cues 1–38) · every shot ≤ 2 uses

| shot | cues using it | uses |
|------|---------------|------|
| `DESCENT` | 3 | 1 |
| `MACRO_DRIFT` | 5 | 1 |
| `MACRO_PUSH` | 2, 9 | 2 |
| `MACRO_ORBIT` | 1, 36 | 2 |
| `LOCKED_WIDE` | 20 | 1 |
| `TIME_LOCK` | 13, 14 | 2 *(sanctioned era 0–1 exception)* |
| `RISE_REVEAL` | 15, 38 | 2 |
| `WIDE_ECOSYSTEM` | 34 | 1 |
| `RIDGE_CROSS` | 29 | 1 |
| `PUSH_IN` | 7, 37 | 2 |
| `PULL_BACK` | 12, 19 | 2 |
| `CRANE_DOWN` | 4, 18 | 2 |
| `TILT_UP` | 16, 32 | 2 |
| `DOLLY_LATERAL` | 8, 11 | 2 |
| `SLOW_ZOOM_HOLD` | 6, 35 | 2 |
| `LOW_TRACK` | 17 | 1 |
| `AERIAL_FOLLOW` | 22, 28 | 2 |
| `ORBIT_SUBJECT` | 10, 27 | 2 |
| `HANDHELD_FOLLOW` | 23, 31 | 2 |
| `HANDOFF_WHIP` | 26 | 1 |
| `STATIC_PORTRAIT` | 30 | 1 |
| `HERO_LOW` | 25 | 1 |
| `POV_CREATURE` | 24 | 1 |
| `WATER_LEVEL` | 21 | 1 |
| `SILHOUETTE_DUSK` | 33 | 1 |

**Totals:** 25 distinct shots · 38 uses across 38 cues · max uses of any single
shot = 2. **Ledger holds.** Every named shot in the vocabulary is used and none
exceeds two takes.
