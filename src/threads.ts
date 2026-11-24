import {aimHit, threadFloor, SPIDER_HALF_HEIGHT, SPIDER_HALF_WIDTH, type Point, type Rect, type Spider} from './spider.ts';

export interface Strand {
  from: Point;
  to: Point;
  shakeUntil: number;
  expiresAt?: number;
  bearing?: true;
}

interface LooseEnd {
  from: Point;
  reach: number;
}

interface Fly {
  center: Point;
  phase: number;
  position: Point;
  caughtAt?: number;
  returnsAt?: number;
}

export interface Web {
  strands: Strand[];
  silk: number;
  reward: boolean;
  loose: LooseEnd[];
  flies: Fly[];
}

const habitats = [
  {x:66,y:119}, {x:99,y:115}, {x:106,y:128}, {x:88,y:103}, {x:121,y:107},
  {x:244,y:125}, {x:307,y:91}, {x:418,y:50},
];
export const WEB_KEY = 'tamago.web.1';
const MAX_STRANDS = 120;
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const cross = (a: Point, b: Point) => a.x * b.y - a.y * b.x;
const difference = (a: Point, b: Point) => ({x:a.x-b.x,y:a.y-b.y});

export function flyPosition(center: Point, phase: number, time: number): Point {
  const t = time + phase;
  return {
    x:center.x + 23 * Math.sin(t * 1.72) + 7 * Math.sin(t * 3.93),
    y:center.y + 14 * Math.sin(t * 1.13 + .8) + 6 * Math.cos(t * 3.31),
  };
}

export function createWeb(): Web {
  const flies = habitats.map((center, index) => {
    const phase = index * 1.39;
    return {center,phase,position:flyPosition(center,phase,0)};
  });
  return {strands:[],flies,loose:[],silk:0,reward:false};
}

export function sweptHit(from: Point, to: Point, strand: Strand) {
  const travel = difference(to, from);
  const silk = difference(strand.to, strand.from);
  const offset = difference(strand.from, from);
  const determinant = cross(travel, silk);
  if (Math.abs(determinant) < 1e-7) return;
  const t = cross(offset, silk) / determinant;
  const u = cross(offset, travel) / determinant;
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {t, point:{x:from.x + travel.x*t,y:from.y + travel.y*t}};
  }
}

// Keep endpoints on the surface boundary and reject segments through solid interiors.
export function crossesSolid(from: Point, to: Point, rect: Rect) {
  let first = 0;
  let last = 1;
  for (const axis of ['x','y'] as const) {
    const lower = rect[axis] + .15;
    const upper = rect[axis] + (axis === 'x' ? rect.w : rect.h) - .15;
    const delta = to[axis] - from[axis];
    if (Math.abs(delta) < 1e-7) {
      if (from[axis] <= lower || from[axis] >= upper) return false;
      continue;
    }
    const a = (lower - from[axis]) / delta;
    const b = (upper - from[axis]) / delta;
    first = Math.max(first, Math.min(a,b));
    last = Math.min(last, Math.max(a,b));
    if (last <= first) return false;
  }
  return last > first;
}

function contacts(body: Point, surfaces: readonly Rect[]) {
  const points: Point[] = [];
  const tolerance = .25;
  for (const r of surfaces) {
    const x = clamp(body.x,r.x,r.x + r.w);
    const y = clamp(body.y,r.y,r.y + r.h);
    if (body.x + SPIDER_HALF_WIDTH > r.x && body.x - SPIDER_HALF_WIDTH < r.x + r.w) {
      if (Math.abs(body.y + SPIDER_HALF_HEIGHT - r.y) <= tolerance) points.push({x,y:r.y});
      if (Math.abs(body.y - SPIDER_HALF_HEIGHT - r.y - r.h) <= tolerance) points.push({x,y:r.y + r.h});
    }
    if (body.y + SPIDER_HALF_HEIGHT > r.y && body.y - SPIDER_HALF_HEIGHT < r.y + r.h) {
      if (Math.abs(body.x + SPIDER_HALF_WIDTH - r.x) <= tolerance) points.push({x:r.x,y});
      if (Math.abs(body.x - SPIDER_HALF_WIDTH - r.x - r.w) <= tolerance) points.push({x:r.x + r.w,y});
    }
  }
  return points;
}

