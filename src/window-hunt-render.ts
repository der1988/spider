import {block,drawAimMarker,drawPlatform,drawSpider,line} from './hunt-render';
import {bedroomHeight,bedroomScale,bedroomWidth,cameraFor,roomHeight,roomWidth,windowAnchor,type Corner,type WindowRun} from './window-hunt';

const ink='#22392e';
const cream='#eff3c8';
const amber='#f0d389';

function windowBackdrop(ctx:CanvasRenderingContext2D,objects:Corner['objects']) {
  ctx.save();
  ctx.scale(bedroomScale,bedroomScale);
  const width=bedroomWidth/bedroomScale,height=bedroomHeight/bedroomScale;
  const wall=ctx.createLinearGradient(0,0,0,height);
  wall.addColorStop(0,'#c5d0ab');
  wall.addColorStop(.56,'#abbc95');
  wall.addColorStop(1,'#7e9a7a');
  ctx.fillStyle=wall;
  ctx.fillRect(0,0,width,height);
  const daylight=ctx.createRadialGradient(503,300,70,560,435,990);
  daylight.addColorStop(0,'#f7eac188');
  daylight.addColorStop(1,'#f7eac100');
  ctx.fillStyle=daylight;
  ctx.fillRect(0,0,width,height);
  for (let x=31;x<width;x+=109) {
    block(ctx,x,20,1,1090,'#819a7929');
    block(ctx,x+1,20,2,1090,'#ecedcd25');
  }
  block(ctx,0,1090,width,122,'#859e7a');
  block(ctx,0,1090,width,5,'#bac6a0');
  block(ctx,0,1101,width,3,'#687d65');
  block(ctx,0,1183,width,4,'#a0ad8a');
  for (let x=24;x<width;x+=172) {
    block(ctx,x,1212,2,48,'#2b493b');
    block(ctx,x+3,1218,66,1,'#a5a677');
  }
  block(ctx,207,117,542,482,'#688368');
  block(ctx,216,126,522,463,'#d1d9aa');
  const glass=ctx.createLinearGradient(237,147,761,591);
  glass.addColorStop(0,'#dbe3c0');
  glass.addColorStop(.45,'#b4c9a5');
  glass.addColorStop(1,'#d5d9a1');
  ctx.fillStyle=glass;
  ctx.fillRect(236,146,481,423);
  block(ctx,471,143,16,428,'#829c78');
  block(ctx,232,337,487,15,'#829c78');
  block(ctx,232,337,487,3,'#cbd6ad');
  block(ctx,471,143,3,428,'#dee2b9');
  block(ctx,234,566,482,4,'#778a65');
  ctx.fillStyle='#f7f2cd39';
  ctx.beginPath();
  ctx.moveTo(240,147);ctx.lineTo(369,147);ctx.lineTo(665,562);ctx.lineTo(575,562);ctx.closePath();ctx.fill();
  block(ctx,1602,444,154,110,'#657f65');
  block(ctx,1609,451,140,96,'#aebc90');
  block(ctx,1616,458,126,82,'#bac69a');
  line(ctx,{x:1620,y:533},{x:1698,y:466},'#879f78');
  line(ctx,{x:1698,y:466},{x:1740,y:513},'#879f78');
  const pot=objects.find(item=>item.kind==='pot');
  if (pot) {
    const base={x:(pot.x+pot.w*.58)/bedroomScale,y:pot.y/bedroomScale};
    for (const item of objects) {
      if (item.kind!=='leaf') continue;
      const node={x:(item.x+item.w*.64)/bedroomScale,y:item.y/bedroomScale+4};
      const elbow={x:base.x-6,y:(base.y+node.y)*.5};
      line(ctx,base,elbow,'#789764');
      line(ctx,elbow,node,'#789764');
    }
  }
  ctx.restore();
}

