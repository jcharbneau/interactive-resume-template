import { useCallback, useEffect, useRef } from 'react';

/**
 * ScienceScene — Canvas 2D overlay evoking chemistry labs and molecular research.
 *
 * For science/research professionals. Molecular structures float and connect,
 * orbital rings spin, flask outlines bubble, and bonds form as the user
 * scrolls through career eras.
 */

// ─── Palette ─────────────────────────────────────────────────────────────────

const BG_BASE = '#f0f5fa';
const BG_BOTTOM = '#e8eef5';
const ATOM_FILL = '#4a90d9';
const ATOM_LIGHT = '#88bbee';
const BOND_GREY = '#8899aa';
const ORBITAL_CYAN = '#00c8e0';
const FLASK_OUTLINE = '#6688aa';
const HIGHLIGHT = '#00e0ff';
const GRID_COLOR = '#c8d4e0';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function srand(seed) {
  let s = Math.abs(seed) || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Molecule generation ─────────────────────────────────────────────────────

function generateMolecules(w, h, seed) {
  const rng = srand(seed);
  const molecules = [];

  for (let m = 0; m < 6; m++) {
    const cx = w * 0.1 + rng() * w * 0.8;
    const cy = h * 0.1 + rng() * h * 0.8;
    const atomCount = 3 + Math.floor(rng() * 4);
    const atoms = [];
    const bonds = [];

    for (let a = 0; a < atomCount; a++) {
      const angle = (a / atomCount) * Math.PI * 2 + rng() * 0.5;
      const dist = 20 + rng() * 35;
      atoms.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        r: 4 + rng() * 5,
        element: ['C', 'O', 'N', 'H', 'S', 'P'][Math.floor(rng() * 6)],
      });
    }

    // Connect atoms into bonds
    for (let a = 0; a < atomCount - 1; a++) {
      bonds.push([a, a + 1]);
    }
    // Close ring for larger molecules
    if (atomCount >= 5 && rng() > 0.4) {
      bonds.push([atomCount - 1, 0]);
    }

    molecules.push({ atoms, bonds, eraThreshold: m / 6 });
  }

  return molecules;
}

// ─── Drawing functions ───────────────────────────────────────────────────────

function drawBackground(ctx, w, h) {
  const grd = ctx.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, BG_BASE);
  grd.addColorStop(1, BG_BOTTOM);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
}

