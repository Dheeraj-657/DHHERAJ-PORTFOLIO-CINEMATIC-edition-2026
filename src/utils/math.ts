// Pure helpers shared by the WebGL stage and the DOM scenes (no imports: unit-tested with node --test).

export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** frame-rate independent exponential smoothing; `rate` ≈ how many times per second it closes ~63% of the gap */
export const damp = (current: number, target: number, rate: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-rate * dt));

/** 0 when `start` reaches the viewport bottom, 1 when `end` leaves the top, for a rect relative to the viewport */
export const sectionProgress = (top: number, height: number, viewport: number) =>
  clamp((viewport - top) / (height + viewport));

/** how much of a section is on screen, 0..1 */
export const visibleFraction = (top: number, height: number, viewport: number) =>
  height <= 0 ? 0 : clamp((Math.min(top + height, viewport) - Math.max(top, 0)) / Math.min(height, viewport));

/**
 * Maps a pointer coordinate along a rail of `count` evenly spaced stops to a continuous
 * position 0..count-1. Stops sit at the centre of equal cells, so the first and last
 * stop are reachable without pinning the pointer to the edge.
 */
export const railPosition = (pointer: number, start: number, length: number, count: number) => {
  if (count <= 1 || length <= 0) return 0;
  const cell = length / count;
  return clamp((pointer - start - cell / 2) / cell, 0, count - 1);
};

/**
 * Adaptive resolution: given the average frame time, return the next pixel ratio.
 * Steps down fast when frames are slow, steps back up slowly when there is headroom.
 */
export const nextPixelRatio = (current: number, avgFrameMs: number, max: number, min = 0.75) => {
  if (avgFrameMs > 22) return Math.max(min, +(current - 0.25).toFixed(2));
  if (avgFrameMs < 12 && current < max) return Math.min(max, +(current + 0.25).toFixed(2));
  return current;
};
