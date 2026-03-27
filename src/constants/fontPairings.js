/**
 * fontPairings — curated display + body font combinations for the resume.
 *
 * Each pairing defines:
 *   display — font-family for headings (name, section titles)
 *   body    — font-family for body text (descriptions, accomplishments)
 *   label   — human-readable name shown in the picker
 *   description — short rationale
 *
 * All fonts are loaded via Google Fonts in index.html.
 */

export const FONT_PAIRINGS = {
  classic: {
    id: 'classic',
    label: 'Classic',
    description: 'Elegant serif headings with clean sans-serif body — timeless and professional',
    display: "'Playfair Display', Georgia, serif",
    body: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    sampleDisplay: 'Playfair Display',
    sampleBody: 'Inter',
  },
  modern: {
    id: 'modern',
    label: 'Modern',
    description: 'All Inter — clean, geometric, and highly readable across all sizes',
    display:
      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    body: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    sampleDisplay: 'Inter',
    sampleBody: 'Inter',
  },
  editorial: {
    id: 'editorial',
    label: 'Editorial',
    description: 'Refined serif headings with a warm humanist body — polished and articulate',
    display: "'Source Serif 4', Georgia, serif",
    body: "'Source Sans 3', 'Segoe UI', Helvetica, Arial, sans-serif",
    sampleDisplay: 'Source Serif 4',
    sampleBody: 'Source Sans 3',
  },
  technical: {
    id: 'technical',
    label: 'Technical',
    description: "IBM's structured type system — engineered for clarity and precision",
    display: "'IBM Plex Serif', Georgia, serif",
    body: "'IBM Plex Sans', 'Segoe UI', Helvetica, Arial, sans-serif",
    sampleDisplay: 'IBM Plex Serif',
    sampleBody: 'IBM Plex Sans',
  },
  warm: {
    id: 'warm',
    label: 'Warm',
    description: 'Friendly and approachable — great for people-facing roles',
    display: "'Merriweather', Georgia, serif",
    body: "'Lato', 'Segoe UI', Helvetica, Arial, sans-serif",
    sampleDisplay: 'Merriweather',
    sampleBody: 'Lato',
  },
  minimal: {
    id: 'minimal',
    label: 'Minimal',
    description: 'Light-weight and airy — lets your content speak without distraction',
    display: "'Lato', 'Segoe UI', Helvetica, Arial, sans-serif",
    body: "'Lato', 'Segoe UI', Helvetica, Arial, sans-serif",
    sampleDisplay: 'Lato',
    sampleBody: 'Lato',
  },
};

export const FONT_PAIRING_ORDER = [
  'classic',
  'modern',
  'editorial',
  'technical',
  'warm',
  'minimal',
];

/**
 * Resolve a font pairing id to its display/body font-family strings.
 * Falls back to 'classic' for unknown ids.
 */
export function resolveFontPairing(id) {
  const pairing = FONT_PAIRINGS[id] ?? FONT_PAIRINGS.classic;
  return { display: pairing.display, body: pairing.body };
}
