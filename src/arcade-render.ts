import {arcadeFrame,arcadeLayouts,arcadeScenes} from './arcade-scenery';
import {dialogueFor,insectMark,lineAt} from './arcade-dialogue';
import {rivalQuips} from './arcade-script';
import {arcadeAttackStyle,arcadeDirectHits,arcadeEscapePresses,arcadeHeight,arcadeIdleSpeech,arcadeStage,arcadeWidth,bossTrapSeconds,flyEscapeGrace,flyTrapSeconds,type ArcadeRun} from './arcade';
import {block,drawSpider} from './hunt-render';
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

type Portrait='spidey'|'rival'|{kind:number;mark:number};
export type ArcadeSpeech={name:string;words:string;portrait:Portrait};

export function arcadePortrait(portrait:Portrait) {
  const image=(art:string)=>`<svg viewBox="0 0 16 16" aria-hidden="true">${art}</svg>`;
  if (typeof portrait==='string') {
    const rival=portrait==='rival';
    return image(`
      <path fill="#131f20" d="M1 9h3V7h2V4h6v2h2v2h1v4h-2v2h-3v-2H7v2H5v-2H3v2H1v-2h1v-2H1z"/>
      <path fill="${rival ? '#977783' : '#79a354'}" d="M2 9h3V7h2V5h4v2h2v2h1v2h-3v1H7v-1H5v1H3v-1H2z"/>
      <path fill="${rival ? '#bc8f8a' : '#b3cd73'}" d="M3 9h3v1H3zM8 5h3v1H8zM7 8h1v2H7z"/>
      <path fill="#202f24" d="M8 10h4v1H8zM4 12h1v2H4zM11 12h1v2h-1z"/>
      <path fill="${rival ? '#ffb476' : '#f4ebbd'}" d="M9 8h1v1H9zM12 8h1v1h-1z"/>
      ${rival ? '<path fill="#ffe596" d="M6 3h1v1h2V2h1v2h2V3h1v3H6z"/>' : ''}
    `);
  }
  const {kind,mark}=portrait;
  return image(`
    <g transform="translate(2 3)">
      <path fill="#162321" d="${wings[kind]}" stroke="#162321" stroke-width="1"/>
      <path fill="${colors[kind]}" d="${wings[kind]}"/>
      <path fill="#fff3c9" d="M3 4h1v1H3zM8 4h1v1H8z"/>
      <path fill="#222733" d="${bodies[kind]+silhouette(mark)}"/>
      <path fill="${colors[kind]}" d="M4 4h1v1H4zM5 5h2v1H5zM5 7h2v1H5z"/>
      <path fill="#fff9dc" d="M5 3h1v1H5zM7 3h1v1H7z"/>
    </g>
  `);
}

