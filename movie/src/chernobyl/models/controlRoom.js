import * as THREE from 'three';

// Control Room No. 4 — stylised, not a replica. What the shot needs to read is
// three things: the mimic panel of little lamps that stood for the rods and the
// channels, the big round power meter, and the covered emergency-shutdown
// button, AZ-5. The scene drives all three.
//
// userData:
//   needle          the power meter's pointer (rotated by setPower)
//   setPower(0..1)  swing the meter and recolour it (low = starved, high = red)
//   lamps[]         mimic-panel lamps, dimmed/shifted as the reactor is worked
//   az5             the shutdown button group (press + light via setAz5)
//   alarms[]        the annunciator strip, lit red by setAlarm
//   setAz5(k), setAlarm(k)

export function buildControlRoom() {
  const group = new THREE.Group();
  group.name = 'control-room';

  const panelMat = new THREE.MeshStandardMaterial({ color: 0x6a7a70, roughness: 0.65, metalness: 0.25 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x3a423c, roughness: 0.8 });

  // A shallow three-panel arc of console facing the camera.
  const console = new THREE.Group();
  const panelW = 30, panelH = 22;
  const angles = [-0.32, 0, 0.32];
  for (const a of angles) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(panelW, panelH, 3), panelMat.clone());
    p.position.set(Math.sin(a) * 34, 0, -Math.cos(a) * 34 + 34);
    p.rotation.y = -a;
    p.castShadow = p.receiveShadow = true;
    console.add(p);
    // a sloped desk lip under each panel
    const lip = new THREE.Mesh(new THREE.BoxGeometry(panelW, 6, 8), trimMat.clone());
    lip.position.set(Math.sin(a) * 34, -13, -Math.cos(a) * 34 + 40);
    lip.rotation.set(-0.5, -a, 0);
    console.add(lip);
  }
  group.add(console);

  // --- The mimic panel: a grid of small round lamps on the centre panel. ---
  const lamps = [];
  const lampGeo = new THREE.CircleGeometry(0.42, 12);
  const cols = 16, rows = 9;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const hue = Math.random() < 0.25 ? 0xffb347 : 0x39d98a; // amber among the green
      const m = new THREE.Mesh(lampGeo, new THREE.MeshBasicMaterial({ color: hue }));
      m.position.set(-6.4 + c * 0.85, 7.2 - r * 0.9, 1.7);
      m.userData.hue = new THREE.Color(hue);
      lamps.push(m);
      group.add(m);
    }
  }

  // --- The power meter: a round face with a swinging needle on the left panel. ---
  const meter = new THREE.Group();
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(5, 40),
    new THREE.MeshBasicMaterial({ color: 0x18241d }),
  );
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(5, 0.4, 8, 40),
    new THREE.MeshStandardMaterial({ color: 0xb8c0b8, roughness: 0.4, metalness: 0.7, emissive: 0x1a1e1a }),
  );
  // Faint tick marks around the dial so the needle has a scale to read against.
  const tickMat = new THREE.MeshBasicMaterial({ color: 0x5f6a60 });
  for (let i = 0; i <= 10; i++) {
    const ang = THREE.MathUtils.degToRad(120 - i * 24);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.05), tickMat);
    t.position.set(Math.sin(-ang) * 4.2, Math.cos(-ang) * 4.2, 0.12);
    t.rotation.z = ang;
    meter.add(t);
  }
  const needle = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 5, 0.26),
    new THREE.MeshBasicMaterial({ color: 0xff5a3c }),
  );
  needle.geometry.translate(0, 2.4, 0); // pivot at the base
  needle.position.z = 0.2;
  meter.add(face, ring, needle);
  meter.position.set(-13, 4, 5.2);   // mounted proud of the console, facing out
  meter.rotation.y = 0.16;
  group.add(meter);

  // --- AZ-5: a red mushroom button under a raised guard on the right panel. ---
  const az5 = new THREE.Group();
  const housing = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.5, 1.2, 24),
    new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.6, metalness: 0.5 }),
  );
  housing.rotation.x = Math.PI / 2;
  // A lit collar so the button reads as a button even at rest.
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(1.75, 0.22, 10, 28),
    new THREE.MeshStandardMaterial({ color: 0xffcf3a, emissive: 0xffb020, emissiveIntensity: 1.4 }),
  );
  collar.position.z = 0.5;
  const button = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.5, 1.6, 24),
    new THREE.MeshStandardMaterial({ color: 0xe22a1c, emissive: 0x6a1008, emissiveIntensity: 1.4, roughness: 0.45 }),
  );
  button.rotation.x = Math.PI / 2;
  button.position.z = 0.6;
  az5.add(housing, collar, button);
  az5.position.set(13, 3, 5.2);      // mounted proud of the console, facing out
  az5.rotation.y = -0.16;
  az5.userData.button = button;
  az5.userData.z0 = button.position.z;
  group.add(az5);

  // --- Annunciator strip above the console: alarm tiles, dark until they aren't. ---
  const alarms = [];
  const tileGeo = new THREE.PlaneGeometry(3.0, 1.6);
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(tileGeo, new THREE.MeshBasicMaterial({ color: 0x241a12 }));
    m.position.set(-11 + i * 3.2, 13.5, 1.6);
    alarms.push(m);
    group.add(m);
  }

  const _low = new THREE.Color(0x39d98a);
  const _mid = new THREE.Color(0xffd24a);
  const _hot = new THREE.Color(0xff3a24);
  group.userData = {
    needle, lamps, az5, alarms,
    // 0 = dead/starved, ~0.2 = the ~200 MW crawl, 1 = off the scale.
    setPower(v) {
      const k = THREE.MathUtils.clamp(v, 0, 1.2);
      // sweep from -120° (empty) to +120° (pegged)
      needle.rotation.z = THREE.MathUtils.degToRad(120 - Math.min(k, 1) * 240);
      const col = k < 0.5 ? _low.clone().lerp(_mid, k * 2) : _mid.clone().lerp(_hot, (k - 0.5) * 2);
      needle.material.color.copy(col);
    },
    setAz5(k) {
      const b = az5.userData.button;
      b.position.z = az5.userData.z0 - THREE.MathUtils.clamp(k, 0, 1) * 0.7;
      b.material.emissiveIntensity = 1.4 + k * 6;
    },
    setAlarm(k) {
      const on = THREE.MathUtils.clamp(k, 0, 1);
      for (const a of alarms) a.material.color.copy(_hot).multiplyScalar(0.09 + on * 0.95 * (0.6 + 0.4 * Math.random()));
    },
    // Dim/flicker the mimic lamps toward a fraction lit (a starved core goes dark).
    setLamps(frac) {
      for (const m of lamps) {
        const lit = Math.random() < frac;
        m.material.color.copy(m.userData.hue).multiplyScalar(lit ? 1 : 0.12);
      }
    },
  };
  group.userData.setPower(0.6);
  group.userData.setAlarm(0);

  return group;
}
