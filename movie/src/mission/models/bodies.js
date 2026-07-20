import * as THREE from 'three';
import { makeRng } from '../../core/rng.js';

// Earth and the Moon as bodies seen from space. Both are single spheres with a
// procedurally-drawn equirectangular texture (no image files); Earth also gets
// a drifting cloud shell and a limb-glow atmosphere. Deterministic — the same
// continents and craters every run, since this is a fixed recreation.

/** Equirectangular canvas texture helper. */
function tex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function earthTexture() {
  return tex(2048, 1024, (ctx, w, h) => {
    const rng = makeRng('apollo:earth');
    // Ocean.
    const oc = ctx.createLinearGradient(0, 0, 0, h);
    oc.addColorStop(0, '#0a2a55'); oc.addColorStop(0.5, '#0d3f7a'); oc.addColorStop(1, '#0a2a55');
    ctx.fillStyle = oc; ctx.fillRect(0, 0, w, h);
    // Continents — clustered green/tan splats.
    const land = ['rgba(56,92,42,1)', 'rgba(96,120,58,1)', 'rgba(120,104,66,1)', 'rgba(70,100,48,1)'];
    for (let cluster = 0; cluster < 7; cluster++) {
      const cx = rng() * w, cy = h * (0.2 + rng() * 0.6);
      for (let i = 0; i < 90; i++) {
        const x = cx + (rng() - 0.5) * w * 0.22;
        const y = cy + (rng() - 0.5) * h * 0.28;
        const r = 12 + rng() * 46;
        ctx.fillStyle = land[Math.floor(rng() * land.length)];
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + w, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x - w, y, r, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Polar ice.
    ctx.fillStyle = '#eef4f8';
    ctx.fillRect(0, 0, w, h * 0.06);
    ctx.fillRect(0, h * 0.94, w, h * 0.06);
    ctx.globalAlpha = 0.5;
    ctx.fillRect(0, h * 0.06, w, h * 0.04);
    ctx.fillRect(0, h * 0.90, w, h * 0.04);
    ctx.globalAlpha = 1;
  });
}

function cloudTexture() {
  const c = document.createElement('canvas');
  c.width = 2048; c.height = 1024;
  const ctx = c.getContext('2d');
  const rng = makeRng('apollo:clouds');
  ctx.clearRect(0, 0, c.width, c.height);
  for (let i = 0; i < 260; i++) {
    const x = rng() * c.width, y = rng() * c.height;
    const r = 20 + rng() * 90;
    const a = 0.25 + rng() * 0.5;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function moonTexture() {
  return tex(2048, 1024, (ctx, w, h) => {
    const rng = makeRng('apollo:moon');
    ctx.fillStyle = '#9a988f'; ctx.fillRect(0, 0, w, h);
    // Maria — large dark grey basins.
    for (let i = 0; i < 16; i++) {
      const x = rng() * w, y = h * (0.2 + rng() * 0.6), r = 60 + rng() * 150;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(88,86,82,0.9)'); g.addColorStop(1, 'rgba(88,86,82,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    // Craters — bright rim, dark floor.
    for (let i = 0; i < 900; i++) {
      const x = rng() * w, y = rng() * h, r = 2 + rng() * 16;
      ctx.strokeStyle = 'rgba(220,216,206,0.5)'; ctx.lineWidth = Math.max(1, r * 0.18);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(70,68,64,0.35)';
      ctx.beginPath(); ctx.arc(x, y, r * 0.7, 0, Math.PI * 2); ctx.fill();
    }
  });
}

/** Earth as a group: surface sphere + cloud shell + atmosphere limb. */
export function buildEarth(radius = 100) {
  const g = new THREE.Group();
  g.name = 'earth';
  const surf = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 96, 64),
    new THREE.MeshStandardMaterial({ map: earthTexture(), roughness: 0.95, metalness: 0.0 }),
  );
  g.add(surf);
  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.012, 96, 64),
    new THREE.MeshStandardMaterial({ map: cloudTexture(), transparent: true, roughness: 1, depthWrite: false }),
  );
  g.add(clouds);
  const atm = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.05, 64, 48),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { c: { value: new THREE.Color(0x4a90ff) } },
      vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying vec3 vN; uniform vec3 c; void main(){ float i = pow(1.0 - abs(vN.z), 2.2); gl_FragColor = vec4(c, i * 0.9); }',
    }),
  );
  g.add(atm);
  g.userData.surf = surf; g.userData.clouds = clouds; g.userData.radius = radius;
  return g;
}

/** The Moon as a single cratered sphere. */
export function buildMoon(radius = 100) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 96, 64),
    new THREE.MeshStandardMaterial({ map: moonTexture(), roughness: 1, metalness: 0 }),
  );
  m.name = 'moon';
  m.userData.radius = radius;
  return m;
}
