/**
 * slugify — convert a display name to a URL-safe slug.
 *
 * "Glassdoor, Inc."  → "glassdoor-inc"
 * "Amazon Web Services" → "amazon-web-services"
 * "Apache Software Foundation" → "apache-software-foundation"
 *
 * Used for auto-generating company/org profile slugs from era data.
 * Must produce the same result consistently (publish → discover → company page).
 */
export function slugify(str) {
  return (str ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * companySuffix — strip common legal suffixes that create false duplicates.
 *
 * "Amazon.com, Inc." → "amazon"
 * "Glassdoor Inc"   → "glassdoor"
 * "Google LLC"       → "google"
 *
 * Use this when canonicalizing company names for deduplication,
 * NOT when displaying the name to users.
 */
const COMPANY_SUFFIXES =
  /\s+(inc\.?|llc\.?|ltd\.?|corp\.?|co\.?|gmbh|s\.a\.?|plc\.?|pte\.?|pvt\.?|,?\s*incorporated|,?\s*limited)$/i;

export function canonicalCompanySlug(name) {
  const stripped = (name ?? '').trim().replace(COMPANY_SUFFIXES, '').replace(/[.,]$/, '').trim();
  return slugify(stripped);
}

/**
 * extractDomainSlug — derive a slug from a company URL domain.
 *
 * "https://www.globalization-partners.com" → "globalization-partners"
 * "https://rigetti.com/about"              → "rigetti"
 *
 * Returns null if no usable domain found.
 * When available, this is preferred over canonicalCompanySlug because
 * domains are unambiguous — "G-P" could be anything, but the URL is definitive.
 */
export function extractDomainSlug(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    const parts = hostname.replace(/^www\./, '').split('.');
    if (parts.length < 2) return null;
    const domain = parts.slice(0, -1).join('-');
    const slug = slugify(domain);
    return slug && slug.length >= 2 ? slug : null;
  } catch {
    return null;
  }
}

/**
 * companySlug — resolve the best slug for a company era.
 *
 * Prefers domain-based slug (from companyUrl) when available,
 * falls back to name-based slug. This matches the publish.js logic
 * so profile links always point to the right company node.
 */
export function companySlug(era) {
  return extractDomainSlug(era?.companyUrl) || canonicalCompanySlug(era?.company);
}
