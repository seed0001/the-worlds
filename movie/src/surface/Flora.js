import * as THREE from 'three';
import { Tree, TreePreset } from '@dgreenheck/ez-tree';

// Vegetation cover for a Surface patch.
//
// Meshing a tree in ez-tree is not cheap, and a forest wants hundreds. The trick
// is that nobody can tell 400 trees from 400 copies of 5 trees at varied scale
// and rotation. So: generate a small POOL of genuinely unique trees per species,
// then draw the whole forest as InstancedMesh — one draw call per pool entry per
// material instead of one per tree.
//
// Trees are normalised to a real height in metres after generation rather than
// trusting the preset's units, so a "Pine Large" is 28 m tall on every world.

const VARIANTS_PER_SPECIES = 4;

// Target canopy heights in metres, by preset family. Anything unlisted falls
// back to 12 m, which is a reasonable generic tree.
const TARGET_HEIGHT_M = {
  'Oak Large': 26, 'Oak Medium': 17, 'Oak Small': 9,
  'Ash Large': 28, 'Ash Medium': 18, 'Ash Small': 10,
  'Aspen Large': 24, 'Aspen Medium': 16, 'Aspen Small': 8,
  'Pine Large': 32, 'Pine Medium': 21, 'Pine Small': 11,
  'Bush 1': 2.2, 'Bush 2': 1.6, 'Bush 3': 1.9,
};

const textureLoader = new THREE.TextureLoader();
const textureCache = new Map();

function loadTexture(url, { srgb = false } = {}) {
  if (textureCache.has(url)) return textureCache.get(url);
  const tex = textureLoader.load(url, undefined, undefined, () => {
    console.warn(`[flora] missing texture ${url} — continuing untextured`);
    textureCache.set(url, null);
  });
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(url, tex);
  return tex;
}

/** Bark/leaf maps mirror ez-tree's own app layout under /textures. */
function applyTextures(tree) {
  const barkType = tree.options.bark.type;
  if (barkType) {
    const dir = `${barkType}_1K-JPG`;
    const base = `/textures/bark/${dir}/${dir}`;
    tree.options.bark.maps.color = loadTexture(`${base}_Color.jpg`, { srgb: true });
    tree.options.bark.maps.normal = loadTexture(`${base}_NormalGL.jpg`);
    tree.options.bark.maps.roughness = loadTexture(`${base}_Roughness.jpg`);
  }
  const leafType = tree.options.leaves.type;
  if (leafType) {
    const map = loadTexture(`/textures/leaves/${leafType}.png`, { srgb: true });
    if (map) map.premultiplyAlpha = true;
    tree.options.leaves.map = map;
  }
}

/** Build one unique tree and normalise it to a real-world height. */
function buildVariant(presetName, seed) {
  const preset = TreePreset[presetName];
  if (!preset) {
    console.warn(`[flora] unknown preset "${presetName}" — skipping`);
    return null;
  }

  const tree = new Tree();
  tree.options.copy(structuredClone(preset));
  tree.options.seed = seed;
  applyTextures(tree);
  tree.generate();

  const box = new THREE.Box3().setFromObject(tree);
  const rawHeight = box.max.y - box.min.y;
  const target = TARGET_HEIGHT_M[presetName] ?? 12;
  const unitScale = rawHeight > 0.001 ? target / rawHeight : 1;

  return {
    branches: { geometry: tree.branchesMesh.geometry, material: tree.branchesMesh.material },
    leaves: { geometry: tree.leavesMesh.geometry, material: tree.leavesMesh.material },
    unitScale,
    // The generated tree's own origin sits at the base of the trunk, but the
    // bounding box can dip below it on presets with surface roots. Offsetting by
    // the measured minimum keeps trunks from hovering.
    baseOffset: box.min.y * unitScale,
  };
}

export class Flora {
  /**
   * @param {import('../world/World.js').World} world
   * @param {import('./Surface.js').Surface} surface
   */
  constructor(world, surface) {
    this.world = world;
    this.surface = surface;
    this.group = new THREE.Group();
    this.group.name = 'flora';
    this.placements = [];
    this._variants = [];
  }

