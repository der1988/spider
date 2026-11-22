import {block,drawAimMarker,drawPlatform,drawSpider,line} from './hunt-render';
import {aimedTrap,outsideRoom,roomHeight,roomWidth,windowAnchor,type Corner,type WindowRun} from './window-hunt';

const ink='#22392e';
const cream='#eff3c8';
const amber='#f0d389';

function windowBackdrop(ctx:CanvasRenderingContext2D,objects:Corner['objects']) {
  block(ctx,0,0,roomWidth,roomHeight,'#aabe8d');
  block(ctx,0,0,281,185,'#cbd9a4');
  block(ctx,4,0,5,181,'#9eb180');
  block(ctx,0,68,281,5,'#aec18a');
  block(ctx,118,0,6,184,'#aec18a');
  block(ctx,268,0,13,184,'#b3c48e');
  block(ctx,292,0,228,290,'#a1b586');
  for (let y=18;y<roomHeight;y+=30) block(ctx,295,y,225,1,'#98ad7c');
  block(ctx,0,220,roomWidth,70,'#91a779');
  block(ctx,0,260,roomWidth,30,'#829a74');
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
  if (kind==='curtain') {
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

function edgeMarker(ctx:CanvasRenderingContext2D,p:{x:number;y:number}) {
  const x=Math.max(8,Math.min(roomWidth-9,p.x));
  const y=Math.max(8,Math.min(roomHeight-9,p.y));
  const dx=p.x<0 ? -1 : p.x>roomWidth ? 1 : 0;
  const dy=p.y<0 ? -1 : p.y>roomHeight ? 1 : 0;
  const tip={x:x+dx*5,y:y+dy*5};
  block(ctx,x-6,y-6,13,13,ink);
  line(ctx,{x:x-dy*3,y:y+dx*3},tip,cream);
  line(ctx,{x:x+dy*3,y:y-dx*3},tip,cream);
}

export function renderWindowHunt(ctx:CanvasRenderingContext2D,game:WindowRun,reduced=false) {
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
  const selected=game.practice ? undefined : aimedTrap(game);
  for (const wire of game.web.strands) {
    const tone=wire===selected ? cream : '#456e55';
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
  if (game.shot && game.clock<game.shot.until) line(ctx,game.shot.from,game.shot.to,cream,true);

  for (const fly of game.gnats) {
    const {x,y}=fly.p;
    const flap=!reduced && Math.floor(game.clock*22+fly.phase)%2;
    if (fly.kind==='swift') {
      block(ctx,x-fly.direction*5,y,3,1,'#607d59');
      block(ctx,x-2,y,5,2,ink);
      block(ctx,x-2,y-(flap ? 2 : 1),4,1,cream);
    } else {
      block(ctx,x-1,y-1,3,3,ink);
      block(ctx,x-3,y-(flap ? 3 : 2),2,2,cream);
      block(ctx,x+2,y-(flap ? 3 : 2),2,2,fly.kind==='wary' ? amber : cream);
      if (fly.kind==='wary') block(ctx,x,y+2,1,1,'#ad713d');
    }
  }
  for (const {p} of game.marks) {
    block(ctx,p.x-2,p.y-2,5,5,ink);
    block(ctx,p.x-1,p.y-1,3,3,amber);
    block(ctx,p.x-4,p.y,1,1,cream);
    block(ctx,p.x+4,p.y,1,1,cream);
  }
  if (outsideRoom(spider) && spider.rope) edgeMarker(ctx,spider);
  else if (!outsideRoom(spider)) {
    drawAimMarker(ctx,spider,game.aim,roomWidth,roomHeight,!!windowAnchor(game));
    drawSpider(ctx,spider,game.clock,{time:game.clock,beat:0});
  }
}
