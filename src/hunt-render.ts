import {HEIGHT, LIMIT, platforms, WIDTH, type Hunt} from './hunt';
import type {Point} from './spider';
import type {Crawler,Support} from './crawler';
import type {OpeningShot} from './song-cues';

const ink = '#243c2d';
const cream = '#eff3c8';

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
const canopy = [25,72,115,161,207,255,300,338];
const spores = [
  [31,57],[56,108],[81,32],[114,124],[136,84],[164,42],[185,163],
  [202,66],[224,126],[251,34],[277,103],[307,58],[332,131],
];

function rhythmDetails(ctx: CanvasRenderingContext2D,beat: number) {
  canopy.forEach((x,i) => {
    const side = i%2 ? 1 : -1;
    const length = 10+i%3*3;
    const tip = x+side*(7+Math.round(beat*3));
    line(ctx,{x,y:7},{x:tip,y:length+6},'#92a76c');
    block(ctx,tip-2,length+4,5,2,'#92a76c');
    block(ctx,tip+side*2-1,length+6,3,2,'#a6b976');
  });
  spores.forEach(([x,y],i) => {
    const rise = Math.round(beat*(2+i%2));
    const shade = beat>.3 ? '#cfdca0' : '#aebf82';
    block(ctx,x,y-rise,1,1,shade);
    if (beat>.55 && i%3===0) {
      block(ctx,x-1,y-rise+1,3,1,shade);
      block(ctx,x,y-rise+2,1,1,shade);
    }
  });
}

interface MusicFrame { time: number; beat: number; shot?: OpeningShot }

