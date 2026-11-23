import {arcadeHeight,arcadeStage,arcadeWidth,stages,type ArcadeRun} from './arcade';
import {block,drawAimMarker,drawSpider,line} from './hunt-render';
import type {Point} from './spider';

const width=arcadeWidth,height=arcadeHeight;
const wings=[
  'M2 3h3v2H2zM7 3h3v2H7z','M1 4h4v2H1zM7 4h4v2H7z',
  'M2 2h3v4H2zM7 2h3v4H7z','M3 2h2v4H3zM7 2h2v4H7zM2 7h2v2H2zM8 7h2v2H8z',
  'M1 6h4v2H1zM7 6h4v2H7z','M1 2h4v2H1zM7 2h4v2H7zM2 4h8v2H2z',
  'M2 3h2v4H2zM8 3h2v4H8zM4 2h4v1H4z','M1 5h4v3H1zM7 5h4v3H7z',
  'M3 1h2v2H3zM7 1h2v2H7zM5 6h2v4H5z','M2 2h3v3H2zM7 2h3v3H7zM4 7h4v2H4z',
] as const;
const colors=['#e8f6b7','#ffc86c','#d6edff','#ffd7ed','#ffe7c2','#a8ffb8','#edccff','#f0ede6','#ffc8a3','#fff495'];
const icons=wings.map(path=>new Path2D(path));

export function arcadeIcon(kind:number) {
  return `<svg viewBox="0 0 12 11" aria-hidden="true"><path fill="${colors[kind]}" d="${wings[kind]}"/><path fill="#24252d" d="M5 3h2v5H5zM4 4h4v2H4z"/><path fill="#fff9d2" d="M5 3h2v1H5z"/></svg>`;
}

function insect(ctx:CanvasRenderingContext2D,p:Point,kind:number,time:number,stunned=false) {
  ctx.save();
  ctx.translate(Math.round(p.x)-6,Math.round(p.y)-5);
  ctx.fillStyle=colors[kind];
  if (!stunned && Math.floor(time*25)%2===0) ctx.translate(0,-1);
  ctx.fill(icons[kind]);
  block(ctx,5,3,2,5,'#24252d');
  block(ctx,4,4,4,2,'#24252d');
  block(ctx,5,3,2,1,'#fff9d2');
  ctx.restore();
}

export function renderArcade(ctx:CanvasRenderingContext2D,run:ArcadeRun,pulse:number) {
  const {movement:{spider,hunt,aim},clock,boss,cargo}=run;
  const stage=arcadeStage(run.level),[name,base,ink,light]=stages[stage];
  block(ctx,0,0,width,height,base);
  ctx.save();
  ctx.globalAlpha=.16;
  for (let x=24+stage;x<width;x+=32+stage%4*4) {
    const y=24+x%54;
    block(ctx,x,y,3,height-y,ink);
    block(ctx,x-4,y+15,11,2,ink);
    block(ctx,x-2,y+26,8,1,ink);
    block(ctx,x,y-5-Math.round(pulse*4),4,4,light);
  }
  ctx.globalAlpha=.39+pulse*.12;
  ctx.font='bold 25px monospace';
  ctx.textAlign='center';
  ctx.fillStyle=ink;
  ctx.fillText(name.toUpperCase(),width/2,34,width-36);
  ctx.restore();
  for (const r of hunt.surfaces) {
    block(ctx,r.x,r.y,r.w,r.h,ink);
    if (r.w>22) for (let x=4;x<r.w-3;x+=11) block(ctx,r.x+x,r.y+2,4,1,pulse>.48 ? light : base);
    else for (let y=6;y<r.h-3;y+=11) block(ctx,r.x+2,r.y+y,1,4,base);
  }
  for (const net of hunt.strands) {
    const shake=(net.shakeUntil??0)>clock ? Math.sin(clock*130)*2 : 0;
    const mid={x:(net.from.x+net.to.x)/2,y:(net.from.y+net.to.y)/2+shake};
    const glow=(net.expiresAt??0)-clock>.8 || Math.floor(clock*12)%2===0;
    line(ctx,net.from,mid,ink);line(ctx,mid,net.to,ink);
    if (glow) {
      ctx.save();ctx.translate(0,-1);
      line(ctx,net.from,mid,light);line(ctx,mid,net.to,light);ctx.restore();
    }
  }
  if (spider.firstAnchor && spider.rope) line(ctx,spider,spider.firstAnchor,ink);
  if (spider.rope) line(ctx,spider,spider.rope,ink);
  for (const fly of run.flies) {
    insect(ctx,fly.p,fly.kind,clock,!!fly.caughtUntil || clock<fly.stunUntil);
    if (fly.caughtUntil) {
      block(ctx,fly.p.x-6,fly.p.y-9,12,3,ink);
      block(ctx,fly.p.x-5,fly.p.y-8,Math.ceil((fly.caughtUntil-clock)/3*10),1,light);
    } else if (clock<fly.stunUntil) block(ctx,fly.p.x-1,fly.p.y-8,3,2,'#fff0a0');
  }
  if (cargo) {
    line(ctx,spider,cargo.p,cargo.hot ? '#fff2a2' : ink);
    if (cargo.hot) line(ctx,cargo.p,{x:cargo.p.x-cargo.v.x*.06,y:cargo.p.y-cargo.v.y*.06},'#fff2a2');
    insect(ctx,cargo.p,cargo.kind,clock);
  }
  if (boss) {
    const {p,target,phase,size,hp,max}=boss;
    if (phase==='warn') line(ctx,p,target,'#882f35',true);
    ctx.save();
    ctx.translate(Math.round(p.x),Math.round(p.y));
    ctx.scale(size/7,size/7);
    drawSpider(ctx,{...spider,x:0,y:0,rope:undefined,support:'floor',facing:target.x<p.x ? -1 : 1,
      vx:phase==='charge' ? 80 : 0,vy:0,grounded:true},clock,{time:clock,beat:0},phase==='warn' ? 'aim' : phase==='open' ? 'yield' : 'take');
    block(ctx,2,-2,3,1,phase==='open' ? '#ffdf6b' : '#fc9671');
    ctx.restore();
    for (let i=0;i<max;i++) block(ctx,p.x-max*2+i*4,p.y-size-8,3,3,i<hp ? '#902f37' : ink);
    if (phase==='open') {
      ctx.font='bold 7px monospace';ctx.textAlign='center';ctx.fillStyle=ink;
      ctx.fillText('OPEN',p.x,p.y-size-11);
    }
  }
  if (clock>=run.invincible || Math.floor(clock*15)%2===0) drawSpider(ctx,spider,clock,{time:clock,beat:pulse});
  drawAimMarker(ctx,spider,aim,width,height);
}
