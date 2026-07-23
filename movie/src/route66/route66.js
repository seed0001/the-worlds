// Route 66 — grounded facts, in one table.
//
// Like Apollo, Chernobyl and the Pyramids, this engine recreates a real subject:
// U.S. Highway 66, Chicago to Santa Monica, 2,448 miles through eight states.
// The film drives it in the summer of 1957 — the road at its absolute peak, one
// year after the Interstate Highway Act that would kill it was signed — and
// keeps flashing forward to what each stretch is now. Every number the narrator
// speaks is read from here, and here is the record: commissioning and paving
// dates, per-state mileages, the bypass dates, the towns that died.
//
// Mileages are the commonly cited figures for the classic alignment; where
// alignments moved (New Mexico, 1937) the note says so.

export const ROAD = {
  number: 'U.S. 66',
  from: 'Chicago, Illinois',
  to: 'Santa Monica, California',
  miles: 2448,                    // the classic end-to-end figure
  states: 8,
  commissioned: 1926,             // November 11, 1926
  commissionedFull: 'November 11th, 1926',
  fullyPaved: 1938,               // last gravel stretch paved end to end
  motherRoad: {
    coined: 'John Steinbeck',
    book: 'The Grapes of Wrath',
    year: 1939,
    phrase: 'the Mother Road',
  },
  song: {
    title: 'Get Your Kicks on Route 66',
    writer: 'Bobby Troup',
    year: 1946,
    firstSung: 'Nat King Cole',
  },
  dustBowl: {
    decade: 'the 1930s',
    migrants: 210000,             // ~210,000 people to California, 1930s estimate
    note: 'families out of Oklahoma, Kansas, Texas and Arkansas, headed for California',
  },
};

// The kill. Signed one year before this film's drive; finished 28 years later.
export const INTERSTATE = {
  act: 'the Federal-Aid Highway Act',
  signed: 1956,                   // June 29, 1956 — Eisenhower
  signedFull: 'June 29th, 1956',
  president: 'Eisenhower',
  replacedBy: ['I-55', 'I-44', 'I-40', 'I-15', 'I-10'],
  lastBypass: {
    town: 'Williams, Arizona',
    date: 'October 13th, 1984',
    year: 1984,
    note: 'the last Route 66 town anywhere to be bypassed by an interstate',
  },
  decommissioned: {
    year: 1985,                   // June 27, 1985 — AASHTO removes US 66
    dateFull: 'June 27th, 1985',
    note: 'the highway officially ceased to exist; the shields came down',
  },
  survives: 'about eighty-five percent of the old road can still be driven',
};

// The car. One hero, the whole way.
export const CAR = {
  name: 'a 1957 Chevrolet Bel Air',
  short: 'the Bel Air',
  twoTone: 'turquoise and india ivory',
  note: 'the tailfinned icon of the road’s best year',
};