function furnishing(ctx:CanvasRenderingContext2D,item:Corner['objects'][number]) {
  const {x,y,w,h,kind}=item;
  if (kind==='wall') {
    block(ctx,x,y,w,h,'#365242');
    if (w>100) block(ctx,x,y+3,w,3,'#7d976c');
  } else if (kind==='wood') {
    block(ctx,x,y,w,h,ink);
    block(ctx,x+2,y+2,w-4,h-3,'#6c8456');
    if (w>24) {
      block(ctx,x+3,y+3,w-6,2,'#a5b675');
      for (let dy=11;dy<h-3;dy+=13) block(ctx,x+7,y+dy,w-15,1,'#879d62');
    }
  } else if (kind==='wardrobe') {
    block(ctx,x,y,w,h,ink);
    block(ctx,x+3,y+3,w-6,h-4,'#6c8456');
    for (let dy=9;dy<h-23;dy+=37) {
      block(ctx,x+13,y+dy,w-26,31,'#839761');
      block(ctx,x+13,y+dy,w-26,2,'#a5b675');
      block(ctx,x+w/2-15,y+dy+11,30,4,ink);
    }
  } else if (kind==='mattress') {
    block(ctx,x,y,w,h,ink);
    block(ctx,x+1,y+1,w-2,7,'#d6dea2');
    block(ctx,x+2,y+8,w-4,h-10,'#91a975');
    for (let dx=14;dx<w-5;dx+=18) block(ctx,x+dx,y+12,2,h-14,'#a9bd85');
    block(ctx,x+8,y+2,54,4,cream);
  } else if (kind==='book') {
    block(ctx,x,y,w,h,ink);
    block(ctx,x+3,y+3,w-5,h-6,'#c1bc82');
    block(ctx,x+1,y+1,4,h-2,'#536b50');
    for (let dy=7;dy<h-4;dy+=4) block(ctx,x+7,y+dy,w-11,1,'#a7a86b');
  } else if (kind==='curtain') {
    block(ctx,x,y,w,h,'#729164');
    for (let dx=2;dx<w-2;dx+=6) {
      block(ctx,x+dx,y,2,h-3,'#a0b77b');
      block(ctx,x+dx+2,y,2,h,'#557452');
    }
    block(ctx,x,y+h-3,w,3,'#46664d');
  } else if (kind==='sill') {
    block(ctx,x,y,w,h,ink);
    block(ctx,x,y,w,3,'#edf0bb');
    block(ctx,x+3,y+3,w-6,h-7,'#8da76e');
    for (let dx=14;dx<w-8;dx+=31) block(ctx,x+dx,y+7,12,1,'#637e55');
  } else if (kind==='pot') {
    block(ctx,x,y,w,h,ink);
    block(ctx,x+2,y+2,w-4,3,'#b6bd7c');
    block(ctx,x+2,y+11,w-4,h-13,'#7f8d5b');
    block(ctx,x+12,y+15,w-34,h-19,'#9fab70');
    block(ctx,x+8,y+7,w-16,2,'#728557');
  } else {
    block(ctx,x,y,w,h,'#395d44');
    block(ctx,x+1,y+1,w-2,2,'#a1bf78');
    block(ctx,x+4,y+3,w-8,3,'#679552');
    block(ctx,x+2,y+5,w-5,1,'#c3cf89');
    for (let dx=12;dx<w-6;dx+=16) {
      line(ctx,{x:x+dx,y:y+5},{x:x+dx+4,y:y+2},'#819d59');
      block(ctx,x+dx,y+h,2,1,'#527859');
    }
    block(ctx,x+w-1,y+4,4,2,'#527859');
  }
}

function renderMap(ctx:CanvasRenderingContext2D,game:WindowRun) {
  const x=75,y=43,w=370,h=186;
  const sx=w/bedroomWidth,sy=h/bedroomHeight;
  const cx=(p:number)=>x+p*sx,cy=(p:number)=>y+p*sy;
  block(ctx,0,0,roomWidth,roomHeight,'#20362a');
  block(ctx,x-5,y-5,w+10,h+10,'#0e241a');
  block(ctx,x,y,w,h,'#3b5945');
  for (const r of game.surfaces) block(ctx,cx(r.x),cy(r.y),Math.max(1,r.w*sx),Math.max(1,r.h*sy),'#78956c');
  for (const insect of game.gnats) {
    block(ctx,cx(insect.p.x)-1,cy(insect.p.y)-1,3,3,'#dce5a3');
  }
  for (const wire of game.web.strands) {
    line(ctx,{x:cx(wire.from.x),y:cy(wire.from.y)},{x:cx(wire.to.x),y:cy(wire.to.y)},'#b4d3af');
  }
  for (const enemy of game.predators) {
    block(ctx,cx(enemy.body.x)-2,cy(enemy.body.y)-2,5,5,'#db9c70');
  }
  const camera=cameraFor(game);
  ctx.strokeStyle='#9db88b';
  ctx.strokeRect(cx(camera.x),cy(camera.y),roomWidth*sx,roomHeight*sy);
  block(ctx,cx(game.spider.x)-3,cy(game.spider.y)-3,7,7,cream);
  ctx.fillStyle=cream;
  ctx.font='12px monospace';
  ctx.fillText('BEDROOM MAP',75,30);
  ctx.font='9px monospace';
  ctx.fillText('● You    · Insect    ■ Hunter    — Web',75,251);
}

function drawHunter(ctx:CanvasRenderingContext2D,game:WindowRun,enemy:WindowRun['predators'][number]) {
  const body=enemy.body;
  const bound=game.clock<enemy.boundUntil;
  if (enemy.shot) line(ctx,enemy.shot.from,enemy.shot.to,'#bd8151',true);
  ctx.save();
  ctx.translate(body.x,body.y);
  ctx.scale(1.52,1.52);
  drawSpider(ctx,{...body,x:0,y:0},game.clock,{time:game.clock,beat:0},
    bound ? 'yield' : 'normal',{accent:'#e3ad70'});
  ctx.restore();
  if (bound) {
    for (let i=-6;i<=6;i+=3) line(ctx,{x:body.x-10,y:body.y+i},{x:body.x+10,y:body.y+i+2},cream);
  } else if (game.clock<enemy.chaseUntil) block(ctx,body.x-1,body.y-17,3,4,amber);
}

