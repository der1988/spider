import assert from 'node:assert/strict';
import test from 'node:test';
import {createCrawler} from '../src/crawler.ts';
import {createOpenWorld,pantryTiers,pantryX,preyTier,restartOpenWorld,stepWindowHunt,updateHuntZoom,cameraFor,shaftWidth,shaftHeight} from '../src/window-hunt.ts';

const idle={move:{x:0,y:0},jump:false,silk:false};

test('the shaft has distinct altitude bands, four guards and a smooth live zoom',()=>{
  const game=createOpenWorld(()=>.5);
  assert.ok(shaftHeight>shaftWidth);
  assert.equal(game.gnats.length,10);
  assert.ok(game.gnats.some(fly=>fly.rare && fly.p.y<265));
  assert.ok(game.gnats.some(fly=>fly.uncommon));
  assert.equal(game.predators.filter(enemy=>enemy.bee).length,2);
  assert.equal(game.predators.filter(enemy=>!enemy.bee).length,2);
  updateHuntZoom(game,true,.05);
  const scale=cameraFor(game).scale;
  assert.ok(scale<1.16 && scale>.62);
  const clock=game.clock;
  stepWindowHunt(game,idle,1/120,()=>{});
  assert.ok(game.clock>clock);
  updateHuntZoom(game,false,.05);
  assert.ok(cameraFor(game).scale>scale);
});

test('both guard types acquire only visible cargo and the prey remains in the chain',()=>{
  for(const bee of [false,true]){
    const game=createOpenWorld(()=>.5);
    game.surfaces=[{x:0,y:500,w:900,h:20,grip:true}];
    game.spider=createCrawler({x:350,y:492},game.surfaces);
    const enemy=game.predators.find(guard=>guard.bee===bee)!;
    game.predators=[enemy];enemy.body=createCrawler({x:200,y:492},game.surfaces);
    const [fly]=game.gnats; game.gnats=[];
    stepWindowHunt(game,idle,1/120,()=>{});
    assert.equal(enemy.lastKnown,undefined);
    game.carried.push(fly);
    game.surfaces.push({x:275,y:435,w:10,h:65});
    stepWindowHunt(game,idle,1/120,()=>{});
    assert.equal(enemy.lastKnown,undefined);
    game.surfaces.pop();
    stepWindowHunt(game,idle,1/120,()=>{});
    assert.ok(enemy.chaseUntil>game.clock);
    assert.equal(game.carried.length,1);
    assert.equal(game.speech.queue.length,0);
  }
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

test('Cross eats one caught insect and guards settle when they see the player with no evidence',()=>{
  const game=createOpenWorld(()=>.5);
  const y=1088;
  game.spider=createCrawler({x:340,y},game.surfaces);
  const [guard]=game.predators;
  game.predators=[guard]; guard.body=createCrawler({x:230,y},game.surfaces);
  guard.fireAt=Infinity;
  game.carried=game.gnats.splice(0,1);
  const eat={...idle,escape:true};
  stepWindowHunt(game,eat,1/120,()=>{});
  assert.equal(game.carried.length,0);
  assert.ok(game.eatingUntil>game.clock);
  assert.ok(guard.chaseUntil>game.clock);
  const wall={x:280,y:990,w:9,h:106};
  game.surfaces=[...game.surfaces,wall];
  game.clock=game.eatingUntil+.1;
  stepWindowHunt(game,eat,1/120,()=>{});
  assert.ok(guard.chaseUntil>game.clock);
  game.surfaces.pop();
  stepWindowHunt(game,idle,1/120,()=>{});
  assert.equal(guard.chaseUntil,0);
});

test('crossing a web slows an open world bee without stopping or removing it',()=>{
  const game=createOpenWorld(()=>.5);
  const bee=game.predators.find(enemy=>enemy.bee)!;
  game.predators=[bee]; bee.body=createCrawler({x:300,y:820},game.surfaces);
  bee.plan={x:350,y:820}; bee.planAt=99;
  game.web.strands.push({from:{x:300.3,y:808},to:{x:300.3,y:835},shakeUntil:0});
  stepWindowHunt(game,idle,1/120,()=>{});
  assert.ok(bee.slowedUntil>game.clock);
  const x=bee.body.x;
  stepWindowHunt(game,idle,1/120,()=>{});
  assert.ok(bee.body.x>x && bee.body.x-x<.4);
  assert.equal(game.predators.length,1);
});

test('three different prey finish the hunt only after returning them to the nest',()=>{
  const game=createOpenWorld(()=>.5);
  const events:string[]=[];
  const emit=(event:string)=>events.push(event);
  game.predators=[];
  const take=(tier:typeof pantryTiers[number])=>game.gnats.splice(game.gnats.findIndex(prey=>preyTier(prey)===tier),1)[0];
  game.carried=[take('common'),take('common')];
  game.spider=createCrawler({x:pantryX+70,y:1088},game.surfaces);
  stepWindowHunt(game,idle,1/120,emit);
  assert.equal(game.pantry.common,false);
  assert.equal(game.carried.length,2);
  game.spider=createCrawler({x:pantryX,y:1088},game.surfaces);
  stepWindowHunt(game,idle,1/120,emit);
  assert.equal(game.pantry.common,true);
  assert.equal(game.carried.length,0);
  assert.equal(game.phase,'play');
  game.carried=[take('uncommon'),take('rare')];
  stepWindowHunt(game,idle,1/120,emit);
  assert.equal(game.phase,'complete');
  assert.deepEqual(game.pantry,{common:true,uncommon:true,rare:true});
  stepWindowHunt(game,idle,1/120,emit);
  assert.deepEqual(events,['store','complete']);
});

test('retry keeps nest supplies and layout while eaten prey can return',()=>{
  const game=createOpenWorld(()=>.5);
  game.pantry.common=true;
  game.spider=createCrawler({x:120,y:1088},game.surfaces);
  game.predators=[];
  const rare=game.gnats.splice(game.gnats.findIndex(prey=>prey.rare),1)[0];
  game.carried=[rare];
  stepWindowHunt(game,{...idle,escape:true},1/120,()=>{});
  assert.ok(game.returningPrey.some(({insect})=>insect===rare));
  game.clock+=4.1;
  stepWindowHunt(game,idle,1/120,()=>{});
  assert.ok(game.gnats.includes(rare));
  game.phase='over';
  const retry=restartOpenWorld(game);
  assert.equal(retry.corner,game.corner);
  assert.deepEqual(retry.pantry,game.pantry);
  assert.notEqual(retry.pantry,game.pantry);
  assert.equal(retry.spider.x,pantryX);
  assert.equal(retry.carried.length,0);
  assert.equal(retry.phase,'play');
});
