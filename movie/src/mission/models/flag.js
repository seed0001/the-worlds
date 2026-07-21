import * as THREE from 'three';

// The flag on its L-shaped staff: a vertical pole with a horizontal crossbar at
// the top that holds the flag's upper edge out taut. There is no wind on the
// Moon, so the "wave" is mechanical — the fabric is frozen in the ripple it took
// when the crossbar was extended. We bake that ripple straight into the plane's
// geometry. Built with its base at y=0; ~2.2 m to the top of the pole.

const POLE = () => new THREE.MeshStandardMaterial({ color: 0xd8d5cc, roughness: 0.4, metalness: 0.7 });

const POLE_H = 2.2;
const FLAG_W = 1.5;
const FLAG_H = 0.9;

export function buildFlag() {
  const g = new THREE.Group();
  g.name = 'flag';

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, POLE_H, 8), POLE());
  pole.position.y = POLE_H / 2;
  pole.castShadow = true;
  g.add(pole);

  const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, FLAG_W, 8), POLE());
  crossbar.rotation.z = Math.PI / 2;
  crossbar.position.set(FLAG_W / 2, POLE_H - 0.03, 0);
  g.add(crossbar);

  // The fabric: a plane hanging from the crossbar, its free edge rippled. The
  // ripple grows toward the fly end (away from the pole) — taut at the staff,
  // loose at the tip, like the real frozen wave.
  const seg = 24;
  const geo = new THREE.PlaneGeometry(FLAG_W, FLAG_H, seg, 6);
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);                 // -FLAG_W/2 .. FLAG_W/2
    const t = (x + FLAG_W / 2) / FLAG_W;    // 0 at staff -> 1 at fly end
    const z = Math.sin(t * Math.PI * 2.4) * 0.09 * t;
    pos.setZ(i, z);
  }
  geo.computeVertexNormals();
  const flag = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    map: flagTexture(), roughness: 0.9, metalness: 0.0, side: THREE.DoubleSide,
  }));
  // Hang from the crossbar: top edge at the bar, extending along +X from the pole.
  flag.position.set(FLAG_W / 2, POLE_H - 0.03 - FLAG_H / 2, 0);
  flag.castShadow = true;
  g.add(flag);

  g.userData.height = POLE_H;
  return g;
}

// A suggestion of the flag — thirteen stripes and a blue canton with a scatter
// of stars. Not a pixel-exact reproduction; it reads at documentary distance.
function flagTexture() {
  const c = document.createElement('canvas');
  c.width = 200; c.height = 120;
  const ctx = c.getContext('2d');
  const stripes = 13;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#b22234' : '#f4f4f4';
    ctx.fillRect(0, (i / stripes) * c.height, c.width, c.height / stripes + 1);
  }
  ctx.fillStyle = '#3c3b6e';
  ctx.fillRect(0, 0, c.width * 0.4, c.height * (7 / stripes));
  ctx.fillStyle = '#ffffff';
  for (let r = 0; r < 5; r++) {
    for (let col = 0; col < 6; col++) {
      const x = 8 + col * 12 + (r % 2) * 6;
      const y = 8 + r * 10;
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
