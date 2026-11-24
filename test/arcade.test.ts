import assert from 'node:assert/strict';
import test from 'node:test';
import {advanceArcade,arcadeEscapeButton,arcadeEscapePresses,arcadeLayouts,arcadeWebLimit,createArcade} from '../src/arcade.ts';
import {arcadeGround,arcadeScenes} from '../src/arcade-scenery.ts';
import {sweptHit} from '../src/threads.ts';
import {arenaInput,arenaStep,releaseSilkButton} from '../src/arena-run.ts';
import {arcadeLevels,campaign,insectMark,levelIntroDuration} from '../src/arcade-dialogue.ts';

const neutral=arenaInput({x:0,y:0});
const right=arenaInput({x:1,y:0});
function ticks(run:ReturnType<typeof createArcade>,seconds:number) {
  for (let i=0;i<Math.round(seconds/arenaStep);i++) advanceArcade(run,neutral);
}

function start(run:ReturnType<typeof createArcade>) {
  advanceArcade(run,right);
  skip(run);
}
function skip(run:ReturnType<typeof createArcade>) {
  const cross=arenaInput({x:0,y:0});
  cross[4]=arcadeEscapeButton;
  ticks(run,.45);
  advanceArcade(run,cross);
  assert.equal(run.intro,undefined);
}

function putNextToSpider(run:ReturnType<typeof createArcade>) {
  const {spider}=run.movement;
  const fly=run.flies[0];
  fly.p={x:spider.x+4,y:spider.y-4};
  return fly;
}

function parkFly(run:ReturnType<typeof createArcade>,x=73,y=26) {
  const fly=run.flies[0];
  Object.assign(fly,{p:{x,y},target:{x,y},v:{x:0,y:0},phase:'patrol',phaseAt:100,aimAt:100,age:5});
  return fly;
}

test('all ten encounters have their own dialogue, insect names and silhouettes, and freeze time',()=>{
  assert.equal(arcadeLevels,10);
  const names=campaign.flatMap(level=>level.insects.map(([name])=>name));
  assert.equal(new Set(names).size,names.length);
  const shapes=campaign.flatMap((level,index)=>level.insects.map(([,kind],slot)=>kind+':'+insectMark(index+1,slot)));
  assert.equal(new Set(shapes).size,names.length);
  assert.equal(new Set(campaign.flatMap(({line,reply,closing})=>[line,reply,closing])).size,30);
  assert.equal(new Set(arcadeLayouts.map(layout=>JSON.stringify(layout))).size,10);
  for (let level=1;level<=arcadeLevels;level++) {
    const run=createArcade(level);
    advanceArcade(run,right);
    ticks(run,levelIntroDuration(level)-.1);
    assert.ok(run.intro);
    assert.equal(run.clock,0);
    for (let frame=0;run.intro && frame<30;frame++) advanceArcade(run,neutral);
    assert.equal(run.intro,undefined);
    advanceArcade(run,neutral);
    assert.ok(run.clock>0);
    assert.equal(run.phase,level===10 ? 'boss' : 'wave');
  }
});

test('a free insect causes one contact injury, then the same prey must be trapped and retrieved',()=>{
  const run=createArcade();
  advanceArcade(run,arenaInput({x:.3,y:0},{x:0,y:.35}));
  assert.equal(run.phase,'ready');
  start(run);
  const fly=putNextToSpider(run);
  const events:string[]=[];
  for (let index=0;index<10;index++) advanceArcade(run,neutral,event=>events.push(event));
  assert.deepEqual(events,['hurt']);
  assert.equal(run.lives,2);
  assert.equal(run.flies[0],fly);
  assert.equal(run.score,0);
  putNextToSpider(run).caughtUntil=run.clock+1;
  advanceArcade(run,neutral);
  assert.equal(run.score,1);
  assert.equal(run.level,2);
  assert.equal(run.lives,2);
  assert.equal(run.intro?.kind,'level');
});

test('silk catches the first gnat, which escapes from the exact caught position when the deadline passes',()=>{
  const run=createArcade();
  start(run);
  advanceArcade(run,arenaInput({x:0,y:0},{x:.75,y:-.8},false,true));
  advanceArcade(run,[0,0,0,0,releaseSilkButton]);
  ticks(run,.8);
  const fly=run.flies[0],point={...fly.p};
  assert.ok(fly.caughtUntil>run.clock);
  assert.ok(fly.trappedBy);
  while (fly.caughtUntil) advanceArcade(run,neutral);
  assert.deepEqual(fly.p,point);
  assert.equal(run.score,0);
  assert.equal(run.flies[0],fly);
  advanceArcade(run,neutral);
  assert.notDeepEqual(fly.p,point);
  assert.equal(fly.caughtUntil,0);
});

