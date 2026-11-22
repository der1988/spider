import {block,drawAimMarker,drawPlatform,drawSpider,line} from './hunt-render';
import {bedroomHeight,bedroomWidth,cameraFor,roomHeight,roomWidth,windowAnchor,type Corner,type WindowRun} from './window-hunt';

const ink='#22392e';
const cream='#eff3c8';
const amber='#f0d389';

function windowBackdrop(ctx:CanvasRenderingContext2D,objects:Corner['objects']) {
  block(ctx,0,0,bedroomWidth,bedroomHeight,'#aabe8d');
  block(ctx,0,540,bedroomWidth,66,'#9caf7e');
  block(ctx,0,583,bedroomWidth,6,'#879e70');
  for (let x=20;x<bedroomWidth;x+=135) block(ctx,x,10,2,530,'#a4b889');
  block(ctx,110,64,260,230,'#839e71');
  block(ctx,119,73,242,211,'#cbd9a4');
  block(ctx,236,73,6,211,'#9caf7b');
  block(ctx,119,171,242,6,'#9caf7b');
  block(ctx,126,79,105,2,'#d8e4b0');
  block(ctx,806,222,75,55,'#82986a');
  block(ctx,811,227,65,44,'#b7c795');
  line(ctx,{x:813,y:265},{x:849,y:236},'#95ad80');
  line(ctx,{x:848,y:236},{x:874,y:251},'#95ad80');
  const pot=objects.find(item=>item.kind==='pot');
  if (pot) {
    const base={x:pot.x+pot.w*.58,y:pot.y};
    for (const item of objects) {
      if (item.kind!=='leaf') continue;
      const node={x:item.x+item.w*.64,y:item.y+4};
      const elbow={x:base.x-6,y:(base.y+node.y)*.5};
      line(ctx,base,elbow,'#789764');
      line(ctx,elbow,node,'#789764');
    }
  }
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
  for (const lane of game.corner.lanes) {
    const left=cx(lane.left),right=cx(lane.right),height=cy(lane.y);
    line(ctx,{x:left,y:height},{x:right,y:height},'#a9bc79',true);
    block(ctx,(left+right)/2-1,height-1,3,3,'#dce5a3');
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
  ctx.fillText('● You    - - Flight zone    ■ Hunter',75,251);
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
    for (const p of points) {
      block(ctx,p.x-2,p.y-2,5,5,ink);
      block(ctx,p.x-1,p.y-1,3,3,amber);
      block(ctx,p.x-4,p.y,1,1,cream);
      block(ctx,p.x+4,p.y,1,1,cream);
    }
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
