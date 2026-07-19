import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { Surface } from '../surface/Surface.js';
import { Flora } from '../surface/Flora.js';
import { Fauna } from '../fauna/Fauna.js';
import { castGenomes, findCastSites } from '../fauna/cast.js';
import { FlyCamera } from '../core/FlyCamera.js';

// Act-two stage: standing on the world act one showed from orbit.
//
// Everything here is derived from the same World object the orbital scene used,
// so the coastline out the window and the coastline underfoot are the same
// coastline. The landing site is chosen by World.findLandingSite(), which is
// also where the crashed lander will eventually be placed.

const SKY_VERT = /* glsl */ `
varying vec3 vWorldPosition;
void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SKY_FRAG = /* glsl */ `
uniform vec3 skyColor;
uniform vec3 horizonColor;
uniform vec3 sunColor;
uniform vec3 sunDirection;
varying vec3 vWorldPosition;

void main() {
  vec3 dir = normalize(vWorldPosition);
  // Gradient from horizon to zenith, biased so most of the frame is sky.
  float h = pow(clamp(dir.y * 0.5 + 0.5, 0.0, 1.0), 0.55);
  vec3 color = mix(horizonColor, skyColor, h);

  // Sun disc plus a wide glow. Cheap, and reads correctly at any focal length.
  float cosAngle = dot(dir, normalize(sunDirection));
  float disc = smoothstep(0.9995, 0.9999, cosAngle);
  float glow = pow(max(0.0, cosAngle), 220.0) * 0.6 + pow(max(0.0, cosAngle), 8.0) * 0.12;
  color += sunColor * (disc * 12.0 + glow);

  gl_FragColor = vec4(color, 1.0);
}
`;

// A cheap equirectangular sky gradient used as scene.environment. Without an
// environment, smooth PBR surfaces (the water especially) reflect nothing and
// render BLACK at grazing angles — the classic "black water" bug. Reflecting a
// sky-coloured gradient instead gives the water a real surface and gives every
// material a little image-based ambient. Built from this world's own sky.
function skyEnvironment(s) {
  const W = 16, H = 64;
  const data = new Uint8Array(W * H * 4);
  const sky = new THREE.Color(s.sky);
  const horizon = new THREE.Color(s.horizon);
  const below = new THREE.Color(s.fog); // hazy distance/ground the water reflects
  const c = new THREE.Color();
  for (let y = 0; y < H; y++) {
    const t = y / (H - 1); // 0 nadir -> 1 zenith
    if (t > 0.5) c.copy(horizon).lerp(sky, (t - 0.5) * 2);
    else c.copy(below).lerp(horizon, t * 2);
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      data[i] = Math.round(c.r * 255);
      data[i + 1] = Math.round(c.g * 255);
      data[i + 2] = Math.round(c.b * 255);
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// A seamless, tiling water normal map generated procedurally — so the
// three.js Water ocean has ripples without shipping a texture asset. The wave
// components use integer wavenumbers, which makes the field wrap perfectly.
function waterNormalsTexture(N = 256) {
  const TAU = Math.PI * 2;
  const height = new Float32Array(N * N);
  const waves = [[3, 2, 1.0], [5, -3, 0.6], [2, 7, 0.5], [9, 4, 0.32], [-6, 5, 0.35]];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let h = 0;
      for (const [kx, ky, a] of waves) h += a * Math.sin(TAU * (kx * x / N + ky * y / N));
      height[y * N + x] = h;
    }
  }
  const at = (x, y) => height[((y + N) % N) * N + ((x + N) % N)];
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = at(x + 1, y) - at(x - 1, y);
      const dy = at(x, y + 1) - at(x, y - 1);
      let nx = -dx, ny = -dy, nz = 1.4;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;
      const i = (y * N + x) * 4;
      data[i] = Math.round((nx * 0.5 + 0.5) * 255);
      data[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      data[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

export class SurfaceScene {
  /**
   * `cinematic: true` skips the FlyCamera — the caller drives the camera by
   * assigning `this.cameraDriver = (camera, dt) => …` (the teaser does this).
   *
   * `castSeed` stages the wildlife as Episode 2's principal cast instead of
   * the free-roam roster: zone-built genomes at staged climate sites, indexed
   * on `this.fauna.cast` / `this.fauna.sites` (see fauna/cast.js).
   */
  constructor(world, { patchSize = 3000, resolution = 320, cinematic = false, castSeed = null } = {}) {
    this.world = world;
    this.cinematic = cinematic;
    this.castSeed = castSeed;
    this.cameraDriver = null;
    this.scene = new THREE.Scene();
    this.bloom = { strength: 0.18, radius: 0.5, threshold: 0.85 };
    this.ready = false;

    this.camera = new THREE.PerspectiveCamera(
      42, // a slightly long lens — wide angles make terrain look like a diorama
      window.innerWidth / window.innerHeight,
      // Scripted shots fly through inhabited air: a bird wing millimetres from
      // the lens is a frame-filling black wall. An arm's-length near plane
      // clips it away instead. Hand-flown cameras keep the tighter plane.
      cinematic ? 1.5 : 0.1,
      40000,
    );

    this.patchSize = patchSize;
    this.resolution = resolution;
  }

  /**
   * Building the patch and the tree pool takes long enough to drop frames, so it
   * happens on scene entry rather than in the constructor — the caller can show
   * a loading state around the await.
   */
  async enter() {
    if (this.ready) return;
    const world = this.world;

    const site = world.findLandingSite();
    if (!site) {
      // An ocean world with no dry land is a legitimate roll, not a failure —
      // but it is not somewhere a survival act can happen.
      throw new Error(
        `${world.full} has no landable terrain (biome: ${world.biome.label}). Try another seed.`,
      );
    }
    this.site = site;

    const s = world.surface;
    this.scene.fog = new THREE.FogExp2(new THREE.Color(s.fog), s.fogDensity);

    // Sky dome. Inverted sphere rather than a cube map so the gradient and sun
    // stay resolution-independent.
    const sunDir = new THREE.Vector3(0.35, 0.42, 0.84).normalize();
    this.sunDirection = sunDir;
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(20000, 32, 16),
      new THREE.ShaderMaterial({
        uniforms: {
          skyColor: { value: new THREE.Color(s.sky) },
          horizonColor: { value: new THREE.Color(s.horizon) },
          sunColor: { value: new THREE.Color(s.sunColor) },
          sunDirection: { value: sunDir },
        },
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    );
    this.sky.name = 'sky';
    this.scene.add(this.sky);

    // Image-based ambient from the sky, so PBR reflections (water!) aren't black.
    this.envMap = skyEnvironment(s);
    this.scene.environment = this.envMap;
    this.scene.environmentIntensity = 0.6;

    // Lighting: one hard key for the star, plus hemisphere fill so shadowed
    // faces pick up bounce from ground and sky instead of going black.
    this.sun = new THREE.DirectionalLight(new THREE.Color(s.sunColor), s.sunIntensity);
    this.sun.position.copy(sunDir).multiplyScalar(2000);
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.fill = new THREE.HemisphereLight(new THREE.Color(s.sky), new THREE.Color(s.ambient), 0.7);
    this.scene.add(this.fill);

    // Terrain
    this.surface = new Surface(world, site.dir, {
      size: this.patchSize,
      resolution: this.resolution,
    });
    this.scene.add(this.surface.mesh);

    // Water — the three.js example ocean (webgl_shaders_ocean). It renders a
    // live reflection of the sky and terrain, so it reads as water at any angle
    // instead of the black a plain PBR plane gives at grazing incidence.
    //
    // The world's true sea can lie a hundred metres below a patch the site
    // chooser still calls coastal — macro slopes are kilometres long, so the
    // global waterline almost never crosses a 3 km patch. A shore story needs
    // a shore: when the ocean is out of reach, water stands in the patch's own
    // lowlands instead (a local water table), and the adjusted level is written
    // back into bounds so the fauna, the staging sites and the mesh all agree
    // on where the water's edge is.
    const { seaLevelLocal, minY } = this.surface.bounds;
    const waterLevel = seaLevelLocal >= minY ? seaLevelLocal : Math.min(minY + 10, -4);
    this.surface.bounds.seaLevelLocal = waterLevel;
    {
      const waterGeo = new THREE.PlaneGeometry(this.patchSize * 4, this.patchSize * 4);
      const water = new Water(waterGeo, {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: waterNormalsTexture(),
        sunDirection: sunDir.clone(),
        sunColor: new THREE.Color(s.sunColor).getHex(),
        waterColor: new THREE.Color(...world.colors.color1).multiplyScalar(1.4).getHex(),
        distortionScale: 2.4,
        fog: this.scene.fog !== undefined,
      });
      water.rotation.x = -Math.PI / 2;
      water.position.y = waterLevel;
      water.name = 'water';
      this.water = water;
      this.scene.add(water);
    }
    this.seaLevelLocal = waterLevel;

    // Vegetation
    this.flora = new Flora(world, this.surface);
    this.treeCount = this.flora.populate();
    this.scene.add(this.flora.group);

    // Wildlife — either the free-roam roster, or (with a castSeed) Episode 2's
    // principal cast staged at real climate sites on this terrain.
    this.fauna = new Fauna(world, this.surface);
    const cast = this.castSeed != null
      ? { ...castGenomes(world, this.castSeed), sites: findCastSites(this.surface) }
      : null;
    this.faunaCount = this.fauna.populate(cast);
    this.scene.add(this.fauna.group);

    // Camera rig. Start at eye height on the site, looking at the horizon.
    this.camera.position.set(0, this.surface.heightAt(0, 0) + 2.0, 0);
    if (!this.cinematic) {
      this.controls = new FlyCamera(this.camera, document.querySelector('canvas'), {
        speed: 80,
        groundHeight: (x, z) => this.surface.heightAt(x, z),
      });
      this.controls._yaw = Math.PI * 0.15;
      this.controls._pitch = -0.04;
    }

    this.ready = true;
  }

  update(dt) {
    if (this.cameraDriver) this.cameraDriver(this.camera, dt);
    else this.controls?.update(dt);
    this.fauna?.update(dt);
    // Animate the ocean; the water plane rides with the camera so it always
    // reaches the horizon on a patch that is only a few km wide.
    if (this.water) {
      this.water.material.uniforms['time'].value += dt;
      this.water.position.x = this.camera.position.x;
      this.water.position.z = this.camera.position.z;
    }
    // Sky rides with the camera; the dome is finite and the patch is 3 km wide.
    this.sky?.position.copy(this.camera.position);
    if (this.sun) {
      this.sun.position.copy(this.camera.position).addScaledVector(this.sunDirection, 2000);
      this.sun.target.position.copy(this.camera.position);
    }
  }

  /**
   * Deep-time dial, 0..5 (the episode's eras: sterile, stained, greening,
   * rooted, first movers, full roster). Drives the ground palette, how much of
   * the forest stands, and which animals exist yet — so the same locked frame
   * can play two hundred million years without contradicting the narrator.
   */
  setEra(era) {
    if (!this.ready || era === this._era) return;
    this._era = era;
    this.surface.setLifeStage([0, 0.2, 0.55, 1, 1, 1][era] ?? 1);
    this.flora?.setGrowth(era >= 4 ? 1 : era === 3 ? 0.6 : 0);
    this.fauna?.setEra(era);
  }

  /**
   * Lighting mood. 'dusk' drops the sun to the horizon and turns the light
   * long and gold for the episode's closing act; 'day' is the built state.
   */
  setMood(mood) {
    if (!this.ready || mood === this._mood) return;
    this._mood = mood;
    const s = this.world.surface;
    const dusk = mood === 'dusk';
    // Lower the sun itself — the sky shader's disc, the key light and the
    // camera drivers all read this same vector, so everything agrees.
    const dir = this.sunDirection;
    dir.y = dusk ? 0.08 : 0.42;
    dir.normalize();
    this.sky.material.uniforms.sunDirection.value.copy(dir);
    // Golden hour, not night: the light warms and lowers but the frame must
    // still read — this episode has had enough black shots.
    this.sun.intensity = s.sunIntensity * (dusk ? 0.8 : 1);
    this.sun.color.set(dusk ? 0xffb060 : s.sunColor);
    this.sky.material.uniforms.sunColor.value.set(dusk ? 0xffb060 : s.sunColor);
    this.sky.material.uniforms.horizonColor.value
      .set(s.horizon)
      .lerp(new THREE.Color(0xffa060), dusk ? 0.5 : 0);
    this.sky.material.uniforms.skyColor.value.set(s.sky).multiplyScalar(dusk ? 0.78 : 1);
    this.fill.intensity = dusk ? 0.6 : 0.7;
  }

  /** One-line summary for the HUD. */
  stats() {
    return {
      world: this.world.full,
      biome: this.world.biome.label,
      trees: this.treeCount ?? 0,
      siteAltitudeM: Math.round(this.world.heightMetresAt(this.site.dir)),
      patchKm: (this.patchSize / 1000).toFixed(1),
    };
  }

  dispose() {
    this.scene.environment = null;
    this.envMap?.dispose();
    this.controls?.dispose();
    this.fauna?.dispose();
    this.flora?.dispose();
    this.surface?.dispose();
    this.sky?.geometry.dispose();
    this.sky?.material.dispose();
    this.water?.geometry.dispose();
    this.water?.material.dispose();
  }
}
