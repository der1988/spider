import {block,drawAimMarker,drawPlatform,drawSpider,line} from './hunt-render';
import {bedroomHeight,bedroomScale,bedroomWidth,cameraFor,hunterWindup,roomHeight,roomWidth,windowAnchor,worldNear,worldX,type Corner,type WindowRun} from './window-hunt';

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

const districts=[
  {name:'THE GROW ROOM',wall:'#a6bb91',shade:'#899f75',trim:'#c3cf9e'},
  {name:'THE CRACKS',wall:'#a1ab9b',shade:'#818b83',trim:'#bcc1ab'},
  {name:'THE PANTRY',wall:'#c5bb85',shade:'#a79d70',trim:'#ded0a0'},
];

function openBackdrop(ctx:CanvasRenderingContext2D,camera:ReturnType<typeof cameraFor>) {
  const section=bedroomWidth/districts.length;
  const start=Math.floor(camera.x/section);
  const end=Math.floor((camera.x+roomWidth)/section);
  for (let cell=start;cell<=end;cell++) {
    const left=cell*section;
    const zone=(cell%districts.length+districts.length)%districts.length;
    const {name,wall,shade,trim}=districts[zone];
    block(ctx,Math.floor(left),camera.y,Math.ceil(section)+1,roomHeight,wall);
    ctx.save();
    ctx.beginPath();
    ctx.rect(left,camera.y,section,roomHeight);
    ctx.clip();
    if (zone===0) {
      for (let dx=60;dx<section;dx+=118) {
        const x=left+dx;
        if (x+51<camera.x || x-63>camera.x+roomWidth) continue;
        const top=Math.max(62,camera.y);
        const bottom=Math.min(bedroomHeight,camera.y+roomHeight);
        const stem=(y:number)=>x-24*(bedroomHeight-y)/(bedroomHeight-62);
        if (top<bottom) line(ctx,{x:stem(bottom),y:bottom},{x:stem(top),y:top},shade);
        for (let y=94+(dx%47);y<bedroomHeight;y+=123) {
          if (y+26<camera.y || y-40>camera.y+roomHeight) continue;
          const size=dx%23+14;
          line(ctx,{x:x-63,y:y-size},{x:x+5,y},shade);
          block(ctx,x-60,y-size-4,28,7,trim);
          block(ctx,x-51,y-size+3,28,5,trim);
          line(ctx,{x:x-7,y:y+24},{x:x+51,y:y+1},shade);
          block(ctx,x+23,y+2,25,7,shade);
        }
      }
    } else if (zone===1) {
      for (let y=10;y<bedroomHeight;y+=79) {
        if (y+79<camera.y || y>camera.y+roomHeight) continue;
        block(ctx,left,y,section,2,shade);
        for (let dx=(y%2 ? 52 : 13);dx<section;dx+=120) block(ctx,left+dx,y,2,79,shade);
      }
      let from={x:left+section*.42,y:0};
      for (let y=50;y<bedroomHeight;y+=48) {
        const to={x:left+section*.42+(y*17)%67-33,y};
        if (to.y>=camera.y && from.y<=camera.y+roomHeight) {
          line(ctx,from,to,shade);
          line(ctx,{x:from.x+1,y:from.y},{x:to.x+1,y:to.y},shade);
        }
        from=to;
      }
    } else {
      for (let y=92;y<bedroomHeight;y+=159) {
        if (y+4<camera.y || y-44>camera.y+roomHeight) continue;
        block(ctx,left,y,section,4,shade);
        for (let dx=30;dx<section-24;dx+=55) {
          const x=left+dx;
          const h=20+dx%24;
          block(ctx,x,y-h,25,h,trim);
          block(ctx,x+3,y-h,19,3,shade);
          block(ctx,x+2,y-10,21,6,wall);
        }
      }
    }

    const signX=left+Math.round(section/2);
    const signY=bedroomHeight-113;
    block(ctx,signX-74,signY,148,22,shade);
    block(ctx,signX-73,signY+1,146,20,trim);
    ctx.fillStyle=ink;
    ctx.textAlign='center';
    ctx.font='bold 11px monospace';
    ctx.fillText(name,signX,signY+15);
    ctx.restore();
  }
}

