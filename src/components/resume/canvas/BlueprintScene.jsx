import { useCallback, useEffect, useRef } from 'react';

/**
 * BlueprintScene — Canvas 2D overlay evoking architectural blueprints.
 *
 * For architects, designers, and engineers. White technical drawings on
 * navy blue background with a precise grid. Building outlines, dimension
 * lines, and a compass rose reveal progressively as the user scrolls
 * through career eras.
 */

// ─── Palette ─────────────────────────────────────────────────────────────────

const NAVY = '#003366';
const NAVY_DARK = '#002244';
const WHITE = '#ffffff';
const LIGHT_BLUE = '#88ccff';
const GRID_COLOR = 'rgba(136,204,255,0.12)';
const GRID_MAJOR = 'rgba(136,204,255,0.25)';

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
  const grd = ctx.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, NAVY);
  grd.addColorStop(1, NAVY_DARK);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
}

function drawGrid(ctx, w, h) {
  ctx.save();
  const minor = 20;
  const major = 100;

  // Minor grid
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 0.3;
  for (let x = 0; x <= w; x += minor) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += minor) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Major grid
  ctx.strokeStyle = GRID_MAJOR;
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= w; x += major) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += major) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCompassRose(ctx, cx, cy, size, progress) {
  if (progress < 0.05) return;
  const alpha = Math.min(1, progress * 3);

  ctx.save();
  ctx.globalAlpha = 0.5 * alpha;
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = 0.8;

  // Outer circle
  ctx.beginPath();
  ctx.arc(cx, cy, size, 0, Math.PI * 2 * Math.min(1, progress * 2));
  ctx.stroke();

  // Inner circle
  if (progress > 0.3) {
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.3, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Cardinal directions
  if (progress > 0.4) {
    const dirAlpha = Math.min(1, (progress - 0.4) * 3);
    ctx.globalAlpha = 0.6 * dirAlpha;
    ctx.lineWidth = 1;

    const dirs = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ];
    for (const [dx, dy] of dirs) {
      ctx.beginPath();
      ctx.moveTo(cx + dx * size * 0.35, cy + dy * size * 0.35);
      ctx.lineTo(cx + dx * size * 0.95, cy + dy * size * 0.95);
      ctx.stroke();
    }

    // N label
    ctx.fillStyle = WHITE;
    ctx.font = `${Math.max(8, size * 0.2)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('N', cx, cy - size - 4);
  }

  ctx.restore();
}

function generateBuildings(w, h, seed) {
  const rng = srand(seed);
  const buildings = [];

  for (let i = 0; i < 5; i++) {
    const bx = 60 + rng() * (w - 200);
    const by = 80 + rng() * (h - 250);
    const bw = 60 + rng() * 100;
    const bh = 40 + rng() * 80;
    buildings.push({
      x: bx,
      y: by,
      width: bw,
      height: bh,
      floors: 1 + Math.floor(rng() * 3),
      hasDoor: rng() > 0.3,
      hasWindows: rng() > 0.2,
      eraThreshold: i / 5,
    });
  }

  return buildings;
}

function drawBuildings(ctx, buildings, _w, _h, progress) {
  ctx.save();

  for (const b of buildings) {
    if (progress < b.eraThreshold) continue;
    const bAlpha = Math.min(1, (progress - b.eraThreshold) * 4);

    ctx.globalAlpha = 0.7 * bAlpha;
    ctx.strokeStyle = WHITE;
    ctx.lineWidth = 1;

    // Main outline
    ctx.strokeRect(b.x, b.y, b.width, b.height);

    // Floor lines
    if (b.floors > 1) {
      const floorH = b.height / b.floors;
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 0.4;
      for (let f = 1; f < b.floors; f++) {
        ctx.beginPath();
        ctx.moveTo(b.x, b.y + f * floorH);
        ctx.lineTo(b.x + b.width, b.y + f * floorH);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.lineWidth = 1;
    }

    // Windows
    if (b.hasWindows && bAlpha > 0.5) {
      ctx.lineWidth = 0.5;
      const winSize = 6;
      const winSpacing = 15;
      const cols = Math.floor((b.width - 10) / winSpacing);
      const rows = b.floors;
      const floorH = b.height / b.floors;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const wx = b.x + 8 + c * winSpacing;
          const wy = b.y + 5 + r * floorH;
          ctx.strokeRect(wx, wy, winSize, winSize);
        }
      }
    }

    // Door
    if (b.hasDoor && bAlpha > 0.6) {
      const doorW = 8;
      const doorH = 14;
      const doorX = b.x + b.width / 2 - doorW / 2;
      const doorY = b.y + b.height - doorH;
      ctx.strokeRect(doorX, doorY, doorW, doorH);
      ctx.beginPath();
      ctx.arc(doorX + doorW / 2, doorY, doorW / 2, Math.PI, 0);
      ctx.stroke();
    }

    // Dimension lines
    if (bAlpha > 0.7) {
      ctx.globalAlpha = 0.4 * bAlpha;
      ctx.strokeStyle = LIGHT_BLUE;
      ctx.lineWidth = 0.5;

      // Width dimension
      const dimY = b.y + b.height + 15;
      ctx.beginPath();
      ctx.moveTo(b.x, dimY);
      ctx.lineTo(b.x + b.width, dimY);
      ctx.stroke();

      // Arrows
      for (const [ax, dir] of [
        [b.x, 1],
        [b.x + b.width, -1],
      ]) {
        ctx.beginPath();
        ctx.moveTo(ax, dimY);
        ctx.lineTo(ax + dir * 4, dimY - 2);
        ctx.moveTo(ax, dimY);
        ctx.lineTo(ax + dir * 4, dimY + 2);
        ctx.stroke();
      }

      // Extension lines
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(b.x, b.y + b.height);
      ctx.lineTo(b.x, dimY + 4);
      ctx.moveTo(b.x + b.width, b.y + b.height);
      ctx.lineTo(b.x + b.width, dimY + 4);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      ctx.fillStyle = LIGHT_BLUE;
      ctx.font = '7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(b.width * 0.3)}m`, b.x + b.width / 2, dimY - 3);
    }
  }

  ctx.restore();
}

