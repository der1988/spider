import assert from 'node:assert/strict';
import test from 'node:test';
import {createCrawler} from '../src/crawler.ts';
import {
  bedroomWidth, cameraFor, createOpenWorld, inDen, stepWindowHunt, worldNear,
  type WindowEvent, type WindowRun,
} from '../src/window-hunt.ts';

function step(game: WindowRun, x=0, onEvent: (event: WindowEvent) => void=()=>{}) {
  stepWindowHunt(game,{move:{x,y:0},silk:false,jump:false},1/120,onEvent);
}

function circularDelta(value: number) {
  return value-Math.round(value/bedroomWidth)*bedroomWidth;
}

test('Open World generates different, separated starts on the ring around a recognizable den',()=>{
  let state=23;
  const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  const positions=new Set<string>();
  for(let iteration=0;iteration<240;iteration++){
    const game=createOpenWorld(random);
    assert.ok(game.town);
    assert.equal(game.gnats.length,3);
    assert.ok(game.predators.length>=2);
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

test('captured prey and a seam-spanning web stay together through the join until den delivery',()=>{
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
  for(let frame=0;frame<170&&!game.delivered;frame++){
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
  assert.equal(game.carried.length,0);
  assert.equal(game.delivered,2);
  assert.deepEqual(events,['catch','catch','delivery']);
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
    if(game.delivered) break;
  }
  assert.equal(game.delivered,1);
  assert.equal(enemy.lastKnown,undefined);
  assert.equal(enemy.chaseUntil,0);
});
