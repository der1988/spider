import assert from 'node:assert/strict';
import test from 'node:test';
import {advanceArcade,arcadeEscapeButton,arcadeEscapePresses,arcadeLayouts,arcadeStage,createArcade,waveCapacity} from '../src/arcade.ts';
import {arenaInput,arenaStep} from '../src/arena-run.ts';
import {dialogueFor,levelDialogues,levelIntroDuration} from '../src/arcade-dialogue.ts';

const neutral=arenaInput({x:0,y:0});
function ticks(run:ReturnType<typeof createArcade>,seconds:number) {
  for (let i=0;i<Math.round(seconds/arenaStep);i++) advanceArcade(run,neutral);
}

function start(run:ReturnType<typeof createArcade>) {
  advanceArcade(run,arenaInput({x:1,y:0}));
  skip(run);
}
function skip(run:ReturnType<typeof createArcade>) {
  const cross=arenaInput({x:0,y:0});
  cross[4]=arcadeEscapeButton;
  ticks(run,.45);
  advanceArcade(run,cross);
  assert.equal(run.intro,undefined);
}

test('the 100 levels each stage an authored exchange and resume with their own roster',()=>{
  assert.equal(levelDialogues.length,100);
  assert.equal(new Set(levelDialogues.map(([name])=>name)).size,100);
  assert.equal(new Set(levelDialogues.flatMap(([,line,reply])=>[line,reply])).size,200);
  for (let level=1;level<=100;level++) {
    const run=createArcade(level),before=run.time;
    const cast=run.flies.map(fly=>fly.kind);
    assert.equal(new Set(cast).size,run.quota);
    assert.ok(dialogueFor(level).every(line=>line.trim().length>0));
    advanceArcade(run,arenaInput({x:1,y:0}));
    ticks(run,levelIntroDuration(level)-.1);
    assert.equal(run.intro?.kind,'level');
    assert.equal(run.time,before);
    assert.deepEqual(run.flies.map(fly=>fly.kind),cast);
    for (let frame=0;run.intro && frame<30;frame++) advanceArcade(run,neutral);
    assert.equal(run.intro,undefined);
    advanceArcade(run,neutral);
    assert.ok(run.time<before);
    assert.equal(run.phase,'wave');
  }
});

test('a comet holds a fast line while its slower leafwing teammate turns first',()=>{
  const run=createArcade(60);
  start(run);
  const [leafwing,comet]=run.flies;
  leafwing.kind=5;comet.kind=4;
  leafwing.p={x:130,y:192};comet.p={x:130,y:182};
  for (const fly of [comet,leafwing]) {
    fly.v={x:0,y:0};fly.target={x:380,y:fly.p.y};fly.aimAt=8;
  }
  ticks(run,.75);
  assert.ok(comet.p.x>leafwing.p.x+12);
  for (const fly of [comet,leafwing]) fly.target={x:30,y:fly.p.y};
  ticks(run,.15);
  assert.ok(leafwing.v.x<0);
  assert.ok(comet.v.x>0);
});

test('a leafwing diverts at a silk barrier a gnat would try to cross',()=>{
  for (const [kind,avoidsSilk] of [[0,false],[5,true]] as const) {
    const run=createArcade(2);
    start(run);
    const fly=run.flies[0];
    fly.kind=kind;fly.p={x:180,y:186};
    run.movement.hunt.strands=[{from:{x:230,y:7},to:{x:230,y:217},shakeUntil:0}];
    advanceArcade(run,neutral);
    assert.equal(fly.target.x<230,avoidsSilk);
  }
});

test('Endless holds for intentional input and expired prey cannot be collected',()=>{
  const run=createArcade();
  advanceArcade(run,arenaInput({x:.3,y:0},{x:0,y:.35}));
  assert.equal(run.phase,'ready');
  assert.equal(run.time,32);
  start(run);
  advanceArcade(run,arenaInput({x:0,y:0},{x:.75,y:-.8},false,true));
  ticks(run,.7);
  const fly=run.flies[0];
  assert.ok(fly.caughtUntil>run.clock);
  assert.equal(run.score,0);
  assert.equal(run.movement.hunt.strands.length,1);
  run.movement.spider.x=fly.p.x;
  run.movement.spider.y=fly.p.y+10;
  advanceArcade(run,neutral);
  assert.equal(run.score,1);
  assert.equal(run.level,2);
  skip(run);
  const remaining=run.flies.length;
  const actor=run.flies[0].actor;
  run.flies[0].p={x:run.movement.spider.x,y:run.movement.spider.y};
  run.flies[0].caughtUntil=run.clock+arenaStep*.5;
  advanceArcade(run,neutral);
  assert.equal(run.score,1);
  assert.equal(run.flies.length,remaining);
  assert.equal(run.flies[0].actor,actor);
  assert.ok(run.flies[0].returnsAt>run.clock);
});

