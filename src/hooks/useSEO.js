import { useEffect } from 'react';

/**
 * useSEO — sets document.title and Open Graph / Twitter meta tags at runtime.
 *
 * Belt-and-suspenders complement to the build-time Vite SEO plugin. Ensures
 * meta tags are correct even with client-side navigation.
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

    document.title = pageTitle;

    const setMeta = (attrName, attrValue, content) => {
      let el = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    const setLink = (rel, href) => {
      const selector = rel === 'me' ? `link[rel="me"][href="${href}"]` : `link[rel="${rel}"]`;
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
      }
      el.setAttribute('href', href);
    };

    const setJsonLd = (data) => {
      let el = document.querySelector('script[type="application/ld+json"]');
      if (!el) {
        el = document.createElement('script');
        el.setAttribute('type', 'application/ld+json');
        document.head.appendChild(el);
      }
      el.textContent = JSON.stringify(data);
    };

    setMeta('name', 'description', description);
    if (keywords) setMeta('name', 'keywords', keywords);
    setMeta('name', 'author', name);
    if (siteUrl) setLink('canonical', siteUrl);

    setMeta('property', 'og:type', 'profile');
    setMeta('property', 'og:title', pageTitle);
    setMeta('property', 'og:description', description);
    if (siteUrl) setMeta('property', 'og:url', siteUrl);
    if (photoUrl && !photoUrl.startsWith('data:')) {
      setMeta('property', 'og:image', photoUrl);
    }

    setMeta('name', 'twitter:card', 'summary');
    setMeta('name', 'twitter:title', pageTitle);
    setMeta('name', 'twitter:description', description);

    // IndieWeb / Mastodon / Bluesky identity verification
    if (github) setLink('me', github);
    if (linkedin) setLink('me', linkedin);

    // Graph fields
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
      document.title = 'Interactive Resume';
    };
  }, [name, title, summary, skills, siteUrl, photoUrl, location, github, linkedin, eras]);
}
