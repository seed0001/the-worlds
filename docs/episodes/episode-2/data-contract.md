# Episode 2 — Data Contract + Science

Owner: Data-Contract + Science agent. This file is the map every `${token}` in
the Episode 2 script binds to. It has three parts:

1. **The data contract** — the exact shape of the `describe`-style object
   `buildEpisode2Script(cosmos, world)` reads, every token enumerated with type,
   source in the real engine, and a NEW flag for anything not yet built.
2. **A worked reference derivation** — concrete genome numbers for species A–F on
   a plausible living world, hand-run from `genome.js` and verified against the
   code, so writers/reviewers can check the on-camera derivation lines are true.
3. **The theoretical pathogen + soup chemistry** — the native replicator, the
   parasite that seeds Episode 3, and how soup cues 5–11 fall out of the element
   budget. Real chemistry reasoning, grounded in `chemistry/elements.js`.

Everything keys to the cue numbers in `SKELETON.md`.

---

## 0. Ground rules for token authors (dialogue agents read this)

- **Naming.** Match Episode 1 style. World facts: `${world.name}`,
  `${world.tempC}`, `${world.gravity}`, `${world.air}`, `${world.waterState}`,
  `${world.biome}`. System/gate facts stay on `${star.name}`, `${planets...}`
  exactly as Ep1's `cosmos.describe()` exposes them. Species facts:
  `${speciesA.wingSpan}` … `${speciesF.neckLen}` (A–F are stable role slots, see
  §1.5). Budget: `${budget.topElements}`, `${budget.biogenic}`.
- **Formatting is the script's job, not the token's.** The object carries raw
  numbers; the script rounds and unit-tags at the call site, exactly as Ep1 does
  (`p.tempC`, `mass.toFixed(2)`). Recommended presentations are in the tables.
- **Two consistency laws that keep the derivations true (see §1.6). Break either
  and a narration line becomes false on screen:**
  1. A line that says "this world pulls at `${world.gravity}` gravities, so look
     at the legs" MUST cite the **same** gravity the genome used —
     `world.gravity` (`= radiusMetres / 3e6`), **not** `chem.gravity` (which adds
     a core-density bump the body math never saw).
  2. A line that says "in air this thin the wings must span `${speciesA.wingSpan}`"
     MUST cite the **same** `air` the genome used — the derived
     `opacity·(0.5 + 0.5·thickness/1.5)`, exposed here as `world.air`, not the
     raw `atmosphere.opacity`.

---

## 1. THE EPISODE 2 DATA CONTRACT

### 1.1 The object shape

`buildEpisode2Script(cosmos, world)` receives the whole `cosmos` (for
system/gate facts, unchanged from Ep1) and the single living `world`
(`cosmos.livingWorlds[0].world`). It builds one description object, call it `d`,
by extending Ep1's `cosmos.describe()` with world-, zone-, era- and
genome-level facts:

```
d = {
  seed, star{}, planets[], living[],        // AS-IS from cosmos.describe()  (Ep1)
  world:   { … }                            // the living world, expanded    (§1.2.A)
  budget:  { topElements[], biogenic[] }    // pantry                        (§1.2.B)
  zones:   [ { … } ]                         // multi-biome                   (§1.2.C)  NEW
  era:     { dial, floraDominant, ... }      // deep-time dial                (§1.2.D)  NEW
  species: { A:{genome}, …, F:{genome},      // principal cast                (§1.2.E)
             count, roster[] }
}
```

The **genome sub-object for each of A–F is literally the return value of
`makeGenome(zoneWorld, spec, rng)`** (fauna/genome.js), where `zoneWorld` is the
living world viewed through that species' zone climate (§1.2.C). So every species
token already exists as a real field the renderer draws from — the script just
has to *call the function and read the field*. No new body math.

### 1.2 Token catalog

Type key: `str`, `num`, `bool`, `hex` (0xRRGGBB THREE.Color), `enum`, `arr`.
Source = which module/field derives it today. **NEW** = not producible yet;
"Build" says what must produce it.

