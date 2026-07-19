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
// and drives its camera. The surface stage spawns the narration's principal
// cast (fauna/cast.js) — zone-built bodies at staged climate sites — so a
// species cue films the exact population the words describe, a site cue flies
// to the real place that population lives, and the Act 4 chain (startle,
// stampede, rush, rise, settle) fires on those same animals.

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
  const surface = new SurfaceScene(world, { cinematic: true, castSeed: cosmos.seed });
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

// The landing patch is unbroken forest with no clearance around the site — the
// same wall the teaser's descent hit (see doc/teaser.js): fly a camera into the
// canopy and the frame fills with unlit leaves. Every "black water" shot in
// this episode was that, not the ocean. So: stage the ground shots around a
// real clearing, and when a framing has to stand off outside it, lift the
// camera above the trees around it instead of shooting through them.
function surfaceStaging(scene) {
  if (scene._ep2Staging) return scene._ep2Staging;
  const trees = scene.flora?.placements ?? [];
  const isClear = (x, z, r) => !trees.some((p) => {
    const dx = p.x - x, dz = p.z - z;
    return dx * dx + dz * dz < r * r;
  });
  let clearing = { x: 0, z: 0 };
  outer:
  for (let r = 0; r <= 400; r += 25) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      const x = Math.sin(a) * r, z = Math.cos(a) * r;
      if (isClear(x, z, 26)) { clearing = { x, z }; break outer; }
    }
  }
  // Top of the canopy near (x, z): the tallest tree standing within `pad`
  // metres, or -Infinity where the ground is open.
  const canopyTop = (x, z, pad) => {
    let top = -Infinity;
    for (const p of trees) {
      const dx = p.x - x, dz = p.z - z;
      if (dx * dx + dz * dz >= pad * pad) continue;
      // One bad placement must not NaN-poison the camera through Math.max.
      const th = p.y + (Number.isFinite(p.h) ? p.h : 24);
      if (Number.isFinite(th) && th > top) top = th;
    }
    return top;
  };
  scene._ep2Staging = { clearing, canopyTop };
  return scene._ep2Staging;
}

