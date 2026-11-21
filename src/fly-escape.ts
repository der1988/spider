import {createCrawler, normals, tickCrawler, type Crawler} from './crawler.ts';
import {HEIGHT, LIMIT, WIDTH, WEB_SECONDS, platforms, spawn} from './hunt.ts';
import {aimHit, DEFAULT_TUNING, SPIDER_HALF_HEIGHT, SPIDER_HALF_WIDTH, type Point} from './spider.ts';
import {anchorSilk, sweptHit, type Strand} from './threads.ts';

export const FLY_SECONDS = 10;
export const LIGHT_RADIUS = 7;
const FLY_RADIUS = 2.5;
const FLY_SPEED = 104;
const neutral = {x:0,y:0};

export type SpiderBehavior = 'hunt'|'aim'|'yield';
export type EscapeEvent = 'light'|'trap'|'escape'|'web'|'timeout'|'retry';
export interface FlyEscape {
  spider: Crawler;
  fly: {p:Point;v:Point};
  light: Point;
  strands: Strand[];
  time: number;
  clock: number;
  lights: number;
  flashUntil: number;
  trapped?: {strand:Strand;presses:number};
  behavior: SpiderBehavior;
  aim?: Point;
  ending: boolean;
  timedOut: boolean;
  entropy: number;
  nextShot: number;
  safeUntil: number;
  shotUntil: number;
  retreat: number;
  retreatUntil: number;
}

type EscapeInput = {move: Point;cross: boolean};

const clamp = (n: number,min: number,max: number) => Math.max(min,Math.min(n,max));
const distance = (a: Point,b: Point) => Math.hypot(a.x-b.x,a.y-b.y);
function clear(point: Point,radius: number) {
  return platforms.every(surface=>point.x<=surface.x-radius || point.x>=surface.x+surface.w+radius ||
    point.y<=surface.y-radius || point.y>=surface.y+surface.h+radius);
}

// The arena's open corridors connect every candidate; leave clearance around platforms.
const lightSites: Point[] = [];
for (let y=22;y<HEIGHT-17;y+=23) {
  for (let x=23;x<WIDTH-20;x+=24) {
    if (clear({x,y},LIGHT_RADIUS+FLY_RADIUS+1)) lightSites.push({x,y});
  }
}

function random(game: FlyEscape) {
  game.entropy=(Math.imul(game.entropy,1664525)+1013904223)>>>0;
  return game.entropy/4294967296;
}

function nextLight(game: FlyEscape,previous?: Point) {
  const choices=lightSites.filter(site=>distance(site,game.fly.p)>=45 && distance(site,game.fly.p)<=167 &&
    (!previous || distance(site,previous)>=36));
  const pool=choices.length ? choices : lightSites.filter(site=>distance(site,game.fly.p)>=45);
  return {...pool[Math.floor(random(game)*pool.length)]};
}

export function createFlyEscape(
  sourceSpider?: Crawler,sourceFly: Point={x:49,y:79},seed=Math.floor(Math.random()*4294967296),
): FlyEscape {
  const spider=sourceSpider ? {...sourceSpider,rope:undefined,thread:undefined,firstAnchor:undefined,vx:0,vy:0} :
    createCrawler(spawn,platforms);
  const p=clear(sourceFly,FLY_RADIUS) ? sourceFly : lightSites.reduce((best,site)=>
    distance(site,sourceFly)<distance(best,sourceFly) ? site : best);
  const game: FlyEscape = {
    spider,fly:{p:{...p},v:{...neutral}},light:{...p},strands:[],time:FLY_SECONDS,clock:0,lights:0,flashUntil:0,
    behavior:'hunt',ending:false,timedOut:false,entropy:seed,nextShot:.8,safeUntil:0,shotUntil:0,retreat:0,retreatUntil:0,
  };
  game.light=nextLight(game);
  return game;
}

