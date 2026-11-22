import {castCrawler,closeCrawlerRopes,createCrawler,jumpCrawler,type Crawler,normals,tickCrawler} from './crawler.ts';
import {aimHit,DEFAULT_TUNING,SPIDER_HALF_HEIGHT,moveAxis,type Point,type Rect} from './spider.ts';
import {anchorSilk,crossesSolid,sweptHit,type Strand} from './threads.ts';
import {createSpiderSpeech,enqueueDialogue,updateSpiderSpeech,type CastState,type PreySpeaker,type Speaker} from './gnat-dialogue.ts';

export const roomWidth=520;
export const roomHeight=290;
export const bedroomScale=.8;
export const bedroomWidth=2000;
export const bedroomHeight=1008;
export const shaftWidth=810;
export const shaftHeight=1120;
export const huntZoomIn=1.16;
const huntZoomOut=.62;
export const eatingSeconds=1.35;
export const caughtLifetime=3;
export const webLifetime=5;
export const ropeHoldSeconds=.22;
export const hunterSilkRange=620;
export const hunterWindup=.75;
const silkClimbSpeed=152;
export const breakFreePresses=5;
const huntSilkRange=DEFAULT_TUNING.range*4;
const jumpSpeed=172;
const grip=(x:number,y:number,w:number,h:number):Rect=>({x,y,w,h,grip:true});
const boundary=[grip(0,0,520,16),grip(0,270,520,20),grip(0,16,9,254),grip(511,16,9,254)];
type Furnishing=Rect & {kind:'sill'|'curtain'|'leaf'|'pot'|'wood'|'mattress'|'book'|'wardrobe'|'wall'};
export type Corner={
  objects:readonly Furnishing[];
  spawnSites:readonly Point[];
  flightSites:readonly Point[];
  hunterSites:readonly Point[];
};
function object(kind:Furnishing['kind'],x:number,y:number,w:number,h:number):Furnishing {
  return {...grip(x,y,w,h),kind};
}
const scaled=(p:Point):Point=>({x:p.x*bedroomScale,y:p.y*bedroomScale});
const scaledPerch=(p:Point):Point=>({x:p.x*bedroomScale,y:p.y*bedroomScale-SPIDER_HALF_HEIGHT});
const bedroomBlueprint:Corner={
  objects:[
    object('wall',0,0,1250,10),object('wall',0,606,1250,24),
    object('wall',0,10,10,596),object('wall',1240,10,10,596),
    object('mattress',62,485,272,30),object('wood',73,515,252,14),
    object('wood',89,529,12,77),object('wood',55,435,12,50),
    object('sill',142,405,137,10),object('sill',201,310,177,12),
    object('curtain',358,24,24,263),object('sill',165,204,156,12),
    object('wood',479,399,257,17),object('wood',491,416,17,190),
    object('wood',507,482,59,12),object('book',535,365,48,34),
    object('wood',497,276,143,13),object('book',578,250,27,26),
    object('wood',673,186,151,12),object('wood',793,100,132,12),
    object('wardrobe',887,480,309,126),object('book',947,441,45,39),
    object('pot',1091,414,66,66),object('leaf',1010,365,126,11),
    object('leaf',1123,277,85,11),object('leaf',1034,204,95,11),
    object('wood',911,298,100,13),object('wood',1073,90,153,12),
  ].map(r=>({...r,x:r.x*2,y:r.y*2,w:r.w*2,h:r.h*2})).concat([
    object('wood',156,881,62,12),object('sill',388,701,86,12),object('sill',441,500,74,12),
    object('wood',570,737,84,12),object('wood',914,1001,74,13),object('wood',1310,669,115,13),
    object('wood',1610,290,95,12),object('wood',1810,801,83,12),object('wood',1955,676,90,12),
    object('leaf',2200,485,63,10),
  ]),
  spawnSites:[
    {x:460,y:970},{x:800,y:1212},{x:1300,y:798},{x:600,y:620},
    {x:2100,y:960},{x:2250,y:180},{x:1830,y:1212},
  ],
  flightSites:[
    {x:258,y:720},{x:570,y:567},{x:242,y:263},{x:884,y:478},
    {x:1112,y:376},{x:1413,y:245},{x:1746,y:395},{x:1698,y:658},
    {x:1932,y:282},{x:2060,y:570},{x:2321,y:410},{x:2334,y:245},
  ],
  hunterSites:[
    {x:251,y:1212},{x:1250,y:1212},{x:1630,y:372},{x:2115,y:960},{x:2350,y:180},
  ],
};
export const bedroom:Corner={
  objects:bedroomBlueprint.objects.map(r=>({...r,...scaled(r),w:r.w*bedroomScale,h:r.h*bedroomScale})),
  spawnSites:bedroomBlueprint.spawnSites.map(scaledPerch),
  flightSites:bedroomBlueprint.flightSites.map(scaled),
  hunterSites:bedroomBlueprint.hunterSites.map(scaledPerch),
};
// Move the furniture and its perches together. Ordered control points preserve
// the room's connected passages and the contacts between adjoining objects.
export function randomBedroom(random=Math.random):Corner {
  function axis(limit:number,offset:number) {
    const spacing=limit/4;
    const stops=[0,...[1,2,3].map(i=>i*spacing+(random()*2-1)*offset),limit];
    return (value:number)=>{
      const i=Math.min(3,Math.max(0,Math.floor(value/spacing)));
      return stops[i]+(stops[i+1]-stops[i])*(value-i*spacing)/spacing;
    };
  }
  const x=axis(bedroomWidth,45),y=axis(bedroomHeight,23);
  const point=(p:Point)=>({x:x(p.x),y:y(p.y)});
  const perch=(p:Point)=>({x:x(p.x),y:y(p.y+SPIDER_HALF_HEIGHT)-SPIDER_HALF_HEIGHT});
  return {
    objects:bedroom.objects.map(r=>({...r,...point(r),w:x(r.x+r.w)-x(r.x),h:y(r.y+r.h)-y(r.y)})),
    spawnSites:bedroom.spawnSites.map(perch),
    hunterSites:bedroom.hunterSites.map(perch),
    flightSites:bedroom.flightSites.map(point),
  };
}

