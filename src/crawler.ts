import {
  createSpider, DEFAULT_TUNING, detach, moveAxis, shoot, SPIDER_HALF_HEIGHT, SPIDER_HALF_WIDTH, tickSpider,
  type Point, type Rect, type Spider, type WalkLine, type Tuning,
} from './spider.ts';
import {anchorSilk,type Strand} from './threads.ts';

export const normals = {
  floor:{x:0,y:-1}, ceiling:{x:0,y:1}, left:{x:1,y:0}, right:{x:-1,y:0},
} as const;
export type Support = keyof typeof normals;
export interface Crawler extends Spider {
  support?: Support;
  airJump: boolean;
  firstAnchor?: Point;
}

const JUMP = 172;
const CRAWL = 78;
const EPSILON = .025;
const dot = (p: Point, side: Support) => p.x*normals[side].x+p.y*normals[side].y;
const close = (a: number,b: number) => Math.abs(a-b)<=EPSILON;

function supports(spider: Spider,surfaces: readonly Rect[]) {
  const faces = new Set<Support>();
  const l=spider.x-SPIDER_HALF_WIDTH, r=spider.x+SPIDER_HALF_WIDTH;
  const t=spider.y-SPIDER_HALF_HEIGHT, b=spider.y+SPIDER_HALF_HEIGHT;
  for (const solid of surfaces) {
    if (r>solid.x+EPSILON && l<solid.x+solid.w-EPSILON) {
      if (close(b,solid.y)) faces.add('floor');
      if (close(t,solid.y+solid.h)) faces.add('ceiling');
    }
    if (b>solid.y+EPSILON && t<solid.y+solid.h-EPSILON) {
      if (close(l,solid.x+solid.w)) faces.add('left');
      if (close(r,solid.x)) faces.add('right');
    }
  }
  return [...faces].filter(face=>dot({x:spider.vx,y:spider.vy},face)<=EPSILON);
}

export function crawlerIsSupported(spider:Crawler,surfaces:readonly Rect[]) {
  return supports(spider,surfaces).length>0;
}

function grip(spider: Crawler,face: Support|undefined) {
  spider.support=face;
  if (face) {
    spider.airJump=true;
    spider.thread=undefined;
    spider.grounded=true;
    if (normals[face].x) spider.vx=0;
    else spider.vy=0;
  }
}

export function createCrawler(point: Point,surfaces: readonly Rect[]) {
  const spider: Crawler={...createSpider(point),airJump:true};
  grip(spider,supports(spider,surfaces)[0]);
  return spider;
}

export function castCrawler(spider: Crawler,surfaces: readonly Rect[],target: Point,tuning?: Partial<Tuning>) {
  const previous=spider.rope;
  if (!shoot(spider,surfaces,target,tuning)) return false;
  if (previous && !spider.firstAnchor) spider.firstAnchor={x:previous.x,y:previous.y};
  spider.support=undefined;
  return true;
}

export function closeCrawlerRopes(spider: Crawler) {
  const old=spider.rope;
  detach(spider);
  spider.firstAnchor=undefined;
  return old;
}

export function anchorCrawlerRope(spider: Crawler,surfaces: readonly Rect[],strands: Strand[],range=DEFAULT_TUNING.range) {
  const rope=spider.rope;
  if (!rope) return false;
  const face=supports(spider,surfaces)[0];
  if (!face || !anchorSilk(strands,rope,range+SPIDER_HALF_HEIGHT,spider,surfaces)) return false;
  closeCrawlerRopes(spider);
  grip(spider,face);
  return true;
}

export function jumpCrawler(spider: Crawler,speed=JUMP,direction?:Point) {
  const tethered=!!spider.rope;
  if (!tethered && !spider.support && !spider.airJump) return false;
  if (tethered) closeCrawlerRopes(spider);
  else if (!spider.support) spider.airJump=false;
  if (direction) {
    spider.vx=direction.x*speed;
    spider.vy=direction.y*speed;
  } else if (!tethered && spider.support) {
    const away=normals[spider.support];
    if (away.x) spider.vx=away.x*speed;
    else spider.vy=away.y*speed;
  } else spider.vy=-speed;
  spider.support=undefined;
  spider.thread=undefined;
  spider.grounded=false;
  return true;
}

const approach = (n: number,target: number,step: number) =>
  n+Math.sign(target-n)*Math.min(step,Math.abs(target-n));

export function tickCrawler(
  spider: Crawler,surfaces: readonly Rect[],stick: Point,reel: boolean,dt: number,strands: readonly WalkLine[],
  {crawlSpeed=CRAWL,airAcceleration=290,ropeMinimum=DEFAULT_TUNING.minLength,reelSpeed=DEFAULT_TUNING.reelSpeed}={},
) {
  if (spider.rope) {
    spider.support=undefined;
    tickSpider(spider,surfaces,{move:stick.x,reel,gripThread:false},dt,{minLength:ropeMinimum,reelSpeed});
    if (supports(spider,surfaces).length) spider.airJump=true;
    return;
  }
  if (spider.support) {
    const oldSide=spider.support;
    const axis=normals[oldSide].x ? 'y' : 'x';
    const velocity=axis==='x' ? 'vx' : 'vy';
    spider[velocity]=approach(spider[velocity],stick[axis]*crawlSpeed,780*dt);
    const delta=spider[velocity]*dt;
    const blocked=moveAxis(spider,surfaces,axis,delta);
    const faces=supports(spider,surfaces);
    const next=blocked
      ? faces.find(face=>normals[face][axis]*delta<0)
      : undefined;
    const face=next ?? (faces.includes(oldSide) ? oldSide : faces[0]);
    if (!face) spider.grounded=false;
    grip(spider,face);
    if (Math.abs(delta)>EPSILON) {
      const sign=(oldSide==='right'||oldSide==='ceiling') ? -1 : 1;
      spider.facing=delta*sign>0 ? 1 : -1;
    }
    return;
  }
  const approachVelocity={x:spider.vx+stick.x*3,y:spider.vy+2.5};
  tickSpider(spider,surfaces,{move:stick.x,reel:false,gripThread:reel},dt,{airAcceleration},strands);
  const faces=supports(spider,surfaces).sort((a,b)=>dot(approachVelocity,a)-dot(approachVelocity,b));
  grip(spider,faces[0]);
}
