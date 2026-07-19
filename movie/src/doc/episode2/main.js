import * as THREE from 'three';
import { Stage } from '../../core/Stage.js';
import { Narrator } from '../Narrator.js';
import { Timeline } from '../Timeline.js';
import { Cosmos } from '../../cosmos/Cosmos.js';
import { OrbitScene } from '../../scenes/OrbitScene.js';
import { SurfaceScene } from '../../scenes/SurfaceScene.js';
import { SystemScene } from '../SystemScene.js';
import { SoupScene } from '../SoupScene.js';
import { buildEpisode2Script, buildEpisode2Gate, principalCast } from './narration.js';

// Episode 2 player. Same machinery as the Episode 1 site (Stage, Narrator,
// Timeline) with a director that maps each cue's scene onto one of four stages
// and drives its camera. This is the wiring milestone: the full episode plays
// end to end — descent, the soup, the deep-time eras and the living-world tour —
// narrated cue by cue. The era dial, the multi-biome terrain and the staged
// interactions are the next milestones; here those cues play over the real
// surface with cinematic camera, and every spoken FACT is already derived.

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const els = {
  caption: document.getElementById('caption'),
  progress: document.getElementById('progress'),
  world: document.getElementById('world'),
  start: document.getElementById('start'),
  replay: document.getElementById('replay'),
};

const seed = new URLSearchParams(location.search).get('seed') ?? Math.random().toString(36).slice(2, 10);
history.replaceState(null, '', `?${new URLSearchParams({ seed })}`);

const cosmos = new Cosmos(seed);
const living = cosmos.livingWorlds[0] ?? null;
const world = living?.world ?? null;
const script = living ? buildEpisode2Script(cosmos, world) : buildEpisode2Gate(cosmos);
els.world.textContent = `${world?.full ?? cosmos.starName} — Episode 2`;

const stage = new Stage();
// Episode 2 narrates in Sonia — female, British — a deliberate change of voice
// from Episode 1's Andrew. The `prefer` regex biases the browser-speech
// fallback toward a female British voice if the neural endpoint is down.
const narrator = new Narrator((text) => {
  els.caption.textContent = text;
  els.caption.classList.add('show');
}, { voice: 'en-GB-SoniaNeural', prefer: /sonia|libby|female|en-GB/i });

// --- Register the stages this episode uses --------------------------------
let surfaceReady = null;
if (living) {
  stage.register('orbit', new OrbitScene(world, { interactive: false }));
  stage.register('soup', new SoupScene(world));
  const surface = new SurfaceScene(world, { cinematic: true });
  stage.register('surface', surface);
  // Warm the surface now — meshing terrain and growing trees takes seconds, and
  // the opening minutes are in orbit and the soup, so the cut to ground is a cut.
  surfaceReady = surface.enter().catch((err) => { console.warn('[ep2] surface prewarm failed:', err); surfaceReady = 'dead'; });
} else {
  stage.register('system', new SystemScene(cosmos));
}

// --- Camera drivers -------------------------------------------------------

function driveOrbit(scene, dir) {
  const r = world.radius;
  let t = 0;
  const push = dir.phase === 'approach';
  scene.cameraDriver = (camera, dt) => {
    t += dt;
    const az = 0.5 + t * 0.05;
    const dist = push ? r * 3.2 - ss(0, 8, t) * r * 1.4 : r * 3.4;
    camera.position.set(Math.sin(az) * dist, r * 0.5 + Math.sin(t * 0.12) * r * 0.1, Math.cos(az) * dist);
    camera.lookAt(0, 0, 0);
  };
}

