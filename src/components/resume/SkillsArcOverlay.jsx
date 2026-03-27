import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FONT, NODE_ACCENTS } from '../../constants/palette';

/**
 * SkillsArcOverlay
 *
 * Displays career skills in one of two modes:
 *
 *   'grid' (default) — horizontally scrollable columns, one per era.
 *                      Skills shared across adjacent eras are underlined.
 *
 *   'arc'  — SVG arc layout. Era nodes sit on a parabolic curve.
 *             Skill chips hang below each node. Cubic bezier paths connect
 *             skills that appear in multiple eras. Hover a skill to illuminate
 *             all its connections.
 */

// ─── SVG Arc constants ────────────────────────────────────────────────────────

const SVG_W = 1000;
const CHIP_W = 108;
const CHIP_H = 20;
const CHIP_R = 4;
const NODE_R = 20;
const SKILL_TOP_Y = 320; // y where skill chips begin
const SKILL_GAP = 26; // vertical gap between chips

// ─── Arc SVG layout ───────────────────────────────────────────────────────────

function SkillsArcSVG({ eras, onEraClick }) {
  const [hoveredSkill, setHoveredSkill] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef(null);
  const transformRef = useRef({ zoom: 1, pan: { x: 0, y: 0 } });
  const dragRef = useRef(null); // { clientX, clientY, panX, panY }
  const svgHRef = useRef(580);
  const N = eras.length;

  // Distribute era nodes horizontally with parabolic y offset.
  // t ∈ [-1, 1] → y rises at center, drops toward edges.
  const nodes = useMemo(
    () =>
      eras.map((era, i) => {
        const x = N <= 1 ? SVG_W / 2 : 160 + (i / (N - 1)) * (SVG_W - 320);
        const t = N > 1 ? (i / (N - 1) - 0.5) * 2 : 0;
        const y = 230 - (1 - t * t) * 100; // range: 130 (center) → 230 (edges)
        return { x, y, era, accent: era.scene?.primaryHex ?? NODE_ACCENTS.default };
      }),
    [eras, N],
  );

  // Map: skill → [eraIndex, ...]
  const skillEraMap = useMemo(() => {
    const map = new Map();
    eras.forEach((era, i) => {
      for (const skill of era.skills) {
        if (!map.has(skill)) map.set(skill, []);
        map.get(skill).push(i);
      }
    });
    return map;
  }, [eras]);

  // Skills that appear in 3+ eras — these are the meaningful cross-career skills.
  // Skills in only 2 eras create visual noise without strong signal.
  const MIN_ERA_SPAN = eras.length > 3 ? 3 : 2; // relax to 2 for short careers
  const MAX_ARC_SKILLS = 10; // cap per era to keep the diagram legible
  const crossEraSkillSet = useMemo(
    () =>
      new Set(
        [...skillEraMap.entries()].filter(([, v]) => v.length >= MIN_ERA_SPAN).map(([k]) => k),
      ),
    [skillEraMap, MIN_ERA_SPAN],
  );

  // Per-era: arc skills (cross-era, ranked by span count, capped) + count of hidden skills
  const eraArcData = useMemo(
    () =>
      eras.map((era) => {
        const cross = era.skills
          .filter((s) => crossEraSkillSet.has(s))
          .sort((a, b) => (skillEraMap.get(b)?.length ?? 0) - (skillEraMap.get(a)?.length ?? 0))
          .slice(0, MAX_ARC_SKILLS);
        const hiddenCount = era.skills.length - cross.length;
        return { cross, hiddenCount };
      }),
    [eras, crossEraSkillSet, skillEraMap],
  );

  // Skill rank within each era — based on cross-era skills only
  const eraSkillRank = useMemo(
    () =>
      eraArcData.map(({ cross }) => {
        const r = {};
        cross.forEach((s, j) => {
          r[s] = j;
        });
        return r;
      }),
    [eraArcData],
  );

  // Chip centre position for skill j in era i
  const chipPos = (eraIndex, rankInEra) => ({
    x: nodes[eraIndex].x,
    y: SKILL_TOP_Y + rankInEra * SKILL_GAP,
  });

  // Cubic bezier connections for cross-era shared skills
  // chipPos derives entirely from nodes (already in deps) — no need to list it separately
  // biome-ignore lint/correctness/useExhaustiveDependencies: chipPos is an inline fn derived from nodes; eras is covered by skillEraMap/eraSkillRank/nodes
  const connections = useMemo(() => {
    const paths = [];
    for (const [skill, indices] of skillEraMap) {
      if (indices.length < MIN_ERA_SPAN) continue;
      if (!crossEraSkillSet.has(skill)) continue;
      for (let a = 0; a < indices.length - 1; a++) {
        for (let b = a + 1; b < indices.length; b++) {
          const ia = indices[a];
          const ib = indices[b];
          const p1 = chipPos(ia, eraSkillRank[ia][skill]);
          const p2 = chipPos(ib, eraSkillRank[ib][skill]);
          const na = nodes[ia];
          const nb = nodes[ib];
          // Cubic bezier: curve passes near the arc nodes for visual unity
          paths.push({
            key: `${skill}-${ia}-${ib}`,
            skill,
            ia,
            ib,
            colorA: na.accent,
            colorB: nb.accent,
            d: `M ${p1.x} ${p1.y} C ${na.x} ${na.y} ${nb.x} ${nb.y} ${p2.x} ${p2.y}`,
          });
        }
      }
    }
    return paths;
  }, [skillEraMap, eraSkillRank, nodes]);

  const maxArcSkills = Math.max(1, ...eraArcData.map((d) => d.cross.length));
  const svgH = Math.max(580, SKILL_TOP_Y + maxArcSkills * SKILL_GAP + 72);
  svgHRef.current = svgH;

  // ── Keep transform ref in sync with state ──────────────────────────────────
  useEffect(() => {
    transformRef.current = { zoom, pan };
  }, [zoom, pan]);

  // ── Apply a new zoom+pan atomically ───────────────────────────────────────
  const applyTransform = useCallback((newZoom, newPan) => {
    transformRef.current = { zoom: newZoom, pan: newPan };
    setZoom(newZoom);
    setPan(newPan);
  }, []);

  // ── Wheel: zoom centred on cursor ─────────────────────────────────────────
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const { zoom: oldZ, pan: oldP } = transformRef.current;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const newZ = Math.max(0.25, Math.min(5, oldZ * factor));
      const rect = el.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * SVG_W;
      const my = ((e.clientY - rect.top) / rect.height) * svgHRef.current;
      applyTransform(newZ, {
        x: oldP.x + mx * (oldZ - newZ),
        y: oldP.y + my * (oldZ - newZ),
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [applyTransform]);

  // ── Drag to pan ───────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e) => {
    const tag = e.target.tagName?.toLowerCase();
    if (tag === 'circle' || e.target.getAttribute('data-clickable')) return;
    e.preventDefault();
    dragRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      panX: transformRef.current.pan.x,
      panY: transformRef.current.pan.y,
    };
    setDragging(true);
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!dragRef.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = SVG_W / rect.width;
    const scaleY = svgHRef.current / rect.height;
    const dx = (e.clientX - dragRef.current.clientX) * scaleX;
    const dy = (e.clientY - dragRef.current.clientY) * scaleY;
    const newPan = { x: dragRef.current.panX + dx, y: dragRef.current.panY + dy };
    transformRef.current.pan = newPan;
    setPan(newPan);
  }, []);

  const onMouseUp = useCallback(() => {
    dragRef.current = null;
    setDragging(false);
  }, []);

  // ── Zoom control helpers (zoom around SVG centre) ─────────────────────────
  const zoomStep = useCallback(
    (factor) => {
      const { zoom: oldZ, pan: oldP } = transformRef.current;
      const newZ = Math.max(0.25, Math.min(5, oldZ * factor));
      const cx = SVG_W / 2;
      const cy = svgHRef.current / 2;
      applyTransform(newZ, {
        x: oldP.x + cx * (oldZ - newZ),
        y: oldP.y + cy * (oldZ - newZ),
      });
    },
    [applyTransform],
  );

  const resetView = useCallback(() => applyTransform(1, { x: 0, y: 0 }), [applyTransform]);

  const svgContent = (
    <>
      {/* ── Decorative arc spine connecting nodes ── */}
      {N > 1 && (
        <polyline
          points={nodes.map((n) => `${n.x},${n.y}`).join(' ')}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
      )}

      {/* ── Bezier connection paths ── */}
      {connections.map((conn) => {
        const isHov = hoveredSkill === conn.skill;
        const dimmed = hoveredSkill != null && !isHov;
        return (
          <path
            key={conn.key}
            d={conn.d}
            fill="none"
            stroke={isHov ? conn.colorA : 'rgba(255,255,255,0.08)'}
            strokeWidth={isHov ? 2 : 0.6}
            opacity={dimmed ? 0.02 : isHov ? 1 : 0.35}
            style={{ transition: 'opacity 0.18s, stroke 0.18s, stroke-width 0.18s' }}
          />
        );
      })}

      {/* ── Era nodes + skill chips ── */}
      {nodes.map(({ x, y, era, accent }, i) => (
        <g key={era.id}>
          {/* Dashed stem from node down to skill area */}
          <line
            x1={x}
            y1={y + NODE_R + 4}
            x2={x}
            y2={SKILL_TOP_Y - 12}
            stroke={`${accent}30`}
            strokeWidth="1"
            strokeDasharray="3 5"
          />

          {/* Year label */}
          <text
            x={x}
            y={y - NODE_R - 10}
            textAnchor="middle"
            fill={`${accent}70`}
            fontFamily={FONT.body}
            fontSize="9"
            letterSpacing="2"
          >
            {era.yearLabel.toUpperCase()}
          </text>

          {/* Node circle — clickable */}
          {/* biome-ignore lint/a11y/noStaticElementInteractions: SVG element, keyboard nav handled by parent */}
          <circle
            cx={x}
            cy={y}
            r={NODE_R}
            fill={`${accent}18`}
            stroke={accent}
            strokeWidth="1.5"
            style={{ cursor: 'pointer' }}
            onClick={() => onEraClick?.(i)}
          />

          {/* Company abbreviation inside node */}
          {/* biome-ignore lint/a11y/noStaticElementInteractions: SVG element, keyboard nav handled by parent */}
          <text
            x={x}
            y={y + 4}
            textAnchor="middle"
            fill={accent}
            fontFamily={FONT.body}
            fontSize="9.5"
            fontWeight="bold"
            data-clickable="true"
            style={{ cursor: 'pointer', userSelect: 'none' }}
            onClick={() => onEraClick?.(i)}
          >
            {era.company.length > 9 ? `${era.company.slice(0, 9)}…` : era.company}
          </text>

          {/* Role label below node */}
          <text
            x={x}
            y={y + NODE_R + 22}
            textAnchor="middle"
            fill={`${accent}55`}
            fontFamily={FONT.body}
            fontSize="7.5"
          >
            {era.role.length > 18 ? `${era.role.slice(0, 18)}…` : era.role}
          </text>

          {/* Cross-era skill chips only — all chips here are shared by definition */}
          {eraArcData[i].cross.map((skill, j) => {
            const cp = chipPos(i, j);
            const isHov = hoveredSkill === skill;
            const dimmed = hoveredSkill != null && !isHov;
            return (
              // biome-ignore lint/a11y/noStaticElementInteractions: SVG group, hover-only interaction for visual highlight
              <g
                key={skill}
                onMouseEnter={() => setHoveredSkill(skill)}
                onMouseLeave={() => setHoveredSkill(null)}
                style={{ cursor: 'default' }}
              >
                <rect
                  x={cp.x - CHIP_W / 2}
                  y={cp.y - CHIP_H / 2}
                  width={CHIP_W}
                  height={CHIP_H}
                  rx={CHIP_R}
                  fill={isHov ? `${accent}28` : `${accent}14`}
                  stroke={isHov ? accent : `${accent}50`}
                  strokeWidth="0.8"
                  opacity={dimmed ? 0.25 : 1}
                  style={{ transition: 'fill 0.15s, stroke 0.15s, opacity 0.15s' }}
                />
                <text
                  x={cp.x}
                  y={cp.y + 4}
                  textAnchor="middle"
                  fill={isHov ? accent : `${accent}cc`}
                  fontFamily={FONT.body}
                  fontSize="8"
                  letterSpacing="0.3"
                  opacity={dimmed ? 0.25 : 1}
                  style={{ transition: 'fill 0.15s, opacity 0.15s', pointerEvents: 'none' }}
                >
                  {skill.length > 13 ? `${skill.slice(0, 13)}…` : skill}
                </text>
              </g>
            );
          })}

          {/* Hidden era-only skills count badge */}
          {eraArcData[i].hiddenCount > 0 && (
            <text
              x={nodes[i].x}
              y={SKILL_TOP_Y + eraArcData[i].cross.length * SKILL_GAP + 18}
              textAnchor="middle"
              fill={`${accent}40`}
              fontFamily={FONT.body}
              fontSize="7.5"
              letterSpacing="0.5"
            >
              +{eraArcData[i].hiddenCount} more in grid
            </text>
          )}
        </g>
      ))}
    </>
  );

  return (
    <div className="relative w-full h-full" style={{ minHeight: 480 }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${svgH}`}
        style={{
          width: '100%',
          height: '100%',
          minHeight: 480,
          display: 'block',
          cursor: dragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          touchAction: 'none',
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        aria-label="Skills arc diagram — scroll to zoom, drag to pan"
      >
        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>{svgContent}</g>
      </svg>

      {/* ── Zoom controls ───────────────────────────────────────────────── */}
      <div
        className="absolute bottom-3 right-3 flex flex-col gap-0.5 rounded-lg overflow-hidden"
        style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {[
          { label: '+', title: 'Zoom in', onClick: () => zoomStep(1.3) },
          { label: '⊙', title: 'Reset view', onClick: resetView },
          { label: '−', title: 'Zoom out', onClick: () => zoomStep(1 / 1.3) },
        ].map(({ label, title, onClick }) => (
          <button
            key={label}
            type="button"
            title={title}
            onClick={onClick}
            className="w-8 h-8 font-sans text-sm text-white/50 hover:text-white hover:bg-white/8
                       transition-colors flex items-center justify-center"
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Zoom level badge ────────────────────────────────────────────── */}
      {zoom !== 1 && (
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 font-sans text-[9px]
                     uppercase tracking-wider px-2 py-1 rounded pointer-events-none"
          style={{
            background: 'rgba(0,0,0,0.5)',
            color: 'rgba(255,255,255,0.3)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {zoom.toFixed(1)}×
        </div>
      )}

      {/* ── First-open hint ─────────────────────────────────────────────── */}
      {zoom === 1 && !dragging && (
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 font-sans text-[9px]
                     uppercase tracking-wider pointer-events-none whitespace-nowrap"
          style={{ color: 'rgba(255,255,255,0.18)' }}
        >
          scroll to zoom · drag to pan
        </div>
      )}
    </div>
  );
}

// ─── River / Timeline layout ─────────────────────────────────────────────────
// Sankey-lite: skills flow as horizontal bands across eras. Band thickness
// indicates how many eras use the skill. New skills branch in, dropped skills
// fade out. Hover highlights the full journey of a skill.

const RIVER_ERA_W = 140; // width per era column
const RIVER_BAND_H = 22; // height per skill band
const RIVER_GAP = 3; // gap between bands
const RIVER_HEADER_H = 80; // space for era headers

function SkillsRiver({ eras, skillPresence, onEraClick }) {
  const [hoveredSkill, setHoveredSkill] = useState(null);
  const svgRef = useRef(null);

  // Build ordered skill list: sorted by first appearance, then span count
  const riverSkills = useMemo(() => {
    const skills = [];
    for (const [skill, indices] of skillPresence) {
      if (!skill) continue;
      const sorted = [...indices].sort((a, b) => a - b);
      skills.push({
        name: skill,
        firstEra: sorted[0],
        lastEra: sorted[sorted.length - 1],
        eraCount: indices.size,
        eras: indices,
      });
    }
    // Sort by first appearance, then by span length (longer spans first)
    skills.sort((a, b) => a.firstEra - b.firstEra || b.eraCount - a.eraCount);
    // Cap at 25 skills to avoid visual overload
    return skills.slice(0, 25);
  }, [skillPresence]);

  const N = eras.length;
  const svgW = Math.max(600, N * RIVER_ERA_W + 120);
  const svgH = RIVER_HEADER_H + riverSkills.length * (RIVER_BAND_H + RIVER_GAP) + 40;

  // Era column x positions
  const eraX = (i) => 60 + i * RIVER_ERA_W + RIVER_ERA_W / 2;

  return (
    <div className="flex-1 overflow-auto px-4 lg:px-8 py-6">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${svgW} ${svgH}`}
        width="100%"
        style={{ maxHeight: '70vh', userSelect: 'none' }}
      >
        {/* Era headers */}
        {eras.map((era, i) => {
          const x = eraX(i);
          const accent = era.scene?.primaryHex ?? '#3b82f6';
          return (
            <g key={era.id ?? i}>
              {/* Vertical guide line */}
              <line
                x1={x}
                y1={RIVER_HEADER_H - 10}
                x2={x}
                y2={svgH}
                stroke={`${accent}15`}
                strokeWidth={1}
              />
              {/* Company name */}
              {/* biome-ignore lint/a11y/noStaticElementInteractions: SVG data viz click handler */}
              <text
                x={x}
                y={22}
                textAnchor="middle"
                fill={accent}
                fontFamily="monospace"
                fontSize={11}
                fontWeight={700}
                style={{ cursor: 'pointer' }}
                onClick={() => onEraClick?.(i)}
              >
                {(era.company || '').slice(0, 14)}
              </text>
              {/* Period */}
              <text
                x={x}
                y={38}
                textAnchor="middle"
                fill="rgba(255,255,255,0.3)"
                fontFamily="monospace"
                fontSize={8}
              >
                {era.yearLabel || era.period || ''}
              </text>
              {/* Role */}
              <text
                x={x}
                y={52}
                textAnchor="middle"
                fill="rgba(255,255,255,0.2)"
                fontFamily="monospace"
                fontSize={7}
              >
                {(era.role || '').slice(0, 18)}
              </text>
            </g>
          );
        })}

        {/* Skill river bands */}
        {riverSkills.map((skill, si) => {
          const y = RIVER_HEADER_H + si * (RIVER_BAND_H + RIVER_GAP);
          const isHovered = hoveredSkill === skill.name;
          const isDimmed = hoveredSkill && !isHovered;

          // Find color from the first era this skill appears in
          const firstEra = eras[skill.firstEra];
          const color = firstEra?.scene?.primaryHex ?? '#3b82f6';

          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: SVG data viz hover handler
            <g
              key={skill.name}
              onMouseEnter={() => setHoveredSkill(skill.name)}
              onMouseLeave={() => setHoveredSkill(null)}
              style={{ cursor: 'pointer' }}
              opacity={isDimmed ? 0.15 : 1}
            >
              {/* Skill label on the left */}
              <text
                x={4}
                y={y + RIVER_BAND_H / 2 + 3}
                fill={isHovered ? color : 'rgba(255,255,255,0.5)'}
                fontFamily="monospace"
                fontSize={9}
                fontWeight={isHovered ? 700 : 400}
              >
                {skill.name.length > 8 ? `${skill.name.slice(0, 7)}…` : skill.name}
              </text>

              {/* River band — draw a rounded rect for each era where the skill is present */}
              {eras.map((era, ei) => {
                if (!skill.eras.has(ei)) return null;
                const x = eraX(ei) - RIVER_ERA_W / 2 + 10;
                const w = RIVER_ERA_W - 20;
                const eraColor = era.scene?.primaryHex ?? color;
                return (
                  <rect
                    key={`${skill.name}-${era.id ?? ei}`}
                    x={x}
                    y={y}
                    width={w}
                    height={RIVER_BAND_H}
                    rx={4}
                    fill={isHovered ? `${eraColor}60` : `${eraColor}25`}
                    stroke={isHovered ? eraColor : `${eraColor}40`}
                    strokeWidth={isHovered ? 1.5 : 0.5}
                  />
                );
              })}

              {/* Connecting lines between consecutive eras where skill is present */}
              {eras.map((era, ei) => {
                if (!skill.eras.has(ei) || !skill.eras.has(ei + 1)) return null;
                const x1 = eraX(ei) + RIVER_ERA_W / 2 - 10;
                const x2 = eraX(ei + 1) - RIVER_ERA_W / 2 + 10;
                const midY = y + RIVER_BAND_H / 2;
                const c1 = era.scene?.primaryHex ?? color;
                return (
                  <line
                    key={`link-${skill.name}-${era.id ?? ei}`}
                    x1={x1}
                    y1={midY}
                    x2={x2}
                    y2={midY}
                    stroke={isHovered ? c1 : `${c1}30`}
                    strokeWidth={isHovered ? 2 : 1}
                    strokeDasharray={isHovered ? 'none' : '4 3'}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Grid layout (existing) ───────────────────────────────────────────────────

const MAX_GRID_SKILLS = 8; // show top N skills per era in grid mode

function SkillsGrid({ eras, skillPresence, onEraClick }) {
  const [showAll, setShowAll] = useState(false);

  const isConnected = (skill, eraIndex) => {
    const indices = skillPresence.get(skill);
    if (!indices) return false;
    return indices.has(eraIndex - 1) || indices.has(eraIndex + 1);
  };

  // Ubiquitous skills: appear in every single era — these are noise, not signal
  const ubiquitousSkills = useMemo(() => {
    const total = eras.length;
    const ub = new Set();
    for (const [skill, indices] of skillPresence) {
      if (indices.size === total && total > 2) ub.add(skill);
    }
    return ub;
  }, [eras.length, skillPresence]);

  // Score skills by distinctiveness: prefer cross-era skills over era-only,
  // but deprioritize ubiquitous ones (they appear everywhere, low signal)
  const rankedSkills = useMemo(
    () =>
      eras.map((era, i) => {
        const scored = era.skills
          .filter((s) => !ubiquitousSkills.has(s))
          .map((s) => {
            const indices = skillPresence.get(s);
            const eraCount = indices?.size ?? 1;
            const adjacentLink = indices?.has(i - 1) || indices?.has(i + 1);
            // Cross-era but not ubiquitous → high value; connected to adjacent → bonus
            return { skill: s, score: eraCount * 10 + (adjacentLink ? 5 : 0) };
          })
          .sort((a, b) => b.score - a.score);
        return scored.map((s) => s.skill);
      }),
    [eras, skillPresence, ubiquitousSkills],
  );

  return (
    <div className="flex-1 overflow-x-auto overflow-y-auto px-6 lg:px-10 py-8">
      {/* Core skills bar — ubiquitous skills shown once */}
      {ubiquitousSkills.size > 0 && (
        <div className="mb-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div
            className="font-sans text-[8px] uppercase tracking-[0.2em] mb-2"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            Core skills (every era)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[...ubiquitousSkills].map((skill) => (
              <span
                key={skill}
                className="font-sans text-[9px] px-2 py-0.5 rounded"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.45)',
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-5 min-w-max">
        {eras.map((era, i) => {
          const accent = era.scene?.primaryHex ?? NODE_ACCENTS.default;
          const ranked = rankedSkills[i] ?? [];
          const visible = showAll ? ranked : ranked.slice(0, MAX_GRID_SKILLS);
          const hiddenCount = ranked.length - visible.length;

          return (
            <motion.div
              key={era.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-2 w-44 shrink-0"
            >
              {/* Era header */}
              <button
                type="button"
                onClick={() => onEraClick?.(i)}
                className="pb-2 mb-1 text-left transition-opacity duration-150 hover:opacity-80 cursor-pointer"
                style={{ borderBottom: `1px solid ${accent}30` }}
                title={`Go to ${era.company}`}
              >
                <div
                  className="font-sans text-[9px] uppercase tracking-[0.25em] mb-0.5"
                  style={{ color: `${accent}66` }}
                >
                  {era.yearLabel}
                </div>
                <div
                  className="font-sans text-xs font-bold leading-tight underline decoration-dotted underline-offset-2"
                  style={{ color: accent }}
                >
                  {era.company} ↗
                </div>
                <div
                  className="font-sans text-[9px] opacity-40 mt-0.5 leading-snug"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  {era.role}
                </div>
              </button>

              {/* Skill chips — ranked by distinctiveness, capped */}
              <div className="flex flex-col gap-1.5">
                {visible.map((skill) => {
                  const connected = isConnected(skill, i);
                  return (
                    <span
                      key={skill}
                      className="font-sans text-[9px] px-2 py-0.5 rounded transition-all"
                      style={{
                        background: `${accent}${connected ? '20' : '0d'}`,
                        border: `1px solid ${accent}${connected ? '55' : '22'}`,
                        color: connected ? accent : `${accent}88`,
                        textDecoration: connected ? `underline 1px ${accent}60` : 'none',
                        textUnderlineOffset: '3px',
                      }}
                    >
                      {skill}
                    </span>
                  );
                })}
                {!showAll && hiddenCount > 0 && (
                  <span className="font-sans text-[8px] mt-1" style={{ color: `${accent}40` }}>
                    +{hiddenCount} more
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Show all / show less toggle */}
      {rankedSkills.some((r) => r.length > MAX_GRID_SKILLS) && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="font-sans text-[10px] uppercase tracking-[0.15em] mt-5 px-3 py-1.5 rounded-full transition-colors"
          style={{
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.35)',
            background: 'rgba(255,255,255,0.04)',
          }}
        >
          {showAll ? 'Show top skills only' : 'Show all skills'}
        </button>
      )}
    </div>
  );
}

// ─── Constellation layout ─────────────────────────────────────────────────────
// Era nodes are arranged in an elliptical orbit. Subtle dotted lines connect
// skills shared across eras — like constellations in a night sky. Hover a
// skill chip to illuminate its constellation lines.

const CONST_CX = 500; // SVG centre x
const CONST_CY = 320; // SVG centre y
const CONST_RX = 380; // horizontal radius
const CONST_RY = 200; // vertical radius
const CONST_NODE_R = 28; // era node radius
const _CONST_CHIP_H = 18;
const _CONST_CHIP_GAP = 22;

function SkillsConstellation({ eras, skillPresence, onEraClick }) {
  const [hoveredSkill, setHoveredSkill] = useState(null);
  const N = eras.length;

  // Place eras around an ellipse — start from top, go clockwise
  const eraNodes = useMemo(
    () =>
      eras.map((era, i) => {
        const angle = -Math.PI / 2 + (i / Math.max(1, N)) * 2 * Math.PI;
        return {
          x: CONST_CX + CONST_RX * Math.cos(angle),
          y: CONST_CY + CONST_RY * Math.sin(angle),
          angle,
          era,
          accent: era.scene?.primaryHex ?? '#3b82f6',
        };
      }),
    [eras, N],
  );

  // Build constellation lines: for each skill in 2+ eras, draw a line between
  // consecutive era nodes that share it
  const constellationLines = useMemo(() => {
    const lines = [];
    for (const [skill, indices] of skillPresence) {
      if (indices.size < 2) continue;
      const sorted = [...indices].sort((a, b) => a - b);
      for (let k = 0; k < sorted.length - 1; k++) {
        const a = sorted[k];
        const b = sorted[k + 1];
        lines.push({ skill, a, b });
      }
    }
    return lines;
  }, [skillPresence]);

  // Skills ranked by cross-era span for the legend
  const rankedSkills = useMemo(() => {
    const arr = [];
    for (const [skill, indices] of skillPresence) {
      if (indices.size >= 2) arr.push({ name: skill, count: indices.size, eras: indices });
    }
    arr.sort((a, b) => b.count - a.count);
    return arr.slice(0, 20);
  }, [skillPresence]);

  const svgW = CONST_CX * 2;
  const svgH = CONST_CY * 2 + 60;

  return (
    <div className="flex-1 overflow-auto px-4 lg:px-8 py-6 flex flex-col items-center">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        width="100%"
        style={{ maxHeight: '55vh', userSelect: 'none' }}
      >
        {/* Background stars — tiny random dots for atmosphere */}
        {useMemo(
          () =>
            Array.from({ length: 60 }, (_, i) => {
              // Deterministic pseudo-random positions from index
              const px = (i * 137.508) % svgW;
              const py = (i * 97.31 + 23) % svgH;
              const r = 0.5 + (i % 3) * 0.4;
              const op = 0.1 + (i % 5) * 0.04;
              return (
                <circle
                  key={`star-${px}-${py}`}
                  cx={px}
                  cy={py}
                  r={r}
                  fill={`rgba(255,255,255,${op})`}
                />
              );
            }),
          [svgH, svgW],
        )}

        {/* Constellation lines — always visible but subtle */}
        {constellationLines.map(({ skill, a, b }) => {
          const na = eraNodes[a];
          const nb = eraNodes[b];
          if (!na || !nb) return null;
          const isHovered = hoveredSkill === skill;
          const isOtherHovered = hoveredSkill && hoveredSkill !== skill;
          return (
            <line
              key={`${skill}-${a}-${b}`}
              x1={na.x}
              y1={na.y}
              x2={nb.x}
              y2={nb.y}
              stroke={isHovered ? na.accent : 'rgba(255,255,255,0.08)'}
              strokeWidth={isHovered ? 2 : 0.5}
              strokeDasharray={isHovered ? 'none' : '4 6'}
              opacity={isOtherHovered ? 0.03 : 1}
              style={{ transition: 'all 0.3s ease' }}
            />
          );
        })}

        {/* Era nodes */}
        {eraNodes.map((node, i) => {
          const label =
            node.era.company?.length > 12
              ? `${node.era.company.slice(0, 11)}…`
              : (node.era.company ?? `Era ${i + 1}`);
          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: SVG data viz click handler
            <g key={node.era.id ?? i} style={{ cursor: 'pointer' }} onClick={() => onEraClick?.(i)}>
              {/* Glow */}
              <circle cx={node.x} cy={node.y} r={CONST_NODE_R + 8} fill={`${node.accent}08`} />
              {/* Node circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r={CONST_NODE_R}
                fill={`${node.accent}15`}
                stroke={`${node.accent}60`}
                strokeWidth={1.5}
              />
              {/* Company label */}
              <text
                x={node.x}
                y={node.y + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fill={node.accent}
                fontFamily={FONT.body}
                fontSize={8}
                fontWeight={600}
              >
                {label}
              </text>
              {/* Year label below */}
              <text
                x={node.x}
                y={node.y + CONST_NODE_R + 14}
                textAnchor="middle"
                fill="rgba(255,255,255,0.25)"
                fontFamily={FONT.body}
                fontSize={9}
              >
                {node.era.startYear ?? ''}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Skill legend below — hover to highlight constellation lines */}
      <div className="flex flex-wrap gap-2 justify-center mt-4 max-w-3xl">
        {rankedSkills.map(({ name, count }) => {
          const isHovered = hoveredSkill === name;
          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: hover-only visual highlight
            <span
              key={name}
              onMouseEnter={() => setHoveredSkill(name)}
              onMouseLeave={() => setHoveredSkill(null)}
              className="font-sans text-[10px] px-2.5 py-1 rounded-full cursor-default transition-all duration-200"
              style={{
                background: isHovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                color: isHovered ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)',
                border: `1px solid ${isHovered ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              {name}
              <span style={{ opacity: 0.4, marginLeft: 4 }}>×{count}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main overlay ─────────────────────────────────────────────────────────────

const SkillsArcOverlay = ({ eras, visible, onClose, onEraClick, mode = 'grid' }) => {
  // Shared data for both modes
  const skillPresence = useMemo(() => {
    const map = new Map();
    eras.forEach((era, i) => {
      for (const skill of era.skills) {
        if (!map.has(skill)) map.set(skill, new Set());
        map.get(skill).add(i);
      }
    });
    return map;
  }, [eras]);

  const sharedCount = useMemo(() => {
    let n = 0;
    for (const indices of skillPresence.values()) {
      if (indices.size > 1) n++;
    }
    return n;
  }, [skillPresence]);

  const subtitle =
    mode === 'arc'
      ? `${sharedCount} cross-career skills — hover to trace connections · era-unique skills shown in grid`
      : mode === 'river'
        ? `${sharedCount} skills flowing across ${eras.length} eras — hover to trace a skill's journey`
        : mode === 'constellation'
          ? `${sharedCount} skills forming constellations across ${eras.length} eras — hover to illuminate`
          : 'underlined skills span multiple eras';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="skills-arc"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(16px)' }}
        >
          {/* Header bar */}
          <div
            className="flex items-center justify-between px-6 lg:px-10 py-4 shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div>
              <span className="font-sans text-[10px] uppercase tracking-[0.25em] text-white/40">
                Skills{' '}
                {mode === 'arc'
                  ? 'Arc'
                  : mode === 'river'
                    ? 'River'
                    : mode === 'constellation'
                      ? 'Constellation'
                      : 'Grid'}
              </span>
              <span className="font-sans text-[10px] text-white/20 ml-3">— {subtitle}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="font-sans text-xs uppercase tracking-widest px-3 py-1.5 rounded-full transition-all duration-200"
              style={{
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              ✕ close
            </button>
          </div>

          {/* Content */}
          {mode === 'arc' ? (
            <div className="flex-1 overflow-auto px-4 lg:px-8 py-6">
              <SkillsArcSVG eras={eras} onEraClick={onEraClick} />
            </div>
          ) : mode === 'river' ? (
            <SkillsRiver eras={eras} skillPresence={skillPresence} onEraClick={onEraClick} />
          ) : mode === 'constellation' ? (
            <SkillsConstellation
              eras={eras}
              skillPresence={skillPresence}
              onEraClick={onEraClick}
            />
          ) : (
            <SkillsGrid eras={eras} skillPresence={skillPresence} onEraClick={onEraClick} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SkillsArcOverlay;
