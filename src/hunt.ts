import {crossesSolid, sweptHit, type Strand, type Web} from './threads.ts';
import type {Point, Rect} from './spider.ts';

export const WIDTH = 360;
export const HEIGHT = 204;
export const ROUND = 60;
export const WEB_SECONDS = 10;
export const CHARGE_SECONDS = .8;
export const LIMIT = 6;
export const spawn = {x:45,y:189};
export const platforms: Rect[] = [
  {x:0,y:197,w:WIDTH,h:7,grip:true},
  {x:0,y:0,w:WIDTH,h:7,grip:true},
  {x:0,y:7,w:7,h:190,grip:true},
  {x:WIDTH-7,y:7,w:7,h:190,grip:true},
  {x:89,y:53,w:51,h:7,grip:true}, {x:220,y:53,w:51,h:7,grip:true},
  {x:145,y:101,w:70,h:10,grip:true},
  {x:89,y:150,w:51,h:8,grip:true}, {x:220,y:150,w:51,h:8,grip:true},
];
const lanes = [
  {x:49,y:79}, {x:114,y:79}, {x:180,y:79}, {x:246,y:79}, {x:311,y:79},
  {x:311,y:129}, {x:246,y:129}, {x:180,y:129}, {x:114,y:129}, {x:49,y:129},
  {x:49,y:29}, {x:180,y:29}, {x:311,y:29},
  {x:311,y:175}, {x:180,y:175}, {x:49,y:175},
];
const links = [
  [1,9,10],[0,2,8],[1,3],[2,4,6],[3,5,12],
  [4,6,13],[5,7,3],[6,8],[7,9,1],[8,0,15],
  [0,11],[10,12],[11,4],[5,14],[13,15],[14,9],
];
const entrances = [0,5,4,9,2,7];
const within = (n: number,min: number,max: number) => Math.min(max,Math.max(min,n));
const distance = (a: Point,b: Point) => Math.hypot(a.x-b.x,a.y-b.y);
function direction(from: Point,to: Point) {
  const len = Math.max(.001,distance(from,to));
  return {x:(to.x-from.x)/len,y:(to.y-from.y)/len};
}
const clear = (a: Point,b: Point) =>
  !platforms.some(r => crossesSolid(a,b,{x:r.x-3,y:r.y-3,w:r.w+6,h:r.h+6}));

export interface Fly {
  p: Point;
  v: Point;
  target: number;
  last: number;
  notice: number;
  locked: number;
  turn: number;
  bias: number;
  age: number;
  alert: boolean;
  visits: number[];
}
export interface Hunt extends Pick<Web,'loose'|'strands'> {
  fly: Fly;
  score: number;
  time: number;
  phase: 'hunting'|'caught'|'over';
  countdown: number;
  retired?: {strand:Strand; until:number};
  clock: number;
  entropy: number;
}

function makeFly(score: number,seed: number): Fly {
  const entry = entrances[score%entrances.length];
  return {
    p:{...lanes[entry]},v:{x:0,y:0},target:(entry+1)%10,last:entry,
    notice:.18,locked:.24,turn:0,bias:(seed+score)%2 ? 1 : -1,age:0,alert:false,visits:lanes.map(()=>0),
  };
}
export function createHunt(seed = Math.floor(Math.random()*4294967296)): Hunt {
  return {fly:makeFly(0,seed),score:0,time:ROUND,phase:'hunting',countdown:0,
    strands:[],loose:[],clock:0,entropy:seed};
}

export function expireStrands(hunt: Hunt) {
  hunt.strands = hunt.strands.filter(strand => strand.expiresAt === undefined || hunt.clock < strand.expiresAt);
}

function threat(from: Point,to: Point,strands: Strand[]) {
  const d = direction(from,to);
  const length = Math.min(distance(from,to),48);
  const ahead = {x:from.x+d.x*length,y:from.y+d.y*length};
  return strands.some(strand => sweptHit(from,ahead,strand));
}

