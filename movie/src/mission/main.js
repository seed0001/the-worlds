import { Stage } from '../core/Stage.js';
import { Narrator } from '../doc/Narrator.js';
import { Timeline } from '../doc/Timeline.js';
import { LaunchScene } from './scenes/LaunchScene.js';
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
stage.register('launch', launch);
const launchReady = launch.enter().catch((err) => {
  console.warn('[apollo] launch prewarm failed:', err);
});

const director = async (cue) => {
  await stage.activate(cue.scene);
  if (cue.scene === 'launch') {
    if (launchReady) await launchReady;
    launch.beat(cue.direct ?? {});
  }
};

const timeline = new Timeline(script, narrator, director);
timeline.onAdvance = (i) => { els.progress.textContent = `${i + 1} / ${script.cues.length}`; };
timeline.onComplete = () => {
  els.caption.classList.remove('show');
  els.progress.textContent = 'orbit';
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

window.__apollo = { stage, narrator, timeline, script, launch, director };
