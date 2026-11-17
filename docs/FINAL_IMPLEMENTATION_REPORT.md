# Final implementation report

## Implemented

| Scene | What it does |
|---|---|
| 00 Title sequence | THUNDERFORGE: two lightning storms strike in from opposite sides of a lit cloud sky, collide at the centre (flash, shockwave, shake, sparks, smoke) and forge DHEERAJ as extruded dark-chrome type: molten → chrome, light sweep, crawling arcs, tagline. Real-time WebGL, no audio, ~10 s, once per session, Skip/Esc and Replay. |
| 01 Introduction | True black → ember light → dust field arrives near-to-far → DHEERAJ rises letter by letter with an anamorphic flare → roles → "I build *intelligent* systems." → nav. Any input fast-forwards the intro. Pointer parallax; scroll-out recedes the title. |
| 02 Engineering Universe | A 3D room of 14 logo keycaps around a neon-blue ring, with debris cubes, embers, a light-painting ribbon (its head lights passing keycaps) and a wet floor. Opening choreography: wake → embers gather on the ring → **all keycaps materialise at once** → group rises, one damped overshoot, held beat, float. Click a keycap for level, domain and projects that use it; the domain index highlights every keycap in a domain. |
| 03 Journey | Light travels a rail of 8 milestones. Pointer, scroll (desktop pin), arrow keys / Home / End and tap all drive one continuous position. Vertical rail on phones. Unknown dates shown as "TBA". |
| 04 Projects | 8 projects as screens in CSS 3D depth; plane leans with pointer; hovered card comes forward, others fall back. Original generated cover art per project. Detail `<dialog>` grows out of the clicked card (FLIP). |
| 05 About | Editorial summary, count-up stats, education, experience, certification wall with pointer spotlight, hands-on vs familiar toolkit, interests, working principles. |
| 06 Finale | Statement assembles word by word on scroll while the stage glows brighter blue; email (copyable), mailto CTA, resume download, LinkedIn, GitHub, ByteXL, footer. |

SEO: title/description, canonical, Open Graph + Twitter card (`public/og.png`), JSON-LD Person, favicon, robots.txt, generated sitemap.xml, `<noscript>` content.

## Content sources and honesty notes

- Content comes from the resume (`public/Dheeraj_Ratakonda_Resume.pdf`) and from inspecting each GitHub repo on 2026-11-16.
- **Not shown on purpose:** `pro-azure-sql-based-to-do`. Its README credits another author and its commits are by other accounts. Re-add it in `data/portfolio.ts` only if the work is Dheeraj's.
- **Empty repos:** URL-SHORTENER, banking_backend and MEMORY-MANAGEMENT-SYSTEM have no code yet. Their cards say "Source not yet published" and have no GitHub button; the URLs are in comments, ready to enable.
- **Secure Key Code:** described from the code (an SSH-key + TOTP admin UI running on sample data), with a visible note. The resume's wording ("TypeScript utility for generating keys") doesn't match the repo.
- **No repo URL supplied:** TrustGraph/Sentinel and the 3D Product Visualizer.
- "Philosophy" and "availability" lines are drafts in Dheeraj's voice; edit them in the data file.

## Libraries

react, react-dom, three, gsap (+ScrollTrigger), lucide-react, simple-icons (CC0 logo paths). motion (animation engine for the Originkit Keycap Button, `src/components/originkit/keycap-button.tsx`, MIT, credit: Ernest Liu / DesignPass.dev). Every action button uses it through `src/components/Keycap.tsx`. `noUnusedLocals` is off in tsconfig only because that vendored file is kept verbatim. Dev: vite, @vitejs/plugin-react, typescript, @types/*.

## Performance decisions

- One WebGL context and one animation loop (`gsap.ticker`) for the whole page.
- three.js lazy-loaded after first paint (separate 134 kB gz chunk).
- Device tier sets particle count (900 / 1800 / 4200), embers, debris, texture size, antialiasing, pixel-ratio cap (1 / 1.5 / 2).
- Adaptive resolution: pixel ratio steps down when the 90-frame average exceeds 22 ms and back up below 12 ms (unit-tested).
- Room not drawn while its section is off-screen; DOM button tracking skipped off-screen.
- All GPU resources disposed on unmount; context loss switches to the fallback.
- Reduced motion: render-on-change only.

## Testing

| Check | Result |
|---|---|
| `npm test` (node:test) | 5/5 pass: rail mapping, adaptive pixel ratio, visibility maths, damping, universe beats |
| `npm run build` (tsc + vite) | passes |
| Browser (Playwright, Chromium) | 1920×1080, 1366×768, 1200×630, 390×844: no console errors or warnings; no horizontal overflow |
| Interactions verified | intro, keycap hover/select, domain select, panel → project dialog, card hover depth, dialog open/Esc/focus return, journey pin + scrub + tap, mobile menu, copy email |
| Reduced motion | room renders settled, no pin, no intro hold |
| No WebGL (getContext stubbed) | DOM keycap grid with logos, no errors |

Not tested: real Android/iOS hardware, Safari/Firefox, 768×1024 and 360×800 (layouts use the same breakpoints as 390×844 and 860 px).

## Deploy (Vercel)

1. Push the folder to a GitHub repo; import it in Vercel (framework preset: Vite, build `npm run build`, output `dist`).
2. After the first deploy, set `VITE_SITE_URL` in `.env` (or a Vercel env var) to the real URL and redeploy. Canonical, OG URLs and sitemap.xml follow it.

## Remaining limitations

- Logos for Azure and OpenAI are typographic (their marks are not in Simple Icons).
- No figure at the ring's centre (no image of Dheeraj supplied).
- Undated milestones show "TBA" until dates are added.
- Content renders client-side; Google indexes it, but simpler crawlers only see the `<noscript>` summary and meta tags.
