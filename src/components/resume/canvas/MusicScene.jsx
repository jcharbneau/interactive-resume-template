import { useCallback, useEffect, useRef } from 'react';

/**
 * MusicScene — Canvas 2D overlay evoking sheet music and musical notation.
 *
 * For performing arts and music professionals. Staff lines flow across the
 * screen, musical notes appear and float, and a treble clef is drawn
 * procedurally. As the user scrolls through career eras, more notes
 * accumulate and the composition grows richer.
 */

// ─── Palette ─────────────────────────────────────────────────────────────────

const IVORY = '#faf3e0';
// const IVORY_DARK = '#f0e8d0'; // reserved for texture use
const INK = '#2c1810';
const GOLD = '#c4a35a';
const GOLD_LIGHT = '#d4b86a';
const STAFF_COLOR = 'rgba(44,24,16,0.25)';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function srand(seed) {
  let s = Math.abs(seed) || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// lerp reserved for future smooth transitions

// ─── Paper texture ───────────────────────────────────────────────────────────

function createParchmentTexture(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = IVORY;
  ctx.fillRect(0, 0, w, h);

  // Warm parchment noise
  const id = ctx.createImageData(w, h);
  const d = id.data;
  const rng = srand(23);
  for (let i = 0; i < d.length; i += 4) {
    const v = 240 + (rng() - 0.5) * 15;
    d[i] = v;
    d[i + 1] = v - 5;
    d[i + 2] = v - 15;
    d[i + 3] = 20;
  }
  ctx.putImageData(id, 0, 0);

  // Age stains
  const rng2 = srand(41);
  for (let i = 0; i < 8; i++) {
    const bx = rng2() * w;
    const by = rng2() * h;
    const br = 40 + rng2() * 100;
    const grd = ctx.createRadialGradient(bx, by, 0, bx, by, br);
    grd.addColorStop(0, `rgba(180,155,100,${0.03 + rng2() * 0.03})`);
    grd.addColorStop(1, 'rgba(180,155,100,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(bx - br, by - br, br * 2, br * 2);
  }

  return c;
}

// ─── Staff and note generation ───────────────────────────────────────────────

function getStaffPositions(h) {
  const staffs = [];
  const staffSpacing = 12;
  const staffGroupHeight = staffSpacing * 4;
  const groupGap = 80;
  let y = 80;

  while (y + staffGroupHeight < h - 40) {
    staffs.push({ y, lineSpacing: staffSpacing });
    y += staffGroupHeight + groupGap;
  }

  return staffs;
}

function generateNotes(w, staffs, seed) {
  const rng = srand(seed);
  const notes = [];

  for (let si = 0; si < staffs.length; si++) {
    const staff = staffs[si];
    const notesPerStaff = 8 + Math.floor(rng() * 8);

    for (let n = 0; n < notesPerStaff; n++) {
      const x = 80 + rng() * (w - 160);
      // Notes sit on or between staff lines
      const linePos = Math.floor(rng() * 9) - 2; // -2 to 6: on/between lines and ledger
      const y = staff.y + linePos * (staff.lineSpacing / 2);
      const isHalf = rng() > 0.6;
      const isQuarter = !isHalf;
      const hasStem = true;
      const stemUp = linePos > 2;
      const hasFlag = rng() > 0.7 && isQuarter;
      const hasDot = rng() > 0.85;

      notes.push({
        x,
        y,
        linePos,
        staffIndex: si,
        isHalf,
        isQuarter,
        hasStem,
        stemUp,
        hasFlag,
        hasDot,
        eraThreshold: (si * notesPerStaff + n) / (staffs.length * 16),
      });
    }
  }

  // Sort by eraThreshold for progressive reveal
  notes.sort((a, b) => a.eraThreshold - b.eraThreshold);
  // Normalize thresholds
  for (let i = 0; i < notes.length; i++) {
    notes[i].eraThreshold = i / notes.length;
  }

  return notes;
}

// ─── Drawing functions ───────────────────────────────────────────────────────

function drawStaffLines(ctx, w, staffs, progress) {
  ctx.save();

  for (let si = 0; si < staffs.length; si++) {
    const staff = staffs[si];
    const staffAlpha = Math.min(1, progress * 3 - si * 0.2);
    if (staffAlpha <= 0) continue;

    ctx.strokeStyle = STAFF_COLOR;
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = staffAlpha;

    // 5 staff lines
    for (let l = 0; l < 5; l++) {
      const ly = staff.y + l * staff.lineSpacing;
      const lineEnd = w * Math.min(1, staffAlpha * 1.2);

      ctx.beginPath();
      ctx.moveTo(30, ly);
      ctx.lineTo(30 + (lineEnd - 60), ly);
      ctx.stroke();
    }

    // Barlines at regular intervals
    if (staffAlpha > 0.5) {
      ctx.lineWidth = 0.6;
      const barSpacing = (w - 80) / 4;
      for (let b = 0; b <= 4; b++) {
        const bx = 30 + b * barSpacing;
        ctx.beginPath();
        ctx.moveTo(bx, staff.y);
        ctx.lineTo(bx, staff.y + staff.lineSpacing * 4);
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

function drawTrebleClef(ctx, x, y, size, progress) {
  if (progress < 0.1) return;
  const alpha = Math.min(1, (progress - 0.1) * 3);

  ctx.save();
  ctx.globalAlpha = 0.6 * alpha;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';

  // Simplified treble clef drawn with bezier curves
  const s = size / 50;

  ctx.beginPath();
  // Bottom curl
  ctx.moveTo(x + 2 * s, y + 30 * s);
  ctx.bezierCurveTo(x - 8 * s, y + 35 * s, x - 12 * s, y + 20 * s, x - 4 * s, y + 10 * s);
  // Up through the staff
  ctx.bezierCurveTo(x + 6 * s, y - 2 * s, x + 10 * s, y - 18 * s, x + 4 * s, y - 30 * s);
  // Top hook
  ctx.bezierCurveTo(x - 4 * s, y - 40 * s, x - 14 * s, y - 30 * s, x - 8 * s, y - 18 * s);
  // Down the center
  ctx.bezierCurveTo(x - 2 * s, y - 8 * s, x + 2 * s, y + 8 * s, x, y + 20 * s);
  // Bottom dot curl
  ctx.bezierCurveTo(x - 2 * s, y + 28 * s, x + 6 * s, y + 32 * s, x + 2 * s, y + 30 * s);

  ctx.stroke();

  // Small dot at bottom
  ctx.fillStyle = INK;
  ctx.globalAlpha = 0.5 * alpha;
  ctx.beginPath();
  ctx.arc(x, y + 34 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawNotes(ctx, notes, progress) {
  ctx.save();

  for (const note of notes) {
    if (progress < note.eraThreshold) continue;
    const noteAlpha = Math.min(1, (progress - note.eraThreshold) * 8);

    ctx.globalAlpha = 0.65 * noteAlpha;
    ctx.fillStyle = INK;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;

    const r = 4;

    // Note head (oval)
    ctx.save();
    ctx.translate(note.x, note.y);
    ctx.rotate(-0.2);
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.7, 0, 0, Math.PI * 2);
    if (note.isHalf) {
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else {
      ctx.fill();
    }
    ctx.restore();

    // Stem
    if (note.hasStem) {
      ctx.lineWidth = 1;
      const stemLen = 28;
      const stemDir = note.stemUp ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(note.x + (note.stemUp ? r - 1 : -r + 1), note.y);
      ctx.lineTo(note.x + (note.stemUp ? r - 1 : -r + 1), note.y + stemDir * stemLen);
      ctx.stroke();

      // Flag
      if (note.hasFlag) {
        const flagX = note.x + (note.stemUp ? r - 1 : -r + 1);
        const flagY = note.y + stemDir * stemLen;
        ctx.beginPath();
        ctx.moveTo(flagX, flagY);
        ctx.bezierCurveTo(
          flagX + 8,
          flagY + stemDir * 5,
          flagX + 6,
          flagY + stemDir * 12,
          flagX + 1,
          flagY + stemDir * 18,
        );
        ctx.stroke();
      }
    }

    // Dot
    if (note.hasDot) {
      ctx.beginPath();
      ctx.arc(note.x + r + 5, note.y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawFloatingNotes(ctx, w, h, progress, time) {
  if (progress < 0.3) return;
  const alpha = Math.min(0.2, (progress - 0.3) * 0.5);

  ctx.save();
  ctx.fillStyle = GOLD;

  for (let i = 0; i < 8; i++) {
    const speed = 0.4 + (i % 3) * 0.2;
    const px = ((i * 137.5 + time * 20 * speed) % (w + 40)) - 20;
    const py = 40 + ((i * 89.3) % (h - 80)) + Math.sin(time * 1.5 + i * 2) * 15;
    const s = 3 + (i % 3);

    ctx.globalAlpha = alpha * (0.5 + Math.sin(time * 2 + i) * 0.3);

    // Eighth note shape
    ctx.beginPath();
    ctx.ellipse(px, py, s, s * 0.7, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Stem
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(px + s - 1, py);
    ctx.lineTo(px + s - 1, py - s * 4);
    ctx.stroke();
  }

  ctx.restore();
}

function drawTimeSignature(ctx, x, y, spacing, progress) {
  if (progress < 0.2) return;
  const alpha = Math.min(1, (progress - 0.2) * 3);

  ctx.save();
  ctx.globalAlpha = 0.5 * alpha;
  ctx.fillStyle = INK;
  ctx.font = `bold ${spacing * 2.5}px serif`;
  ctx.textAlign = 'center';
  ctx.fillText('4', x, y + spacing * 1.5);
  ctx.fillText('4', x, y + spacing * 3.5);
  ctx.restore();
}

function drawScene(ctx, w, h, progress, time, parchmentTex, geometry) {
  // 1. Background
  if (parchmentTex) {
    ctx.drawImage(parchmentTex, 0, 0, w, h);
  } else {
    ctx.fillStyle = IVORY;
    ctx.fillRect(0, 0, w, h);
  }

  // 2. Staff lines
  const { staffs, notes } = geometry;
  drawStaffLines(ctx, w, staffs, progress);

  // 3. Treble clef on first staff
  if (staffs.length > 0) {
    const s = staffs[0];
    drawTrebleClef(ctx, 50, s.y + s.lineSpacing * 2, 50, progress);
    drawTimeSignature(ctx, 70, s.y, s.lineSpacing, progress);
  }

  // Additional treble clefs on subsequent staves
  for (let i = 1; i < staffs.length; i++) {
    const s = staffs[i];
    const clefProgress = Math.max(0, progress - i * 0.15);
    if (clefProgress > 0) {
      drawTrebleClef(ctx, 50, s.y + s.lineSpacing * 2, 45, clefProgress);
    }
  }

  // 4. Notes
  drawNotes(ctx, notes, progress);

  // 5. Floating decorative notes
  drawFloatingNotes(ctx, w, h, progress, time);

  // 6. Gold accent line at top
  if (progress > 0.1) {
    ctx.save();
    ctx.globalAlpha = 0.15 * Math.min(1, progress * 2);
    ctx.strokeStyle = GOLD_LIGHT;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 25);
    ctx.lineTo(w * Math.min(1, progress * 1.5), 25);
    ctx.stroke();
    ctx.restore();
  }

  // 7. Warm vignette
  ctx.save();
  const grd = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.8);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(1, 'rgba(44,24,16,0.06)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// ─── React component ─────────────────────────────────────────────────────────

export default function MusicScene({ activeEraIndex = -1, totalEras = 1 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const timeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const progressRef = useRef(0);
  const targetProgressRef = useRef(0);
  const texturesRef = useRef({ parchment: null });
  const geometryRef = useRef(null);

  useEffect(() => {
    texturesRef.current.parchment = createParchmentTexture(512, 512);
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
      geometryRef.current = null;
    }

    if (!geometryRef.current) {
      const staffs = getStaffPositions(rect.height);
      geometryRef.current = {
        staffs,
        notes: generateNotes(rect.width, staffs, 67),
      };
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
      texturesRef.current.parchment,
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
