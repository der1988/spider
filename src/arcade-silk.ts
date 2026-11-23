import {DEFAULT_TUNING,traceSurface,type Point,type Rect} from './spider.ts';

export const arcadeSilkReach=280;
const launchSpeed=670;
const drag=2.35;
const gravity=65;
const flightSeconds=1.08;

export type SilkShot={
  origin:Point;
  p:Point;
  v:Point;
  age:number;
  mode:'pending'|'trap'|'rope';
  hit?:{point:Point;grip:boolean};
  fade?:number;
};

export function launchSilk(origin:Point,direction:Point,momentum:Point):SilkShot {
  const start={x:origin.x,y:origin.y};
  return {origin:start,p:start,age:0,mode:'pending',v:{
    x:direction.x*launchSpeed+momentum.x*.16,
    y:direction.y*launchSpeed+momentum.y*.16,
  }};
}

export function advanceSilk(shot:SilkShot,surfaces:readonly Rect[],dt:number) {
  shot.age+=dt;
  if (shot.hit) return shot.hit.grip;
  const retain=Math.exp(-drag*dt);
  shot.v.x*=retain;
  shot.v.y=shot.v.y*retain+gravity*dt;
  const next={x:shot.p.x+shot.v.x*dt,y:shot.p.y+shot.v.y*dt};
  const hit=traceSurface(shot.p,surfaces,next,Math.hypot(next.x-shot.p.x,next.y-shot.p.y));
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
