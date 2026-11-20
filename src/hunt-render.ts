import {HEIGHT, LIMIT, platforms, WIDTH, type Hunt} from './hunt';
import type {Point,Spider} from './spider';

const ink = '#243c2d';
const cream = '#eff3c8';
const wrap = (x: number) => ((x%WIDTH)+WIDTH)%WIDTH;

function block(ctx: CanvasRenderingContext2D,x: number,y: number,w: number,h: number,color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x),Math.round(y),w,h);
}
function line(ctx: CanvasRenderingContext2D,a: Point,b: Point,color: string,dotted = false) {
  const span = Math.ceil(Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y)));
  for (let i=0; i<=span; i++) {
    if (dotted && i%4>=2) continue;
    const t=span ? i/span : 0;
    block(ctx,a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,1,1,color);
  }
}
function silk(ctx: CanvasRenderingContext2D,a: Point,b: Point,color: string,dotted = false) {
  for (const offset of [-WIDTH,0,WIDTH]) {
    if (Math.max(a.x,b.x)+offset<0 || Math.min(a.x,b.x)+offset>WIDTH) continue;
    line(ctx,{x:a.x+offset,y:a.y},{x:b.x+offset,y:b.y},color,dotted);
  }
}

export function renderHunt(ctx: CanvasRenderingContext2D,hunt: Hunt,spider: Spider,aim: Point,hit?: Point) {
  const pressure = hunt.phase==='caught' ? 0 : 1-Math.min(1,hunt.time/20);
  block(ctx,0,0,WIDTH,HEIGHT,`rgb(${Math.round(194-pressure*25)},${Math.round(207-pressure*20)},${Math.round(146-pressure*10)})`);
  for (let x=17; x<WIDTH; x+=39) {
    block(ctx,x,0,3+x%5,198,'#a5b97d');
    block(ctx,x-7,16+x%25,23,5,'#a5b97d');
    block(ctx,x+4,159-x%18,13,4,'#a5b97d');
  }
  for (const y of [79,129]) {
    for (let x=14; x<WIDTH-10; x+=9) block(ctx,x,y,2,1,'#b2c189');
  }
  for (const r of platforms) {
    block(ctx,r.x,r.y,r.w,r.h,ink);
    block(ctx,r.x+1,r.y+2,r.w-2,2,'#638155');
    for (let n=8;n<r.w-4;n+=13) block(ctx,r.x+n,r.y+2,3,1,cream);
  }
  for (const x of [4,WIDTH-7]) {
    for (const y of [177,181]) block(ctx,x,y,3,1,ink);
    block(ctx,x+(x<10 ? 0 : 2),178,1,3,ink);
  }

  hunt.strands.forEach((strand,index) => {
    const shake = Math.max(0,strand.shakeUntil-hunt.clock);
    const dotted = index===0 && hunt.strands.length===LIMIT;
    if (shake) {
      const mid = {x:(strand.from.x+strand.to.x)/2,y:(strand.from.y+strand.to.y)/2+Math.sin(hunt.clock*105)*shake*8};
      silk(ctx,strand.from,mid,ink);
      silk(ctx,mid,strand.to,ink);
    } else silk(ctx,strand.from,strand.to,'#486747',dotted);
  });
  if (hunt.retired && hunt.retired.until>hunt.clock && Math.floor(hunt.clock*24)%2) {
    silk(ctx,hunt.retired.strand.from,hunt.retired.strand.to,cream,true);
  }
  for (const loose of hunt.loose) silk(ctx,loose.from,spider,'#829660',true);
  if (spider.rope) silk(ctx,spider,spider.rope,cream);
  const target = hit ?? aim;
  const rx = wrap(target.x);
  if (target.y>=2 && target.y<=HEIGHT-2) {
    block(ctx,rx-4,target.y,9,1,hit ? cream : ink);
    block(ctx,rx,target.y-4,1,9,hit ? cream : ink);
  }

  if (hunt.phase!=='over') {
    const {p,v,turn} = hunt.fly;
    const twitch = Math.floor(hunt.clock*(hunt.phase==='caught' ? 34 : 27))%2;
    if (turn>0 && hunt.phase==='hunting') {
      block(ctx,p.x-v.x*.085,p.y-v.y*.085,1,1,ink);
      block(ctx,p.x-v.x*.16,p.y-v.y*.16,1,1,cream);
    }
    block(ctx,p.x-2,p.y-2-twitch,2,2,cream);
    block(ctx,p.x+2,p.y-2+twitch,2,2,cream);
    block(ctx,p.x-1,p.y-1,3,3,ink);
    block(ctx,p.x,p.y-1,1,1,'#8cb072');
    if (hunt.phase==='caught') {
      block(ctx,p.x-6,p.y-3,2,1,cream);
      block(ctx,p.x+5,p.y+3,2,1,cream);
    }
  }

  for (const x of [spider.x-WIDTH,spider.x,spider.x+WIDTH]) {
    if (x < -7 || x > WIDTH+7) continue;
    const y=spider.y;
    const gait = spider.grounded && Math.abs(spider.vx)>4 ? Math.floor(hunt.clock*16)%2 : 0;
    const tuck = spider.rope ? 2 : 0;
    for (const side of [-1,1]) {
      for(let leg=0;leg<4;leg++){
        const ox=x-5+leg*3;
        const foot={x:ox+((leg+gait)%2 ? -1 : 1),y:y+side*(6-tuck-(gait===leg%2 ? 1 : 0))};
        line(ctx,{x:ox,y:y+side*2},foot,ink);
      }
    }
    block(ctx,x-5,y-3,9,6,ink);
    block(ctx,x-4,y-2,5,4,'#638155');
    block(ctx,x+spider.facing*3,y-2,3,4,ink);
    block(ctx,x+spider.facing*4,y-1,1,1,cream);
  }
}