function sweepAxis(p: Point,axis: 'x'|'y',delta: number) {
  if (!delta) return false;
  const horizontal=axis==='x';
  const across=horizontal ? 'y' : 'x';
  const forward=delta>0;
  let travel=delta;
  for (const surface of platforms) {
    const depth=horizontal ? surface.h : surface.w;
    if (p[across]<=surface[across]-FLY_RADIUS || p[across]>=surface[across]+depth+FLY_RADIUS) continue;
    const width=horizontal ? surface.w : surface.h;
    const edge=surface[axis]+(forward ? -FLY_RADIUS : width+FLY_RADIUS);
    const gap=edge-p[axis];
    if (forward && gap>=0 && gap<travel || !forward && gap<=0 && gap>travel) travel=gap;
  }
  p[axis]+=travel;
  return travel!==delta;
}

function segmentDistance(from: Point,to: Point,p: Point) {
  const dx=to.x-from.x,dy=to.y-from.y;
  const along=clamp(((p.x-from.x)*dx+(p.y-from.y)*dy)/Math.max(dx*dx+dy*dy,.001),0,1);
  return Math.hypot(p.x-(from.x+dx*along),p.y-(from.y+dy*along));
}

function predicted(game: FlyEscape) {
  return {
    x:clamp(game.fly.p.x+game.fly.v.x*.2,12,WIDTH-12),
    y:clamp(game.fly.p.y+game.fly.v.y*.2,12,HEIGHT-12),
  };
}

function setBehavior(game: FlyEscape,behavior: SpiderBehavior) {
  if (game.behavior===behavior) return;
  const previousAim=game.aim;
  game.behavior=behavior;
  game.aim=behavior==='aim' ? predicted(game) : undefined;
  if (game.aim) game.spider.facing=game.aim.x<game.spider.x ? -1 : 1;
  if (behavior==='yield') {
    game.nextShot=game.clock+8+random(game)*5;
    const axis=game.spider.support==='left' || game.spider.support==='right' ? 'y' : 'x';
    game.retreat=.16*(previousAim && previousAim[axis]>game.spider[axis] ? -1 : 1);
    game.retreatUntil=game.clock+.55;
    game.shotUntil=game.clock;
  }
}

const shotOffsets=[0,.24,-.24,.48,-.48,.8,-.8,1.2,-1.2,1.65,-1.65,2.2,-2.2];
function castWeb(game: FlyEscape,target: Point,track: boolean) {
  const spider=game.spider;
  if (!spider.support) return false;
  const normal=normals[spider.support];
  const contact={x:spider.x-normal.x*SPIDER_HALF_WIDTH,y:spider.y-normal.y*SPIDER_HALF_HEIGHT};
  const angle=Math.atan2(target.y-spider.y,target.x-spider.x);
  const candidates=shotOffsets.flatMap((offset,index)=>{
    const direction=angle+offset;
    const aim={x:spider.x+Math.cos(direction)*100,y:spider.y+Math.sin(direction)*100};
    const hit=aimHit(spider,platforms,aim);
    if (!hit || distance(contact,hit)<23) return [];
    const score=track ? segmentDistance(contact,hit,target)+Math.abs(offset)*5 : index;
    return [{hit,score}];
  }).sort((a,b)=>a.score-b.score);
  for (const {hit} of candidates) {
    const count=game.strands.length;
    if (!anchorSilk(game.strands,hit,DEFAULT_TUNING.range+SPIDER_HALF_HEIGHT,spider,platforms) ||
      game.strands.length===count) continue;
    game.strands[count].expiresAt=game.clock+WEB_SECONDS;
    if (game.strands.length>LIMIT) game.strands.shift();
    game.aim=hit;
    game.shotUntil=game.clock+.23;
    return true;
  }
  return false;
}

