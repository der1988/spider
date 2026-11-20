import assert from 'node:assert/strict';
import test from 'node:test';
import {AimGesture} from '../src/aim-gesture.ts';

test('the gesture ignores center noise and fires on release using the last valid angle', () => {
  const gesture = new AimGesture();
  assert.equal(gesture.sample({x:.17,y:-.09},0),undefined);
  assert.equal(gesture.aiming,false);
  assert.equal(gesture.sample({x:0,y:-.8},5),undefined);
  assert.equal(gesture.aiming,true);
  assert.equal(gesture.sample({x:-.6,y:.8},10),undefined);
  assert.equal(gesture.sample({x:.22,y:0},20),undefined);
  assert.deepEqual(gesture.sample({x:.08,y:0},30),{x:-.6,y:.8});
  assert.equal(gesture.aiming,false);
});

test('stick bounce cannot fire twice, a neutral pause allows a second air launch', () => {
  const gesture = new AimGesture();
  gesture.sample({x:1,y:0},0);
  assert.ok(gesture.sample({x:0,y:0},16));
  assert.equal(gesture.sample({x:-.55,y:0},40),undefined);
  assert.equal(gesture.sample({x:0,y:0},56),undefined);
  assert.equal(gesture.sample({x:.37,y:0},115),undefined);
  assert.equal(gesture.sample({x:0,y:0},130),undefined);
  assert.equal(gesture.sample({x:0,y:0},247),undefined);
  assert.equal(gesture.aiming,false);
  gesture.sample({x:0,y:1},265);
  assert.deepEqual(gesture.sample({x:0,y:0},280),{x:0,y:1});
  gesture.reset(true);
  gesture.sample({x:.95,y:0},300);
  assert.equal(gesture.sample({x:0,y:0},320),undefined);
});
