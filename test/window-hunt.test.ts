import assert from 'node:assert/strict';
import test from 'node:test';
import {advanceArena,arenaStep,createArena,type ArenaInput} from '../src/arena-run.ts';
import {createWindowHunt,cameraFor,bedroom,bedroomHeight,bedroomWidth,caughtLifetime,webLifetime,windowAnchor,stepWindowHunt,type CornerInput,type WindowRun} from '../src/window-hunt.ts';
import {createSpiderSpeech,exchanges,idleDelay,spiderLessons,startExchange,updateSpiderSpeech} from '../src/gnat-dialogue.ts';
import {createCrawler} from '../src/crawler.ts';
import {arenaLayouts} from '../src/hunt.ts';

const idle:ArenaInput=[0,0,0,0,0];

test('Endless replaces both physical and visible platforms only when a tenth capture resolves',()=>{
  const run=createArena('loop',5);
  for (const [score,index] of [[9,0],[10,1],[19,1],[20,2],[30,0]]) {
    run.hunt.score=score;
    run.hunt.phase='caught';
    run.hunt.countdown=0;
    advanceArena(run,idle);
    assert.equal(run.hunt.surfaces,arenaLayouts[index]);
  }
  const classic=createArena('loop',5,false);
  classic.hunt.score=10;
  classic.hunt.phase='caught';
  advanceArena(classic,idle);
  assert.equal(classic.hunt.surfaces,arenaLayouts[0]);
});

const controls:CornerInput={move:{x:0,y:0},jump:false,silk:false};
function run(game:WindowRun,frames:number,input:Partial<CornerInput>={}) {
  for (let i=0;i<frames;i++) stepWindowHunt(game,{...controls,...input},arenaStep,()=>{});
}

test('each new room distributes the player, the prey and the hunter at separated sites',()=>{
  let seed=23;
  const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  const playerStarts=new Set<number>(),hunterStarts=new Set<number>();
  for (let i=0;i<160;i++) {
    const game=createWindowHunt(false,undefined,random);
    assert.equal(game.gnats.length,3);
    assert.equal(game.predators.length,1);
    playerStarts.add(game.spider.x);
    hunterStarts.add(game.predators[0].body.x);
    const points=[game.spider,game.predators[0].body,...game.gnats.map(gnat=>gnat.p)];
    for (const [i,p] of points.entries()) {
      for (const q of points.slice(i+1)) assert.ok(Math.hypot(p.x-q.x,p.y-q.y)>130);
    }
  }
  assert.equal(playerStarts.size,bedroom.spawnSites.length);
  assert.ok(hunterStarts.size>3);
});

test('rooms under furniture connect to the rest of the chamber for a player-sized body',()=>{
  const step=6,width=Math.ceil(bedroomWidth/step),height=Math.ceil(bedroomHeight/step);
  const grid=new Uint8Array(width*height);
  for(let i=0;i<grid.length;i++) {
    const x=i%width*step,y=Math.floor(i/width)*step;
    if(bedroom.objects.some(r=>x>r.x-7&&x<r.x+r.w+7&&y>r.y-8&&y<r.y+r.h+8)) grid[i]=1;
  }
  const first=grid.indexOf(0),queue=[first];
  grid[first]=1;
  for(let i=0;i<queue.length;i++){
    const cell=queue[i],x=cell%width;
    for(const next of [x>0?cell-1:-1,x<width-1?cell+1:-1,cell-width,cell+width]){
      if(grid[next]!==0)continue;
      grid[next]=1;
      queue.push(next);
    }
  }
  assert.equal(grid.includes(0),false);
});

test('a fleeing insect still avoids a visible trap',()=>{
  const game=createWindowHunt(false,undefined,()=>.5);
  game.predators.length=0;
  const gnat=game.gnats[0];
  game.gnats=[gnat];
  gnat.p={x:672,y:456};
  gnat.home={...gnat.p};
  game.spider=createCrawler({x:619,y:456},game.surfaces);
  run(game,36);
  assert.ok(gnat.p.x>690);
  gnat.p={x:672,y:456};gnat.v={x:0,y:0};gnat.decideAt=0;
  game.spider=createCrawler({x:619,y:456},game.surfaces);
  game.web.strands=[{from:{x:701,y:429},to:{x:701,y:483},shakeUntil:0}];
  run(game,65);
  assert.equal(game.occupants.size,0);
  assert.ok(Math.abs(gnat.p.y-456)>19);
});

test('new webs remain alongside other webs instead of replacing them',()=>{
  const game=createWindowHunt(false,undefined,()=>.5);
  game.spider=createCrawler(bedroom.spawnSites[0],game.surfaces);
  assert.ok(windowAnchor(game));
  const existing=Array.from({length:26},(_,i)=>({from:{x:870+i*3,y:520},to:{x:870+i*3,y:620},shakeUntil:0}));
  game.web.strands=existing.slice();
  run(game,1,{silk:true});
  run(game,1);
  assert.equal(game.web.strands.length,27);
  assert.deepEqual(game.web.strands.slice(0,26),existing);
  assert.equal(game.web.strands[26].expiresAt,game.clock+webLifetime);
  game.predators.length=0;
  run(game,599);
  assert.equal(game.web.strands.length,27);
  run(game,2);
  assert.equal(game.web.strands.length,26);
});

