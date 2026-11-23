import assert from 'node:assert/strict';
import test from 'node:test';
import {advanceArcade,arcadeLayouts,arcadeStage,createArcade,waveCapacity} from '../src/arcade.ts';
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
  assert.ok(run.cargo);
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
    assert.equal(run.flies.length,2);
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

test('only fast cargo stuns prey or damages the rival while it is open',()=>{
  const run=createArcade(10);
  advanceArcade(run,arenaInput({x:1,y:0}));
  run.recovered=10;
  advanceArcade(run,neutral);
  const boss=run.boss!;
  boss.p={x:122,y:195};
  boss.phase='warn';
  run.movement.spider.x=142;
  run.movement.spider.y=209;
  const fly=run.flies[0];
  fly.p={x:116,y:194};
  run.cargo={p:{x:114,y:196},v:{x:150,y:0},kind:0,hot:false,hitAt:0};
  advanceArcade(run,neutral);
  assert.ok(fly.stunUntil>run.clock);
  assert.equal(boss.hp,boss.max);
  boss.phase='open';
  boss.at=run.clock+10;
  run.cargo.hitAt=0;
  advanceArcade(run,neutral);
  assert.equal(boss.hp,boss.max-1);
  assert.equal(run.cargo,undefined);
  assert.equal(run.flies.length,2);
});
