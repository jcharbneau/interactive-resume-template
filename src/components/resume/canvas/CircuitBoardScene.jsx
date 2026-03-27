import { useCallback, useEffect, useRef } from 'react';

/**
 * CircuitBoardScene — Canvas 2D overlay evoking a printed circuit board.
 *
 * For tech/hardware/engineering professionals. PCB-style copper traces wind
 * across a dark green substrate, connecting IC chip outlines, solder pads,
 * and passive component symbols. Animated data dots flow along traces.
 * As the user scrolls through career eras, more traces build out and more
 * components populate the board.
 */

// ─── Palette ─────────────────────────────────────────────────────────────────

const PCB_BG = '#0a3d0a';
const COPPER = '#b87333';
const COPPER_BRIGHT = '#d4944a';
const SOLDER = '#c0c0c0';
const COMPONENT = '#1a1a1a';
const SILK = '#d4e6d4';
const VIA_HOLE = '#0e4e0e';

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

// ─── Board texture (run once) ────────────────────────────────────────────────

function createBoardTexture(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  // Base PCB green
  ctx.fillStyle = PCB_BG;
  ctx.fillRect(0, 0, w, h);

  // Subtle fiberglass weave texture
  const rng = srand(19);
  ctx.globalAlpha = 0.06;
  for (let y = 0; y < h; y += 3) {
    for (let x = 0; x < w; x += 3) {
      const v = rng() > 0.5 ? 1 : -1;
      ctx.fillStyle = v > 0 ? '#0e5e0e' : '#073807';
      ctx.fillRect(x, y, 3, 3);
    }
  }
  ctx.globalAlpha = 1;

  return c;
}

// ─── Trace path generation (deterministic) ───────────────────────────────────

function generateTraces(w, h, seed) {
  const rng = srand(seed);
  const traces = [];
  const count = 18;

  for (let i = 0; i < count; i++) {
    const points = [];
    let x = rng() * w;
    let y = rng() * h;
    points.push({ x, y });

    const segments = 4 + Math.floor(rng() * 6);
    for (let s = 0; s < segments; s++) {
      // PCB traces go horizontal or vertical with 45-degree bends
      const dir = Math.floor(rng() * 4);
      const len = 30 + rng() * 120;
      switch (dir) {
        case 0:
          x += len;
          break;
        case 1:
          y += len;
          break;
        case 2:
          x -= len;
          break;
        case 3:
          y -= len;
          break;
      }
      x = Math.max(10, Math.min(w - 10, x));
      y = Math.max(10, Math.min(h - 10, y));
      points.push({ x, y });
    }

    traces.push({
      points,
      width: 1.5 + rng() * 2,
      eraThreshold: i / count, // fraction of progress needed to reveal
    });
  }

  return traces;
}

// ─── Component placement (deterministic) ─────────────────────────────────────

function generateComponents(w, h, seed) {
  const rng = srand(seed);
  const components = [];

  // IC chips
  for (let i = 0; i < 6; i++) {
    components.push({
      type: 'ic',
      x: 40 + rng() * (w - 80),
      y: 40 + rng() * (h - 80),
      width: 35 + rng() * 30,
      height: 20 + rng() * 20,
      pins: 4 + Math.floor(rng() * 6),
      eraThreshold: i / 6,
    });
  }

  // Solder pads / vias
  for (let i = 0; i < 20; i++) {
    components.push({
      type: 'via',
      x: rng() * w,
      y: rng() * h,
      radius: 3 + rng() * 3,
      eraThreshold: i / 20,
    });
  }

  // Resistors / capacitors (small rectangles)
  for (let i = 0; i < 12; i++) {
    components.push({
      type: 'passive',
      x: rng() * w,
      y: rng() * h,
      width: 8 + rng() * 6,
      height: 3 + rng() * 3,
      rotation: (Math.floor(rng() * 2) * Math.PI) / 2,
      eraThreshold: i / 12,
    });
  }

  return components;
}

// ─── Drawing functions ───────────────────────────────────────────────────────