test('letting go in midair removes the rope and cannot fix a web on a later landing',()=>{
  const game=createWindowHunt(true);
  game.surfaces=[{x:30,y:30,w:450,h:12,grip:true},{x:30,y:245,w:450,h:12,grip:true}];
  game.spider=createCrawler({x:200,y:155},game.surfaces);
  run(game,1,{silk:true,aim:{x:0,y:-1}});
  assert.ok(game.spider.rope);
  run(game,1);
  assert.equal(game.spider.rope,undefined);
  run(game,150);
  assert.ok(game.spider.grounded);
  assert.equal(game.web.strands.length,0);
});

test('idle lessons need sustained stillness and stop when the player moves',()=>{
  assert.ok(new Set([...spiderLessons,...Object.values(exchanges).flat(2)]).size>=100);
  const speech=createSpiderSpeech();
  updateSpiderSpeech(speech,20,false);
  updateSpiderSpeech(speech,20+idleDelay-.1,true);
  assert.equal(speech.cue,undefined);
  updateSpiderSpeech(speech,20+idleDelay,true);
  assert.equal(speech.cue?.text,spiderLessons[0]);
  updateSpiderSpeech(speech,28,false);
  assert.equal(speech.cue,undefined);
  updateSpiderSpeech(speech,40,true);
  assert.equal(speech.cue,undefined);
});

test('characters trade lines in order with a shared quiet gap between exchanges',()=>{
  const speech=createSpiderSpeech();
  assert.ok(startExchange(speech,1,'hunter'));
  assert.equal(speech.cue?.speaker,'hunter');
  assert.equal(speech.interlocutor,'hunter');
  assert.equal(speech.cue?.text,exchanges.hunter[0][0]);
  updateSpiderSpeech(speech,4.5,false);
  assert.equal(speech.cue?.text,exchanges.hunter[0][0]);
  assert.equal(startExchange(speech,2,'nearPrey'),false);
  updateSpiderSpeech(speech,speech.until,false);
  assert.equal(speech.interlocutor,'hunter');
  updateSpiderSpeech(speech,speech.next,false);
  assert.equal(speech.cue?.speaker,'spider');
  assert.equal(speech.cue?.text,exchanges.hunter[0][1]);
  updateSpiderSpeech(speech,speech.until,false);
  updateSpiderSpeech(speech,speech.next,false);
  assert.equal(speech.cue?.speaker,'hunter');
  assert.equal(speech.cue?.text,exchanges.hunter[0][2]);
  updateSpiderSpeech(speech,speech.until,false);
  assert.equal(speech.interlocutor,undefined);
  assert.equal(startExchange(speech,speech.next-.1,'nearPrey'),false);
  assert.ok(startExchange(speech,speech.next,'nearPrey'));
  updateSpiderSpeech(speech,speech.until,false);
  updateSpiderSpeech(speech,speech.next,false);
  assert.equal(speech.cue?.speaker,'prey');
});

test('contact picks up free and trapped insects, adding each to the trailing chain',()=>{
  const game=createWindowHunt();
  game.predators.length=0;
  const p={x:538,y:961.6};
  game.spider=createCrawler(p,game.surfaces);
  game.trail=[{...p},{x:520,y:p.y},{x:500,y:p.y}];
  const first=game.gnats[0],second=game.gnats.splice(1,1)[0];
  first.p={x:p.x+5,y:p.y};
  const wire={from:{x:543,y:932},to:{x:543,y:969},shakeUntil:0,expiresAt:game.clock+caughtLifetime};
  second.p={x:543,y:p.y};
  game.web.strands=[wire];
  game.occupants.set(wire,[second]);
  run(game,1);
  assert.equal(game.gnats.length,3);
  assert.deepEqual(game.carried,[second,first]);
  assert.equal(game.silk,2);
  assert.equal(game.catches,2);
  assert.equal(game.occupants.has(wire),false);
  run(game,36,{move:{x:1,y:0}});
  assert.ok(game.spider.x>game.carried[0].p.x && game.carried[0].p.x>game.carried[1].p.x);
});

test('web expiry frees an uncollected insect without granting points',()=>{
  const game=createWindowHunt();
  const insect=game.gnats.pop()!;
  const wire={from:{x:600,y:100},to:{x:600,y:220},shakeUntil:0,expiresAt:game.clock+webLifetime};
  game.web.strands=[wire];
  game.occupants.set(wire,[insect]);
  run(game,120);
  assert.equal(game.gnats.length,2);
  assert.equal(game.silk,0);
  run(game,483);
  assert.equal(game.gnats.length,3);
  assert.equal(game.silk,0);
  assert.equal(game.web.strands.length,0);
});

