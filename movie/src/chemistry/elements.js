// The rulebook. One real periodic table, real properties, and every downstream
// fact in the documentary — what a planet is made of, whether it can hold water,
// whether life has a backbone to build on — is reasoned from this table and
// nothing else. Change a number here and the universe changes honestly.
//
// The properties that actually do work:
//
//   dex          Cosmic abundance as astronomers write it: log10 of the number
//                of atoms relative to hydrogen, with H fixed at 12. So oxygen at
//                8.69 means ~10^(8.69-12) = 1/2000 as many O atoms as H atoms.
//                These are real solar-system photospheric values.
//
//   condenseK    The 50% condensation temperature: the temperature below which,
//                as a hot gas cloud cools, this element freezes out of gas into
//                solid grains. THIS is what sorts a solar system. Refractories
//                (Fe, Mg, Si, Ca, Al — high condenseK) become solid rock and
//                metal even close to the star; volatiles (H, C, N, O compounds —
//                low condenseK) only freeze into ice far out, past the frost
//                line. It is the single reason inner worlds are rock and outer
//                worlds are gas and ice. Real cosmochemistry (the condensation
//                sequence), in kelvin.
//
//   origin       Where the element was forged: 'bigbang' (H, He, trace Li — all
//                that the first three minutes could make), 'fusion' (everything
//                up to iron, built inside stars), or 'explosive' (iron-peak and
//                beyond, only in the violence of a dying star). Episode 1's whole
//                middle act is this column.
//
//   role         What it builds. 'rock', 'metal', 'volatile' (air & ice), 'noble'
//                (builds nothing — won't bond), and the biogenic set flagged
//                separately below.

/** The six elements life is built from: C, H, N, O, P, S. */
export const BIOGENIC = new Set(['C', 'H', 'N', 'O', 'P', 'S']);

export const ELEMENTS = [
  // sym  name          Z    mass     dex    condenseK  origin       role
  ['H',  'hydrogen',     1,   1.008,  12.00,   182,  'bigbang',   'volatile'],
  ['He', 'helium',       2,   4.003,  10.93,     4,  'bigbang',   'noble'],
  ['C',  'carbon',       6,  12.011,   8.43,    626,  'fusion',    'volatile'],
  ['N',  'nitrogen',     7,  14.007,   7.83,    123,  'fusion',    'volatile'],
  ['O',  'oxygen',       8,  15.999,   8.69,    180,  'fusion',    'volatile'],
  ['Ne', 'neon',        10,  20.180,   7.93,     9,  'fusion',    'noble'],
  ['Na', 'sodium',      11,  22.990,   6.24,    958,  'fusion',    'rock'],
  ['Mg', 'magnesium',   12,  24.305,   7.60,   1336,  'fusion',    'rock'],
  ['Al', 'aluminium',   13,  26.982,   6.45,   1653,  'fusion',    'rock'],
  ['Si', 'silicon',     14,  28.085,   7.51,   1310,  'fusion',    'rock'],
  ['P',  'phosphorus',  15,  30.974,   5.41,   1230,  'fusion',    'rock'],
  ['S',  'sulphur',     16,  32.06,    7.12,    664,  'fusion',    'volatile'],
  ['Cl', 'chlorine',    17,  35.45,    5.50,    948,  'fusion',    'volatile'],
  ['Ar', 'argon',       18,  39.948,   6.40,     47,  'fusion',    'noble'],
  ['K',  'potassium',   19,  39.098,   5.03,   1006,  'fusion',    'rock'],
  ['Ca', 'calcium',     20,  40.078,   6.34,   1517,  'fusion',    'rock'],
  ['Ti', 'titanium',    22,  47.867,   4.95,   1582,  'fusion',    'rock'],
  ['Fe', 'iron',        26,  55.845,   7.47,   1334,  'explosive', 'metal'],
  ['Ni', 'nickel',      28,  58.693,   6.22,   1353,  'explosive', 'metal'],
].map(([sym, name, Z, mass, dex, condenseK, origin, role]) => ({
  sym, name, Z, mass, dex, condenseK, origin, role,
  biogenic: BIOGENIC.has(sym),
  /** Linear atom count relative to hydrogen = 1. */
  abundance: Math.pow(10, dex - 12),
}));

export const BY_SYMBOL = Object.fromEntries(ELEMENTS.map((e) => [e.sym, e]));

/** Frost line temperature: below this, water ice is stable. Drives everything. */
export const WATER_CONDENSE_K = BY_SYMBOL.O.condenseK; // 180 K, oxygen as H2O

/** Liquid-water band at ~1 atm, in kelvin. No Earth reference — it's chemistry. */
export const LIQUID_WATER = { min: 273, max: 373 };
