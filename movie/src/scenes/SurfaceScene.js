import * as THREE from 'three';
import { Surface } from '../surface/Surface.js';
import { Flora } from '../surface/Flora.js';
import { Fauna } from '../fauna/Fauna.js';
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

export class SurfaceScene {
  /**
   * `cinematic: true` skips the FlyCamera — the caller drives the camera by
   * assigning `this.cameraDriver = (camera, dt) => …` (the teaser does this).
   */
  constructor(world, { patchSize = 3000, resolution = 320, cinematic = false } = {}) {
    this.world = world;
    this.cinematic = cinematic;
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

    const water = this.surface.buildWater();
    if (water) this.scene.add(water);
    this.water = water;

    // Vegetation
    this.flora = new Flora(world, this.surface);
    this.treeCount = this.flora.populate();
    this.scene.add(this.flora.group);

    // Wildlife — every species this world rolled, hatched onto the patch.
    this.fauna = new Fauna(world, this.surface);
    this.faunaCount = this.fauna.populate();
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
    // Sky rides with the camera; the dome is finite and the patch is 3 km wide.
    this.sky?.position.copy(this.camera.position);
    if (this.sun) {
      this.sun.position.copy(this.camera.position).addScaledVector(this.sunDirection, 2000);
      this.sun.target.position.copy(this.camera.position);
    }
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