export function renderHunt(ctx: CanvasRenderingContext2D,hunt: Hunt,spider: Crawler,direction: Point,music: MusicFrame) {
  const {time,beat,shot} = music;
  ctx.save();
  if (shot && shot.zoom>1) {
    const target = shot.subject==='spider' ? spider : hunt.fly.p;
    const focus = (position: number,size: number) =>
      Math.max(size/2/shot.zoom,Math.min(size-size/2/shot.zoom,position));
    ctx.translate(WIDTH/2,HEIGHT/2);
    ctx.scale(shot.zoom,shot.zoom);
    ctx.translate(-focus(target.x,WIDTH),-focus(target.y,HEIGHT));
  }
  const pressure = hunt.phase==='caught' ? 0 : 1-Math.min(1,hunt.time/20);
  block(ctx,0,0,WIDTH,HEIGHT,`rgb(${Math.round(194-pressure*25)},${Math.round(207-pressure*20)},${Math.round(146-pressure*10)})`);
  for (let x=17; x<WIDTH; x+=39) {
    block(ctx,x,0,3+x%5,198,'#a5b97d');
    const sway=Math.round(Math.sin(x)*beat*2);
    block(ctx,x-7+sway,16+x%25,23,5,'#a5b97d');
    block(ctx,x+4-sway,159-x%18,13,4,'#a5b97d');
  }
  for (const y of [79,129]) {
    for (let x=14; x<WIDTH-10; x+=9) block(ctx,x,y,2,1,'#b2c189');
  }
  rhythmDetails(ctx,beat);
  for (const r of platforms) {
    block(ctx,r.x,r.y,r.w,r.h,ink);
    block(ctx,r.x+1,r.y+2,r.w-2,2,'#638155');
    for (let n=8;n<r.w-4;n+=13) block(ctx,r.x+n,r.y+2,3,1,beat>.38 ? cream : '#d6e3ab');
    if (r.w>40 && r.w<WIDTH) {
      for (let dx=6;dx<r.w-5;dx+=12) {
        const lift=beat>.42 ? 2 : 0;
        block(ctx,r.x+dx,r.y-2-lift,1,2+lift,'#638155');
        block(ctx,r.x+dx+1,r.y-3-lift,2,1,'#82945f');
      }
    }
  }
  hunt.strands.forEach((strand,index) => {
    const shake = Math.max(0,strand.shakeUntil-hunt.clock);
    const fading = (strand.expiresAt??Infinity)-hunt.clock < 1;
    const dotted = index===0 && hunt.strands.length===LIMIT || fading;
    const shade = fading ? (Math.floor(hunt.clock*9)%2 ? '#a8be83' : '#486747') :
      beat>.4 ? '#5a7951' : '#486747';
    if (shake) {
      const mid = {x:(strand.from.x+strand.to.x)/2,y:(strand.from.y+strand.to.y)/2+Math.sin(hunt.clock*105)*shake*8};
      line(ctx,strand.from,mid,ink);
      line(ctx,mid,strand.to,ink);
    } else line(ctx,strand.from,strand.to,shade,dotted);
  });
  if (hunt.retired && hunt.retired.until>hunt.clock && Math.floor(hunt.clock*24)%2) {
    line(ctx,hunt.retired.strand.from,hunt.retired.strand.to,cream,true);
  }
  for (const loose of hunt.loose) line(ctx,loose.from,spider,'#829660',true);
  if (spider.firstAnchor) line(ctx,spider,spider.firstAnchor,'#9cb77a',true);
  if (spider.rope) line(ctx,spider,spider.rope,cream);
  // Keep the direction marker just outside the body, regardless of the ray hit.
  if (!shot) {
    const edgeX = direction.x>0 ? WIDTH-3-spider.x : spider.x-2;
    const edgeY = direction.y>0 ? HEIGHT-3-spider.y : spider.y-2;
    const reach = Math.min(16,edgeX/Math.abs(direction.x),edgeY/Math.abs(direction.y));
    const tip = {x:spider.x+direction.x*reach,y:spider.y+direction.y*reach};
    block(ctx,tip.x-1,tip.y-1,3,3,cream);
    block(ctx,tip.x,tip.y,1,1,ink);
  }

  if (hunt.phase!=='over') {
    const {p,v,turn} = hunt.fly;
    const twitch = Math.floor((hunt.phase==='caught' ? hunt.clock : time)*(hunt.phase==='caught' ? 34 : 27))%2;
    if (turn>0 && hunt.phase==='hunting') {
      block(ctx,p.x-v.x*.085,p.y-v.y*.085,1,1,ink);
      block(ctx,p.x-v.x*.16,p.y-v.y*.16,1,1,cream);
    }
    const wings = beat>.42 && hunt.phase!=='caught' ? '#fdffd8' : cream;
    block(ctx,p.x-2,p.y-2-twitch,2,2,wings);
    block(ctx,p.x+2,p.y-2+twitch,2,2,wings);
    block(ctx,p.x-1,p.y-1,3,3,ink);
    block(ctx,p.x,p.y-1,1,1,'#8cb072');
    if (hunt.phase==='caught') {
      block(ctx,p.x-6,p.y-3,2,1,cream);
      block(ctx,p.x+5,p.y+3,2,1,cream);
    }
  }

  avatar(ctx,spider,hunt.clock,music);
  ctx.restore();
}

const matrix: Record<Support,[number,number,number,number]> = {
  floor:[1,0,0,1], left:[0,1,-1,0], right:[0,-1,1,0], ceiling:[-1,0,0,-1],
};

function avatar(ctx: CanvasRenderingContext2D,spider: Crawler,time: number,music: MusicFrame) {
  ctx.save();
  ctx.transform(...matrix[spider.support??'floor'],Math.round(spider.x),Math.round(spider.y));
  const moving=Math.hypot(spider.vx,spider.vy)>4;
  const idle=spider.grounded && !moving && !spider.rope;
  const gait=spider.grounded && moving ? Math.floor(time*16)%2 :
    idle && music.shot?.subject==='spider' ? Math.floor(music.time*4)%2 : 0;
  const tuck=spider.rope ? 2 : 0;
  for(let leg=0;leg<8;leg++){
    const x=-5.5+leg*1.55;
    const stride=(leg+gait)%2;
    line(ctx,{x,y:2},{x:x+(stride ? -1 : 1),y:6-tuck-stride},ink);
  }
  if (idle && music.beat>.58) ctx.translate(0,1);
  block(ctx,-5,-3,9,6,ink);
  block(ctx,-4,-2,5,4,'#638155');
  block(ctx,spider.facing*3,-2,3,4,ink);
  block(ctx,spider.facing*4,-1,1,1,cream);
  ctx.restore();
}
