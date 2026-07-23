import * as THREE from 'three';

// The roadside text — the film's storytelling furniture. State-line signs,
// billboards, the US 66 shield, Burma-Shave rhymes: all canvas-drawn textures
// on cheap planes, because what matters is that they read at speed.

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const POST_MAT = new THREE.MeshStandardMaterial({ color: 0x6b5a44, roughness: 0.95 });
const STEEL_MAT = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.6, metalness: 0.4 });

function panelOnPosts(tex, { w, h, y, posts = 2, steel = false, back = 0x555555 }) {
  const g = new THREE.Group();
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, 0.06),
    [
      new THREE.MeshStandardMaterial({ color: back, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: back, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: back, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: back, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ color: back, roughness: 0.9 }),
    ],
  );
  panel.position.y = y;
  panel.castShadow = true;
  g.add(panel);

  const mat = steel ? STEEL_MAT : POST_MAT;
  const spread = posts === 1 ? [0] : [-w * 0.36, w * 0.36];
  for (const x of spread) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, y, 0.14), mat);
    post.position.set(x, y / 2, -0.06);
    post.castShadow = true;
    g.add(post);
  }
  g.userData.panel = panel;
  return g;
}

// "ENTERING MISSOURI — The Show-Me State". White highway board, black letter.
export function makeStateSign(name, nickname) {
  const tex = canvasTexture(1024, 640, (ctx, w, h) => {
    ctx.fillStyle = '#f2efe6';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 18;
    ctx.strokeRect(22, 22, w - 44, h - 44);
    ctx.fillStyle = '#1a1a1a';
    ctx.textAlign = 'center';
    ctx.font = 'bold 86px Georgia, serif';
    ctx.fillText('ENTERING', w / 2, 170);
    const nameSize = name.length > 9 ? 148 : 180;
    ctx.font = `bold ${nameSize}px Georgia, serif`;
    ctx.fillText(name.toUpperCase(), w / 2, 380);
    ctx.font = 'italic 64px Georgia, serif';
    ctx.fillText(nickname, w / 2, 520);
  });
  return panelOnPosts(tex, { w: 4.6, h: 2.9, y: 2.6, back: 0xd8d4c8 });
}

// The US 66 shield — the little roadside heartbeat, repeated for 2,448 miles.
export function makeShield() {
  const tex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#f2efe6';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = '#111';
    ctx.textAlign = 'center';
    ctx.font = 'bold 52px Georgia, serif';
    ctx.fillText('U S', w / 2, 72);
    ctx.font = 'bold 128px Georgia, serif';
    ctx.fillText('66', w / 2, 200);
  });
  return panelOnPosts(tex, { w: 0.75, h: 0.75, y: 2.1, posts: 1, steel: true, back: 0xcfccc2 });
}

// A big roadside billboard: loud background, two posts, up to three lines.
export function makeBillboard({ top = '', main = '', sub = '', bg = '#c8342c', fg = '#f6f1df', accent = '#f2c14e' }) {
  const tex = canvasTexture(1280, 560, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 14;
    ctx.strokeRect(26, 26, w - 52, h - 52);
    ctx.textAlign = 'center';
    if (top) {
      ctx.fillStyle = accent;
      ctx.font = 'bold 70px Georgia, serif';
      ctx.fillText(top, w / 2, 130);
    }
    ctx.fillStyle = fg;
    const mainSize = main.length > 16 ? 104 : 132;
    ctx.font = `bold ${mainSize}px Georgia, serif`;
    ctx.fillText(main, w / 2, top ? 300 : 250);
    if (sub) {
      ctx.fillStyle = accent;
      ctx.font = 'italic 62px Georgia, serif';
      ctx.fillText(sub, w / 2, top ? 450 : 420);
    }
  });
  const g = panelOnPosts(tex, { w: 8.4, h: 3.7, y: 4.4, back: 0x4a3d2e });
  // A little cornice on top, the way the wooden boards wore them.
  const cap = new THREE.Mesh(new THREE.BoxGeometry(8.7, 0.16, 0.2), POST_MAT);
  cap.position.y = 4.4 + 3.7 / 2 + 0.08;
  g.add(cap);
  return g;
}

