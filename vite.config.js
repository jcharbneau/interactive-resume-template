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
        return html;
      }

      const { meta = {}, eras = [] } = config;
      const name = meta.name || 'Interactive Resume';
      const jobTitle = meta.title || '';
      const siteUrl = (meta.siteUrl || '').replace(/\/$/, '');
      const rawSummary = (meta.summary || '').replace(/\s+/g, ' ').trim();
      const description =
        rawSummary.slice(0, 160) + (rawSummary.length > 160 ? '…' : '');

      const allSkills = [
        ...new Set(eras.flatMap((e) => e.skills ?? []).filter(Boolean)),
      ];
      const keywords = allSkills.slice(0, 20).join(', ');
      const pageTitle = jobTitle ? `${name} — ${jobTitle}` : name;

      // sameAs — identity merging across platforms
      const sameAs = [meta.linkedin, meta.github, siteUrl || undefined].filter(Boolean);

      // worksFor — employment graph
      const worksFor = eras
        .map((e) =>
          e.company
            ? {
                '@type': 'Organization',
                name: e.companyFull || e.company,
                ...(e.companyUrl ? { url: e.companyUrl } : {}),
              }
            : null,
        )
        .filter(Boolean);

      const jsonLd = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Person',
        name,
        jobTitle,
        description: rawSummary.slice(0, 500),
        ...(siteUrl ? { url: siteUrl } : {}),
        ...(meta.location
          ? { address: { '@type': 'PostalAddress', addressLocality: meta.location } }
          : {}),
        ...(sameAs.length ? { sameAs } : {}),
        knowsAbout: allSkills,
        ...(worksFor.length ? { worksFor } : {}),
      });

      const ogImage =
        meta.photoUrl && !meta.photoUrl.startsWith('data:')
          ? `  <meta property="og:image" content="${meta.photoUrl}">`
          : '';

      // <link rel="me"> for IndieWeb / Mastodon / Bluesky identity verification
      const relMe = [meta.github, meta.linkedin]
        .filter(Boolean)
        .map((href) => `  <link rel="me" href="${href}">`)
        .join('\n');

      const injected = `
  <title>${pageTitle}</title>
  <meta name="description" content="${description}">
  ${keywords ? `<meta name="keywords" content="${keywords}">` : ''}
  <meta name="author" content="${name}">
  ${siteUrl ? `<link rel="canonical" href="${siteUrl}">` : ''}
${relMe}
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
  <!-- JSON-LD structured data (Google, Bing, DuckDuckGo, AI crawlers) -->
  <script type="application/ld+json">${jsonLd}</script>`;

      return html.replace('<title>Interactive Resume</title>', injected);
    },
  };
}

// ─── profile.json plugin ───────────────────────────────────────────────────────
// Generates /profile.json in the build output — machine-readable identity endpoint
// for agents, crawlers, and recruiting tools.
function profileJsonPlugin() {
  return {
    name: 'profile-json',

    configureServer(server) {
      server.middlewares.use('/profile.json', (_req, res) => {
        let config = { meta: {}, eras: [] };
        try {
          config = JSON.parse(fs.readFileSync('./src/constants/resume-config.json', 'utf-8'));
        } catch { /* serve empty profile if config unreadable */ }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(JSON.stringify(buildProfile(config), null, 2));
      });
    },

    generateBundle() {
      let config = { meta: {}, eras: [] };
      try {
        config = JSON.parse(fs.readFileSync('./src/constants/resume-config.json', 'utf-8'));
      } catch { /* emit empty profile if config unreadable */ }

      this.emitFile({
        type: 'asset',
        fileName: 'profile.json',
        source: JSON.stringify(buildProfile(config), null, 2),
      });
    },
  };
}

function buildProfile({ meta = {}, eras = [] }) {
  const allSkills = [...new Set(eras.flatMap((e) => e.skills ?? []).filter(Boolean))];
  return {
    type: 'profile',
    version: '1.0',
    name: meta.name ?? '',
    title: meta.title ?? '',
    location: meta.location ?? '',
    email: meta.email ?? '',
    siteUrl: meta.siteUrl ?? '',
    linkedin: meta.linkedin ?? '',
    github: meta.github ?? '',
    summary: meta.summary ?? '',
    skills: allSkills,
    companies: eras.map((e) => e.company).filter(Boolean),
    timeline: eras.map((e) => ({
      company: e.company ?? '',
      companyFull: e.companyFull ?? e.company ?? '',
      role: e.role ?? '',
      period: e.period ?? '',
      skills: e.skills ?? [],
    })),
    connections: [],
  };
}

export default defineConfig({
  plugins: [react(), resumeSeoPlugin(), profileJsonPlugin()],
  esbuild: {
    // Strip console.log/debug in production — keep warn/error for client-side tracking
    pure: ['console.log', 'console.debug'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/postprocessing'],
        },
      },
    },
  },
});
