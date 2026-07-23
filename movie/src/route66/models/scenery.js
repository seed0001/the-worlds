import * as THREE from 'three';

// Everything beside the road. Two kinds of thing live here:
//
//   PROPS — cheap scatter, one builder per kind (corn, derricks, mesas,
//   joshua trees...), spawned by the mile from each state's dressing recipe.
//
//   SET PIECES — the buildings the story stops at: a motor court, a ghost
//   town's main street, the Tucumcari neon, Roy's at Amboy. Each one is built
//   TWICE inside one group — its 1957 self and its present self — and
//   userData.setEra('past'|'present') cuts between them. That is the flash:
//   same spot, same camera, the living version or the ruin.

const M = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...opts });

// ---------------------------------------------------------------- props ----

function corn(rng) {
  const g = new THREE.Group();
  const mat = M(0x7a8f3a);
  const tuft = M(0xc9b458);
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.9 + rng() * 0.5, 0.12), mat);
    s.position.set(rng() * 2.4 - 1.2, 1.0, rng() * 2.4 - 1.2);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.2), tuft);
    t.position.set(s.position.x, 2.05 + rng() * 0.3, s.position.z);
    g.add(s, t);
  }
  return g;
}

function oak(rng) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 2.4, 6), M(0x5a4630));
  trunk.position.y = 1.2;
  const crown = new THREE.Mesh(new THREE.SphereGeometry(2.1 + rng() * 0.8, 8, 6), M(0x4a6b32));
  crown.position.y = 3.4;
  crown.scale.y = 0.85;
  g.add(trunk, crown);
  return g;
}

function pine(rng) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 2.2, 6), M(0x4c3a28));
  trunk.position.y = 1.1;
  const h = 3.6 + rng() * 1.6;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.3, h, 8), M(0x2f4d30));
  cone.position.y = 2 + h / 2;
  g.add(trunk, cone);
  return g;
}

function hill(rng) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(40 + rng() * 60, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(0x53683c));
  m.scale.y = 0.22 + rng() * 0.1;
  return m;
}

function chatPile(rng) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(8 + rng() * 8, 7 + rng() * 6, 9), M(0x9b9891));
  m.position.y = 0;
  return m;
}

function derrick(rng) {
  const g = new THREE.Group();
  const mat = M(0x2c2c30, { roughness: 0.7, metalness: 0.3 });
  const h = 9 + rng() * 3;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, h, 0.18), mat);
    leg.position.set(sx * 1.1, h / 2, sz * 1.1);
    leg.rotation.z = -sx * 0.09;
    leg.rotation.x = sz * 0.09;
    g.add(leg);
  }
  for (let i = 1; i < 4; i++) {
    const w = 2.4 * (1 - i * 0.22);
    const ring = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, w), mat);
    ring.position.y = i * h * 0.27;
    g.add(ring);
  }
  const crown = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.8), mat);
  crown.position.y = h + 0.2;
  g.add(crown);
  return g;
}

function windmill(rng) {
  const g = new THREE.Group();
  const mat = M(0x8f9298, { metalness: 0.4, roughness: 0.6 });
  const h = 7 + rng() * 2;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, h, 6), mat);
  pole.position.y = h / 2;
  const rotor = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.1, 0.34), mat);
    b.position.y = 0.75;
    const arm = new THREE.Group();
    arm.add(b);
    arm.rotation.z = (i / 12) * Math.PI * 2;
    rotor.add(arm);
  }
  rotor.position.set(0, h, -0.3);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 1.2), mat);
  tail.position.set(0, h, 1.1);
  g.add(pole, rotor, tail);
  g.userData.rotor = rotor;
  return g;
}

function mesa(rng, painted = false) {
  const g = new THREE.Group();
  const r = 26 + rng() * 44;
  const bands = painted
    ? [0xb9788a, 0xc99a72, 0x9c8b95, 0xd8b07e]
    : [0xa06848, 0xb07a52, 0x8f5e40];
  let y = 0;
  for (let i = 0; i < bands.length; i++) {
    const h = (painted ? 3.5 : 6) + rng() * 4;
    const shrink = 1 - i * 0.1;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r * shrink * 0.92, r * shrink, h, 12), M(bands[i]));
    m.position.y = y + h / 2;
    y += h;
    g.add(m);
  }
  return g;
}

