import assert from 'node:assert/strict';
import test from 'node:test';
import {advanceArena,type ArenaInput} from '../src/arena-run.ts';
import {endlessArena,recordReplay,replayScore} from '../src/endless-replay.ts';
import {createMenuRoom,stepMenuRoom} from '../src/menu-room.ts';
import {menuBeats,menuLoopEnd,menuLoopStart} from '../src/menu-timing.ts';

const id='00000000-0000-4000-8000-000000000001';

test('Endless replays verify a real catch and must finish at the actual timeout',()=>{
  const game=endlessArena(id);
  const record=recordReplay();
  const idle:ArenaInput=[0,0,0,0,0];
  const shot:ArenaInput=[0,0,48,-118,2];
  for (let i=0;game.hunt.phase!=='over';i++) {
    const input=i===91 ? shot : idle;
    record.add(input);
    advanceArena(game,input);
  }
  const evidence=record.encode()!;
  assert.equal(game.hunt.score,1);
  assert.equal(replayScore(id,evidence),1);
  assert.equal(replayScore(id,btoa(atob(evidence)+'\x01\0\0\0\0\0\0')),undefined);
  assert.equal(replayScore(id,btoa(atob(evidence).slice(0,-7))),undefined);
  assert.equal(replayScore(id,btoa('\x02\0\0\0\0\0\x02')),undefined);
  assert.equal(replayScore('other',evidence),undefined);
});

test('the menu spider crosses all four surfaces and swings in the side lane',()=>{
  const room=createMenuRoom();
  const surfaces=new Set<string>();
  let ropeTime=0;
  for (let i=0;i<7200;i++) {
    stepMenuRoom(room,1/120);
    if (room.spider.support) surfaces.add(room.spider.support);
    if (room.spider.rope) {
      ropeTime+=1/120;
      assert.ok(room.spider.x>room.width*.8 && room.spider.rope.x>room.width*.8);
    }
  }
  assert.deepEqual(surfaces,new Set(['floor','left','right','ceiling']));
  assert.ok(ropeTime>1);
});

test('menu loop and measured beats are inside the decoded track',()=>{
  assert.ok(menuBeats.every((time,index)=>time<58 && (!index || time>menuBeats[index-1])));
  assert.ok(menuLoopStart>0 && menuLoopEnd<58);
  assert.ok(Math.abs((menuLoopEnd-menuLoopStart)*110/60-96)<.06);
});
