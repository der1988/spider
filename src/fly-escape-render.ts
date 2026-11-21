import {block,drawBackground,drawPlatform,drawSpider,line,type SpiderActing} from './hunt-render';
import {HEIGHT,WIDTH,platforms} from './hunt';
import type {FlyEscape} from './fly-escape';
import type {Point} from './spider';

export interface FlyEscapeFrame {
  time: number;
  beat: number;
  intro?: boolean;
  shot?: 'spider'|'take'|'fly'|'you'|'room';
  shotProgress?: number;
  shrink: number;
  details?: number;
  ending?: number;
  reducedMotion?: boolean;
}

const ink='#243c2d';
const cream='#eff3c8';
const border='#8cb072';
const wallColor='#3f6651';
const closing='#17281f';
const question='#f2dd86';
const hesitating='#ad8655';
const watching='#d19751';
const steppingBack='#668273';

const limit=(n: number) => Math.min(1,Math.max(0,n));
const range=(n: number,start: number,end: number) => limit((n-start)/(end-start));
const ease=(n: number) => n*n*(3-2*n);

function layer(ctx: CanvasRenderingContext2D,alpha: number,draw: () => void) {
  if (alpha<=0) return;
  ctx.save();
  ctx.globalAlpha*=alpha;
  draw();
  ctx.restore();
}

function camera(ctx: CanvasRenderingContext2D,state: FlyEscape,frame: FlyEscapeFrame) {
  const {shot,reducedMotion}=frame;
  if (!shot) return;
  const spiderShot=shot==='spider' || shot==='take';
  const zoomFactor=spiderShot ? 4.2 : 6;
  const zoom=shot==='room' ? 1+(zoomFactor-1)*(1-ease(frame.shotProgress??1)) : zoomFactor;
  const magnification=reducedMotion ? 1+(zoom-1)*.52 : zoom;
  const target=spiderShot ? state.spider : state.fly.p;
  const focus=(position: number,size: number) =>
    Math.max(size/2/magnification,Math.min(size-size/2/magnification,position));
  ctx.translate(WIDTH/2,HEIGHT/2);
  ctx.scale(magnification,magnification);
  ctx.translate(-focus(target.x,WIDTH),-focus(target.y,HEIGHT));
}

function polyline(ctx: CanvasRenderingContext2D,points: readonly Point[],color: string,dotted=false) {
  for (let i=1;i<points.length;i++) line(ctx,points[i-1],points[i],color,dotted);
}

function dividedSurface(ctx: CanvasRenderingContext2D,points: readonly Point[],rim: readonly Point[],edge: Point[]) {
  layer(ctx,.24,()=>{
    const outline=[...points,...edge];
    ctx.beginPath();
    ctx.moveTo(outline[0].x,outline[0].y);
    for (const point of outline.slice(1)) ctx.lineTo(point.x,point.y);
    ctx.closePath();
    ctx.fillStyle=wallColor;
    ctx.fill();
  });
  polyline(ctx,points,wallColor);
  polyline(ctx,rim,border,true);
  for (let i=1;i<points.length;i+=2) line(ctx,points[i],rim[i],wallColor,true);
}

function deformRoom(ctx: CanvasRenderingContext2D,amount: number,time: number,reducedMotion: boolean) {
  if (amount<=0) return;
  const jitter=reducedMotion ? 0 : Math.sin(time*19);
  const depth=(reducedMotion ? 20 : 30)*ease(amount);
  layer(ctx,Math.min(.9,amount*1.8),()=>{
    for (const side of [0,1]) {
      const x=(d: number)=>side ? WIDTH-8-d : 7+d;
      const points=[0,.17,1,.48,.79,.20,0].map((factor,i)=>({
        x:x(Math.round(depth*factor+(i%2 ? jitter*amount : 0))),
        y:7+i*30,
      }));
      const rim=points.map(point=>({x:point.x+(side ? 3 : -3),y:point.y+3}));
      layer(ctx,.32,()=>{
        for (const point of points) line(ctx,{x:x(0),y:point.y},point,wallColor,true);
      });
      dividedSurface(ctx,points,rim,[{x:x(0),y:187},{x:x(0),y:7}]);
    }
    const points=[0,.65,.45,1,.58,.83,.28,0].map((factor,i)=>({
      x:12+i*48,
      y:7+Math.round(depth*factor*.77+(i%2 ? jitter*amount : 0)),
    }));
    const rim=points.map(point=>({x:point.x+3,y:point.y-3}));
    layer(ctx,.32,()=>{
      for (const point of points) line(ctx,{x:point.x,y:7},point,wallColor,true);
    });
    dividedSurface(ctx,points,rim,[{x:348,y:7},{x:12,y:7}]);
  });
}

function perimeter(ctx: CanvasRenderingContext2D) {
  const left=platforms[2].x+platforms[2].w;
  const right=platforms[3].x-1;
  const top=platforms[1].y+platforms[1].h;
  const bottom=platforms[0].y-1;
  polyline(ctx,[
    {x:left,y:top},{x:right,y:top},{x:right,y:bottom},
    {x:left,y:bottom},{x:left,y:top},
  ],ink);
}