function adobe(rng) {
  const g = new THREE.Group();
  const mat = M(0xc99a6e);
  const main = new THREE.Mesh(new THREE.BoxGeometry(4 + rng() * 2, 2.4, 3.5), mat);
  main.position.y = 1.2;
  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 2.4), mat);
  wing.position.set(2.6, 0.9, 0.8);
  // Vigas — the roof beams poking through the wall.
  for (let i = 0; i < 4; i++) {
    const v = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 5), M(0x6b5638));
    v.rotation.x = Math.PI / 2;
    v.position.set(-1.4 + i * 0.9, 2.1, 1.8);
    g.add(v);
  }
  g.add(main, wing);
  main.castShadow = true;
  return g;
}

function joshua(rng) {
  const g = new THREE.Group();
  const bark = M(0x6b5638);
  const tuftM = M(0x5e7042);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 2.2 + rng(), 6), bark);
  trunk.position.y = 1.2;
  g.add(trunk);
  const arms = 2 + (rng() * 3 | 0);
  for (let i = 0; i < arms; i++) {
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.3, 5), bark);
    const ang = rng() * Math.PI * 2;
    a.position.set(Math.cos(ang) * 0.5, 2.2 + rng() * 0.6, Math.sin(ang) * 0.5);
    a.rotation.z = Math.cos(ang) * 0.8;
    a.rotation.x = -Math.sin(ang) * 0.8;
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.42, 6, 5), tuftM);
    tuft.position.copy(a.position).y += 0.55;
    tuft.position.x *= 1.6; tuft.position.z *= 1.6;
    g.add(a, tuft);
  }
  const tuft0 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 5), tuftM);
  tuft0.position.y = 2.6;
  g.add(tuft0);
  return g;
}

function palm(rng) {
  const g = new THREE.Group();
  const h = 6 + rng() * 3;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, h, 6), M(0x8a7452));
  trunk.position.y = h / 2;
  g.add(trunk);
  for (let i = 0; i < 7; i++) {
    const frond = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 2.6), M(0x3f6b35));
    const ang = (i / 7) * Math.PI * 2;
    frond.position.set(Math.cos(ang) * 1.0, h + 0.2, Math.sin(ang) * 1.0);
    frond.rotation.y = -ang + Math.PI / 2;
    frond.rotation.x = 0.35;
    g.add(frond);
  }
  return g;
}

function orangeRow(rng) {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const t = new THREE.Mesh(new THREE.SphereGeometry(1.3, 7, 6), M(0x2f5d2a));
    t.position.set(i * 3.2, 1.5, 0);
    t.scale.y = 0.9;
    g.add(t);
    for (let k = 0; k < 5; k++) {
      const o = new THREE.Mesh(new THREE.SphereGeometry(0.09, 5, 4), M(0xe08a2a));
      o.position.set(i * 3.2 + (rng() - 0.5) * 1.8, 1.2 + rng() * 1.4, (rng() - 0.5) * 1.8);
      g.add(o);
    }
  }
  return g;
}

function scrub(rng) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.5 + rng() * 0.7, 6, 4), M(0x8a7d4f));
  m.scale.y = 0.5;
  return m;
}

function saguaroLikeCactus(rng) {
  // Not strictly 66 country flora everywhere, but the billboards loved them.
  const g = new THREE.Group();
  const mat = M(0x4c7040);
  const h = 3 + rng() * 2;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, h, 8), mat);
  body.position.y = h / 2;
  g.add(body);
  for (const side of [-1, 1]) {
    if (rng() < 0.3) continue;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 1.4, 7), mat);
    arm.position.set(side * 0.62, h * 0.55, 0);
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.1, 7), mat);
    up.position.set(side * 0.98, h * 0.55 + 0.7, 0);
    arm.rotation.z = side * Math.PI / 2.2;
    g.add(arm, up);
  }
  return g;
}

// Telephone poles — the road's metronome, both sides, all 2,448 miles.
export function makePole() {
  const g = new THREE.Group();
  const mat = M(0x5c4a34);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 7.2, 6), mat);
  pole.position.y = 3.6;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 0.1), mat);
  arm.position.y = 6.6;
  const arm2 = arm.clone();
  arm2.position.y = 6.1;
  g.add(pole, arm, arm2);
  return g;
}

