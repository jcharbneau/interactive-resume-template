import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';

/**
 * SkillsArcOverlay
 *
 * Displays a horizontally scrollable career arc view with skill continuity
 * indicators. Skills that appear in adjacent eras are highlighted with a
 * connecting underline in the era's accent color.
 */
const SkillsArcOverlay = ({ eras, visible, onClose, onEraClick }) => {
  // Build a map of skill → set of era indices it appears in
  const skillPresence = useMemo(() => {
    const map = new Map();
    eras.forEach((era, i) => {
      era.skills.forEach((skill) => {
        if (!map.has(skill)) map.set(skill, new Set());
        map.get(skill).add(i);
      });
    });
    return map;
  }, [eras]);

  // A skill is "connected" if it appears in an adjacent era (spanning a link)
  const isConnected = (skill, eraIndex) => {
    const indices = skillPresence.get(skill);
    if (!indices) return false;
    return indices.has(eraIndex - 1) || indices.has(eraIndex + 1);
  };

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
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
                Skills Arc
              </span>
              <span className="font-mono text-[10px] text-white/20 ml-3">
                — underlined skills span multiple eras
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="font-mono text-xs uppercase tracking-widest px-3 py-1.5 rounded-full transition-all duration-200"
              style={{
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              ✕ close
            </button>
          </div>

          {/* Scrollable grid */}
          <div className="flex-1 overflow-x-auto overflow-y-auto px-6 lg:px-10 py-8">
            <div className="flex gap-5 min-w-max">
              {eras.map((era, i) => {
                const accent = era.scene.primaryHex;
                return (
                  <motion.div
                    key={era.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col gap-2 w-44 shrink-0"
                  >
                    {/* Era header — clickable to jump to that era */}
                    <button
                      type="button"
                      onClick={() => onEraClick?.(i)}
                      className="pb-2 mb-1 text-left transition-opacity duration-150 hover:opacity-80 cursor-pointer"
                      style={{ borderBottom: `1px solid ${accent}30` }}
                      title={`Go to ${era.company}`}
                    >
                      <div
                        className="font-mono text-[9px] uppercase tracking-[0.25em] mb-0.5"
                        style={{ color: `${accent}66` }}
                      >
                        {era.yearLabel}
                      </div>
                      <div
                        className="font-mono text-xs font-bold leading-tight underline decoration-dotted underline-offset-2"
                        style={{ color: accent }}
                      >
                        {era.company} ↗
                      </div>
                      <div
                        className="font-mono text-[9px] opacity-40 mt-0.5 leading-snug"
                        style={{ color: 'rgba(255,255,255,0.6)' }}
                      >
                        {era.role}
                      </div>
                    </button>

                    {/* Skill chips */}
                    <div className="flex flex-col gap-1.5">
                      {era.skills.map((skill) => {
                        const connected = isConnected(skill, i);
                        return (
                          <span
                            key={skill}
                            className="font-mono text-[9px] px-2 py-0.5 rounded transition-all"
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
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SkillsArcOverlay;