// The landing patch is unbroken forest with no clearance around the site — the
// same wall the teaser's descent hit (see doc/teaser.js): fly a camera into the
// canopy and the frame fills with unlit leaves. Every "black water" shot in
// this episode was that, not the ocean. So: stage the ground shots around a
// real clearing, and when a framing has to stand off outside it, lift the
// camera above the trees around it instead of shooting through them.
function surfaceStaging(scene) {
  if (scene._ep2Staging) return scene._ep2Staging;
  const trees = scene.flora?.placements ?? [];
  const isClear = (x, z, r) => !trees.some((p) => {
    const dx = p.x - x, dz = p.z - z;
    return dx * dx + dz * dz < r * r;
  });
  let clearing = { x: 0, z: 0 };
  outer:
  for (let r = 0; r <= 400; r += 25) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      const x = Math.sin(a) * r, z = Math.cos(a) * r;
      if (isClear(x, z, 26)) { clearing = { x, z }; break outer; }
    }
  }
  // Top of the canopy near (x, z): the tallest tree standing within `pad`
  // metres, or -Infinity where the ground is open.
  const canopyTop = (x, z, pad) => {
    let top = -Infinity;
    for (const p of trees) {
      const dx = p.x - x, dz = p.z - z;
      if (dx * dx + dz * dz >= pad * pad) continue;
      // One bad placement must not NaN-poison the camera through Math.max.
      const th = p.y + (Number.isFinite(p.h) ? p.h : 24);
      if (Number.isFinite(th) && th > top) top = th;
    }
    return top;
  };
  scene._ep2Staging = { clearing, canopyTop };
  return scene._ep2Staging;
}

function driveSurface(scene, dir, index) {
  const sea = scene.seaLevelLocal ?? scene.surface.bounds?.seaLevelLocal ?? -Infinity;
  // Ground you can stand on: real terrain, but never below the water surface —
  // so a camera anchored to it never sinks under the ocean and goes black.
  const surfaceY = (x, z) => Math.max(scene.surface.heightAt(x, z), sea);
  const sun = scene.sunDirection ?? new THREE.Vector3(0.35, 0.42, 0.84);
  const { clearing, canopyTop } = surfaceStaging(scene);
  let t = 0;

  if (dir.phase === 'descent') {
    // Glide down out of the sky into the clearing, looking toward the sun so
    // the horizon (not dark ground) fills the frame — holding clearance over
    // the canopy until the final drop, so the lens never enters a tree.
    const h = Math.hypot(sun.x, sun.z) || 1;
    const ux = -sun.x / h, uz = -sun.z / h; // approach from down-sun
    scene.cameraDriver = (camera, dt) => {
      t += dt;
      const k = ss(0, 7, t);
      const x = clearing.x + ux * 40 * (1 - k);
      const z = clearing.z + uz * 40 * (1 - k);
      const ground = surfaceY(x, z);
      const clearance = Math.max(0, canopyTop(x, z, 24) + 6 - ground) * Math.min(1, (1 - k) * 3);
      camera.position.set(x, ground + 3 + clearance + (1 - k) * 220, z);
      camera.lookAt(
        x + sun.x * 400,
        surfaceY(clearing.x, clearing.z) + 30 + (1 - k) * 60,
        z + sun.z * 400,
      );
    };
    return;
  }
  if (dir.phase === 'shallows') {
    scene.cameraDriver = (camera, dt) => {
      t += dt;
      const x = clearing.x + Math.sin(t * 0.15) * 4;
      const z = clearing.z + 6;
      camera.position.set(x, surfaceY(x, z) + 2.5, z);
      camera.lookAt(
        clearing.x + sun.x * 200,
        surfaceY(clearing.x, clearing.z) + 12,
        clearing.z + sun.z * 200,
      );
    };
    return;
  }
  // Species cues: the script names an animal, so the camera films THAT animal
  // — the same population the narrator's cast picked, tracked at its live
  // centre exactly like the teaser's creature shots.
  const pop = filmTarget(scene, dir.focus);
  if (pop) {
    const centre = new THREE.Vector3();
    const air = pop.genome.domain === 'air';
    const size = pop.genome.size ?? 2;
    const dist = air ? 46 : Math.max(13, size * 8);
    const dirSign = index % 2 ? 1 : -1;
    scene.cameraDriver = (camera, dt) => {
      t += dt;
      centre.set(0, 0, 0);
      for (const a of pop.agents) centre.add(a.pos);
      centre.divideScalar(Math.max(1, pop.agents.length));
      const az = index * 1.7 + dirSign * t * 0.07;
      const x = centre.x + Math.sin(az) * dist;
      const z = centre.z + Math.cos(az) * dist;
      const ground = surfaceY(x, z);
      // Fliers are filmed from below their cruise height; walkers from just
      // above their own eye line.
      const y = air ? Math.max(centre.y - 10, ground + 5) : ground + 1.6 + size * 0.9;
      camera.position.set(x, y, z);
      camera.lookAt(centre.x, centre.y + (air ? 0 : size * 0.4), centre.z);
    };
    return;
  }

  // Everything else — ecosystem beats, the deep-time eras, the closing vista —
  // is an establishing shot: wide, above the canopy, drifting around the site,
  // varied per cue so the tour never repeats a framing.
  const wide = dir.focus === 'world' || dir.site === 'vista';
  const seed = index * 1.3;
  const dist = (wide ? 130 : 60) + (index % 3) * 30;
  const elev = (wide ? 55 : 24) + (index % 4) * 10;
  const dirSign = index % 2 ? 1 : -1;
  scene.cameraDriver = (camera, dt) => {
    t += dt;
    const az = seed + dirSign * t * 0.05;
    const cx = clearing.x, cz = clearing.z;
    const x = cx + Math.sin(az) * dist, z = cz + Math.cos(az) * dist;
    const y = Math.max(surfaceY(x, z) + elev, canopyTop(x, z, 18) + 6);
    camera.position.set(x, y, z);
    // Look across the site toward the horizon, never straight down.
    camera.lookAt(cx - Math.sin(az) * dist * 0.5, surfaceY(cx, cz) + 10, cz - Math.cos(az) * dist * 0.5);
  };
}

