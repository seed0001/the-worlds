import { Stage } from '../core/Stage.js';
import { Narrator } from '../doc/Narrator.js';
import { Timeline } from '../doc/Timeline.js';
import { ExteriorScene } from './scenes/ExteriorScene.js';
import { ControlRoomScene } from './scenes/ControlRoomScene.js';
import { CoreCutawayScene } from './scenes/CoreCutawayScene.js';
import { AftermathScene } from './scenes/AftermathScene.js';
import { buildChernobylScript } from './narration.js';

// Chernobyl — a scene engine, listed alongside the others on the hub.
//
// Same spine as every engine here (Stage / Narrator / Timeline / cue-director),
// but like Apollo the script is fixed history, not a seeded generation. Four
// scenes — the plant exterior, the control room, the reactor cutaway (the
// spine), and the aftermath — and the director routes each cue's `scene` to the
// right one. Documentary voice is Andrew, the Episode 1 / Apollo narrator.

const els = {
  caption: document.getElementById('caption'),
  progress: document.getElementById('progress'),
  start: document.getElementById('start'),
  replay: document.getElementById('replay'),
};

const script = buildChernobylScript();

const stage = new Stage();
const narrator = new Narrator((text) => {
  els.caption.textContent = text;
  els.caption.classList.add('show');
});

const exterior = new ExteriorScene();
const control = new ControlRoomScene();
const cutaway = new CoreCutawayScene();
const aftermath = new AftermathScene();
stage.register('exterior', exterior);
stage.register('control', control);
stage.register('cutaway', cutaway);
stage.register('aftermath', aftermath);

// Warm every scene so cuts between them don't stall on first build.
const readyOf = {
  exterior: exterior.enter().catch((e) => console.warn('[chernobyl] exterior prewarm failed:', e)),
  control: control.enter().catch((e) => console.warn('[chernobyl] control prewarm failed:', e)),
  cutaway: cutaway.enter().catch((e) => console.warn('[chernobyl] cutaway prewarm failed:', e)),
  aftermath: aftermath.enter().catch((e) => console.warn('[chernobyl] aftermath prewarm failed:', e)),
};
const scenes = { exterior, control, cutaway, aftermath };

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

// Boot on the establishing night exterior behind the start button.
await stage.activate('exterior');
await readyOf.exterior;
exterior.beat({ ext: 'night', cam: 'wide' });
stage.start();

els.start.addEventListener('click', async () => {
  els.start.hidden = true;
  await timeline.play();
});
els.replay?.addEventListener('click', () => { location.href = location.pathname; });

window.__chernobyl = { stage, narrator, timeline, script, scenes, director };