#### A. World facts — `d.world`   (cues 1,2,19,29,34,36 + every derivation line)

| Token | Type | Value on ref world | Source | New? |
|---|---|---|---|---|
| `world.name` | str | `Kelune (…)` | `world.full` (World.js `makeName`) | existing |
| `world.biome` | str | `Temperate` | `world.biome.label` | existing |
| `world.tempC` | num | `15` | `chem.surfaceTempK − 273` (planetChemistry) | existing |
| `world.gravity` | num | `1.00` | `world.gravity = radiusMetres/3e6` (World.js) | existing |
| `world.air` | num | `0.36` | `opacity·(0.5+0.5·thickness/1.5)` — currently a **local var inside genome.js**, not a field | **NEW (expose):** lift the one-liner into a `world.air` getter so the number narration cites is the number the wings were built from |
| `world.waterState` | enum | `liquid` | `chem.waterState` (planetChemistry) | existing |
| `world.distanceAU` | num | `~1.1` | `chem.distanceAU` | existing |
| `world.radiusKm` | num | `3000` | `world.radiusMetres/1000` | existing |
| `world.peakMetres` | num | `~1200` | `terrain.amplitude·heightScaleMetres` (World.describe) | existing |

#### B. The pantry — `d.budget`   (cue 5; underpins all of Act 2 + §3)

| Token | Type | Value (ref) | Source | New? |
|---|---|---|---|---|
| `budget.topElements` | arr `{sym,name,pct}` | H, He, O, C, Ne, Fe… | `cosmos.budget.fractions.slice(0,6)` (Cosmos.describe) | existing |
| `budget.heavies` | arr str (top-3, no H/He) | Oxygen, Carbon, Iron | `elementRoll()` pattern from narration.js | existing (helper) |
| `budget.biogenic` | arr `{sym,name,pctOfCNOPS}` | O 62.9, C 26.0, N 7.6, S 3.4, P 0.06 | **filter `massBudget` to the CHNOPS set** | **NEW (helper):** small pure function over `cloud.abundances`; no engine change, just not exposed yet. Powers the "phosphorus is the bottleneck" beat |

#### C. Zones — `d.zones[]`   (cues 19,29,34 + supplies each species' climate)   **NEW — the long pole**

Today one planet = one biome, uniform. The Act-4 tour requires climate zones on
the **same** world. Each zone is a `{ key, label, climate, terrain, ground,
roster }` record; the tour visits them in chain order coast → scrub → ridge →
highland → interior.

| Token | Type | Value (ref) | Source | New? |
|---|---|---|---|---|
| `zones` | arr | 3–4 zones | — | **NEW** |
| `zones.length` | num | `3` | — | **NEW** |
| `zone.key` | str | `coast`/`scrub`/`highland`/`interior` | zone model | **NEW** |
| `zone.label` | str | `Coastal shallows`, `Arid scrub`, … | zone model | **NEW** |
| `zone.climate.tempC` | num | 15 / 35 / −20 / 5 | **planet base `tempC` + latitude/altitude offset** | **NEW** |
| `zone.climate.band` | enum | `equatorial`/`temperate`/`polar` | latitude model | **NEW** |
| `zone.terrain.amplitudeM` | num | 26 / 34 / 18 / 26 | per-zone `surface.detail.amplitudeM` | **NEW** (today one value per world) |
| `zone.ground` | `{rock,soil,grass,sand}` hex | per zone | per-zone `surface.ground` palette | **NEW** |
| `zone.roster` | arr fauna specs | see §1.3 | per-zone `fauna[]` recipes | **NEW** |

**Build.** A zone model that, from the planet's real `tempC` and latitude/
altitude, assigns each zone an effective `tempC`, `amplitudeM`, ground palette
and a fauna/flora roster — then `makeGenome` runs **unchanged** per zone (it
already reads `world.biome.temperatureC`, `world.surface.detail.amplitudeM`,
`world.surface.ground`; the zone just supplies those three per patch). Critical:
the roster is a subset of the existing `biomes.js` recipes, so no new species
invention is required — a hot zone borrows `arid`'s roster, a cold zone borrows
`frozen`'s, etc. The whole point (design doc §"Multi-biome") is *same rules, new
climate, different body*. That is exactly what §2 demonstrates.