/**
 * Resolve a cue's `focus: 'speciesX'` to the live population it names — the
 * SAME role-based pick the script's cast used, so words and pictures agree.
 */
function filmTarget(scene, focus) {
  if (!focus || !/^species[A-F]$/.test(focus)) return null;
  const cast = (scene._ep2Cast ??= principalCast(scene.world.fauna ?? []));
  const spec = cast[focus.slice(-1)];
  if (!spec) return null;
  return (scene.fauna?.populations ?? []).find((p) => p.genome.species === spec.species) ?? null;
}

// --- The director ---------------------------------------------------------
let cueIndex = 0;
const director = async (cue) => {
  if (cue.scene === 'surface' && surfaceReady && surfaceReady !== 'dead') await surfaceReady;
  if (cue.scene === 'surface' && surfaceReady === 'dead') {
    // Ocean world with no landing site: hold in orbit rather than crash.
    await stage.activate('orbit');
    driveOrbit(stage.active, { phase: 'orbit' });
  } else {
    await stage.activate(cue.scene);
  }
  const s = stage.active;
  const dir = cue.direct ?? {};
  if (s instanceof SoupScene && dir.phase) s.setPhase(dir.phase);
  else if (s instanceof OrbitScene) driveOrbit(s, dir);
  else if (s instanceof SurfaceScene) {
    // Deep time: cues carry their era; anything without one (Acts 4–5) plays
    // on the finished world. The descent and shallows land before life exists.
    s.setEra(dir.era ?? 5);
    driveSurface(s, dir, cueIndex);
  }
  else if (s instanceof SystemScene) {
    s.setPhase?.('reveal');
    if (typeof dir.focus === 'number' && dir.focus >= 0) s.focus?.(dir.focus);
  }
  cueIndex++;
};

const timeline = new Timeline(script, narrator, director);
timeline.onAdvance = (i) => { els.progress.textContent = `${i + 1} / ${script.cues.length}`; };
timeline.onComplete = () => {
  els.caption.classList.remove('show');
  els.progress.textContent = 'end';
  els.replay.hidden = false;
};

// Boot the first scene so there is something behind the start button.
await stage.activate(living ? 'orbit' : 'system');
if (living) driveOrbit(stage.active, { phase: 'orbit' });
stage.start();

els.start.addEventListener('click', async () => {
  els.start.hidden = true;
  await timeline.play();
});
els.replay.addEventListener('click', () => { location.href = location.pathname; });

window.__ep2 = { stage, narrator, timeline, cosmos, world, script, director };