export const PROPS = {
  corn, oak, pine, hill, chatPile, derrick, windmill, adobe,
  mesa: (rng) => mesa(rng, false),
  paintedMesa: (rng) => mesa(rng, true),
  joshua, palm, orangeRow, scrub, cactus: saguaroLikeCactus,
};

// Per-state dressing recipe: ground colour, sky tint, what grows near the
// road, what stands on the horizon. The scene lerps grounds between states.
export const DRESSING = {
  illinois:   { ground: 0x6d7c42, tint: 0xdcd8b8, near: ['corn', 'corn', 'corn', 'oak'], far: [], farEvery: 0 },
  missouri:   { ground: 0x5d7040, tint: 0xd6d8b4, near: ['oak', 'oak', 'scrub'], far: ['hill'], farEvery: 130 },
  kansas:     { ground: 0x8a8456, tint: 0xd8d4ac, near: ['scrub', 'oak'], far: ['chatPile'], farEvery: 100 },
  oklahoma:   { ground: 0x9c6a48, tint: 0xdcc4a0, near: ['scrub', 'windmill', 'scrub'], far: ['derrick'], farEvery: 90 },
  texas:      { ground: 0xa8885c, tint: 0xe0d0a8, near: ['scrub', 'windmill'], far: [], farEvery: 0 },
  newmexico:  { ground: 0xb08258, tint: 0xe0b490, near: ['scrub', 'cactus', 'adobe'], far: ['mesa'], farEvery: 110 },
  arizona:    { ground: 0xb4835f, tint: 0xe2b494, near: ['scrub', 'cactus', 'joshua'], far: ['paintedMesa'], farEvery: 100 },
  california: { ground: 0xbfa06a, tint: 0xe6d2a4, near: ['joshua', 'scrub', 'scrub'], far: [], farEvery: 0 },
};

// ---------------------------------------------------------- set pieces ----

function eraPair() {
  const g = new THREE.Group();
  const past = new THREE.Group();
  const present = new THREE.Group();
  present.visible = false;
  g.add(past, present);
  g.userData.setEra = (era) => {
    past.visible = era !== 'present';
    present.visible = era === 'present';
  };
  return { g, past, present };
}

function signBoard(text, { w = 512, h = 256, bg = '#f2efe6', fg = '#a5231d', sub = '', dead = false } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = dead ? '#b8b0a2' : bg;
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = dead ? '#6e675c' : fg;
  ctx.font = `bold ${sub ? h * 0.34 : h * 0.42}px Georgia, serif`;
  ctx.fillText(text, w / 2, sub ? h * 0.45 : h * 0.62);
  if (sub) {
    ctx.font = `bold ${h * 0.2}px Georgia, serif`;
    ctx.fillText(sub, w / 2, h * 0.78);
  }
  if (dead) {                                      // rust streaks
    ctx.fillStyle = 'rgba(120,70,40,0.5)';
    for (let i = 0; i < 12; i++) ctx.fillRect(Math.random() * w, 0, 3 + Math.random() * 5, h);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
}

function cabin(mat, roofMat, w = 4, d = 4.5) {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, 2.5, d), mat);
  box.position.y = 1.25;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.82, 1.1, 4), roofMat);
  roof.position.y = 3.05;
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = d / w;
  g.add(box, roof);
  box.castShadow = roof.castShadow = true;
  return g;
}

// A Missouri motor court: a crescent of white cabins, a pool, a roadside sign.
// Past: whitewashed, blue pool, VACANCY. Present: boarded grey, empty pool,
// the sign rusted blank.
export function makeMotorCourt() {
  const { g, past, present } = eraPair();

  const white = M(0xe8e2d2), green = M(0x3f5d44), grey = M(0x8f8a80), dark = M(0x55524b);
  for (let i = 0; i < 5; i++) {
    const x = -10 + i * 5.2;
    const a = cabin(white, green); a.position.set(x, 0, -6 - Math.abs(i - 2) * 1.4); past.add(a);
    const b = cabin(grey, dark); b.position.copy(a.position);
    b.rotation.z = (i % 2 ? 1 : -1) * 0.02;       // a sag you can feel
    present.add(b);
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.05), dark);
    board.position.set(x, 1.1, b.position.z + 2.28);
    present.add(board);                            // boarded door
  }

  // The pool, front and centre — the era tells in the water.
  const rim = new THREE.Mesh(new THREE.BoxGeometry(7, 0.5, 4.4), M(0xd8d2c0));
  rim.position.set(2, 0.25, -1);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.8), M(0x3f8fa8, { roughness: 0.15, metalness: 0.4 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(2, 0.52, -1);
  past.add(rim, water);
  const rim2 = rim.clone(); rim2.material = M(0xa8a294);
  const leaves = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.8), M(0x4a4436));
  leaves.rotation.x = -Math.PI / 2;
  leaves.position.set(2, 0.4, -1);
  present.add(rim2, leaves);

  // The sign.
  const sp = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.5, 0.08), signBoard('WAGON WHEEL', { sub: 'MOTOR COURT — VACANCY' }));
  sp.position.set(-3, 3.2, 3.5);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.2, 0.16), M(0x6b5a44));
  post.position.set(-3, 1.6, 3.44);
  past.add(sp, post);
  const sp2 = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.5, 0.08), signBoard('WAGON WHEEL', { sub: 'MOTOR COURT', dead: true }));
  sp2.position.copy(sp.position);
  sp2.rotation.z = -0.06;
  present.add(sp2, post.clone());

  return g;
}

