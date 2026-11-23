import {deliverySeconds,dialogueFor,levelEntranceSeconds} from './arcade-dialogue';
import {rivalName,rivalQuips} from './arcade-script';
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
const bodies=[
  'M5 3h2v5H5zM4 4h4v2H4z', 'M5 2h2v7H5z', 'M4 3h4v4H4zM5 7h2v2H5z',
  'M4 4h4v3H4zM5 2h2v2H5z', 'M3 5h6v2H3zM5 4h4v1H5z', 'M5 2h2v7H5zM4 3h4v3H4z',
  'M4 4h4v4H4zM5 3h2v6H5z', 'M4 6h4v4H4zM5 4h2v2H5z',
  'M5 2h2v6H5zM5 8h1v2H5z','M4 3h4v5H4zM5 2h2v7H5z',
] as const;
const colors=['#e8f6b7','#ffc86c','#d6edff','#ffd7ed','#ffe7c2','#a8ffb8','#edccff','#f0ede6','#ffc8a3','#fff495'];
const icons=wings.map(path=>new Path2D(path));
const bodyIcons=bodies.map(path=>new Path2D(path));

export function arcadeIcon(kind:number) {
  return `<svg viewBox="0 0 12 11" aria-hidden="true"><path fill="${colors[kind]}" d="${wings[kind]}"/><path fill="#24252d" d="${bodies[kind]}"/><path fill="#fff9d2" d="M5 3h2v1H5z"/></svg>`;
}

