import {block,drawPlatform,drawSpider,line} from './hunt-render';
import {chargeTime,entry,exit,floorY,room,sightHeight,sightRange,silkReach,stealthHeight,stealthWidth,type Guard,type StealthRun} from './stealth';
import {crossesSolid} from './threads';

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
  ctx.fillStyle=guard.witnessed ? '#9b6947' : guard.alert>.1 ? '#8c804c' : '#536d4c';
  for (let d=8;d<sightRange;d+=4) {
    const x=guard.x+guard.facing*d;
    const y=floorY-3-(sightHeight-3)*(1-d/sightRange);
    if (room.some(surface=>crossesSolid(guard,{x,y:floorY-8},surface))) break;
    ctx.fillRect(Math.round(x),Math.ceil(y),2,2);
  }
}

function drawGuard(ctx:CanvasRenderingContext2D,guard:Guard,time:number) {
  const {x,y}=guard;
  if (guard.caught) {
    block(ctx,x-8,y-2,16,8,outline);
    block(ctx,x-7,y,14,5,cream);
    for (const offset of [-3,1,5]) block(ctx,x+offset,y-2,1,8,'#718a61');
    return;
  }
  const step=Math.floor(time*10)%2;
  block(ctx,x-8,y-3,14,8,ink);
  block(ctx,x-6,y-5,9,3,ink);
  block(ctx,x-6,y-3,9,4,'#6a875d');
  block(ctx,x+guard.facing*6-3,y-2,6,6,ink);
  block(ctx,x+guard.facing*7,y-1,2,1,guard.witnessed ? amber : cream);
  const tip={x:x+guard.facing*11,y:y-7};
  line(ctx,{x:x+guard.facing*8,y:y-2},tip,ink);
  for (const offset of [-5,0,5]) {
    line(ctx,{x:x+offset,y:y+3},{x:x+offset+(offset%2 ? step : -step),y:y+6},ink);
  }
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
  for (let x=39;x<stealthWidth;x+=68) {
    block(ctx,x,16,5,floorY-16,'#97ad80');
    block(ctx,x-17,27+x%39,23,6,'#97ad80');
    block(ctx,x-13,179+x%46,28,3,'#97ad80');
    block(ctx,x+13,94+x%50,2,2,'#bdce9e');
  }
  for (const guard of game.guards) if (!guard.caught) sight(ctx,guard);
  for (const surface of room) drawPlatform(ctx,surface,0);
  const locked=game.guards.some(guard=>guard.witnessed && !guard.caught);
  pipe(ctx,entry.x,'IN');
  pipe(ctx,exit.x,locked ? 'LOCKED' : 'OUT',locked);
  const {spider,noise}=game;
  for (const wire of game.web.strands) line(ctx,wire.from,wire.to,'#526f51',(wire.expiresAt??Infinity)-game.clock<2);
  for (const loose of game.web.loose) line(ctx,loose.from,spider,'#83986a',true);
  if (spider.rope) line(ctx,spider,spider.rope,cream);
  if (game.silkCharge && !game.usedSilk) {
    const range=silkReach(game.silkCharge);
    const target={x:spider.x+game.aim.x*range,y:spider.y+game.aim.y*range};
    // Keep the indicator local when aiming through a wall.
    const tick={x:spider.x+(target.x-spider.x)*.18,y:spider.y+(target.y-spider.y)*.18};
    line(ctx,spider,tick,cream,true);
  }
  if (noise && !reduced) {
    const size=6+Math.round((1-(noise.until-game.clock)/.38)*9);
    line(ctx,{x:noise.x-size,y:noise.y-3},{x:noise.x-size-4,y:noise.y-6},outline);
    line(ctx,{x:noise.x+size,y:noise.y-3},{x:noise.x+size+4,y:noise.y-6},outline);
  }
  for (const guard of game.guards) drawGuard(ctx,guard,game.clock);
  ctx.textAlign='left';
  block(ctx,spider.x+game.aim.x*14-1,spider.y+game.aim.y*14-1,3,3,ink);
  drawSpider(ctx,spider,game.clock,{time:game.clock,beat:0});
  if (game.jumpCharge) {
    block(ctx,spider.x-8,spider.y-13,17,3,ink);
    block(ctx,spider.x-7,spider.y-12,Math.round(15*game.jumpCharge/chargeTime),1,cream);
  }
}
