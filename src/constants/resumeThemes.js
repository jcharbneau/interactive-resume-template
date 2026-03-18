// ─── Resume-specific themes ───────────────────────────────────────────────────
// Independent of the portfolio's cyber-organic/galaxy/baroque themes.
// Each theme overrides the bgBase, particle accent colors, and UI tones
// for the interactive resume experience.
//
// Stored in: localStorage['resume-theme']

export const RESUME_THEME_IDS = {
  MIDNIGHT: 'midnight',
  SLATE: 'slate',
  EMBER: 'ember',
};

export const resumeThemes = {
  midnight: {
    id: 'midnight',
    label: 'Midnight',
    emoji: '🌊',
    description: 'Cool blue-teal — the default',
    // UI chrome
    bgBase: '#020808',
    accent: '#4fc3f7',
    accentDim: '#4fc3f740',
    textPrimary: 'rgba(255,255,255,0.92)',
    textSecondary: 'rgba(255,255,255,0.55)',
    textMuted: 'rgba(255,255,255,0.28)',
    panelBg: 'rgba(0,0,0,0.55)',
    borderColor: 'rgba(255,255,255,0.08)',
    // 3D particle settings (applied to all eras)
    particleSize: 7.0,
    particleAlpha: 0.95,
    vignette: { edgeOpacity: 0.5 },
    // Per-era hue shift: multiply era primaryHex toward a cool palette
    hueShift: 0, // degrees; 0 = no shift, era colors unchanged
    saturationScale: 1, // 1 = no change
  },

  slate: {
    id: 'slate',
    label: 'Slate',
    emoji: '🌿',
    description: 'Dark green-grey, warm and earthy',
    bgBase: '#080c0a',
    accent: '#6ee7b7',
    accentDim: '#6ee7b740',
    textPrimary: 'rgba(232,255,240,0.92)',
    textSecondary: 'rgba(200,235,215,0.55)',
    textMuted: 'rgba(180,210,195,0.28)',
    panelBg: 'rgba(5,12,8,0.60)',
    borderColor: 'rgba(110,231,183,0.10)',
    particleSize: 7.0,
    particleAlpha: 0.9,
    vignette: { edgeOpacity: 0.55 },
    hueShift: 40, // shift era colors toward green
    saturationScale: 0.85,
  },

  ember: {
    id: 'ember',
    label: 'Ember',
    emoji: '🔥',
    description: 'Near-black with warm amber glow',
    bgBase: '#0c0700',
    accent: '#fbbf24',
    accentDim: '#fbbf2440',
    textPrimary: 'rgba(255,248,220,0.92)',
    textSecondary: 'rgba(255,220,140,0.55)',
    textMuted: 'rgba(200,170,80,0.28)',
    panelBg: 'rgba(20,10,0,0.60)',
    borderColor: 'rgba(251,191,36,0.10)',
    particleSize: 6.5,
    particleAlpha: 0.92,
    vignette: { edgeOpacity: 0.6 },
    hueShift: -60, // shift era colors toward amber/orange
    saturationScale: 1.1,
  },
};

export const RESUME_THEME_ORDER = [
  RESUME_THEME_IDS.MIDNIGHT,
  RESUME_THEME_IDS.SLATE,
  RESUME_THEME_IDS.EMBER,
];

export const DEFAULT_RESUME_THEME_ID = RESUME_THEME_IDS.MIDNIGHT;

/** Read persisted theme from localStorage, fallback to default */
export function getStoredResumeTheme() {
  try {
    const stored = localStorage.getItem('resume-theme');
    if (stored && resumeThemes[stored]) return stored;
  } catch {}
  return DEFAULT_RESUME_THEME_ID;
}
