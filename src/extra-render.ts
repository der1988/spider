import {block,drawPlatform,drawSpider,line} from './hunt-render';
import {platformEnd,swarmHeight,swarmWidth,type ExtraRun} from './extra-modes';

export function renderExtra(ctx:CanvasRenderingContext2D,run:ExtraRun) {
  const platform=run.mode==='platform';
  const w=platform ? 360 : swarmWidth,h=platform ? 204 : swarmHeight;
  block(ctx,0,0,w,h,platform ? '#c2d49c' : '#b8ce9a');

  const offset=run.camera*.42;
  for (let x=-offset%49;x<w;x+=49) {
    block(ctx,x,0,6,h,'#a9c088');
    block(ctx,x-12,22,14,4,'#a9c088');
    block(ctx,x+6,53,12,6,'#a9c088');
    block(ctx,x+12,17,3,3,'#dce7b6');
  }
  ctx.save();
  ctx.translate(-Math.round(run.camera),0);
  if (platform) {
    for (const x of [231,558,903,1218]) {
      block(ctx,x,194,x===231 ? 103 : x===558 ? 124 : x===903 ? 133 : 136,10,'#718459');
    }
    line(ctx,{x:platformEnd,y:184},{x:platformEnd,y:141},'#304a35');
    block(ctx,platformEnd-1,140,23,13,'#36583e');
    block(ctx,platformEnd+2,143,11,2,'#eff3c8');
    block(ctx,platformEnd+2,147,15,2,'#eff3c8');
    ctx.font='8px monospace';
    ctx.fillStyle='#243c2d';
    ctx.fillText('EXIT',platformEnd-12,134);
  }
  for (const surface of run.surfaces) drawPlatform(ctx,surface,0);
  for (const wire of run.web.strands) {
    line(ctx,wire.from,wire.to,'#3b6548',(wire.expiresAt??Infinity)-run.clock<2);
  }
  for (const pickup of run.pickups) {
    block(ctx,pickup.x-2,pickup.y-4,5,9,'#36583e');
    block(ctx,pickup.x-4,pickup.y-2,9,5,'#36583e');
    block(ctx,pickup.x-1,pickup.y-2,3,5,'#f8edbc');
  }
  for (const fly of run.flies) {
    if (fly.caught) continue;
    const {x,y}=fly.p;
    if (fly.cocoon) {
      block(ctx,x-3,y-5,7,11,'#3f6549');
      block(ctx,x-2,y-4,5,9,'#eff3c8');
      for (const dy of [-2,1,3]) block(ctx,x-2,y+dy,5,1,'#89a36a');
      continue;
    }
    const flap=Math.floor(run.clock*19+fly.phase)%2;
    block(ctx,x-4,y-3-flap,3,3,'#faffda');
    block(ctx,x+2,y-3+flap,3,3,'#faffda');
    block(ctx,x-2,y-1,5,4,'#243c2d');
  }
  const {spider,aim,shot}=run;
  if (spider.firstAnchor) line(ctx,spider,spider.firstAnchor,'#8aa56c',true);
  if (spider.rope) line(ctx,spider,spider.rope,'#f7f6cd');
  if (shot && shot.until>run.clock) line(ctx,shot.from,shot.to,'#f7f6cd',true);
  block(ctx,spider.x+aim.x*15-1,spider.y+aim.y*15-1,3,3,'#35513b');
  drawSpider(ctx,spider,run.clock,{time:run.clock,beat:0});
  ctx.restore();
}
