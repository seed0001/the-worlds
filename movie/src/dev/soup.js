import { Stage } from '../core/Stage.js';
import { Narrator } from '../doc/Narrator.js';
import { Timeline } from '../doc/Timeline.js';
import { SoupScene } from '../doc/SoupScene.js';
import { Cosmos } from '../cosmos/Cosmos.js';
import { World } from '../world/World.js';

// Dev set-piece for Episode 2, Act 2 — plays the soup act on its own so the
// scene can be built and tuned before the whole episode is wired. Same pieces
// the real episode uses (Stage, Narrator, Timeline), just a hand-written script
// covering the eight beats. Open /soup.html?seed=verdant.
//
// The narration here is the V1 variant of each cue from the assembled script
// (docs/episodes/episode-2/dialogue.md); the real buildEpisode2Script will
// seed-pick among all variants once the episode is wired.

const seed = new URLSearchParams(location.search).get('seed') ?? 'verdant';

// Pick the world exactly as Episode 2 will: the living world if the seed has
// one, and its element budget for the pantry line.
const cosmos = new Cosmos(seed);
const living = cosmos.livingWorlds[0];
const world = living ? living.world : new World(seed);
const heavies = cosmos.budget.fractions
  .filter((f) => !['H', 'He'].includes(f.sym))
  .slice(0, 3)
  .map((f) => f.name);
const list = (names) =>
  names.length <= 1 ? names[0] ?? '' : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
const pantry = list(heavies);

const els = {
  caption: document.getElementById('caption'),
  progress: document.getElementById('progress'),
  start: document.getElementById('start'),
  world: document.getElementById('world'),
};
els.world.textContent = `${world.full ?? seed} — soup`;

const stage = new Stage();
const narrator = new Narrator((text) => {
  els.caption.textContent = text;
  els.caption.classList.add('show');
});

const soup = new SoupScene(world);
stage.register('soup', soup);

const cue = (text, phase, hold) => ({ text, scene: 'soup', direct: { phase }, hold });

const script = {
  cues: [
    cue(`First, take stock of the pantry — because life cannot use what the universe never made. Beyond hydrogen, this world's rock and water are richest in ${pantry}. That short list is the entire toolkit. Everything that follows is built from exactly this, and nothing else.`, 'pantry', 7),
    cue('And at first, chemistry simply happens. Small molecules assemble, come apart, assemble again in slightly different ways — building nothing that lasts. This goes on for a length of time the human mind is not built to hold.', 'monomers', 6),
    cue('And then, once, in all that churning, something different. A molecule assembles that happens to be a template for itself — it pulls the loose parts of the pool into its own shape, and makes a copy. That is all. But that is everything. Because now there are two, and both of them can do it again.', 'replicator', 8),
    cue('The copies are not perfect. Every so often one comes out slightly wrong — and a wrong copy that happens to copy faster leaves more descendants than its neighbours. Do that for a million generations and the pool fills with the best copiers. No one is choosing. It is only arithmetic.', 'selection', 7),
    cue('Then oil does what oil does in water: it beads. A film of it closes into a bubble — and for the first time in the history of the universe, there is an inside and an outside. The first boundary. The first faint idea of a self.', 'membrane', 7),
    cue('Now put the two together. A replicator, sealed inside a membrane, drawing the chemistry of the pool in through its wall to build more of itself. It copies. It feeds. It holds a border against the world. That is a cell — the first one.', 'cell', 7),
    cue('From that first cell, the line divides. Most of its descendants will spend the coming ages learning to build: walls, then bodies, then the whole tree of life. But a few take the other road. They never build a body at all — they stay small, and learn to live inside the ones that did. Remember them.', 'split', 7),
    cue('And then there are numbers the pool can no longer hold apart. They spread across the wet rock in their billions until the shallows change colour — a stain you could see from orbit. The first life large enough to be visible from space.', 'mats', 8),
  ],
};

const director = async (c) => {
  await stage.activate(c.scene);
  if (c.direct?.phase) stage.active.setPhase?.(c.direct.phase);
};

const timeline = new Timeline(script, narrator, director);
timeline.onAdvance = (i) => {
  els.progress.textContent = `${i + 1} / ${script.cues.length}`;
};
timeline.onComplete = () => {
  els.caption.classList.remove('show');
  els.progress.textContent = 'done';
};

await stage.activate('soup');
stage.start();

// First click is the audio permission — the act starts with its voice.
els.start.addEventListener('click', () => {
  els.start.hidden = true;
  timeline.play();
});

window.__soup = { stage, soup, timeline, narrator };
