import * as THREE from 'three';

// Planet dynamics -> body plan.
//
// A fauna spec (biomes.js) says WHAT lives somewhere: "a herd animal, four
// legs, longish neck, about 2 m". This file decides what that animal LOOKS like
// on this particular world, and every derivation is a real biomechanical
// argument run in one direction:
//
//   gravity      -> leg cross-section (mass scales with size^3, bone strength
//                   with radius^2 — big or high-g animals get graviportal legs),
//                   gait frequency (a leg is a pendulum: f ~ sqrt(g/l)),
//                   and how much anything dares bounce.
//   air density  -> whether powered flight works at all, and the wing area
//                   needed to hold a given weight up. Thin air, huge wings.
//   temperature  -> Allen's rule. Cold worlds shorten extremities and round
//                   the torso (surface/volume); hot worlds stretch them into
//                   radiators. Coats get shaggy below freezing.
//   terrain      -> rough ground favours longer legs and a wider stance.
//
// The output is deliberately plain data — the rig (rig.js) and the behaviours
// (Fauna.js) both read from it, so the animal that is drawn and the animal that
// moves are the same animal.

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/**
 * @param {import('../world/World.js').World} world
 * @param {object} spec - one rolled fauna entry off world.fauna
 * @param {Function} rng - forked stream, one per species
 */
export function makeGenome(world, spec, rng) {
  const g = world.gravity;
  // How much air there is to push against, 0..~0.6. Opacity is the honest proxy
  // here — it's the number the orbital shot already treats as "how much
  // atmosphere this world visibly has".
  const air = world.atmosphere.opacity * (0.5 + 0.5 * (world.atmosphere.thickness / 1.5));
  const tempC = world.biome.temperatureC ?? 15;

  const cold = clamp01((10 - tempC) / 70);   // 0 temperate -> 1 around -60
  const heat = clamp01((tempC - 25) / 90);   // 0 temperate -> 1 around +115
  const rough = clamp01((world.surface.detail.amplitudeM - 15) / 35);

  const size = spec.sizeM ?? 1.0;
  const flier = spec.domain === 'air';

  // -- Torso. Cold compresses (sphere-ward), heat stretches. --
  const bodyLen = size * (1.5 - 0.4 * cold + 0.25 * heat) * rng.range(0.92, 1.08);
  const bodyRad = size * (0.42 + 0.22 * cold + 0.08 * (g - 1) - 0.1 * heat) * rng.range(0.9, 1.1);

  // -- Legs. --
  const legCount = flier ? 0 : (spec.legs ?? 4);
  // Long on hot rough low-g worlds, stumpy on cold heavy ones.
  const legLen = Math.max(
    size * 0.25,
    (size * (0.85 + 0.45 * heat + 0.3 * rough - 0.35 * cold)) / (0.65 + 0.45 * g),
  ) * rng.range(0.9, 1.1);
  // Cross-section carries mass*g spread over the legs: radius ~ sqrt(size^3*g/n).
  const legRad = Math.max(
    0.02,
    0.16 * Math.sqrt((size * size * size * g) / Math.max(legCount, 2)) / Math.max(size, 0.3),
  );

  // -- Neck, head, tail. Extremities obey the same cold/heat rule. --
  const neckLen = size * (spec.neck ?? (flier ? 0.25 : 0.35)) * (1 - 0.45 * cold + 0.3 * heat);
  const headSize = size * (0.26 + 0.08 * cold) * rng.range(0.9, 1.1);
  const snoutLen = headSize * (0.8 + 0.5 * heat - 0.3 * cold);
  const tailLen = size * (spec.tail ?? (flier ? 0.6 : 0.5)) * rng.range(0.85, 1.15);

  // -- Wings. Lift ~ air * area * v^2 has to carry weight ~ size^3 * g, so
  //    span grows with sqrt(loading). Below a floor of air there is no flier
  //    the mesher can honestly draw; Fauna.populate uses `canFly` to ground
  //    (i.e. drop) the species rather than fake it. --
  const loading = g / Math.max(air, 0.05);
  const wingSpan = flier ? size * Math.min(6.5, 1.7 + 1.1 * Math.sqrt(loading)) : 0;
  const wingChord = wingSpan * rng.range(0.22, 0.3);
  const canFly = !flier || air > 0.04;

  // -- Motion. Pendulum gait for walkers, wing loading for fliers. --
  const gaitHz = legCount > 0 ? Math.min(6, 1.4 * Math.sqrt(g / Math.max(legLen, 0.15))) : 0;
  const flapHz = flier ? Math.min(6, Math.max(0.9, 3.4 * Math.sqrt(g) / Math.sqrt(Math.max(wingSpan, 0.5)))) : 0;
  const walkSpeed = legCount > 0 ? legLen * gaitHz * 0.55 : 0;
  const flySpeed = flier ? 7 + 9 * Math.sqrt(size) + 3 * Math.sqrt(loading) : 0;
  // High g keeps feet near the ground; low g lets the gait bounce.
  const bounce = clamp01(0.6 / g) * 0.12 * size;

  // -- Coat. Base colour is camouflage against this world's own ground palette;
  //    the accent is borrowed from its sky. Cold bleaches toward white. --
  const ground = world.surface.ground;
  const base = new THREE.Color(rng.pick([ground.rock, ground.soil, ground.grass, ground.sand]));
  base.offsetHSL(rng.range(-0.03, 0.03), rng.range(-0.05, 0.1), rng.range(-0.05, 0.05));
  base.lerp(new THREE.Color(0xf2f4f6), cold * 0.55);
  if (spec.armored) base.lerp(new THREE.Color(0x14100e), 0.45);
  const belly = base.clone().lerp(new THREE.Color(0xf0ead8), 0.35);
  const accent = new THREE.Color(world.atmosphere.color).lerp(base, 0.4);

  return {
    species: spec.species,
    role: spec.role,
    domain: spec.domain,
    count: spec.count,
    canFly,

    size, bodyLen, bodyRad,
    legCount, legLen, legRad,
    neckLen, headSize, snoutLen, tailLen,
    wingSpan, wingChord,

    gaitHz, flapHz, walkSpeed, flySpeed, bounce,
    // How high the hip sits: legs plus a little clearance.
    hipHeight: legCount > 0 ? legLen * 0.95 + bodyRad * 0.4 : 0,

    shaggy: !!spec.shaggy,
    armored: !!spec.armored,
    colors: { base, belly, accent },
  };
}