export function createOpenWorld(random=Math.random) {
  const shelf=(x:number,y:number,w:number)=>object('wood',(x+random()*20-10)*.9,y+random()*14-7,w*.9,14);
  const objects=[
    object('wall',0,0,shaftWidth,16),object('wall',0,1096,shaftWidth,24),
    object('wall',0,16,16,1080),object('wall',shaftWidth-16,16,16,1080),
    shelf(22,894,145),shelf(356,876,180),shelf(741,903,137),
    shelf(95,680,105),shelf(528,714,128),shelf(742,657,133),
    shelf(18,485,147),shelf(328,526,165),shelf(711,456,166),
    shelf(105,300,140),shelf(471,345,147),shelf(747,255,130),
    shelf(21,147,104),shelf(339,183,138),shelf(630,119,149),
  ];
  const floor=1096-SPIDER_HALF_HEIGHT;
  const flightSites=[{x:235,y:887},{x:680,y:844},{x:460,y:770},
    {x:267,y:593},{x:672,y:543},{x:584,y:429},
    {x:285,y:235},{x:560,y:170},{x:813,y:91},{x:165,y:77}].map(p=>
      ({x:(p.x+random()*22-11)*.9,y:p.y+random()*22-11}));
  return createWindowHunt(false,{
    objects,flightSites,
    spawnSites:[171,405,625].map(x=>({x,y:floor})),
    hunterSites:[{x:243,y:floor},{x:742,y:395},{x:63,y:243},{x:720,y:767}],
  },random,true);
}

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
type Gnat={rare:boolean;uncommon:boolean;p:Point;v:Point;home:Point;direction:-1|1;kind:GnatKind;phase:number;steering:Point;decideAt:number};
type Predator={
  bee:boolean; slowedUntil:number;
  body:Crawler; origin:Point; facing:-1|1; lastKnown?:Point; chaseUntil:number;
  spokeInChase:boolean;
  boundUntil:number; immuneUntil:number; jumpAt:number; fireAt:number;
  shot?:{from:Point;to:Point;at:number};
  patrolIndex:number;patrolStep:number;swingUntil:number;planAt:number;plan?:Point;
  bypass?:{roof:Rect;exit:number};
};
export interface CornerInput {move:Point;aim?:Point;jump:boolean;silk:boolean;silkHeldFor?:number;grip?:boolean;escape?:boolean;remove?:boolean;}

function predator(surfaces:readonly Rect[],x:number,y:number,facing:-1|1,bee=false):Predator {
  return {bee,slowedUntil:0,body:createCrawler({x,y},surfaces),origin:{x,y},facing,chaseUntil:0,spokeInChase:false,boundUntil:0,immuneUntil:0,jumpAt:0,fireAt:0,patrolIndex:0,patrolStep:1,swingUntil:0,planAt:0};
}

