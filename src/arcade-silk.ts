import {sweptHit,type Strand} from './threads.ts';
import {DEFAULT_TUNING,traceSurface,type Point,type Rect} from './spider.ts';

export const arcadeSilkReach=280;
const launchSpeed=670;
const drag=2.35;
const gravity=65;
const flightSeconds=1.08;

export type SilkShot={
  p:Point;
  v:Point;
  age:number;
  hit?:{point:Point;grip:boolean;web?:Strand};
  fade?:number;
  releasedOnSurface?:boolean;
};

export function launchSilk(origin:Point,direction:Point,momentum:Point):SilkShot {
  const start={x:origin.x,y:origin.y};
  return {p:start,age:0,v:{
    x:direction.x*launchSpeed+momentum.x*.16,
    y:direction.y*launchSpeed+momentum.y*.16,
  }};
}

export function advanceSilk(shot:SilkShot,surfaces:readonly Rect[],webs:readonly Strand[],dt:number) {
  shot.age+=dt;
  if (shot.hit) return shot.hit.grip;
  const retain=Math.exp(-drag*dt);
  shot.v.x*=retain;
  shot.v.y=shot.v.y*retain+gravity*dt;
  const next={x:shot.p.x+shot.v.x*dt,y:shot.p.y+shot.v.y*dt};
  const distance=(point:Point)=>Math.hypot(point.x-shot.p.x,point.y-shot.p.y);
  let hit:SilkShot['hit']=traceSurface(shot.p,surfaces,next,distance(next));
  for (const web of webs) {
    const crossing=sweptHit(shot.p,next,web);
    if (crossing && (!hit || distance(crossing.point)<distance(hit.point)-.001)) {
      hit={point:crossing.point,grip:true,web};
    }
  }
  if (hit) {
    shot.p=hit.point;shot.hit=hit;
    return hit.grip;
  }
  shot.p=next;
  return shot.age<flightSeconds;
}

export function ropeAt(anchor:Point,spider:Point) {
  const length=Math.hypot(anchor.x-spider.x,anchor.y-spider.y);
  if (length<=arcadeSilkReach) return {...anchor,length:Math.max(DEFAULT_TUNING.minLength,length)};
}

export function diagonalWeb(from:Point,to:Point) {
  return Math.abs(to.x-from.x)>2 && Math.abs(to.y-from.y)>2;
}