// The eight states, east to west. Each carries what the film needs: mileage,
// terrain, what the state was known for on the road, the billboards it would
// have flown in 1957, and the flash — what this stretch is now.
export const STATES = [
  {
    id: 'illinois',
    name: 'Illinois',
    abbrev: 'ILL',
    nickname: 'Land of Lincoln',
    miles: 301,
    terrain: 'corn prairie, table-flat, out of the Chicago streets',
    knownFor: 'the beginning: the BEGIN U.S. 66 sign at Jackson Boulevard and Michigan Avenue, then three hundred miles of corn',
    towns: ['Chicago', 'Joliet', 'Pontiac', 'Springfield'],
    firstPaved: 1927,             // Illinois had 66 fully paved almost immediately
    flash: {
      kind: 'interstate',
      interstate: 'I-55',
      note: 'I-55 swallowed the corridor; old 66 survives as a frontage road running in its shadow',
    },
  },
  {
    id: 'missouri',
    name: 'Missouri',
    abbrev: 'MO',
    nickname: 'The Show-Me State',
    miles: 317,
    terrain: 'across the Mississippi at St. Louis, then up into the green Ozark hills',
    knownFor: 'the gateway to the West, and the motor courts — tourist cabins with air cooling and a pool',
    towns: ['St. Louis', 'Cuba', 'Rolla', 'Springfield', 'Joplin'],
    meramec: {
      name: 'Meramec Caverns',
      claim: 'the hideout of Jesse James',
      barns: 'its ads painted on barn roofs for hundreds of miles in every direction',
    },
    flash: {
      kind: 'motel',
      interstate: 'I-44',
      note: 'I-44 took the traffic; the motor courts shuttered one by one, pools filled with leaves',
    },
  },
  {
    id: 'kansas',
    name: 'Kansas',
    abbrev: 'KANS',
    nickname: 'The Sunflower State',
    miles: 13,                    // 13.2 — the famous sliver
    milesExact: 13.2,
    terrain: 'one corner of mining country — lead and zinc, chat piles like grey hills',
    knownFor: 'the shortest stretch of all — and the first state to pave every mile of its 66, back in 1929',
    firstPaved: 1929,
    towns: ['Galena', 'Riverton', 'Baxter Springs'],
    flash: {
      kind: 'alive',
      interstate: 'none',
      note: 'the interstate cut the corner and missed Kansas entirely — these thirteen miles were never bypassed, and the old road still carries the town traffic',
    },
  },
  {
    id: 'oklahoma',
    name: 'Oklahoma',
    abbrev: 'OKLA',
    nickname: 'The Sooner State',
    miles: 400,                   // ~400 drivable miles — more than any other state
    terrain: 'red-dirt plains under a huge sky, oil derricks nodding on the horizon',
    knownFor: 'the heart of the road — more miles of 66 than any other state, and the road’s father: Cy Avery of Tulsa, who put the highway through his home town and gave it its number',
    avery: { name: 'Cyrus Avery', town: 'Tulsa', title: 'the Father of Route 66' },
    willRogers: 'the Will Rogers Highway — the whole road carries his name, and he was an Oklahoman',
    towns: ['Tulsa', 'Oklahoma City', 'Clinton', 'Texola'],
    turnpike: {
      name: 'the Turner Turnpike',
      opened: 1953,
      note: 'Tulsa to Oklahoma City — a bypass built three years before the Interstate Act; here, the future arrived early',
    },
    flash: {
      kind: 'ghost',
      interstate: 'I-44',
      note: 'the turnpikes became I-44; on the bypassed loops, whole main streets went quiet',
    },
  },
  {
    id: 'texas',
    name: 'Texas',
    abbrev: 'TEX',
    nickname: 'The Lone Star State',
    miles: 178,
    terrain: 'the Panhandle — dead flat, dead straight, the biggest sky on the whole road',
    knownFor: 'Amarillo, the U-Drop Inn café at Shamrock, and the exact middle of the road: Adrian, Texas — 1,139 miles to Chicago, 1,139 miles to Los Angeles',
    midpoint: { town: 'Adrian', miles: 1139 },
    uDropInn: { name: 'the U-Drop Inn', town: 'Shamrock', built: 1936, style: 'art-deco tower in green and cream tile' },
    towns: ['Shamrock', 'McLean', 'Amarillo', 'Adrian', 'Glenrio'],
    glenrio: {
      name: 'Glenrio',
      note: 'a town straddling the Texas–New Mexico line: gas, diner, motel, all of it living off the road',
      bypassed: 1973,             // I-40 opened past Glenrio in 1973
      after: 'when I-40 opened in 1973 the traffic vanished in a day, and Glenrio died whole — it stands there still, empty',
    },
    flash: {
      kind: 'ghost',
      interstate: 'I-40',
      note: 'Glenrio: bypassed by I-40 in 1973, abandoned almost overnight',
    },
  },
  {
    id: 'newmexico',
    name: 'New Mexico',
    abbrev: 'N. MEX',
    nickname: 'Land of Enchantment',
    miles: 380,                   // post-1937 straightened alignment
    terrain: 'mesas and adobe, pink and gold — and at dusk, the neon comes on',
    knownFor: 'Tucumcari, the neon oasis — a whole town of motels crying TUCUMCARI TONITE from billboards a hundred miles out',
    realignment: {
      year: 1937,
      note: 'the road that once looped north through Santa Fe was cut straight through Albuquerque, saving over a hundred miles',
    },
    tucumcari: {
      slogan: 'TUCUMCARI TONITE',
      rooms: 2000,                // the billboards' claim: 2,000 motel rooms
      blueSwallow: { name: 'the Blue Swallow Motel', opened: 1939, sign: '100% refrigerated air' },
    },
    towns: ['Tucumcari', 'Santa Rosa', 'Albuquerque', 'Gallup'],
    flash: {
      kind: 'neon',
      interstate: 'I-40',
      note: 'I-40 runs past the edge of town; half the neon went dark, and daylight shows the broken tubes',
    },
  },
  {
    id: 'arizona',
    name: 'Arizona',
    abbrev: 'ARIZ',
    nickname: 'The Grand Canyon State',
    miles: 401,
    terrain: 'the Painted Desert in bands of rose and grey, then up into pines at Flagstaff, then down again',
    knownFor: 'the sights the billboards sold: the Painted Desert, the Petrified Forest, a motel in Holbrook where you sleep in a concrete wigwam',
    wigwam: { name: 'the Wigwam Village motel', town: 'Holbrook', opened: 1950, pitch: 'Have you slept in a wigwam lately?' },
    burmaShave: {
      note: 'little red signs in rhyming series, spaced a hundred yards apart',
      rhyme: ['IF DAISIES ARE', 'YOUR FAVORITE FLOWER', 'KEEP PUSHIN’ UP', 'THOSE MILES-PER-HOUR', 'BURMA-SHAVE'],
    },
    seligman: {
      town: 'Seligman',
      barber: 'Angel Delgadillo',
      note: 'the barber of Seligman, whose association won the road its Historic Route 66 signs in 1987',
    },
    towns: ['Holbrook', 'Winslow', 'Flagstaff', 'Seligman', 'Kingman'],
    flash: {
      kind: 'interstate',
      interstate: 'I-40',
      note: 'Williams, October 13th, 1984: the last town on the whole road to be bypassed — the day the through-traffic ended for good',
    },
  },
  {
    id: 'california',
    name: 'California',
    abbrev: 'CALIF',
    nickname: 'The Golden State',
    miles: 314,
    terrain: 'across the Colorado at Needles, then the Mojave — the stretch the Dust Bowl families feared most — then over Cajon Pass and down into the orange groves',
    knownFor: 'the promised land at the end of the road: the desert crossing, then oranges, then the Pacific',
    amboy: {
      name: 'Roy’s Motel and Café',
      town: 'Amboy',
      opened: 1938,
      note: 'the only gas and shade for fifty miles of Mojave',
    },
    mcdonalds: { town: 'San Bernardino', year: 1948, note: 'where the first McDonald’s opened on the old road' },
    towns: ['Needles', 'Amboy', 'Barstow', 'San Bernardino', 'Pasadena', 'Santa Monica'],
    flash: {
      kind: 'ghost',
      interstate: 'I-40',
      note: 'I-40 crossed the Mojave forty miles north in 1973; Amboy emptied, and Roy’s sign now stands over a town of four people',
    },
  },
];

// The end of the trail.
export const FINALE = {
  place: 'Santa Monica',
  sign: 'SANTA MONICA — 66 — END OF THE TRAIL',
  pier: 'the Santa Monica Pier',
  note: 'the official terminus was the corner of Lincoln and Olympic, but the road always really ended here, at the ocean',
};
