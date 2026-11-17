# Dheeraj Ratakonda: cinematic portfolio

A single-page, six-scene WebGL portfolio built with React, TypeScript, Vite, three.js and GSAP.

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # unit tests (node:test)
npm run build     # typecheck + production build → dist/
npm run preview   # serve dist/
```

**Edit content in one place:** `src/data/portfolio.ts` holds the profile, projects, technologies, domains and timeline. A `null` link is hidden, and a `null` date shows "TBA".

Docs: [reverse engineering](docs/REVERSE_ENGINEERING.md) · [design system](docs/DESIGN_SYSTEM.md) · [architecture](docs/TECHNICAL_ARCHITECTURE.md) · [roadmap](docs/IMPLEMENTATION_ROADMAP.md) · [final report](docs/FINAL_IMPLEMENTATION_REPORT.md)

---

Designed and built by Dheeraj Ratakonda with [Claude Code](https://claude.com/claude-code) (Anthropic's Claude) as AI pair programmer.
