import assert from 'node:assert/strict';
import test from 'node:test';
import {advanceArcade,arcadeBudget,arcadeEscapeButton,arcadeEscapePresses,arcadeLayouts,createArcade} from '../src/arcade.ts';
import {arenaInput,arenaStep} from '../src/arena-run.ts';
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
  assert.equal(new Set(campaign.flatMap(({line,reply})=>[line,reply])).size,20);
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
