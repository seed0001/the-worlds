// Biome archetypes.
//
// A biome is the recipe, not the planet. It defines the *ranges* a world of that
// kind can occupy; World.js rolls a seed against those ranges to get one specific
// planet. Two "temperate" worlds from different seeds share a mood but not a
// coastline.
//
// Colours are linear RGB triples (the planet shader multiplies them by light and
// writes them straight out), ordered from lowest terrain band to highest:
//   1 = sea floor / ocean   2 = lowland   3 = shore & mid   4 = upland   5 = peak

/** [min, max] — rolled per seed. A bare number means "no variation". */
const R = (min, max) => ({ min, max });

export const BIOMES = {
  temperate: {
    label: 'Temperate',
    // The default act-two world: oceans, green lowland, snow caps. Survivable.
    terrain: {
      type: 2,
      amplitude: R(1.0, 1.35),
      sharpness: R(2.3, 2.9),
      offset: R(-0.03, 0.0),
      period: R(0.5, 0.75),
      persistence: R(0.45, 0.52),
      lacunarity: R(1.7, 1.95),
      octaves: 10,
    },
    colors: {
      color1: [0.014, 0.117, 0.279], // deep ocean
      color2: [0.080, 0.527, 0.351], // shallows / grass
      color3: [0.620, 0.516, 0.372], // sand
      color4: [0.149, 0.254, 0.084], // forest
      color5: [0.850, 0.870, 0.900], // snow
    },
    bands: { transition2: 0.071, transition3: 0.215, transition4: 0.372, transition5: 1.2,
             blend12: 0.152, blend23: 0.152, blend34: 0.104, blend45: 0.168 },
    atmosphere: { color: 0xffffff, opacity: R(0.30, 0.42), density: R(-0.1, 0.15), thickness: 1.5, particles: 4000 },
    surface: {
      sky: 0x7fb2e5, horizon: 0xcfe2f3, fog: 0x9fc0dd, fogDensity: R(0.0009, 0.0018),
      sunColor: 0xfff4e0, sunIntensity: 2.6, ambient: 0x3a4a5a,
      ground: { rock: 0x6b6255, soil: 0x4a3f2f, grass: 0x4e6b33, sand: 0x9c8a63 },
      // Detail is in METRES: amplitudeM of relief at features periodM across.
      // Rolling hills you can walk over, at roughly a 600 m wavelength.
      detail: { amplitudeM: 26, periodM: 600, persistence: 0.5, lacunarity: 2.0, octaves: 6 },
    },
    flora: {
      // ez-tree presets, weighted. Keys must exist in TreePreset.
      species: [
        { preset: 'Oak Medium', weight: 3, scale: R(0.8, 1.35) },
        { preset: 'Ash Medium', weight: 3, scale: R(0.8, 1.3) },
        { preset: 'Pine Medium', weight: 2, scale: R(0.9, 1.5) },
        { preset: 'Aspen Small', weight: 2, scale: R(0.7, 1.1) },
        { preset: 'Bush 1', weight: 4, scale: R(0.6, 1.2) },
      ],
      // Trees per 100 m^2. Sounds low; isn't. 0.15 over a 3 km patch is ~13k
      // trees, and every doubling doubles both scatter time and leaf overdraw.
      density: R(0.10, 0.22),
      maxSlope: 0.62,        // cos of max slope angle a tree will grow on
      altitude: R(0.02, 0.34), // terrain-height band (orbital units) trees occupy
    },
    fauna: [
      { species: 'skimmer', role: 'flock', count: R(40, 90), domain: 'air' },
      { species: 'grazer', role: 'herd', count: R(8, 20), domain: 'ground' },
    ],
  },

  arid: {
    label: 'Arid',
    terrain: {
      type: 2,
      amplitude: R(0.7, 1.0),
      sharpness: R(1.6, 2.2),
      offset: R(0.02, 0.06), // positive offset floods less, leaves dry basins
      period: R(0.6, 0.9),
      persistence: R(0.48, 0.55),
      lacunarity: R(1.8, 2.1),
      octaves: 9,
    },
    colors: {
      color1: [0.180, 0.130, 0.080],
      color2: [0.520, 0.380, 0.200],
      color3: [0.720, 0.560, 0.330],
      color4: [0.560, 0.400, 0.260],
      color5: [0.780, 0.720, 0.640],
    },
    bands: { transition2: 0.02, transition3: 0.12, transition4: 0.42, transition5: 0.95,
             blend12: 0.10, blend23: 0.18, blend34: 0.16, blend45: 0.20 },
    atmosphere: { color: 0xd9b48a, opacity: R(0.18, 0.30), density: R(-0.3, 0.0), thickness: 1.2, particles: 2500 },
    surface: {
      sky: 0xc98f5a, horizon: 0xe8c9a0, fog: 0xd0a273, fogDensity: R(0.0016, 0.0030),
      sunColor: 0xffe3b0, sunIntensity: 3.2, ambient: 0x5a4636,
      ground: { rock: 0x8a6a45, soil: 0x7a5a38, grass: 0x7d7042, sand: 0xc2a171 },
      // Dune-scale: taller relief, shorter wavelength, sharper crests.
      detail: { amplitudeM: 34, periodM: 420, persistence: 0.52, lacunarity: 2.05, octaves: 6 },
    },
    flora: {
      species: [
        { preset: 'Bush 2', weight: 5, scale: R(0.4, 0.9) },
        { preset: 'Bush 3', weight: 4, scale: R(0.4, 0.8) },
        { preset: 'Pine Small', weight: 1, scale: R(0.5, 0.8) },
      ],
      density: R(0.04, 0.12),
      maxSlope: 0.70,
      altitude: R(0.0, 0.5),
    },
    fauna: [
      { species: 'skimmer', role: 'flock', count: R(10, 25), domain: 'air' },
      { species: 'stalker', role: 'solitary', count: R(2, 5), domain: 'ground' },
    ],
  },

  frozen: {
    label: 'Frozen',
    terrain: {
      type: 3, // ridged — glacial fracture lines
      amplitude: R(1.1, 1.6),
      sharpness: R(2.6, 3.4),
      offset: R(-0.02, 0.02),
      period: R(0.45, 0.7),
      persistence: R(0.44, 0.5),
      lacunarity: R(1.85, 2.15),
      octaves: 10,
    },
    colors: {
      color1: [0.040, 0.090, 0.180],
      color2: [0.300, 0.450, 0.560],
      color3: [0.650, 0.740, 0.800],
      color4: [0.820, 0.870, 0.910],
      color5: [0.960, 0.980, 1.000],
    },
    bands: { transition2: 0.04, transition3: 0.14, transition4: 0.30, transition5: 0.70,
             blend12: 0.09, blend23: 0.12, blend34: 0.14, blend45: 0.18 },
    atmosphere: { color: 0xcfe8ff, opacity: R(0.35, 0.5), density: R(0.0, 0.25), thickness: 1.8, particles: 5000 },
    surface: {
      sky: 0x9db8d4, horizon: 0xdfeaf5, fog: 0xc2d6e8, fogDensity: R(0.0025, 0.0050),
      sunColor: 0xdfeaff, sunIntensity: 1.9, ambient: 0x4a5a6e,
      ground: { rock: 0x6d7784, soil: 0x8894a2, grass: 0xa9bccb, sand: 0xdce8f2 },
      // Glaciers smooth what they cover: low amplitude, long wavelength.
      detail: { amplitudeM: 18, periodM: 800, persistence: 0.48, lacunarity: 2.0, octaves: 5 },
    },
    flora: {
      species: [
        { preset: 'Pine Large', weight: 3, scale: R(0.7, 1.2) },
        { preset: 'Pine Medium', weight: 4, scale: R(0.6, 1.1) },
      ],
      density: R(0.05, 0.20),
      maxSlope: 0.68,
      altitude: R(0.02, 0.22),
    },
    fauna: [{ species: 'grazer', role: 'herd', count: R(6, 14), domain: 'ground' }],
  },

  volcanic: {
    label: 'Volcanic',
    terrain: {
      type: 3,
      amplitude: R(1.3, 1.9),
      sharpness: R(3.0, 4.0),
      offset: R(-0.05, -0.01),
      period: R(0.4, 0.6),
      persistence: R(0.5, 0.58),
      lacunarity: R(1.9, 2.2),
      octaves: 10,
    },
    colors: {
      color1: [0.500, 0.090, 0.020], // magma
      color2: [0.180, 0.070, 0.060],
      color3: [0.130, 0.110, 0.105],
      color4: [0.090, 0.085, 0.085],
      color5: [0.300, 0.290, 0.290],
    },
    bands: { transition2: 0.03, transition3: 0.10, transition4: 0.30, transition5: 0.85,
             blend12: 0.05, blend23: 0.10, blend34: 0.14, blend45: 0.20 },
    atmosphere: { color: 0xff7a44, opacity: R(0.28, 0.45), density: R(0.1, 0.35), thickness: 1.6, particles: 4500 },
    surface: {
      sky: 0x3a1f1c, horizon: 0x8c3a1e, fog: 0x53241c, fogDensity: R(0.0030, 0.0060),
      sunColor: 0xffb070, sunIntensity: 1.6, ambient: 0x4a201a,
      ground: { rock: 0x2b2725, soil: 0x1d1a19, grass: 0x3a2f28, sand: 0x4a3b33 },
      // Broken lava field — the roughest ground in the set.
      detail: { amplitudeM: 45, periodM: 350, persistence: 0.55, lacunarity: 2.1, octaves: 7 },
    },
    flora: null,
    fauna: [{ species: 'stalker', role: 'solitary', count: R(1, 4), domain: 'ground' }],
  },

  barren: {
    label: 'Barren',
    terrain: {
      type: 2,
      amplitude: R(0.5, 0.9),
      sharpness: R(1.4, 2.0),
      offset: R(0.0, 0.03),
      period: R(0.5, 0.8),
      persistence: R(0.5, 0.56),
      lacunarity: R(1.9, 2.1),
      octaves: 9,
    },
    colors: {
      color1: [0.100, 0.098, 0.095],
      color2: [0.230, 0.222, 0.210],
      color3: [0.340, 0.330, 0.315],
      color4: [0.450, 0.440, 0.425],
      color5: [0.600, 0.595, 0.585],
    },
    bands: { transition2: 0.02, transition3: 0.10, transition4: 0.30, transition5: 0.80,
             blend12: 0.08, blend23: 0.14, blend34: 0.16, blend45: 0.20 },
    atmosphere: { color: 0x8892a0, opacity: R(0.0, 0.08), density: R(-0.6, -0.3), thickness: 0.8, particles: 900 },
    surface: {
      sky: 0x05060a, horizon: 0x14181f, fog: 0x0b0e13, fogDensity: R(0.0002, 0.0006),
      sunColor: 0xffffff, sunIntensity: 3.6, ambient: 0x14181f,
      ground: { rock: 0x59564f, soil: 0x46443e, grass: 0x4f4d46, sand: 0x6e6a60 },
      // Airless: no weathering, so craters and rubble stay sharp.
      detail: { amplitudeM: 30, periodM: 500, persistence: 0.5, lacunarity: 2.0, octaves: 6 },
    },
    flora: null,
    fauna: [],
  },
};

export const BIOME_KEYS = Object.keys(BIOMES);

/** Resolve every R(min,max) in a template against an rng, leaving scalars alone. */
export function rollRanges(node, rng) {
  if (node === null || node === undefined) return node;
  if (typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map((n) => rollRanges(n, rng));
  if ('min' in node && 'max' in node && Object.keys(node).length === 2) {
    return rng.range(node.min, node.max);
  }
  const out = {};
  for (const [k, v] of Object.entries(node)) out[k] = rollRanges(v, rng);
  return out;
}
