/**
 * palette — centralized color tokens for all ProfileGraph pages.
 *
 * Replaces the duplicated per-page palette objects (lp, d, mkD, hp).
 * Import and call with the isDark boolean from useTheme().
 */
export function palette(isDark) {
  return {
    bg: isDark ? '#0f172a' : '#f8fafc',
    bgCard: isDark ? '#1e293b' : '#ffffff',
    text: isDark ? 'rgba(248,250,252,0.92)' : 'rgba(15,23,42,0.92)',
    textSub: isDark ? 'rgba(248,250,252,0.6)' : 'rgba(30,41,59,0.7)',
    textMuted: isDark ? 'rgba(248,250,252,0.35)' : 'rgba(51,65,85,0.5)',
    textHint: isDark ? 'rgba(248,250,252,0.18)' : 'rgba(100,116,139,0.4)',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.1)',
    borderMd: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.18)',
    navBg: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.97)',
    navBorder: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.08)',
    inputBg: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
    inputBorder: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.18)',
    accent: '#3b82f6',
    accentHover: '#2563eb',
    accentBg: isDark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)',
    accentFg: '#ffffff',
    cardBg: isDark ? '#1e293b' : '#ffffff',
    cardBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.1)',
    cardBorderHover: isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.25)',
    company: '#34d399',
    org: '#a78bfa',
    danger: isDark ? '#f87171' : '#dc2626',
    shadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
  };
}

/** Accent colors for node types (graph, cards, badges). */
export const NODE_ACCENTS = {
  person: '#3b82f6',
  company: '#34d399',
  org: '#a78bfa',
  community: '#f59e0b',
  shadow: '#64748b',
  default: '#94a3b8',
};

/**
 * Convert a hex color (#rrggbb) + alpha (0–1) to an rgba() string.
 * Falls back gracefully for non-hex inputs.
 */
export function colorWithAlpha(hex, alpha) {
  if (!hex || hex.length < 7) return `rgba(148,163,184,${alpha})`;
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Font family constants. */
export const FONT = {
  display: "'Playfair Display', Georgia, serif",
  body: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  mono: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
};
