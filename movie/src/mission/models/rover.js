import * as THREE from 'three';

// The Lunar Roving Vehicle, built to scale and facing +Z: ~3.1 m long, ~1.8 m
// wide, wire-mesh wheels ~0.8 m across, two side-by-side seats, the big
// high-gain dish antenna on its mast up front. Same primitive idiom as the LM.
//
// The wheels are their own groups so the scene can roll them (spin about the
// axle) while it drives the whole vehicle across the regolith; the rear-wheel
// world positions are exposed so the dust system can throw the rooster-tail
// fantail off them. The model is rigid — the fold-out from the LM bay is staged
// in the scene as a crane-down, not an accordion rig.

const FRAME = () => new THREE.MeshStandardMaterial({ color: 0x2c2f34, roughness: 0.6, metalness: 0.5 });
const FENDER = () => new THREE.MeshStandardMaterial({ color: 0xb06a2a, roughness: 0.7, metalness: 0.2 });
const WHEEL = () => new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.8, metalness: 0.3 });
const HUB = () => new THREE.MeshStandardMaterial({ color: 0xc9c6bf, roughness: 0.5, metalness: 0.6 });
const WEBBING = () => new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.9, metalness: 0.1 });
const DISH = () => new THREE.MeshStandardMaterial({ color: 0xd8d5cc, roughness: 0.35, metalness: 0.7, side: THREE.DoubleSide });
const GOLD = () => new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.5, metalness: 0.7 });

const WHEEL_R = 0.4;
const HALF_W = 0.9;    // half track width (x)
const HALF_L = 1.15;   // half wheelbase (z)

function buildWheel() {
  const g = new THREE.Group();
  // Tyre: a cylinder lying along X (axle), so the group spins about X to roll.
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.22, 20, 1, true), WHEEL());
  tyre.rotation.z = Math.PI / 2;
  tyre.castShadow = true;
  g.add(tyre);
  // Bright hub disc so the roll reads.
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.24, 12), HUB());
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  // A couple of chevrons so a spinning wheel is legible.
  for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, WHEEL_R * 1.5), HUB());
    spoke.position.set(0, Math.sin(a) * WHEEL_R * 0.45, Math.cos(a) * WHEEL_R * 0.45);
    spoke.rotation.x = a;
    g.add(spoke);
  }
  return g;
}

export function buildRover() {
  const g = new THREE.Group();
  g.name = 'rover';

  // ---- Chassis floor and rails, sitting on the axles.
  const floor = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 2.4), FRAME());
  floor.position.y = WHEEL_R + 0.05;
  floor.castShadow = true;
  g.add(floor);
  for (const sx of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8), FRAME());
    rail.rotation.x = Math.PI / 2;
    rail.position.set(sx * 0.72, WHEEL_R + 0.14, 0);
    g.add(rail);
  }

  // ---- Wheels + fenders at the four corners.
  const wheels = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const w = buildWheel();
      w.position.set(sx * HALF_W, WHEEL_R, sz * HALF_L);
      g.add(w);
      wheels.push(w);
      // Fender arch over the wheel.
      const fender = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R + 0.12, WHEEL_R + 0.12, 0.3, 14, 1, true, 0, Math.PI), FENDER());
      fender.rotation.z = Math.PI / 2;
      fender.position.set(sx * HALF_W, WHEEL_R + 0.02, sz * HALF_L);
      g.add(fender);
      // Suspension arm linking wheel to chassis.
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, HALF_W - 0.35, 6), FRAME());
      arm.rotation.z = Math.PI / 2;
      arm.position.set(sx * (HALF_W - (HALF_W - 0.35) / 2 - 0.18), WHEEL_R, sz * HALF_L);
      g.add(arm);
    }
  }

  // ---- Two seats, side by side, facing +Z.
  const seats = [];
  for (const sx of [-1, 1]) {
    const seat = new THREE.Group();
    seat.position.set(sx * 0.4, WHEEL_R + 0.1, -0.1);
    const pan = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.55), WEBBING());
    pan.position.y = 0.28;
    seat.add(pan);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.62, 0.1), WEBBING());
    back.position.set(0, 0.58, -0.28);
    seat.add(back);
    g.add(seat);
    seats.push(seat);
    // The seat "floor" reference for placing a rider.
    seat.userData.sitY = WHEEL_R + 0.1 + 0.33;
  }

  // ---- T-handle controller between the seats.
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), HUB());
  post.position.set(0, WHEEL_R + 0.5, 0.2);
  g.add(post);
  const tbar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.24, 6), HUB());
  tbar.rotation.z = Math.PI / 2;
  tbar.position.set(0, WHEEL_R + 0.74, 0.2);
  g.add(tbar);

  // ---- Nav/console box up front.
  const console_ = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.2), FRAME());
  console_.position.set(0, WHEEL_R + 0.35, 0.95);
  g.add(console_);

  // ---- High-gain dish antenna on a mast at the front — the LRV's signature.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.3, 8), HUB());
  mast.position.set(0.5, WHEEL_R + 0.75, 1.0);
  g.add(mast);
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.32),
    DISH(),
  );
  dish.position.set(0.5, WHEEL_R + 1.4, 1.0);
  dish.rotation.x = -0.5;
  g.add(dish);
  // Gold feed at the dish focus.
  const feed = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), GOLD());
  feed.position.set(0.5, WHEEL_R + 1.25, 1.12);
  g.add(feed);

  // ---- Low-gain rod antenna at the back.
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.1, 6), HUB());
  rod.position.set(-0.5, WHEEL_R + 0.7, -0.9);
  rod.rotation.x = 0.2;
  g.add(rod);

  g.userData.wheels = wheels;
  g.userData.seats = seats;
  g.userData.wheelR = WHEEL_R;
  g.userData.halfL = HALF_L;
  g.userData.halfW = HALF_W;
  // Rear-wheel local offsets, for the dust system to find where the fantail flies.
  g.userData.rearWheels = wheels.filter((w) => w.position.z < 0);
  return g;
}
