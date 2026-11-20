import assert from 'node:assert/strict';
import test from 'node:test';
import { area } from '../src/area.ts';
import {
  aimHit,
  createSpider,
  detach,
  shoot,
  tickSpider,
  type Point,
  type Rect,
  type Spider,
} from '../src/spider.ts';

const frameSeconds = 1 / 60;

function runFrames(spider: Spider, surfaces: readonly Rect[], count: number, move: -1 | 0 | 1, reel = false) {
  for (let frame = 0; frame < count; frame++) {
    tickSpider(spider, surfaces, {move, reel}, frameSeconds);
  }
}

function assertLandedNear(spider: Spider, point: Point) {
  assert.equal(spider.grounded, true);
  assert.ok(Math.hypot(spider.x - point.x, spider.y - point.y) < 24, 'must land within the checkpoint radius');
}

test('the first solid blocks silk from attaching to a grip behind it', () => {
  const spider = createSpider({x: 0, y: 0});
  const canopy = {x: 65, y: -10, w: 15, h: 20, grip: true};
  const rock = {x: 35, y: -10, w: 10, h: 20};
  const aim = {x: 75, y: 0};

  assert.deepEqual(aimHit(spider, [canopy], aim), {x: 65, y: 0});
  for (const surfaces of [[canopy, rock], [rock, canopy]]) {
    assert.equal(aimHit(spider, surfaces, aim), undefined);
    assert.equal(shoot(spider, surfaces, aim), false);
    assert.equal(spider.rope, undefined);
  }
  assert.equal(aimHit(spider, [canopy], aim, {range: 64}), undefined);
});

test('a missed shot preserves the active line, reeling lifts the spider and release preserves momentum', () => {
  const spider = createSpider({x: 0, y: 80});
  const surfaces = [{x: -12, y: -10, w: 24, h: 10, grip: true}];

  assert.equal(shoot(spider, surfaces, {x: 0, y: 0}), true);
  const originalLine = spider.rope;
  assert.equal(shoot(spider, surfaces, {x: 100, y: 80}), false);
  assert.equal(spider.rope, originalLine);

  runFrames(spider, surfaces, 24, 1, true);
  assert.ok(spider.y < 80);
  assert.ok(spider.vx > 0);
  assert.ok(spider.rope && spider.rope.length < 80);
  assert.ok(Math.hypot(spider.x - spider.rope.x, spider.y - spider.rope.y) <= spider.rope.length + 0.001);

  const {vx, vy} = spider;
  detach(spider);
  assert.equal(spider.rope, undefined);
  assert.equal(spider.vx, vx);
  assert.equal(spider.vy, vy);
  const releasedAt = spider.x;
  runFrames(spider, surfaces, 6, 0);
  assert.ok(spider.x > releasedAt);
  assert.ok(spider.vy > vy);
});

test('walking off the opening ledge drops into the gap without a line', () => {
  const spider = createSpider(area.spawn);

  runFrames(spider, area.surfaces, 100, 1);

  assert.ok(spider.y > area.bounds.bottom);
  assert.equal(spider.grounded, false);
});

test('swinging and releasing crosses the opening gap and reaches the finish through each checkpoint', () => {
  const surfaces = area.surfaces;
  const spider = createSpider(area.spawn);
  runFrames(spider, surfaces, 1, 0);

  assert.equal(shoot(spider, surfaces, {x: 66, y: 76}), true);
  runFrames(spider, surfaces, 16, 1, true);
  detach(spider);
  runFrames(spider, surfaces, 31, 0);
  assertLandedNear(spider, area.checkpoints[0]);

  assert.equal(shoot(spider, surfaces, {x: 132, y: 61}), true);
  runFrames(spider, surfaces, 56, 1, true);
  detach(spider);
  runFrames(spider, surfaces, 21, 0);
  assertLandedNear(spider, area.checkpoints[1]);

  assert.equal(shoot(spider, surfaces, {x: 234, y: 43}), true);
  runFrames(spider, surfaces, 32, 0, true);
  detach(spider);
  runFrames(spider, surfaces, 36, 0);
  assertLandedNear(spider, area.checkpoints[2]);

  runFrames(spider, surfaces, 245, 1);
  assert.equal(spider.grounded, true);
  assert.ok(Math.hypot(spider.x - area.finish.x, spider.y - area.finish.y) < 17);
});

test('the optional canopy discovery is reachable by transferring between two grips', () => {
  const surfaces = area.surfaces;
  const spider = createSpider(area.checkpoints[1]);
  runFrames(spider, surfaces, 1, 0);

  const nearGrip = {x: 234, y: 43};
  const farGrip = {x: 383, y: -34};
  const blocked = aimHit(spider, surfaces, farGrip);
  assert.ok(!blocked || blocked.x < farGrip.x - 10);
  assert.equal(shoot(spider, surfaces, nearGrip), true);
  const firstAnchor = spider.rope;
  runFrames(spider, surfaces, 40, 1, true);
  assert.equal(shoot(spider, surfaces, farGrip), true);
  assert.notEqual(spider.rope, firstAnchor);
  assert.ok(spider.rope && Math.abs(spider.rope.x - farGrip.x) < 5);
  runFrames(spider, surfaces, 96, 1, true);
  detach(spider);
  runFrames(spider, surfaces, 27, 1);

  assert.equal(spider.grounded, true);
  assert.ok(Math.hypot(spider.x - area.discovery.x, spider.y - area.discovery.y) < 15);
});
