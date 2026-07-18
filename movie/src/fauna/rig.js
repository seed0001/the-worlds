import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Genome -> geometry, and the pose math that animates it.
//
// Same trick as Flora, one level deeper: a species is a handful of shared
// geometries (body, head, one leg, one wing...) and every individual is just
// instance matrices into those. A herd of twenty four-legged grazers is seven
// InstancedMeshes — body, head, tail, four legs each drawn as one batch — not
// one hundred and forty objects. The per-frame cost is composing matrices,
// which is arithmetic, not draw calls.
//
// All animation is procedural and phase-driven (gait phase, flap phase) so a
// fixed timestep replays it exactly — same seed, same frame, same wingbeat.

const UP = new THREE.Vector3(0, 1, 0);
const ONE = new THREE.Vector3(1, 1, 1);

// Scratch — pose() runs per agent per frame; nothing here allocates.
const _base = new THREE.Matrix4();
const _local = new THREE.Matrix4();
const _rot = new THREE.Matrix4();
const _out = new THREE.Matrix4();
const _pos = new THREE.Vector3();

/** Non-indexed copy so mixed primitive types can merge. */
function ni(geometry) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  if (g !== geometry) geometry.dispose();
  return g;
}

/** Roughen a geometry's silhouette — shaggy coats, chipped chitin. */
function jitter(geometry, rng, amount) {
  const pos = geometry.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const s = 1 + rng.range(-amount, amount);
    pos.setXYZ(i, pos.getX(i) * s, pos.getY(i) * s, pos.getZ(i) * s);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export class SpeciesRig {
  /**
   * @param {object} genome - from genome.js
   * @param {Function} rng - forked stream; consumed only at build time
   */
  constructor(genome, rng) {
    this.genome = genome;
    const G = genome;

    const flat = { flatShading: true, roughness: 0.92, metalness: 0.0 };
    this.materials = {
      body: new THREE.MeshStandardMaterial({ ...flat, color: G.colors.base }),
      limb: new THREE.MeshStandardMaterial({ ...flat, color: G.colors.base.clone().multiplyScalar(0.7) }),
      wing: new THREE.MeshStandardMaterial({
        ...flat, color: G.colors.accent, side: THREE.DoubleSide, roughness: 0.8,
      }),
    };

    // -- Body: faceted ellipsoid. Armor drops the subdivision (chunky plates),
    //    shag jitters the surface (scruffy silhouette). --
    const body = ni(new THREE.IcosahedronGeometry(1, G.armored ? 0 : 1));
    body.scale(G.bodyRad, G.bodyRad * 0.92, G.bodyLen / 2);
    if (G.shaggy) jitter(body, rng, 0.16);
    else if (G.armored) jitter(body, rng, 0.06);

    // -- Head assembly: neck + skull + snout merged, pivot at the neck root so
    //    one rotation nods the whole thing down to graze. --
    const neckAngle = G.domain === 'air' ? 0.3 : 0.7; // radians up from forward
    const nx = Math.sin(neckAngle), nz = Math.cos(neckAngle);
    const neck = ni(new THREE.CylinderGeometry(G.headSize * 0.45, G.headSize * 0.62, G.neckLen, 6));
    neck.rotateX(Math.PI / 2 - neckAngle); // +y axis -> up-forward
    neck.translate(0, (nx * G.neckLen) / 2, (nz * G.neckLen) / 2);
    const skull = ni(new THREE.IcosahedronGeometry(G.headSize, 0));
    skull.translate(0, nx * G.neckLen, nz * G.neckLen);
    const snout = ni(new THREE.ConeGeometry(G.headSize * 0.55, G.snoutLen, 5));
    snout.rotateX(Math.PI / 2); // point +z
    snout.translate(0, nx * G.neckLen - G.headSize * 0.15, nz * G.neckLen + G.headSize * 0.7 + G.snoutLen / 2);
    const head = mergeGeometries([neck, skull, snout]);
    neck.dispose(); skull.dispose(); snout.dispose();

    // -- Tail: tapered cone, pivot at base, points backward. --
    const tail = ni(new THREE.ConeGeometry(G.bodyRad * 0.45, G.tailLen, 5));
    tail.rotateX(-Math.PI / 2);           // point -z
    tail.translate(0, 0, -G.tailLen / 2); // pivot at the root

    // -- One leg, hip at origin, hanging -y. Reused for every leg. --
    const leg = G.legCount > 0
      ? ni(new THREE.CylinderGeometry(G.legRad * 0.6, G.legRad, G.legLen, 5)).translate(0, -G.legLen / 2, 0)
      : null;

    // -- Wings: swept tapered planes. Left and right are separate geometries
    //    rather than a mirrored matrix, which would flip the winding. --
    let wingR = null, wingL = null;
    if (G.wingSpan > 0) {
      const half = G.wingSpan / 2;
      wingR = new THREE.PlaneGeometry(half, G.wingChord, 4, 1);
      wingR.rotateX(-Math.PI / 2); // lie flat in XZ
      const p = wingR.getAttribute('position');
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i) + half / 2; // pivot at the wing root
        const t = x / half;
        p.setX(i, x);
        p.setZ(i, p.getZ(i) * (1 - 0.55 * t) - x * 0.35); // taper + sweep back
      }
      wingR.computeVertexNormals();
      wingL = wingR.clone().scale(-1, 1, 1);
      wingL.computeVertexNormals();
    }

    // Part table: everything the manager needs to build InstancedMeshes.
    this.parts = [
      { key: 'body', geometry: body, material: this.materials.body, perAgent: 1 },
      { key: 'head', geometry: head, material: this.materials.body, perAgent: 1 },
      { key: 'tail', geometry: tail, material: this.materials.limb, perAgent: 1 },
    ];
    if (leg) this.parts.push({ key: 'leg', geometry: leg, material: this.materials.limb, perAgent: G.legCount });
    if (wingR) {
      this.parts.push({ key: 'wingR', geometry: wingR, material: this.materials.wing, perAgent: 1 });
      this.parts.push({ key: 'wingL', geometry: wingL, material: this.materials.wing, perAgent: 1 });
    }

    // Hip sockets in the body frame, paired down the torso. Diagonal gait
    // phasing for quadrupeds, alternating-tripod-ish for anything with more.
    this.hips = [];
    const pairs = Math.ceil(G.legCount / 2);
    for (let i = 0; i < G.legCount; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const pair = Math.floor(i / 2);
      const zSpread = pairs > 1 ? (pair / (pairs - 1) - 0.5) * G.bodyLen * 0.62 : 0;
      this.hips.push({
        offset: new THREE.Vector3(side * G.bodyRad * 0.72, -G.bodyRad * 0.45, zSpread),
        phase: (i % 2) * Math.PI + pair * (pairs > 2 ? Math.PI / pairs : 0),
      });
    }

    this.headPivot = new THREE.Vector3(0, G.bodyRad * 0.3, G.bodyLen * 0.42);
    this.tailPivot = new THREE.Vector3(0, G.bodyRad * 0.15, -G.bodyLen * 0.44);
    this.shoulderR = new THREE.Vector3(G.bodyRad * 0.6, G.bodyRad * 0.3, G.bodyLen * 0.08);
    this.shoulderL = new THREE.Vector3(-G.bodyRad * 0.6, G.bodyRad * 0.3, G.bodyLen * 0.08);
  }

  /**
   * Write this agent's part matrices.
   * @param {object} agent - { pos, quat, gaitPhase, flapPhase, stride, nod }
   *   stride: 0..1 leg-swing amplitude (0 standing), nod: 0..1 head-down.
   * @param {Function} set - (partKey, subIndex, Matrix4) -> void
   */
  pose(agent, set) {
    const G = this.genome;
    _base.compose(agent.pos, agent.quat, ONE);

    set('body', 0, _base);

    // Head: nod pitches it down (grazing, prowling); a light gait bob keeps it alive.
    _rot.makeRotationX(agent.nod * 0.9 + Math.sin(agent.gaitPhase * 2) * 0.04 * agent.stride);
    _local.makeTranslation(this.headPivot.x, this.headPivot.y, this.headPivot.z).multiply(_rot);
    _out.multiplyMatrices(_base, _local);
    set('head', 0, _out);

    // Tail: lateral sway, counter-phase to the gait.
    _rot.makeRotationY(Math.sin(agent.gaitPhase + Math.PI) * 0.25 * (0.3 + agent.stride));
    _local.makeTranslation(this.tailPivot.x, this.tailPivot.y, this.tailPivot.z).multiply(_rot);
    _out.multiplyMatrices(_base, _local);
    set('tail', 0, _out);

    for (let i = 0; i < this.hips.length; i++) {
      const hip = this.hips[i];
      _rot.makeRotationX(Math.sin(agent.gaitPhase + hip.phase) * 0.55 * agent.stride);
      _local.makeTranslation(hip.offset.x, hip.offset.y, hip.offset.z).multiply(_rot);
      _out.multiplyMatrices(_base, _local);
      set('leg', i, _out);
    }

    if (G.wingSpan > 0) {
      // Downstroke is faster than the upstroke — plain sin reads as a metronome.
      const s = Math.sin(agent.flapPhase);
      const flap = (s > 0 ? Math.pow(s, 0.7) : s) * 0.85 - 0.1;
      _rot.makeRotationZ(-flap);
      _local.makeTranslation(this.shoulderR.x, this.shoulderR.y, this.shoulderR.z).multiply(_rot);
      _out.multiplyMatrices(_base, _local);
      set('wingR', 0, _out);

      _rot.makeRotationZ(flap);
      _local.makeTranslation(this.shoulderL.x, this.shoulderL.y, this.shoulderL.z).multiply(_rot);
      _out.multiplyMatrices(_base, _local);
      set('wingL', 0, _out);
    }
  }

  dispose() {
    for (const part of this.parts) part.geometry.dispose();
    for (const m of Object.values(this.materials)) m.dispose();
  }
}

const _zero = new THREE.Vector3();

/**
 * Orient a quaternion so the rig's +z (snout) faces `forward` with the given
 * up. Matrix4.lookAt builds +z = eye - target, so aiming at -forward puts the
 * animal's nose where it is going instead of where it has been.
 */
export function headingQuat(quat, forward, up = UP) {
  _pos.copy(forward).negate();
  _rot.lookAt(_zero, _pos, up);
  return quat.setFromRotationMatrix(_rot);
}
