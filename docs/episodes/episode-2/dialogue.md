# Episode 2 — Dialogue (all cues, in order)

Merged from the two dialogue passes. Cues 1–12 + no-life gate, then 13–38.
Format drops into Episode 1's `say(pick(V1,V2,V3), { direct, hold })` pattern.

---


Owner: Dialogue-A. Covers **cues 1–12** (Act 1 Return, Act 2 The Soup) and the
**no-life gate G1–G4**. Cues 13+ owned by another agent.

Format matches the shipped Episode 1 script (`movie/src/doc/narration.js`):
each cue is one spoken beat with ≥3 seeded variants, every derived fact a
`${token}` (never hardcoded), plus a suggested `hold` in seconds and the
scene/phase the cue drives. Shots are named only as *suggestions* — the
cinematographer owns the ledger and the ≤2-uses rule; treat every shot below
as provisional.

Tone target: the Episode 1 read exactly — precise, unhurried, plainspoken
about hard science, cosmic awe without purple. Where Episode 1 said "matter is
about to cross its strangest threshold yet," this is the payoff of that
sentence.

---

## ACT 1 — RETURN · `scene: return`

### Cue 1 — orbit (reintroduce the world)
`scene: return` · `direct: { phase: 'orbit', shot: 'MACRO_ORBIT' }` · **hold: 6**

Data: `${world.name}`, `${star.name}`

- `At the end of the last story, out of five worlds, one door stood open. This is what was behind it. ${world.name}, still turning under ${star.name}, exactly where we left it.`
- `Here it is again. The one world in this whole system that passed every test at once — ${world.name} — hanging in the light of ${star.name}, waiting for us to come back and finish the sentence.`
- `One world cleared the filter. Just one. From up here it is only a bright curve against the dark, turning under ${star.name} — but ${world.name} is where chemistry is about to do the thing it does almost nowhere.`

### Cue 2 — approach (the Ep1 facts become a promise)
`scene: return` · `direct: { phase: 'approach', shot: 'MACRO_PUSH' }` · **hold: 6**

Data: `${world.tempC}`, `${world.waterState}`, `${world.air}`

- `We measured this world once already, from a distance, as astronomy. A surface near ${world.tempC} degrees. Water that stays ${world.waterState}. Air ${world.air} enough to hold it down. Watch those three numbers stop being astronomy, and start being biology.`
- `Three facts carried us here: ${world.tempC} degrees at the surface, water ${world.waterState} rather than frozen or boiled away, and ${world.air} air pressing it flat. In the last episode they were the reasons this world survived. In this one, they are the reasons it can live.`
- `Everything that is about to happen is already written in the readings. Temperature, ${world.tempC}. Water, ${world.waterState}. Air, ${world.air}. Ingredients, not scenery — and the recipe is finally about to be followed.`

### Cue 3 — descent (through the atmosphere)
`scene: return` · `direct: { phase: 'descent', shot: 'DESCENT' }` · **hold: 7**

Data: —

- `So we go down. Not a cut, not a jump — one continuous fall, through the top of the air and into it, the curve of the world flattening into a horizon, the horizon flattening into ground.`
- `Down through the atmosphere, then. The same air that held the ocean from space now thickens around us, and the planet stops being a sphere and becomes a place — with a sky above it and a floor below.`
- `We drop toward it. The whole world swings up to meet the frame and keeps growing until it is no longer a world at all, just weather, then cloud, then a coastline rushing up out of the blue.`

### Cue 4 — shallows (touchdown; hand to the soup)
`scene: return` · `direct: { phase: 'shallows', shot: 'WATER_LEVEL' }` · **hold: 6**

Data: —

- `And we come to rest here. Warm shallows over bare rock, at the edge where water meets stone. Nothing lives on this whole planet yet. But of every place it could begin, it begins in a pool exactly like this one.`
- `Touchdown, at the waterline. No soil, no green, no sound but the water — just warm sea running thin over naked rock. Remember this shore. This is the address where life has its first idea.`
- `Here. Where the sea goes shallow and the rock lies just beneath it, sun-warmed and mineral-stained. It looks like nothing. It is the most important place on the world, because this is where the chemistry is about to wake up.`

---

## ACT 2 — THE SOUP · `scene: soup`

Abstract / macro register (BigBangScene family). Non-literal — chemistry as
spectacle, not a textbook diagram.

### Cue 5 — pantry (the element budget, named)
`scene: soup` · `direct: { phase: 'pantry', shot: 'MACRO_DRIFT' }` · **hold: 7**

Data: `${budget.topElements}`

- `First, take stock of the pantry — because life cannot use what the universe never made. Beyond hydrogen, this world's rock and water are richest in ${budget.topElements}. That short list is the entire toolkit. Everything that follows is built from exactly this, and nothing else.`
- `Warm water, mineral-rich rock, and a fixed set of ingredients: after hydrogen, the elements most abundant here are ${budget.topElements}. Not chosen — inherited, forged in dying stars two episodes ago. Every molecule, every membrane, every cell this story reaches has to be assembled from that handful.`
- `The shallows are a chemistry set, and the bottles are already on the shelf: ${budget.topElements}, dissolved in warm water over rock. That is the whole stock. Life is not going to reach outside this pool for a single new part — it will only ever rearrange what is already in it.`

### Cue 6 — monomers (chemistry that goes nowhere)
`scene: soup` · `direct: { phase: 'monomers', shot: 'MACRO_DRIFT' }` · **hold: 6**

Data: —

- `And at first, chemistry simply happens. Small molecules assemble, come apart, assemble again in slightly different ways — energy in, energy out, building nothing that lasts. This goes on for a length of time the human mind is not built to hold.`
- `Heat and light drive the reactions; the reactions run in every direction at once. Molecules form and break and re-form, endlessly, pointlessly, patient beyond patience. For hundreds of millions of years, that is the entire story: chemistry that goes nowhere.`
- `Watch it churn. Bonds make and unmake, shapes gather and dissolve — a restlessness with no direction and no memory, each molecule forgetting the last. Nothing here is alive. Nothing here is even trying. It is only chemistry, doing what chemistry does, for an unimaginably long time.`

### Cue 7 — replicator (THE HINGE — full weight)
`scene: soup` · `direct: { phase: 'replicator', shot: 'MACRO_PUSH' }` · **hold: 8**

Data: —

