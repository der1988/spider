import {arenaStep,createArena,moveArena,type ArenaInput,type ArenaEvent} from './arena-run.ts';
import {createCrawler} from './crawler.ts';
import {crossesSolid,sweptHit} from './threads.ts';
import type {Point,Rect} from './spider.ts';

export const arcadeWidth=400,arcadeHeight=224;
export const species=[
  ['Gnat','Steady flight'],['Dart','Bursts of speed'],['Veil','Veers away from Spidey'],['Skipper','Sudden changes in height'],
  ['Comet','Fast, straight passes'],['Leafwing','Avoids silk ahead'],['Looper','Curves around openings'],
  ['Drifter','Falls when stunned'],['Needle','Escapes traps sooner'],['Lantern','Evades fast cargo'],
] as const;
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
type Fly={p:Point;v:Point;target:Point;kind:number;age:number;aimAt:number;caughtUntil:number;stunUntil:number};
type Cargo={p:Point;v:Point;kind:number;hot:boolean;hitAt:number};
type Boss={p:Point;from:Point;target:Point;hp:number;max:number;size:number;phase:'warn'|'charge'|'open';at:number;turn:number;side:number;repeated:number};
export type ArcadeEvent=ArenaEvent|'recover'|'stun'|'boss'|'hit'|'win'|'hurt';
const len=(p:Point)=>Math.hypot(p.x,p.y);
const sub=(a:Point,b:Point)=>({x:a.x-b.x,y:a.y-b.y});
const dist=(a:Point,b:Point)=>len(sub(a,b));
const clamp=(x:number,min:number,max:number)=>Math.min(max,Math.max(min,x));
const clear=(a:Point,b:Point,surfaces:readonly Rect[])=>!surfaces.some(r=>crossesSolid(a,b,r));
export const arcadeStage=(level:number)=>Math.floor((level-1)/10);
export const waveCapacity=(level:number)=>Math.min(6,3+Math.floor(arcadeStage(level)/3));
export const intentionalArcadeInput=([x,y,ax,ay,buttons]:ArenaInput)=>!!buttons || Math.max(Math.hypot(x,y),Math.hypot(ax,ay))>=64;

export function createArcade(startLevel=1) {
  const movement=createArena('loop',3,false);
  const run={
    movement,level:startLevel,clock:0,phase:'ready' as 'ready'|'wave'|'boss'|'over'|'won',
    flies:[] as Fly[],cargo:undefined as Cargo|undefined,boss:undefined as Boss|undefined,
    recovered:0,score:0,spawned:0,wave:1,waveGoal:0,time:32,lives:3,invincible:0,
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
    run.cargo=undefined;
    movement.down=false;
  }
  hunt.strands=[];hunt.loose=[];
  run.recovered=0;run.spawned=0;run.flies=[];
  run.wave=1;run.waveGoal=run.level%10===1 ? 1 : Math.min(run.level,waveCapacity(run.level));
  run.time=32+stage*2;
  run.boss=undefined;
}

const nodes=[{x:44,y:102},{x:354,y:103},{x:128,y:32},{x:300,y:36},{x:102,y:184},{x:304,y:183},{x:187,y:75},{x:211,y:138}];
function bringFly(run:ArcadeRun) {
  const stage=arcadeStage(run.level),id=run.spawned++;
  const kind=run.recovered===0 && run.level%10===1 ? stage : (id+run.level-1)%(stage+1);
  const start=run.level===1 && id===0 ? nodes[4] : nodes[(id*3+run.level-1)%nodes.length];
  run.flies.push({p:{...start},v:{x:0,y:0},target:{...start},kind,age:0,aimAt:0,caughtUntil:0,stunUntil:0});
}

function topUp(run:ArcadeRun) {
  if (run.phase==='wave' && run.recovered===run.waveGoal && run.recovered<run.level) {
    run.wave++;
    run.waveGoal=Math.min(run.level,run.recovered+waveCapacity(run.level));
  }
  const target=run.phase==='boss' ? 2 : run.waveGoal-run.recovered;
  while (run.flies.length<target) bringFly(run);
}

