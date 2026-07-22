import * as THREE from 'three';

// The plant, from outside, at night. Not a faithful survey — a readable
// silhouette: the long turbine hall, the taller reactor hall of Unit 4, and the
// red-and-white exhaust stack that stands over the whole complex and became the
// disaster's most photographed landmark.
//
// userData exposes the pieces the scenes drive:
//   hallRoof   the reactor-hall roof — hidden and thrown at the explosion
//   coreTop    world-ish position where fire, plume and glow emit after the blast
//   windows[]  lit panes, dimmed as dawn comes up
//   stack      the vent stack group

export function buildPlant() {
  const group = new THREE.Group();
  group.name = 'plant';

  const concrete = new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: 0.95, metalness: 0.05 });
  const darkConcrete = new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 0.95 });

  // Turbine hall — long, low, running off to one side.
  const turbine = new THREE.Mesh(new THREE.BoxGeometry(120, 26, 46), concrete.clone());
  turbine.position.set(-46, 13, 0);
  turbine.castShadow = turbine.receiveShadow = true;
  group.add(turbine);

  // Reactor hall — the tall block housing Unit 4.
  const hall = new THREE.Mesh(new THREE.BoxGeometry(56, 58, 56), concrete.clone());
  hall.position.set(38, 29, 0);
  hall.castShadow = hall.receiveShadow = true;
  group.add(hall);

  // The reactor-hall roof — a separate slab so the explosion can take it off.
  const hallRoof = new THREE.Mesh(new THREE.BoxGeometry(56, 4, 56), darkConcrete.clone());
  hallRoof.position.set(38, 60, 0);
  hallRoof.castShadow = true;
  group.add(hallRoof);
  const coreTop = new THREE.Vector3(38, 58, 0);

  // A low annex tying the two together.
  const annex = new THREE.Mesh(new THREE.BoxGeometry(30, 34, 40), concrete.clone());
  annex.position.set(6, 17, 4);
  annex.receiveShadow = true;
  group.add(annex);

  // --- The vent stack: a slim tower in red-and-white bands, on a lattice base
  // between the reactor blocks. ---
  const stack = new THREE.Group();
  const bands = 10, bandH = 12, rTop = 1.4, rBot = 2.6;
  for (let i = 0; i < bands; i++) {
    const t0 = i / bands, t1 = (i + 1) / bands;
    const r0 = THREE.MathUtils.lerp(rBot, rTop, t0);
    const r1 = THREE.MathUtils.lerp(rBot, rTop, t1);
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(r1, r0, bandH, 16),
      new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0xc94a3a : 0xe8e6e0, roughness: 0.8,
      }),
    );
    seg.position.y = bandH * (i + 0.5);
    seg.castShadow = true;
    stack.add(seg);
  }
  // A red aircraft-warning lamp at the very top.
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xff2a1a, emissive: 0xff2a1a, emissiveIntensity: 2 }),
  );
  lamp.position.y = bands * bandH + 1;
  stack.add(lamp);
  stack.position.set(58, 0, -6);
  group.add(stack);

  // --- Lit windows: rows of small emissive panes across the halls. ---
  const windows = [];
  const paneGeo = new THREE.PlaneGeometry(2.2, 2.8);
  const addWindows = (host, w, h, z, cols, rows, y0) => {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() < 0.35) continue; // not every pane is lit
        const m = new THREE.Mesh(paneGeo, new THREE.MeshBasicMaterial({ color: 0xffd98a }));
        m.position.set(host.x - w / 2 + (c + 0.5) * (w / cols), y0 + r * 5.5, z);
        windows.push(m);
        group.add(m);
      }
    }
  };
  addWindows({ x: -46 }, 116, 26, 23.2, 22, 3, 6);
  addWindows({ x: 38 }, 54, 58, 28.2, 10, 7, 8);

  group.userData = { hallRoof, coreTop, windows, stack, hall, turbine };
  return group;
}
