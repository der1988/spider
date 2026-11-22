import assert from 'node:assert/strict';
import test from 'node:test';
import {createCrawler} from '../src/crawler.ts';
import {createOpenWorld,stepWindowHunt,updateHuntZoom,cameraFor,shaftWidth,shaftHeight} from '../src/window-hunt.ts';

const idle={move:{x:0,y:0},jump:false,silk:false};

test('the shaft has distinct altitude bands, four guards and a smooth live zoom',()=>{
  const game=createOpenWorld(()=>.5);
  assert.ok(shaftHeight>shaftWidth);
  assert.equal(game.gnats.length,10);
  assert.ok(game.gnats.some(fly=>fly.rare && fly.p.y<265));
  assert.ok(game.gnats.some(fly=>fly.uncommon));
  assert.equal(game.predators.filter(enemy=>enemy.bee).length,2);
  assert.equal(game.predators.filter(enemy=>!enemy.bee).length,2);
  updateHuntZoom(game,true,.05);
  const scale=cameraFor(game).scale;
  assert.ok(scale<1 && scale>.62);
  const clock=game.clock;
  stepWindowHunt(game,idle,1/120,()=>{});
  assert.ok(game.clock>clock);
  updateHuntZoom(game,false,.05);
  assert.ok(cameraFor(game).scale>scale);
});

test('both guard types acquire only visible cargo and the prey remains in the chain',()=>{
  for(const bee of [false,true]){
    const game=createOpenWorld(()=>.5);
    game.surfaces=[{x:0,y:500,w:900,h:20,grip:true}];
    game.spider=createCrawler({x:350,y:492},game.surfaces);
    const enemy=game.predators.find(guard=>guard.bee===bee)!;
    game.predators=[enemy];enemy.body=createCrawler({x:200,y:492},game.surfaces);
    const [fly]=game.gnats; game.gnats=[];
    stepWindowHunt(game,idle,1/120,()=>{});
    assert.equal(enemy.lastKnown,undefined);
    game.carried.push(fly);
    game.surfaces.push({x:275,y:435,w:10,h:65});
    stepWindowHunt(game,idle,1/120,()=>{});
    assert.equal(enemy.lastKnown,undefined);
    game.surfaces.pop();
    stepWindowHunt(game,idle,1/120,()=>{});
    assert.ok(enemy.chaseUntil>game.clock);
    assert.equal(game.carried.length,1);
    assert.equal(game.speech.queue.length,0);
  }
});

test('R1 tap stays grounded, a hold attaches, and a held miss leaves support intact',()=>{
  const game=createOpenWorld(()=>.5);
  game.surfaces=[{x:0,y:350,w:500,h:16,grip:true},{x:35,y:140,w:90,h:12,grip:true}];
  game.spider=createCrawler({x:80,y:342},game.surfaces);
  game.predators=[];
  game.gnats=[];
  const input={move:{x:0,y:0},aim:{x:0,y:-1},jump:false,silk:true};
  const tick=(silk:boolean)=>stepWindowHunt(game,{...input,silk},1/120,()=>{});
  for(let i=0;i<10;i++) tick(true);
  assert.equal(game.spider.support,'floor');
  assert.equal(game.web.strands.length,0);
  tick(false);
  assert.equal(game.spider.support,'floor');
  assert.equal(game.spider.rope,undefined);
  assert.equal(game.web.strands.length,1);
  for(let i=0;i<32;i++) tick(true);
  assert.ok(game.spider.rope);
  assert.equal(game.spider.support,undefined);
  tick(false);
  game.spider=createCrawler({x:80,y:342},game.surfaces);
  input.aim={x:1,y:0};
  for(let i=0;i<32;i++) tick(true);
  assert.equal(game.spider.rope,undefined);
  assert.equal(game.spider.support,'floor');
});
