/**
 * Shared logo constants — company-name-to-slug mapping, Supabase bucket URL,
 * and Logo.dev API token. Centralised here so every consumer shares a single
 * copy instead of duplicating the map in each chunk.
 */

/** Logo.dev publishable key (safe for client-side embedding) */
export const LOGO_DEV_TOKEN = 'pk_E5NjmK_YRRuKuu4biNn02w';

/** Base URL for the shared-logos Supabase Storage bucket */
export const SUPABASE_LOGO_BASE =
  'https://ggcdkmpdjxrxmtixfojs.supabase.co/storage/v1/object/public/shared-logos/companies/';

/**
 * Maps lower-cased company names (and common aliases) to a slug used for both
 * Supabase shared-logo URLs and local /logos/ fallbacks.
 */
export const SHARED_LOGO_MAP = {
  // Big tech
  google: 'google',
  alphabet: 'google',
  'alphabet inc': 'google',
  amazon: 'amazon',
  'amazon web services': 'amazon',
  aws: 'amazon',
  microsoft: 'microsoft',
  apple: 'apple',
  'apple inc': 'apple',
  netflix: 'netflix',
  github: 'github',
  gitlab: 'gitlab',
  slack: 'slack',
  stripe: 'stripe',
  spotify: 'spotify',
  adobe: 'adobe',
  'adobe systems': 'adobe',
  airbnb: 'airbnb',
  oracle: 'oracle',
  ibm: 'ibm',
  intel: 'intel',
  'intel corporation': 'intel',
  nvidia: 'nvidia',
  amd: 'amd',
  'advanced micro devices': 'amd',
  cisco: 'cisco',
  'cisco systems': 'cisco',
  salesforce: 'salesforce',
  linkedin: 'linkedin',
  twitter: 'twitter',
  // Cloud / DevOps
  docker: 'docker',
  kubernetes: 'kubernetes',
  cloudflare: 'cloudflare',
  digitalocean: 'digitalocean',
  'digital ocean': 'digitalocean',
  vercel: 'vercel',
  netlify: 'netlify',
  heroku: 'heroku',
  supabase: 'supabase',
  mongodb: 'mongodb',
  'mongo db': 'mongodb',
  postgresql: 'postgresql',
  postgres: 'postgresql',
  redis: 'redis',
  jenkins: 'jenkins',
  bitbucket: 'bitbucket',
  newrelic: 'newrelic',
  'new relic': 'newrelic',
  pagerduty: 'pagerduty',
  // Other tools
  figma: 'figma',
  hubspot: 'hubspot',
  mailchimp: 'mailchimp',
  zendesk: 'zendesk',
  intercom: 'intercom',
  twilio: 'twilio',
  sendgrid: 'sendgrid',
  // Retail / Consumer
  walmart: 'walmart',
  target: 'target',
  costco: 'costco',
  starbucks: 'starbucks',
  'coca-cola': 'cocacola',
  'coca cola': 'cocacola',
  cocacola: 'cocacola',
  pepsi: 'pepsi',
  pepsico: 'pepsi',
  adidas: 'adidas',
  // Auto / Industrial
  tesla: 'tesla',
  'tesla motors': 'tesla',
  ford: 'ford',
  'ford motor': 'ford',
  toyota: 'toyota',
  'toyota motor': 'toyota',
  // Logistics
  fedex: 'fedex',
  'federal express': 'fedex',
  ups: 'ups',
  'united parcel service': 'ups',
  // Space
  nasa: 'nasa',
  // Custom logos
  rigetti: 'rigetti',
  'rigetti computing': 'rigetti',
  glassdoor: 'glassdoor',
  cengage: 'cengage',
  'cengage learning': 'cengage',
  profilegraph: 'profilegraph',
  'cornerstone brands': 'cornerstone-brands',
  cornerstonebrands: 'cornerstone-brands',
  'g-p': 'gp',
  'globalization partners': 'gp',
};

/** Deduplicated, sorted list of available logo slugs (for browsing UI) */
export const AVAILABLE_LOGOS = [...new Set(Object.values(SHARED_LOGO_MAP))].sort();

/**
 * Look up the shared-logo Supabase URL for a company name.
 * Returns null if no match.
 */
export function getSharedLogoUrl(companyName) {
  if (!companyName) return null;
  const slug = SHARED_LOGO_MAP[companyName.toLowerCase().trim()];
  return slug ? `${SUPABASE_LOGO_BASE}${slug}.svg` : null;
}

/**
 * Build a Logo.dev URL for the given domain with the shared token.
 */
export function logoDevUrl(domain, size = 256) {
  if (!domain) return null;
  return `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=${size}&format=png`;
}
