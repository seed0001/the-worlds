import * as THREE from 'three';

// A pyramid, built to be built. It is a stack of square courses that shrink as
// they rise — the stepped core the way it actually looked mid-construction (and
// again today, its casing gone). setProgress() reveals the courses from the
// ground up, so a scene can grow the whole thing as a time-lapse. When it tops
// out, a smooth four-sided casing can slide over the steps: the gleaming white
// finish. setWeathered() takes that away again and ages the stone for the ruin.
//
// userData:
//   setProgress(0..1)  how far up the courses have risen (with a live top course)
//   setCasing(0..1)    the smooth white casing fading in over the steps
//   setWeathered(k)    0 new gold-white stone .. 1 worn, sand-grey ruin
//   topY(0..1)         world-ish height of the working course, for ramps/sledges
//   courses, casing, baseU, heightU

let _blockTex = null;
function blockTexture() {
  if (_blockTex) return _blockTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#cbb187';
  ctx.fillRect(0, 0, 128, 128);
  // Faint courses (horizontal) and staggered joints (vertical).
  ctx.strokeStyle = 'rgba(90,74,52,0.5)';
  ctx.lineWidth = 2;
  for (let y = 0; y <= 128; y += 32) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke();
  }
  for (let row = 0; row < 4; row++) {
    const off = (row % 2) * 32;
    for (let x = off; x <= 128; x += 64) {
      ctx.beginPath(); ctx.moveTo(x, row * 32); ctx.lineTo(x, row * 32 + 32); ctx.stroke();
    }
  }
  // A little grain.
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = `rgba(${90 + Math.random() * 60 | 0},${70 + Math.random() * 50 | 0},${45 + Math.random() * 40 | 0},0.08)`;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  _blockTex = tex;
  return tex;
}

export function buildPyramid({ baseU = 80, heightU = 51, courses = 40 } = {}) {
  const group = new THREE.Group();
  group.name = 'pyramid';

  const h = heightU / courses;
  const tex = blockTexture();
  const _new = new THREE.Color(0xd8c49a);   // fresh, warm limestone
  const _old = new THREE.Color(0x7c7360);   // weathered, greyed and darkened

  const courseMeshes = [];
  const geo = new THREE.BoxGeometry(1, 1, 1);
  for (let i = 0; i < courses; i++) {
    const t = i / courses;
    const size = baseU * (1 - t) + baseU / courses * 0.15; // taper to a small cap
    const mat = new THREE.MeshStandardMaterial({
      map: tex.clone(), color: _new.clone(), roughness: 0.95, metalness: 0.02,
    });
    mat.map.repeat.set(Math.max(2, size / 4), 1);
    mat.map.needsUpdate = true;
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(size, h, size);
    m.position.y = i * h + h / 2;
    m.castShadow = m.receiveShadow = true;
    m.visible = false;
    group.add(m);
    courseMeshes.push(m);
  }

  // The smooth casing — a four-sided pyramid that caps the steps at the finish.
  const casing = new THREE.Mesh(
    // Sized to clearly envelop the stepped core (corners past the step corners),
    // with a polygon offset so it wins the depth test and no step pokes through.
    new THREE.ConeGeometry(baseU * 0.78, heightU * 1.01, 4),
    new THREE.MeshStandardMaterial({
      color: 0xf3ead2, roughness: 0.5, metalness: 0.03,
      transparent: true, opacity: 0, flatShading: true,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    }),
  );
  casing.rotation.y = Math.PI / 4;   // square base aligned to the courses
  casing.position.y = heightU / 2;
  casing.castShadow = true;
  casing.visible = false;
  group.add(casing);

  let _revealed = 0;
  group.userData = {
    courses: courseMeshes, casing, baseU, heightU, h,
    setProgress(p) {
      const k = THREE.MathUtils.clamp(p, 0, 1);
      const upTo = k * courses;
      _revealed = upTo;
      for (let i = 0; i < courses; i++) {
        const m = courseMeshes[i];
        if (i + 1 <= upTo) {
          m.visible = true; m.scale.y = h; m.position.y = i * h + h / 2;
        } else if (i < upTo) {
          // The live top course, sliding into place.
          const f = upTo - i;
          m.visible = true;
          m.scale.y = h * f;
          m.position.y = i * h + (h * f) / 2;
        } else {
          m.visible = false;
        }
      }
    },
    setCasing(v) {
      const k = THREE.MathUtils.clamp(v, 0, 1);
      casing.visible = k > 0.001;
      casing.material.opacity = k;
    },
    setWeathered(k) {
      const w = THREE.MathUtils.clamp(k, 0, 1);
      for (const m of courseMeshes) {
        m.material.color.copy(_new).lerp(_old, w);
        m.material.roughness = 0.95;
      }
    },
    topY(p) {
      const k = p === undefined ? _revealed / courses : THREE.MathUtils.clamp(p, 0, 1);
      return k * heightU;
    },
    // Reveal a ruined top: hide the uppermost courses (as the real ones have lost).
    ruinTop(n) {
      for (let i = 0; i < courses; i++) courseMeshes[i].visible = i < courses - n;
    },
  };
  group.userData.setProgress(0);
  return group;
}
