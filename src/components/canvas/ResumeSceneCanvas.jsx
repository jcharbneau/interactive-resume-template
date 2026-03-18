import { Canvas, useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

// ─── Constants ────────────────────────────────────────────────────────────────

const PARTICLE_COUNT = 900;
const LERP_SPEED = 2.2;

// ─── Background-aware pixel sampling ─────────────────────────────────────────
// Dark-bg logos (e.g. Ubisoft white-on-black): sample bright pixels.
// Light-bg logos (e.g. G-P, Glassdoor on white): sample dark/colorful pixels.

function isInterestingPixel(r, g, b, a, darkBg) {
  if (a < 30) return false; // transparent
  const brightness = (r + g + b) / 3;
  if (darkBg) return brightness > 100;
  // Light bg: skip near-white
  return !(r > 215 && g > 215 && b > 215);
}

function sampleCanvas(canvas, darkBg) {
  const ctx = canvas.getContext('2d');
  const { width: size, height } = canvas;
  const imageData = ctx.getImageData(0, 0, size, height);
  const { data } = imageData;
  const candidates = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      if (isInterestingPixel(data[idx], data[idx + 1], data[idx + 2], data[idx + 3], darkBg)) {
        candidates.push([x, y]);
      }
    }
  }
  if (candidates.length === 0) return null;

  const worldScale = 5.2;
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const [px, py] = candidates[Math.floor(Math.random() * candidates.length)];
    positions[i * 3] = (px / size - 0.5) * worldScale + (Math.random() - 0.5) * 0.07;
    positions[i * 3 + 1] = (py / size - 0.5) * -worldScale + (Math.random() - 0.5) * 0.07;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.35;
  }
  return positions;
}

// ─── Async image loader ───────────────────────────────────────────────────────
// Tries to load a logo PNG from /public/logos/{id}.png.
// Returns sampled particle positions or null if the file doesn't exist.

function loadLogoFromUrl(url, darkBg) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const size = 192;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      // Flood with the expected bg so transparent areas become correct
      ctx.fillStyle = darkBg ? 'black' : 'white';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      resolve(sampleCanvas(canvas, darkBg));
    };
    img.onerror = () => resolve(null); // file not found → canvas fallback
    img.src = url;
  });
}

// ─── Canvas logo fallbacks ────────────────────────────────────────────────────
// Drawn as accurate-as-possible brand approximations on a black background.
// Used when the actual logo image file isn't present.

