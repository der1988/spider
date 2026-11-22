import assert from 'node:assert/strict';
import test from 'node:test';
import {createCrawler} from '../src/crawler.ts';
import {
  bedroomWidth, cameraFor, createOpenWorld, inDen, sellCatch, catchValue, stepWindowHunt, worldNear,
  type WindowEvent, type WindowRun,
} from '../src/window-hunt.ts';

function step(game: WindowRun, x=0, onEvent: (event: WindowEvent) => void=()=>{}) {
  stepWindowHunt(game,{move:{x,y:0},silk:false,jump:false},1/120,onEvent);
}

function circularDelta(value: number) {
  return value-Math.round(value/bedroomWidth)*bedroomWidth;
}

test('Open World generates different, separated starts on the ring around a recognizable shop',()=>{
  let state=23;
  const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  const positions=new Set<string>();
  for(let iteration=0;iteration<240;iteration++){
    const game=createOpenWorld(random);
    assert.ok(game.town);
    assert.equal(game.gnats.length,3);
    assert.equal(game.predators.length,3);
    assert.ok(game.gnats.some(insect=>insect.rare && insect.p.y<160));
    assert.ok(inDen(game,game.den));
    assert.ok(inDen(game,{x:game.den.x+bedroomWidth,y:game.den.y}));
    const actors=[game.spider,...game.gnats.map(fly=>fly.p),...game.predators.map(guard=>guard.body)];
    for (const [i,actor] of actors.entries()) {
      assert.ok(actors.slice(i+1).every(other=>
        Math.hypot(worldNear(actor,other.x).x-other.x,actor.y-other.y)>130));
    }
    assert.ok(game.predators.every(guard=>!inDen(game,guard.body)));
    positions.add(JSON.stringify([actors.map(({x,y})=>[x,y]),game.town.items.map(item=>item.position)]));
  }
  assert.ok(positions.size>30);
});

test('captured prey and a seam-spanning web stay together through the join until a sale',()=>{
  const game=createOpenWorld(()=>.5);
  const y=game.den.y;
  game.predators=[];
  game.spider=createCrawler({x:1980,y},game.surfaces);
  game.trail=[{x:1980,y}];
  const wire={from:{x:1994,y:y-17},to:{x:2005,y:y-35},shakeUntil:0,expiresAt:8};
  game.web.strands.push(wire);
  game.gnats=game.gnats.slice(0,2);
  game.gnats.forEach((fly,index)=>{
    fly.p={x:1988+index,y};
    fly.home={...fly.p};
    fly.v={x:0,y:0};
    fly.steering={x:0,y:0};
    fly.decideAt=Infinity;
  });
  const events: WindowEvent[]=[];
  const emit=(event: WindowEvent)=>events.push(event);
  step(game,0,emit);
  assert.equal(game.carried.length,2);
  const span=wire.to.x-wire.from.x;
  let crossed=false;
  for(let frame=0;frame<170&&!inDen(game,game.spider);frame++){
    const x=game.spider.x;
    const camera=cameraFor(game).x;
    step(game,1,emit);
    if(x>1900 && game.spider.x<100){
      crossed=true;
      assert.equal(game.carried.length,2);
      assert.equal(wire.to.x-wire.from.x,span);
      assert.ok(Math.abs(wire.from.x-game.spider.x)<25);
      assert.ok(game.carried.every(fly=>Math.abs(fly.p.x-game.spider.x)<80));
      assert.ok(Math.abs(circularDelta(cameraFor(game).x-camera))<=2);
    }
  }
  assert.ok(crossed);
  assert.equal(game.carried.length,2);
  game.carried[0].rare=false;
  game.carried[1].rare=true;
  assert.equal(catchValue(game),16);
  assert.equal(sellCatch(game),16);
  assert.equal(game.carried.length,0);
  assert.equal(game.delivered,2);
  assert.equal(game.coins,16);
  assert.deepEqual(events,['catch','catch']);
  for(let frame=0;frame<60;frame++) step(game,0,emit);
  assert.equal(game.delivered,2);
});

test('guard requires visible loot, searches the last seen location, and stays outside the den',()=>{
  const game=createOpenWorld(()=>.5);
  const y=game.den.y;
  game.spider=createCrawler({x:1980,y},game.surfaces);
  game.trail=[{x:1980,y}];
  const enemy=game.predators[0];
  game.predators=[enemy];
  enemy.body=createCrawler({x:1915,y},game.surfaces);
  enemy.origin={x:1915,y};
  const loot=game.gnats[0];
  game.gnats=[];
  step(game);
  assert.equal(enemy.lastKnown,undefined);
  assert.equal(enemy.shot,undefined);

  game.carried.push(loot);
  const screen={x:1955,y:y-45,w:4,h:65};
  game.surfaces.push(screen);
  step(game);
  assert.equal(enemy.lastKnown,undefined);
  assert.equal(enemy.shot,undefined);

  game.surfaces.pop();
  step(game);
  assert.ok(enemy.chaseUntil>game.clock);
  const lastKnown=enemy.lastKnown;
  assert.ok(lastKnown);
  game.surfaces.push(screen);
  step(game);
  assert.equal(enemy.lastKnown,lastKnown);
  game.surfaces.pop();

  enemy.fireAt=Infinity;
  enemy.shot=undefined;
  for(let frame=0;frame<300;frame++){
    step(game,1);
    assert.equal(inDen(game,enemy.body),false);
    if(inDen(game,game.spider)) break;
  }
  assert.equal(game.carried.length,1);
  assert.equal(game.delivered,0);
  assert.equal(enemy.lastKnown,undefined);
  assert.equal(enemy.chaseUntil,0);
});


test('R1 tap stays grounded, a hold attaches, and a held miss leaves support intact',()=>{
  const game=createOpenWorld(()=>.5);
  game.surfaces=[{x:0,y:350,w:500,h:16,grip:true},{x:35,y:140,w:90,h:12,grip:true}];
  game.spider=createCrawler({x:80,y:342},game.surfaces);
  game.predators=[];
  game.gnats=[];
  const input={move:{x:0,y:0},aim:{x:0,y:-1},jump:false,silk:true};
  const tick=(silk:boolean)=>stepWindowHunt(game,{...input,silk},1/120,()=>{});
  for(let i=0;i<10;i++) tick(true);
  assert.equal(game.spider.support,'floor');
  assert.equal(game.web.strands.length,0);
  tick(false);
  assert.equal(game.spider.support,'floor');
  assert.equal(game.spider.rope,undefined);
  assert.equal(game.web.strands.length,1);
  for(let i=0;i<32;i++) tick(true);
  assert.ok(game.spider.rope);
  assert.equal(game.spider.support,undefined);
  tick(false);
  game.spider=createCrawler({x:80,y:342},game.surfaces);
  input.aim={x:1,y:0};
  for(let i=0;i<32;i++) tick(true);
  assert.equal(game.spider.rope,undefined);
  assert.equal(game.spider.support,'floor');
});
