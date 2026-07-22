import { PLANT, RBMK, PHYSICS, TEST, NIGHT, AFTERMATH } from './reactor.js';

// The narration — authored, grounded, documentary voice (Andrew, as Apollo).
//
// A cue is one spoken beat: { text, scene, direct, hold }. `scene` names which
// engine scene shows it — 'exterior', 'control', 'cutaway', 'aftermath' — and
// `direct` moves that scene's state machine (its phase and camera). The reactor
// cutaway is the spine; the control room and the exterior cut in around it.
//
// It is told as a systems-and-physics failure. No operator is named. Every
// number is read from reactor.js, so the narrator can only say what history
// recorded.

const clock = (event) => NIGHT.find((n) => n.event === event)?.t ?? '';

export function buildChernobylScript() {
  const cues = [];
  const say = (text, scene, direct = {}, hold = 6) => cues.push({ text, scene, direct, hold });

  // === ACT 1 — THE PLANT AT NIGHT ===========================================
  say(
    `${PLANT.place}, before dawn on ${PLANT.date}. This is ${PLANT.name} — four ` +
    `reactors on a river plain, and tonight our subject is one of them: ` +
    `${PLANT.unit}. An ${RBMK.type}: a thousand megawatts of electricity from a ` +
    `core of uranium and graphite, one of the largest machines the Soviet Union ` +
    `ever built to make power.`,
    'exterior', { ext: 'night', cam: 'wide' }, 9,
  );
  say(
    `Over it stands the exhaust stack, ${PLANT.ventStackHeightM} metres of red and ` +
    `white — the landmark every photograph of this place would one day be framed ` +
    `around. Three kilometres away the plant's own town, ${PLANT.town}, is asleep: ` +
    `some ${PLANT.townPopulation.toLocaleString()} people who will not be told what ` +
    `happens here for more than a day.`,
    'exterior', { ext: 'night', cam: 'stack' }, 9,
  );
  say(
    `Tonight the crew is to run a safety test — ${TEST.goal}. On paper it is ` +
    `routine. It has been delayed for hours and handed down to the night shift, ` +
    `and it will be run on a reactor that is about to be taken to a place its ` +
    `designers never meant it to go.`,
    'control', { room: 'calm', cam: 'wide' }, 9,
  );

  // === ACT 2 — THE TRAP CLOSES ==============================================
  say(
    `This is the core, in cross-section. ${RBMK.fuelChannels.toLocaleString()} ` +
    `vertical channels of enriched uranium, threaded through ` +
    `${RBMK.graphiteBlocks}, with ${RBMK.controlRods} control rods that slide ` +
    `between them to hold the reaction in check. Pull the rods out and it runs ` +
    `hotter; push them in and it quiets. That is the whole idea.`,
    'cutaway', { core: 'idle', cam: 'wide' }, 10,
  );
  say(
    `A reactor is controllable because of a thin margin. Most of the neutrons from ` +
    `each fission arrive at once — but about ${PHYSICS.delayedFractionPct} per cent ` +
    `arrive seconds late, and that fraction of a second of slack is the room in ` +
    `which operators, and rods, can act. Cross it, and the power no longer waits ` +
    `for anyone.`,
    'cutaway', { core: 'idle', cam: 'channel' }, 10,
  );
  say(
    `To set up the test, the crew drove the power down. Near ${clock('power-collapse')} ` +
    `it slipped away from them — thermal output fell to about thirty megawatts, a ` +
    `hundredth of the reactor's rating. Almost out.`,
    'control', { room: 'fall', cam: 'meter' }, 8,
  );
  say(
    `The near-death of the reaction poisoned it. A starved core breeds xenon — a ` +
    `fission product that swallows neutrons, builds up when power drops, and burns ` +
    `off only slowly, with a half-life of about ${PHYSICS.xenonHalfLifeH} hours. It ` +
    `was smothering the fire from within.`,
    'cutaway', { core: 'lowpower', cam: 'channel' }, 9,
  );
  say(
    `To fight the poison and save the test, the rods came out — far more than the ` +
    `rules allowed. Power was dragged back to about two hundred megawatts, still ` +
    `well below the test's own minimum of ${TEST.plannedPowerMW}. The reserve of ` +
    `rods that could have shut it down in a hurry — gone.`,
    'control', { room: 'recover', cam: 'meter' }, 9,
  );
  say(
    `Almost every rod was now withdrawn, hanging above the core. Notice their tips: ` +
    `each boron rod is capped with a length of graphite. That detail — meant to ` +
    `improve the reactor's efficiency — is about to matter more than anything else ` +
    `in the building.`,
    'cutaway', { core: 'rods-out', cam: 'rods' }, 9,
  );
  say(
    `And the ${RBMK.type} carried a flaw in its bones. Its coolant is water, which ` +
    `also absorbs neutrons. Let that water boil to steam, and the absorption falls ` +
    `away — so the reaction speeds up, which makes more steam, which speeds it up ` +
    `again. A ${PHYSICS.voidCoefficient} void coefficient: at low power, a reactor ` +
    `that pushes the wrong way.`,
    'cutaway', { core: 'steam', cam: 'wide' }, 10,
  );

  // === ACT 3 — AZ-5 =========================================================
  say(
    `At ${clock('test-begins')}, the test begins. The turbine is tripped and left to ` +
    `coast; the pumps it feeds begin to slow; the flow of water through the core ` +
    `falls. In a stable reactor, nothing. In this one, at this moment, the trap is ` +
    `set.`,
    'control', { room: 'test', cam: 'wide' }, 9,
  );
  say(
    `Less flow, more steam. The steam voids raise the reactivity; the rising power ` +
    `boils still more water. The core starts to climb — slowly at first, then not ` +
    `slowly — and the delayed-neutron margin begins to close.`,
    'cutaway', { core: 'creep', cam: 'channel' }, 9,
  );
  say(
    `At ${clock('az5')}, the crew reaches for the last defence: AZ-5, the emergency ` +
    `shutdown. One button that drives every control rod down into the core at once. ` +
    `It should have ended the night here.`,
    'control', { room: 'az5', cam: 'button' }, 8,
  );
  say(
    `But the rods enter graphite-first. As each one starts down, its graphite tip ` +
    `shoulders water — a neutron absorber — out of the bottom of the core, and for ` +
    `an instant the reaction there does not slow. It surges. The off switch, ` +
    `pressed, becomes the trigger.`,
    'cutaway', { core: 'scram', cam: 'rods' }, 9,
  );
  say(
    `The surge crosses the margin. Now the power is riding the prompt neutrons ` +
    `alone, and it doubles, and doubles again — toward ${PHYSICS.peakPowerFactor} ` +
    `times the reactor's full rating in the space of a few seconds. The fuel ` +
    `shatters.`,
    'cutaway', { core: 'spike', cam: 'spike' }, 8,
  );
  say(
    `Shattered fuel meets the cooling water and flashes it instantly to steam. The ` +
    `pressure has nowhere to go. A steam explosion lifts the ` +
    `${RBMK.lidMassTonnes.toLocaleString()}-tonne lid — ${RBMK.lidName} — clear off ` +
    `the top of the core. Seconds later, a second explosion tears the reactor ` +
    `hall open.`,
    'cutaway', { core: 'blowout', cam: 'blowout' }, 9,
  );
  say(
    `From outside, in the dark, it is one white flash and then a rain of burning ` +
    `debris — pieces of the core itself thrown across the roofs. The roof of ` +
    `${PLANT.unit} is simply gone.`,
    'exterior', { ext: 'explosion', cam: 'hall' }, 8,
  );

  // === ACT 4 — THE OPEN CORE ================================================
  say(
    `What is left is something no reactor is ever meant to be: open to the sky. The ` +
    `graphite — thousands of tonnes of it — has caught fire, and it will burn for ` +
    `days, carrying the core's poison up into the night on the smoke.`,
    'exterior', { ext: 'fire', cam: 'hall' }, 9,
  );
  say(
    `On the ground around the hole lie blocks of that graphite, glowing, flung out ` +
    `by the blast — fragments of the reactor scattered across its own roof, each ` +
    `one lethal to stand beside.`,
    'aftermath', { after: 'open', cam: 'core' }, 8,
  );
  say(
    `And over the open core stands a column of air, faintly, impossibly blue — air ` +
    `itself ionized by the radiation pouring out of the wound. ` +
    `${cap(AFTERMATH.fireCrews)}`,
    'aftermath', { after: 'glow', cam: 'blue' }, 9,
  );
  say(
    `The plume drifts out over the sleeping country carrying what the core has ` +
    `spilled. ${cap(AFTERMATH.firstDeaths)} — and far more, downwind and across ` +
    `years, than any count made that night.`,
    'aftermath', { after: 'plume', cam: 'wide' }, 9,
  );
  say(
    `A grey dawn comes up on the broken building. ${PLANT.town} will not be ` +
    `evacuated for another ${AFTERMATH.evacuationHours} hours, and then never ` +
    `lived in again — a city stopped at a single morning.`,
    'exterior', { ext: 'dawn', cam: 'dawn' }, 9,
  );
  say(
    `The reaction was never the enemy. What failed here was the machine's hidden ` +
    `flaws, and the string of choices that walked it, step by reasonable step, ` +
    `past every line that was meant to hold. It is the quietest kind of ` +
    `catastrophe: one that everyone, at each moment, believed was still under ` +
    `control.`,
    'aftermath', { after: 'dawn', cam: 'blue' }, 11,
  );

  return { cues };
}

// Sentence-case a fact fragment that begins lower-case, for mid-sentence use.
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