function drawEraLogo(ctx, size, id) {
  const cx = size / 2;
  const cy = size / 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'white';
  ctx.fillStyle = 'white';

  switch (id) {
    case 'gp': {
      // G-P: circle of 32 radial tick marks (matches actual brand mark)
      const numTicks = 32;
      const innerR = size * 0.27;
      const outerR = size * 0.38;
      ctx.lineWidth = Math.max(3, size * 0.038);
      for (let i = 0; i < numTicks; i++) {
        const angle = (i / numTicks) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
        ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
        ctx.stroke();
      }
      // G-P text
      ctx.font = `bold ${Math.round(size * 0.22)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('G-P', cx, cy + size * 0.03);
      break;
    }

    case 'rigetti': {
      // Rigetti: QPU chip — concentric rings with circles/dots around them
      // Outer ring with large evenly-spaced circles
      const ringDefs = [
        { r: size * 0.42, dotCount: 20, dotR: size * 0.028, lineW: size * 0.022 },
        { r: size * 0.31, dotCount: 14, dotR: size * 0.022, lineW: size * 0.018 },
        { r: size * 0.2, dotCount: 8, dotR: size * 0.016, lineW: size * 0.015 },
      ];
      ringDefs.forEach(({ r, dotCount, dotR, lineW }) => {
        // Draw ring
        ctx.lineWidth = Math.max(2, lineW);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        // Draw dots on ring
        for (let i = 0; i < dotCount; i++) {
          const angle = (i / dotCount) * Math.PI * 2 - Math.PI / 2;
          const dx = cx + Math.cos(angle) * r;
          const dy = cy + Math.sin(angle) * r;
          ctx.beginPath();
          ctx.arc(dx, dy, Math.max(2, dotR), 0, Math.PI * 2);
          ctx.fill();
        }
      });
      // Center dot cluster (QPU core)
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.065, 0, Math.PI * 2);
      ctx.fill();
      // Inner scattered dots (chip surface detail)
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const r2 = size * 0.1 + (i % 3) * size * 0.025;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2, size * 0.01, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'careerbreak': {
      // Independent: JC monogram in large mono font
      ctx.font = `bold ${Math.round(size * 0.54)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('JC', cx, cy);
      ctx.lineWidth = Math.max(2, size * 0.022);
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.3, cy + size * 0.34);
      ctx.lineTo(cx + size * 0.3, cy + size * 0.34);
      ctx.stroke();
      break;
    }

    case 'glassdoor': {
      // Glassdoor: outer rounded square + inner offset cutout = door/G shape
      ctx.lineWidth = Math.max(3, size * 0.035);
      const sq = size * 0.72;
      const r = size * 0.12;
      const ox = cx - sq / 2,
        oy = cy - sq / 2;
      // Outer rounded square (stroke)
      ctx.beginPath();
      ctx.moveTo(ox + r, oy);
      ctx.arcTo(ox + sq, oy, ox + sq, oy + sq, r);
      ctx.arcTo(ox + sq, oy + sq, ox, oy + sq, r);
      ctx.arcTo(ox, oy + sq, ox, oy, r);
      ctx.arcTo(ox, oy, ox + sq, oy, r);
      ctx.closePath();
      ctx.stroke();
      // Inner cutout (smaller square, offset to top-right — creates door opening)
      const iq = sq * 0.56;
      const ir = r * 0.7;
      const iox = cx - iq / 2 + size * 0.06;
      const ioy = oy + size * 0.1;
      ctx.beginPath();
      ctx.moveTo(iox + ir, ioy);
      ctx.arcTo(iox + iq, ioy, iox + iq, ioy + iq, ir);
      ctx.arcTo(iox + iq, ioy + iq, iox, ioy + iq, ir);
      ctx.arcTo(iox, ioy + iq, iox, ioy, ir);
      ctx.arcTo(iox, ioy, iox + iq, ioy, ir);
      ctx.closePath();
      // Draw as white inner area cut into the outer square
      // We stroke the inner shape so both shapes' outlines are visible as particles
      ctx.stroke();
      break;
    }

    case 'ubisoft': {
      // Ubisoft: spiral — thick parametric spiral from outer to inner
      // Approximates their iconic snail/eye logo
      ctx.lineWidth = Math.max(4, size * 0.09);
      ctx.lineCap = 'round';

      const startR = size * 0.37;
      const endR = size * 0.07;
      const turns = 1.55;
      const steps = 120;
      const startAngle = -Math.PI * 0.5; // start at top

      // Build spiral points
      const pts = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const angle = startAngle + t * turns * Math.PI * 2;
        const r = startR - (startR - endR) * t;
        pts.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
      }

      // Draw as a series of connected segments
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i][0], pts[i][1]);
      }
      ctx.stroke();

      // Outer ring gap: draw the arc that completes the outer ring
      // (The gap in the Ubisoft logo between where the spiral starts and the ring body)
      ctx.lineWidth = Math.max(4, size * 0.085);
      ctx.beginPath();
      // Thin arc on the outer ring to create the "open ring" look
      ctx.arc(cx, cy, startR, startAngle - Math.PI * 0.18, startAngle, false);
      ctx.stroke();

      // Center dot (the "eye")
      ctx.lineWidth = 0;
      ctx.beginPath();
      ctx.arc(pts[pts.length - 1][0], pts[pts.length - 1][1], size * 0.05, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'cengage': {
      // Cengage: scattered rectangular tiles (like their actual logo mark)
      ctx.lineWidth = 0;
      const tiles = [
        { x: -0.28, y: -0.26, w: 0.18, h: 0.11, rot: -0.4 },
        { x: -0.14, y: -0.38, w: 0.14, h: 0.09, rot: 0.2 },
        { x: -0.36, y: -0.1, w: 0.14, h: 0.09, rot: 0.5 },
        { x: -0.22, y: -0.12, w: 0.18, h: 0.1, rot: -0.1 },
        { x: -0.3, y: 0.08, w: 0.12, h: 0.08, rot: 0.3 },
        { x: -0.12, y: 0.02, w: 0.14, h: 0.09, rot: -0.5 },
      ];
      for (const tile of tiles) {
        ctx.save();
        ctx.translate(cx + tile.x * size, cy + tile.y * size);
        ctx.rotate(tile.rot);
        ctx.fillRect(0, 0, tile.w * size, tile.h * size);
        ctx.restore();
      }
      // "CENGAGE" wordmark below
      ctx.font = `bold ${Math.round(size * 0.16)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('CENGAGE', cx, cy + size * 0.18);
      ctx.font = `${Math.round(size * 0.11)}px monospace`;
      ctx.fillText('LEARNING', cx, cy + size * 0.36);
      break;
    }

    case 'early': {
      // Early Career: retro monitor + "> _" terminal prompt
      ctx.lineWidth = Math.max(3, size * 0.034);
      const mw = size * 0.68,
        mh = size * 0.48;
      const mx = cx - mw / 2,
        my = size * 0.1;
      // Monitor body
      ctx.beginPath();
      ctx.rect(mx, my, mw, mh);
      ctx.stroke();
      // Stand neck
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.06, my + mh);
      ctx.lineTo(cx - size * 0.12, size * 0.8);
      ctx.lineTo(cx + size * 0.12, size * 0.8);
      ctx.lineTo(cx + size * 0.06, my + mh);
      ctx.stroke();
      // Stand base
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.22, size * 0.8);
      ctx.lineTo(cx + size * 0.22, size * 0.8);
      ctx.stroke();
      // Prompt text
      ctx.font = `bold ${Math.round(size * 0.17)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('> _', cx, my + mh * 0.52);
      break;
    }

    default: {
      ctx.lineWidth = Math.max(3, size * 0.04);
      ctx.beginPath();
      ctx.moveTo(cx, size * 0.1);
      ctx.lineTo(size * 0.9, cy);
      ctx.lineTo(cx, size * 0.9);
      ctx.lineTo(size * 0.1, cy);
      ctx.closePath();
      ctx.stroke();
    }
  }
}

