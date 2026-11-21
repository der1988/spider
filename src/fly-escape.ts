import {createCrawler, jumpCrawler, normals, tickCrawler, type Crawler} from './crawler.ts';
import {HEIGHT, LIMIT, WIDTH, WEB_SECONDS, platforms, spawn} from './hunt.ts';
import {aimHit, DEFAULT_TUNING, SPIDER_HALF_HEIGHT, SPIDER_HALF_WIDTH, type Point} from './spider.ts';
import {anchorSilk, sweptHit, type Strand} from './threads.ts';

export const FLY_SECONDS = 10;
export const LIGHT_RADIUS = 7;
const FLY_RADIUS = 2.5;
const FLY_SPEED = 104;
const neutral = {x:0,y:0};
const OBSERVATION_PERIOD = .16;
const PLAN_DELAY = .38;
const SWEEP_INTERVAL = 9.2;
const SWEEP_DURATION = 7.4;

export type SpiderBehavior = 'hunt'|'aim'|'yield';
export type SpiderGesture = 'identity'|'decision'|'lastWeb'|'watch'|'stepBack';
type Flight = {p:Point;v:Point};
type SpiderObservation = Flight & {at:number};
type SpiderPlan = {
  target: Point;
  intercept: Point;
  beginsAt: number;
  executeAt: number;
} & ({kind:'jump'}|{kind:'web'; strand:Strand});
export type EscapeEvent = 'light'|'trap'|'escape'|'web'|'timeout'|'retry';
export interface FlyEscape {
  spider: Crawler;
  fly: Flight;
  light: Point;
  strands: Strand[];
  time: number;
  clock: number;
  lights: number;
  flashUntil: number;
  trapped?: {strand:Strand;presses:number};
  behavior: SpiderBehavior;
  aim?: Point;
  plan?: SpiderPlan;
  gesture?: SpiderGesture;
  gestureSince: number;
  decisionAim?: Point;
  watchedStrand?: Strand;
  lastWeb?: Strand;
  observed: SpiderObservation;
  pendingObservation: SpiderObservation;
  nextObservation: number;
  airTarget?: Point;
  nextJump: number;
  nextSweep: number;
  sweepUntil: number;
  sweepDirection: -1|1;
  ending: boolean;
  timedOut: boolean;
  entropy: number;
  nextShot: number;
  safeUntil: number;
  shotUntil: number;
  retreat: number;
  retreatUntil: number;
  nextPatrol: number;
  patrolMove: number;
  patrolUntil: number;
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
    gestureSince:0,observed:{p:{...p},v:{...neutral},at:0},pendingObservation:{p:{...p},v:{...neutral},at:0},
    nextObservation:OBSERVATION_PERIOD,nextJump:0,nextSweep:2.4,sweepUntil:0,sweepDirection:1,
    nextPatrol:0,patrolMove:0,patrolUntil:0,
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

function predict(fly: Flight,lead=.2) {
  const point={...fly.p};
  sweepAxis(point,'x',fly.v.x*lead);
  sweepAxis(point,'y',fly.v.y*lead);
  return point;
}

function observe(game: FlyEscape) {
  if (game.clock<game.nextObservation) return;
  game.observed=game.pendingObservation;
  game.pendingObservation={p:{...game.fly.p},v:{...game.fly.v},at:game.clock};
  game.nextObservation=game.clock+OBSERVATION_PERIOD;
}

function setBehavior(game: FlyEscape,behavior: SpiderBehavior) {
  if (game.behavior===behavior) return;
  const previousAim=game.aim;
  game.behavior=behavior;
  game.plan=undefined;
  game.airTarget=undefined;
  game.aim=behavior==='aim' ? predict(game.fly) : undefined;
  if (game.aim) game.spider.facing=game.aim.x<game.spider.x ? -1 : 1;
  if (behavior==='yield') {
    game.nextShot=game.clock+8+random(game)*5;
    const axis=game.spider.support==='left' || game.spider.support==='right' ? 'y' : 'x';
    game.retreat=.16*(previousAim && previousAim[axis]>game.spider[axis] ? -1 : 1);
    game.retreatUntil=game.clock+.55;
    game.nextPatrol=game.clock+1.3;
    game.patrolUntil=game.clock;
    game.shotUntil=game.clock;
  }
}

const shotOffsets=[0,.24,-.24,.48,-.48,.8,-.8,1.2,-1.2,1.65,-1.65,2.2,-2.2];
const webReach=DEFAULT_TUNING.range+SPIDER_HALF_HEIGHT;
function chooseWeb(game: FlyEscape,target: Point,routing?: Flight) {
  const spider=game.spider;
  if (!spider.support) return;
  const normal=normals[spider.support];
  const contact={x:spider.x-normal.x*SPIDER_HALF_WIDTH,y:spider.y-normal.y*SPIDER_HALF_HEIGHT};
  const angle=Math.atan2(target.y-spider.y,target.x-spider.x);
  let best: {strand:Strand;score:number}|undefined;
  const route=routing && predict(routing,.5);
  for (const offset of shotOffsets) {
    const direction=angle+offset;
    const aim={x:spider.x+Math.cos(direction)*100,y:spider.y+Math.sin(direction)*100};
    const hit=aimHit(spider,platforms,aim);
    if (!hit || distance(contact,hit)<23) continue;
    const trial=game.strands.slice();
    if (!anchorSilk(trial,hit,webReach,spider,platforms) || trial.length===game.strands.length) continue;
    const strand=trial[trial.length-1];
    if (!routing || !route) return strand;
    // Favor cutting across the predicted flight path at a point still ahead of the fly.
    const crossing=sweptHit(routing.p,route,strand);
    const score=segmentDistance(strand.from,strand.to,target)+Math.abs(offset)*5-
      (crossing && crossing.t>.14 ? 17*(1-Math.abs(crossing.t-.4)) : 0);
    if (!best || score<best.score) best={strand,score};
  }
  return best?.strand;
}

function deploy(game: FlyEscape,strand: Strand|undefined) {
  if (!strand) return false;
  strand.expiresAt=game.clock+WEB_SECONDS;
  game.strands.push(strand);
  if (game.strands.length>LIMIT) game.strands.shift();
  game.aim=strand.from;
  game.shotUntil=game.clock+.23;
  return true;
}

function independentWeb(game: FlyEscape) {
  const angle=random(game)*Math.PI*2;
  return chooseWeb(game,{x:game.spider.x+Math.cos(angle)*100,y:game.spider.y+Math.sin(angle)*100});
}

function supportAxis(spider: Crawler) {
  return spider.support==='left' || spider.support==='right' ? 'y' : 'x';
}

function roomwardStep(spider: Crawler,preferred: number) {
  const axis=supportAxis(spider);
  const location=spider[axis];
  const limit=axis==='y' ? HEIGHT : WIDTH;
  return location<20 ? Math.abs(preferred) : location>limit-20 ? -Math.abs(preferred) : preferred;
}

function setGesture(game: FlyEscape,gesture?: SpiderGesture) {
  if (game.gesture===gesture) return;
  game.gesture=gesture;
  game.gestureSince=game.clock;
  game.decisionAim=undefined;
  game.watchedStrand=gesture==='watch' ? (game.lastWeb && game.strands.includes(game.lastWeb) ?
    game.lastWeb : game.strands[game.strands.length-1]) : undefined;
  if (!gesture || game.behavior!=='yield') return;
  game.aim=undefined;
  game.shotUntil=game.clock;
  game.retreatUntil=game.clock;
  game.patrolUntil=game.clock;
  const spider=game.spider;
  if (gesture==='identity') {
    const reversed=spider.support==='ceiling' || spider.support==='right' ? 1 : -1;
    game.patrolMove=roomwardStep(spider,.26*spider.facing*reversed);
    game.patrolUntil=game.clock+2.45;
    game.nextPatrol=game.clock+5;
  }
  if (gesture==='decision') {
    const n=normals[spider.support??'floor'];
    game.decisionAim={
      x:clamp(spider.x+n.x*34-n.y*27*spider.facing,8,WIDTH-8),
      y:clamp(spider.y+n.y*34+n.x*27*spider.facing,8,HEIGHT-8),
    };
  }
  if (gesture==='lastWeb') game.nextShot=game.clock;
  if (gesture==='watch') {
    game.nextShot=game.clock+9;
    const strand=game.watchedStrand;
    if (strand) {
      const axis=supportAxis(spider);
      const near=distance(spider,strand.from)<distance(spider,strand.to) ? strand.from : strand.to;
      game.retreat=clamp((near[axis]-spider[axis])/25,-.26,.26);
      if (Math.abs(near[axis]-spider[axis])>4) game.retreatUntil=game.clock+.52;
    }
  }
  if (gesture==='stepBack') {
    const strand=game.lastWeb;
    const axis=supportAxis(spider);
    const midpoint=strand ? (strand.from[axis]+strand.to[axis])/2 : spider[axis]+game.retreat;
    const direction=midpoint>spider[axis] ? -1 : 1;
    game.retreat=roomwardStep(spider,.21*direction);
    game.retreatUntil=game.clock+.65;
    game.nextShot=Math.max(game.nextShot,game.clock+7);
  }
}

function isOnPerimeter(spider: Crawler) {
  switch (spider.support) {
    case 'floor': return spider.y>=HEIGHT-16;
    case 'ceiling': return spider.y<=16;
    case 'left': return spider.x<=16;
    case 'right': return spider.x>=WIDTH-16;
    default: return false;
  }
}

function followPerimeter(spider: Crawler,direction: -1|1): Point {
  switch (spider.support) {
    case 'floor': return {x:direction,y:0};
    case 'ceiling': return {x:-direction,y:0};
    case 'left': return {x:0,y:direction};
    case 'right': return {x:0,y:-direction};
    default: return neutral;
  }
}

function startSweep(game: FlyEscape) {
  const {spider}=game;
  // Heading toward the nearest outside wall also picks the direction that climbs it.
  if (spider.support!=='ceiling' || !isOnPerimeter(spider)) game.sweepDirection=spider.x<WIDTH/2 ? -1 : 1;
  game.sweepUntil=game.clock+SWEEP_DURATION;
  game.nextSweep=game.clock+SWEEP_INTERVAL;
}

function canLeap(game: FlyEscape,target: Point,sweeping: boolean) {
  const spider=game.spider;
  if (!spider.support || game.clock<game.nextJump) return false;
  const normal=normals[spider.support];
  const dx=target.x-spider.x,dy=target.y-spider.y;
  const across=dx*normal.x+dy*normal.y;
  const along=Math.abs(dx*normal.y-dy*normal.x);
  // Keep climbing the outside walls during a sweep, all the way to the ceiling.
  if (sweeping && isOnPerimeter(spider) && spider.support!=='ceiling') return false;
  return across>=23 && (across<135 || sweeping && spider.support==='ceiling') && along<116;
}

function advanceHunter(game: FlyEscape,dt: number) {
  observe(game);
  const spider=game.spider;
  if (game.plan) {
    // Hold the launch point and target steady after committing. Late feints can beat the shot.
    tickCrawler(spider,platforms,neutral,false,dt,[]);
    if (game.clock<game.plan.executeAt) return false;
    const plan=game.plan;
    game.plan=undefined;
    if (plan.kind==='jump') {
      if (jumpCrawler(spider)) game.airTarget=plan.target;
      game.nextShot=game.clock+.44;
      game.nextJump=game.clock+2.15;
      game.shotUntil=game.clock+.25;
      return false;
    }
    const fired=deploy(game,plan.strand);
    game.nextShot=game.clock+(fired ? .78+random(game)*.55 : .27);
    return fired;
  }
  if (game.clock>=game.shotUntil) game.aim=undefined;
  if (spider.support) game.airTarget=undefined;
  const target=game.airTarget??predict(game.observed);
  const wall=target.x<WIDTH/2 ? 12 : WIDTH-12;
  if (spider.support && game.clock>=game.nextSweep) startSweep(game);
  const sweeping=game.clock<game.sweepUntil;
  const shouldClimb=spider.support==='floor' && target.y<112 || spider.support==='ceiling' && target.y>118;
  if (spider.support && game.clock>=game.nextShot) {
    // Aim 0.2 s ahead of the estimated launch point, allowing for the sight and wind-up delay.
    const flightAtLaunch={p:predict(game.observed,game.clock-game.observed.at+PLAN_DELAY),v:game.observed.v};
    const intercept=predict(flightAtLaunch);
    const jump=canLeap(game,intercept,sweeping);
    const strand=jump ? undefined : chooseWeb(game,intercept,flightAtLaunch);
    const timing={intercept,beginsAt:game.clock,executeAt:game.clock+PLAN_DELAY};
    game.plan=jump ? {kind:'jump',target:intercept,...timing} : strand ?
      {kind:'web',target:strand.from,strand,...timing} : undefined;
    if (game.plan) {
      // Bracing prevents a previously held stride from moving the web's anchored endpoint.
      spider.vx=0;
      spider.vy=0;
      spider.facing=game.plan.target.x<spider.x ? -1 : 1;
      game.aim=game.plan.target;
      return false;
    }
    game.nextShot=game.clock+.24;
  }
  const pursue={
    x:clamp(((shouldClimb ? wall : target.x)-spider.x)/23,-1,1),
    y:clamp((target.y-spider.y)/23,-1,1),
  };
  const stalled=spider.support && Math.abs(pursue[supportAxis(spider)])<.15;
  const move=spider.support && (sweeping || stalled) ? followPerimeter(spider,game.sweepDirection) : pursue;
  tickCrawler(spider,platforms,move,false,dt,[]);
  return false;
}

function stepSpider(game: FlyEscape,dt: number) {
  if (game.behavior==='hunt') return advanceHunter(game,dt);
  if (game.behavior==='aim') {
    game.aim={...game.fly.p};
    game.spider.facing=game.aim.x<game.spider.x ? -1 : 1;
    tickCrawler(game.spider,platforms,neutral,false,dt,[]);
    return false;
  }
  if (game.clock>=game.shotUntil) game.aim=undefined;
  if (!game.gesture && game.clock>=game.nextPatrol) {
    game.patrolMove=roomwardStep(game.spider,random(game)<.5 ? -.24 : .24);
    game.patrolUntil=game.clock+.7+random(game)*.32;
    game.nextPatrol=game.clock+4.6+random(game)*1.8;
  }
  const looking=game.gesture==='identity' && game.clock-game.gestureSince<1.27;
  const move=game.clock<game.retreatUntil ? game.retreat :
    game.clock<game.patrolUntil && !looking ? game.patrolMove : 0;
  tickCrawler(game.spider,platforms,{x:move,y:move},false,dt,[]);
  if (game.clock<game.nextShot || (game.gesture && game.gesture!=='lastWeb')) return false;
  const strand=independentWeb(game);
  const fired=deploy(game,strand);
  if (game.gesture==='lastWeb') {
    // If the spider was airborne, try once it can anchor the last strand.
    if (fired) game.lastWeb=strand;
    game.nextShot=game.clock+(fired ? 15 : .3);
  } else {
    game.nextShot=game.clock+10+random(game)*6;
  }
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
  game.plan=undefined;
  game.gesture=undefined;
  game.decisionAim=undefined;
  game.watchedStrand=undefined;
  game.trapped=undefined;
}

export function stepFlyEscape(
  game: FlyEscape,input: EscapeInput,dt: number,behavior: SpiderBehavior,gesture?: SpiderGesture,
): EscapeEvent|undefined {
  if (game.ending) {
    moveFly(game,input.move,dt);
    return;
  }
  game.clock+=dt;
  setBehavior(game,behavior);
  setGesture(game,gesture);
  game.strands=game.strands.filter(strand=>(strand.expiresAt??Infinity)>game.clock);
  let event: EscapeEvent|undefined=stepSpider(game,dt) ? 'web' : undefined;
  if (game.timedOut) {
    if (!input.cross) return event;
    game.timedOut=false;
    game.time=FLY_SECONDS;
    game.trapped=undefined;
    game.safeUntil=game.clock+.65;
    return 'retry';
  }
  const step=Math.min(dt,game.time);
  game.time=Math.max(0,game.time-step);
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
