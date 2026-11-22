import {castCrawler,closeCrawlerRopes,createCrawler,jumpCrawler,normals,tickCrawler} from './crawler.ts';
import {aimHit,DEFAULT_TUNING,SPIDER_HALF_HEIGHT,type Point,type Rect} from './spider.ts';
import {anchorSilk,crossesSolid,fixSilk,leaveSilk,sweptHit,type Strand,type Web} from './threads.ts';

export const stealthWidth=520;
export const stealthHeight=290;
export const floorY=270;
export const entry={x:32,y:floorY-8};
export const exit={x:490,y:floorY-8};
export const sightRange=83;
export const sightSlope=.33;
export const escapePresses=5;
const shotSpeed=240;
const jumpSpeed=172;
export const quietSpeed=35;
const wireLifetime=18;
const grip=(x:number,y:number,w:number,h:number):Rect=>({x,y,w,h,grip:true});
const boundary=[
  grip(0,0,520,16),grip(0,floorY,520,20),grip(0,16,9,254),grip(511,16,9,254),
];
export const room=[
  ...boundary,
  grip(145,16,18,218), grip(331,82,18,188),
  grip(59,233,24,7), grip(183,208,64,9), grip(257,150,56,8),
  grip(217,91,58,8), grip(366,137,67,8), grip(447,190,38,8),
];

const practiceRoom=[
  ...boundary,
  // Three steps lead into the lower ledge and leave the ceiling lane open.
  grip(55,251,26,19),grip(81,229,25,41),grip(106,205,32,65),
  grip(148,182,56,10),grip(175,127,38,10),
  // The offset ledges make a route for jumps, rope transfers and underside grips.
  grip(221,222,39,9),grip(250,164,43,9),grip(230,89,60,11),
  grip(306,126,43,10),grip(301,136,12,29),
  // Facing walls form a shaft with side openings and a clear drop back to the floor.
  grip(363,159,14,76),grip(408,111,15,81),grip(377,211,25,9),
  grip(445,73,66,8),grip(460,174,51,9),
];

type EnemyWeb=Strand & {expiresAt:number};
type Attack={from:Point;to:Point;at:number;web:boolean};
export type Guard={
  x:number; y:number; low:number; high:number; facing:-1|1; alert:number; speed:number;
  lastKnown?:number; searchesUntil:number; witnessed:boolean; caught:boolean;
  attack?:Attack; nextAttack:number; trap?:{from:Point;to:Point};
};

export interface StealthInput {move:Point;aim?:Point;jump:boolean;silk:boolean;escape?:boolean;}

function patrol(x:number,y:number,low:number,high:number,facing:-1|1,speed:number,trap?:Guard['trap']):Guard {
  return {x,y,low,high,facing,speed,trap,alert:0,witnessed:false,caught:false,searchesUntil:0,nextAttack:0};
}

export function createStealth(practice=false) {
  const surfaces=practice ? practiceRoom : room;
  return {
    practice,surfaces,
    spider:createCrawler(entry,surfaces),
    guards:practice ? [] : [
      patrol(108,262,87,134,1,21),
      patrol(231,262,178,312,-1,27,{from:{x:206,y:217},to:{x:206,y:270}}),
      patrol(285,142,285,285,-1,0),
      patrol(250,83,227,265,1,20),
      patrol(399,129,377,423,-1,23),
      patrol(421,262,421,421,-1,0,{from:{x:455,y:198},to:{x:455,y:270}}),
    ],
    web:{loose:[],strands:[]} as Pick<Web,'loose'|'strands'>,
    enemyWebs:[] as EnemyWeb[],
    shots:[] as {p:Point;to:Point}[],
    trapped:undefined as {until:number;presses:number}|undefined,
    safeUntil:0,escapeHeld:false,
    aim:{x:.56,y:-.828}, clock:0, jumpHeld:false, silkHeld:false,
    noise:undefined as {x:number;y:number;strength:number;until:number}|undefined,
    phase:'play' as 'play'|'over'|'complete',
  };
}
export type StealthRun=ReturnType<typeof createStealth>;
export type StealthEvent='jump'|'launch'|'attach'|'fix'|'release'|'miss'|'catch'|'seen'|'land'|'trap'|'escaped';
const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));
const magnitude=(p:Point)=>Math.hypot(p.x,p.y);
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);

function unit(point:Point):Point {
  const n=magnitude(point)||1;
  return {x:point.x/n,y:point.y/n};
}

export function stealthStick(raw:Point):Point {
  const deadZone=.07;
  const strength=clamp((magnitude(raw)-deadZone)/(1-deadZone),0,1)**1.65;
  const direction=unit(raw);
  return {x:direction.x*strength,y:direction.y*strength};
}

export function stealthAnchor(game:StealthRun) {
  const {spider,aim}=game;
  return aimHit(spider,game.surfaces,{x:spider.x+aim.x,y:spider.y+aim.y});
}