// A main-street strip: five false-front stores. Past: painted, named, awake.
// Present: grey, leaning, windows out — a ghost town off a dead alignment.
export function makeTownStrip({ names = ['CAFE', 'GARAGE', 'GROCERIES', 'HARDWARE', 'MOTEL'] } = {}) {
  const { g, past, present } = eraPair();
  const paints = [0xc4584a, 0xd8c898, 0x7a95a0, 0xc9a45c, 0x9c7f9a];

  names.forEach((name, i) => {
    const x = -14 + i * 7.2;
    const w = 6.2, h = 4 + (i % 2) * 0.8, d = 7;

    const shop = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(paints[i % paints.length]));
    body.position.y = h / 2;
    const front = new THREE.Mesh(new THREE.BoxGeometry(w, h + 1.2, 0.2), M(paints[i % paints.length]));
    front.position.set(0, (h + 1.2) / 2, d / 2 + 0.1);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.9, 0.06), signBoard(name, { bg: '#f2ecd8', fg: '#333' }));
    sign.position.set(0, h + 0.4, d / 2 + 0.24);
    const win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 1.4, 0.05), M(0x9fc4cf, { roughness: 0.2, metalness: 0.4 }));
    win.position.set(0, 1.4, d / 2 + 0.22);
    shop.add(body, front, sign, win);
    shop.position.x = x;
    past.add(shop);

    const ruin = new THREE.Group();
    const body2 = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(0xa29a8c));
    body2.position.y = h / 2;
    const front2 = new THREE.Mesh(new THREE.BoxGeometry(w, h + 1.2, 0.2), M(0x968d80));
    front2.position.set(0, (h + 1.2) / 2, d / 2 + 0.1);
    front2.rotation.x = -0.04;
    const sign2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.9, 0.06), signBoard(name, { dead: true }));
    sign2.position.set(0, h + 0.35, d / 2 + 0.24);
    sign2.rotation.z = (i % 2 ? 1 : -1) * 0.08;
    const hole = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 1.4, 0.05), M(0x14120f));
    hole.position.set(0, 1.4, d / 2 + 0.22);
    ruin.add(body2, front2, sign2, hole);
    ruin.position.x = x;
    ruin.rotation.y = (i % 2 ? 1 : -1) * 0.015;
    present.add(ruin);
  });

  // Tumbleweed and broken kerb for the present.
  for (let i = 0; i < 6; i++) {
    const t = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 + Math.random() * 0.4, 0), M(0x9a8a5c, { wireframe: true }));
    t.position.set(-16 + Math.random() * 34, 0.5, 4 + Math.random() * 4);
    present.add(t);
  }
  return g;
}

