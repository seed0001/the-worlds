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
  const marks = [];
  const scenes = new Set();
  for (let i = 0; i < A.script.cues.length; i++) {
    const cue = A.script.cues[i];
    try { await A.director(cue); } catch (e) { return { error: 'cue ' + i + ': ' + e.message }; }
    for (let k = 0; k < (cue.hold ?? 6) * 60; k++) st.active.update(1 / 60);
    scenes.add(st.active.constructor.name);
    const L = A.launch;
    marks.push({ scene: cue.scene, key: cue.direct?.launch ?? cue.direct?.space ?? cue.direct?.moon,
      alt: +L.alt.toFixed(1), lifted: L.lifted, s1c: L.staged.s1c, space: +L._space.toFixed(2) });
  }
  return { marks, scenes: [...scenes], landed: A.moon.landed, lmAlt: +A.moon.lmAlt.toFixed(1) };
});

await b.close();
console.log('script:', JSON.stringify(info));
console.log('marks:', JSON.stringify(run.marks ?? run));
console.log('scenes:', JSON.stringify(run.scenes), 'landed:', run.landed, 'lmAlt:', run.lmAlt);
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
  for (const s of ['LaunchScene', 'SpaceScene', 'MoonSurfaceScene']) {
    if (!run.scenes.includes(s)) fail('scene never activated: ' + s);
  }
  if (!run.landed) fail('lander never touched down (lmAlt ' + run.lmAlt + ')');
}
if (errs.length) { console.log('ERRORS:'); errs.slice(0, 8).forEach((e) => console.log('  ' + e)); process.exit(1); }
if (bad) process.exit(3);
console.log('OK: full mission staged — launch to orbit, coast + docking, descent to touchdown on the Moon.');
