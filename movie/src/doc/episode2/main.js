import * as THREE from 'three';
import { Stage } from '../../core/Stage.js';
import { Narrator } from '../Narrator.js';
import { Timeline } from '../Timeline.js';
import { Cosmos } from '../../cosmos/Cosmos.js';
import { OrbitScene } from '../../scenes/OrbitScene.js';
import { SurfaceScene } from '../../scenes/SurfaceScene.js';
import { SystemScene } from '../SystemScene.js';
import { SoupScene } from '../SoupScene.js';
import { buildEpisode2Script, buildEpisode2Gate } from './narration.js';

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

function driveSurface(scene, dir, index) {
  const ground = (x, z) => scene.surface.heightAt(x, z);
  const sun = scene.sunDirection ?? new THREE.Vector3(0.35, 0.42, 0.84);
  let t = 0;

  if (dir.phase === 'descent') {
    // Glide down out of the sky to just above the landing site, looking toward
    // the sun. Kept above the canopy until the last stretch.
    scene.cameraDriver = (camera, dt) => {
      t += dt;
      const k = ss(0, 7, t);
      const y = ground(0, 0) + 3 + (1 - k) * 220;
      camera.position.set(0, y, (1 - k) * 40);
      camera.lookAt(sun.x * 400, ground(0, 0) + 20 + (1 - k) * 60, sun.z * 400);
    };
    return;
  }
  if (dir.phase === 'shallows') {
    scene.cameraDriver = (camera, dt) => {
      t += dt;
      camera.position.set(Math.sin(t * 0.15) * 4, ground(0, 0) + 2.2, 6);
      camera.lookAt(40, ground(0, 0) + 6, 40);
    };
    return;
  }
  // Acts 3–5: a slow cinematic look around the living site, varied per cue so
  // the tour never sits on one framing. (Real per-zone sites + the shot library
  // land in later milestones; the facts spoken are already honest.)
  const seed = index * 1.3;
  const dist = 26 + (index % 4) * 10;
  const elev = 3 + (index % 3) * 4;
  const dirSign = index % 2 ? 1 : -1;
  scene.cameraDriver = (camera, dt) => {
    t += dt;
    const az = seed + dirSign * t * 0.06;
    const cx = Math.sin(seed) * 30, cz = Math.cos(seed) * 30;
    const x = cx + Math.sin(az) * dist, z = cz + Math.cos(az) * dist;
    camera.position.set(x, ground(x, z) + elev, z);
    camera.lookAt(cx, ground(cx, cz) + 4, cz);
  };
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
  else if (s instanceof SurfaceScene) driveSurface(s, dir, cueIndex);
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