test('touching an insect in flight counts without firing silk',()=>{
  const run=createArcade();
  const right=arenaInput({x:1,y:0});
  start(run);
  const spider=run.movement.spider;
  const fly=run.flies[0];
  fly.p={x:spider.x+29,y:spider.y-11};
  fly.target={x:380,y:fly.p.y};
  fly.aimAt=5;fly.age=5;
  for (let i=0;i<160 && !run.score;i++) advanceArcade(run,right);
  assert.equal(run.score,1);
  assert.equal(run.level,2);
  assert.equal(run.movement.hunt.strands.length,0);
});

test('Endless ignores fixed webs as footholds and lets the active rope reel or pay out',()=>{
  const run=createArcade(),spider=run.movement.spider;
  const up=arenaInput({x:0,y:-1});
  start(run);
  const strands=run.movement.hunt.strands;
  strands.push({from:{x:7,y:183},to:{x:393,y:183},shakeUntil:0});
  Object.assign(spider,{x:150,y:168,vy:80,support:undefined,grounded:false});
  for (let i=0;i<22;i++) advanceArcade(run,up);
  assert.ok(spider.y>183);
  assert.equal(spider.thread,undefined);
  Object.assign(spider,{x:110,y:150,vx:0,vy:0,support:undefined,grounded:false,rope:{x:90,y:63,length:90}});
  for (let i=0;i<15;i++) advanceArcade(run,up);
  const reeled=spider.rope!.length;
  assert.ok(reeled<90);
  const down=arenaInput({x:0,y:1});
  for (let i=0;i<15;i++) advanceArcade(run,down);
  assert.ok(spider.rope!.length>reeled);
});

test('a fixed roster must be cleared and every tenth level introduces the rival',()=>{
  assert.equal(new Set(arcadeLayouts.map(layout=>JSON.stringify(layout))).size,10);
  assert.equal(waveCapacity(100),6);
  for (const level of [10,60,100]) {
    const run=createArcade(level);
    start(run);
    assert.equal(run.flies.length,waveCapacity(level));
    assert.equal(new Set(run.flies.map(fly=>fly.actor)).size,run.quota);
    run.flies=[];
    advanceArcade(run,neutral);
    assert.equal(run.phase,'boss');
    assert.equal(run.flies.length,0);
    const boss=run.boss!;
    assert.equal(run.intro?.kind,'rival');
    const before=run.time;
    skip(run);
    assert.equal(run.time,before);
    assert.equal(boss.phase,'warn');
    assert.equal(boss.hp,2+Math.floor(arcadeStage(level)/2));
    boss.hp=0;
    advanceArcade(run,neutral);
    if (level===100) assert.equal(run.phase,'won');
    else {
      assert.equal(run.level,level+1);
      assert.equal(run.intro?.kind,'level');
      assert.equal(run.flies[0].kind,arcadeStage(level+1));
      assert.equal(run.movement.hunt.surfaces,arcadeLayouts[arcadeStage(level+1)]);
    }
  }
});

function firstBoss() {
  const run=createArcade(10);
  start(run);
  run.flies=[];
  advanceArcade(run,neutral);
  skip(run);
  return run;
}

test('a player net stops the boss, allows one contact hit, and tears when the boss breaks free',()=>{
  const run=firstBoss(),boss=run.boss!;
  const wire={from:{x:140,y:110},to:{x:140,y:217},shakeUntil:0};
  run.movement.hunt.strands=[wire];
  boss.phase='charge';boss.p={x:141,y:202};boss.target={x:95,y:202};
  advanceArcade(run,neutral);
  assert.equal(boss.phase,'trapped');
  assert.equal(boss.net,wire);
  ticks(run,.2);
  assert.equal(boss.hp,boss.max);
  run.movement.spider.x=134;
  ticks(run,.8);
  assert.equal(boss.hp,boss.max-1);
  ticks(run,1.9);
  assert.equal(boss.hp,boss.max-1);
  assert.equal(boss.phase,'warn');
  assert.equal(run.movement.hunt.strands.includes(wire),false);
});

test('an unhit rival breaks out on time and its next attack can trap the player',()=>{
  const run=firstBoss(),boss=run.boss!;
  const spider=run.movement.spider;
  run.movement.hunt.strands=[{from:{x:140,y:110},to:{x:140,y:217},shakeUntil:0}];
  boss.phase='charge';boss.p={x:141,y:202};boss.target={x:95,y:202};
  advanceArcade(run,neutral);
  ticks(run,2.9);
  assert.equal(boss.hp,boss.max);
  assert.equal(boss.phase,'warn');
  assert.ok(boss.shot);
  ticks(run,1);
  assert.ok(run.snare);
  const x=spider.x;
  advanceArcade(run,arenaInput({x:1,y:0},undefined,true,true));
  assert.equal(run.snare.presses,0);
  assert.equal(spider.x,x);
  const cross=arenaInput({x:0,y:0});
  cross[4]=arcadeEscapeButton;
  for (let i=1;i<arcadeEscapePresses;i++) {
    advanceArcade(run,cross);
    assert.equal(run.snare.presses,i);
  }
  advanceArcade(run,cross);
  assert.equal(run.snare,undefined);
  assert.equal(run.rivalWebs.length,0);
});
