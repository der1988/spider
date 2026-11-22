import {castCrawler,closeCrawlerRopes,createCrawler,jumpCrawler,type Crawler,normals,tickCrawler} from './crawler.ts';
import {aimHit,DEFAULT_TUNING,SPIDER_HALF_HEIGHT,moveAxis,type Point,type Rect} from './spider.ts';
import {anchorSilk,crossesSolid,fixSilk,leaveSilk,sweptHit,type Strand,type Web} from './threads.ts';

export const roomWidth=520;
export const roomHeight=290;
export const bedroomWidth=1250;
export const bedroomHeight=630;
export const caughtLifetime=3;
export const breakFreePresses=5;
const jumpSpeed=172;
const grip=(x:number,y:number,w:number,h:number):Rect=>({x,y,w,h,grip:true});
const boundary=[grip(0,0,520,16),grip(0,270,520,20),grip(0,16,9,254),grip(511,16,9,254)];
type Furnishing=Rect & {kind:'sill'|'curtain'|'leaf'|'pot'|'wood'|'mattress'|'book'|'wardrobe'|'wall'};
type FlightLane={left:number;right:number;y:number};
export type Corner={
  objects:readonly Furnishing[];
  spawn:Point;
  lanes:readonly FlightLane[];
};
function object(kind:Furnishing['kind'],x:number,y:number,w:number,h:number):Furnishing {
  return {...grip(x,y,w,h),kind};
}
export const bedroom:Corner={
  objects:[
    object('wall',0,0,1250,10),object('wall',0,606,1250,24),
    object('wall',0,10,10,596),object('wall',1240,10,10,596),
    object('mattress',62,485,272,30),object('wood',73,515,252,14),
    object('wood',89,529,12,77),object('wood',295,529,12,77),object('wood',55,435,12,50),
    object('sill',142,405,137,10),object('sill',201,310,177,12),
    object('curtain',358,24,24,263),object('sill',165,204,156,12),
    object('wood',479,399,257,17),object('wood',491,416,17,190),object('wood',707,416,17,190),
    object('wood',507,482,59,12),object('book',535,365,48,34),
    object('wood',497,276,143,13),object('book',578,250,27,26),
    object('wood',673,186,151,12),object('wood',793,100,132,12),
    object('wardrobe',887,480,309,126),object('book',947,441,45,39),
    object('pot',1091,414,66,66),object('leaf',1010,365,126,11),
    object('leaf',1123,277,85,11),object('leaf',1034,204,95,11),
    object('wood',911,298,100,13),object('wood',1073,90,153,12),
  ],
  spawn:{x:139,y:477},
  lanes:[
    {left:91,right:344,y:448}, {left:32,right:345,y:163},
    {left:402,right:726,y:228}, {left:655,right:1025,y:142},
    {left:943,right:1228,y:243}, {left:829,right:1218,y:337},
  ],
};
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

type GnatKind='common'|'swift'|'wary'|'fly';
type Gnat={p:Point; lane:number; direction:-1|1; kind:GnatKind; phase:number; targetY:number; dodging:boolean};
type Predator={
  body:Crawler; origin:Point; facing:-1|1; lastKnown?:Point; chaseUntil:number;
  boundUntil:number; immuneUntil:number; jumpAt:number; fireAt:number;
  shot?:{from:Point;to:Point;at:number};
};
export interface CornerInput {move:Point;aim?:Point;jump:boolean;silk:boolean;grip?:boolean;escape?:boolean;}

function predator(surfaces:readonly Rect[],x:number,y:number,facing:-1|1):Predator {
  return {body:createCrawler({x,y},surfaces),origin:{x,y},facing,chaseUntil:0,boundUntil:0,immuneUntil:0,jumpAt:0,fireAt:0};
}

export function createWindowHunt(practice=false,corner=bedroom,random=Math.random) {
  const surfaces=practice ? practiceRoom : corner.objects;
  return {
    practice,corner,surfaces,random,
    spider:createCrawler(practice ? {x:32,y:262} : corner.spawn,surfaces),
    web:{loose:[],strands:[]} as Pick<Web,'loose'|'strands'>,
    occupants:new Map<Strand,Point[]>(),
    gnats:[] as Gnat[],
    predators:practice ? [] : [
      predator(surfaces,620,598,-1),predator(surfaces,899,92,1),predator(surfaces,1033,472,-1),
    ],
    shots:[] as {p:Point;to:Point}[],
    clinging:undefined as Strand|undefined, gripAt:0,
    trapped:false,escapeCount:0,escapeHeld:false,safeUntil:0,
    silk:0,catches:0,nextWave:.8,waves:0,
    aim:{x:.36,y:-.932},clock:0,jumpHeld:false,silkHeld:false,
    phase:'play' as 'play'|'over',
  };
}
export type WindowRun=ReturnType<typeof createWindowHunt>;
export type WindowEvent='jump'|'launch'|'attach'|'fix'|'release'|'miss'|'caught-insect'|'catch'|'land'|'trap'|'escaped'|'caught-predator';
const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));
const magnitude=(p:Point)=>Math.hypot(p.x,p.y);
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);