export function renderWindowHunt(ctx:CanvasRenderingContext2D,game:WindowRun,reduced=false,mapOpen=false) {
  if (mapOpen) {renderMap(ctx,game);return;}
  const camera=cameraFor(game);
  ctx.save();
  ctx.translate(-camera.x,-camera.y);
  if (game.practice) {
    block(ctx,0,0,roomWidth,roomHeight,'#a2b787');
    for (let y=46;y<270;y+=44) {
      for (let x=37;x<roomWidth;x+=44) block(ctx,x,y,1,1,'#b3c594');
    }
    for (const surface of game.surfaces) drawPlatform(ctx,surface,0);
  } else {
    windowBackdrop(ctx,game.corner.objects);
    for (const item of game.corner.objects) furnishing(ctx,item);
  }

  const {spider}=game;
  for (const wire of game.web.strands) {
    const tone=wire===game.clinging ? cream : game.occupants.has(wire) ? '#b28d48' : '#456e55';
    const shake=reduced ? 0 : Math.max(0,wire.shakeUntil-game.clock);
    if (shake) {
      const mid={x:(wire.from.x+wire.to.x)/2,y:(wire.from.y+wire.to.y)/2+Math.sin(game.clock*90)*9*shake};
      line(ctx,wire.from,mid,tone);
      line(ctx,mid,wire.to,tone);
    } else line(ctx,wire.from,wire.to,tone,(wire.expiresAt??Infinity)-game.clock<2);
    if (!game.practice) for (const p of [wire.from,wire.to]) block(ctx,p.x-1,p.y-1,3,3,tone);
  }
  for (const loose of game.web.loose) line(ctx,loose.from,spider,'#829660',true);
  if (spider.rope) line(ctx,spider,spider.rope,cream);
  for (const enemy of game.predators) drawHunter(ctx,game,enemy);
  for (const shot of game.shots) block(ctx,shot.p.x-2,shot.p.y-2,5,5,'#bd8151');

  for (const fly of game.gnats) {
    const {x,y}=fly.p;
    const flap=!reduced && Math.floor(game.clock*22+fly.phase)%2;
    if (fly.kind==='swift') {
      block(ctx,x-fly.direction*5,y,3,1,'#607d59');
      block(ctx,x-2,y,5,2,ink);
      block(ctx,x-2,y-(flap ? 2 : 1),4,1,cream);
    } else if (fly.kind==='fly') {
      block(ctx,x-2,y-1,5,4,ink);
      block(ctx,x-4,y-(flap ? 4 : 3),3,3,cream);
      block(ctx,x+2,y-(flap ? 4 : 3),3,3,cream);
    } else {
      block(ctx,x-1,y-1,3,3,ink);
      block(ctx,x-3,y-(flap ? 3 : 2),2,2,cream);
      block(ctx,x+2,y-(flap ? 3 : 2),2,2,fly.kind==='wary' ? amber : cream);
      if (fly.kind==='wary') block(ctx,x,y+2,1,1,'#ad713d');
    }
  }
  for (const points of game.occupants.values()) {
    for (const {p} of points) {
      block(ctx,p.x-2,p.y-2,5,5,ink);
      block(ctx,p.x-1,p.y-1,3,3,amber);
      block(ctx,p.x-4,p.y,1,1,cream);
      block(ctx,p.x+4,p.y,1,1,cream);
    }
  }
  let head:{x:number;y:number}=spider;
  for (const {p} of game.carried) {
    line(ctx,head,p,'#dce5a3');
    block(ctx,p.x-4,p.y-3,9,7,ink);
    block(ctx,p.x-3,p.y-2,7,5,'#ebd694');
    block(ctx,p.x-1,p.y-2,1,5,'#a08756');
    block(ctx,p.x+2,p.y-2,1,5,'#a08756');
    head=p;
  }
  ctx.restore();
  drawAimMarker(ctx,{x:spider.x-camera.x,y:spider.y-camera.y},game.aim,roomWidth,roomHeight,!!windowAnchor(game));
  ctx.save();
  ctx.translate(-camera.x,-camera.y);
  drawSpider(ctx,spider,game.clock,{time:game.clock,beat:0});
  if (game.trapped) {
    for (let i=-6;i<=6;i+=3) line(ctx,{x:spider.x-8,y:spider.y+i},{x:spider.x+8,y:spider.y+i+1},amber);
  }
  ctx.restore();
}