export function createWindowHunt(practice=false,corner=bedroom,random=Math.random,openWorld=false) {
  const surfaces=practice ? practiceRoom : corner.objects;
  const spawn=practice ? {x:32,y:262} : randomSite(corner.spawnSites,random);
  const spider=createCrawler(spawn,surfaces);
  const hunterStarts=corner.hunterSites.filter(p=>distance(p,spider)>=320);
  const hunters=practice ? [] : openWorld ? corner.hunterSites : [randomSite(hunterStarts,random)].filter(Boolean);
  const starts=openWorld ? corner.flightSites : hunters.length ? pickFlightSites(corner,spider,random,3,hunters) : [];
  return {
    practice,corner,surfaces,spider,openWorld,zoom:openWorld ? huntZoomIn : 1,eatingUntil:0,silkPressedAt:0,ropeAttempt:false,
    web:{strands:[] as Strand[]},
    speech:createSpiderSpeech(),dialogueClock:0,
    greeted:new WeakSet<Gnat>(),
    occupants:new Map<Strand,Gnat[]>(),
    gnats:starts.map((p,i)=>makeGnat(p,i,random,openWorld && p.y<265,openWorld && p.y>=265 && p.y<650)),
    carried:[] as Gnat[],
    trail:[{...spawn}] as Point[],
    predators:hunters.map((p,i)=>{
      const enemy=predator(surfaces,p.x,p.y,random()<.5 ? -1 : 1,openWorld && i%2===1);
      if (openWorld) {
        enemy.patrolIndex=(corner.hunterSites.indexOf(p)+1)%corner.hunterSites.length;
        enemy.patrolStep=enemy.facing;
      }
      return enemy;
    }),
    shots:[] as {p:Point;to:Point}[],
    clinging:undefined as Strand|undefined, gripAt:0,
    trapped:false,escapeCount:0,escapeHeld:false,safeUntil:0,removeHeld:false,
    silk:0,catches:0,
    aim:{x:.36,y:-.932},clock:0,jumpHeld:false,silkHeld:false,
    phase:'play' as 'play'|'over',
  };
}
export type WindowRun=ReturnType<typeof createWindowHunt>;
export type WindowEvent='jump'|'launch'|'attach'|'fix'|'release'|'miss'|'caught-insect'|'catch'|'land'|'trap'|'escaped'|'caught-predator'|'eat';
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

function silkRange(game:WindowRun) {
  return game.practice ? DEFAULT_TUNING.range : huntSilkRange;
}

export function windowAnchor(game:WindowRun) {
  const {spider,aim}=game;
  return aimHit(spider,game.surfaces,{x:spider.x+aim.x,y:spider.y+aim.y},{range:silkRange(game)});
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
  const speed=jumpSpeed;
  if (!jumpCrawler(spider,speed)) return false;
  spider.vx=direction.x*speed;
  spider.vy=direction.y*speed;
  return true;
}

function aimEnd(game:WindowRun) {
  const {spider,aim}=game;
  const range=silkRange(game);
  return {x:spider.x+aim.x*range,y:spider.y+aim.y*range};
}

function fireRope(game:WindowRun,emit:(event:WindowEvent)=>void) {
  emit('launch');
  if (castCrawler(game.spider,game.surfaces,aimEnd(game),{range:silkRange(game),minLength:8})) {
    game.clinging=undefined;
    emit('attach');
  } else emit('miss');
}

function fireTrap(game:WindowRun,emit:(event:WindowEvent)=>void) {
  const {spider,surfaces,web}=game;
  emit('launch');
  const anchor=spider.support && aimHit(spider,surfaces,aimEnd(game),{range:silkRange(game)});
  const before=web.strands.length;
  if (anchor) anchorSilk(web.strands,anchor,silkRange(game)+SPIDER_HALF_HEIGHT,spider,surfaces,Infinity);
  if (web.strands.length===before) {emit('miss');return;}
  web.strands[before].expiresAt=game.clock+webLifetime;
  emit('fix');
}

function releaseSilk(game:WindowRun,emit:(event:WindowEvent)=>void) {
  const rope=closeCrawlerRopes(game.spider);
  if (!rope) return;
  const reach=silkRange(game)+SPIDER_HALF_HEIGHT;
  const {strands}=game.web;
  const before=strands.length;
  anchorSilk(strands,rope,reach,game.spider,game.surfaces,game.practice ? 8 : Infinity);
  const contact=createCrawler(game.spider,game.surfaces).support;
  if (contact) {
    game.spider.support=contact;
    game.spider.grounded=true;
  }
  emit('release');
  if (strands.length>before) {
    strands[before].expiresAt=game.clock+webLifetime;
    emit('fix');
  }
}

function randomSite(sites:readonly Point[],random:()=>number) {
  return sites[Math.floor(random()*sites.length)];
}

function pickFlightSites(corner:Corner,spider:Point,random:()=>number,count:number,occupied:readonly Point[]=[]) {
  const picks:Point[]=[];
  const apart=(a:Point,b:Point)=>distance(a,b);
  for (let i=0;i<count;i++) {
    const available=corner.flightSites.filter(p=>apart(p,spider)>205 &&
      [...occupied,...picks].every(q=>apart(p,q)>132));
    if (!available.length) break;
    picks.push(randomSite(available,random));
  }
  return picks;
}

function makeGnat(home:Point,index:number,random:()=>number,rare=false,uncommon=false):Gnat {
  const angle=random()*Math.PI*2;
  return {rare,uncommon,p:{...home},v:{x:0,y:0},home:{...home},direction:angle>Math.PI ? -1 : 1,
    steering:{x:Math.cos(angle),y:Math.sin(angle)},kind:(['wary','swift','fly'] as const)[index%3],
    phase:angle,decideAt:0};
}

function firstCrossing(from:Point,to:Point,strands:readonly Strand[]) {
  let first:{t:number;point:Point;wire:Strand}|undefined;
  for (const wire of strands) {
    const hit=sweptHit(from,to,wire);
    if (hit && (!first || hit.t<first.t)) first={...hit,wire};
  }
  return first;
}

function clear(game:WindowRun,from:Point,to:Point) {
  return !game.surfaces.some(rect=>crossesSolid(from,to,rect));
}