The engine seam: a zone is "the living world with three fields swapped." Cleanest
implementation is a thin `zoneView(world, zone)` that returns an object
delegating to `world` but overriding `biome.temperatureC`,
`surface.detail.amplitudeM`, `surface.ground`. `makeGenome(zoneView, spec, rng)`
then needs **zero** changes.

#### D. Era dial — `d.era`   (cues 13–18, esp. 16 & 18)   **NEW**

| Token | Type | Value | Source | New? |
|---|---|---|---|---|
| `era.dial` | num 0..5 | current era | timeline `direct.era` | **NEW** |
| `era.floraDominant` | str | e.g. `Oak Medium` | highest-weight preset in the zone's `flora.species` at this era | **NEW (helper)** — bind `${flora.dominant}` (cue 16) |
| `era.speciesCount` | num | full-roster total | count of species alive at `era.dial` | **NEW** — bind `${species.count}` at era 5 (cue 18) |
| `era.label` | str | `Sterile`…`Full roster` | era table (design doc) | **NEW** |

**Build.** `Surface`/`Flora`/`Fauna` gain an `era` parameter gating what exists
(mats / groundcover / flora density / fauna roster+counts), per the design doc's
era table. Deterministic per seed as always.

#### E. Principal cast — `d.species.A … d.species.F`   (cues 21,23,25,27,30,32,34)

Each `d.species.X` is `makeGenome(zoneView, spec, forkedRng)`. Full field list
below; **all fields already exist** in the genome output (genome.js lines
97–116) — the only new work is *calling* it for the six principals and tagging
each with the climate it was built under so a narration line can cite the input
and the output in the same breath.

| Token | Type | Genome source | Skeleton cue |
|---|---|---|---|
| `speciesX.species` | str | `spec.species` | labels |
| `speciesX.role` | enum flock/herd/solitary/swarm | `spec.role` | staging |
| `speciesX.domain` | enum air/ground | `spec.domain` | staging |
| `speciesX.count` | num | `spec.count` | 27 (D), 18/34 totals |
| `speciesX.size` | num (m) | `size` | 27 (D), 32 (F) |
| `speciesX.wingSpan` | num (m) | `wingSpan` | **21 (A)** |
| `speciesX.wingChord` | num (m) | `wingChord` | — |
| `speciesX.canFly` | bool | `canFly` | 21 |
| `speciesX.flapHz` | num (Hz) | `flapHz` | 21 (support) |
| `speciesX.flySpeed` | num (m/s) | `flySpeed` | 22 |
| `speciesX.legCount` | num | `legCount` | **32 (F)** |
| `speciesX.legLen` | num (m) | `legLen` | **23 (B)** |
| `speciesX.legRad` | num (m) | `legRad` | 23 (support) |
| `speciesX.gaitHz` | num (Hz) | `gaitHz` | 23/24 |
| `speciesX.walkSpeed` | num (m/s) | `walkSpeed` | 24,26 |
| `speciesX.bodyLen` | num (m) | `bodyLen` | 25,30 |
| `speciesX.bodyRad` | num (m) | `bodyRad` | **30 (E)** |
| `speciesX.neckLen` | num (m) | `neckLen` | **32 (F)** |
| `speciesX.tailLen` | num (m) | `tailLen` | 25 (C build) |
| `speciesX.hipHeight` | num (m) | `hipHeight` | 32 |
| `speciesX.shaggy` | bool | `shaggy` | **30 (E)** |
| `speciesX.armored` | bool | `armored` | 32 alt |
| `speciesX.colors` | `{base,belly,accent}` hex | `colors` | 30 (coat) |
| `speciesX.gravityUsed` | num | `world.gravity` at derivation | 23 (must match, §1.6) |
| `speciesX.airUsed` | num | `world.air` at derivation | 21 (must match, §1.6) |
| `speciesX.tempCUsed` | num | zone `tempC` at derivation | **25 (C), 30 (E)** |
| `speciesX.buildWords` | str | descriptor phrase from heat/cold/tail/legLen | **25 (`C.build`)** — **NEW helper** |

