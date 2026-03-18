# Interactive Resume Template

A particle-driven, animated interactive resume powered by React + Three.js.

**Built with:** React Three Fiber, Drei, Framer Motion, Tailwind CSS, Vite

---

## Quick Start

### 1 · Generate your config

Go to [jesse.charbneau.com/builder](https://jesse.charbneau.com/builder) and use the guided wizard to build your `resume-config.json`.

Or import your LinkedIn data export directly in the wizard for an instant head-start.

### 2 · Fork this repo

Click **Fork** at the top of this page.

### 3 · Replace the config

Replace `src/constants/resume-config.json` with the file you downloaded from the builder.

### 4 · Deploy to Vercel (free)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jcharbneau/interactive-resume-template&project-name=my-interactive-resume&repo-name=my-interactive-resume)

Click the button above — Vercel will import your fork and deploy it automatically. No configuration needed.

---

## Local Development

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # production bundle → dist/
```

---

## Config Shape

The `resume-config.json` follows this structure (the builder handles all of this for you):

```json
{
  "meta": {
    "name": "Your Name",
    "title": "Your Title",
    "location": "City, State",
    "email": "you@email.com",
    "linkedin": "https://linkedin.com/in/yourhandle",
    "github": "https://github.com/yourhandle",
    "summary": "A paragraph about you.",
    "photoUrl": "https://... or base64"
  },
  "theme": {
    "resumeThemeId": "midnight"
  },
  "eras": [
    {
      "id": "era-1",
      "yearLabel": "2022",
      "company": "Company Name",
      "companyFull": "Full Legal Name Inc.",
      "companyUrl": "https://company.com",
      "role": "Your Role",
      "period": "Jan 2022 – Present",
      "tenure": "3 yrs",
      "tagline": "One-sentence summary of this role.",
      "accomplishments": ["Bullet one", "Bullet two"],
      "skills": ["React", "TypeScript", "AWS"],
      "scene": {
        "pattern": "neural",
        "primaryHex": "#4fc3f7",
        "secondaryHex": "#26c6da",
        "bgHex": "#020808",
        "logoUrl": null,
        "logoDarkBg": true
      }
    }
  ]
}
```

### Available themes
- `"midnight"` — dark teal (default)
- `"slate"` — dark green/grey
- `"ember"` — dark amber

### Available particle patterns
`neural` · `spiral` · `quantum` · `streams` · `constellation` · `grid`

---

## Adding Company Logos

Drop PNG files into `/public/logos/` named after the era `id`:

```
public/logos/era-1.png
public/logos/era-2.png
```

They'll be picked up automatically (64×64px, transparent background recommended).

---

## Credits

Original design by [Jesse Charbneau](https://jesse.charbneau.com).
Template licensed MIT — use it, fork it, make it yours.
