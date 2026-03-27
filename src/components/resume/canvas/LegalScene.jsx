import { useCallback, useEffect, useRef } from 'react';

/**
 * LegalScene — Canvas 2D overlay evoking courtrooms and legal practice.
 *
 * For legal professionals. Scales of justice balance and tip with scroll,
 * a gavel strikes, classical columns frame the scene, and legal document
 * lines fill in as career eras progress.
 */

// ─── Palette ─────────────────────────────────────────────────────────────────

const NAVY = '#0a1628';
const GOLD = '#c9a84c';
const GOLD_DIM = '#8a7030';
const MARBLE = '#e8e2d8';
const MARBLE_DARK = '#c8c0b2';
const INK = '#1a1a2a';
const PARCHMENT = '#f0e8d8';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function srand(seed) {
  let s = Math.abs(seed) || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Drawing functions ───────────────────────────────────────────────────────

function drawBackground(ctx, w, h) {
  const grd = ctx.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, NAVY);
  grd.addColorStop(0.6, '#0e1e38');
  grd.addColorStop(1, '#0a1425');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
}

function drawColumns(ctx, w, h, progress) {
  if (progress < 0.05) return;
  const alpha = Math.min(1, progress / 0.4);
  const columnCount = 5;
  const colW = Math.min(28, w * 0.03);
  const colH = h * 0.7;
  const baseY = h * 0.85;

  ctx.save();
  for (let i = 0; i < columnCount; i++) {
    const x = w * ((i + 0.5) / columnCount);
    const revealH = colH * Math.min(1, alpha * 1.3);

    // Column shaft
    ctx.globalAlpha = 0.15 * alpha;
    const shaftGrd = ctx.createLinearGradient(x - colW / 2, 0, x + colW / 2, 0);
    shaftGrd.addColorStop(0, MARBLE_DARK);
    shaftGrd.addColorStop(0.3, MARBLE);
    shaftGrd.addColorStop(0.7, MARBLE);
    shaftGrd.addColorStop(1, MARBLE_DARK);
    ctx.fillStyle = shaftGrd;
    ctx.fillRect(x - colW / 2, baseY - revealH, colW, revealH);

    // Fluting lines
    ctx.globalAlpha = 0.05 * alpha;
    ctx.strokeStyle = MARBLE_DARK;
    ctx.lineWidth = 0.5;
    for (let f = 0; f < 4; f++) {
      const fx = x - colW / 2 + (f + 1) * (colW / 5);
      ctx.beginPath();
      ctx.moveTo(fx, baseY - revealH + 10);
      ctx.lineTo(fx, baseY - 5);
      ctx.stroke();
    }

    // Capital (top ornament)
    if (alpha > 0.5) {
      ctx.globalAlpha = 0.12 * alpha;
      ctx.fillStyle = MARBLE;
      ctx.fillRect(x - colW * 0.7, baseY - revealH - 6, colW * 1.4, 8);
      ctx.fillRect(x - colW * 0.55, baseY - revealH - 10, colW * 1.1, 5);
    }

    // Base
    ctx.globalAlpha = 0.12 * alpha;
    ctx.fillStyle = MARBLE_DARK;
    ctx.fillRect(x - colW * 0.65, baseY - 4, colW * 1.3, 6);
  }
  ctx.restore();
}

function drawScales(ctx, w, h, progress, time) {
  if (progress < 0.1) return;
  const alpha = Math.min(1, (progress - 0.1) / 0.4);
  const cx = w * 0.5;
  const cy = h * 0.3;
  const armLen = Math.min(w * 0.18, 120);

  // Tipping motion based on progress
  const tipAngle = Math.sin(progress * Math.PI * 2 + time * 0.5) * 0.12 * (1 - progress * 0.5);

  ctx.save();
  ctx.globalAlpha = 0.6 * alpha;

  // Central pillar
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 15);
  ctx.lineTo(cx, cy + 60);
  ctx.stroke();

  // Base
  ctx.fillStyle = GOLD_DIM;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 62, 25, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Top ornament
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(cx, cy - 2, 5, 0, Math.PI * 2);
  ctx.fill();

  // Beam
  ctx.save();
  ctx.translate(cx, cy + 15);
  ctx.rotate(tipAngle);

  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-armLen, 0);
  ctx.lineTo(armLen, 0);
  ctx.stroke();

  // Left pan
  drawPan(ctx, -armLen, 0, 22, alpha);
  // Right pan
  drawPan(ctx, armLen, 0, 22, alpha);

  ctx.restore();
  ctx.restore();
}

