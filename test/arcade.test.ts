import assert from 'node:assert/strict';
import test from 'node:test';
import {advanceArcade,arcadeDirectHits,arcadeEscapeButton,arcadeEscapePresses,arcadeLayouts,arcadeWebLimit,createArcade} from '../src/arcade.ts';
import {arcadeFrame,arcadeHeight,arcadeRivalStage,arcadeScenes,arcadeSpawns} from '../src/arcade-scenery.ts';
import {advanceSilk,launchSilk} from '../src/arcade-silk.ts';
import {crossesSolid,sweptHit} from '../src/threads.ts';
import {arenaInput,arenaStep,releaseSilkButton} from '../src/arena-run.ts';
import {arcadeLevels,campaign,insectMark,levelIntroDuration,lineAt} from '../src/arcade-dialogue.ts';

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
  Object.assign(fly,{p:{x,y},target:{x,y},v:{x:0,y:0},phase:'patrol',phaseAt:100,aimAt:100,dodgeAfter:100,age:5});
  return fly;
}

const solid=(x:number,y:number,w:number,h:number)=>({x,y,w,h,grip:true});
const dialogueSpeakers=(level:number)=>campaign[level-1].insects.map((_,index)=>index);

function practicePlatform(run:ReturnType<typeof createArcade>) {
  run.movement.hunt.surfaces=[solid(25,217,343,7)];
}

