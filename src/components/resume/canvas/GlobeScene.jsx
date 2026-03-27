import { useCallback, useEffect, useRef } from 'react';

/**
 * GlobeScene — Canvas 2D overlay evoking international travel and diplomacy.
 *
 * For international/travel/diplomacy professionals. A wireframe globe rotates
 * with latitude/longitude lines, flight paths arc between points, a compass
 * rose anchors the corner, and route traces animate with scroll progress.
 */

// ─── Palette ─────────────────────────────────────────────────────────────────

const OCEAN_DEEP = '#061830';
const LAND_GREEN = '#2a6848';
const LAND_OUTLINE = '#3a8860';
const GRID_BLUE = '#1a4a70';
const ROUTE_GOLD = '#d4a520';
const ROUTE_BRIGHT = '#f0c850';
const COMPASS_LIGHT = '#88aacc';
const LABEL_COLOR = '#6688aa';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function srand(seed) {
  let s = Math.abs(seed) || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Simplified continent shapes (lat/lon outlines) ─────────────────────────

function generateLandMasses() {
  // Approximate continent blobs as sets of lat/lon polygons
  const continents = [
    // North America (rough)
    {
      points: [
        { lat: 50, lon: -120 },
        { lat: 55, lon: -80 },
        { lat: 40, lon: -75 },
        { lat: 30, lon: -90 },
        { lat: 25, lon: -100 },
        { lat: 35, lon: -120 },
      ],
    },
    // South America
    {
      points: [
        { lat: 10, lon: -75 },
        { lat: 0, lon: -50 },
        { lat: -15, lon: -45 },
        { lat: -35, lon: -60 },
        { lat: -20, lon: -70 },
      ],
    },
    // Europe
    {
      points: [
        { lat: 55, lon: 0 },
        { lat: 60, lon: 25 },
        { lat: 50, lon: 30 },
        { lat: 42, lon: 20 },
        { lat: 38, lon: 0 },
      ],
    },
    // Africa
    {
      points: [
        { lat: 30, lon: 10 },
        { lat: 15, lon: 40 },
        { lat: 0, lon: 35 },
        { lat: -25, lon: 28 },
        { lat: -35, lon: 20 },
        { lat: 5, lon: -5 },
      ],
    },
    // Asia
    {
      points: [
        { lat: 55, lon: 50 },
        { lat: 60, lon: 100 },
        { lat: 45, lon: 130 },
        { lat: 25, lon: 120 },
        { lat: 10, lon: 105 },
        { lat: 25, lon: 70 },
        { lat: 40, lon: 50 },
      ],
    },
    // Australia
    {
      points: [
        { lat: -15, lon: 125 },
        { lat: -20, lon: 145 },
        { lat: -35, lon: 150 },
        { lat: -35, lon: 118 },
        { lat: -22, lon: 115 },
      ],
    },
  ];

  return continents;
}

// ─── Globe projection ────────────────────────────────────────────────────────

function latLonTo2D(lat, lon, cx, cy, r, rotY) {
  const phi = (lat * Math.PI) / 180;
  const lambda = ((lon + rotY) * Math.PI) / 180;

  const x3d = Math.cos(phi) * Math.sin(lambda);
  const y3d = -Math.sin(phi);
  const z3d = Math.cos(phi) * Math.cos(lambda);

  // Only draw front-facing points
  if (z3d < -0.05) return null;

  return {
    x: cx + x3d * r,
    y: cy + y3d * r,
    z: z3d,
  };
}

// ─── Drawing functions ───────────────────────────────────────────────────────

function drawBackground(ctx, w, h) {
  const grd = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
  grd.addColorStop(0, '#0e2848');
  grd.addColorStop(1, OCEAN_DEEP);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
}

function drawGlobe(ctx, w, h, progress, time, continents) {
  const cx = w * 0.5;
  const cy = h * 0.48;
  const r = Math.min(w, h) * 0.3;
  const rotY = time * 15 + progress * 120;

  // Globe outline
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = GRID_BLUE;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Glow around globe
  const glowGrd = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.3);
  glowGrd.addColorStop(0, 'rgba(20,60,100,0.1)');
  glowGrd.addColorStop(1, 'rgba(20,60,100,0)');
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = glowGrd;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.3, 0, Math.PI * 2);
  ctx.fill();

  // Latitude lines
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = GRID_BLUE;
  ctx.lineWidth = 0.5;
  for (let lat = -60; lat <= 60; lat += 30) {
    ctx.beginPath();
    let started = false;
    for (let lon = -180; lon <= 180; lon += 5) {
      const p = latLonTo2D(lat, lon, cx, cy, r, rotY);
      if (!p) {
        started = false;
        continue;
      }
      if (!started) {
        ctx.moveTo(p.x, p.y);
        started = true;
      } else {
        ctx.lineTo(p.x, p.y);
      }
    }
    ctx.stroke();
  }

  // Longitude lines
  for (let lon = -180; lon < 180; lon += 30) {
    ctx.beginPath();
    let started = false;
    for (let lat = -90; lat <= 90; lat += 5) {
      const p = latLonTo2D(lat, lon, cx, cy, r, rotY);
      if (!p) {
        started = false;
        continue;
      }
      if (!started) {
        ctx.moveTo(p.x, p.y);
        started = true;
      } else {
        ctx.lineTo(p.x, p.y);
      }
    }
    ctx.stroke();
  }

  // Continents
  const landAlpha = Math.min(1, progress / 0.3);
  for (const continent of continents) {
    ctx.globalAlpha = 0.2 * landAlpha;
    ctx.fillStyle = LAND_GREEN;
    ctx.strokeStyle = LAND_OUTLINE;
    ctx.lineWidth = 1;

    ctx.beginPath();
    let started = false;
    let anyVisible = false;
    for (const pt of continent.points) {
      const p = latLonTo2D(pt.lat, pt.lon, cx, cy, r, rotY);
      if (!p) {
        started = false;
        continue;
      }
      anyVisible = true;
      if (!started) {
        ctx.moveTo(p.x, p.y);
        started = true;
      } else {
        ctx.lineTo(p.x, p.y);
      }
    }
    if (anyVisible) {
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.15 * landAlpha;
      ctx.stroke();
    }
  }

  ctx.restore();
  return { cx, cy, r, rotY };
}