function stepSpider(game: FlyEscape,dt: number) {
  if (game.behavior==='aim') {
    tickCrawler(game.spider,platforms,neutral,false,dt,[]);
    return false;
  }
  if (game.clock>=game.shotUntil) game.aim=undefined;
  const chasing=game.behavior==='hunt';
  const spider=game.spider;
  if (chasing) {
    const target=predicted(game);
    const wall=target.x<WIDTH/2 ? 12 : WIDTH-12;
    const shouldClimb=spider.support==='floor' && target.y<112 || spider.support==='ceiling' && target.y>118;
    tickCrawler(spider,platforms,{
      x:clamp(((shouldClimb ? wall : target.x)-spider.x)/23,-1,1),
      y:clamp((target.y-spider.y)/23,-1,1),
    },false,dt,[]);
    if (game.clock<game.nextShot) return false;
    const fired=castWeb(game,target,true);
    game.nextShot=game.clock+(fired ? 1.25+random(game)*.95 : .32);
    return fired;
  }
  const move=game.clock<game.retreatUntil ? game.retreat : 0;
  tickCrawler(spider,platforms,{x:move,y:move},false,dt,[]);
  if (game.clock<game.nextShot) return false;
  const angle=random(game)*Math.PI*2;
  const target={x:spider.x+Math.cos(angle)*100,y:spider.y+Math.sin(angle)*100};
  const fired=castWeb(game,target,false);
  game.nextShot=game.clock+10+random(game)*6;
  game.retreat=0;
  return fired;
}

function flyAxis(game: FlyEscape,axis: 'x'|'y',delta: number) {
  const {p,v}=game.fly;
  const from={...p};
  if (sweepAxis(p,axis,delta)) v[axis]=0;
  if (game.ending) return false;
  if (delta && game.clock>=game.safeUntil) {
    let caught: {strand:Strand;point:Point;t:number}|undefined;
    for (const strand of game.strands) {
      const hit=sweptHit(from,p,strand);
      if (hit && (!caught || hit.t<caught.t)) caught={strand,...hit};
    }
    if (caught) {
      game.fly.p=caught.point;
      game.fly.v={...neutral};
      game.trapped={strand:caught.strand,presses:0};
      caught.strand.shakeUntil=game.clock+.35;
    }
  }
  return segmentDistance(from,game.fly.p,game.light)<=LIGHT_RADIUS+FLY_RADIUS;
}

function moveFly(game: FlyEscape,move: Point,dt: number) {
  const magnitude=Math.hypot(move.x,move.y);
  const speed=clamp((magnitude-.13)/.87,0,1)*FLY_SPEED/Math.max(magnitude,.001);
  const ease=1-Math.exp(-dt*18);
  const {v}=game.fly;
  v.x+=(move.x*speed-v.x)*ease;
  v.y+=(move.y*speed-v.y)*ease;
  const pickedX=flyAxis(game,'x',v.x*dt);
  const pickedY=!game.trapped && flyAxis(game,'y',v.y*dt);
  return pickedX || pickedY;
}

export function finishFlyEscape(game: FlyEscape) {
  game.ending=true;
  game.aim=undefined;
  game.trapped=undefined;
}

export function stepFlyEscape(game: FlyEscape,input: EscapeInput,dt: number,behavior: SpiderBehavior): EscapeEvent|undefined {
  if (game.ending) {
    moveFly(game,input.move,dt);
    return;
  }
  setBehavior(game,behavior);
  if (game.timedOut) {
    if (!input.cross) return;
    game.timedOut=false;
    game.time=FLY_SECONDS;
    game.trapped=undefined;
    game.safeUntil=game.clock+.65;
    return 'retry';
  }
  const step=Math.min(dt,game.time);
  game.clock+=step;
  game.time=Math.max(0,game.time-step);
  game.strands=game.strands.filter(strand=>(strand.expiresAt??Infinity)>game.clock);
  let event: EscapeEvent|undefined=stepSpider(game,step) ? 'web' : undefined;
  if (game.trapped) {
    if (input.cross) {
      game.trapped.presses++;
      game.trapped.strand.shakeUntil=game.clock+.22;
    }
    if (game.trapped.presses>=3 || !game.strands.includes(game.trapped.strand)) {
      game.trapped=undefined;
      game.safeUntil=game.clock+.55;
      event='escape';
    }
  } else if (moveFly(game,input.move,step)) {
    game.time=FLY_SECONDS;
    game.lights++;
    game.flashUntil=game.clock+.65;
    game.light=nextLight(game,game.light);
    return 'light';
  } else if (game.trapped) event='trap';
  if (game.time===0) {
    game.timedOut=true;
    game.fly.v={...neutral};
    return 'timeout';
  }
  return event;
}
