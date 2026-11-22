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

test('exactly three insects and one hunter start at varied, distant positions',()=>{
  const starts=new Set<string>();
  for (const roll of [.03,.22,.49,.72,.96]) {
    const game=createWindowHunt(false,undefined,()=>roll);
    assert.equal(game.gnats.length,3);
    assert.equal(game.predators.length,1);
    for (const point of [...game.gnats.map(insect=>insect.p), game.predators[0].body]) {
      assert.ok(Math.hypot(point.x-game.spider.x,point.y-game.spider.y)>300);
    }
    starts.add(game.gnats.map(insect=>insect.home.x).join(',')+':'+game.predators[0].origin.x);
  }
  assert.equal(starts.size,5);
});

test('prey steer away from the spider and avoid a visible web',()=>{
  const game=createWindowHunt(false,undefined,()=>.5);
  game.predators.length=0;
  const gnat=game.gnats[0];
  game.gnats=[gnat];
  gnat.p={x:840,y:570};
  gnat.home={...gnat.p};
  game.spider=createCrawler({x:773,y:570}, game.surfaces);
  run(game,55);
  assert.ok(gnat.p.x>868);
  gnat.p={x:840,y:570};gnat.v={x:0,y:0};gnat.decideAt=0;
  game.web.strands=[{from:{x:876,y:538},to:{x:876,y:604},shakeUntil:0}];
  run(game,70);
  assert.equal(game.occupants.size,0);
  assert.ok(Math.abs(gnat.p.y-570)>22);
});

test('one web at a time, empty webs are removable and expiry pays for captured prey',()=>{
  const game=createWindowHunt(false,undefined,()=>.5);
  assert.ok(windowAnchor(game));
  run(game,1,{silk:true});
  run(game,1);
  const wire=game.web.strands[0];
  assert.ok(wire);
  run(game,1,{silk:true,aim:{x:-.45,y:-1}});
  run(game,1);
  assert.deepEqual(game.web.strands,[wire]);
  run(game,1,{remove:true});
  assert.equal(game.web.strands.length,0);
  const occupied={from:{x:850,y:520},to:{x:850,y:620},shakeUntil:0,expiresAt:game.clock+caughtLifetime};
  game.web.strands=[occupied];
  const insect=game.gnats.pop()!;
  game.occupants.set(occupied,[insect]);
  run(game,120);
  assert.equal(game.silk,0);
  assert.deepEqual(game.web.strands,[occupied]);
  run(game,245);
  assert.equal(game.silk,1);
  assert.equal(game.web.strands.length,0);
  assert.equal(game.gnats.length,3);
});

test('R2 alone lets the spider travel on a vertical web and releasing drops it',()=>{
  const game=createWindowHunt();
  game.spider=createCrawler({x:490,y:900},game.surfaces);
  const wire={from:{x:492,y:880},to:{x:492,y:940},shakeUntil:0};
  game.web.strands.push(wire);
  run(game,5,{move:{x:0,y:-1}});
  assert.equal(game.clinging,undefined);
  run(game,12,{grip:true,move:{x:0,y:-1}});
  assert.equal(game.clinging,wire);
  assert.ok(game.spider.y<896);
  run(game,1);
  assert.equal(game.clinging,undefined);
});

test('a hunter can jump a visible web, but an unexpected crossing still binds it',()=>{
  const game=createWindowHunt();
  const hunter=game.predators[0];
  hunter.body=createCrawler({x:700,y:1204},game.surfaces);
  hunter.origin={x:700,y:1204};
  hunter.fireAt=Infinity;
  game.spider=createCrawler({x:855,y:1204},game.surfaces);
  game.web.strands=[{from:{x:740,y:1163},to:{x:740,y:1212},shakeUntil:0}];
  run(game,1);
  assert.ok(hunter.body.vy<0);
  hunter.body=createCrawler({x:737,y:1204},game.surfaces);
  hunter.jumpAt=game.clock+1;
  for(let i=0;i<35&&!hunter.boundUntil;i++)run(game,1);
  assert.ok(Math.abs(hunter.boundUntil-game.clock-caughtLifetime)<.001);
  assert.equal(game.occupants.size,0);
  run(game,250);
  assert.equal(hunter.body.x,740);
  game.spider.x=750;
  for(let i=0;i<200&&game.phase==='play';i++)run(game,1);
  assert.equal(game.phase,'over');
});

test('a hunter can still bind with silk and escape requires five distinct presses',()=>{
  const game=createWindowHunt();
  const hunter=game.predators[0];
  hunter.body=createCrawler({x:700,y:1204},game.surfaces);
  hunter.origin={x:700,y:1204};
  game.spider=createCrawler({x:885,y:1204},game.surfaces);
  for(let i=0;i<175&&!game.trapped;i++)run(game,1);
  assert.ok(game.trapped);
  run(game,6,{escape:true});
  assert.equal(game.escapeCount,1);
  for(let i=0;i<4;i++) {run(game,1);run(game,1,{escape:true});}
  assert.equal(game.trapped,false);
});

test('camera follows in two axes and solid walls keep the player inside the room',()=>{
  const game=createWindowHunt();
  const start=cameraFor(game);
  game.predators.length=0;
  game.spider=createCrawler({x:2460,y:510},game.surfaces);
  assert.ok(cameraFor(game).x>start.x && cameraFor(game).y<start.y);
  run(game,300,{move:{x:1,y:0}});
  assert.ok(game.spider.x<=bedroomWidth-27);
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
