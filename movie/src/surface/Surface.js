import * as THREE from 'three';

// A patch of ground, meshed from the world's height field.
//
// Two things make this more than a heightmap plane:
//
// 1. It is built in a LOCAL tangent frame centred on the landing site, with the
//    site's ground point at the origin. The planet's true centre is 3000 km away
//    — meshing in planet space would put every vertex at a magnitude around 3e6,
//    where float32 has about 0.25 m of precision. Terrain detail is 26 m tall.
//    It would visibly quantise. Local coordinates keep everything near zero.
//
// 2. It keeps the curvature. Sampling the real sphere direction for each vertex
//    means the horizon drops away on its own, which on a 3000 km world is a
//    visible ~2 km sightline. You get the "small planet" feel for free, and it
//    stays consistent with what the orbital shot showed.

export class Surface {
  /**
   * @param {import('../world/World.js').World} world
   * @param {{x:number,y:number,z:number}} siteDir - unit direction of the site
   * @param {object} [opts]
   * @param {number} [opts.size] - patch edge length in metres
   * @param {number} [opts.resolution] - vertices per edge
   */
  constructor(world, siteDir, { size = 3000, resolution = 320 } = {}) {
    this.world = world;
    this.size = size;
    this.resolution = resolution;

    this.origin = normalize(siteDir);
    this.originHeight = world.heightMetresAt(this.origin);
    this.originRadius = world.radiusMetres + this.originHeight;

    // Local basis. `up` is the site's radial direction; east/north complete it.
    const worldUp = Math.abs(this.origin.y) < 0.99 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
    this.up = this.origin;
    this.east = normalize(cross(worldUp, this.origin));
    this.north = cross(this.origin, this.east);

    this.mesh = this._build();
  }

  /** Local metres (x east, z north) -> unit direction on the planet. */
  dirAt(x, z) {
    const R = this.world.radiusMetres;
    const ax = x / R;
    const az = z / R;
    return normalize({
      x: this.origin.x + this.east.x * ax + this.north.x * az,
      y: this.origin.y + this.east.y * ax + this.north.y * az,
      z: this.origin.z + this.east.z * ax + this.north.z * az,
    });
  }

  /** Local metres -> local position, origin at the site's ground point. */
  positionAt(x, z) {
    const dir = this.dirAt(x, z);
    const r = this.world.radiusMetres + this.world.heightMetresAt(dir);

    // Delta from the origin ground point, projected into the local basis.
    const dx = dir.x * r - this.origin.x * this.originRadius;
    const dy = dir.y * r - this.origin.y * this.originRadius;
    const dz = dir.z * r - this.origin.z * this.originRadius;

    return {
      x: dx * this.east.x + dy * this.east.y + dz * this.east.z,
      y: dx * this.up.x + dy * this.up.y + dz * this.up.z,
      z: dx * this.north.x + dy * this.north.y + dz * this.north.z,
    };
  }

  /** Ground height in local metres at a local (x, z). Use for placement. */
  heightAt(x, z) {
    return this.positionAt(x, z).y;
  }

  /** Local-space up-ish normal at (x, z), for orienting props to the slope. */
  normalAt(x, z, eps = 1.0) {
    const c = this.positionAt(x, z);
    const a = this.positionAt(x + eps, z); // +east
    const b = this.positionAt(x, z + eps); // +north
    // Order matters: north × east = up in this basis. The first version crossed
    // east × north, every normal pointed at the planet core, and the whole patch
    // shaded as a cliff with zero trees. If the ground ever goes uniformly
    // rock-coloured again, look here first.
    return normalizeV3(
      cross(
        { x: b.x - c.x, y: b.y - c.y, z: b.z - c.z },
        { x: a.x - c.x, y: a.y - c.y, z: a.z - c.z },
      ),
    );
  }

