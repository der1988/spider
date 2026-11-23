import {cast,exchangeSeconds,rivalName,rivalQuips} from './arcade-script';
import {arcadeEscapePresses,arcadeHeight,arcadeIdleSpeech,arcadeStage,arcadeWidth,bossTrapSeconds,flyTrapSeconds,stages,type ArcadeRun} from './arcade';
import {block,drawAimMarker,drawSpider} from './hunt-render';
import type {Point} from './spider';
import type {Strand} from './threads';

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

function insect(ctx:CanvasRenderingContext2D,p:Point,kind:number,time:number,caught=false) {
  ctx.save();
  ctx.translate(Math.round(p.x)-6,Math.round(p.y)-5);
  ctx.fillStyle=colors[kind];
  if (!caught && Math.floor(time*25)%2===0) ctx.translate(0,-1);
  ctx.fill(icons[kind]);
  block(ctx,5,3,2,5,'#24252d');
  block(ctx,4,4,4,2,'#24252d');
  block(ctx,5,3,2,1,'#fff9d2');
  ctx.restore();
}

function silk(ctx:CanvasRenderingContext2D,from:Point,to:Point,color:string,dotted=false) {
  const size=Math.ceil(Math.max(Math.abs(to.x-from.x),Math.abs(to.y-from.y))) || 1;
  for (let i=0;i<=size;i++) {
    if (dotted && i%9>=4) continue;
    block(ctx,from.x+(to.x-from.x)*i/size,from.y+(to.y-from.y)*i/size,2,2,color);
  }
}

function web(ctx:CanvasRenderingContext2D,net:Strand,clock:number,color:string,rival=false,dotted=false) {
  const {from,to}=net;
  const shake=net.shakeUntil>clock ? Math.sin(clock*100)*1.25 : 0;
  const mid={x:(from.x+to.x)/2+shake,y:(from.y+to.y)/2+shake};
  silk(ctx,from,mid,color,dotted);silk(ctx,mid,to,color,dotted);
  if (rival && !dotted) {
    const distance=Math.hypot(to.x-from.x,to.y-from.y);
    for (let n=10;n<distance;n+=14) {
      const x=from.x+(to.x-from.x)*n/distance,y=from.y+(to.y-from.y)*n/distance;
      block(ctx,x-2,y,6,2,color);
      block(ctx,x-1,y-1,4,4,color);
    }
  }
}

function status(ctx:CanvasRenderingContext2D,p:Point,label:string,light:string,ratio:number,accent:string) {
  ctx.save();
  ctx.font='bold 8px monospace';ctx.textAlign='center';
  const w=Math.max(27,Math.ceil(ctx.measureText(label).width)+8);
  const x=Math.max(w/2+8,Math.min(width-w/2-8,p.x)),y=Math.max(22,p.y);
  block(ctx,x-w/2,y-9,w,14,'#000');
  ctx.fillStyle=light;ctx.fillText(label,x,y);
  block(ctx,x-w/2+2,y+2,Math.round((w-4)*Math.min(1,Math.max(0,ratio))),2,accent);
  ctx.restore();
}

function speech(ctx:CanvasRenderingContext2D,p:Point,text:string,ink:string,light:string) {
  ctx.save();
  ctx.font='bold 8px monospace';
  const lines=[''];
  for (const word of text.split(' ')) {
    const line=lines[lines.length-1];
    const next=line ? line+' '+word : word;
    if (ctx.measureText(next).width>118) lines.push(word);
    else lines[lines.length-1]=next;
  }
  const w=10+Math.max(...lines.map(line=>ctx.measureText(line).width)),h=lines.length*10+5;
  const x=Math.max(w/2+8,Math.min(width-w/2-8,p.x));
  const y=Math.max(8,p.y-h);
  block(ctx,x-w/2-1,y-1,w+2,h+2,ink);
  block(ctx,x-w/2,y,w,h,light);
  ctx.fillStyle=ink;ctx.textAlign='center';
  lines.forEach((line,index)=>ctx.fillText(line,x,y+9+index*10));
  ctx.restore();
}