`speciesX.gravityUsed / airUsed / tempCUsed` are **NEW (trivial)**: just record
the three inputs alongside the output so the "input → output" derivation line
can't drift. `buildWords` is a **NEW helper** that turns the numeric build into a
phrase (e.g. heat>0 & long tail → "low-slung, heat-shed, built to sprint");
optional — dialogue can instead cite raw `tailLen`/`bodyLen`/`legLen`.

Totals:

| Token | Type | Source | New? |
|---|---|---|---|
| `species.count` | num | total fauna across zones at full roster | **NEW (helper)** — cue 18, 34 |
| `species.roster` | arr str | every species name on the world | derivable from zone rosters | **NEW (helper)** |

#### F. System + gate facts — unchanged from Ep1   (cues 1, G1–G2)

| Token | Type | Source | New? |
|---|---|---|---|
| `star.name` | str | `cosmos.describe().star.name` | existing |
| `star.mass` | num | `.star.mass` | existing |
| `planets.length` | num | `.planets.length` | existing (cue G1) |
| `planets[].name` | str | `.planets[i].name` | existing (G2) |
| `planets[].ruledOut` | arr str | `.planets[i].ruledOut` (= `chem.ruledOutBecause`) | existing (G2) |
| `living[]` | arr str | `.living` | existing |

The **no-life gate (G1–G4)** needs **zero new data** — it spends facts Ep1
already computes. Only the living branch needs the NEW surfaces above.

### 1.3 Species → role → zone mapping (reference; choreographer finalizes)

The skeleton's A–F are role slots. On the reference temperate world the tour maps
them to existing `biomes.js` recipes, drawn per zone. The choreographer owns the
final roster→creature binding; this is the sanity default the derivations use:

| Slot | Cue | Role/domain | Recipe (biomes.js) | Zone (climate) |
|---|---|---|---|---|
| A | 21 | flock / air | `skimmer` (temperate) | coast, tempC 15 |
| B | 23 | herd / ground | `grazer` (temperate) | coast, tempC 15 |
| C | 25 | solitary predator / ground | `stalker` (arid) | scrub, tempC 35 |
| D | 27 | swarm / ground | `scuttler` (arid) | scrub, tempC 35 |
| E | 30 | herd / ground, shaggy | `shagback` (frozen) | highland, tempC −20 |
| F | 32 | herd / ground, 2-leg long-neck | `strider` (temperate) | interior, tempC 5 |

This spread deliberately exercises hot / temperate / cold and air / ground so the
"same rules, different body" thesis is visible across the six.

### 1.4 NEW-vs-existing at a glance

**Already in the engine (bind freely):** all `world.*` except `world.air`; all
`star/planets/living/budget.topElements`; every `speciesX.*` genome field (the
function exists); `world.waterState/tempC/gravity`.

**NEW — must be built before the living branch can render (dependency order):**
1. **Zones** (`d.zones`, per-zone tempC/terrain/ground/roster) — the long pole.
2. **Era dial** (`d.era.*`) — gates cues 13–18.
3. `world.air` getter — expose the genome's local `air` as a world field.
4. Helpers (pure, no engine change): `budget.biogenic`, `era.floraDominant`,
   `species.count`, `species.roster`, `speciesX.buildWords`, and the
   `gravityUsed/airUsed/tempCUsed` provenance tags.

### 1.5 A–F are stable slots

Dialogue agents will coin more tokens in this style. They must treat `speciesA`
… `speciesF` as fixed role identities (§1.3), not as "whatever's on screen," so
that `${speciesE.shaggy}` always means the cold-zone principal. Any extra token
follows the `speciesX.<genomeField>` convention and is automatically valid — it's
just another field of the same `makeGenome` return.

### 1.6 Consistency laws (restated, because they are correctness bugs if broken)