// ─── Logo position cache (canvas-drawn fallbacks) ─────────────────────────────

const logoPositionCache = new Map();

// Intro landing: soft scattered cloud of particles drifting around the text area.
// No border — just ambient depth particles.
function getIntroPositions() {
  if (logoPositionCache.has('intro')) return logoPositionCache.get('intro');

  const positions = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Gaussian-ish spread: weighted toward center with some outliers
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() ** 0.5 * 6.5; // bias toward edges
    positions[i * 3] = Math.cos(angle) * radius * 1.6;
    positions[i * 3 + 1] = Math.sin(angle) * radius * 0.9;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 1.2;
  }

  logoPositionCache.set('intro', positions);
  return positions;
}

// ─── Intro animation figure drawings ──────────────────────────────────────────
// Human silhouettes drawn white-on-black, sampled into particle positions.
// Key: use thick strokes (lineWidth ~w*0.16) so enough pixels are present
// for the particle sampler to create a recognizable, dense silhouette.

function drawThinkingMan(ctx, w, h) {
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'white';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const cx = w * 0.5;

  // Head — large filled circle for density
  ctx.beginPath();
  ctx.arc(cx, h * 0.12, w * 0.11, 0, Math.PI * 2);
  ctx.fill();

  // Torso — thick filled trapezoid (shoulders wider than hips)
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.14, h * 0.22); // left shoulder
  ctx.lineTo(cx + w * 0.14, h * 0.22); // right shoulder
  ctx.lineTo(cx + w * 0.1, h * 0.55); // right hip
  ctx.lineTo(cx - w * 0.1, h * 0.55); // left hip
  ctx.closePath();
  ctx.fill();

  // Left arm — thick stroke, relaxed at side
  ctx.lineWidth = w * 0.1;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.12, h * 0.26);
  ctx.lineTo(cx - w * 0.24, h * 0.46);
  ctx.stroke();

  // Right upper arm — to elbow
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.12, h * 0.26);
  ctx.lineTo(cx + w * 0.22, h * 0.3);
  ctx.stroke();

  // Right forearm — elbow bends up to chin (thinking pose)
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.22, h * 0.3);
  ctx.lineTo(cx + w * 0.1, h * 0.2);
  ctx.stroke();

  // Hand at chin — small filled circle
  ctx.beginPath();
  ctx.arc(cx + w * 0.1, h * 0.19, w * 0.05, 0, Math.PI * 2);
  ctx.fill();

  // Left leg
  ctx.lineWidth = w * 0.12;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.06, h * 0.55);
  ctx.lineTo(cx - w * 0.14, h * 0.86);
  ctx.stroke();

  // Right leg
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.06, h * 0.55);
  ctx.lineTo(cx + w * 0.14, h * 0.86);
  ctx.stroke();
}

