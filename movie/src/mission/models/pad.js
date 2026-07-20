import * as THREE from 'three';

// Launch Complex 39A, in the stylised-but-recognisable idiom: the mobile
// launcher deck the rocket stands on, the umbilical tower alongside with its
// swing arms, and the hammerhead crane at the top. Built once, positioned so
// the deck surface is at y = 0 (where the rocket's engines sit).

const STEEL = () => new THREE.MeshStandardMaterial({ color: 0x9a3b2e, roughness: 0.7, metalness: 0.5 }); // red-oxide tower
const DECK = () => new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 0.9, metalness: 0.3 });
const GREY = () => new THREE.MeshStandardMaterial({ color: 0x6a6d73, roughness: 0.8, metalness: 0.4 });

/** A boxed lattice column of height h at (x,z), section s. */
function column(group, x, z, h, s, mat) {
  const post = new THREE.Mesh(new THREE.BoxGeometry(s, h, s), mat);
  post.position.set(x, h / 2, z);
  post.castShadow = true;
  group.add(post);
}

export function buildPad() {
  const g = new THREE.Group();
  g.name = 'pad';

  // Mobile launcher platform — a thick deck with a flame hole under the rocket.
  const deck = new THREE.Mesh(new THREE.BoxGeometry(30, 3, 30), DECK());
  deck.position.y = -1.5;
  deck.receiveShadow = true;
  g.add(deck);
  // Flame hole rim (visual — the exhaust pours through here).
  const rim = new THREE.Mesh(new THREE.TorusGeometry(6, 0.6, 12, 32), GREY());
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.05;
  g.add(rim);

  // Umbilical tower — a tall lattice mast off to one side (−X), with cross
  // bracing and swing arms reaching toward the rocket.
  const tower = new THREE.Group();
  const tx = -13, tz = 0, th = 120, leg = 1.1;
  const legs = [[-2, -2], [-2, 2], [2, -2], [2, 2]];
  for (const [dx, dz] of legs) column(tower, tx + dx, tz + dz, th, leg, STEEL());
  // Horizontal bracing rings up the tower.
  for (let hh = 6; hh < th; hh += 6) {
    const ring = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.4, 4.6), STEEL());
    ring.position.set(tx, hh, tz);
    tower.add(ring);
  }
  // Swing arms toward the stack (+X), at a few heights.
  for (const armY of [20, 45, 70, 92, 104]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(9, 0.7, 1.2), GREY());
    arm.position.set(tx + 6.5, armY, tz);
    arm.castShadow = true;
    tower.add(arm);
  }
  // Hammerhead crane at the top.
  const crane = new THREE.Mesh(new THREE.BoxGeometry(16, 1.2, 1.6), STEEL());
  crane.position.set(tx + 4, th + 1, tz);
  tower.add(crane);
  g.add(tower);

  // A darker apron around the pad so it doesn't float on the terrain.
  const apron = new THREE.Mesh(new THREE.CircleGeometry(45, 48), new THREE.MeshStandardMaterial({ color: 0x35373b, roughness: 1 }));
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = -3.0;
  apron.receiveShadow = true;
  g.add(apron);

  g.userData.tower = tower;
  return g;
}
