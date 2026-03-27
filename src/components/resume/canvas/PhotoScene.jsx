import { useCallback, useEffect, useRef } from 'react';

/**
 * PhotoScene — Canvas 2D overlay evoking photography and visual arts.
 *
 * For photography/visual arts professionals. Camera aperture blades open
 * and close, film strips advance, a viewfinder grid frames the scene,
 * and lens flare effects respond to scroll progress.
 */

// ─── Palette ─────────────────────────────────────────────────────────────────

const BG_DARK = '#1a1a1a';
const BG_DEEPER = '#111111';
const CHARCOAL = '#2a2a2a';
const FILM_BASE = '#222222';
const AMBER = '#d4952a';
const AMBER_BRIGHT = '#f0b840';
const FRAME_WHITE = '#cccccc';
const RED_INDICATOR = '#cc3333';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function srand(seed) {
  let s = Math.abs(seed) || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Film grain texture (run once) ───────────────────────────────────────────

function createGrainTexture(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = BG_DARK;
  ctx.fillRect(0, 0, w, h);

  const rng = srand(23);
  const id = ctx.createImageData(w, h);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = 26 + (rng() - 0.5) * 16;
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = 40;
  }
  ctx.putImageData(id, 0, 0);

  return c;
}

// ─── Drawing functions ───────────────────────────────────────────────────────

function drawBackground(ctx, w, h, grainTex) {
  const grd = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
  grd.addColorStop(0, CHARCOAL);
  grd.addColorStop(1, BG_DEEPER);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);

  if (grainTex) {
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.drawImage(grainTex, 0, 0, w, h);
    ctx.restore();
  }
}

function drawAperture(ctx, w, h, progress, time) {
  const cx = w * 0.5;
  const cy = h * 0.42;
  const maxR = Math.min(w, h) * 0.22;

  // Aperture opening tracks scroll: closed at 0, open at 1
  const openAmount = 0.15 + progress * 0.85;
  const bladeCount = 7;
  const bladeAngle = (Math.PI * 2) / bladeCount;
  const innerR = maxR * (1 - openAmount);
  const outerR = maxR;

  ctx.save();
  ctx.translate(cx, cy);

  // Outer ring
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = FRAME_WHITE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, outerR + 5, 0, Math.PI * 2);
  ctx.stroke();

  // Aperture blades
  const rotOffset = time * 0.1;
  for (let i = 0; i < bladeCount; i++) {
    const angle = i * bladeAngle + rotOffset;
    const nextAngle = (i + 1) * bladeAngle + rotOffset;

    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#333340';

    const p1x = Math.cos(angle) * innerR;
    const p1y = Math.sin(angle) * innerR;
    const p2x = Math.cos(angle) * outerR;
    const p2y = Math.sin(angle) * outerR;
    const p3x = Math.cos(nextAngle) * outerR;
    const p3y = Math.sin(nextAngle) * outerR;
    const p4x = Math.cos(nextAngle) * innerR;
    const p4y = Math.sin(nextAngle) * innerR;

    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    ctx.lineTo(p2x, p2y);
    ctx.lineTo(p3x, p3y);
    ctx.lineTo(p4x, p4y);
    ctx.closePath();
    ctx.fill();

    // Blade edge highlight
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = '#555566';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Center opening
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = BG_DEEPER;
  ctx.beginPath();
  ctx.arc(0, 0, innerR, 0, Math.PI * 2);
  ctx.fill();

  // f-stop text
  if (progress > 0.2) {
    const fStop = (22 - progress * 20).toFixed(1);
    ctx.globalAlpha = 0.25 * Math.min(1, (progress - 0.2) / 0.3);
    ctx.fillStyle = FRAME_WHITE;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`f/${fStop}`, 0, outerR + 20);
  }

  ctx.restore();
}

