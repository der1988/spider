import {block,drawBackground,drawPlatform,drawSpider,line,type SpiderActing} from './hunt-render';
import {HEIGHT,WIDTH} from './hunt';
import type {FlyEscape} from './fly-escape';
import {flyCues,flyDuration,flyMenuStart} from './fly-song-timing';
import type {FlyRoom} from './fly-room';
import type {Point} from './spider';

export interface FlyEscapeFrame {
  time: number;
  beat: number;
  intro?: boolean;
  shot?: 'spider'|'take'|'fly'|'you'|'room';
  shotProgress?: number;
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

function perimeter(ctx: CanvasRenderingContext2D,room: FlyRoom) {
  const {left,right,top,bottom}=room;
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

function drawTethers(ctx: CanvasRenderingContext2D,state: FlyEscape,time: number) {
  const {spider,stage}=state;
  for (const strand of state.strands) {
    const shake=Math.max(0,strand.shakeUntil-state.clock);
    const mid={x:(strand.from.x+strand.to.x)/2,y:(strand.from.y+strand.to.y)/2};
    if (strand===state.lastWeb) {
      if (time>=flyCues.lastWebExpire) continue;
      line(ctx,{x:strand.from.x+1,y:strand.from.y},{x:strand.to.x+1,y:strand.to.y},ink);
      line(ctx,strand.from,strand.to,cream);
      if (time>=flyCues.lastWebSecond) {
        block(ctx,mid.x+4,mid.y-6,19,11,ink);
        ctx.font='8px monospace';
        ctx.textBaseline='top';
        ctx.fillStyle=cream;
        ctx.fillText('1 s',mid.x+6,mid.y-5);
      }
    } else {
      if (shake) mid.y+=Math.sin(state.clock*105)*shake*5;
      const shade=state.trapped?.strand===strand ? ink : '#4e6e50';
      polyline(ctx,[strand.from,mid,strand.to],shade,(strand.expiresAt??Infinity)-state.clock<1);
    }
  }
  if (stage?.web && time>=flyCues.lastWebFire && time<flyCues.lastWebAttach) {
    const {launch,strand:{to}}=stage.web;
    const progress=range(time,flyCues.lastWebFire,flyCues.lastWebAttach);
    const head={x:launch.x+(to.x-launch.x)*progress,y:launch.y+(to.y-launch.y)*progress};
    line(ctx,launch,head,cream);
    block(ctx,head.x-1,head.y-1,3,3,cream);
  }
  if (stage?.attached && stage.web && time>=flyCues.lastWebAttach && time<flyCues.lastWebAttach+.28) {
    marker(ctx,stage.web.strand.to,5,cream);
  }
  if (stage?.tether) line(ctx,spider,stage.tether,cream);
  if (spider.firstAnchor) line(ctx,spider,spider.firstAnchor,border,true);
  if (spider.rope) line(ctx,spider,spider.rope,cream);
  const plan=state.plan;
  if (plan?.kind==='web' || plan?.kind==='swing') {
    const progress=range(state.clock,plan.beginsAt,plan.executeAt);
    const from=plan.kind==='web' ? plan.strand.from : spider;
    const to=plan.kind==='web' ? plan.strand.to : plan.target;
    layer(ctx,.48+.32*progress,()=>line(ctx,from,to,cream,true));
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

function acting(state: FlyEscape,time: number): SpiderActing|undefined {
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
    return {look:lookAlongSurface(state,middle),curl:1.2,lean:.6,accent:cream};
  }
  if (state.gesture==='stepBack') {
    const step=range(age,0,.65);
    const stride=Math.sin(step*Math.PI);
    return {look:state.stage ? 1 : opposite,curl:stride*1.6,lean:-stride*2,accent:steppingBack};
  }
  if (state.stage && time>=flyCues.stageSpeech && time<=154.692) return {look:facing,curl:.6};
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

function dissolve(ctx: CanvasRenderingContext2D,state: FlyEscape,ending: number,formation: number) {
  const label=codeLabels(ctx);
  const codeFade=1-range(formation,.12,.94);
  const gather=ease(formation);
  const write=(value: string,x: number,y: number,from: number,to: number)=>{
    const column=x<WIDTH/2 ? WIDTH*.29 : WIDTH*.63;
    label(value,x+(column-x)*gather,y+(HEIGHT*.49-y)*gather,codeFade*range(ending,from,to));
  };
  write('room.bounds = [0, 0, '+WIDTH+', '+HEIGHT+'];',13,15,.035,.19);
  write('ceiling.y = 7;',226,16,.09,.28);
  write('wall.left = 7;',12,85,.10,.30);
  write('wall.right = 353;',255,84,.11,.32);
  write('floor.y = 197;',15,180,.13,.36);
  write('clock.timeLeft = '+Math.ceil(state.time)+';',211,183,.14,.37);
  state.room.surfaces.slice(4).forEach((platform,index)=>{
    write('platform['+index+'] = ['+point(platform)+'];',platform.x,platform.y-8,.20,.53);
  });
  state.strands.forEach((strand,index)=>{
    const x=(strand.from.x+strand.to.x)/2;
    const y=(strand.from.y+strand.to.y)/2+5;
    write('web['+index+'] = ['+point(strand.from)+', '+point(strand.to)+'];',x,y,.34,.64);
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
  state.room.surfaces.forEach((platform,i)=>layer(ctx,i<4 ? alpha(.08,.50) : alpha(.25,.66),()=>{
    if (i<4) block(ctx,platform.x,platform.y,platform.w,platform.h,wallColor);
    else drawPlatform(ctx,platform,beat);
  }));
  layer(ctx,alpha(.18,.54),()=>perimeter(ctx,state.room));
  layer(ctx,alpha(.34,.75),()=>drawTethers(ctx,state,time));
  if (!frame.intro && !shot) layer(ctx,alpha(.36,.81),()=>drawLight(ctx,state.light,beat));
  layer(ctx,alpha(.58,.93),()=>{
    const aimed=state.behavior==='aim' || state.plan?.kind==='web' || state.plan?.kind==='swing';
    const spiderPose=shot==='take' ? 'take' : aimed ? 'aim' : state.behavior==='yield' && (!state.stage || (Math.abs(state.spider.vx)<1 && Math.abs(state.spider.vy)<1)) ? 'yield' : 'normal';
    const music={time,beat,shot:shot==='spider' || shot==='take' ? {subject:'spider' as const,zoom:1} : undefined};
    drawSpider(ctx,state.spider,state.clock,music,spiderPose,acting(state,time));
    drawFly(ctx,state,frame);
  });
  if (ending>0) dissolve(ctx,state,ending,range(time,flyMenuStart,flyDuration));
  ctx.restore();
}
