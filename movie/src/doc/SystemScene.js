import * as THREE from 'three';
import { Planet } from '../world/Planet.js';
import { Starfield } from '../space/Starfield.js';

// The system stage: one star and its five worlds, for the condensation and
// habitability acts. Real geometry this time — these are the exact Planet meshes
// the orbital and surface scenes use, so the world the documentary rules in or
// out is the same world the rest of the platform will fly you down onto.
//
// The layout is cinematic, not to scale: real orbital distances span a factor of
// twenty and would put the outer worlds off-screen as dots. Instead the planets
// are dealt along a gentle receding arc, sized so all five read in an
// establishing wide, and the camera pushes in to each as the narration reaches
// it. Colour, atmosphere and terrain ARE to spec — only the spacing is staged.

const _tmp = new THREE.Vector3();

export class SystemScene {
  /** @param {import('../cosmos/Cosmos.js').Cosmos} cosmos */
  constructor(cosmos) {
    this.cosmos = cosmos;
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
      this.slots.push({ pos: planet.position.clone(), scale, index: i, chem: p.chem });
      return planet;
    });

    // A soft ring drawn around whichever world is the current subject.
    this.highlight = new THREE.Mesh(
      new THREE.RingGeometry(1.15, 1.28, 64),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide }),
    );
    this.scene.add(this.highlight);

    // Camera framing state, eased every frame.
    this.camTarget = new THREE.Vector3(90, 10, 220);
    this.lookTarget = new THREE.Vector3(90, 0, -30);
    this.camera.position.copy(this.camTarget);
    this._focus = -1;
    this._revealed = 0; // how many planets are "formed" and visible
    this._phase = 'ignite';

    // Until the disc condenses, hide the worlds.
    for (const pl of this.planets) pl.visible = false;
    this.star.visible = false;
  }

  setPhase(name) {
    this._phase = name;
    if (name === 'ignite') this.star.visible = true;
    if (name === 'planets' || name === 'reveal') {
      for (const pl of this.planets) pl.visible = true;
      this._revealed = this.planets.length;
      // Pull back to an establishing wide on the whole system.
      this.camTarget.set(120, 40, 320);
      this.lookTarget.set(120, 0, -40);
      this._focus = -1;
      this._setHighlight(-1);
    }
    if (name === 'disc' || name === 'condense') {
      this.star.visible = true;
      this.camTarget.set(40, 20, 180);
      this.lookTarget.set(20, 0, -10);
    }
  }

  /** Push in on planet `i` and ring it. */
  focus(i) {
    const slot = this.slots[i];
    if (!slot) return;
    for (const pl of this.planets) pl.visible = true;
    this._focus = i;
    const radius = 20 * slot.scale;
    // Frame the world in the left third, star-lit side toward camera.
    this.camTarget.copy(slot.pos).add(new THREE.Vector3(radius * 2.2, radius * 0.6, radius * 4.5));
    this.lookTarget.copy(slot.pos);
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
    for (const pl of this.planets) pl.update(elapsed, dt);
    this.starfield.update(this.camera);

    // Gentle star shimmer.
    const s = 1 + Math.sin(elapsed * 2) * 0.01;
    this.star.scale.setScalar(s);

    // Ease camera toward its target framing.
    this.camera.position.lerp(this.camTarget, Math.min(1, dt * 1.6));
    _tmp.copy(this.lookTarget);
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
    this.highlight.geometry.dispose();
    this.highlight.material.dispose();
  }
}
