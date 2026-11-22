import {block,drawAimMarker,drawPlatform,drawSpider,line} from './hunt-render';
import {entry,exit,escapePresses,floorY,room,sightRange,sightSlope,stealthAnchor,stealthHeight,stealthWidth,type Guard,type StealthRun} from './stealth';
import {aimHit} from './spider';

const ink='#152b22';
const cream='#e9efb9';
const outline='#496951';
const amber='#dfb569';

function pipe(ctx:CanvasRenderingContext2D,x:number,label:string,locked=false) {
  block(ctx,x-23,floorY-35,46,35,outline);
  block(ctx,x-22,floorY-40,44,5,'#6e8861');
  block(ctx,x-17,floorY-29,34,29,ink);
  block(ctx,x-16,floorY-28,32,2,'#92aa77');
  for (const offset of [-20,19]) block(ctx,x+offset,floorY-18,2,2,cream);
  ctx.fillStyle=locked ? amber : cream;
  ctx.font='8px monospace';
  ctx.textAlign='center';
  ctx.fillText(label,x,floorY-44);
}

function sight(ctx:CanvasRenderingContext2D,guard:Guard) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0,0,stealthWidth,stealthHeight);
  ctx.rect(0,floorY-34,48,34);
  ctx.clip('evenodd');
  ctx.globalAlpha=guard.attack ? .3 : .18;
  ctx.fillStyle=guard.witnessed ? '#984e2e' : '#ecedbb';
  ctx.beginPath();
  ctx.moveTo(guard.x,guard.y);
  for (let i=0;i<=12;i++) {
    const target={x:guard.x+guard.facing*sightRange,y:guard.y+(i/6-1)*(8+sightRange*sightSlope)};
    const edge=aimHit(guard,room,target,{range:Math.hypot(target.x-guard.x,target.y-guard.y)})??target;
    ctx.lineTo(edge.x,edge.y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGuard(ctx:CanvasRenderingContext2D,guard:Guard,time:number) {
  const {x,y}=guard;
  if (guard.caught) {
    block(ctx,x-8,y-2,16,8,outline);
    block(ctx,x-7,y,14,5,cream);
    for (const offset of [-3,1,5]) block(ctx,x+offset,y-2,1,8,'#718a61');
    return;
  }
  const step=guard.speed ? Math.floor(time*10)%2 : 0;
  for (let i=0;i<8;i++) {
    const side=i<4 ? -1 : 1, root=x+(i%4-1.5)*4, stride=(i+step)%2;
    line(ctx,{x:root,y:y+side*2},{x:root+(stride ? 3 : -3),y:y+side*(8+stride)},ink);
  }
  block(ctx,x-guard.facing*5-5,y-6,11,12,ink);
  block(ctx,x-guard.facing*5-3,y-5,7,6,'#354b41');
  block(ctx,x+guard.facing*5-4,y-4,9,8,ink);
  block(ctx,x+guard.facing*8,y-2,2,1,guard.witnessed ? amber : cream);
  block(ctx,x+guard.facing*8,y+1,2,1,guard.witnessed ? amber : cream);
  block(ctx,x-10,y-15,21,5,ink);
  block(ctx,x-9,y-14,19,3,'#344b3b');
  block(ctx,x-9,y-14,Math.round(19*guard.alert),3,guard.witnessed ? amber : cream);
  if (guard.witnessed) {
    block(ctx,x+13,y-18,2,5,amber);
    block(ctx,x+13,y-11,2,2,amber);
  }
}

export function renderStealth(ctx:CanvasRenderingContext2D,game:StealthRun,reduced=false) {
  block(ctx,0,0,stealthWidth,stealthHeight,'#a2b787');
  if (game.practice) {
    for (let y=46;y<floorY;y+=44) {
      for (let x=37;x<stealthWidth;x+=44) block(ctx,x,y,1,1,'#b3c594');
    }
  }
  for (let x=39;!game.practice && x<stealthWidth;x+=68) {
    block(ctx,x,16,5,floorY-16,'#97ad80');
    block(ctx,x-17,27+x%39,23,6,'#97ad80');
    block(ctx,x-13,179+x%46,28,3,'#97ad80');
    block(ctx,x+13,94+x%50,2,2,'#bdce9e');
  }
  for (const guard of game.guards) if (!guard.caught) sight(ctx,guard);
  for (const surface of game.surfaces) drawPlatform(ctx,surface,0);
  if (!game.practice) {
    const locked=game.guards.some(guard=>guard.witnessed && !guard.caught);
    pipe(ctx,entry.x,'IN');
    pipe(ctx,exit.x,locked ? 'LOCKED' : 'OUT',locked);
  }
  const {spider,noise}=game;
  for (const wire of game.web.strands) line(ctx,wire.from,wire.to,'#526f51',(wire.expiresAt??Infinity)-game.clock<2);
  for (const loose of game.web.loose) line(ctx,loose.from,spider,'#83986a',true);
  if (spider.rope) line(ctx,spider,spider.rope,cream);
  for (const wire of game.enemyWebs) {
    const mid={x:(wire.from.x+wire.to.x)/2+Math.max(0,wire.shakeUntil-game.clock)*8,y:(wire.from.y+wire.to.y)/2};
    line(ctx,wire.from,mid,'#935a42');
    line(ctx,mid,wire.to,'#935a42');
  }
  for (const guard of game.guards) {
    if (guard.attack && !guard.caught) line(ctx,guard.attack.from,guard.attack.to,amber,true);
  }
  for (const shot of game.shots) block(ctx,shot.p.x-2,shot.p.y-2,5,5,amber);
  if (!game.practice && noise && !reduced) {
    const size=6+Math.round((1-(noise.until-game.clock)/.38)*9);
    line(ctx,{x:noise.x-size,y:noise.y-3},{x:noise.x-size-4,y:noise.y-6},outline);
    line(ctx,{x:noise.x+size,y:noise.y-3},{x:noise.x+size+4,y:noise.y-6},outline);
  }
  for (const guard of game.guards) drawGuard(ctx,guard,game.clock);
  ctx.textAlign='left';
  drawAimMarker(ctx,spider,game.aim,stealthWidth,stealthHeight,!!stealthAnchor(game));
  drawSpider(ctx,spider,game.clock,{time:game.clock,beat:0});
  if (game.trapped) {
    block(ctx,spider.x-9,spider.y-8,18,16,'#6c523d');
    for (let i=-6;i<=6;i+=3) line(ctx,{x:spider.x-8,y:spider.y+i},{x:spider.x+8,y:spider.y+i+1},amber);
    block(ctx,spider.x-9,spider.y-12,18,2,ink);
    block(ctx,spider.x-9,spider.y-12,18*game.trapped.presses/escapePresses,2,cream);
  }
}
