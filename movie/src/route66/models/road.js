import * as THREE from 'three';

// The road. The car never actually moves — the world scrolls past it — so the
// two-lane is one long plane whose texture streams backward under the wheels.
// Two faces of the same asphalt: FRESH (1957 — dark, crisp white dashes) and
// CRACKED (today — bleached grey, broken dashes, crack lines, weeds at the
// seams). The flash just swaps the map on the same mesh: same road, same spot,
// sixty-odd years apart.
//
// The interstate is the other road — the one that won. Two wide carriageways
// and a median, laid alongside where the old alignment runs, plus a stream of
// nondescript modern traffic to make the point: the cars didn't stop coming,
// they just stopped coming HERE.

export const ROAD_LEN = 1600;      // metres of visible roadway
const TILE = 20;                   // metres per texture repeat

function asphaltTexture({ cracked = false } = {}) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 512;   // one TILE: 512px tall = 20 m
  const ctx = c.getContext('2d');

  // Bed: gravel shoulders, asphalt slab between.
  ctx.fillStyle = cracked ? '#9a8f79' : '#a3906e';
  ctx.fillRect(0, 0, 256, 512);
  ctx.fillStyle = cracked ? '#7e7d78' : '#3f4045';
  ctx.fillRect(34, 0, 188, 512);

  // Asphalt grain.
  for (let i = 0; i < 2600; i++) {
    const v = Math.random();
    ctx.fillStyle = cracked
      ? `rgba(${105 + v * 60 | 0},${104 + v * 58 | 0},${98 + v * 52 | 0},0.16)`
      : `rgba(${48 + v * 42 | 0},${49 + v * 42 | 0},${54 + v * 44 | 0},0.18)`;
    ctx.fillRect(34 + Math.random() * 188, Math.random() * 512, 1 + v * 2, 1 + v * 2);
  }

  // Centre line: crisp dashes in '57; ghosts of dashes today.
  ctx.fillStyle = cracked ? 'rgba(214,210,196,0.28)' : '#e8e4d4';
  for (const y of [20, 148, 276, 404]) {
    if (cracked && Math.random() < 0.35) continue;
    ctx.fillRect(124, y, 8, 88);
  }

  if (cracked) {
    // Crack lines wandering down the slab, and weeds breaking the seams.
    ctx.strokeStyle = 'rgba(40,40,38,0.55)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 5; k++) {
      let x = 40 + Math.random() * 176, y = 0;
      ctx.beginPath(); ctx.moveTo(x, y);
      while (y < 512) { x += (Math.random() - 0.5) * 26; y += 18 + Math.random() * 26; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(96,104,58,0.7)';
    for (let k = 0; k < 34; k++) {
      const e = Math.random() < 0.5 ? 34 + Math.random() * 10 : 212 + Math.random() * 10;
      ctx.fillRect(e, Math.random() * 512, 3, 3 + Math.random() * 4);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, ROAD_LEN / TILE);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function buildTwoLane() {
  const fresh = asphaltTexture();
  const cracked = asphaltTexture({ cracked: true });
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(11, ROAD_LEN),
    new THREE.MeshStandardMaterial({ map: fresh, roughness: 0.92 }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, 0.02, -ROAD_LEN / 2 + 120);
  mesh.receiveShadow = true;

  mesh.userData.scroll = (dz) => {
    fresh.offset.y += dz / TILE;
    cracked.offset.y = fresh.offset.y;
  };
  mesh.userData.setEra = (era) => {
    mesh.material.map = era === 'present' ? cracked : fresh;
    mesh.material.needsUpdate = true;
  };
  return mesh;
}

function interstateTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#55565c';                       // newer, bluer asphalt
  ctx.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 1800; i++) {
    const v = Math.random();
    ctx.fillStyle = `rgba(${70 + v * 40 | 0},${71 + v * 40 | 0},${78 + v * 42 | 0},0.16)`;
    ctx.fillRect(Math.random() * 256, Math.random() * 512, 1 + v * 2, 1 + v * 2);
  }
  ctx.fillStyle = '#ffd23e';                       // yellow inner edge line
  ctx.fillRect(10, 0, 7, 512);
  ctx.fillStyle = '#eceadf';                       // white lane dashes + outer edge
  ctx.fillRect(238, 0, 8, 512);
  for (const y of [10, 138, 266, 394]) ctx.fillRect(124, y, 7, 74);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, ROAD_LEN / TILE);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// A featureless modern car or semi — deliberately anonymous next to the Bel