  /** Generates the tree pool and scatters it. Returns the count actually placed. */
  populate() {
    const flora = this.world.flora;
    if (!flora) return 0;

    const rng = this.world.rng.fork('flora');

    // 1. Build the variant pool.
    const pool = [];
    for (const species of flora.species) {
      for (let v = 0; v < VARIANTS_PER_SPECIES; v++) {
        const variant = buildVariant(species.preset, rng.int(1, 1_000_000));
        if (!variant) continue;
        variant.species = species;
        variant.instances = [];
        pool.push(variant);
      }
    }
    if (pool.length === 0) return 0;
    this._variants = pool;

    // Weighted species selection, expanded once so scattering stays O(1).
    const weighted = [];
    for (const variant of pool) {
      const w = Math.max(1, Math.round(variant.species.weight ?? 1));
      for (let i = 0; i < w; i++) weighted.push(variant);
    }

    // 2. Scatter on a jittered grid. A true Poisson disc would be tidier, but a
    // jittered grid has no clumping artefacts at this density and is far cheaper.
    const size = this.surface.size;
    const perHundredSqM = flora.density;
    // Floor the cell size so a dense roll on a big patch can't explode into
    // hundreds of thousands of terrain samples: 200x200 cells caps scattering at
    // 40k candidates (~a few seconds of CPU) and ~tens of thousands of trees,
    // which is already more forest than a shot can hold.
    const cell = Math.max(4, size / 200, Math.sqrt(100 / Math.max(perHundredSqM, 0.001)));
    const cells = Math.floor(size / cell);
    const half = size / 2;

    const seaLevelLocal = this.surface.bounds.seaLevelLocal;
    const heightScale = this.world.heightScaleMetres;
    // Treeline, measured up from sea level. The rolled flora.altitude only
    // *raises* it — the +200 m floor guarantees the band always contains the
    // landing site (which findLandingSite puts ~120 m above sea level), because
    // a biome that has flora but rolls all its trees out of frame is a bug from
    // the movie's point of view, however defensible procedurally.
    const treelineLocal = seaLevelLocal + flora.altitude * heightScale + 200;

    for (let cz = 0; cz < cells; cz++) {
      for (let cx = 0; cx < cells; cx++) {
        const x = -half + (cx + rng()) * cell;
        const z = -half + (cz + rng()) * cell;

        const p = this.surface.positionAt(x, z);
        if (p.y < seaLevelLocal + 3) continue;   // no trees in the sea
        if (p.y > treelineLocal) continue;       // above the treeline

        const n = this.surface.normalAt(x, z, 2.0);
        if (n.y < flora.maxSlope) continue;              // too steep to root

        const variant = weighted[Math.floor(rng() * weighted.length)];
        const scale = variant.unitScale * rng.range(variant.species.scale.min, variant.species.scale.max);

        const matrix = new THREE.Matrix4();
        const quat = new THREE.Quaternion();
        // Lean slightly into the slope — fully aligning to the normal looks wrong
        // (real trees grow toward the light), so blend most of the way to up.
        const leanTarget = new THREE.Vector3(n.x, n.y, n.z).lerp(new THREE.Vector3(0, 1, 0), 0.75).normalize();
        quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), leanTarget);
        const spin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng.range(0, Math.PI * 2));
        quat.multiply(spin);

        matrix.compose(
          new THREE.Vector3(x, p.y - variant.baseOffset * scale / variant.unitScale, z),
          quat,
          new THREE.Vector3(scale, scale, scale),
        );

        variant.instances.push(matrix);
        this.placements.push({ x, z, y: p.y, preset: variant.species.preset });
      }
    }

    // 3. Bake each variant's instances into two InstancedMeshes.
    let total = 0;
    for (const variant of pool) {
      const count = variant.instances.length;
      if (count === 0) continue;
      total += count;

      for (const part of ['branches', 'leaves']) {
        const source = variant[part];
        if (!source.geometry) continue;

        const inst = new THREE.InstancedMesh(source.geometry, source.material, count);
        for (let i = 0; i < count; i++) inst.setMatrixAt(i, variant.instances[i]);
        inst.instanceMatrix.needsUpdate = true;
        inst.castShadow = part === 'branches';
        inst.receiveShadow = true;
        // Instances are spread across the whole patch; the per-instance bounds
        // three computes would cull the whole batch as soon as the pool's origin
        // left frame.
        inst.frustumCulled = false;
        inst.name = `flora:${variant.species.preset}:${part}`;
        this.group.add(inst);
      }
    }

    return total;
  }

  dispose() {
    for (const variant of this._variants) {
      variant.branches.geometry?.dispose();
      variant.branches.material?.dispose();
      variant.leaves.geometry?.dispose();
      variant.leaves.material?.dispose();
    }
    this.group.clear();
  }
}
