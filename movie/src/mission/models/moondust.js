import * as THREE from 'three';

// Landing dust. With no air to suspend it, lunar dust thrown by the descent
// engine sprays outward nearly flat and fast, and drops straight back — no
// billowing cloud. Modelled as low, radial streaks that fade as they travel.

const COUNT = 120;

export class MoonDust {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'moondust';
    const tex = discSprite();
    this.parts = [];
    for (let i = 0; i < COUNT; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, color: 0xb8b4a8, transparent: true, opacity: 0, depthWrite: false,
      }));
      s.visible = false;
      this.group.add(s);
      this.parts.push({ sprite: s, life: 0, max: 1, vx: 0, vz: 0, vy: 0, x: 0, y: 0, z: 0 });
    }
    this._next = 0;
  }

  /** Blast dust radially from (cx,cz) on the ground plane groundY, strength 0..1. */
  blast(cx, cz, groundY, strength) {
    const n = Math.floor(strength * 6);
    for (let i = 0; i < n; i++) {
      const p = this.parts[this._next];
      this._next = (this._next + 1) % this.parts.length;
      const a = Math.random() * Math.PI * 2;
      const speed = 12 + Math.random() * 26 * strength;
      p.x = cx + Math.cos(a) * 1.5; p.z = cz + Math.sin(a) * 1.5; p.y = groundY + 0.2;
      p.vx = Math.cos(a) * speed; p.vz = Math.sin(a) * speed;
      p.vy = 1 + Math.random() * 3; // a low arc; gravity pulls it back
      p.life = 0; p.max = 1.4 + Math.random() * 1.2;
      p.sprite.visible = true;
    }
  }

  update(dt, groundY) {
    for (const p of this.parts) {
      if (!p.sprite.visible) continue;
      p.life += dt;
      const k = p.life / p.max;
      if (k >= 1) { p.sprite.visible = false; continue; }
      p.vy -= dt * 4;             // 1/6 g-ish, no air resistance
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < groundY + 0.1) { p.y = groundY + 0.1; p.vy = 0; p.vx *= 0.6; p.vz *= 0.6; }
      p.sprite.position.set(p.x, p.y, p.z);
      const sc = 1.4 + k * 3;
      p.sprite.scale.set(sc, sc, 1);
      p.sprite.material.opacity = Math.sin(k * Math.PI) * 0.5;
    }
  }

  dispose() { for (const p of this.parts) p.sprite.material.dispose(); }
}

function discSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 1, 32, 32, 30);
  g.addColorStop(0, 'rgba(210,205,195,0.9)');
  g.addColorStop(1, 'rgba(190,185,175,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
