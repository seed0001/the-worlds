import { Stage } from '../core/Stage.js';
import { Narrator } from '../doc/Narrator.js';
import { Timeline } from '../doc/Timeline.js';
import { HighwayScene } from './scenes/HighwayScene.js';
import { PierScene } from './scenes/PierScene.js';
import { buildRoute66Script } from './narration.js';

// Route 66 — a scene engine, listed alongside the others on the hub.
//
// Same spine as every engine here (Stage / Narrator / Timeline / cue-director),
// and like Apollo, Chernobyl and the Pyramids the script is fixed history, not
// a seeded generation. Two scenes: the drive itself — eight states of scrolling
// world with the flash-forward mechanic inside it — and the pier at the end.
// Documentary voice is Andrew.

const els = {
  caption: document.getElementById('caption'),
  progress: document.getElementById('progress'),
  start: document.getElementById('start'),
  replay: document.getElementById('replay'),
};

const script = buildRoute66Script();

const stage = new Stage();
const narrator = new Narrator((text) => {
  els.caption.textContent = text;
  els.caption.classList.add('show');
});

const highway = new HighwayScene();
const pier = new PierScene();
stage.register('highway', highway);
stage.register('pier', pier);

const readyOf = {
  highway: highway.enter().catch((e) => console.warn('[route66] highway prewarm failed:', e)),
  pier: pier.enter().catch((e) => console.warn('[route66] pier prewarm failed:', e)),
};
const scenes = { highway, pier };

const director = async (cue) => {
  await stage.activate(cue.scene);
  await readyOf[cue.scene];
  scenes[cue.scene]?.beat(cue.direct ?? {});
};

const timeline = new Timeline(script, narrator, director);
timeline.onAdvance = (i) => { els.progress.textContent = `${i + 1} / ${script.cues.length}`; };
timeline.onComplete = () => {
  els.caption.classList.remove('show');
  els.progress.textContent = 'end';
  els.replay.hidden = false;
};

// Boot on the highway behind the start button: sunrise, the city behind.
await stage.activate('highway');
await readyOf.highway;
highway.beat({ state: 'illinois', sign: false, cam: 'chase', time: 0.05 });
stage.start();

els.start.addEventListener('click', async () => {
  els.start.hidden = true;
  await timeline.play();
});
els.replay?.addEventListener('click', () => { location.href = location.pathname; });

window.__route66 = { stage, narrator, timeline, script, scenes, director };
