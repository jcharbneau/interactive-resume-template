import { useCallback, useEffect, useRef } from 'react';

/**
 * SportsScene — Canvas 2D overlay evoking athletic stadiums and track fields.
 *
 * For sports industry professionals. Track lanes stretch across the canvas,
 * stadium lights cast warm pools, a scoreboard ticks, and a finish line
 * materialises as the user scrolls through career eras.
 */

// ─── Palette ─────────────────────────────────────────────────────────────────

const FIELD_GREEN = '#1a6b2a';
const LANE_WHITE = '#e8e8e0';
const STADIUM_GOLD = '#d4a520';
const STADIUM_WARM = '#f0c850';
const SCOREBOARD_BG = '#1a1a2a';
const SCOREBOARD_TEXT = '#ff4444';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function srand(seed) {
  let s = Math.abs(seed) || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Drawing functions ───────────────────────────────────────────────────────

function drawFieldBackground(ctx, w, h) {
  // Base field green
  ctx.fillStyle = FIELD_GREEN;
  ctx.fillRect(0, 0, w, h);

  // Mowing stripes
  ctx.save();
  ctx.globalAlpha = 0.06;
  const stripeW = 40;
  for (let x = 0; x < w; x += stripeW * 2) {
    ctx.fillStyle = '#0e5e1e';
    ctx.fillRect(x, 0, stripeW, h);
  }
  ctx.restore();
}

function drawTrackLanes(ctx, w, h, progress) {
  if (progress < 0.05) return;
  const laneCount = 8;
  const trackTop = h * 0.3;
  const trackBottom = h * 0.8;
  const laneH = (trackBottom - trackTop) / laneCount;
  const extendFactor = Math.min(1, progress / 0.6);

  ctx.save();

  // Track surface
  ctx.globalAlpha = 0.25 * extendFactor;
  ctx.fillStyle = '#c45530';
  ctx.fillRect(0, trackTop, w * extendFactor, trackBottom - trackTop);

  // Lane lines
  ctx.globalAlpha = 0.5 * extendFactor;
  ctx.strokeStyle = LANE_WHITE;
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= laneCount; i++) {
    const y = trackTop + i * laneH;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w * extendFactor, y);
    ctx.stroke();
  }

  // Lane numbers
  if (extendFactor > 0.3) {
    ctx.globalAlpha = 0.3 * extendFactor;
    ctx.fillStyle = LANE_WHITE;
    ctx.font = `${Math.max(10, laneH * 0.4)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < laneCount; i++) {
      const y = trackTop + (i + 0.5) * laneH;
      ctx.fillText(`${i + 1}`, 25, y);
    }
  }

  ctx.restore();
}

function drawFinishLine(ctx, w, h, progress) {
  if (progress < 0.7) return;
  const alpha = Math.min(1, (progress - 0.7) / 0.3);
  const trackTop = h * 0.3;
  const trackBottom = h * 0.8;
  const finishX = w * 0.85;
  const checkerSize = 8;

  ctx.save();
  ctx.globalAlpha = 0.6 * alpha;

  for (let y = trackTop; y < trackBottom; y += checkerSize) {
    for (let x = finishX; x < finishX + checkerSize * 3; x += checkerSize) {
      const row = Math.floor((y - trackTop) / checkerSize);
      const col = Math.floor((x - finishX) / checkerSize);
      ctx.fillStyle = (row + col) % 2 === 0 ? '#ffffff' : '#111111';
      ctx.fillRect(x, y, checkerSize, checkerSize);
    }
  }
  ctx.restore();
}

function drawStadiumLights(ctx, w, h, progress, time) {
  if (progress < 0.1) return;
  const intensity = Math.min(1, progress / 0.5);
  const rng = srand(55);

  ctx.save();
  const lights = [
    { x: w * 0.15, y: h * 0.05 },
    { x: w * 0.4, y: h * 0.03 },
    { x: w * 0.65, y: h * 0.04 },
    { x: w * 0.88, y: h * 0.06 },
  ];

  for (const light of lights) {
    // Light pole
    ctx.globalAlpha = 0.2 * intensity;
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(light.x, light.y + 15);
    ctx.lineTo(light.x, h * 0.25);
    ctx.stroke();

    // Light housing
    ctx.fillStyle = '#555555';
    ctx.fillRect(light.x - 8, light.y, 16, 6);

    // Glow cone
    const flicker = 0.85 + Math.sin(time * 2 + rng() * 10) * 0.15;
    const grd = ctx.createRadialGradient(light.x, light.y + 8, 0, light.x, light.y + 8, h * 0.5);
    grd.addColorStop(0, `rgba(255,220,120,${0.12 * intensity * flicker})`);
    grd.addColorStop(0.3, `rgba(255,200,80,${0.05 * intensity * flicker})`);
    grd.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(light.x - 5, light.y + 8);
    ctx.lineTo(light.x - h * 0.25, h * 0.6);
    ctx.lineTo(light.x + h * 0.25, h * 0.6);
    ctx.lineTo(light.x + 5, light.y + 8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawScoreboard(ctx, w, h, progress, time) {
  if (progress < 0.3) return;
  const alpha = Math.min(1, (progress - 0.3) / 0.3);
  const boardW = Math.min(160, w * 0.2);
  const boardH = boardW * 0.5;
  const bx = w * 0.82 - boardW / 2;
  const by = h * 0.08;

  ctx.save();
  ctx.globalAlpha = 0.7 * alpha;

  // Board body
  ctx.fillStyle = SCOREBOARD_BG;
  ctx.fillRect(bx, by, boardW, boardH);
  ctx.strokeStyle = '#444455';
  ctx.lineWidth = 2;
  ctx.strokeRect(bx, by, boardW, boardH);

  // Timer display
  const secs = Math.floor(time * 3) % 60;
  const mins = Math.floor(secs / 60);
  const display = `${String(mins).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  ctx.fillStyle = SCOREBOARD_TEXT;
  ctx.font = `bold ${boardH * 0.35}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = SCOREBOARD_TEXT;
  ctx.shadowBlur = 6;
  ctx.fillText(display, bx + boardW / 2, by + boardH * 0.35);
  ctx.shadowBlur = 0;

  // Score
  const score = Math.floor(progress * 42);
  ctx.fillStyle = STADIUM_WARM;
  ctx.font = `bold ${boardH * 0.25}px monospace`;
  ctx.fillText(`SCORE ${score}`, bx + boardW / 2, by + boardH * 0.72);

  ctx.restore();
}

function drawFieldMarkings(ctx, w, h, progress) {
  if (progress < 0.15) return;
  const alpha = Math.min(1, (progress - 0.15) / 0.4);

  ctx.save();
  ctx.globalAlpha = 0.15 * alpha;
  ctx.strokeStyle = LANE_WHITE;
  ctx.lineWidth = 2;

  // Center circle
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.55, Math.min(w, h) * 0.12, 0, Math.PI * 2);
  ctx.stroke();

  // Center line
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.3);
  ctx.lineTo(w * 0.5, h * 0.8);
  ctx.stroke();

  // Yard markers
  ctx.font = '10px sans-serif';
  ctx.fillStyle = LANE_WHITE;
  ctx.textAlign = 'center';
  ctx.globalAlpha = 0.12 * alpha;
  for (let i = 1; i < 10; i++) {
    const x = w * (i / 10);
    ctx.beginPath();
    ctx.moveTo(x, h * 0.82);
    ctx.lineTo(x, h * 0.85);
    ctx.stroke();
    ctx.fillText(`${i * 10}`, x, h * 0.89);
  }

  ctx.restore();
}

function drawRunnerDots(ctx, w, h, progress, time) {
  if (progress < 0.2) return;
  const trackTop = h * 0.3;
  const trackBottom = h * 0.8;
  const laneH = (trackBottom - trackTop) / 8;
  const dotAlpha = Math.min(1, (progress - 0.2) / 0.3);

  ctx.save();
  for (let i = 0; i < 4; i++) {
    const lane = i * 2 + 1;
    const y = trackTop + (lane - 0.5) * laneH;
    const speed = 0.2 + i * 0.06;
    const x = ((time * speed * w + i * w * 0.25) % (w * 1.2)) - w * 0.1;

    ctx.globalAlpha = 0.7 * dotAlpha;
    ctx.fillStyle = STADIUM_GOLD;
    ctx.shadowColor = STADIUM_WARM;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Trail
    ctx.globalAlpha = 0.15 * dotAlpha;
    ctx.strokeStyle = STADIUM_GOLD;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 30, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawScene(ctx, w, h, progress, time) {
  drawFieldBackground(ctx, w, h);
  drawFieldMarkings(ctx, w, h, progress);
  drawTrackLanes(ctx, w, h, progress);
  drawFinishLine(ctx, w, h, progress);
  drawStadiumLights(ctx, w, h, progress, time);
  drawScoreboard(ctx, w, h, progress, time);
  drawRunnerDots(ctx, w, h, progress, time);

  // Vignette
  ctx.save();
  const grd = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.75);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(1, 'rgba(0,20,0,0.25)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// ─── React component ─────────────────────────────────────────────────────────

export default function SportsScene({ activeEraIndex = -1, totalEras = 1 }) {
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