function drawWavingMan(ctx, w, h) {
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'white';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const cx = w * 0.5;

  // Head
  ctx.beginPath();
  ctx.arc(cx, h * 0.11, w * 0.11, 0, Math.PI * 2);
  ctx.fill();

  // Torso — thick trapezoid
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.14, h * 0.22);
  ctx.lineTo(cx + w * 0.14, h * 0.22);
  ctx.lineTo(cx + w * 0.1, h * 0.55);
  ctx.lineTo(cx - w * 0.1, h * 0.55);
  ctx.closePath();
  ctx.fill();

  // Left arm raised diagonally up-left
  ctx.lineWidth = w * 0.1;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.12, h * 0.26);
  ctx.lineTo(cx - w * 0.26, h * 0.12);
  ctx.stroke();

  // Right arm raised diagonally up-right
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.12, h * 0.26);
  ctx.lineTo(cx + w * 0.26, h * 0.11);
  ctx.stroke();

  // Wand shaft — extends from right hand tip
  ctx.lineWidth = w * 0.05;
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.26, h * 0.11);
  ctx.lineTo(cx + w * 0.36, h * 0.01);
  ctx.stroke();

  // Wand tip — filled star burst (5 short lines radiating from tip)
  const tx = cx + w * 0.36;
  const ty = h * 0.01;
  ctx.lineWidth = w * 0.04;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + Math.cos(a) * w * 0.07, ty + Math.sin(a) * w * 0.07);
    ctx.stroke();
  }

  // Left leg
  ctx.lineWidth = w * 0.12;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.06, h * 0.55);
  ctx.lineTo(cx - w * 0.14, h * 0.86);
  ctx.stroke();

  // Right leg
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.06, h * 0.55);
  ctx.lineTo(cx + w * 0.14, h * 0.86);
  ctx.stroke();
}

// ─── Cengage: graduation cap (mortarboard) ────────────────────────────────────
function drawGraduationCap(ctx, w, h) {
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'white';
  ctx.lineCap = 'round';

  // Flat board — filled diamond/rhombus
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.16); // top point
  ctx.lineTo(w * 0.84, h * 0.36); // right point
  ctx.lineTo(w * 0.5, h * 0.56); // bottom point
  ctx.lineTo(w * 0.16, h * 0.36); // left point
  ctx.closePath();
  ctx.fill();

  // Cap body — trapezoid below the board center
  ctx.beginPath();
  ctx.moveTo(w * 0.34, h * 0.38);
  ctx.lineTo(w * 0.66, h * 0.38);
  ctx.lineTo(w * 0.6, h * 0.6);
  ctx.lineTo(w * 0.4, h * 0.6);
  ctx.closePath();
  ctx.fill();

  // Tassel string — from board top to the right, then hanging down
  ctx.lineWidth = w * 0.04;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.16);
  ctx.lineTo(w * 0.72, h * 0.22);
  ctx.lineTo(w * 0.72, h * 0.48);
  ctx.stroke();

  // Tassel end — small cluster of hanging strands
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(w * 0.72, h * 0.48);
    ctx.lineTo(w * 0.64 + i * w * 0.05, h * 0.62);
    ctx.stroke();
  }

  // Tassel button
  ctx.beginPath();
  ctx.arc(w * 0.72, h * 0.48, w * 0.04, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Early Career: shopping cart (ecommerce era) ──────────────────────────────
function drawShoppingCart(ctx, w, h) {
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'white';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Handle (the stick at top-left that you push)
  ctx.lineWidth = w * 0.06;
  ctx.beginPath();
  ctx.moveTo(w * 0.08, h * 0.26);
  ctx.lineTo(w * 0.22, h * 0.26);
  ctx.lineTo(w * 0.22, h * 0.42);
  ctx.stroke();

  // Cart basket — thick outline
  ctx.lineWidth = w * 0.05;
  ctx.beginPath();
  ctx.moveTo(w * 0.22, h * 0.42);
  ctx.lineTo(w * 0.84, h * 0.42);
  ctx.lineTo(w * 0.76, h * 0.68);
  ctx.lineTo(w * 0.28, h * 0.68);
  ctx.closePath();
  ctx.stroke();

  // Basket grid — vertical dividers
  ctx.lineWidth = w * 0.035;
  for (const xp of [0.38, 0.52, 0.66]) {
    ctx.beginPath();
    ctx.moveTo(w * xp, h * 0.42);
    ctx.lineTo(w * (xp - 0.04), h * 0.68);
    ctx.stroke();
  }
  // Horizontal mid-bar
  ctx.beginPath();
  ctx.moveTo(w * 0.24, h * 0.55);
  ctx.lineTo(w * 0.8, h * 0.55);
  ctx.stroke();

  // Left wheel
  ctx.lineWidth = w * 0.045;
  ctx.beginPath();
  ctx.arc(w * 0.36, h * 0.78, w * 0.075, 0, Math.PI * 2);
  ctx.stroke();

  // Right wheel
  ctx.beginPath();
  ctx.arc(w * 0.68, h * 0.78, w * 0.075, 0, Math.PI * 2);
  ctx.stroke();
}

// ─── Shared canvas→sample→cache helper ────────────────────────────────────────

function getShapePositions(key, drawFn) {
  if (logoPositionCache.has(key)) return logoPositionCache.get(key);
  const size = 256; // larger canvas = more pixels to sample from stroke-based drawings
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, size, size);
  drawFn(ctx, size, size);
  const positions = sampleCanvas(canvas, true);
  logoPositionCache.set(key, positions);
  return positions;
}

