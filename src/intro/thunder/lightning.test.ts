import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boltPoints, strike, rng, type V3 } from './lightning.ts';

const A: V3 = [-10, 4, -2];
const B: V3 = [0, 0, 0];

test('boltPoints keeps both endpoints and has 2^depth + 1 finite points', () => {
  const pts = boltPoints(A, B, 6, 0.3, rng(7));
  assert.equal(pts.length / 3, 2 ** 6 + 1);
  assert.deepEqual(pts.slice(0, 3), A);
  assert.deepEqual(pts.slice(-3), B);
  assert.ok(pts.every(Number.isFinite));
});

test('the path is jagged but stays near the straight line', () => {
  const pts = boltPoints(A, B, 6, 0.3, rng(3));
  const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
  let maxDev = 0;
  for (let i = 0; i < pts.length; i += 3) {
    // distance from the A→B line in xy
    const t = ((pts[i] - A[0]) * (B[0] - A[0]) + (pts[i + 1] - A[1]) * (B[1] - A[1])) / (len * len);
    const lx = A[0] + t * (B[0] - A[0]), ly = A[1] + t * (B[1] - A[1]);
    maxDev = Math.max(maxDev, Math.hypot(pts[i] - lx, pts[i + 1] - ly));
  }
  assert.ok(maxDev > 0.05, 'should not be a straight line');
  assert.ok(maxDev < len * 0.4, 'should not wander off');
});

test('same seed → same strike; branches fork from the main channel', () => {
  const opts = { depth: 6, rough: 0.3, branches: 5, branchDepth: 4 };
  const s1 = strike(A, B, opts, rng(42));
  const s2 = strike(A, B, opts, rng(42));
  assert.deepEqual(s1, s2);
  assert.ok(s1.branches.length >= 5);
  const mainPts = new Set<string>();
  for (let i = 0; i < s1.main.length; i += 3) mainPts.add(s1.main.slice(i, i + 3).join(','));
  // every first-level branch starts exactly on a main-channel vertex
  const roots = s1.branches.filter((b) => b.weight === 0.55);
  assert.ok(roots.every((b) => mainPts.has(b.pts.slice(0, 3).join(','))));
});
