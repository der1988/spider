import {arcadeLevels,dialogueFor,heartsPerRun,levelIntroDuration} from './arcade-dialogue.ts';
import {advanceSilk,arcadeSilkReach,diagonalWeb,launchSilk,ropeAt,type SilkShot} from './arcade-silk.ts';
import {arcadeHeight,arcadeLayouts,arcadeRim,arcadeSpawns,arcadeWidth} from './arcade-scenery.ts';
import {idleQuips} from './arcade-script.ts';
import {arenaStep,createArena,finishWebs,moveArena,releaseSilkButton,type ArenaInput,type ArenaEvent} from './arena-run.ts';
import {closeCrawlerRopes,createCrawler,crawlerIsSupported} from './crawler.ts';
import {anchorSilk,crossesSolid,sweptHit,type Strand} from './threads.ts';
import {aimHit,moveAxis,SPIDER_HALF_HEIGHT,SPIDER_HALF_WIDTH,type Point,type Rect} from './spider.ts';

export {arcadeHeight,arcadeLayouts,arcadeWidth} from './arcade-scenery.ts';
export const arcadeWebLimit=3;
export const arcadeEscapePresses=5,arcadeEscapeButton=4;
export const flyTrapSeconds=3,bossTrapSeconds=2.8;
export const species=[
  ['Gnat','Steady, medium-speed flight',{speed:55,steer:7,think:1.15,fear:0,silk:0}],
  ['Dart','Dashes in straight bursts',{speed:59,steer:5,think:1.2,fear:0,silk:0,burst:115}],
  ['Veil','Feints and switches sides',{speed:47,steer:10,think:.66,fear:1,silk:0}],
  ['Skipper','Climbs and dives',{speed:51,steer:13,think:.56,fear:0,silk:0,vertical:.72}],
  ['Comet','Very fast, slow to turn',{speed:113,steer:2.8,think:2.1,fear:0,silk:0,straight:.54}],
  ['Leafwing','Spots silk and reroutes',{speed:44,steer:11,think:.62,fear:0,silk:190}],
  ['Looper','Bends its flight into arcs',{speed:58,steer:9,think:1.18,fear:0,silk:0,curve:.53}],
  ['Drifter','Drops into lower lanes',{speed:48,steer:5.5,think:1.35,fear:0,silk:0,sink:23}],
  ['Needle','Slips out of silk sooner',{speed:67,steer:8,think:.95,fear:0,silk:0,hold:2.3}],
  ['Lantern','Steers well clear of webs',{speed:49,steer:12,think:.55,fear:.3,silk:216,buffer:36}],
] as const satisfies readonly (readonly [string,string,Flight])[];
type Flight={speed:number;steer:number;think:number;fear:number;silk:number;burst?:number;vertical?:number;
  straight?:number;curve?:number;sink?:number;hold?:number;buffer?:number};
type FlightPhase='patrol'|'windup'|'strike'|'recover';
type DodgeStyle='zigzag'|'lift'|'feint';
type Dodge={from:Point;to:Point;start:number;end:number;style:DodgeStyle};
type Fly={dodge?:Dodge;dodgeAfter:number;silkHits:number;struckUntil:number;safeUntil:number;
  cocoon?:{struckAt:number;landed:boolean};phase:FlightPhase;phaseAt:number;feinted?:boolean;p:Point;v:Point;target:Point;kind:number;actor:number;age:number;aimAt:number;caughtUntil:number;trappedBy?:Strand;touching:boolean};