function tickFlies(run:ArcadeRun,emit:(event:ArcadeEvent)=>void) {
  const {spider,hunt}=run.movement;
  run.flies=run.flies.filter(fly=>{
    if (fly.caughtUntil) {
      if (run.clock>=fly.caughtUntil) return false;
      if (dist(fly.p,spider)<17 && clear(fly.p,spider,hunt.surfaces)) {
        run.recovered++;run.score++;run.time=Math.min(42+arcadeStage(run.level)*2,run.time+6);
        run.cargo={p:{...fly.p},v:{x:spider.vx,y:spider.vy},kind:fly.kind,hot:false,hitAt:0};
        emit('recover');return false;
      }
      return true;
    }
    fly.age+=arenaStep;
    const stunned=run.clock<fly.stunUntil;
    if (!stunned && (run.clock>=fly.aimAt || dist(fly.p,fly.target)<12)) {
      const playerNear=dist(fly.p,spider)<85;
      const from=fly.p;
      const choices=nodes.filter(node=>dist(from,node)>45 && clear(from,node,hunt.surfaces));
      let best=-Infinity;
      for (const [i,node] of choices.entries()) {
        const silkAhead=fly.kind===5 && hunt.strands.some(wire=>sweptHit(from,node,wire));
        const cargo=run.cargo;
        const score=Math.sin(i*2.3+run.clock*2+fly.kind)*55+dist(from,node)*.11
          +(fly.kind===2 && playerNear ? dist(node,spider)*.8 : 0)
          +(fly.kind===3 ? Math.abs(node.y-from.y)*.72 : 0)
          +(fly.kind===4 ? Math.abs(node.x-from.x)*.45 : 0)
          +(fly.kind===9 && cargo?.hot ? dist(node,cargo.p)*.65 : 0)-(silkAhead ? 180 : 0);
        if(score>best) {best=score;fly.target=node;}
      }
      fly.aimAt=run.clock+(fly.kind===4 ? 2 : fly.kind===3 ? .48 : 1.15);
      if (run.level===1 && fly.age<4.5) fly.target=fly.p.x>65 ? {x:34,y:168} : {x:102,y:184};
    }
    const direction=sub(fly.target,fly.p),length=len(direction)||1;
    const curve=fly.kind===6 ? Math.sin(fly.age*8)*.55 : 0;
    const speed=(fly.kind===1 && fly.age%1.45<.32 ? 119 : fly.kind===4 ? 98 : 54)+run.level*.22;
    const x=(direction.x-direction.y*curve)/length*speed;
    const y=(direction.y+direction.x*curve)/length*speed;
    const mix=arenaStep*7;
    fly.v.x+=( (stunned ? 0 : x)-fly.v.x)*mix;
    fly.v.y+=( (stunned ? fly.kind===7 ? 48 : 0 : y)-fly.v.y)*mix;
    const next={x:clamp(fly.p.x+fly.v.x*arenaStep,14,386),y:clamp(fly.p.y+fly.v.y*arenaStep,14,207)};
    for (const wire of hunt.strands) {
      const hit=sweptHit(fly.p,next,wire);
      if (!hit) continue;
      fly.p=hit.point;fly.caughtUntil=run.clock+(fly.kind===8 ? 2.2 : 3);
      wire.shakeUntil=run.clock+.42;
      emit('catch');return true;
    }
    if (clear(fly.p,next,hunt.surfaces)) fly.p=next;
    else fly.aimAt=0;
    return true;
  });
}

function hurt(run:ArcadeRun,emit:(event:ArcadeEvent)=>void) {
  if (run.clock<run.invincible) return;
  run.lives--;run.invincible=run.clock+1.5;
  run.cargo=undefined;
  if (!run.lives) {run.phase='over';emit('over');}
  else emit('hurt');
}