function drawShop(ctx:CanvasRenderingContext2D,game:WindowRun) {
  const {x,y}=worldNear(game.den,game.spider.x);
  block(ctx,x-24,y-30,48,31,'#657a54');
  block(ctx,x-16,y-41,32,11,'#657a54');
  block(ctx,x-17,y-25,34,26,ink);
  block(ctx,x-10,y-32,20,8,ink);
  block(ctx,x-15,y-23,30,2,'#8aa477');
  block(ctx,x-25,y-4,5,5,cream);
  block(ctx,x+21,y-4,5,5,cream);
  for (const side of [-1,1]) {
    const edge=x+side*61;
    block(ctx,edge-1,y-9,3,10,'#647b57');
    block(ctx,edge-2,y-10,5,3,cream);
    block(ctx,edge-side*4,y+4,5,1,'#7f996e');
  }
  block(ctx,x-37,y-58,74,13,ink);
  ctx.save();
  ctx.fillStyle=cream;
  ctx.textAlign='center';
  ctx.font='bold 9px monospace';
  ctx.fillText('FLY MARKET',x,y-48);
  ctx.restore();
}

function drawResident(ctx:CanvasRenderingContext2D,id:string,x:number,y:number) {
  if (id==='mantis') {
    block(ctx,x-4,y-14,8,4,ink);
    block(ctx,x-2,y-17,4,3,ink);
    block(ctx,x-2,y-13,1,1,cream);
    block(ctx,x+1,y-13,1,1,cream);
    block(ctx,x-2,y-10,4,7,'#506d42');
    block(ctx,x-4,y-4,8,3,ink);
    line(ctx,{x:x-1,y:y-6},{x:x-7,y:y-9},ink);
    line(ctx,{x:x-7,y:y-9},{x:x-4,y:y-13},ink);
    line(ctx,{x:x+1,y:y-6},{x:x+7,y:y-9},ink);
    line(ctx,{x:x+7,y:y-9},{x:x+4,y:y-13},ink);
    return;
  }
  const armored=id==='quartermaster';
  const body=armored ? '#8b6640' : '#705a63';
  block(ctx,x-6,y-7,12,6,ink);
  block(ctx,x-4,y-9,8,7,body);
  block(ctx,x+1,y-11,5,5,ink);
  block(ctx,x+3,y-9,1,1,cream);
  block(ctx,x-5,y-1,2,1,ink);
  block(ctx,x+3,y-1,2,1,ink);
  if (armored) {
    block(ctx,x-6,y-7,3,2,amber);
    block(ctx,x-1,y-9,1,7,amber);
  } else {
    line(ctx,{x:x+4,y:y-11},{x:x+7,y:y-15},ink);
    line(ctx,{x:x+2,y:y-10},{x:x+1,y:y-15},ink);
    line(ctx,{x:x-3,y:y-3},{x:x-8,y},ink);
  }
}

function drawTown(ctx:CanvasRenderingContext2D,game:WindowRun,camera:ReturnType<typeof cameraFor>) {
  if (!game.town) return;
  for (const [i,walker] of game.walkers.entries()) {
    const {x,y}=worldNear(walker,game.spider.x);
    block(ctx,x-4,y-3,8,5,i%2 ? '#775842' : '#4b6848');
    block(ctx,x+walker.direction*4,y-4,2,3,ink);
    const gait=Math.floor(game.clock*11+i)%2;
    block(ctx,x-3+gait,y+2,2,2,ink);
    block(ctx,x+2-gait,y+2,2,2,ink);
  }
  for (const resident of game.town.residents) {
    const {x,y}=worldNear(resident.position,game.spider.x);
    drawResident(ctx,resident.id,x,y);
  }
  for (const [index,item] of game.town.items.entries()) {
    if (item.collected) continue;
    const {x,y}=worldNear(item.position,game.spider.x);
    block(ctx,x-4,y-4,9,7,ink);
    block(ctx,x-3,y-3,7,5,index%2 ? '#e4c988' : '#b7cb8e');
    block(ctx,x-1,y-5,3,1,cream);
    block(ctx,x,y-3,1,5,ink);
  }

  if (!game.interaction) return;
  const {kind}=game.interaction;
  const position=worldNear(game.interaction.position,game.spider.x);
  const label=kind==='talk' ? 'R2 · Talk' : 'R2 · Pick up';
  const width=kind==='talk' ? 65 : 82;
  const x=Math.max(camera.x+width/2+4,Math.min(camera.x+roomWidth-width/2-4,position.x));
  const y=Math.max(camera.y+34,position.y-(kind==='talk' ? 30 : 22));
  block(ctx,x-width/2,y-1,width,16,ink);
  block(ctx,x-width/2+1,y,width-2,14,'#526d52');
  block(ctx,x-2,y+15,5,2,ink);
  ctx.save();
  ctx.fillStyle=cream;
  ctx.textAlign='center';
  ctx.font='bold 10px monospace';
  ctx.fillText(label,x,y+10);
  ctx.restore();
}