type Boss={p:Point;target:Point;hp:number;max:number;size:number;phase:'warn'|'charge'|'recover'|'trapped';at:number;turn:number;side:number;repeated:number;shot?:Strand;net?:Strand;hit:boolean};
export type ArcadeEvent=ArenaEvent|'launch'|'entrance'|'recover'|'boss'|'boss-trap'|'boss-free'|'snared'|'escape-step'|'escape'|'hit'|'silk-hit'|'win'|'hurt';
const len=(p:Point)=>Math.hypot(p.x,p.y);
const sub=(a:Point,b:Point)=>({x:a.x-b.x,y:a.y-b.y});
const dist=(a:Point,b:Point)=>len(sub(a,b));
const clamp=(x:number,min:number,max:number)=>Math.min(max,Math.max(min,x));
const flyRadius=5;
const airBottom=arcadeHeight-12;
const fallLimit=arcadeHeight+16;
export const flyEscapeGrace=1;
const clear=(a:Point,b:Point,surfaces:readonly Rect[])=>!surfaces.some(r=>crossesSolid(a,b,r));
const flightEdge=arcadeRim+flyRadius;
const flyBounds=(p:Point)=>({x:clamp(p.x,flightEdge,arcadeWidth-flightEdge),y:clamp(p.y,flightEdge,airBottom)});
const flightMargin=(r:Rect)=>({x:r.x-flyRadius,y:r.y-flyRadius,w:r.w+2*flyRadius,h:r.h+2*flyRadius});
const flightLayouts=new WeakMap<readonly Rect[],Rect[]>();
function flightSurfaces(run:ArcadeRun) {
  const {surfaces}=run.movement.hunt;
  const cached=flightLayouts.get(surfaces);
  if (cached) return cached;
  const expanded=surfaces.map(flightMargin);
  flightLayouts.set(surfaces,expanded);
  return expanded;
}
export const arcadeStage=(level:number)=>level-1;
export const intentionalArcadeInput=([x,y,ax,ay,buttons]:ArenaInput)=>!!buttons || Math.max(Math.hypot(x,y),Math.hypot(ax,ay))>=64;

export function createArcade(startLevel=1) {
  const movement=createArena('loop',3,false);
  const run={
    movement,level:startLevel,clock:0,phase:'ready' as 'ready'|'wave'|'boss'|'won',
    flies:[] as Fly[],boss:undefined as Boss|undefined,
    rivalWebs:[] as Strand[],snare:undefined as {web:Strand;presses:number}|undefined,
    recovered:0,score:0,quota:0,lives:heartsPerRun,invincible:0,restartIn:0,
    intro:undefined as {kind:'level'|'rival';elapsed:number}|undefined,
    idle:0,idleLine:0,silkHeld:false,silkShots:[] as SilkShot[],ropeWeb:undefined as Strand|undefined,
  };
  prepareLevel(run);
  return run;
}
export type ArcadeRun=ReturnType<typeof createArcade>;

function prepareLevel(run:ArcadeRun) {
  const {movement}=run,hunt=movement.hunt;
  const stage=arcadeStage(run.level);
  hunt.surfaces=arcadeLayouts[stage];
  movement.spider=createCrawler(arcadeSpawns[stage],hunt.surfaces);
  movement.down=false;
  hunt.strands=[];hunt.loose=[];
  run.recovered=0;
  const encounter=dialogueFor(run.level);
  run.quota=encounter.insects.length;
  run.flies=encounter.insects.map(([,kind],index)=>{
    const entrance=flySpawn(run,index);
    return {p:{...entrance},v:{x:0,y:0},target:{...entrance},kind,actor:index,age:0,aimAt:0,caughtUntil:0,touching:false,dodgeAfter:0,silkHits:0,struckUntil:0,safeUntil:0,phase:'patrol' as const,phaseAt:run.clock+.85+index*.48};
  });
  const final=run.level===arcadeLevels;
  run.intro=run.phase==='ready' ? undefined : {kind:final ? 'rival' : 'level',elapsed:0};
  run.idle=0;
  run.silkHeld=false;run.silkShots=[];run.ropeWeb=undefined;
  const p={x:350,y:193};
  run.boss=final ? {p,target:p,hp:4,max:4,size:18,phase:'recover',at:0,turn:0,side:0,repeated:0,hit:false} : undefined;
  if (final && run.phase!=='ready') run.phase='boss';
  run.rivalWebs=[];run.snare=undefined;
}

const nodes=[{x:44,y:102},{x:354,y:103},{x:128,y:32},{x:300,y:36},{x:102,y:184},{x:304,y:183},{x:187,y:75},{x:211,y:138}];
const airNodes=[...nodes,...[28,58,89,121,153,181,200].flatMap(y=>
  [32,79,129,177,221,272,321,370].map(x=>({x,y})))];
function flySpawn(run:ArcadeRun,index:number) {
  if (run.level===1) return nodes[4];
  const surfaces=flightSurfaces(run);
  const slots=airNodes.filter(p=>p.x>=95 && p.y<185 && clear(p,p,surfaces));
  return slots[(index*11+run.level*7)%slots.length];
}

export function arcadeIdleSpeech(run:ArcadeRun) {
  if (run.idle>=5 && run.idle<7.9) return idleQuips[run.idleLine];
}

function silkAcross(from:Point,to:Point,strands:readonly Strand[]) {
  return strands.some(wire=>sweptHit(from,to,wire));
}

