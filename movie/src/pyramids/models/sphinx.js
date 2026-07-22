import * as THREE from 'three';

// The Great Sphinx — a readable silhouette, not a portrait. A long crouching
// body, two paws thrown forward, and a headdress-framed head, all in one
// sandstone tone. It faces +x (east, toward the river and the sunrise), the way
// the real one does. Scaled small relative to the pyramids, as it is in life.

export function buildSphinx() {
  const g = new THREE.Group();
  g.name = 'sphinx';
  const stone = new THREE.MeshStandardMaterial({ color: 0xc4a878, roughness: 1 });

  // Body — a long tapered block, haunches at the back.
  const body = new THREE.Mesh(new THREE.BoxGeometry(26, 9, 10), stone);
  body.position.set(-2, 5, 0);
  g.add(body);
  const haunch = new THREE.Mesh(new THREE.BoxGeometry(9, 12, 11), stone);
  haunch.position.set(-13, 6, 0);
  g.add(haunch);

  // Front paws reaching forward.
  for (const dz of [-3, 3]) {
    const paw = new THREE.Mesh(new THREE.BoxGeometry(20, 3.5, 3), stone);
    paw.position.set(9, 1.75, dz);
    g.add(paw);
  }

  // Chest rising to the neck.
  const chest = new THREE.Mesh(new THREE.BoxGeometry(7, 12, 9), stone);
  chest.position.set(10, 8, 0);
  g.add(chest);

  // Head with a nemes headdress: a head block flanked by the flaring cloth.
  const head = new THREE.Mesh(new THREE.BoxGeometry(6, 7, 6), stone);
  head.position.set(12.5, 15.5, 0);
  g.add(head);
  const nemes = new THREE.Mesh(new THREE.BoxGeometry(6.5, 6, 9.5), stone);
  nemes.position.set(11.8, 16, 0);
  g.add(nemes);
  const brow = new THREE.Mesh(new THREE.BoxGeometry(6.6, 1.6, 9.6), new THREE.MeshStandardMaterial({ color: 0xb09462, roughness: 1 }));
  brow.position.set(12, 18.6, 0);
  g.add(brow);

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