function unit(point:Point):Point {
  const n=magnitude(point)||1;
  return {x:point.x/n,y:point.y/n};
}

export function windowStick(raw:Point):Point {
  const deadZone=.07;
  const strength=clamp((magnitude(raw)-deadZone)/(1-deadZone),0,1)**1.65;
  const direction=unit(raw);
  return {x:direction.x*strength,y:direction.y*strength};
}

export function windowAnchor(game:WindowRun) {
  const {spider,aim}=game;
  return aimHit(spider,game.surfaces,{x:spider.x+aim.x,y:spider.y+aim.y});
}

function jumpWindow(game:WindowRun,raw:Point) {
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

function aimEnd(game:WindowRun) {
  const {spider,aim}=game;
  const range=DEFAULT_TUNING.range;
  return {x:spider.x+aim.x*range,y:spider.y+aim.y*range};
}

function releaseSilk(game:WindowRun,emit:(event:WindowEvent)=>void) {
  const rope=closeCrawlerRopes(game.spider);
  if (!rope) return;
  const reach=DEFAULT_TUNING.range+SPIDER_HALF_HEIGHT;
  if (!anchorSilk(game.web.strands,rope,reach,game.spider,game.surfaces,game.practice ? 8 : Infinity)) {
    leaveSilk(game.web,rope,reach);
  }
  const contact=createCrawler(game.spider,game.surfaces).support;
  if (contact) {
    game.spider.support=contact;
    game.spider.grounded=true;
  }
  emit('release');
}

function createWave(game:WindowRun) {
  const index=game.waves++;
  const random=game.random;
  const lane=index===0 || index%5===0 ? 0 : 1+Math.floor(random()*(game.corner.lanes.length-1));
  const {left,right,y}=game.corner.lanes[lane];
  const direction=index===0 || random()<.5 ? 1 : -1;
  const count=index===0 ? 2 : 2+Math.floor(random()*4);
  for (let i=0;i<count;i++) {
    const kind:GnatKind=lane===0 ? 'common' : i%4===0 ? 'fly' : i%4===1 ? 'common' : random()<.52 ? 'swift' : 'wary';
    const targetY=y+(random()-.5)*14;
    game.gnats.push({p:{x:direction===1 ? left-i*9 : right+i*9,y:targetY},
      direction,lane,kind,phase:random()*6.28,targetY,dodging:false});
  }
  game.nextWave=game.clock+1.1+random()*1.5;
}

function firstCrossing(from:Point,to:Point,strands:readonly Strand[]) {
  let first:{t:number;point:Point;wire:Strand}|undefined;
  for (const wire of strands) {
    const hit=sweptHit(from,to,wire);
    if (hit && (!first || hit.t<first.t)) first={...hit,wire};
  }
  return first;
}

function advanceGnats(game:WindowRun,dt:number,emit:(event:WindowEvent)=>void) {
  if (game.clock>=game.nextWave) createWave(game);
  game.gnats=game.gnats.filter(gnat=>{
    const {p,kind,direction}=gnat;
    const lane=game.corner.lanes[gnat.lane];
    const speed=kind==='swift' ? 139 : kind==='wary' ? 67 : kind==='fly' ? 56 : 87;
    const ahead={x:p.x+direction*42,y:p.y};
    if (kind==='wary' && !gnat.dodging && firstCrossing(p,ahead,game.web.strands)) {
      const turn={x:ahead.x,y:p.y-30};
      if (!game.surfaces.some(rect=>crossesSolid(p,turn,rect))) {
        gnat.targetY=turn.y;
        gnat.dodging=true;
      }
    }
    const vertical=clamp((gnat.targetY-p.y)*5,-100,100)+7*Math.sin(game.clock*3.4+gnat.phase);
    const next={x:p.x+direction*speed*dt,y:p.y+vertical*dt};
    if (game.surfaces.some(rect=>crossesSolid(p,next,rect))) {
      next.y=p.y;
      if (game.surfaces.some(rect=>crossesSolid(p,next,rect))) return false;
    }
    const hit=firstCrossing(p,next,game.web.strands);
    if (hit) {
      const occupants=game.occupants.get(hit.wire)??[];
      occupants.push(hit.point);
      game.occupants.set(hit.wire,occupants);
      hit.wire.expiresAt??=game.clock+caughtLifetime;
      hit.wire.shakeUntil=game.clock+.45;
      emit('caught-insect');
      return false;
    }
    gnat.p=next;
    return next.x>=lane.left-60 && next.x<=lane.right+60;
  });
}

function projection(p:Point,wire:Strand) {
  const dx=wire.to.x-wire.from.x,dy=wire.to.y-wire.from.y;
  return clamp(((p.x-wire.from.x)*dx+(p.y-wire.from.y)*dy)/(dx*dx+dy*dy||1),0,1);
}
function pointAt(wire:Strand,t:number) {
  return {x:wire.from.x+(wire.to.x-wire.from.x)*t,y:wire.from.y+(wire.to.y-wire.from.y)*t};
}

function gripWeb(game:WindowRun,previous:Point) {
  const hit=firstCrossing(previous,game.spider,game.web.strands);
  if (hit) return hit.wire;
  return game.web.strands.find(wire=>distance(game.spider,pointAt(wire,projection(game.spider,wire)))<=7);
}

function crawlWeb(game:WindowRun,wire:Strand,stick:Point,dt:number) {
  const {spider}=game;
  const tangent=unit({x:wire.to.x-wire.from.x,y:wire.to.y-wire.from.y});
  const speed=(stick.x*tangent.x+stick.y*tangent.y)*94;
  const t=projection(spider,wire)+speed*dt/distance(wire.from,wire.to);
  const next=pointAt(wire,clamp(t,0,1));
  moveAxis(spider,game.surfaces,'x',next.x-spider.x);
  moveAxis(spider,game.surfaces,'y',next.y-spider.y);
  spider.support=undefined;
  spider.grounded=false;
  spider.airJump=true;
  spider.vx=0;
  spider.vy=0;
  if (stick.x) spider.facing=stick.x<0 ? -1 : 1;
}

function expireWebs(game:WindowRun,emit:(event:WindowEvent)=>void) {
  game.web.strands=game.web.strands.filter(wire=>{
    if ((wire.expiresAt??Infinity)>game.clock) return true;
    const count=game.occupants.get(wire)?.length??0;
    game.occupants.delete(wire);
    if (count) {
      game.silk+=count;
      game.catches+=count;
      emit('catch');
    }
    return false;
  });
}

function stepPredator(game:WindowRun,enemy:Predator,dt:number,emit:(event:WindowEvent)=>void) {
  if (game.clock<enemy.boundUntil) return;
  const body=enemy.body, target=game.spider;
  const sees=distance(body,target)<190 && !game.surfaces.some(rect=>crossesSolid(body,target,rect));
  if (sees) {
    enemy.lastKnown={x:target.x,y:target.y};
    enemy.chaseUntil=game.clock+3;
  }
  const goal=game.clock<enemy.chaseUntil ? enemy.lastKnown : undefined;
  if (enemy.shot) {
    if (game.clock<enemy.shot.at) return;
    const {from,to}=enemy.shot;
    game.shots.push({p:from,to});
    enemy.shot=undefined;
    emit('launch');
  } else if (sees && !game.trapped && game.clock>=enemy.fireAt && distance(body,target)>25) {
    const from={x:body.x,y:body.y},vector=unit({x:target.x-from.x,y:target.y-from.y});
    const to={x:from.x+vector.x*175,y:from.y+vector.y*175};
    enemy.shot={from,to:aimHit(from,game.surfaces,to,{range:175})??to,at:game.clock+.45};
    enemy.fireAt=game.clock+2.7;
    return;
  }
  if (!goal && Math.abs(body.x-enemy.origin.x)>69) enemy.facing=body.x<enemy.origin.x ? 1 : -1;
  const dx=goal ? goal.x-body.x : enemy.facing*55,dy=goal ? goal.y-body.y : 0;
  const wall=body.support==='left' || body.support==='right';
  const previous={x:body.x,y:body.y};
  if (goal && body.support && game.clock>=enemy.jumpAt &&
      (dy<-35 && !wall || wall && Math.abs(dy)<14 && Math.abs(dx)>20)) {
    if (jumpCrawler(body,146) && !wall) body.vx=clamp(dx*3,-105,105);
    enemy.jumpAt=game.clock+1.35;
  }
  const vy=wall ? goal ? dy<-8 ? -1 : 1 : -.65 : 0;
  tickCrawler(body,game.surfaces,{x:clamp(dx/25,-1,1),y:vy},false,dt,[],
    {crawlSpeed:goal ? 84 : 38,airAcceleration:205});
  if (!goal && body.support==='floor' && Math.abs(dx)>20 && Math.abs(body.x-previous.x)<.02) {
    enemy.facing=enemy.facing===1 ? -1 : 1;
  }
  if (game.clock>=enemy.immuneUntil) {
    const hit=firstCrossing(previous,body,game.web.strands);
    if (hit) {
      body.x=hit.point.x;body.y=hit.point.y;body.vx=0;body.vy=0;
      enemy.boundUntil=game.clock+caughtLifetime;
      enemy.immuneUntil=enemy.boundUntil+.6;
      enemy.shot=undefined;
      hit.wire.shakeUntil=game.clock+.4;
      emit('caught-predator');
      return;
    }
  }
  if (distance(body,target)<16 && !game.surfaces.some(rect=>crossesSolid(body,target,rect))) game.phase='over';
}

function advanceShots(game:WindowRun,dt:number,emit:(event:WindowEvent)=>void) {
  game.shots=game.shots.filter(shot=>{
    const remaining=distance(shot.p,shot.to);
    const vector=unit({x:shot.to.x-shot.p.x,y:shot.to.y-shot.p.y});
    const travel=Math.min(remaining,260*dt);
    const next={x:shot.p.x+vector.x*travel,y:shot.p.y+vector.y*travel};
    const target=game.spider;
    if (!game.trapped && game.clock>=game.safeUntil &&
        distance(target,pointAt({from:shot.p,to:next,shakeUntil:0},projection(target,{from:shot.p,to:next,shakeUntil:0})))<8 &&
        !game.surfaces.some(rect=>crossesSolid(shot.p,target,rect))) {
      game.trapped=true;
      game.escapeCount=0;
      game.clinging=undefined;
      closeCrawlerRopes(target);
      target.vx=0;target.vy=0;
      emit('trap');
      return false;
    }
    shot.p=next;
    return travel<remaining;
  });
}

export function cameraFor(game:WindowRun) {
  return game.practice ? {x:0,y:0} : {
    x:Math.round(clamp(game.spider.x-roomWidth/2,0,bedroomWidth-roomWidth)),
    y:Math.round(clamp(game.spider.y-roomHeight*.60,0,bedroomHeight-roomHeight)),
  };
}

export function stepWindowHunt(game:WindowRun,input:CornerInput,dt:number,emit:(event:WindowEvent)=>void) {
  if (game.phase==='over') return;
  const {spider,web}=game;
  game.clock+=dt;
  expireWebs(game,emit);
  if (input.aim) game.aim=unit(input.aim);
  if (game.trapped) {
    if (input.escape && !game.escapeHeld && ++game.escapeCount>=breakFreePresses) {
      game.trapped=false;
      game.safeUntil=game.clock+1;
      emit('escaped');
    }
  } else {
    if (!input.grip || !web.strands.includes(game.clinging!)) game.clinging=undefined;
    if (input.jump && !game.jumpHeld) {
      if (game.clinging) game.gripAt=game.clock+.18;
      game.clinging=undefined;
      if (jumpWindow(game,input.move)) emit('jump');
    }
    const before=web.strands.length;
    if (input.silk && !game.silkHeld) {
      emit('launch');
      if (castCrawler(spider,game.surfaces,aimEnd(game),{minLength:8})) {
        game.clinging=undefined;
        emit('attach');
      } else emit('miss');
    } else if (!input.silk && game.silkHeld) releaseSilk(game,emit);
    const previous={x:spider.x,y:spider.y};
    const falling=spider.vy;
    if (spider.rope && input.move.y>.43) {
      spider.rope.length=Math.min(DEFAULT_TUNING.range,spider.rope.length+DEFAULT_TUNING.reelSpeed*dt);
    }
    const stick=windowStick(input.move);
    if (game.clinging) crawlWeb(game,game.clinging,stick,dt);
    else {
      tickCrawler(spider,game.surfaces,stick,input.move.y<-.43,dt,game.practice ? web.strands : [],
        {crawlSpeed:103,airAcceleration:120,ropeMinimum:8});
      if (!game.practice && input.grip && !spider.rope && game.clock>=game.gripAt) {
        game.clinging=gripWeb(game,previous);
        if (game.clinging) crawlWeb(game,game.clinging,stick,dt);
      }
    }
    if (spider.support==='floor' && falling>52) emit('land');
    fixSilk(web,spider,game.surfaces,game.practice ? 8 : Infinity);
    if (game.practice) for (const strand of web.strands.slice(before)) strand.expiresAt=game.clock+18;
    if (web.strands.length>before) emit('fix');
  }
  game.jumpHeld=input.jump;
  game.silkHeld=input.silk;
  game.escapeHeld=!!input.escape;
  if (game.practice) return;
  advanceGnats(game,dt,emit);
  for (const enemy of game.predators) stepPredator(game,enemy,dt,emit);
  advanceShots(game,dt,emit);
}