test('mirrored direct shots push the cocoon along the incoming silk before it lands and escapes',()=>{
  for (const sign of [-1,1]) {
    const run=createArcade();
    start(run);
    const spider=run.movement.spider;
    const x=sign===1 ? 52 : 210,y=183;
    Object.assign(spider,{x,y,vx:0,vy:0,support:undefined,grounded:false});
    const fly=parkFly(run,x+sign*58,y+1);
    const contactX=fly.p.x,events:string[]=[];
    advanceArcade(run,arenaInput({x:0,y:0},{x:sign,y:0},false,true),event=>events.push(event));
    for (let i=0;i<30 && !fly.cocoon;i++) advanceArcade(run,neutral,event=>events.push(event));
    assert.ok(fly.cocoon);
    assert.ok(fly.v.x*sign>100);
    assert.equal(run.movement.hunt.strands.length,0);
    assert.equal(spider.rope,undefined);
    assert.deepEqual(events,['launch','catch']);
    assert.equal(run.score,0);
    ticks(run,.65);
    assert.ok((fly.p.x-contactX)*sign>16);
    assert.equal(fly.p.y,arcadeGround-5);
    assert.ok(fly.cocoon.landed);
    let landing=fly.p;
    while (fly.caughtUntil) {landing=fly.p;advanceArcade(run,neutral);}
    assert.equal(run.flies[0],fly);
    assert.deepEqual(fly.p,landing);
    assert.equal(run.score,0);
    ticks(run,.15);
    assert.ok(fly.p.y<landing.y);
  }
});

test('the nearest free fly stops the shot, and picking up its cocoon counts once',()=>{
  const run=createArcade(4);
  start(run);
  const spider=run.movement.spider;
  Object.assign(spider,{x:159,y:193,vx:0,vy:0,support:undefined,grounded:false});
  const near=parkFly(run,192,194),far=run.flies[1];
  Object.assign(far,{...near,p:{x:216,y:195},target:{x:216,y:195},v:{x:0,y:0},actor:1});
  run.flies=[far,near];
  advanceArcade(run,arenaInput({x:0,y:0},{x:1,y:0},false,true));
  ticks(run,.6);
  assert.ok(near.cocoon?.landed);
  assert.equal(far.cocoon,undefined);
  assert.equal(run.score,0);
  Object.assign(spider,{x:near.p.x,y:209,vx:0,vy:0,support:'floor',grounded:true});
  advanceArcade(run,neutral);
  assert.equal(run.score,1);
  assert.deepEqual(run.flies,[far]);
});

test('the first solid shields a fly just behind it',()=>{
  const run=createArcade(6);
  start(run);
  const spider=run.movement.spider;
  Object.assign(spider,{x:52,y:192,vx:0,vy:0,support:undefined,grounded:false});
  const fly=parkFly(run,110,193);
  advanceArcade(run,arenaInput({x:0,y:0},{x:1,y:0},false,true));
  ticks(run,.4);
  assert.equal(fly.cocoon,undefined);
  assert.equal(run.score,0);
});

test('scenes have open skies and distinct perches with a stable starting point',()=>{
  assert.equal(new Set(arcadeScenes.map(scene=>scene.name)).size,arcadeLevels);
  assert.equal(arcadeLayouts.length,arcadeLevels);
  for (const [i,surfaces] of arcadeLayouts.entries()) {
    const run=createArcade(i+1);
    assert.equal(run.movement.spider.support,'floor');
    assert.equal(run.movement.hunt.surfaces,surfaces);
    assert.ok(surfaces.every(perch=>perch.y>=32));
    assert.ok(surfaces.some(perch=>perch.w<=55 && perch.y+perch.h<arcadeGround));
    assert.ok(surfaces.filter(perch=>perch.y<arcadeGround).every(perch=>perch.w<100));
  }
});

test('the last heart sends the player straight back to level one with three hearts',()=>{
  const run=createArcade(8);
  start(run);
  run.lives=1;
  run.score=12;
  putNextToSpider(run);
  const losses:string[]=[];
  advanceArcade(run,neutral,event=>losses.push(event));
  assert.deepEqual(losses,['hurt']);
  assert.equal(run.lives,0);
  assert.ok(run.restartIn>0);
  ticks(run,1.05);
  assert.equal(run.level,1);
  assert.equal(run.lives,3);
  assert.equal(run.score,0);
  assert.equal(run.intro?.kind,'level');
});