// A gas station: canopy, two pumps, office. `name` goes on the tall sign.
// Past: red pumps, 29¢. Present: pumps beheaded, glass gone, sign bleached.
export function makeGasStation({ name = 'GAS', sub = 'REGULAR 29¢' } = {}) {
  const { g, past, present } = eraPair();

  const build = (dead) => {
    const grp = new THREE.Group();
    const wallM = dead ? M(0x968f82) : M(0xf0e8d4);
    const office = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 4.6), wallM);
    office.position.set(-4.4, 1.5, -2);
    const win = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.3, 0.06), dead ? M(0x151310) : M(0x9fc4cf, { roughness: 0.2, metalness: 0.4 }));
    win.position.set(-4.4, 1.6, 0.34);
    const slabM = dead ? M(0x8c887e) : M(0xd8d3c4);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(8, 0.35, 6), slabM);
    canopy.position.set(1.6, 4, -1);
    if (dead) canopy.rotation.z = -0.05;
    const posts = [];
    for (const [px, pz] of [[-1.4, -1], [4.6, -1]]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.24, 4, 0.24), slabM);
      p.position.set(px, 2, pz);
      posts.push(p);
    }
    for (const [px] of [[0.6], [2.8]]) {
      const pump = new THREE.Mesh(new THREE.BoxGeometry(0.55, dead ? 0.8 : 1.5, 0.45), dead ? M(0x7c5148) : M(0xb03a30, { roughness: 0.5 }));
      pump.position.set(px, dead ? 0.4 : 0.75, -0.6);
      grp.add(pump);
      if (!dead) {
        const globe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), M(0xf2ecd8, { roughness: 0.4 }));
        globe.position.set(px, 1.7, -0.6);
        grp.add(globe);
      }
    }
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 1.3, 0.08),
      signBoard(name, { sub: dead ? '' : sub, dead }),
    );
    sign.position.set(7.2, 5.4, 0);
    if (dead) sign.rotation.z = 0.07;
    const sPost = new THREE.Mesh(new THREE.BoxGeometry(0.18, 5.4, 0.18), dead ? M(0x6e675c) : M(0x8a8f96, { metalness: 0.4, roughness: 0.6 }));
    sPost.position.set(7.2, 2.7, 0);
    grp.add(office, win, canopy, ...posts, sign, sPost);
    return grp;
  };

  past.add(build(false));
  present.add(build(true));
  return g;
}

// Tucumcari's pride: a motel with a big neon sign. Past shows it at dusk with
// every tube lit (the bloom pass does the glowing); present is the same sign
// by daylight with half its letters dead.
export function makeNeonMotel() {
  const { g, past, present } = eraPair();

  const office = cabin(M(0xd8b48a), M(0x8a4a3a), 6, 5);
  office.position.set(2, 0, -4);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(16, 2.6, 4), M(0xd8b48a));
  wing.position.set(-4, 1.3, -8);
  past.add(office, wing);
  const office2 = cabin(M(0xa89478), M(0x5c4038), 6, 5);
  office2.position.copy(office.position);
  const wing2 = new THREE.Mesh(new THREE.BoxGeometry(16, 2.6, 4), M(0xa89478));
  wing2.position.copy(wing.position);
  present.add(office2, wing2);

  const neonText = (lit) => {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 1024;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1c1a2e';
    ctx.fillRect(0, 0, 512, 1024);
    ctx.textAlign = 'center';
    const letters = 'MOTEL'.split('');
    letters.forEach((ch, i) => {
      const dead = !lit && (i === 1 || i === 3);   // today: the O and E are out
      ctx.fillStyle = lit ? '#ff4fa0' : dead ? '#4a4456' : '#b8637e';
      ctx.font = 'bold 150px Georgia, serif';
      ctx.fillText(ch, 256, 190 + i * 160);
    });
    ctx.fillStyle = lit ? '#7fe0ff' : '#4a5560';
    ctx.font = 'bold 72px Georgia, serif';
    ctx.fillText(lit ? 'VACANCY' : 'NO ACANCY', 256, 960);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  const signGeo = new THREE.BoxGeometry(2.6, 5.2, 0.25);
  const litMat = new THREE.MeshStandardMaterial({
    map: neonText(true), emissive: 0xffffff, emissiveMap: neonText(true), emissiveIntensity: 1.6, roughness: 0.6,
  });
  const deadMat = new THREE.MeshStandardMaterial({ map: neonText(false), roughness: 0.8 });
  const post = () => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.22, 4, 0.22), M(0x8a8f96, { metalness: 0.4, roughness: 0.6 }));
    p.position.set(8, 2, 2);
    return p;
  };
  const s1 = new THREE.Mesh(signGeo, litMat);
  s1.position.set(8, 6.4, 2);
  past.add(s1, post());
  const s2 = new THREE.Mesh(signGeo, deadMat);
  s2.position.copy(s1.position);
  s2.rotation.z = -0.04;
  present.add(s2, post());

  return g;
}

