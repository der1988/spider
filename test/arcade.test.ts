import assert from 'node:assert/strict';
import test from 'node:test';
import {advanceArcade,arcadeBudget,arcadeEscapeButton,arcadeEscapePresses,arcadeLayouts,arcadeWebLimit,createArcade} from '../src/arcade.ts';
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
    assert.equal(run.time,arcadeBudget(level));
    for (let frame=0;run.intro && frame<30;frame++) advanceArcade(run,neutral);
    assert.equal(run.intro,undefined);
    advanceArcade(run,neutral);
    assert.ok(run.time<arcadeBudget(level));
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

test('the last heart sends the player straight back to level one with three hearts',()=>{
  const run=createArcade(8);
  start(run);
  run.lives=1;
  run.score=12;
  putNextToSpider(run);
  advanceArcade(run,neutral);
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

test('holding R1 attaches a rope without an automatic rise, and Up reels it in',()=>{
  const run=createArcade();
  start(run);
  const {hunt,spider}=run.movement;
  advanceArcade(run,arenaInput({x:0,y:0},{x:.75,y:-.8},false,true));
  ticks(run,.39);
  assert.ok(spider.rope);
  const length=spider.rope.length,y=spider.y;
  ticks(run,.25);
  assert.equal(spider.rope.length,length);
  assert.equal(spider.y,y);
  assert.equal(hunt.strands.length,0);
  const up=arenaInput({x:0,y:-1});
  for (let i=0;i<18;i++) advanceArcade(run,up);
  assert.ok(spider.rope.length<length);
  assert.ok(spider.y<y);
  advanceArcade(run,[0,0,0,0,releaseSilkButton]);
  assert.equal(spider.rope,undefined);
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

test('silk heads travel and slow on a miss, with a longer connection preserving airborne momentum',()=>{
  const run=createArcade();
  start(run);
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

  Object.assign(spider,{x:183,y:130,vx:47,vy:-30,support:undefined,grounded:false});
  advanceArcade(run,shoot);
  for (let i=0;i<130 && !spider.rope;i++) advanceArcade(run,neutral);
  assert.ok(spider.rope);
  assert.equal(spider.rope.x,393);
  assert.ok(spider.rope.length>155);
  assert.equal(spider.vx,47);
  assert.ok(spider.vy>30);
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
