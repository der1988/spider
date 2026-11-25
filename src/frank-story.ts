import {frankChapters,type FrankLine} from './frank-script.ts';

export const frankCompletionKey='spider-vs-fly:frank-perfect-crime';
export const frankMix={narrative:.30,combat:1};
export type FrankPhase='title'|'before'|'combat'|'setup'|'after'|'fade'|'complete';
export function createFrankStory(chapter=0) {
  return {chapter,phase:'title' as FrankPhase,elapsed:0,lineIndex:0,reveal:0};
}
export type FrankStory=ReturnType<typeof createFrankStory>;
export const frankLine=(story:FrankStory):FrankLine|undefined=>
  story.phase==='before' ? frankChapters[story.chapter].before[story.lineIndex] :
    story.phase==='after' ? frankChapters[story.chapter].after[story.lineIndex] : undefined;

export function frankPhase(story:FrankStory,phase:FrankPhase) {
  Object.assign(story,{phase,elapsed:0,lineIndex:0,reveal:0});
}

export function tickFrank(story:FrankStory,dt:number,press:boolean) {
  story.elapsed+=dt;
  if (story.phase==='title' && story.elapsed>=3) frankPhase(story,'before');
  else if (story.phase==='setup' && story.elapsed>=1.1) frankPhase(story,'after');
  else if (story.phase==='before' || story.phase==='after') {
    const line=frankLine(story);
    if (!line) {
      frankPhase(story,story.phase==='before' && story.chapter>0 && story.chapter<11 ? 'combat' : 'fade');
    } else {
      const complete=story.reveal>=line.text.length;
      if (press && complete) {
        story.lineIndex++;
        story.reveal=0;
        if (!frankLine(story)) frankPhase(story,story.phase==='before' && story.chapter>0 && story.chapter<11 ? 'combat' : 'fade');
      } else if (press) story.reveal=line.text.length;
      else story.reveal=Math.min(line.text.length,story.reveal+dt*35);
    }
  }
  if (story.phase==='fade' && story.elapsed>=.55) {
    if (story.chapter===11) frankPhase(story,'complete');
    else Object.assign(story,createFrankStory(story.chapter+1));
  }
}

export function frankSpeakerIndex(chapter:number,speaker:string) {
  return frankChapters[chapter].enemies.findIndex(enemy=>enemy.name.toUpperCase().split(' ').includes(speaker));
}

export function frankVoice(context:AudioContext|undefined,speaker:string,volume:number) {
  if (!context || context.state!=='running' || volume<=0) return;
  const seed=[...speaker].reduce((sum,ch)=>Math.imul(sum,31)+ch.charCodeAt(0),0)>>>0;
  const osc=context.createOscillator(),gain=context.createGain(),now=context.currentTime;
  const pitch=speaker==='FRANK' ? 105 : 145+seed%205;
  osc.type=speaker==='FRANK' || seed%2 ? 'triangle' : 'square';
  osc.frequency.setValueAtTime(pitch,now);
  osc.frequency.exponentialRampToValueAtTime(pitch*(seed%2 ? 1.16 : .86),now+.027);
  gain.gain.setValueAtTime(volume*.065,now);
  gain.gain.exponentialRampToValueAtTime(.0001,now+.042);
  osc.connect(gain).connect(context.destination);
  osc.onended=()=>{osc.disconnect();gain.disconnect();};
  osc.start(now);
  osc.stop(now+.045);
}
