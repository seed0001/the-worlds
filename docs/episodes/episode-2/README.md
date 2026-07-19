# Episode 2 — production bible

The buttoned-up Episode 2, written by six agents against one shared 38-cue
spine and assembled here. This is the content that the engine
(`../episode-2-engine.md`) plays. Design is in `../episode-2.md`.

## Files (reading order)

1. **[dialogue.md](dialogue.md)** — every cue's narration, ≥3 seeded variants
   each, in order: Act 1 Return + Act 2 Soup (1–12), the no-life gate (G1–G4),
   then Acts 3–5 (13–38). Voice matched to the shipped Episode 1 script.
2. **[camera.md](camera.md)** — one named shot per cue + the binding no-repeat
   ledger (your rule: no shot used more than twice).
3. **[choreography.md](choreography.md)** — the staged interactions and the
   unbroken butterfly-effect chain, written as perturbations of the real
   `Fauna.js` behavior system; plus era staging for the fast-forwards.
4. **[teaser.md](teaser.md)** — the standalone ~90s Episode 2 teaser.
5. **[data-contract.md](data-contract.md)** — the token authority: every
   `${...}` a line binds to, its source in the engine, and what's NEW; plus a
   worked reference derivation and the grounded soup-chemistry + pathogen.

## The shape at a glance

- **38 cues** across 5 acts (Episode 1 was 37), plus a **4-cue no-life gate**.
- **Act 1 Return** (1–4): descent from orbit to the warm shallows.
- **Act 2 The Soup** (5–12): pantry → monomers → replicator → selection →
  membrane → cell → **split** (the Episode 3 seed) → mats.
- **Act 3 Fast-forwards** (13–19): one locked valley through eras 0–5.
- **Act 4 The Chain** (20–35): the unbroken cross-biome interaction chain,
  with the five on-camera body-derivations (21, 23, 25, 30, 32).
- **Act 5 Close** (36–38): one system indivisible → two-lineages callback →
  handoff to Episode 3.

## Verification (the cross-agent seams hold)

- **Camera rule.** 25 distinct shots, 38 uses, max 2 per shot. The one
  sanctioned exception (`TIME_LOCK` across eras 0–1) is used exactly as
  allowed; eras 2–5 each get a different moving shot. Gate and teaser carry
  their own independent ledgers. ✔ (camera.md ledger)
- **Events.** The six `event` tokens in the choreography
  (`startle-flock`, `spook-herd`, `predator-commit`, `swarm-rise`,
  `highland-link`, `settle`) match the dialogue's event cues exactly; no
  renames, no orphans. ✔
- **Tokens.** Dialogue placeholders resolve against the data contract's
  71-token surface. The two consistency laws hold in the written lines
  (derivations cite `world.gravity` and `world.air`, and per-zone `tempC`). ✔

## Lead reconciliation decisions (mine, as assembler)

The agents flagged four seams for a judgment call. Resolved:

1. **`${B.gravity}` → `${world.gravity}`.** Gravity is planetary, identical for
   every species; scoping it per-species would imply otherwise. The derivation
   still reads "this world pulls at `${world.gravity}` g, so the legs are
   `${B.legRad}` thick." (Data contract keeps `speciesX.gravityUsed` as the
   provenance tag proving the cited value is the one the genome used.)
2. **`${C.build}` → a derived descriptor from `speciesX.buildWords`.** genome.js
   has no single "build" field; the resolver turns the heat/terrain-stretched
   proportions into a short phrase. Numeric fallback (`bodyLen` vs `bodyRad`,
   `tailLen`) is available if we prefer.
3. **`${E.coat}` → conditional prose in the token resolver**, not in the variant
   text: a full sentence when `shaggy`, a lighter clause when merely cold, empty
   otherwise — so all three variants scan in every case.
4. **`${world.air}` reads as a descriptor in Act 1 (cue 2) but a number in the
   derivation (cue 21).** Both bind to the same underlying value; the resolver
   exposes `world.air` (number) and a derived `world.airWord` (adjective) so
   cue 2's "air thick enough to hold it" and cue 21's "at `${world.air}`
   density" are both true and both from the same source.

## What this content needs from the engine (NEW work)

Per the data contract, the living branch needs, in dependency order:
**(1)** multi-biome zones `d.zones[]` (the long pole), **(2)** the era dial
`d.era.*`, **(3)** a `world.air` field, **(4)** small pure helpers
(`budget.biogenic`, `species.count`, `buildWords`, provenance tags). The
no-life gate needs **zero** new data. Build order and milestones are in
`../episode-2-engine.md`; per the user, the **soup act is built first**.

## Status

Content complete and assembled. Not yet wired to the engine — that is the
build, starting with `SoupScene` (Act 2).
