import * as THREE from 'three';
import { SATURN_V } from '../mission.js';
import { s1cTexture, s2Texture, panelWhiteTexture } from './textures.js';

// The Saturn V — the vehicle, built to scale from the mission fact table.
//
// One unit = one metre, so the stack stands 110.6 units tall. It is assembled
// bottom-up as named sub-groups (s1c, s2, s4b, spacecraft, les) so the launch
// scene can jettison a stage by dropping and hiding its group. Everything is
// parametric off SATURN_V; nothing here is a loaded asset.
//
// The origin sits at the base of the F-1 engine bells, so placing the rocket on
// the pad is just positioning y = 0 at the deck.

const WHITE = () => new THREE.MeshStandardMaterial({
  color: 0xf3f5f7, roughness: 0.55, metalness: 0.12, map: panelWhiteTexture(),
});
const BLACK = () => new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.6, metalness: 0.2 });
const METAL = () => new THREE.MeshStandardMaterial({ color: 0x8b8f96, roughness: 0.4, metalness: 0.85 });
const DARK_METAL = () => new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.45, metalness: 0.8 });

/** A vertical cylinder section whose base sits at `y0`, returning its top y. */
function tube(group, { y0, len, rBottom, rTop = rBottom, material, radial = 48 }) {
  const geo = new THREE.CylinderGeometry(rTop, rBottom, len, radial, 1, true);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.y = y0 + len / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return y0 + len;
}

/** An engine bell (flared nozzle) hanging below `y`, mouth pointing down. */
function engineBell(rThroat, rMouth, len) {
  const g = new THREE.Group();
  const bell = new THREE.Mesh(
    new THREE.CylinderGeometry(rMouth, rThroat, len, 24, 1, true),
    DARK_METAL(),
  );
  bell.position.y = -len / 2;
  bell.castShadow = true;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(rThroat, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), METAL());
  g.add(bell, cap);
  return g;
}

export function buildSaturnV() {
  const S = SATURN_V.stages;
  const root = new THREE.Group();
  root.name = 'saturnV';

  const s1c = new THREE.Group(); s1c.name = 'stage:s1c';
  const s2 = new THREE.Group(); s2.name = 'stage:s2';
  const s4b = new THREE.Group(); s4b.name = 'stage:s4b';
  const spacecraft = new THREE.Group(); spacecraft.name = 'stage:spacecraft';
  const les = new THREE.Group(); les.name = 'stage:les';
  root.add(s1c, s2, s4b, spacecraft, les);

  const r1 = S.s1c.diaM / 2;   // 5.05
  const r2 = S.s2.diaM / 2;    // 5.05
  const r3 = S.s4b.diaM / 2;   // 3.3
  let y = 0;

  // ---- S-IC: five F-1 engines, four fins, roll-pattern livery ----
  // Engines hang below the deck line; the stage body starts at y = 0.
  const f1Positions = [[0, 0], ...[0, 1, 2, 3].map((i) => {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    return [Math.cos(a) * r1 * 0.6, Math.sin(a) * r1 * 0.6];
  })];
  for (const [ex, ez] of f1Positions) {
    const bell = engineBell(1.0, 1.9, 4.2);
    bell.position.set(ex, 0, ez);
    s1c.add(bell);
  }
  // Thrust structure skirt around the engines.
  tube(s1c, { y0: 0, len: 3.0, rBottom: r1, rTop: r1, material: BLACK() });
  const s1cTex = s1cTexture();
  const s1cMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.12, map: s1cTex });
  y = tube(s1c, { y0: 3.0, len: S.s1c.lengthM - 3.0, rBottom: r1, rTop: r1, material: s1cMat });
  // Four fins at the base.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5.5, 4.2), BLACK());
    fin.position.set(Math.cos(a) * (r1 + 1.4), 3.4, Math.sin(a) * (r1 + 1.4));
    fin.rotation.y = -a;
    fin.castShadow = true;
    s1c.add(fin);
  }
  // Interstage between S-IC and S-II.
  y = tube(s1c, { y0: y, len: 5.5, rBottom: r1, rTop: r2, material: BLACK() });
  const s1cTop = y;

  // ---- S-II: five J-2 engines tucked in the interstage, UNITED STATES livery ----
  for (const [ex, ez] of f1Positions) {
    const bell = engineBell(0.5, 0.95, 2.2);
    bell.position.set(ex * 0.8, s1cTop + 1.0, ez * 0.8);
    s2.add(bell);
  }
  const s2Mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.12, map: s2Texture() });
  y = tube(s2, { y0: s1cTop, len: S.s2.lengthM, rBottom: r2, rTop: r2, material: s2Mat });
  // Tapered interstage down to the narrower S-IVB.
  y = tube(s2, { y0: y, len: 4.0, rBottom: r2, rTop: r3, material: WHITE() });
  const s2Top = y;

  // ---- S-IVB: one J-2, instrument unit ring ----
  s4b.add((() => { const b = engineBell(0.5, 0.95, 2.2); b.position.y = s2Top + 1.0; return b; })());
  y = tube(s4b, { y0: s2Top, len: S.s4b.lengthM, rBottom: r3, rTop: r3, material: WHITE() });
  // Instrument Unit — a black ring band.
  y = tube(s4b, { y0: y, len: 0.9, rBottom: r3, rTop: r3, material: BLACK() });
  const s4bTop = y;

  // ---- Spacecraft: SLA adapter, Service Module, Command Module ----
  const rCsm = 1.96; // 3.9 m diameter
  // Spacecraft/LM adapter tapers from the S-IVB down to the CSM.
  y = tube(spacecraft, { y0: s4bTop, len: 8.5, rBottom: r3, rTop: rCsm, material: WHITE() });
  // Service Module: cylinder with a big engine bell below-aft (points down here).
  const smBell = engineBell(0.55, 1.05, 2.6);
  smBell.position.y = y + 0.2;
  spacecraft.add(smBell);
  y = tube(spacecraft, { y0: y, len: 7.0, rBottom: rCsm, rTop: rCsm, material: METAL() });
  const smTop = y;
  // Command Module: blunt cone.
  const cm = new THREE.Mesh(new THREE.CylinderGeometry(0.55, rCsm, 3.2, 32), WHITE());
  cm.position.y = smTop + 1.6;
  cm.castShadow = true;
  spacecraft.add(cm);
  y = smTop + 3.2;

  // ---- Launch Escape System: tower + escape motor ----
  const towerH = 3.0, motorH = 4.0;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, towerH, 6), METAL());
    leg.position.set(Math.cos(a) * 0.42, y + towerH / 2, Math.sin(a) * 0.42);
    les.add(leg);
  }
  const escapeMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, motorH, 16), new THREE.MeshStandardMaterial({ color: 0xb03a2e, roughness: 0.6, metalness: 0.2 }));
  escapeMotor.position.y = y + towerH + motorH / 2;
  escapeMotor.castShadow = true;
  les.add(escapeMotor);
  const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 1.4, 12), METAL());
  spike.position.y = y + towerH + motorH + 0.7;
  les.add(spike);

  root.userData.stages = { s1c, s2, s4b, spacecraft, les };
  // Local Y of the active engine plane before and after each separation, so the
  // scene can keep the exhaust attached to whichever stage is currently firing.
  root.userData.engineBases = { start: 0, afterS1c: s1cTop + 1, afterS2: s2Top + 1 };
  root.userData.totalHeight = y + towerH + motorH + 1.4;
  return root;
}