test('all ten encounters have their own dialogue, insect names and silhouettes, and freeze time',()=>{
  assert.equal(arcadeLevels,10);
  const names=campaign.flatMap(level=>level.insects.map(([name])=>name));
  assert.equal(new Set(names).size,names.length);
  const shapes=campaign.flatMap((level,index)=>level.insects.map(([,kind],slot)=>kind+':'+insectMark(index+1,slot)));
  assert.equal(new Set(shapes).size,names.length);
  const lines=campaign.flatMap(encounter=>[
    ...encounter.insects.map(([, ,line])=>line),
    ...('rivalLine' in encounter ? [encounter.rivalLine] : []),
    encounter.reply,
  ]);
  assert.equal(new Set(lines).size,names.length+arcadeLevels+1);
  assert.ok(lines.every(line=>line.length<=35));
  assert.equal(new Set(arcadeLayouts.map(layout=>JSON.stringify(layout))).size,10);
  for (let level=1;level<=arcadeLevels;level++) {
    const run=createArcade(level);
    const seen=new Set();
    for (let at=0;at<levelIntroDuration(level);at+=.05) {
      const line=lineAt(level,at);
      if (line) seen.add(line.speaker);
    }
    assert.deepEqual([...seen],[
      ...(level===arcadeLevels ? ['rival'] : dialogueSpeakers(level)), 'spidey',
    ]);
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

test('natural and skipped introductions start gameplay at the exact staged positions',()=>{
  function poses(run:ReturnType<typeof createArcade>) {
    const {x,y,support}=run.movement.spider;
    return {hero:{x,y,support},flies:run.flies.map(fly=>({...fly.p})),rival:run.boss && {...run.boss.p}};
  }
  for (let level=1;level<=arcadeLevels;level++) {
    for (const skipped of [false,true]) {
      const run=createArcade(level),start=poses(run);
      advanceArcade(run,right);
      if (skipped) skip(run);
      else {
        const input=arenaInput({x:1,y:0});
        while (run.intro) advanceArcade(run,input);
      }
      assert.equal(run.clock,0);
      assert.deepEqual(poses(run),start);
      assert.ok(start.flies.every(p=>p.x-start.hero.x>=145));
      const {surfaces}=run.movement.hunt;
      assert.ok(start.flies.every(p=>surfaces.every(s=>
        p.x+5<=s.x || p.x-5>=s.x+s.w || p.y+5<=s.y || p.y-5>=s.y+s.h)));
    }
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
  run.flies[0].p={x:102,y:184};
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
    practicePlatform(run);
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
    assert.equal(fly.p.y,212);
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

test('a falling cocoon hangs from the first fixed web and falls again if it breaks',()=>{
  const run=createArcade();
  start(run);
  const fly=run.flies[0];
  fly.p={x:240,y:130};fly.v={x:0,y:200};
  fly.cocoon={struckAt:run.clock,landed:false};
  const deadline=run.clock+2;
  fly.caughtUntil=deadline;
  const near={from:{x:220,y:145},to:{x:260,y:155},shakeUntil:0};
  const far={from:{x:220,y:146},to:{x:260,y:156},shakeUntil:0};
  run.movement.hunt.strands=[far,near];
  for (let i=0;i<20 && !fly.trappedBy;i++) advanceArcade(run,neutral);
  assert.equal(fly.trappedBy,near);
  ticks(run,.3);
  assert.equal(fly.p.y,150);
  assert.equal(fly.caughtUntil,deadline);
  assert.equal(run.score,0);
  run.movement.hunt.strands=[];
  ticks(run,.15);
  assert.ok(fly.p.y>150);
  assert.equal(fly.caughtUntil,deadline);
});

test('the nearest free fly stops the shot, and picking up its cocoon counts once',()=>{
  const run=createArcade(4);
  start(run);
  practicePlatform(run);
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

test('scenes have a playable frame, four spaced perches and a stable spawn',()=>{
  assert.equal(new Set(arcadeScenes.map(scene=>scene.name)).size,arcadeLevels);
  assert.equal(arcadeLayouts.length,arcadeLevels);
  for (const [i,surfaces] of arcadeLayouts.entries()) {
    const run=createArcade(i+1);
    assert.equal(run.movement.spider.support,'floor');
    assert.equal(run.movement.hunt.surfaces,surfaces);
    assert.deepEqual(surfaces.slice(0,3),arcadeFrame);
    assert.ok(arcadeFrame.every(surface=>surface.grip));
    assert.equal(surfaces.length,7);
    assert.ok(surfaces.slice(3).every(perch=>perch.grip && perch.w<100));
    assert.ok(surfaces.slice(3).some(perch=>perch.y+perch.h<arcadeHeight-45));
    const spawn=arcadeSpawns[i];
    const reachable=Array.from({length:24},(_,n)=>{
      const angle=Math.PI*n/12,shot=launchSilk(spawn,{x:Math.cos(angle),y:Math.sin(angle)},{x:0,y:0});
      while (!shot.hit && advanceSilk(shot,surfaces,[],arenaStep)) { /* fly to the first impact */ }
      return shot.hit?.grip && Math.hypot(shot.hit.point.x-spawn.x,shot.hit.point.y-spawn.y)>25;
    });
    assert.ok(reachable.some(Boolean),`level ${i+1} has a second anchor reachable from spawn`);
  }
});

test('Spidey can jump from a perch, swing to a wall and climb onto the ceiling',()=>{
  for (const level of [1,4,8]) {
    const run=createArcade(level);
    start(run);
    for (const fly of run.flies) {fly.p={x:380,y:43};fly.caughtUntil=100;}
    const {spider}=run.movement;
    const left=arenaInput({x:-1,y:0}),up=arenaInput({x:0,y:-1});
    const forSteps=(input:typeof neutral,steps:number)=>{
      for (let i=0;i<steps;i++) advanceArcade(run,input);
    };
    forSteps(left,7);
    advanceArcade(run,arenaInput({x:0,y:0},undefined,true));
    forSteps(neutral,10);
    advanceArcade(run,arenaInput({x:0,y:0},{x:-1,y:0},false,true));
    forSteps(neutral,22);
    assert.equal(spider.rope?.x,arcadeFrame[1].w);
    advanceArcade(run,arenaInput({x:-1,y:0},undefined,true));
    forSteps(up,45);
    assert.equal(spider.support,'left');
    forSteps(up,330);
    assert.equal(spider.support,'ceiling');
    const startX=spider.x;
    forSteps(right,36);
    assert.ok(spider.x>startX+12);
    assert.equal(spider.support,'ceiling');
  }
});

test('zigzag and altitude dodges have a readable commit and a recovery window',()=>{
  for (const [kind,style] of [[0,'zigzag'],[3,'lift']] as const) {
    const run=createArcade(4);
    start(run);
    practicePlatform(run);
    const spider=run.movement.spider;
    Object.assign(spider,{x:112,y:124,vx:0,vy:0,support:undefined,grounded:false});
    const fly=parkFly(run,191,125);
    run.flies=[fly];
    Object.assign(fly,{kind,dodgeAfter:0});
    advanceArcade(run,arenaInput({x:0,y:0},{x:1,y:0},false,true));
    assert.equal(fly.dodge?.style,style);
    const from={...fly.p};
    ticks(run,.18);
    assert.equal(fly.caughtUntil,0);
    assert.ok(Math.abs(fly.p.y-from.y)>4);
    ticks(run,.18);
    assert.equal(fly.dodge,undefined);
    assert.equal(fly.phase,'recover');
    assert.ok(fly.dodgeAfter>run.clock+.4);
  }
});

test('armoured flies accumulate silk until the last shot sends the cocoon away',()=>{
  const run=createArcade(9);
  start(run);
  practicePlatform(run);
  const spider=run.movement.spider;
  const fly=parkFly(run,208,129);
  run.flies=[fly];
  const events:string[]=[];
  for (let n=1;n<=arcadeDirectHits(run.level,fly.actor);n++) {
    Object.assign(spider,{x:fly.p.x-45,y:fly.p.y-1,vx:0,vy:0,support:undefined,grounded:false,rope:undefined});
    fly.target={...fly.p};fly.v={x:0,y:0};fly.phaseAt=100;fly.aimAt=100;
    advanceArcade(run,arenaInput({x:0,y:0},{x:1,y:0},false,true),event=>events.push(event));
    for (let t=0;t<20 && fly.silkHits<n;t++) advanceArcade(run,neutral,event=>events.push(event));
    assert.equal(fly.silkHits,n);
    assert.equal(!!fly.cocoon,n===3);
  }
  assert.deepEqual(events,['launch','silk-hit','launch','silk-hit','launch','catch']);
  assert.ok(fly.v.x>100);
});

test('a fly escaping either trap type cannot hurt Spidey for one second',()=>{
  for (const cocoon of [undefined,{struckAt:0,landed:true}]) {
    const run=createArcade();
    start(run);
    const spider=run.movement.spider;
    const fly=parkFly(run,spider.x,spider.y-4);
    fly.caughtUntil=run.clock+arenaStep*.5;
    fly.cocoon=cocoon;
    if (!cocoon) {
      fly.trappedBy={from:{x:48,y:205},to:{x:92,y:144},shakeUntil:0};
      run.movement.hunt.strands=[fly.trappedBy];
    }
    advanceArcade(run,neutral);
    assert.equal(fly.safeUntil-run.clock,1);
    while (run.clock+arenaStep<fly.safeUntil-1e-8) {
      fly.p={x:spider.x,y:spider.y-4};fly.target={...fly.p};fly.aimAt=100;
      advanceArcade(run,neutral);
      assert.equal(run.lives,3);
    }
    fly.p={x:spider.x,y:spider.y-4};fly.target={...fly.p};fly.v={x:0,y:0};fly.aimAt=100;
    ticks(run,2*arenaStep);
    assert.equal(run.lives,2);
  }
});

test('a fall costs a heart and returns to the same suspended launch perch',()=>{
  const run=createArcade(3);
  start(run);
  const spider=run.movement.spider;
  Object.assign(spider,{x:190,y:arcadeHeight+15,vx:0,vy:160,support:undefined,grounded:false});
  advanceArcade(run,neutral);
  assert.equal(run.lives,2);
  assert.equal(run.level,3);
  assert.equal(run.movement.spider.support,'floor');
  assert.equal(run.movement.spider.y,arcadeSpawns[2].y);
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
  assert.equal(run.boss?.phase,'recover');
  advanceArcade(run,neutral);
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

test('holding R1 keeps a rope until release, which only fixes silk from support',()=>{
  const run=createArcade();
  start(run);
  parkFly(run);
  const {hunt,spider}=run.movement;
  advanceArcade(run,towardWeb);
  ticks(run,.39);
  assert.ok(spider.rope);
  assert.equal(hunt.strands.length,0);
  advanceArcade(run,silkRelease);
  assert.equal(spider.rope,undefined);
  assert.equal(hunt.strands.length,1);
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
  practicePlatform(run);
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

  run.movement.hunt.surfaces.push(solid(286,147,41,8));
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
    assert.ok((spider.x-arcadeSpawns[0].x)*x>12 && (spider.x-arcadeSpawns[0].x)*x<17);
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
  advanceArcade(run,silkRelease);
  ticks(run,.45);
  assert.equal(hunt.strands.length,2);
  assert.equal(hunt.strands[0],other);
  assert.ok(!hunt.strands.includes(attached));
});

test('the rival takes one hit per trap and four hits clear level ten',()=>{
  const run=createArcade(10);
  start(run);
  practicePlatform(run);
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

test('the smaller rival clears Moonflower perches and casts anchored webs during the fight',()=>{
  const run=createArcade(10);
  start(run);
  run.invincible=20;
  const boss=run.boss!,{surfaces}=run.movement.hunt;
  const {halfWidth,head,feet}=arcadeRivalStage;
  let distance=0,casts=0;
  for (let frame=0;frame<12/arenaStep;frame++) {
    const from=boss.p;
    advanceArcade(run,neutral,event=>{if (event==='fix') casts++;});
    const {x,y}=boss.p;
    distance+=Math.hypot(x-from.x,y-from.y);
    for (const solid of surfaces) {
      const free=x+halfWidth<=solid.x+.15 || x-halfWidth>=solid.x+solid.w-.15 ||
        y+feet<=solid.y+.15 || y-head>=solid.y+solid.h-.15;
      assert.ok(free,`Rival overlaps a perch at ${x}, ${y}`);
    }
    for (const web of run.rivalWebs) assert.ok(surfaces.every(solid=>!crossesSolid(web.from,web.to,solid)));
  }
  assert.ok(distance>250);
  assert.ok(casts>=2);
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