export function arcadeAttackStyle(kind:number) {
  if (kind===1 || kind===4) return 'dash';
  if (kind===3 || kind===7) return 'dive';
  if (kind===2 || kind===6 || kind===9) return 'feint';
  return 'pounce';
}

export function arcadeDodgeStyle(kind:number):DodgeStyle {
  if (kind===2 || kind===6 || kind===9) return 'feint';
  if (kind===3 || kind===5 || kind===7) return 'lift';
  return 'zigzag';
}

export function arcadeDirectHits(level:number,actor:number) {
  if (level>=9 && actor===0) return 3;
  if (level>=8 && actor<=1 || level>=6 && actor===0) return 2;
  return 1;
}

function dodgeSilk(run:ArcadeRun,fly:Fly,bounds:readonly Rect[],reading:number) {
  const {clock}=run;
  if (fly.dodge) {
    if (clock<fly.dodge.end) return;
    const {to}=fly.dodge;
    fly.dodge=undefined;
    fly.target=to;fly.aimAt=clock+.5;fly.phase='recover';fly.phaseAt=fly.aimAt;
  }
  if (clock<fly.dodgeAfter || fly.phase==='strike' || run.level===1 && fly.age<.84) return;
  const style=arcadeDodgeStyle(fly.kind);
  const {surfaces,strands}=run.movement.hunt;
  for (const shot of run.silkShots) {
    if (shot.fade!==undefined) continue;
    const offset=sub(fly.p,shot.p),vx=shot.v.x-fly.v.x,vy=shot.v.y-fly.v.y;
    const speed=Math.hypot(vx,vy);
    if (speed<75 || len(offset)>124) continue;
    const time=(offset.x*vx+offset.y*vy)/(speed*speed);
    if (time<.042 || time>.20+reading*.09) continue;
    if (Math.hypot(offset.x-vx*time,offset.y-vy*time)>12 || !clear(shot.p,fly.p,surfaces) || silkAcross(shot.p,fly.p,strands)) continue;
    const side=offset.x*vy-offset.y*vx>=0 ? 1 : -1;
    for (const sign of [side,-side]) {
      const x=style==='lift' ? Math.sign(vx)*9 : vy/speed*48;
      const y=style==='lift' ? 46 : -vx/speed*48;
      const to=flyBounds({x:fly.p.x+sign*x,y:fly.p.y+sign*y});
      const startsOpposite=style==='feint' || style==='zigzag';
      const back=flyBounds({x:fly.p.x-sign*x*.32,y:fly.p.y-sign*y*.32});
      if (dist(to,fly.p)<27 || !clear(fly.p,to,bounds) || silkAcross(fly.p,to,strands)) continue;
      if (startsOpposite && (!clear(fly.p,back,bounds) || silkAcross(fly.p,back,strands))) continue;
      fly.dodge={from:fly.p,to,start:clock,end:clock+.32,style};
      fly.dodgeAfter=clock+1.42-reading*.28;
      fly.phase='recover';
      return;
    }
  }
}