function introduction(ctx:CanvasRenderingContext2D,run:ArcadeRun,ink:string,light:string) {
  const intro=run.intro!;
  const rival=intro.kind==='rival';
  const beat=Math.floor(Math.max(0,intro.elapsed-.6)/exchangeSeconds);
  const fly=run.flies[Math.min(run.flies.length-1,Math.floor(beat/2))];
  const role=rival ? undefined : cast[fly.actor];
  const reply=rival ? intro.elapsed>=2.2 : beat%2===1;
  const speaker=reply ? 'Spidey' : role?.[0]??rivalName;
  const quote=role ? role[reply ? 2 : 1] :
    reply ? 'A title and four pairs of knees. That seems excessive.' : 'I demand satisfaction. And a chair with lumbar support.';
  const focus=reply ? run.movement.spider : rival ? run.boss!.p : fly.p;
  ctx.save();
  ctx.globalAlpha=.39;block(ctx,0,0,width,height,ink);ctx.globalAlpha=1;
  const radius=rival && !reply ? 21 : 9;
  ctx.strokeStyle=light;
  ctx.strokeRect(Math.round(focus.x)-radius,Math.round(focus.y)-radius,radius*2,radius*2);
  block(ctx,10,13,width-20,44,ink);
  ctx.fillStyle=light;ctx.textAlign='center';
  ctx.font='bold 9px monospace';
  ctx.fillText(rival ? 'A DUEL AT LEVEL '+run.level : 'LEVEL '+run.level+' / 100',width/2,28);
  ctx.font='bold 14px monospace';
  ctx.fillText(rival ? rivalName : run.quota+' to catch · '+stages[arcadeStage(run.level)][0],width/2,46);
  block(ctx,10,118,width-20,35,ink);
  block(ctx,17,124,24,23,light);
  if (!rival && !reply) insect(ctx,{x:29,y:135},fly.kind,intro.elapsed);
  else {
    const spider=run.movement.spider;
    drawSpider(ctx,{...spider,x:29,y:135,vx:0,vy:0,support:'floor',rope:undefined},intro.elapsed,{time:intro.elapsed,beat:0},reply ? 'normal' : 'aim');
  }
  ctx.textAlign='left';ctx.font='bold 9px monospace';
  ctx.fillText(speaker,49,132);
  ctx.font='9px monospace';
  ctx.fillText(quote,49,145,width-66);
  ctx.restore();
}

export function renderArcade(ctx:CanvasRenderingContext2D,run:ArcadeRun,pulse:number) {
  const {movement:{spider,hunt,aim},clock,boss,snare}=run;
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
  const nets=new Set(hunt.strands);
  if (boss?.net) nets.add(boss.net);
  for (const net of nets) web(ctx,net,clock,ink);
  for (const net of run.rivalWebs) web(ctx,net,clock,ink,true);
  if (spider.firstAnchor && spider.rope) silk(ctx,spider,spider.firstAnchor,ink);
  if (spider.rope) silk(ctx,spider,spider.rope,ink);
  for (const fly of run.flies) {
    if (fly.returnsAt>clock) continue;
    insect(ctx,fly.p,fly.kind,clock,!!fly.caughtUntil);
    if (fly.caughtUntil) {
      block(ctx,fly.p.x-6,fly.p.y-9,12,3,ink);
      block(ctx,fly.p.x-5,fly.p.y-8,Math.ceil((fly.caughtUntil-clock)/flyTrapSeconds*10),1,light);
    }
  }
  if (boss) {
    const {p,target,phase,size,hp,max}=boss;
    if (phase==='warn' && boss.shot) web(ctx,boss.shot,clock,ink,true,true);
    ctx.save();
    ctx.translate(Math.round(p.x),Math.round(p.y));
    ctx.scale(size/7,size/7);
    drawSpider(ctx,{...spider,x:0,y:0,rope:undefined,support:'floor',facing:target.x<p.x ? -1 : 1,
      vx:phase==='charge' ? 80 : 0,vy:0,grounded:true},clock,{time:clock,beat:0},phase==='warn' ? 'aim' : phase==='trapped' ? 'yield' : 'take');
    block(ctx,2,-2,3,1,phase==='trapped' ? '#ffdf6b' : '#fc9671');
    ctx.restore();
    for (let i=0;i<max;i++) block(ctx,p.x-max*2+i*4,p.y-size-8,3,3,i<hp ? '#902f37' : ink);
    if (phase==='trapped') {
      const left=boss.at-clock;
      block(ctx,p.x-11,p.y+9,22,4,ink);
      block(ctx,p.x-10,p.y+10,Math.ceil(Math.max(0,left/bossTrapSeconds)*20),2,left<.75 ? '#ffc184' : light);
    }
  }
  if (clock>=run.invincible || Math.floor(clock*15)%2===0) drawSpider(ctx,spider,clock,{time:clock,beat:pulse});
  if (snare) status(ctx,{x:spider.x,y:spider.y-14},`× ${snare.presses}/${arcadeEscapePresses}`,light,snare.presses/arcadeEscapePresses,'#e9f4b9');
  else if (!run.intro) drawAimMarker(ctx,spider,aim,width,height);
  if (run.intro) introduction(ctx,run,ink,light);
  else if (run.phase==='wave' || run.phase==='boss') {
    const rivalLine=boss && (boss.phase==='trapped' || boss.phase==='recover') && boss.turn%3===1;
    const spideyLine=arcadeIdleSpeech(run);
    if (rivalLine) speech(ctx,{x:boss.p.x,y:boss.p.y-boss.size-12},rivalQuips[(run.level/10+boss.turn-2)%rivalQuips.length],ink,light);
    else if (spideyLine) speech(ctx,{x:spider.x,y:spider.y-10},spideyLine,ink,light);
  }
}
