import * as THREE from 'three';

// The top of the third stage as it matters for translunar work: the S-IVB body,
// the instrument-unit ring, and the Spacecraft/LM Adapter (SLA) — the tapered
// shroud whose four panels peel open to expose the Lunar Module for docking.
// Built along +Y (adapter opening upward). petals[] hinge outward via setOpen().

const WHITE = () => new THREE.MeshStandardMaterial({ color: 0xeef1f4, roughness: 0.6, metalness: 0.2 });
const BLACK = () => new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.6, metalness: 0.2 });
const INNER = () => new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.7, metalness: 0.5, side: THREE.DoubleSide });

export function buildSIVB() {
  const g = new THREE.Group();
  g.name = 'sivb';

  // S-IVB body + instrument unit.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, 12, 32), WHITE());
  body.position.y = -6;
  g.add(body);
  const iu = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, 0.9, 32), BLACK());
  iu.position.y = 0.45;
  g.add(iu);

  // Four SLA petals, hinged at y≈1, tapering up. Closed, they form the shroud.
  const petals = [];
  const petalLen = 8.5;
  for (let i = 0; i < 4; i++) {
    const hinge = new THREE.Group();
    hinge.position.y = 1.0;
    hinge.rotation.y = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(4.4, petalLen, 0.18), WHITE());
    panel.position.set(0, petalLen / 2, 3.0);
    // Inner face a little darker so an open petal reads as a shell.
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(4.2, petalLen), INNER());
    inner.position.set(0, petalLen / 2, 2.9);
    hinge.add(panel, inner);
    g.add(hinge);
    petals.push(hinge);
  }

  g.userData.petals = petals;
  g.userData.setOpen = (k) => {
    // k: 0 closed, 1 fully splayed out (petals fall back ~120°).
    for (const p of petals) p.rotation.x = k * (Math.PI * 0.62);
  };
  g.userData.setOpen(0);
  g.userData.lmBayY = 4.5; // where the LM sits inside the adapter
  return g;
}
