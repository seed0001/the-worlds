import { Stage } from '../core/Stage.js';
import { Cosmos } from '../cosmos/Cosmos.js';
import { buildEpisode1Script } from './narration.js';
import { Narrator } from './Narrator.js';
import { Timeline } from './Timeline.js';
import { BigBangScene } from './BigBangScene.js';
import { SystemScene } from './SystemScene.js';

// Episode 1, assembled. A fresh universe every load (unless a ?seed= pins one),
// a script generated from that universe's real chemistry, and a timeline that
// speaks it over two visual stages. Playback waits for a click — browsers won't
// let a page talk until the viewer has asked it to.

const params = new URLSearchParams(location.search);
const seed = params.get('seed') ?? Math.random().toString(36).slice(2, 10);

const cosmos = new Cosmos(seed);
const script = buildEpisode1Script(cosmos);

const els = {
  caption: document.getElementById('caption'),
  title: document.getElementById('title-card'),
  titleMain: document.getElementById('title-main'),
  titleSub: document.getElementById('title-sub'),
  begin: document.getElementById('begin'),
  progress: document.getElementById('progress'),
  mute: document.getElementById('mute'),
  replay: document.getElementById('replay'),
};

els.titleMain.textContent = script.title;
els.titleSub.textContent = script.subtitle;

const stage = new Stage();
const scenes = {
  bigbang: new BigBangScene(cosmos),
  system: new SystemScene(cosmos),
};
stage.register('bigbang', scenes.bigbang);
stage.register('system', scenes.system);

let currentScene = null;
async function ensureScene(name) {
  if (name && name !== currentScene) {
    await stage.activate(name);
    currentScene = name;
  }
}

// The director: translate a cue's scene + direct instruction into visuals.
async function director(cue) {
  await ensureScene(cue.scene ?? currentScene ?? 'bigbang');
  const active = stage.active;
  const dir = cue.direct;
  if (!dir) return;
  if (dir.phase) active.setPhase?.(dir.phase);
  if (dir.verdict != null && typeof dir.focus === 'number') active.verdict?.(dir.focus, dir.verdict);
  else if (typeof dir.focus === 'number') active.focus?.(dir.focus);
}

let captionTimer = null;
const narrator = new Narrator((text) => {
  els.caption.textContent = text;
  els.caption.classList.add('show');
  clearTimeout(captionTimer);
});

const timeline = new Timeline(script, narrator, director);
timeline.onAdvance = (i) => {
  els.progress.textContent = `${i + 1} / ${script.cues.length}`;
};
timeline.onComplete = () => {
  els.caption.classList.remove('show');
  els.replay.hidden = false;
};

async function begin() {
  els.title.classList.add('gone');
  await ensureScene('bigbang');
  stage.start();
  // A beat of black-and-starlight before the first word.
  await narrator.pause(1.2);
  timeline.play();
}

els.begin.addEventListener('click', begin, { once: true });

els.mute.addEventListener('click', () => {
  const muted = !narrator.muted;
  narrator.setMuted(muted);
  els.mute.textContent = muted ? 'unmute' : 'mute';
  els.mute.dataset.muted = String(muted);
});

els.replay.addEventListener('click', () => {
  location.reload();
});

// Pre-show the void behind the title card.
ensureScene('bigbang').then(() => {
  stage.start();
});

// Console handle for tuning.
window.__doc = { cosmos, script, stage, timeline };
console.log(`%c${script.title}`, 'font-weight:bold', '\n' + cosmos.describe().planets
  .map((p) => `  P${p.index + 1} ${p.name} — ${p.biome}, ${p.tempC}°C${p.habitable ? '  ← LIFE' : ''}`)
  .join('\n'));
