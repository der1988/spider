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
  assert.deepEqual(game.aim,game.fly.p);
  game.fly.p={x:45,y:45};
  stepFlyEscape(game,idle,dt,'aim');
  assert.deepEqual(game.aim,game.fly.p);
  assert.equal(game.strands.length,count);
  stepFlyEscape(game,idle,dt,'yield');
  assert.equal(game.aim,undefined);
  assert.ok(game.nextShot>=game.clock+7.99);
  const previousX=game.spider.x;
  for (let i=0;i<200;i++) stepFlyEscape(game,idle,dt,'yield');
  assert.ok(Math.abs(previousX-game.spider.x)<20);
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

test('delayed autonomous flight prediction commits a strand and the player can feint around it',()=>{
  const game=createFlyEscape(undefined,{x:319,y:165},5);
  const left={move:{x:-1,y:0},cross:false};
  const right={move:{x:1,y:0},cross:false};
  const untouched=structuredClone(game);
  for (let i=0;i<15;i++) {
    stepFlyEscape(game,left,dt,'hunt');
    stepFlyEscape(untouched,right,dt,'hunt');
  }
  assert.notEqual(game.fly.p.x,untouched.fly.p.x);
  assert.deepEqual(game.observed,untouched.observed);
  assert.deepEqual(game.spider,untouched.spider);
  for (let i=0;i<120 && !game.plan;i++) stepFlyEscape(game,left,dt,'hunt');
  const plan=game.plan;
  assert.equal(plan?.kind,'web');
  assert.ok(plan.intercept.x<game.fly.p.x-35);
  assert.ok(plan.executeAt-plan.beginsAt>.35);
  const continuing=structuredClone(game);
  const dodging=structuredClone(game);
  for (let i=0;i<90;i++) {
    stepFlyEscape(continuing,left,dt,'hunt');
    stepFlyEscape(dodging,right,dt,'hunt');
    if (continuing.clock<plan.executeAt) {
      assert.deepEqual(continuing.aim,plan.target);
      assert.deepEqual(dodging.aim,plan.target);
      assert.equal(continuing.strands.length,0);
      assert.equal(dodging.strands.length,0);
    }
  }
  assert.ok(continuing.trapped);
  assert.equal(dodging.trapped,undefined);
  assert.deepEqual(continuing.strands[0].from,dodging.strands[0].from);
  assert.deepEqual(continuing.strands[0].to,dodging.strands[0].to);
});

test('the spider commits and executes its own jump without any player movement',()=>{
  const game=createFlyEscape(undefined,{x:101,y:141},2);
  for (let i=0;i<145 && !game.plan;i++) stepFlyEscape(game,idle,dt,'hunt');
  assert.equal(game.plan?.kind,'jump');
  const target=game.plan.target;
  for (let i=0;i<90 && game.spider.support;i++) stepFlyEscape(game,idle,dt,'hunt');
  assert.equal(game.spider.support,undefined);
  assert.ok(game.spider.vy<0);
  assert.deepEqual(game.airTarget,target);
});

test('yielding gestures run on time-out and watch a real strand expire without replacing it',()=>{
  const game=createFlyEscape(undefined,undefined,5);
  game.timedOut=true;
  game.time=0;
  game.clock=150;
  stepFlyEscape(game,idle,dt,'yield','identity');
  assert.equal(game.gesture,'identity');
  assert.equal(game.plan,undefined);
  assert.equal(game.aim,undefined);
  game.clock=160;
  stepFlyEscape(game,idle,dt,'yield','decision');
  assert.ok(game.decisionAim);
  assert.equal(game.aim,undefined);
  game.clock=164;
  assert.equal(stepFlyEscape(game,idle,dt,'yield','lastWeb'),'web');
  const strand=game.lastWeb;
  assert.ok(strand?.expiresAt);
  game.clock=169;
  stepFlyEscape(game,idle,dt,'yield','watch');
  assert.equal(game.watchedStrand,strand);
  game.clock=strand.expiresAt-dt/2;
  stepFlyEscape(game,idle,dt,'yield','watch');
  assert.equal(game.watchedStrand,strand);
  assert.equal(game.strands.length,0);
  const x=game.spider.x;
  for (let i=0;i<100;i++) stepFlyEscape(game,idle,dt,'yield','stepBack');
  assert.ok(Math.abs(game.spider.x-x)>=5 && Math.abs(game.spider.x-x)<12);
  assert.equal(game.time,0);
  assert.equal(game.strands.length,0);
});

test('after giving up the spider walks in short independent patrols during timeout',()=>{
  const game=createFlyEscape(undefined,{x:320,y:165},5);
  game.time=0;
  game.timedOut=true;
  const other=structuredClone(game);
  other.fly.p={x:25,y:28};
  let walkSteps=0;
  let idleSteps=0;
  for (let i=0;i<1200;i++) {
    const old=game.spider.x;
    stepFlyEscape(game,idle,dt,'yield');
    stepFlyEscape(other,idle,dt,'yield');
    if (Math.abs(old-game.spider.x)>.02) walkSteps++;
    else idleSteps++;
    assert.deepEqual(game.spider,other.spider);
  }
  assert.ok(walkSteps>70);
  assert.ok(idleSteps>walkSteps*2);
  assert.equal(game.time,0);
  assert.equal(game.lights,0);
});

test('the spider looks around before changing direction and approaches the strand it watches',()=>{
  const game=createFlyEscape(undefined,{x:260,y:45},3);
  const start=game.spider.x;
  for(let i=0;i<100;i++) stepFlyEscape(game,idle,dt,'yield','identity');
  assert.equal(game.spider.x,start);
  for(let i=0;i<122;i++) stepFlyEscape(game,idle,dt,'yield','identity');
  assert.ok(game.spider.x<start-5);
  game.strands=[{from:{x:game.spider.x+25,y:197},to:{x:99,y:158},shakeUntil:0,expiresAt:game.clock+1}];
  const watchStart=game.spider.x;
  for(let i=0;i<65;i++) stepFlyEscape(game,idle,dt,'yield','watch');
  assert.ok(game.spider.x>watchStart+6);
});