function jumpStealth(game:StealthRun,raw:Point) {
  const {spider}=game;
  const normal=spider.support ? normals[spider.support] : undefined;
  const chosen=magnitude(raw)>.19 ? unit(raw) : normal??{x:0,y:-1};
  let direction=chosen;
  if (normal) {
    // Give the body room to leave its current contact even for a tangential jump.
    const lift=Math.max(0,.38-(normal.x*chosen.x+normal.y*chosen.y));
    direction=unit({x:chosen.x+normal.x*(lift+.04),y:chosen.y+normal.y*(lift+.04)});
  }
  if (!jumpCrawler(spider,jumpSpeed)) return false;
  spider.vx=direction.x*jumpSpeed;
  spider.vy=direction.y*jumpSpeed;
  return true;
}

function expose(game:StealthRun,guard:Guard,emit:(event:StealthEvent)=>void) {
  if (!guard.witnessed) emit('seen');
  guard.witnessed=true;
  guard.alert=1;
  guard.lastKnown=game.spider.x;
  guard.searchesUntil=game.clock+2.1;
}

function castSilk(game:StealthRun,emit:(event:StealthEvent)=>void) {
  const {spider,aim}=game;
  const range=DEFAULT_TUNING.range;
  const target={x:spider.x+aim.x,y:spider.y+aim.y};
  const solid=stealthAnchor(game);
  let nearest=solid ? distance(spider,solid) : range;
  let targetGuard:Guard|undefined;
  for (const guard of game.guards) {
    if (guard.caught) continue;
    const dx=guard.x-spider.x,dy=guard.y-spider.y;
    const along=dx*aim.x+dy*aim.y;
    if (along<0 || along>=nearest || Math.abs(dx*aim.y-dy*aim.x)>8) continue;
    nearest=along;
    targetGuard=guard;
  }
  if (targetGuard) {
    targetGuard.caught=true;
    game.noise={x:targetGuard.x,y:targetGuard.y,strength:68,until:game.clock+.38};
    emit('catch');
  } else if (solid && castCrawler(spider,game.surfaces,target,{range,minLength:8})) {
    emit('attach');
  } else emit('miss');
}

function releaseSilk(game:StealthRun,emit:(event:StealthEvent)=>void) {
  const rope=closeCrawlerRopes(game.spider);
  if (rope) {
    const reach=DEFAULT_TUNING.range+SPIDER_HALF_HEIGHT;
    if (!anchorSilk(game.web.strands,rope,reach,game.spider,game.surfaces)) leaveSilk(game.web,rope,reach);
    const contact=createCrawler(game.spider,game.surfaces).support;
    if (contact) {
      game.spider.support=contact;
      game.spider.grounded=true;
    }
    emit('release');
  }
}

export function guardSees(guard:Guard,p:Point) {
  if (p.x<48 && p.y>floorY-34) return false;
  const ahead=(p.x-guard.x)*guard.facing;
  return ahead>=0 && ahead<sightRange && Math.abs(p.y-guard.y)<=8+ahead*sightSlope &&
    !room.some(surface=>crossesSolid(guard,p,surface));
}

function bindPlayer(game:StealthRun,emit:(event:StealthEvent)=>void) {
  if (game.trapped || game.clock<game.safeUntil) return;
  game.trapped={presses:0,until:game.clock+7};
  closeCrawlerRopes(game.spider);
  game.spider.vx=0;
  game.spider.vy=0;
  emit('trap');
}

function enemySilk(game:StealthRun,dt:number,emit:(event:StealthEvent)=>void) {
  game.shots=game.shots.filter(shot=>{
    const remaining=distance(shot.p,shot.to);
    const travel=Math.min(remaining,shotSpeed*dt);
    const direction=unit({x:shot.to.x-shot.p.x,y:shot.to.y-shot.p.y});
    const next={x:shot.p.x+direction.x*travel,y:shot.p.y+direction.y*travel};
    const offset={x:game.spider.x-shot.p.x,y:game.spider.y-shot.p.y};
    const along=clamp(offset.x*direction.x+offset.y*direction.y,0,travel);
    if (Math.hypot(offset.x-direction.x*along,offset.y-direction.y*along)<8 &&
        !room.some(surface=>crossesSolid(shot.p,game.spider,surface))) {
      bindPlayer(game,emit);
      return false;
    }
    shot.p=next;
    return travel<remaining;
  });
}

