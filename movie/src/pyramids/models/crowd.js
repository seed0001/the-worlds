import * as THREE from 'three';

// The people. A single worker is a handful of boxes — bare legs, a white kilt, a
// sun-browned torso and head — cheap enough to stamp out by the dozen. A Gang is
// a sledge carrying one great block and two columns of workers hauling it on
// ropes, with a walk cycle so the whole thing trudges. scatterWorkers() sprinkles
// idle figures across the site for the wide shots.

const SKIN = 0x8a5a34, KILT = 0xe8e0cc;

export function worker(scale = 1) {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.9 });
  const kilt = new THREE.MeshStandardMaterial({ color: KILT, roughness: 0.95 });

  const legGeo = new THREE.BoxGeometry(0.22, 0.9, 0.24);
  const legL = new THREE.Mesh(legGeo, skin); legL.position.set(-0.16, 0.45, 0);
  const legR = new THREE.Mesh(legGeo, skin); legR.position.set(0.16, 0.45, 0);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), skin);
  torso.position.y = 1.2;
  const kiltMesh = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.4, 0.34), kilt);
  kiltMesh.position.y = 0.95;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.28), skin);
  head.position.y = 1.72;

  g.add(legL, legR, kiltMesh, torso, head);
  g.scale.setScalar(scale);
  g.userData = { legL, legR, phase: Math.random() * Math.PI * 2 };
  for (const m of [legL, legR, torso, kiltMesh, head]) { m.castShadow = true; }
  return g;
}

// Animate one worker's walk: swing the legs and bob the body.
function stepWorker(w, t, moving) {
  const p = w.userData.phase;
  const swing = moving ? Math.sin(t * 6 + p) * 0.6 : Math.sin(t * 2 + p) * 0.05;
  w.userData.legL.rotation.x = swing;
  w.userData.legR.rotation.x = -swing;
  w.position.y = (moving ? Math.abs(Math.sin(t * 6 + p)) * 0.08 : 0);
}

export class Gang {
  constructor({ workers = 16, blockSize = 2.4 } = {}) {
    this.group = new THREE.Group();
    this.group.name = 'gang';
    this.t = 0;
    this.moving = true;

    // The sledge: two wooden runners and a bed.
    const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.9 });
    const sledge = new THREE.Group();
    for (const dx of [-1, 1]) {
      const runner = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, blockSize * 1.9), wood);
      runner.position.set(dx * blockSize * 0.42, 0.15, 0);
      runner.castShadow = true;
      sledge.add(runner);
    }
    const bed = new THREE.Mesh(new THREE.BoxGeometry(blockSize * 1.2, 0.15, blockSize * 1.7), wood);
    bed.position.y = 0.35; sledge.add(bed);

    // The block.
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(blockSize, blockSize * 0.8, blockSize),
      new THREE.MeshStandardMaterial({ color: 0xcdb488, roughness: 0.95 }),
    );
    block.position.y = 0.35 + blockSize * 0.4;
    block.castShadow = true;
    sledge.add(block);
    sledge.position.z = 0;
    this.group.add(sledge);
    this.sledge = sledge;
    this.blockMesh = block;

    // Two columns of haulers ahead of the sledge, with ropes.
    this.workers = [];
    const ropeMat = new THREE.LineBasicMaterial({ color: 0x8a6a3a });
    const rows = Math.ceil(workers / 2);
    for (let i = 0; i < workers; i++) {
      const col = i % 2 === 0 ? -1 : 1;
      const row = Math.floor(i / 2);
      const w = worker(1);
      w.position.set(col * blockSize * 0.35, 0, blockSize * 1.2 + row * 1.5);
      w.rotation.y = 0;               // facing +z, the pull direction, away from the sledge
      this.group.add(w);
      this.workers.push(w);
      // A rope from the sledge front toward this worker.
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(col * blockSize * 0.35, 0.9, blockSize * 0.9),
        new THREE.Vector3(col * blockSize * 0.35, 0.7, blockSize * 1.2 + row * 1.5),
      ]);
      this.group.add(new THREE.Line(geo, ropeMat));
    }
  }

  update(dt) {
    this.t += dt;
    for (const w of this.workers) stepWorker(w, this.t, this.moving);
  }

  dispose() {
    this.group.traverse((o) => { o.geometry?.dispose?.(); if (o.material?.dispose) o.material.dispose(); });
  }
}

// Sprinkle idle/working figures across an area; returns an update(dt) closure.
export function scatterWorkers(parent, n, { radius = 60, cx = 0, cz = 0 } = {}) {
  const ws = [];
  for (let i = 0; i < n; i++) {
    const w = worker(0.9 + Math.random() * 0.3);
    const a = Math.random() * Math.PI * 2, r = Math.random() * radius;
    w.position.set(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r);
    w.rotation.y = Math.random() * Math.PI * 2;
    w.userData.moving = Math.random() < 0.6;
    parent.add(w);
    ws.push(w);
  }
  return (dt, t) => { for (const w of ws) stepWorker(w, t, w.userData.moving); };
}
