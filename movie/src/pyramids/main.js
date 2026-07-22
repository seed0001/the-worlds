import { Stage } from '../core/Stage.js';
import { Narrator } from '../doc/Narrator.js';
import { Timeline } from '../doc/Timeline.js';
import { PlateauScene } from './scenes/PlateauScene.js';
import { WorksiteScene } from './scenes/WorksiteScene.js';
import { RiseScene } from './scenes/RiseScene.js';
import { LegacyScene } from './scenes/LegacyScene.js';
import { buildPyramidsScript } from './narration.js';

// The Pyramids — a scene engine, listed alongside the others on the hub.
//
// Same spine as every engine here (Stage / Narrator / Timeline / cue-director),
// and like Apollo and Chernobyl the script is fixed history, not a seeded
// generation. Four scenes — the bare plateau, the ground-level worksite, the
// time-lapse rise (the spine), and the legacy — and the director routes each
// cue's `scene` to the right one. Documentary voice is Andrew.

const els = {
  caption: document.getElementById('caption'),
  progress: document.getElementById('progress'),
  start: document.getElementById('start'),
  replay: document.getElementById('replay'),
};

const script = buildPyramidsScript();

const stage = new Stage();
const narrator = new Narrator((text) => {
  els.caption.textContent = text;
  els.caption.classList.add('show');
});

const plateau = new PlateauScene();
const work = new WorksiteScene();
const rise = new RiseScene();
const legacy = new LegacyScene();
stage.register('plateau', plateau);
stage.register('work', work);
stage.register('rise', rise);
stage.register('legacy', legacy);

const readyOf = {
  plateau: plateau.enter().catch((e) => console.warn('[pyramids] plateau prewarm failed:', e)),
  work: work.enter().catch((e) => console.warn('[pyramids] work prewarm failed:', e)),
  rise: rise.enter().catch((e) => console.warn('[pyramids] rise prewarm failed:', e)),
  legacy: legacy.enter().catch((e) => console.warn('[pyramids] legacy prewarm failed:', e)),
};
const scenes = { plateau, work, rise, legacy };

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

// Boot on the establishing plateau behind the start button.
await stage.activate('plateau');
await readyOf.plateau;
plateau.beat({ plateau: 'dawn', cam: 'wide' });
stage.start();

els.start.addEventListener('click', async () => {
  els.start.hidden = true;
  await timeline.play();
});
els.replay?.addEventListener('click', () => { location.href = location.pathname; });

window.__pyramids = { stage, narrator, timeline, script, scenes, director };