- `And then, once, in all that churning, something different. A molecule assembles that happens to be a template for itself — it pulls the loose parts of the pool into its own shape, and makes a copy. That is all. But that is everything. Because now there are two, and both of them can do it again.`
- `Then a threshold, crossed quietly and only once. A molecule forms with a shape that copies itself: it lines up the scattered pieces of the soup along its own body and lets them lock into a second molecule just like it. Chemistry that merely happened has become chemistry that persists — and nothing in the universe was ever the same after.`
- `Somewhere in the endless reshuffling, a pattern appears that can print itself. Not designed, not intended — stumbled into, the way a key is eventually cut that fits a lock. But this pattern makes another of itself, and that one makes another, and a line begins that has not been broken from that day to this. Every living thing you will ever see is a continuation of that first copy.`
- `Here is the hinge of the whole series, and it is almost too quiet to notice. One molecule, in one pool, on one world, copies itself. Before it, chemistry forgot everything. After it, chemistry remembers — because the copy carries the pattern forward, and forward, and forward. This is the moment the world stops being only geology.`

### Cue 8 — selection (evolution as arithmetic)
`scene: soup` · `direct: { phase: 'selection', shot: 'MACRO_ORBIT' }` · **hold: 7**

Data: —

- `The copies are not perfect. Every so often one comes out slightly wrong — and a wrong copy that happens to copy faster, or hold together longer, leaves more descendants than its neighbours. Do that for a million generations and the pool fills with the best copiers. No one is choosing. It is only arithmetic.`
- `Copying makes mistakes, and mistakes are the point. Most are useless. But now and then an error copies a little better than the original — and better copiers, by definition, make more copies. The pool tilts, generation by generation, toward whatever works. That tilt has a name. It is called evolution, and it is nothing more than counting.`
- `Nothing here has a will. But imperfect copies compete for the same loose parts, and the ones that gather those parts fastest simply come to outnumber the rest. That is the entire mechanism — variation, then a race for materials, then more of the winner. Stated plainly, with no mystery left in it: the better copier wins, and there is more of it tomorrow than there was today.`

### Cue 9 — membrane (the first self)
`scene: soup` · `direct: { phase: 'membrane', shot: 'MACRO_PUSH' }` · **hold: 7**

Data: —

- `Then oil does what oil does in water: it beads. A film of it closes into a bubble — and for the first time in the history of the universe, there is an inside and an outside. A wall between a small pocket of chemistry and everything else. The first boundary. The first faint idea of a self.`
- `Among the products of the soup are molecules with two faces — one that loves water, one that flees it. Crowded together, they have only one stable answer: curl into a sphere, wet side out, and seal. A membrane. Suddenly the pool has edges in it, each one dividing me from not-me for the very first time.`
- `A droplet of oil wraps itself shut, and something unprecedented exists — a here and a there. Whatever chemistry is caught inside that bubble is now, however slightly, protected, concentrated, its own. It is not alive yet. But it is separate, and separateness is where a self has to begin.`

### Cue 10 — cell (metabolism begins)
`scene: soup` · `direct: { phase: 'cell', shot: 'MACRO_ORBIT' }` · **hold: 7**

Data: —

- `Now put the two together. A replicator, sealed inside a membrane, drawing the chemistry of the pool in through its wall to build more of itself. It copies. It feeds. It holds a border against the world. That is a cell — the first one — and every living thing that has ever existed is a version of it.`
- `The copier finds itself inside the bubble, and the bubble becomes a machine. It takes in raw material from the water, spends it to make more copies and more wall, and keeps its inside different from its outside. Copying, feeding, maintaining — that combination is what we mean by the word alive. On this shore, matter has just become the first cell.`
- `A wall around a copier that eats. Say it that simply. But eating means running chemistry on purpose, to a pattern, to stay in one piece against a universe that wears everything else down — and that is metabolism, the engine that has run in every cell without stopping for as long as there has been life. It starts here, in one bubble, in this pool.`

### Cue 11 — split (Ep3 SEED — keep it a whisper, but plant it)
`scene: soup` · `direct: { phase: 'split', shot: 'MACRO_DRIFT' }` · **hold: 7**

Data: —

- `From that first cell, the line divides — and how it divides decides the rest of this series. Most of its descendants will spend the coming ages learning to build: walls, then bodies, then the whole tree of life we are about to climb. But a few take the other road. They never build a body at all. They stay small, and simple, and learn instead to live inside the ones that did. Remember them. We will not see them again for a long time.`
- `Two ways out of the soup, and the world takes both. Down one road: cells that cooperate, specialise, and eventually assemble into everything large enough to have a name — the lineage this episode follows to its end. Down the other, quieter road: cells that give all of that up, keep almost nothing, and make their entire living inside another cell's wall. That second road leaves this story now. It is not gone. It is waiting.`
- `The tree of life has a root, and here it forks. One branch reaches upward — toward membranes that cooperate, toward bodies, toward the creatures and forests still to come. The other branch reaches inward: cells that never grow large, that shed everything they can and survive by borrowing what a neighbour built. We follow the first branch for the whole of this episode. The second one has its own story, and it has been patient. Keep it in the back of your mind.`
- `And in the same pool, a division we will barely mark today. Most cells are on their way to becoming bodies. A handful are on their way to becoming passengers — parasites, keeping only what they need to get inside another cell and let it do the work. One warm shore; two futures. Only one of them is the story of the visible world. The other is the story of what lives inside it — and that is for another time.`

### Cue 12 — mats (first visible life; bridge up to deep time)
`scene: soup → surface` · `direct: { phase: 'mats', shot: 'RISE_REVEAL' }` · **hold: 7**

Data: —

- `And then there are not two cells, or a thousand, but numbers the pool can no longer hold apart. They spread across the wet rock in their billions until the shallows change colour — a stain you could see from orbit. This is the first life large enough to be visible from space. Now hold this shore in your eye, because time is about to move.`
- `Copying has one inevitable result: more. The cells carpet the shallows, layer on layer, until the bare rock of the coastline is washed in the colour of living things. From up here it reads as a smear along the water's edge — but that smear is the planet's first visible breath. Fix the frame. We are about to let two hundred million years run across it.`
- `A single cell, copied without pause, becomes a film, becomes a mat, becomes a shoreline of them — the first time this world wears life on the outside where the sky can see it. That coloured margin is the whole of biology so far. Keep your eyes on this exact stretch of coast. Everything after this is just time, and what time does to a living shore.`

---

## NO-LIFE GATE · `scene: system` (plays INSTEAD of the episode when `cosmos.livingWorlds` is empty)

Honest and dignified, not an error. Built from each planet's real data. Voice
should match Episode 1's dead-system close (`narration.js` lines 230–240) —
this is the same register, extended into its own short branch.

