import { chromium } from 'playwright-core';

// Headless run check for the soup act: load it, drive all eight phases, and
// report any console/page errors and a WebGL liveness probe. Screenshot capture
// under swiftshader is flaky, so it is attempted last and never fatal.

const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = process.env.SOUP_URL ?? 'http://localhost:4319/soup.html?seed=verdant';
const OUT = process.env.OUT ?? '/tmp/claude-0/-home-user-the-worlds/cd4004b3-36f8-5985-a22c-e6c8006fae13/scratchpad/ep2';

const browser = await chromium.launch({
  executablePath: EXE,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForSelector('#start', { timeout: 10000 });

// Confirm the GL context is real (not a null/software fallback that draws nothing).
const gl = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  if (!c) return { ok: false, why: 'no canvas' };
  const ctx = c.getContext('webgl2') || c.getContext('webgl');
  if (!ctx) return { ok: false, why: 'no webgl context' };
  return { ok: true, w: c.width, h: c.height, renderer: ctx.getParameter(ctx.VERSION) };
});

// Drive each phase and sample a center-pixel colour off the canvas via a probe
// pass — proves the scene is actually drawing lit points, not a black frame.
const phases = ['pantry', 'monomers', 'replicator', 'selection', 'membrane', 'cell', 'split', 'mats'];
const samples = [];
for (const ph of phases) {
  const lum = await page.evaluate(async (p) => {
    const s = window.__soup?.soup;
    if (s) s.setPhase(p);
    // let a few frames run
    await new Promise((r) => setTimeout(r, 900));
    // read back a grid of pixels from the live canvas
    const c = document.querySelector('canvas');
    const ctx = c.getContext('webgl2') || c.getContext('webgl');
    const px = new Uint8Array(4 * 64 * 64);
    // sample the middle 64x64 block
    ctx.readPixels((c.width - 64) / 2, (c.height - 64) / 2, 64, 64, ctx.RGBA, ctx.UNSIGNED_BYTE, px);
    let sum = 0, max = 0;
    for (let i = 0; i < px.length; i += 4) {
      const l = px[i] + px[i + 1] + px[i + 2];
      sum += l; if (l > max) max = l;
    }
    return { mean: +(sum / (64 * 64) / 3).toFixed(2), max };
  }, ph);
  samples.push({ ph, ...lum });
}

// One screenshot attempt, best-effort.
let shotNote = 'skipped';
try {
  await page.screenshot({ path: `${OUT}/soup-mats.png`, timeout: 8000 });
  shotNote = `${OUT}/soup-mats.png`;
} catch (e) { shotNote = 'capture failed (swiftshader): ' + e.message.split('\n')[0]; }

await browser.close();

console.log('GL:', JSON.stringify(gl));
console.log('per-phase center luminance (mean/ max of 0..255):');
for (const s of samples) console.log(`  ${s.ph.padEnd(11)} mean=${String(s.mean).padStart(6)}  max=${s.max}`);
console.log('screenshot:', shotNote);

const dark = samples.filter((s) => s.max < 8);
if (!gl.ok) { console.error('\nFAIL: ' + gl.why); process.exit(3); }
if (errors.length) { console.log('\nERRORS:'); errors.forEach((e) => console.log('  ' + e)); console.error('FAIL'); process.exit(1); }
if (dark.length) { console.error('\nFAIL: phases drew nothing: ' + dark.map((d) => d.ph).join(', ')); process.exit(2); }
console.log('\nOK: 8 phases ran, GL live, all phases drew lit pixels, no errors.');
