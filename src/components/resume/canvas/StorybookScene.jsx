import { useCallback, useEffect, useRef } from 'react';

/**
 * StorybookScene — Canvas 2D overlay evoking hand-illustrated storybook art.
 *
 * Captures the warmth and nostalgia of classic watercolor-over-ink book
 * illustrations: layered washes with visible brush texture, gnarled oak trees,
 * rolling hills fading to misty blue-green, wildflowers, and hand-wobbly ink
 * outlines. As the user scrolls through career eras the scene transitions
 * through seasons — spring buds → summer bloom → autumn harvest → winter quiet.
 *
 * All watercolor textures are generated procedurally on mount via offscreen
 * canvases and cached for reuse. No external image assets needed.
 */

// ─── Seasonal palettes ───────────────────────────────────────────────────────

const SEASONS = {
  spring: {
    sky: [220, 232, 242],
    skyBottom: [245, 240, 228],
    hills: [
      [180, 205, 160, 0.35],
      [165, 195, 145, 0.3],
      [150, 185, 135, 0.25],
    ],
    ground: [215, 200, 165],
    foliage: ['#7da85a', '#92b86a', '#a8cc7e', '#6b9848'],
    flowers: ['#e8a0b5', '#f0c0d0', '#ffe0b3', '#ffd6e0', '#e8d060'],
    trunk: '#6b5232',
    bark: '#5a4228',
    ink: '#3a2e1e',
    grassTints: ['#7da85a', '#6b9848', '#8ab868'],
    accent: [180, 150, 80],
    mist: [210, 225, 235, 0.15],
  },
  summer: {
    sky: [200, 222, 240],
    skyBottom: [240, 238, 225],
    hills: [
      [120, 168, 90, 0.4],
      [100, 155, 78, 0.35],
      [85, 140, 65, 0.3],
    ],
    ground: [200, 185, 148],
    foliage: ['#4a8030', '#5a9240', '#6ba450', '#3e7028'],
    flowers: ['#d85a80', '#c84868', '#e87098', '#e8a0b5'],
    trunk: '#5a4020',
    bark: '#4a3418',
    ink: '#2e2218',
    grassTints: ['#4a8030', '#5a9240', '#3e7028'],
    accent: [190, 145, 40],
    mist: [200, 218, 230, 0.1],
  },
  autumn: {
    sky: [225, 218, 205],
    skyBottom: [242, 232, 215],
    hills: [
      [185, 155, 95, 0.35],
      [170, 140, 80, 0.3],
      [160, 130, 70, 0.25],
    ],
    ground: [200, 178, 135],
    foliage: ['#c07028', '#d48838', '#e0a048', '#b05820', '#cc6020'],
    flowers: ['#a04820', '#b85828'],
    trunk: '#504028',
    bark: '#3e3018',
    ink: '#2a1e10',
    grassTints: ['#a09040', '#908030', '#b8a050'],
    accent: [175, 115, 35],
    mist: [215, 205, 190, 0.12],
  },
  winter: {
    sky: [218, 225, 232],
    skyBottom: [235, 230, 222],
    hills: [
      [175, 180, 172, 0.25],
      [168, 172, 165, 0.2],
      [160, 165, 158, 0.18],
    ],
    ground: [215, 208, 195],
    foliage: ['#7a7868', '#8a8878', '#989688'],
    flowers: [],
    trunk: '#5e5242',
    bark: '#4e4235',
    ink: '#3a3028',
    grassTints: ['#8a8868', '#7a7858'],
    accent: [150, 138, 110],
    mist: [210, 215, 220, 0.18],
  },
};

