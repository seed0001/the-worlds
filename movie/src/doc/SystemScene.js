import * as THREE from 'three';
import { Planet } from '../world/Planet.js';
import { Starfield } from '../space/Starfield.js';
import { makeRng, hashSeed } from '../core/rng.js';

// The system stage: one star and its five worlds, for the condensation and
// habitability acts. Real geometry — these are the exact Planet meshes the
// orbital and surface scenes use, so the world the documentary rules in or out
// is the same world the rest of the platform will fly you down onto.
//
// Rebuilt to actually SHOW formation instead of cutting to it: the star ignites
// with a pop and a corona, a protoplanetary disc of particles spins around it
// (hot and golden near the star, icy blue past this system's real frost line,
// tinted by the universe's dominant elements), and on "condense"/"planets" the
// disc visibly drains into the five worlds — each planet accretes its own band
// of the disc and scales up out of it. The camera never locks off: a seeded sway
// rides on every framing, and the planets breathe on their marks.
//
// The layout stays cinematic, not to scale: real orbital distances span a factor
// of twenty and would put the outer worlds off-screen as dots. Colour, atmosphere
// and terrain ARE to spec — only the spacing is staged.

const _tmp = new THREE.Vector3();

const DISC_COUNT = 24000;

const DISC_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uCondense;
  uniform float uOpacity;
  uniform float uInner;
  uniform float uOuter;
  uniform float uFrost;
  uniform vec3 uPlanets[5];
  uniform vec3 uWarmC;
  uniform vec3 uIceC;
  uniform vec3 uTint;

  attribute float aRadius;
  attribute float aAngle;
  attribute float aY;
  attribute float aSpeed;
  attribute float aSize;
  attribute float aStagger;
  attribute float aTarget;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float ang = aAngle + uTime * aSpeed;
    vec3 pos = vec3(cos(ang) * aRadius, aY, sin(ang) * aRadius);

    // Condensation: each particle, on its own stagger, leaves its orbit and
    // falls onto the planet forming in its band of the disc.
    float c = smoothstep(aStagger * 0.65, aStagger * 0.65 + 0.35, uCondense);
    int ti = int(aTarget + 0.5);
    vec3 tgt = uPlanets[0];
    if (ti == 1) tgt = uPlanets[1];
    else if (ti == 2) tgt = uPlanets[2];
    else if (ti == 3) tgt = uPlanets[3];
    else if (ti == 4) tgt = uPlanets[4];
    pos = mix(pos, tgt, c);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);

    // Temperature sorts the disc: searing and golden near the star, dimming
    // outward, and past the frost line the ices take over.
    float f = clamp((aRadius - uInner) / (uOuter - uInner), 0.0, 1.0);
    float icy = smoothstep(uFrost, uFrost * 1.18, aRadius);
    vec3 col = mix(uWarmC * mix(1.5, 0.55, f), uIceC, icy);
    col = mix(col, uTint, 0.22);
    vColor = col;

    // Particles dim and vanish as they're absorbed into a world.
    vAlpha = uOpacity * (1.0 - c * 0.96);

    gl_PointSize = aSize * (1.0 - c * 0.5) * (300.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const DISC_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 d = gl_PointCoord - vec2(0.5);
    float r = length(d);
    if (r > 0.5) discard;
    float a = smoothstep(0.5, 0.0, r) * vAlpha;
    if (a < 0.002) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

// Same impressionistic element tints the Big Bang scene seeds the cloud with,
// so the disc reads as made OF that enriched cloud.
const ELEMENT_TINTS = {
  O: 0x7fd4ff, C: 0xffb46a, Fe: 0xff6a4d, Si: 0xe8d9a0, Mg: 0x8affc0,
  N: 0x9a7bff, S: 0xfff06a, Ne: 0xff4d6b, Na: 0xffa03c, Al: 0xcfd8e8,
};

function coronaTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,240,210,0.55)');
  g.addColorStop(0.6, 'rgba(255,220,170,0.12)');
  g.addColorStop(1, 'rgba(255,210,150,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

const STEFAN_BOLTZMANN = 5.670e-8;
const AU = 1.496e11;

export class SystemScene {
  /** @param {import('../cosmos/Cosmos.js').Cosmos} cosmos */
  constructor(cosmos) {
    this.cosmos = cosmos;
    const rng = makeRng(hashSeed('systemscene:' + cosmos.seed));
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x03040c);
    this.camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 20000);
    // Threshold high so only the star blooms — a low threshold blooms the bright
    // frozen/arid planet surfaces into featureless white blobs.
    this.bloom = { strength: 0.5, radius: 0.6, threshold: 0.82 };

    this.starfield = new Starfield({ seed: `${cosmos.seed}:stars` });
    this.scene.add(this.starfield);

    // The star, at the near-left origin; worlds recede to the right.
    this.starColor = new THREE.Color(cosmos.starColor);
    this.star = new THREE.Mesh(
      new THREE.SphereGeometry(26, 48, 48),
      new THREE.MeshBasicMaterial({ color: this.starColor }),
    );
    this.star.position.set(-70, 0, 0);
    this.scene.add(this.star);
    const starLight = new THREE.PointLight(this.starColor, 3, 0, 0.0);
    starLight.position.copy(this.star.position);
    this.scene.add(starLight);

    // Corona sprite — the star reads as a furnace, not a lit ball.
    this.corona = new THREE.Sprite(new THREE.SpriteMaterial({
      map: coronaTexture(), color: this.starColor,
      transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.corona.position.copy(this.star.position);
    this.corona.scale.setScalar(180);
    this.scene.add(this.corona);

    // Deal the planets along a receding arc. Display scale shrinks slightly with
    // distance for depth; giants read a touch larger.
    this.slots = [];
    this.planets = cosmos.planets.map((p, i) => {
      const planet = new Planet(p.world, { segments: 64 });
      const t = i / 4;
      const x = 20 + t * 300;
      const zback = -t * 120;
      const y = Math.sin(t * Math.PI) * 14;
      const scale = (p.chem.isGiant ? 0.7 : 0.42) * (1 - t * 0.18);
      planet.scale.setScalar(scale);
      planet.position.set(x, y, zback);

      // Light every world from the star on the left: the shader reads L =
      // -lightDirection as the direction to the light, so a +x lightDirection
      // puts the sun off to the left, lighting each world's star-facing side and
      // leaving a terminator on the right. That models them as spheres and keeps
      // every planet's day-side pointing the same way — toward their star.
      planet.uniforms.lightDirection.value.set(0.82, -0.2, -0.3).normalize();
      // The stock planet specular (intensity 2, shininess 10) is a huge, bright
      // lobe tuned for a distant orbital camera; at documentary focus distance it
      // fills the whole disc with white. Tighten and dim it for a modelled read.
      planet.uniforms.specularIntensity.value = 0.35;
      planet.uniforms.shininess.value = 45;
      planet.uniforms.ambientIntensity.value = 0.05;

      // The cloud shell's sprite sizes are tuned for a full-scale planet seen
      // from orbit; on these scaled-down establishing worlds they blanket the
      // whole disc white and bury the surface. The habitability act is a story
      // about surfaces — water, ice, rock — so the worlds read bare here.
      if (planet.atmosphere) planet.atmosphere.visible = false;

      this.scene.add(planet);
      this.slots.push({
        base: planet.position.clone(),
        pos: planet.position.clone(),
        scale, index: i, chem: p.chem,
        bobAmp: rng.range(0.8, 2.2),
        bobFreq: rng.range(0.18, 0.34),
        bobPhase: rng.range(0, Math.PI * 2),
      });
      return planet;
    });

    // --- The protoplanetary disc ----------------------------------------------
    this._buildDisc(rng);

    // Per-planet accretion state: 0 = not formed, 1 = fully there.
    this._reveal = this.planets.map(() => 0);
    this._revealTarget = this.planets.map(() => 0);
    for (const pl of this.planets) pl.visible = false;

    // A soft ring drawn around whichever world is the current subject.
    this.highlight = new THREE.Mesh(
      new THREE.RingGeometry(1.15, 1.28, 64),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide }),
    );
    this.scene.add(this.highlight);

    // Camera framing state, eased every frame, with a seeded sway on top so no
    // framing is ever a still.
    this.camTarget = new THREE.Vector3(90, 10, 220);
    this.lookTarget = new THREE.Vector3(90, 0, -30);
    this.camera.position.copy(this.camTarget);
    this._sway = {
      ax: rng.range(1.6, 4.2), ay: rng.range(1.2, 3.2), az: rng.range(1.5, 3.8),
      fx: rng.range(0.11, 0.2), fy: rng.range(0.08, 0.16), fz: rng.range(0.09, 0.17),
      px: rng.range(0, 6), py: rng.range(0, 6), pz: rng.range(0, 6),
    };
    this._focus = -1;
    this._phase = 'ignite';
    this._t = 0;
    this._starReveal = 0;    // eases 0 -> 1 on ignite, with a pop
    this._starPop = 0;
    this._discOpacity = 0;
    this._discTarget = 0;
    this._condense = 0;
    this._condenseTarget = 0;

    this.star.visible = false;
  }

  _buildDisc(rng) {
    const starPos = this.star.position;
    // Planet distances from the star decide the disc's bands.
    const planetR = this.slots.map((s) => s.base.distanceTo(starPos));
    const inner = 42;
    const outer = Math.max(...planetR) + 36;

    // This system's REAL frost line: the distance where water ice becomes stable
    // (~170 K), from the star's actual luminosity — then mapped onto the staged
    // planet spacing so it lands between the right worlds on screen.
    const frostM = Math.sqrt((this.cosmos.starLuminosity * 0.7) / (16 * Math.PI * STEFAN_BOLTZMANN * Math.pow(170, 4)));
    const frostAU = frostM / AU;
    const aus = this.cosmos.planets.map((p) => p.chem.distanceAU);
    let frost = outer * 1.5; // beyond everything if the whole system is hot
    for (let i = 0; i < aus.length; i++) {
      if (frostAU <= aus[i]) {
        if (i === 0) frost = inner + (planetR[0] - inner) * (frostAU / aus[0]);
        else {
          const f = (frostAU - aus[i - 1]) / (aus[i] - aus[i - 1]);
          frost = planetR[i - 1] + (planetR[i] - planetR[i - 1]) * f;
        }
        break;
      }
    }

    const radius = new Float32Array(DISC_COUNT);
    const angle = new Float32Array(DISC_COUNT);
    const yy = new Float32Array(DISC_COUNT);
    const speed = new Float32Array(DISC_COUNT);
    const size = new Float32Array(DISC_COUNT);
    const stagger = new Float32Array(DISC_COUNT);
    const target = new Float32Array(DISC_COUNT);
    const positions = new Float32Array(DISC_COUNT * 3);

    const spinBase = rng.range(0.3, 0.5);
    for (let i = 0; i < DISC_COUNT; i++) {
      // Density falls off outward, with a band of extra material at each planet.
      let r;
      if (rng.bool(0.55)) {
        const band = rng.int(0, planetR.length - 1);
        r = planetR[band] + rng.range(-22, 22);
      } else {
        r = inner + Math.pow(rng(), 1.6) * (outer - inner);
      }
      r = Math.max(inner, Math.min(outer, r));
      radius[i] = r;
      angle[i] = rng.range(0, Math.PI * 2);
      const thick = 1.5 + (r / outer) * 6; // the disc flares outward
      yy[i] = rng.range(-thick, thick);
      speed[i] = spinBase * Math.pow(inner / r, 1.5); // Keplerian falloff
      size[i] = 0.9 + Math.pow(rng(), 2) * 2.4;
      stagger[i] = rng();
      // Accrete onto the planet whose band this particle orbits in.
      let best = 0, bestD = Infinity;
      for (let k = 0; k < planetR.length; k++) {
        const d = Math.abs(r - planetR[k]);
        if (d < bestD) { bestD = d; best = k; }
      }
      target[i] = best;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aRadius', new THREE.BufferAttribute(radius, 1));
    geo.setAttribute('aAngle', new THREE.BufferAttribute(angle, 1));
    geo.setAttribute('aY', new THREE.BufferAttribute(yy, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aStagger', new THREE.BufferAttribute(stagger, 1));
    geo.setAttribute('aTarget', new THREE.BufferAttribute(target, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100000);

    const topElement = this.cosmos.budget.fractions.find((f) => !['H', 'He'].includes(f.sym));
    const tint = new THREE.Color(ELEMENT_TINTS[topElement?.sym] ?? 0xe8d9a0);

    this.discUniforms = {
      uTime: { value: 0 },
      uCondense: { value: 0 },
      uOpacity: { value: 0 },
      uInner: { value: inner },
      uOuter: { value: outer },
      uFrost: { value: frost },
      uPlanets: { value: this.slots.map(() => new THREE.Vector3()) },
      uWarmC: { value: new THREE.Color(0xffe2b0) },
      uIceC: { value: new THREE.Color(0x9fd8ff) },
      uTint: { value: tint },
    };

    this.discMaterial = new THREE.ShaderMaterial({
      uniforms: this.discUniforms, vertexShader: DISC_VERT, fragmentShader: DISC_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.disc = new THREE.Points(geo, this.discMaterial);
    this.disc.position.copy(starPos);
    // A seeded tilt so the disc reads in three dimensions, never edge-on flat.
    this.disc.rotation.set(rng.range(-0.14, 0.05), 0, rng.range(-0.1, 0.16));
    this.disc.updateMatrixWorld(true);
    this.scene.add(this.disc);

    // Accretion targets, in the disc's local space.
    for (let i = 0; i < this.slots.length; i++) {
      this.discUniforms.uPlanets.value[i].copy(this.disc.worldToLocal(this.slots[i].base.clone()));
    }
  }

  setPhase(name) {
    this._phase = name;
    if (name === 'ignite') {
      this.star.visible = true;
      this._starPop = 1.2; // the switch-on flare
      this.camTarget.set(10, 26, 200);
      this.lookTarget.copy(this.star.position);
    }
    if (name === 'disc') {
      this.star.visible = true;
      this._discTarget = 0.85;
      this.camTarget.set(60, 46, 230);
      this.lookTarget.set(60, 0, -20);
    }
    if (name === 'condense') {
      this._discTarget = 0.85;
      this._condenseTarget = 0.45;
      this.camTarget.set(40, 20, 180);
      this.lookTarget.set(20, 0, -10);
      // The first worlds start pulling their bands in.
      this._revealTarget[0] = 1;
      this._revealTarget[1] = 1;
    }
    if (name === 'planets' || name === 'reveal' || name === 'survey' || name === 'survivors') {
      this._condenseTarget = 1;
      this._discTarget = name === 'planets' ? 0.4 : 0;
      for (let i = 0; i < this._revealTarget.length; i++) this._revealTarget[i] = 1;
      // Pull back to an establishing wide on the whole system.
      this.camTarget.set(120, 40, 320);
      this.lookTarget.set(120, 0, -40);
      this._focus = -1;
      this._setHighlight(-1);
    }
  }

  /** Push in on planet `i` and ring it. */
  focus(i) {
    const slot = this.slots[i];
    if (!slot) return;
    for (let k = 0; k < this._revealTarget.length; k++) this._revealTarget[k] = 1;
    this._discTarget = 0;
    this._condenseTarget = 1;
    this._focus = i;
    const radius = 20 * slot.scale;
    // Frame the world in the left third, star-lit side toward camera.
    this.camTarget.copy(slot.base).add(new THREE.Vector3(radius * 2.2, radius * 0.6, radius * 4.5));
    this.lookTarget.copy(slot.base);
    this._setHighlight(i);
  }

  /** Colour the ring by the verdict as the narration delivers it. */
  verdict(i, kind) {
    this.focus(i);
    this._verdictColor = kind === 'life' ? new THREE.Color(0x5effa0) : new THREE.Color(0xff5a4a);
  }

  _setHighlight(i) {
    this._highlightIndex = i;
    this._verdictColor = null;
  }

  update(dt, elapsed) {
    this._t += dt;
    this.starfield.update(this.camera);

    // --- Star: ignition pop, then a living shimmer with a breathing corona. ---
    if (this.star.visible && this._starReveal < 1) {
      this._starReveal = Math.min(1, this._starReveal + dt * 1.4);
    }
    this._starPop = Math.max(0, this._starPop - this._starPop * dt * 2.8);
    const shimmer = 1 + Math.sin(elapsed * 2) * 0.012 + Math.sin(elapsed * 5.3) * 0.006;
    const ease = 1 - Math.pow(1 - this._starReveal, 3);
    this.star.scale.setScalar(Math.max(0.001, ease * shimmer * (1 + this._starPop * 0.25)));
    this.corona.material.opacity = ease * (0.5 + Math.sin(elapsed * 1.3) * 0.08 + this._starPop * 0.8);
    this.corona.scale.setScalar(180 * (1 + Math.sin(elapsed * 0.7) * 0.05 + this._starPop * 0.6));

    // --- Disc: spin always; condense and fade as directed. ---
    this._discOpacity += (this._discTarget - this._discOpacity) * Math.min(1, dt * 1.2);
    this._condense += (this._condenseTarget - this._condense) * Math.min(1, dt * 0.5);
    this.discUniforms.uTime.value = this._t;
    this.discUniforms.uOpacity.value = this._discOpacity;
    this.discUniforms.uCondense.value = this._condense;
    this.disc.visible = this._discOpacity > 0.01;

    // --- Planets: accrete up out of the disc, then breathe on their marks. ---
    for (let i = 0; i < this.planets.length; i++) {
      const slot = this.slots[i];
      const pl = this.planets[i];
      // Each world forms on a stagger tied to the condensation sweep.
      const gate = Math.min(1, Math.max(0, (this._condense - i * 0.12) * 2.2));
      const target = this._revealTarget[i] * gate;
      this._reveal[i] += (target - this._reveal[i]) * Math.min(1, dt * 1.1);
      const r = this._reveal[i];
      pl.visible = r > 0.02;
      if (!pl.visible) continue;
      // Ease out with a slight overshoot — the world "arrives".
      const c1 = 1.70158;
      const e = 1 + (c1 + 1) * Math.pow(r - 1, 3) + c1 * Math.pow(r - 1, 2);
      pl.scale.setScalar(slot.scale * Math.max(0.001, e));
      // Gentle bob so nothing is a still frame.
      slot.pos.copy(slot.base);
      slot.pos.y += Math.sin(this._t * slot.bobFreq + slot.bobPhase) * slot.bobAmp * r;
      pl.position.copy(slot.pos);
      pl.update(elapsed, dt);
    }

    // --- Camera: ease toward framing, with the seeded sway riding on top. ---
    this.camera.position.lerp(this.camTarget, Math.min(1, dt * 1.6));
    const sw = this._sway;
    this.camera.position.x += Math.sin(this._t * sw.fx + sw.px) * sw.ax * dt * 3;
    this.camera.position.y += Math.sin(this._t * sw.fy + sw.py) * sw.ay * dt * 3;
    this.camera.position.z += Math.cos(this._t * sw.fz + sw.pz) * sw.az * dt * 3;
    _tmp.copy(this.lookTarget);
    _tmp.x += Math.sin(this._t * sw.fy + sw.pz) * sw.ay * 0.6;
    _tmp.y += Math.sin(this._t * sw.fx + sw.py) * sw.ax * 0.4;
    this.camera.lookAt(_tmp);

    // Keep the highlight ring facing the camera around the focused world.
    if (this._highlightIndex >= 0) {
      const slot = this.slots[this._highlightIndex];
      const radius = 20 * slot.scale * 1.6;
      this.highlight.position.copy(slot.pos);
      this.highlight.scale.setScalar(radius);
      this.highlight.lookAt(this.camera.position);
      const col = this._verdictColor ?? new THREE.Color(0xffffff);
      this.highlight.material.color.copy(col);
      this.highlight.material.opacity += (0.85 - this.highlight.material.opacity) * Math.min(1, dt * 3);
    } else {
      this.highlight.material.opacity += (0 - this.highlight.material.opacity) * Math.min(1, dt * 3);
    }
  }

  dispose() {
    for (const pl of this.planets) pl.dispose();
    this.starfield.dispose();
    this.star.geometry.dispose();
    this.star.material.dispose();
    this.corona.material.map?.dispose();
    this.corona.material.dispose();
    this.disc.geometry.dispose();
    this.discMaterial.dispose();
    this.highlight.geometry.dispose();
    this.highlight.material.dispose();
  }
}