function insect(ctx:CanvasRenderingContext2D,p:Point,kind:number,mark:number,time:number,caught=false) {
  ctx.save();
  ctx.translate(Math.round(p.x)-6,Math.round(p.y)-5);
  ctx.save();
  if (!caught && Math.floor(time*25)%2===0) ctx.translate(0,-1);
  ctx.fillStyle='#34433d';
  ctx.translate(0,1);ctx.fill(icons[kind]);ctx.translate(0,-1);
  ctx.fillStyle=colors[kind];
  ctx.fill(icons[kind]);
  ctx.restore();
  ctx.fillStyle='#24252d';
  ctx.fill(bodyIcons[kind]);
  if (mark) ctx.fill(markings[mark]);
  block(ctx,5,3,2,1,'#fff9d2');
  block(ctx,5,5,2,1,colors[kind]);
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

function openingSpeech(ctx:CanvasRenderingContext2D,run:ArcadeRun):ArcadeSpeech|undefined {
  const line=lineAt(run.level,run.intro!.elapsed);
  if (!line) return;
  const encounter=dialogueFor(run.level);
  const player=line.speaker==='spidey',rival=line.speaker==='rival';
  const fly=typeof line.speaker==='number' ? run.flies[line.speaker] : undefined;
  const p=fly?.p??(player ? run.movement.spider : run.boss!.p);
  const clearance=rival ? 24 : 11;
  for (const side of [-1,1]) {
    const x=p.x+side*clearance;
    block(ctx,x-1,p.y-1,3,3,'#1b2420');
    block(ctx,x,p.y,1,1,'#fcf6c9');
  }
  return {
    name:fly ? encounter.insects[fly.actor][0] : player ? 'Spidey' : encounter.name,
    words:line.words,
    portrait:fly ? {kind:fly.kind,mark:insectMark(run.level,fly.actor)} : player ? 'spidey' : 'rival',
  };
}

function aimReticle(ctx:CanvasRenderingContext2D,spider:Point,aim:Point) {
  const pad=7;
  const edgeX=aim.x>0 ? width-pad-spider.x : spider.x-pad;
  const edgeY=aim.y>0 ? height-pad-spider.y : spider.y-pad;
  const reach=Math.max(0,Math.min(22,edgeX/Math.abs(aim.x),edgeY/Math.abs(aim.y)));
  const x=Math.round(spider.x+aim.x*reach),y=Math.round(spider.y+aim.y*reach);
  const dark='#182021',light='#fff9df';
  block(ctx,x-5,y-5,11,11,dark);
  block(ctx,x-4,y-4,9,9,light);
  block(ctx,x-2,y-2,5,5,dark);
  block(ctx,x,y,1,1,light);
  block(ctx,x-2,y-6,5,2,dark);block(ctx,x,y-5,1,2,light);
  block(ctx,x-2,y+5,5,2,dark);block(ctx,x,y+4,1,2,light);
  block(ctx,x-6,y-2,2,5,dark);block(ctx,x-5,y,2,1,light);
  block(ctx,x+5,y-2,2,5,dark);block(ctx,x+4,y,2,1,light);
}

function bandColor(from:string,to:string,amount:number) {
  const a=parseInt(from.slice(1),16),b=parseInt(to.slice(1),16);
  const rgb=[16,8,0].map(shift=>{
    const start=(a>>shift)&255,end=(b>>shift)&255;
    return Math.round(start+(end-start)*amount);
  });
  return `rgb(${rgb.join(',')})`;
}
const skyBands=arcadeScenes.map(({light,base,accent})=>Array.from({length:14},(_,i)=>
  i<8 ? bandColor(light,base,i/8) : bandColor(base,accent,(i-8)/7)));

function landscape(ctx:CanvasRenderingContext2D,stage:number,pulse:number,reducedMotion:boolean) {
  const {ink,light,accent,skyline}=arcadeScenes[stage];
  for (const [index,color] of skyBands[stage].entries()) block(ctx,0,index*16,width,16,color);
  ctx.save();
  ctx.globalAlpha=.75;
  const sun=stage%2===0 ? 308 : 84;
  for (let y=-23;y<=23;y+=3) {
    const radius=Math.floor(Math.sqrt(24**2-y**2));
    block(ctx,sun-radius,59+y,2*radius,3,light);
  }
  ctx.globalAlpha=.15;
  for (let y=67;y<height;y+=5) for (let x=(y%4)*3;x<width;x+=12) block(ctx,x,y,2,1,ink);
  for (let row=0;row<2;row++) {
    ctx.globalAlpha=row ? .48 : .27;
    const tint=row ? accent : ink;
    for (let x=-20+row*17;x<width;x+=36+row*17) {
      const root=height+row*7;
      const y=root-29-((x+40)*(stage+3)*7)%67;
      if (skyline==='branch' || skyline==='reed') {
        block(ctx,x,y,4+row*3,root-y,tint);
        block(ctx,x-14,y+18,17,3,tint);
        block(ctx,x+3,y+29,15,3,tint);
        if (skyline==='reed') block(ctx,x-2,y-9,8,13,tint);
      } else if (skyline==='bloom' || skyline==='mushroom') {
        block(ctx,x,y+6,4+row*3,root-y-6,tint);
        block(ctx,x-10,y,25,10,tint);
        block(ctx,x-6,y-4,17,4,tint);
        if (skyline==='bloom') {
          block(ctx,x-2,y-9,10,8,tint);
          block(ctx,x-13,y+2,6,5,tint);block(ctx,x+13,y+1,6,5,tint);
          block(ctx,x+1,y+1,7,3,light);
        } else {
          block(ctx,x-4,y+3,3,2,light);block(ctx,x+5,y,4,2,light);
        }
      } else {
        block(ctx,x,y,3,root-y,tint);
        for (let n=0;n<4;n++) {
          block(ctx,x-13,y+9+n*11,14,4,tint);
          block(ctx,x+2,y+14+n*11,18,4,tint);
        }
      }
    }
  }
  ctx.globalAlpha=.66+pulse*.18;
  const beat=reducedMotion ? 0 : Math.round(pulse*5);
  for (let i=0;i<23;i++) {
    const x=(i*61+stage*29)%width;
    const y=42+(i*31+stage*17)%152-beat;
    block(ctx,x,y,2+i%2,1+i%2,light);
  }
  ctx.restore();
}

function drawPerches(ctx:CanvasRenderingContext2D,stage:number,pulse:number) {
  const scene=arcadeScenes[stage],{ink,accent,light,base}=scene;
  for (const [index,{x,y,w,h,form}] of arcadeLayouts[stage].entries()) {
    block(ctx,x,y,w,h,ink);
    block(ctx,x+1,y+1,w-2,h-2,accent);
    if (index<arcadeFrame.length) {
      const railX=index===1 ? x+w-2 : x+1;
      if (index===0) {
        block(ctx,x,y+h-2,w,1,base);
        for (let n=18;n<w-12;n+=23) block(ctx,x+n,y+h-5,9,1,ink);
      } else {
        block(ctx,railX,y,1,h,base);
        for (let n=6;n<h-5;n+=17) block(ctx,x+2,y+n,4,1,ink);
      }
      continue;
    }
    block(ctx,x+1,y+1,w-2,1,light);
    const middle=y+Math.floor(h/2);
    if (h>w) {
      for (let n=5;n<h-3;n+=7) block(ctx,x+2+(n%3),y+n,w-5,1,ink);
    } else if (form==='leaf') {
      block(ctx,x+2,middle,w-4,1,ink);
      for (let n=4;n<w-3;n+=7) {
        block(ctx,x+n,middle-1,3,1,light);
        block(ctx,x+n+1,middle+1,2,1,base);
      }
    } else if (form==='bloom' || form==='mushroom') {
      for (let n=3;n<w-4;n+=8) {
        block(ctx,x+n,middle-1,4,3,pulse>.45 || n%3 ? light : base);
        if (form==='bloom') block(ctx,x+n+2,middle,2,2,base);
      }
    } else {
      for (let n=4;n<w-5;n+=9) block(ctx,x+n,middle,4,1,base);
    }
  }
}

function cocoon(ctx:CanvasRenderingContext2D,p:Point,v:Point,ink:string,light:string,accent:string,falling:boolean) {
  const tilt=falling && Math.abs(v.x)>36 ? Math.sign(v.x) : 0;
  for (let row=-5;row<5;row++) {
    const half=Math.abs(row)>=3 ? 2 : 4;
    const x=p.x+Math.round(row*tilt/3);
    block(ctx,x-half,p.y+row,2*half+1,1,ink);
    if (row>-5 && row<4) block(ctx,x-half+1,p.y+row,2*half-1,1,row===-2 || row===1 ? accent : light);
  }
}

export function renderArcade(ctx:CanvasRenderingContext2D,run:ArcadeRun,pulse:number,reducedMotion=false) {
  const {movement:{spider,hunt,aim},clock,boss,snare}=run;
  const stage=arcadeStage(run.level),scene=arcadeScenes[stage],{ink,light}=scene;
  landscape(ctx,stage,pulse,reducedMotion);
  drawPerches(ctx,stage,pulse);
  const speech=run.intro ? openingSpeech(ctx,run) : undefined;
  for (const net of hunt.strands) web(ctx,net,clock,ink);
  for (const net of run.rivalWebs) web(ctx,net,clock,ink,true);
  for (const shot of run.silkShots) {
    ctx.save();
    const opacity=shot.fade===undefined ? 1 : shot.fade/.08;
    ctx.globalAlpha=.55*opacity;
    silk(ctx,spider,shot.p,ink);
    ctx.globalAlpha=opacity;
    block(ctx,shot.p.x-1,shot.p.y-1,3,3,ink);
    block(ctx,shot.p.x,shot.p.y,1,1,light);
    ctx.restore();
  }
  if (spider.firstAnchor && spider.rope) silk(ctx,spider,spider.firstAnchor,ink);
  if (spider.rope) silk(ctx,spider,spider.rope,ink);
  for (const fly of run.flies) {
    if (!fly.caughtUntil && fly.phase==='strike') {
      const speed=Math.hypot(fly.v.x,fly.v.y)||1;
      const tail={x:fly.p.x-fly.v.x/speed*11,y:fly.p.y-fly.v.y/speed*11};
      silk(ctx,tail,fly.p,ink);
    }
    if (!fly.caughtUntil && fly.phase==='windup') {
      const style=arcadeAttackStyle(fly.kind),x=fly.p.x,y=fly.p.y-11;
      if (style==='dive') {
        block(ctx,x-2,y-2,5,1,ink);
        block(ctx,x-1,y-1,3,1,light);block(ctx,x,y,1,1,light);
      } else if (style==='dash') {
        block(ctx,x-4,y,9,2,ink);
        block(ctx,x-2,y,5,1,light);
      } else if (style==='feint') {
        block(ctx,x-4,y,2,2,light);block(ctx,x+3,y-2,2,2,light);
      } else {
        block(ctx,x,y-3,1,3,ink);block(ctx,x,y+1,1,1,light);
      }
    }
    if (fly.dodge && !fly.caughtUntil) {
      const {x,y}=fly.p,style=fly.dodge.style;
      const v=fly.v,speed=Math.hypot(v.x,v.y)||1;
      silk(ctx,{x:x-v.x/speed*15,y:y-v.y/speed*15},{x:x-v.x/speed*7,y:y-v.y/speed*7},light);
      if (style==='lift') block(ctx,x-1,y-11,3,2,light);
      if (style==='zigzag') {block(ctx,x-7,y-6,2,1,light);block(ctx,x+6,y+5,2,1,light);}
      if (style==='feint') {block(ctx,x-6,y-5,2,2,light);block(ctx,x+4,y-8,2,2,light);}
    }
    if (fly.cocoon) {
      const flying=!fly.cocoon.landed;
      if (flying && clock-fly.cocoon.struckAt<.15) {
        silk(ctx,{x:fly.p.x-fly.v.x*.045,y:fly.p.y-fly.v.y*.045},fly.p,light);
      }
      cocoon(ctx,fly.p,fly.v,ink,light,scene.accent,flying);
    } else insect(ctx,fly.p,fly.kind,insectMark(run.level,fly.actor),clock,!!fly.caughtUntil || fly.phase==='windup' || fly.phase==='recover');
    if (!fly.caughtUntil) {
      const {x,y}=fly.p,hits=arcadeDirectHits(run.level,fly.actor);
      if (hits>1) {
        for (let n=0;n<hits;n++) {
          const left=x-2*hits+n*4;
          block(ctx,left,y-9,3,2,ink);
          if (n<fly.silkHits) block(ctx,left,y-9,3,1,light);
        }
        if (fly.silkHits) {
          block(ctx,x-4,y+2,8,1,light);
          if (fly.silkHits>1) block(ctx,x-3,y-2,6,1,light);
        }
        if (clock<fly.struckUntil) {
          block(ctx,x-8,y+1,2,1,light);block(ctx,x+7,y,2,1,light);
        }
      }
      const grace=fly.safeUntil-clock;
      if (grace>0) {
        const reach=6+Math.ceil(5*grace/flyEscapeGrace);
        const color=grace<.25 ? '#ffcb80' : '#d4ffef';
        for (const sign of [-1,1]) {
          block(ctx,x+sign*reach,y-2,1,5,ink);
          block(ctx,x+sign*(reach+1),y-1,1,3,color);
        }
      }
    }
    if (fly.caughtUntil) {
      block(ctx,fly.p.x-6,fly.p.y-9,12,3,ink);
      const left=fly.caughtUntil-clock;
      block(ctx,fly.p.x-5,fly.p.y-8,Math.ceil(Math.max(0,left/flyTrapSeconds)*10),1,left<.8 ? '#ffc184' : light);
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
    const scale=Math.round(size/7);
    ctx.scale(scale,scale);
    drawSpider(ctx,{...spider,x:0,y:0,rope:undefined,support:'floor',facing:target.x<=p.x ? -1 : 1,
      vx:phase==='charge' ? 80 : 0,vy:0,grounded:true},clock,{time:clock,beat:0},phase==='warn' ? 'aim' : phase==='trapped' ? 'yield' : 'take');
    block(ctx,2,-2,3,1,phase==='trapped' ? '#ffdf6b' : '#fc9671');
    block(ctx,0,-7,5,1,'#f2c77c');
    block(ctx,0,-8,1,1,'#fff4a9');block(ctx,2,-9,1,2,'#fff4a9');block(ctx,4,-8,1,1,'#fff4a9');
    ctx.restore();
    const healthY=Math.max(arcadeFrame[0].h+2,p.y-size-18);
    for (let i=0;i<max;i++) block(ctx,p.x-max*2+i*4,healthY,3,3,i<hp ? '#902f37' : ink);
    if (phase==='trapped') {
      const left=boss.at-clock;
      block(ctx,p.x-11,p.y+9,22,4,ink);
      block(ctx,p.x-10,p.y+10,Math.ceil(Math.max(0,left/bossTrapSeconds)*20),2,left<.75 ? '#ffc184' : light);
    }
  }
  if (clock>=run.invincible || reducedMotion || Math.floor(clock*12)%2===0) drawSpider(ctx,spider,clock,{time:clock,beat:pulse},'normal',{accent:'#f1ecb1'});
  if (clock<run.invincible) {
    ctx.strokeStyle='#f6d395';
    ctx.strokeRect(Math.round(spider.x)-9,Math.round(spider.y)-9,18,18);
  }
  if (run.intro) return speech;
  if (snare) status(ctx,{x:spider.x,y:spider.y-14},`× ${snare.presses}/${arcadeEscapePresses}`,light,snare.presses/arcadeEscapePresses,'#e9f4b9');
  else aimReticle(ctx,spider,aim);
  if (run.phase==='wave' || run.phase==='boss') {
    const rivalLine=boss && (boss.phase==='trapped' || boss.phase==='recover') && boss.turn%3===1;
    const spideyLine=arcadeIdleSpeech(run);
    if (rivalLine) return {name:dialogueFor(run.level).name,words:rivalQuips[(run.level/10+boss.turn-2)%rivalQuips.length],portrait:'rival' as const};
    if (spideyLine) return {name:'Spidey',words:spideyLine,portrait:'spidey' as const};
  }
}
