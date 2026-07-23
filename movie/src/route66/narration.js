import { ROAD, INTERSTATE, CAR, STATES, FINALE } from './route66.js';

// The narration — authored, grounded, documentary voice (Andrew, like Apollo,
// Chernobyl and the Pyramids). A cue is one spoken beat: { text, scene,
// direct, hold }. Scene is 'highway' for the drive and 'pier' for the end.
//
// The film's grammar: the drive lives in the summer of 1957 — the road at its
// peak, one year after the act that doomed it — and keeps CUTTING FORWARD to
// the present (direct.flash = kind), then home again (direct.flash = null).
// The camera never moves across the cut. Eight states, eight chapters, one
// state-line sign after another, and the same Bel Air the whole way.

const S = Object.fromEntries(STATES.map((s) => [s.id, s]));

export function buildRoute66Script() {
  const cues = [];
  const say = (text, scene, direct = {}, hold = 8) => cues.push({ text, scene, direct, hold });

  // Entering a state: return home from any flash, swap the dressing, raise the
  // ENTERING sign up the road.
  const enter = (st, extra = {}) => ({
    flash: null,
    state: st.id,
    signName: st.name,
    signNickname: st.nickname,
    ...extra,
  });

  // === CHICAGO — WHERE IT BEGINS ===========================================
  say(
    `Chicago, Illinois, first light, the summer of 1957. The sun is coming up ` +
    `over the lake behind us, and on a street corner downtown stands a small ` +
    `sign: BEGIN U.S. 66. From here, one highway runs ` +
    `${ROAD.miles.toLocaleString()} miles southwest — through ${ROAD.states} states, ` +
    `to the Pacific Ocean at ${FINALE.place}. It was commissioned on ` +
    `${ROAD.commissionedFull}, and by 1938 it was paved every mile of the way. ` +
    `They call it the Main Street of America — and we will drive all of it ` +
    `between this sunrise and tonight's sunset: one long day, west with the sun.`,
    'highway',
    {
      state: 'illinois', sign: false, cam: 'front', time: 0.055,
      // The front camera looks back east: the skyline and the BEGIN sign sit
      // behind the car, facing us, and the city recedes as the drive starts.
      spawn: [{ kind: 'skyline', at: -120 }, { kind: 'begin', at: -22, opts: { face: true } }, { kind: 'diner', at: 260 }],
    },
    11,
  );
  say(
    `Our ride is ${CAR.name}, ${CAR.twoTone} — ${CAR.note}. And one thing must be ` +
    `said before the corn starts: this road is already condemned. One year ago, on ` +
    `${INTERSTATE.signedFull}, President ${INTERSTATE.president} signed ` +
    `${INTERSTATE.act}, and the interstates it pays for will replace every mile of ` +
    `this one. Nobody on the road today believes that. Watch closely; this film ` +
    `will keep showing you.`,
    'highway',
    { cam: 'chase', time: 0.07, spawn: [{ kind: 'shield', at: 90 }] },
    11,
  );

  // === ILLINOIS =============================================================
  const il = S.illinois;
  say(
    `Illinois gives the road ${il.miles} miles, and after the city lets go, almost ` +
    `all of them are corn. The billboards start immediately — caves, courts, ` +
    `curios, some of them selling stops three hundred miles ahead. On Route 66 the ` +
    `advertising is part of the geography.`,
    'highway',
    {
      cam: 'side', time: 0.08,
      spawn: [
        { kind: 'billboard', at: 120, opts: { top: 'SEE', main: 'MERAMEC CAVERNS', sub: 'JESSE JAMES HIDEOUT — MISSOURI' } },
        { kind: 'billboard', at: 300, side: -1, opts: { main: 'DINER — ALL NITE', sub: 'STEAKS · PIE · COFFEE', bg: '#1d3a5f' } },
        { kind: 'barn', at: 460, opts: { text: 'MERAMEC CAVERNS' } },
      ],
    },
    9,
  );
  say(
    `Now watch. This exact spot — today.` +
    ` The corridor belongs to ${il.flash.interstate}: four lanes, seventy miles an ` +
    `hour, no reason to stop. ${cap(il.flash.note)}. The old road is still down ` +
    `there beside it, demoted to a service drive. Remember this trick; the film ` +
    `will keep playing it.`,
    'highway',
    { flash: 'interstate' },
    10,
  );

  // === MISSOURI =============================================================
  const mo = S.missouri;
  say(
    `And back — 1957, engine running. The Mississippi, St. Louis, and Missouri: ` +
    `${mo.miles} miles, the gateway to the West, ${mo.terrain}. `,
    'highway',
    enter(mo, { cam: 'signview', time: 0.13 }),
    8,
  );
  say(
    `Missouri's billboards are barns. ${cap(mo.meramec.name)} — ${mo.meramec.claim}, ` +
    `so the claim goes — has ${mo.meramec.barns}. And Missouri perfected the motor ` +
    `court: cabins in a crescent, a pool out front, air cooling and television — ` +
    `and two letters every owner prays to switch on: the NO in front of VACANCY.`,
    'highway',
    {
      cam: 'side',
      spawn: [
        { kind: 'barn', at: 140, opts: { text: 'MERAMEC CAVERNS' } },
        { kind: 'motorcourt', at: 320 },
        { kind: 'billboard', at: 240, side: -1, opts: { top: 'TONIGHT', main: 'WAGON WHEEL', sub: 'MOTOR COURT — POOL — TV', bg: '#3f5d44' } },
      ],
    },
    10,
  );
  say(
    `Today. ${cap(mo.flash.interstate)} took the through-traffic, and the motor ` +
    `courts died in rows — ${mo.flash.note}. A pool full of leaves is the ` +
    `interstate era's most common ruin.`,
    'highway',
    { flash: 'motel' },
    9,
  );

  // === KANSAS ===============================================================
  const ks = S.kansas;
  say(
    `1957. And almost before Missouri lets go, a new sign: Kansas — all ` +
    `${ks.milesExact} miles of it, the shortest stretch in any state, one clipped ` +
    `corner of lead-and-zinc mining country. Kansas was proud of it: ` +
    `first state on the whole road to pave every mile, back in ${ks.firstPaved}. ` +
    `Galena, Riverton, Baxter Springs — and out.`,
    'highway',
    enter(ks, { cam: 'chase', time: 0.2 }),
    10,
  );
  say(
    `Today — and here the trick fails, for once, in the road's favour. The ` +
    `interstate cut the corner and missed Kansas entirely: ${ks.flash.note}. ` +
    `Thirteen miles out of two and a half thousand, spared by geometry.`,
    'highway',
    { flash: 'alive' },
    9,
  );

  // === OKLAHOMA =============================================================
  const ok = S.oklahoma;
  say(
    `Oklahoma. Red dirt, oil derricks, and more of this highway than anywhere ` +
    `else — about ${ok.miles} miles of it. The road exists because of an Oklahoman: ` +
    `${ok.avery.name} of ${ok.avery.town}, ${ok.avery.title}, who bent the national ` +
    `route map through his home state and fought to put a six and a six on the shield.`,
    'highway',
    enter(ok, { cam: 'signview', time: 0.25 }),
    10,
  );
  say(
    `They call it ${ok.willRogers.split(' — ')[0]}. But this stretch carries a ` +
    `darker memory: in ${ROAD.dustBowl.decade}, when the fields here blew away, some ` +
    `${(ROAD.dustBowl.migrants / 1000).toFixed(0)} thousand people took this road ` +
    `west — ${ROAD.dustBowl.note}. ${ROAD.motherRoad.coined}, in ` +
    `${ROAD.motherRoad.book}, ${ROAD.motherRoad.year}, gave the road its other ` +
    `name: ${ROAD.motherRoad.phrase}.`,
    'highway',
    {
      cam: 'front',
      spawn: [{ kind: 'billboard', at: 200, opts: { top: 'YOU ARE DRIVING', main: 'WILL ROGERS HIGHWAY', sub: 'U. S. 66', bg: '#1d3a5f' } }],
    },
    11,
  );
  say(
    `Main streets live off the road here — gas, café, groceries, motel, repeat, ` +
    `town after town. But Oklahoma is also where the future arrived first: ` +
    `${ok.turnpike.name} opened in ${ok.turnpike.opened} — ${ok.turnpike.note}.`,
    'highway',
    { cam: 'side', spawn: [{ kind: 'town', at: 280 }, { kind: 'gas', at: 180, opts: { name: 'GAS', sub: 'REGULAR 29¢' } }] },
    10,
  );
  say(
    `Today. ${cap(ok.flash.note)}. The buildings wait for traffic ` +
    `that has an exit of its own now, four miles south.`,
    'highway',
    { flash: 'ghost' },
    10,
  );

  // === TEXAS ================================================================
  const tx = S.texas;
  say(
    `1957 — and Texas. The Panhandle: ${tx.miles} miles, ${tx.terrain}. The ` +
    `landmark here is the ${tx.uDropInn.name} at ${tx.uDropInn.town}, an ` +
    `${tx.uDropInn.style}, ${tx.uDropInn.built} — you can see its tower for miles.`,
    'highway',
    enter(tx, {
      cam: 'chase', time: 0.31,
      spawn: [{ kind: 'billboard', at: 220, opts: { top: tx.uDropInn.town.toUpperCase() + ' — 8 MI', main: 'U-DROP INN', sub: 'EAT · GAS · TOWER OF PIE', bg: '#2e6b60' } }],
    }),
    9,
  );
  say(
    `Halfway. At ${tx.midpoint.town}, Texas, a sign splits the road in two: ` +
    `${tx.midpoint.miles.toLocaleString()} miles back to Chicago, ` +
    `${tx.midpoint.miles.toLocaleString()} miles on to Los Angeles. Every crossing ` +
    `of the continent balances, for one instant, on this dot in the Panhandle.`,
    'highway',
    {
      cam: 'wide',
      spawn: [{ kind: 'billboard', at: 200, opts: { top: 'ADRIAN — MIDPOINT OF 66', main: '1139 MILES', sub: 'CHICAGO ← YOU ARE HERE → LOS ANGELES', bg: '#8c3a30' } }],
    },
    9,
  );
  say(
    `At the New Mexico line stands ${tx.glenrio.name} — ${tx.glenrio.note}. Gas on ` +
    `the Texas side, beer on the New Mexico side, and every single dollar of it ` +
    `arriving by this road. Hold that thought.`,
    'highway',
    { cam: 'side', spawn: [{ kind: 'town', at: 260, opts: { names: ['CAFE', 'GAS', 'MOTEL', 'BEER', 'GARAGE'] } }, { kind: 'gas', at: 160 }] },
    9,
  );
  say(
    `${tx.glenrio.name}, today. ${cap(tx.glenrio.after)}. No fire, no flood, no ` +
    `fault of its own — just an interstate, opened forty miles of convenience away.`,
    'highway',
    { flash: 'ghost' },
    10,
  );

  // === NEW MEXICO ===========================================================
  const nm = S.newmexico;
  say(
    `New Mexico, and the light goes long. ${nm.miles} miles of ` +
    `mesas and adobe — fewer than there used to be: in ${nm.realignment.year}, ` +
    `${nm.realignment.note}.`,
    'highway',
    enter(nm, { cam: 'signview', time: 0.38 }),
    9,
  );
  say(
    `And as the sun drops toward the mesas, the road's own aurora comes on ` +
    `early: ${nm.tucumcari.slogan}. The ` +
    `billboards start a hundred miles out and all say the same thing — ` +
    `${nm.tucumcari.rooms.toLocaleString()} rooms, ${nm.tucumcari.blueSwallow.name} ` +
    `with its ${nm.tucumcari.blueSwallow.sign}, every sign in town burning neon at ` +
    `the desert. This is the road at its absolute peak. Drink it in.`,
    'highway',
    {
      cam: 'side', time: 0.43,
      spawn: [
        { kind: 'billboard', at: 130, opts: { top: 'TONITE', main: 'TUCUMCARI', sub: '2000 ROOMS — 66 FLAVORS OF NEON', bg: '#22283a', accent: '#ff4fa0' } },
        { kind: 'neon', at: 300 },
      ],
    },
    11,
  );
  say(
    `The same block, today, by daylight. ${cap(nm.flash.interstate)} runs past the ` +
    `edge of town; ${nm.flash.note.split('; ')[1]}. Neon is a living thing — it ` +
    `needs current and customers, and half of Tucumcari's lost both.`,
    'highway',
    { flash: 'neon' },
    10,
  );

  // === ARIZONA ==============================================================
  const az = S.arizona;
  say(
    `The light is getting late now, and Arizona spends it on the strangest ` +
    `country of the whole road — ${az.miles} miles of it: ${az.terrain}.`,
    'highway',
    enter(az, { cam: 'chase', time: 0.455 }),
    8,
  );
  say(
    `Arizona is where the billboards sell wonders instead of rooms: the Painted ` +
    `Desert, the Petrified Forest, a crater a mile wide — and at ${az.wigwam.town}, ` +
    `${az.wigwam.name}, ${az.wigwam.opened}, whose pitch is a question: ` +
    `${az.wigwam.pitch}`,
    'highway',
    {
      cam: 'side',
      spawn: [
        { kind: 'billboard', at: 130, opts: { top: 'SEE THE', main: 'PAINTED DESERT', sub: 'AND THE PETRIFIED FOREST', bg: '#8c5a74' } },
        { kind: 'wigwams', at: 300 },
        { kind: 'billboard', at: 220, side: -1, opts: { main: 'SLEEP IN A WIGWAM', sub: 'HOLBROOK — TONITE', bg: '#a5231d' } },
      ],
    },
    10,
  );
  say(
    `And the smallest show on the road: little red signs, a hundred yards apart, ` +
    `one line each. ${az.burmaShave.rhyme.slice(0, 4).join(' — ').toLowerCase()} — ` +
    `${az.burmaShave.rhyme[4]}. Every child in the back seat of America knows to ` +
    `wait for the last sign.`,
    'highway',
    { cam: 'front', spawn: [{ kind: 'burma', at: 90, opts: { lines: az.burmaShave.rhyme } }] },
    9,
  );
  say(
    `Today — and this is where the story ends, so look hard. ${az.flash.note} ` +
    `The very last stoplight on ${INTERSTATE.lastBypass.town.split(',')[0]}'s main ` +
    `street went dark that afternoon. Twenty-eight years after the act was signed, ` +
    `the interstate finally closed around the whole road.`,
    'highway',
    { flash: 'interstate' },
    11,
  );

  // === CALIFORNIA ===========================================================
  const ca = S.california;
  say(
    `But our year is 1957, and there is one state left. California: ${ca.miles} ` +
    `miles that begin with a warning — the Mojave. The Dust Bowl families crossed ` +
    `it at night in overheating cars, and even now drivers time the desert for ` +
    `dawn. Water bags on the bumper. Needles, then nothing.`,
    'highway',
    enter(ca, { cam: 'wide', time: 0.465 }),
    10,
  );
  say(
    `Nothing except ${ca.amboy.town}: ${ca.amboy.name}, ${ca.amboy.opened} — ` +
    `${ca.amboy.note}. A café, a motel, a row of pumps and a tall sign, holding ` +
    `fifty miles of desert together on its own.`,
    'highway',
    { cam: 'side', time: 0.47, spawn: [{ kind: 'roys', at: 280 }] },
    9,
  );
  say(
    `Today. ${cap(ca.flash.note)}. ` +
    `The sign outlived the town it advertised; photographers drive out from the ` +
    `interstate to shoot the ruin of the thing the interstate killed.`,
    'highway',
    { flash: 'roys' },
    10,
  );
  say(
    `Then the reward for the desert, same as it was in 1935: over Cajon Pass and ` +
    `down into another world — palms, and orange groves to the horizon. At ` +
    `${ca.mcdonalds.town}, ${ca.mcdonalds.year}, two brothers opened a hamburger ` +
    `stand on the old road; you may have heard how that turned out. The suburbs ` +
    `thicken, the boulevards begin, and the desert becomes a rumour.`,
    'highway',
    {
      flash: null, cam: 'chase', time: 0.478,
      spawn: [
        { kind: 'prop', at: 60, opts: { prop: 'palm' } }, { kind: 'prop', at: 90, side: -1, opts: { prop: 'palm' } },
        { kind: 'prop', at: 130, opts: { prop: 'orangeRow', off: 22 } }, { kind: 'prop', at: 150, side: -1, opts: { prop: 'orangeRow', off: 22 } },
        { kind: 'prop', at: 180, opts: { prop: 'palm' } }, { kind: 'prop', at: 210, side: -1, opts: { prop: 'palm' } },
        { kind: 'billboard', at: 240, opts: { top: 'SANTA MONICA — 60 MI', main: 'END OF THE TRAIL', sub: 'THE PACIFIC OCEAN', bg: '#1d3a5f' } },
      ],
    },
    11,
  );

  // === THE PIER =============================================================
  say(
    `And then there is no more road to build on. ${cap(FINALE.pier)}. ` +
    `${ROAD.miles.toLocaleString()} miles from a street corner in Chicago, U.S. 66 ` +
    `runs out of continent at the Pacific Ocean — and the sun that came up over ` +
    `the lake this morning is going down into the water ahead of the pier. ` +
    `${cap(FINALE.note)}.`,
    'pier',
    { pier: 'arrive', cam: 'wide' },
    11,
  );
  say(
    `Run the dates like mile markers. Commissioned ${ROAD.commissioned}. Paved end ` +
    `to end, ${ROAD.fullyPaved}. Steinbeck names it ${ROAD.motherRoad.year}; Bobby ` +
    `Troup sets it to music, ${ROAD.song.year}. The Interstate Act, ` +
    `${INTERSTATE.signed}. And then twenty-eight years of bypasses, ending at ` +
    `${INTERSTATE.lastBypass.town}, ${INTERSTATE.lastBypass.date}.`,
    'pier',
    { cam: 'sign' },
    11,
  );
  say(
    `On ${INTERSTATE.decommissioned.dateFull}, ${INTERSTATE.decommissioned.note}. ` +
    `U.S. 66 no longer exists. And yet: ${INTERSTATE.survives} — past the ghost ` +
    `towns and the dead neon and the thirteen lucky miles of Kansas, wearing brown ` +
    `HISTORIC signs where the shields used to hang. Decommissioned is not the same ` +
    `word as gone.`,
    'pier',
    { pier: 'today', cam: 'ocean' },
    12,
  );
  say(
    `So the film ends where it likes it best: sunset, 1957, a ` +
    `${CAR.twoTone} Bel Air parked under the sign at the end of the trail. Two ` +
    `thousand, four hundred and forty-eight miles — and every one of them, for one ` +
    `more evening, still open. Get your kicks.`,
    'pier',
    { pier: 'arrive', cam: 'sign' },
    12,
  );

  return { cues };
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