function attackFlight(run:ArcadeRun,fly:Fly,profile:Flight,reading:number) {
  const {spider,hunt:{strands}}=run.movement;
  const now=run.clock;
  const style=arcadeAttackStyle(fly.kind);
  const steep=style==='dive',sideways=style==='dash';
  const player={x:clamp(spider.x+spider.vx*reading*.22,15,385),y:clamp(spider.y+spider.vy*reading*.22,14,207)};
  const clearLane=(from:Point,to:Point)=>clear(from,to,flightSurfaces(run)) && !silkAcross(from,to,strands);
  if (fly.phase==='patrol') {
    if (now<fly.phaseAt || dist(fly.p,player)>190+reading*95) return;
    const away=fly.p.x<player.x ? -1 : 1;
    const lane=run.quota>1 ? (fly.actor%2 ? 1 : -1) : away;
    const offset=steep ? 28 : sideways ? 87 : 66;
    const lift=steep ? 83 : sideways ? 2 : 19+fly.actor%3*16;
    const spots=[lane,-lane].map(side=>({x:clamp(player.x+side*offset,14,386),y:clamp(player.y-lift,14,207)}));
    const approach=spots.find(p=>dist(p,player)>28 && clearLane(fly.p,p) && clearLane(p,player));
    if (!approach && (steep || sideways || run.quota>1 && dist(fly.p,player)>85)) return;
    if (!approach && !clearLane(fly.p,player)) return;
    fly.phase='windup';
    fly.phaseAt=now+(steep ? 1.12 : style==='feint' ? .97 : .78)-reading*.28;
    fly.feinted=false;
    fly.target=approach??{...fly.p};
  }
  if (fly.phase==='windup') {
    if (style==='feint' && !fly.feinted && fly.phaseAt-now<.43) {
      fly.feinted=true;
      const side=fly.target.x<player.x ? 1 : -1;
      const other={x:clamp(player.x+side*49,14,386),y:clamp(player.y-39,14,207)};
      if (clearLane(fly.p,other) && clearLane(other,player)) {
        fly.target=other;
        fly.phaseAt+=.53;
      }
    }
    if (now<fly.phaseAt) return;
    if (!clearLane(fly.p,player)) {
      fly.phase='patrol';fly.phaseAt=now+.25;fly.aimAt=0;
      return;
    }
    const vector=sub(player,fly.p),distance=len(vector)||1;
    const overshoot=sideways ? 48 : 24;
    fly.target={x:clamp(player.x+vector.x/distance*overshoot,14,386),y:clamp(player.y+vector.y/distance*overshoot,14,207)};
    fly.phase='strike';fly.phaseAt=now+(sideways ? .91 : steep ? .82 : 1.05);
  }
  if (fly.phase==='strike' && (now>=fly.phaseAt || dist(fly.p,fly.target)<5 || fly.touching)) {
    fly.phase='recover';fly.phaseAt=now+(sideways || steep ? 1.15 : .95)-reading*.24;fly.aimAt=0;
  }
  if (fly.phase==='recover' && now>=fly.phaseAt) {
    fly.phase='patrol';fly.phaseAt=now+.47+fly.actor*.12;fly.aimAt=0;
  }
}

function fallCocoon(fly:Fly,surfaces:readonly Rect[]) {
  const cocoon=fly.cocoon!;
  const body={...fly.p,vx:fly.v.x*Math.exp(-(cocoon.landed ? 12 : 1.5)*arenaStep),vy:fly.v.y+470*arenaStep};
  if (moveAxis(body,surfaces,'x',body.vx*arenaStep,flyRadius,flyRadius)) body.vx=-fly.v.x*.22;
  const bounded=flyBounds(body);
  if (bounded.x!==body.x) {body.x=bounded.x;body.vx*=-.25;}
  const descending=body.vy>0;
  const impactSpeed=body.vy;
  const stopped=moveAxis(body,surfaces,'y',body.vy*arenaStep,flyRadius,flyRadius);
  if (body.y<12) {body.y=12;body.vy=Math.max(0,body.vy);}
  cocoon.landed=stopped && descending;
  if (cocoon.landed) {
    if (impactSpeed>145) body.vy=-impactSpeed*.16;
    if (Math.abs(body.vx)<1) body.vx=0;
  }
  fly.p={x:body.x,y:body.y};
  fly.v={x:body.vx,y:body.vy};
}

function tagFly(run:ArcadeRun,shot:SilkShot,from:Point,emit:(event:ArcadeEvent)=>void) {
  const travel=sub(shot.p,from),distance=len(travel);
  if (distance<.001) return false;
  const direction={x:travel.x/distance,y:travel.y/distance};
  let first=distance+1e-5;
  let prey:Fly|undefined;
  for (const fly of run.flies) {
    if (fly.caughtUntil) continue;
    const offset=sub(fly.p,from);
    const along=offset.x*direction.x+offset.y*direction.y;
    const lateral=offset.x*direction.y-offset.y*direction.x;
    const radius=flyRadius+1;
    if (Math.abs(lateral)>radius) continue;
    const depth=Math.sqrt(radius**2-lateral**2);
    if (along+depth<0) continue;
    const entry=Math.max(0,along-depth);
    const contact={x:from.x+entry*direction.x,y:from.y+entry*direction.y};
    if (entry<first && clear(contact,fly.p,run.movement.hunt.surfaces)) {
      first=entry;
      prey=fly;
    }
  }
  if (!prey) return false;
  prey.silkHits++;
  prey.struckUntil=run.clock+.3;
  prey.dodge=undefined;
  prey.phase='recover';prey.phaseAt=run.clock+.51;prey.aimAt=0;
  prey.dodgeAfter=Math.max(prey.dodgeAfter,run.clock+.55);
  shot.p={x:from.x+first*direction.x,y:from.y+first*direction.y};
  shot.fade=.08;
  if (prey.silkHits<arcadeDirectHits(run.level,prey.actor)) {
    prey.v={x:prey.v.x*.6+shot.v.x*.10,y:prey.v.y*.6+shot.v.y*.10};
    emit('silk-hit');
    return true;
  }
  const profile:Flight=species[prey.kind][2];
  prey.caughtUntil=run.clock+(profile.hold??flyTrapSeconds);
  prey.cocoon={struckAt:run.clock,landed:false};
  prey.trappedBy=undefined;prey.touching=false;
  prey.v={x:shot.v.x*.34+prey.v.x*.25,y:shot.v.y*.34+prey.v.y*.25};
  emit('catch');
  return true;
}

