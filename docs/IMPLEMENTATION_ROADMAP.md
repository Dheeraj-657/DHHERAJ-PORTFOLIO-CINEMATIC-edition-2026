# Implementation roadmap

| # | Milestone | Status |
|---|---|---|
| 1 | Repository analysis, technical design | Done (REVERSE_ENGINEERING.md, TECHNICAL_ARCHITECTURE.md) |
| 2 | Page structure, visual system | Done (DESIGN_SYSTEM.md) |
| 3 | Cinematic hero | Done |
| 4 | Engineering universe (logo keycap room) + timeline | Done |
| 5 | Interactive project gallery + detail dialog | Done |
| 6 | About + finale | Done |
| 7 | Responsive + performance | Done; tested 1920×1080, 1366×768, 390×844 |
| 8 | Testing, deployment prep | Done locally; not yet deployed |

## Next steps (need input from Dheeraj)

1. **Repository links**: add URLs for TrustGraph/Sentinel and the 3D Product Visualizer in `src/data/portfolio.ts`; push code to the empty repos (URL Shortener, Banking Backend, Memory Management System) and set their `repo` fields.
2. **Dates**: fill `date: null` milestones (enrolment year, certification dates).
3. **Domain**: set `VITE_SITE_URL` in `.env` to the real deployed URL (drives canonical, Open Graph and sitemap).
4. **Optional**: a matted photo of Dheeraj could stand at the centre of the universe ring, as the figure does in the reference.
5. **Optional**: live demo URLs per project (`demo` field).
