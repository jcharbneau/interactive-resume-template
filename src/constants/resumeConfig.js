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

// ─── Resolved Config ───────────────────────────────────────────────────────────
// Reads from resume-config.json. Falls back to demo data if the JSON is empty
// or missing required fields (name or eras).

function resolve() {
  try {
    const cfg = resumeConfigJson;
    if (!cfg?.meta?.name && !cfg?.eras?.length) return defaultResumeConfig;
    return {
      meta: cfg.meta ?? {},
      theme: cfg.theme ?? { resumeThemeId: 'midnight' },
      eras: cfg.eras ?? [],
      education: cfg.education ?? [],
      introStatement: cfg.introStatement ?? null,
      resumeFont: cfg.resumeFont ?? null,
      worksBaseUrl: cfg.worksBaseUrl ?? '/',
    };
  } catch {
    return defaultResumeConfig;
  }
}

export const resolvedConfig = resolve();