function steerGnat(game:WindowRun,gnat:Gnat,threat:Point|undefined) {
  const {p,home,steering}=gnat;
  const orbit=game.clock*.62+gnat.phase;
  const goal={x:home.x+Math.cos(orbit)*105,y:home.y+Math.sin(orbit*1.4)*84};
  const desired=threat && gnat.rare ? unit({x:(p.x-threat.x)*.65,y:p.y<threat.y ? -130 : 130}) : threat ? unit({x:p.x-threat.x,y:p.y-threat.y}) : unit({x:goal.x-p.x,y:goal.y-p.y});
  const heading=Math.atan2(desired.y,desired.x);
  let best=steering,high=-Infinity;
  for (const offset of [0,.48,-.48,.96,-.96,1.45,-1.45,2.1,-2.1,Math.PI]) {
    const angle=heading+offset;
    const turn={x:Math.cos(angle),y:Math.sin(angle)};
    const near={x:p.x+turn.x*24,y:p.y+turn.y*24};
    if (!clear(game,p,near)) continue;
    const look=gnat.uncommon ? 124 : threat ? 87 : 58;
    const far={x:p.x+turn.x*look,y:p.y+turn.y*look};
    const seenWire=firstCrossing(p,far,game.web.strands);
    const escape=threat ? (distance(far,threat)-distance(p,threat))*.018 : 0;
    const score=2.5*(turn.x*desired.x+turn.y*desired.y)+.66*(turn.x*steering.x+turn.y*steering.y)+escape
      -(seenWire ? (gnat.uncommon ? 12 : 6) : 0)-(clear(game,near,far) ? 0 : 4);
    if (score>high) {high=score;best=turn;}
  }
  return best;
}

function collectInsect(game:WindowRun,gnat:Gnat,emit:(event:WindowEvent)=>void) {
  game.carried.push(gnat);
  if (!game.openWorld) startInsectDialogue(game,gnat,'caughtPrey');
  game.silk++;
  game.catches++;
  if (game.speech.line?.speaker===preySpeaker(gnat)) game.speech.line=undefined;
  emit('catch');
}

function touchesInsect(game:WindowRun,p:Point,previous:Point,from:Point=p) {
  const relative={from:{x:previous.x-from.x,y:previous.y-from.y},
    to:{x:game.spider.x-p.x,y:game.spider.y-p.y},shakeUntil:0};
  const zero={x:0,y:0};
  return distance(zero,pointAt(relative,projection(zero,relative)))<=11 && clear(game,game.spider,p);
}

