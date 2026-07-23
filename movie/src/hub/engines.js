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

  {
    id: 'apollo',
    title: 'Apollo',
    tagline: 'The whole Moon landing, recreated.',
    blurb:
      'The Saturn V on the pad before dawn, the countdown, the ride to orbit — ' +
      'then the coast to the Moon, the landing, the first steps and the rover, and ' +
      'the long fall home to a splashdown. Not generated from a seed but recreated ' +
      'from history, every figure true to the hardware that flew.',
    href: 'apollo.html',
    status: 'live',
    accent: '#d8894f',
    tags: ['recreation', 'narrated', 'grounded'],
    year: 'Program I',
  },
  {
    id: 'chernobyl',
    title: 'Chernobyl',
    tagline: 'The reactor that ran away.',
    blurb:
      'The first minutes of 26 April 1986, recreated link by physical link: a ' +
      'routine safety test, a reactor starved and then over-driven, and the ' +
      'shutdown button that — through a flaw in the rods — became the trigger. ' +
      'Told in cross-section of the core itself, as a systems failure, not a ' +
      'spectacle. Every figure is history.',
    href: 'chernobyl.html',
    status: 'live',
    accent: '#e0b060',
    tags: ['recreation', 'narrated', 'grounded'],
    year: 'Program II',
  },
  {
    id: 'pyramids',
    title: 'The Pyramids',
    tagline: 'Giza, raised in twenty years.',
    blurb:
      'The Old Kingdom, around 2560 BCE: a bare plateau above the Nile, then a ' +
      'time-lapse of the whole Giza complex rising course by course as the sun ' +
      'wheels overhead. Gangs haul blocks on sledges, water slicks the sand, and ' +
      'the Great Pyramid tops out and gleams — before time strips it to the ruin ' +
      'that still stands. Every figure is history.',
    href: 'pyramids.html',
    status: 'live',
    accent: '#e0b45a',
    tags: ['recreation', 'narrated', 'grounded'],
    year: 'Program III',
  },
  {
    id: 'route66',
    title: 'Route 66',
    tagline: 'The Mother Road, driven and mourned.',
    blurb:
      'The summer of 1957, Chicago to Santa Monica in a two-tone Bel Air: eight ' +
      'states of two-lane blacktop, state-line signs, billboards and neon — with ' +
      'the film flashing forward, again and again, to what each stretch is now: ' +
      'the interstate that replaced it, the towns it left behind. Every date and ' +
      'mile is history.',
    href: 'route66.html',
    status: 'live',
    accent: '#d86a4a',
    tags: ['recreation', 'narrated', 'grounded'],
    year: 'Program IV',
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
