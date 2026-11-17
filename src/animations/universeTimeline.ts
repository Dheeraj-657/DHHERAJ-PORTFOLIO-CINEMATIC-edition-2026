// The Engineering Universe's opening, as a pure function of time since the section
// first came into view. Every keycap reads the SAME `mat` value: the tools appear as
// one event, not as a queue of fades. Per-card variety lives only in how each one
// travels once it already exists.
//
//   0.0  near-dark, a breath of blue
//   0.35 energy gathers: embers converge on the ring, the ring wakes
//   0.8  every keycap materialises at once, low and dim
//   1.0  the whole group rises into place
//   2.0  one damped overshoot: the room has weight
//   2.45 a short held beat
//   2.6  floating begins; ribbon fully alive
//   3.0  interactive

export const BEATS = {
  wake: 0.1, gather: 0.35, materialise: 0.8, matDur: 0.45, rise: 1.0, riseDur: 1.1,
  settle: 2.0, settleDur: 0.45, float: 2.6, alive: 3.0,
};

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const span = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const smooth = (x: number) => x * x * (3 - 2 * x);
const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;
const easeOutExpo = (x: number) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x));

export function sampleUniverse(t: number) {
  const B = BEATS;
  const mp = span(t, B.materialise, B.materialise + B.matDur);
  const sp = span(t, B.settle, B.settle + B.settleDur);
  const gather = smooth(span(t, B.gather, B.gather + 0.6));
  return {
    wake: smooth(span(t, B.wake, B.wake + 0.9)),
    /** embers rush inward while energy gathers, then drift free once the cards exist */
    converge: clamp(gather - smooth(span(t, B.materialise, B.rise + 0.2))),
    mat: easeOutCubic(mp),
    /** a single flash at the instant the cards appear */
    burst: mp > 0 && mp < 1 ? Math.sin(mp * Math.PI) ** 2 : 0,
    rise: easeOutExpo(span(t, B.rise, B.rise + B.riseDur)),
    settle: sp > 0 && sp < 1 ? Math.sin(sp * Math.PI) * (1 - sp) : 0,
    float: smooth(span(t, B.float, B.float + 0.8)),
    ring: 0.12 + 0.88 * smooth(span(t, B.wake, B.alive)),
    ribbon: smooth(span(t, B.gather + 0.3, B.alive)),
    interactive: t >= B.alive,
  };
}
