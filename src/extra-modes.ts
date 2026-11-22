import {anchorCrawlerRope,castCrawler,closeCrawlerRopes,createCrawler,jumpCrawler,tickCrawler} from './crawler.ts';
import {aimHit,type Point,type Rect} from './spider.ts';
import {fixSilk,leaveSilk,sweptHit,type Web} from './threads.ts';
import {initialAim,type ArenaInput} from './arena-run.ts';
import {silkMotion} from './pad-controls.ts';

export type ExtraMode='platform'|'swarm';
export const swarmWidth=640;
export const swarmHeight=360;
export const platformEnd=1570;
const swarmSeconds=35;
const grip=(x:number,y:number,w:number,h:number):Rect=>({x,y,w,h,grip:true});
const largeRoom=[
  grip(0,0,640,8),grip(0,352,640,8),grip(0,8,8,344),grip(632,8,8,344),
  grip(111,95,102,10),grip(382,77,102,10),grip(263,175,112,12),
  grip(119,247,89,11),grip(433,264,106,11),
];
const trail=[
  grip(0,188,231,22),grip(334,183,224,27),grip(682,181,221,29),
  grip(1036,187,182,23),grip(1354,185,263,25),grip(0,0,7,188),
  grip(134,131,69,9),grip(243,79,92,9),grip(388,134,70,9),
  grip(550,70,99,10),grip(705,109,67,8),grip(845,131,65,8),
  grip(914,67,87,8),grip(1038,121,68,8),grip(1154,128,54,8),
  grip(1211,70,95,9),grip(1397,120,76,9),
];
const perches=[{x:28,y:180},{x:368,y:175},{x:718,y:173},{x:1071,y:179},{x:1380,y:177}];
const caches=[{x:164,y:118},{x:292,y:110},{x:427,y:120},{x:612,y:105},{x:743,y:95},
  {x:965,y:101},{x:1071,y:108},{x:1260,y:100},{x:1436,y:105}];
const enemies=[{x:158,y:155},{x:425,y:152},{x:745,y:141},{x:861,y:158},{x:1091,y:152},{x:1430,y:153}];

interface ExtraFly {
  p:Point;
  origin:Point;
  v:Point;
  phase:number;
  cocoon:boolean;
  caught:boolean;
  cocoonFloor?:number;
}

const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const pointIn=(p:Point,r:Rect)=>p.x>=r.x-3 && p.x<=r.x+r.w+3 && p.y>=r.y-3 && p.y<=r.y+r.h+3;

function createFly(p:Point,phase:number):ExtraFly {
  return {p:{...p},origin:p,v:{x:62*Math.cos(phase),y:62*Math.sin(phase)},phase,cocoon:false,caught:false};
}

function swarmFlies(count:number) {
  return Array.from({length:count},(_,index)=>{
    const phase=index*2.399963+count*.71;
    return createFly({x:55+530*((index*.618+count*.287)%1),y:index%2 ? 312 : 44},phase);
  });
}

export function createExtra(mode:ExtraMode) {
  const platform=mode==='platform';
  const surfaces=platform ? trail : largeRoom;
  const web:Pick<Web,'strands'|'loose'>={strands:[],loose:[]};
  return {mode,surfaces,web,spider:createCrawler(platform ? perches[0] : {x:47,y:344},surfaces),
    aim:{...initialAim},down:false,flies:platform ? enemies.map(createFly) : swarmFlies(1),
    pickups:platform ? caches.slice() : [], silk:0,score:0,wave:1,time:swarmSeconds,clock:0,checkpoint:0,camera:0,
    phase:'play' as 'play'|'over'|'complete',shot:undefined as {from:Point;to:Point;until:number}|undefined};
}
export type ExtraRun=ReturnType<typeof createExtra>;
type ExtraEvent='jump'|'launch'|'attach'|'fix'|'catch'|'discovery'|'miss'|'release'|'wave';

function shootExtra(run:ExtraRun,emit:(event:ExtraEvent)=>void,range:number) {
  const {spider,aim}=run;
  const target={x:spider.x+aim.x*range,y:spider.y+aim.y*range};
  const hit=aimHit(spider,run.surfaces,target,{range});
  const reach=hit ? distance(spider,hit) : range;
  let enemy:ExtraFly|undefined;
  let nearest=reach;
  if (run.mode==='platform') {
    for (const fly of run.flies) {
      if (fly.caught || fly.cocoon) continue;
      const dx=fly.p.x-spider.x,dy=fly.p.y-spider.y;
      const along=dx*aim.x+dy*aim.y, side=Math.abs(dx*aim.y-dy*aim.x);
      if (along<0 || side>7 || along>=nearest) continue;
      nearest=along;
      enemy=fly;
    }
  }
  emit('launch');
  run.shot={from:{x:spider.x,y:spider.y},to:enemy?.p ?? hit ?? target,until:run.clock+.12};
  if (enemy) {
    enemy.cocoon=true;
    enemy.cocoonFloor=run.surfaces.reduce((floor,surface)=>
      enemy.p.x>=surface.x && enemy.p.x<=surface.x+surface.w && surface.y>=enemy.p.y
        ? Math.min(floor,surface.y-4) : floor,219);
    emit('fix');
  } else if (hit && castCrawler(spider,run.surfaces,target,{range})) emit('attach');
  else emit('miss');
}