function marker(ctx: CanvasRenderingContext2D,p: Point,size: number,color: string) {
  const {x,y}=p;
  for (const dx of [-1,1]) {
    for (const dy of [-1,1]) {
      const corner={x:x+dx*size,y:y+dy*size};
      line(ctx,corner,{x:corner.x-dx*2,y:corner.y},color);
      line(ctx,corner,{x:corner.x,y:corner.y-dy*2},color);
    }
  }
}

function drawLight(ctx: CanvasRenderingContext2D,p: Point,beat: number) {
  const {x,y}=p;
  const radius=beat>.42 ? 6 : 5;
  polyline(ctx,[{x,y:y-radius},{x:x+radius,y},{x,y:y+radius},{x:x-radius,y},{x,y:y-radius}],ink);
  block(ctx,x-2,y-2,5,5,'#fff3a3');
  block(ctx,x-1,y-3,3,7,'#fff3a3');
  block(ctx,x,y-1,1,3,cream);
  block(ctx,x-1,y,3,1,cream);
  if (beat>.42) marker(ctx,p,8,border);
}

function drawFly(ctx: CanvasRenderingContext2D,state: FlyEscape,frame: FlyEscapeFrame) {
  const {p,v}=state.fly;
  const {x,y}=p;
  const accent=frame.shot==='you';
  const flap=frame.reducedMotion ? 0 : Math.floor(frame.time*(accent ? 12 : 25))%2;
  const wing=accent ? 3+flap : 2;
  const facing=v.x<0 ? -1 : 1;
  block(ctx,x-2,y-1,5,3,ink);
  block(ctx,x-1,y-2,3,5,ink);
  block(ctx,x-wing,y-2-flap,wing,2,cream);
  block(ctx,x+2,y-2+flap,wing,2,cream);
  block(ctx,x+facing,y-1,1,1,'#eeea9d');
  if (accent) marker(ctx,p,7+Math.round(frame.beat*2),cream);
}

function drawTethers(ctx: CanvasRenderingContext2D,state: FlyEscape) {
  const {spider,watchedStrand}=state;
  for (const strand of state.strands) {
    const shake=Math.max(0,strand.shakeUntil-state.clock);
    const nearExpiry=(strand.expiresAt??Infinity)-state.clock<1;
    const mid={
      x:(strand.from.x+strand.to.x)/2,
      y:(strand.from.y+strand.to.y)/2+(shake ? Math.sin(state.clock*105)*shake*5 : 0),
    };
    const shade=strand===watchedStrand ? watching : state.trapped?.strand===strand ? ink : '#4e6e50';
    polyline(ctx,[strand.from,mid,strand.to],shade,nearExpiry);
  }
  if (watchedStrand && !state.strands.includes(watchedStrand)) {
    const expiredFor=state.clock-(watchedStrand.expiresAt??-Infinity);
    const fade=1-range(expiredFor,0,.42);
    layer(ctx,fade,()=>{
      for (const tip of [watchedStrand.from,watchedStrand.to]) {
        block(ctx,tip.x-1,tip.y,3,1,watching);
        block(ctx,tip.x,tip.y-1,1,3,watching);
      }
    });
  }
  if (spider.firstAnchor) line(ctx,spider,spider.firstAnchor,border,true);
  if (spider.rope) line(ctx,spider,spider.rope,cream);
  const plan=state.plan;
  if (plan?.kind==='web') {
    const progress=range(state.clock,plan.beginsAt,plan.executeAt);
    layer(ctx,.48+.32*progress,()=>line(ctx,plan.strand.from,plan.strand.to,cream,true));
  }
}

function lookAlongSurface(state: FlyEscape,target: Point|undefined) {
  const {spider}=state;
  if (!target) return spider.facing;
  const dx=target.x-spider.x,dy=target.y-spider.y;
  const toward=spider.support==='right' ? -dy : spider.support==='left' ? dy :
    spider.support==='ceiling' ? -dx : dx;
  return Math.abs(toward)<3 ? spider.facing : toward<0 ? -1 : 1;
}

function acting(state: FlyEscape): SpiderActing|undefined {
  const age=Math.max(0,state.clock-state.gestureSince);
  const facing=state.spider.facing;
  const opposite=facing===1 ? -1 : 1;
  if (state.gesture==='identity') {
    const turning=age<.45 || (age>.83 && age<1.27);
    return {look:turning ? opposite : facing,curl:turning ? 1 : 0,accent:question};
  }
  if (state.gesture==='decision') {
    const retract=ease(range(age,.42,.98));
    return {look:lookAlongSurface(state,state.decisionAim),curl:2.5*retract,lean:1-2*retract,accent:hesitating};
  }
  if (state.gesture==='watch' || state.gesture==='lastWeb') {
    const strand=state.watchedStrand;
    const middle=strand && {x:(strand.from.x+strand.to.x)/2,y:(strand.from.y+strand.to.y)/2};
    return {look:lookAlongSurface(state,middle),curl:1.2,lean:.6,accent:watching};
  }
  if (state.gesture==='stepBack') {
    const step=range(age,0,.65);
    const stride=Math.sin(step*Math.PI);
    return {look:opposite,curl:stride*1.6,lean:-stride*2,accent:steppingBack};
  }
  if (state.plan || state.aim) {
    const {plan}=state;
    const curl=plan?.kind==='jump' ? 1.7*range(state.clock,plan.beginsAt,plan.executeAt) : 0;
    return {look:lookAlongSurface(state,state.behavior==='aim' ? state.fly.p : plan?.target??state.aim),curl,lean:plan && !curl ? 1 : 0};
  }
}

