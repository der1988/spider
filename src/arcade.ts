import {levelIntroDuration} from './arcade-dialogue.ts';
import {idleQuips,rivalIntroSeconds} from './arcade-script.ts';
import {arenaStep,createArena,moveArena,type ArenaInput,type ArenaEvent} from './arena-run.ts';
import {closeCrawlerRopes,createCrawler} from './crawler.ts';
import {crossesSolid,sweptHit,type Strand} from './threads.ts';
import {aimHit,SPIDER_HALF_HEIGHT,SPIDER_HALF_WIDTH,type Point,type Rect} from './spider.ts';

export const arcadeWidth=400,arcadeHeight=224;
export const arcadeEscapePresses=5,arcadeEscapeButton=4;
export const flyTrapSeconds=3,bossTrapSeconds=2.8;
export const species=[
  ['Gnat','Steady, medium-speed flight',{speed:55,steer:7,think:1.15,fear:0,silk:0}],
  ['Dart','Accelerates in bursts',{speed:59,steer:5,think:1.2,fear:0,silk:0,burst:115}],
  ['Veil','Gives Spidey a wide berth',{speed:47,steer:10,think:.66,fear:1,silk:0}],
  ['Skipper','Changes height quickly',{speed:51,steer:13,think:.56,fear:0,silk:0,vertical:.72}],
  ['Comet','Very fast, slow to turn',{speed:113,steer:2.8,think:2.1,fear:0,silk:0,straight:.54}],
  ['Leafwing','Spots silk and reroutes',{speed:44,steer:11,think:.62,fear:0,silk:190}],
  ['Looper','Bends its flight into arcs',{speed:58,steer:9,think:1.18,fear:0,silk:0,curve:.53}],
  ['Drifter','Drops into lower lanes',{speed:48,steer:5.5,think:1.35,fear:0,silk:0,sink:23}],
  ['Needle','Slips out of silk sooner',{speed:67,steer:8,think:.95,fear:0,silk:0,hold:2.3}],
  ['Lantern','Steers well clear of webs',{speed:49,steer:12,think:.55,fear:.3,silk:216,buffer:36}],
] as const satisfies readonly (readonly [string,string,Flight])[];
type Flight={speed:number;steer:number;think:number;fear:number;silk:number;burst?:number;vertical?:number;
  straight?:number;curve?:number;sink?:number;hold?:number;buffer?:number};
export const stages=[
  ['Greenhouse','#9eb584','#283d2c','#d8e7a7'],['Wireworks','#9aaeb0','#324354','#e0e9ba'],
  ['Amber Hall','#c2ad75','#553c2d','#f5e0a6'],['Fern Vault','#82a889','#234d43','#c8ead4'],
  ['Cinder Loft','#b99079','#512f38','#ffdaaa'],['Rain Tank','#7c9eaa','#253b5d','#c3e8e1'],
  ['Spore Mill','#aba1ac','#433751','#f2d2db'],['Dusk Circuit','#9294ad','#332d55','#e8ddf6'],
  ['Copper Nest','#b18370','#4d3431','#ffd1a0'],['Moon Core','#9babbd','#263550','#eff7c8'],
] as const;
const wall=(x:number,y:number,w:number,h:number):Rect=>({x,y,w,h,grip:true});
const floor=217,spawn={x:52,y:209};
const border=[wall(0,floor,arcadeWidth,7),wall(0,0,arcadeWidth,7),wall(0,7,7,210),wall(arcadeWidth-7,7,7,210)];
export const arcadeLayouts=stages.map((_,stage)=>[
  ...border,wall(68+stage*5,56+stage%3*7,53+stage%4*6,7),
  wall(256-stage*3,49+stage%4*9,62,7),wall(161+(stage%3-1)*26,102+stage%4*6,80-stage%4*9,8),
  ...(stage ? [wall(62+stage*2,146+stage%2*10,54,7),wall(272-stage*3,158-stage%3*7,58,7)] : []),
]);
type Fly={p:Point;v:Point;target:Point;kind:number;actor:number;age:number;aimAt:number;caughtUntil:number;returnsAt:number};
type Boss={p:Point;target:Point;hp:number;max:number;size:number;phase:'warn'|'charge'|'recover'|'trapped';at:number;turn:number;side:number;repeated:number;shot?:Strand;net?:Strand;hit:boolean};
export type ArcadeEvent=ArenaEvent|'entrance'|'recover'|'boss'|'boss-trap'|'boss-free'|'snared'|'escape-step'|'escape'|'hit'|'win'|'hurt';
const len=(p:Point)=>Math.hypot(p.x,p.y);
const sub=(a:Point,b:Point)=>({x:a.x-b.x,y:a.y-b.y});
const dist=(a:Point,b:Point)=>len(sub(a,b));
const clamp=(x:number,min:number,max:number)=>Math.min(max,Math.max(min,x));
const clear=(a:Point,b:Point,surfaces:readonly Rect[])=>!surfaces.some(r=>crossesSolid(a,b,r));
export const arcadeStage=(level:number)=>Math.floor((level-1)/10);
export const speciesUnlocked=(stage:number)=>Math.min(species.length,stage+3);
export const waveCapacity=(level:number)=>Math.min(6,3+Math.floor(arcadeStage(level)/3));
export const intentionalArcadeInput=([x,y,ax,ay,buttons]:ArenaInput)=>!!buttons || Math.max(Math.hypot(x,y),Math.hypot(ax,ay))>=64;

