import { SATURN_V, SITE, ASCENT } from './mission.js';

// The mission narration — authored, grounded, documentary voice.
//
// This engine is a recreation, not a generator: the script is fixed and the
// facts are real. A cue is one spoken beat: { text, scene, direct, hold }.
// `direct.launch` moves the launch scene's state machine (countdown, ignite,
// liftoff, staging); `direct.cam` picks the framing.
//
// Phase 1 covers Act 1 — the launch, pad to orbit. Acts 2–4 (translunar,
// the moonwalk, the return) are added in later phases.

const mlbf = (n) => `${(n / 4.448e6 / 1e6).toFixed(1)} million pounds`;

export function buildMissionScript() {
  const S = SATURN_V.stages;
  const cues = [];
  const say = (text, direct = {}, hold = 6) => cues.push({ text, scene: 'launch', direct, hold });

  // === ACT 1 — LAUNCH =======================================================
  say(
    `${SITE.pad}, before dawn. On the pad stands the largest machine ever flown: ` +
    `the Saturn V, ${Math.round(SATURN_V.heightM)} metres tall — a hundred and ten ` +
    `metres of rocket, fully fuelled, holding still. In a few minutes almost all of ` +
    `it will be gone, spent in the effort of leaving the Earth.`,
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
    `height so much as speed. It is already moving faster than sound.`,
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
    `Two and a half minutes up, the first stage is empty — its only job was to ` +
    `throw the rest higher and faster. It falls away, and the second stage lights ` +
    `to carry on toward space.`,
    { launch: 'staging', cam: 'staging' }, 7,
  );

  say(
    `Stage by stage, the rocket sheds itself, until what is left is small and fast ` +
    `and finally weightless — a spacecraft in orbit around the Earth, ${SATURN_V.parkingOrbitKm} ` +
    `kilometres up, moving at eight kilometres a second. The hardest part of leaving ` +
    `is done. Now they aim for the Moon.`,
    { launch: 'orbit', cam: 'track' }, 9,
  );

  return { title: 'Apollo — The Mission', cues };
}
