import { AnimatePresence, motion } from 'framer-motion';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { resumeThemes } from '../constants/resumeThemes';
import { useIsMobile } from '../hooks/useIsMobile';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import { useSEO } from '../hooks/useSEO';
import SkillsArcOverlay from './SkillsArcOverlay';

const ResumeSceneCanvas = lazy(() => import('./canvas/ResumeSceneCanvas'));
const IntroModelCanvas = lazy(() => import('./canvas/IntroModelCanvas'));

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

const CompanyContextPanel = ({ era, accent }) => (
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
        background: `${accent}0d`,
        border: `1px solid ${accent}28`,
      }}
    >
      <p className="leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.75)' }}>
        {era.companyContext.what}
      </p>
      <div className="flex flex-wrap gap-x-5 gap-y-1 mb-3" style={{ color: `${accent}cc` }}>
        {era.companyContext.size && (
          <span>
            <span style={{ color: `${accent}88` }}>scale: </span>
            {era.companyContext.size}
          </span>
        )}
        {era.companyContext.founded && (
          <span>
            <span style={{ color: `${accent}88` }}>founded: </span>
            {era.companyContext.founded}
          </span>
        )}
        {era.companyContext.hq && (
          <span>
            <span style={{ color: `${accent}88` }}>hq: </span>
            {era.companyContext.hq}
          </span>
        )}
      </div>
      {era.companyContext.notable && (
        <p className="leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
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

const EraCard = ({ era, isActive, sectionRef, forceExpand, worksBaseUrl }) => {
  const [contextOpen, setContextOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const accent = era.scene.primaryHex;
  const accentDim = `${accent}40`;

  const effectiveExpanded = forceExpand || expanded;
  const visibleAccomplishments = effectiveExpanded
    ? era.accomplishments
    : era.accomplishments.slice(0, INITIAL_ACCOMPLISHMENT_COUNT);
  const hiddenCount = era.accomplishments.length - INITIAL_ACCOMPLISHMENT_COUNT;

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
              background: `${accent}18`,
              border: `1px solid ${accentDim}`,
              color: accent,
            }}
          >
            {era.yearLabel}
          </span>

          {/* Company name */}
          <div className="mb-2">
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
                  color: isActive ? 'rgba(255,255,255,1.0)' : 'rgba(255,255,255,0.65)',
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
            {era.company !== era.companyFull && (
              <p className="font-mono text-[11px] mt-1 opacity-50" style={{ color: accent }}>
                {era.companyFull}
              </p>
            )}
          </div>

          {/* Context accordion */}
          <AnimatePresence>
            {contextOpen && <CompanyContextPanel key="ctx" era={era} accent={accent} />}
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
          <span className="font-mono text-xs opacity-45" style={{ color: 'rgba(255,255,255,0.8)' }}>
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
                  background: i === 0 ? `${accent}20` : 'transparent',
                  border: `1px solid ${accent}${i === 0 ? '40' : '20'}`,
                  color: i === 0 ? accent : `${accent}88`,
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
          style={{ color: 'rgba(255,255,255,0.9)' }}
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
              <span
                className="font-mono text-sm leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.82)' }}
              >
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
              className="font-mono text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-opacity duration-200 opacity-50 hover:opacity-100"
              style={{ color: accent }}
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
          {era.skills.map((skill) => (
            <span
              key={skill}
              className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full"
              style={{
                background: `${accent}14`,
                border: `1px solid ${accent}32`,
                color: `${accent}dd`,
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
          className="h-px w-full max-w-xs opacity-15"
          style={{ background: `linear-gradient(to right, ${accent}, transparent)` }}
        />
      </div>
    </section>
  );
};

// ─── Timeline Spine ───────────────────────────────────────────────────────────

const TimelineSpine = ({ eras, activeIndex, onNavigate }) => (
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
              background: isActive ? accent : 'rgba(255,255,255,0.4)',
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
                className="absolute left-5 font-mono text-[9px] tracking-widest uppercase whitespace-nowrap"
                style={{ color: accent }}
              >
                {era.yearLabel}
              </motion.span>
            )}
          </AnimatePresence>
          {i < eras.length - 1 && (
            <div className="w-px" style={{ height: 42, background: 'rgba(255,255,255,0.1)' }} />
          )}
        </div>
      );
    })}
  </div>
);

