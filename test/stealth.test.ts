import assert from 'node:assert/strict';
import test from 'node:test';
import {advanceArena,arenaStep,createArena,type ArenaInput} from '../src/arena-run.ts';
import {createStealth,exit,guardSees,room,escapePresses,stealthAnchor,stealthStick,stepStealth,type StealthInput,type StealthRun} from '../src/stealth.ts';
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

const controls:StealthInput={move:{x:0,y:0},jump:false,silk:false};
function run(game:StealthRun,frames:number,input:Partial<StealthInput>={}) {
  for (let i=0;i<frames;i++) stepStealth(game,{...controls,...input},arenaStep,()=>{});
}

test('a slight stick tilt creeps silently while a full tilt alerts a nearby guard',()=>{
  assert.ok(stealthStick({x:.22,y:0}).x>0);
  assert.ok(stealthStick({x:.22,y:0}).x<.08);
  assert.equal(stealthStick({x:1,y:0}).x,1);
  const quiet=createStealth(),loud=createStealth();
  for (const game of [quiet,loud]) game.spider=createCrawler({x:61,y:262},room);
  run(quiet,24,{move:{x:.22,y:0}});
  run(loud,24,{move:{x:1,y:0}});
  assert.ok(loud.spider.x>quiet.spider.x+10);
  assert.equal(quiet.noise,undefined);
  assert.ok(loud.noise && loud.guards[0].alert>0);
});

test('guards see along the floor and a sighting closes the exit until the witness is bound',()=>{
  const game=createStealth();
  const guard=game.guards[0];
  assert.equal(guardSees(guard,{x:139,y:170}),false);
  assert.equal(guardSees(guard,{x:140,y:262}),true);
  game.spider=createCrawler({x:143,y:262},room);
  run(game,78);
  assert.equal(guard.witnessed,true);
  game.spider=createCrawler(exit,room);
  run(game,1);
  assert.equal(game.phase,'play');

  game.spider=createCrawler({x:60,y:262},room);
  run(game,1,{aim:{x:1,y:0},silk:true});
  assert.equal(guard.caught,true);
  game.spider=createCrawler(exit,room);
  run(game,1);
  assert.equal(game.phase,'complete');
});

test('held silk stays mobile on the floor and release fixes it to the surface',()=>{
  const game=createStealth();
  game.aim={x:-1,y:0};
  assert.deepEqual(stealthAnchor(game),{x:9,y:262});
  run(game,1,{silk:true});
  assert.ok(game.spider.rope);
  assert.equal(game.web.strands.length,0);
  run(game,1);
  assert.equal(game.spider.rope,undefined);
  assert.equal(game.web.strands.length,1);
});

test('jump fires on press at fixed strength and holding does not spend the air jump',()=>{
  const game=createStealth(true);
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
  const game=createStealth(true);
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

test('the starting pipe gives time to observe mobile and fixed sentinels',()=>{
  const game=createStealth();
  const start=game.guards.map(guard=>guard.x);
  run(game,960);
  assert.equal(game.phase,'play');
  assert.equal(game.trapped,undefined);
  assert.ok(game.guards.every(guard=>guard.alert===0));
  assert.ok(game.guards.some((guard,i)=>guard.speed && guard.x!==start[i]));
  assert.ok(game.guards.filter(guard=>!guard.speed).every(guard=>guard.low===guard.x));
});

test('an alerted guard telegraphs and lands a direct shot, and escape counts distinct presses',()=>{
  const game=createStealth();
  game.spider=createCrawler({x:139,y:262},room);
  run(game,100);
  assert.ok(game.guards[0].attack);
  assert.equal(game.trapped,undefined);
  run(game,64);
  assert.ok(game.trapped);
  run(game,40,{escape:true});
  assert.equal(game.trapped?.presses,1);
  for (let i=1;i<escapePresses;i++) {
    run(game,1);
    run(game,1,{escape:true});
  }
  assert.equal(game.trapped,undefined);
});

test('a sentry can build a trap that binds a spider crossing the strand',()=>{
  const game=createStealth();
  game.spider=createCrawler({x:200,y:262},room);
  const guard=game.guards[1];
  guard.alert=.8;
  run(game,1);
  assert.equal(guard.attack?.web,true);
  run(game,75);
  assert.equal(game.enemyWebs.length,1);
  run(game,30,{move:{x:1,y:0}});
  assert.ok(game.trapped);
});

test('the entire S passage can be finished underneath the first wall and over the second',()=>{
  const game=createStealth();
  const left={x:-1,y:0},right={x:1,y:0},up={x:0,y:-1};
  run(game,1,{silk:true,aim:right});
  run(game,1);
  run(game,175,{move:right});
  assert.ok(game.spider.x>163 && game.spider.y>234);
  run(game,1,{silk:true,aim:right});
  run(game,2);
  run(game,210,{move:right});
  assert.equal(game.spider.x,324);
  run(game,1,{silk:true,aim:left});
  run(game,1);
  run(game,230,{move:up});
  assert.ok(game.spider.y<82);
  run(game,72,{move:{x:1,y:-1},jump:true});
  run(game,160,{move:right});
  run(game,1,{silk:true,aim:{x:-1,y:-.1}});
  run(game,1);
  run(game,165,{move:{x:0,y:1}});
  assert.equal(game.phase,'complete');
});
