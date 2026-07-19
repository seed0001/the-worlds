# Documentation

Docs for *The Worlds* — a documentary series generated from a single seed. For
the project overview, running it, and deployment, start with the top-level
[README](../README.md).

## Contents

- **[architecture.md](architecture.md)** — how the whole thing works: the
  generative pipeline (seed → chemistry → cosmos → world → surface/life) and the
  playback engine (Stage, Timeline, Narrator, scenes, determinism).
- **[episodes/](episodes/)** — the series bible, one document per episode:
  arcs, act structure, and the simulation data each script draws from.
  - [Episode 1 — From Nothing to Worlds](episodes/episode-1.md) · shipped
  - [Episode 2 — The Living World](episodes/episode-2.md) · playable
    - [engine architecture](episodes/episode-2-engine.md) · how it plays
    - [production bible](episodes/episode-2/) · dialogue, camera, choreography, teaser, data contract
  - [Episode 3 — The Ones Who Ask](episodes/episode-3.md) · designed

## The rule every document inherits

Nothing is canned. Every fact the narrator speaks is read off the simulation for
the viewer's own seed, so the narration is true by construction; the prose is
seeded, so two universes never tell the story the same way.
