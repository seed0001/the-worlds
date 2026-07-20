import * as THREE from 'three';

// Procedural decals for the hardware — drawn to canvases so the engine ships no
// image files and every marking is generated. "Higher fidelity" here means the
// real livery (the roll pattern, UNITED STATES, the flag), correctly placed,
// not a photoscan.

/** Run a draw fn against an offscreen canvas and return an sRGB CanvasTexture. */
export function canvasTexture(w, h, draw, { repeat = [1, 1] } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  return tex;
}

/** A small stars-and-stripes, drawn flat. Used as a decal on the fuselage. */
function drawFlag(ctx, x, y, w, h) {
  const stripes = 7;
  const sh = h / 13 * stripes / stripes; // 13 stripes
  const bandH = h / 13;
  for (let i = 0; i < 13; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#b22234' : '#ffffff';
    ctx.fillRect(x, y + i * bandH, w, bandH);
  }
  const cantonW = w * 0.4, cantonH = bandH * 7;
  ctx.fillStyle = '#3c3b6e';
  ctx.fillRect(x, y, cantonW, cantonH);
  ctx.fillStyle = '#ffffff';
  const cols = 6, rows = 5;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const px = x + cantonW * (col + 0.5) / cols;
      const py = y + cantonH * (r + 0.5) / rows;
      ctx.beginPath();
      ctx.arc(px, py, Math.min(cantonW / cols, cantonH / rows) * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Vertical "UNITED STATES", one letter per line, black on transparent. */
function drawVertical(ctx, text, x, y, size, color = '#111318') {
  ctx.fillStyle = color;
  ctx.font = `900 ${size}px "Arial Narrow", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const letters = text.split('');
  for (let i = 0; i < letters.length; i++) {
    ctx.fillText(letters[i], x, y + i * size * 1.02);
  }
}

// --- Stage liveries --------------------------------------------------------

/**
 * S-IC first stage: white with the black roll pattern — the quadrant blocks
 * that let trackers read the rocket's roll — plus USA and the flag. The band
 * runs around the circumference (U), height down the stage (V, top = 0).
 */
export function s1cTexture() {
  return canvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#eef1f4';
    ctx.fillRect(0, 0, w, h);
    // Roll-pattern black blocks near the forward (top) skirt, in four quadrants.
    ctx.fillStyle = '#15181d';
    for (let q = 0; q < 4; q++) {
      const bx = (q / 4) * w;
      ctx.fillRect(bx + w * 0.02, h * 0.04, w * 0.21, h * 0.12);
    }
    // A black band at the very top (interstage shadow line).
    ctx.fillRect(0, 0, w, h * 0.02);
    // USA, large, facing forward (U ~ 0.5).
    drawVertical(ctx, 'USA', w * 0.5, h * 0.30, 92);
    // Flag beside it.
    drawFlag(ctx, w * 0.44, h * 0.52, w * 0.12, h * 0.14);
  });
}

/** S-II second stage: white, with UNITED STATES running lengthwise and a flag. */
export function s2Texture() {
  return canvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#f2f4f6';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#15181d';
    ctx.fillRect(0, 0, w, h * 0.02);
    ctx.fillRect(0, h * 0.98, w, h * 0.02);
    drawVertical(ctx, 'UNITED', w * 0.5, h * 0.14, 78);
    drawVertical(ctx, 'STATES', w * 0.5, h * 0.56, 78);
    drawFlag(ctx, w * 0.30, h * 0.30, w * 0.11, h * 0.13);
  });
}

/** A generic painted-metal white, faint panel lines, for the upper stages. */
export function panelWhiteTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#f4f6f8';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(120,130,145,0.25)';
    ctx.lineWidth = 2;
    for (let i = 1; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (i / 6) * h);
      ctx.lineTo(w, (i / 6) * h);
      ctx.stroke();
    }
  });
}
