import fs from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// ─── Build-time SEO plugin ─────────────────────────────────────────────────────
// Reads resume-config.json at build time and injects fully-formed meta tags
// into index.html so crawlers (and social preview bots) see them before JS runs.
function resumeSeoPlugin() {
  return {
    name: 'resume-seo',
    transformIndexHtml(html) {
      let config;
      try {
        config = JSON.parse(
          fs.readFileSync('./src/constants/resume-config.json', 'utf-8'),
        );
      } catch {
        // Config unreadable — leave index.html untouched
        return html;
      }

      const { meta = {}, eras = [] } = config;
      const name = meta.name || 'Interactive Resume';
      const jobTitle = meta.title || '';
      const siteUrl = (meta.siteUrl || '').replace(/\/$/, '');
      const rawSummary = (meta.summary || '').replace(/\s+/g, ' ').trim();
      const description =
        rawSummary.slice(0, 160) + (rawSummary.length > 160 ? '…' : '');

      // Collect unique skills across all eras for <meta keywords>
      const allSkills = [
        ...new Set(eras.flatMap((e) => e.skills ?? []).filter(Boolean)),
      ];
      const keywords = allSkills.slice(0, 20).join(', ');

      const pageTitle = jobTitle ? `${name} — ${jobTitle}` : name;

      // Schema.org Person — the real SEO payload
      const jsonLd = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Person',
        name,
        jobTitle,
        description: rawSummary.slice(0, 500),
        ...(siteUrl ? { url: siteUrl } : {}),
        sameAs: [meta.linkedin, meta.github].filter(Boolean),
        knowsAbout: allSkills,
        ...(meta.location
          ? {
              address: {
                '@type': 'PostalAddress',
                addressLocality: meta.location,
              },
            }
          : {}),
      });

      // Only include og:image if it's a real URL (not a base64 data URI)
      const ogImage =
        meta.photoUrl && !meta.photoUrl.startsWith('data:')
          ? `  <meta property="og:image" content="${meta.photoUrl}">`
          : '';

      const injected = `
  <title>${pageTitle}</title>
  <meta name="description" content="${description}">
  ${keywords ? `<meta name="keywords" content="${keywords}">` : ''}
  <meta name="author" content="${name}">
  ${siteUrl ? `<link rel="canonical" href="${siteUrl}">` : ''}
  <!-- Open Graph (LinkedIn, Slack, iMessage, etc.) -->
  <meta property="og:type" content="profile">
  <meta property="og:title" content="${pageTitle}">
  <meta property="og:description" content="${description}">
  ${siteUrl ? `  <meta property="og:url" content="${siteUrl}">` : ''}
${ogImage}
  <!-- Twitter / X Card -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${pageTitle}">
  <meta name="twitter:description" content="${description}">
  <!-- JSON-LD structured data (Google, Bing, DuckDuckGo) -->
  <script type="application/ld+json">${jsonLd}</script>`;

      // Swap out the default <title> placeholder we ship in index.html
      return html.replace('<title>Interactive Resume</title>', injected);
    },
  };
}

export default defineConfig({
  plugins: [react(), resumeSeoPlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei', '@react-three/postprocessing'],
        },
      },
    },
  },
});