function tickCargo(run:ArcadeRun,emit:(event:ArcadeEvent)=>void) {
  const cargo=run.cargo;
  if (!cargo) return;
  const {spider,hunt}=run.movement;
  const delta=sub(spider,cargo.p),length=len(delta)||1;
  const tension=Math.max(0,length-33)*76;
  cargo.v.x+=(delta.x/length*tension-cargo.v.x*1.15)*arenaStep;
  cargo.v.y+=(delta.y/length*tension+90-cargo.v.y*1.15)*arenaStep;
  const from={...cargo.p};
  for (const axis of ['x','y'] as const) {
    const next={...cargo.p,[axis]:cargo.p[axis]+cargo.v[axis]*arenaStep};
    if (clear(cargo.p,next,hunt.surfaces)) cargo.p=next;
    else cargo.v[axis]*=-.73;
  }
  if (dist(spider,cargo.p)>105) {run.cargo=undefined;return;}
  cargo.hot=len(cargo.v)>92;
  if (!cargo.hot || run.clock<cargo.hitAt) return;
  const hit=(p:Point,radius:number)=>{
    const delta=sub(cargo.p,from),diff=sub(p,from);
    const t=clamp((delta.x*diff.x+delta.y*diff.y)/(len(delta)**2||1),0,1);
    return dist(p,{x:from.x+delta.x*t,y:from.y+delta.y*t})<radius && clear(cargo.p,p,hunt.surfaces);
  };
  const boss=run.boss;
  if (boss?.phase==='open' && hit(boss.p,boss.size+5)) {
    boss.hp--;run.cargo=undefined;emit('hit');
    return;
  }
  const fly=run.flies.find(fly=>!fly.caughtUntil && run.clock>=fly.stunUntil && hit(fly.p,12));
  if (fly) {
    fly.stunUntil=run.clock+1.5;cargo.hitAt=run.clock+.26;emit('stun');
  }
}

function warnBoss(run:ArcadeRun,boss:Boss) {
  const {spider,hunt}=run.movement;
  const stage=arcadeStage(run.level);
  boss.turn++;
  boss.from={...boss.p};
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
  boss.phase='warn';boss.at=run.clock+Math.max(.53,.96-stage*.042);
}

function tickBoss(run:ArcadeRun,emit:(event:ArcadeEvent)=>void) {
  const boss=run.boss!;
  const stage=arcadeStage(run.level);
  if (boss.phase==='warn' && run.clock>=boss.at) boss.phase='charge';
  if (boss.phase==='charge') {
    const diff=sub(boss.target,boss.p),distance=len(diff);
    const speed=175+stage*18;
    const factor=Math.min(1,speed*arenaStep/(distance||1));
    boss.p={x:boss.p.x+diff.x*factor,y:boss.p.y+diff.y*factor};
    if (dist(boss.p,run.movement.spider)<boss.size+7) hurt(run,emit);
    if (factor===1) {boss.phase='open';boss.at=run.clock+Math.max(1.35,2.65-stage*.13);}
  } else if (boss.phase==='open' && run.clock>=boss.at) warnBoss(run,boss);
}

export function advanceArcade(run:ArcadeRun,input:ArenaInput,emit:(event:ArcadeEvent)=>void=()=>{}) {
  if (run.phase==='ready') {
    if (!intentionalArcadeInput(input)) return;
    run.phase='wave';
    topUp(run);
  }
  if (run.phase==='over' || run.phase==='won') return;
  run.clock+=arenaStep;run.time-=arenaStep;
  run.movement.hunt.clock=run.clock;
  run.movement.hunt.strands=run.movement.hunt.strands.filter(wire=>(wire.expiresAt??Infinity)>run.clock);
  moveArena(run.movement,input,emit);
  tickFlies(run,emit);
  tickCargo(run,emit);
  if (run.phase==='boss') {
    if (run.boss!.hp>0) tickBoss(run,emit);
    else if (run.level===100) {run.phase='won';emit('win');}
    else {run.level++;run.phase='wave';prepareLevel(run);emit('new');}
  } else if (run.recovered>=run.level) {
    if (run.level%10===0) {
      const stage=arcadeStage(run.level),size=12+stage*1.2;
      const hp=2+Math.floor(stage/2),p={x:350,y:Math.min(200,floor-size-6)};
      run.boss={p,from:p,target:p,hp,max:hp,size,phase:'open',at:0,turn:0,side:0,repeated:0};
      warnBoss(run,run.boss);
      run.phase='boss';run.time=Math.max(run.time,40+stage*4);run.flies=[];
      emit('boss');
    } else {run.level++;prepareLevel(run);emit('new');}
  }
  if ((run.phase==='wave' || run.phase==='boss') && run.lives>0) {
    if (run.time<=0) {run.phase='over';emit('over');}
    else topUp(run);
  }
}