function tickFlies(run:ArcadeRun,emit:(event:ArcadeEvent)=>void) {
  const {spider,hunt}=run.movement;
  const bounds=flightSurfaces(run);
  const lineup=dialogueFor(run.level).insects;
  const average=lineup.reduce((sum,[,kind])=>sum+species[kind][2].speed,0)/lineup.length;
  const reading=(run.level-1)/8;
  const overlaps=(point:Point)=>Math.abs(point.x-spider.x)<=SPIDER_HALF_WIDTH+4 &&
    Math.abs(point.y-spider.y)<=SPIDER_HALF_HEIGHT+4 && clear(point,spider,hunt.surfaces);
  function capture(point:Point) {
    if (!overlaps(point)) return false;
    run.recovered++;run.score++;
    emit('recover');
    return true;
  }
  function escape(fly:Fly) {
    if (fly.cocoon) {
      fly.v={x:0,y:0};fly.cocoon=undefined;fly.silkHits=0;
    }
    fly.caughtUntil=0;
    fly.safeUntil=run.clock+flyEscapeGrace;
    fly.touching=false;
    fly.aimAt=0;fly.phase='recover';fly.phaseAt=fly.safeUntil;
    fly.dodgeAfter=Math.max(fly.dodgeAfter,fly.safeUntil);
  }
  run.flies=run.flies.filter(fly=>{
    if (!run.lives) return true;
    if (fly.caughtUntil) {
      if (run.clock<fly.caughtUntil && (!fly.trappedBy || hunt.strands.includes(fly.trappedBy))) {
        if (fly.cocoon) {
          if (capture(fly.p)) return false;
          fallCocoon(fly,hunt.surfaces);
          if (fly.p.y>fallLimit) {
            fly.p={...flySpawn(run,fly.actor)};
            escape(fly);
            return true;
          }
        }
        return !capture(fly.p);
      }
      escape(fly);
      return true;
    }
    if (fly.trappedBy && !nearWire(fly.p,fly.trappedBy,5)) fly.trappedBy=undefined;
    const touching=run.clock>=fly.safeUntil && overlaps(fly.p);
    if (touching && !fly.touching) hurt(run,emit);
    fly.touching=touching;
    if (!run.lives) return true;
    fly.age+=arenaStep;
    const profile:Flight=species[fly.kind][2];
    const buffer=profile.buffer??0;
    dodgeSilk(run,fly,bounds,reading);
    if (!fly.dodge) attackFlight(run,fly,profile,reading);
    if (!fly.dodge && (fly.phase==='patrol' || fly.phase==='recover') && (run.clock>=fly.aimAt || fly.phase==='patrol' && dist(fly.p,fly.target)<12)) {
      const playerNear=dist(fly.p,spider)<75+reading*54 && clear(fly.p,spider,hunt.surfaces);
      const from=fly.p;
      const choices=airNodes.filter(node=>dist(from,node)>40 && clear(from,node,bounds));
      let best=-Infinity;
      for (const [i,node] of choices.entries()) {
        const silkAhead=silkAcross(from,node,hunt.strands);
        const netNear=buffer>0 && hunt.strands.some(wire=>nearWire(node,wire,buffer));
        const score=Math.sin(i*2.3+run.clock*2+fly.kind+fly.actor*.8)*55+dist(from,node)*.11
          + (fly.phase==='recover' ? dist(node,spider)*.54 : playerNear ? dist(node,spider)*(profile.fear*.22-.28-reading*.28) : 0)
          +Math.abs(node.y-from.y)*(profile.vertical??0)
          +Math.abs(node.x-from.x)*(profile.straight??0)-Math.abs(node.y-from.y)*(profile.straight??0)
          +(playerNear && profile.vertical ? Math.abs(node.y-spider.y)*reading : 0)
          -(run.level>=7 && run.flies.some(other=>other!==fly && other.target===node) ? 60 : 0)
          -(netNear ? 90 : 0)-(silkAhead ? 100+profile.silk+reading*100 : 0);
        if(score>best) {best=score;fly.target=node;}
      }
      fly.aimAt=run.clock+profile.think/(1+reading*.76);
      if (run.level===1 && fly.age<.84 && !silkAcross(fly.p,{x:34,y:168},hunt.strands)) fly.target=fly.p.x>65 ? {x:34,y:168} : {x:102,y:184};
    }
    let direction=sub(fly.target,fly.p);
    if (fly.dodge) {
      const {from,to,start,style}=fly.dodge;
      const shift=sub(to,from),swing=run.clock-start;
      const scale=style==='zigzag' ? swing<.105 ? .66 : swing<.205 ? -.24 : 1 : style==='feint' && swing<.09 ? -.32 : 1;
      direction=sub({x:from.x+shift.x*scale,y:from.y+shift.y*scale},fly.p);
    }
    const length=Math.max(len(direction),fly.dodge ? 12 : 1);
    const curve=fly.phase==='patrol' ? Math.sin(fly.age*8)*(profile.curve??0) : 0;
    const baseSpeed=(profile.burst && fly.age%1.45<.32 ? profile.burst : profile.speed)/average*(50+(run.level-1)*6);
    const style=arcadeAttackStyle(fly.kind);
    const preparing=style==='dive' ? 104 : style==='feint' ? (fly.age%.24<.13 ? 142 : 40) : baseSpeed*.8;
    const speed=fly.dodge ? 166+reading*22 : fly.phase==='strike' ? baseSpeed*1.22+57+reading*22 : fly.phase==='windup' ? preparing : fly.phase==='recover' ? baseSpeed*.49 : baseSpeed;
    const x=(direction.x-direction.y*curve)/length*speed;
    const y=(direction.y+direction.x*curve)/length*speed;
    const mix=arenaStep*(fly.dodge ? 28 : fly.phase==='strike' ? style==='dash' ? 7 : 15 : fly.phase==='windup' && style==='dive' ? 12 : profile.steer);
    fly.v.x+=(x-fly.v.x)*mix;
    fly.v.y+=(y+(fly.phase==='patrol' ? profile.sink??0 : 0)-fly.v.y)*mix;
    const intended=flyBounds({x:fly.p.x+fly.v.x*arenaStep,y:fly.p.y+fly.v.y*arenaStep});
    const body={...fly.p,vx:fly.v.x,vy:fly.v.y};
    const blockedX=moveAxis(body,hunt.surfaces,'x',intended.x-body.x,flyRadius,flyRadius);
    const blockedY=moveAxis(body,hunt.surfaces,'y',intended.y-body.y,flyRadius,flyRadius);
    const next={x:body.x,y:body.y};
    for (const wire of hunt.strands) {
      if (wire===fly.trappedBy) continue;
      const hit=sweptHit(fly.p,next,wire);
      if (!hit || !clear(fly.p,hit.point,bounds)) continue;
      fly.p=hit.point;fly.dodge=undefined;fly.trappedBy=wire;fly.touching=false;fly.caughtUntil=run.clock+(profile.hold??flyTrapSeconds);
      wire.expiresAt=Math.max(wire.expiresAt??0,fly.caughtUntil);
      wire.shakeUntil=run.clock+.42;
      if (capture(fly.p)) return false;
      emit('catch');return true;
    }
    fly.p=next;
    if (blockedX || blockedY) {
      if (blockedX) fly.v.x*=-.22;
      if (blockedY) fly.v.y*=-.22;
      fly.aimAt=0;
      if (fly.phase==='strike') {fly.phase='recover';fly.phaseAt=run.clock+.8;}
    }
    const stillTouching=run.clock>=fly.safeUntil && overlaps(fly.p);
    if (stillTouching && !fly.touching) hurt(run,emit);
    fly.touching=stillTouching;
    return true;
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
  if (!run.lives) run.restartIn=.95;
  emit('hurt');
}

function aimRivalWeb(target:Point,surfaces:readonly Rect[]) {
  for (const tilt of [.3,-.3,.61,-.61,1,-1]) {
    const from=aimHit(target,surfaces,{x:target.x-tilt,y:target.y-1},{range:arcadeHeight});
    const to=aimHit(target,surfaces,{x:target.x+tilt,y:target.y+1},{range:arcadeHeight});
    if (from && to && to.y-from.y>=30 && diagonalWeb(from,to)) return {from,to,shakeUntil:0};
  }
}
function warnBoss(run:ArcadeRun,boss:Boss) {
  const {spider,hunt}=run.movement;
  boss.turn++;
  const side=Math.sign(spider.vx);
  boss.repeated=side && side===boss.side ? boss.repeated+1 : 0;
  boss.side=side;
  const track=boss.turn%3!==0;
  const predicted=track ? .29 : 0;
  const intercept=spider.vx*predicted;
  const hop=boss.turn%3===0 || boss.repeated>=2;
  const size=boss.size+7;
  const goal={x:clamp(spider.x+intercept,size,arcadeWidth-size),
    y:hop ? 88+(boss.turn%2)*40 : clamp(spider.y+spider.vy*predicted,42,200)};
  let target=goal;
  if (!clear(boss.p,goal,hunt.surfaces)) {
    target=airNodes.filter(node=>dist(node,boss.p)>24 && clear(boss.p,node,hunt.surfaces))
      .sort((a,b)=>dist(a,goal)-dist(b,goal))[0]??boss.p;
  }
  boss.target=target;
  boss.shot=boss.turn%2===0 ? aimRivalWeb(
    {x:clamp(spider.x+intercept,18,arcadeWidth-18),y:spider.y},hunt.surfaces) : undefined;
  boss.phase='warn';boss.at=run.clock+.74;
}

function tickBoss(run:ArcadeRun,emit:(event:ArcadeEvent)=>void) {
  const boss=run.boss!;
  const {spider,hunt}=run.movement;
  const touches=()=>dist(boss.p,spider)<boss.size+SPIDER_HALF_WIDTH && clear(boss.p,spider,hunt.surfaces);
  if (boss.phase==='trapped') {
    if (run.clock>=boss.at || boss.net && !hunt.strands.includes(boss.net)) {
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
  const speed=238;
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
  if (factor===1) {boss.phase='recover';boss.at=run.clock+.85;}
}

function tickRivalWebs(run:ArcadeRun,from:Point,emit:(event:ArcadeEvent)=>void) {
  run.rivalWebs=run.rivalWebs.filter(web=>web===run.snare?.web || (web.expiresAt??Infinity)>run.clock);
  if (run.snare || run.clock<run.invincible) return;
  const {spider}=run.movement;
  const web=run.rivalWebs.find(wire=>sweptHit(from,spider,wire) || nearWire(spider,wire,5));
  if (!web) return;
  closeCrawlerRopes(spider);
  spider.thread=undefined;
  spider.vx=0;spider.vy=0;
  run.snare={web,presses:0};
  run.silkHeld=false;run.silkShots=[];run.ropeWeb=undefined;
  web.shakeUntil=run.clock+.35;
  emit('snared');
}
function arcadeSilk(run:ArcadeRun,input:ArenaInput,emit:(event:ArcadeEvent)=>void):ArenaInput {
  const [, ,ax,ay,buttons]=input;
  const {spider,aim}=run.movement;
  if (buttons&2) {
    const length=Math.hypot(ax,ay);
    const direction=length ? {x:ax/length,y:ay/length} : aim;
    run.silkHeld=true;
    run.silkShots.push(launchSilk(spider,direction,{x:spider.vx,y:spider.vy}));
    emit('launch');
  }
  if (buttons&releaseSilkButton) {
    if (run.silkHeld && spider.rope) {
      closeCrawlerRopes(spider);
      emit('release');
    }
    run.silkHeld=false;
  }
  return [input[0],input[1],ax,ay,buttons&~(2|releaseSilkButton)];
}

function pruneDependentWebs(run:ArcadeRun) {
  const {hunt,spider}=run.movement;
  const retained=new Set(hunt.strands);
  hunt.strands=hunt.strands.filter(web=>{
    for (let parent=web.parent;parent;parent=parent.parent) {
      if (!retained.has(parent)) return false;
    }
    return true;
  });
  if (run.ropeWeb && !hunt.strands.includes(run.ropeWeb)) {
    closeCrawlerRopes(spider);
    run.ropeWeb=undefined;
  }
}

function tickSilkShots(run:ArcadeRun,emit:(event:ArcadeEvent)=>void) {
  const {movement}=run,{spider,hunt}=movement;
  run.silkShots=run.silkShots.filter(shot=>{
    if (shot.fade!==undefined) {
      shot.fade-=arenaStep;
      return shot.fade>0;
    }
    const from=shot.p;
    const travelled=advanceSilk(shot,hunt.surfaces,hunt.strands,arenaStep);
    if (tagFly(run,shot,from,emit)) return true;
    if (travelled) {
      if (!shot.hit) return true;
      const {point,web}=shot.hit;
      if (crawlerIsSupported(spider,hunt.surfaces)) {
        const before=hunt.strands.length;
        if (anchorSilk(hunt.strands,point,arcadeSilkReach+SPIDER_HALF_HEIGHT,spider,hunt.surfaces,undefined,to=>diagonalWeb(point,to))) {
          if (web && hunt.strands.length>before) hunt.strands[before].parent=web;
          finishWebs(movement,before,emit,arcadeWebLimit);
          pruneDependentWebs(run);
          return false;
        }
      } else {
        const rope=ropeAt(point,spider);
        if (rope && clear(spider,point,hunt.surfaces)) {
          spider.rope=rope;
          run.ropeWeb=web;
          spider.support=undefined;spider.thread=undefined;spider.grounded=false;
          emit('attach');
          return false;
        }
      }
    }
    emit('miss');
    shot.fade=.08;
    return true;
  });
}

export function advanceArcade(run:ArcadeRun,input:ArenaInput,emit:(event:ArcadeEvent)=>void=()=>{}) {
  if (run.restartIn>0) {
    run.restartIn-=arenaStep;
    if (run.restartIn<=0) {
      Object.assign(run,createArcade());
      run.phase='wave';
      run.intro={kind:'level',elapsed:0};
      emit('entrance');
    }
    return;
  }
  if (run.phase==='ready') {
    if (!intentionalArcadeInput(input)) return;
    run.phase=run.boss ? 'boss' : 'wave';
    run.intro={kind:run.boss ? 'rival' : 'level',elapsed:0};
    emit(run.boss ? 'boss' : 'entrance');
  }
  if (run.phase==='won') return;
  if (run.intro) {
    const intro=run.intro;
    intro.elapsed+=arenaStep;
    const duration=levelIntroDuration(run.level);
    if (intro.elapsed>=duration || intro.elapsed>=.4 && (input[4]&arcadeEscapeButton)!==0) {
      run.intro=undefined;
    }
    return;
  }
  run.clock+=arenaStep;
  run.movement.hunt.clock=run.clock;
  run.movement.hunt.strands=run.movement.hunt.strands.filter(wire=>(wire.expiresAt??Infinity)>run.clock);
  pruneDependentWebs(run);
  const {spider}=run.movement,from={x:spider.x,y:spider.y};
  if (run.snare) {
    if ((input[4]&arcadeEscapeButton)!==0) {
      run.snare.presses++;
      run.snare.web.shakeUntil=run.clock+.25;
      if (run.snare.presses>=arcadeEscapePresses) {releasePlayer(run);emit('escape');}
      else emit('escape-step');
    }
  } else {
    moveArena(run.movement,arcadeSilk(run,input,emit),emit,{
      climbSilk:false,adjustRope:true,webLimit:arcadeWebLimit,ropeRange:arcadeSilkReach,directionalJump:true,
    });
    if (!spider.rope) run.ropeWeb=undefined;
    if (spider.y>fallLimit) {
      hurt(run,emit);
      run.movement.spider=createCrawler(arcadeSpawns[arcadeStage(run.level)],run.movement.hunt.surfaces);
      run.movement.down=false;
      run.silkShots=[];run.silkHeld=false;run.ropeWeb=undefined;run.idle=0;
      return;
    }
    tickSilkShots(run,emit);
  }
  if (run.snare || intentionalArcadeInput(input) || dist(spider,from)>.045) {
    if (run.idle>=5) run.idleLine=(run.idleLine+1)%idleQuips.length;
    run.idle=0;
  } else {
    run.idle+=arenaStep;
    if (run.idle>=19) {run.idle=0;run.idleLine=(run.idleLine+1)%idleQuips.length;}
  }
  if (run.phase==='wave') tickFlies(run,emit);
  if (!run.lives) return;
  if (run.phase==='boss') {
    tickRivalWebs(run,from,emit);
    tickBoss(run,emit);
    if (!run.boss!.hp) {run.phase='won';emit('win');}
  } else if (run.flies.length===0) {
    run.level++;
    prepareLevel(run);
    emit(run.boss ? 'boss' : 'entrance');
  }
  pruneDependentWebs(run);
}