function drawGrid(ctx, w, h) {
  ctx.save();
  ctx.strokeStyle = '#0e4e0e';
  ctx.lineWidth = 0.3;
  ctx.globalAlpha = 0.3;

  const spacing = 20;
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

function drawTraces(ctx, traces, progress) {
  ctx.save();
  for (const trace of traces) {
    if (progress < trace.eraThreshold) continue;

    const traceProgress = Math.min(
      1,
      (progress - trace.eraThreshold) / (1 - trace.eraThreshold + 0.01),
    );
    const pts = trace.points;
    const visibleSegments = Math.ceil(pts.length * traceProgress);

    if (visibleSegments < 2) continue;

    // Copper trace
    ctx.strokeStyle = COPPER;
    ctx.lineWidth = trace.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.7;

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < visibleSegments; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();

    // Bright edge highlight
    ctx.strokeStyle = COPPER_BRIGHT;
    ctx.lineWidth = trace.width * 0.3;
    ctx.globalAlpha = 0.3;
    ctx.stroke();
  }
  ctx.restore();
}

function drawComponents(ctx, components, progress) {
  ctx.save();
  for (const comp of components) {
    if (progress < comp.eraThreshold) continue;
    const compAlpha = Math.min(1, (progress - comp.eraThreshold) * 4);

    ctx.globalAlpha = compAlpha;

    if (comp.type === 'ic') {
      // IC chip body
      ctx.fillStyle = COMPONENT;
      ctx.fillRect(comp.x - comp.width / 2, comp.y - comp.height / 2, comp.width, comp.height);

      // Pin notch
      ctx.fillStyle = VIA_HOLE;
      ctx.beginPath();
      ctx.arc(comp.x - comp.width / 2 + 6, comp.y, 2, 0, Math.PI * 2);
      ctx.fill();

      // Pins on top and bottom
      ctx.strokeStyle = SOLDER;
      ctx.lineWidth = 1;
      const pinSpacing = comp.width / (comp.pins + 1);
      for (let p = 1; p <= comp.pins; p++) {
        const px = comp.x - comp.width / 2 + p * pinSpacing;
        // Top pins
        ctx.beginPath();
        ctx.moveTo(px, comp.y - comp.height / 2);
        ctx.lineTo(px, comp.y - comp.height / 2 - 5);
        ctx.stroke();
        // Bottom pins
        ctx.beginPath();
        ctx.moveTo(px, comp.y + comp.height / 2);
        ctx.lineTo(px, comp.y + comp.height / 2 + 5);
        ctx.stroke();
      }

      // Silkscreen label
      ctx.fillStyle = SILK;
      ctx.font = '6px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`U${Math.floor(comp.x) % 100}`, comp.x, comp.y + 2);
    } else if (comp.type === 'via') {
      // Via / solder pad
      ctx.fillStyle = SOLDER;
      ctx.beginPath();
      ctx.arc(comp.x, comp.y, comp.radius, 0, Math.PI * 2);
      ctx.fill();

      // Drill hole
      ctx.fillStyle = VIA_HOLE;
      ctx.beginPath();
      ctx.arc(comp.x, comp.y, comp.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (comp.type === 'passive') {
      // Small passive component
      ctx.save();
      ctx.translate(comp.x, comp.y);
      ctx.rotate(comp.rotation);
      ctx.fillStyle = COMPONENT;
      ctx.fillRect(-comp.width / 2, -comp.height / 2, comp.width, comp.height);

      // Solder pads on ends
      ctx.fillStyle = SOLDER;
      ctx.fillRect(-comp.width / 2 - 2, -comp.height / 2, 3, comp.height);
      ctx.fillRect(comp.width / 2 - 1, -comp.height / 2, 3, comp.height);
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawDataDots(ctx, traces, progress, time) {
  if (progress < 0.1) return;

  ctx.save();
  const dotProgress = Math.min(1, (progress - 0.1) / 0.9);

  for (let ti = 0; ti < traces.length; ti++) {
    const trace = traces[ti];
    if (progress < trace.eraThreshold) continue;

    const pts = trace.points;
    if (pts.length < 2) continue;

    // Compute total length
    let totalLen = 0;
    const segLens = [];
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i - 1].x;
      const dy = pts[i].y - pts[i - 1].y;
      const len = Math.sqrt(dx * dx + dy * dy);
      segLens.push(len);
      totalLen += len;
    }
    if (totalLen === 0) continue;

    // Animate dot position along trace
    const speed = 0.3 + (ti % 3) * 0.15;
    const t = (time * speed + ti * 0.4) % 1;
    let targetDist = t * totalLen;
    let dotX = pts[0].x;
    let dotY = pts[0].y;

    for (let i = 0; i < segLens.length; i++) {
      if (targetDist <= segLens[i]) {
        const frac = targetDist / segLens[i];
        dotX = lerp(pts[i].x, pts[i + 1].x, frac);
        dotY = lerp(pts[i].y, pts[i + 1].y, frac);
        break;
      }
      targetDist -= segLens[i];
    }

    // Glowing data dot
    ctx.globalAlpha = 0.9 * dotProgress;
    ctx.fillStyle = COPPER_BRIGHT;
    ctx.shadowColor = COPPER_BRIGHT;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

function drawScene(ctx, w, h, progress, time, boardTex, geometry) {
  // 1. Board background
  if (boardTex) {
    ctx.drawImage(boardTex, 0, 0, w, h);
  } else {
    ctx.fillStyle = PCB_BG;
    ctx.fillRect(0, 0, w, h);
  }

  // 2. Grid
  drawGrid(ctx, w, h);

  // 3. Use cached geometry
  const { traces, components } = geometry;

  // 4. Traces
  drawTraces(ctx, traces, progress);

  // 5. Components
  drawComponents(ctx, components, progress);

  // 6. Animated data dots
  drawDataDots(ctx, traces, progress, time);

  // 7. Subtle vignette
  ctx.save();
  const grd = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.75);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(1, 'rgba(0,20,0,0.3)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// ─── React component ─────────────────────────────────────────────────────────

export default function CircuitBoardScene({ activeEraIndex = -1, totalEras = 1 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const timeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const progressRef = useRef(0);
  const targetProgressRef = useRef(0);
  const texturesRef = useRef({ board: null });
  const geometryRef = useRef(null);

  // Generate texture once on mount
  useEffect(() => {
    texturesRef.current.board = createBoardTexture(512, 512);
  }, []);

  // Update target progress when era changes
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
      // Regenerate geometry on resize
      geometryRef.current = null;
    }

    if (!geometryRef.current) {
      geometryRef.current = {
        traces: generateTraces(rect.width, rect.height, 42),
        components: generateComponents(rect.width, rect.height, 73),
      };
    }

    // Smooth progress interpolation
    progressRef.current += (targetProgressRef.current - progressRef.current) * 0.03;

    ctx.save();
    ctx.scale(dpr, dpr);
    drawScene(
      ctx,
      rect.width,
      rect.height,
      progressRef.current,
      timeRef.current,
      texturesRef.current.board,
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