function advanceGnats(game:WindowRun,previous:Point,dt:number,emit:(event:WindowEvent)=>void) {
  for (const [wire,occupants] of game.occupants) {
    const remaining=occupants.filter(gnat=>{
      if (!touchesInsect(game,gnat.p,previous)) return true;
      collectInsect(game,gnat,emit);
      return false;
    });
    if (remaining.length) game.occupants.set(wire,remaining);
    else game.occupants.delete(wire);
  }
  game.gnats=game.gnats.filter(gnat=>{
    const {p,v,kind}=gnat;
    const {spider}=game;
    const threat=distance(p,spider)<(gnat.rare ? 250 : kind==='wary' ? 196 : 162) && clear(game,p,spider) ? spider : undefined;
    if (game.clock>=gnat.decideAt) {
      gnat.steering=steerGnat(game,gnat,threat);
      gnat.decideAt=game.clock+(threat && gnat.rare ? .08 : threat ? .15 : .24);
    }
    const speed=(kind==='swift' ? 116 : kind==='fly' ? 78 : 96)+(threat ? 38 : 0);
    const accel=1-Math.exp(-dt*(threat ? 8 : 5));
    v.x+=(gnat.steering.x*speed-v.x)*accel;
    v.y+=(gnat.steering.y*speed-v.y)*accel;
    const next={x:p.x+v.x*dt,y:p.y+v.y*dt};
    if (!clear(game,p,next)) {
      v.x=0;v.y=0;gnat.decideAt=0;
      return true;
    }
    if (touchesInsect(game,next,previous,p)) {
      collectInsect(game,gnat,emit);
      return false;
    }
    const hit=firstCrossing(p,next,game.web.strands);
    if (hit) {
      const occupants=game.occupants.get(hit.wire)??[];
      gnat.p=hit.point;
      occupants.push(gnat);
      game.occupants.set(hit.wire,occupants);
      hit.wire.shakeUntil=game.clock+.45;
      emit('caught-insect');
      return false;
    }
    gnat.p=next;
    if (Math.abs(v.x)>6) gnat.direction=v.x<0 ? -1 : 1;
    return true;
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
  const speed=(stick.x*tangent.x+stick.y*tangent.y)*(94+(silkClimbSpeed-94)*Math.abs(tangent.y));
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

function expireWebs(game:WindowRun) {
  game.web.strands=game.web.strands.filter(wire=>{
    if ((wire.expiresAt??Infinity)>game.clock) return true;
    for (const insect of game.occupants.get(wire)??[]) {
      insect.v={x:0,y:0};
      insect.decideAt=0;
      game.gnats.push(insect);
      if (!game.openWorld && distance(insect.p,game.spider)<110 && inWindow(game,insect.p)) startInsectDialogue(game,insect,'freedPrey');
    }
    game.occupants.delete(wire);
    return false;
  });
}

function preySpeaker(insect:Gnat):PreySpeaker {
  return insect.kind==='wary' ? 'midge' : insect.kind==='swift' ? 'dart' : 'pip';
}

function startInsectDialogue(game:WindowRun,insect:Gnat,event:'nearPrey'|'caughtPrey'|'freedPrey') {
  return enqueueDialogue(game.speech,game.dialogueClock,event,preySpeaker(insect),()=>event==='caughtPrey'
    ? game.carried.includes(insect)
    : game.gnats.includes(insect) && (event==='freedPrey' || distance(insect.p,game.spider)<145));
}

function startHunterDialogue(game:WindowRun,enemy:Predator,event:'hunter'|'boundHunter'|'escaped') {
  return enqueueDialogue(game.speech,game.dialogueClock,event,'hunter',()=>game.predators.includes(enemy) &&
    (event!=='hunter' || game.clock<enemy.chaseUntil));
}

function pullChain(game:WindowRun) {
  const spacing=17;
  const head={x:game.spider.x,y:game.spider.y};
  const {trail,carried}=game;
  if (distance(head,trail[0])>2) trail.unshift(head);
  let previous=head;
  let travelled=0,link=0;
  for (const [index,node] of trail.entries()) {
    const length=distance(previous,node);
    while (length && link<carried.length && travelled+length>=(link+1)*spacing) {
      const t=((link+1)*spacing-travelled)/length;
      carried[link++].p={x:previous.x+(node.x-previous.x)*t,y:previous.y+(node.y-previous.y)*t};
    }
    travelled+=length;
    previous=node;
    if (travelled>(carried.length+2)*spacing) {
      trail.length=index+1;
      break;
    }
  }
  while (link<carried.length) {
    const back=unit({x:previous.x-head.x || -game.spider.facing,y:previous.y-head.y});
    const next={x:previous.x+back.x*spacing,y:previous.y+back.y*spacing};
    if (clear(game,previous,next)) previous=next;
    carried[link++].p={...previous};
  }
}

function hunterRoute(game:WindowRun,body:Point,goal:Point) {
  if (clear(game,body,goal)) return goal;
  let best=goal,cost=Infinity;
  for (const rect of game.surfaces) {
    if (!crossesSolid(body,goal,rect)) continue;
    for (const x of [rect.x-13,rect.x+rect.w+13]) {
      for (const y of [rect.y-13,rect.y+rect.h+13]) {
        const point={x,y};
        if ((x<20 || x>(game.openWorld ? shaftWidth : bedroomWidth)-20) || y<20 || y>bedroomHeight-25 ||
            !clear(game,body,point) || distance(body,point)<12) continue;
        const score=distance(body,point)+distance(point,goal)*.9+(clear(game,point,goal) ? 0 : 160);
        if (score<cost) {cost=score;best=point;}
      }
    }
  }
  return best;
}

function swingToward(game:WindowRun,enemy:Predator,goal:Point) {
  const {body}=enemy;
  if (goal.y>body.y-45) return false;
  let best:Point|undefined,score=Infinity;
  const baseline=distance(body,goal);
  const slope=(goal.x-body.x)/(body.y-goal.y);
  for (const angle of [slope,0,-.35,.35,-.75,.75,-1.3,1.3,-2.1,2.1]) {
    const target={x:body.x+angle*110,y:body.y-110};
    const anchor=aimHit(body,game.surfaces,target,{range:hunterSilkRange});
    if (!anchor || anchor.y>body.y-50 || distance(anchor,goal)>baseline-18 ||
        firstCrossing(body,anchor,game.web.strands)) continue;
    const roof=enemy.bypass?.roof;
    if (roof && anchor.x>=roof.x-.1 && anchor.x<=roof.x+roof.w+.1 &&
        anchor.y>=roof.y-.1 && anchor.y<=roof.y+roof.h+.1) continue;
    const cost=distance(anchor,goal)+distance(body,anchor)*.24;
    if (cost<score) {
      best=target;
      score=cost;
    }
  }
  if (!best || !castCrawler(body,game.surfaces,best,{range:hunterSilkRange,minLength:8})) return false;
  enemy.swingUntil=game.clock+body.rope!.length/138+1;
  return true;
}

function stepPredator(game:WindowRun,enemy:Predator,dt:number,emit:(event:WindowEvent)=>void) {
  if (game.clock<enemy.boundUntil) return;
  const body=enemy.body, target=game.spider;

  const visible=(game.openWorld ? inWindow(game,body) : distance(body,target)<365) && clear(game,body,target);
  const evidence=game.carried.length>0 || game.clock<game.eatingUntil;
  if (game.openWorld && (game.clock>=enemy.chaseUntil || visible && !evidence)) {
    enemy.chaseUntil=0;
    enemy.lastKnown=undefined;
    enemy.shot=undefined;
  }
  const sees=visible && (!game.openWorld || evidence);
  if (game.clock<enemy.slowedUntil) dt*=.40;
  if (game.clock>=enemy.chaseUntil) enemy.spokeInChase=false;
  if (sees) {
    if (!game.openWorld && !enemy.spokeInChase && inWindow(game,body)) {
      enemy.spokeInChase=startHunterDialogue(game,enemy,'hunter');
    }
    enemy.lastKnown={x:target.x,y:target.y};
    enemy.chaseUntil=game.clock+7;
  }
  const tracking=game.clock<enemy.chaseUntil && enemy.lastKnown;
  const posts=game.openWorld ? [enemy.origin,{x:clamp(enemy.origin.x+110,70,shaftWidth-70),y:770},
    {x:clamp(enemy.origin.x-95,70,shaftWidth-70),y:488},{x:clamp(enemy.origin.x+80,70,shaftWidth-70),y:89},
    {x:clamp(enemy.origin.x-145,70,shaftWidth-70),y:335},{x:clamp(enemy.origin.x+100,70,shaftWidth-70),y:672}] : game.corner.hunterSites;
  if (enemy.patrolIndex>=posts.length) enemy.patrolIndex=0;
  if (!tracking && distance(body,posts[enemy.patrolIndex])<64) enemy.patrolIndex=(enemy.patrolIndex+enemy.patrolStep+posts.length)%posts.length;
  const goal=tracking || posts[enemy.patrolIndex];
  if (game.clock>=enemy.planAt) {
    enemy.plan=hunterRoute(game,body,goal);
    enemy.planAt=game.clock+.22;
  }
  const waypoint=enemy.plan??goal;
  if (enemy.bee) {
    const v=unit({x:waypoint.x-body.x,y:waypoint.y-body.y});
    const speed=tracking ? 120 : 77;
    const before={x:body.x,y:body.y};
    moveAxis(body,game.surfaces,'x',v.x*speed*dt);
    moveAxis(body,game.surfaces,'y',v.y*speed*dt);
    if (!tracking && distance(before,body)<.08) {
      enemy.patrolIndex=(enemy.patrolIndex+1)%posts.length;
      enemy.planAt=0;
    }
    slowGuard(game,enemy,before,emit);
    if (tracking && distance(body,target)<16 && clear(game,body,target)) game.phase='over';
    return;
  }
  if (enemy.shot) {
    if (game.clock<enemy.shot.at) return;
    const {from,to}=enemy.shot;
    game.shots.push({p:from,to});
    enemy.shot=undefined;
    emit('launch');
  } else if (sees && !game.trapped && !body.rope && game.clock>=enemy.fireAt && distance(body,target)>35 &&
      distance(body,target)<330 && (goal.y>body.y-65 || !tracking)) {
    const from={x:body.x,y:body.y};
    const lead=clamp(distance(body,target)/470,.12,.38);
    const future={x:target.x+target.vx*lead,y:target.y+target.vy*lead};
    const predicted=clear(game,from,future) ? future : target;
    const vector=unit({x:predicted.x-from.x,y:predicted.y-from.y});
    const to={x:from.x+vector.x*330,y:from.y+vector.y*330};
    enemy.shot={from,to:aimHit(from,game.surfaces,to,{range:330})??to,at:game.clock+hunterWindup};
    enemy.fireAt=game.clock+3.4;
    return;
  }
  if (body.rope && (game.clock>=enemy.swingUntil || distance(body,body.rope)<16)) {
    const support=createCrawler(body,game.surfaces).support;
    if (support || game.clock>=enemy.swingUntil) {
      closeCrawlerRopes(body);
      body.support=support;
      enemy.jumpAt=game.clock+.35;
      enemy.planAt=0;
    }
  }
  const roof=body.support==='ceiling' && goal.y<body.y-30 && game.surfaces.find(rect=>
    Math.abs(body.y-SPIDER_HALF_HEIGHT-rect.y-rect.h)<.03 && body.x>rect.x-6 && body.x<rect.x+rect.w+6);
  let dx=waypoint.x-body.x;
  const dy=waypoint.y-body.y;
  if (roof && enemy.bypass?.roof!==roof) {
    const west=roof.x-28,east=roof.x+roof.w+28;
    const exit=Math.abs(west-body.x)+Math.abs(west-goal.x)*.6<Math.abs(east-body.x)+Math.abs(east-goal.x)*.6 ? west : east;
    enemy.bypass={roof,exit};
  }
  if (enemy.bypass) {
    const {roof:obstacle,exit}=enemy.bypass;
    if (body.y<obstacle.y || goal.y>=obstacle.y || Math.abs(body.x-exit)>obstacle.w+120) enemy.bypass=undefined;
    else dx=exit-body.x;
  }
  const wall=body.support==='left' || body.support==='right';
  const previous={x:body.x,y:body.y};
  const ahead={x:body.x+Math.sign(dx)*52,y:body.y};
  const wire=firstCrossing(body,ahead,game.web.strands);
  if (!roof && !body.rope && game.clock>=enemy.jumpAt && (body.support || tracking)) {
    const hop=wire && wire.t>.26 && clear(game,body,{x:ahead.x,y:body.y-35});
    if (swingToward(game,enemy,waypoint) || game.openWorld && swingToward(game,enemy,goal)) enemy.jumpAt=game.clock+1;
    else if (body.support && (hop || dy<-32 && !wall || wall && Math.abs(dy)<16 && Math.abs(dx)>23)) {
      if (jumpCrawler(body,158) && !wall) body.vx=clamp(dx*3,-120,120);
      enemy.jumpAt=game.clock+1.1;
    }
  }
  const vy=wall ? clamp(dy/22,-1,1) : 0;
  const pull=body.rope ? body.rope.x-body.x : dx;
  tickCrawler(body,game.surfaces,{x:clamp(pull/24,-1,1),y:vy},!!body.rope,dt,[],
    {crawlSpeed:tracking ? 99 : 65,airAcceleration:205,ropeMinimum:8,reelSpeed:138});
  if (!tracking && body.support && distance(previous,body)<.02 && game.clock>=enemy.jumpAt) {
    enemy.patrolIndex=(enemy.patrolIndex+enemy.patrolStep+posts.length)%posts.length;
    enemy.planAt=0;
  }
  if (game.openWorld) slowGuard(game,enemy,previous,emit);
  else if (game.clock>=enemy.immuneUntil) {
    const hit=firstCrossing(previous,body,game.web.strands);
    if (hit) {
      body.x=hit.point.x;body.y=hit.point.y;body.vx=0;body.vy=0;
      enemy.boundUntil=game.clock+caughtLifetime;
      enemy.immuneUntil=enemy.boundUntil+.6;
      enemy.shot=undefined;
      hit.wire.shakeUntil=game.clock+.4;
      if (!game.openWorld && inWindow(game,body)) startHunterDialogue(game,enemy,'boundHunter');
      emit('caught-predator');
      return;
    }
  }
  if ((!game.openWorld || tracking) && distance(body,target)<16 && !game.surfaces.some(rect=>crossesSolid(body,target,rect))) game.phase='over';
}

function slowGuard(game:WindowRun,enemy:Predator,previous:Point,emit:(event:WindowEvent)=>void) {
  if (game.clock<enemy.immuneUntil) return;
  const hit=firstCrossing(previous,enemy.body,game.web.strands);
  if (!hit) return;
  enemy.slowedUntil=game.clock+2.4;
  enemy.immuneUntil=game.clock+3.1;
  hit.wire.shakeUntil=game.clock+.35;
  emit('caught-predator');
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
  if (game.practice) return {x:0,y:0,scale:1};
  const scale=game.openWorld ? game.zoom : 1;
  const width=game.openWorld ? shaftWidth : bedroomWidth;
  const height=game.openWorld ? shaftHeight : bedroomHeight;
  return {
    x:width<roomWidth/scale ? (width-roomWidth/scale)/2 : clamp(game.spider.x-roomWidth/(2*scale),0,width-roomWidth/scale),
    y:clamp(game.spider.y-roomHeight*.60/scale,0,height-roomHeight/scale),scale,
  };
}

export function updateHuntZoom(game:WindowRun,held:boolean,dt:number) {
  if (game.openWorld) game.zoom+=((held ? huntZoomOut : huntZoomIn)-game.zoom)*(1-Math.exp(-dt*8));
}

function inWindow(game:WindowRun,point:Point) {
  const camera=cameraFor(game);
  return point.x>=camera.x && point.x<camera.x+roomWidth/camera.scale && point.y>=camera.y && point.y<camera.y+roomHeight/camera.scale;
}

export function chasingPrey(game:WindowRun,input:CornerInput) {
  const {spider}=game;
  const direction={x:input.move.x*.7+spider.vx/125,y:input.move.y*.7+spider.vy/135};
  return !game.trapped && magnitude(direction)>.16 && game.gnats.some(({p})=>{
    const delta={x:p.x-spider.x,y:p.y-spider.y};
    const range=magnitude(delta);
    return range<182 && (range<46 || direction.x*delta.x+direction.y*delta.y>range*.23) &&
      clear(game,spider,p);
  });
}

export function gnatCast(game:WindowRun):Record<Exclude<Speaker,'resident'>,CastState> {
  const cast:Record<Exclude<Speaker,'resident'>,CastState>={spider:'active',midge:'away',dart:'away',pip:'away',hunter:'away'};
  for (const insect of game.gnats) if (inWindow(game,insect.p)) cast[preySpeaker(insect)]='active';
  for (const occupants of game.occupants.values()) {
    for (const insect of occupants) if (inWindow(game,insect.p)) cast[preySpeaker(insect)]='active';
  }
  for (const insect of game.carried) cast[preySpeaker(insect)]='eliminated';
  if (game.predators.some(enemy=>inWindow(game,enemy.body))) cast.hunter='active';
  return cast;
}

export function stepWindowHunt(game:WindowRun,input:CornerInput,dt:number,emit:(event:WindowEvent)=>void) {
  if (game.phase==='over') return;
  const {spider,web}=game;
  const beforeMove={x:spider.x,y:spider.y};
  game.clock+=dt;
  expireWebs(game);
  if (input.aim) game.aim=unit(input.aim);
  if (!game.practice && input.remove && !game.removeHeld && !game.trapped) {
    const empty=web.strands.filter(wire=>!game.occupants.has(wire));
    const closest=empty.reduce<Strand|undefined>((best,wire)=>{
      const distanceTo=(line:Strand)=>distance(spider,pointAt(line,projection(spider,line)));
      return !best || distanceTo(wire)<distanceTo(best) ? wire : best;
    },undefined);
    if (closest) web.strands=web.strands.filter(wire=>wire!==closest);
  }
  game.removeHeld=!!input.remove;
  if (game.openWorld && !game.trapped && input.escape && !game.escapeHeld &&
      game.clock>=game.eatingUntil && game.carried.length) {
    game.carried.pop();
    game.eatingUntil=game.clock+eatingSeconds;
    emit('eat');
  }
  if (game.trapped) {
    if (input.escape && !game.escapeHeld && ++game.escapeCount>=breakFreePresses) {
      game.trapped=false;
      game.safeUntil=game.clock+1;
      const hunter=game.predators.find(enemy=>inWindow(game,enemy.body));
      if (hunter && !game.openWorld) startHunterDialogue(game,hunter,'escaped');
      emit('escaped');
    }
  } else {
    if (!input.grip || !web.strands.includes(game.clinging!)) game.clinging=undefined;
    if (input.jump && !game.jumpHeld) {
      if (game.clinging) game.gripAt=game.clock+.18;
      game.clinging=undefined;
      if (jumpWindow(game,input.move)) emit('jump');
    }
    if (game.openWorld) {
      if (input.silk && !game.silkHeld) {
        game.silkPressedAt=game.clock;
        game.ropeAttempt=false;
      }
      if (input.silk && !game.ropeAttempt && (input.silkHeldFor??game.clock-game.silkPressedAt)>=ropeHoldSeconds) {
        game.ropeAttempt=true;
        fireRope(game,emit);
      } else if (!input.silk && game.silkHeld) {
        if (game.ropeAttempt) releaseSilk(game,emit);
        else fireTrap(game,emit);
      }
    } else if (input.silk && !game.silkHeld) fireRope(game,emit);
    else if (!input.silk && game.silkHeld) releaseSilk(game,emit);
    const previous={x:spider.x,y:spider.y};
    const falling=spider.vy;
    if (spider.rope && input.move.y>.43 && spider.rope.length<silkRange(game)) {
      const rope=spider.rope;
      const vertical=spider.y-rope.y;
      const tension=distance(spider,rope);
      if (rope.length-tension<3 && vertical>0) {
        spider.vy=Math.max(spider.vy,silkClimbSpeed*vertical/Math.max(1,tension));
      }
      rope.length=Math.min(silkRange(game),rope.length+silkClimbSpeed*dt);
    }
    const stick=windowStick(input.move);
    if (game.clinging) crawlWeb(game,game.clinging,stick,dt);
    else {
      tickCrawler(spider,game.surfaces,stick,input.move.y<-.43,dt,game.practice ? web.strands : [],
        {crawlSpeed:103,airAcceleration:120,ropeMinimum:8,reelSpeed:silkClimbSpeed});
      if (!game.practice && input.grip && !spider.rope && game.clock>=game.gripAt) {
        game.clinging=gripWeb(game,previous);
        if (game.clinging) crawlWeb(game,game.clinging,stick,dt);
      }
    }
    if (spider.support==='floor' && falling>52) emit('land');
  }
  game.jumpHeld=input.jump;
  game.silkHeld=input.silk;
  game.escapeHeld=!!input.escape;
  if (game.practice) return;
  advanceGnats(game,beforeMove,dt,emit);
  pullChain(game);
  for (const enemy of game.predators) stepPredator(game,enemy,dt,emit);
  advanceShots(game,dt,emit);
  if (!game.openWorld && !game.trapped && !game.speech.queue.some(request=>request.event==='nearPrey')) {
    const nearby=game.gnats.find(gnat=>!game.greeted.has(gnat) &&
      distance(gnat.p,spider)<76 && clear(game,spider,gnat.p));
    if (nearby && inWindow(game,nearby.p) && startInsectDialogue(game,nearby,'nearPrey')) {
      game.greeted.add(nearby);
    }
  }
}

export function advanceWindowDialogue(game:WindowRun,input:CornerInput,seconds:number) {
  if (game.practice || game.openWorld || game.phase==='over') return;
  const {spider}=game;
  game.dialogueClock+=seconds;
  const idle=!!spider.support && !game.trapped && !spider.rope && !input.silk && !input.jump &&
    magnitude(input.move)<.1 && Math.hypot(spider.vx,spider.vy)<12 &&
    !game.predators.some(enemy=>game.clock>=enemy.boundUntil && game.clock<enemy.chaseUntil);
  updateSpiderSpeech(game.speech,game.dialogueClock,idle,speaker=>speaker==='spider' || speaker==='resident' || gnatCast(game)[speaker]==='active');
}
