import assert from 'node:assert/strict';
import test from 'node:test';
import {difficultyAt,difficultyChanges} from '../src/difficulty.ts';

const close=(actual: number,expected: number)=>assert.ok(Math.abs(actual-expected)<1e-12);

test('speed, reaction and avoidance thresholds stack on the next fly',()=>{
  assert.deepEqual(difficultyChanges(4),[]);
  assert.equal(difficultyAt(4).cruiseSpeed,49);
  close(difficultyAt(5).cruiseSpeed,49*1.05);
  close(difficultyAt(5).escapeSpeed,75*1.05);
  assert.equal(difficultyChanges(5).length,1);
  assert.equal(difficultyAt(9).reactionTime,.17);
  close(difficultyAt(10).reactionTime,.17*.9);
  assert.equal(difficultyChanges(10).length,2);
  assert.equal(difficultyAt(19).alertRadius,47);
  const combined=difficultyAt(20);
  assert.equal(combined.duration,40);
  close(combined.cruiseSpeed,49*1.2);
  close(combined.reactionTime,.17*.9*.9);
  close(combined.alertRadius,47*1.1);
  close(combined.routeRadius,56*1.1);
  assert.equal(difficultyChanges(20).length,3);
  assert.equal(difficultyAt(200).reactionTime,.08);
});
