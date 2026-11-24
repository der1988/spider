import {anchorCrawlerRope,castCrawler,closeCrawlerRopes,createCrawler,jumpCrawler,normals,tickCrawler} from './crawler.ts';
import {capStrands,createHunt,platforms,spawn,tickHunt,WEB_SECONDS} from './hunt.ts';
import {silkMotion} from './pad-controls.ts';
import {DEFAULT_TUNING,moveAxis,type Point} from './spider.ts';
import {fixSilk,leaveSilk} from './threads.ts';
import type {HuntMode} from './difficulty.ts';

export const arenaStep=1/120;
export const releaseSilkButton=8;
const axisRange=127;
export type ArenaInput=[x:number,y:number,aimX:number,aimY:number,buttons:number];
export type ArenaEvent='jump'|'attach'|'double'|'miss'|'release'|'fix'|'evict'|'catch'|'new'|'over';
export const initialAim={x:.56,y:-.828};

export function arenaInput(move:Point,aim?:Point,jump=false,fire=false):ArenaInput {
  const axis=(n:number)=>Math.round(Math.max(-1,Math.min(1,n))*axisRange);
  return [axis(move.x),axis(move.y),axis(aim?.x??0),axis(aim?.y??0),(jump ? 1 : 0)|(fire ? 2 : 0)];
}

export function createArena(mode:HuntMode,seed?:number,rotate=mode==='loop') {
  return {hunt:createHunt(seed,mode,rotate),spider:createCrawler(spawn,platforms),aim:{...initialAim},down:false};
}
export type ArenaRun=ReturnType<typeof createArena>;

export function finishWebs(run:ArenaRun,before:number,emit?: (event:ArenaEvent)=>void,webLimit?:number) {
  const {hunt}=run;
  if (hunt.strands.length===before) return;
  for (let i=before;i<hunt.strands.length;i++) hunt.strands[i].expiresAt=hunt.clock+WEB_SECONDS;
  const evicted=webLimit===undefined ? capStrands(hunt) : hunt.strands.length>webLimit;
  if (webLimit!==undefined && evicted) hunt.strands.splice(0,hunt.strands.length-webLimit);
  emit?.(evicted ? 'evict' : 'fix');
}

export function moveArena(run:ArenaRun,input:ArenaInput,emit?: (event:ArenaEvent)=>void,{climbSilk=true,adjustRope=false,webLimit,ropeRange=DEFAULT_TUNING.range,directionalJump=false}: {climbSilk?:boolean;adjustRope?:boolean;webLimit?:number;ropeRange?:number;directionalJump?:boolean}={}) {
  const {hunt,spider}=run;
  const {surfaces}=hunt;
  const [x,y,ax,ay,buttons]=input;
  if (ax || ay) {
    const length=Math.hypot(ax,ay);
    run.aim={x:ax/length,y:ay/length};
  }
  if (buttons&1) {
    const stick=Math.hypot(x,y)>32 ? {x,y} : {x:ax,y:ay};
    const length=Math.hypot(stick.x,stick.y);
    const direction=directionalJump && length>28 ? {x:.82*stick.x/length,y:spider.support==='floor' ? Math.min(-.58,stick.y/length) : stick.y/length} : undefined;
    const normal=spider.support ? normals[spider.support] : undefined;
    if (jumpCrawler(spider,undefined,direction)) {
      if (direction && normal && Math.abs(normal.x*direction.x+normal.y*direction.y)<.04) {
        moveAxis(spider,surfaces,normal.x ? 'x' : 'y',2*(normal.x||normal.y));
      }
      emit?.('jump');
    }
  }
  if (buttons&2) {
    const target={x:spider.x+run.aim.x*70,y:spider.y+run.aim.y*70};
    if (castCrawler(spider,surfaces,target)) {
      emit?.('attach');
      const before=hunt.strands.length;
      if (webLimit===undefined && anchorCrawlerRope(spider,surfaces,hunt.strands)) finishWebs(run,before,emit);
      else if (spider.firstAnchor) emit?.('double');
    } else emit?.('miss');
  }
  const move={x:x/axisRange,y:y/axisRange};
  const motion=silkMotion(move,run.down);
  run.down=motion.down;
  if (adjustRope && motion.down && spider.rope) {
    spider.rope.length=Math.min(ropeRange,spider.rope.length+DEFAULT_TUNING.reelSpeed*arenaStep);
  } else if (motion.detach && spider.rope) {
    const old=closeCrawlerRopes(spider);
    if (old) leaveSilk(hunt,old,DEFAULT_TUNING.range);
    emit?.('release');
  }
  const axis=(n:number)=>Math.sign(n)*Math.max(0,(Math.abs(n)-.12)/.88);
  const active=climbSilk ? hunt.strands.filter(s=>(s.expiresAt??Infinity)>hunt.clock+arenaStep) : [];
  tickCrawler(spider,surfaces,{x:axis(move.x),y:axis(move.y)},(climbSilk || adjustRope && !!spider.rope) && motion.reel,arenaStep,active);
  const before=hunt.strands.length;
  if (webLimit===undefined) anchorCrawlerRope(spider,surfaces,hunt.strands);
  if (webLimit===undefined) fixSilk(hunt,spider,surfaces);
  finishWebs(run,before,emit,webLimit);
}

export function advanceArena(run:ArenaRun,input:ArenaInput,emit?: (event:ArenaEvent)=>void) {
  const {hunt,spider}=run;
  const surfaces=hunt.surfaces;
  moveArena(run,input,emit);
  const result=tickHunt(hunt,spider,arenaStep);
  if (hunt.surfaces!==surfaces) Object.assign(spider,createCrawler(spawn,hunt.surfaces),{rope:undefined,firstAnchor:undefined,thread:undefined,support:'floor'});
  if (result) emit?.(result);
  return result;
}