test('R2 alone lets the spider travel on a vertical web and releasing drops it',()=>{
  const game=createWindowHunt();
  game.spider=createCrawler({x:390,y:710},game.surfaces);
  const wire={from:{x:392,y:688},to:{x:392,y:748},shakeUntil:0};
  game.web.strands.push(wire);
  run(game,5,{move:{x:0,y:-1}});
  assert.equal(game.clinging,undefined);
  run(game,12,{grip:true,move:{x:0,y:-1}});
  assert.equal(game.clinging,wire);
  assert.ok(game.spider.y<706);
  run(game,1);
  assert.equal(game.clinging,undefined);
});

test('a hunter jumps a visible web but a late crossing still binds it',()=>{
  const game=createWindowHunt();
  const hunter=game.predators[0],y=961.6;
  hunter.body=createCrawler({x:450,y},game.surfaces);
  hunter.fireAt=Infinity;
  game.spider=createCrawler({x:620,y},game.surfaces);
  game.web.strands=[{from:{x:490,y:919},to:{x:490,y:969.6},shakeUntil:0}];
  run(game,1);
  assert.ok(hunter.body.vy<0);
  hunter.body=createCrawler({x:487,y},game.surfaces);
  hunter.jumpAt=game.clock+1;
  for(let i=0;i<35&&!hunter.boundUntil;i++)run(game,1);
  assert.ok(Math.abs(hunter.boundUntil-game.clock-caughtLifetime)<.001);
  assert.equal(game.occupants.size,0);
});

test('a hunter can still bind with silk and escape requires five distinct presses',()=>{
  const game=createWindowHunt();
  const hunter=game.predators[0],y=961.6;
  hunter.body=createCrawler({x:425,y},game.surfaces);
  game.spider=createCrawler({x:610,y},game.surfaces);
  for(let i=0;i<175&&!game.trapped;i++)run(game,1);
  assert.ok(game.trapped);
  run(game,6,{escape:true});
  assert.equal(game.escapeCount,1);
  for(let i=0;i<4;i++) {run(game,1);run(game,1,{escape:true});}
  assert.equal(game.trapped,false);
});

test('camera follows both axes and solid walls keep the player in the smaller room',()=>{
  const game=createWindowHunt();
  game.predators.length=0;
  game.spider=createCrawler({x:400,y:900},game.surfaces);
  const start=cameraFor(game);
  game.spider=createCrawler({x:1960,y:510},game.surfaces);
  assert.ok(cameraFor(game).x>start.x && cameraFor(game).y<start.y);
  run(game,300,{move:{x:1,y:0}});
  assert.ok(game.spider.x<=bedroomWidth-23);
  assert.equal(game.phase,'play');
});

test('jump fires on press at fixed strength and holding does not spend the air jump',()=>{
  const game=createWindowHunt(true);
  run(game,1,{jump:true,move:{x:1,y:-1}});
  assert.ok(game.spider.x>32 && game.spider.y<262);
  const launchSpeed=Math.hypot(game.spider.vx,game.spider.vy);
  run(game,12,{jump:true,move:{x:1,y:-1}});
  assert.equal(game.spider.airJump,true);
  run(game,1);
  run(game,1,{jump:true,move:{x:0,y:-1}});
  assert.equal(game.spider.airJump,false);
  assert.ok(launchSpeed>168 && launchSpeed<174);
  assert.equal(game.spider.vx,0);
});

test('active rope can shorten and lengthen while fire remains held',()=>{
  const game=createWindowHunt(true);
  game.spider=createCrawler({x:32,y:130},game.surfaces);
  const aim={x:0,y:-1};
  run(game,40,{silk:true,aim,move:aim});
  const rope=game.spider.rope!;
  const length=rope.length,y=game.spider.y;
  assert.ok(length<114);
  run(game,40,{silk:true,move:{x:0,y:1}});
  assert.equal(game.spider.rope,rope);
  assert.ok(rope.length>length+10);
  assert.ok(game.spider.y>y+10);
  assert.equal(game.web.strands.length,0);
});

test('Gnat Hunt can aim, pay out and fix silk at quadruple the old range',()=>{
  const game=createWindowHunt();
  const floor={x:50,y:608,w:1310,h:20,grip:true};
  const wall={x:1000,y:480,w:20,h:128,grip:true};
  game.surfaces=[floor,wall];
  game.predators.length=0;
  game.gnats=[];
  game.spider=createCrawler({x:400,y:600},game.surfaces);
  const aim={x:1,y:0};
  game.aim=aim;
  assert.deepEqual(windowAnchor(game),{x:1000,y:600});
  run(game,60,{silk:true,aim,move:{x:0,y:1}});
  assert.equal(game.spider.rope?.length,620);
  run(game,1);
  assert.equal(game.web.strands.length,1);
  assert.ok(Math.abs(game.web.strands[0].from.x-game.web.strands[0].to.x)>=600);

  game.surfaces=[floor,{...wall,x:1021}];
  assert.equal(windowAnchor(game),undefined);
});