function advanceGuard(game:StealthRun,guard:Guard,dt:number,emit:(event:StealthEvent)=>void) {
  if (guard.caught) return;
  const {spider,noise}=game;
  const sees=guardSees(guard,spider);
  const hears=noise && noise.until>game.clock && distance(guard,noise)<noise.strength &&
    !room.some(surface=>crossesSolid(guard,noise,surface));
  if (sees || hears) {
    guard.lastKnown=sees ? spider.x : noise?.x;
    guard.searchesUntil=game.clock+1.55;
  }
  if (sees) {
    guard.alert=Math.min(1,guard.alert+dt*1.55);
    if (guard.alert>=1) expose(game,guard,emit);
  } else {
    guard.alert=hears ? Math.min(.75,guard.alert+dt*.9) : Math.max(0,guard.alert-dt*.62);
  }
  if (guard.attack) {
    if (game.clock<guard.attack.at) return;
    const {from,to,web}=guard.attack;
    if (web) game.enemyWebs.push({from,to,shakeUntil:0,expiresAt:game.clock+14});
    else game.shots.push({p:from,to});
    guard.attack=undefined;
    guard.nextAttack=game.clock+2.8;
    emit('launch');
    return;
  }
  if (game.clock>=guard.nextAttack && !game.trapped && (guard.witnessed && sees || guard.trap && sees && guard.alert>.56)) {
    const trap=guard.trap;
    const useTrap=trap && !game.enemyWebs.some(wire=>wire.from===trap.from);
    const from={x:guard.x,y:guard.y};
    if (useTrap) guard.attack={...trap,at:game.clock+.48,web:true};
    else {
      const direction=unit({x:spider.x-from.x,y:spider.y-from.y});
      const end={x:from.x+direction.x*123,y:from.y+direction.y*123};
      guard.attack={from,to:aimHit(from,room,end,{range:123})??end,at:game.clock+.38,web:false};
    }
    return;
  }
  if (!guard.speed) return;
  const investigating=guard.lastKnown!==undefined && game.clock<guard.searchesUntil;
  if (investigating) {
    const delta=clamp(guard.lastKnown!,guard.low,guard.high)-guard.x;
    if (Math.abs(delta)>1.5) {
      guard.facing=delta<0 ? -1 : 1;
      guard.x+=guard.facing*Math.min(Math.abs(delta),dt*(guard.witnessed ? 77 : 45));
    }
  } else {
    guard.x+=guard.facing*guard.speed*dt;
    if (guard.x<=guard.low || guard.x>=guard.high) {
      guard.x=clamp(guard.x,guard.low,guard.high);
      guard.facing=guard.facing===1 ? -1 : 1;
    }
  }
}

export function stepStealth(game:StealthRun,input:StealthInput,dt:number,emit:(event:StealthEvent)=>void) {
  if (game.phase!=='play') return;
  const {spider,web}=game;
  game.clock+=dt;
  const freshEscape=input.escape && !game.escapeHeld;
  game.escapeHeld=!!input.escape;
  game.enemyWebs=game.enemyWebs.filter(wire=>wire.expiresAt>game.clock);
  if (game.trapped) {
    if (freshEscape) game.trapped.presses++;
    if (game.trapped.presses>=escapePresses) {
      game.trapped=undefined;
      game.safeUntil=game.clock+1.15;
      emit('escaped');
    } else if (game.clock>=game.trapped.until) game.phase='over';
    game.silkHeld=input.silk;
  } else {
    moveStealth(game,input,dt,emit);
  }
  game.jumpHeld=input.jump;
  for (const guard of game.guards) advanceGuard(game,guard,dt,emit);
  enemySilk(game,dt,emit);
  if (!game.practice && game.phase==='play' && !game.trapped && distance(spider,exit)<17 &&
    !game.guards.some(guard=>guard.witnessed && !guard.caught)) game.phase='complete';
  web.strands=web.strands.filter(strand=>(strand.expiresAt??Infinity)>game.clock).slice(-8);
}

function moveStealth(game:StealthRun,input:StealthInput,dt:number,emit:(event:StealthEvent)=>void) {
  const {spider,web}=game;
  if (game.noise && game.noise.until<=game.clock) game.noise=undefined;
  if (input.aim) game.aim=unit(input.aim);
  if (input.jump && !game.jumpHeld && jumpStealth(game,input.move)) emit('jump');
  const before=web.strands.length;
  if (input.silk && !game.silkHeld) {
    emit('launch');
    castSilk(game,emit);
  } else if (!input.silk && game.silkHeld) releaseSilk(game,emit);
  game.silkHeld=input.silk;
  const previous={x:spider.x,y:spider.y};
  const falling=spider.vy;
  if (spider.rope && input.move.y>.43 && spider.rope.length<DEFAULT_TUNING.range) {
    spider.rope.length=Math.min(DEFAULT_TUNING.range,spider.rope.length+DEFAULT_TUNING.reelSpeed*dt);
  }
  tickCrawler(spider,game.surfaces,stealthStick(input.move),input.move.y<-.43,dt,web.strands,
    {crawlSpeed:103,airAcceleration:120,ropeMinimum:8});
  for (const wire of game.enemyWebs) {
    if (!sweptHit(previous,spider,wire)) continue;
    bindPlayer(game,emit);
    if (game.trapped) wire.shakeUntil=game.clock+.4;
  }
  const impact=spider.support==='floor' && spider.y>previous.y && falling>52;
  if (impact) emit('land');
  if (spider.support==='floor' && (impact || Math.abs(spider.vx)>quietSpeed)) {
    game.noise={x:spider.x,y:spider.y,strength:impact ? 118 : 54+Math.abs(spider.vx)*.38,until:game.clock+.29};
  }
  fixSilk(web,spider,game.surfaces);
  for (const strand of web.strands.slice(before)) strand.expiresAt=game.clock+wireLifetime;
  if (web.strands.length>before) emit('fix');
}