test('Endless ignores fixed webs as footholds and lets the active rope reel or pay out',()=>{
  const run=createArcade(),spider=run.movement.spider;
  const up=arenaInput({x:0,y:-1});
  start(run);
  run.movement.hunt.strands.push({from:{x:7,y:183},to:{x:393,y:183},shakeUntil:0});
  Object.assign(spider,{x:150,y:168,vy:80,support:undefined,grounded:false});
  for (let i=0;i<22;i++) advanceArcade(run,up);
  assert.ok(spider.y>183);
  assert.equal(spider.thread,undefined);
  Object.assign(spider,{x:110,y:150,vx:0,vy:0,support:undefined,grounded:false,rope:{x:90,y:63,length:90}});
  for (let i=0;i<15;i++) advanceArcade(run,up);
  const reeled=spider.rope!.length;
  assert.ok(reeled<90);
  const down=arenaInput({x:0,y:1});
  for (let i=0;i<15;i++) advanceArcade(run,down);
  assert.ok(spider.rope!.length>reeled);
});

test('each full roster advances exactly one level and the tenth opens directly on the rival',()=>{
  const run=createArcade();
  start(run);
  for (let level=1;level<=9;level++) {
    assert.equal(run.level,level);
    assert.equal(run.flies.length,campaign[level-1].insects.length);
    while (run.level===level) {
      putNextToSpider(run).caughtUntil=run.clock+1;
      advanceArcade(run,neutral);
    }
    skip(run);
  }
  assert.equal(run.level,10);
  assert.equal(run.phase,'boss');
  assert.equal(run.flies.length,0);
  assert.equal(run.boss?.phase,'warn');
});

test('a free insect avoids the net, winds up and becomes catchable after committing',()=>{
  const run=createArcade();
  start(run);
  const fly=run.flies[0],wire={from:{x:94,y:170},to:{x:94,y:217},shakeUntil:0};
  Object.assign(fly,{p:{x:118,y:190},target:{x:118,y:190},phaseAt:0,age:2});
  run.movement.hunt.strands=[wire];
  advanceArcade(run,neutral);
  assert.equal(fly.phase,'patrol');
  assert.equal(sweptHit(fly.p,fly.target,wire),undefined);
  run.movement.hunt.strands=[];
  for (let frame=0;fly.phase!=='strike' && frame<220;frame++) advanceArcade(run,neutral);
  assert.equal(fly.phase,'strike');
  run.movement.hunt.strands=[wire];
  for (let frame=0;!fly.caughtUntil && frame<100;frame++) advanceArcade(run,neutral);
  assert.ok(fly.caughtUntil);
  assert.equal(fly.trappedBy,wire);
  const {spider}=run.movement;
  spider.x=fly.p.x;
  spider.y=fly.p.y;
  advanceArcade(run,neutral);
  assert.equal(run.score,1);
});

test('R1 tap only fixes silk, keeping the newest three distinct webs',()=>{
  const run=createArcade();
  start(run);
  const {hunt,spider}=run.movement;
  const webs=Array.from({length:arcadeWebLimit},(_,i)=>({from:{x:230+i*10,y:40},to:{x:230+i*10,y:80},shakeUntil:0,expiresAt:5}));
  hunt.strands=[...webs];
  const cast=arenaInput({x:0,y:0},{x:.75,y:-.8},false,true);
  const release:[number,number,number,number,number]=[0,0,0,0,releaseSilkButton];
  const fly=run.flies[0];
  fly.trappedBy=webs[0];fly.caughtUntil=run.clock+4;
  advanceArcade(run,cast);
  ticks(run,.06);
  assert.equal(spider.rope,undefined);
  assert.deepEqual(hunt.strands,webs);
  advanceArcade(run,release);
  assert.equal(spider.rope,undefined);
  ticks(run,.38);
  assert.equal(hunt.loose.length,0);
  assert.equal(hunt.strands.length,arcadeWebLimit);
  assert.deepEqual(hunt.strands.slice(0,2),webs.slice(1));
  assert.ok(!webs.includes(hunt.strands[2]));
  assert.equal(fly.caughtUntil,0);
  const newest=hunt.strands.slice();
  advanceArcade(run,cast);
  advanceArcade(run,release);
  ticks(run,.38);
  assert.deepEqual(hunt.strands,newest);
});

