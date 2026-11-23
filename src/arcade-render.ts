import {deliverySeconds,dialogueFor,insectMark,levelEntranceSeconds} from './arcade-dialogue';
import {rivalQuips} from './arcade-script';
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

function silhouette(mark:number) {
  return (mark&1 ? 'M5 0h1v3H5zM7 1h1v2H7z' : '')+
    (mark&2 ? 'M0 5h3v1H0zM9 5h3v1H9z' : '')+
    (mark&4 ? 'M7 7h1v3H7zM4 7h1v3H4z' : '');
}

const markings=Array.from({length:8},(_,mark)=>new Path2D(silhouette(mark)));

export function arcadeIcon(kind:number,mark:number) {
  return `<svg viewBox="0 0 12 11" aria-hidden="true"><path fill="${colors[kind]}" d="${wings[kind]}"/><path fill="#24252d" d="${bodies[kind]+silhouette(mark)}"/><path fill="#fff9d2" d="M5 3h2v1H5z"/></svg>`;
}

function insect(ctx:CanvasRenderingContext2D,p:Point,kind:number,mark:number,time:number,caught=false) {
  ctx.save();
  ctx.translate(Math.round(p.x)-6,Math.round(p.y)-5);
  ctx.fillStyle=colors[kind];
  if (!caught && Math.floor(time*25)%2===0) ctx.translate(0,-1);
  ctx.fill(icons[kind]);
  ctx.fillStyle='#24252d';
  ctx.fill(bodyIcons[kind]);
  if (mark) ctx.fill(markings[mark]);
  block(ctx,5,3,2,1,'#fff9d2');
  ctx.restore();
}

