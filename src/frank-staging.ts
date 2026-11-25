import {arcadeRivalStage,arcadeScenes} from './arcade-scenery.ts';
import {frankChapters} from './frank-script.ts';
import type {FrankStory} from './frank-story.ts';

const landing=arcadeScenes[0].landing;
export const frankPrologueWalkway={...landing,w:158};

function walk(from:number,to:number,seconds:number) {
  const duration=Math.abs(to-from)/64;
  const t=duration ? Math.min(1,seconds/duration) : 1;
  const facing=to>from ? 1 : -1;
  return {x:from+(to-from)*t,vx:t<1 ? facing*64 : 0,facing} as const;
}

export function frankStrangerPose(story:FrankStory) {
  if (story.phase!=='before' || story.lineIndex<3) return;
  const entrance=151,mark=108,exit=172;
  const leaving=story.lineIndex===frankChapters[0].before.length-1;
  const step=leaving ? walk(mark,exit,story.lineElapsed) :
    walk(entrance,mark,story.lineIndex===3 ? story.lineElapsed : Infinity);
  if (leaving && !step.vx) return;
  return {...step,y:frankPrologueWalkway.y-7,opacity:leaving ? Math.min(1,(exit-step.x)/12) : 1};
}

export function frankDukePose(story:FrankStory,battleX:number) {
  const {perch,start,halfWidth}=arcadeRivalStage;
  const margin=halfWidth+1; // A pixel for the speaking animation.
  const left=perch.x+margin,right=perch.x+perch.w-margin;
  const from=story.phase==='setup' ? Math.max(left,Math.min(right,battleX)) : right;
  const seconds=story.phase==='setup' || story.phase==='before' ? story.elapsed :
    story.phase==='title' ? 0 : Infinity;
  const step=walk(from,start.x,seconds);
  return {...step,y:start.y,facing:step.vx ? step.facing : -1 as const};
}