function getCanvasLogoPositions(id) {
  if (id === 'intro') return getIntroPositions();
  if (id === 'intro-thinking') return getShapePositions('intro-thinking', drawThinkingMan);
  if (id === 'intro-waving') return getShapePositions('intro-waving', drawWavingMan);
  if (id === 'cengage') return getShapePositions('cengage', drawGraduationCap);
  if (id === 'early') return getShapePositions('early', drawShoppingCart);
  if (logoPositionCache.has(id)) return logoPositionCache.get(id);

  const size = 192;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, size, size);
  drawEraLogo(ctx, size, id);

  const positions = sampleCanvas(canvas, true); // our canvas drawings are white-on-black
  logoPositionCache.set(id, positions);
  return positions;
}

// ─── Abstract fallback generators ─────────────────────────────────────────────

function generateNeural(n) {
  const pos = new Float32Array(n * 3);
  const nodes = Array.from({ length: 10 }, () => [
    (Math.random() - 0.5) * 6,
    (Math.random() - 0.5) * 4,
    (Math.random() - 0.5) * 3,
  ]);
  for (let i = 0; i < n; i++) {
    const node = nodes[Math.floor(Math.random() * nodes.length)];
    const spread = Math.random() < 0.2 ? 1.2 : 0.5;
    pos[i * 3] = node[0] + (Math.random() - 0.5) * spread;
    pos[i * 3 + 1] = node[1] + (Math.random() - 0.5) * spread;
    pos[i * 3 + 2] = node[2] + (Math.random() - 0.5) * spread;
  }
  return pos;
}

function generateSpiral(n) {
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const arm = i % 2 === 0 ? 0 : Math.PI;
    const t = (i / n) * 4 * Math.PI;
    const r = 0.3 + t * 0.38;
    pos[i * 3] = Math.cos(t + arm) * r + (Math.random() - 0.5) * r * 0.12;
    pos[i * 3 + 1] = (Math.random() - 0.5) * r * 0.25;
    pos[i * 3 + 2] = Math.sin(t + arm) * r + (Math.random() - 0.5) * r * 0.12;
  }
  return pos;
}

const FALLBACK_GENERATORS = { neural: generateNeural, spiral: generateSpiral };

// ─── Shaders ──────────────────────────────────────────────────────────────────