function projectMapPoint(point:{x:number;y:number},x:number,y:number,sx:number,sy:number,wrap:boolean) {
  return {x:x+(wrap ? worldX(point.x) : point.x)*sx,y:y+point.y*sy};
}

function renderMap(ctx:CanvasRenderingContext2D,game:WindowRun) {
  const x=75,y=43,w=370,h=186;
  const sx=w/bedroomWidth,sy=h/bedroomHeight;
  const at=(point:{x:number;y:number})=>projectMapPoint(point,x,y,sx,sy,game.openWorld);
  const cy=(p:number)=>y+p*sy;
  block(ctx,0,0,roomWidth,roomHeight,'#20362a');
  block(ctx,x-5,y-5,w+10,h+10,'#0e241a');
  block(ctx,x,y,w,h,'#3b5945');
  if (game.openWorld) {
    districts.forEach(({shade,name},index)=>{
      const left=x+index*w/3;
      block(ctx,left,y,w/3,h,shade);
      ctx.save();
      ctx.fillStyle=ink;
      ctx.textAlign='center';
      ctx.font='9px monospace';
      ctx.fillText(name,left+w/6,y+16);
      ctx.restore();
    });
    for (const edge of [x-5,x+w+5]) {
      ctx.fillStyle=cream;
      ctx.font='12px monospace';
      ctx.fillText('↔',edge-4,y+h/2);
    }
  }
  for (const r of game.openWorld ? game.corner.objects : game.surfaces) {
    const p=at(r);
    block(ctx,p.x,p.y,Math.max(1,r.w*sx),Math.max(1,r.h*sy),'#627e59');
  }
  for (const insect of game.gnats) {
    const p=at(insect.p);
    block(ctx,p.x-1,p.y-1,3,3,'#dce5a3');
  }
  for (const wire of game.web.strands) {
    const from=at(wire.from),to=at(wire.to);
    if (!game.openWorld || Math.abs(to.x-from.x)<w/2) {
      line(ctx,from,to,'#b4d3af');
    } else {
      const edge=from.x>to.x ? x+w : x;
      const offset=from.x>to.x ? w : -w;
      const mid=from.y+(to.y-from.y)*(edge-from.x)/(to.x+offset-from.x);
      line(ctx,from,{x:edge,y:mid},'#b4d3af');
      line(ctx,{x:edge-offset,y:mid},to,'#b4d3af');
    }
  }
  for (const enemy of game.predators) {
    const p=at(enemy.body);
    block(ctx,p.x-2,p.y-2,5,5,'#db9c70');
  }
  if (game.openWorld) {
    const p=at(game.den);
    block(ctx,p.x-4,p.y-5,9,7,ink);
    block(ctx,p.x-1,p.y-4,3,5,cream);
    for (const resident of game.town?.residents??[]) {
      const mark=at(resident.position);
      block(ctx,mark.x-1,mark.y-1,3,3,'#d6b9cf');
    }
    for (const item of game.town?.items??[]) {
      if (item.collected) continue;
      const mark=at(item.position);
      block(ctx,mark.x,mark.y,2,2,amber);
    }
  }
  const camera=cameraFor(game),view=at(camera);
  const viewWidth=roomWidth*sx;
  const visibleWidth=Math.min(viewWidth,x+w-view.x);
  ctx.strokeStyle='#e1e7b2';
  ctx.strokeRect(view.x,cy(camera.y),visibleWidth,roomHeight*sy);
  if (game.openWorld && visibleWidth<viewWidth) ctx.strokeRect(x,cy(camera.y),viewWidth-visibleWidth,roomHeight*sy);
  const spider=at(game.spider);
  block(ctx,spider.x-3,spider.y-3,7,7,cream);
  ctx.fillStyle=cream;
  ctx.font='12px monospace';
  ctx.fillText(game.openWorld ? 'OPEN WORLD MAP' : 'BEDROOM MAP',75,30);
  ctx.font='9px monospace';
  ctx.fillText(game.openWorld ? '● You    · Insect    ■ Guardian    ▣ Shop    — Web' : '● You    · Insect    ■ Hunter    — Web',75,251);
}

