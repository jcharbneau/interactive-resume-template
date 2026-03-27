import { Canvas, useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AdditiveBlending, CanvasTexture, Color, MathUtils, NormalBlending, Vector2 } from 'three';
import { LOGO_DEV_TOKEN, SHARED_LOGO_MAP, SUPABASE_LOGO_BASE } from '../../../constants/logos';
import { DEFAULT_PRESET_ID, SCENE_PRESETS } from '../../../constants/scenePresets';

// ─── Constants ────────────────────────────────────────────────────────────────

const PARTICLE_COUNT = 1400;

// ─── Background-aware pixel sampling ─────────────────────────────────────────
// Dark-bg logos (e.g. Ubisoft white-on-black): sample bright pixels.
// Light-bg logos (e.g. G-P, Glassdoor on white): sample dark/colorful pixels.

function isInterestingPixel(r, g, b, a, darkBg, useAlpha) {
  if (a < 30) return false; // transparent
  // If the image has meaningful alpha channel, use it to detect the logo shape
  if (useAlpha) return a > 128;
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

  // Check if the image has meaningful alpha (not all 255)
  let hasTransparentPixels = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) {
      hasTransparentPixels = true;
      break;
    }
  }

  const candidates = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      if (
        isInterestingPixel(
          data[idx],
          data[idx + 1],
          data[idx + 2],
          data[idx + 3],
          darkBg,
          hasTransparentPixels,
        )
      ) {
        candidates.push([x, y]);
      }
    }
  }
  if (candidates.length === 0) return null;

  const worldScale = 4.2;
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

