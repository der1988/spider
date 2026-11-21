import {HEIGHT,WIDTH,platforms} from './hunt.ts';
import type {Point,Rect} from './spider.ts';

export function createFlyRoom(shrink=0) {
  const ease=shrink*shrink*(3-2*shrink);
  const left=platforms[2].w+Math.round(28*ease),right=WIDTH-left;
  const top=platforms[1].h+Math.round(22*ease),bottom=platforms[0].y;
  const walls:Rect[]=[
    {x:0,y:bottom,w:WIDTH,h:HEIGHT-bottom,grip:true}, {x:0,y:0,w:WIDTH,h:top,grip:true},
    {x:0,y:top,w:left,h:bottom-top,grip:true}, {x:right,y:top,w:WIDTH-right,h:bottom-top,grip:true},
  ];
  return {left,right,top,bottom,surfaces:[...walls,...platforms.slice(4)]};
}
export type FlyRoom=ReturnType<typeof createFlyRoom>;
export const baseFlyRoom=createFlyRoom();

export function insideRoom(point:Point,room:FlyRoom,padding=.02) {
  return point.x>=room.left-padding && point.x<=room.right+padding &&
    point.y>=room.top-padding && point.y<=room.bottom+padding;
}

export function moveAnchor(point:Point,from:FlyRoom,to:FlyRoom):Point {
  const close=(a:number,b:number)=>Math.abs(a-b)<.04;
  const side=close(point.x,from.left) ? to.left : close(point.x,from.right) ? to.right : undefined;
  const horizontal=close(point.y,from.top) ? to.top : close(point.y,from.bottom) ? to.bottom : undefined;
  const x=side ?? (horizontal===undefined ? point.x : Math.max(to.left,Math.min(to.right,point.x)));
  const y=horizontal ?? (side===undefined ? point.y : Math.max(to.top,Math.min(to.bottom,point.y)));
  return x===point.x && y===point.y ? point : {x,y};
}