const vertexShader = /* glsl */ `
  uniform float uSize;
  uniform float uTime;
  uniform vec2  uMouse;
  uniform float uMouseActive;

  attribute float aRandom;
  attribute float aPhase;
  attribute float aColorMix;
  varying  float vColorMix;

  void main() {
    vColorMix = aColorMix;

    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    // Subtle per-particle float
    modelPosition.y += sin(uTime * 0.55 + aPhase) * 0.04;
    modelPosition.x += cos(uTime * 0.35 + aPhase * 1.3) * 0.025;

    // Mouse force field
    if (uMouseActive > 0.001) {
      vec2 worldMouse = uMouse * 4.8;
      vec2 toParticle = modelPosition.xy - worldMouse;
      float dist = length(toParticle);
      if (dist < 2.5 && dist > 0.001) {
        float norm     = 1.0 - dist / 2.5;
        float strength = norm * uMouseActive * 0.45;
        float force    = dist < 0.8 ? strength : -strength * 0.35;
        modelPosition.xy += normalize(toParticle) * force * norm;
      }
    }

    vec4 viewPosition     = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position  = projectedPosition;
    gl_PointSize = uSize * (0.5 + aRandom * 0.8) * (12.0 / max(-viewPosition.z, 1.0));
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform float uAlpha;
  varying float vColorMix;

  void main() {
    float dist = length(gl_PointCoord - 0.5);
    if (dist > 0.5) discard;
    float strength = pow(1.0 - dist * 2.0, 2.0);
    vec3  color    = mix(uColorA, uColorB, vColorMix);
    gl_FragColor   = vec4(color, strength * uAlpha);
  }
`;

// ─── Logo Glow ────────────────────────────────────────────────────────────────

