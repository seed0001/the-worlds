import * as THREE from 'three';

// The plateau and the river. A broad sweep of sand for the pyramids to stand on,
// low dunes on the far side, and a bend of the Nile off to the east that the
// stone came in on. Nothing here animates much — it is the stage the time-lapse
// plays out over — except the river, which shimmers.

function sandTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c8a86e';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4000; i++) {
    const s = Math.random();
    ctx.fillStyle = `rgba(${150 + Math.random() * 70 | 0},${120 + Math.random() * 60 | 0},${70 + Math.random() * 50 | 0},${0.05 + s * 0.08})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + s * 2, 1 + s * 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(40, 40);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildDesert() {
  const group = new THREE.Group();
  group.name = 'desert';

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(6000, 6000, 1, 1),
    new THREE.MeshStandardMaterial({ map: sandTexture(), color: 0xd8b57e, roughness: 1, metalness: 0 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.receiveShadow = true;
  group.add(sand);

  // Low dune ridges on the far (west) side, as silhouettes.
  const duneMat = new THREE.MeshStandardMaterial({ color: 0xb89666, roughness: 1 });
  for (let i = 0; i < 7; i++) {
    const dune = new THREE.Mesh(new THREE.SphereGeometry(120 + Math.random() * 160, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), duneMat);
    dune.scale.set(1, 0.18 + Math.random() * 0.12, 1);
    dune.position.set(-700 - Math.random() * 500, -6, -400 + i * 160 + Math.random() * 80);
    group.add(dune);
  }

  // The Nile: a long strip of water off to the east, with a gentle shimmer.
  const river = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 3200, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x2f6b7a, roughness: 0.25, metalness: 0.5 }),
  );
  river.rotation.x = -Math.PI / 2;
  river.position.set(900, 0.4, 0);
  group.add(river);
  // A greener fertile bank between the river and the desert.
  const bank = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 3200),
    new THREE.MeshStandardMaterial({ color: 0x6b7a3a, roughness: 1 }),
  );
  bank.rotation.x = -Math.PI / 2;
  bank.position.set(680, 0.2, 0);
  group.add(bank);

  group.userData = { sand, river };
  return group;
}
