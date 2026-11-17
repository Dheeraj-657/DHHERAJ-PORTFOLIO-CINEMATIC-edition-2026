// Procedural lightning geometry: pure functions, no three.js, unit-tested.
//
// A bolt is built by midpoint displacement: start with a straight segment, then repeatedly
// split every segment and push the midpoint sideways by a random amount proportional to the
// segment's length. Halving the length each level gives the self-similar, jagged look of a
// real discharge. Branches fork off the main channel at shallow angles, with sub-branches.

export type V3 = [number, number, number];

/** small deterministic PRNG (mulberry32) so a strike can be regenerated or tested */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Jagged path from `a` to `b` as flat xyz: 2^depth + 1 points, endpoints preserved exactly.
 * `rough` scales the sideways kick (0.2–0.35 reads as lightning; higher becomes scribble).
 */
export function boltPoints(a: V3, b: V3, depth: number, rough: number, rand: () => number): number[] {
  let pts: V3[] = [a, b];
  for (let level = 0; level < depth; level++) {
    const next: V3[] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1];
      const dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2];
      const len = Math.hypot(dx, dy, dz) || 1e-6;
      // perpendicular in the screen plane (the visible wiggle) plus a smaller depth wobble
      const px = -dy / len, py = dx / len;
      const kick = (rand() - 0.5) * len * rough;
      const depthKick = (rand() - 0.5) * len * rough * 0.5;
      next.push([p[0] + dx / 2 + px * kick, p[1] + dy / 2 + py * kick, p[2] + dz / 2 + depthKick], q);
    }
    pts = next;
  }
  return pts.flat();
}

export interface Strike {
  main: number[];
  branches: { pts: number[]; weight: number }[];
}

/** a full discharge: the main channel plus forks (and occasional sub-forks) */
export function strike(
  a: V3, b: V3,
  opts: { depth: number; rough: number; branches: number; branchDepth: number },
  rand: () => number,
): Strike {
  const main = boltPoints(a, b, opts.depth, opts.rough, rand);
  const branches: Strike['branches'] = [];
  const fork = (pts: number[], count: number, depth: number, weight: number, out: Strike['branches']) => {
    const m = pts.length / 3;
    for (let k = 0; k < count; k++) {
      // fork from the first 85% of the parent, never from its very tip
      const i = 1 + Math.floor(rand() * Math.max(1, Math.floor(m * 0.85) - 1));
      const j = Math.min(m - 1, i + 1);
      const o: V3 = [pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2]];
      let dx = pts[j * 3] - o[0], dy = pts[j * 3 + 1] - o[1];
      const dl = Math.hypot(dx, dy) || 1;
      dx /= dl; dy /= dl;
      const ang = (rand() < 0.5 ? -1 : 1) * (0.35 + rand() * 0.6); // 20°–55° off the parent
      const c = Math.cos(ang), s = Math.sin(ang);
      const rx = dx * c - dy * s, ry = dx * s + dy * c;
      // branch length is a fraction of what remains of the parent
      const rest = Math.hypot(pts[(m - 1) * 3] - o[0], pts[(m - 1) * 3 + 1] - o[1]);
      const len = rest * (0.18 + rand() * 0.32) + 0.4;
      const e: V3 = [o[0] + rx * len, o[1] + ry * len, o[2] + (rand() - 0.5) * len * 0.4];
      const bp = boltPoints(o, e, depth, 0.32, rand);
      out.push({ pts: bp, weight });
      if (depth > 2 && rand() < 0.45) fork(bp, 1, depth - 1, weight * 0.55, out);
    }
  };
  fork(main, opts.branches, opts.branchDepth, 0.55, branches);
  return { main, branches };
}
