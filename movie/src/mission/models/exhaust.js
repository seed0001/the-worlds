import * as THREE from 'three';

// Rocket exhaust: a bright flame column plus a boiling smoke cloud, both cheap
// and procedural. The flame is additive cones that flicker; the smoke is a pool
// of billboarded puffs that bloom outward at ignition and get left behind as
// the vehicle climbs. Driven each frame by (throttle 0..1, worldY of the
// engines) so the same system reads as ignition, hold-down, and ascent trail.

const SMOKE_COUNT = 90;

export class Exhaust {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'exhaust';
    this.throttle = 0;
    this.t = 0;

    // Flame — two stacked additive cones (core + halo), pointing down.
    const flameMat = (color, opacity) => new THREE.MeshBasicMaterial({
      color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.flameCore = new THREE.Mesh(new THREE.ConeGeometry(2.2, 22, 20, 1, true), flameMat(0xfff2c0, 0.95));
    this.flameHalo = new THREE.Mesh(new THREE.ConeGeometry(3.6, 30, 20, 1, true), flameMat(0xff7a2a, 0.5));
    for (const f of [this.flameHalo, this.flameCore]) {
      f.rotation.x = Math.PI; // apex up, mouth billowing down
      this.group.add(f);
    }

    // Smoke — a shared soft-disc sprite texture, many puffs.
    const tex = smokeSprite();
    this.smoke = [];
    for (let i = 0; i < SMOKE_COUNT; i++) {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, color: 0xdedad2, transparent: true, opacity: 0, depthWrite: false,
      }));
      m.visible = false;
      this.group.add(m);
      this.smoke.push({ sprite: m, life: 0, max: 1, vx: 0, vy: 0, vz: 0, base: 6 });
    }
    this._next = 0;
  }

  /** Emit a puff near the engine plume base at world position `p`. */
  _emit(p, spread, rise) {
    const s = this.smoke[this._next];
    this._next = (this._next + 1) % this.smoke.length;
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * spread;
    s.sprite.position.set(p.x + Math.cos(a) * r, p.y + Math.random() * 2, p.z + Math.sin(a) * r);
    s.vx = Math.cos(a) * (2 + Math.random() * 4);
    s.vz = Math.sin(a) * (2 + Math.random() * 4);
    s.vy = rise * (0.5 + Math.random());
    s.life = 0;
    s.max = 2.5 + Math.random() * 2.5;
    s.base = 5 + Math.random() * 7;
    s.sprite.visible = true;
  }

  /** A one-off puff of smoke at `p` — retro-rocket smoke at a stage separation. */
  burst(p, n = 14) {
    for (let i = 0; i < n; i++) this._emit(p, 6, 2.2);
  }

  /**
   * @param {number} dt
   * @param {number} throttle 0..1 engine output
   * @param {THREE.Vector3} enginePos world position of the engine plane
   * @param {number} groundY where the plume splashes flat (deck/terrain)
   */
  update(dt, throttle, enginePos, groundY, scale = 1) {
    this.t += dt;
    this.throttle = throttle;

    // Flame sits just below the engines, scaled and flickering by throttle.
    const flick = 0.85 + Math.sin(this.t * 60) * 0.06 + Math.random() * 0.09;
    const on = throttle > 0.02;
    this.flameCore.visible = this.flameHalo.visible = on;
    if (on) {
      const len = throttle * flick * scale;
      const w = throttle * scale;
      this.flameCore.position.copy(enginePos); this.flameCore.position.y -= 11 * len;
      this.flameHalo.position.copy(enginePos); this.flameHalo.position.y -= 15 * len;
      this.flameCore.scale.set(w, len, w);
      this.flameHalo.scale.set(w, len, w);
    }

    // Smoke emission scales with throttle; puffs billow near the ground while
    // the engines are low, and trail behind once the vehicle has climbed.
    const nearGround = enginePos.y - groundY < 40;
    const rate = throttle * (nearGround ? 5 : 2);
    let budget = rate;
    while (budget > 0) {
      if (Math.random() < budget) {
        const base = new THREE.Vector3(enginePos.x, Math.max(groundY, enginePos.y - 6), enginePos.z);
        this._emit(base, nearGround ? 22 : 6, nearGround ? 3 : 1);
      }
      budget -= 1;
    }

    for (const s of this.smoke) {
      if (!s.sprite.visible) continue;
      s.life += dt;
      const k = s.life / s.max;
      if (k >= 1) { s.sprite.visible = false; s.sprite.material.opacity = 0; continue; }
      s.vy += dt * 1.5; // buoyant rise
      s.sprite.position.x += s.vx * dt;
      s.sprite.position.y += s.vy * dt;
      s.sprite.position.z += s.vz * dt;
      const scale = s.base * (0.6 + k * 1.8);
      s.sprite.scale.set(scale, scale, 1);
      s.sprite.material.opacity = Math.sin(k * Math.PI) * 0.7;
      const shade = 0.55 + k * 0.35;
      s.sprite.material.color.setRGB(shade, shade * 0.98, shade * 0.94);
    }
  }

  dispose() {
    this.flameCore.geometry.dispose();
    this.flameHalo.geometry.dispose();
    for (const s of this.smoke) s.sprite.material.dispose();
  }
}

function smokeSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.5, 'rgba(230,228,222,0.5)');
  g.addColorStop(1, 'rgba(210,208,200,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