export function stepExtra(run:ExtraRun,input:ArenaInput,dt:number,emit:(event:ExtraEvent)=>void) {
  if (run.phase!=='play') return;
  const {spider,surfaces,web}=run;
  const platform=run.mode==='platform';
  const range=platform ? 180 : 440;
  run.clock+=dt;
  const [x,y,ax,ay,buttons]=input;
  if (ax || ay) {
    const n=Math.hypot(ax,ay);
    run.aim={x:ax/n,y:ay/n};
  }
  if (buttons&1 && jumpCrawler(spider)) emit('jump');
  if (buttons&2) shootExtra(run,emit,range);
  const move={x:x/127,y:y/127};
  const motion=silkMotion(move,run.down);
  run.down=motion.down;
  if (motion.detach && spider.rope) {
    const anchor=closeCrawlerRopes(spider);
    if (anchor && !platform) leaveSilk(web,anchor,range);
    emit('release');
  }
  web.strands=web.strands.filter(wire=>(wire.expiresAt??Infinity)>run.clock);
  const axis=(n:number)=>Math.sign(n)*Math.max(0,(Math.abs(n)-.12)/.88);
  const before=web.strands.length;
  if (!platform) anchorCrawlerRope(spider,surfaces,web.strands,range);
  tickCrawler(spider,surfaces,{x:axis(move.x),y:axis(move.y)},motion.reel,dt,web.strands,
    {crawlSpeed:platform ? 87 : 118,airAcceleration:350});
  if (!platform) {
    anchorCrawlerRope(spider,surfaces,web.strands,range);
    fixSilk(web,spider,surfaces);
    for (const strand of web.strands.slice(before)) strand.expiresAt=run.clock+26;
    if (web.strands.length>before) emit('fix');
    if (web.strands.length>12) web.strands.splice(0,web.strands.length-12);
  }
  for (const fly of run.flies) {
    if (fly.caught) continue;
    if (platform) {
      if (!fly.cocoon) {
        fly.p.x=fly.origin.x+22*Math.sin(run.clock*1.8+fly.phase);
        fly.p.y=fly.origin.y+9*Math.cos(run.clock*2.3+fly.phase);
      } else {
        fly.p.y=Math.min(fly.cocoonFloor??219,fly.p.y+52*dt);
        if (distance(fly.p,spider)<15) catchFly(run,fly,emit);
      }
    } else moveSwarmFly(run,fly,dt,emit);
  }
  if (platform) {
    run.pickups=run.pickups.filter(p=>{
      if (distance(p,spider)>14) return true;
      run.silk++;
      emit('discovery');
      return false;
    });
    for (const [i,point] of perches.entries()) {
      const terrace=trail[i];
      if (i>run.checkpoint && spider.support==='floor' && spider.x>=terrace.x+7 &&
        spider.x<=terrace.x+terrace.w-7 && Math.abs(spider.y-point.y)<2) run.checkpoint=i;
    }
    if (spider.y>232) {
      Object.assign(spider,createCrawler(perches[run.checkpoint],surfaces),{rope:undefined,firstAnchor:undefined,thread:undefined});
      emit('miss');
    }
    run.camera=clamp(spider.x-116,0,platformEnd-320);
    if (spider.x>=platformEnd && spider.y>130 && spider.y<185) run.phase='complete';
  } else if (run.flies.every(fly=>fly.caught)) {
    run.wave++;
    run.flies=swarmFlies(run.wave);
    run.time=swarmSeconds;
    emit('wave');
  } else {
    run.time=Math.max(0,run.time-dt);
    if (!run.time) run.phase='over';
  }
}

function catchFly(run:ExtraRun,fly:ExtraFly,emit:(event:ExtraEvent)=>void) {
  fly.caught=true;
  run.score++;
  emit('catch');
}

function moveSwarmFly(run:ExtraRun,fly:ExtraFly,dt:number,emit:(event:ExtraEvent)=>void) {
  const {p,v}=fly;
  const angle=run.clock*1.3+fly.phase;
  v.x+=Math.cos(angle)*34*dt;
  v.y+=Math.sin(angle)*34*dt;
  const speed=68+Math.min(38,run.wave*3);
  const n=Math.max(.001,Math.hypot(v.x,v.y));
  v.x*=speed/n;
  v.y*=speed/n;
  const next={x:p.x+v.x*dt,y:p.y+v.y*dt};
  if (run.surfaces.some(r=>pointIn({x:next.x,y:p.y},r))) {v.x*=-1;next.x=p.x;}
  if (run.surfaces.some(r=>pointIn({x:p.x,y:next.y},r))) {v.y*=-1;next.y=p.y;}
  for (const strand of run.web.strands) {
    if (!sweptHit(p,next,strand)) continue;
    strand.shakeUntil=run.clock+.3;
    catchFly(run,fly,emit);
    return;
  }
  fly.p=next;
}