function drawPan(ctx, x, y, size, alpha) {
  const chainLen = 30;

  // Chains
  ctx.strokeStyle = GOLD_DIM;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - size * 0.6, y);
  ctx.lineTo(x - size * 0.4, y + chainLen);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + size * 0.6, y);
  ctx.lineTo(x + size * 0.4, y + chainLen);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + chainLen - 3);
  ctx.stroke();

  // Pan dish
  ctx.fillStyle = GOLD;
  ctx.globalAlpha = 0.4 * alpha;
  ctx.beginPath();
  ctx.ellipse(x, y + chainLen + 2, size, size * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = GOLD_DIM;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5 * alpha;
  ctx.stroke();
}

function drawGavel(ctx, w, h, progress, time) {
  if (progress < 0.25) return;
  const alpha = Math.min(1, (progress - 0.25) / 0.3);
  const gx = w * 0.22;
  const gy = h * 0.55;

  // Gavel strike animation
  const strikeAngle = Math.sin(time * 3) * 0.3 * (1 - progress * 0.3);

  ctx.save();
  ctx.globalAlpha = 0.5 * alpha;
  ctx.translate(gx, gy);
  ctx.rotate(strikeAngle - 0.4);

  // Handle
  ctx.strokeStyle = '#6b4c2a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 50);
  ctx.stroke();

  // Head
  ctx.fillStyle = '#4a3520';
  ctx.fillRect(-15, -6, 30, 12);

  // Metal bands
  ctx.fillStyle = GOLD_DIM;
  ctx.fillRect(-16, -3, 3, 6);
  ctx.fillRect(13, -3, 3, 6);

  ctx.restore();

  // Sound block
  ctx.save();
  ctx.globalAlpha = 0.3 * alpha;
  ctx.fillStyle = '#3a2818';
  ctx.beginPath();
  ctx.ellipse(gx + 5, gy + 55, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(gx - 12, gy + 48, 34, 8);
  ctx.restore();
}

function drawDocumentLines(ctx, w, h, progress) {
  if (progress < 0.35) return;
  const alpha = Math.min(1, (progress - 0.35) / 0.4);
  const rng = srand(88);

  const docX = w * 0.68;
  const docY = h * 0.42;
  const docW = Math.min(w * 0.22, 160);
  const docH = docW * 1.35;

  ctx.save();

  // Document background
  ctx.globalAlpha = 0.15 * alpha;
  ctx.fillStyle = PARCHMENT;
  ctx.fillRect(docX, docY, docW, docH);
  ctx.strokeStyle = MARBLE_DARK;
  ctx.lineWidth = 1;
  ctx.strokeRect(docX, docY, docW, docH);

  // Header line
  ctx.globalAlpha = 0.25 * alpha;
  ctx.fillStyle = INK;
  ctx.fillRect(docX + docW * 0.2, docY + 12, docW * 0.6, 2);

  // Text lines
  const lineCount = Math.floor(12 * alpha);
  ctx.globalAlpha = 0.12 * alpha;
  for (let i = 0; i < lineCount; i++) {
    const ly = docY + 28 + i * 10;
    const lw = docW * (0.5 + rng() * 0.4);
    ctx.fillRect(docX + 10, ly, lw, 1.5);
  }

  // Seal/stamp at bottom
  if (alpha > 0.7) {
    ctx.globalAlpha = 0.2 * alpha;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(docX + docW * 0.75, docY + docH - 25, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(docX + docW * 0.75, docY + docH - 25, 7, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawLegalSymbols(ctx, w, h, progress, time) {
  if (progress < 0.5) return;
  const alpha = Math.min(1, (progress - 0.5) / 0.3);
  const rng = srand(42);

  ctx.save();
  ctx.globalAlpha = 0.08 * alpha;
  ctx.font = '16px serif';
  ctx.fillStyle = GOLD;
  ctx.textAlign = 'center';

  // Floating section symbols
  const symbols = ['\u00A7', '\u00B6', '\u2696', '\u2020'];
  for (let i = 0; i < 8; i++) {
    const sx = rng() * w;
    const baseY = rng() * h;
    const sy = baseY + Math.sin(time * 0.8 + i * 1.5) * 8;
    ctx.fillText(symbols[i % symbols.length], sx, sy);
  }
  ctx.restore();
}

function drawScene(ctx, w, h, progress, time) {
  drawBackground(ctx, w, h);
  drawColumns(ctx, w, h, progress);
  drawScales(ctx, w, h, progress, time);
  drawGavel(ctx, w, h, progress, time);
  drawDocumentLines(ctx, w, h, progress);
  drawLegalSymbols(ctx, w, h, progress, time);

  // Vignette
  ctx.save();
  const grd = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.75);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(1, 'rgba(5,10,20,0.3)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// ─── React component ─────────────────────────────────────────────────────────

export default function LegalScene({ activeEraIndex = -1, totalEras = 1 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const timeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const progressRef = useRef(0);
  const targetProgressRef = useRef(0);

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
    drawScene(ctx, rect.width, rect.height, progressRef.current, timeRef.current);
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
