import * as THREE from 'three';

// The Lunar Module, built standing on its legs: descent stage low, ascent
// stage (the crew cabin) on top, docking tunnel at +Y. One unit = one metre —
// about 7 m across the legs, ~7 m tall. Returned as a group with `descentStage`
// and `ascentStage` sub-groups so the ascent stage can lift off later (Phase 4)
// leaving the descent stage behind as a launch pad.

const GOLD = () => new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.5, metalness: 0.7 });
const FOIL_DARK = () => new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.6, metalness: 0.6 });
const GREY = () => new THREE.MeshStandardMaterial({ color: 0xb8bcc2, roughness: 0.55, metalness: 0.6 });
const BLACK = () => new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.5, metalness: 0.3 });

export function buildLM() {
  const g = new THREE.Group();
  g.name = 'lm';

  // ---- Descent stage: an octagonal gold-foil box, ~2.6 m tall, base at y=1.4
  const descentStage = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 2.6, 8), GOLD());
  body.position.y = 2.7;
  body.castShadow = true;
  descentStage.add(body);

  // Descent engine bell underneath.
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.0, 1.4, 20, 1, true), FOIL_DARK());
  bell.position.y = 0.9;
  descentStage.add(bell);

  // Four legs: strut out and down to a round footpad.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const dx = Math.cos(a), dz = Math.sin(a);
    const foot = new THREE.Vector3(dx * 3.4, 0.15, dz * 3.4);
    const hip = new THREE.Vector3(dx * 1.9, 3.2, dz * 1.9);
    // Primary strut.
    const mid = hip.clone().lerp(foot, 0.5);
    const len = hip.distanceTo(foot);
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, len, 8), GREY());
    strut.position.copy(mid);
    strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), foot.clone().sub(hip).normalize());
    descentStage.add(strut);
    // Footpad.
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 14), GREY());
    pad.position.copy(foot);
    descentStage.add(pad);
    // A thin secondary brace up to the body.
    const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, len * 0.7, 6), GREY());
    const bmid = hip.clone().lerp(foot, 0.72);
    brace.position.set(bmid.x, bmid.y, bmid.z);
    brace.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), foot.clone().sub(hip).normalize());
    descentStage.add(brace);
  }
  g.add(descentStage);

  // ---- Ascent stage: the irregular crew cabin, on top of the descent stage.
  const ascentStage = new THREE.Group();
  ascentStage.position.y = 4.0;
  const cabin = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.1, 2.4, 7), GOLD());
  cabin.castShadow = true;
  ascentStage.add(cabin);
  // The angled front face with two triangular windows, facing +Z.
  const face = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.4, 0.3), GREY());
  face.position.set(0, 0.5, 1.9);
  face.rotation.x = -0.35;
  ascentStage.add(face);
  for (const wx of [-0.6, 0.6]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.1), BLACK());
    win.position.set(wx, 0.55, 2.02);
    win.rotation.x = -0.35;
    ascentStage.add(win);
  }
  // Hatch below the windows.
  const hatch = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.2), FOIL_DARK());
  hatch.position.set(0, -0.5, 2.05);
  ascentStage.add(hatch);
  // Docking tunnel / drogue on top.
  const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.8, 16), GREY());
  tunnel.position.y = 1.6;
  ascentStage.add(tunnel);
  // RCS quad clusters.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const q = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), GREY());
    q.position.set(Math.cos(a) * 2.1, 0.8, Math.sin(a) * 2.1);
    ascentStage.add(q);
  }
  // Ascent engine bell, under the cabin (fires off the descent stage later).
  const aBell = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.6, 0.7, 16, 1, true), FOIL_DARK());
  aBell.position.y = -1.4;
  ascentStage.add(aBell);
  g.add(ascentStage);

  g.userData.descentStage = descentStage;
  g.userData.ascentStage = ascentStage;
  g.userData.engineY = 0.2;   // world-ish Y of the descent engine mouth for dust/flame
  return g;
}
