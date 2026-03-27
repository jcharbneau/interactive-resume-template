// ─── Demo Resume Data ─────────────────────────────────────────────────────────
// Used as the fallback when /resume is opened without a ?preview=builder param.
// Contains a fictional person so no one's real data is exposed by default.
// Replace this entire file in the template repo with your own data.

export const DEMO_META = {
  name: 'Alex Rivera',
  title: 'Engineering Leader · AI & Platform Infrastructure',
  location: 'San Francisco, CA',
  email: 'alex@example.com',
  linkedin: 'https://linkedin.com/in/example',
  github: 'https://github.com/example',
  siteUrl: 'https://example.com',
  photoUrl: '',
  summary:
    'Platform engineer turned engineering leader with 15+ years building data infrastructure, AI tooling, and developer platforms at high-growth tech companies. Focused on systems that scale quietly and teams that ship with confidence.',
};

export const DEMO_ERAS = [
  // ── Present ──────────────────────────────────────────────────────────────
  {
    id: 'nova',
    yearLabel: 'Now',
    company: 'Nova AI',
    companyFull: 'Nova AI · Applied Intelligence',
    companyUrl: 'https://example.com',
    role: 'Director of Platform Engineering',
    roleHistory: null,
    period: 'Jan 2023 – Present',
    tenure: '~2 years',
    tagline:
      'Building the internal AI platform that powers five product teams — from model serving to evaluation pipelines.',
    accomplishments: [
      'Designed and shipped a multi-tenant inference gateway handling 40M+ requests/day across GPT-4, Claude, and open-source models.',
      'Reduced LLM serving costs 62% by implementing adaptive batching and model-routing heuristics.',
      'Grew platform team from 4 to 11 engineers while maintaining a <2-week PR review SLA.',
      'Established eval-driven development practices adopted by all AI product teams.',
      'Led the migration from a monolithic API to a service mesh with zero customer-facing downtime.',
    ],
    skills: ['Python', 'Kubernetes', 'LLM APIs', 'FastAPI', 'Ray Serve', 'Observability', 'AWS'],
    relatedWorks: null,
    companyContext: {
      what: 'Nova AI builds applied intelligence products for enterprise knowledge management — from document Q&A to workflow automation.',
      size: '120 employees',
      founded: '2021',
      hq: 'San Francisco, CA',
      notable: 'Series B · $45M raised · Featured in Forbes AI 50',
    },
    scene: {
      pattern: 'neural',
      primaryHex: '#3b82f6',
      secondaryHex: '#2563eb',
      bgHex: '#020c14',
      logoUrl: null,
      logoDarkBg: true,
      presetId: 'nebula',
    },
  },

  // ── Mid-career ────────────────────────────────────────────────────────────
  {
    id: 'streamline',
    yearLabel: '2020',
    company: 'Streamline',
    companyFull: 'Streamline Data · Real-Time Analytics',
    companyUrl: 'https://example.com',
    role: 'Staff Engineer · Data Platform',
    roleHistory: ['Staff Engineer', 'Senior Engineer II'],
    period: 'Mar 2020 – Dec 2022',
    tenure: '2 yrs 9 mos',
    tagline:
      'Owned the data ingestion and streaming infrastructure that powered dashboards used by 3,000+ B2B customers.',
    accomplishments: [
      'Rebuilt the event ingestion pipeline on Apache Kafka + Flink, reducing end-to-end latency from 8s to 180ms.',
      'Architected a self-serve data catalog that cut analyst onboarding time from 3 weeks to 2 days.',
      'Mentored 6 engineers, two of whom were promoted to senior within 18 months.',
      'Drove adoption of dbt for transformation layer — from 0 to 200+ models in production.',
    ],
    skills: ['Kafka', 'Apache Flink', 'dbt', 'Snowflake', 'Airflow', 'Terraform', 'Go'],
    relatedWorks: null,
    companyContext: {
      what: 'Streamline Data provided real-time analytics infrastructure as a service, competing with Segment and Rudderstack.',
      size: '280 employees',
      founded: '2017',
      hq: 'New York, NY',
      notable: 'Acquired by DataBricks in 2023',
    },
    scene: {
      pattern: 'wave',
      primaryHex: '#6ee7b7',
      secondaryHex: '#34d399',
      bgHex: '#021008',
      logoUrl: null,
      logoDarkBg: true,
      presetId: 'constellation',
    },
  },

  // ── Early career ──────────────────────────────────────────────────────────
  {
    id: 'foundry',
    yearLabel: '2017',
    company: 'Foundry Labs',
    companyFull: 'Foundry Labs · Developer Tools',
    companyUrl: 'https://example.com',
    role: 'Senior Software Engineer',
    roleHistory: null,
    period: 'Jun 2017 – Feb 2020',
    tenure: '2 yrs 8 mos',
    tagline:
      'Full-stack platform work on a developer productivity suite used by 50,000+ engineers at mid-market SaaS companies.',
    accomplishments: [
      'Designed the plugin API that enabled a third-party ecosystem growing to 120+ integrations.',
      'Rewrote the billing engine to support usage-based pricing — enabling a 40% ACV expansion in year one.',
      'Built the internal feature-flag system that became the foundation for all A/B experiments.',
    ],
    skills: ['React', 'Node.js', 'PostgreSQL', 'Redis', 'AWS Lambda', 'GraphQL'],
    relatedWorks: null,
    companyContext: {
      what: 'Foundry Labs built developer productivity tooling: code review workflows, incident management, and deployment pipelines.',
      size: '95 employees',
      founded: '2014',
      hq: 'Austin, TX',
      notable: 'Y Combinator W15 · $18M Series A',
    },
    scene: {
      pattern: 'scatter',
      primaryHex: '#fbbf24',
      secondaryHex: '#f59e0b',
      bgHex: '#100800',
      logoUrl: null,
      logoDarkBg: true,
      presetId: 'crystalline',
    },
  },
];
