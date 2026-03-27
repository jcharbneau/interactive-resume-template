import { AnimatePresence, motion } from 'framer-motion';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { resolveFontPairing } from '../../constants/fontPairings';
import { FONT, NODE_ACCENTS } from '../../constants/palette';
import { defaultResumeConfig } from '../../constants/resumeConfig';
import { resumeThemes } from '../../constants/resumeThemes';
import { getUniversityColors } from '../../constants/universityData';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useKeyboardNav } from '../../hooks/useKeyboardNav';
import { useSEO } from '../../hooks/useSEO';
import { applyHueShift, tintEraScene } from '../../utils/colorUtils';
import SkillsArcOverlay from './SkillsArcOverlay';

const ResumeSceneCanvas = lazy(() => import('./canvas/ResumeSceneCanvas'));
const StorybookScene = lazy(() => import('./canvas/StorybookScene'));
const CircuitBoardScene = lazy(() => import('./canvas/CircuitBoardScene'));
const BlueprintScene = lazy(() => import('./canvas/BlueprintScene'));
const MusicScene = lazy(() => import('./canvas/MusicScene'));
const MedicalScene = lazy(() => import('./canvas/MedicalScene'));
const SportsScene = lazy(() => import('./canvas/SportsScene'));
const LegalScene = lazy(() => import('./canvas/LegalScene'));
const ScienceScene = lazy(() => import('./canvas/ScienceScene'));
const PhotoScene = lazy(() => import('./canvas/PhotoScene'));
const GlobeScene = lazy(() => import('./canvas/GlobeScene'));

/** Detect if the device can handle 3D WebGL rendering. */
function canRender3D() {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return false;
    // Low-end device heuristics
    const mem = navigator.deviceMemory; // GB (Chrome only)
    if (mem && mem < 3) return false;
    const cores = navigator.hardwareConcurrency;
    if (cores && cores < 4) return false;
    return true;
  } catch {
    return false;
  }
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] },
  }),
};

const accordionVariants = {
  closed: { height: 0, opacity: 0 },
  open: {
    height: 'auto',
    opacity: 1,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
  },
};

// ─── Company Context Panel ─────────────────────────────────────────────────────

const CompanyContextPanel = ({ era, accent, t, isLight, textBase }) => (
  <motion.div
    variants={accordionVariants}
    initial="closed"
    animate="open"
    exit="closed"
    style={{ overflow: 'hidden' }}
  >
    <div
      className="mt-3 mb-1 rounded-xl p-4 font-mono text-xs"
      style={{
        background: isLight ? `rgba(${textBase},0.04)` : `${accent}0d`,
        border: `1px solid ${isLight ? `rgba(${textBase},0.12)` : `${accent}28`}`,
      }}
    >
      <p className="leading-relaxed mb-3" style={{ color: t(0.75) }}>
        {era.companyContext.what}
      </p>
      <div
        className="flex flex-wrap gap-x-5 gap-y-1 mb-3"
        style={{ color: isLight ? `rgba(${textBase},0.8)` : `${accent}cc` }}
      >
        {era.companyContext.size && (
          <span>
            <span style={{ color: isLight ? `rgba(${textBase},0.5)` : `${accent}88` }}>
              scale:{' '}
            </span>
            {era.companyContext.size}
          </span>
        )}
        {era.companyContext.founded && (
          <span>
            <span style={{ color: isLight ? `rgba(${textBase},0.5)` : `${accent}88` }}>
              founded:{' '}
            </span>
            {era.companyContext.founded}
          </span>
        )}
        {era.companyContext.hq && (
          <span>
            <span style={{ color: isLight ? `rgba(${textBase},0.5)` : `${accent}88` }}>hq: </span>
            {era.companyContext.hq}
          </span>
        )}
      </div>
      {era.companyContext.notable && (
        <p className="leading-relaxed" style={{ color: t(0.5) }}>
          {era.companyContext.notable}
        </p>
      )}
      {era.companyContext.brands && (
        <div className="flex flex-wrap gap-2 mt-3">
          {era.companyContext.brands.map((brand) => (
            <span
              key={brand}
              className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider"
              style={{
                background: `${accent}18`,
                border: `1px solid ${accent}33`,
                color: accent,
              }}
            >
              {brand}
            </span>
          ))}
        </div>
      )}
    </div>
  </motion.div>
);

// ─── Era Card ─────────────────────────────────────────────────────────────────

const INITIAL_ACCOMPLISHMENT_COUNT = 3;

