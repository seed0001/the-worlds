import * as THREE from 'three';

// The Command Module as it comes home — the blunt cone alone, service module
// and everything else gone. Built base-down: the heat shield is the wide bottom
// (-Y), the apex and parachute mortars are up top (+Y), which is how it hangs
// under the chutes and how it meets the water. ~3.9 m across the shield, ~3.5 m
// tall. Same primitive idiom as the CSM it detached from.

const SKIN = () => new THREE.MeshStandardMaterial({ color: 0xd9dde2, roughness: 0.4, metalness: 0.75 });
const SHIELD = () => new THREE.MeshStandardMaterial({ color: 0x40352c, roughness: 0.85, metalness: 0.2 });
const DARK = () => new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.6, metalness: 0.4 });

export function buildCapsule() {
  const g = new THREE.Group();
  g.name = 'capsule';

  // The cone body: wide base at y=0, narrowing to a small top at y=3.
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.96, 3.0, 28), SKIN());
  cone.position.y = 1.5;
  cone.castShadow = true;
  g.add(cone);

  // Ablative heat shield — a shallow charred dish across the base.
  const shield = new THREE.Mesh(new THREE.SphereGeometry(1.96, 28, 12, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), SHIELD());
  shield.position.y = 0.15;
  shield.scale.y = 0.5;
  g.add(shield);

  // Flat top deck with the parachute mortar cans.
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.3, 20), DARK());
  deck.position.y = 3.05;
  g.add(deck);

  // A band of small windows around the cone.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.1), DARK());
    win.position.set(Math.cos(a) * 1.25, 1.9, Math.sin(a) * 1.25);
    win.lookAt(win.position.x * 2, 1.9, win.position.z * 2);
    g.add(win);
  }

  g.userData.apexY = 3.2;     // where the parachute risers attach
  g.userData.shieldY = 0;     // the base that meets the air, then the water
  return g;
}
