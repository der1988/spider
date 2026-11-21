import {anchorCrawlerRope,castCrawler,closeCrawlerRopes,createCrawler,jumpCrawler,tickCrawler} from './crawler.ts';
import {capStrands,createHunt,platforms,spawn,tickHunt,WEB_SECONDS} from './hunt.ts';
import {silkMotion} from './pad-controls.ts';
import {DEFAULT_TUNING,type Point} from './spider.ts';
import {fixSilk,leaveSilk} from './threads.ts';
import type {HuntMode} from './difficulty.ts';

export const arenaStep=1/120;
const axisRange=127;
export type ArenaInput=[x:number,y:number,aimX:number,aimY:number,buttons:number];
export type ArenaEvent='jump'|'attach'|'double'|'miss'|'release'|'fix'|'evict'|'catch'|'new'|'over';
export const initialAim={x:.56,y:-.828};

export function arenaInput(move:Point,aim?:Point,jump=false,fire=false):ArenaInput {
  const axis=(n:number)=>Math.round(Math.max(-1,Math.min(1,n))*axisRange);
  return [axis(move.x),axis(move.y),axis(aim?.x??0),axis(aim?.y??0),(jump ? 1 : 0)|(fire ? 2 : 0)];
}

export function createArena(mode:HuntMode,seed?:number) {
  return {hunt:createHunt(seed,mode),spider:createCrawler(spawn,platforms),aim:{...initialAim},down:false};
}
export type ArenaRun=ReturnType<typeof createArena>;

function finishWebs(run:ArenaRun,before:number,emit?: (event:ArenaEvent)=>void) {
  const {hunt}=run;
  if (hunt.strands.length===before) return;
  for (let i=before;i<hunt.strands.length;i++) hunt.strands[i].expiresAt=hunt.clock+WEB_SECONDS;
  const evicted=capStrands(hunt);
  emit?.(evicted ? 'evict' : 'fix');
}

export function advanceArena(run:ArenaRun,input:ArenaInput,emit?: (event:ArenaEvent)=>void) {
  const {hunt,spider}=run;
  const [x,y,ax,ay,buttons]=input;
  if (ax || ay) {
    const length=Math.hypot(ax,ay);
    run.aim={x:ax/length,y:ay/length};
  }
  if ((buttons&1) && jumpCrawler(spider)) emit?.('jump');
  if (buttons&2) {
    const target={x:spider.x+run.aim.x*70,y:spider.y+run.aim.y*70};
    if (castCrawler(spider,platforms,target)) {
      emit?.('attach');
      const before=hunt.strands.length;
      if (anchorCrawlerRope(spider,platforms,hunt.strands)) finishWebs(run,before,emit);
      else if (spider.firstAnchor) emit?.('double');
    } else emit?.('miss');
  }
  const move={x:x/axisRange,y:y/axisRange};
  const motion=silkMotion(move,run.down);
  run.down=motion.down;
  if (motion.detach && spider.rope) {
    const old=closeCrawlerRopes(spider);
    if (old) leaveSilk(hunt,old,DEFAULT_TUNING.range);
    emit?.('release');
  }
  const axis=(n:number)=>Math.sign(n)*Math.max(0,(Math.abs(n)-.12)/.88);
  const active=hunt.strands.filter(s=>(s.expiresAt??Infinity)>hunt.clock+arenaStep);
  tickCrawler(spider,platforms,{x:axis(move.x),y:axis(move.y)},motion.reel,arenaStep,active);
  const before=hunt.strands.length;
  anchorCrawlerRope(spider,platforms,hunt.strands);
  fixSilk(hunt,spider,platforms);
  finishWebs(run,before,emit);
  const result=tickHunt(hunt,spider,arenaStep);
  if (result) emit?.(result);
  return result;
}
