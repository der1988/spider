import {castCrawler,closeCrawlerRopes,createCrawler,jumpCrawler,normals,tickCrawler} from './crawler.ts';
import {aimHit,DEFAULT_TUNING,SPIDER_HALF_HEIGHT,type Point,type Rect} from './spider.ts';
import {anchorSilk,crossesSolid,fixSilk,leaveSilk,sweptHit,type Strand,type Web} from './threads.ts';

export const roomWidth=520;
export const roomHeight=290;
export const silkLimit=5;
const jumpSpeed=172;
const grip=(x:number,y:number,w:number,h:number):Rect=>({x,y,w,h,grip:true});
const boundary=[grip(0,0,520,16),grip(0,270,520,20),grip(0,16,9,254),grip(511,16,9,254)];
type Furnishing=Rect & {kind:'sill'|'curtain'|'leaf'|'pot'};
export type Corner={
  objects:readonly Furnishing[];
  spawn:Point;
  lanes:readonly [number,number];
};
function object(kind:Furnishing['kind'],x:number,y:number,w:number,h:number):Furnishing {
  return {...grip(x,y,w,h),kind};
}
export const windowCorner:Corner={
  objects:[
    object('sill',12,188,132,15),
    object('curtain',35,0,25,118),
    object('leaf',152,105,105,10),
    object('leaf',190,176,90,10),
    object('leaf',322,169,80,10),
    object('leaf',392,92,89,10),
    object('leaf',469,157,48,10),
    object('pot',387,235,123,43),
  ],
  spawn:{x:122,y:180},
  lanes:[143,209],
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

type GnatKind='common'|'swift'|'wary';
type Gnat={p:Point; lane:number; direction:-1|1; kind:GnatKind; phase:number; targetY:number; dodging:boolean};
type CatchMark={p:Point;until:number};
export interface CornerInput {move:Point;aim?:Point;jump:boolean;silk:boolean;direct?:boolean;remove?:boolean;}

export function createWindowHunt(practice=false,corner=windowCorner,random=Math.random) {
  const surfaces=practice ? practiceRoom : corner.objects;
  return {
    practice,corner,surfaces,random,
    spider:createCrawler(practice ? {x:32,y:262} : corner.spawn,surfaces),
    web:{loose:[],strands:[]} as Pick<Web,'loose'|'strands'>,
    gnats:[] as Gnat[],
    marks:[] as CatchMark[],
    silk:silkLimit,catches:0,nextWave:.8,waves:0,
    aim:{x:.56,y:-.828},clock:0,jumpHeld:false,silkHeld:false,directHeld:false,removeHeld:false,
    shot:undefined as {from:Point;to:Point;until:number}|undefined,
    phase:'play' as 'play'|'over',
  };
}
export type WindowRun=ReturnType<typeof createWindowHunt>;
export type WindowEvent='jump'|'launch'|'attach'|'fix'|'release'|'miss'|'catch'|'land'|'empty'|'capacity'|'reclaim'|'no-target';
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

export function aimedTrap(game:WindowRun) {
  const {spider,web}=game;
  // Extending the selection ray makes distant traps removable from a safe perch.
  const end={x:spider.x+game.aim.x*roomWidth,y:spider.y+game.aim.y*roomWidth};
  const candidates=web.strands.flatMap(strand=>{
    const hit=sweptHit(spider,end,strand);
    if (hit && hit.t>.008) return [{strand,t:hit.t}];
    return [];
  });
  return candidates.sort((a,b)=>a.t-b.t)[0]?.strand;
}

function catchGnat(game:WindowRun,gnat:Gnat,point:Point,emit:(event:WindowEvent)=>void) {
  game.gnats=game.gnats.filter(fly=>fly!==gnat);
  game.silk=Math.min(silkLimit,game.silk+1);
  game.catches++;
  game.marks.push({p:point,until:game.clock+.58});
  emit('catch');
}

function directShot(game:WindowRun,emit:(event:WindowEvent)=>void) {
  if (!game.silk) {emit('empty');return;}
  const {spider,aim}=game;
  let end=windowAnchor(game)??aimEnd(game);
  let nearest=distance(spider,end);
  let target:Gnat|undefined;
  for (const gnat of game.gnats) {
    const offset={x:gnat.p.x-spider.x,y:gnat.p.y-spider.y};
    const along=offset.x*aim.x+offset.y*aim.y;
    if (along<0 || along>=nearest || Math.abs(offset.x*aim.y-offset.y*aim.x)>3.2 ||
        game.surfaces.some(rect=>crossesSolid(spider,gnat.p,rect))) continue;
    nearest=along;
    target=gnat;
  }
  game.silk--;
  emit('launch');
  if (target) {
    end=target.p;
    catchGnat(game,target,end,emit);
  } else emit('miss');
  game.shot={from:{x:spider.x,y:spider.y},to:end,until:game.clock+.14};
}

function releaseSilk(game:WindowRun,emit:(event:WindowEvent)=>void) {
  const rope=closeCrawlerRopes(game.spider);
  if (!rope) return;
  const reach=DEFAULT_TUNING.range+SPIDER_HALF_HEIGHT;
  if (!game.practice && game.web.strands.length>=silkLimit) emit('capacity');
  else if (!game.practice && !game.silk) emit('empty');
  else if (!anchorSilk(game.web.strands,rope,reach,game.spider,game.surfaces)) leaveSilk(game.web,rope,reach);
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
  const lane=index<2 ? index : Math.floor(random()*2);
  const direction=index===0 || index>1 && random()<.5 ? 1 : -1;
  const count=index===0 ? 1 : index===1 ? 3 : 1+Math.floor(random()*7);
  for (let i=0;i<count;i++) {
    const kind:GnatKind=index<2 ? 'common' : i%3===0 ? 'common' : random()<.5 ? 'swift' : 'wary';
    const jitter=index<2 ? (i-1)*4 : (random()-.5)*13;
    const y=game.corner.lanes[lane]+jitter;
    game.gnats.push({
      p:{x:direction===1 ? -8-i*11 : roomWidth+8+i*11,y},
      direction,lane,kind,phase:random()*6.28,targetY:y,dodging:false,
    });
  }
  game.nextWave=game.clock+(index<2 ? 3.2 : 1.6+random()*3.7);
}

function advanceGnats(game:WindowRun,dt:number,emit:(event:WindowEvent)=>void) {
  if (game.clock>=game.nextWave) createWave(game);
  for (const gnat of game.gnats.slice()) {
    const {p,kind,direction}=gnat;
    const speed=kind==='swift' ? 139 : kind==='wary' ? 67 : 87;
    const ahead={x:p.x+direction*42,y:p.y};
    if (kind==='wary' && !gnat.dodging && game.web.strands.some(wire=>sweptHit(p,ahead,wire))) {
      const alternate=1-gnat.lane;
      const y=game.corner.lanes[alternate];
      if (!game.surfaces.some(rect=>crossesSolid(p,{x:p.x+direction*34,y},rect))) {
        gnat.lane=alternate;
        gnat.targetY=y;
        gnat.dodging=true;
      }
    }
    const vertical=clamp((gnat.targetY-p.y)*5,-100,100)+7*Math.sin(game.clock*3.4+gnat.phase);
    const next={x:p.x+direction*speed*dt,y:p.y+vertical*dt};
    if (game.surfaces.some(rect=>crossesSolid(p,next,rect))) {
      // Stay in a clear corridor if a turn approaches a solid leaf or ledge.
      next.y=p.y;
      if (game.surfaces.some(rect=>crossesSolid(p,next,rect))) {
        gnat.direction=direction===1 ? -1 : 1;
        continue;
      }
    }
    let first: {t:number;point:Point;wire:Strand}|undefined;
    for (const wire of game.web.strands) {
      const hit=sweptHit(p,next,wire);
      if (hit && (!first || hit.t<first.t)) first={...hit,wire};
    }
    if (first) {
      first.wire.shakeUntil=game.clock+.52;
      catchGnat(game,gnat,first.point,emit);
    } else gnat.p=next;
  }
  game.gnats=game.gnats.filter(gnat=>gnat.p.x>-100 && gnat.p.x<roomWidth+100);
}

export function outsideRoom(point:Point) {
  return point.x<0 || point.x>roomWidth || point.y<0 || point.y>roomHeight;
}

export function stepWindowHunt(game:WindowRun,input:CornerInput,dt:number,emit:(event:WindowEvent)=>void) {
  if (game.phase==='over') return;
  const {spider,web}=game;
  game.clock+=dt;
  if (input.aim) game.aim=unit(input.aim);
  if (input.jump && !game.jumpHeld && jumpWindow(game,input.move)) emit('jump');
  game.jumpHeld=input.jump;
  if (!game.practice && input.remove && !game.removeHeld) {
    const selected=aimedTrap(game);
    if (selected) {
      web.strands=web.strands.filter(wire=>wire!==selected);
      game.silk=Math.min(silkLimit,game.silk+1);
      emit('reclaim');
    } else emit('no-target');
  }
  if (!game.practice && input.direct && !game.directHeld) directShot(game,emit);
  game.directHeld=!!input.direct;
  game.removeHeld=!!input.remove;
  const before=web.strands.length;
  if (input.silk && !game.silkHeld) {
    emit('launch');
    if (castCrawler(spider,game.surfaces,aimEnd(game),{minLength:8})) emit('attach');
    else emit('miss');
  } else if (!input.silk && game.silkHeld) releaseSilk(game,emit);
  game.silkHeld=input.silk;
  const falling=spider.vy;
  if (spider.rope && input.move.y>.43) {
    spider.rope.length=Math.min(DEFAULT_TUNING.range,spider.rope.length+DEFAULT_TUNING.reelSpeed*dt);
  }
  tickCrawler(spider,game.surfaces,windowStick(input.move),input.move.y<-.43,dt,web.strands,
    {crawlSpeed:103,airAcceleration:120,ropeMinimum:8});
  if (spider.support==='floor' && falling>52) emit('land');
  if (game.practice || web.strands.length<silkLimit && game.silk>0) fixSilk(web,spider,game.surfaces);
  if (game.practice) {
    for (const strand of web.strands.slice(before)) strand.expiresAt=game.clock+18;
    web.strands=web.strands.filter(strand=>(strand.expiresAt??Infinity)>game.clock).slice(-8);
  } else {
    const added=Math.min(web.strands.length-before,silkLimit-before,game.silk);
    web.strands.length=before+added;
    game.silk-=added;
  }
  if (web.strands.length>before) emit('fix');
  if (game.practice) return;
  if (outsideRoom(spider) && (!spider.rope || outsideRoom(spider.rope))) {
    game.phase='over';
    return;
  }
  advanceGnats(game,dt,emit);
  game.marks=game.marks.filter(mark=>mark.until>game.clock);
}
