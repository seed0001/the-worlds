import * as THREE from 'three';

// The RBMK core, in cross-section — the cutaway that is this engine's spine.
//
// We slice the reactor down the middle and look at one plane of it: a slab of
// graphite moderator, a row of vertical fuel channels that glow with the chain
// reaction, and the control rods threaded between them. The rods are the whole
// tragedy in one object: an absorber body that shuts the reaction DOWN, tipped
// with a graphite follower that — as the rod first enters — briefly pushes the
// water out of the way and nudges the reaction UP.
//
// Everything the scene animates hangs off userData:
//   channels[]   the fuel channels (emissive), driven by setGlow()
//   rods[]       { group, tip, absorber } — move in Y to insert/withdraw
//   setGlow(v)   0..1 → how hard the core is running (colour + emissive)
//   blocks[]     graphite pieces, so the blowout can throw them
//   COLS, W, H   layout constants the scene reads for framing and steam

const COL_COUNT = 27;          // channels across the visible cross-section
const ROD_EVERY = 4;           // every Nth column is a control rod, not fuel
const CORE_W = 26;             // slab width  (stands in for ~11.8 m)
const CORE_H = 15;             // slab height (stands in for ~7 m, framed taller)
const CORE_D = 4;              // slab depth (a thin slice)

export function buildCore() {
  const group = new THREE.Group();
  group.name = 'rbmk-core';

  const channels = [];
  const rods = [];
  const blocks = [];

  const colGap = CORE_W / (COL_COUNT - 1);
  const x0 = -CORE_W / 2;

  // --- Graphite moderator: a stack of dark blocks with faint seams. Built as a
  // grid so the blowout can hand each piece to the physics and throw it. ---
  const blockMat = new THREE.MeshStandardMaterial({
    color: 0x33302c, roughness: 0.9, metalness: 0.08,
    emissive: 0x0a0806,
  });
  const rows = 6, cols = 9;
  const bw = CORE_W / cols, bh = CORE_H / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.98, bh * 0.98, CORE_D), blockMat.clone());
      // The graphite sits BEHIND the cut face; the fuel channels and rods stand
      // in front of it, so the cross-section reads as an open slice of the core
      // rather than a solid wall that hides its own channels.
      b.position.set(x0 + bw * (c + 0.5), -CORE_H / 2 + bh * (r + 0.5), -CORE_D * 0.5 - 0.4);
      b.castShadow = b.receiveShadow = true;
      group.add(b);
      blocks.push(b);
    }
  }

  // --- The columns: fuel channels (most) and control rods (every ROD_EVERY). ---
  const fuelBody = new THREE.CylinderGeometry(0.34, 0.34, CORE_H, 12);
  const rodBody = new THREE.BoxGeometry(0.5, CORE_H * 0.78, 0.5);
  const tipBody = new THREE.BoxGeometry(0.52, CORE_H * 0.28, 0.52);

  for (let i = 0; i < COL_COUNT; i++) {
    const x = x0 + colGap * i;
    const isRod = i % ROD_EVERY === (ROD_EVERY - 1);

    if (isRod) {
      // A control rod: absorber (dark) above, graphite follower tip (pale) below.
      // Assembled so the whole thing travels in Y; pos 1 = withdrawn (up),
      // pos 0 = fully inserted (down).
      const rod = new THREE.Group();
      const absorber = new THREE.Mesh(rodBody, new THREE.MeshStandardMaterial({
        color: 0x2b2f36, roughness: 0.6, metalness: 0.4,
      }));
      absorber.position.y = CORE_H * 0.39; // sits above the tip
      const tip = new THREE.Mesh(tipBody, new THREE.MeshStandardMaterial({
        color: 0x6e6a63, roughness: 0.85, metalness: 0.05, emissive: 0x100c06,
      }));
      tip.position.y = -CORE_H * 0.14;
      rod.add(absorber, tip);
      rod.position.set(x, 0, CORE_D * 0.2);
      rod.userData.travel = CORE_H * 0.92; // how far up "withdrawn" lifts it
      group.add(rod);
      rods.push({ group: rod, tip, absorber });
    } else {
      // A fuel channel: an emissive tube. Its glow is the chain reaction.
      const mat = new THREE.MeshStandardMaterial({
        color: 0x3a2a1c, emissive: 0xff5a1e, emissiveIntensity: 0.5,
        roughness: 0.5, metalness: 0.2,
      });
      const ch = new THREE.Mesh(fuelBody, mat);
      ch.position.set(x, 0, CORE_D * 0.2);
      group.add(ch);
      channels.push(ch);
    }
  }

  // A soft additive backplane behind the channels — the volumetric "glow" of the
  // core as a whole. Bloom turns this into the light that fills the cutaway.
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(CORE_W * 1.15, CORE_H * 1.1),
    new THREE.MeshBasicMaterial({
      color: 0xff6a20, transparent: true, opacity: 0.0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  glow.position.set(0, 0, -CORE_D * 1.15);
  group.add(glow);

  // Set overall power look: cool amber at idle, white-hot at the spike.
  const _cool = new THREE.Color(0xff5a1e);
  const _hot = new THREE.Color(0xfff2d0);
  group.userData = {
    channels, rods, blocks, glow,
    COLS: COL_COUNT, W: CORE_W, H: CORE_H, D: CORE_D,
    setGlow(v) {
      const k = THREE.MathUtils.clamp(v, 0, 1);
      const col = _cool.clone().lerp(_hot, Math.pow(k, 0.6));
      // A visible amber floor even at idle, then a non-linear runaway to the spike.
      const inten = 0.3 + k * 0.8 + k * k * 6.5;
      for (const ch of channels) {
        ch.material.emissive.copy(col);
        ch.material.emissiveIntensity = inten;
      }
      glow.material.color.copy(col);
      glow.material.opacity = Math.min(0.95, k * k * 1.1);
    },
    // Set every rod's insertion 0 (down/in) .. 1 (up/out).
    setRods(pos) {
      const p = THREE.MathUtils.clamp(pos, 0, 1);
      for (const r of rods) r.group.position.y = p * r.group.userData.travel;
    },
  };
  group.userData.setGlow(0.12);
  group.userData.setRods(0.15); // start nearly inserted (a controlled reactor)

  return group;
}

export { CORE_W, CORE_H, CORE_D };