function drawFilmStrips(ctx, w, h, progress, time) {
  if (progress < 0.1) return;
  const alpha = Math.min(1, (progress - 0.1) / 0.4);

  const stripH = 50;
  const sprocketSize = 6;
  const sprocketGap = 16;

  ctx.save();

  // Top film strip
  const topY = h * 0.05;
  const advanceOffset = time * 30 + progress * w * 0.5;

  ctx.globalAlpha = 0.25 * alpha;
  ctx.fillStyle = FILM_BASE;
  ctx.fillRect(0, topY, w, stripH);

  // Sprocket holes
  ctx.fillStyle = BG_DEEPER;
  for (let x = -advanceOffset % sprocketGap; x < w; x += sprocketGap) {
    ctx.fillRect(x, topY + 4, sprocketSize, sprocketSize);
    ctx.fillRect(x, topY + stripH - sprocketSize - 4, sprocketSize, sprocketSize);
  }

  // Film frames
  ctx.globalAlpha = 0.12 * alpha;
  ctx.strokeStyle = AMBER;
  ctx.lineWidth = 0.5;
  const frameW = 65;
  for (let x = -advanceOffset % (frameW + 4); x < w; x += frameW + 4) {
    ctx.strokeRect(
      x + sprocketSize + 2,
      topY + sprocketSize + 2,
      frameW - sprocketSize * 2 - 4,
      stripH - sprocketSize * 2 - 4,
    );
  }

  // Bottom film strip
  const botY = h * 0.88;
  ctx.globalAlpha = 0.2 * alpha;
  ctx.fillStyle = FILM_BASE;
  ctx.fillRect(0, botY, w, stripH);

  ctx.fillStyle = BG_DEEPER;
  const advanceOffset2 = time * 20 + progress * w * 0.3;
  for (let x = -advanceOffset2 % sprocketGap; x < w; x += sprocketGap) {
    ctx.fillRect(x, botY + 4, sprocketSize, sprocketSize);
    ctx.fillRect(x, botY + stripH - sprocketSize - 4, sprocketSize, sprocketSize);
  }

  ctx.restore();
}

