import * as THREE from 'three';
import { PLANET_VERT, PLANET_FRAG } from './glsl/planet.js';
import { Atmosphere } from './Atmosphere.js';

// The orbital planet: a unit sphere displaced in the vertex shader, wrapped in a
// cloud shell. Everything it draws comes from `world`, so it cannot drift out of
// sync with the CPU-side terrain the surface scenes mesh from.

export class Planet extends THREE.Group {
  /**
   * @param {import('./World.js').World} world
   * @param {object} [opts]
   * @param {number} [opts.segments] - sphere tessellation; 128 for hero shots,
   *   drop to 48 for background planets in a system-wide establishing shot.
   */
  constructor(world, { segments = 128 } = {}) {
    super();

    this.world = world;
    this.name = world.name;

    const t = world.terrain;
    const c = world.colors;
    const b = world.bands;

    this.uniforms = {
      type: { value: t.type },
      seedOffset: { value: new THREE.Vector3(t.seedOffset.x, t.seedOffset.y, t.seedOffset.z) },
      radius: { value: world.radius },
      amplitude: { value: t.amplitude },
      sharpness: { value: t.sharpness },
      offset: { value: t.offset },
      period: { value: t.period },
      persistence: { value: t.persistence },
      lacunarity: { value: t.lacunarity },
      octaves: { value: t.octaves },

      ambientIntensity: { value: 0.02 },
      diffuseIntensity: { value: 1 },
      specularIntensity: { value: 2 },
      shininess: { value: 10 },
      lightDirection: { value: new THREE.Vector3(world.sunDirection.x, world.sunDirection.y, world.sunDirection.z) },
      lightColor: { value: new THREE.Color(0xffffff) },

      bumpStrength: { value: 1.0 },
      bumpOffset: { value: 0.001 },

      color1: { value: new THREE.Color(...c.color1) },
      color2: { value: new THREE.Color(...c.color2) },
      color3: { value: new THREE.Color(...c.color3) },
      color4: { value: new THREE.Color(...c.color4) },
      color5: { value: new THREE.Color(...c.color5) },

      transition2: { value: b.transition2 },
      transition3: { value: b.transition3 },
      transition4: { value: b.transition4 },
      transition5: { value: b.transition5 },
      blend12: { value: b.blend12 },
      blend23: { value: b.blend23 },
      blend34: { value: b.blend34 },
      blend45: { value: b.blend45 },
    };

    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: PLANET_VERT,
      fragmentShader: PLANET_FRAG,
    });

    const geometry = new THREE.SphereGeometry(1, segments, segments);
    geometry.computeTangents(); // the bump-mapping path needs a tangent frame

    this.surfaceMesh = new THREE.Mesh(geometry, this.material);
    this.add(this.surfaceMesh);

    const a = world.atmosphere;
    if (a.opacity > 0.01) {
      this.atmosphere = new Atmosphere(
        {
          particles: { value: a.particles },
          minParticleSize: { value: 50 },
          maxParticleSize: { value: 100 },
          radius: { value: world.radius + 1 },
          thickness: { value: a.thickness },
          density: { value: a.density },
          opacity: { value: a.opacity },
          scale: { value: 8 },
          color: { value: new THREE.Color(a.color) },
          speed: { value: 0.03 },
          lightDirection: this.uniforms.lightDirection,
        },
        world.rng.fork('atmosphere'),
      );
      this.add(this.atmosphere);
    }
  }

  /**
   * @param {number} elapsed - total elapsed scene time, seconds
   * @param {number} dt - frame delta, seconds
   */
  update(elapsed, dt) {
    this.surfaceMesh.rotation.y += this.world.rotationPeriod * dt;
    if (this.atmosphere) {
      this.atmosphere.update(elapsed);
      // Clouds drift slightly faster than the ground — cheap parallax that sells
      // the shell as separate from the surface.
      this.atmosphere.rotation.y += this.world.rotationPeriod * 1.35 * dt;
    }
  }

  dispose() {
    this.surfaceMesh.geometry.dispose();
    this.material.dispose();
    this.atmosphere?.dispose();
  }
}