export function leaveSilk(web: Pick<Web,'loose'>, from: Point, reach: number) {
  web.loose.push({from:{x:from.x,y:from.y},reach});
  if (web.loose.length > 8) web.loose.shift();
}

function anchorAt(strands: Strand[],from: Point,reach: number,points: Point[],surfaces: readonly Rect[],limit=MAX_STRANDS,accept?: (point:Point)=>boolean) {
  const to = points.find(point => distance(point,from) >= 9 &&
    distance(point,from) <= reach && (!accept || accept(point)) && !surfaces.some(r => crossesSolid(from,point,r)));
  if (!to) return false;
  const duplicate = strands.some(strand =>
    (distance(strand.from,from) < 2 && distance(strand.to,to) < 2) ||
    (distance(strand.to,from) < 2 && distance(strand.from,to) < 2));
  if (!duplicate && strands.length < limit) {
    strands.push({from:{x:from.x,y:from.y},to,shakeUntil:0});
  }
  return true;
}

export function anchorSilk(strands: Strand[],from: Point,reach: number,body: Point,surfaces: readonly Rect[],limit=MAX_STRANDS,accept?: (point:Point)=>boolean) {
  return anchorAt(strands,from,reach,contacts(body,surfaces),surfaces,limit,accept);
}

export function fixSilk(web: Pick<Web,'loose'|'strands'>, body: Point, surfaces: readonly Rect[],limit=MAX_STRANDS) {
  if (!web.loose.length) return 0;
  const available = contacts(body,surfaces);
  const before = web.strands.length;
  web.loose = web.loose.filter(({from,reach}) =>
    !anchorAt(web.strands,from,reach,available,surfaces,limit) && distance(body,from) <= reach + SPIDER_HALF_HEIGHT);
  return web.strands.length-before;
}

export function tickFlies(web: Web, seconds: number, time: number) {
  const caught: Point[] = [];
  for (const fly of web.flies) {
    if (fly.returnsAt !== undefined) {
      if (fly.returnsAt > time) continue;
      fly.returnsAt = undefined;
      fly.caughtAt = undefined;
      fly.position = flyPosition(fly.center,fly.phase,seconds);
    }
    if (fly.caughtAt !== undefined) continue;
    const next = flyPosition(fly.center,fly.phase,seconds);
    let first: { t:number; point:Point; strand:Strand } | undefined;
    for (const strand of web.strands) {
      const hit = sweptHit(fly.position,next,strand);
      if (hit && (!first || hit.t < first.t)) first = {...hit,strand};
    }
    fly.position = first?.point ?? next;
    if (first) {
      fly.caughtAt = time;
      first.strand.shakeUntil = time + 440;
      caught.push(first.point);
    }
  }
  return caught;
}

export function recoverFlies(web: Web, spider: Spider, time: number) {
  let recovered = 0;
  for (const fly of web.flies) {
    if (fly.caughtAt === undefined || fly.returnsAt !== undefined) continue;
    const feet = {x:spider.x,y:spider.y+SPIDER_HALF_HEIGHT};
    if (distance(fly.position,feet) > 10 && distance(fly.position,spider) > 9) continue;
    fly.returnsAt = time + 8000;
    recovered++;
  }
  web.silk = Math.min(999,web.silk+recovered);
  return recovered;
}

const EXTENSION = 125;

function bridgeOrigin(spider: Spider, surfaces: readonly Rect[]) {
  if (!spider.grounded || spider.rope) return;
  return surfaces.find(r => r.bridge && Math.abs(spider.y+SPIDER_HALF_HEIGHT-r.y) < 1 &&
    spider.x >= r.x && spider.x <= r.x+r.w);
}

