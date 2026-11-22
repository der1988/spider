import {castCrawler,closeCrawlerRopes,createCrawler,jumpCrawler,normals,tickCrawler} from './crawler.ts';
import {aimHit,DEFAULT_TUNING,SPIDER_HALF_HEIGHT,type Point,type Rect} from './spider.ts';
import {anchorSilk,crossesSolid,fixSilk,leaveSilk,type Web} from './threads.ts';

export const stealthWidth=520;
export const stealthHeight=290;
export const floorY=270;
export const entry={x:32,y:floorY-8};
export const exit={x:490,y:floorY-8};
export const sightRange=83;
export const sightHeight=24;
export const chargeTime=.68;
export const quietSpeed=35;
const minSilkRange=42;
const wireLifetime=18;
const grip=(x:number,y:number,w:number,h:number):Rect=>({x,y,w,h,grip:true});
export const room=[
  grip(0,0,520,16),grip(0,floorY,520,20),grip(0,16,9,254),grip(511,16,9,254),
  grip(62,243,23,27),grip(237,230,43,40),grip(452,244,21,26),
  grip(40,184,77,9),grip(142,127,100,10),grip(276,178,75,10),
  grip(362,114,70,9),grip(449,186,25,9),grip(236,60,56,9),
];

export type Guard={
  x:number; y:number; low:number; high:number; facing:-1|1; alert:number;
  lastKnown?:number; searchesUntil:number; witnessed:boolean; caught:boolean;
};

export interface StealthInput {move:Point;aim?:Point;jump:boolean;silk:boolean;}

function patrol(x:number,low:number,high:number,facing:-1|1):Guard {
  return {x,y:floorY-8,low,high,facing,alert:0,witnessed:false,caught:false,searchesUntil:0};
}

export function createStealth() {
  return {
    spider:createCrawler(entry,room), guards:[patrol(155,94,222,1),patrol(401,292,443,-1)],
    web:{loose:[],strands:[]} as Pick<Web,'loose'|'strands'>,
    aim:{x:.56,y:-.828}, clock:0, jumpCharge:0, silkCharge:0, usedSilk:false,
    noise:undefined as {x:number;y:number;strength:number;until:number}|undefined,
    phase:'play' as 'play'|'over'|'complete',
  };
}
export type StealthRun=ReturnType<typeof createStealth>;
export type StealthEvent='jump'|'launch'|'attach'|'fix'|'release'|'miss'|'catch'|'seen'|'land';
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

export function silkReach(charge:number) {
  return minSilkRange+(DEFAULT_TUNING.range-minSilkRange)*clamp(charge/chargeTime,0,1);
}

function releaseJump(game:StealthRun,raw:Point) {
  const {spider}=game;
  const normal=spider.support ? normals[spider.support] : undefined;
  const chosen=magnitude(raw)>.19 ? unit(raw) : normal??{x:0,y:-1};
  let direction=chosen;
  if (normal) {
    // Give the body room to leave its current contact even for a tangential jump.
    const lift=Math.max(0,.38-(normal.x*chosen.x+normal.y*chosen.y));
    direction=unit({x:chosen.x+normal.x*(lift+.04),y:chosen.y+normal.y*(lift+.04)});
  }
  const speed=108+119*clamp(game.jumpCharge/chargeTime,0,1);
  if (!jumpCrawler(spider,speed)) return false;
  spider.vx=direction.x*speed;
  spider.vy=direction.y*speed;
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
  const range=silkReach(game.silkCharge);
  const target={x:spider.x+aim.x*range,y:spider.y+aim.y*range};
  const solid=aimHit(spider,room,target,{range});
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
    game.usedSilk=true;
    game.noise={x:targetGuard.x,y:targetGuard.y,strength:68,until:game.clock+.38};
    emit('catch');
  } else if (solid && castCrawler(spider,room,target,{range,minLength:8})) {
    game.usedSilk=true;
    emit('attach');
  }
}

