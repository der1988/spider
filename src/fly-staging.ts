import {aimHit,SPIDER_HALF_HEIGHT,SPIDER_HALF_WIDTH,type Point} from './spider.ts';
import {closeCrawlerRopes,createCrawler,jumpCrawler,tickCrawler,type Crawler} from './crawler.ts';
import {platforms} from './hunt.ts';
import {crossesSolid,type Strand} from './threads.ts';
import {flyCues,flyStageArrival,flyStageRetreat} from './fly-song-timing.ts';
import {insideRoom,type FlyRoom} from './fly-room.ts';

const central=platforms[6];
const center={x:central.x+central.w/2,y:central.y-SPIDER_HALF_HEIGHT};
const edge={x:central.x+14,y:center.y};
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(n:number)=>Math.min(1,Math.max(0,n));
const mix=(a:number,b:number,p:number)=>a+(b-a)*p;
const ease=(p:number)=>p*p*(3-2*p);
const neutral={x:0,y:0};

// A visibility graph around body-sized obstacles gives a clear path from any hunting position.
export function stageRoute(start:Point,room:FlyRoom) {
  const obstacles=room.surfaces.slice(4).map(r=>({x:r.x-SPIDER_HALF_WIDTH,y:r.y-SPIDER_HALF_HEIGHT,
    w:r.w+2*SPIDER_HALF_WIDTH,h:r.h+2*SPIDER_HALF_HEIGHT}));
  const corners=obstacles.flatMap(({x,y,w,h})=>[
    {x:x-.6,y:y-.6},{x:x+w+.6,y:y-.6},{x:x-.6,y:y+h+.6},{x:x+w+.6,y:y+h+.6},
  ]).filter(point=>insideRoom(point,room,-SPIDER_HALF_HEIGHT));
  const nodes=[start,center,...corners];
  const costs=nodes.map((_,i)=>i===0 ? 0 : Infinity);
  const previous=nodes.map(()=>-1);
  const remaining=new Set(nodes.map((_,i)=>i));
  while (remaining.size) {
    const index=[...remaining].reduce((a,b)=>costs[a]<=costs[b] ? a : b);
    if (index===1 || !Number.isFinite(costs[index])) break;
    remaining.delete(index);
    for (const next of remaining) {
      const cost=costs[index]+distance(nodes[index],nodes[next]);
      if (cost>=costs[next] || obstacles.some(r=>crossesSolid(nodes[index],nodes[next],r))) continue;
      costs[next]=cost;
      previous[next]=index;
    }
  }
  const path:Point[]=[];
  for (let index=1;index>=0;index=previous[index]) path.unshift(nodes[index]);
  return path.length>1 ? path : [start];
}

export interface SpiderStage {
  path:Point[];
  lengths:number[];
  distance:number;
  start:number;
  arrive:number;
  tether?:Point;
  web?:{launch:Point;strand:Strand};
  attached:boolean;
  jumped:boolean;
}

export function createSpiderStage(spider:Crawler,room:FlyRoom,time:number):SpiderStage {
  closeCrawlerRopes(spider);
  const path=stageRoute({x:spider.x,y:spider.y},room);
  const lengths=path.map((point,i)=>i ? distance(path[i-1],point) : 0);
  return {path,lengths,distance:lengths.reduce((sum,n)=>sum+n,0),start:time,arrive:flyStageArrival,attached:false,jumped:false};
}

function atDistance(stage:SpiderStage,at:number) {
  for (let i=1;i<stage.path.length;i++) {
    if (at>stage.lengths[i]) { at-=stage.lengths[i];continue; }
    const p=stage.lengths[i] ? at/stage.lengths[i] : 0;
    return {x:mix(stage.path[i-1].x,stage.path[i].x,p),y:mix(stage.path[i-1].y,stage.path[i].y,p)};
  }
  return stage.path[stage.path.length-1];
}

export function stepSpiderStage(stage:SpiderStage,spider:Crawler,room:FlyRoom,time:number,dt:number) {
  if (time>=flyCues.stepBack) {
    if (!stage.jumped) {
      stage.jumped=true;
      if (jumpCrawler(spider,64)) spider.vx=-87;
    }
    tickCrawler(spider,room.surfaces,neutral,false,dt,[]);
    return;
  }
  let point:Point;
  if (time>=flyStageRetreat && stage.path.length>1) {
    const retreat=ease(clamp((time-flyStageRetreat)/.98));
    point={x:mix(center.x,edge.x,retreat),y:center.y};
  } else {
    const progress=stage.arrive>stage.start ? ease(clamp((time-stage.start)/(stage.arrive-stage.start))) : 1;
    point=atDistance(stage,progress*stage.distance);
  }
  const dx=point.x-spider.x,dy=point.y-spider.y;
  const contact=createCrawler(point,room.surfaces);
  Object.assign(spider,{x:point.x,y:point.y,vx:dx/dt,vy:dy/dt,support:contact.support,grounded:contact.grounded});
  if (Math.abs(dx)>.02 && time<flyStageRetreat) spider.facing=dx<0 ? -1 : 1;
  if (time>=stage.arrive) spider.facing=1;
  stage.tether=spider.support ? undefined : stage.tether;
  if (!spider.support && (!stage.tether || room.surfaces.some(r=>crossesSolid(spider,stage.tether!,r)))) {
    stage.tether=aimHit(spider,room.surfaces,{x:spider.x+(dx<0 ? -34 : 34),y:room.top}) ??
      aimHit(spider,room.surfaces,{x:spider.x,y:room.top});
  }
  if (time>=flyCues.lastWebFire && time<flyCues.lastWebExpire && !stage.web && spider.support==='floor') {
    const anchor=aimHit(spider,room.surfaces,{x:center.x+25,y:room.top});
    if (anchor) stage.web={launch:{x:spider.x,y:spider.y},strand:{from:{x:spider.x,y:spider.y+SPIDER_HALF_HEIGHT},to:anchor,shakeUntil:0}};
  }
}
