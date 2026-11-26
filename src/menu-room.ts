import {castCrawler,closeCrawlerRopes,createCrawler,tickCrawler,type Support} from './crawler.ts';
import {block,drawSpider,line} from './hunt-render.ts';
import {HEIGHT,WIDTH} from './hunt.ts';
import type {Rect} from './spider.ts';
const route:Record<Support,{x:number;y:number}> = {
  floor:{x:.84,y:0}, right:{x:0,y:-.84}, ceiling:{x:-.84,y:0}, left:{x:0,y:.84},
};

export function createMenuRoom(width=WIDTH,height=HEIGHT) {
  const walls:Rect[]=[
    {x:0,y:height-7,w:width,h:7,grip:true}, {x:0,y:0,w:width,h:7,grip:true},
    {x:0,y:7,w:7,h:height-14,grip:true}, {x:width-7,y:7,w:7,h:height-14,grip:true},
  ];
  return {width,height,walls,spider:createCrawler({x:width-83,y:height-15},walls),time:0,swingUntil:0,nextSwing:1.5};
}
type MenuRoom=ReturnType<typeof createMenuRoom>;

export function stepMenuRoom(room:MenuRoom,dt:number) {
  room.time+=dt;
  const {spider,walls,width,height}=room;
  if (spider.rope && room.time>=room.swingUntil) closeCrawlerRopes(spider);
  if (spider.support==='right' && spider.y<Math.min(119,height*.6) && spider.y>Math.min(84,height*.42) && room.time>=room.nextSwing &&
      castCrawler(spider,walls,{x:width-Math.min(48,width*.13),y:10})) {
    room.swingUntil=room.time+.9;
    room.nextSwing=room.time+13;
  }
  const move=spider.rope ? {x:.44,y:0} : spider.support ? route[spider.support] : {x:.68,y:0};
  tickCrawler(spider,walls,move,!!spider.rope,dt,[]);
}

export function renderMenuRoom(context:CanvasRenderingContext2D,room:MenuRoom,beat:number) {
  const {walls,width,height,spider,time}=room;
  block(context,0,0,width,height,'#192b21');
  for (let x=20;x<width-12;x+=29) {
    const y=22+(x*17)%(height-42);
    block(context,x+Math.round(beat*2),y,2,1,beat>.4 ? '#97ad74' : '#526b48');
    block(context,x,11,1,5+(x%4), '#526b48');
    block(context,x-2,15+(x%4),4,2,'#638155');
  }
  for (const {x,y,w,h} of walls) {
    block(context,x,y,w,h,'#496748');
    if (w===width) {
      block(context,x,y+(y ? 0 : 5),w,1,'#a6bc84');
      for (let j=10;j<w-7;j+=12) block(context,j,y+2,3,1,'#638155');
    } else {
      block(context,x+(x ? 1 : 5),y,1,h,'#a6bc84');
      for (let j=14;j<h;j+=12) block(context,x+3,y+j,1,3,'#638155');
    }
  }
  if (spider.rope) line(context,spider,spider.rope,'#c7d5a0');
  drawSpider(context,spider,time,{time,beat},'normal',{accent:'#dbe7ad'});
  const angle=time*.67+.18*Math.sin(time*1.24);
  const x=width/2+(width/2-31)*Math.cos(angle);
  const y=height/2+(height/2-26+4*Math.sin(time*1.32))*Math.sin(angle);
  const wing=Math.floor(time*24)%2;
  block(context,x-3,y-3-wing,3,2,'#e1e7b6');
  block(context,x+1,y-3+wing,3,2,'#e1e7b6');
  block(context,x-1,y-1,3,3,'#98b37b');
  block(context,x,y-1,1,1,'#e1e7b6');
}