function LogoGlow({ secondaryHex }) {
  const meshRef = useRef();

  const glowTex = useMemo(() => {
    const s = 256;
    const c = document.createElement('canvas');
    c.width = s;
    c.height = s;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grad.addColorStop(0, 'rgba(255,255,255,0.85)');
    grad.addColorStop(0.28, 'rgba(255,255,255,0.28)');
    grad.addColorStop(0.65, 'rgba(255,255,255,0.06)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
    return new THREE.CanvasTexture(c);
  }, []);

  const colorRef = useRef(new THREE.Color(secondaryHex));
  const targetRef = useRef(new THREE.Color(secondaryHex));

  useEffect(() => {
    targetRef.current.set(secondaryHex);
  }, [secondaryHex]);

  useFrame(({ clock }, delta) => {
    if (!meshRef.current) return;
    const lf = 1 - Math.exp(-1.2 * Math.min(delta, 0.05));
    colorRef.current.lerp(targetRef.current, lf);
    meshRef.current.material.color.copy(colorRef.current);
    meshRef.current.material.opacity = 0.16 + 0.05 * Math.sin(clock.elapsedTime * 0.75);
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -0.5]}>
      <planeGeometry args={[6, 6]} />
      <meshBasicMaterial
        map={glowTex}
        color={secondaryHex}
        transparent
        opacity={0.16}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── Particles ────────────────────────────────────────────────────────────────

function Particles({ eraConfig, eraId, mousePos, particleSize, particleAlpha }) {
  const pointsRef = useRef();
  const materialRef = useRef();

  const currentPos = useRef(new Float32Array(PARTICLE_COUNT * 3));
  const targetPos = useRef(new Float32Array(PARTICLE_COUNT * 3));
  const colorA = useRef(new THREE.Color(eraConfig.primaryHex));
  const colorB = useRef(new THREE.Color(eraConfig.secondaryHex));
  const targetA = useRef(new THREE.Color(eraConfig.primaryHex));
  const targetB = useRef(new THREE.Color(eraConfig.secondaryHex));

  const { aRandom, aPhase, aColorMix } = useMemo(() => {
    const random = new Float32Array(PARTICLE_COUNT);
    const phase = new Float32Array(PARTICLE_COUNT);
    const colorMix = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      random[i] = Math.random();
      phase[i] = Math.random() * Math.PI * 2;
      colorMix[i] = Math.random();
    }
    return { aRandom: random, aPhase: phase, aColorMix: colorMix };
  }, []);

  // Initialize with canvas fallback immediately — intentionally init-once.
  // currentPos/targetPos are refs mutated in useFrame; era transitions handled by the useEffect below.
  // biome-ignore lint/correctness/useExhaustiveDependencies: init-once by design
  useMemo(() => {
    const init =
      getCanvasLogoPositions(eraId) ??
      (FALLBACK_GENERATORS[eraConfig.pattern] || generateNeural)(PARTICLE_COUNT);
    currentPos.current.set(init);
    targetPos.current.set(init);
  }, []);

  // On era change: set canvas target immediately, then try image async
  useEffect(() => {
    // 1. Canvas fallback — immediate
    const canvasPos =
      getCanvasLogoPositions(eraId) ??
      (FALLBACK_GENERATORS[eraConfig.pattern] || generateNeural)(PARTICLE_COUNT);
    targetPos.current.set(canvasPos);
    targetA.current.set(eraConfig.primaryHex);
    targetB.current.set(eraConfig.secondaryHex);

    // 2. Actual image — async upgrade (if logoUrl provided)
    const { logoUrl, logoDarkBg = false } = eraConfig;
    if (!logoUrl) return;

    let cancelled = false;
    loadLogoFromUrl(logoUrl, logoDarkBg).then((imgPos) => {
      if (cancelled || !imgPos) return;
      // Cache under an image-specific key and set as new morph target
      logoPositionCache.set(`${eraId}_img`, imgPos);
      targetPos.current.set(imgPos);
    });
    return () => {
      cancelled = true;
    };
  }, [
    eraId,
    eraConfig.pattern,
    eraConfig.primaryHex,
    eraConfig.secondaryHex,
    eraConfig.logoUrl,
    eraConfig.logoDarkBg,
    eraConfig,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((state, delta) => {
    if (!pointsRef.current || !materialRef.current) return;

    const dt = Math.min(delta, 0.05);
    const lf = 1 - Math.exp(-LERP_SPEED * dt);

    if (mousePos?.current) {
      materialRef.current.uniforms.uMouse.value.set(mousePos.current.x, mousePos.current.y);
      materialRef.current.uniforms.uMouseActive.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uMouseActive.value,
        mousePos.current.active ? 1.0 : 0.0,
        lf * 3,
      );
    }

    const cur = currentPos.current;
    const tgt = targetPos.current;
    for (let i = 0; i < cur.length; i++) cur[i] += (tgt[i] - cur[i]) * lf;
    pointsRef.current.geometry.attributes.position.array.set(cur);
    pointsRef.current.geometry.attributes.position.needsUpdate = true;

    colorA.current.lerp(targetA.current, lf * 0.7);
    colorB.current.lerp(targetB.current, lf * 0.7);
    materialRef.current.uniforms.uColorA.value.copy(colorA.current);
    materialRef.current.uniforms.uColorB.value.copy(colorB.current);
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  const uniforms = useMemo(
    () => ({
      uSize: { value: particleSize ?? 7.0 },
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color(eraConfig.primaryHex) },
      uColorB: { value: new THREE.Color(eraConfig.secondaryHex) },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uMouseActive: { value: 0.0 },
      uAlpha: { value: particleAlpha ?? 0.95 },
    }),
    [eraConfig.primaryHex, eraConfig.secondaryHex, particleAlpha, particleSize],
  );

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[currentPos.current, 3]}
          count={PARTICLE_COUNT}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          args={[aRandom, 1]}
          count={PARTICLE_COUNT}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aPhase"
          args={[aPhase, 1]}
          count={PARTICLE_COUNT}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aColorMix"
          args={[aColorMix, 1]}
          count={PARTICLE_COUNT}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─── Camera Drift ─────────────────────────────────────────────────────────────

function CameraDrift() {
  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime;
    camera.position.x = Math.sin(t * 0.07) * 0.6;
    camera.position.y = Math.cos(t * 0.05) * 0.35;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

// ─── ResumeSceneCanvas ────────────────────────────────────────────────────────
// Drop actual logo PNGs into /public/logos/{era-id}.png and they'll be used
// automatically. Supported IDs: gp, rigetti, glassdoor, ubisoft, cengage.
// Set logoDarkBg: true for logos on dark backgrounds (e.g. Ubisoft white-on-black).

const ResumeSceneCanvas = ({
  eraConfig,
  eraId,
  mousePos,
  particleSize = 7.0,
  particleAlpha = 0.95,
  particleOffset = [0, 0],
}) => {
  const bg = eraConfig?.bgHex || '#020808';

  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 60, near: 0.1, far: 100 }}
      gl={{ antialias: false, alpha: false }}
      style={{ background: bg }}
      dpr={[1, 1.5]}
    >
      <color attach="background" args={[bg]} />
      <group position={[particleOffset[0], particleOffset[1], 0]}>
        <LogoGlow secondaryHex={eraConfig?.secondaryHex || '#ffd700'} />
        <Particles
          eraConfig={eraConfig}
          eraId={eraId}
          mousePos={mousePos}
          particleSize={particleSize}
          particleAlpha={particleAlpha}
        />
      </group>
      <CameraDrift />
      <EffectComposer>
        <Bloom luminanceThreshold={0.45} intensity={0.5} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
};

export default ResumeSceneCanvas;
