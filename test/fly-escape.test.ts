import assert from 'node:assert/strict';
import test from 'node:test';
import {createFlyEscape, finishFlyEscape, FLY_SECONDS, stepFlyEscape} from '../src/fly-escape.ts';
import {platforms, spawn, WEB_SECONDS} from '../src/hunt.ts';

const idle={move:{x:0,y:0},cross:false};
const dt=1/120;

test('fly moves diagonally and slides at the physical wall',()=>{
  const game=createFlyEscape(undefined,{x:40,y:65},0);
  for (let i=0;i<65;i++) stepFlyEscape(game,{move:{x:-1,y:-1},cross:false},dt,'aim');
  assert.equal(game.fly.p.x,9.5);
  assert.ok(game.fly.p.y<35);
  for (let i=0;i<70;i++) stepFlyEscape(game,{move:{x:0,y:-1},cross:false},dt,'aim');
  assert.ok(game.fly.p.y>=9.5);
});

test('each light restores exactly ten seconds and another accessible light spawns',()=>{
  const game=createFlyEscape(undefined,undefined,40);
  for (let i=0;i<55;i++) {
    game.time=(i%9)+.51;
    const previous=game.light;
    game.fly.p={...previous};
    assert.equal(stepFlyEscape(game,idle,dt,'aim'),'light');
    assert.equal(game.time,FLY_SECONDS);
    assert.equal(game.lights,i+1);
    assert.ok(game.flashUntil>game.clock);
    assert.ok(Math.hypot(game.light.x-previous.x,game.light.y-previous.y)>=36);
    assert.ok(platforms.every(r=>game.light.x<r.x-8 || game.light.x>r.x+r.w+8 ||
      game.light.y<r.y-8 || game.light.y>r.y+r.h+8));
  }
});

test('the hunter intercepts, holds a shot, then gives room and fires away from the fly',()=>{
  const game=createFlyEscape(undefined,{x:310,y:181},5);
  for (let i=0;i<280;i++) stepFlyEscape(game,idle,dt,'hunt');
  assert.ok(game.spider.x>spawn.x+45);
  assert.ok(game.strands.length>0);
  assert.ok(game.strands.every(s=>s.expiresAt!==undefined && s.expiresAt<=game.clock+WEB_SECONDS));
  const count=game.strands.length;
  stepFlyEscape(game,idle,dt,'aim');
  const held=game.aim;
  assert.ok(held);
  game.fly.p={x:45,y:45};
  stepFlyEscape(game,idle,dt,'aim');
  assert.deepEqual(game.aim,held);
  assert.equal(game.strands.length,count);
  stepFlyEscape(game,idle,dt,'yield');
  assert.equal(game.aim,undefined);
  assert.ok(game.nextShot>=game.clock+7.99);
  const previousX=game.spider.x;
  for (let i=0;i<200;i++) stepFlyEscape(game,idle,dt,'yield');
  assert.ok(Math.abs(previousX-game.spider.x)<12);
  assert.equal(game.aim,undefined);
  const peers=[structuredClone(game),structuredClone(game)];
  peers[0].fly.p={x:23,y:23};
  peers[1].fly.p={x:323,y:175};
  for (const peer of peers) {
    peer.timedOut=false;
    peer.time=FLY_SECONDS;
    peer.clock=peer.nextShot;
    peer.strands=[];
    assert.equal(stepFlyEscape(peer,idle,dt,'yield'),'web');
  }
  assert.deepEqual(peers[0].strands,peers[1].strands);
});

test('threads trap on crossing, and three distinct presses free the fly',()=>{
  const game=createFlyEscape(undefined,{x:35,y:70},0);
  game.strands.push({from:{x:45,y:55},to:{x:45,y:99},shakeUntil:0});
  for (let i=0;i<40 && !game.trapped;i++) stepFlyEscape(game,{move:{x:1,y:0},cross:false},dt,'aim');
  assert.ok(game.trapped);
  const x=game.fly.p.x;
  stepFlyEscape(game,{move:{x:1,y:0},cross:false},dt,'aim');
  assert.equal(game.fly.p.x,x);
  for (let i=0;i<2;i++) stepFlyEscape(game,{...idle,cross:true},dt,'aim');
  assert.equal(stepFlyEscape(game,{...idle,cross:true},dt,'aim'),'escape');
  assert.equal(game.trapped,undefined);
  for (let i=0;i<12;i++) stepFlyEscape(game,{move:{x:1,y:0},cross:false},dt,'aim');
  assert.ok(game.fly.p.x>x);
});

test('timeout retries locally, and the final lock lets the fly cross a light without changing the outcome',()=>{
  const game=createFlyEscape(undefined,undefined,0);
  game.time=.001;
  assert.equal(stepFlyEscape(game,idle,dt,'aim'),'timeout');
  assert.equal(game.time,0);
  assert.equal(stepFlyEscape(game,{...idle,cross:true},dt,'aim'),'retry');
  assert.equal(game.time,10);
  game.time=3.25;
  game.fly.p={x:31,y:27};
  game.light={x:42,y:27};
  finishFlyEscape(game);
  const snapshot=structuredClone(game);
  for (let i=0;i<32;i++) stepFlyEscape(game,{move:{x:1,y:0},cross:true},dt,'hunt');
  assert.ok(game.fly.p.x>game.light.x);
  assert.equal(game.time,snapshot.time);
  assert.deepEqual(game.light,snapshot.light);
  assert.equal(game.lights,snapshot.lights);
  assert.equal(game.clock,snapshot.clock);
  assert.deepEqual(game.spider,snapshot.spider);
});