const SEASON_KEYS = ['spring', 'summer', 'autumn', 'winter'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function srand(seed) {
  let s = Math.abs(seed) || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(a, b, t) {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ];
}

function rgb(c) {
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function rgba(c, a) {
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

function eraToSeason(idx, total) {
  if (total <= 1) return { season: 'spring', next: 'summer', blend: 0 };
  const t = (idx / (total - 1)) * 3;
  const i = Math.min(Math.floor(t), 3);
  return { season: SEASON_KEYS[i], next: SEASON_KEYS[Math.min(i + 1, 3)], blend: t - i };
}

function blendPal(palA, palB, t) {
  return {
    sky: lerpColor(palA.sky, palB.sky, t),
    skyBottom: lerpColor(palA.skyBottom, palB.skyBottom, t),
    ground: lerpColor(palA.ground, palB.ground, t),
    accent: lerpColor(palA.accent, palB.accent, t),
    dominant: t < 0.5 ? palA : palB,
  };
}

// ─── Texture generation (run once on mount) ──────────────────────────────────

function createNoiseGrain(size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const id = ctx.createImageData(size, size);
  const d = id.data;
  const r = srand(97);
  for (let i = 0; i < d.length; i += 4) {
    const v = 128 + (r() - 0.5) * 80;
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(id, 0, 0);
  return c;
}

function createPaperTexture(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  // Layer 1: warm paper base
  ctx.fillStyle = '#f8f2e8';
  ctx.fillRect(0, 0, w, h);

  // Layer 2: fine grain noise
  const id = ctx.createImageData(w, h);
  const d = id.data;
  const r = srand(7);
  for (let i = 0; i < d.length; i += 4) {
    const v = 245 + (r() - 0.5) * 18;
    d[i] = v;
    d[i + 1] = v - 3;
    d[i + 2] = v - 8;
    d[i + 3] = 30;
  }
  ctx.putImageData(id, 0, 0);

  // Layer 3: larger soft blotches — wet paper effect
  const r2 = srand(13);
  for (let i = 0; i < 20; i++) {
    const bx = r2() * w;
    const by = r2() * h;
    const br = 40 + r2() * 120;
    const grd = ctx.createRadialGradient(bx, by, 0, bx, by, br);
    grd.addColorStop(0, `rgba(180,165,140,${0.03 + r2() * 0.03})`);
    grd.addColorStop(1, 'rgba(180,165,140,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(bx - br, by - br, br * 2, br * 2);
  }

  // Layer 4: fibrous paper streaks — horizontal grain
  const r3 = srand(29);
  for (let i = 0; i < 30; i++) {
    const sy = r3() * h;
    ctx.save();
    ctx.globalAlpha = 0.012 + r3() * 0.018;
    ctx.strokeStyle = `rgb(${170 + r3() * 30},${155 + r3() * 20},${120 + r3() * 30})`;
    ctx.lineWidth = 0.5 + r3() * 1.5;
    ctx.beginPath();
    ctx.moveTo(0, sy);
    for (let x = 0; x < w; x += 20) {
      ctx.lineTo(x, sy + (r3() - 0.5) * 3);
    }
    ctx.stroke();
    ctx.restore();
  }

  return c;
}

function createWashTexture(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  // Transparent base
  ctx.clearRect(0, 0, w, h);

  // Soft watercolor blobs with varied edges
  const r = srand(31);
  for (let i = 0; i < 12; i++) {
    const bx = r() * w;
    const by = r() * h;
    const br = 60 + r() * 180;

    ctx.save();
    ctx.globalAlpha = 0.04 + r() * 0.06;

    // Wobbly circle — watercolor edges aren't smooth
    ctx.beginPath();
    const points = 24;
    for (let j = 0; j <= points; j++) {
      const angle = (j / points) * Math.PI * 2;
      const wobble = br * (0.7 + r() * 0.6);
      const px = bx + Math.cos(angle) * wobble;
      const py = by + Math.sin(angle) * wobble;
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    // Warm brown tint — like tea staining paper
    ctx.fillStyle = `rgb(${160 + r() * 40},${140 + r() * 30},${100 + r() * 40})`;
    ctx.fill();
    ctx.restore();
  }

  // Additional soft-edge bleeds — lighter halos around blobs
  const r2 = srand(47);
  for (let i = 0; i < 8; i++) {
    const bx = r2() * w;
    const by = r2() * h;
    const br = 80 + r2() * 200;
    ctx.save();
    ctx.globalAlpha = 0.015 + r2() * 0.025;
    const grd = ctx.createRadialGradient(bx, by, br * 0.5, bx, by, br);
    grd.addColorStop(0, 'rgba(180,165,140,0)');
    grd.addColorStop(0.6, `rgba(${170 + r2() * 30},${150 + r2() * 25},${110 + r2() * 30},0.3)`);
    grd.addColorStop(1, 'rgba(180,165,140,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(bx - br, by - br, br * 2, br * 2);
    ctx.restore();
  }

  return c;
}

// ─── Drawing functions ───────────────────────────────────────────────────────

function drawSky(ctx, w, h, pal) {
  const grd = ctx.createLinearGradient(0, 0, 0, h * 0.55);
  grd.addColorStop(0, rgb(pal.sky));
  grd.addColorStop(1, rgb(pal.skyBottom));
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
}

function drawHills(ctx, w, h, dom, bloom) {
  // 3 layers of rolling hills, back to front, each more opaque
  const hillDefs = [
    { y: 0.38, amplitude: 25, freq: 0.003, alpha: dom.hills[0]?.[3] ?? 0.3 },
    { y: 0.48, amplitude: 20, freq: 0.005, alpha: dom.hills[1]?.[3] ?? 0.25 },
    { y: 0.58, amplitude: 15, freq: 0.007, alpha: dom.hills[2]?.[3] ?? 0.2 },
  ];

  for (let hi = 0; hi < hillDefs.length; hi++) {
    const hd = hillDefs[hi];
    const hillColor = dom.hills[hi] ?? [150, 180, 130, 0.3];

    // Helper to build hill path with optional vertical offset for bleed
    const hillPath = (yOffset) => {
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 4) {
        const baseY = h * hd.y + yOffset;
        const noise =
          Math.sin(x * hd.freq + hi * 2) * hd.amplitude +
          Math.sin(x * hd.freq * 2.3 + hi * 5) * hd.amplitude * 0.4;
        ctx.lineTo(x, baseY + noise);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
    };

    ctx.save();

    // Edge bleed — draw slightly larger hill behind at low opacity
    ctx.globalAlpha = hd.alpha * 0.2 * Math.min(bloom * 2, 1);
    ctx.fillStyle = `rgb(${hillColor[0]},${hillColor[1]},${hillColor[2]})`;
    hillPath(-3);
    ctx.fill();

    // Main hill fill
    ctx.globalAlpha = hd.alpha * Math.min(bloom * 2, 1);
    ctx.fillStyle = `rgb(${hillColor[0]},${hillColor[1]},${hillColor[2]})`;
    hillPath(0);
    ctx.fill();

    // Misty overlay on distant hills
    if (hi < 2) {
      ctx.globalAlpha = (dom.mist?.[3] ?? 0.1) * (2 - hi) * 0.5;
      ctx.fillStyle = `rgb(${dom.mist?.[0] ?? 210},${dom.mist?.[1] ?? 220},${dom.mist?.[2] ?? 230})`;
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawGround(ctx, w, h, groundColor, dom, bloom) {
  const groundY = h * 0.65;

  // Helper to build ground path with optional vertical offset
  const groundPath = (yOff) => {
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 6) {
      const noise = Math.sin(x * 0.01) * 8 + Math.sin(x * 0.025) * 4;
      ctx.lineTo(x, groundY + noise + yOff);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
  };

  ctx.save();

  // Edge bleed — slightly higher ground at low opacity
  groundPath(-3);
  ctx.fillStyle = rgba(groundColor, 0.15);
  ctx.fill();

  // Main watercolor wash ground — uneven edge
  groundPath(0);
  const grd = ctx.createLinearGradient(0, groundY, 0, h);
  grd.addColorStop(0, rgba(groundColor, 0.4));
  grd.addColorStop(0.4, rgba(groundColor, 0.55));
  grd.addColorStop(1, rgba(groundColor, 0.7));
  ctx.fillStyle = grd;
  ctx.fill();

  // Grass tufts
  if (bloom > 0.2) {
    const grassAlpha = Math.min((bloom - 0.2) / 0.8, 1);
    const rng = srand(42);
    const tints = dom.grassTints ?? ['#6a8a4a'];
    for (let i = 0; i < 50; i++) {
      const gx = rng() * w;
      const gy = groundY + 5 + rng() * (h - groundY - 20) + Math.sin(gx * 0.02) * 5;
      const gh = (8 + rng() * 18) * grassAlpha;
      const lean = (rng() - 0.5) * 12;

      ctx.strokeStyle = tints[i % tints.length];
      ctx.lineWidth = 0.8 + rng() * 0.8;
      ctx.globalAlpha = (0.15 + rng() * 0.2) * grassAlpha;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.quadraticCurveTo(gx + lean * 0.5, gy - gh * 0.5, gx + lean, gy - gh);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Build a wobbly closed path of `pts` points around (cx,cy) with random radii. */
function wobbleBlob(ctx, cx, cy, baseR, ySquash, pts, rng) {
  ctx.beginPath();
  for (let p = 0; p <= pts; p++) {
    const a = (p / pts) * Math.PI * 2;
    const wobble = baseR * (0.75 + rng() * 0.5);
    const px = cx + Math.cos(a) * wobble;
    const py = cy + Math.sin(a) * wobble * ySquash;
    if (p === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** Shift a hex color's hue by a small random amount — warm/cool variation. */
function tintHex(hex, rng) {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  const shift = Math.round((rng() - 0.5) * 20);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  return `rgb(${clamp(r + shift)},${clamp(g + shift * 0.6)},${clamp(b - shift * 0.3)})`;
}

function drawOakTree(ctx, x, baseY, size, pal, bloom, seed) {
  if (bloom <= 0) return;
  const rng = srand(seed);
  const scale = size / 100;
  const bleedPx = 3 * scale; // edge-bleed distance

  ctx.save();

  // ── Shadow beneath the tree ──
  if (bloom > 0.3) {
    const shadowAlpha = 0.06 * Math.min((bloom - 0.3) / 0.4, 1);
    const shadowW = 50 * scale;
    const shadowH = 8 * scale;
    ctx.save();
    ctx.globalAlpha = shadowAlpha;
    ctx.fillStyle = 'rgba(40,30,15,1)';
    ctx.beginPath();
    ctx.ellipse(x, baseY + 4 * scale, shadowW, shadowH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Trunk — thick, gnarled, with branching ──
  const trunkH = 65 * scale * Math.min(bloom * 1.8, 1);
  const trunkW = 12 * scale;

  // Helper: draw trunk shape at given offset/extra width for bleed
  const trunkPath = (extra) => {
    ctx.beginPath();
    ctx.moveTo(x - trunkW - extra, baseY);
    ctx.bezierCurveTo(
      x - (trunkW + extra) * 0.8 + rng() * 3,
      baseY - trunkH * 0.4,
      x - (trunkW + extra) * 0.5 + rng() * 4,
      baseY - trunkH * 0.8,
      x + rng() * 4 - 2,
      baseY - trunkH,
    );
    ctx.bezierCurveTo(
      x + (trunkW + extra) * 0.5 - rng() * 4,
      baseY - trunkH * 0.8,
      x + (trunkW + extra) * 0.8 - rng() * 3,
      baseY - trunkH * 0.4,
      x + trunkW + extra,
      baseY,
    );
    ctx.closePath();
  };

  // Edge bleed — slightly larger, diluted trunk behind main
  // Re-seed so the bleed mirrors the trunk shape
  const trunkSeedState = seed + 1000;
  {
    const bleedRng = srand(trunkSeedState);
    // consume same random values so shape aligns
    for (let i = 0; i < 4; i++) bleedRng();
    ctx.globalAlpha = 0.12 * Math.min(bloom * 2, 1);
    ctx.fillStyle = pal.trunk;
    trunkPath(bleedPx);
    ctx.fill();
  }

  // Main trunk fill — brownish watercolor wash
  // Reset rng for trunk to match the original bezier random calls
  const trunkRng = srand(seed);
  // consume the same sequence the original code consumed
  for (let i = 0; i < 0; i++) trunkRng();
  ctx.globalAlpha = 0.4 * Math.min(bloom * 2, 1);
  ctx.fillStyle = pal.trunk;
  trunkPath(0);
  ctx.fill();

  // Ink outline on trunk — roughened with small random offsets
  ctx.globalAlpha = 0.3 * Math.min(bloom * 2, 1);
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Bark texture — short cross-hatch marks
  ctx.globalAlpha = 0.12 * Math.min(bloom * 2, 1);
  ctx.strokeStyle = pal.bark;
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 8; i++) {
    const bx = x + (rng() - 0.5) * trunkW * 1.2;
    const by = baseY - rng() * trunkH * 0.8;
    ctx.beginPath();
    ctx.moveTo(bx - 2, by - 1);
    ctx.lineTo(bx + 2, by + 1);
    ctx.stroke();
  }

  // Watercolor texture on trunk — varied opacity stripes
  ctx.globalAlpha = 0.06 * Math.min(bloom * 2, 1);
  ctx.strokeStyle = pal.bark;
  for (let i = 0; i < 5; i++) {
    const ty = baseY - rng() * trunkH * 0.85;
    ctx.lineWidth = 1 + rng() * 3;
    ctx.globalAlpha = (0.04 + rng() * 0.06) * Math.min(bloom * 2, 1);
    ctx.beginPath();
    ctx.moveTo(x - trunkW * 0.6, ty + (rng() - 0.5) * 2);
    ctx.lineTo(x + trunkW * 0.6, ty + (rng() - 0.5) * 2);
    ctx.stroke();
  }

  // Major branches — spreading limbs
  if (bloom > 0.3) {
    const branchAlpha = Math.min((bloom - 0.3) / 0.4, 1);
    ctx.strokeStyle = pal.trunk;
    ctx.lineWidth = 3 * scale;

    const branchTop = baseY - trunkH;
    for (let b = 0; b < 3; b++) {
      const angle = -0.8 + b * 0.8 + (rng() - 0.5) * 0.3;
      const bLen = (30 + rng() * 25) * scale * branchAlpha;
      const bx2 = x + Math.cos(angle - Math.PI / 2) * bLen;
      const by2 = branchTop + Math.sin(angle - Math.PI / 2) * bLen;
      const startX = x + (rng() - 0.5) * 4;
      const startY = branchTop + rng() * 5;
      const cpx = (x + bx2) / 2 + (rng() - 0.5) * 10;
      const cpy = (branchTop + by2) / 2 - 5;

      // Branch bleed — slightly wider stroke behind
      ctx.globalAlpha = 0.1 * branchAlpha;
      ctx.lineWidth = 3 * scale + bleedPx;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(cpx, cpy, bx2, by2);
      ctx.stroke();

      // Main branch stroke
      ctx.globalAlpha = 0.3 * branchAlpha;
      ctx.lineWidth = 3 * scale;
      ctx.strokeStyle = pal.trunk;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(cpx, cpy, bx2, by2);
      ctx.stroke();

      // Ink outline on branch
      ctx.globalAlpha = 0.15 * branchAlpha;
      ctx.strokeStyle = pal.ink;
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.strokeStyle = pal.trunk;
    }
  }

  // ── Canopy — layered watercolor leaf clusters with edge bleed ──
  if (bloom > 0.35) {
    const canopyProgress = Math.min((bloom - 0.35) / 0.65, 1);
    const canopyY = baseY - trunkH - 10 * scale;
    const canopyR = 45 * scale;
    const colors = pal.foliage;

    // Multiple overlapping leaf masses with hue variation
    for (let layer = 0; layer < 3; layer++) {
      const layerAlpha = (0.12 + layer * 0.04) * canopyProgress;
      for (let c = 0; c < 6; c++) {
        const cx = x + (rng() - 0.5) * canopyR * 1.8;
        const cy = canopyY + (rng() - 0.5) * canopyR * 0.8 - layer * 5;
        const cr = canopyR * (0.3 + rng() * 0.4) * canopyProgress;
        const baseColor = colors[Math.floor(rng() * colors.length)];
        const color = tintHex(baseColor, rng);

        // Edge bleed — larger, faded blob behind
        ctx.globalAlpha = layerAlpha * 0.35;
        ctx.fillStyle = color;
        wobbleBlob(ctx, cx, cy, cr + bleedPx, 0.7, 16, rng);
        ctx.fill();

        // Main foliage blob
        ctx.globalAlpha = layerAlpha;
        ctx.fillStyle = color;
        wobbleBlob(ctx, cx, cy, cr, 0.7, 16, rng);
        ctx.fill();

        // Noise-like opacity variation — stipple dots inside blob
        if (layer === 2 && cr > 8) {
          ctx.globalAlpha = layerAlpha * 0.3;
          for (let d = 0; d < 4; d++) {
            const dx = cx + (rng() - 0.5) * cr * 1.2;
            const dy = cy + (rng() - 0.5) * cr * 0.8;
            const dr = 1.5 + rng() * 3;
            ctx.beginPath();
            ctx.arc(dx, dy, dr, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // Ink outlines on canopy edge — sparse, sketchy
    ctx.globalAlpha = 0.08 * canopyProgress;
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 0.6;
    for (let i = 0; i < 12; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = canopyR * (0.6 + rng() * 0.5);
      const sx = x + Math.cos(angle) * dist;
      const sy = canopyY + Math.sin(angle) * dist * 0.7;
      const len = 5 + rng() * 10;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (rng() - 0.5) * len, sy + (rng() - 0.5) * len * 0.5);
      ctx.stroke();
    }
  }

  // ── Roots — visible at base ──
  if (bloom > 0.2) {
    ctx.globalAlpha = 0.2 * Math.min(bloom, 1);
    ctx.strokeStyle = pal.trunk;
    ctx.lineWidth = 2 * scale;
    for (let r = 0; r < 3; r++) {
      const dir = r === 0 ? -1 : r === 1 ? 1 : 0;
      const rootLen = (15 + rng() * 12) * scale;
      ctx.beginPath();
      ctx.moveTo(x + dir * trunkW * 0.8, baseY);
      ctx.quadraticCurveTo(
        x + dir * (trunkW + rootLen * 0.4),
        baseY + 3,
        x + dir * (trunkW + rootLen),
        baseY + 5 + rng() * 4,
      );
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawWildflowers(ctx, w, h, pal, bloom, seed) {
  if (bloom < 0.4 || (pal.flowers?.length ?? 0) === 0) return;
  const rng = srand(seed);
  const progress = Math.min((bloom - 0.4) / 0.6, 1);
  const groundY = h * 0.65;

  ctx.save();
  const count = Math.floor(18 * progress);

  for (let i = 0; i < count; i++) {
    const fx = w * 0.03 + rng() * w * 0.94;
    const fy = groundY + 8 + rng() * (h - groundY - 25) + Math.sin(fx * 0.015) * 5;
    const stemH = (15 + rng() * 30) * progress;

    // Stem — thin green line with slight curve
    ctx.strokeStyle = pal.grassTints?.[0] ?? '#6a8a4a';
    ctx.lineWidth = 0.7;
    ctx.globalAlpha = 0.25 * progress;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    const lean = (rng() - 0.5) * 10;
    ctx.quadraticCurveTo(fx + lean * 0.4, fy - stemH * 0.5, fx + lean, fy - stemH);
    ctx.stroke();

    // Flower head
    if (progress > 0.5) {
      const headP = Math.min((progress - 0.5) / 0.5, 1);
      const hx = fx + lean;
      const hy = fy - stemH;
      const hr = (2.5 + rng() * 4) * headP;
      const color = pal.flowers[Math.floor(rng() * pal.flowers.length)];

      // Soft watercolor petals
      ctx.globalAlpha = 0.2 * headP;
      ctx.fillStyle = color;
      for (let p = 0; p < 5; p++) {
        const pa = (p / 5) * Math.PI * 2 + rng() * 0.3;
        ctx.beginPath();
        ctx.ellipse(
          hx + Math.cos(pa) * hr * 0.35,
          hy + Math.sin(pa) * hr * 0.35,
          hr * 0.5,
          hr * 0.35,
          pa,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }

      // Yellow centre
      ctx.globalAlpha = 0.3 * headP;
      ctx.fillStyle = '#f0d860';
      ctx.beginPath();
      ctx.arc(hx, hy, hr * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawFloating(ctx, w, h, seasonKey, time, bloom) {
  if (bloom < 0.5) return;
  const alpha = Math.min((bloom - 0.5) / 0.5, 1);
  const pal = SEASONS[seasonKey];

  ctx.save();
  if (seasonKey === 'autumn') {
    for (let i = 0; i < 10; i++) {
      const s = i * 137.508;
      const lx = ((s * 7.3 + time * 12 + i * 90) % (w + 40)) - 20;
      const ly = ((s * 11.7 + time * 18 + i * 55) % (h * 0.65)) + h * 0.2;
      const lr = 3 + (i % 3) * 1.5;
      ctx.globalAlpha = (0.18 + (i % 3) * 0.05) * alpha;
      ctx.fillStyle = pal.foliage[i % pal.foliage.length];
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(time * 0.3 + i);
      ctx.beginPath();
      ctx.ellipse(0, 0, lr, lr * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (seasonKey === 'spring' || seasonKey === 'summer') {
    const colors = pal.flowers;
    if (!colors.length) {
      ctx.restore();
      return;
    }
    for (let i = 0; i < 6; i++) {
      const s = i * 97.31;
      const px = ((s * 5.7 + time * 7 + i * 110) % (w + 30)) - 15;
      const py = ((s * 8.3 + time * 9 + i * 75) % (h * 0.6)) + h * 0.2;
      ctx.globalAlpha = (0.12 + (i % 4) * 0.03) * alpha;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc(px, py, 2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (seasonKey === 'winter') {
    for (let i = 0; i < 12; i++) {
      const s = i * 67.3;
      const sx = ((s * 4.1 + time * 5 + i * 70) % (w + 20)) - 10;
      const sy = ((s * 9.7 + time * 12 + i * 50) % (h * 0.8)) + h * 0.1;
      ctx.globalAlpha = (0.1 + (i % 4) * 0.03) * alpha;
      ctx.fillStyle = '#ddd8cc';
      ctx.beginPath();
      ctx.arc(sx, sy, 1.2 + (i % 3) * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawScene(ctx, w, h, seasonInfo, bloom, time, paperTex, washTex, grainTex) {
  const { season, next, blend } = seasonInfo;
  const palA = SEASONS[season];
  const palB = SEASONS[next];
  const mixed = blendPal(palA, palB, blend);
  const dom = mixed.dominant;

  // 1. Sky gradient
  drawSky(ctx, w, h, mixed);

  // 2. Paper texture — very subtle, composited early
  if (paperTex) {
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(paperTex, 0, 0, w, h);
    ctx.restore();
  }

  // 3. Rolling hills — depth layers
  drawHills(ctx, w, h, dom, bloom);

  // 4. Wash texture — watercolor bleed effect
  if (washTex) {
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(washTex, 0, 0, w, h);
    ctx.restore();
  }

  // 5. Ground plane
  drawGround(ctx, w, h, mixed.ground, dom, bloom);

  // 6. Trees — 4 oak trees at different sizes for depth
  const trees = [
    { x: 0.06, y: 0.68, size: 75, seed: 11 },
    { x: 0.25, y: 0.7, size: 110, seed: 37 },
    { x: 0.58, y: 0.67, size: 90, seed: 53 },
    { x: 0.85, y: 0.71, size: 100, seed: 79 },
  ];
  for (const t of trees) {
    const treeBloom = Math.max(0, Math.min(1, bloom * 1.4 - 0.05));
    drawOakTree(ctx, w * t.x, h * t.y, t.size, dom, treeBloom, t.seed);
  }

  // 7. Wildflowers
  drawWildflowers(ctx, w, h, dom, bloom, season.charCodeAt(0) * 100);

  // 8. Floating elements
  const domKey = blend < 0.5 ? season : next;
  drawFloating(ctx, w, h, domKey, time, bloom);

  // 9. Paper grain overlay — tiled noise at very low opacity for parchment feel
  if (grainTex) {
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.globalCompositeOperation = 'overlay';
    const pat = ctx.createPattern(grainTex, 'repeat');
    if (pat) {
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }

  // 10. Final paper edge vignette
  ctx.save();
  const vGrd = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.8);
  vGrd.addColorStop(0, 'rgba(0,0,0,0)');
  vGrd.addColorStop(1, 'rgba(60,45,25,0.04)');
  ctx.fillStyle = vGrd;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// ─── React component ─────────────────────────────────────────────────────────

export default function StorybookScene({ activeEraIndex = -1, totalEras = 1 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const timeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const bloomRef = useRef(0);
  const targetBloomRef = useRef(0);
  const seasonRef = useRef({ season: 'spring', next: 'spring', blend: 0 });
  const texturesRef = useRef({ paper: null, wash: null, grain: null });

  // Generate textures once on mount
  useEffect(() => {
    texturesRef.current.paper = createPaperTexture(512, 512);
    texturesRef.current.wash = createWashTexture(512, 512);
    texturesRef.current.grain = createNoiseGrain(64);
  }, []);

  // Update targets when era changes
  useEffect(() => {
    if (activeEraIndex < 0) {
      targetBloomRef.current = 0.5;
      seasonRef.current = { season: 'spring', next: 'spring', blend: 0 };
    } else if (activeEraIndex >= totalEras) {
      targetBloomRef.current = 1.0;
      seasonRef.current = { season: 'winter', next: 'winter', blend: 0 };
    } else {
      targetBloomRef.current = 1.0;
      seasonRef.current = eraToSeason(activeEraIndex, totalEras);
    }
  }, [activeEraIndex, totalEras]);

  const render = useCallback((timestamp) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const delta = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : 0.016;
    lastTimeRef.current = timestamp;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    // Smooth bloom
    bloomRef.current += (targetBloomRef.current - bloomRef.current) * 0.025;

    ctx.save();
    ctx.scale(dpr, dpr);
    drawScene(
      ctx,
      rect.width,
      rect.height,
      seasonRef.current,
      bloomRef.current,
      timeRef.current,
      texturesRef.current.paper,
      texturesRef.current.wash,
      texturesRef.current.grain,
    );
    ctx.restore();

    timeRef.current += delta;
    animRef.current = requestAnimationFrame(render);
  }, []);

  useEffect(() => {
    animRef.current = requestAnimationFrame(render);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
      }}
    />
  );
}
