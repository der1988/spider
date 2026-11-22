import assert from 'node:assert/strict';
import test from 'node:test';
import {advanceArena,arenaStep,createArena,type ArenaInput} from '../src/arena-run.ts';
import {createWindowHunt,cameraFor,bedroomWidth,caughtLifetime,windowAnchor,stepWindowHunt,type CornerInput,type WindowRun} from '../src/window-hunt.ts';
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

test('bedroom layout offers a real web on the first flight route and delays paying until it expires',()=>{
  const game=createWindowHunt(false,undefined,()=>.5);
  assert.ok(windowAnchor(game));
  run(game,1,{silk:true});
  run(game,1);
  assert.equal(game.web.strands.length,1);
  const wire=game.web.strands[0];
  run(game,255);
  assert.equal(game.occupants.get(wire)?.length,2);
  assert.equal(game.silk,0);
  assert.equal(game.catches,0);
  assert.ok(wire.expiresAt!>game.clock);
  run(game,390);
  assert.equal(game.web.strands.includes(wire),false);
  assert.equal(game.silk,2);
  assert.equal(game.catches,2);
});

test('placing a new trap works while more than five other traps are present',()=>{
  const game=createWindowHunt(false);
  game.web.strands.push(...Array.from({length:30},(_,i)=>({
    from:{x:i,y:11},to:{x:i,y:50},shakeUntil:0,
  })));
  run(game,1,{silk:true});
  run(game,1);
  assert.equal(game.web.strands.length,31);
  assert.equal(game.silk,0);
});

test('R2 alone allows the spider to travel on a vertical web and releasing drops it',()=>{
  const game=createWindowHunt();
  game.spider=createCrawler({x:170,y:435},game.surfaces);
  const wire={from:{x:172,y:420},to:{x:172,y:473},shakeUntil:0};
  game.web.strands.push(wire);
  run(game,5,{move:{x:0,y:-1}});
  assert.equal(game.clinging,undefined);
  run(game,12,{grip:true,move:{x:0,y:-1}});
  assert.equal(game.clinging,wire);
  assert.ok(game.spider.y<431);
  run(game,1);
  assert.equal(game.clinging,undefined);
});

test('hunters stop on webs for three seconds and touching a free hunter ends the run',()=>{
  const game=createWindowHunt();
  game.predators.length=1;
  const hunter=game.predators[0];
  hunter.body=createCrawler({x:376,y:598},game.surfaces);
  hunter.origin={x:376,y:598};
  hunter.facing=1;
  game.spider=createCrawler({x:444,y:598},game.surfaces);
  const wire={from:{x:398,y:560},to:{x:398,y:606},shakeUntil:0};
  game.web.strands.push(wire);
  for (let i=0;i<100 && !hunter.boundUntil;i++) run(game,1);
  assert.equal(hunter.boundUntil-game.clock,caughtLifetime);
  assert.equal(game.occupants.has(wire),false);
  run(game,250);
  assert.equal(hunter.body.x,398);
  game.spider.x=410;
  for (let i=0;i<200 && game.phase==='play';i++) run(game,1);
  assert.equal(game.phase,'over');
});

test('a hunting spider can bind with silk and escape requires five distinct presses',()=>{
  const game=createWindowHunt();
  game.predators.length=1;
  const hunter=game.predators[0];
  hunter.body=createCrawler({x:332,y:598},game.surfaces);
  hunter.origin={x:332,y:598};
  game.spider=createCrawler({x:483,y:598},game.surfaces);
  for (let i=0;i<175 && !game.trapped;i++) run(game,1);
  assert.ok(game.trapped);
  run(game,6,{escape:true});
  assert.equal(game.escapeCount,1);
  for (let i=0;i<4;i++) {run(game,1);run(game,1,{escape:true});}
  assert.equal(game.trapped,false);
});

test('camera follows in two axes and solid walls keep the player inside the room',()=>{
  const game=createWindowHunt();
  const start=cameraFor(game);
  game.predators.length=0;
  game.spider=createCrawler({x:1200,y:176},game.surfaces);
  assert.ok(cameraFor(game).x>start.x && cameraFor(game).y<start.y);
  run(game,300,{move:{x:1,y:0}});
  assert.ok(game.spider.x<=bedroomWidth-17);
  assert.equal(game.phase,'play');
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
