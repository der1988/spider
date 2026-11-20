import assert from 'node:assert/strict';
import test from 'node:test';
import {area, loopShift, loopSurfaces, loopWidth, visibleCopies} from '../src/area.ts';
import {createSpider, tickSpider} from '../src/spider.ts';

test('walking across the join in either direction keeps ground contact and velocity', () => {
  for (const direction of [-1,1]) {
    const spider = createSpider({x:direction>0 ? area.bounds.right-12 : area.bounds.left+12,y:158});
    let shift = 0;
    for (let i=0; i<120 && !shift; i++) {
      tickSpider(spider,loopSurfaces,{move:direction,reel:false},1/120,undefined,area.ramps);
      assert.ok(spider.grounded);
      shift = loopShift(spider.x);
      spider.x -= shift;
    }
    assert.equal(shift,direction*loopWidth);
    const {vx,y} = spider;
    assert.equal(y,158);
    tickSpider(spider,loopSurfaces,{move:direction,reel:false},1/120,undefined,area.ramps);
    assert.ok(spider.grounded);
    assert.equal(spider.vx,vx);
    assert.equal(spider.y,158);
  }
});

test('the join leads back to the first ledge without jumping', () => {
  const spider = createSpider({x:area.bounds.left+1,y:158});
  for (let i=0; i<500 && spider.x<area.spawn.x; i++) {
    tickSpider(spider,loopSurfaces,{move:1,reel:false},1/120,undefined,area.ramps);
  }
  assert.ok(spider.x>=area.spawn.x && spider.grounded);
  assert.equal(spider.y,area.spawn.y);
  assert.deepEqual(visibleCopies(area.bounds.left-20,area.bounds.right+20),[-loopWidth,0,loopWidth]);
});
