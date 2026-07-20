// The mission — grounded facts, in one table.
//
// Unlike The Worlds, this engine does not generate its subject from a seed. It
// recreates a real one: the Apollo lunar landings. Every number the narrator
// speaks and (where it shows on screen) every animation is driven from here,
// and here is history. This is a composite of the program — the first landing's
// iconic firsts, the later missions' rover and long stays — with each figure
// true to the hardware that flew.
//
// Sources are the Apollo press kits and the NASA mission reports; figures are
// rounded to what a narrator would say out loud.

export const SATURN_V = {
  heightM: 110.6,        // 363 feet, stacked
  diameterM: 10.1,       // core stages
  liftoffMassKg: 2.97e6, // ~6.5 million pounds fully fuelled
  // Stage lengths (m) and diameters (m), bottom to top. The lengths sum with
  // the interstages and spacecraft to the full 110.6 m stack.
  stages: {
    s1c: { name: 'S-IC', lengthM: 42.1, diaM: 10.1, engines: 5, engine: 'F-1',
           thrustN: 3.4e7, burnS: 168, sepAltKm: 67 },   // ~7.6 million lbf total
    s2:  { name: 'S-II', lengthM: 24.9, diaM: 10.1, engines: 5, engine: 'J-2',
           thrustN: 5.1e6, burnS: 384, sepAltKm: 185 },
    s4b: { name: 'S-IVB', lengthM: 17.8, diaM: 6.6, engines: 1, engine: 'J-2',
           thrustN: 1.0e6, burnS: 165 },                 // burns twice: orbit, then TLI
  },
  maxQ: { atS: 80, altKm: 13, note: 'maximum aerodynamic pressure' },
  parkingOrbitKm: 185,   // ~100 nautical miles
};

// Key call-outs on the way up, by mission-elapsed time (seconds). The launch
// scene reads these to time its beats; the narrator states the ones that matter.
export const ASCENT = [
  { t: 0,   event: 'liftoff',     note: 'the hold-downs release' },
  { t: 12,  event: 'tower-clear', note: 'the stack clears the tower and rolls onto its heading' },
  { t: 80,  event: 'max-q',       note: 'maximum aerodynamic pressure' },
  { t: 168, event: 's1c-sep',     note: 'first stage separation' },
  { t: 552, event: 's2-sep',      note: 'second stage separation' },
  { t: 700, event: 'orbit',       note: 'orbital insertion' },
];

export const SITE = {
  pad: 'Launch Complex 39A, Kennedy Space Center',
  latitude: 28.6,
};

export const MOON = {
  gravityG: 1 / 6,          // 0.166 of Earth's
  distanceKm: 384_400,
  coastDays: 3,             // ~3 days out, ~3 days back
  radiusKm: 1737,
  landingSite: 'the Sea of Tranquility',
  surfaceStayHours: { first: 21.6, last: 75 }, // Apollo 11 vs Apollo 17
};

export const LM = {
  name: 'Lunar Module',
  descentThrustN: 45_040,
  legs: 4,
  crew: 2,
};

export const ROVER = {
  name: 'Lunar Roving Vehicle',
  topSpeedKmh: 13,          // ~8 mph downhill record on Apollo 17
  massKg: 210,
  rangeKm: 92,              // total driven, Apollo 17
  wheels: 4,
};

export const RETURN = {
  reentrySpeedKms: 11,      // ~25,000 mph, near escape velocity
  reentrySpeedMph: 25_000,
  peakGeeApprox: 6.5,
  parachutes: 3,            // three mains, after two drogues
  splashdown: 'the Pacific Ocean',
};

// A composite crew of three — two to the surface, one in lunar orbit — named by
// role rather than by any one mission's roster, since this is the program's arc.
export const CREW = { toSurface: 2, inOrbit: 1, total: 3 };