test('holding R1 on the floor still fixes a web, while a held airborne shot reels and detaches',()=>{
  const run=createArcade();
  start(run);
  parkFly(run);
  const {hunt,spider}=run.movement;
  advanceArcade(run,towardWeb);
  ticks(run,.39);
  assert.equal(spider.rope,undefined);
  assert.equal(hunt.strands.length,1);
  advanceArcade(run,silkRelease);
  const web=existingWeb(run);
  advanceArcade(run,towardWeb);
  advanceArcade(run,arenaInput({x:0,y:0},undefined,true));
  for (let i=0;i<80 && !spider.rope;i++) advanceArcade(run,neutral);
  assert.equal(run.ropeWeb,web);
  const length=spider.rope!.length;
  ticks(run,.12);
  assert.equal(spider.rope?.length,length);
  for (let i=0;i<18;i++) advanceArcade(run,arenaInput({x:0,y:-1}));
  assert.ok(spider.rope!.length<length);
  advanceArcade(run,silkRelease);
  assert.equal(spider.rope,undefined);
  assert.deepEqual(hunt.strands,[web]);
});

test('directional jumps use screen axes at the wall and right-stick aim when movement is neutral',()=>{
  for (const [side,move,aim,sign] of [
    ['left',{x:0,y:1},undefined,1],
    ['right',{x:0,y:0},{x:0,y:-1},-1],
  ] as const) {
    const run=createArcade();
    start(run);
    const spider=run.movement.spider;
    Object.assign(spider,{x:side==='left' ? 14 : 386,y:155,support:side,grounded:true});
    advanceArcade(run,arenaInput(move,aim,true));
    assert.equal(spider.support,undefined);
    assert.ok(spider.vy*sign>150);
    assert.ok(Math.abs(spider.vx)<1);
  }
});

test('silk heads travel and slow on a miss, with a longer connection in midair',()=>{
  const run=createArcade();
  start(run);
  parkFly(run);
  const spider=run.movement.spider;
  const shoot=arenaInput({x:0,y:0},{x:1,y:0},false,true);
  const release:[number,number,number,number,number]=[0,0,0,0,releaseSilkButton];
  Object.assign(spider,{x:52,y:130,support:undefined,grounded:false});
  advanceArcade(run,shoot);
  const shot=run.silkShots[0],early=shot.v.x;
  advanceArcade(run,release);
  ticks(run,.42);
  assert.equal(run.silkShots[0],shot);
  assert.ok(shot.p.x>180 && shot.v.x<early/2);
  assert.equal(spider.rope,undefined);
  ticks(run,.75);
  assert.equal(run.silkShots.length,0);
  assert.equal(run.movement.hunt.strands.length,0);

  Object.assign(spider,{x:91,y:143,vx:0,vy:-92,support:undefined,grounded:false});
  advanceArcade(run,shoot);
  for (let i=0;i<130 && !spider.rope;i++) advanceArcade(run,neutral);
  assert.ok(spider.rope);
  assert.ok(spider.rope.x>=286 && spider.rope.x<=327);
  assert.ok(spider.rope.length>155);
  assert.ok(spider.y<209);
});

test('horizontal jumps from the floor gain enough lift to clear it',()=>{
  for (const x of [-1,1]) {
    const run=createArcade();
    start(run);
    advanceArcade(run,arenaInput({x,y:0},undefined,true));
    ticks(run,.1);
    const spider=run.movement.spider;
    assert.ok(spider.y<201);
    assert.ok((spider.x-52)*x>12 && (spider.x-52)*x<17);
  }
});

const silkRelease=arenaInput({x:0,y:0});
silkRelease[4]=releaseSilkButton;
const towardWeb=arenaInput({x:0,y:0},{x:.75,y:-.8},false,true);
function existingWeb(run:ReturnType<typeof createArcade>) {
  const web={from:{x:77,y:125},to:{x:150,y:167},shakeUntil:0,expiresAt:5};
  run.movement.hunt.strands=[web];
  return web;
}