function drawGrid(ctx, w, h, progress) {
  if (progress < 0.05) return;
  const alpha = Math.min(1, progress / 0.3) * 0.12;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 0.5;

  const spacing = 30;
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

function drawMolecules(ctx, molecules, progress, time) {
  ctx.save();
  for (const mol of molecules) {
    if (progress < mol.eraThreshold) continue;
    const molAlpha = Math.min(1, (progress - mol.eraThreshold) * 3);

    // Gentle rotation
    const angle = time * 0.2 + mol.eraThreshold * 10;
    const rotatedAtoms = mol.atoms.map((a) => {
      const molCx = mol.atoms.reduce((s, at) => s + at.x, 0) / mol.atoms.length;
      const molCy = mol.atoms.reduce((s, at) => s + at.y, 0) / mol.atoms.length;
      const dx = a.x - molCx;
      const dy = a.y - molCy;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return {
        ...a,
        rx: molCx + dx * cos - dy * sin,
        ry: molCy + dx * sin + dy * cos,
      };
    });

    // Draw bonds
    ctx.globalAlpha = 0.35 * molAlpha;
    ctx.strokeStyle = BOND_GREY;
    ctx.lineWidth = 2;
    for (const [ai, bi] of mol.bonds) {
      const a = rotatedAtoms[ai];
      const b = rotatedAtoms[bi];
      ctx.beginPath();
      ctx.moveTo(a.rx, a.ry);
      ctx.lineTo(b.rx, b.ry);
      ctx.stroke();
    }

    // Draw atoms
    for (const atom of rotatedAtoms) {
      // Outer glow
      ctx.globalAlpha = 0.15 * molAlpha;
      ctx.fillStyle = ATOM_LIGHT;
      ctx.beginPath();
      ctx.arc(atom.rx, atom.ry, atom.r + 3, 0, Math.PI * 2);
      ctx.fill();

      // Atom body
      ctx.globalAlpha = 0.5 * molAlpha;
      ctx.fillStyle = ATOM_FILL;
      ctx.beginPath();
      ctx.arc(atom.rx, atom.ry, atom.r, 0, Math.PI * 2);
      ctx.fill();

      // Element label
      ctx.globalAlpha = 0.6 * molAlpha;
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(7, atom.r)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(atom.element, atom.rx, atom.ry);
    }
  }
  ctx.restore();
}

function drawOrbitalRings(ctx, w, h, progress, time) {
  if (progress < 0.2) return;
  const alpha = Math.min(1, (progress - 0.2) / 0.4);
  ctx.save();
  const orbitals = [
    { x: w * 0.2, y: h * 0.25, r: 40 },
    { x: w * 0.75, y: h * 0.65, r: 50 },
    { x: w * 0.5, y: h * 0.8, r: 35 },
  ];

  for (let i = 0; i < orbitals.length; i++) {
    const orb = orbitals[i];
    const rot = time * (0.5 + i * 0.2);

    // Nucleus
    ctx.globalAlpha = 0.3 * alpha;
    ctx.fillStyle = ATOM_FILL;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, 5, 0, Math.PI * 2);
    ctx.fill();

    // Orbital ellipses
    for (let ring = 0; ring < 3; ring++) {
      ctx.globalAlpha = 0.15 * alpha;
      ctx.strokeStyle = ORBITAL_CYAN;
      ctx.lineWidth = 1;
      ctx.save();
      ctx.translate(orb.x, orb.y);
      ctx.rotate(rot + (ring * Math.PI) / 3);
      ctx.beginPath();
      ctx.ellipse(0, 0, orb.r, orb.r * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Electron dot
      const eAngle = time * 2 + ring * 2.1;
      const ex = Math.cos(eAngle) * orb.r;
      const ey = Math.sin(eAngle) * orb.r * 0.35;
      ctx.globalAlpha = 0.6 * alpha;
      ctx.fillStyle = HIGHLIGHT;
      ctx.beginPath();
      ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawFlasks(ctx, w, h, progress, time) {
  if (progress < 0.3) return;
  const alpha = Math.min(1, (progress - 0.3) / 0.4);

  ctx.save();
  const flasks = [
    { x: w * 0.12, y: h * 0.55, size: 40 },
    { x: w * 0.88, y: h * 0.4, size: 35 },
  ];

  for (const flask of flasks) {
    const { x, y, size } = flask;
    const neckW = size * 0.2;
    const neckH = size * 0.5;
    const bodyR = size * 0.45;

    // Flask outline - Erlenmeyer shape
    ctx.globalAlpha = 0.2 * alpha;
    ctx.strokeStyle = FLASK_OUTLINE;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // Neck
    ctx.moveTo(x - neckW, y - neckH);
    ctx.lineTo(x - neckW, y);
    // Body flare
    ctx.lineTo(x - bodyR, y + bodyR);
    // Bottom
    ctx.lineTo(x + bodyR, y + bodyR);
    // Right side
    ctx.lineTo(x + neckW, y);
    ctx.lineTo(x + neckW, y - neckH);
    ctx.stroke();

    // Liquid level
    const liquidH = bodyR * progress;
    ctx.globalAlpha = 0.1 * alpha;
    ctx.fillStyle = ORBITAL_CYAN;
    ctx.beginPath();
    const liquidY = y + bodyR - liquidH;
    const liquidW = bodyR * (liquidH / bodyR);
    ctx.moveTo(x - liquidW, liquidY);
    // Wavy surface
    for (let wx = x - liquidW; wx <= x + liquidW; wx += 3) {
      const wave = Math.sin(wx * 0.1 + time * 3) * 2;
      ctx.lineTo(wx, liquidY + wave);
    }
    ctx.lineTo(x + bodyR, y + bodyR);
    ctx.lineTo(x - bodyR, y + bodyR);
    ctx.closePath();
    ctx.fill();

    // Bubbles
    if (alpha > 0.5) {
      ctx.globalAlpha = 0.25 * alpha;
      ctx.fillStyle = HIGHLIGHT;
      for (let b = 0; b < 4; b++) {
        const bx = x + (b - 1.5) * 6;
        const by = y + bodyR - ((time * 20 + b * 15) % (bodyR * 0.8));
        ctx.beginPath();
        ctx.arc(bx, by, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function drawFormulas(ctx, w, h, progress, time) {
  if (progress < 0.5) return;
  const alpha = Math.min(1, (progress - 0.5) / 0.3);
  const rng = srand(99);

  ctx.save();
  ctx.globalAlpha = 0.08 * alpha;
  ctx.font = '12px serif';
  ctx.fillStyle = BOND_GREY;
  ctx.textAlign = 'center';

  const formulas = [
    'H\u2082O',
    'CO\u2082',
    'NaCl',
    'C\u2086H\u2081\u2082O\u2086',
    'NH\u2083',
    'O\u2082',
  ];
  for (let i = 0; i < formulas.length; i++) {
    const fx = rng() * w;
    const baseY = rng() * h;
    const fy = baseY + Math.sin(time * 0.6 + i * 2) * 6;
    ctx.fillText(formulas[i], fx, fy);
  }
  ctx.restore();
}

function drawScene(ctx, w, h, progress, time, molecules) {
  drawBackground(ctx, w, h);
  drawGrid(ctx, w, h, progress);
  drawMolecules(ctx, molecules, progress, time);
  drawOrbitalRings(ctx, w, h, progress, time);
  drawFlasks(ctx, w, h, progress, time);
  drawFormulas(ctx, w, h, progress, time);

  // Subtle vignette
  ctx.save();
  const grd = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.75);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(1, 'rgba(100,120,140,0.08)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// ─── React component ─────────────────────────────────────────────────────────

export default function ScienceScene({ activeEraIndex = -1, totalEras = 1 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const timeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const progressRef = useRef(0);
  const targetProgressRef = useRef(0);
  const moleculesRef = useRef(null);

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
      // Regenerate molecules on resize
      moleculesRef.current = generateMolecules(rect.width, rect.height, 42);
    }

    if (!moleculesRef.current) {
      moleculesRef.current = generateMolecules(rect.width, rect.height, 42);
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
      moleculesRef.current,
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
