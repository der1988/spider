import assert from 'node:assert/strict';
import test from 'node:test';
import {advanceArena,arenaStep,createArena,type ArenaInput} from '../src/arena-run.ts';
import {createWindowHunt,outsideRoom,windowAnchor,stepWindowHunt,type CornerInput,type WindowRun} from '../src/window-hunt.ts';
import {createCrawler} from '../src/crawler.ts';
import {arenaLayouts} from '../src/hunt.ts';

const idle:ArenaInput=[0,0,0,0,0];

test('Endless replaces both physical and visible platforms only when a tenth capture resolves',()=>{
  const run=createArena('loop',5);
  for (const [score,index] of [[9,0],[10,1],[19,1],[20,2],[30,0]]) {
    run.hunt.score=score;
    run.hunt.phase='caught';
    run.hunt.countdown=0;
    advanceArena(run,idle);
    assert.equal(run.hunt.surfaces,arenaLayouts[index]);
  }
  const classic=createArena('loop',5,false);
  classic.hunt.score=10;
  classic.hunt.phase='caught';
  advanceArena(classic,idle);
  assert.equal(classic.hunt.surfaces,arenaLayouts[0]);
});

const controls:CornerInput={move:{x:0,y:0},jump:false,silk:false};
function run(game:WindowRun,frames:number,input:Partial<CornerInput>={}) {
  for (let i=0;i<frames;i++) stepWindowHunt(game,{...controls,...input},arenaStep,()=>{});
}

test('the starting perch can place a real trap across the first swarm',()=>{
  const game=createWindowHunt(false,undefined,()=>.5);
  assert.ok(windowAnchor(game));
  run(game,1,{silk:true});
  assert.equal(game.silk,5);
  run(game,1);
  assert.equal(game.web.strands.length,1);
  assert.equal(game.silk,4);
  run(game,410);
  assert.ok(game.catches>=1);
  assert.equal(game.silk,5);
});

test('a second reachable trap from the pot catches gnats in the lower corridor',()=>{
  const game=createWindowHunt(false,undefined,()=>.5);
  const right={x:1,y:0},left={x:-1,y:0},leap={x:1,y:-1};
  run(game,89,{jump:true,move:leap});
  run(game,54,{move:right});
  run(game,68,{jump:true,move:leap});
  run(game,24);
  run(game,140,{move:left});
  assert.equal(game.spider.y,227);
  run(game,1,{silk:true,aim:{x:-.66,y:-1}});
  run(game,1);
  assert.equal(game.web.strands.length,1);
  run(game,710);
  assert.ok(game.catches>=1);
  assert.equal(game.silk,5);
});

test('direct shots spend one on a miss and credit a captured gnat',()=>{
  const game=createWindowHunt();
  run(game,1,{direct:true,aim:{x:1,y:0}});
  assert.equal(game.silk,4);
  run(game,1);
  game.gnats.push({p:{x:174,y:180},lane:0,targetY:180,kind:'swift',direction:1,phase:0,dodging:false});
  run(game,1,{direct:true});
  assert.equal(game.silk,4);
  assert.equal(game.catches,1);
  assert.equal(game.gnats.length,0);
});

test('five webs block placement and the player can specifically reclaim one',()=>{
  const game=createWindowHunt();
  const wires=Array.from({length:5},(_,i)=>({
    from:{x:166+i*16,y:146},to:{x:166+i*16,y:174},shakeUntil:0,
  }));
  game.web.strands.push(...wires);
  run(game,1,{silk:true});
  run(game,1);
  assert.equal(game.web.strands.length,5);
  assert.equal(game.silk,5);
  game.silk=2;
  run(game,1,{remove:true,aim:{x:1,y:-.4}});
  assert.equal(game.web.strands.length,4);
  assert.deepEqual(game.web.strands,wires.slice(1));
  assert.equal(game.silk,3);
});

test('a spider below the scene can reel back in and falls if it releases',()=>{
  const game=createWindowHunt();
  game.spider=createCrawler({x:365,y:287},game.surfaces);
  const up={x:0,y:-1};
  run(game,41,{silk:true,aim:up,move:{x:0,y:1}});
  assert.ok(outsideRoom(game.spider) && game.spider.rope);
  assert.equal(game.phase,'play');
  const falling=structuredClone(game.spider);
  run(game,110,{silk:true,move:up});
  assert.equal(outsideRoom(game.spider),false);
  game.spider=falling;
  run(game,1);
  assert.equal(game.phase,'over');
});
test('jump fires on press at fixed strength and holding does not spend the air jump',()=>{
  const game=createWindowHunt(true);
  run(game,1,{jump:true,move:{x:1,y:-1}});
  assert.ok(game.spider.x>32 && game.spider.y<262);
  const launchSpeed=Math.hypot(game.spider.vx,game.spider.vy);
  run(game,12,{jump:true,move:{x:1,y:-1}});
  assert.equal(game.spider.airJump,true);
  run(game,1);
  run(game,1,{jump:true,move:{x:0,y:-1}});
  assert.equal(game.spider.airJump,false);
  assert.ok(launchSpeed>168 && launchSpeed<174);
  assert.equal(game.spider.vx,0);
});

test('active rope can shorten and lengthen while fire remains held',()=>{
  const game=createWindowHunt(true);
  game.spider=createCrawler({x:32,y:130},game.surfaces);
  const aim={x:0,y:-1};
  run(game,40,{silk:true,aim,move:aim});
  const rope=game.spider.rope!;
  const length=rope.length,y=game.spider.y;
  assert.ok(length<114);
  run(game,40,{silk:true,move:{x:0,y:1}});
  assert.equal(game.spider.rope,rope);
  assert.ok(rope.length>length+10);
  assert.ok(game.spider.y>y+10);
  assert.equal(game.web.strands.length,0);
});