export function createArcade(startLevel=1) {
  const movement=createArena('loop',3,false);
  const run={
    movement,level:startLevel,clock:0,phase:'ready' as 'ready'|'wave'|'boss'|'over'|'won',
    flies:[] as Fly[],boss:undefined as Boss|undefined,
    rivalWebs:[] as Strand[],snare:undefined as {web:Strand;presses:number}|undefined,
    recovered:0,score:0,quota:0,time:32,lives:3,invincible:0,
    intro:undefined as {kind:'level'|'rival';elapsed:number}|undefined,
    idle:0,idleLine:0,
  };
  prepareLevel(run);
  return run;
}
export type ArcadeRun=ReturnType<typeof createArcade>;

function prepareLevel(run:ArcadeRun) {
  const {movement}=run,hunt=movement.hunt;
  const stage=arcadeStage(run.level);
  if (run.level%10===1 || run.phase==='ready') {
    hunt.surfaces=arcadeLayouts[stage];
    movement.spider=createCrawler(spawn,hunt.surfaces);
    movement.down=false;
  }
  hunt.strands=[];hunt.loose=[];
  run.recovered=0;
  run.quota=run.level%10===1 ? 1 : Math.min(run.level,waveCapacity(run.level));
  run.flies=Array.from({length:run.quota},(_,index)=>{
    const count=speciesUnlocked(stage);
    const offset=(run.level-1)%(count-1);
    const kind=index===0 ? stage : (stage+1+(offset+index-1)%(count-1))%count;
    const entrance=flySpawn(run.level,index);
    return {p:{...entrance},v:{x:0,y:0},target:{...entrance},kind,actor:index,age:0,aimAt:0,caughtUntil:0,returnsAt:0};
  });
  run.intro=run.phase==='ready' ? undefined : {kind:'level',elapsed:0};
  run.idle=0;
  run.time=32+stage*2;
  run.boss=undefined;run.rivalWebs=[];run.snare=undefined;
}

const nodes=[{x:44,y:102},{x:354,y:103},{x:128,y:32},{x:300,y:36},{x:102,y:184},{x:304,y:183},{x:187,y:75},{x:211,y:138}];
function flySpawn(level:number,index:number) {
  return level===1 ? nodes[4] : nodes[(index*3+level-1)%nodes.length];
}

export function arcadeIdleSpeech(run:ArcadeRun) {
  if (run.idle>=5 && run.idle<7.9) return idleQuips[run.idleLine];
}

