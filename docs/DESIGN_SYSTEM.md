# Design system

Tokens live in `src/styles/global.css` (`:root`). Scene styles sit next to their component.

## Colour

| Token | Value | Use |
|---|---|---|
| `--black` | `#050505` | page + WebGL clear colour |
| `--ink` / `--charcoal` | `#0b0b0c` / `#141416` | panels, cards |
| `--line` / `--line-strong` | off-white @ 10 % / 22 % | hairlines, tag borders |
| `--off` | `#ecebe6` | primary text (warm off-white, never pure white) |
| `--silver` / `--muted` | `#a3a5ac` / `#74767d` | body copy / labels |
| `--accent-deep` / `--accent` / `--accent-hi` / `--accent-white` | `#1257ff` / `#1f8bff` / `#7cc6ff` / `#eef7ff` | neon-blue accent family: rules, active states, one word per headline |
| `--accent-grad` | deep blue → blue → white | accent lines: eyebrows, nav underline, panel/dialog top edges, email underline, timeline rail |

Rule: the accent marks *state or emphasis*, never decoration. One accent word per headline at most. Gradients run on lines and light, never on text.

**WebGL in the same palette:** the backdrop ember, dust sparks, the universe room's rim lights, ring, embers, floor and ribbon are all blue → white. While Journey is on screen the backdrop shifts to a brighter cyan-white (`uCool`); Journey's own tokens (`--j-*` in `journey.css`) follow the same family.

## Type

| Role | Face | Notes |
|---|---|---|
| Display | Big Shoulders Display 700–900 | uppercase, tight leading (0.86–0.95) |
| Editorial accent | Instrument Serif italic | the one emphasised word in a headline; long-form ledes |
| Body | IBM Plex Sans 400–600 | 15–18 px, 1.55–1.6 line-height |
| Labels / data | IBM Plex Mono 400–500 | 10.5–13 px, uppercase, 0.12–0.3 em tracking |

## Spatial rules

- **Auto-fit to the device:** display sizes use `clamp(min, min(Nvw, Mvh), max)`, so a headline sizes from whichever screen dimension is tighter (short laptops at 125 % scaling, landscape phones). The 3D keycap room measures every keycap at its own depth and shrinks the formation until all of them fit the frame (`UniverseRoom.fitToFrame`). Everything re-fits on resize and rotation.

- Gutter `clamp(16px, 4vw, 56px)`, max content width 1400 px.
- Sections open with an eyebrow (`02 · Technology`, blue→white hairline) then a display headline.
- Square-ish corners (2 px) on DOM UI; rounded corners only on 3D keycaps.

## Motion

- Easing: `expo.out` for arrivals, `power2.inOut` for light, `none` when scrubbed.
- Reveals are masks (text rises out of a clipped line), not fades.
- Scene openings are time-based beats (see `animations/universeTimeline.ts`); scroll only scrubs where the reader controls pace (Journey rail, finale statement).
- `prefers-reduced-motion`: no intro hold, no pin, no parallax; the 3D room renders already settled; CSS transitions collapse.

## Atmosphere

- Fixed WebGL backdrop: neon-blue ember pool, volumetric shafts, haze, vignette.
- SVG-turbulence film grain overlay at 7 %.
- Dust field the camera dollies through as you scroll.

## Accessibility contracts

- Every 3D interactive has a DOM `<button>` over it with an accessible name.
- Focus is always visible (light-blue outline); dialogs trap focus natively (`<dialog>`), Esc closes, focus returns to the opener.
- Hit targets ≥ 44 px on touch.
