import { ERA, PYRAMIDS, SPHINX, BUILD, WORKFORCE, NILE, LEGACY } from './giza.js';

// The narration — authored, grounded, documentary voice (Andrew, as Apollo and
// Chernobyl). A cue is one spoken beat: { text, scene, direct, hold }. `scene`
// names which engine scene shows it — 'plateau', 'work', 'rise', 'legacy' — and
// `direct` moves that scene's state machine (its build phase and camera).
//
// The rise is the spine. The workforce is shown at its true epic scale but
// narrated honestly: tens of thousands compelled and fed by the state, not the
// enslaved multitudes of legend.

export function buildPyramidsScript() {
  const K = PYRAMIDS.khufu;
  const cues = [];
  const say = (text, scene, direct = {}, hold = 8) => cues.push({ text, scene, direct, hold });

  // === ACT 1 — THE PLATEAU & THE AMBITION ===================================
  say(
    `${cap(ERA.place)}, ${ERA.when}. Under ${ERA.dynasty}, the pharaoh ${ERA.pharaoh} ` +
    `gives an order, and the largest building project the world has yet seen ` +
    `begins on this bare shelf of rock above the river. Nothing stands here yet. ` +
    `Everything is about to.`,
    'plateau', { plateau: 'dawn', cam: 'wide' }, 10,
  );
  say(
    `First, lines in the sand. Surveyors lay out a square ${Math.round(K.baseM)} ` +
    `metres to a side and align it, almost perfectly, to the four points of the ` +
    `compass. Onto that square will go some ${(K.blocks / 1e6).toFixed(1)} million ` +
    `blocks of stone.`,
    'plateau', { cam: 'site' }, 9,
  );
  say(
    `Everything turns on the river. Each year the Nile floods — ${NILE.flood} — and ` +
    `${NILE.role}. The same flood drowns the fields and frees the farmers, and the ` +
    `workforce swells with them.`,
    'plateau', { plateau: 'day', cam: 'river' }, 9,
  );

  // === ACT 2 — THE STONE ====================================================
  say(
    `The core is ${BUILD.coreStone}. The fine white skin will be ${BUILD.casingStone}; ` +
    `the hardest stone, granite, comes from ${BUILD.graniteFrom}. It is cut with ` +
    `${BUILD.tools} — no iron, no pulley, no wheel worth the name.`,
    'work', { work: 'quarry', cam: 'quarry' }, 10,
  );
  say(
    `And it is raised the only way it can be: on ${BUILD.ramps}. The ramp grows as ` +
    `the pyramid grows, and everything — every block — goes up its slope.`,
    'work', { cam: 'ramp' }, 8,
  );

  // === ACT 3 — THE HAUL =====================================================
  say(
    `Here is the work itself: a single block, ${K.avgBlockTonnes} tonnes of it, ` +
    `dragged on a wooden sledge by a gang on ropes. Not the enslaved thousands of ` +
    `later legend — ${WORKFORCE.myth}, ${WORKFORCE.organisation}.`,
    'work', { work: 'haul', cam: 'haul' }, 10,
  );
  say(
    `And a trick that halves the labour: ${BUILD.move}. We know they did it — ` +
    `${BUILD.waterEvidence}. Wet sand is firm sand, and the sledge slides.`,
    'work', { work: 'water', cam: 'water' }, 9,
  );

  // === ACT 4 — THE RISE (the time-lapse) ====================================
  say(
    `Now stand back, and let the years run. This will take about ` +
    `${K.yearsToBuild} of them. Course by course, the Great Pyramid begins to climb.`,
    'rise', { rise: 'ground', cam: 'aerial' }, 8,
  );
  say(
    `Day after day, flood after flood, the sun wheeling overhead — twenty years ` +
    `pressed into a breath. Khufu's pyramid rises first and highest; the ramp ` +
    `climbs its flank with it.`,
    'rise', { rise: 'rising', cam: 'orbit' }, 9,
  );
  say(
    `Beside it, in the reigns that follow, two more: ${PYRAMIDS.khafre.name} on its ` +
    `higher ground, and smaller ${PYRAMIDS.menkaure.name}. Tens of thousands of ` +
    `people, moving mountains one block at a time.`,
    'rise', { rise: 'higher', cam: 'hero' }, 9,
  );
  say(
    `The last block goes on the top: the capstone, ${Math.round(K.heightM)} metres ` +
    `above the sand. It is the tallest thing human beings will build for the next ` +
    `${K.tallestForYears.toLocaleString()} years.`,
    'rise', { rise: 'cap', cam: 'low' }, 9,
  );
  say(
    `Then the finish. The white casing is dressed smooth from the top down, until ` +
    `every step disappears into four flat, gleaming faces — a mountain of polished ` +
    `stone, catching the sun like a mirror over the desert.`,
    'rise', { rise: 'casing', cam: 'hero' }, 10,
  );

  // === ACT 5 — LEGACY =======================================================
  say(
    `This is how they stood — as almost no living person today has ever seen them: ` +
    `finished, sheathed, blazing white. The pharaoh's answer to death, made out of ` +
    `the desert itself.`,
    'legacy', { legacy: 'gleaming', cam: 'wide' }, 9,
  );
  say(
    `And keeping watch below them, carved from a single ridge of the plateau, ` +
    `${SPHINX.name} — a lion's body, a king's face, ${SPHINX.lengthM} metres long, ` +
    `staring east into every sunrise.`,
    'legacy', { cam: 'sphinx' }, 9,
  );
  say(
    `Then time. The gleaming casing is stripped away for other cities; the cores ` +
    `weather to bare steps; the summits crumble. But ${LEGACY.standingYears.toLocaleString()} ` +
    `years later, ${LEGACY.today} — still, by a wide margin, the oldest of the ` +
    `ancient wonders, and the only one still standing.`,
    'legacy', { legacy: 'today', cam: 'wide' }, 12,
  );

  return { cues };
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
