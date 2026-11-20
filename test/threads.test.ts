import assert from 'node:assert/strict';
import test from 'node:test';
import {area} from '../src/area.ts';
import {createSpider, detach, shoot, tickSpider, DEFAULT_TUNING} from '../src/spider.ts';
import {createWeb, fixSilk, leaveSilk, tickFlies} from '../src/threads.ts';

test('one crossing can fix two strands in world coordinates and the gap flies hit a strand', () => {
  const web = createWeb();
  const spider = createSpider(area.spawn);
  const tick = (move: number) => {
    tickSpider(spider,area.surfaces,{move,reel:false},1/120);
    fixSilk(web,spider,area.surfaces);
  };
  const cast = () => assert.equal(shoot(spider,area.surfaces,{x:79,y:80}),true);
  const release = () => {
    assert.ok(spider.rope);
    leaveSilk(web,spider.rope,DEFAULT_TUNING.range);
    detach(spider);
  };
  tick(0);
  cast();
  release();
  tick(0);
  assert.equal(web.strands.length,1);
  cast();
  for (let i=0; i<76; i++) tick(1);
  release();
  assert.equal(web.loose.length,1);
  assert.equal(web.strands.length,1);
  for (let i=0; i<95; i++) tick(0);
  assert.ok(spider.grounded && spider.x > 100);
  assert.equal(web.strands.length,2);
  assert.notDeepEqual(web.strands[0].to,web.strands[1].to);
  const loaded = createWeb(JSON.stringify(web.strands));
  assert.deepEqual(loaded.strands,web.strands);

  let catches = 0;
  for (let i=1; i<=1200; i++) catches += tickFlies(loaded,i/120,i*1000/120).length;
  assert.ok(catches > 0);
  assert.ok(loaded.strands.some(strand => strand.shakeUntil > 0));
  const stuck = loaded.flies.find(fly => fly.caughtAt !== undefined);
  assert.ok(stuck);
  const position = {...stuck.position};
  tickFlies(loaded,15,15_000);
  assert.deepEqual(stuck.position,position);
});

test('loose silk cannot attach out of range or through a solid obstruction', () => {
  const floor = {x:-10,y:80,w:40,h:20};
  const web = createWeb();
  leaveSilk(web,{x:0,y:0},50);
  assert.equal(fixSilk(web,{x:10,y:72},[floor]),0);
  assert.equal(web.loose.length,0);
  leaveSilk(web,{x:0,y:0},100);
  const obstacle = {x:-10,y:30,w:40,h:20};
  assert.equal(fixSilk(web,{x:10,y:72},[floor,obstacle]),0);
  assert.equal(web.strands.length,0);
});
