import * as THREE from 'three';
import { makeRng } from '../../core/rng.js';

// A patch of lunar surface — a grey heightfield with rolling relief and craters,
// meshed once and sampled by heightAt() so the lander's feet (and, in Phase 3,
// the astronauts and rover) sit on the real ground. Deterministic per seed
// string. No atmosphere, so the material is plain rough regolith; the black sky
// and the Earth are the scene's job.

export class LunarGround {
  constructor({ size = 1200, resolution = 200, seed = 'apollo:tranquility' } = {}) {
    this.size = size;
    const rng = makeRng(seed);
    // Scattered craters: centre, radius, depth.
    this.craters = [];
    for (let i = 0; i < 60; i++) {
      this.craters.push({
        x: (rng() - 0.5) * size, z: (rng() - 0.5) * size,
        r: 6 + rng() * 55, d: 0.6 + rng() * 4.5,
      });
    }
    this.mesh = this._build(resolution);
  }

  /** Height of the regolith at local (x, z). */
  heightAt(x, z) {
    // Gentle rolling base.
    let h = Math.sin(x * 0.012) * 2.4 + Math.cos(z * 0.011) * 2.1
      + Math.sin((x + z) * 0.03) * 0.8;
    // Craters: a bowl inside the rim, a raised rim just outside.
    for (const c of this.craters) {
      const d = Math.hypot(x - c.x, z - c.z);
      if (d > c.r * 1.6) continue;
      if (d < c.r) {
        const t = d / c.r;             // 0 centre -> 1 rim
        h -= c.d * (1 - t * t) * 0.9;  // bowl
        h += c.d * 0.25 * t;           // floor rising to rim
      } else {
        const t = (d - c.r) / (c.r * 0.6); // 0 rim -> 1 outside
        h += c.d * 0.3 * (1 - t) * (1 - t); // raised rim
      }
    }
    return h;
  }

  _build(res) {
    const geo = new THREE.PlaneGeometry(this.size, this.size, res, res);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, this.heightAt(pos.getX(i), pos.getZ(i)));
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: 0x8f8d86, roughness: 1.0, metalness: 0.0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'lunarGround';
    mesh.receiveShadow = true;
    return mesh;
  }

  dispose() { this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}