test('the same shot joins a web from a surface and becomes a rope after takeoff',()=>{
  const run=createArcade();
  start(run);
  parkFly(run);
  const {hunt,spider}=run.movement,web=existingWeb(run);
  advanceArcade(run,towardWeb);
  advanceArcade(run,silkRelease);
  ticks(run,.45);
  assert.equal(hunt.strands.length,2);
  const {from,to,parent}=hunt.strands[1];
  assert.equal(parent,web);
  assert.ok(Math.abs((from.y-web.from.y)*(web.to.x-web.from.x)-(from.x-web.from.x)*(web.to.y-web.from.y))<1e-5);
  assert.ok(from.x>web.from.x && from.x<web.to.x);
  assert.ok(Math.abs(to.x-from.x)>2 && Math.abs(to.y-from.y)>2);
  hunt.strands=[web];
  advanceArcade(run,towardWeb);
  advanceArcade(run,arenaInput({x:0,y:0},undefined,true));
  advanceArcade(run,silkRelease);
  for (let i=0;i<70 && !spider.rope;i++) advanceArcade(run,neutral);
  assert.equal(run.ropeWeb,web);
  assert.ok(spider.rope);
  ticks(run,.12);
  assert.ok(spider.rope);
  assert.deepEqual(hunt.strands,[web]);
  advanceArcade(run,arenaInput({x:0,y:0},undefined,true));
  assert.equal(spider.rope,undefined);
  assert.equal(hunt.loose.length,0);
});

test('vertical and near-horizontal fixed strands are rejected',()=>{
  for (const aim of [{x:0,y:-1},{x:1,y:0}]) {
    const run=createArcade();
    start(run);
    if (aim.x) {
      Object.assign(run.movement.spider,{x:14,y:150,support:'left',grounded:true});
      run.movement.hunt.strands=[{from:{x:65,y:137},to:{x:86,y:169},shakeUntil:0}];
    }
    const initial=run.movement.hunt.strands.slice();
    advanceArcade(run,arenaInput({x:0,y:0},aim,false,true));
    advanceArcade(run,silkRelease);
    ticks(run,1);
    assert.deepEqual(run.movement.hunt.strands,initial);
  }
});

test('expiry and FIFO replacement tear down dependent strands and hanging ropes',()=>{
  const run=createArcade();
  start(run);
  const {hunt,spider}=run.movement,web=existingWeb(run);
  const first={from:{x:110,y:144},to:{x:92,y:209},shakeUntil:0,parent:web};
  const next={from:{x:102,y:173},to:{x:32,y:217},shakeUntil:0,parent:first};
  hunt.strands=[web,first,next];
  run.ropeWeb=next;
  spider.rope={x:80,y:188,length:44};
  web.expiresAt=run.clock;
  advanceArcade(run,neutral);
  assert.equal(hunt.strands.length,0);
  assert.equal(spider.rope,undefined);

  const old={from:{x:260,y:108},to:{x:280,y:124},shakeUntil:0};
  const attached={from:{x:270,y:116},to:{x:300,y:168},shakeUntil:0,parent:old};
  const other={from:{x:264,y:159},to:{x:343,y:217},shakeUntil:0};
  hunt.strands=[old,attached,other];
  advanceArcade(run,towardWeb);
  ticks(run,.45);
  assert.equal(hunt.strands.length,2);
  assert.equal(hunt.strands[0],other);
  assert.ok(!hunt.strands.includes(attached));
});

test('the rival takes one hit per trap and four hits clear level ten',()=>{
  const run=createArcade(10);
  start(run);
  const boss=run.boss!;
  for (let hp=boss.max;hp>0;hp--) {
    const spider=run.movement.spider;
    const wire={from:{x:146,y:110},to:{x:146,y:217},shakeUntil:0};
    run.movement.hunt.strands=[wire];
    boss.phase='charge';boss.p={x:147,y:202};boss.target={x:95,y:202};
    spider.x=115;
    advanceArcade(run,neutral);
    assert.equal(boss.phase,'trapped');
    assert.equal(boss.hp,hp);
    spider.x=141;
    advanceArcade(run,neutral);
    assert.equal(boss.hp,hp-1);
    if (hp>1) {
      ticks(run,.7);
      assert.equal(boss.hp,hp-1);
      ticks(run,2.2);
      assert.equal(boss.phase,'warn');
    }
  }
  assert.equal(run.phase,'won');
});

test('rival silk still requires five escape inputs',()=>{
  const run=createArcade(10);
  start(run);
  const x=run.movement.spider.x;
  run.rivalWebs=[{from:{x,y:12},to:{x,y:217},shakeUntil:0}];
  advanceArcade(run,neutral);
  assert.ok(run.snare);
  const cross=arenaInput({x:0,y:0});
  cross[4]=arcadeEscapeButton;
  for (let i=1;i<arcadeEscapePresses;i++) {
    advanceArcade(run,cross);
    assert.equal(run.snare.presses,i);
  }
  advanceArcade(run,cross);
  assert.equal(run.snare,undefined);
});
