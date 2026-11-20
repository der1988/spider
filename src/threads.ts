import {SPIDER_HALF_HEIGHT, SPIDER_HALF_WIDTH, type Point, type Rect} from './spider.ts';

export interface Strand {
  from: Point;
  to: Point;
  shakeUntil: number;
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
}

export interface Web {
  strands: Strand[];
  loose: LooseEnd[];
  flies: Fly[];
}

const habitats = [
  {x:99,y:115}, {x:106,y:128}, {x:88,y:103}, {x:121,y:107},
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

export function createWeb(serialized?: string | null): Web {
  let strands: Strand[] = [];
  if (serialized) {
    try {
      const entries: unknown = JSON.parse(serialized);
      const point = (p: unknown): p is Point => {
        if (!p || typeof p !== 'object') return false;
        const {x,y} = p as Point;
        return Number.isFinite(x) && Number.isFinite(y) && Math.abs(x) < 1000 && Math.abs(y) < 1000;
      };
      if (Array.isArray(entries)) {
        strands = entries.slice(-MAX_STRANDS).flatMap((entry: unknown) => {
          if (!entry || typeof entry !== 'object') return [];
          const {from,to} = entry as Strand;
          return point(from) && point(to) && distance(from,to) >= 9 ? [{from,to,shakeUntil:0}] : [];
        });
      }
    } catch { /* An invalid local record starts with an empty web. */ }
  }
  const flies = habitats.map((center, index) => {
    const phase = index * 1.39;
    return {center,phase,position:flyPosition(center,phase,0)};
  });
  return {strands,flies,loose:[]};
}

function sweptHit(from: Point, to: Point, strand: Strand) {
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
function crossesSolid(from: Point, to: Point, rect: Rect) {
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

export function leaveSilk(web: Web, from: Point, reach: number) {
  web.loose.push({from:{x:from.x,y:from.y},reach});
  if (web.loose.length > 8) web.loose.shift();
}

export function fixSilk(web: Web, body: Point, surfaces: readonly Rect[]) {
  if (!web.loose.length) return 0;
  const available = contacts(body,surfaces);
  let fixed = 0;
  web.loose = web.loose.filter(({from,reach}) => {
    const to = available.find(point => distance(point,from) >= 9 &&
      distance(point,from) <= reach && !surfaces.some(r => crossesSolid(from,point,r)));
    if (!to) return distance(body,from) <= reach + SPIDER_HALF_HEIGHT;
    const duplicate = web.strands.some(strand =>
      (distance(strand.from,from) < 2 && distance(strand.to,to) < 2) ||
      (distance(strand.to,from) < 2 && distance(strand.from,to) < 2));
    if (!duplicate && web.strands.length < MAX_STRANDS) {
      web.strands.push({from,to,shakeUntil:0});
      fixed++;
    }
    return false;
  });
  return fixed;
}

export function tickFlies(web: Web, seconds: number, time: number) {
  const caught: Point[] = [];
  for (const fly of web.flies) {
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
