import * as THREE from 'three';

// A suited astronaut, built standing on the ground at y=0 and ~1.85 m tall to
// the top of the helmet. Same primitive-geometry idiom as the LM: white A7L
// pressure suit, the boxy PLSS life-support backpack, a gold sun-visor over the
// helmet. It is rigged — hips, knees, shoulders are pivot groups — so the scene
// can walk it in the slow 1/6-g lope, stand it at the flag, or sit it on the
// rover. The rig is deliberately simple; on the Moon the suit is stiff and the
// motion is more bob-and-glide than stride, which flatters a coarse rig.
//
// Returned as a Group whose userData carries the pose helpers:
//   lope(phase, amount)  — a walk cycle; phase advances in [0,1)
//   stand()              — neutral standing pose
//   sit()                — thighs forward, knees down: seated on the rover

const SUIT = () => new THREE.MeshStandardMaterial({ color: 0xeef1f4, roughness: 0.85, metalness: 0.04 });
const SUIT_SHADE = () => new THREE.MeshStandardMaterial({ color: 0xd7dbe0, roughness: 0.9, metalness: 0.04 });
const PLSS = () => new THREE.MeshStandardMaterial({ color: 0xe3e5e8, roughness: 0.8, metalness: 0.1 });
const GLOVE = () => new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.7, metalness: 0.2 });
const HELMET = () => new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.5, metalness: 0.1 });
const VISOR = () => new THREE.MeshStandardMaterial({ color: 0xc79a2a, roughness: 0.2, metalness: 0.95, emissive: 0x2a1e05, emissiveIntensity: 0.4 });

// A limb segment as a pivot group: the pivot sits at the joint, the mesh hangs
// down from it by `len`, so rotating the pivot swings the whole segment from the
// joint. Returns { pivot, end } where `end` is a child group at the far tip
// (for nesting the next joint — knee onto thigh, etc.).
function segment(len, topR, botR, mat) {
  const pivot = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(topR, botR, len, 10), mat);
  mesh.position.y = -len / 2;
  mesh.castShadow = true;
  pivot.add(mesh);
  const end = new THREE.Group();
  end.position.y = -len;
  pivot.add(end);
  return { pivot, end };
}

