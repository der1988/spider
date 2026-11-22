import assert from 'node:assert/strict';
import test from 'node:test';
import {advanceArena,arenaStep,createArena,type ArenaInput} from '../src/arena-run.ts';
import {createExtra,stepExtra} from '../src/extra-modes.ts';
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

test('a platform silk shot makes a cocoon that only scores once when collected',()=>{
  const run=createExtra('platform');
  const fly=run.flies[0];
  fly.p={x:79,y:167};
  stepExtra(run,[0,0,110,-28,2],arenaStep,()=>{});
  assert.equal(fly.cocoon,true);
  assert.equal(run.score,0);
  for (let i=0;i<130;i++) stepExtra(run,[127,0,0,0,0],arenaStep,()=>{});
  assert.equal(run.score,1);
  assert.equal(fly.caught,true);
});

test('Swarm gets a longer web and starts the next wave only after every fly is captured',()=>{
  const run=createExtra('swarm');
  stepExtra(run,[0,0,0,-127,2],arenaStep,()=>{});
  const wire=run.web.strands[0];
  assert.ok(Math.abs(wire.to.y-wire.from.y)>300);
  assert.ok((wire.expiresAt??0)-run.clock>25);
  for (let wave=1;wave<=3;wave++) {
    assert.equal(run.flies.length,wave);
    for (const fly of run.flies.slice(1)) fly.caught=true;
    assert.equal(run.wave,wave);
    const target=run.flies[0];
    target.p={x:47.3,y:150};
    target.v={x:-68,y:0};
    stepExtra(run,idle,arenaStep,()=>{});
    assert.equal(run.wave,wave+1);
    assert.equal(run.time,35);
  }
  assert.equal(run.score,3);
});
