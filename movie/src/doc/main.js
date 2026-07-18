import { Stage } from '../core/Stage.js';
import { Cosmos } from '../cosmos/Cosmos.js';
import { buildEpisode1Script } from './narration.js';
import { Narrator } from './Narrator.js';
import { Timeline } from './Timeline.js';
import { BigBangScene } from './BigBangScene.js';
import { SystemScene } from './SystemScene.js';
import { Teaser } from './teaser.js';

// The site. One page carries the whole experience:
//
//   splash  — what this is, your seed (shown big — it IS your account), a slot
//             to enter a returning seed, the trailer, and Begin.
//   trailer — ~90 seconds on a fixed showcase seed: the pitch.
//   episode — Episode 1, generated live for whichever seed the splash shows.
//
// Everything happens on this one page so the first click is also the audio
// permission — the film starts with its voice, no second click needed.

const els = {
  caption: document.getElementById('caption'),
  title: document.getElementById('title-card'),
  seedValue: document.getElementById('seed-value'),
  seedInput: document.getElementById('seed-input'),
  seedGo: document.getElementById('seed-go'),
  shuffle: document.getElementById('shuffle'),
  universeLine: document.getElementById('universe-line'),
  begin: document.getElementById('begin'),
  trailer: document.getElementById('trailer'),
  skip: document.getElementById('skip'),
  teaserCard: document.getElementById('teaser-card'),
  progress: document.getElementById('progress'),
  mute: document.getElementById('mute'),
  replay: document.getElementById('replay'),
  loading: document.getElementById('loading'),
};

const randomSeed = () => Math.random().toString(36).slice(2, 10);

let seed = new URLSearchParams(location.search).get('seed') ?? randomSeed();

const stage = new Stage();

let captionTimer = null;
const narrator = new Narrator((text) => {
  els.caption.textContent = text;
  els.caption.classList.add('show');
  clearTimeout(captionTimer);
});

// --- Loading state ----------------------------------------------------------

function setLoading(on, message = 'generating…') {
  els.loading.hidden = !on;
  els.loading.textContent = message;
}

/** Let the loading text actually paint before blocking the main thread. */
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

// --- The episode: built fresh for whichever seed the splash shows -----------

let episode = null; // { seed, cosmos, script, timeline }

async function buildEpisode() {
  if (episode?.seed === seed) return;
  setLoading(true, 'generating your universe…');
  await nextPaint();

  // Tear down the previous universe's stages.
  for (const name of ['bigbang', 'system']) {
    const old = stage.scenes.get(name);
    if (old) {
      stage.scenes.delete(name);
      old.dispose?.();
    }
  }
  stage.active = null;

  const cosmos = new Cosmos(seed);
  const script = buildEpisode1Script(cosmos);
  stage.register('bigbang', new BigBangScene(cosmos));
  stage.register('system', new SystemScene(cosmos));

  let currentScene = null;
  const ensureScene = async (name) => {
    if (name && name !== currentScene) {
      await stage.activate(name);
      currentScene = name;
    }
  };

  const director = async (cue) => {
    await ensureScene(cue.scene ?? currentScene ?? 'bigbang');
    const active = stage.active;
    const dir = cue.direct;
    if (!dir) return;
    if (dir.phase) active.setPhase?.(dir.phase);
    if (dir.verdict != null && typeof dir.focus === 'number') active.verdict?.(dir.focus, dir.verdict);
    else if (typeof dir.focus === 'number') active.focus?.(dir.focus);
  };

  const timeline = new Timeline(script, narrator, director);
  timeline.onAdvance = (i) => {
    els.progress.textContent = `${i + 1} / ${script.cues.length}`;
  };
  timeline.onComplete = () => {
    els.caption.classList.remove('show');
    els.replay.hidden = false;
  };

  episode = { seed, cosmos, script, timeline };

  // The void sits behind the splash.
  await stage.activate('bigbang');
  stage.start();

  console.log(`%c${script.title}`, 'font-weight:bold', '\n' + cosmos.describe().planets
    .map((p) => `  P${p.index + 1} ${p.name} — ${p.biome}, ${p.tempC}°C${p.habitable ? '  ← LIFE' : ''}`)
    .join('\n'));

  setLoading(false);
}

// --- Splash -----------------------------------------------------------------

function renderSplash() {
  els.seedValue.textContent = seed;
  const d = episode?.cosmos.describe();
  els.universeLine.textContent = d ? `the ${d.star.name} system awaits` : ' ';
}

async function setSeed(next) {
  const clean = String(next ?? '').trim();
  if (!clean) return;
  seed = clean;
  history.replaceState(null, '', `?${new URLSearchParams({ seed })}`);
  await buildEpisode();
  renderSplash();
}

els.shuffle.addEventListener('click', () => setSeed(randomSeed()));
els.seedGo.addEventListener('click', () => setSeed(els.seedInput.value));
els.seedInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') setSeed(els.seedInput.value);
});

// --- Episode playback -------------------------------------------------------

async function begin() {
  markVisited();
  await buildEpisode();
  els.title.classList.add('gone');
  // A beat of black-and-starlight before the first word.
  await narrator.pause(1.2);
  episode.timeline.play();
}

els.begin.addEventListener('click', begin);

els.replay.addEventListener('click', () => {
  location.href = location.pathname; // a fresh seed, a fresh universe
});

els.mute.addEventListener('click', () => {
  const muted = !narrator.muted;
  narrator.setMuted(muted);
  els.mute.textContent = muted ? 'unmute' : 'mute';
  els.mute.dataset.muted = String(muted);
});

// --- Trailer ----------------------------------------------------------------

const teaser = new Teaser(stage, narrator, {
  onCard: (show) => {
    els.teaserCard.hidden = false;
    els.teaserCard.classList.toggle('show', show);
  },
});

let teaserRunning = false;

async function playTrailer() {
  if (teaserRunning) return;
  teaserRunning = true;
  markVisited();

  setLoading(true, 'building the showcase universe…');
  await nextPaint();
  try {
    teaser.build();
  } catch (err) {
    console.error('[teaser] build failed:', err);
    setLoading(false);
    teaserRunning = false;
    return;
  }
  setLoading(false);

  els.title.classList.add('gone');
  els.skip.hidden = false;
  els.progress.textContent = 'trailer';
  stage.start();

  await teaser.play();

  // Done or skipped: back to the splash over this seed's own void.
  els.skip.hidden = true;
  els.teaserCard.classList.remove('show');
  els.caption.classList.remove('show');
  els.progress.textContent = '';
  teaser.dispose();
  await stage.activate('bigbang');
  els.title.classList.remove('gone');
  teaserRunning = false;
}

els.trailer.addEventListener('click', playTrailer);
els.skip.addEventListener('click', () => teaser.stop());

// --- First visit ------------------------------------------------------------

function markVisited() {
  try {
    localStorage.setItem('worlds.visited', '1');
  } catch { /* private mode */ }
  els.trailer.classList.remove('pulse');
}

try {
  if (!localStorage.getItem('worlds.visited')) els.trailer.classList.add('pulse');
} catch { /* private mode */ }

// --- Boot -------------------------------------------------------------------

await buildEpisode();
renderSplash();

// Console handle for tuning.
window.__doc = { stage, narrator, teaser, get episode() { return episode; } };