function drawHunter(ctx:CanvasRenderingContext2D,game:WindowRun,enemy:WindowRun['predators'][number]) {
  const body=enemy.body;
  const bound=game.clock<enemy.boundUntil;
  const pursuing=game.clock<enemy.chaseUntil && !!enemy.lastKnown;
  const registered=enemy.lastKnown && Math.hypot(body.x-enemy.lastKnown.x,body.y-enemy.lastKnown.y)<12;
  const following=enemy.lastKnown && Math.hypot(game.spider.x-enemy.lastKnown.x,game.spider.y-enemy.lastKnown.y)<8;
  const alert=pursuing && !!following;
  if (body.rope) line(ctx,body,body.rope,'#f2c189');
  if (enemy.shot) {
    const {from,to,at}=enemy.shot;
    line(ctx,from,to,'#4c3429');
    line(ctx,from,to,'#ffc585',true);
    const progress=Math.max(0,Math.min(1,1-(at-game.clock)/hunterWindup));
    block(ctx,body.x-11,body.y-22,22,4,'#4c3429');
    block(ctx,body.x-10,body.y-21,20*progress,2,'#ffd296');
  }
  ctx.save();
  ctx.translate(body.x,body.y);
  ctx.scale(1.52,1.52);
  drawSpider(ctx,{...body,x:0,y:0},game.clock,{time:game.clock,beat:0},
    bound ? 'yield' : enemy.shot ? 'aim' : 'normal',{accent:alert ? '#ffb25e' : '#e3ad70'});
  ctx.restore();
  if (bound) {
    for (let i=-6;i<=6;i+=3) line(ctx,{x:body.x-10,y:body.y+i},{x:body.x+10,y:body.y+i+2},cream);
  } else if (pursuing) {
    const x=body.x,y=body.y-27;
    block(ctx,x-5,y-3,11,11,'#594d38');
    if (alert || enemy.shot) {
      block(ctx,x-1,y-1,3,5,amber);
      block(ctx,x-1,y+5,3,1,amber);
    } else {
      block(ctx,x-2,y-1,4,1,cream);
      block(ctx,x+1,y,1,2,cream);
      block(ctx,x-1,y+2,2,2,cream);
      block(ctx,x-1,y+5,1,1,cream);
      if (registered) block(ctx,x+3,y+5,1,1,amber);
    }
  }
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
  } else if (game.openWorld) {
    openBackdrop(ctx,camera);
    for (const item of game.surfaces) {
      if (!('kind' in item) || item.x+item.w<camera.x || item.x>camera.x+roomWidth ||
          item.y+item.h<camera.y || item.y>camera.y+roomHeight) continue;
      furnishing(ctx,item);
    }
    drawShop(ctx,game);
  } else {
    windowBackdrop(ctx,game.corner.objects);
    for (const item of game.corner.objects) furnishing(ctx,item);
  }

  const {spider}=game;
  for (const wire of game.web.strands) {
    const expiring=(wire.expiresAt??Infinity)-game.clock<.75;
    const tone=wire===game.clinging ? cream : game.occupants.has(wire) ? '#b28d48' : expiring ? '#78956c' : '#456e55';
    const shake=reduced ? 0 : Math.max(0,wire.shakeUntil-game.clock);
    if (shake) {
      const mid={x:(wire.from.x+wire.to.x)/2,y:(wire.from.y+wire.to.y)/2+Math.sin(game.clock*90)*9*shake};
      line(ctx,wire.from,mid,tone);
      line(ctx,mid,wire.to,tone);
    } else line(ctx,wire.from,wire.to,tone);
    if (!game.practice) for (const p of [wire.from,wire.to]) block(ctx,p.x-1,p.y-1,3,3,tone);
  }
  if (spider.rope) line(ctx,spider,spider.rope,cream);
  for (const enemy of game.predators) drawHunter(ctx,game,enemy);
  for (const shot of game.shots) block(ctx,shot.p.x-2,shot.p.y-2,5,5,'#bd8151');

  for (const fly of game.gnats) {
    const {x,y}=fly.p;
    const flap=!reduced && Math.floor(game.clock*22+fly.phase)%2;
    if (fly.rare) {
      block(ctx,x-2,y-2,5,5,'#533c54');
      block(ctx,x-1,y-3,3,6,'#eaadd9');
      line(ctx,{x,y},{x:x-5,y:y-(flap ? 5 : 2)},'#ffe0ee');
      line(ctx,{x,y},{x:x+5,y:y-(flap ? 5 : 2)},'#ffe0ee');
      block(ctx,x,y+4,1,2,'#bc6ba5');
    } else if (fly.kind==='swift') {
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
  drawTown(ctx,game,camera);
  if (game.trapped) {
    for (let i=-6;i<=6;i+=3) line(ctx,{x:spider.x-8,y:spider.y+i},{x:spider.x+8,y:spider.y+i+1},amber);
  }
  ctx.restore();
}
