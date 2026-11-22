import assert from 'node:assert/strict';
import test from 'node:test';
import {advanceArena,arenaStep,createArena,type ArenaInput} from '../src/arena-run.ts';
import {createStealth,exit,guardSees,room,silkReach,stealthStick,stepStealth,type StealthInput,type StealthRun} from '../src/stealth.ts';
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
  for (const game of [quiet,loud]) game.spider=createCrawler({x:111,y:262},room);
  run(quiet,24,{move:{x:.22,y:0}});
  run(loud,24,{move:{x:1,y:0}});
  assert.ok(loud.spider.x>quiet.spider.x+10);
  assert.equal(quiet.noise,undefined);
  assert.ok(loud.noise && loud.guards[0].alert>0);
});

test('guards see along the floor and a sighting closes the exit until the witness is bound',()=>{
  const game=createStealth();
  const guard=game.guards[0];
  assert.equal(guardSees(guard,{x:170,y:170}),false);
  assert.equal(guardSees(guard,{x:170,y:262}),true);
  game.spider=createCrawler({x:218,y:262},room);
  run(game,78);
  assert.equal(guard.witnessed,true);
  game.spider=createCrawler(exit,room);
  run(game,1);
  assert.equal(game.phase,'play');

  game.spider=createCrawler({x:111,y:262},room);
  run(game,82,{aim:{x:1,y:0},silk:true});
  assert.equal(guard.caught,true);
  game.spider=createCrawler(exit,room);
  run(game,1);
  assert.equal(game.phase,'complete');
});

test('held silk stays mobile on the floor and release fixes it to the surface',()=>{
  const game=createStealth();
  assert.equal(silkReach(0),42);
  assert.equal(silkReach(1),155);
  run(game,60,{aim:{x:-1,y:0},silk:true});
  assert.ok(game.spider.rope);
  assert.equal(game.web.strands.length,0);
  run(game,1);
  assert.equal(game.spider.rope,undefined);
  assert.equal(game.web.strands.length,1);
});

test('both jump charge and stick orientation matter on release',()=>{
  const short=createStealth(),long=createStealth(),vertical=createStealth();
  run(short,8,{jump:true});
  run(long,84,{jump:true});
  run(vertical,84,{jump:true});
  run(short,7,{move:{x:1,y:0}});
  run(long,7,{move:{x:1,y:0}});
  run(vertical,7,{move:{x:0,y:-1}});
  assert.ok(long.spider.x>short.spider.x+4);
  assert.equal(vertical.spider.x,32);
  assert.ok(vertical.spider.y<long.spider.y);
});

test('the whole level is passable unseen using a charged jump, a ceiling tether and exit shaft',()=>{
  const game=createStealth();
  const up={x:0,y:-1};
  run(game,85,{move:up,jump:true});
  run(game,36,{move:up});
  run(game,24,{move:up,jump:true});
  run(game,12,{move:up});
  run(game,390,{move:up,aim:up,silk:true});
  assert.ok(game.spider.rope);
  run(game,4,{move:up});
  assert.equal(game.spider.support,'ceiling');
  run(game,535,{move:{x:1,y:0}});
  const down={x:0,y:1};
  run(game,35,{move:down,jump:true});
  run(game,170,{move:down});
  assert.equal(game.phase,'complete');
  assert.ok(game.guards.every(guard=>!guard.witnessed && !guard.caught));
});
