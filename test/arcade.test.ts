import assert from 'node:assert/strict';
import test from 'node:test';
import {advanceArcade,arcadeEscapeButton,arcadeEscapePresses,arcadeLayouts,arcadeStage,createArcade,waveCapacity} from '../src/arcade.ts';
import {arenaInput,arenaStep} from '../src/arena-run.ts';

const neutral=arenaInput({x:0,y:0});
function ticks(run:ReturnType<typeof createArcade>,seconds:number) {
  for (let i=0;i<Math.round(seconds/arenaStep);i++) advanceArcade(run,neutral);
}

test('Endless holds for intentional input and requires collection while the net still holds',()=>{
  const run=createArcade();
  advanceArcade(run,arenaInput({x:.3,y:0},{x:0,y:.35}));
  assert.equal(run.phase,'ready');
  assert.equal(run.time,32);
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
  const remaining=run.flies.length;
  run.flies[0].caughtUntil=run.clock+arenaStep*.5;
  advanceArcade(run,neutral);
  assert.equal(run.score,1);
  assert.equal(run.flies.length,remaining);
});

test('arcade grows in bounded waves, and every tenth level requires a rival',()=>{
  assert.equal(new Set(arcadeLayouts.map(layout=>JSON.stringify(layout))).size,10);
  assert.equal(waveCapacity(100),6);
  for (const level of [10,60,100]) {
    const run=createArcade(level);
    advanceArcade(run,arenaInput({x:1,y:0}));
    assert.ok(run.flies.length<=waveCapacity(level));
    run.recovered=level;
    advanceArcade(run,neutral);
    assert.equal(run.phase,'boss');
    assert.equal(run.flies.length,0);
    const boss=run.boss!;
    assert.equal(boss.phase,'warn');
    assert.equal(boss.hp,2+Math.floor(arcadeStage(level)/2));
    boss.hp=0;
    advanceArcade(run,neutral);
    if (level===100) assert.equal(run.phase,'won');
    else {
      assert.equal(run.level,level+1);
      assert.deepEqual(run.flies.map(fly=>fly.kind),[arcadeStage(level+1)]);
      assert.equal(run.movement.hunt.surfaces,arcadeLayouts[arcadeStage(level+1)]);
    }
  }
});

function firstBoss() {
  const run=createArcade(10);
  advanceArcade(run,arenaInput({x:1,y:0}));
  run.recovered=run.level;
  advanceArcade(run,neutral);
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