function route(hunt: Hunt,spider: Point,arrived: boolean) {
  const fly = hunt.fly;
  const from = fly.p;
  const current = fly.target;
  const candidates = arrived
    ? links[current]
    : lanes.map((_,i)=>i).filter(i=>distance(from,lanes[i])<94 && distance(from,lanes[i])>9);
  hunt.entropy = (Math.imul(hunt.entropy,1664525)+1013904223)>>>0;
  const pressure = distance(from,spider)<56;
  if (arrived) fly.visits[current]++;
  const options = candidates.filter(index => clear(from,lanes[index])).map(index => {
    const toward = direction(from,lanes[index]);
    const escape = direction(spider,from);
    const score = (threat(from,lanes[index],hunt.strands) ? -5 : 0) +
      (pressure ? (toward.x*escape.x+toward.y*escape.y)*2.8 : 0) -
      (index===fly.last ? 1.25 : 0) - fly.visits[index]*.47 + (index===(current+fly.bias+10)%10 ? .4 : 0) +
      ((hunt.entropy >>> ((index%7)*4))&15)/24;
    return {index,score};
  }).sort((a,b)=>b.score-a.score);
  if (arrived) fly.last = current;
  const chosen = options[0]?.index;
  if (chosen !== undefined && chosen!==current) {
    fly.target = chosen;
    fly.locked = pressure ? .32 : .23;
    fly.turn = .24;
  }
  fly.notice = .17;
}

export function capStrands(hunt: Hunt) {
  if (hunt.strands.length<=LIMIT) return false;
  hunt.retired = {strand:hunt.strands[0],until:hunt.clock+.55};
  hunt.strands.splice(0,hunt.strands.length-LIMIT);
  return true;
}

export function tickHunt(hunt: Hunt,spider: Point,dt: number) {
  hunt.clock += dt;
  expireStrands(hunt);
  if (hunt.phase==='over') return;
  if (hunt.phase==='caught') {
    hunt.countdown-=dt;
    if (hunt.countdown<=0) {
      hunt.strands.length = 0;
      hunt.loose.length = 0;
      hunt.retired = undefined;
      hunt.fly = makeFly(hunt.score,hunt.entropy);
      hunt.time = ROUND;
      hunt.phase = 'hunting';
      return 'new';
    }
    return;
  }
  const fly = hunt.fly;
  fly.age+=dt;
  fly.notice-=dt;
  fly.locked-=dt;
  fly.turn-=dt;
  const arrived = distance(fly.p,lanes[fly.target])<7;
  const pressure = distance(fly.p,spider)<47;
  const alarm = pressure || threat(fly.p,lanes[fly.target],hunt.strands);
  if (alarm && !fly.alert) fly.notice = .17;
  fly.alert = alarm;
  if (arrived || (alarm && fly.locked<=0 && fly.notice<=0)) route(hunt,spider,arrived);
  const d = direction(fly.p,lanes[fly.target]);
  const speed = (pressure ? 75 : 49) + 5*Math.sin(fly.age*4+fly.bias);
  const easing = 1-Math.exp(-dt*(fly.turn>0 ? 13 : 8));
  fly.v.x += (d.x*speed-fly.v.x)*easing;
  fly.v.y += (d.y*speed-fly.v.y)*easing;
  let next = {x:within(fly.p.x+fly.v.x*dt,12,WIDTH-12),y:within(fly.p.y+fly.v.y*dt,20,177)};
  if (!clear(fly.p,next)) {
    fly.v = {x:0,y:0};
    route(hunt,spider,false);
    next = fly.p;
  }
  let winner: {strand:Strand;point:Point;t:number}|undefined;
  for (const strand of hunt.strands) {
    const hit = sweptHit(fly.p,next,strand);
    if (hit && (!winner || hit.t<winner.t)) winner = {...hit,strand};
  }
  if (winner) {
    fly.p = winner.point;
    winner.strand.shakeUntil = hunt.clock+.55;
    hunt.score++;
    hunt.phase = 'caught';
    hunt.countdown = .7;
    return 'catch';
  }
  fly.p = next;
  hunt.time=Math.max(0,hunt.time-dt);
  if (hunt.time===0) {
    hunt.phase='over';
    return 'over';
  }
}
