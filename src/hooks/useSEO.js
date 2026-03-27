import { useEffect } from 'react';

/**
 * useSEO — sets document.title and Open Graph / Twitter meta tags at runtime.
 *
 * Also injects a schema.org/Person JSON-LD block with identity graph fields:
 *   sameAs    — links to GitHub, LinkedIn, personal site (enables search engine identity merging)
 *   knowsAbout — deduplicated skills (enables semantic search by skill)
 *   worksFor   — array of Organization nodes built from eras (employment graph)
 *
 * This is a belt-and-suspenders complement to the build-time Vite plugin.
 * The build-time plugin ensures crawlers see SEO before JS runs; this hook
 * keeps meta tags accurate during client-side navigation.
 *
 * @param {object} params
 * @param {string} params.name        - Full name (required)
 * @param {string} [params.title]     - Job title / headline
 * @param {string} [params.summary]   - Bio / summary (truncated to 160 chars)
 * @param {string[]} [params.skills]  - All skills (for keywords meta + knowsAbout)
 * @param {string} [params.siteUrl]   - Canonical URL of the deployed resume
 * @param {string} [params.photoUrl]  - Profile photo URL (not base64)
 * @param {string} [params.location]  - Location string
 * @param {string} [params.github]    - GitHub profile URL
 * @param {string} [params.linkedin]  - LinkedIn profile URL
 * @param {Array}  [params.eras]      - Era objects (used to build worksFor graph)
 */
export function useSEO({
  name,
  title = '',
  summary = '',
  skills = [],
  siteUrl = '',
  photoUrl = '',
  location = '',
  github = '',
  linkedin = '',
  eras = [],
}) {
  useEffect(() => {
    if (!name) return;

    const pageTitle = title ? `${name} — ${title}` : name;
    const description =
      summary.replace(/\s+/g, ' ').slice(0, 160) + (summary.length > 160 ? '…' : '');
    const keywords = [...new Set(skills)].slice(0, 20).join(', ');

    // ── document.title ────────────────────────────────────────────────────────
    document.title = pageTitle;

    // ── Upsert a <meta> tag by selector ──────────────────────────────────────
    const setMeta = (attrName, attrValue, content) => {
      let el = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // ── Upsert a <link> tag ───────────────────────────────────────────────────
    const setLink = (rel, href, extra = {}) => {
      const selector = rel === 'me' ? `link[rel="me"][href="${href}"]` : `link[rel="${rel}"]`;
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
      }
      el.setAttribute('href', href);
      for (const [k, v] of Object.entries(extra)) el.setAttribute(k, v);
    };

    // ── Upsert JSON-LD script ─────────────────────────────────────────────────
    const setJsonLd = (data) => {
      let el = document.querySelector('script[type="application/ld+json"]');
      if (!el) {
        el = document.createElement('script');
        el.setAttribute('type', 'application/ld+json');
        document.head.appendChild(el);
      }
      el.textContent = JSON.stringify(data);
    };

    // Standard meta
    setMeta('name', 'description', description);
    if (keywords) setMeta('name', 'keywords', keywords);
    setMeta('name', 'author', name);
    if (siteUrl) setLink('canonical', siteUrl);

    // Open Graph
    setMeta('property', 'og:type', 'profile');
    setMeta('property', 'og:title', pageTitle);
    setMeta('property', 'og:description', description);
    if (siteUrl) setMeta('property', 'og:url', siteUrl);

    // OG image: use photo URL if available
    if (photoUrl && !photoUrl.startsWith('data:')) {
      setMeta('property', 'og:image', photoUrl);
    }

    // Twitter / X Card
    setMeta('name', 'twitter:card', 'summary');
    setMeta('name', 'twitter:title', pageTitle);
    setMeta('name', 'twitter:description', description);

    // ── IndieWeb / Mastodon identity verification ─────────────────────────────
    if (github) setLink('me', github);
    if (linkedin) setLink('me', linkedin);

    // ── Build graph fields for JSON-LD ────────────────────────────────────────
    const sameAs = [github, linkedin, siteUrl].filter(Boolean);
    const knowsAbout = [...new Set(skills)].filter(Boolean);
    const worksFor = eras
      .map((era) =>
        era.company
          ? {
              '@type': 'Organization',
              name: era.companyFull || era.company,
              ...(era.companyUrl ? { url: era.companyUrl } : {}),
            }
          : null,
      )
      .filter(Boolean);

    // JSON-LD Person schema
    setJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name,
      jobTitle: title,
      description: summary.slice(0, 500),
      ...(siteUrl ? { url: siteUrl } : {}),
      ...(location ? { address: { '@type': 'PostalAddress', addressLocality: location } } : {}),
      ...(sameAs.length ? { sameAs } : {}),
      ...(knowsAbout.length ? { knowsAbout } : {}),
      ...(worksFor.length ? { worksFor } : {}),
    });

    return () => {
      document.title = 'Resume';
    };
  }, [name, title, summary, skills, siteUrl, photoUrl, location, github, linkedin, eras]);
}