/** Ensure Logo.dev URLs include the auth token + size params */
function ensureLogoDevToken(url) {
  if (!url || typeof url !== 'string') return url;
  if (url.includes('img.logo.dev') && !url.includes('token=')) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}token=${LOGO_DEV_TOKEN}&size=256&format=png`;
  }
  return url;
}

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
      // Do NOT flood background — preserve alpha channel for proper logo sampling.
      // sampleCanvas will auto-detect if the image has transparency and use
      // alpha-based sampling instead of brightness-based sampling.
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

function drawEraLogo(ctx, size, id, companyName) {
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

    case 'cornerstone': {
      // Cornerstone Brands: Bold "CB" monogram with a cornerstone block accent
      ctx.font = `900 ${Math.round(size * 0.48)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CB', cx, cy);
      // Cornerstone block accent (bottom-left)
      ctx.lineWidth = Math.max(2, size * 0.025);
      const blockSize = size * 0.12;
      ctx.strokeRect(size * 0.12, size * 0.75, blockSize, blockSize);
      ctx.fillRect(size * 0.14, size * 0.77, blockSize * 0.3, blockSize * 0.3);
      break;
    }

    default: {
      // Fallback: bold filled initials with thin geometric frame.
      // Letters are filled solid so particles densely populate them.
      const nameSource = companyName || id;
      const initials = nameSource
        .replace(/[^a-zA-Z\s]/g, '')
        .split(/[\s-]+/)
        .filter(Boolean)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('')
        .slice(0, 3);

      // Hash company name to pick a geometric frame shape
      let hash = 0;
      for (let i = 0; i < nameSource.length; i++) {
        hash = (hash * 31 + nameSource.charCodeAt(i)) | 0;
      }
      const shapeType = Math.abs(hash) % 4;
      const r = size * 0.42;

      // Draw thin geometric frame border
      ctx.lineWidth = Math.max(2, size * 0.02);
      switch (shapeType) {
        case 0: {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 1: {
          const half = r * 0.88;
          const cr = size * 0.08;
          ctx.beginPath();
          ctx.moveTo(cx - half + cr, cy - half);
          ctx.lineTo(cx + half - cr, cy - half);
          ctx.quadraticCurveTo(cx + half, cy - half, cx + half, cy - half + cr);
          ctx.lineTo(cx + half, cy + half - cr);
          ctx.quadraticCurveTo(cx + half, cy + half, cx + half - cr, cy + half);
          ctx.lineTo(cx - half + cr, cy + half);
          ctx.quadraticCurveTo(cx - half, cy + half, cx - half, cy + half - cr);
          ctx.lineTo(cx - half, cy - half + cr);
          ctx.quadraticCurveTo(cx - half, cy - half, cx - half + cr, cy - half);
          ctx.closePath();
          ctx.stroke();
          break;
        }
        case 2: {
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const px = cx + r * Math.cos(angle);
            const py = cy + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
          break;
        }
        case 3: {
          ctx.beginPath();
          ctx.moveTo(cx, cy - r);
          ctx.lineTo(cx + r, cy);
          ctx.lineTo(cx, cy + r);
          ctx.lineTo(cx - r, cy);
          ctx.closePath();
          ctx.stroke();
          break;
        }
      }

      // Draw initials — large, bold, solid filled for maximum particle density
      if (initials) {
        const fontSize =
          initials.length === 1 ? size * 0.55 : initials.length === 2 ? size * 0.42 : size * 0.32;
        ctx.font = `900 ${Math.round(fontSize)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initials, cx, cy + size * 0.015);
      }
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

// Map company names to canvas logo IDs for drawEraLogo fallbacks
const COMPANY_TO_LOGO_ID = {
  'g-p': 'gp',
  'globalization partners': 'gp',
  'rigetti computing': 'rigetti',
  rigetti: 'rigetti',
  glassdoor: 'glassdoor',
  ubisoft: 'ubisoft',
  'ubisoft entertainment': 'ubisoft',
  cengage: 'cengage',
  'cengage learning': 'cengage',
  'cornerstone brands': 'cornerstone',
  cornerstonebrands: 'cornerstone',
  'cornerstone brands, a division of hsn': 'cornerstone',
};

function getCanvasLogoPositions(id, companyName) {
  if (id === 'intro') return getIntroPositions();
  if (id === 'cengage') return getShapePositions('cengage', drawGraduationCap);
  if (id === 'early') return getShapePositions('early', drawShoppingCart);

  // Try mapping company name to a known canvas logo
  const logoId = companyName ? (COMPANY_TO_LOGO_ID[companyName.toLowerCase().trim()] ?? id) : id;

  if (logoPositionCache.has(logoId)) return logoPositionCache.get(logoId);

  // Use higher resolution for monogram fallbacks (default case) —
  // more pixels = denser particle sampling = more legible initials
  const knownLogos = new Set([
    'gp',
    'rigetti',
    'careerbreak',
    'glassdoor',
    'ubisoft',
    'cengage',
    'early',
    'cornerstone',
  ]);
  const size = knownLogos.has(logoId) ? 192 : 384;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, size, size);
  drawEraLogo(ctx, size, logoId, companyName);

  const positions = sampleCanvas(canvas, true); // our canvas drawings are white-on-black
  logoPositionCache.set(logoId, positions);
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
  uniform float uMouseRadius;
  uniform float uMouseStrength;

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

    // Mouse force field — radius and strength driven by scene preset
    if (uMouseActive > 0.001) {
      vec2 worldMouse = uMouse * 4.8;
      vec2 toParticle = modelPosition.xy - worldMouse;
      float dist = length(toParticle);
      if (dist < uMouseRadius && dist > 0.001) {
        float norm     = 1.0 - dist / uMouseRadius;
        float strength = norm * uMouseActive * uMouseStrength;
        float force    = dist < uMouseRadius * 0.32 ? strength : -strength * 0.35;
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

// ─── Constellation Line Geometry ──────────────────────────────────────────────
// Computes line segment pairs from a particle positions array.
// Samples every Nth particle to avoid O(N²) explosion — produces ~80 sampled nodes.
// Returns a Float32Array of [x0,y0,z0, x1,y1,z1, ...] pairs for LineSegments.

function computeLinePairs(positions, threshold) {
  const N = positions.length / 3;
  if (N === 0) return new Float32Array(0);
  const step = Math.max(1, Math.floor(N / 80));
  const pairs = [];
  for (let i = 0; i < N; i += step) {
    for (let j = i + step; j < N; j += step) {
      const dx = positions[i * 3] - positions[j * 3];
      const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
      const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < threshold && dist > 0.01) {
        pairs.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
        pairs.push(positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]);
      }
    }
  }
  return new Float32Array(pairs);
}

// ─── Constellation Lines ──────────────────────────────────────────────────────

function ConstellationLines({ linePositions, color, isLightTheme = false }) {
  const colorRef = useRef(new Color(color));
  const matRef = useRef();

  useEffect(() => {
    colorRef.current.set(color);
    if (matRef.current) matRef.current.color.set(color);
  }, [color]);

  if (!linePositions || linePositions.length === 0) return null;

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        ref={matRef}
        color={color}
        transparent
        opacity={isLightTheme ? 0.35 : 0.22}
        blending={isLightTheme ? NormalBlending : AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}

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
    return new CanvasTexture(c);
  }, []);

  const colorRef = useRef(new Color(secondaryHex));
  const targetRef = useRef(new Color(secondaryHex));

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
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── Particles ────────────────────────────────────────────────────────────────

function Particles({
  eraConfig,
  eraId,
  mousePos,
  particleSize,
  particleAlpha,
  lerpSpeed = 2.2,
  mouseRadius = 2.5,
  mouseStrength = 0.45,
  onTargetReady,
  isLightTheme = false,
}) {
  const pointsRef = useRef();
  const materialRef = useRef();
  // Stable ref for lerp speed — avoids re-registering useFrame on every preset change
  const lerpSpeedRef = useRef(lerpSpeed);
  useEffect(() => {
    lerpSpeedRef.current = lerpSpeed;
  }, [lerpSpeed]);

  const currentPos = useRef(new Float32Array(PARTICLE_COUNT * 3));
  const targetPos = useRef(new Float32Array(PARTICLE_COUNT * 3));
  // For light themes: darken the era's actual color to be contrast-safe on cream,
  // and pair it with a complementary jewel tone for visual richness.
  // This preserves the era's color identity while ensuring visibility.
  const JEWEL_ACCENTS = [
    '#3c1053', // Deep Plum
    '#1a3350', // Navy
    '#064e3b', // Emerald
    '#4a0e2e', // Burgundy
    '#3d0c3c', // Aubergine
    '#2b0057', // Indigo
  ];
  const darkenForLight = (hex, isSecondary = false) => {
    if (!isLightTheme) return hex;
    if (isSecondary) {
      // Secondary: pick a jewel tone complement based on era hash
      const hash = (eraId ?? '').split('').reduce((s, c) => s + c.charCodeAt(0), 0);
      return JEWEL_ACCENTS[hash % JEWEL_ACCENTS.length];
    }
    // Primary: darken the era's actual color by pushing it toward black
    // This preserves the era's hue (blue era stays blue, green stays green)
    // but ensures contrast against cream
    try {
      const c = new Color(hex);
      const hsl = {};
      c.getHSL(hsl);
      // Clamp lightness to max 0.25 (very dark) and boost saturation
      c.setHSL(hsl.h, Math.min(hsl.s * 1.3, 1.0), Math.min(hsl.l, 0.2));
      return `#${c.getHexString()}`;
    } catch {
      return '#1a3350'; // fallback navy
    }
  };
  const darkA = darkenForLight(eraConfig.primaryHex, false);
  const darkB = darkenForLight(eraConfig.secondaryHex, true);

  const colorA = useRef(new Color(darkA));
  const colorB = useRef(new Color(darkB));
  const targetA = useRef(new Color(darkA));
  const targetB = useRef(new Color(darkB));

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
      getCanvasLogoPositions(eraId, eraConfig.company) ??
      (FALLBACK_GENERATORS[eraConfig.pattern] || generateNeural)(PARTICLE_COUNT);
    currentPos.current.set(init);
    targetPos.current.set(init);
  }, []);

  // On era change: set canvas target immediately, then try image async
  // biome-ignore lint/correctness/useExhaustiveDependencies: darkenForLight depends only on isLightTheme (stable)
  useEffect(() => {
    // 1. Canvas fallback — immediate
    const canvasPos =
      getCanvasLogoPositions(eraId, eraConfig.company) ??
      (FALLBACK_GENERATORS[eraConfig.pattern] || generateNeural)(PARTICLE_COUNT);
    targetPos.current.set(canvasPos);
    targetA.current.set(darkenForLight(eraConfig.primaryHex, false));
    targetB.current.set(darkenForLight(eraConfig.secondaryHex, true));
    // Notify constellation lines (or any parent) that target positions are ready
    onTargetReady?.(targetPos.current);

    // 2. Try loading a real logo image
    // Priority: shared SVG > user logo > local /logos/ SVG > canvas fallback
    const { logoDarkBg = false } = eraConfig;
    let cancelled = false;

    // Derive the shared-logo slug for both Supabase and local fallback
    const companyLower = (eraConfig.company || '').toLowerCase().trim();
    const sharedSlug = SHARED_LOGO_MAP[companyLower] || null;
    const sharedUrl = sharedSlug ? `${SUPABASE_LOGO_BASE}${sharedSlug}.svg` : null;
    const localLogoUrl = sharedSlug ? `/logos/${sharedSlug}.svg` : null;
    const userLogoUrl = ensureLogoDevToken(eraConfig.logoUrl);

    // Priority: user-uploaded logo > shared bucket > local SVG fallback
    // User logos are most reliable (they just passed through publish upload)
    const urlsToTry = [userLogoUrl, sharedUrl, localLogoUrl].filter(Boolean);
    if (!urlsToTry.length) return;

    /** Apply loaded positions and cache them */
    const applyPositions = (pos) => {
      logoPositionCache.set(`${eraId}_img`, pos);
      targetPos.current.set(pos);
    };

    /** Try a URL, resolve to positions or null */
    const tryLoad = (url) =>
      url
        ? loadLogoFromUrl(url, logoDarkBg).then((p) => (cancelled ? null : p))
        : Promise.resolve(null);

    // Try each URL in sequence until one succeeds
    let chain = Promise.resolve(null);
    for (const url of urlsToTry) {
      chain = chain.then((pos) => {
        if (pos) return pos; // already found a working logo
        return tryLoad(url);
      });
    }
    chain.then((pos) => {
      if (pos) applyPositions(pos);
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
    onTargetReady,
  ]);

  useFrame((state, delta) => {
    if (!pointsRef.current || !materialRef.current) return;

    const dt = Math.min(delta, 0.05);
    const lf = 1 - Math.exp(-lerpSpeedRef.current * dt);

    if (mousePos?.current) {
      materialRef.current.uniforms.uMouse.value.set(mousePos.current.x, mousePos.current.y);
      materialRef.current.uniforms.uMouseActive.value = MathUtils.lerp(
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: mouseRadius/mouseStrength intentionally omitted — they are written to the live uniform in the useEffect below to avoid recreating the full uniform object on preset changes
  const uniforms = useMemo(
    () => ({
      uSize: { value: particleSize ?? 7.0 },
      uTime: { value: 0 },
      uColorA: { value: new Color(eraConfig.primaryHex) },
      uColorB: { value: new Color(eraConfig.secondaryHex) },
      uMouse: { value: new Vector2(0, 0) },
      uMouseActive: { value: 0.0 },
      uMouseRadius: { value: mouseRadius },
      uMouseStrength: { value: mouseStrength },
      uAlpha: { value: particleAlpha ?? 0.95 },
    }),
    [eraConfig.primaryHex, eraConfig.secondaryHex, particleAlpha, particleSize],
  );

  // Sync mouse force uniforms when preset changes — avoids recreating all uniforms
  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uMouseRadius.value = mouseRadius;
    materialRef.current.uniforms.uMouseStrength.value = mouseStrength;
  }, [mouseRadius, mouseStrength]);

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
        blending={isLightTheme ? NormalBlending : AdditiveBlending}
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
//
// presetId — key into SCENE_PRESETS (default: 'particles').
//   Controls bloom intensity, lerpSpeed, and mouse force field.
//   The 'constellation' preset also renders connecting line segments between nearby particles.

const ResumeSceneCanvas = ({
  eraConfig,
  eraId,
  mousePos,
  particleSize = 7.0,
  particleAlpha = 0.95,
  particleOffset = [0, 0],
  presetId = DEFAULT_PRESET_ID,
  isLightTheme = false,
  lightBgHex = '#f0f0f0',
}) => {
  // Light themes keep their own background — era bgHex values are dark by design
  const bg = isLightTheme ? lightBgHex : eraConfig?.bgHex || '#0f172a';
  const preset = SCENE_PRESETS[presetId] ?? SCENE_PRESETS[DEFAULT_PRESET_ID];

  // Constellation lines: track target positions from Particles when preset requires it.
  // linePositions is null until Particles notifies us via onTargetReady.
  const [linePositions, setLinePositions] = useState(null);

  // Recompute constellation lines when era or preset changes
  const handleTargetReady = useMemo(() => {
    if (!preset.showConnections) return undefined;
    return (positions) => {
      setLinePositions(computeLinePairs(positions, preset.connectionThreshold));
    };
  }, [preset.showConnections, preset.connectionThreshold]);

  // Clear line state when switching away from constellation preset
  useEffect(() => {
    if (!preset.showConnections) setLinePositions(null);
  }, [preset.showConnections]);

  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 60, near: 0.1, far: 100 }}
      gl={{ antialias: false, alpha: false }}
      style={{ background: bg }}
      dpr={[1, 1.5]}
    >
      <color attach="background" args={[bg]} />
      <group position={[particleOffset[0], particleOffset[1], 0]}>
        {/* LogoGlow uses AdditiveBlending — invisible/counterproductive on light backgrounds */}
        {!isLightTheme && <LogoGlow secondaryHex={eraConfig?.secondaryHex || '#ffd700'} />}
        <Particles
          eraConfig={eraConfig}
          eraId={eraId}
          mousePos={mousePos}
          particleSize={particleSize}
          particleAlpha={particleAlpha}
          lerpSpeed={preset.lerpSpeed}
          mouseRadius={0}
          mouseStrength={0}
          onTargetReady={handleTargetReady}
          isLightTheme={isLightTheme}
        />
        {preset.showConnections && linePositions && (
          <ConstellationLines
            linePositions={linePositions}
            color={eraConfig?.primaryHex ?? '#3b82f6'}
            isLightTheme={isLightTheme}
          />
        )}
      </group>
      <CameraDrift />
      <EffectComposer>
        {/* Light themes: bloom is near-invisible with NormalBlending; use minimal settings */}
        <Bloom
          luminanceThreshold={isLightTheme ? 0.95 : preset.bloom.threshold}
          intensity={isLightTheme ? 0.15 : preset.bloom.intensity}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
};

export default ResumeSceneCanvas;
