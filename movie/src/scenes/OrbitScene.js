import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Planet } from '../world/Planet.js';
import { Starfield } from '../space/Starfield.js';

// Act-one stage: one world hanging in space. This is the plate that fleet
// formations, the battle and the crash-descent all get shot against, so it
// deliberately owns nothing but the world, the star and the sky.

export class OrbitScene {
  constructor(world, { interactive = true } = {}) {
    this.world = world;
    this.cameraDriver = null; // non-interactive callers animate the camera here
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      20000,
    );
    this.camera.position.set(0, 12, 55);

    this.starfield = new Starfield({ seed: `${world.seed}:stars` });
    this.scene.add(this.starfield);

    this.planet = new Planet(world);
    this.scene.add(this.planet);

    // A visible star, placed opposite the planet's light direction so the lens
    // flare and the terminator agree with each other.
    const sunDir = new THREE.Vector3(world.sunDirection.x, world.sunDirection.y, world.sunDirection.z).normalize();
    this.sun = new THREE.Mesh(
      new THREE.SphereGeometry(30, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xfff2d0 }),
    );
    this.sun.position.copy(sunDir).multiplyScalar(-2500);
    this.scene.add(this.sun);

    this.bloom = { strength: 0.35, radius: 0.6, threshold: 0.0 };

    if (interactive) {
      this.controls = new OrbitControls(this.camera, document.querySelector('canvas'));
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.minDistance = world.radius * 1.25;
      this.controls.maxDistance = 600;
      this.controls.autoRotate = true;
      this.controls.autoRotateSpeed = 0.15;
    }
  }

  update(dt, elapsed) {
    this.planet.update(elapsed, dt);
    this.starfield.update(this.camera);
    if (this.cameraDriver) this.cameraDriver(this.camera, dt, elapsed);
    else this.controls?.update();
  }

  dispose() {
    this.controls?.dispose();
    this.planet.dispose();
    this.starfield.dispose();
    this.sun.geometry.dispose();
    this.sun.material.dispose();
  }
}