// One Burma-Shave panel: small, red, white italic line. The scene spaces a
// series of them a hundred yards apart, the way the company did.
export function makeBurmaShave(line) {
  const tex = canvasTexture(640, 220, (ctx, w, h) => {
    ctx.fillStyle = '#a5231d';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#f4ead0';
    ctx.lineWidth = 8;
    ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.fillStyle = '#f4ead0';
    ctx.textAlign = 'center';
    ctx.font = 'italic bold 72px Georgia, serif';
    ctx.fillText(line, w / 2, h / 2 + 26);
  });
  return panelOnPosts(tex, { w: 1.5, h: 0.52, y: 1.15, posts: 1, back: 0x7c1a15 });
}

// The brown Historic Route 66 marker — the present day's answer, for the
// stretches that lived.
export function makeHistoricSign() {
  const tex = canvasTexture(512, 640, (ctx, w, h) => {
    ctx.fillStyle = '#5c4326';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#f2efe6';
    ctx.lineWidth = 12;
    ctx.strokeRect(16, 16, w - 32, h - 32);
    ctx.fillStyle = '#f2efe6';
    ctx.textAlign = 'center';
    ctx.font = 'bold 74px Georgia, serif';
    ctx.fillText('HISTORIC', w / 2, 130);
    ctx.font = 'bold 60px Georgia, serif';
    ctx.fillText('ROUTE', w / 2, 250);
    ctx.font = 'bold 190px Georgia, serif';
    ctx.fillText('66', w / 2, 470);
    ctx.font = 'bold 54px Georgia, serif';
    ctx.fillText('U S', w / 2, 580);
  });
  return panelOnPosts(tex, { w: 1.15, h: 1.45, y: 2.0, posts: 1, steel: true, back: 0x3f2f1c });
}

// A big green interstate guide sign, for the flashes: the road that won.
export function makeInterstateSign(text, sub = '') {
  const tex = canvasTexture(1280, 480, (ctx, w, h) => {
    ctx.fillStyle = '#1b6b40';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#f2efe6';
    ctx.lineWidth = 12;
    ctx.strokeRect(18, 18, w - 36, h - 36);
    ctx.fillStyle = '#f2efe6';
    ctx.textAlign = 'center';
    ctx.font = 'bold 120px system-ui, sans-serif';
    ctx.fillText(text, w / 2, sub ? 200 : 270);
    if (sub) {
      ctx.font = 'bold 84px system-ui, sans-serif';
      ctx.fillText(sub, w / 2, 380);
    }
  });
  return panelOnPosts(tex, { w: 9.5, h: 3.5, y: 6.2, steel: true, back: 0x2f3a33 });
}

// "BEGIN U.S. 66" — the sign at Jackson and Michigan where all of it starts.
export function makeBeginSign() {
  const tex = canvasTexture(640, 900, (ctx, w, h) => {
    ctx.fillStyle = '#f2efe6';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 14;
    ctx.strokeRect(16, 16, w - 32, h - 32);
    ctx.fillStyle = '#111';
    ctx.textAlign = 'center';
    ctx.font = 'bold 120px Georgia, serif';
    ctx.fillText('BEGIN', w / 2, 190);
    ctx.font = 'bold 90px Georgia, serif';
    ctx.fillText('U S', w / 2, 350);
    ctx.font = 'bold 300px Georgia, serif';
    ctx.fillText('66', w / 2, 680);
    ctx.font = 'bold 56px Georgia, serif';
    ctx.fillText('CHICAGO → LOS ANGELES', w / 2, 830);
  });
  return panelOnPosts(tex, { w: 1.7, h: 2.4, y: 2.5, posts: 1, steel: true, back: 0xcfccc2 });
}