// ─── Mobile Era Nav (bottom pill) ─────────────────────────────────────────────

const MobileEraNav = ({ eras, activeIndex, onNavigate, visible }) => {
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
            className="font-mono text-[9px] uppercase tracking-widest"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            {activeEra?.company}
          </span>

          {/* Pill */}
          <div
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-full"
            style={{
              background: 'rgba(0,0,0,0.72)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <button
              type="button"
              onClick={() => onNavigate(Math.max(0, activeIndex - 1))}
              disabled={activeIndex === 0}
              className="font-mono text-sm text-white/40 hover:text-white transition-colors disabled:opacity-20 w-5 text-center"
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
                      background: isAct ? era.scene.primaryHex : 'rgba(255,255,255,0.28)',
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
              className="font-mono text-sm text-white/40 hover:text-white transition-colors disabled:opacity-20 w-5 text-center"
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

const ResumeHeader = ({ activeEra, meta, theme, onToggleSkillsArc, showSkillsArc }) => {
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
      <a
        href="/"
        className="font-mono text-[11px] uppercase tracking-widest flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity duration-200"
        style={{ color: accent }}
      >
        ← Portfolio
      </a>

      <div className="flex items-center gap-3">
        <span className="font-mono text-xs font-bold" style={{ color: theme.textPrimary }}>
          {meta.name}
        </span>
        <span
          className="hidden sm:block font-mono text-[10px] opacity-40"
          style={{ color: accent }}
        >
          ·
        </span>
        <span
          className="hidden sm:block font-mono text-[10px] uppercase tracking-wider opacity-55"
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
          className="hidden sm:block font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full transition-all duration-200"
          style={{
            background: showSkillsArc ? `${accent}28` : `${accent}0e`,
            border: `1px solid ${accent}${showSkillsArc ? '60' : '28'}`,
            color: showSkillsArc ? accent : `${accent}aa`,
          }}
        >
          ◈ Skills Arc
        </button>

        {/* CV download */}
        <a
          href={meta.cvUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full transition-all duration-200"
          style={{
            background: `${accent}18`,
            border: `1px solid ${accent}40`,
            color: accent,
          }}
        >
          ↓ CV
        </a>
      </div>
    </header>
  );
};

// ─── Intro Section ────────────────────────────────────────────────────────────

const introPhaseVariants = {
  initial: { opacity: 0, y: 24, filter: 'blur(6px)' },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -18,
    filter: 'blur(4px)',
    transition: { duration: 0.45, ease: [0.55, 0, 1, 0.45] },
  },
};

const IntroSection = ({ meta, introRef, phase }) => {
  const accent = '#4fc3f7'; // misty blue — matches introSceneConfig
  return (
    <section
      ref={introRef}
      className="min-h-screen flex flex-col items-center justify-center relative px-6"
      style={{ paddingTop: '5rem', paddingBottom: '30vh' }}
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
                className="font-mono text-[11px] uppercase tracking-[0.35em] mb-6"
                style={{ color: `${accent}88` }}
              >
                Interactive Resume
              </p>
              <h2
                className="font-mono font-bold leading-tight mb-6"
                style={{ fontSize: 'clamp(1.6rem, 4.5vw, 3rem)', color: 'rgba(255,255,255,0.92)' }}
              >
                What should a modern
                <br />
                <span style={{ color: accent }}>resume</span> look like?
              </h2>
              <p
                className="font-mono text-xs leading-relaxed max-w-sm mx-auto"
                style={{ color: 'rgba(255,255,255,0.35)' }}
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
                className="font-mono text-[11px] uppercase tracking-[0.35em] mb-6"
                style={{ color: `${accent}88` }}
              >
                Interactive Resume
              </p>
              <h2
                className="font-mono font-bold leading-tight mb-6"
                style={{ fontSize: 'clamp(1.6rem, 4.5vw, 3rem)', color: 'rgba(255,255,255,0.92)' }}
              >
                One that
                <br />
                <span style={{ color: accent }}>moves</span> with you.
              </h2>
              <p
                className="font-mono text-xs leading-relaxed max-w-sm mx-auto"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                30 years of experience. One living document.
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
                className="font-mono text-[11px] uppercase tracking-[0.35em] mb-4"
                style={{ color: `${accent}88` }}
              >
                Interactive Resume
              </p>
              <h1
                className="font-mono font-bold mb-4 leading-none"
                style={{ fontSize: 'clamp(2.5rem, 7vw, 5rem)', color: 'rgba(255,255,255,1.0)' }}
              >
                {meta.name}
              </h1>
              <p className="font-mono text-sm mb-3 opacity-75" style={{ color: accent }}>
                {meta.title}
              </p>
              <p
                className="font-mono text-xs leading-relaxed opacity-55 mb-10 max-w-xl mx-auto"
                style={{ color: 'rgba(255,255,255,0.85)' }}
              >
                {meta.summary}
              </p>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
                className="font-mono text-[10px] uppercase tracking-widest opacity-40 mt-4"
                style={{ color: accent }}
              >
                scroll to explore ↓
              </motion.div>

              {/* You could add a custom CTA here, e.g. a link to your GitHub or contact page */}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

// ─── Keyboard Hint ────────────────────────────────────────────────────────────

const KeyboardHint = ({ visible }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        key="kb-hint"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 font-mono text-[10px] uppercase tracking-widest whitespace-nowrap no-print hidden lg:block"
        style={{ color: 'rgba(255,255,255,0.3)' }}
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

const InteractiveResume = ({ config }) => {
  const { meta, theme: rawTheme, eras, worksBaseUrl = '/' } = config;

  // Hydrate the theme: configs may store only { resumeThemeId }, so we look up
  // the full resumeThemes entry and merge to ensure all properties exist.
  const theme = {
    headerBg: 'rgba(0,0,0,0.65)',
    backdropBlur: '12px',
    ...(resumeThemes[rawTheme?.resumeThemeId ?? 'midnight'] ?? resumeThemes.midnight),
    ...rawTheme,
  };

  // ── SEO ─────────────────────────────────────────────────────────────────────
  useSEO({
    name: meta.name,
    title: meta.title,
    summary: meta.summary,
    skills: eras.flatMap((e) => e.skills ?? []),
    siteUrl: meta.siteUrl ?? '',
    photoUrl: meta.photoUrl ?? '',
    location: meta.location ?? '',
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
  const mousePos = useRef({ x: 0, y: 0, active: false });

  // ── Scroll detection ───────────────────────────────────────────────────────
  useEffect(() => {
    const observers = [];
    // Observe intro section → index -1
    if (introRef.current) {
      const obs = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
              setActiveEraIndex(-1);
            }
          }
        },
        { threshold: 0.35 },
      );
      obs.observe(introRef.current);
      observers.push(obs);
    }
    // Observe era sections → index 0..N-1
    sectionRefs.current.forEach((el, i) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
              setActiveEraIndex(i);
            }
          }
        },
        { threshold: 0.35 },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () =>
      observers.forEach((o) => {
        o.disconnect();
      });
  }, []);

  // ── Keyboard hint dismiss ──────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setHintVisible(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  // ── Intro phase animation — auto-plays on first visit to intro section ─────
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally omit introPhase — adding it would cause infinite re-trigger loop
  useEffect(() => {
    if (activeEraIndex !== -1) return; // only while in intro
    if (introPhase === 'landing') return; // don't restart once fully landed
    setIntroPhase('thinking');
    const t1 = setTimeout(() => setIntroPhase('waving'), 4000); // thinking: 4s
    const t2 = setTimeout(() => setIntroPhase('landing'), 10000); // waving: 6s
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [activeEraIndex]);

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
  const scrollToEra = useCallback((index) => {
    if (index === -1) {
      introRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      sectionRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  useKeyboardNav({
    eraCount: eras.length,
    activeIndex: activeEraIndex,
    onNavigate: scrollToEra,
    onFirstPress: () => setHintVisible(false),
  });

  const setSectionRef = useCallback((el, index) => {
    sectionRefs.current[index] = el;
  }, []);

  const activeEra = activeEraIndex >= 0 ? eras[activeEraIndex] : eras[0];
  const activeScene = activeEra?.scene ?? {};
  const bgColor = activeEraIndex >= 0 ? (activeScene.bgHex ?? theme.bgBase) : theme.bgBase;

  // Intro gets its own misty blue-teal neon palette; eras use their own scene config
  const introSceneConfig = useMemo(
    () => ({
      ...(eras[0]?.scene ?? {}),
      primaryHex: '#4fc3f7',
      secondaryHex: '#26c6da',
      bgHex: theme.bgBase,
      logoUrl: null,
    }),
    [eras, theme.bgBase],
  );
  const activeSceneConfig = activeEraIndex === -1 ? introSceneConfig : activeScene;
  const introEraId =
    introPhase === 'thinking'
      ? 'intro-thinking'
      : introPhase === 'waving'
        ? 'intro-waving'
        : 'intro';
  const pastIntro = activeEraIndex >= 0;

  return (
    <div
      role="presentation"
      className={printMode ? 'print-resume bg-white text-black' : 'relative min-h-screen'}
      style={printMode ? {} : { background: bgColor, transition: 'background 1.2s ease' }}
    >
      {/* ── Three.js canvas (hidden in print mode) ──────────────────────── */}
      {!printMode &&
        (() => {
          // During the intro model phases (thinking/waving) show the 3D GLB wireframe canvas.
          // During 'landing' and all era phases, show the particle canvas.
          const showModelCanvas = activeEraIndex === -1 && introPhase !== 'landing';
          return (
            <div className="fixed inset-0 z-0 pointer-events-none">
              <AnimatePresence mode="wait">
                {showModelCanvas ? (
                  <motion.div
                    key="model-canvas"
                    className="absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7 }}
                  >
                    <Suspense fallback={null}>
                      <IntroModelCanvas phase={introPhase} />
                    </Suspense>
                  </motion.div>
                ) : (
                  <motion.div
                    key="particle-canvas"
                    className="absolute inset-0"
                    style={{ opacity: 0.82 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.82 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7 }}
                  >
                    <Suspense fallback={null}>
                      <ResumeSceneCanvas
                        eraConfig={activeSceneConfig}
                        eraId={activeEraIndex === -1 ? introEraId : activeEra.id}
                        mousePos={mousePos}
                        particleSize={theme.particleSize}
                        particleAlpha={theme.particleAlpha}
                        particleOffset={activeEraIndex === -1 ? [0, 0] : [1.8, 0.65]}
                      />
                    </Suspense>
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
          />
        )}

        {/* Timeline spine */}
        {!printMode && (
          <TimelineSpine eras={eras} activeIndex={activeEraIndex} onNavigate={scrollToEra} />
        )}

        {/* Intro */}
        {!printMode && <IntroSection meta={meta} introRef={introRef} phase={introPhase} />}

        {/* Era cards */}
        {eras.map((era, i) => (
          <EraCard
            key={era.id}
            era={era}
            isActive={i === activeEraIndex}
            sectionRef={(el) => setSectionRef(el, i)}
            forceExpand={printMode}
            worksBaseUrl={worksBaseUrl}
          />
        ))}

        {/* Footer */}
        <footer
          className={`py-16 text-center font-mono text-[10px] uppercase tracking-widest ${printMode ? 'hidden' : ''}`}
          style={{ color: 'rgba(255,255,255,0.2)' }}
        >
          <p className="mb-2">
            {meta.location} · {meta.email}
          </p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <a
              href={meta.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              LinkedIn
            </a>
            <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
            <a
              href="/"
              className="hover:text-white transition-colors"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              Portfolio
            </a>
            <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
            <a
              href={meta.cvUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              Download CV
            </a>
          </div>
          <p className="mt-6 opacity-40">
            Built with React, Three.js &amp; obsessive attention to detail.
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
          />
          <KeyboardHint visible={hintVisible} />
          <SkillsArcOverlay
            eras={eras}
            visible={showSkillsArc}
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