function tryBridge(spider: Spider, source: Rect, surfaces: readonly Rect[], target: Point, range: number) {
  const hit = aimHit(spider,surfaces.map(r => ({...r,grip:r.bridge || r.grip})),target,{range:range+EXTENSION});
  if (!hit || distance(spider,hit) <= range) return;
  const destination = surfaces.find(r => r !== source && r.bridge &&
    hit.x >= r.x-.01 && hit.x <= r.x+r.w+.01 && hit.y >= r.y-.01 && hit.y <= r.y+r.h+.01);
  if (!destination) return;
  const from = {x:spider.x,y:source.y};
  const to = {x:spider.x < destination.x ? destination.x : destination.x+destination.w,y:destination.y};
  if (distance(from,to) <= range || distance(from,to) > range+EXTENSION ||
    Math.abs(from.x-to.x) < 32 || surfaces.some(r => crossesSolid(from,to,r))) return;
  const strand = {from,to,bearing:true as const,shakeUntil:0};
  const minX = Math.min(from.x,to.x);
  const maxX = Math.max(from.x,to.x);
  for (let x=minX; x<=maxX; x+=.5) {
    const feet = threadFloor(strand,x)!;
    if (surfaces.some(r => x+SPIDER_HALF_WIDTH > r.x+.15 && x-SPIDER_HALF_WIDTH < r.x+r.w-.15 &&
      feet > r.y+.15 && feet-2*SPIDER_HALF_HEIGHT < r.y+r.h-.15)) return;
  }
  return strand;
}

function freshBridge(web: Web, candidate: Strand | undefined) {
  if (!candidate || web.strands.some(strand => strand.bearing &&
    ((distance(strand.from,candidate.from)<3 && distance(strand.to,candidate.to)<3) ||
     (distance(strand.to,candidate.from)<3 && distance(strand.from,candidate.to)<3)))) return;
  return candidate;
}

function bridgeOptions(web: Web, spider: Spider, source: Rect, surfaces: readonly Rect[], range: number) {
  return surfaces.filter(r => r.bridge && r !== source).flatMap(r => {
    const left = spider.x < r.x;
    const nearX = left ? r.x : r.x+r.w;
    for (const inward of [1,6,14,25]) {
      const point = {x:nearX+(left ? inward : -inward),y:r.y+r.h/2};
      const candidate = freshBridge(web,tryBridge(spider,source,surfaces,point,range));
      if (candidate) return [{point,candidate}];
    }
    return [];
  });
}

export function bridgePreview(web: Web, spider: Spider, surfaces: readonly Rect[], target: Point, range: number) {
  if (!web.silk || web.strands.length >= MAX_STRANDS) return;
  const source = bridgeOrigin(spider,surfaces);
  if (!source || aimHit(spider,surfaces,target,{range})) return;
  const direct = freshBridge(web,tryBridge(spider,source,surfaces,target,range));
  if (direct) return direct;
  // A remote leaf is only a few degrees tall. Snap inside its visible marker.
  const aim = difference(target,spider);
  const length = Math.hypot(aim.x,aim.y);
  if (length < 1) return;
  let best = Math.cos(Math.PI/30);
  let chosen: Strand | undefined;
  for (const {point,candidate} of bridgeOptions(web,spider,source,surfaces,range)) {
    const offset = difference(point,spider);
    const score = (offset.x*aim.x+offset.y*aim.y)/(length*Math.hypot(offset.x,offset.y));
    if (score > best) {
      best = score;
      chosen = candidate;
    }
  }
  return chosen;
}

export function availableAnchors(web: Web, spider: Spider, surfaces: readonly Rect[], range: number) {
  if (!web.silk || web.strands.length >= MAX_STRANDS) return [];
  const source = bridgeOrigin(spider,surfaces);
  if (!source) return [];
  return bridgeOptions(web,spider,source,surfaces,range).map(option => option.point);
}

export function buildBridge(web: Web, spider: Spider, surfaces: readonly Rect[], target: Point, range: number) {
  const strand = bridgePreview(web,spider,surfaces,target,range);
  if (!strand) return;
  web.strands.push(strand);
  web.silk--;
  return strand;
}
