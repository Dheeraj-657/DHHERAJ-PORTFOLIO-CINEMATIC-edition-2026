# Technical architecture

## Stack

React 19 + TypeScript + Vite 8 · motion (for the Originkit keycap) · three.js (imperative, no R3F: one long-lived renderer is simpler without a reconciler) · GSAP + ScrollTrigger · lucide-react · simple-icons. No backend.

## Layout

```
src/
  main.tsx                 boot, GSAP registration, font-ready ScrollTrigger refresh
  App.tsx                  page shell, project-dialog state, Stage context
  data/portfolio.ts        ALL content (profile, projects, domains, techs, milestones)
  gl/Stage.ts              the single WebGL renderer, camera, backdrop, dust, adaptive quality
  gl/UniverseRoom.ts       scene 02 room: keycaps, ring, debris, embers, ribbon, floor
  shaders/index.ts         backdrop + dust GLSL
  animations/sceneState.ts values GSAP writes and the Stage reads (intro glow/particles)
  animations/universeTimeline.ts  pure beat sampler for the room's opening
  hooks/useStage.ts        lazy-creates/disposes the Stage; WebGL failure → fallback
  hooks/usePointerVars.ts  damped pointer → CSS vars (--px/--py) for DOM parallax
  scenes/{hero,technology,timeline,projects,about,finale}/  one component + css each
  components/              Nav, brand icons, Keycap (site preset for the Originkit keycap)
  components/originkit/    keycap-button.tsx: Originkit "Keycap Button" (IsometricButton by Ernest Liu / DesignPass.dev, MIT), kept verbatim
  utils/                   math (tested), env detection
  intro/IntroOverlay.tsx   title sequence overlay: once per session, Skip / Esc, Replay, crossfade into the hero
  intro/thunder/           THUNDERFORGE engine (own WebGL context, lazy-loaded, disposed after):
                           ThunderIntro.ts (timeline `T`, scene, post), lightning.ts (tested bolt geometry), shaders.ts
  assets/name-typeface.json  DHEERAJ glyphs from Big Shoulders Display 900 (regenerate: node scripts/build-typeface.mjs)
```

## Data flow

```
data/portfolio.ts ──► React scenes (DOM: all text, buttons, dialog)
                        │  stage.setHovered / setFocus / bindSections
                        ▼
                   gl/Stage (one rAF via gsap.ticker)
                        │  reads sceneState, section rects, pointer
                        ▼
                   UniverseRoom.update → cardScreens[] ──► onFrame listeners position DOM buttons
```

## Key decisions

- **One context, one loop.** The Stage owns the only `WebGLRenderer`; it runs on `gsap.ticker`, so GSAP tweens and rendering share a single `requestAnimationFrame`. Scenes never create contexts.
- **Room in camera space.** The keycap room is a child of the camera, offset by its section's on-screen position, so it scrolls with the page while the camera independently dollies through the dust.
- **Lazy three.js.** `Stage` (and with it three.js, ~134 kB gz) is a dynamic import after first paint; DOM content never waits.
- **Idempotent builders.** `buildUniverse` ignores repeat calls (React StrictMode double effects).
- **Content is never canvas-only.** Keycap faces are drawn into textures, but each keycap's name and level are on a DOM button; the no-WebGL fallback renders the same keycaps as DOM.
- **Pinned sections re-measured.** `ScrollTrigger.refresh()` after web fonts load, and when the fallback layout kicks in.

## Fallbacks

| Condition | Behaviour |
|---|---|
| No WebGL / init throws / context lost | `html.no-webgl`: CSS-painted atmosphere, keycap grid in DOM, everything else unchanged |
| `prefers-reduced-motion` | no intro hold, no pin, static parallax, room shown settled, render-on-change loop |
| No JavaScript | `<noscript>` block with name, summary, certifications and contact links |

## Title sequence (THUNDERFORGE)

A ~10 s real-time intro, no audio. Storm: three domain-warped fbm cloud layers lit from within by up to five moving lights (bolt heads, impact, distant flashes, forge). Lightning: midpoint-displaced channels with forks, re-struck every 45–135 ms with an irregular strobe, drawn as camera-facing ribbons (white core, coloured halo) and bloomed. Impact at 4.5 s: brief flash (< 60 %, ~0.25 s), shockwave refraction ring, camera shake, smoke, ~4k GPU sparks (fewer on mobile), most of which spiral onto points sampled from the letters' front faces. Title: per-letter ExtrudeGeometry chrome (PBR + RoomEnvironment reflections) revealed along a noise field with a glowing seam, molten heat cooling to chrome, a light sweep, crawling arcs and a final pulse. The DOM carries the credit and tagline as real text.

While it plays the main Stage skips rendering (`sceneState.introActive`), and the hero's own reveal waits on `introGate`. Skipped automatically under reduced motion or without WebGL. Review a beat with `?introAt=<s>` (add `&introHold=1` to freeze).
