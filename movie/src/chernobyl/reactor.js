// The reactor — grounded facts, in one table.
//
// Like Apollo and unlike The Worlds, this engine does not generate its subject
// from a seed. It recreates a real one: the destruction of Reactor No. 4 at the
// Chernobyl Nuclear Power Plant, in the first minutes of 26 April 1986. Every
// number the narrator speaks, and every animation that turns on a number, is
// driven from here — and here is history.
//
// Sources are the IAEA's INSAG-7 report, the World Nuclear Association's
// technical account, and the published RBMK-1000 design figures. Numbers are
// rounded to what a narrator would say out loud. This is told as a systems and
// physics failure — no operator is named, and no words are put in real mouths.

export const PLANT = {
  name: 'the Chernobyl Nuclear Power Plant',
  unit: 'Reactor No. 4',
  place: 'northern Ukraine, then part of the Soviet Union',
  town: 'Pripyat',              // the plant town, ~3 km away, ~49,000 people
  townPopulation: 49_000,
  date: '26 April 1986',
  ventStackHeightM: 150,        // the iconic red-and-white exhaust stack
};

// The RBMK-1000: a graphite-moderated, water-cooled power reactor. Big, cheap
// to run, and carrying two design flaws that mattered on this night — a
// positive void coefficient, and control rods that briefly ADDED power as they
// began to enter.
export const RBMK = {
  type: 'RBMK-1000',
  thermalPowerMW: 3200,         // full thermal output
  electricalPowerMW: 1000,      // hence "1000"
  coreDiameterM: 11.8,
  coreHeightM: 7,
  fuelChannels: 1661,           // vertical pressure tubes of enriched uranium
  controlRods: 211,             // boron-carbide absorbers, with graphite tips
  enrichmentPct: 2,             // ~2% U-235
  graphiteBlocks: 'about two thousand tonnes of graphite',
  lidMassTonnes: 1000,          // the upper biological shield, nicknamed "Elena"
  lidName: 'the upper biological shield',
};

// The physics that turned a routine test into a runaway. Each of these is a
// real, narratable quantity.
export const PHYSICS = {
  // Delayed neutrons are the ~0.65% of the fission neutrons that arrive
  // seconds late — the slack that makes a reactor controllable. Cross that
  // margin on prompt neutrons alone and the power doubles in a heartbeat.
  delayedFractionPct: 0.65,     // β ≈ 0.0065
  voidCoefficient: 'strongly positive', // steam voids RAISE reactivity
  // Xenon-135: a fission product and a ferocious neutron poison. It builds up
  // when power falls and burns off slowly — half-life about nine hours.
  xenonHalfLifeH: 9,
  // The reactivity margin — how much shutdown authority the inserted rods hold.
  // Rules required the equivalent of at least ~15 rods fully inserted.
  minRodMargin: 15,
  ropeToSpikeS: 4,              // AZ-5 pressed to the power spike: a few seconds
  peakPowerFactor: 100,         // the surge reached ~100× the reactor's full rating
};

// The test that was the pretext. In a station blackout, the reactor's own
// coolant pumps would lose power for the ~40–60 s before the diesel generators
// picked up. The question: could a spinning-down turbine, still coasting on its
// own inertia, bridge that gap and keep the pumps turning?
export const TEST = {
  goal: "whether a spinning-down turbine could power the coolant pumps through the gap before the diesel generators started",
  plannedPowerMW: 700,          // the test was to run at ~700–1000 MW thermal
  coastdownBridgeS: 50,         // the ~40–60 s gap the coasting turbine had to cover
};

// The night, as a short chain of events by clock time. The scenes read these to
// time their beats; the narrator states the ones that carry the story. Times are
// the early hours of 26 April 1986 (INSAG-7).
export const NIGHT = [
  { t: '23:10', event: 'power-reduction', note: 'the slow reduction toward test power resumes, hours behind schedule' },
  { t: '00:28', event: 'power-collapse',  note: 'control is fumbled and thermal power falls to about 30 MW — almost nothing' },
  { t: '01:00', event: 'rods-withdrawn',  note: 'rods are pulled out to claw power back to about 200 MW; the safety margin is gone' },
  { t: '01:23:04', event: 'test-begins',  note: 'the turbine is tripped; coolant flow falls and steam begins to build' },
  { t: '01:23:40', event: 'az5',          note: 'the AZ-5 emergency shutdown is pressed — the rods start down' },
  { t: '01:23:44', event: 'explosion',    note: 'the power surge; the reactor destroys itself in seconds' },
];

export const AFTERMATH = {
  firstDeaths: 'two workers died that night; twenty-eight more from acute radiation in the weeks that followed',
  ionizationGlow: 'a column of ionized air stood over the open core, faintly blue',
  evacuationHours: 36,          // Pripyat was evacuated ~36 hours later
  fireCrews: 'the first firefighters reached the roof within minutes, not knowing what they were standing in',
};
