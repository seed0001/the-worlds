import { chromium } from 'playwright-core';
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b = await chromium.launch({ executablePath: EXE, args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => { if (m.type() === 'error' && !/api\/tts|favicon|Failed to load resource/.test(m.text())) errs.push('CON: ' + m.text()); });
await p.goto('http://localhost:5180/apollo.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
await p.waitForFunction(() => window.__apollo && window.__apollo.launch && window.__apollo.launch.ready, { timeout: 60000 });

const info = await p.evaluate(() => ({ cues: window.__apollo.script.cues.length, height: window.__apollo.launch.rocket?.userData?.totalHeight }));

// Drive the whole launch through the real director + fixed-step sim, and record
// the launch state after each cue's hold — so this proves the ascent actually
// happens, not just that the cues stage without throwing.
const run = await p.evaluate(async () => {
  const A = window.__apollo, st = A.stage; A.narrator.muted = true;
  st._running = false; if (st._raf) cancelAnimationFrame(st._raf);
  const gl = st.renderer.getContext();
  const w = st.renderer.domElement.width, h = st.renderer.domElement.height;
  const px = new Uint8Array(w * h * 4);
  // Percentage of the frame that is a lit SURFACE (luminance > 50). This tells
  // an empty shot (only pinprick stars -> ~0%) apart from a small lit craft on
  // a black sky (clearly non-zero), which a mean-luminance metric conflates.
  const litPct = () => {
    st.composer.render();
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let lit = 0, n = px.length / 4;
    for (let i = 0; i < px.length; i += 4) if ((px[i] + px[i + 1] + px[i + 2]) / 3 > 50) lit++;
    return 100 * lit / n;
  };
  const marks = [];
  const scenes = new Set();
  let reentryPlasma = 0;
  for (let i = 0; i < A.script.cues.length; i++) {
    const cue = A.script.cues[i];
    try { await A.director(cue); } catch (e) { return { error: 'cue ' + i + ': ' + e.message }; }
    // Real narration timing (muted uses the reading estimate), so this drives
    // the rocket to the same altitudes the audience sees — where black-frame
    // camera bugs actually surface. Sample the lit fraction at several points
    // through the cue and keep the max: a tumbling spent stage rotates through
    // light and shadow, so a single frame can catch its dark side even though
    // the shot is full — only a genuinely empty shot stays near zero throughout.
    const words = cue.text.trim().split(/\s+/).length;
    const secs = Math.max(cue.hold ?? 6, words / 2.6 + 0.8);
    const total = Math.floor(secs * 60);
    let maxLit = 0;
    for (let k = 0; k < total; k++) {
      st.active.update(1 / 60);
      if (k % Math.max(1, Math.floor(total / 8)) === 0 || k === total - 1) maxLit = Math.max(maxLit, litPct());
    }
    scenes.add(st.active.constructor.name);
    if (cue.direct?.return === 'reentry') reentryPlasma = Math.max(reentryPlasma, A.earth.plasma);
    const L = A.launch;
    marks.push({ i, scene: cue.scene, cam: cue.direct?.cam,
      key: cue.direct?.launch ?? cue.direct?.space ?? cue.direct?.moon,
      alt: +L.alt.toFixed(1), lifted: L.lifted, s1c: L.staged.s1c, space: +L._space.toFixed(2),
      lit: +maxLit.toFixed(2) });
  }
  const M = A.moon, E = A.earth;
  return { marks, scenes: [...scenes], landed: M.landed, lmAlt: +M.lmAlt.toFixed(1),
    crewOut: M.crewOut, flagUp: M.flagUp, roverDeployed: M.roverDeployed, roverDist: +M.roverDist.toFixed(1),
    liftedOff: M.liftedOff, ascentAlt: +M.ascentAlt.toFixed(1),
    reentryPlasma: +reentryPlasma.toFixed(2), splashed: E.splashed };
});

await b.close();
console.log('script:', JSON.stringify(info));
console.log('marks:', JSON.stringify(run.marks ?? run));
console.log('scenes:', JSON.stringify(run.scenes), 'landed:', run.landed, 'lmAlt:', run.lmAlt);
console.log('eva:', JSON.stringify({ crewOut: run.crewOut, flagUp: run.flagUp, roverDeployed: run.roverDeployed, roverDist: run.roverDist }));
console.log('return:', JSON.stringify({ liftedOff: run.liftedOff, ascentAlt: run.ascentAlt, reentryPlasma: run.reentryPlasma, splashed: run.splashed }));
let bad = false;
const fail = (m) => { console.error('FAIL:', m); bad = true; };
if (run.error) fail(run.error);
if (info.height < 100 || info.height > 140) fail('rocket height off: ' + info.height);
if (run.marks) {
  const m = run.marks;
  const liftIdx = m.findIndex((x) => x.key === 'liftoff');
  const orbitIdx = m.findIndex((x) => x.key === 'orbit');
  if (!(m[liftIdx]?.lifted)) fail('liftoff cue did not set lifted');
  if (!(m[orbitIdx]?.alt > 500)) fail('vehicle never climbed to orbit (alt ' + m[orbitIdx]?.alt + ')');
  if (!m.some((x) => x.s1c)) fail('first stage never separated');
  if (!(m[orbitIdx]?.space > 0.5)) fail('orbit beat not in space (space=' + m[orbitIdx]?.space + ')');
  for (const s of ['LaunchScene', 'SpaceScene', 'MoonSurfaceScene', 'EarthReturnScene']) {
    if (!run.scenes.includes(s)) fail('scene never activated: ' + s);
  }
  if (!run.landed) fail('lander never touched down (lmAlt ' + run.lmAlt + ')');
  // Act 3 — the moonwalk must actually play out on the surface.
  if (!run.crewOut) fail('crew never egressed onto the surface');
  if (!run.flagUp) fail('flag never planted');
  if (!run.roverDeployed) fail('rover never deployed from the lander');
  if (!(run.roverDist > 10)) fail('rover never drove across the surface (dist ' + run.roverDist + ' m)');
  // Act 4 — the return: liftoff, re-entry fireball, and splashdown.
  if (!run.liftedOff || !(run.ascentAlt > 20)) fail('ascent stage never lifted off the Moon (alt ' + run.ascentAlt + ')');
  if (!(run.reentryPlasma > 0.5)) fail('re-entry fireball never built (plasma ' + run.reentryPlasma + ')');
  if (!run.splashed) fail('capsule never splashed down');
  // No cue may render an (almost) empty frame — the black-shot regression guard.
  const dark = m.filter((x) => x.lit < 0.1);
  if (dark.length) fail('cue(s) render near-empty: ' + dark.map((x) => `${x.i}(${x.cam}=${x.lit}% lit)`).join(', '));
}
if (errs.length) { console.log('ERRORS:'); errs.slice(0, 8).forEach((e) => console.log('  ' + e)); process.exit(1); }
if (bad) process.exit(3);
console.log('OK: full mission staged end to end — launch to orbit, coast + docking, descent to touchdown, ' +
  'the moonwalk (rover driven ' + run.roverDist + ' m), lunar liftoff, re-entry fireball, and splashdown.');
