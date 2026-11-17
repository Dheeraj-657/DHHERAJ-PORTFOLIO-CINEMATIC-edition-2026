import { test } from 'node:test';
import assert from 'node:assert/strict';
import { railPosition, nextPixelRatio, visibleFraction, sectionProgress, damp } from './math.ts';

test('railPosition hits every stop at its cell centre and clamps at the ends', () => {
  // 4 stops on a 400px rail → centres at 50,150,250,350
  assert.equal(railPosition(50, 0, 400, 4), 0);
  assert.equal(railPosition(150, 0, 400, 4), 1);
  assert.equal(railPosition(350, 0, 400, 4), 3);
  assert.equal(railPosition(200, 0, 400, 4), 1.5);
  assert.equal(railPosition(-999, 0, 400, 4), 0);
  assert.equal(railPosition(9999, 0, 400, 4), 3);
  assert.equal(railPosition(10, 0, 400, 1), 0);
});

test('nextPixelRatio steps down under load, up with headroom, within bounds', () => {
  assert.equal(nextPixelRatio(2, 30, 2), 1.75);
  assert.equal(nextPixelRatio(0.75, 30, 2), 0.75);
  assert.equal(nextPixelRatio(1.5, 8, 2), 1.75);
  assert.equal(nextPixelRatio(2, 8, 2), 2);
  assert.equal(nextPixelRatio(1.5, 16, 2), 1.5);
});

test('visibleFraction and sectionProgress', () => {
  assert.equal(visibleFraction(0, 800, 800), 1);
  assert.equal(visibleFraction(400, 800, 800), 0.5);
  assert.equal(visibleFraction(900, 800, 800), 0);
  assert.equal(visibleFraction(-200, 2000, 800), 1); // taller than viewport, fully covering
  assert.equal(sectionProgress(800, 800, 800), 0);
  assert.equal(sectionProgress(-800, 800, 800), 1);
});

test('damp converges and never overshoots', () => {
  let v = 0;
  for (let i = 0; i < 600; i++) v = damp(v, 1, 5, 1 / 60);
  assert.ok(v > 0.999 && v <= 1);
});

import { sampleUniverse, BEATS } from '../animations/universeTimeline.ts';

test('universe opening: one shared materialisation, a settle that rests at zero', () => {
  assert.equal(sampleUniverse(0).mat, 0);
  assert.equal(sampleUniverse(BEATS.materialise - 0.01).mat, 0);
  assert.equal(sampleUniverse(BEATS.materialise + BEATS.matDur).mat, 1);
  assert.equal(sampleUniverse(BEATS.settle - 0.01).settle, 0);
  assert.ok(sampleUniverse(BEATS.settle + 0.2).settle > 0);
  assert.equal(sampleUniverse(BEATS.settle + BEATS.settleDur + 0.01).settle, 0);
  const end = sampleUniverse(99);
  assert.equal(end.rise, 1);
  assert.equal(end.float, 1);
  assert.equal(end.interactive, true);
  assert.equal(end.converge, 0);
});