### Cue G1 — the verdict (no world cleared)
`scene: system` · `direct: { phase: 'survey', shot: 'LOCKED_WIDE' }` · **hold: 8**

Data: `${star.name}`, `${planets.length}`

- `This universe finished forming, and cleared no world for life. ${star.name} holds ${planets.length} planets, and not one of them can hold a living thing. That is not a fault in the machine. It is the machine working, and returning the answer it returns most often: no.`
- `We ran the whole story — the fire, the stars, the elements, the ${planets.length} worlds that condensed around ${star.name} — and it ended in silence. Understand that nothing went wrong here. A universe with no life in it is not a broken universe. It is the ordinary one.`
- `Here the door never opens. ${star.name} and its ${planets.length} worlds are complete, and every one of them is dead. Before we leave, we owe this system the courtesy the last one got: not to look away, but to read exactly why.`

### Cue G2 — walk the worlds, read each real reason
`scene: system` · `direct: { phase: 'survey', shot: 'DOLLY_LATERAL' }` · **hold: 6**
(Loops once per planet; per-iteration tokens `${planet.name}`, `${planet.ruledOut}`.)

- `Take them one at a time. ${planet.name}: ruled out, because ${planet.ruledOut}. No argument, no near miss — just a fact the world could not get around.`
- `${planet.name}, and its reason, in its own data: ${planet.ruledOut}. The checklist for life is short and it is absolute, and this world failed it exactly there.`
- `Then ${planet.name}. What closed the door here was simple — ${planet.ruledOut}. Read it and move on; the world cannot.`

### Cue G3 — this is the ordinary outcome
`scene: system` · `direct: { phase: 'survey', shot: 'SLOW_ZOOM_HOLD' }` · **hold: 7**

Data: —

- `None of that is bad luck. A universe does not aim at life; it aims at nothing at all. It simply runs its rules, and the rules produce empty worlds far more easily than they produce a single living one. Silence is not the exception here. Silence is the baseline.`
- `This is what the cosmos does almost everywhere, almost always. Life is the rare accident, not the intended result — and a universe indifferent to whether anyone is watching will pour out a thousand sterile worlds for every shore that ever wakes up. You are looking at the common case.`
- `Do not read tragedy into it. There is no one here for it to be a tragedy for — that was rather the point. The same blind rules that could have built a living world simply, this time, did not. Far more often than not, they don't. That is the honest shape of things.`

### Cue G4 — the rules are the same everywhere (reroll invite)
`scene: system` · `direct: { phase: 'survey', shot: 'PULL_BACK' }` · **hold: 6**

Data: —

- `But the rules that failed here are the same rules everywhere. A different cloud, a different star, a different roll of the same chemistry, and the answer could come back the other way. That universe exists. It is simply not this one. Shall we begin another?`
- `Nothing here was rigged against life; it just didn't fall that way. And the beauty of a rule is that it can be run again. Another cloud, another collapse, another star switching on — and somewhere in the next roll, a warm shore that does wake up. Begin again, and let's find it.`
- `The story is not over — only this telling of it. The same fire, the same gravity, the same handful of elements are waiting to be dealt a different hand. Give me one more cloud, and we will run the whole thing from nothing, and see whether this time the door opens.`

---

## Consolidated token list (Acts 1–2 + gate)

Every `${token}` used above, with what it must render as. All are read off the
sim for the viewer's seed — none is hardcoded. Names chosen to sit alongside
Episode 1's existing `describe()` contract (`cosmos.describe()` returns
`star.name`, `planets[].name`, `planets[].tempC`, `planets[].water`,
`planets[].ruledOut`, `topElements`, `living`, etc.).

