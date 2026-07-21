import { Stage } from '../core/Stage.js';
import { Narrator } from '../doc/Narrator.js';
import { Timeline } from '../doc/Timeline.js';
import { LaunchScene } from './scenes/LaunchScene.js';
import { SpaceScene } from './scenes/SpaceScene.js';
import { MoonSurfaceScene } from './scenes/MoonSurfaceScene.js';
import { EarthReturnScene } from './scenes/EarthReturnScene.js';
import { buildMissionScript } from './narration.js';

// Apollo — the mission engine's player.
//
// Same spine as The Worlds (Stage / Narrator / Timeline / cue-director), but the
// script is fixed history, not a seeded generation. Phase 1 registers the launch
// scene; later phases add the space, surface, and return scenes and the director
// routes each cue's `scene` to the right one. Documentary voice is Andrew — the
// Episode 1 narrator — which suits a NASA piece.

const els = {
  caption: document.getElementById('caption'),
  progress: document.getElementById('progress'),
  start: document.getElementById('start'),
  replay: document.getElementById('replay'),
};

const script = buildMissionScript();

const stage = new Stage();
const narrator = new Narrator((text) => {
  els.caption.textContent = text;
  els.caption.classList.add('show');
});

const launch = new LaunchScene();
const space = new SpaceScene();
const moon = new MoonSurfaceScene();
const earth = new EarthReturnScene();
stage.register('launch', launch);
stage.register('space', space);
stage.register('moon', moon);
stage.register('return', earth);
const launchReady = launch.enter().catch((err) => {
  console.warn('[apollo] launch prewarm failed:', err);
});
// Warm the later scenes too so cuts to them don't stall on first build.
const spaceReady = space.enter().catch((err) => console.warn('[apollo] space prewarm failed:', err));
const moonReady = moon.enter().catch((err) => console.warn('[apollo] moon prewarm failed:', err));
const earthReady = earth.enter().catch((err) => console.warn('[apollo] return prewarm failed:', err));
const scenes = { launch, space, moon, return: earth };
const readies = { launch: () => launchReady, space: () => spaceReady, moon: () => moonReady, return: () => earthReady };

const director = async (cue) => {
  await stage.activate(cue.scene);
  const r = readies[cue.scene]?.();
  if (r) await r;
  scenes[cue.scene]?.beat(cue.direct ?? {});
};

const timeline = new Timeline(script, narrator, director);
timeline.onAdvance = (i) => { els.progress.textContent = `${i + 1} / ${script.cues.length}`; };
timeline.onComplete = () => {
  els.caption.classList.remove('show');
  els.progress.textContent = 'home';
  els.replay.hidden = false;
};

// Boot the launch scene behind the start button so there's a live pad to look at.
await stage.activate('launch');
if (launchReady) await launchReady;
launch.beat({ launch: 'pad', cam: 'pad' });
stage.start();

els.start.addEventListener('click', async () => {
  els.start.hidden = true;
  await timeline.play();
});
els.replay?.addEventListener('click', () => { location.href = location.pathname; });

window.__apollo = { stage, narrator, timeline, script, launch, space, moon, earth, director };
