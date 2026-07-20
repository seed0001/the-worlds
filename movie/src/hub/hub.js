import { ENGINES } from './engines.js';

// The hub renderer. Two jobs: paint a quiet generative starfield behind the
// page (a nod to what every engine here does — compute, don't replay), and
// build the engine grid from the registry so adding a film is a data edit.

// ---- The engine grid ------------------------------------------------------

const grid = document.getElementById('grid');

const tagChips = (tags = []) => tags.map((t) => `<span class="tag">${t}</span>`).join('');

function cardHTML(e) {
  const live = e.status === 'live';
  const foot = live
    ? `<span class="enter">Enter <span class="arrow">&rsaquo;</span></span>`
    : `<span class="badge">Coming soon</span>`;
  return `
    <div class="card-top">
      <h2>${e.title}</h2>
      ${e.year ? `<span class="year">${e.year}</span>` : ''}
    </div>
    <div class="tagline">${e.tagline ?? ''}</div>
    <p class="blurb">${e.blurb ?? ''}</p>
    <div class="card-foot">
      <div class="tags">${tagChips(e.tags)}</div>
      ${foot}
    </div>`;
}

for (const e of ENGINES) {
  const live = e.status === 'live' && e.href;
  const el = document.createElement(live ? 'a' : 'div');
  el.className = `card ${live ? 'live' : 'soon'}`;
  el.id = `engine-${e.id}`;
  el.style.setProperty('--accent', e.accent ?? '#5fa8ff');
  if (live) el.href = e.href;
  el.innerHTML = cardHTML(e);
  grid.appendChild(el);
}

// ---- Generative starfield -------------------------------------------------
// Deliberately cheap: a fixed set of stars with a slow parallax drift and a
// faint twinkle. No dependency, no seed — this is chrome, not a scene.

const canvas = document.getElementById('stars');
const ctx = canvas.getContext('2d');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let stars = [];
let dpr = 1;

function sizeStars() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  const count = Math.round((window.innerWidth * window.innerHeight) / 9000);
  stars = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: (Math.random() * 1.1 + 0.2) * dpr,
    a: Math.random() * 0.5 + 0.2,
    tw: Math.random() * Math.PI * 2,
    sp: Math.random() * 0.5 + 0.15,
  }));
}

function frame(t) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const drift = (t * 0.004) % canvas.height;
  for (const s of stars) {
    const y = (s.y + drift) % canvas.height;
    const tw = reduce ? 1 : 0.7 + 0.3 * Math.sin(t * 0.001 * s.sp + s.tw);
    ctx.globalAlpha = s.a * tw;
    ctx.beginPath();
    ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = '#dfe8ff';
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (!reduce) requestAnimationFrame(frame);
}

sizeStars();
window.addEventListener('resize', sizeStars);
requestAnimationFrame(frame);