function insect(ctx:CanvasRenderingContext2D,p:Point,kind:number,time:number,caught=false) {
  ctx.save();
  ctx.translate(Math.round(p.x)-6,Math.round(p.y)-5);
  ctx.fillStyle=colors[kind];
  if (!caught && Math.floor(time*25)%2===0) ctx.translate(0,-1);
  ctx.fill(icons[kind]);
  ctx.fillStyle='#24252d';
  ctx.fill(bodyIcons[kind]);
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

function speech(ctx:CanvasRenderingContext2D,p:Point,text:string,ink:string,light:string,scene=false) {
  ctx.save();
  const lineHeight=scene ? 15 : 10;
  ctx.font=scene ? 'bold 12px monospace' : 'bold 8px monospace';
  const lines=[''];
  for (const word of text.split(' ')) {
    const line=lines[lines.length-1];
    const next=line ? line+' '+word : word;
    if (ctx.measureText(next).width>(scene ? 210 : 118)) lines.push(word);
    else lines[lines.length-1]=next;
  }
  const w=10+Math.max(...lines.map(line=>ctx.measureText(line).width)),h=lines.length*lineHeight+7;
  const x=Math.max(w/2+8,Math.min(width-w/2-8,p.x));
  const y=scene ? p.y : Math.max(8,p.y-h);
  block(ctx,x-w/2-1,y-1,w+2,h+2,ink);
  block(ctx,x-w/2,y,w,h,light);
  if (scene) {
    const tail=Math.max(x-w/2+6,Math.min(x+w/2-6,p.x));
    block(ctx,tail-3,y-4,6,5,ink);
    block(ctx,tail-1,y-2,2,3,light);
  }
  ctx.fillStyle=ink;ctx.textAlign='center';
  lines.forEach((line,index)=>ctx.fillText(line,x,y+lineHeight+index*lineHeight));
  ctx.restore();
}

function introduction(ctx:CanvasRenderingContext2D,run:ArcadeRun,ink:string,light:string,pulse:number,reducedMotion:boolean) {
  const intro=run.intro!;
  const rival=intro.kind==='rival';
  const [name,line,retort]=rival ?
    [rivalName,'I demand satisfaction. And a chair with lumbar support.','A title and four pairs of knees. That seems excessive.'] :
    dialogueFor(run.level);
  const reply=intro.elapsed>=(rival ? 2.05 : levelEntranceSeconds+deliverySeconds(line));
  const spider=run.movement.spider;
  const hero={x:326,y:115};
  const leader={x:rival || run.quota===1 ? 185 : 185-(run.quota-1)*17,y:108};
  ctx.save();
  ctx.globalAlpha=.58;block(ctx,0,0,width,height,ink);ctx.globalAlpha=1;
  ctx.globalAlpha=.24+pulse*.23;
  block(ctx,38,79,width-76,60,light);
  ctx.globalAlpha=1;
  for (const x of [41,52,342,353]) block(ctx,x,134,5,Math.round(2+pulse*4),light);
  block(ctx,36,139,width-72,2,light);
  ctx.fillStyle=light;ctx.textAlign='center';
  ctx.font='bold 10px monospace';
  ctx.fillText(rival ? 'DUEL · LEVEL '+run.level : 'LEVEL '+run.level+' / 100',width/2,31);
  ctx.font='bold 19px monospace';
  ctx.fillText(name,width/2,62,width-38);
  if (rival) {
    ctx.save();
    ctx.translate(185,106);ctx.scale(2.8,2.8);
    drawSpider(ctx,{...spider,x:0,y:0,vx:0,vy:0,support:'floor',rope:undefined,facing:1},intro.elapsed,{time:intro.elapsed,beat:pulse},'aim');
    ctx.restore();
  } else {
    run.flies.forEach((fly,index)=>{
      const fraction=reducedMotion ? 1 : Math.max(0,Math.min(1,(intro.elapsed-index*.035)/.54));
      const x=leader.x+index*34-(1-fraction)**3*(leader.x+33);
      const glide=Math.sin(fraction*Math.PI)*(fly.kind===3 ? 26 : fly.kind===7 ? -5 : 12);
      const y=leader.y+(index%2)*11-glide;
      const scale=index===0 ? 3.15+pulse*.15 : 2.65;
      ctx.save();
      ctx.translate(Math.round(x),Math.round(y));
      ctx.scale(scale,scale);
      insect(ctx,{x:0,y:0},fly.kind,intro.elapsed+index*.05,reducedMotion);
      ctx.restore();
    });
  }
  ctx.save();
  ctx.translate(hero.x,hero.y);ctx.scale(1.8,1.8);
  drawSpider(ctx,{...spider,x:0,y:0,vx:0,vy:0,support:'floor',rope:undefined,facing:-1},intro.elapsed,{time:intro.elapsed,beat:pulse});
  ctx.restore();
  ctx.fillStyle=light;ctx.textAlign='center';ctx.font='bold 10px monospace';
  ctx.fillText('Spidey',hero.x,149);
  if (rival || intro.elapsed>=levelEntranceSeconds) {
    speech(ctx,{x:reply ? hero.x : leader.x,y:158},reply ? retort : line,ink,light,true);
  }
  ctx.restore();
}

export function renderArcade(ctx:CanvasRenderingContext2D,run:ArcadeRun,pulse:number,reducedMotion=false) {
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
  if (!run.intro) {
    ctx.globalAlpha=.39+pulse*.12;
    ctx.font='bold 25px monospace';
    ctx.textAlign='center';
    ctx.fillStyle=ink;
    ctx.fillText(name.toUpperCase(),width/2,34,width-36);
  }
  ctx.restore();
  for (const r of hunt.surfaces) {
    block(ctx,r.x,r.y,r.w,r.h,ink);
    if (r.w>22) for (let x=4;x<r.w-3;x+=11) block(ctx,r.x+x,r.y+2,4,1,pulse>.48 ? light : base);
    else for (let y=6;y<r.h-3;y+=11) block(ctx,r.x+2,r.y+y,1,4,base);
  }
  if (run.intro) {
    introduction(ctx,run,ink,light,pulse,reducedMotion);
    return;
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
  else drawAimMarker(ctx,spider,aim,width,height);
  if (run.phase==='wave' || run.phase==='boss') {
    const rivalLine=boss && (boss.phase==='trapped' || boss.phase==='recover') && boss.turn%3===1;
    const spideyLine=arcadeIdleSpeech(run);
    if (rivalLine) speech(ctx,{x:boss.p.x,y:boss.p.y-boss.size-12},rivalQuips[(run.level/10+boss.turn-2)%rivalQuips.length],ink,light);
    else if (spideyLine) speech(ctx,{x:spider.x,y:spider.y-10},spideyLine,ink,light);
  }
}
