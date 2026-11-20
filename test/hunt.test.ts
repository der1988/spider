import assert from 'node:assert/strict';
import test from 'node:test';
import {capStrands,createHunt,HEIGHT,LIMIT,platforms,ROUND,spawn,tickHunt,WEB_SECONDS,WIDTH} from '../src/hunt.ts';
import {createSpider,queueJump,shoot,tickSpider} from '../src/spider.ts';

const dt=1/120;
const far={x:345,y:187};
const wire=(x:number,y:number,end:number)=>({from:{x,y},to:{x,y:end},shakeUntil:0});

test('a visible web with room to turn is avoided rather than entered immediately',()=>{
  const hunt=createHunt(0);
  hunt.strands.push(wire(105,62,95));
  let detoured=false;
  for(let i=0;i<200;i++) {
    tickHunt(hunt,far,dt);
    if(hunt.fly.target!==1) detoured=true;
  }
  assert.ok(detoured);
  assert.equal(hunt.score,0);
  assert.equal(hunt.phase,'hunting');
});

test('an obstructed committed run is caught, scores once, and spawns a single next fly at sixty',()=>{
  const hunt=createHunt(0);
  hunt.fly.p={x:89,y:79};
  hunt.fly.v={x:72,y:0};
  hunt.fly.locked=.22;
  hunt.strands.push(wire(96,58,151),wire(79,58,151));
  for(let i=0;i<25 && hunt.phase==='hunting';i++) tickHunt(hunt,{x:82,y:80},dt);
  assert.equal(hunt.score,1);
  assert.equal(hunt.phase,'caught');
  assert.equal(hunt.fly.p.x,96);
  assert.ok(hunt.strands[0].shakeUntil>hunt.clock);
  const previous=hunt.fly;
  for(let i=0;i<90&&hunt.fly===previous;i++) tickHunt(hunt,far,dt);
  assert.notEqual(hunt.fly,previous);
  assert.equal(hunt.phase,'hunting');
  assert.equal(hunt.time,ROUND);
  assert.equal(hunt.score,1);
  assert.equal(hunt.strands.length,0);
});

test('at capacity the oldest strand is retired and a fresh round starts clean',()=>{
  const hunt=createHunt(0);
  hunt.strands=Array.from({length:LIMIT+1},(_,i)=>wire(i,70,145));
  const first=hunt.strands[0];
  assert.ok(capStrands(hunt));
  assert.equal(hunt.retired?.strand,first);
  assert.equal(hunt.strands.length,LIMIT);
  hunt.time=.012;
  tickHunt(hunt,far,dt);
  assert.equal(tickHunt(hunt,far,dt),'over');
  for(let i=0;i<100;i++) tickHunt(hunt,far,dt);
  assert.equal(hunt.phase,'over');
  const restarted=createHunt();
  assert.equal(restarted.strands.length,0);
  assert.equal(restarted.time,60);
  assert.equal(restarted.score,0);
});

test('L1 released during ascent cuts the jump and holding does not auto-jump on landing',()=>{
  const floor=[{x:0,y:100,w:200,h:7}];
  function apex(hold:number) {
    const spider=createSpider({x:40,y:92});
    tickSpider(spider,floor,{move:0,reel:false},dt);
    queueJump(spider);
    let y=spider.y;
    let jumps=0;
    for(let i=0;i<180;i++){
      jumps+=Number(tickSpider(spider,floor,{move:0,reel:false,jumpHeld:i<hold},dt,{jumpSpeed:130}));
      y=Math.min(y,spider.y);
    }
    assert.equal(jumps,1);
    return y;
  }
  assert.ok(apex(6)-apex(120)>10);
});

test('approaching from above can send a fly into a strand it otherwise avoids',()=>{
  const make=()=>{
    const hunt=createHunt(0);
    hunt.fly.p={x:72,y:79};
    hunt.fly.v={x:44,y:0};
    hunt.fly.locked=0;
    hunt.strands=[{from:{x:91,y:60},to:{x:40,y:197},shakeUntil:0}];
    return hunt;
  };
  const quiet=make();
  const pressed=make();
  for(let i=0;i<110;i++){
    tickHunt(quiet,far,dt);
    tickHunt(pressed,{x:82,y:45},dt);
  }
  assert.equal(quiet.score,0);
  assert.equal(pressed.score,1);
});


test('a thread stops trapping at the end of its ten seconds',()=>{
  const hunt=createHunt(0);
  hunt.strands=[{...wire(90,60,140),expiresAt:WEB_SECONDS}];
  hunt.clock=WEB_SECONDS-.015;
  hunt.fly.p={x:89.45,y:79};
  hunt.fly.v={x:65,y:0};
  hunt.fly.locked=.25;
  tickHunt(hunt,far,.005);
  assert.equal(hunt.strands.length,1);
  tickHunt(hunt,far,.011);
  assert.equal(hunt.strands.length,0);
  assert.equal(hunt.score,0);
});

test('all four arena sides and the platforms accept a shot, open space misses',()=>{
  for (const [x,y,tx,ty,expected] of [
    [40,100,0,100,{x:7,y:100}],
    [315,126,WIDTH,126,{x:WIDTH-7,y:126}],
    [40,41,40,0,{x:40,y:7}],
    [40,150,40,HEIGHT,{x:40,y:197}],
    [114,82,114,51,{x:114,y:60}],
  ] as const) {
    const spider=createSpider({x,y});
    assert.ok(shoot(spider,platforms,{x:tx,y:ty}));
    assert.ok(Math.abs(spider.rope!.x-expected.x)+Math.abs(spider.rope!.y-expected.y)<.01);
  }
  assert.equal(shoot(createSpider({x:180,y:79}),platforms,{x:WIDTH,y:79}),false);
});

test('neutral and sideways pass through the thread; up catches it on descent or ascent',()=>{
  const strand={from:{x:5,y:95},to:{x:122,y:95}};
  for (const move of [0,1]) {
    const spider=createSpider({x:40,y:72});
    spider.vy=85;
    for(let i=0;i<40;i++) tickSpider(spider,[],{move,reel:false,gripThread:false},dt,undefined,[strand]);
    assert.ok(spider.y>95);
    assert.equal(spider.thread,undefined);
  }
  for (const [y,vy] of [[72,85],[102,-105]]) {
    const spider=createSpider({x:40,y});
    spider.vy=vy;
    for(let i=0;i<40&&!spider.thread;i++) {
      tickSpider(spider,[],{move:0,reel:true,gripThread:true},dt,undefined,[strand]);
    }
    assert.equal(spider.thread,strand);
    assert.ok(spider.grounded);
  }
});

test('a full charge clears half of the playable arena and medium power lands between',()=>{
  const height=(speed:number)=>{
    const spider=createSpider(spawn);
    tickSpider(spider,platforms,{move:0,reel:false},dt);
    queueJump(spider);
    let y=spider.y;
    for(let i=0;i<130;i++){
      tickSpider(spider,platforms,{move:0,reel:false},dt,{jumpSpeed:speed});
      y=Math.min(y,spider.y);
    }
    return spawn.y-y;
  };
  const short=height(65),middle=height(162.5),full=height(260);
  assert.ok(short < middle && middle < full);
  assert.ok(full > (197-7)/2);
});