function releaseSilk(game:StealthRun,emit:(event:StealthEvent)=>void) {
  const rope=closeCrawlerRopes(game.spider);
  if (rope) {
    const reach=silkReach(game.silkCharge)+SPIDER_HALF_HEIGHT;
    if (!anchorSilk(game.web.strands,rope,reach,game.spider,room)) leaveSilk(game.web,rope,reach);
    const contact=createCrawler(game.spider,room).support;
    if (contact) {
      game.spider.support=contact;
      game.spider.grounded=true;
    }
    emit('release');
  } else if (!game.usedSilk) emit('miss');
  game.usedSilk=false;
}

export function guardSees(guard:Guard,p:Point) {
  return p.y>=floorY-sightHeight && (p.x-guard.x)*guard.facing>=0 &&
    Math.abs(p.x-guard.x)<sightRange && !room.some(surface=>crossesSolid(guard,p,surface));
}

function advanceGuard(game:StealthRun,guard:Guard,dt:number,emit:(event:StealthEvent)=>void) {
  if (guard.caught) return;
  const {spider,noise}=game;
  const sees=guardSees(guard,spider);
  const hears=noise && distance(guard,noise)<noise.strength &&
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
  if (guard.witnessed && sees && distance(guard,spider)<17) {
    game.phase='over';
    return;
  }
  const investigating=guard.lastKnown!==undefined && game.clock<guard.searchesUntil;
  if (investigating) {
    const delta=clamp(guard.lastKnown!,guard.low,guard.high)-guard.x;
    if (Math.abs(delta)>1.5) {
      guard.facing=delta<0 ? -1 : 1;
      guard.x+=guard.facing*Math.min(Math.abs(delta),dt*(guard.witnessed ? 77 : 45));
    }
  } else {
    guard.x+=guard.facing*27*dt;
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
  if (game.noise && game.noise.until<=game.clock) game.noise=undefined;
  if (input.aim) game.aim=unit(input.aim);
  if (input.jump) game.jumpCharge=Math.min(chargeTime,game.jumpCharge+dt);
  else if (game.jumpCharge) {
    if (releaseJump(game,input.move)) emit('jump');
    game.jumpCharge=0;
  }
  const before=web.strands.length;
  if (input.silk) {
    if (!game.silkCharge) emit('launch');
    game.silkCharge=Math.min(chargeTime,game.silkCharge+dt);
    if (!game.usedSilk) castSilk(game,emit);
  } else if (game.silkCharge) {
    releaseSilk(game,emit);
    game.silkCharge=0;
  }
  const steering=stealthStick(input.move);
  const lastY=spider.y;
  const falling=spider.vy;
  tickCrawler(spider,room,steering,input.move.y<-.43,dt,web.strands,{crawlSpeed:103,airAcceleration:120,ropeMinimum:8});
  const onGround=spider.y>=floorY-SPIDER_HALF_HEIGHT-.05;
  const impact=onGround && lastY<floorY-SPIDER_HALF_HEIGHT-.05 && falling>52;
  if (impact) emit('land');
  if (impact || onGround && Math.abs(spider.vx)>quietSpeed) {
    game.noise={x:spider.x,y:spider.y,strength:impact ? 118 : 54+Math.abs(spider.vx)*.38,until:game.clock+.29};
  }
  fixSilk(web,spider,room);
  for (const strand of web.strands.slice(before)) strand.expiresAt=game.clock+wireLifetime;
  if (web.strands.length>before) emit('fix');
  web.strands=web.strands.filter(strand=>(strand.expiresAt??Infinity)>game.clock).slice(-8);
  for (const guard of game.guards) advanceGuard(game,guard,dt,emit);
  if (game.phase==='play' && distance(spider,exit)<17 &&
    !game.guards.some(guard=>guard.witnessed && !guard.caught)) game.phase='complete';
}