function drawViewfinder(ctx, w, h, progress) {
  if (progress < 0.15) return;
  const alpha = Math.min(1, (progress - 0.15) / 0.4);
  const margin = Math.min(w, h) * 0.08;

  ctx.save();
  ctx.globalAlpha = 0.15 * alpha;
  ctx.strokeStyle = FRAME_WHITE;
  ctx.lineWidth = 1;

  // Rule of thirds grid
  const left = margin;
  const right = w - margin;
  const top = margin;
  const bottom = h - margin;
  const thirdW = (right - left) / 3;
  const thirdH = (bottom - top) / 3;

  for (let i = 1; i < 3; i++) {
    // Vertical lines
    ctx.beginPath();
    ctx.moveTo(left + i * thirdW, top);
    ctx.lineTo(left + i * thirdW, bottom);
    ctx.stroke();
    // Horizontal lines
    ctx.beginPath();
    ctx.moveTo(left, top + i * thirdH);
    ctx.lineTo(right, top + i * thirdH);
    ctx.stroke();
  }

  // Corner brackets
  ctx.globalAlpha = 0.25 * alpha;
  ctx.lineWidth = 2;
  const bracketLen = 20;
  const corners = [
    [left, top],
    [right, top],
    [right, bottom],
    [left, bottom],
  ];
  for (const [cx, cy] of corners) {
    const dx = cx === left ? 1 : -1;
    const dy = cy === top ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(cx + dx * bracketLen, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + dy * bracketLen);
    ctx.stroke();
  }

  // Center crosshair
  ctx.globalAlpha = 0.12 * alpha;
  ctx.lineWidth = 0.5;
  const ccx = w / 2;
  const ccy = h / 2;
  ctx.beginPath();
  ctx.moveTo(ccx - 15, ccy);
  ctx.lineTo(ccx + 15, ccy);
  ctx.moveTo(ccx, ccy - 15);
  ctx.lineTo(ccx, ccy + 15);
  ctx.stroke();

  // Focus indicator dot
  ctx.globalAlpha = 0.2 * alpha;
  ctx.fillStyle = RED_INDICATOR;
  ctx.beginPath();
  ctx.arc(right - 10, top + 10, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawLensFlare(ctx, w, h, progress, time) {
  if (progress < 0.4) return;
  const alpha = Math.min(1, (progress - 0.4) / 0.4);

  const flareX = w * 0.3 + Math.sin(time * 0.3) * w * 0.1;
  const flareY = h * 0.25 + Math.cos(time * 0.2) * h * 0.05;

  ctx.save();

  // Main flare
  const grd = ctx.createRadialGradient(flareX, flareY, 0, flareX, flareY, 80);
  grd.addColorStop(0, `rgba(240,184,64,${0.15 * alpha})`);
  grd.addColorStop(0.3, `rgba(212,149,42,${0.06 * alpha})`);
  grd.addColorStop(1, 'rgba(212,149,42,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);

  // Secondary flare orbs
  const dx = w / 2 - flareX;
  const dy = h / 2 - flareY;
  for (let i = 1; i <= 3; i++) {
    const ox = flareX + dx * i * 0.4;
    const oy = flareY + dy * i * 0.4;
    const or = 8 + i * 4;
    ctx.globalAlpha = (0.06 * alpha) / i;
    ctx.fillStyle = AMBER_BRIGHT;
    ctx.beginPath();
    ctx.arc(ox, oy, or, 0, Math.PI * 2);
    ctx.fill();
  }

  // Streak line
  ctx.globalAlpha = 0.04 * alpha;
  ctx.strokeStyle = AMBER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(flareX - 100, flareY);
  ctx.lineTo(flareX + 100, flareY);
  ctx.stroke();

  ctx.restore();
}

function drawExposureInfo(ctx, _w, h, progress) {
  if (progress < 0.5) return;
  const alpha = Math.min(1, (progress - 0.5) / 0.3);

  ctx.save();
  ctx.globalAlpha = 0.15 * alpha;
  ctx.fillStyle = FRAME_WHITE;
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';

  const info = [
    `ISO ${Math.floor(100 + progress * 3100)}`,
    `1/${Math.floor(30 + progress * 1000)}s`,
    `${(24 + progress * 176).toFixed(0)}mm`,
  ];
  for (let i = 0; i < info.length; i++) {
    ctx.fillText(info[i], 15, h - 40 + i * 14);
  }
  ctx.restore();
}

function drawScene(ctx, w, h, progress, time, grainTex) {
  drawBackground(ctx, w, h, grainTex);
  drawFilmStrips(ctx, w, h, progress, time);
  drawAperture(ctx, w, h, progress, time);
  drawViewfinder(ctx, w, h, progress);
  drawLensFlare(ctx, w, h, progress, time);
  drawExposureInfo(ctx, w, h, progress);

  // Vignette
  ctx.save();
  const grd = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.75);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// ─── React component ─────────────────────────────────────────────────────────

export default function PhotoScene({ activeEraIndex = -1, totalEras = 1 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const timeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const progressRef = useRef(0);
  const targetProgressRef = useRef(0);
  const grainRef = useRef(null);

  useEffect(() => {
    grainRef.current = createGrainTexture(256, 256);
  }, []);

  useEffect(() => {
    if (activeEraIndex < 0) {
      targetProgressRef.current = 0.15;
    } else if (activeEraIndex >= totalEras) {
      targetProgressRef.current = 1.0;
    } else {
      targetProgressRef.current = 0.15 + (activeEraIndex / Math.max(1, totalEras - 1)) * 0.85;
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

    progressRef.current += (targetProgressRef.current - progressRef.current) * 0.03;

    ctx.save();
    ctx.scale(dpr, dpr);
    drawScene(ctx, rect.width, rect.height, progressRef.current, timeRef.current, grainRef.current);
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