function tickFlies(run:ArcadeRun,emit:(event:ArcadeEvent)=>void) {
  const {spider,hunt}=run.movement;
  function capture(point:Point) {
    if (Math.abs(point.x-spider.x)>SPIDER_HALF_WIDTH+4 || Math.abs(point.y-spider.y)>SPIDER_HALF_HEIGHT+4 ||
        !clear(point,spider,hunt.surfaces)) return false;
    run.recovered++;run.score++;run.time=Math.min(42+arcadeStage(run.level)*2,run.time+6);
    emit('recover');
    return true;
  }
  run.flies=run.flies.filter(fly=>{
    if (fly.returnsAt>run.clock) return true;
    if (fly.returnsAt) fly.returnsAt=0;
    if (fly.caughtUntil && run.clock>=fly.caughtUntil) {
      const entrance=nodes.reduce((far,node)=>dist(node,spider)>dist(far,spider) ? node : far);
      fly.p={...entrance};fly.target={...entrance};
      fly.v={x:0,y:0};fly.caughtUntil=0;fly.aimAt=0;fly.returnsAt=run.clock+.65;
      return true;
    }
    if (capture(fly.p)) return false;
    if (fly.caughtUntil) return true;
    fly.age+=arenaStep;
    const profile:Flight=species[fly.kind][2];
    const buffer=profile.buffer??0;
    if (run.clock>=fly.aimAt || dist(fly.p,fly.target)<12) {
      const playerNear=profile.fear>0 && dist(fly.p,spider)<110 && clear(fly.p,spider,hunt.surfaces);
      const from=fly.p;
      const choices=nodes.filter(node=>dist(from,node)>45 && clear(from,node,hunt.surfaces));
      let best=-Infinity;
      for (const [i,node] of choices.entries()) {
        const silkAhead=profile.silk>0 && hunt.strands.some(wire=>sweptHit(from,node,wire));
        const netNear=buffer>0 && hunt.strands.some(wire=>nearWire(node,wire,buffer));
        const score=Math.sin(i*2.3+run.clock*2+fly.kind+fly.actor*.8)*55+dist(from,node)*.11
          +(playerNear ? dist(node,spider)*profile.fear : 0)
          +Math.abs(node.y-from.y)*(profile.vertical??0)
          +Math.abs(node.x-from.x)*(profile.straight??0)-Math.abs(node.y-from.y)*(profile.straight??0)
          -(netNear ? 90 : 0)-(silkAhead ? profile.silk : 0);
        if(score>best) {best=score;fly.target=node;}
      }
      fly.aimAt=run.clock+profile.think;
      if (run.level===1 && fly.age<4.5) fly.target=fly.p.x>65 ? {x:34,y:168} : {x:102,y:184};
    }
    const direction=sub(fly.target,fly.p),length=len(direction)||1;
    const curve=Math.sin(fly.age*8)*(profile.curve??0);
    const speed=(profile.burst && fly.age%1.45<.32 ? profile.burst : profile.speed)+run.level*.18;
    const x=(direction.x-direction.y*curve)/length*speed;
    const y=(direction.y+direction.x*curve)/length*speed;
    const mix=arenaStep*profile.steer;
    fly.v.x+=(x-fly.v.x)*mix;
    fly.v.y+=(y+(profile.sink??0)-fly.v.y)*mix;
    const next={x:clamp(fly.p.x+fly.v.x*arenaStep,14,386),y:clamp(fly.p.y+fly.v.y*arenaStep,14,207)};
    for (const wire of hunt.strands) {
      const hit=sweptHit(fly.p,next,wire);
      if (!hit) continue;
      fly.p=hit.point;fly.caughtUntil=run.clock+(profile.hold??flyTrapSeconds);
      wire.expiresAt=Math.max(wire.expiresAt??0,fly.caughtUntil);
      wire.shakeUntil=run.clock+.42;
      if (capture(fly.p)) return false;
      emit('catch');return true;
    }
    if (clear(fly.p,next,hunt.surfaces)) fly.p=next;
    else {
      if (!clear(fly.p,{x:next.x,y:fly.p.y},hunt.surfaces)) fly.v.x*=-.22;
      if (!clear(fly.p,{x:fly.p.x,y:next.y},hunt.surfaces)) fly.v.y*=-.22;
      fly.aimAt=0;
    }
    return !capture(fly.p);
  });
}

function nearWire(point:Point,wire:Strand,radius:number) {
  const direction=sub(wire.to,wire.from),offset=sub(point,wire.from);
  const along=clamp((direction.x*offset.x+direction.y*offset.y)/(len(direction)**2 || 1),0,1);
  return dist(point,{x:wire.from.x+along*direction.x,y:wire.from.y+along*direction.y})<=radius;
}