function point(xy: Point) {
  return Math.round(xy.x)+', '+Math.round(xy.y);
}

function codeLabels(ctx: CanvasRenderingContext2D) {
  const placed: {x:number;y:number;width:number}[]=[];
  return (value: string,x: number,y: number,opacity: number) => layer(ctx,opacity,()=>{
    ctx.font='8px monospace';
    ctx.textBaseline='top';
    const width=Math.ceil(ctx.measureText(value).width);
    const left=Math.max(3,Math.min(WIDTH-3-width,x));
    const top=[0,12,-12,24,-24,36,-36]
      .map(offset=>Math.max(3,Math.min(HEIGHT-11,y+offset)))
      .find(candidate=>!placed.some(label=>
        Math.abs(candidate-label.y)<11 && left-2<label.x+label.width && label.x-2<left+width));
    if (top===undefined) return;
    placed.push({x:left,y:top,width});
    block(ctx,left-1,top-1,width+2,10,closing);
    ctx.fillStyle=cream;
    ctx.fillText(value,left,top);
  });
}

function dissolve(ctx: CanvasRenderingContext2D,state: FlyEscape,ending: number) {
  const label=codeLabels(ctx);
  const codeFade=1-range(ending,.84,1);
  const write=(value: string,x: number,y: number,from: number,to: number)=>
    label(value,x,y,codeFade*range(ending,from,to));
  write('room.origin = [0, 0];',13,15,.035,.19);
  write('room.bounds = [0, 0, '+WIDTH+', '+HEIGHT+'];',179,185,.10,.26);
  write('clock.timeLeft = '+Math.ceil(state.time)+';',12,183,.08,.28);
  for (const platform of platforms.slice(4)) {
    write('['+point(platform)+']',platform.x,platform.y-8,.20,.53);
  }
  state.strands.forEach((strand,index)=>{
    const x=(strand.from.x+strand.to.x)/2;
    const y=(strand.from.y+strand.to.y)/2+5;
    write('web['+index+'] = ['+point(strand.to)+'];',x,y,.34,.64);
  });
  write('light = ['+point(state.light)+'];',state.light.x+8,state.light.y-10,.38,.70);
  write('fly = ['+point(state.fly.p)+'];',state.fly.p.x-7,state.fly.p.y+9,.48,.75);
  write('spider = ['+point(state.spider)+'];',state.spider.x-6,state.spider.y-18,.53,.80);
}

export function renderFlyEscape(ctx: CanvasRenderingContext2D,state: FlyEscape,frame: FlyEscapeFrame) {
  const {beat,time,shot}=frame;
  const ending=limit(frame.ending??0);
  const alpha=(from: number,to: number) => 1-ease(range(ending,from,to));
  ctx.save();
  camera(ctx,state,frame);
  block(ctx,0,0,WIDTH,HEIGHT,closing);
  layer(ctx,alpha(.54,.96),()=>block(ctx,0,0,WIDTH,HEIGHT,'#bacb92'));
  layer(ctx,alpha(0,.38),()=>drawBackground(ctx,beat,frame.details));
  layer(ctx,alpha(.12,.64),()=>deformRoom(ctx,frame.shrink,time,!!frame.reducedMotion));
  platforms.forEach((platform,i)=>layer(ctx,i<4 ? alpha(.08,.50) : alpha(.25,.66),()=>{
    drawPlatform(ctx,platform,beat);
  }));
  layer(ctx,alpha(.18,.54),()=>perimeter(ctx));
  layer(ctx,alpha(.34,.75),()=>drawTethers(ctx,state));
  if (!frame.intro && !shot) layer(ctx,alpha(.36,.81),()=>drawLight(ctx,state.light,beat));
  layer(ctx,alpha(.58,.93),()=>{
    const aimed=state.behavior==='aim' || state.plan?.kind==='web';
    const spiderPose=shot==='take' ? 'take' : aimed ? 'aim' : state.behavior==='yield' ? 'yield' : 'normal';
    const music={time,beat,shot:shot==='spider' || shot==='take' ? {subject:'spider' as const,zoom:1} : undefined};
    drawSpider(ctx,state.spider,state.clock,music,spiderPose,acting(state));
    drawFly(ctx,state,frame);
  });
  if (ending>0) dissolve(ctx,state,ending);
  ctx.restore();
}