| Token | Renders as | Source in `cosmos.describe()` / world |
|-------|-----------|----------------------------------------|
| `${world.name}` | The living world's full name (e.g. "Kepler-adjacent III" style `world.full`) | `describe().living[0]` / `livingWorlds[0].world.full` |
| `${star.name}` | The host star's name | `describe().star.name` |
| `${world.tempC}` | Integer surface temperature in Celsius | living planet's `tempC` |
| `${world.waterState}` | The word for water's phase, here always the liquid case — render as `liquid` (or "standing on the surface") | living planet's `water` |
| `${world.air}` | Short adjective/phrase for atmosphere thickness, e.g. `thick` / `dense enough` — an air-density descriptor derived from atmosphere opacity·thickness | derived from living planet's atmosphere (opacity·thickness), same proxy `genome.js` uses for `air` |
| `${budget.topElements}` | Prose list of the dominant non-H/He element **names**, e.g. "Carbon, Oxygen and Silicon" (Ep1's `list(elementRoll(cosmos))`) | `describe().topElements` filtered of H/He, first ~3, joined with `list()` |
| `${planets.length}` | Count of planets in the system (gate only) | `describe().planets.length` |
| `${planet.name}` | Per-iteration planet full name (gate G2 loop) | `describe().planets[i].name` |
| `${planet.ruledOut}` | Per-iteration real reason the world failed, as a lowercase clause (Ep1's `chem.ruledOutBecause[0]`) | `describe().planets[i].ruledOut[0]` |

Notes for the assembler:
- `${world.waterState}` is written into sentences expecting the liquid case
  ("water that stays ${world.waterState}"). Since the gate handles the dead
  branch, on the Episode-2 path this is always `liquid`; render accordingly.
- `${world.air}` needs to read as a bare adjective in cue 2 ("Air ${world.air}
  enough to hold it down" / "${world.air} air pressing it flat"). Coin it as a
  thickness word, not a number. If the contract prefers a numeric air token,
  swap the phrasing to "Air, at ${world.airPct} of Earth's, thick enough…".
- Gate G2 is a loop, mirroring Episode 1's per-planet `for` block; its three
  variants are meant to be `pick(...)`-ed **inside** the loop so consecutive
  worlds don't all read identically.
- All shot names are provisional suggestions for the cinematographer's ledger,
  not commitments. I deliberately spread across MACRO_ORBIT / MACRO_PUSH /
  MACRO_DRIFT / DESCENT / WATER_LEVEL / RISE_REVEAL (Act 1–2) and
  LOCKED_WIDE / DOLLY_LATERAL / SLOW_ZOOM_HOLD / PULL_BACK (gate), but several
  land at 2 uses within my own range (MACRO_ORBIT ×2, MACRO_PUSH ×3,
  MACRO_DRIFT ×3) — **these will need the cinematographer to reassign**, since
  Act 2's abstract macro register naturally wants the same few moves. Flagging
  it rather than silently overrunning the ≤2 budget.

---


Author: Dialogue-B agent. Keyed to `SKELETON.md`. Every derived fact is a
`${token}`; nothing is hardcoded. Each cue carries ≥3 genuinely distinct
spoken variants, all equally true, in the shipped Episode 1 voice. `hold` is
the minimum dwell in seconds. Content-side `direct` hints (era/site/event/
focus) are included per the skeleton; `shot` assignment is deliberately left
to the cinematographer (camera-rule ledger is theirs).

A note on the derivation cues (21, 23, 25, 30, 32): the narrator proves the
body from the planet's numbers. The line reads the input number off the world
and the output measurement off the animal, and puts the arrow between them out
loud. That arrow is the code in `genome.js`. Those five cues are the episode's
signature — they are written to *land*, not to gloss.

---

## ACT 3 — FAST-FORWARDS (cues 13–19) · scene: `surface`, locked site, era dial

### Cue 13 — era 0 · sterile
`direct: { era: 0, phase: 'sterile', focus: 'valley' }` · **hold: 6**

> **V1.** This is the same shore we landed on — bare rock, an empty sea, a raw
> sky, and not one living thing in any of it. Fix the frame in your mind. Two
> hundred million years is nothing to a world like this. Watch.

> **V2.** Here is the valley, sterile. No green, no motion but the water, no
> sound that anything made. Hold this picture — the coastline, the rock, the
> line of the sea. We are about to run the clock, and only one thing in the
> frame will change.

> **V3.** Look at it while it is still empty: raw stone, standing water, and
> the same sky the chemistry breathed under. Deep time is about to pass across
> this exact place. The camera will not move. Everything else will.

---

### Cue 14 — era 1 · stained (the trick lands — identical frame)
`direct: { era: 1, phase: 'stained', focus: 'valley' }` · **hold: 6**

> **V1.** The mats have reached the shore. Colour is bleeding into the
> shallows and along the wet rock — and nothing else in the frame has stirred.
> Same stone. Same sea. The place is simply alive now.

> **V2.** Watch the water's edge. That stain is the soup, arrived at the
> surface in its billions. We did not move the camera and we did not cut away.
> The valley you were just looking at has been colonised without a single
> other thing changing.

> **V3.** There. The wet rock has taken on a colour it did not have a moment
> ago. That is life you could see from orbit — and it crept in under a locked
> frame, so you would have to believe it. Same shore. Now stained.

---

### Cue 15 — era 2 · greening (new shot of same valley)
`direct: { era: 2, phase: 'greening', focus: 'valley' }` · **hold: 6**

> **V1.** Now it climbs out of the water. Ground cover crawls up from the tide
> line onto bare stone — the first ${flora.groundColor} to hold the land at
> all. Life has left the sea's edge and started to take the rock.

> **V2.** The stain does not stay in the shallows. It creeps uphill, a
> ${flora.groundColor} film spreading off the water and onto dry ground,
> because anything that can copy itself and catch the light will go wherever
> the light is. And the light is everywhere.

> **V3.** Same valley, a new angle on it — and a new colour. Low cover is
> working its way up from the sea, turning wet rock to ${flora.groundColor}.
> The land, for the first time, is being lived on.

---

### Cue 16 — era 3 · rooted
`direct: { era: 3, phase: 'rooted', focus: 'flora' }` · **hold: 7**

> **V1.** Then life stands up off the ground. The first true plants take
> root — sparse at first, ${flora.dominant} finding a footing — and then, in a
> breath of deep time, a forest closes over the whole valley.

> **V2.** Flat cover is not the end of it. Something reaches upward for the
> light and beats its neighbours to it, and once one plant stands, they all
> must. ${flora.dominant} rises across the slopes until the bare valley is
> roofed in living tissue.

> **V3.** Now the valley grows a third dimension. Roots go down, stems go up,
> and ${flora.dominant} spreads until what was raw stone is a standing forest.
> Every stalk of it was assembled from the same water and rock we watched come
> alive — nothing was brought in.

---

### Cue 17 — era 4 · first movers
`direct: { era: 4, phase: 'firstmovers', focus: 'fauna' }` · **hold: 6**

> **V1.** And then something moves that is not the wind. Small, low, close to
> the ground — the first animals, feeding on the forest that fed on the light.
> Tentative. But it moves on its own account.

> **V2.** Watch the undergrowth. There — and there. The first movers: little
> things, swarm-scale, no bigger than they have to be, testing a world that
> has never had to be tested. Life has learned to go and get its food instead
> of waiting for it.

> **V3.** Up to now everything in this valley has stayed where it grew. No
> longer. The first fauna appear — small, wary, near the ground — and for the
> first time the valley contains something that can decide to be somewhere
> else.

---

### Cue 18 — era 5 · full roster
`direct: { era: 5, phase: 'fullroster', focus: 'fauna' }` · **hold: 7**

> **V1.** Now the cast arrives in waves. Grazers, then the things that hunt
> them, then the things that clean up after both — ${species.count} species in
> all, until the valley is as crowded as it will ever be. And every one of
> them was folded out of that first stain. Nothing was added from outside.

> **V2.** Wave on wave, the roster fills: ${species.count} kinds of animal,
> each one a different answer worked out from the same starting chemistry.
> Rewind it and you would find no seam, no import, no outside hand — only era
> one, run longer.

> **V3.** The full roster, at full number: ${species.count} species sharing
> one valley. It looks designed. It was not. It is what you get when a single
> pool of self-copying chemistry is left alone with the light for long enough,
> and it is all descended from the colour we watched creep up the shore.

---

### Cue 19 — era 5 · pull back, turn toward the tour
`direct: { era: 5, phase: 'reveal', focus: 'world' }` · **hold: 7**

> **V1.** And this is one valley. Pull back. The same deep time has been
> running everywhere at once — ${zones.count} climates on this single world,
> ${zones.list}, each with its own life built to its own conditions. We have
> been watching one shore of a whole living planet.

> **V2.** Now widen out, because this crowded coast is not the world — it is a
> corner of it. ${world.biome} here; something else over every horizon.
> ${zones.count} distinct zones, one planet, and the same rules ran in all of
> them. Let us go and see the others.

> **V3.** Hold that valley in your mind and then let it shrink, until it is one
> patch of green on a globe that has ${zones.count} kinds of climate on it at
> once. ${zones.list} — every one alive, every one different. The tour of a
> living world starts now.

---

## ACT 4 — THE CHAIN (cues 20–35) · one unbroken thread

Narrator thread across the whole act: **nothing here happens alone.** Each cue
is introduced by the *consequence* of the previous creature's action; the
camera is handed off, never cut arbitrarily.

### Cue 20 — coast · thesis of the act
`direct: { site: 'coast', focus: 'ecosystem' }` · **hold: 7**

> **V1.** Start on the coast, at rest. Warm shallows, a long tide line, the
> forest at its back. It looks like a set of separate lives minding their own
> business. It is not. On this world — on any living world — nothing happens
> alone. Watch one thing move, and follow what it touches.

> **V2.** This is the coastal zone, calm for the moment. Remember that word —
> *for the moment*. Everything you are about to see is a single chain of cause
> and effect, and it begins here, quietly, before anything has been disturbed.

> **V3.** Come down to the shore. Peace, of a kind: grazers, fliers, the
> hunters that price them all, laid out along the water as if none of them had
> anything to do with the others. Every one of them has everything to do with
> the others. Let me show you how tightly. It starts with the first thing to
> take fright.

---

### Cue 21 — coast · meet species A (flock) · DERIVE flight from air
`direct: { site: 'coast', focus: 'speciesA' }` · **hold: 8**

> **V1.** Meet ${A.name}, working the shallows in a flock. And look at the
> wings — because the air here decided them. This atmosphere is thin;
> ${world.air} is all the density there is to push against. Thin air gives poor
> lift, and poor lift has one answer: more wing. To carry a body this size,
> ${A.name} needs ${A.wingSpan} of span. The planet did the arithmetic; the
> animal is the result.

> **V2.** ${A.name}, on the water in numbers. That it flies at all is a fact
> about the air, not about ambition — below a floor of density nothing can be
> honestly lifted, and this world sits only just above it, at ${world.air}. So
> the wings are enormous: ${A.wingSpan} across, beating slowly, ${A.flapHz}
> times a second, to claw altitude out of an atmosphere that barely gives any.
> Thin air, huge wings. It is a rule, and here is the rule made flesh.

> **V3.** Watch the flock. Every one of those wingspans — ${A.wingSpan} of
> it — is the same equation solved out loud. Lift is air times wing area times
> speed; the air is fixed and thin, at ${world.air}; the body must be held up
> regardless. Rearrange it and the wing has to be this big. Give the same bird
> a thick sky and it would need half the span. This sky, it needs all of it.

---

### Cue 22 — event: startle-flock
`direct: { site: 'coast', event: 'startle-flock', focus: 'speciesA' }` · **hold: 5**

> **V1.** Then something spooks them — and the whole flock leaves the water as
> one body, a single sheet of wings tearing upward off the shallows. The first
> domino has fallen.

> **V2.** And there it goes. One alarm runs through the flock faster than any
> of them could think, and ${A.name} erupts off the water in a single motion,
> a thousand wings acting as one. Watch where it sends them.

> **V3.** All it takes is a shadow. The flock detonates off the surface at
> once — not a thousand decisions but one, sweeping up and inland. Nothing
> that big moves without pushing on something else.

---

### Cue 23 — coast · meet species B (herd) · DERIVE legs from gravity
`direct: { site: 'coast', focus: 'speciesB' }` · **hold: 8**

> **V1.** The wall of wings sweeps inland — straight over a herd of ${B.name},
> grazing. And now gravity takes its turn to speak. This world pulls at
> ${world.gravity} gravities, and a body must be held up on legs against it.
> Weight climbs with the cube of size; bone strength only with its
> cross-section — so the legs come out thick, ${B.legRad} across at the bone.
> Look at them. The planet left the animal no choice.

> **V2.** Inland, the panic reaches ${B.name} — a grazer built by weight. A
> leg is two things at once: a pillar and a pendulum. As a pillar it carries
> ${world.gravity} gravities of load, which is why it is ${B.legRad} thick and
> not a delicate thing. As a pendulum it sets the gait — a short heavy leg
> swings fast, so this herd runs at ${B.gaitHz} strides a second whether it
> wants to or not. Physics picked the walk before the animal was born.

> **V3.** Meet ${B.name}, a herd of them, directly in the flock's path. Every
> proportion of those legs is gravity's signature. At ${world.gravity}
> gravities, a ${B.legLen} leg has to be ${B.legRad} at the bone or it snaps
> under its owner — mass goes as the cube, strength only as the square, and the
> gap between them is exactly why big animals on heavy worlds stand on columns
> and not on reeds. There is no styling here. Only load.

---

### Cue 24 — event: spook-herd (stampede)
`direct: { site: 'coast', event: 'spook-herd', focus: 'speciesB' }` · **hold: 5**

> **V1.** The herd catches the flock's fear the way dry grass catches a spark —
> and breaks. Now it is not the air that is moving. It is the ground.

> **V2.** ${B.name} does not wait to learn what frightened the birds. The
> whole herd wheels and runs as one animal, and the coast that was still a
> moment ago is a stampede — tonnes of it, at ${B.gaitHz} strides a second,
> going the only way panic ever goes: forward.

> **V3.** Fear is contagious across the species line. The wingbeat overhead is
> enough; the herd bolts. Watch the second domino take the third — because a
> stampede this size is exactly what something else has been lying still,
> waiting for.

---

### Cue 25 — coast → scrub · meet species C (predator) · DERIVE from terrain/heat
`direct: { site: 'scrub', focus: 'speciesC' }` · **hold: 8**

> **V1.** The stampede is precisely what the stalker was built for. Meet
> ${C.name}, alone in the scrub — and read its body off the country it hunts.
> This ground is broken and hot, near ${C.tempC} degrees, and both facts are
> written on the animal. Rough terrain wants long legs and a wide stance, so
> its stride is ${C.legLen}; heat wants extremities that shed it, so the frame
> is drawn out long and lean, ${C.build}. A cold-world hunter of the same
> stock would be squat. This one is stretched. The climate stretched it.

> **V2.** ${C.name} has been motionless this whole time, because a hunter's
> whole economy is one accurate rush. Look at how the scrubland made it. The
> terrain is rough, so the legs are long — ${C.legLen} — and the stance is
> wide, for footing on bad ground. The air runs to ${C.tempC} degrees, so the
> body is long and thin, ${C.build}, all radiator, throwing off the heat a
> sprint dumps into it. Every line of it is terrain and temperature, solved.

> **V3.** Now the predator. ${C.name} waited in the scrub for exactly this
> panic, and its body is a map of where it waited. Broken ground gave it the
> ${C.legLen} legs and the planted, wide-set stance. A hunting climate near
> ${C.tempC} degrees gave it the long lean build — ${C.build} — because heat
> that cannot be shed is death mid-chase. It is not styled to look dangerous.
> It is shaped to not overheat, and that is the same thing here.

---

### Cue 26 — event: predator-commit (the chase, implied)
`direct: { site: 'scrub', event: 'predator-commit', focus: 'speciesC' }` · **hold: 5**

> **V1.** And it commits. One rush, everything spent at once — and then dust
> and broken ground take it, and we lose them both behind the ridge. We do not
> need to see it. We know how it ends.

> **V2.** There is no second attempt in that body, so it does not hesitate. The
> stalker breaks cover and the chase folds into the dust of the herd's own
> making. Let it resolve out of sight. This is a documentary about how the
> world works, not a thing to watch bleed.

> **V3.** It goes — low, flat, all of it at once. The stampede and the hunter
> disappear into the same cloud of grit, and the story finishes where we cannot
> follow. When the dust settles, one animal will be down. Watch instead what
> that draws.

---

### Cue 27 — scrub · meet species D (swarm)
`direct: { site: 'scrub', focus: 'speciesD' }` · **hold: 7**

> **V1.** The kill calls the swarm. ${D.name} rises out of the ground in its
> thousands — ${D.count} to a cloud, each one barely ${D.size} across — because
> on a living world nothing edible is ever wasted, and the smallest mouths are
> always the most numerous. What the hunter could not finish, these will.

> **V2.** And here is what the dust was hiding: ${D.name}, boiling up out of
> the soil the instant there is death to feed on. Singly they are nothing,
> ${D.size} of body apiece. Together they are ${D.count} strong and they will
> reduce the kill to bare ground. Life eating life eating light — and not a
> gram of it thrown away.

> **V3.** No carcass lasts long here. The scent of the kill pulls ${D.name} up
> in a living haze, ${D.count} of them, none larger than ${D.size}. This is the
> chain's quiet arithmetic: the big animal fed the hunter, the hunter's leavings
> feed the swarm, and the swarm is about to feed the wind.

---

### Cue 28 — event: swarm-rise (column climbs toward ridge)
`direct: { site: 'scrub', event: 'swarm-rise', focus: 'speciesD' }` · **hold: 6**

> **V1.** Sated, the swarm lifts — and the warm ground gives it a road. A
> column of them rides the updraft upward, off the coast entirely, climbing
> toward the ridge. The camera goes with it.

> **V2.** Then the whole cloud rises as one, caught on the heat coming off the
> baked scrub, and it stacks into a column that leans against the ridge and
> climbs it. Follow that column. It is about to carry us out of this world and
> into another one — on the same planet.

> **V3.** Warm air rises, and the swarm rises on it, spiralling up in a column
> that clears the coastal plain and reaches for the high ground. Stay with it.
> Where it is going, the rules are the same and the answers are completely
> different.

---

### Cue 29 — ridge · RIDGE_CROSS · new biome, same rules (load-bearing)
`direct: { site: 'ridge', focus: 'ecosystem' }` · **hold: 8**

> **V1.** Over the ridge — and everything changes but the physics. This is
> still the same world, the same seed, the same handful of laws. But up here
> the air is thinner and the cold is real, and that is a different set of
> numbers fed into the same machine. Same rules, run in a harder place, build
> something else. Watch what they build.

> **V2.** Cross the ridge and you cross a border no map drew — a border of
> climate. Behind us, the warm coast. Ahead, ${zones.list} — colder, higher,
> lit the same but held to a different temperature. Nothing about the rules has
> changed. Everything about the answers is about to. That is the whole point of
> a living world: one law book, many worlds inside the world.

> **V3.** The column tips us over the top, and the coast is gone. New country:
> high, thin-aired, cold. Understand that we have not left the planet — we have
> only moved to where its numbers read differently. Feed a colder temperature
> and a higher altitude into the same body-building rules, and out comes a
> creature the coast could never have grown. Here it is.

---

### Cue 30 — highland · meet species E · DERIVE cold (Allen's rule)
`direct: { site: 'highland', focus: 'speciesE' }` · **hold: 8**

> **V1.** Meet ${E.name}, of the high cold. And now temperature takes the
> chisel. It runs to ${E.tempC} degrees up here, and cold has one commandment:
> lose less heat. So the body is pulled inward — round and compact, ${E.bodyRad}
> through the torso where the coast's animals are lean — and every extremity is
> cut short, ${E.legLen} legs, a stubbed neck, because anything that sticks out
> is heat thrown away. ${E.coat} The planet left it no choice but to hoard
> warmth, and this is the shape of hoarding.

> **V2.** ${E.name} is the same kind of life we met on the shore, built under a
> colder number, and the difference is Allen's rule made visible. Surface loses
> heat; volume keeps it; so a cold-world animal minimises the first and maximises
> the second. The result stands in front of you: a rounded ${E.bodyRad} torso,
> short ${E.legLen} legs, everything tucked in close, at ${E.tempC} degrees.
> ${E.coat} Nothing here is for looks. It is all for the second law of
> thermodynamics.

> **V3.** Here is what the cold builds. At ${E.tempC} degrees, a long lean body
> would bleed its warmth into the air and die of it, so ${E.name} is the exact
> opposite of the coastal hunter — compact, ${E.bodyRad} at the barrel, legs cut
> down to ${E.legLen}, extremities pulled in tight. ${E.coat} Same starting
> stock as the shore. A different thermometer. That thermometer is the whole
> reason it looks like this.

---

### Cue 31 — event: highland-link (E → F, biome-native)
`direct: { site: 'highland', event: 'highland-link', focus: 'speciesE' }` · **hold: 5**

> **V1.** And the thread does not break at the ridge. ${E.name} moves off, and
> its moving flushes something larger from the high ground — the chain has
> found its next link, native to this cold country, and it hands us on.

> **V2.** Watch: nothing up here happens alone either. The herd shifts, and the
> shift startles a bigger body out of cover further up the slope. Same grammar
> as the coast, played in a colder key. Follow it.

> **V3.** Even here, one life pulls the next. As ${E.name} climbs, it disturbs
> the ground ahead, and up out of that disturbance comes the last of our
> principals. The coast handed us to the highland; the highland now hands us on.

---

### Cue 32 — highland → interior · meet species F · DERIVE signature feature
`direct: { site: 'interior', focus: 'speciesF' }` · **hold: 8**

> **V1.** And meet the last of them: ${F.name} — a body plan unlike anything on
> the coast. Where the others were built low, this one is built tall. Look at
> the neck: ${F.neckLen} of it, reaching for food nothing else can touch, on a
> frame ${F.size} at the shoulder standing over ${F.legCount} legs. The same
> rules that made a stub-necked animal in the cold made a long-necked one where
> the food grew high. The lever the world hands out depends on where it hides
> the reward.

> **V2.** The chain ends on ${F.name}, and it is worth ending on — because it is
> the most extreme answer this world wrote. ${F.legCount} legs under a body
> ${F.size} across, carrying a neck ${F.neckLen} long. That neck is not
> decoration; it is reach, and reach is worth a great deal wherever the browse
> is tall and the competition is short. Different problem, same solver, wildly
> different shape.

> **V3.** Last, and least like the rest: ${F.name}. Everything about it is that
> ${F.neckLen} neck and the ${F.legCount}-legged tower that holds it up, ${F.size}
> at the shoulder. On the coast, being low paid. Here in the interior, being
> tall pays — so the identical rule book, read against a different landscape,
> produced this. One world. One set of laws. And bodies this far apart.

---

### Cue 33 — interior · light turning (dusk)
`direct: { site: 'interior', phase: 'dusk', focus: 'ecosystem' }` · **hold: 7**

> **V1.** And then the chain slows, and the light goes long and gold. The day's
> violence is spent — the chase, the stampede, the swarm, all of it behind us
> now. The world exhales toward evening.

> **V2.** The links come further and further apart, until they stop. Dusk. The
> low sun turns the whole interior amber, and everything that ran today stands
> quiet. Nothing is chasing anything now. Watch a living world let go of a day.

> **V3.** Evening reaches the high country. The gold comes in low and long, and
> the frantic arithmetic of the afternoon settles into stillness. The chain has
> carried us across the whole world; here, at last, it rests.

---

### Cue 34 — vista · WIDE_ECOSYSTEM · the scope reveal
`direct: { site: 'vista', focus: 'world' }` · **hold: 8**

> **V1.** Now pull all the way out, and hold the whole thing in one frame at
> once. Every biome we crossed — coast, scrub, highland, interior — ${zones.count}
> climates, ${species.count} species, one web. This is what grew from a single
> warm pool. Not a set of separate stories. One story, with this many characters.

> **V2.** Let the lens go wide enough to take in everything we walked through.
> ${zones.count} zones on one planet, ${species.count} kinds of life stitched
> together by exactly the chain we just followed. From up here you cannot see
> where one ecosystem ends and the next begins, because — in truth — they don't.

> **V3.** Widen out to the whole living web. ${species.count} species across
> ${zones.count} climates, every one of them connected to every other by
> something eating, fleeing, feeding, or falling. We traced one thread through
> it. There are more threads than there are creatures. This is the world entire.

---

### Cue 35 — vista · event: settle (equilibrium)
`direct: { site: 'vista', event: 'settle', focus: 'ecosystem' }` · **hold: 6**

> **V1.** And come to rest on one quiet thing. A herd bedding down in the last
> light; the flock drifting back to roost over the water. The web at
> equilibrium — not still, never still, but balanced. Tomorrow it runs again.

> **V2.** Settle on a single calm corner of it: animals folding down into the
> dusk, the day's chain wound all the way out. Nothing is happening, which on a
> living world is its own kind of event — the moment the balance holds.

> **V3.** Let it end gently. Somewhere in the frame a herd lies down; somewhere
> a flock comes home. This is what all that violence is *for* — a world that
> keeps running, night after night, in balance with itself. Watch it breathe.

---

## ACT 5 — CLOSE (cues 36–38)

### Cue 36 — one system, indivisible
`direct: { focus: 'world' }` · **hold: 8**

> **V1.** Every creature you have met tonight, every biome we crossed, the
> forests and the swarms and that impossible neck — all of it grew from one
> warm pool of chemistry on ${world.name}. One system. You cannot take a piece
> of it out and have the piece, or the rest, still make sense.

> **V2.** Remember where this started: a stain in the shallows. Everything since
> — ${world.name} entire, coast to cold cap — is that same chemistry, elaborated
> and elaborated until it could run itself. It is not many things. It is one
> thing, indivisible, wearing a great many shapes.

> **V3.** Step back once more and see it whole. ${world.name} is not a planet
> with life on it. It is a planet that turned part of itself into life and never
> stopped — one continuous system, from the first replicator to the last herd
> lying down in the dark. There is no seam anywhere in it. We looked.

---

### Cue 37 — the two lineages · Ep3 seed (load-bearing callback)
`direct: { focus: 'world' }` · **hold: 8**

> **V1.** But cast your mind back to the soup, to the moment the first cell
> formed — because two lineages left that pool, not one. One built bodies, and
> became everything we have spent this hour with. The other never built a body
> at all. It stayed small, and hidden, and it learned to live *inside* the
> first. It is here right now, in every creature on this world. You simply
> cannot see it.

> **V2.** There is one thread we let go of, back at the beginning, and it is
> time to pick it up. When the lineage split, most of it went on to make the
> visible world. A sliver of it did not. It gave up on bodies and moved into
> them instead — into the grazers, the fliers, the hunters, all of them. Two
> kinds of life came out of that warm pool. We have shown you one. The other has
> been inside the frame this whole time.

> **V3.** Everything tonight has been the lineage you can see. But remember the
> whisper in the soup — the copies that never became creatures, that stayed
> parasitic, that made their living within other lives. They did not fail. They
> chose a different door, and it led straight into the bodies of everything
> here. One living world. Two lineages. And only one of them has taken a bow.

---

### Cue 38 — handoff to Episode 3 (+ reroll invite)
`direct: { focus: 'world' }` · **hold: 6**

> **V1.** And somewhere on this world, among all these lives, something is about
> to do the strangest thing chemistry has ever done — it is about to start
> asking questions about itself. That story is Episode 3. Or take a new seed,
> and begin a whole world over.

> **V2.** The chain is not finished. On ${world.name}, one of these lineages is
> about to cross a threshold stranger than being alive — it is about to become
> aware that it is. Where that goes is the next episode. And the world it goes
> in is yours to choose: a new seed rolls a new one from nothing.

> **V3.** One threshold remains. Somewhere down there, life is about to look up
> and wonder what it is — and the unseen lineage is waiting for exactly that.
> That is where this story goes next. That story is Episode 3. When you are
> ready, roll another seed, and we will build you another world to find it in.

---

## Consolidated token list (every `${...}` used in cues 13–38)

Grouped by scope. All are read off the simulation for the viewer's seed; none
are hardcoded. Species letters map to the chain roster (A flock, B herd, C
solitary predator, D swarm, E highland principal, F interior principal) — the
choreographer agent owns the letter→species mapping; dialogue only names the
slot.

### World / planet scope
- `${world.name}` — the living world's name. (cues 36, 38)
- `${world.air}` — atmospheric density figure (the genome's `air` proxy,
  `atmosphere.opacity * (0.5 + 0.5*thickness/1.5)`), the number flight is
  derived against. (cue 21)
- `${world.gravity}` — surface gravity in "gravities" (g). The planetary
  constant the leg derivation reads. (cue 23) — *see assembler note 2.*
- `${world.biome}` — the leading/coastal biome name. (cue 19)

### Zone scope (multi-biome)
- `${zones.count}` — number of distinct climate zones on the world. (cues 19, 29, 34)
- `${zones.list}` — the named zones, prose-joined (e.g. "coast, scrub, highland
  and interior"). (cues 19, 29)

### Roster / census scope
- `${species.count}` — total species the world rolled, at full roster. (cues 18, 34)

### Flora scope
- `${flora.groundColor}` — the world's ground-cover colour word (this world's
  equivalent of "green"; from the flora/surface palette). (cue 15)
- `${flora.dominant}` — the dominant standing plant's name. (cue 16)

### Species A — coastal flock (flight derived from air)
- `${A.name}` — species name. (cues 21, 22)
- `${A.wingSpan}` — wingspan, metres (`genome.wingSpan`). (cue 21)
- `${A.flapHz}` — flap frequency, beats/sec (`genome.flapHz`). (cue 21)

### Species B — coastal herd (legs derived from gravity)
- `${B.name}` — species name. (cues 23, 24)
- `${B.legLen}` — leg length, metres (`genome.legLen`). (cue 23)
- `${B.legRad}` — leg/bone cross-section radius, metres (`genome.legRad`). (cue 23)
- `${B.gaitHz}` — gait/stride frequency, strides/sec (`genome.gaitHz`). (cues 23, 24)

### Species C — solitary predator (build derived from terrain + heat)
- `${C.name}` — species name. (cues 25, 26)
- `${C.tempC}` — local temperature, °C, at the predator's zone. (cue 25)
- `${C.legLen}` — leg length, metres (`genome.legLen`; roughness-lengthened). (cue 25)
- `${C.build}` — a short derived body-descriptor phrase for the heat-stretched,
  lean/radiator frame (from bodyLen vs bodyRad + snoutLen under `heat`), e.g.
  "long and lean" / "drawn out into a radiator". *See assembler note 3.* (cue 25)

### Species D — swarm
- `${D.name}` — species name. (cues 27, 28)
- `${D.count}` — individuals per swarm/cloud (`genome.count` / `spec.count`). (cue 27)
- `${D.size}` — body size, metres (`genome.size`). (cue 27)

### Species E — highland principal (Allen's rule from cold)
- `${E.name}` — species name. (cues 30, 31)
- `${E.tempC}` — highland temperature, °C. (cue 30)
- `${E.bodyRad}` — torso radius, metres (`genome.bodyRad`; cold-rounded). (cue 30)
- `${E.legLen}` — leg length, metres (`genome.legLen`; cold-shortened). (cue 30)
- `${E.coat}` — a coat clause derived from the `cold`/`shaggy` flags: when
  `genome.shaggy` (below freezing) resolve to something like "A shaggy coat,
  bleached toward the white of snow, seals the rest." — when not shaggy but
  cold, "The coat is thick and pale." — resolves to empty otherwise.
  *See assembler note 4.* (cue 30)

### Species F — interior principal (signature feature)
- `${F.name}` — species name. (cue 32)
- `${F.neckLen}` — neck length, metres (`genome.neckLen`). (cue 32)
- `${F.legCount}` — number of legs (`genome.legCount`). (cue 32)
- `${F.size}` — shoulder/body size, metres (`genome.size`). (cue 32)

---

## Assembler notes

1. **Voice / format.** Written to drop straight into the Episode 1 `pick(...)`
   pattern: each cue = one `say(pick(V1, V2, V3), { direct: {...}, hold })`. All
   three variants per cue are equally true and genuinely distinct attacks on the
   same beat (not word-swaps), per the ≥3 rule.

2. **`gravity` token.** The skeleton example wrote `${B.gravity}`; I used
   `${world.gravity}` because gravity is a planetary constant, identical for
   every species — scoping it to B would imply otherwise. If the data contract
   prefers per-species aliases, `B.gravity === world.gravity`. Only the *outputs*
   (legRad, legLen, gaitHz, wingSpan…) are species-scoped.

3. **`C.build` is a derived phrase, not a raw number.** genome.js has no single
   "build" field; the heat-stretched look is the ratio of `bodyLen` to `bodyRad`
   plus `snoutLen` under the `heat` term. Cleanest is for the data contract to
   expose one short descriptor token. If you'd rather keep it purely numeric,
   swap `${C.build}` for `${C.bodyLen}` long against `${C.bodyRad}` narrow and
   rephrase — but the descriptor reads better on camera.

4. **`E.coat` is conditional prose.** `genome.shaggy` is a boolean and `cold`
   bleaches the coat toward white in code. `${E.coat}` should resolve to a full
   sentence when shaggy, a lighter clause when merely cold, and to empty string
   when neither (so the line still scans). Handle it in the token resolver, not
   in the variant text, so all three variants stay clean.

5. **Chain continuity is load-bearing and lives in the *opening* clause of each
   Act 4 cue.** 21←20 calm, 22←flock, 23←"the wall of wings sweeps inland",
   24←caught fear, 25←"the stampede is precisely what the stalker was built
   for", 26←commit, 27←"the kill calls the swarm", 28←rises on updraft,
   29←column tips over the ridge, 30←new biome, 31←flushes F, 32←handed on. If
   any cue is cut or reordered, repair the handoff clause of the *following*
   cue so the thread stays unbroken.

6. **Signature derivation cues are 21, 23, 25, 30, 32** — all held at 8s to let
   the arrow land. Do not trim these below the animal reveal + the "the planet
   left it no choice" turn.

7. **`zones.list` register.** Written assuming a coast→scrub→highland→interior
   sweep, but the tokens don't hardcode those names — `zones.list` prose-joins
   whatever zones the world actually rolled. If a seed has only 2–3 zones the
   lines still read; if it has more, the join handles it (same `list()` helper
   Episode 1 uses).

8. Cue count delivered: 13–38 inclusive = 26 cues, ≥3 variants each. No cues
   1–12 and no gate (owned by other agents).
