// Values the DOM choreography (GSAP) writes and the WebGL stage reads every frame.
// Living outside the Stage means a tween can start before WebGL has booted (or without it at all).
export const sceneState = {
  /** intro: backdrop light, 0 = true black */
  glow: 0,
  /** intro: dust-field reveal */
  particles: 0,
  /** the full-screen title sequence is covering the page: the stage skips rendering */
  introActive: false,
};