function drawFlightPaths(ctx, _w, _h, globe, progress, time) {
  if (progress < 0.2) return;
  const alpha = Math.min(1, (progress - 0.2) / 0.4);

  const routes = [
    { from: { lat: 40, lon: -75 }, to: { lat: 50, lon: 0 } },
    { from: { lat: 50, lon: 0 }, to: { lat: 35, lon: 100 } },
    { from: { lat: 35, lon: -120 }, to: { lat: -35, lon: 150 } },
    { from: { lat: 0, lon: -50 }, to: { lat: 30, lon: 10 } },
    { from: { lat: 55, lon: 50 }, to: { lat: 25, lon: 120 } },
  ];

  ctx.save();
  for (let ri = 0; ri < routes.length; ri++) {
    const route = routes[ri];
    const routeThreshold = ri / routes.length;
    if (progress < 0.2 + routeThreshold * 0.6) continue;

    const routeAlpha = Math.min(1, (progress - 0.2 - routeThreshold * 0.6) * 4);
    const fromP = latLonTo2D(
      route.from.lat,
      route.from.lon,
      globe.cx,
      globe.cy,
      globe.r,
      globe.rotY,
    );
    const toP = latLonTo2D(route.to.lat, route.to.lon, globe.cx, globe.cy, globe.r, globe.rotY);

    if (!fromP || !toP) continue;

    // Arc path
    const midX = (fromP.x + toP.x) / 2;
    const midY = (fromP.y + toP.y) / 2 - 40;

    ctx.globalAlpha = 0.4 * alpha * routeAlpha;
    ctx.strokeStyle = ROUTE_GOLD;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(fromP.x, fromP.y);
    ctx.quadraticCurveTo(midX, midY, toP.x, toP.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Animated plane dot
    const t = (time * 0.3 + ri * 0.3) % 1;
    const px = (1 - t) * (1 - t) * fromP.x + 2 * (1 - t) * t * midX + t * t * toP.x;
    const py = (1 - t) * (1 - t) * fromP.y + 2 * (1 - t) * t * midY + t * t * toP.y;

    ctx.globalAlpha = 0.7 * alpha * routeAlpha;
    ctx.fillStyle = ROUTE_BRIGHT;
    ctx.shadowColor = ROUTE_BRIGHT;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Endpoint dots
    ctx.globalAlpha = 0.4 * alpha * routeAlpha;
    ctx.fillStyle = ROUTE_GOLD;
    ctx.beginPath();
    ctx.arc(fromP.x, fromP.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(toP.x, toP.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCompass(ctx, w, h, progress, time) {
  if (progress < 0.15) return;
  const alpha = Math.min(1, (progress - 0.15) / 0.4);
  const cx = w * 0.88;
  const cy = h * 0.82;
  const r = Math.min(w, h) * 0.07;

  ctx.save();
  ctx.translate(cx, cy);

  // Outer ring
  ctx.globalAlpha = 0.2 * alpha;
  ctx.strokeStyle = COMPASS_LIGHT;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // Inner ring
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
  ctx.stroke();

  // Cardinal points
  const rot = Math.sin(time * 0.3) * 0.05;
  ctx.rotate(rot);

  ctx.globalAlpha = 0.25 * alpha;
  ctx.fillStyle = COMPASS_LIGHT;
  ctx.font = `bold ${r * 0.3}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', 0, -r * 0.85);
  ctx.fillText('S', 0, r * 0.85);
  ctx.fillText('E', r * 0.85, 0);
  ctx.fillText('W', -r * 0.85, 0);

  // Compass needle
  ctx.globalAlpha = 0.35 * alpha;

  // North pointer (red-ish)
  ctx.fillStyle = '#cc4444';
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.55);
  ctx.lineTo(-4, 0);
  ctx.lineTo(4, 0);
  ctx.closePath();
  ctx.fill();

  // South pointer
  ctx.fillStyle = COMPASS_LIGHT;
  ctx.beginPath();
  ctx.moveTo(0, r * 0.55);
  ctx.lineTo(-4, 0);
  ctx.lineTo(4, 0);
  ctx.closePath();
  ctx.fill();

  // Center dot
  ctx.fillStyle = ROUTE_GOLD;
  ctx.beginPath();
  ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Tick marks
  ctx.globalAlpha = 0.1 * alpha;
  ctx.strokeStyle = COMPASS_LIGHT;
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const inner = i % 4 === 0 ? r * 0.6 : r * 0.65;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    ctx.lineTo(Math.cos(angle) * r * 0.7, Math.sin(angle) * r * 0.7);
    ctx.stroke();
  }

  ctx.restore();
}

function drawCoordinates(ctx, w, h, progress, time) {
  if (progress < 0.4) return;
  const alpha = Math.min(1, (progress - 0.4) / 0.3);
  const rng = srand(65);

  ctx.save();
  ctx.globalAlpha = 0.08 * alpha;
  ctx.fillStyle = LABEL_COLOR;
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';

  const coords = [
    '40.7N 74.0W',
    '51.5N 0.1W',
    '35.7N 139.7E',
    '33.9S 151.2E',
    '48.9N 2.3E',
    '55.8N 37.6E',
  ];
  for (let i = 0; i < coords.length; i++) {
    const cx = rng() * w;
    const baseY = rng() * h;
    const cy = baseY + Math.sin(time * 0.5 + i * 1.8) * 5;
    ctx.fillText(coords[i], cx, cy);
  }
  ctx.restore();
}

function drawScene(ctx, w, h, progress, time, continents) {
  drawBackground(ctx, w, h);
  const globe = drawGlobe(ctx, w, h, progress, time, continents);
  drawFlightPaths(ctx, w, h, globe, progress, time);
  drawCompass(ctx, w, h, progress, time);
  drawCoordinates(ctx, w, h, progress, time);

  // Vignette
  ctx.save();
  const grd = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.75);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(1, 'rgba(3,10,20,0.3)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// ─── React component ─────────────────────────────────────────────────────────

export default function GlobeScene({ activeEraIndex = -1, totalEras = 1 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const timeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const progressRef = useRef(0);
  const targetProgressRef = useRef(0);
  const continentsRef = useRef(null);

  useEffect(() => {
    continentsRef.current = generateLandMasses();
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
    drawScene(
      ctx,
      rect.width,
      rect.height,
      progressRef.current,
      timeRef.current,
      continentsRef.current || [],
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