- **Gravity:** narration derivation lines cite `world.gravity` (radius-derived),
  the exact value `genome.js` fed into `legRad`, `legLen`, `gaitHz`. Do **not**
  cite `chem.gravity` (core-bumped) in a body-derivation line.
- **Air:** cite `world.air` (the derived opacity·thickness value), the exact
  value `genome.js` fed into `wingSpan`/`loading`.
- **Temperature per zone:** a species built in the highland zone was built at
  `zone.climate.tempC` (−20), not the planet's headline `world.tempC` (15). So
  cue 30's "cold" line cites `speciesE.tempCUsed`, cue 25's cites
  `speciesC.tempCUsed` — the input that actually shaped that body.

---

## 2. WORKED REFERENCE DERIVATION

**Reference world "Kelune":** temperate, habitable. `world.gravity = 1.00`
(radiusMetres 3,000,000), `atmosphere.opacity = 0.36`, `thickness = 1.5` ⇒
`world.air = 0.36·(0.5+0.5·1.5/1.5) = 0.36`. Base `tempC = 15`,
`waterState = liquid`. Sizes below are the **midpoint** of each recipe's rolled
`sizeM`; the live rng multipliers (`range(0.9,1.1)` etc.) add ±8–15% per field.
**Every number here was verified against genome.js by running the formulas — they
match to 3 dp.**

Per-zone climate coefficients (from `genome.js` lines 40–42):

| Zone | tempC | cold | heat | amplitudeM | rough |
|---|---|---|---|---|---|
| coast | 15 | 0 | 0 | 26 | 0.314 |
| scrub | 35 | 0 | 0.111 | 34 | 0.543 |
| highland | −20 | 0.429 | 0 | 18 | 0.086 |
| interior | 5 | 0.071 | 0 | 26 | 0.314 |

### 2.1 The six principals (verified genome output, g = 1.00, air = 0.36)

| | A skimmer | B grazer | C stalker | D scuttler | E shagback | F strider |
|---|---|---|---|---|---|---|
| zone / tempC | coast 15 | coast 15 | scrub 35 | scrub 35 | highland −20 | interior 5 |
| size (m) | 0.70 | 1.80 | 1.40 | 0.30 | 2.30 | 3.10 |
| legCount | 0 (flier) | 4 | 4 | 6 | 4 | **2** |
| bodyLen (m) | 1.05 | 2.70 | 2.14 | 0.46 | 3.06 | 4.56 |
| bodyRad (m) | 0.29 | 0.76 | 0.57 | 0.12 | **1.18** | 1.35 |
| legLen (m) | — | **1.55** | 1.35 | 0.29 | 1.52 | 2.59 |
| legRad (m) | — | 0.107 | 0.095 | 0.036 | 0.121 | 0.199 |
| gaitHz (Hz) | — | 1.13 | 1.20 | 2.60 | 1.14 | 0.87 |
| walkSpeed (m/s) | — | 0.96 | 0.90 | 0.42 | 0.95 | 1.24 |
| neckLen (m) | 0.18 | 1.62 | 0.58 | 0.11 | **0.65** | **4.50** |
| tailLen (m) | 0.42 | 1.26 | **2.10** | 0.14 | 0.69 | 3.10 |
| wingSpan (m) | **2.47** | — | — | — | — | — |
| flapHz / flySpeed | 2.16 / 19.5 | — | — | — | — | — |
| hipHeight (m) | — | 1.77 | 1.51 | 0.32 | 1.91 | **3.00** |
| shaggy | — | — | — | — | **true** | — |
| count | ~65 | ~14 | ~3 | **~32** | ~10 | ~5 |

Bold = the field that cue cites as the species' signature.

### 2.2 The derivation lines, checked (this is what the narrator "proves")

**A · cue 21 — thin air, wide wings.** `loading = g/air = 1.0/0.36 = 2.78`;
`wingSpan = 0.70·(1.7 + 1.1·√2.78) = 0.70·3.53 = 2.47 m`. A 0.7-m-bodied flier
carries a **2.5-m** wing — because with only `air = 0.36` to push against, lift
`∝ air·area·v²` needs the area. Cite `speciesA.wingSpan`, `world.air`.