const EraCard = ({
  era,
  isActive,
  sectionRef,
  forceExpand,
  worksBaseUrl,
  t,
  isLight,
  textBase,
}) => {
  const [contextOpen, setContextOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const accent = era.scene?.primaryHex ?? NODE_ACCENTS.person;
  const accentDim = isLight ? `${accent}70` : `${accent}40`;

  const effectiveExpanded = forceExpand || expanded;
  const accomplishments = era.accomplishments ?? [];
  const visibleAccomplishments = effectiveExpanded
    ? accomplishments
    : accomplishments.slice(0, INITIAL_ACCOMPLISHMENT_COUNT);
  const hiddenCount = accomplishments.length - INITIAL_ACCOMPLISHMENT_COUNT;

  useEffect(() => {
    if (!isActive) setContextOpen(false);
  }, [isActive]);

  return (
    <section
      ref={sectionRef}
      data-era-id={era.id}
      className="era-card min-h-screen flex items-center relative"
      style={{ paddingTop: '5rem', paddingBottom: '5rem' }}
    >
      <div
        className="w-full max-w-4xl mx-auto px-6 lg:px-12 rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${accent}06 0%, transparent 55%)`,
        }}
      >
        {/* ── Era header ──────────────────────────────────────────────────── */}
        <motion.div
          variants={fadeUp}
          custom={0}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.3 }}
          className="mb-8"
        >
          {/* Year badge */}
          <span
            className="inline-block font-mono text-[11px] uppercase tracking-[0.3em] px-3 py-1 rounded-full mb-4"
            style={{
              background: isLight ? `rgba(${textBase},0.05)` : `${accent}18`,
              border: `1px solid ${isLight ? `rgba(${textBase},0.2)` : accentDim}`,
              color: isLight ? `rgba(${textBase},0.7)` : accent,
            }}
          >
            {era.yearLabel}
          </span>

          {/* Company name */}
          <div className="mb-2">
            <div className="flex items-start gap-3 flex-wrap">
              <button
                type="button"
                className="group flex items-center gap-3 text-left"
                onClick={() => setContextOpen((v) => !v)}
                title="Click to learn more about this company"
              >
                <h2
                  className="font-mono font-bold leading-none tracking-tight transition-opacity duration-200"
                  style={{
                    fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                    color: isActive ? t(1.0) : t(0.65),
                  }}
                >
                  {era.company}
                </h2>
                <motion.span
                  animate={{ rotate: contextOpen ? 180 : 0 }}
                  transition={{ duration: 0.25 }}
                  className="font-mono text-[11px] mt-1 opacity-60 group-hover:opacity-100 shrink-0"
                  style={{ color: accent }}
                >
                  ▾
                </motion.span>
              </button>
              {/* Company website link */}
              {era.companyUrl && (
                <a
                  href={era.companyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="self-end mb-1 font-mono text-[10px] px-2 py-1 rounded-md transition-all opacity-0 group-hover:opacity-100"
                  style={{
                    background: isLight ? `rgba(${textBase},0.06)` : `${accent}18`,
                    border: `1px solid ${isLight ? `rgba(${textBase},0.2)` : `${accent}30`}`,
                    color: isLight ? `rgba(${textBase},0.65)` : accent,
                    opacity: 0.55,
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '0.55';
                  }}
                  title={`Visit ${era.company}`}
                >
                  Visit →
                </a>
              )}
            </div>
            {era.company !== era.companyFull && (
              <p
                className={`font-mono text-[11px] mt-1 ${isLight ? '' : 'opacity-50'}`}
                style={{ color: isLight ? `rgba(${textBase},0.6)` : accent }}
              >
                {era.companyFull}
              </p>
            )}
          </div>

          {/* Context accordion */}
          <AnimatePresence>
            {contextOpen && (
              <CompanyContextPanel
                key="ctx"
                era={era}
                accent={accent}
                t={t}
                isLight={isLight}
                textBase={textBase}
              />
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Role + period ──────────────────────────────────────────────── */}
        <motion.div
          variants={fadeUp}
          custom={0.08}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.3 }}
          className="mb-2 flex flex-wrap items-baseline gap-3"
        >
          <span className="font-mono text-base font-semibold" style={{ color: accent }}>
            {era.role}
          </span>
          <span
            className={`font-mono text-xs ${isLight ? 'opacity-80' : 'opacity-45'}`}
            style={{ color: t(0.8) }}
          >
            {era.period} · {era.tenure}
          </span>
        </motion.div>

        {/* Role history chips */}
        {era.roleHistory && (
          <motion.div
            variants={fadeUp}
            custom={0.12}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.3 }}
            className="flex flex-wrap gap-2 mb-6"
          >
            {era.roleHistory.map((r, i) => (
              <span
                key={r}
                className="font-mono text-[10px] px-2 py-0.5 rounded"
                style={{
                  background:
                    i === 0 ? (isLight ? `rgba(${textBase},0.08)` : `${accent}20`) : 'transparent',
                  border: `1px solid ${
                    isLight
                      ? `rgba(${textBase},${i === 0 ? '0.25' : '0.12'})`
                      : `${accent}${i === 0 ? '40' : '20'}`
                  }`,
                  color: isLight
                    ? `rgba(${textBase},${i === 0 ? '0.8' : '0.5'})`
                    : i === 0
                      ? accent
                      : `${accent}88`,
                }}
              >
                {r}
              </span>
            ))}
          </motion.div>
        )}

        {/* ── Tagline ─────────────────────────────────────────────────────── */}
        <motion.p
          variants={fadeUp}
          custom={0.15}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.3 }}
          className="font-mono text-sm leading-relaxed mb-8 max-w-xl opacity-70"
          style={{ color: t(0.9) }}
        >
          {era.tagline}
        </motion.p>

        {/* ── Accomplishments ──────────────────────────────────────────────── */}
        <ul className="space-y-3 mb-4 max-w-2xl">
          {visibleAccomplishments.map((point, i) => (
            <motion.li
              key={point}
              variants={fadeUp}
              custom={0.18 + i * 0.06}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false, amount: 0.3 }}
              className="flex items-start gap-3"
            >
              <span className="mt-0.5 shrink-0 text-[10px] font-mono" style={{ color: accent }}>
                ▶
              </span>
              <span className="font-mono text-sm leading-relaxed" style={{ color: t(0.82) }}>
                {point}
              </span>
            </motion.li>
          ))}
        </ul>

        {/* Expand / collapse toggle */}
        {!forceExpand && hiddenCount > 0 && (
          <motion.div
            variants={accordionVariants}
            initial="open"
            animate="open"
            className="mb-8 max-w-2xl"
          >
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className={`font-mono text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-opacity duration-200 hover:opacity-100 ${isLight ? '' : 'opacity-50'}`}
              style={{ color: isLight ? `rgba(${textBase},0.7)` : accent }}
            >
              <span>{effectiveExpanded ? '▲ show less' : `▼ show ${hiddenCount} more`}</span>
            </button>
          </motion.div>
        )}

        {forceExpand && <div className="mb-8" />}

        {/* ── Skill chips ──────────────────────────────────────────────────── */}
        <motion.div
          variants={fadeUp}
          custom={0.35}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.3 }}
          className="flex flex-wrap gap-2 mb-6"
        >
          {(era.skills ?? []).map((skill) => (
            <span
              key={skill}
              className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full"
              style={{
                background: isLight ? `rgba(${textBase},0.06)` : `${accent}14`,
                border: `1px solid ${isLight ? `rgba(${textBase},0.25)` : `${accent}32`}`,
                color: isLight ? `rgba(${textBase},0.85)` : `${accent}dd`,
              }}
            >
              {skill}
            </span>
          ))}
        </motion.div>

        {/* ── Related works ─────────────────────────────────────────────────── */}
        {era.relatedWorks && era.relatedWorks.length > 0 && (
          <motion.div
            variants={fadeUp}
            custom={0.42}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.3 }}
            className="flex flex-wrap gap-2 mb-8"
          >
            <span
              className="font-mono text-[9px] uppercase tracking-widest self-center mr-1"
              style={{ color: `${accent}55` }}
            >
              related work:
            </span>
            {era.relatedWorks.map((workName) => (
              <a
                key={workName}
                href={`${worksBaseUrl}?project=${encodeURIComponent(workName)}`}
                className="font-mono text-[10px] px-2.5 py-1 rounded-full transition-all duration-200 hover:opacity-100 opacity-75"
                style={{
                  border: `1px solid ${accent}40`,
                  color: accent,
                }}
              >
                {workName} →
              </a>
            ))}
          </motion.div>
        )}

        {/* ── Era divider ──────────────────────────────────────────────────── */}
        <div
          className={`h-px w-full max-w-xs ${isLight ? 'opacity-40' : 'opacity-15'}`}
          style={{ background: `linear-gradient(to right, ${accent}, transparent)` }}
        />
      </div>
    </section>
  );
};

