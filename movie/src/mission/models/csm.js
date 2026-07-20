import * as THREE from 'three';

// The Command and Service Module, built along +Z (nose/docking end forward,
// engine bell aft at -Z). One unit = one metre: ~11 m long, 3.9 m across.
// The command module (the cone that comes home) is the group `cm`; the rest is
// the service module, jettisoned before reentry.

const FOIL = () => new THREE.MeshStandardMaterial({ color: 0xd9dde2, roughness: 0.35, metalness: 0.85 });
const HULL = () => new THREE.MeshStandardMaterial({ color: 0xc9ccd1, roughness: 0.5, metalness: 0.7 });
const DARK = () => new THREE.MeshStandardMaterial({ color: 0x2e3136, roughness: 0.5, metalness: 0.6 });

export function buildCSM() {
  const g = new THREE.Group();
  g.name = 'csm';

  // Service Module — cylinder from z=0 back to z=-7.
  const sm = new THREE.Mesh(new THREE.CylinderGeometry(1.96, 1.96, 7, 32), HULL());
  sm.rotation.x = Math.PI / 2;      // lay the cylinder along Z
  sm.position.z = -3.5;
  sm.castShadow = true;
  g.add(sm);

  // SPS main engine bell at the aft end.
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.05, 2.4, 24, 1, true), DARK());
  bell.rotation.x = Math.PI / 2;
  bell.position.z = -8.1;
  g.add(bell);

  // RCS quads around the service module.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const quad = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), DARK());
    quad.position.set(Math.cos(a) * 2.0, Math.sin(a) * 2.0, -2.2);
    g.add(quad);
  }

  // Command Module — blunt cone, base aft (z=0) to a narrow top (z=+3).
  const cm = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.96, 3.0, 32), FOIL());
  cone.rotation.x = -Math.PI / 2;   // apex toward +Z
  cone.position.z = 1.5;
  cone.castShadow = true;
  cm.add(cone);
  // Docking probe at the nose.
  const probe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.7, 12), HULL());
  probe.rotation.x = Math.PI / 2;
  probe.position.z = 3.35;
  cm.add(probe);
  g.add(cm);

  g.userData.cm = cm;
  g.userData.length = 11.5;
  return g;
}