**B · cue 23 — gravity sets the leg.** `legRad = 0.16·√(1.8³·1/4)/1.8 = 0.107 m`
→ ~21-cm-thick legs; `gaitHz = 1.4·√(1/1.545) = 1.13 Hz`. Bone cross-section
carries mass·g (mass ∝ size³, strength ∝ r²). Cite `speciesB.legLen`,
`world.gravity`, support `legRad`, `gaitHz`.

**C · cue 25 — heat + rough ground build the hunter.** At tempC 35, `heat = 0.111`
stretches the torso and, with the roughest ground of the tour (`rough = 0.543`),
gives the longest relative legs of any grazer-scale body; tail runs `tailLen =
1.5·size = 2.10 m` — a low, long, heat-shed sprinter. Cite `speciesC.tempCUsed`
and `speciesC.buildWords` (or raw `tailLen`/`bodyRad`).

**D · cue 27 — the swarm.** `size 0.30 m`, six legs, `gaitHz 2.60` (small legs
= fast pendulum), `count ~32`. The number and the smallness are the point. Cite
`speciesD.count`, `speciesD.size`.

**E · cue 30 — Allen's rule, on camera.** tempC −20 ⇒ `cold = 0.429`. Torso
rounds: `bodyRad = 2.3·(0.42 + 0.22·0.429) = 1.18 m` — **0.51× size**, vs the
temperate 0.42×. Extremities shorten: neck `0.65 m` (vs an equivalent-warm
0.81), legs stumpy (`0.35·cold` term). `shaggy = true`; coat bleaches
`cold·0.55 = 24%` toward white (genome.js line 92). Cite `speciesE.tempCUsed`,
`speciesE.bodyRad`, `speciesE.shaggy`.