// ─── Network Section ──────────────────────────────────────────────────────────
// Shown above footer on person profiles that have accepted connections.

const ACCENT_BY_TYPE = {
  person: NODE_ACCENTS.person,
  company: NODE_ACCENTS.company,
  org: NODE_ACCENTS.org,
};

function NetworkNodeCard({ username, name, title, nodeType, edgeType, isLight }) {
  const accent = ACCENT_BY_TYPE[nodeType] ?? NODE_ACCENTS.default;
  const icon = nodeType === 'company' ? '🏢' : nodeType === 'org' ? '🌐' : '◈';
  const prefix = nodeType === 'company' ? '/c/' : nodeType === 'org' ? '/o/' : '/u/';
  const label =
    edgeType === 'worked_at' ? 'Worked at' : edgeType === 'member_of' ? 'Member of' : 'Connected';

  // Theme-aware colors
  const cardBg = isLight ? `${accent}12` : `${accent}08`;
  const cardBorder = isLight ? `${accent}30` : `${accent}20`;
  const cardBorderHover = isLight ? `${accent}60` : `${accent}50`;
  const nameColor = isLight ? 'rgba(26,26,26,0.9)' : 'rgba(255,255,255,0.85)';
  const labelColor = isLight ? 'rgba(26,26,26,0.35)' : 'rgba(255,255,255,0.2)';

  return (
    <a
      href={`${prefix}${username}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '12px 14px',
        borderRadius: 10,
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        textDecoration: 'none',
        transition: 'border-color 0.2s',
        minWidth: 140,
        maxWidth: 180,
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = cardBorderHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = cardBorder;
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, color: accent }}>{icon}</span>
        <span
          style={{
            fontFamily: FONT.body,
            fontSize: 11,
            fontWeight: 700,
            color: nameColor,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name || username}
        </span>
      </div>
      {title && (
        <span
          style={{
            fontFamily: FONT.body,
            fontSize: 9,
            color: isLight ? `${accent}` : `${accent}aa`,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </span>
      )}
      <span
        style={{
          fontFamily: FONT.body,
          fontSize: 8,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          color: labelColor,
          marginTop: 2,
        }}
      >
        {label}
      </span>
    </a>
  );
}

function NetworkSection({ connections, t, isLight }) {
  if (!connections?.length) return null;

  // Group by type
  const companies = connections.filter((c) => c.nodeType === 'company');
  const people = connections.filter((c) => c.nodeType === 'person');
  const orgs = connections.filter((c) => c.nodeType === 'org');

  return (
    <section
      className="no-print"
      style={{ padding: '48px 24px 32px', maxWidth: 900, margin: '0 auto' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <span style={{ color: NODE_ACCENTS.person, fontSize: 16 }}>◈</span>
        <h2
          style={{
            fontFamily: FONT.body,
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: t(0.35),
            margin: 0,
          }}
        >
          Network
        </h2>
        <div
          style={{
            flex: 1,
            height: 1,
            background: `linear-gradient(to right, ${NODE_ACCENTS.person}26, transparent)`,
          }}
        />
      </div>

      {companies.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p
            style={{
              fontFamily: FONT.body,
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: t(0.25),
              marginBottom: 10,
            }}
          >
            Companies
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {companies.map((c) => (
              <NetworkNodeCard key={`${c.nodeType}-${c.username}`} {...c} isLight={isLight} />
            ))}
          </div>
        </div>
      )}

      {people.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p
            style={{
              fontFamily: FONT.body,
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: t(0.25),
              marginBottom: 10,
            }}
          >
            People
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {people.map((c) => (
              <NetworkNodeCard key={`${c.nodeType}-${c.username}`} {...c} isLight={isLight} />
            ))}
          </div>
        </div>
      )}

      {orgs.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p
            style={{
              fontFamily: FONT.body,
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: t(0.25),
              marginBottom: 10,
            }}
          >
            Organisations
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {orgs.map((c) => (
              <NetworkNodeCard key={`${c.nodeType}-${c.username}`} {...c} isLight={isLight} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Education Card ──────────────────────────────────────────────────────────

const EducationCard = ({ entry, t, isLight }) => {
  const schoolColors = getUniversityColors(entry.institution);
  const accent = schoolColors?.primary ?? NODE_ACCENTS.org;
  const accentDim = isLight ? `${accent}70` : `${accent}40`;
  const typeIcon =
    entry.type === 'degree'
      ? '\uD83C\uDF93'
      : entry.type === 'attended'
        ? '\uD83C\uDFEB'
        : entry.type === 'certification'
          ? '\uD83D\uDCDC'
          : entry.type === 'bootcamp'
            ? '\uD83D\uDCBB'
            : entry.type === 'course'
              ? '\uD83D\uDCD6'
              : '\uD83D\uDCCB';
  const typeBadge =
    entry.type === 'degree'
      ? 'Degree'
      : entry.type === 'attended'
        ? 'Attended'
        : entry.type === 'certification'
          ? 'Certification'
          : entry.type === 'bootcamp'
            ? 'Bootcamp'
            : entry.type === 'training'
              ? 'Training'
              : entry.type === 'course'
                ? 'Course'
                : (entry.type ?? 'Education');

  // Logo URL from Logo.dev if institutionUrl is present
  let logoUrl = null;
  if (entry.institutionUrl) {
    try {
      const hostname = new URL(
        entry.institutionUrl.startsWith('http')
          ? entry.institutionUrl
          : `https://${entry.institutionUrl}`,
      ).hostname;
      logoUrl = `https://img.logo.dev/${hostname}?token=pk_SaGasGJzQl6-m57BbgCRIw&size=64&format=png`;
    } catch {
      // ignore
    }
  }

  return (
    <section className="education-card flex items-center relative" style={{ padding: '3rem 0' }}>
      <div
        className="w-full max-w-4xl mx-auto px-6 lg:px-12 rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${accent}06 0%, transparent 55%)`,
        }}
      >
        {/* Type badge */}
        <motion.div
          variants={fadeUp}
          custom={0}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.3 }}
          className="mb-6"
        >
          <span
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] px-3 py-1 rounded-full mb-4"
            style={{
              background: `${accent}18`,
              border: `1px solid ${accentDim}`,
              color: accent,
            }}
          >
            {typeIcon} {typeBadge}
          </span>
        </motion.div>

        {/* Institution name + logo */}
        <motion.div
          variants={fadeUp}
          custom={0.05}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.3 }}
          className="mb-4 flex items-center gap-4"
        >
          {logoUrl && (
            <img
              src={logoUrl}
              alt=""
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                objectFit: 'contain',
                flexShrink: 0,
                opacity: 0.85,
              }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          <h2
            className="font-mono font-bold leading-none tracking-tight"
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
              color: t(0.9),
            }}
          >
            {entry.institution}
          </h2>
        </motion.div>

        {/* Credential + field */}
        <motion.div
          variants={fadeUp}
          custom={0.1}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.3 }}
          className="mb-2 flex flex-wrap items-baseline gap-3"
        >
          <span className="font-mono text-base font-semibold" style={{ color: accent }}>
            {[entry.credential, entry.field].filter(Boolean).join(' in ')}
          </span>
          {entry.period && (
            <span
              className={`font-mono text-xs ${isLight ? 'opacity-80' : 'opacity-45'}`}
              style={{ color: t(0.8) }}
            >
              {entry.period
                .replace(/\s*\(expires\s+[^)]+\)/i, '')
                .replace(/^Expires\s+.*/i, '')
                .trim()}
            </span>
          )}
        </motion.div>

        {/* Activities */}
        {entry.activities && (
          <motion.p
            variants={fadeUp}
            custom={0.15}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.3 }}
            className={`font-mono text-sm leading-relaxed mb-4 max-w-xl ${isLight ? 'opacity-85' : 'opacity-60'}`}
            style={{ color: t(0.85) }}
          >
            {entry.activities}
          </motion.p>
        )}

        {/* Divider */}
        <div
          className={`h-px w-full max-w-xs ${isLight ? 'opacity-40' : 'opacity-15'}`}
          style={{ background: `linear-gradient(to right, ${accent}, transparent)` }}
        />
      </div>
    </section>
  );
};

