// The engine registry — the single source of truth for the hub.
//
// This repo is not one movie. It is a set of "scene engines": programs that
// GENERATE a film in real time from a seed and play it, rather than replaying a
// saved video. The hub (index.html) is the front door that lists them; each
// card below is one engine.
//
// To add a new engine, drop one object into ENGINES. Nothing else needs to
// change — the hub renders whatever is here, in order.
//
//   id       short slug, unique (used for the DOM id and the accent)
//   title    display name
//   tagline  one line, shown under the title
//   blurb    2–3 sentences describing what the engine generates
//   href     page that launches it (null while it is still 'soon')
//   status   'live'  — playable now, card is a link
//            'soon'  — announced, card is dimmed and unclickable
//   accent   CSS color for the card's glow/rule (its identity on the grid)
//   tags     small capability chips (e.g. 'procedural', 'narrated', 'seeded')
//   year     optional era/label shown in the corner

export const ENGINES = [
  {
    id: 'worlds',
    title: 'The Worlds',
    tagline: 'A universe from a single seed.',
    blurb:
      'Enter a seed and a whole cosmos is computed in front of you — its star, ' +
      'its chemistry, its planets, and the life that does or does not take hold ' +
      'on them — then narrated as a documentary. Two episodes so far: the birth ' +
      'of a system, and the living world inside it. No two seeds tell it the same way.',
    href: 'worlds.html',
    status: 'live',
    accent: '#5fa8ff',
    tags: ['procedural', 'narrated', 'seeded'],
    year: 'Series I',
  },

  // ---- Templates for the next engines. Flip status to 'live' and set href ----
  // when the engine has a launch page. Rename freely — these are placeholders
  // so the grid reads as a hub, not a promise.
  {
    id: 'engine-2',
    title: 'Untitled Engine',
    tagline: 'Your next generative film.',
    blurb:
      'A slot on the shelf. Point it at a new scene engine — a different subject, ' +
      'a different set of rules — and it plays here beside The Worlds, generated ' +
      'live from its own seed.',
    href: null,
    status: 'soon',
    accent: '#8b7bd8',
    tags: ['procedural'],
    year: 'Series II',
  },
  {
    id: 'engine-3',
    title: 'Untitled Engine',
    tagline: 'Your next generative film.',
    blurb:
      'Another open slot. The hub grows by one object in the registry — no ' +
      'rebuild of the front door, no saved video files, just another world that ' +
      'renders itself on demand.',
    href: null,
    status: 'soon',
    accent: '#4fbf9f',
    tags: ['procedural'],
    year: 'Series III',
  },
];
