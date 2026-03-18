import { useEffect } from 'react';

/**
 * useSEO — sets document.title and Open Graph / Twitter meta tags at runtime.
 *
 * This is a belt-and-suspenders complement to the build-time Vite plugin in the
 * template repo. In the main portfolio it ensures the /resume route gets proper
 * meta even though we use client-side routing.
 *
 * @param {object} params
 * @param {string} params.name        - Full name (required)
 * @param {string} [params.title]     - Job title / headline
 * @param {string} [params.summary]   - Bio / summary (truncated to 160 chars)
 * @param {string[]} [params.skills]  - All skills (for keywords meta)
 * @param {string} [params.siteUrl]   - Canonical URL of the deployed resume
 * @param {string} [params.photoUrl]  - Profile photo URL (not base64)
 * @param {string} [params.location]  - Location string
 */
export function useSEO({ name, title = '', summary = '', skills = [], siteUrl = '', photoUrl = '', location = '' }) {
  useEffect(() => {
    if (!name) return;

    const pageTitle = title ? `${name} — ${title}` : name;
    const description = summary.replace(/\s+/g, ' ').slice(0, 160) + (summary.length > 160 ? '…' : '');
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
    const setLink = (rel, href) => {
      let el = document.querySelector(`link[rel="${rel}"]`);
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
      }
      el.setAttribute('href', href);
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
    if (photoUrl && !photoUrl.startsWith('data:')) {
      setMeta('property', 'og:image', photoUrl);
    }

    // Twitter / X Card
    setMeta('name', 'twitter:card', 'summary');
    setMeta('name', 'twitter:title', pageTitle);
    setMeta('name', 'twitter:description', description);

    // JSON-LD Person schema
    setJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name,
      jobTitle: title,
      description: summary.slice(0, 500),
      ...(siteUrl ? { url: siteUrl } : {}),
      ...(location ? { address: { '@type': 'PostalAddress', addressLocality: location } } : {}),
    });

    // Restore title on unmount (back to portfolio home)
    return () => {
      document.title = 'Jesse Charbneau — Portfolio';
    };
  }, [name, title, summary, skills, siteUrl, photoUrl, location]);
}