  _build() {
    const { resolution: n, size } = this;
    const half = size / 2;
    const stepSize = size / (n - 1);

    const vertexCount = n * n;
    const positions = new Float32Array(vertexCount * 3);
    const colors = new Float32Array(vertexCount * 3);

    const palette = this.world.surface.ground;
    const rock = new THREE.Color(palette.rock);
    const soil = new THREE.Color(palette.soil);
    const grass = new THREE.Color(palette.grass);
    const sand = new THREE.Color(palette.sand);
    const tmp = new THREE.Color();
    const tmpB = new THREE.Color();

    // Two palettes are baked per vertex: the LIVING ground (grass and soil,
    // what the mesh has always shown) and the BARREN ground — the same rock
    // before life colonised it. setLifeStage() blends between them so deep
    // time can play across a fixed frame.
    const living = new Float32Array(vertexCount * 3);
    const barren = new Float32Array(vertexCount * 3);
    const aboveSeaN = new Float32Array(vertexCount);

    // Sea level expressed in the same local metres the patch uses.
    const seaLevelLocal =
      this.world.seaLevel * this.world.heightScaleMetres - this.originHeight;

    let minY = Infinity;
    let maxY = -Infinity;

    for (let iz = 0; iz < n; iz++) {
      for (let ix = 0; ix < n; ix++) {
        const i = iz * n + ix;
        const x = -half + ix * stepSize;
        const z = -half + iz * stepSize;

        const p = this.positionAt(x, z);
        positions[i * 3 + 0] = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = p.z;

        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);

        // Shade by slope and elevation above the waterline. Steep ground is
        // rock regardless of altitude, which is what stops the palette from
        // painting grass onto a cliff face.
        const nrm = this.normalAt(x, z, stepSize);
        const slope = 1 - Math.max(0, Math.min(1, nrm.y)); // 0 flat, 1 vertical
        const aboveSea = p.y - seaLevelLocal;

        if (aboveSea < 12) tmp.copy(sand);
        else tmp.copy(grass).lerp(soil, Math.min(1, Math.max(0, (aboveSea - 60) / 400)));
        tmp.lerp(rock, Math.min(1, slope * 2.6));

        living[i * 3 + 0] = tmp.r;
        living[i * 3 + 1] = tmp.g;
        living[i * 3 + 2] = tmp.b;

        // Barren twin: no grass anywhere — sand at the tide line, then bare
        // soil fading to rock with altitude and slope.
        if (aboveSea < 12) tmpB.copy(sand);
        else tmpB.copy(soil).lerp(rock, Math.min(1, Math.max(0, (aboveSea - 40) / 300)));
        tmpB.lerp(rock, Math.min(1, slope * 2.6));
        barren[i * 3 + 0] = tmpB.r;
        barren[i * 3 + 1] = tmpB.g;
        barren[i * 3 + 2] = tmpB.b;

        aboveSeaN[i] = Math.min(1, Math.max(0, aboveSea / 160));

        colors[i * 3 + 0] = tmp.r;
        colors[i * 3 + 1] = tmp.g;
        colors[i * 3 + 2] = tmp.b;
      }
    }

    const indices = new (vertexCount > 65535 ? Uint32Array : Uint16Array)((n - 1) * (n - 1) * 6);
    let k = 0;
    for (let iz = 0; iz < n - 1; iz++) {
      for (let ix = 0; ix < n - 1; ix++) {
        const a = iz * n + ix;
        const b = a + 1;
        const c = a + n;
        const d = c + 1;
        indices[k++] = a; indices[k++] = c; indices[k++] = b;
        indices[k++] = b; indices[k++] = c; indices[k++] = d;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();

    this.bounds = { minY, maxY, seaLevelLocal };
    this._living = living;
    this._barren = barren;
    this._aboveSeaN = aboveSeaN;
    this._lifeStage = 1;

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0.0,
      flatShading: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.name = 'surface';
    return mesh;
  }

  /**
   * How alive the ground looks: 0 = pre-life rock and sand, 1 = full cover.
   * Life climbs up from the waterline — low ground turns first — which is the
   * visual the deep-time act narrates ("colour bleeding into the shallows").
   */
  setLifeStage(t) {
    if (t === this._lifeStage || !this._living) return;
    this._lifeStage = t;
    const attr = this.mesh.geometry.attributes.color;
    const arr = attr.array;
    const { _living: living, _barren: barren, _aboveSeaN: a } = this;
    for (let i = 0; i < a.length; i++) {
      const k = Math.min(1, Math.max(0, (t * 1.3 - a[i]) * 4 + t * 0.2));
      const j = i * 3;
      arr[j] = barren[j] + (living[j] - barren[j]) * k;
      arr[j + 1] = barren[j + 1] + (living[j + 1] - barren[j + 1]) * k;
      arr[j + 2] = barren[j + 2] + (living[j + 2] - barren[j + 2]) * k;
    }
    attr.needsUpdate = true;
  }

  /**
   * Flat water plane at sea level. Returns null for worlds whose landing site
   * sits entirely above the waterline — no point paying for a plane nobody sees.
   */
  buildWater() {
    const { seaLevelLocal, minY } = this.bounds;
    if (seaLevelLocal < minY) return null;

    const geometry = new THREE.PlaneGeometry(this.size * 2, this.size * 2);
    geometry.rotateX(-Math.PI / 2);
    // Reflective, but not a perfect mirror: some roughness keeps the sky
    // reflection soft, and the scene environment (see SurfaceScene) means those
    // reflections render the sky rather than black at grazing angles.
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(...this.world.colors.color1).multiplyScalar(2.2),
      roughness: 0.22,
      metalness: 0.1,
      envMapIntensity: 1.0,
      transparent: true,
      opacity: 0.9,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = seaLevelLocal;
    mesh.name = 'water';
    return mesh;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalize(v) {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

const normalizeV3 = normalize;
