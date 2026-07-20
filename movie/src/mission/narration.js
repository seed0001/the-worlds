import { SATURN_V, SITE, ASCENT, TRANSLUNAR, MOON, DESCENT } from './mission.js';

// The mission narration — authored, grounded, documentary voice.
//
// This engine is a recreation, not a generator: the script is fixed and the
// facts are real. A cue is one spoken beat: { text, scene, direct, hold }.
// `direct.launch` moves the launch scene's state machine (countdown, ignite,
// liftoff, staging); `direct.cam` picks the framing.
//
// Phase 1 covers Act 1 — the launch, pad to orbit. Acts 2–4 (translunar,
// the moonwalk, the return) are added in later phases.

// Newtons -> millions of pounds-force. 1 lbf = 4.448 N. (The earlier form
// divided by 4.448e6 and then again by 1e6, giving ~0.0 for every value.)
const mlbf = (n) => `${(n / 4.448 / 1e6).toFixed(1)} million pounds`;

export function buildMissionScript() {
  const S = SATURN_V.stages;
  const cues = [];
  const say = (text, direct = {}, hold = 6) => cues.push({ text, scene: 'launch', direct, hold });

  // === ACT 1 — LAUNCH =======================================================
  say(
    `${SITE.pad}, before dawn. On the pad stands the largest machine ever flown: ` +
    `the Saturn V — ${Math.round(SATURN_V.heightM)} metres tall, three hundred and ` +
    `sixty-three feet of rocket, fully fuelled and holding still. In a few minutes ` +
    `almost all of it will be gone, spent in the effort of leaving the Earth.`,
    { launch: 'countdown', cam: 'pad' }, 9,
  );

  say(
    `Ignition begins six seconds before release. The five F-1 engines of the first ` +
    `stage light in sequence and build toward ${mlbf(S.s1c.thrustN)} of thrust — ` +
    `more power than the machine weighs — while the hold-down arms still refuse to ` +
    `let it go, waiting to be certain every engine is running true.`,
    { launch: 'ignite', cam: 'engines' }, 8,
  );

  say(
    `Release. The arms let go, and ${mlbf(S.s1c.thrustN)} of thrust lifts three ` +
    `thousand tonnes off the pad — slowly at first, one deliberate metre at a time, ` +
    `then faster. We have a liftoff.`,
    { launch: 'liftoff', cam: 'liftoff' }, 7,
  );

  say(
    `The stack clears the tower and rolls onto its heading, then tips over ` +
    `downrange — trading straight-up for out-to-sea, because orbit is not about ` +
    `height so much as speed. Within a minute it will be faster than sound.`,
    { launch: 'tower-clear', cam: 'track' }, 7,
  );

  say(
    `Around ${ASCENT.find((a) => a.event === 'max-q').t} seconds it passes through ` +
    `max Q — the moment of maximum aerodynamic pressure, where the air fights ` +
    `hardest against the climb. Past it, the sky thins and darkens, and the engines ` +
    `only push harder.`,
    { launch: 'max-q', cam: 'track' }, 7,
  );

  say(
    `Under three minutes up, the first stage is empty — its only job was to throw ` +
    `the rest higher and faster. It lets go.`,
    { launch: 'staging', cam: 'sep-plane' }, 5,
  );
  say(
    `It falls back, tumbling, toward the sea it rose beside — and in the same breath, ` +
    `just above it, the five engines of the second stage light and drive on.`,
    { cam: 'sep-fall' }, 6,
  );

  say(
    `Six minutes later, the same parting again: the second stage is spent, and ` +
    `releases.`,
    { launch: 'stage2', cam: 'sep-plane-b' }, 5,
  );
  say(
    `It drops behind into the black; above it the third stage — the S-IVB — lights ` +
    `alone to push the last of the stack up to orbital speed.`,
    { cam: 'sep-fall' }, 6,
  );

  say(
    `What is left is small, and fast, and finally weightless — a spacecraft in orbit ` +
    `around the Earth, ${SATURN_V.parkingOrbitKm} kilometres up, moving at nearly eight ` +
    `kilometres a second. The hardest part of leaving is done. Now they aim for the Moon.`,
    { launch: 'orbit', cam: 'track' }, 9,
  );

  // === ACT 2 — TO THE MOON ==================================================
  const spc = (text, direct = {}, hold = 7) => cues.push({ text, scene: 'space', direct, hold });
  const moon = (text, direct = {}, hold = 7) => cues.push({ text, scene: 'moon', direct, hold });

  spc(
    `They circle the Earth once, checking the ship, and then — over the far side, ` +
    `out of sight of home — the third stage lights a second time. This is trans-lunar ` +
    `injection: the burn that turns a circle around the Earth into a path to the Moon.`,
    { space: 'tli', cam: 'stack' }, 8,
  );

  spc(
    `The burn lasts nearly ${TRANSLUNAR.tliBurnMin} minutes and lifts their speed to ` +
    `about ${TRANSLUNAR.speedAfterTliKms} kilometres a second — just short of the speed ` +
    `it takes to leave the Earth for good. It is enough. The planet begins, visibly, to ` +
    `fall away behind them.`,
    { space: 'tli', cam: 'stack' }, 8,
  );

  spc(
    `Now a strange piece of choreography. The lander is folded inside the spent third ` +
    `stage, and the crew ship must turn around and pull it out. The command ship ` +
    `separates, rolls end for end, and comes back nose-first — as the four panels of ` +
    `the shroud fall open and expose the Lunar Module waiting inside.`,
    { space: 'transpose', cam: 'maneuver' }, 9,
  );

  spc(
    `They dock, nose to nose, and draw the lander free. Two craft that flew up ` +
    `stacked are now joined into one — the command ship that stays in orbit, and the ` +
    `fragile lander that will go down to the surface.`,
    { space: 'transpose', cam: 'maneuver' }, 8,
  );

  spc(
    `And the empty third stage, its job done, is set loose — cast off to drift away ` +
    `on its own and swing past the Moon, lost. The joined ship turns, and flies on.`,
    { space: 'castoff', cam: 'castoff' }, 7,
  );

  spc(
    `And then, for three days, they simply fall toward the Moon — engines off, ` +
    `coasting the whole way, turning slowly to spread the sun's heat evenly across the ` +
    `hull. Behind them the Earth shrinks to a blue marble you could hide behind your ` +
    `thumb. Ahead, the Moon grows from a light into a world.`,
    { space: 'coast', cam: 'coast' }, 9,
  );

  spc(
    `Near the Moon they slip behind it and fire the engine to slow down, letting its ` +
    `gravity capture them into orbit — ${TRANSLUNAR.lunarOrbitKm} kilometres above a ` +
    `grey, airless, cratered ground that no one has ever stood on. From here, two of ` +
    `the three climb into the lander.`,
    { space: 'lunar-orbit', cam: 'moon' }, 8,
  );

  spc(
    `The lander undocks. Springs push it gently clear of the command ship, and for ` +
    `the first time it flies on its own — a spidery craft built only for vacuum, that ` +
    `could never survive air or gravity back home.`,
    { space: 'undock', cam: 'undock-close' }, 7,
  );
  spc(
    `One man stays behind, alone, to keep the command ship in orbit. The other two ` +
    `fall toward ${MOON.landingSite}, firing the descent engine against their speed, ` +
    `trading orbit for a controlled fall to the surface.`,
    { space: 'undock', cam: 'undock' }, 8,
  );

  moon(
    `The descent takes about ${DESCENT.durationMin} minutes. The lander pitches over ` +
    `to bring the landing site into view, and the commander flies it down by hand over ` +
    `a field of craters and boulders, hunting for a patch of ground smooth enough to ` +
    `set down on.`,
    { moon: 'descent', cam: 'descent' }, 9,
  );

  moon(
    `The last hundred metres, slow and deliberate — and now the engine is close enough ` +
    `to the ground to matter. There is no air, so the dust it kicks up does not billow; ` +
    `it sheets straight out, flat and fast, across the surface in every direction.`,
    { moon: 'landing', cam: 'landing' }, 8,
  );

  moon(
    `Probes beneath the footpads touch first, and a light comes on in the cabin: ` +
    `contact. The engine shuts down, and the lander settles the last inches onto its ` +
    `legs. For the first time, a machine from Earth is standing, still and intact, on ` +
    `the surface of another world.`,
    { moon: 'landed', cam: 'landed' }, 9,
  );

  return { title: 'Apollo — The Mission', cues };
}