function silk(ctx:CanvasRenderingContext2D,from:Point,to:Point,color:string,dotted=false) {
  const size=Math.ceil(Math.max(Math.abs(to.x-from.x),Math.abs(to.y-from.y))) || 1;
  for (let i=0;i<=size;i++) {
    if (dotted && i%9>=4) continue;
    block(ctx,from.x+(to.x-from.x)*i/size,from.y+(to.y-from.y)*i/size,1,1,color);
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

function wrap(ctx:CanvasRenderingContext2D,text:string,limit:number) {
  const lines=[''];
  for (const word of text.split(' ')) {
    const last=lines.length-1;
    const next=lines[last] ? lines[last]+' '+word : word;
    if (ctx.measureText(next).width>limit) lines.push(word);
    else lines[last]=next;
  }
  return lines;
}

function speech(ctx:CanvasRenderingContext2D,p:Point,text:string,ink:string,light:string) {
  ctx.save();
  ctx.font='bold 8px monospace';
  const lines=wrap(ctx,text,118);
  const w=10+Math.max(...lines.map(line=>ctx.measureText(line).width)),h=lines.length*10+7;
  const x=Math.max(w/2+8,Math.min(width-w/2-8,p.x)),y=Math.max(8,p.y-h);
  block(ctx,x-w/2-1,y-1,w+2,h+2,ink);
  block(ctx,x-w/2,y,w,h,light);
  ctx.fillStyle=ink;ctx.textAlign='center';
  lines.forEach((line,index)=>ctx.fillText(line,x,y+10+index*10));
  ctx.restore();
}

function spot(ctx:CanvasRenderingContext2D,p:Point,radius:number,light:string,intensity:number) {
  const pool=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,radius);
  pool.addColorStop(0,light);
  pool.addColorStop(1,light+'00');
  ctx.save();
  ctx.globalAlpha=intensity;ctx.fillStyle=pool;
  ctx.fillRect(p.x-radius,p.y-radius,radius*2,radius*2);
  ctx.restore();
}

function caption(ctx:CanvasRenderingContext2D,p:Point,name:string,words:string,right:boolean,ink:string,light:string) {
  ctx.save();
  ctx.textAlign=right ? 'right' : 'left';
  ctx.lineJoin='round';
  ctx.lineWidth=3;
  ctx.strokeStyle=ink;
  ctx.fillStyle=light;
  ctx.font='bold 12px monospace';
  const lines=wrap(ctx,words,174);
  const y=p.y-lines.length*15;
  ctx.font='bold 10px monospace';
  ctx.strokeText(name,p.x,y-15);ctx.fillText(name,p.x,y-15);
  ctx.font='bold 12px monospace';
  lines.forEach((line,index)=>{
    const baseline=y+index*15;
    ctx.strokeText(line,p.x,baseline);
    ctx.fillText(line,p.x,baseline);
  });
  ctx.restore();
}

function introduction(ctx:CanvasRenderingContext2D,run:ArcadeRun,ink:string,light:string,pulse:number,reducedMotion:boolean) {
  const {elapsed,kind}=run.intro!;
  const rival=kind==='rival';
  const {name,line,reply,closing,insects}=dialogueFor(run.level);
  const reveal=levelEntranceSeconds+deliverySeconds(line);
  const spideySpeaking=elapsed>=reveal && elapsed<reveal+deliverySeconds(reply);
  const hero=run.movement.spider;
  const leader=rival ? run.boss!.p : {x:350,y:187};
  const formation=[leader,{x:324,y:167},{x:375,y:163},{x:302,y:192},{x:366,y:198}];
  const accent=reducedMotion ? 0 : pulse*.04;
  spot(ctx,{x:hero.x,y:hero.y-2},41,light,spideySpeaking ? .55+accent : .24);
  spot(ctx,{x:leader.x-6,y:leader.y-4},rival ? 57 : 66,light,spideySpeaking ? .24 : .52+accent);

  drawSpider(ctx,hero,elapsed,{time:elapsed,beat:0});
  if (rival) {
    ctx.save();
    ctx.translate(leader.x,leader.y);ctx.scale(2.35,2.35);
    drawSpider(ctx,{...hero,x:0,y:0,vx:0,vy:0,support:'floor',rope:undefined,facing:-1},elapsed,{time:elapsed,beat:0},'aim');
    ctx.restore();
  } else {
    run.flies.forEach((fly,index)=>{
      const p=formation[index];
      insect(ctx,p,fly.kind,insectMark(run.level,index),elapsed+index*.05,reducedMotion);
      if (insects.length>1) {
        ctx.save();
        ctx.textAlign='center';ctx.font='bold 7px monospace';ctx.lineWidth=2;
        ctx.strokeStyle=ink;ctx.fillStyle=light;
        ctx.strokeText(insects[index][0],p.x,p.y+12);
        ctx.fillText(insects[index][0],p.x,p.y+12);
        ctx.restore();
      }
    });
  }

  if (elapsed>=levelEntranceSeconds) {
    if (spideySpeaking) caption(ctx,{x:15,y:hero.y-10},'Spidey',reply,false,ink,light);
    else caption(ctx,{x:width-15,y:leader.y-29},name,elapsed<reveal ? line : closing,true,ink,light);
  }
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
  for (const net of hunt.strands) web(ctx,net,clock,ink);
  for (const net of run.rivalWebs) web(ctx,net,clock,ink,true);
  if (spider.firstAnchor && spider.rope) silk(ctx,spider,spider.firstAnchor,ink);
  if (spider.rope) silk(ctx,spider,spider.rope,ink);
  for (const fly of run.flies) {
    if (!fly.caughtUntil && fly.phase==='strike') {
      const speed=Math.hypot(fly.v.x,fly.v.y)||1;
      const tail={x:fly.p.x-fly.v.x/speed*11,y:fly.p.y-fly.v.y/speed*11};
      silk(ctx,tail,fly.p,ink);
    }
    if (!fly.caughtUntil && fly.phase==='windup') {
      block(ctx,fly.p.x-2,fly.p.y-9,4,1,ink);
      block(ctx,fly.p.x,fly.p.y-13,1,3,light);
    }
    insect(ctx,fly.p,fly.kind,insectMark(run.level,fly.actor),clock,!!fly.caughtUntil || fly.phase==='windup' || fly.phase==='recover');
    if (fly.caughtUntil) {
      block(ctx,fly.p.x-6,fly.p.y-9,12,3,ink);
      const left=fly.caughtUntil-clock;
      block(ctx,fly.p.x-5,fly.p.y-8,Math.ceil(left/flyTrapSeconds*10),1,left<.8 ? '#ffc184' : light);
      if (left<.8) {
        block(ctx,fly.p.x-1,fly.p.y+5,3,1,'#ffc184');
        block(ctx,fly.p.x-5,fly.p.y+3,2,1,'#ffc184');
      }
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
  if (clock>=run.invincible || reducedMotion || Math.floor(clock*12)%2===0) drawSpider(ctx,spider,clock,{time:clock,beat:pulse});
  if (clock<run.invincible) {
    ctx.strokeStyle='#f6d395';
    ctx.strokeRect(Math.round(spider.x)-9,Math.round(spider.y)-9,18,18);
  }
  if (snare) status(ctx,{x:spider.x,y:spider.y-14},`× ${snare.presses}/${arcadeEscapePresses}`,light,snare.presses/arcadeEscapePresses,'#e9f4b9');
  else drawAimMarker(ctx,spider,aim,width,height);
  if (run.phase==='wave' || run.phase==='boss') {
    const rivalLine=boss && (boss.phase==='trapped' || boss.phase==='recover') && boss.turn%3===1;
    const spideyLine=arcadeIdleSpeech(run);
    if (rivalLine) speech(ctx,{x:boss.p.x,y:boss.p.y-boss.size-12},rivalQuips[(run.level/10+boss.turn-2)%rivalQuips.length],ink,light);
    else if (spideyLine) speech(ctx,{x:spider.x,y:spider.y-10},spideyLine,ink,light);
  }
}