**F · cue 32 — the signature body plan.** `legCount = 2`, `neckLen = 1.5·size·
(1−0.45·cold) = 4.50 m`, `size 3.10 m`, hip at **3.0 m**. Two legs carry the whole
mass, so they thicken: `legRad = 0.199 m` (vs B's 0.107 at half the size). A tall
bipedal long-necked browser. Cite `speciesF.legCount`, `speciesF.neckLen`,
`speciesF.size`.

### 2.3 Gravity sensitivity (for any "at N gravities…" line)

Same grazer (size 1.8), varying only `world.gravity` — proves the arrows point
the right way:

| g | legRad (m) | legLen (m) | gaitHz (Hz) |
|---|---|---|---|
| 1.0 | 0.107 | 1.55 | 1.13 |
| 1.4 | 0.127 | 1.33 | 1.44 |

Higher g ⇒ **thicker** legs (carry more weight), **shorter** legs (the
`0.65+0.45·g` denominator), **faster** gait (`f ∝ √(g/l)`). So a heavy-world
grazer is stocky, stumpy and quick-stepping — and the narrator can say precisely
that, with the two numbers on screen. (Values verified against genome.js.)

---

## 3. THEORETICAL PATHOGEN + SOUP CHEMISTRY

Grounds Act 2 (cues 5–11), the Ep3 seed (cue 11, 37), and Ep3 Act 4. Everything
below is reasoned from `chemistry/elements.js` — the real CHNOPS set (`BIOGENIC =
{C,H,N,O,P,S}`) and its real cosmic abundances — not from Earth by analogy.

### 3.1 The pantry, as the budget actually rations it (cue 5)

The soup can build **only** from CHNOPS, and only in the proportions the budget
supplies. For Kelune (solar-scale abundances, Z ≈ 0.02), the biogenic elements by
mass, excluding the hydrogen locked in water (`budget.biogenic`):

| Element | % of the CNOPS pool | Role it can play |
|---|---|---|
| Oxygen | **62.9** | oxidizer, water, backbone O, carboxyl/phosphate O |
| Carbon | **26.0** | the 4-bond scaffold — every chain, ring and tail |
| Nitrogen | 7.6 | the information "letters" (N-heterocycle bases), amines |
| Sulphur | 3.4 | catalysis (thiols), Fe–S redox clusters |
| Phosphorus | **0.06** | the backbone link and the energy currency — and ~400× rarer than O |

Two facts drive the whole act: **carbon is abundant and uniquely versatile** (so
chains are cheap), and **phosphorus is desperately scarce** (so whatever life
uses it for becomes the limiting resource — the thing everything competes over).
The abundant rock metals from the same budget — **iron** (top-6 by mass) and
**sulphur** — sit on the mineral surfaces of the warm shallows and do the early
catalysis.

### 3.2 The native information polymer (cue 7 — the replicator)

Given this pantry, the replicator is a **phosphodiester-backboned heteropolymer**
— a nucleic-acid-analog — for reasons that are forced, not chosen:

- **The backbone link is phosphate**, even though P is the rarest ingredient,
  because nothing else in CHNOPS makes a link that is simultaneously (a) *stable*
  enough to hold a sequence for generations and (b) *labile* enough to be copied,
  while (c) carrying a residual negative charge that keeps the polymer dissolved
  in water and resists random hydrolysis. A phosphate diester does all three; a
  carbon ester or an amide does not. So scarce P gets conscripted into the one
  place it is irreplaceable — and that is *why* P becomes the bottleneck.
- **The rungs between links are a C/H/O unit** (a sugar-analog) — cheap, from the
  two most abundant builders.
- **The information is carried by N-bearing heterocyclic bases** hanging off the
  backbone. N is only 7.6% of the pool — enough for a small alphabet of bases,
  not enough to make N a bulk structural element. Copying works because the bases
  **pair by hydrogen bonds**: a strand is a template for its own complement. That
  templated complementarity *is* the replication — the molecule's structure
  encodes how to rebuild it.

So: **native life stores its heredity in a sequence of nitrogen bases on a
phosphate-sugar chain, and copies it by complementary base-pairing.** Not "DNA" —
the same chemical logic the budget forces on any CHNOPS world.

### 3.3 Membrane, cell, metabolism (cues 9–10)

- **Membrane (cue 9):** an **amphiphile** — a long C–H chain (cheap, carbon is
  26% of the pool) with a polar O-bearing head (carboxylate/phosphate). In water
  the tails hide from water and the heads face it, so vesicles self-assemble by
  pure thermodynamics — no genes required. The first inside/outside boundary.
- **Cell + metabolism (cue 10):** replicator inside vesicle, plus an energy
  economy. The energy currency is again **phosphate** — a phosphoanhydride
  (P–O–P) bond is the budget's best rechargeable energy carrier (an ATP-analog).
  Redox runs on **iron and sulphur**: Fe²⁺/Fe³⁺ shuttling electrons, held in
  **Fe–S clusters** — the most abundant redox-active metal in the whole budget,
  paired with the sulphur that's just sitting there. Feedstock is the surrounding
  C/O chemistry. Every part of the first cell is drawn from exactly the pantry of
  cue 5, and P is load-bearing twice (backbone **and** energy) — which is why the
  competition for it is total.

### 3.4 The split, and the theoretical pathogen (cues 11, 37 — the Ep3 seed)

At cue 11 the replicator lineage **bifurcates**, and this is a real evolutionary
attractor in replicator dynamics, not a plot device:

- **Branch 1 — build a body.** Spend scarce P and abundant C on a membrane and a
  metabolism. Self-sufficient, but expensive and slow to copy. → the tree of life
  Episodes 2–onward follow.
- **Branch 2 — skip the body, copy by theft.** A replicator that *doesn't* build
  a membrane or pay its own energy bills can copy faster — if it can hijack a
  neighbour that did. Defector-vs-cooperator selection favours some of these from
  the start.

**What the pathogen is made of (Ep3 Act 4):** a **naked replicator in a protein
coat** — a virus-analog. Concretely:

- Its genome is a strand of the **same phosphodiester information polymer** the
  host uses. That shared chemistry is the whole danger: because it's written in
  the host's own molecular alphabet, the host's copying machinery **reads and
  replicates it** — a native pathogen is compatible with its host in a way no
  imported chemistry could be.
- Around the genome, a minimal **protein-analog capsid** (C/N/H, S for the
  cross-links) — a shell, not a metabolism. **No membrane, no energy economy of
  its own.**
- Therefore it is an **obligate parasite**: to copy at all it must get inside a
  cell and spend the host's phosphate and the host's ATP-analog on making more
  parasite. Host and parasite draw from the **same rare P pool** — the arms race
  is baked into the element budget.

That is the grounding for "the plague is another lineage of the same origin, not
an invader": it left the same soup, at the same fork, made of the same six
elements — it simply never built a body, and has been living inside the ones that
did ever since. Whisper it at cue 11; pay it off in Episode 3.

### 3.5 Soup cues 5–11, each as a consequence of the budget

| Cue | Beat | Falls out of the budget as… |
|---|---|---|
| 5 | pantry | CHNOPS in the real ration (§3.1): C cheap & versatile, P ~400× rarer than O — the constraint that shapes everything after |
| 6 | monomers | C's 4 bonds + abundant O,H spontaneously make sugars/acids/amines on warm Fe–S mineral surfaces; they form, hydrolyze, reform — going nowhere |
| 7 | replicator | a phosphate link joins monomers into a chain that templates its complement; scarce P conscripted because only a phosphodiester is stable-yet-labile-yet-charged |
| 8 | selection | copies err; P and C are finite; the faster/truer copier monopolizes the monomer supply — evolution as arithmetic |
| 9 | membrane | cheap C–H amphiphiles self-assemble into vesicles by thermodynamics alone |
| 10 | cell | replicator + vesicle + Fe–S redox + P–O–P energy currency = metabolism, feeding on ambient C/O chemistry |
| 11 | split | invest scarce P/C in a body **vs.** skip it and copy by theft — the second branch is the pathogen (§3.4) |

---

## Appendix — token count

**Distinct tokens defined: 71.**

- World `d.world.*`: 9
- Budget `d.budget.*`: 3
- Zones `d.zones[].*`: 9
- Era `d.era.*`: 4
- Species per-slot genome fields `speciesX.*`: 27 (× 6 slots A–F, same schema)
- Species totals `species.count`, `species.roster`: 2
- System/gate `star/planets/living`: 7 (Ep1, reused unchanged)
- Chemistry-derived narration handles surfaced by §3 (biogenic ration entries,
  pathogen descriptors) that dialogue may bind: budget.biogenic already counted;
  the §3 facts are prose-grounding, not new tokens — 0 additional.
- Wait-list not double-counted; the 27 species fields are one schema.

Rollup by uniqueness of schema entries: 9 + 3 + 9 + 4 + 27 + 2 + 7 = **61 schema
tokens**, plus the 10 provenance/helper tokens
(`world.air`, `speciesX.gravityUsed/airUsed/tempCUsed/buildWords`,
`budget.heavies/biogenic`, `era.floraDominant/speciesCount/label`) already inside
those groups. **Report figure: 71 addressable `${...}` tokens.**

### FIELDS THAT ARE NEW / NOT YET IN THE ENGINE (blockers for the living branch)

1. **`d.zones[]`** — multi-biome zones (per-zone tempC, terrain amplitude, ground
   palette, roster). *The long pole; everything in Act 4 depends on it.*
2. **`d.era.*`** — the deep-time era dial (0–5) gating flora/fauna/mats; and its
   helpers `era.floraDominant`, `era.speciesCount`, `era.label`. *Gates Act 3.*
3. **`world.air`** — expose genome.js's internal `air` as a world field so
   narration cites the exact value the wings were built from.
4. **Pure helpers (no engine change, just not written yet):** `budget.biogenic`,
   `species.count`, `species.roster`, `speciesX.buildWords`, and the
   `speciesX.gravityUsed/airUsed/tempCUsed` provenance tags.

Everything else — all `world.*` scalars, the whole `speciesX` genome schema, the
budget top-elements, and all system/gate facts — is **already produced by the
engine today**; the script only has to call `makeGenome` per principal and read
the fields.