// ─── Timeline Spine ───────────────────────────────────────────────────────────

const TimelineSpine = ({ eras, activeIndex, onNavigate, t }) => (
  <div className="hidden lg:flex fixed left-8 top-1/2 -translate-y-1/2 flex-col items-center gap-0 z-20 select-none no-print">
    {eras.map((era, i) => {
      const isActive = activeIndex >= 0 && i === activeIndex;
      const accent = era.scene.primaryHex;
      return (
        <div key={era.id} className="flex flex-col items-center">
          <motion.div
            animate={{ scale: isActive ? 1 : 0.65, opacity: isActive ? 1 : 0.35 }}
            transition={{ duration: 0.3 }}
            className="rounded-full cursor-pointer"
            style={{
              width: isActive ? 10 : 6,
              height: isActive ? 10 : 6,
              background: isActive ? accent : t(0.4),
              boxShadow: isActive ? `0 0 8px ${accent}` : 'none',
            }}
            onClick={() => onNavigate(i)}
            title={era.yearLabel}
          />
          <AnimatePresence>
            {isActive && (
              <motion.span
                key={`label-${era.id}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.25 }}
                className="absolute left-5 font-sans text-[9px] tracking-widest uppercase whitespace-nowrap"
                style={{ color: accent }}
              >
                {era.yearLabel}
              </motion.span>
            )}
          </AnimatePresence>
          {i < eras.length - 1 && (
            <div className="w-px" style={{ height: 42, background: t(0.1) }} />
          )}
        </div>
      );
    })}
  </div>
);

// ─── Mobile Era Nav (bottom pill) ─────────────────────────────────────────────

const MobileEraNav = ({ eras, activeIndex, onNavigate, visible, t, p }) => {
  const { isMobile, isTablet } = useIsMobile();
  if (!isMobile && !isTablet) return null;

  const activeEra = eras[activeIndex];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="mobile-nav"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1.5 no-print"
        >
          {/* Era label */}
          <span
            className="font-sans text-[9px] uppercase tracking-widest"
            style={{ color: t(0.35) }}
          >
            {activeEra?.company}
          </span>

          {/* Pill */}
          <div
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-full"
            style={{
              background: p(0.72),
              backdropFilter: 'blur(12px)',
              border: `1px solid ${t(0.1)}`,
            }}
          >
            <button
              type="button"
              onClick={() => onNavigate(Math.max(0, activeIndex - 1))}
              disabled={activeIndex === 0}
              className="font-sans text-sm transition-colors disabled:opacity-20 w-5 text-center"
              style={{ color: t(0.4) }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = t(1.0);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = t(0.4);
              }}
            >
              ←
            </button>

            <div className="flex items-center gap-1.5">
              {eras.map((era, i) => {
                const isAct = i === activeIndex;
                return (
                  <button
                    key={era.id}
                    type="button"
                    onClick={() => onNavigate(i)}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: isAct ? 8 : 5,
                      height: isAct ? 8 : 5,
                      background: isAct ? era.scene.primaryHex : t(0.28),
                      boxShadow: isAct ? `0 0 6px ${era.scene.primaryHex}` : 'none',
                    }}
                  />
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => onNavigate(Math.min(eras.length - 1, activeIndex + 1))}
              disabled={activeIndex === eras.length - 1}
              className="font-sans text-sm transition-colors disabled:opacity-20 w-5 text-center"
              style={{ color: t(0.4) }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = t(1.0);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = t(0.4);
              }}
            >
              →
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── Header ───────────────────────────────────────────────────────────────────

const ResumeHeader = ({
  activeEra,
  meta,
  theme,
  onToggleSkillsArc,
  showSkillsArc,
  pastIntro,
}) => {
  const accent = activeEra?.scene.primaryHex || '#53ba8a';

  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-6 lg:px-12 py-3 no-print"
      style={{
        background: theme.headerBg,
        backdropFilter: `blur(${theme.backdropBlur})`,
        borderBottom: `1px solid ${accent}22`,
      }}
    >
      <span
        className="font-sans text-[11px] uppercase tracking-widest flex items-center gap-2 opacity-60"
        style={{ color: accent }}
      >
        {meta.name || 'Resume'}
      </span>

      {/* Name + title: only visible once the user has scrolled past the intro.
          On the intro itself they're displayed prominently in the hero — no need to repeat. */}
      <div
        className="flex items-center gap-3 transition-all duration-500"
        style={{ opacity: pastIntro ? 1 : 0, pointerEvents: pastIntro ? 'auto' : 'none' }}
      >
        <span className="font-sans text-xs font-bold" style={{ color: theme.textPrimary }}>
          {meta.name}
        </span>
        <span
          className={`hidden sm:block font-sans text-[10px] ${theme.light ? 'opacity-70' : 'opacity-40'}`}
          style={{ color: accent }}
        >
          ·
        </span>
        <span
          className="hidden sm:block font-sans text-[10px] uppercase tracking-wider opacity-55"
          style={{ color: accent }}
        >
          {meta.title}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Skills Arc toggle */}
        <button
          type="button"
          onClick={onToggleSkillsArc}
          className="hidden sm:block font-sans text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full transition-all duration-200"
          style={{
            background: showSkillsArc ? `${accent}28` : `${accent}0e`,
            border: `1px solid ${accent}${showSkillsArc ? '60' : '28'}`,
            color: showSkillsArc ? accent : `${accent}aa`,
          }}
        >
          ◈ Skills Arc
        </button>

        {/* CV download — only shown when meta.cvUrl is set */}
        {meta.cvUrl && (
          <a
            href={meta.cvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-sans text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full transition-all duration-200"
            style={{
              background: `${accent}18`,
              border: `1px solid ${accent}40`,
              color: accent,
            }}
          >
            ↓ CV
          </a>
        )}
      </div>
    </header>
  );
};

// ─── Intro Section ────────────────────────────────────────────────────────────

const introPhaseVariants = {
  initial: { opacity: 0, y: 24 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -18,
    transition: { duration: 0.45, ease: [0.55, 0, 1, 0.45] },
  },
};

const IntroSection = ({
  meta,
  introRef,
  phase,
  accent = NODE_ACCENTS.person,
  t,
  introText,
  isLight,
  embedded = false,
}) => {
  return (
    <section
      ref={introRef}
      className={`${embedded ? '' : 'min-h-screen'} flex flex-col items-center justify-center relative px-6`}
      style={
        embedded
          ? { paddingTop: '2rem', paddingBottom: '4rem' }
          : { paddingTop: '5rem', paddingBottom: '30vh' }
      }
    >
      <div className="text-center max-w-2xl">
        <AnimatePresence mode="wait">
          {phase === 'thinking' && (
            <motion.div
              key="thinking"
              variants={introPhaseVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <p
                className="font-sans text-[11px] uppercase tracking-[0.35em] mb-6"
                style={{ color: `${accent}88` }}
              >
                Interactive Resume
              </p>
              <h2
                className="font-sans font-bold leading-tight mb-6"
                style={{ fontSize: 'clamp(1.6rem, 4.5vw, 3rem)', color: t(0.92) }}
              >
                What should a modern
                <br />
                <span style={{ color: accent }}>resume</span> look like?
              </h2>
              <p
                className="font-sans text-xs leading-relaxed max-w-sm mx-auto"
                style={{ color: t(0.35) }}
              >
                Something that moves. Something that thinks.
              </p>
            </motion.div>
          )}

          {phase === 'waving' && (
            <motion.div
              key="waving"
              variants={introPhaseVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ delay: 0.9 }}
            >
              <p
                className="font-sans text-[11px] uppercase tracking-[0.35em] mb-6"
                style={{ color: `${accent}88` }}
              >
                Interactive Resume
              </p>
              <h2
                className="font-sans font-bold leading-tight mb-6"
                style={{ fontSize: 'clamp(1.6rem, 4.5vw, 3rem)', color: t(0.92) }}
              >
                One that
                <br />
                <span style={{ color: accent }}>moves</span> with you.
              </h2>
              <p
                className="font-sans text-xs leading-relaxed max-w-sm mx-auto"
                style={{ color: t(0.35) }}
              >
                A living document. One page for everything you've built.
              </p>
            </motion.div>
          )}

          {phase === 'landing' && (
            <motion.div
              key="landing"
              variants={introPhaseVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <p
                className="font-sans text-[11px] uppercase tracking-[0.35em] mb-4"
                style={{ color: `${accent}88` }}
              >
                Interactive Resume
              </p>
              <h1
                className="font-sans font-bold mb-4 leading-none"
                style={{ fontSize: 'clamp(2.5rem, 7vw, 5rem)', color: t(1.0) }}
              >
                {meta.name}
              </h1>
              <p className="font-sans text-sm mb-3 opacity-75" style={{ color: accent }}>
                {meta.title}
              </p>
              <p
                className="font-sans text-xs leading-relaxed opacity-55 mb-10 max-w-xl mx-auto"
                style={{ color: t(0.85) }}
              >
                {introText}
              </p>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
                className={`font-sans text-[10px] uppercase tracking-widest mt-4 ${isLight ? 'opacity-70' : 'opacity-40'}`}
                style={{ color: accent }}
              >
                scroll to explore ↓
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

// ─── Keyboard Hint ────────────────────────────────────────────────────────────

const KeyboardHint = ({ visible, t }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        key="kb-hint"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 font-sans text-[10px] uppercase tracking-widest whitespace-nowrap no-print hidden lg:block"
        style={{ color: t(0.3) }}
      >
        ↑↓ or j/k to navigate
      </motion.div>
    )}
  </AnimatePresence>
);

// ─── Print Header (print-only) ────────────────────────────────────────────────

const PrintHeader = ({ meta }) => (
  <div className="hidden print:block mb-8 pb-4 border-b border-gray-300">
    <h1 className="text-2xl font-bold text-black">{meta.name}</h1>
    <p className="text-sm text-gray-600 mt-1">{meta.title}</p>
    <p className="text-xs text-gray-500 mt-1">
      {meta.location} · {meta.email} · {meta.linkedin}
    </p>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const InteractiveResume = ({
  config = defaultResumeConfig,
  connections = [],
  embedded = false,
}) => {
  const {
    meta,
    theme: rawTheme,
    eras: unsortedEras,
    education: rawEducation,
    worksBaseUrl = '/',
    introStatement,
    resumeFont: resumeFontId,
  } = config ?? defaultResumeConfig;
  const education = rawEducation ?? [];
  // introStatement: null = use meta.summary, string = custom override
  const introText = introStatement ?? meta.summary;

  // Sort eras by yearLabel descending (most recent first) so the timeline
  // always shows newest roles at top regardless of insertion order.
  const eras = useMemo(
    () =>
      [...unsortedEras].sort((a, b) => {
        const ya = Number.parseInt(a.yearLabel, 10) || 0;
        const yb = Number.parseInt(b.yearLabel, 10) || 0;
        return yb - ya;
      }),
    [unsortedEras],
  );

  // Resolve font pairing — display for headings, body for everything else
  const fonts = useMemo(() => resolveFontPairing(resumeFontId), [resumeFontId]);

  // 3D capability check — skip particle canvas on low-end devices
  const [has3D] = useState(() => canRender3D());

  // Hydrate the theme: builder drafts store only { resumeThemeId } (or {}),
  // so we look up the full resumeThemes entry and merge — this ensures all
  // properties like theme.vignette.edgeOpacity, theme.headerBg, etc. always exist.
  const theme = {
    // Base fallbacks for properties not defined in resumeThemes
    headerBg: 'rgba(0,0,0,0.65)',
    backdropBlur: '12px',
    // Resume theme object (provides bgBase, accent, vignette, particleSize, etc.)
    ...(resumeThemes[rawTheme?.resumeThemeId ?? 'midnight'] ?? resumeThemes.midnight),
    // Raw theme from config last — allows full overrides when defaultResumeConfig is used
    ...rawTheme,
  };

  // Theme-aware color helpers — dark themes use white text/black panels, light use the inverse.
  // Defensive: ensure textBase/panelBase are always valid RGB triplets.
  const textBase =
    theme.textBase && typeof theme.textBase === 'string'
      ? theme.textBase
      : theme.light
        ? '15,23,42'
        : '255,255,255';
  const panelBase =
    theme.panelBase && typeof theme.panelBase === 'string'
      ? theme.panelBase
      : theme.light
        ? '255,255,255'
        : '0,0,0';
  // For light themes, boost low alpha values so text remains readable on cream/white.
  // Dark themes: rgba(255,255,255, 0.3) = visible on dark bg
  // Light themes: rgba(26,26,26, 0.3) = invisible on cream — boost to WCAG AA
  // At alpha=0.70 on #f5f0e8: contrast 6.1:1 (AA pass). Below 0.70 fails AA.
  const boostAlpha = (alpha) => {
    if (!theme.light) return alpha;
    // Remap: minimum 0.70, scale up from there
    // 0.1 → 0.70, 0.3 → 0.76, 0.5 → 0.85, 0.8 → 0.94, 1.0 → 1.0
    const boosted = 0.7 + alpha * 0.3;
    return Math.min(1, boosted);
  };
  const t = (alpha) => `rgba(${textBase},${boostAlpha(alpha)})`;
  const p = (alpha) => `rgba(${panelBase},${boostAlpha(alpha)})`;

  // ── SEO ─────────────────────────────────────────────────────────────────────
  useSEO({
    name: meta.name,
    title: meta.title,
    summary: meta.summary,
    skills: eras.flatMap((e) => e.skills ?? []),
    siteUrl: meta.siteUrl ?? '',
    photoUrl: meta.photoUrl ?? '',
    location: meta.location ?? '',
    github: meta.github ?? '',
    linkedin: meta.linkedin ?? '',
    eras,
  });

  const [activeEraIndex, setActiveEraIndex] = useState(-1);
  const [introPhase, setIntroPhase] = useState('thinking'); // 'thinking' | 'waving' | 'landing'
  const [showSkillsArc, setShowSkillsArc] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);
  const [printMode, setPrintMode] = useState(
    () => new URLSearchParams(window.location.search).get('print') === 'true',
  );

  const sectionRefs = useRef([]);
  const introRef = useRef(null);
  const postErasRef = useRef(null);
  const mousePos = useRef({ x: 0, y: 0, active: false });

  // ── Scroll detection ───────────────────────────────────────────────────────
  // Uses scroll-position calculation instead of IntersectionObserver for reliable
  // detection during fast scrolling. Determines which section's center is closest
  // to the viewport center.
  useEffect(() => {
    let rafId = null;
    const onScroll = () => {
      if (rafId) return; // throttle to one calculation per frame
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const viewCenter = window.innerHeight / 2;

        // Check if post-eras sentinel is in view (scrolled past all eras)
        if (postErasRef.current) {
          const rect = postErasRef.current.getBoundingClientRect();
          if (rect.top < viewCenter) {
            setActiveEraIndex(eras.length);
            return;
          }
        }

        // Check era sections — find the one whose center is closest to viewport center
        let bestIndex = -1;
        let bestDist = Number.POSITIVE_INFINITY;
        for (let i = 0; i < sectionRefs.current.length; i++) {
          const el = sectionRefs.current[i];
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          const sectionCenter = rect.top + rect.height / 2;
          const dist = Math.abs(sectionCenter - viewCenter);
          if (dist < bestDist) {
            bestDist = dist;
            bestIndex = i;
          }
        }

        // Check intro section
        if (introRef.current) {
          const rect = introRef.current.getBoundingClientRect();
          const introCenter = rect.top + rect.height / 2;
          const dist = Math.abs(introCenter - viewCenter);
          if (dist < bestDist) {
            bestIndex = -1;
          }
        }

        setActiveEraIndex(bestIndex);
      });
    };

    // Listen on both window and the closest scrollable ancestor (inline resume uses overflow:auto)
    let scrollParent = null;
    let el = introRef.current?.parentElement;
    while (el && el !== document.body) {
      const style = getComputedStyle(el);
      if (
        style.overflow === 'auto' ||
        style.overflow === 'scroll' ||
        style.overflowY === 'auto' ||
        style.overflowY === 'scroll'
      ) {
        scrollParent = el;
        break;
      }
      el = el.parentElement;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    if (scrollParent) scrollParent.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // initial check
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (scrollParent) scrollParent.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [eras.length]);

  // ── Keyboard hint dismiss ──────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setHintVisible(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  // ── Intro phase animation ─────────────────────────────────────────────────
  // Three text phases: thinking (4s) → waving (6s) → landing (user's name + CTA).
  // The 3D model canvas is shown for the ENTIRE intro section (all three phases),
  // not just thinking/waving — so the model stays visible while the user reads
  // their name and decides to scroll. Canvas switch happens on activeEraIndex change.
  // biome-ignore lint/correctness/useExhaustiveDependencies: introPhase intentionally omitted — including it causes an infinite re-trigger loop
  useEffect(() => {
    if (activeEraIndex !== -1) return; // only while in intro
    if (introPhase === 'landing') return; // don't restart once fully landed
    if (embedded) {
      // Skip intro animation when embedded on profile page
      setIntroPhase('landing');
      return;
    }
    setIntroPhase('thinking');
    const t1 = setTimeout(() => setIntroPhase('waving'), 4000); // thinking: 4s
    const t2 = setTimeout(() => setIntroPhase('landing'), 10000); // waving: 6s
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [activeEraIndex, embedded]);

  // ── Print mode events ──────────────────────────────────────────────────────
  useEffect(() => {
    const before = () => setPrintMode(true);
    const after = () => setPrintMode(false);
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);

  // ── Mouse / touch tracking ──────────────────────────────────────────────────
  // Attached to window so scroll position never interrupts tracking.
  useEffect(() => {
    const onMove = (e) => {
      mousePos.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mousePos.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
      mousePos.current.active = true;
    };
    const onLeave = () => {
      mousePos.current.active = false;
    };
    const onTouchMove = (e) => {
      if (!e.touches[0]) return;
      mousePos.current.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
      mousePos.current.y = -((e.touches[0].clientY / window.innerHeight) * 2 - 1);
      mousePos.current.active = true;
    };
    const onTouchEnd = () => {
      mousePos.current.active = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  // ── Era navigation ─────────────────────────────────────────────────────────
  const scrollToEra = useCallback(
    (index) => {
      if (index === -1) {
        introRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (index >= eras.length) {
        // Past all eras — scroll to education/footer
        postErasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        sectionRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
    [eras.length],
  );

  useKeyboardNav({
    eraCount: eras.length,
    activeIndex: activeEraIndex,
    onNavigate: scrollToEra,
    onFirstPress: () => setHintVisible(false),
  });

  const setSectionRef = useCallback((el, index) => {
    sectionRefs.current[index] = el;
  }, []);

  const pastAllEras = activeEraIndex >= eras.length;
  const activeEra =
    activeEraIndex >= 0 && activeEraIndex < eras.length ? eras[activeEraIndex] : eras[0];
  // Merge company name into the scene config so the particle canvas can use it
  // for monogram fallbacks (company initials instead of era ID "E")
  const rawScene = activeEra?.scene ?? {};
  const activeCompany = activeEra?.company;
  const activeScene = useMemo(
    () => ({ ...rawScene, company: activeCompany }),
    [rawScene, activeCompany],
  );

  // Resolve scene preset: era-level override takes priority, then theme default, then global default
  const activePresetId =
    (activeEraIndex >= 0 && !pastAllEras ? activeScene.presetId : null) ??
    theme.defaultPresetId ??
    'particles';
  // Light themes always keep the theme's own background — era bgHex values are designed
  // for dark themes and would wash out the light aesthetic entirely.
  const bgColor = theme.light
    ? theme.bgBase
    : activeEraIndex >= 0 && !pastAllEras
      ? (activeScene.bgHex ?? theme.bgBase)
      : theme.bgBase;

  // Intro scene uses the selected theme's accent color so it's visually coherent
  // with the rest of the experience. A secondary color is derived by shifting hue -20°.
  const introSceneConfig = useMemo(
    () => ({
      pattern: eras[0]?.scene?.pattern ?? 'neural',
      presetId: eras[0]?.scene?.presetId ?? null,
      primaryHex: theme.accent,
      secondaryHex: applyHueShift(theme.accent, -20, 0.9),
      bgHex: theme.bgBase,
      // Explicitly exclude logoUrl/company/logoDarkBg — intro shows ambient particles, not a logo
    }),
    [eras, theme.bgBase, theme.accent],
  );

  // Era scenes are tinted by the theme's hueShift / saturationScale before passing
  // to the canvas. Midnight (hueShift=0, saturationScale=1) is a no-op.
  // Depend on the two specific primitives tintEraScene reads, not the whole theme object.
  // biome-ignore lint/correctness/useExhaustiveDependencies: theme.hueShift + saturationScale are the only values tintEraScene reads
  const tintedEraScene = useMemo(
    () => tintEraScene(activeScene, theme),
    [activeScene, theme.hueShift, theme.saturationScale],
  );
  const activeSceneConfig =
    activeEraIndex === -1 || pastAllEras ? introSceneConfig : tintedEraScene;
  // Always use scattered particles for intro — figure formations were removed
  const introEraId = 'intro';
  const pastIntro = activeEraIndex >= 0;

  return (
    <div
      role="presentation"
      className={
        printMode
          ? 'print-resume bg-white text-black resume-root'
          : 'relative min-h-screen resume-root'
      }
      style={
        printMode
          ? { '--resume-font-display': fonts.display, '--resume-font-body': fonts.body }
          : {
              background: bgColor,
              transition: 'background 1.2s ease',
              '--resume-font-display': fonts.display,
              '--resume-font-body': fonts.body,
            }
      }
    >
      {/* ── Three.js canvas (hidden in print mode) ──────────────────────── */}
      {!printMode &&
        (() => {
          // Determine if a Canvas 2D scene should render based on the theme ID
          const isStorybook = theme.id === 'storybook';
          const isCircuitBoard = theme.id === 'circuit';
          const isBlueprint = theme.id === 'blueprint';
          const isMusicNotes = theme.id === 'music';
          const isMedical = theme.id === 'medical';
          const isSports = theme.id === 'sports';
          const isLegal = theme.id === 'legal';
          const isScience = theme.id === 'science';
          const isPhoto = theme.id === 'photo';
          const isGlobe = theme.id === 'globe';
          const isCanvas2D =
            isStorybook ||
            isCircuitBoard ||
            isBlueprint ||
            isMusicNotes ||
            isMedical ||
            isSports ||
            isLegal ||
            isScience ||
            isPhoto ||
            isGlobe;
          return (
            <div className="fixed inset-0 z-0 pointer-events-none">
              {/* Canvas 2D scenes — persist through entire resume for scroll-driven effects */}
              {isCanvas2D && (
                <div className="absolute inset-0">
                  <Suspense fallback={null}>
                    {isStorybook && (
                      <StorybookScene activeEraIndex={activeEraIndex} totalEras={eras.length} />
                    )}
                    {isCircuitBoard && (
                      <CircuitBoardScene activeEraIndex={activeEraIndex} totalEras={eras.length} />
                    )}
                    {isBlueprint && (
                      <BlueprintScene activeEraIndex={activeEraIndex} totalEras={eras.length} />
                    )}
                    {isMusicNotes && (
                      <MusicScene activeEraIndex={activeEraIndex} totalEras={eras.length} />
                    )}
                    {isMedical && (
                      <MedicalScene activeEraIndex={activeEraIndex} totalEras={eras.length} />
                    )}
                    {isSports && (
                      <SportsScene activeEraIndex={activeEraIndex} totalEras={eras.length} />
                    )}
                    {isLegal && (
                      <LegalScene activeEraIndex={activeEraIndex} totalEras={eras.length} />
                    )}
                    {isScience && (
                      <ScienceScene activeEraIndex={activeEraIndex} totalEras={eras.length} />
                    )}
                    {isPhoto && (
                      <PhotoScene activeEraIndex={activeEraIndex} totalEras={eras.length} />
                    )}
                    {isGlobe && (
                      <GlobeScene activeEraIndex={activeEraIndex} totalEras={eras.length} />
                    )}
                  </Suspense>
                </div>
              )}

              {/* Particle canvas — visible when not past all eras and particles enabled */}
              <AnimatePresence>
                {!pastAllEras && (theme.showParticles ?? !isStorybook) && (
                  <motion.div
                    key="particle-canvas"
                    className="absolute inset-0"
                    style={{ opacity: 0.82 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.82 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    {has3D ? (
                      <Suspense fallback={null}>
                        <ResumeSceneCanvas
                          eraConfig={activeSceneConfig}
                          eraId={
                            pastAllEras
                              ? 'post-eras'
                              : activeEraIndex === -1
                                ? introEraId
                                : activeEra.id
                          }
                          mousePos={mousePos}
                          particleSize={theme.particleSize}
                          particleAlpha={theme.particleAlpha}
                          particleOffset={
                            activeEraIndex === -1 || pastAllEras ? [0, 0] : [2.4, 0.65]
                          }
                          presetId={
                            activeEraIndex === -1
                              ? (theme.defaultPresetId ?? 'particles')
                              : activePresetId
                          }
                          isLightTheme={!!theme.light}
                          lightBgHex={theme.bgBase}
                        />
                      </Suspense>
                    ) : (
                      /* Low-end fallback: subtle gradient background instead of 3D particles */
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: `radial-gradient(ellipse at 30% 50%, ${activeSceneConfig.primaryHex}15 0%, transparent 60%)`,
                        }}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })()}

      {/* ── Vignette (hidden in print mode) ─────────────────────────────── */}
      {!printMode && (
        <div
          className="fixed inset-0 z-[1] pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,${theme.vignette.edgeOpacity}) 100%)`,
          }}
        />
      )}

      {/* ── Print-only header ────────────────────────────────────────────── */}
      {printMode && <PrintHeader meta={meta} />}

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className={printMode ? '' : 'relative z-10'}>
        {/* Header */}
        {!printMode && (
          <ResumeHeader
            activeEra={activeEra}
            meta={meta}
            theme={theme}
            onToggleSkillsArc={() => setShowSkillsArc((v) => !v)}
            showSkillsArc={showSkillsArc}
            pastIntro={pastIntro}
          />
        )}

        {/* Timeline spine */}
        {!printMode && (
          <TimelineSpine eras={eras} activeIndex={activeEraIndex} onNavigate={scrollToEra} t={t} />
        )}

        {/* Intro */}
        {!printMode && (
          <IntroSection
            meta={meta}
            introRef={introRef}
            phase={introPhase}
            accent={theme.accent}
            t={t}
            introText={introText}
            isLight={theme.light}
            embedded={embedded}
          />
        )}

        {/* Era cards */}
        {eras.map((era, i) => (
          <EraCard
            key={era.id}
            era={era}
            isActive={i === activeEraIndex}
            sectionRef={(el) => setSectionRef(el, i)}
            forceExpand={printMode}
            worksBaseUrl={worksBaseUrl}
            t={t}
            isLight={!!theme.light}
            textBase={textBase}
          />
        ))}

        {/* Post-eras sentinel — triggers era dismissal on scroll */}
        <div ref={postErasRef} style={{ height: '10vh' }} />

        {/* Education entries */}
        {education.length > 0 && (
          <div className={printMode ? '' : ''}>
            {education.map((entry, i) => (
              <EducationCard
                key={entry.institution ? `${entry.institution}-${i}` : `edu-${i}`}
                entry={entry}
                t={t}
                isLight={!!theme.light}
              />
            ))}
          </div>
        )}

        {/* Network connections — shown when viewing a hosted profile */}
        {!printMode && connections.length > 0 && (
          <NetworkSection connections={connections} t={t} isLight={!!theme.light} />
        )}

        {/* Footer */}
        <footer
          className={`py-16 text-center font-mono text-[10px] uppercase tracking-widest ${printMode ? 'hidden' : ''}`}
          style={{ color: t(0.2) }}
        >
          <p className="mb-2">{[meta.location, meta.email].filter(Boolean).join(' · ')}</p>
          <div className="flex items-center justify-center gap-4 mt-3">
            {meta.linkedin && (
              <>
                <a
                  href={meta.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors"
                  style={{ color: t(0.35) }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = t(1.0);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = t(0.35);
                  }}
                >
                  LinkedIn
                </a>
                <span style={{ color: t(0.15) }}>·</span>
              </>
            )}
            {meta.github && (
              <>
                <a
                  href={meta.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors"
                  style={{ color: t(0.35) }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = t(1.0);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = t(0.35);
                  }}
                >
                  GitHub
                </a>
                <span style={{ color: t(0.15) }}>·</span>
              </>
            )}
            {meta.cvUrl && (
              <a
                href={meta.cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors"
                style={{ color: t(0.35) }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = t(1.0);
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = t(0.35);
                }}
              >
                Download CV
              </a>
            )}
          </div>
          <p className={`mt-6 ${theme.light ? 'opacity-70' : 'opacity-40'}`}>
            Built with{' '}
            <a
              href="https://profilegraph.io"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: t(0.35) }}
              className="transition-colors"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = t(1.0);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = t(0.35);
              }}
            >
              ProfileGraph
            </a>
          </p>
        </footer>
      </div>

      {/* ── Floating overlays (hidden in print) ──────────────────────────── */}
      {!printMode && (
        <>
          <MobileEraNav
            eras={eras}
            activeIndex={activeEraIndex}
            onNavigate={scrollToEra}
            visible={pastIntro}
            t={t}
            p={p}
          />
          <KeyboardHint visible={hintVisible} t={t} />
          <SkillsArcOverlay
            eras={eras}
            visible={showSkillsArc}
            mode={theme.skillsDisplay ?? 'grid'}
            onClose={() => setShowSkillsArc(false)}
            onEraClick={(i) => {
              setShowSkillsArc(false);
              scrollToEra(i);
            }}
          />
        </>
      )}
    </div>
  );
};

export default InteractiveResume;
