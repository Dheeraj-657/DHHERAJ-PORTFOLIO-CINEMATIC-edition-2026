# Reverse engineering: the reference portfolio

Reference: `github.com/gireeshkumarreddy/cinematic-portofilo` (inspected 2026-11-16, read-only; nothing from it is copied into this project: no code, images, video, fonts or identity).

## What it is

A framework-free, build-free WebGL site (`index.html` + ES modules, ~6.9k lines). One `<canvas>` per scene, sticky inside tall sections, hand-written GLSL (`src/gl/shaders*.js`), a tiny matrix lib, and Python tooling that pre-processes footage (matting, tracking) into media the shaders composite.

## Techniques worth learning from

| Technique | How the reference does it | What this project does with the idea |
|---|---|---|
| **Choreography as a pure timeline** | `timeline2.js` exports beat times and `sample(t)` returning eased scalars (`wake`, `gather`, `mat`, `rise`, `settle`, `float`...). Rendering reads those numbers; nothing animates itself. | `src/animations/universeTimeline.ts`: same pattern, own beats, unit-tested. |
| **One materialisation event** | Every card reads the *same* `mat` value, with no per-card stagger, so the tools land as one event. Variety only in *how* each travels once it exists. | Identical principle in the keycap room (`UniverseRoom.update`). |
| **Rise → overshoot → hold → float** | Group rises with expo-out, one damped `sin·(1-t)` correction, a held still beat, then float fades in. | Same beat structure, own timings. |
| **Time-triggered, not scroll-scrubbed openings** | A scene starts once when it enters view; a fast flick can't skip it and a slow drag can't smear it. | `Stage.updateRoom` starts the room once at ≥45 % visibility. |
| **Light-painting ribbon** | A parametric head with incommensurate drifts; the strip is rebuilt every frame from its recent history and cools white → red with age; depth-gated against the cards. | Strip rebuilt from a 150-sample history; depth-tested so keycaps occlude it; the head carries a point light that rims passing keycaps and streaks the floor. |
| **DOM over WebGL for content** | Year cards in scene 3 are real `<button>`s positioned from the same geometry the canvas uses. | Generalised: every interactive 3D object has a DOM button tracking its projected rect each frame. |
| **Portrait is a different composition** | On phones the timeline stands up; it isn't a scaled desktop. | Universe → two staggered columns; Journey → vertical rail. |
| **Visibility-gated work** | Video decoding stops off-screen. | Room hidden (not drawn) when its section is off-screen; one shared rAF loop. |

## Scene-by-scene structure (reference)

1. Black → figure walks out of the dark (alpha-packed video) → wordmark resolves behind → chips/arrows snap in → header draws.
2. "Creative universe": tool logo cards on dark extruded blocks, ring, ribbon, embers, figure silhouette, wet floor.
3. Time machine: clock hand projects light onto a measured arc of year cards; cursor projected onto the polyline.
4. Project gallery rebuilt from a reference image as layered sprites.
6. Finale.

## Performance notes observed

- ~0.1–0.3 ms CPU per frame per scene; work is in shaders.
- Assets are heavy (multiple MP4/MOV files, PNG sprites) and the build pipeline depends on Python + ffmpeg.
- Several canvases (one per scene) means several GL contexts; this project uses **one** context for the whole page instead.

## Deliberate differences

- No figure/video: there is no footage of Dheeraj, and a stock silhouette would misrepresent him. The ring is the focal point; a cut-out photo can be added later (see FINAL_IMPLEMENTATION_REPORT).
- Typed React + Vite build instead of a no-build site (requested stack), with all content in one data file.
- Logos come from Simple Icons (CC0 paths). Marks that are not redistributable there (Azure, OpenAI) are typographic keycaps.
