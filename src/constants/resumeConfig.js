import { DEMO_ERAS, DEMO_META } from './demoData';
import resumeConfigJson from './resume-config.json';

// ─── Default Theme ─────────────────────────────────────────────────────────────
// Override any of these values to create a themed instance of InteractiveResume.

export const defaultTheme = {
  fontFamily: 'mono',
  bgBase: '#0f172a',
  headerBg: 'rgba(0,0,0,0.65)',
  vignette: { centerOpacity: 0, edgeOpacity: 0.5 },
  particleSize: 7.0,
  particleAlpha: 0.95,
  textPrimary: 'rgba(255,255,255,1.0)',
  textSecondary: 'rgba(255,255,255,0.72)',
  backdropBlur: '12px',
  worksBaseUrl: '/',
};

// ─── Default Config ────────────────────────────────────────────────────────────
// Shown when no valid resume-config.json is loaded.

export const defaultResumeConfig = {
  meta: DEMO_META,
  theme: defaultTheme,
  eras: DEMO_ERAS,
  worksBaseUrl: '/',
};

// ─── Event property cleanup ───────────────────────────────────────────────────
// Browser event properties can leak into era data if a click handler
// accidentally spreads a SyntheticEvent into an onChange update. Strip them
// at load time so the viewer never sees corrupted data.
const EVENT_KEYS = new Set([
  'type', 'target', 'currentTarget', 'bubbles', 'cancelable', 'defaultPrevented',
  'eventPhase', 'isTrusted', 'timeStamp', 'nativeEvent', '_reactName', '_targetInst',
  'view', 'detail', 'screenX', 'screenY', 'clientX', 'clientY', 'pageX', 'pageY',
  'movementX', 'movementY', 'button', 'buttons', 'relatedTarget',
  'ctrlKey', 'shiftKey', 'altKey', 'metaKey',
]);

function cleanEra(era) {
  if (!era || typeof era !== 'object') return era;
  // Fast path: no event contamination
  if (!('nativeEvent' in era) && !('_reactName' in era) && !('eventPhase' in era)) return era;
  const clean = {};
  for (const [k, v] of Object.entries(era)) {
    if (!EVENT_KEYS.has(k)) clean[k] = v;
  }
  return clean;
}

// ─── Config validation ────────────────────────────────────────────────────────
// Lightweight runtime checks (no Zod dependency in the template).
// Logs warnings for issues but never blocks rendering.

function validateConfig(cfg) {
  const warnings = [];
  if (!cfg.meta?.name) warnings.push('meta.name is missing');
  if (!Array.isArray(cfg.eras) || cfg.eras.length === 0) {
    warnings.push('eras array is empty or missing');
  } else {
    cfg.eras.forEach((era, i) => {
      if (!era.id) warnings.push(`eras[${i}] is missing id`);
      if (!era.company) warnings.push(`eras[${i}] is missing company`);
      if (!era.role) warnings.push(`eras[${i}] is missing role`);
      if (!era.yearLabel) warnings.push(`eras[${i}] is missing yearLabel`);
      if ('nativeEvent' in era || '_reactName' in era) {
        warnings.push(`eras[${i}] contains browser event properties (will be stripped)`);
      }
    });
  }
  if (warnings.length > 0) {
    console.warn(
      `[resumeConfig] resume-config.json has ${warnings.length} issue(s):\n${warnings.map((w) => `  • ${w}`).join('\n')}`,
    );
  }
  return warnings;
}

// ─── Resolved Config ───────────────────────────────────────────────────────────
// Reads from resume-config.json. Falls back to demo data if the JSON is empty
// or missing required fields (name or eras).

function resolve() {
  try {
    const cfg = resumeConfigJson;
    if (!cfg?.meta?.name && !cfg?.eras?.length) return defaultResumeConfig;

    const resolved = {
      meta: cfg.meta ?? {},
      theme: cfg.theme ?? { resumeThemeId: 'midnight' },
      eras: (cfg.eras ?? []).map(cleanEra),
      education: cfg.education ?? [],
      introStatement: cfg.introStatement ?? null,
      resumeFont: cfg.resumeFont ?? null,
      worksBaseUrl: cfg.worksBaseUrl ?? '/',
    };

    validateConfig(resolved);
    return resolved;
  } catch {
    return defaultResumeConfig;
  }
}

export const resolvedConfig = resolve();
