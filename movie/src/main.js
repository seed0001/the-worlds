import { Stage } from './core/Stage.js';
import { World } from './world/World.js';
import { BIOMES, BIOME_KEYS } from './world/biomes.js';
import { OrbitScene } from './scenes/OrbitScene.js';
import { SurfaceScene } from './scenes/SurfaceScene.js';
import { checkTerrainParity } from './dev/parity.js';

// Set browser. Not the movie — the place you stand to find the shots.
//
// State lives in the URL (?seed=…&biome=…&scene=…) so any framing you like is a
// link you can send yourself, and so a render job can be handed the same string.

const hud = {
  world: document.getElementById('hud-world'),
  stats: document.getElementById('hud-stats'),
  biomes: document.getElementById('hud-biomes'),
  loading: document.getElementById('loading'),
};

const params = new URLSearchParams(location.search);
let seed = params.get('seed') ?? randomSeed();
let biomeKey = params.get('biome') ?? null;
let sceneName = params.get('scene') ?? 'orbit';

const stage = new Stage();
let world = null;

function randomSeed() {
  return Math.random().toString(36).slice(2, 10);
}

function syncUrl() {
  const next = new URLSearchParams({ seed, scene: sceneName });
  if (biomeKey) next.set('biome', biomeKey);
  history.replaceState(null, '', `?${next}`);
}

function setLoading(on, message = 'generating…') {
  hud.loading.hidden = !on;
  hud.loading.textContent = message;
}

/**
 * Yield to the browser so the loading state actually paints before we block.
 *
 * rAF alone is a trap: it does not fire in a hidden or backgrounded tab, so
 * boot would hang forever on a page nobody is looking at — including an
 * offscreen render job. The timer is the fallback that guarantees progress.
 */
const nextPaint = () =>
  new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    requestAnimationFrame(() => requestAnimationFrame(finish));
    setTimeout(finish, 50);
  });

async function buildWorld() {
  setLoading(true, 'generating world…');
  await nextPaint();

  world = new World(seed, biomeKey);
  biomeKey = world.biomeKey;

  // Tear down anything from the previous world before building the next.
  for (const scene of stage.scenes.values()) scene.dispose?.();
  stage.scenes.clear();
  stage.active = null;

  stage.register('orbit', new OrbitScene(world));
  stage.register('surface', new SurfaceScene(world));

  renderHud();
  syncUrl();

  await activate(sceneName);
  setLoading(false);
}

async function activate(name) {
  setLoading(true, name === 'surface' ? 'meshing terrain and growing trees…' : 'generating world…');
  await nextPaint();

  try {
    await stage.activate(name);
    sceneName = name;
  } catch (err) {
    // The common case is an ocean world with no landable ground — a real
    // outcome of the seed, not a crash. Say so and stay where we are.
    console.warn(err);
    setLoading(true, String(err.message ?? err));
    setTimeout(() => setLoading(false), 2600);
    return;
  }

  syncUrl();
  renderHud();
  setLoading(false);
}

function renderHud() {
  if (!world) return;
  const d = world.describe();

  hud.world.textContent = d.name;

  const lines = [
    `seed      ${d.seed}`,
    `biome     ${d.biome}`,
    `radius    ${d.radiusKm.toLocaleString()} km`,
    `peaks     ${d.peakMetres.toLocaleString()} m`,
  ];

  const active = stage.active;
  if (active instanceof SurfaceScene && active.ready) {
    const s = active.stats();
    lines.push(`patch     ${s.patchKm} km`, `trees     ${s.trees.toLocaleString()}`, `altitude  ${s.siteAltitudeM.toLocaleString()} m`);
  } else {
    lines.push(`flora     ${d.hasFlora ? 'yes' : 'none'}`, `fauna     ${d.faunaSpecies.join(', ') || 'none'}`);
  }
  hud.stats.textContent = lines.join('\n');

  for (const btn of document.querySelectorAll('#hud-controls button[data-scene]')) {
    btn.dataset.active = String(btn.dataset.scene === sceneName);
  }
  for (const btn of hud.biomes.querySelectorAll('button')) {
    btn.dataset.active = String(btn.dataset.biome === biomeKey);
  }
}

function buildBiomeButtons() {
  hud.biomes.innerHTML = '';
  for (const key of BIOME_KEYS) {
    const btn = document.createElement('button');
    btn.textContent = BIOMES[key].label;
    btn.dataset.biome = key;
    btn.addEventListener('click', async () => {
      biomeKey = key;
      await buildWorld();
    });
    hud.biomes.appendChild(btn);
  }
}

document.querySelectorAll('#hud-controls button[data-scene]').forEach((btn) => {
  btn.addEventListener('click', () => activate(btn.dataset.scene));
});

document.getElementById('reroll').addEventListener('click', async () => {
  seed = randomSeed();
  await buildWorld();
});

buildBiomeButtons();
await buildWorld();
stage.start();

// Dev-only: prove the CPU terrain matches the GPU terrain before trusting
// anything placed on the ground. Results go to the console.
if (import.meta.env?.DEV) {
  const result = checkTerrainParity(stage.renderer, world.terrain);
  const tag = result.passed ? '%c PASS ' : '%c FAIL ';
  const style = result.passed
    ? 'background:#1c6b3a;color:#fff;border-radius:3px'
    : 'background:#8b1e1e;color:#fff;border-radius:3px';
  console.log(
    `${tag}%c terrain parity — ${result.samples} samples, max abs error ${result.maxAbsError.toExponential(2)} orbital units ` +
      `(${(result.maxAbsError * world.heightScaleMetres).toFixed(4)} m)`,
    style,
    'color:inherit',
  );
  if (!result.passed) {
    console.warn('worst sample:', result.worst);
    const { probeNoise } = await import('./dev/noiseProbe.js');
    const probe = probeNoise(stage.renderer);
    console.table(probe);
    window.__probe = probe;
  }
  window.__parity = result;
}

window.__stage = stage;
window.__world = () => world;
