import assert from 'node:assert/strict';
import test from 'node:test';
import {castCrawler,closeCrawlerRopes,createCrawler,jumpCrawler,tickCrawler} from '../src/crawler.ts';
import {platforms,spawn} from '../src/hunt.ts';

const dt=1/120;
const still={x:0,y:0};

test('a wall landing restores two jumps; wall jump points inward and the next one goes up',()=>{
  const spider=createCrawler(spawn,platforms);
  const step=(x=0,y=0)=>tickCrawler(spider,platforms,{x,y},false,dt,[]);
  assert.equal(spider.support,'floor');
  assert.ok(jumpCrawler(spider));
  for (let i=0;i<8;i++) step(-1);
  assert.ok(jumpCrawler(spider));
  assert.equal(jumpCrawler(spider),false);
  for (let i=0;i<150 && spider.support!=='left';i++) step(-1);
  assert.equal(spider.support,'left');
  assert.ok(jumpCrawler(spider));
  assert.ok(spider.vx>0);
  step(1);
  assert.ok(jumpCrawler(spider));
  assert.ok(spider.vy<0);
  assert.equal(jumpCrawler(spider),false);
});

test('running up the wall continues across the ceiling corner and jumping goes downward',()=>{
  const spider=createCrawler({x:14,y:42},platforms);
  assert.equal(spider.support,'left');
  for(let i=0;i<90&&spider.support!=='ceiling';i++) tickCrawler(spider,platforms,{x:0,y:-1},false,dt,[]);
  assert.equal(spider.support,'ceiling');
  for(let i=0;i<30;i++) tickCrawler(spider,platforms,{x:1,y:0},false,dt,[]);
  assert.ok(spider.x>20);
  assert.equal(spider.y,15);
  assert.ok(jumpCrawler(spider));
  assert.ok(spider.vy>0);
  tickCrawler(spider,platforms,still,false,dt,[]);
  assert.ok(spider.y>15);
});

test('only a successful second shot creates a second line, and closing or jumping removes both',()=>{
  const spider=createCrawler({x:45,y:100},platforms);
  assert.ok(castCrawler(spider,platforms,{x:0,y:100}));
  const first=spider.rope;
  assert.equal(castCrawler(spider,platforms,{x:360,y:100}),false);
  assert.equal(spider.rope,first);
  assert.equal(spider.firstAnchor,undefined);
  assert.ok(castCrawler(spider,platforms,{x:45,y:0}));
  assert.deepEqual(spider.firstAnchor,{x:7,y:100});
  assert.equal(spider.rope?.y,7);
  const newest=spider.rope;
  assert.equal(closeCrawlerRopes(spider),newest);
  assert.equal(spider.rope,undefined);
  assert.equal(spider.firstAnchor,undefined);
  assert.ok(castCrawler(spider,platforms,{x:0,y:100}));
  assert.ok(castCrawler(spider,platforms,{x:45,y:0}));
  assert.ok(jumpCrawler(spider));
  assert.ok(spider.vy<0);
  assert.equal(spider.rope,undefined);
  assert.equal(spider.firstAnchor,undefined);
});
