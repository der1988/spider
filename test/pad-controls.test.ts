import assert from 'node:assert/strict';
import test from 'node:test';
import {samplePlayStation, silkMotion} from '../src/pad-controls.ts';

function controller(axes: number[] = [0,0,0,0], pressed: number[] = []) {
  return {axes,buttons:Array.from({length:17},(_,index) => ({
    pressed:pressed.includes(index), touched:false, value:Number(pressed.includes(index)),
  }))};
}

test('PlayStation shoulders are distinct press edges and never fire on release or reconnect', () => {
  const hotConnect = samplePlayStation(controller(undefined,[4,5]));
  assert.equal(hotConnect.jump,false);
  assert.equal(hotConnect.fire,false);
  const rest = samplePlayStation(controller(),hotConnect.shoulders);
  assert.equal(rest.jump,false);
  assert.equal(rest.fire,false);
  const shoot = samplePlayStation(controller(undefined,[5]),rest.shoulders);
  assert.equal(shoot.fire,true);
  assert.equal(shoot.jump,false);
  assert.equal(samplePlayStation(controller(undefined,[5]),shoot.shoulders).fire,false);
  const jump = samplePlayStation(controller(undefined,[4]),shoot.shoulders);
  assert.equal(jump.jump,true);
  assert.equal(jump.fire,false);
});

test('the right stick only aims, independently of movement, with center drift ignored', () => {
  const prior = samplePlayStation(controller());
  const aiming = samplePlayStation(controller([-.7,-.6,.6,.8]),prior.shoulders);
  assert.deepEqual(aiming.movement,{x:-.7,y:-.6});
  assert.deepEqual(aiming.aim,{x:.6,y:.8});
  assert.equal(aiming.fire,false);
  const release = samplePlayStation(controller([.7,0,.05,.1]),aiming.shoulders);
  assert.equal(release.aim,undefined);
  assert.equal(release.fire,false);
});

test('a swing diagonal does not detach, straight down detaches once and up reels', () => {
  assert.deepEqual(silkMotion({x:.71,y:.71},false),{down:false,detach:false,reel:false});
  assert.deepEqual(silkMotion({x:.3,y:.9},false),{down:true,detach:true,reel:false});
  assert.deepEqual(silkMotion({x:0,y:.64},true),{down:true,detach:false,reel:false});
  assert.equal(silkMotion({x:0,y:.4},true).down,false);
  assert.deepEqual(silkMotion({x:0,y:-.8},false),{down:false,detach:false,reel:true});
});