// The Wigwam Village: a rank of concrete tipis. They survive — the present
// version just fades the paint; this one the road-trip faithful kept alive.
export function makeWigwams() {
  const { g, past, present } = eraPair();
  for (let i = 0; i < 6; i++) {
    const x = -12 + i * 5;
    const a = new THREE.Mesh(new THREE.ConeGeometry(2.2, 5.4, 8), M(0xf0ead8));
    a.position.set(x, 2.7, -5 - (i % 2) * 3);
    const band = new THREE.Mesh(new THREE.ConeGeometry(1.35, 1.1, 8), M(0xb03a30));
    band.position.set(x, 4.4, a.position.z);
    past.add(a, band);
    const b = a.clone(); b.material = M(0xd8d2c0);
    const band2 = band.clone(); band2.material = M(0x9c5a50);
    present.add(b, band2);
  }
  return g;
}

// Roy's at Amboy: the gas stop and THE sign, alone in the Mojave.
export function makeRoys() {
  const { g, past, present } = eraPair();

  // Two whole stations, one per era — each pinned to its half of the pair.
  const sPast = makeGasStation({ name: "ROY'S", sub: 'CAFE — GAS' });
  sPast.userData.setEra('past');
  const sNow = makeGasStation({ name: "ROY'S", sub: '' });
  sNow.userData.setEra('present');
  past.add(sPast);
  present.add(sNow);

  // The tall 1959-style boomerang sign, simplified to its silhouette.
  const totem = (dead) => {
    const grp = new THREE.Group();
    const panel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.6, 0.2), signBoard("ROY'S", { sub: 'MOTEL — CAFE', bg: '#22283a', fg: dead ? '#8a8f96' : '#f2c14e', dead }));
    panel.position.y = 8.2;
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6, 0.3), M(0x8a8f96, { metalness: 0.4, roughness: 0.6 }));
    mast.position.y = 3;
    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.25, 0.25), M(dead ? 0x8a4a3a : 0xb03a30));
    wing.position.y = 10.4;
    wing.rotation.z = 0.5;
    grp.add(panel, mast, wing);
    grp.position.set(9, 0, 4);
    return grp;
  };
  past.add(totem(false));
  present.add(totem(true));
  return g;
}

// A barn with the ad painted on its roof — Missouri's billboards were barns.
export function makeBarnAd(text = 'MERAMEC CAVERNS') {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(9, 5, 7), M(0x8c3a30));
  body.position.y = 2.5;
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, 1024, 512);
  ctx.fillStyle = '#f2ecd8';
  ctx.textAlign = 'center';
  ctx.font = 'bold 120px Georgia, serif';
  const words = text.split(' ');
  ctx.fillText(words[0] ?? '', 512, 220);
  ctx.font = 'bold 100px Georgia, serif';
  ctx.fillText(words.slice(1).join(' '), 512, 380);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(9.6, 0.2, 7.6),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }),
  );
  roof.position.y = 5.4;
  roof.rotation.z = 0.28;                          // pitched toward the road
  g.add(body, roof);
  body.castShadow = true;
  return g;
}

// The Chicago skyline the drive leaves behind: a wall of grey slabs east of
// the start, silhouetted in the morning haze.
export function makeSkyline() {
  const g = new THREE.Group();
  const mat = M(0x5a6470, { roughness: 0.95 });
  let x = -140;
  let i = 0;
  while (x < 140) {
    const w = 14 + ((i * 37) % 22);
    const h = 30 + ((i * 53) % 90);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 16), mat);
    b.position.set(x + w / 2, h / 2, (i % 3) * 20);
    g.add(b);
    x += w + 6;
    i++;
  }
  return g;
}

// A diner for the first miles out of Chicago: the chrome box with the stripe.
export function makeDiner() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(10, 3, 4.6), M(0xc9ced4, { metalness: 0.7, roughness: 0.25 }));
  body.position.y = 1.5;
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(10.05, 0.5, 4.65), M(0xb03a30, { roughness: 0.4 }));
  stripe.position.y = 2.1;
  const sign = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 0.08), signBoard('DINER', { sub: 'OPEN ALL NITE', bg: '#22283a', fg: '#7fe0ff' }));
  sign.position.set(0, 4.2, 0);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.4, 0.16), M(0x8a8f96));
  post.position.set(0, 3.2, 0);
  g.add(body, stripe, sign, post);
  body.castShadow = true;
  return g;
}
