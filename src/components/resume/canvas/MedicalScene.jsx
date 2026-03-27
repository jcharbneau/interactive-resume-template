import { useCallback, useEffect, useRef } from 'react';

/**
 * MedicalScene — Canvas 2D overlay evoking healthcare and biomedical imagery.
 *
 * For healthcare professionals. Features an EKG heartbeat line pulsing across
 * the screen, a medical cross symbol, molecular structure outlines (hexagonal
 * rings), and a DNA helix that builds with scroll progress. As the user
 * scrolls through career eras, the scene grows more complex.
 */

// ─── Palette ─────────────────────────────────────────────────────────────────

const BG_COLOR = '#f0f5f9';
const BG_BOTTOM = '#e8eef4';
const MED_BLUE = '#0077b6';
const PULSE_RED = '#e63946';
const MINT = '#a8dadc';
const MINT_DARK = '#6bb8bc';
const GRID_COLOR = 'rgba(0,119,182,0.06)';

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
  grd.addColorStop(0, BG_COLOR);
  grd.addColorStop(1, BG_BOTTOM);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
}

function drawGrid(ctx, w, h) {
  ctx.save();
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 0.5;

  const spacing = 25;
  for (let x = 0; x <= w; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawEKG(ctx, w, h, progress, time) {
  if (progress < 0.05) return;
  const ekgAlpha = Math.min(0.7, progress * 1.5);

  ctx.save();
  ctx.globalAlpha = ekgAlpha;
  ctx.strokeStyle = PULSE_RED;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // EKG line position — sweeps from left to right continuously
  const ekgY = h * 0.35;
  const sweepSpeed = 60; // pixels per second
  const sweepPos = (time * sweepSpeed) % w;

  ctx.beginPath();

  for (let x = 0; x < w; x += 2) {
    // Distance from sweep position (wrapping)
    const dist = (x - sweepPos + w) % w;

    // Only draw a trailing segment
    if (dist > w * 0.7) {
      const trailAlpha = 1 - (dist - w * 0.7) / (w * 0.3);
      if (trailAlpha <= 0) continue;
    }

    // EKG waveform pattern repeating
    const cycle = 200; // pixels per heartbeat
    const phase = (x % cycle) / cycle;
    let y = ekgY;

    if (phase > 0.35 && phase < 0.4) {
      // P wave — small bump
      const t = (phase - 0.35) / 0.05;
      y -= Math.sin(t * Math.PI) * 8;
    } else if (phase > 0.45 && phase < 0.48) {
      // Q dip
      const t = (phase - 0.45) / 0.03;
      y += Math.sin(t * Math.PI) * 5;
    } else if (phase > 0.48 && phase < 0.53) {
      // R spike — sharp peak
      const t = (phase - 0.48) / 0.05;
      y -= Math.sin(t * Math.PI) * 35;
    } else if (phase > 0.53 && phase < 0.57) {
      // S dip
      const t = (phase - 0.53) / 0.04;
      y += Math.sin(t * Math.PI) * 10;
    } else if (phase > 0.62 && phase < 0.72) {
      // T wave — gentle bump
      const t = (phase - 0.62) / 0.1;
      y -= Math.sin(t * Math.PI) * 12;
    }

    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Glow at sweep position
  ctx.globalAlpha = 0.4 * ekgAlpha;
  ctx.shadowColor = PULSE_RED;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(sweepPos, ekgY, 3, 0, Math.PI * 2);
  ctx.fillStyle = PULSE_RED;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.restore();
}

function drawMedicalCross(ctx, cx, cy, size, progress) {
  if (progress < 0.1) return;
  const alpha = Math.min(0.3, (progress - 0.1) * 0.8);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = MED_BLUE;
  ctx.lineWidth = 1.5;

  const arm = size;
  const thickness = size * 0.35;

  // Cross outline
  ctx.beginPath();
  ctx.moveTo(cx - thickness, cy - arm);
  ctx.lineTo(cx + thickness, cy - arm);
  ctx.lineTo(cx + thickness, cy - thickness);
  ctx.lineTo(cx + arm, cy - thickness);
  ctx.lineTo(cx + arm, cy + thickness);
  ctx.lineTo(cx + thickness, cy + thickness);
  ctx.lineTo(cx + thickness, cy + arm);
  ctx.lineTo(cx - thickness, cy + arm);
  ctx.lineTo(cx - thickness, cy + thickness);
  ctx.lineTo(cx - arm, cy + thickness);
  ctx.lineTo(cx - arm, cy - thickness);
  ctx.lineTo(cx - thickness, cy - thickness);
  ctx.closePath();
  ctx.stroke();

  // Subtle fill
  ctx.globalAlpha = alpha * 0.15;
  ctx.fillStyle = MED_BLUE;
  ctx.fill();

  ctx.restore();
}

function drawMolecules(ctx, w, h, progress, seed) {
  if (progress < 0.15) return;
  const rng = srand(seed);
  const count = Math.floor(6 * Math.min(1, progress * 1.5));

  ctx.save();

  for (let m = 0; m < count; m++) {
    const mx = 60 + rng() * (w - 120);
    const my = h * 0.5 + rng() * (h * 0.4);
    const hexR = 15 + rng() * 10;
    const molAlpha = Math.min(0.3, (progress - 0.15) * 1.2);

    ctx.globalAlpha = molAlpha;
    ctx.strokeStyle = MINT_DARK;
    ctx.lineWidth = 1;

    // Hexagonal ring
    const rings = 1 + Math.floor(rng() * 2);
    for (let r = 0; r < rings; r++) {
      const offsetX = r * hexR * 1.5;
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
        const px = mx + offsetX + Math.cos(angle) * hexR;
        const py = my + Math.sin(angle) * hexR;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Bond nodes at vertices
      ctx.fillStyle = MINT;
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
        const px = mx + offsetX + Math.cos(angle) * hexR;
        const py = my + Math.sin(angle) * hexR;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Connecting bond between rings
    if (rings > 1) {
      const a1 = (1 / 6) * Math.PI * 2 - Math.PI / 6;
      const a2 = (5 / 6) * Math.PI * 2 - Math.PI / 6;
      ctx.beginPath();
      ctx.moveTo(mx + Math.cos(a1) * hexR, my + Math.sin(a1) * hexR);
      ctx.lineTo(mx + hexR * 1.5 + Math.cos(a2) * hexR, my + Math.sin(a2) * hexR);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawDNAHelix(ctx, x, h, progress, time) {
  if (progress < 0.2) return;
  const helixProgress = Math.min(1, (progress - 0.2) / 0.8);
  const helixAlpha = Math.min(0.5, helixProgress);

  ctx.save();
  ctx.globalAlpha = helixAlpha;

  const amplitude = 25;
  const frequency = 0.03;
  const verticalSpan = h * 0.7;
  const startY = h * 0.15;
  const visibleHeight = verticalSpan * helixProgress;

  // Two helical strands
  for (let strand = 0; strand < 2; strand++) {
    const phase = strand * Math.PI;
    ctx.strokeStyle = strand === 0 ? MED_BLUE : MINT_DARK;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    for (let y = 0; y < visibleHeight; y += 2) {
      const offset = Math.sin(y * frequency + time * 1.5 + phase) * amplitude;
      const py = startY + y;
      const px = x + offset;

      if (y === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // Cross-rungs (base pairs)
  if (helixProgress > 0.3) {
    ctx.strokeStyle = MINT;
    ctx.lineWidth = 0.6;
    ctx.globalAlpha = helixAlpha * 0.5;

    const rungSpacing = 20;
    for (let y = 0; y < visibleHeight; y += rungSpacing) {
      const py = startY + y;
      const x1 = x + Math.sin(y * frequency + time * 1.5) * amplitude;
      const x2 = x + Math.sin(y * frequency + time * 1.5 + Math.PI) * amplitude;

      ctx.beginPath();
      ctx.moveTo(x1, py);
      ctx.lineTo(x2, py);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawPulseRings(ctx, w, h, progress, time) {
  if (progress < 0.25) return;
  const alpha = Math.min(0.15, (progress - 0.25) * 0.3);

  ctx.save();
  ctx.strokeStyle = MINT;
  ctx.lineWidth = 1;

  // Radiating pulse rings from a point
  const cx = w * 0.5;
  const cy = h * 0.35;
  const maxR = 80;
  const numRings = 3;

  for (let i = 0; i < numRings; i++) {
    const r = (time * 30 + i * (maxR / numRings)) % maxR;
    const ringAlpha = alpha * (1 - r / maxR);
    if (ringAlpha <= 0) continue;

    ctx.globalAlpha = ringAlpha;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawScene(ctx, w, h, progress, time) {
  // 1. Background
  drawBackground(ctx, w, h);

  // 2. Grid
  drawGrid(ctx, w, h);

  // 3. Pulse rings behind EKG
  drawPulseRings(ctx, w, h, progress, time);

  // 4. EKG heartbeat line
  drawEKG(ctx, w, h, progress, time);

  // 5. Medical cross
  drawMedicalCross(ctx, w * 0.12, h * 0.15, 25, progress);

  // 6. Molecular structures
  drawMolecules(ctx, w, h, progress, 51);

  // 7. DNA helix on right side
  drawDNAHelix(ctx, w * 0.85, h, progress, time);

  // 8. Soft vignette
  ctx.save();
  const grd = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.8);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(1, 'rgba(0,40,80,0.04)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// ─── React component ─────────────────────────────────────────────────────────

export default function MedicalScene({ activeEraIndex = -1, totalEras = 1 }) {
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