function driveSurface(scene, dir, index) {
  const sea = scene.seaLevelLocal ?? scene.surface.bounds?.seaLevelLocal ?? -Infinity;
  // Ground you can stand on: real terrain, but never below the water surface —
  // so a camera anchored to it never sinks under the ocean and goes black.
  const surfaceY = (x, z) => Math.max(scene.surface.heightAt(x, z), sea);
  const sun = scene.sunDirection ?? new THREE.Vector3(0.35, 0.42, 0.84);
  const { clearing, canopyTop } = surfaceStaging(scene);
  let t = 0;

  if (dir.phase === 'descent') {
    // Glide down out of the sky into the clearing, looking toward the sun so
    // the horizon (not dark ground) fills the frame — holding clearance over
    // the canopy until the final drop, so the lens never enters a tree.
    const h = Math.hypot(sun.x, sun.z) || 1;
    const ux = -sun.x / h, uz = -sun.z / h; // approach from down-sun
    scene.cameraDriver = (camera, dt) => {
      t += dt;
      const k = ss(0, 7, t);
      const x = clearing.x + ux * 40 * (1 - k);
      const z = clearing.z + uz * 40 * (1 - k);
      const ground = surfaceY(x, z);
      const clearance = Math.max(0, canopyTop(x, z, 24) + 6 - ground) * Math.min(1, (1 - k) * 3);
      camera.position.set(x, ground + 3 + clearance + (1 - k) * 220, z);
      camera.lookAt(
        x + sun.x * 400,
        surfaceY(clearing.x, clearing.z) + 30 + (1 - k) * 60,
        z + sun.z * 400,
      );
    };
    return;
  }
  if (dir.phase === 'shallows') {
    scene.cameraDriver = (camera, dt) => {
      t += dt;
      const x = clearing.x + Math.sin(t * 0.15) * 4;
      const z = clearing.z + 6;
      camera.position.set(x, surfaceY(x, z) + 2.5, z);
      camera.lookAt(
        clearing.x + sun.x * 200,
        surfaceY(clearing.x, clearing.z) + 12,
        clearing.z + sun.z * 200,
      );
    };
    return;
  }
  // Species cues: the script names an animal, so the camera films THAT animal
  // — the same population the narrator's cast picked, tracked at its live
  // centre exactly like the teaser's creature shots.
  const pop = filmTarget(scene, dir.focus);
  if (pop) {
    const centre = new THREE.Vector3();
    const air = pop.genome.domain === 'air';
    // A solitary animal is filmed as ONE animal — its bandmates are scattered
    // across its zone by design, and the centroid of scattered animals is
    // empty ground the camera would frame instead of a body.
    const solitary = pop.genome.role === 'solitary';
    const size = pop.genome.size ?? 2;
    const dist = air ? 46 : Math.max(13, size * 8);
    const dirSign = index % 2 ? 1 : -1;
    scene.cameraDriver = (camera, dt) => {
      t += dt;
      if (solitary && pop.agents.length) {
        centre.copy(pop.agents[0].pos);
      } else {
        centre.set(0, 0, 0);
        for (const a of pop.agents) centre.add(a.pos);
        centre.divideScalar(Math.max(1, pop.agents.length));
      }
      const az = index * 1.7 + dirSign * t * 0.07;
      const x = centre.x + Math.sin(az) * dist;
      const z = centre.z + Math.cos(az) * dist;
      const ground = surfaceY(x, z);
      // Fliers are filmed from below their cruise height; walkers from just
      // above their own eye line.
      const y = air ? Math.max(centre.y - 10, ground + 5) : ground + 1.6 + size * 0.9;
      camera.position.set(x, y, z);
      camera.lookAt(centre.x, centre.y + (air ? 0 : size * 0.4), centre.z);
    };
    return;
  }

  // Everything else — ecosystem beats, the deep-time eras, the closing vista —
  // is an establishing shot: wide, above the canopy, drifting around the shot's
  // own place, varied per cue so the tour never repeats a framing. A cue that
  // names a staged zone (scrub, highland, interior — or the ridge between the
  // coast and the high ground) orbits THAT site, so the tour actually crosses
  // the patch instead of re-framing the landing clearing.
  const sites = scene.fauna?.sites;
  const at = (() => {
    if (!sites) return clearing;
    if (dir.site === 'ridge') {
      return {
        x: (sites.coast.x + sites.highland.x) / 2,
        z: (sites.coast.z + sites.highland.z) / 2,
      };
    }
    // The coast plays on the landing clearing — same shore, guaranteed open.
    if (dir.site === 'coast') return clearing;
    return sites[dir.site] ?? clearing;
  })();
  const wide = dir.focus === 'world' || dir.site === 'vista';
  const seed = index * 1.3;
  // True aerials. From inside the tree-height zone every establishing shot is
  // mostly the nearest crown (a 22 m tree 37 m out fills half a 42° lens); at
  // this distance and height the same tree is ~5° tall and the site reads as
  // landscape — forest, clearing, herds, horizon.
  const dist = (wide ? 260 : 170) + (index % 3) * 40;
  const elev = (wide ? 110 : 70) + (index % 4) * 15;
  const dirSign = index % 2 ? 1 : -1;
  const cx = at.x, cz = at.z;
  // Scout the shot before flying it: on rolling forested terrain ANY fixed
  // orbit sometimes parks a hillside crown on the sightline, and one crown at
  // 60 m fills half the lens. March the camera→site ray at two dozen azimuths
  // and fly the one with the most clearance over terrain and canopy.
  const targetY = surfaceY(cx, cz) + elev * 0.35;
  let bestAz = seed, bestMargin = -Infinity;
  for (let k = 0; k < 24; k++) {
    const az = seed + (k / 24) * Math.PI * 2;
    const x0 = cx + Math.sin(az) * dist, z0 = cz + Math.cos(az) * dist;
    const y0 = Math.max(surfaceY(x0, z0) + elev, canopyTop(x0, z0, 30) + 10);
    let margin = Infinity;
    for (let f = 0.08; f < 0.92; f += 0.07) {
      const x = x0 + (cx - x0) * f, z = z0 + (cz - z0) * f;
      const ray = y0 + (targetY - y0) * f;
      const blocker = Math.max(surfaceY(x, z) + 2, canopyTop(x, z, 16));
      margin = Math.min(margin, ray - blocker);
    }
    if (margin > bestMargin) { bestMargin = margin; bestAz = az; }
  }
  // Even the best lane can be blocked — a hill 50 m higher than the camera's
  // ground puts an ordinary tree at lens height. Climb by the deficit: the
  // target end of the ray is inside the clearing (clear by construction), so
  // raising the camera raises the whole sightline over the blocker.
  const elevBoost = Math.max(0, 12 - bestMargin);
  scene.cameraDriver = (camera, dt) => {
    t += dt;
    const az = bestAz + dirSign * t * 0.02; // slow drift stays inside the scouted lane
    const x = cx + Math.sin(az) * dist, z = cz + Math.cos(az) * dist;
    const y = Math.max(surfaceY(x, z) + elev + elevBoost, canopyTop(x, z, 30) + 10);
    camera.position.set(x, y, z);
    // Shoot ACROSS the site, not down into it: a gentle tilt keeps the horizon
    // in the top third and the forest on the ground plane.
    camera.lookAt(cx, targetY, cz);
  };
}