export function buildAstronaut() {
  const g = new THREE.Group();
  g.name = 'astronaut';

  // Everything below the neck hangs off `frame`, which the pose helpers bob and
  // lean as one, so the walk cycle can lift the whole body in the low gravity.
  const frame = new THREE.Group();
  g.add(frame);

  const HIP_Y = 0.92;         // pelvis height when standing
  const SHOULDER_Y = 1.42;

  // ---- Torso: the suited chest/abdomen.
  const torso = new THREE.Group();
  torso.position.y = HIP_Y;
  frame.add(torso);

  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.34, 4, 10), SUIT());
  chest.position.y = 0.32;
  chest.castShadow = true;
  torso.add(chest);
  const belly = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.18, 10), SUIT_SHADE());
  belly.position.y = 0.02;
  torso.add(belly);

  // Chest-mounted remote control unit (the RCU square on the front).
  const rcu = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.08), SUIT_SHADE());
  rcu.position.set(0, 0.36, 0.22);
  torso.add(rcu);

  // PLSS backpack.
  const plss = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.24), PLSS());
  plss.position.set(0, 0.34, -0.24);
  plss.castShadow = true;
  torso.add(plss);

  // ---- Head: helmet with a gold visor cap facing +Z.
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.1, 8), SUIT_SHADE());
  neck.position.y = SHOULDER_Y - HIP_Y + 0.06;
  torso.add(neck);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.19, 18, 16), HELMET());
  helmet.position.y = SHOULDER_Y - HIP_Y + 0.24;
  helmet.castShadow = true;
  torso.add(helmet);
  // Gold visor: a slightly larger sphere shell, clipped to the front by a
  // phi-range so it caps the face like the real reflective sun-visor.
  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.196, 18, 14, -Math.PI / 2 - 0.9, 1.8, Math.PI * 0.28, Math.PI * 0.5),
    VISOR(),
  );
  visor.position.copy(helmet.position);
  torso.add(visor);

  // ---- Arms: shoulder pivot -> upper arm -> elbow -> forearm -> glove.
  const arms = {};
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(0.27 * side, SHOULDER_Y - HIP_Y, 0);
    torso.add(shoulder);
    const upper = segment(0.3, 0.1, 0.09, SUIT());
    shoulder.add(upper.pivot);
    const elbow = new THREE.Group();
    upper.end.add(elbow);
    const fore = segment(0.28, 0.09, 0.08, SUIT());
    elbow.add(fore.pivot);
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), GLOVE());
    fore.end.add(glove);
    arms[side < 0 ? 'l' : 'r'] = { shoulder, elbow };
  }

  // ---- Legs: hip pivot -> thigh -> knee -> shin -> boot.
  const legs = {};
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(0.13 * side, HIP_Y, 0);
    frame.add(hip);
    const thigh = segment(0.46, 0.13, 0.11, SUIT());
    hip.add(thigh.pivot);
    const knee = new THREE.Group();
    thigh.end.add(knee);
    const shin = segment(0.44, 0.11, 0.09, SUIT());
    knee.add(shin.pivot);
    // Boot: a wedge sitting at the ankle.
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.3), GLOVE());
    boot.position.set(0, -0.04, 0.06);
    boot.castShadow = true;
    shin.end.add(boot);
    legs[side < 0 ? 'l' : 'r'] = { hip, knee };
  }

  // ---- Pose helpers. Angles in radians; the standing pose is the reference.
  const set = (leanX = 0, bob = 0) => { frame.rotation.x = leanX; frame.position.y = bob; };

  g.userData.stand = () => {
    set(0, 0);
    legs.l.hip.rotation.x = legs.r.hip.rotation.x = 0;
    legs.l.knee.rotation.x = legs.r.knee.rotation.x = 0;
    arms.l.shoulder.rotation.x = arms.r.shoulder.rotation.x = 0.12;
    arms.l.shoulder.rotation.z = 0.14; arms.r.shoulder.rotation.z = -0.14;
    arms.l.elbow.rotation.x = arms.r.elbow.rotation.x = 0.4;
  };

  // A gentle bounding lope. `phase` in [0,1) is one full cycle (two steps);
  // `amount` 0..1 scales the swing so a figure can ease in and out of walking.
  g.userData.lope = (phase, amount = 1) => {
    const w = phase * Math.PI * 2;
    const swing = 0.7 * amount;
    // Legs swing in opposition; knees tuck as each leg comes forward.
    const sL = Math.sin(w), sR = Math.sin(w + Math.PI);
    legs.l.hip.rotation.x = -sL * swing;
    legs.r.hip.rotation.x = -sR * swing;
    legs.l.knee.rotation.x = Math.max(0, sL) * swing * 1.3;
    legs.r.knee.rotation.x = Math.max(0, sR) * swing * 1.3;
    // Arms counter-swing.
    arms.l.shoulder.rotation.x = sR * 0.5 * amount + 0.1;
    arms.r.shoulder.rotation.x = sL * 0.5 * amount + 0.1;
    arms.l.shoulder.rotation.z = 0.16; arms.r.shoulder.rotation.z = -0.16;
    arms.l.elbow.rotation.x = arms.r.elbow.rotation.x = 0.6;
    // Whole body bobs up twice a cycle (once per step) and leans into the run.
    const bob = Math.abs(Math.sin(w)) * 0.16 * amount;
    set(0.14 * amount, bob);
  };

  // Seated on the rover: thighs forward and level, shins down, hands ahead as if
  // on the controller.
  g.userData.sit = () => {
    set(0, 0);
    legs.l.hip.rotation.x = legs.r.hip.rotation.x = -Math.PI / 2;
    legs.l.knee.rotation.x = legs.r.knee.rotation.x = Math.PI / 2;
    arms.l.shoulder.rotation.x = arms.r.shoulder.rotation.x = 1.1;
    arms.l.shoulder.rotation.z = 0.2; arms.r.shoulder.rotation.z = -0.2;
    arms.l.elbow.rotation.x = arms.r.elbow.rotation.x = 0.5;
  };

  g.userData.stand();
  g.userData.height = 1.85;
  return g;
}