function releasePlayer(run:ArcadeRun) {
  run.rivalWebs=run.rivalWebs.filter(web=>web!==run.snare?.web);
  run.snare=undefined;
}

function hurt(run:ArcadeRun,emit:(event:ArcadeEvent)=>void) {
  if (run.clock<run.invincible) return;
  run.lives--;run.invincible=run.clock+1.5;
  releasePlayer(run);
  if (!run.lives) {run.phase='over';emit('over');}
  else emit('hurt');
}

function aimRivalWeb(target:Point,surfaces:readonly Rect[]) {
  const from=aimHit(target,surfaces,{x:target.x,y:target.y-1},{range:arcadeHeight});
  const to=aimHit(target,surfaces,{x:target.x,y:target.y+1},{range:arcadeHeight});
  if (from && to && to.y-from.y>=30) return {from,to,shakeUntil:0};
}
function warnBoss(run:ArcadeRun,boss:Boss) {
  const {spider,hunt}=run.movement;
  const stage=arcadeStage(run.level);
  boss.turn++;
  const side=Math.sign(spider.vx);
  boss.repeated=side && side===boss.side ? boss.repeated+1 : 0;
  boss.side=side;
  const track=stage>=2 && boss.turn%3!==0;
  const predicted=track ? .28+stage*.018 : 0;
  const intercept=spider.vx*predicted;
  const hop=stage>=4 && (boss.turn%3===0 || boss.repeated>=2);
  const size=boss.size+7;
  const goal={x:clamp(spider.x+intercept,size,arcadeWidth-size),
    y:hop ? 88+(boss.turn%2)*40 : stage<2 ? 200 : clamp(spider.y+spider.vy*predicted,42,floor-size)};
  let target=goal;
  if (!clear(boss.p,goal,hunt.surfaces)) {
    target=nodes.filter(node=>dist(node,boss.p)>24 && clear(boss.p,node,hunt.surfaces))
      .sort((a,b)=>dist(a,goal)-dist(b,goal))[0]??boss.p;
  }
  boss.target=target;
  boss.shot=boss.turn%2===0 ? aimRivalWeb(
    {x:clamp(spider.x+intercept,18,arcadeWidth-18),y:spider.y},hunt.surfaces) : undefined;
  boss.phase='warn';boss.at=run.clock+Math.max(.53,.96-stage*.042);
}

function tickBoss(run:ArcadeRun,emit:(event:ArcadeEvent)=>void) {
  const boss=run.boss!;
  const {spider,hunt}=run.movement;
  const stage=arcadeStage(run.level);
  const touches=()=>dist(boss.p,spider)<boss.size+SPIDER_HALF_WIDTH && clear(boss.p,spider,hunt.surfaces);
  if (boss.phase==='trapped') {
    if (run.clock>=boss.at) {
      hunt.strands=hunt.strands.filter(web=>web!==boss.net);
      boss.net=undefined;
      warnBoss(run,boss);
      emit('boss-free');
    } else if (!boss.hit && !run.snare && touches()) {
      boss.hp--;boss.hit=true;emit('hit');
      if (boss.net) boss.net.shakeUntil=run.clock+.35;
    }
    return;
  }
  if (boss.phase==='recover') {
    if (run.clock>=boss.at) warnBoss(run,boss);
    return;
  }
  if (boss.phase==='warn') {
    if (run.clock<boss.at) return;
    if (boss.shot) {
      boss.shot.expiresAt=run.clock+7;
      boss.shot.shakeUntil=run.clock+.25;
      run.rivalWebs.push(boss.shot);
      boss.shot=undefined;
      boss.phase='recover';boss.at=run.clock+.7;
      emit('fix');
      return;
    }
    boss.phase='charge';
  }
  const diff=sub(boss.target,boss.p),distance=len(diff);
  const speed=175+stage*18;
  const factor=Math.min(1,speed*arenaStep/(distance||1));
  const next={x:boss.p.x+diff.x*factor,y:boss.p.y+diff.y*factor};
  let caught: {t:number;point:Point;wire:Strand}|undefined;
  for (const wire of hunt.strands) {
    const hit=sweptHit(boss.p,next,wire);
    if (hit && (!caught || hit.t<caught.t)) caught={...hit,wire};
  }
  if (caught) {
    boss.p=caught.point;boss.phase='trapped';boss.at=run.clock+bossTrapSeconds;
    boss.net=caught.wire;boss.hit=false;
    caught.wire.shakeUntil=run.clock+.4;
    caught.wire.expiresAt=boss.at;
    emit('boss-trap');
    return;
  }
  boss.p=next;
  if (touches()) hurt(run,emit);
  if (factor===1) {boss.phase='recover';boss.at=run.clock+Math.max(.65,1.25-stage*.045);}
}