/**
 * Act 4's staged events — the chain of cause and effect the narrator follows.
 * Each event cue triggers the behaviour verb on the exact populations the
 * script is talking about; the camera is already on them via filmTarget.
 */
const _ec = new THREE.Vector3();
const _ec2 = new THREE.Vector3();
function centreOf(pop, out) {
  out.set(0, 0, 0);
  for (const a of pop.agents) out.add(a.pos);
  return out.divideScalar(Math.max(1, pop.agents.length));
}

function fireEvent(scene, dir) {
  if (!dir.event) return;
  const P = (k) => filmTarget(scene, 'species' + k);
  const A = P('A'), B = P('B'), C = P('C'), D = P('D'), E = P('E'), F = P('F');
  // Direction from one band toward another, on the ground plane. Falls back to
  // a fixed bearing when the two are the same population (small-roster worlds).
  const toward = (from, to, fallbackAngle = 0.8) => {
    const fb = new THREE.Vector3(Math.sin(fallbackAngle), 0, Math.cos(fallbackAngle));
    if (!from || !to || from === to) return fb;
    const d = centreOf(to, _ec2).sub(centreOf(from, _ec)).setY(0);
    return d.lengthSq() > 1 ? d.normalize() : fb;
  };
  switch (dir.event) {
    case 'startle-flock':
      A?.startle?.(toward(A, B), 7);
      break;
    case 'spook-herd':
      // The herd catches the flock's fear and runs ahead of it.
      B?.stampede?.(toward(A, B), 9);
      break;
    case 'predator-commit':
      if (C && C !== B) C.rush?.(() => centreOf(B ?? C, _ec), 7);
      B?.stampede?.(toward(C ?? A, B), 7, 2.6);
      break;
    case 'swarm-rise':
      // Only an actual swarm rides a thermal. On worlds whose roster has no
      // swarm the D slot falls back to a herd — big quadrupeds must not
      // levitate, so they surge across the ground instead.
      if (D?.genome.role === 'swarm') D.rise?.(11);
      else D?.stampede?.(toward(C ?? B, D, 1.9), 6, 1.4);
      break;
    case 'highland-link':
      E?.stampede?.(toward(B, E, 2.4), 5, 1.2); // moves off, unhurried
      if (F && F !== E) F.stampede?.(toward(E, F, -1.2), 5, 1.6); // flushed
      break;
    case 'settle':
      for (const pop of scene.fauna?.populations ?? []) pop.calm?.();
      break;
  }
}

/**
 * Resolve a cue's `focus: 'speciesX'` to the live population it names. The
 * surface stage spawned the cast itself (Fauna.populate with fauna/cast.js),
 * so this is a direct index — principal E is the cold-built highland
 * population, not the coastal herd that shares its species name.
 */
function filmTarget(scene, focus) {
  const m = /^species([A-F])$/.exec(focus ?? '');
  if (!m) return null;
  return scene.fauna?.cast?.[m[1]] ?? null;
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
  else if (s instanceof SurfaceScene) {
    // Deep time: cues carry their era; anything without one (Acts 4–5) plays
    // on the finished world. The descent and shallows land before life exists.
    s.setEra(dir.era ?? 5);
    // Evening reaches the interior at the dusk cue and stays for the close.
    if (dir.phase === 'dusk') s.setMood?.('dusk');
    driveSurface(s, dir, cueIndex);
    fireEvent(s, dir);
  }
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
