import * as THREE from 'three';

// The hero: a 1957 Chevrolet Bel Air, in silhouette — the way the film treats
// all its hardware, enough geometry to be unmistakable and no more. What makes
// a '57 read as a '57: the long low body, the wraparound windshield, the chrome
// side spear, and above all the tailfins. Two-tone turquoise over india ivory.
//
// userData.setSpeed(v) drives wheel spin and a faint body float;
// userData.update(dt, t) animates; userData.setLights(on) for the dusk chapter.

const TURQUOISE = 0x2e8b8b, IVORY = 0xf2eee0;

export function buildBelAir() {
  const g = new THREE.Group();
  g.name = 'belair';

  // No environment map in these scenes, so full metalness would render black;
  // chrome is faked with a bright dielectric instead.
  const paint = new THREE.MeshStandardMaterial({ color: TURQUOISE, roughness: 0.35, metalness: 0.15 });
  const roof = new THREE.MeshStandardMaterial({ color: IVORY, roughness: 0.4, metalness: 0.05 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe4e8ee, roughness: 0.25, metalness: 0.45 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fc4cf, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.55 });
  const tire = new THREE.MeshStandardMaterial({ color: 0x16181a, roughness: 0.95 });
  const wall = new THREE.MeshStandardMaterial({ color: 0xe8e6dd, roughness: 0.8 });

  const body = new THREE.Group();
  g.add(body);

  // Main hull: nose at -z (the car faces down the road, westbound).
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, 5.0), paint);
  hull.position.y = 0.62;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.22, 5.1), paint);
  deck.position.y = 0.93;
  body.add(hull, deck);

  // Cabin: greenhouse set slightly rearward, ivory roof, pillars implied.
  const cabinGlass = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.42, 2.05), glass);
  cabinGlass.position.set(0, 1.25, 0.25);
  const roofMesh = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.1, 1.75), roof);
  roofMesh.position.set(0, 1.5, 0.28);
  body.add(cabinGlass, roofMesh);

  // Windshield rake: a slanted glass plane ahead of the cabin.
  const shield = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.55), glass);
  shield.position.set(0, 1.26, -0.85);
  shield.rotation.x = -0.42;
  body.add(shield);

  // Tailfins: the signature. A thin triangular blade rising along each rear flank.
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(1.55, 0);
  finShape.lineTo(1.55, 0.34);
  finShape.lineTo(0.35, 0.10);
  finShape.lineTo(0, 0.06);
  finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.07, bevelEnabled: false });
  for (const side of [-1, 1]) {
    const fin = new THREE.Mesh(finGeo, paint);
    fin.rotation.y = Math.PI / 2;                 // blade runs along z
    fin.position.set(side * 0.93 - side * 0.035, 1.0, 2.5);
    body.add(fin);
    // Chrome fin tip.
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.5), chrome);
    tip.position.set(side * 0.93, 1.3, 2.28);
    tip.rotation.x = -0.12;
    body.add(tip);
  }

  // Chrome: bumpers, grille, and the side spear that carries the two-tone.
  const bumperF = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.22, 0.3), chrome);
  bumperF.position.set(0, 0.45, -2.58);
  const bumperR = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.22, 0.3), chrome);
  bumperR.position.set(0, 0.45, 2.58);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.28, 0.06), chrome);
  grille.position.set(0, 0.68, -2.52);
  body.add(bumperF, bumperR, grille);
  for (const side of [-1, 1]) {
    const spear = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 3.6), chrome);
    spear.position.set(side * 0.96, 0.82, 0.5);
    body.add(spear);
    // The ivory sweep inside the spear on the rear quarter — the '57 two-tone.
    const sweep = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 1.5), roof);
    sweep.position.set(side * 0.955, 0.7, 1.75);
    body.add(sweep);
  }

  // Headlights and taillights (emissive only when setLights(true)).
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0x000000, roughness: 0.3 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x7c1f1a, emissive: 0x000000, roughness: 0.3 });
  for (const side of [-1, 1]) {
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 12), headMat);
    head.rotation.x = Math.PI / 2;
    head.position.set(side * 0.68, 0.75, -2.56);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.06), tailMat);
    tail.position.set(side * 0.86, 0.98, 2.6);
    body.add(head, tail);
  }

  // Wheels: blackwall tire, whitewall ring, chrome hub.
  const wheels = [];
  const wheelGeo = new THREE.CylinderGeometry(0.37, 0.37, 0.24, 20);
  const wallGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.245, 20);
  const hubGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.25, 12);
  for (const [x, z] of [[-0.84, -1.6], [0.84, -1.6], [-0.84, 1.7], [0.84, 1.7]]) {
    const w = new THREE.Group();
    const t = new THREE.Mesh(wheelGeo, tire);
    const ww = new THREE.Mesh(wallGeo, wall);
    const hub = new THREE.Mesh(hubGeo, chrome);
    t.rotation.z = ww.rotation.z = hub.rotation.z = Math.PI / 2;
    w.add(t, ww, hub);
    w.position.set(x, 0.37, z);
    wheels.push(w);
    g.add(w);
  }

  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  let speed = 0;
  g.userData = {
    setSpeed: (v) => { speed = v; },
    setLights: (on) => {
      headMat.emissive.set(on ? 0xffe9a8 : 0x000000);
      headMat.emissiveIntensity = on ? 2.2 : 0;
      tailMat.emissive.set(on ? 0xc03028 : 0x000000);
      tailMat.emissiveIntensity = on ? 1.6 : 0;
    },
    update: (dt, t) => {
      const spin = speed / 0.37;                  // rad/s at this wheel radius
      for (const w of wheels) w.children.forEach((m) => { m.rotation.x += spin * dt; });
      // A faint float and sway — soft '50s suspension at highway speed.
      const k = Math.min(1, speed / 20);
      body.position.y = Math.sin(t * 2.1) * 0.012 * k;
      body.rotation.z = Math.sin(t * 1.3) * 0.004 * k;
      body.rotation.x = Math.sin(t * 1.7) * 0.003 * k;
    },
  };
  return g;
}