// Air. They live on the interstate, doing eighty, forever.
function modernVehicle(rng = Math.random) {
  const g = new THREE.Group();
  const truck = rng() < 0.3;
  if (truck) {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.7, 2.3),
      new THREE.MeshStandardMaterial({ color: 0x9aa1a8, roughness: 0.5, metalness: 0.2 }));
    cab.position.set(0, 1.45, -5.2);
    const box = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.9, 10.5),
      new THREE.MeshStandardMaterial({ color: 0xd8d8d4, roughness: 0.7 }));
    box.position.set(0, 1.7, 0.6);
    g.add(cab, box);
  } else {
    const shades = [0xb9bcbf, 0x2e3134, 0x6f7480, 0x8c8f93, 0xc4c6c8];
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.95, 4.5),
      new THREE.MeshStandardMaterial({ color: shades[(rng() * shades.length) | 0], roughness: 0.4, metalness: 0.25 }));
    body.position.y = 0.75;
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.62, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x22262a, roughness: 0.2, metalness: 0.4 }));
    top.position.set(0, 1.45, 0.1);
    g.add(body, top);
  }
  return g;
}

export function buildInterstate() {
  const g = new THREE.Group();
  g.name = 'interstate';
  // The new road was built BESIDE the old alignment, not on it: shift the
  // whole thing so the two-lane survives in its shadow, the way it really did.
  g.position.x = 24;

  const tex1 = interstateTexture(), tex2 = interstateTexture();
  const west = new THREE.Mesh(new THREE.PlaneGeometry(11, ROAD_LEN),
    new THREE.MeshStandardMaterial({ map: tex1, roughness: 0.9 }));
  west.rotation.x = -Math.PI / 2;
  const east = new THREE.Mesh(new THREE.PlaneGeometry(11, ROAD_LEN),
    new THREE.MeshStandardMaterial({ map: tex2, roughness: 0.9 }));
  east.rotation.x = -Math.PI / 2;
  east.rotation.z = Math.PI;                      // mirrored carriageway
  west.position.set(-9, 0.04, -ROAD_LEN / 2 + 120);
  east.position.set(9, 0.04, -ROAD_LEN / 2 + 120);

  const median = new THREE.Mesh(new THREE.PlaneGeometry(7, ROAD_LEN),
    new THREE.MeshStandardMaterial({ color: 0x8a8c77, roughness: 1 }));
  median.rotation.x = -Math.PI / 2;
  median.position.set(0, 0.03, -ROAD_LEN / 2 + 120);
  g.add(west, east, median);

  // The traffic. Westbound on the left carriageway (away from camera),
  // eastbound on the right (toward it). Recycled forever.
  const vehicles = [];
  for (let i = 0; i < 14; i++) {
    const v = modernVehicle();
    const westbound = i % 2 === 0;
    v.userData.dir = westbound ? -1 : 1;
    v.userData.speed = 33 + Math.random() * 6;    // ~75–90 mph
    const lane = Math.random() < 0.5 ? 2.6 : 5.9;
    v.position.x = westbound ? -9 + (lane - 4.2) : 9 - (lane - 4.2);
    v.rotation.y = westbound ? 0 : Math.PI;
    v.position.z = -700 + Math.random() * 900;
    vehicles.push(v);
    g.add(v);
  }
  g.userData.update = (dt) => {
    for (const v of vehicles) {
      v.position.z += v.userData.dir * v.userData.speed * dt;
      if (v.position.z < -820) v.position.z = 200;
      if (v.position.z > 200) v.position.z = -820;
    }
  };

  g.visible = false;
  return g;
}