function drawTitleBlock(ctx, w, h, progress) {
  if (progress < 0.1) return;
  const alpha = Math.min(1, (progress - 0.1) * 3);

  ctx.save();
  ctx.globalAlpha = 0.35 * alpha;
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = 1.5;

  // Border frame
  const margin = 20;
  ctx.strokeRect(margin, margin, w - margin * 2, h - margin * 2);

  // Title block in bottom right
  if (progress > 0.3) {
    const blockW = 160;
    const blockH = 50;
    const bx = w - margin - blockW;
    const by = h - margin - blockH;

    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, blockW, blockH);

    // Divider
    ctx.beginPath();
    ctx.moveTo(bx, by + blockH / 2);
    ctx.lineTo(bx + blockW, by + blockH / 2);
    ctx.stroke();

    // Labels
    ctx.fillStyle = LIGHT_BLUE;
    ctx.font = '7px monospace';
    ctx.textAlign = 'left';
    ctx.globalAlpha = 0.4 * alpha;
    ctx.fillText('SCALE: 1:100', bx + 6, by + 15);
    ctx.fillText('REV: A', bx + 6, by + 38);

    ctx.textAlign = 'right';
    ctx.fillText('SHEET 1 OF 1', bx + blockW - 6, by + 15);
  }

  ctx.restore();
}

function drawCrosshairs(ctx, w, h, progress, time) {
  if (progress < 0.2) return;
  const alpha = Math.min(0.15, (progress - 0.2) * 0.5);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = LIGHT_BLUE;
  ctx.lineWidth = 0.3;

  // Center marks at major grid intersections, slowly drifting
  const rng = srand(99);
  const count = Math.floor(8 * progress);
  for (let i = 0; i < count; i++) {
    const cx = Math.round((rng() * w) / 100) * 100;
    const cy = Math.round((rng() * h) / 100) * 100;
    const s = 6 + Math.sin(time + i) * 2;

    ctx.beginPath();
    ctx.moveTo(cx - s, cy);
    ctx.lineTo(cx + s, cy);
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx, cy + s);
    ctx.stroke();
  }

  ctx.restore();
}

function drawScene(ctx, w, h, progress, time, buildings) {
  drawBackground(ctx, w, h);
  drawGrid(ctx, w, h);
  drawTitleBlock(ctx, w, h, progress);

  drawBuildings(ctx, buildings, w, h, progress);

  drawCompassRose(ctx, w * 0.88, h * 0.15, 30, progress);
  drawCrosshairs(ctx, w, h, progress, time);

  // Paper fold effect — subtle diagonal crease
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.6);
  ctx.lineTo(w * 0.4, 0);
  ctx.stroke();
  ctx.restore();
}

// ─── React component ─────────────────────────────────────────────────────────

export default function BlueprintScene({ activeEraIndex = -1, totalEras = 1 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const timeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const progressRef = useRef(0);
  const targetProgressRef = useRef(0);
  const geometryRef = useRef(null);

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
      geometryRef.current = null;
    }

    if (!geometryRef.current) {
      geometryRef.current = generateBuildings(rect.width, rect.height, 37);
    }

    progressRef.current += (targetProgressRef.current - progressRef.current) * 0.03;

    ctx.save();
    ctx.scale(dpr, dpr);
    drawScene(
      ctx,
      rect.width,
      rect.height,
      progressRef.current,
      timeRef.current,
      geometryRef.current,
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