function tickRivalWebs(run:ArcadeRun,from:Point,emit:(event:ArcadeEvent)=>void) {
  run.rivalWebs=run.rivalWebs.filter(web=>web===run.snare?.web || (web.expiresAt??Infinity)>run.clock);
  if (run.snare || run.clock<run.invincible || run.phase==='over') return;
  const {spider}=run.movement;
  const web=run.rivalWebs.find(wire=>sweptHit(from,spider,wire) || nearWire(spider,wire,5));
  if (!web) return;
  closeCrawlerRopes(spider);
  spider.thread=undefined;
  spider.vx=0;spider.vy=0;
  run.snare={web,presses:0};
  web.shakeUntil=run.clock+.35;
  emit('snared');
}
export function advanceArcade(run:ArcadeRun,input:ArenaInput,emit:(event:ArcadeEvent)=>void=()=>{}) {
  if (run.phase==='ready') {
    if (!intentionalArcadeInput(input)) return;
    run.phase='wave';
    run.intro={kind:'level',elapsed:0};
    emit('entrance');
  }
  if (run.phase==='over' || run.phase==='won') return;
  if (run.intro) {
    const intro=run.intro;
    intro.elapsed+=arenaStep;
    const duration=intro.kind==='rival' ? rivalIntroSeconds : levelIntroDuration(run.level);
    if (intro.elapsed>=duration || intro.elapsed>=.4 && (input[4]&arcadeEscapeButton)!==0) {
      if (intro.kind==='rival') warnBoss(run,run.boss!);
      run.intro=undefined;
    }
    return;
  }
  run.clock+=arenaStep;run.time-=arenaStep;
  run.movement.hunt.clock=run.clock;
  run.movement.hunt.strands=run.movement.hunt.strands.filter(wire=>(wire.expiresAt??Infinity)>run.clock);
  const {spider}=run.movement,from={x:spider.x,y:spider.y};
  if (run.snare) {
    if ((input[4]&arcadeEscapeButton)!==0) {
      run.snare.presses++;
      run.snare.web.shakeUntil=run.clock+.25;
      if (run.snare.presses>=arcadeEscapePresses) {releasePlayer(run);emit('escape');}
      else emit('escape-step');
    }
  } else moveArena(run.movement,input,emit,{climbSilk:false,adjustRope:true});
  if (run.snare || intentionalArcadeInput(input) || dist(spider,from)>.045) {
    if (run.idle>=5) run.idleLine=(run.idleLine+1)%idleQuips.length;
    run.idle=0;
  } else {
    run.idle+=arenaStep;
    if (run.idle>=19) {run.idle=0;run.idleLine=(run.idleLine+1)%idleQuips.length;}
  }
  tickFlies(run,emit);
  if (run.phase==='boss') {
    tickRivalWebs(run,from,emit);
    tickBoss(run,emit);
    if (!run.boss!.hp) {
      if (run.level===100) {run.phase='won';emit('win');}
      else {run.level++;run.phase='wave';prepareLevel(run);emit('entrance');}
    }
  } else if (run.flies.length===0) {
    if (run.level%10===0) {
      const stage=arcadeStage(run.level),size=12+stage*1.2;
      const hp=2+Math.floor(stage/2),p={x:350,y:Math.min(200,floor-size-6)};
      run.boss={p,target:p,hp,max:hp,size,phase:'recover',at:0,turn:0,side:0,repeated:0,hit:false};
      run.intro={kind:'rival',elapsed:0};run.idle=0;
      run.phase='boss';run.time=Math.max(run.time,40+stage*4);
      emit('boss');
    } else {run.level++;prepareLevel(run);emit('entrance');}
  }
  if ((run.phase==='wave' || run.phase==='boss') && run.lives>0) {
    if (run.time<=0) {run.phase='over';emit('over');}
  }
}
